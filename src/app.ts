import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { prisma } from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Routes
import academicYearRoutes from "./routes/academicYears.js";
import attendanceRoutes from "./routes/attendance.js";
import authRoutes from "./routes/auth.js";
import badgeRoutes from "./routes/badge.js";
import classRoutes from "./routes/classes.js";
import gradeRoutes from "./routes/grades.js";
import homeworkRoutes from "./routes/homework.js";
import marksRoutes from "./routes/marks.js";
import paymentTypeRoutes from "./routes/payment-types.js";
import paymentRoutes from "./routes/payments.js";
import promotionRoutes from "./routes/promotion.js";
import reportRoutes from "./routes/reports.js";
import resultsRoutes from "./routes/results.js";
import settingsRoutes from "./routes/settings.js";
import studentRoutes from "./routes/students.js";
import subExamRoutes from "./routes/subexams.js";
import termRoutes from "./routes/terms.js";
import uploadRoutes from "./routes/upload.js";
import userRoutes from "./routes/users.js";

const app = express();

/**
 * =========================
 * CORS (FIXED & SIMPLE)
 * =========================
 */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://students-nine-tau.vercel.app",
      "http://192.168.1.3:3000",
    ],
    credentials: true,
  }),
);

/**
 * =========================
 * GLOBAL MIDDLEWARE
 * =========================
 */
app.use(express.json());
app.use(cookieParser());

/**
 * =========================
 * STATIC FILES
 * =========================
 */
app.use(express.static("public"));

/**
 * =========================
 * HEALTH CHECK
 * =========================
 */
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

/**
 * =========================
 * API ROUTES
 * =========================
 */
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payment-types", paymentTypeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/homework", homeworkRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/results", resultsRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/terms", termRoutes);
app.use("/api/subexams", subExamRoutes);
app.use("/api/users", userRoutes);
app.use("/api/grades", gradeRoutes);
app.use("/api/academic-years", academicYearRoutes);
app.use("/api/promotion", promotionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/badge", badgeRoutes);
app.use("/api/Fileupload", uploadRoutes);

/**
 * =========================
 * ERROR HANDLER (LAST)
 * =========================
 */
app.use(errorHandler);

export default app;
