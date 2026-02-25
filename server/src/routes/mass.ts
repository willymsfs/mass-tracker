import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";
import { MassScheduler } from "../services/scheduler";

const prisma = new PrismaClient();
const router = Router();

// ============================================================================
// BLOCKED DAYS ENDPOINTS
// ============================================================================

// POST /blocked-day - Add a blocked day
router.post("/blocked-day", authMiddleware, async (req: any, res: Response) => {
  const { date, reason, reasonType } = req.body;

  if (!date || !reason) {
    return res.status(400).json({ error: "Date and reason are required" });
  }

  try {
    const blockedDay = await prisma.blockedDay.create({
      data: {
        userId: req.user.id,
        date: new Date(date),
        reason,
        reasonType: reasonType || "OTHER",
      },
    });

    res.status(201).json({ message: "Blocked day created", blockedDay });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /blocked-day/:id - Remove a blocked day
router.delete("/blocked-day/:id", authMiddleware, async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const blockedDay = await prisma.blockedDay.findUnique({ where: { id } });

    if (!blockedDay || blockedDay.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.blockedDay.delete({ where: { id } });
    res.json({ message: "Blocked day deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FIXED INTENTIONS ENDPOINTS
// ============================================================================

// POST /fixed-intention - Add a fixed intention (birthday, anniversary, etc.)
router.post("/fixed-intention", authMiddleware, async (req: any, res: Response) => {
  const { dateOfMonth, monthOnlyFlag, type, description } = req.body;

  if (!dateOfMonth || !type) {
    return res.status(400).json({ error: "dateOfMonth and type are required" });
  }

  try {
    const fixedIntention = await prisma.fixedIntention.create({
      data: {
        userId: req.user.id,
        dateOfMonth,
        monthOnlyFlag: monthOnlyFlag || false,
        type,
        description: description || null,
        conflictFlag: false,
      },
    });

    res.status(201).json({ message: "Fixed intention created", fixedIntention });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /fixed-intention/:id - Remove a fixed intention
router.delete("/fixed-intention/:id", authMiddleware, async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const intention = await prisma.fixedIntention.findUnique({ where: { id } });

    if (!intention || intention.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.fixedIntention.delete({ where: { id } });
    res.json({ message: "Fixed intention deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DECEASED MEMBERS ENDPOINTS
// ============================================================================

// POST /deceased - Register a deceased member
router.post("/deceased", authMiddleware, async (req: any, res: Response) => {
  const { name, dateOfDeath, funeralDate, manualDateFlag, scheduleDateOverride } = req.body;

  if (!name || !dateOfDeath) {
    return res.status(400).json({ error: "Name and dateOfDeath are required" });
  }

  try {
    const deceased = await prisma.deceased.create({
      data: {
        userId: req.user.id,
        name,
        dateOfDeath: new Date(dateOfDeath),
        funeralDate: funeralDate ? new Date(funeralDate) : null,
        manualDateFlag: manualDateFlag || false,
        scheduleDateOverride: scheduleDateOverride ? new Date(scheduleDateOverride) : null,
        targetDate: new Date(new Date(dateOfDeath).getTime() + 2 * 24 * 60 * 60 * 1000),
        conflictFlag: false,
      },
    });

    res.status(201).json({ message: "Deceased member registered", deceased });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /deceased/:id - Remove a deceased record
router.delete("/deceased/:id", authMiddleware, async (req: any, res: Response) => {
  const { id } = req.params;

  try {
    const deceased = await prisma.deceased.findUnique({ where: { id } });

    if (!deceased || deceased.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.deceased.delete({ where: { id } });
    res.json({ message: "Deceased record deleted" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// BATCH MANAGEMENT ENDPOINTS
// ============================================================================

// POST /batch - Submit a mass batch (Gregorian, Bulk, or Donor)
router.post("/batch", authMiddleware, async (req: any, res: Response) => {
  const { code, totalIntentions, seriesType, donorName } = req.body;

  if (!code || !totalIntentions || !seriesType) {
    return res.status(400).json({ error: "code, totalIntentions, and seriesType are required" });
  }

  try {
    // Calculate startIndex based on seriesType
    let startIndex = 1;
    if (seriesType === "BULK" || seriesType === "DONOR_BATCH") {
      const lastBulk = await prisma.massBatch.findFirst({
        where: { userId: req.user.id, seriesType: "BULK" },
        orderBy: { startIndex: "desc" },
      });
      startIndex = lastBulk ? lastBulk.startIndex + lastBulk.totalIntentions : 300;
    }

    const batch = await prisma.massBatch.create({
      data: {
        userId: req.user.id,
        code,
        totalIntentions,
        seriesType,
        startIndex,
        notes: donorName ? `Donor: ${donorName}` : null,
      },
    });

    // If Gregorian batch, create individual GregorianMass records
    if (seriesType === "GREGORIAN") {
      for (let i = 1; i <= totalIntentions; i++) {
        await prisma.gregorianMass.create({
          data: {
            userId: req.user.id,
            batchId: batch.id,
            donorName: code,
            seriesNumber: i,
            startDate: new Date(),
            status: "PENDING",
          },
        });
      }
    }

    res.status(201).json({ message: "Batch created", batch });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /batch-status/:batchId - Get batch progress
router.get("/batch-status/:batchId", authMiddleware, async (req: any, res: Response) => {
  const { batchId } = req.params;

  try {
    const batch = await prisma.massBatch.findUnique({
      where: { id: batchId },
      include: {
        scheduledMasses: true,
        gregorianMasses: true,
      },
    });

    if (!batch || batch.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json({
      batch,
      totalIntentions: batch.totalIntentions,
      scheduledCount: batch.scheduledMasses.length,
      pendingCount: batch.totalIntentions - batch.scheduledMasses.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CALENDAR VIEW ENDPOINTS
// ============================================================================

// GET /calendar/:year/:month - Get all masses for a specific month
router.get("/calendar/:year/:month", authMiddleware, async (req: any, res: Response) => {
  const { year, month } = req.params;

  try {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    // Get all scheduled masses for the month
    const scheduledMasses = await prisma.scheduledMass.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        batch: true,
        deceasedMember: true,
        fixedIntention: true,
        gregorianMass: true,
        personalIntention: true,
      },
      orderBy: { date: "asc" },
    });

    // Get blocked days for the month
    const blockedDays = await prisma.blockedDay.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      scheduledMasses,
      blockedDays,
      totalMasses: scheduledMasses.length,
      totalBlockedDays: blockedDays.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /calendar/:year/:month/:day - Get details for a specific day
router.get("/calendar/:year/:month/:day", authMiddleware, async (req: any, res: Response) => {
  const { year, month, day } = req.params;

  try {
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const masses = await prisma.scheduledMass.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: date,
          lt: nextDay,
        },
      },
      include: {
        batch: true,
        deceasedMember: true,
        fixedIntention: true,
        gregorianMass: true,
        personalIntention: true,
      },
    });

    const blockedDay = await prisma.blockedDay.findFirst({
      where: {
        userId: req.user.id,
        date: {
          gte: date,
          lt: nextDay,
        },
      },
    });

    res.json({
      date: date.toISOString().split("T")[0],
      masses,
      blockedDay,
      isBlocked: !!blockedDay,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SCHEDULER RUN ENDPOINT
// ============================================================================

// PUT /scheduler/run - Trigger the scheduler to rebuild the calendar
router.put("/scheduler/run", authMiddleware, async (req: any, res: Response) => {
  const { year } = req.body;

  if (!year) {
    return res.status(400).json({ error: "Year is required" });
  }

  try {
    const scheduler = new MassScheduler(prisma);
    const result = await scheduler.rebuildCalendarForUser(req.user.id, parseInt(year));

    res.json({
      message: "Scheduler completed",
      result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

