import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./config/db";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth";
import studentRoutes from "./routes/students";
import classRoutes from "./routes/classes";
import paymentRoutes from "./routes/payments";
import attendanceRoutes from "./routes/attendance";
import marksRoutes from "./routes/marks";
import reportRoutes from "./routes/reports";
import termRoutes from "./routes/terms";
import subExamRoutes from "./routes/subexams";

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/terms", termRoutes);
app.use("/api/subexams", subExamRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
