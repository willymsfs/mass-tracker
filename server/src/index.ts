import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import massRoutes from "./routes/mass";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/mass", massRoutes);

app.get("/", (req, res) => {
  res.send("Mass Tracker API is live!");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

