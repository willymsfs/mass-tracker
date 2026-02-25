import { PrismaClient, ScheduledMass, BlockedDay, FixedIntention, Deceased, GregorianMass, PersonalIntention, MassBatch } from '@prisma/client';
import { DateTime } from 'luxon';

interface ScheduleResult {
  success: boolean;
  totalMassesScheduled: number;
  conflicts: ConflictRecord[];
  notesLog: string[];
  status: 'SUCCESS' | 'PARTIAL_CONFLICT' | 'ERROR';
}

interface ConflictRecord {
  date: string;
  intention: string;
  reason: string;
  suggestedAlternative?: string;
}

interface CalendarDay {
  date: string;
  isBlocked: boolean;
  scheduled: ScheduledMass[];
}

export class MassScheduler {
  private prisma: PrismaClient;
  private calendar: Map<string, CalendarDay> = new Map();
  private conflicts: ConflictRecord[] = [];
  private notesLog: string[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Main entry point: Rebuild entire calendar for user in given year
   */
  async rebuildCalendarForUser(userId: string, year: number): Promise<ScheduleResult> {
    try {
      this.calendar.clear();
      this.conflicts = [];
      this.notesLog = [];

      const startDate = DateTime.fromISO(`${year}-01-01`);
      const endDate = DateTime.fromISO(`${year}-12-31`);

      // Initialize calendar with all days
      this.initializeCalendarDays(startDate, endDate);

      this.logNote(`Starting scheduler rebuild for user ${userId} in year ${year}`);

      // Clear all scheduled masses for this user in the year
      await this.prisma.scheduledMass.deleteMany({
        where: {
          userId,
          date: {
            gte: startDate.toJSDate(),
            lte: endDate.toJSDate(),
          },
        },
      });

      // Priority 1: Block blocked days
      await this.applyBlockedDays(userId, startDate, endDate);
      this.logNote(`Priority 1: Marked blocked days`);

      // Priority 2: Schedule fixed intentions
      await this.scheduleFixedIntentions(userId, startDate, endDate);
      this.logNote(`Priority 2: Scheduled fixed intentions`);

      // Priority 3: Schedule deceased masses
      await this.scheduleDeceasedMasses(userId, startDate, endDate);
      this.logNote(`Priority 3: Scheduled deceased masses`);

      // Priority 3.5: Schedule Gregorian series
      await this.scheduleGregorianMasses(userId, startDate, endDate);
      this.logNote(`Priority 3.5: Scheduled Gregorian series`);

      // Priority 4: Schedule monthly personal intentions
      await this.scheduleMonthlyPersonal(userId, startDate, endDate);
      this.logNote(`Priority 4: Scheduled monthly personal intentions`);

      // Priority 5: Fill gaps with bulk batches
      await this.scheduleBulkBatches(userId, startDate, endDate);
      this.logNote(`Priority 5: Filled gaps with bulk batches`);

      // Save scheduler run audit trail
      const totalScheduled = Array.from(this.calendar.values()).reduce(
        (sum, day) => sum + day.scheduled.length,
        0
      );

      await this.prisma.schedulerRun.create({
        data: {
          userId,
          status: this.conflicts.length > 0 ? 'PARTIAL_CONFLICT' : 'SUCCESS',
          conflictsDetected: JSON.stringify(this.conflicts),
          notesLog: JSON.stringify(this.notesLog),
          totalMassesScheduled: totalScheduled,
          totalConflicts: this.conflicts.length,
        },
      });

      return {
        success: true,
        totalMassesScheduled: totalScheduled,
        conflicts: this.conflicts,
        notesLog: this.notesLog,
        status: this.conflicts.length > 0 ? 'PARTIAL_CONFLICT' : 'SUCCESS',
      };
    } catch (error) {
      this.logNote(`ERROR: ${error}`);
      return {
        success: false,
        totalMassesScheduled: 0,
        conflicts: this.conflicts,
        notesLog: this.notesLog,
        status: 'ERROR',
      };
    }
  }

  /**
   * Priority 1: Mark all blocked days - no masses celebrated
   */
  private async applyBlockedDays(userId: string, start: DateTime, end: DateTime): Promise<void> {
    const blockedDays = await this.prisma.blockedDay.findMany({
      where: {
        userId,
        date: {
          gte: start.toJSDate(),
          lte: end.toJSDate(),
        },
      },
    });

    for (const blockedDay of blockedDays) {
      const dateKey = this.getDateKey(blockedDay.date);
      const day = this.calendar.get(dateKey);
      if (day) {
        day.isBlocked = true;
        this.logNote(`Blocked: ${dateKey} - ${blockedDay.reason}`);
      }
    }
  }

  /**
   * Priority 2: Schedule fixed intentions (birthdays, anniversaries, etc.)
   */
  private async scheduleFixedIntentions(userId: string, start: DateTime, end: DateTime): Promise<void> {
    const fixedIntentions = await this.prisma.fixedIntention.findMany({
      where: { userId },
    });

    for (const intention of fixedIntentions) {
      // Check if this is a yearly recurring intention (dateOfMonth only, no specific year)
      let targetDate: DateTime;

      if (intention.monthOnlyFlag) {
        // Interpret dateOfMonth as day-of-month (1-31)
        const dayOfMonth = intention.dateOfMonth;
        targetDate = DateTime.fromObject({
          year: start.year,
          month: parseInt(intention.type.split('-')[0]) || 1, // Extract month from type if available
          day: dayOfMonth,
        });

        // If this date is before start date, try next year
        if (targetDate < start) {
          targetDate = targetDate.plus({ years: 1 });
        }
      } else {
        // Use dateOfMonth as day-of-year (1-366)
        targetDate = start.plus({ days: intention.dateOfMonth - 1 });
      }

      // Ensure target date is within range
      if (targetDate >= start && targetDate <= end) {
        const dateKey = this.getDateKey(targetDate.toJSDate());
        const day = this.calendar.get(dateKey);

        if (day && !day.isBlocked && day.scheduled.length === 0) {
          // Schedule the mass
          const scheduled = await this.prisma.scheduledMass.create({
            data: {
              userId,
              date: targetDate.toJSDate(),
              massType: 'FIXED',
              intentionDescription: intention.description || `Fixed Intention: ${intention.type}`,
              fixedIntentionId: intention.id,
            },
          });

          day.scheduled.push(scheduled);
          this.logNote(`Fixed intention scheduled: ${dateKey} - ${intention.description}`);
        } else if (day && day.isBlocked) {
          // Conflict: blocked day
          intention.conflictFlag = true;
          this.addConflict(dateKey, intention.description || intention.type, 'Day is blocked');
        } else if (day && day.scheduled.length > 0) {
          // Conflict: day already has mass
          intention.conflictFlag = true;
          this.addConflict(dateKey, intention.description || intention.type, 'Day already scheduled');
        }
      }
    }

    // Update conflict flags
    for (const intention of fixedIntentions) {
      if (intention.conflictFlag) {
        await this.prisma.fixedIntention.update({
          where: { id: intention.id },
          data: { conflictFlag: true },
        });
      }
    }
  }

  /**
   * Priority 3: Schedule deceased masses (date of death + 2 days, scan forward)
   */
  private async scheduleDeceasedMasses(userId: string, start: DateTime, end: DateTime): Promise<void> {
    const deceasedMembers = await this.prisma.deceased.findMany({
      where: { userId },
    });

    for (const deceased of deceasedMembers) {
      let targetDate: DateTime;

      if (deceased.scheduleDateOverride) {
        targetDate = DateTime.fromJSDate(deceased.scheduleDateOverride);
      } else {
        // Calculate: date of death + 2 days
        targetDate = DateTime.fromJSDate(deceased.dateOfDeath).plus({ days: 2 });
      }

      // Scan forward for first available slot
      while (targetDate <= end) {
        const dateKey = this.getDateKey(targetDate.toJSDate());
        const day = this.calendar.get(dateKey);

        if (day && !day.isBlocked && day.scheduled.length === 0) {
          // Found available slot
          const scheduled = await this.prisma.scheduledMass.create({
            data: {
              userId,
              date: targetDate.toJSDate(),
              massType: 'DECEASED',
              intentionDescription: `Deceased: ${deceased.name}`,
              deceasedMemberId: deceased.id,
            },
          });

          day.scheduled.push(scheduled);
          deceased.massScheduledDate = targetDate.toJSDate();
          deceased.conflictFlag = false;

          this.logNote(`Deceased mass scheduled: ${dateKey} for ${deceased.name}`);
          break;
        }

        targetDate = targetDate.plus({ days: 1 });
      }

      // If no slot found by end of year
      if (!deceased.massScheduledDate && targetDate > end) {
        deceased.conflictFlag = true;
        this.addConflict(
          this.getDateKey(targetDate.toJSDate()),
          `Deceased: ${deceased.name}`,
          'No available slots remaining in calendar'
        );
      }

      // Update deceased record
      await this.prisma.deceased.update({
        where: { id: deceased.id },
        data: {
          massScheduledDate: deceased.massScheduledDate,
          conflictFlag: deceased.conflictFlag,
        },
      });
    }
  }

  /**
   * Priority 3.5: Schedule Gregorian series (30 consecutive, pause/resume logic)
   * Note: Gregorian masses are scheduled BEFORE personal intentions
   */
  private async scheduleGregorianMasses(userId: string, start: DateTime, end: DateTime): Promise<void> {
    const gregorianMasses = await this.prisma.gregorianMass.findMany({
      where: { userId, status: 'PENDING' },
      include: { batch: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const gregorian of gregorianMasses) {
      let currentDate = DateTime.fromJSDate(gregorian.startDate || start.toJSDate());
      let seriesCount = gregorian.seriesNumber || 1;
      const targetSeriesCount = 30; // Gregorian series are 30 masses

      // Resume from pausedUntilDate if set
      if (gregorian.pausedUntilDate) {
        currentDate = DateTime.fromJSDate(gregorian.pausedUntilDate);
        this.logNote(`Resuming Gregorian series ${gregorian.id} from ${currentDate.toISODate()}`);
      }

      let consecutiveCount = 0;

      while (currentDate <= end && seriesCount <= targetSeriesCount) {
        const dateKey = this.getDateKey(currentDate.toJSDate());
        const day = this.calendar.get(dateKey);

        if (day && !day.isBlocked && day.scheduled.length === 0) {
          // Schedule the mass
          const scheduled = await this.prisma.scheduledMass.create({
            data: {
              userId,
              date: currentDate.toJSDate(),
              massType: 'GREGORIAN',
              intentionDescription: `Gregorian (${gregorian.donorName}) #${seriesCount}/30`,
              serialNumber: seriesCount,
              gregorianMassId: gregorian.id,
              batchId: gregorian.batchId,
            },
          });

          day.scheduled.push(scheduled);
          seriesCount++;
          consecutiveCount++;

          this.logNote(`Gregorian mass scheduled: ${dateKey} - ${gregorian.donorName} #${seriesCount - 1}/30`);
        } else if (day && (day.isBlocked || day.scheduled.length > 0)) {
          // Hit a block or already scheduled - pause series
          if (consecutiveCount > 0) {
            // Update pausedUntilDate for resumption
            await this.prisma.gregorianMass.update({
              where: { id: gregorian.id },
              data: { pausedUntilDate: currentDate.toJSDate() },
            });

            this.logNote(`Gregorian series ${gregorian.id} paused at ${dateKey}, will resume next day`);
            consecutiveCount = 0;
          }
        }

        currentDate = currentDate.plus({ days: 1 });
      }

      // Update status
      const status = seriesCount > targetSeriesCount ? 'COMPLETED' : seriesCount > 1 ? 'IN_PROGRESS' : 'PENDING';
      await this.prisma.gregorianMass.update({
        where: { id: gregorian.id },
        data: {
          seriesNumber: seriesCount - 1,
          status,
        },
      });
    }
  }

  /**
   * Priority 4: Schedule monthly personal intentions (3 per month, random selection)
   */
  private async scheduleMonthlyPersonal(userId: string, start: DateTime, end: DateTime): Promise<void> {
    const personalIntentions = await this.prisma.personalIntention.findMany({
      where: { userId },
    });

    // Group by month
    const intentionsByMonth = new Map<number, PersonalIntention[]>();
    for (const intention of personalIntentions) {
      if (!intentionsByMonth.has(intention.month)) {
        intentionsByMonth.set(intention.month, []);
      }
      intentionsByMonth.get(intention.month)!.push(intention);
    }

    // For each month in range
    let currentDate = start;
    while (currentDate <= end) {
      const month = currentDate.month;
      const intentionsForMonth = intentionsByMonth.get(month) || [];

      // Get candidate days (not blocked, not already scheduled, not feast days)
      const candidateDays = this.getCandidateDaysForMonth(currentDate, userId);

      // Schedule up to 3 per month (randomly selected from candidates)
      const selected = this.randomSelect(intentionsForMonth, Math.min(3, intentionsForMonth.length));

      for (const intention of selected) {
        if (candidateDays.length > 0) {
          const randomIndex = Math.floor(Math.random() * candidateDays.length);
          const selectedDate = candidateDays[randomIndex];
          candidateDays.splice(randomIndex, 1);

          const scheduled = await this.prisma.scheduledMass.create({
            data: {
              userId,
              date: selectedDate.toJSDate(),
              massType: 'PERSONAL',
              intentionDescription: intention.description,
              personalIntentionId: intention.id,
            },
          });

          const dateKey = this.getDateKey(selectedDate.toJSDate());
          const day = this.calendar.get(dateKey);
          if (day) {
            day.scheduled.push(scheduled);
          }

          await this.prisma.personalIntention.update({
            where: { id: intention.id },
            data: { scheduledDate: selectedDate.toJSDate() },
          });

          this.logNote(`Personal intention scheduled: ${dateKey} - ${intention.description}`);
        } else {
          this.addConflict(
            `${currentDate.year}-${String(month).padStart(2, '0')}`,
            intention.description,
            'No available slots for month'
          );
        }
      }

      currentDate = currentDate.plus({ months: 1 });
    }
  }

  /**
   * Priority 5: Fill remaining gaps with bulk batches (FIFO by date received)
   */
  private async scheduleBulkBatches(userId: string, start: DateTime, end: DateTime): Promise<void> {
    const batches = await this.prisma.massBatch.findMany({
      where: {
        userId,
        seriesType: { in: ['BULK', 'DONOR_BATCH'] },
      },
      orderBy: { dateReceived: 'asc' },
    });

    for (const batch of batches) {
      let currentDate = start;
      let massesScheduled = 0;

      while (currentDate <= end && massesScheduled < batch.totalIntentions) {
        const dateKey = this.getDateKey(currentDate.toJSDate());
        const day = this.calendar.get(dateKey);

        if (day && !day.isBlocked && day.scheduled.length === 0) {
          // Schedule bulk mass
          const serialNumber = batch.startIndex + massesScheduled;
          const scheduled = await this.prisma.scheduledMass.create({
            data: {
              userId,
              date: currentDate.toJSDate(),
              massType: 'BULK',
              intentionDescription: `Bulk Batch (${batch.code}) #${serialNumber}`,
              serialNumber,
              batchId: batch.id,
              externalBatchCode: batch.code,
            },
          });

          day.scheduled.push(scheduled);
          massesScheduled++;

          this.logNote(`Bulk mass scheduled: ${dateKey} - ${batch.code} #${serialNumber}`);
        }

        currentDate = currentDate.plus({ days: 1 });
      }

      // Update batch statistics
      await this.prisma.massBatch.update({
        where: { id: batch.id },
        data: { scheduledCount: massesScheduled },
      });
    }
  }

  /**
   * Helper: Initialize calendar grid for entire year
   */
  private initializeCalendarDays(start: DateTime, end: DateTime): void {
    let currentDate = start;
    while (currentDate <= end) {
      const dateKey = this.getDateKey(currentDate.toJSDate());
      this.calendar.set(dateKey, {
        date: dateKey,
        isBlocked: false,
        scheduled: [],
      });
      currentDate = currentDate.plus({ days: 1 });
    }
  }

  /**
   * Helper: Convert date to YYYY-MM-DD key
   */
  private getDateKey(date: Date): string {
    const dt = DateTime.fromJSDate(date);
    return dt.toISODate();
  }

  /**
   * Helper: Get candidate days for month (exclude blocked, already scheduled, major feasts)
   */
  private getCandidateDaysForMonth(monthDate: DateTime, userId: string): DateTime[] {
    const candidates: DateTime[] = [];
    let currentDate = monthDate.startOf('month');
    const endOfMonth = monthDate.endOf('month');

    while (currentDate <= endOfMonth) {
      const dateKey = this.getDateKey(currentDate.toJSDate());
      const day = this.calendar.get(dateKey);

      if (day && !day.isBlocked && day.scheduled.length === 0 && !this.isMajorFeast(currentDate)) {
        candidates.push(currentDate);
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    return candidates;
  }

  /**
   * Helper: Check if date is a major Catholic feast (simple implementation)
   */
  private isMajorFeast(date: DateTime): boolean {
    const month = date.month;
    const day = date.day;

    const majrorFeasts = [
      [1, 1], // New Year
      [1, 6], // Epiphany
      [3, 17], // St. Patrick
      [4, 22], // Easter (approximate, varies yearly)
      [5, 1], // St. Joseph the Worker
      [8, 15], // Assumption
      [11, 1], // All Saints
      [12, 8], // Immaculate Conception
      [12, 25], // Christmas
    ];

    return majrorFeasts.some(([m, d]) => m === month && d === day);
  }

  /**
   * Helper: Random selection from array (Fisher-Yates shuffle)
   */
  private randomSelect<T>(items: T[], count: number): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  /**
   * Helper: Add conflict record
   */
  private addConflict(date: string, intention: string, reason: string): void {
    this.conflicts.push({ date, intention, reason });
  }

  /**
   * Helper: Log note to audit trail
   */
  private logNote(message: string): void {
    const timestamp = new Date().toISOString();
    this.notesLog.push(`[${timestamp}] ${message}`);
  }
}
