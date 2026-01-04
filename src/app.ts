import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Routes
import authRoutes from "./routes/auth.js";
import studentRoutes from "./routes/students.js";
import classRoutes from "./routes/classes.js";
import paymentRoutes from "./routes/payments.js";
import attendanceRoutes from "./routes/attendance.js";
import marksRoutes from "./routes/marks.js";
import reportRoutes from "./routes/reports.js";
import termRoutes from "./routes/terms.js";
import subExamRoutes from "./routes/subexams.js";
import userRoutes from "./routes/users.js";
import gradeRoutes from "./routes/grades.js";
import academicYearRoutes from "./routes/academicYears.js";
import promotionRoutes from "./routes/promotion.js";
import settingsRoutes from "./routes/settings.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: true, // Allow all origins
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
