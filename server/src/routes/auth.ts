import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = Router();

// Register route (for creating a priest account)
router.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword },
    });
    res.json({ message: "User registered successfully", userId: user.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login route (returns JWT token)
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
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

export default router;

