// server/src/routes/mass.ts
import { Router } from "express";
import { PrismaClient, MassType } from "@prisma/client";
const prisma = new PrismaClient();
const router = Router();

// Create a mass entry
router.post("/", async (req, res) => {
  const { userId, type, description, source } = req.body;
  let serialNumber: number | undefined;
  
  if (type === MassType.BULK) {
    // Example logic to assign a bulk serial number
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
  } catch (error) {
    res.status(500).json({ error });
  }
});

export default router;
