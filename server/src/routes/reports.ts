import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";

const prisma = new PrismaClient();
const router = Router();

// ============================================================================
// CANONICAL REGISTER ENDPOINT
// ============================================================================

// GET /canonical-register/:year - Generate canonical register with deceased summary
router.get("/canonical-register/:year", authMiddleware, async (req: any, res: Response) => {
  const { year } = req.params;

  try {
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);

    // Get all scheduled masses for the year
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
      },
      orderBy: { date: "asc" },
    });

    // Get deceased members for summary table
    const deceasedMembers = await prisma.deceased.findMany({
      where: { userId: req.user.id },
    });

    // Build canonical register data
    const register = scheduledMasses.map((mass, index) => ({
      serialNo: index + 1,
      dateOfReceipt: mass.batch?.dateReceived || mass.createdAt,
      fromWhom: mass.batch?.code || mass.externalBatchCode || "Unknown",
      dateCelebrated: mass.date,
      details: mass.intentionDescription || "Mass",
    }));

    // Build deceased summary
    const deceasedSummary = deceasedMembers.map((deceased) => ({
      name: deceased.name,
      dateOfDeath: deceased.dateOfDeath,
      dateCelebrated: deceased.massScheduledDate,
      status: deceased.massScheduledDate ? "Celebrated" : "Pending",
    }));

    // Verify monthly personal intentions (3 per month)
    const monthlyPersonalSummary = [];
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(parseInt(year), month - 1, 1);
      const monthEnd = new Date(parseInt(year), month, 0);

      const personalMasses = await prisma.scheduledMass.count({
        where: {
          userId: req.user.id,
          massType: "PERSONAL",
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      monthlyPersonalSummary.push({
        month,
        monthName: new Date(parseInt(year), month - 1).toLocaleDateString("en-US", {
          month: "long",
        }),
        count: personalMasses,
        verified: personalMasses === 3 ? "✓" : `${personalMasses}/3`,
      });
    }

    res.json({
      year: parseInt(year),
      title: `Canonical Register - Year ${year}`,
      register,
      deceasedSummary,
      monthlyPersonalSummary,
      totalMasses: scheduledMasses.length,
      totalDeceased: deceasedMembers.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// YEARLY MASS BOOK ENDPOINT
// ============================================================================

// GET /yearly-book/:year - Generate complete yearly mass book
router.get("/yearly-book/:year", authMiddleware, async (req: any, res: Response) => {
  const { year } = req.params;

  try {
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);

    // Get all scheduled masses
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
      },
      orderBy: { date: "asc" },
    });

    // Get blocked days
    const blockedDays = await prisma.blockedDay.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    // Build yearly book combining masses and blocked days
    const yearlyBook = [];

    // Add blocked days
    for (const blocked of blockedDays) {
      yearlyBook.push({
        date: blocked.date.toISOString().split("T")[0],
        type: "Blocked",
        description: blocked.reason,
        serialNum: "-",
        notes: "No Mass",
      });
    }

    // Add scheduled masses
    for (const mass of scheduledMasses) {
      yearlyBook.push({
        date: mass.date.toISOString().split("T")[0],
        type: mass.massType,
        description: mass.intentionDescription || mass.massType,
        serialNum: mass.serialNumber || "-",
        notes: mass.batch ? `Batch: ${mass.batch.code}` : "",
      });
    }

    // Sort by date
    yearlyBook.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      year: parseInt(year),
      title: `Yearly Mass Book - ${year}`,
      totalEntries: yearlyBook.length,
      totalMasses: scheduledMasses.length,
      totalBlockedDays: blockedDays.length,
      entries: yearlyBook,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DECEASED SUMMARY ENDPOINT
// ============================================================================

// GET /deceased-summary/:year - List deceased with death and celebration dates
router.get("/deceased-summary/:year", authMiddleware, async (req: any, res: Response) => {
  const { year } = req.params;

  try {
    const startDate = new Date(parseInt(year), 0, 1);
    const endDate = new Date(parseInt(year), 11, 31);

    // Get all deceased members
    const deceasedMembers = await prisma.deceased.findMany({
      where: { userId: req.user.id },
      orderBy: { dateOfDeath: "asc" },
    });

    // Build summary for each deceased
    const summary = deceasedMembers.map((deceased) => {
      const celebrationDate = deceased.massScheduledDate;
      const daysDelay = celebrationDate
        ? Math.floor(
            (celebrationDate.getTime() - deceased.dateOfDeath.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      return {
        name: deceased.name,
        dateOfDeath: deceased.dateOfDeath.toISOString().split("T")[0],
        dateCelebrated: celebrationDate ? celebrationDate.toISOString().split("T")[0] : "Pending",
        daysDelay,
        status: deceased.massScheduledDate ? "Celebrated" : "Pending",
        conflict: deceased.conflictFlag,
      };
    });

    // Filter by year if they have a celebration date in the year
    const yearSummary = summary.filter((item) => {
      if (!item.dateCelebrated || item.dateCelebrated === "Pending") return false;
      const celebYear = parseInt(item.dateCelebrated.split("-")[0]);
      return celebYear === parseInt(year);
    });

    res.json({
      year: parseInt(year),
      title: `Deceased Summary - ${year}`,
      total: yearSummary.length,
      entries: yearSummary,
      allTimeEntries: summary,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// MONTHLY PERSONAL INTENTIONS ENDPOINT
// ============================================================================

// GET /monthly-personal/:year - Verify 3 personal masses per month
router.get("/monthly-personal/:year", authMiddleware, async (req: any, res: Response) => {
  const { year } = req.params;

  try {
    const monthlyData = [];

    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(parseInt(year), month - 1, 1);
      const monthEnd = new Date(parseInt(year), month, 0);

      const personalMasses = await prisma.scheduledMass.findMany({
        where: {
          userId: req.user.id,
          massType: "PERSONAL",
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          personalIntention: true,
        },
        orderBy: { date: "asc" },
      });

      const monthName = new Date(parseInt(year), month - 1).toLocaleDateString("en-US", {
        month: "long",
      });

      monthlyData.push({
        month,
        monthName,
        count: personalMasses.length,
        verified: personalMasses.length === 3,
        masses: personalMasses.map((mass) => ({
          date: mass.date.toISOString().split("T")[0],
          description: mass.intentionDescription,
        })),
      });
    }

    const allVerified = monthlyData.every((m) => m.verified);
    const totalPersonalMasses = monthlyData.reduce((sum, m) => sum + m.count, 0);

    res.json({
      year: parseInt(year),
      title: `Monthly Personal Intentions - ${year}`,
      allVerified,
      totalExpected: 36, // 3 per month * 12 months
      totalActual: totalPersonalMasses,
      monthlyBreakdown: monthlyData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
