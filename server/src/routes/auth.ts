import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";

const prisma = new PrismaClient();
const router = Router();

// Register route (for creating a priest account with full profile)
router.post("/register", async (req: Request, res: Response) => {
  const { username, password, email, name, province, congregation, dateOfBirth, dateOfOrdination } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword,
        email: email || null,
        name: name || null,
        province: province || null,
        congregation: congregation || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        dateOfOrdination: dateOfOrdination ? new Date(dateOfOrdination) : null,
      },
    });

    const secret = process.env.JWT_SECRET || "supersecretkey";
    const token = jwt.sign({ id: user.id, username: user.username }, secret, {
      expiresIn: "1d",
    });

    res.status(201).json({
      message: "User registered successfully",
      userId: user.id,
      token,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: error.message });
  }
});

// Login route (returns JWT token)
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET || "supersecretkey";
    const token = jwt.sign({ id: user.id, username: user.username }, secret, {
      expiresIn: "1d",
    });

    res.json({ token });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get("/profile", authMiddleware, async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        province: true,
        congregation: true,
        dateOfBirth: true,
        dateOfOrdination: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put("/profile", authMiddleware, async (req: any, res: Response) => {
  const { email, name, province, congregation, dateOfBirth, dateOfOrdination } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        email: email !== undefined ? email : undefined,
        name: name !== undefined ? name : undefined,
        province: province !== undefined ? province : undefined,
        congregation: congregation !== undefined ? congregation : undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        dateOfOrdination: dateOfOrdination ? new Date(dateOfOrdination) : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        province: true,
        congregation: true,
        dateOfBirth: true,
        dateOfOrdination: true,
        updatedAt: true,
      },
    });

    res.json({ message: "Profile updated successfully", user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

