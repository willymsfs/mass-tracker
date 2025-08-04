import { Router } from "express";
import { PrismaClient, MassType } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";

const prisma = new PrismaClient();
const router = Router();

// Create a new mass log entry
router.post("/", authMiddleware, async (req: any, res) => {
  const userId = req.user.id;
  const { type, description, source } = req.body;
  let serialNumber: number | undefined;

  if (type === MassType.BULK) {
    const lastBulk = await prisma.mass.findFirst({
      where: { userId, type: MassType.BULK },
      orderBy: { massDate: "desc" },
    });
    serialNumber = lastBulk?.serialNumber ? Math.max(lastBulk.serialNumber - 1, 1) : 300;
  }
  
  try {
    const mass = await prisma.mass.create({
      data: {
        userId,
        type,
        description,
        source,
        serialNumber,
      },
    });
    res.json({ message: "Mass logged successfully", mass });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve masses for dashboard (example)
router.get("/month/:year/:month", authMiddleware, async (req: any, res) => {
  const userId = req.user.id;
  const { year, month } = req.params;
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0);

  try {
    const masses = await prisma.mass.findMany({
      where: {
        userId,
        massDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { massDate: "asc" },
    });
    res.json({ masses });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

