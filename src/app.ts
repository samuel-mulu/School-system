import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { prisma } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Routes
import academicYearRoutes from "./routes/academicYears.js";
import attendanceRoutes from "./routes/attendance.js";
import authRoutes from "./routes/auth.js";
import classRoutes from "./routes/classes.js";
import gradeRoutes from "./routes/grades.js";
import marksRoutes from "./routes/marks.js";
import paymentRoutes from "./routes/payments.js";
import promotionRoutes from "./routes/promotion.js";
import reportRoutes from "./routes/reports.js";
import settingsRoutes from "./routes/settings.js";
import studentRoutes from "./routes/students.js";
import subExamRoutes from "./routes/subexams.js";
import termRoutes from "./routes/terms.js";
import userRoutes from "./routes/users.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Explicit origin for cookies
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/health", async (_req, res) => {
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
app.use("/api/users", userRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/academic-years", academicYearRoutes);
app.use("/api/promotion", promotionRoutes);
app.use("/api/settings", settingsRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
