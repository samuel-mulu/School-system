import type { NextFunction, Request, Response } from "express";
import * as badgeService from "../services/badge.service.js";
import { BadRequestError } from "../utils/errors.js";
import { sendSuccess } from "../utils/responses.js";

export const getBadge = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const format = (req.query.format as string) || "pdf";
    const side = (req.query.side as string) || "combined";
    const minimal = req.query.minimal === "true" || req.query.type === "minimal";

    console.log(`[badge-debug] Controller: Starting download for student: ${studentId}, format: ${format}, side: ${side}, minimal: ${minimal}`);

    // Validate format
    if (!["pdf", "png"].includes(format)) {
      console.warn(`[badge-debug] Invalid format: ${format}`);
      throw new BadRequestError('Invalid format. Must be "pdf" or "png"');
    }

    // Validate side
    if (!["front", "back", "combined"].includes(side)) {
      console.warn(`[badge-debug] Invalid side: ${side}`);
      throw new BadRequestError(
        'Invalid side. Must be "front", "back", or "combined"',
      );
    }

    // Get student badge data
    const badgeData = await badgeService.getStudentBadgeData(studentId);
    console.log(`[badge-debug] Controller: Data fetched for ${badgeData.student.firstName}`);

    // Auto-detect environment: use localhost for dev, production URL for prod
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === undefined ||
      process.env.PARENTS_PORTAL_BASE_URL?.includes("localhost");

    const parentsPortalBaseUrl =
      process.env.PARENTS_PORTAL_BASE_URL ||
      (isDevelopment
        ? "http://localhost:3000"
        : "https://parents-portal-x9sp.vercel.app"
      )
        .trim()
        .replace(/\/+$/, "");
    const qrPrefixRaw = (
      process.env.PARENTS_PORTAL_QR_PREFIX || "/parents/"
    ).trim();
    const qrSuffixRaw = (
      process.env.PARENTS_PORTAL_QR_SUFFIX || "/attendance"
    ).trim();

    const qrPrefix = (
      qrPrefixRaw.startsWith("/") ? qrPrefixRaw : `/${qrPrefixRaw}`
    ).replace(/\/+$/, "/");
    const qrSuffix = qrSuffixRaw.startsWith("/")
      ? qrSuffixRaw
      : `/${qrSuffixRaw}`;

    const qrCodeText = `${parentsPortalBaseUrl}${qrPrefix}${badgeData.student.id}${qrSuffix}`;

    if (process.env.DEBUG_BADGE_QR === "true") {
      console.log("[badge] qrCodeText:", qrCodeText);
    }
    const qrCodeDataUrl = await badgeService.generateQRCode(qrCodeText);

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    if (side === "combined" && format === "pdf") {
      // Generate combined PDF (front + back)
      const frontHtml = badgeService.renderBadgeHTML(
        "front",
        badgeData,
        qrCodeDataUrl,
        minimal,
      );
      const backHtml = badgeService.renderBadgeHTML(
        "back",
        badgeData,
        qrCodeDataUrl,
      );
      buffer = await badgeService.generateCombinedPDF(frontHtml, backHtml);
      contentType = "application/pdf";
      filename = `badge-${studentId}-combined.pdf`;
    } else {
      // Generate single side
      const html = badgeService.renderBadgeHTML(
        side as "front" | "back",
        badgeData,
        qrCodeDataUrl,
        minimal,
      );

      if (format === "pdf") {
        buffer = await badgeService.generateBadgePDF(html);
        contentType = "application/pdf";
        filename = `badge-${studentId}-${side}.pdf`;
      } else {
        buffer = await badgeService.generateBadgePNG(html);
        contentType = "image/png";
        filename = `badge-${studentId}-${side}.png`;
      }
    }

    // Set headers and send response
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const getBadgePreview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const badgeData = await badgeService.getStudentBadgeData(studentId);

    // Auto-detect environment: use localhost for dev, production URL for prod
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === undefined ||
      process.env.PARENTS_PORTAL_BASE_URL?.includes("localhost");

    const parentsPortalBaseUrl =
      process.env.PARENTS_PORTAL_BASE_URL ||
      (isDevelopment
        ? "http://localhost:3000"
        : "https://parents-portal-x9sp.vercel.app"
      )
        .trim()
        .replace(/\/+$/, "");
    const qrPrefixRaw = (
      process.env.PARENTS_PORTAL_QR_PREFIX || "/parents/"
    ).trim();
    const qrSuffixRaw = (
      process.env.PARENTS_PORTAL_QR_SUFFIX || "/attendance"
    ).trim();

    const qrPrefix = (
      qrPrefixRaw.startsWith("/") ? qrPrefixRaw : `/${qrPrefixRaw}`
    ).replace(/\/+$/, "/");
    const qrSuffix = qrSuffixRaw.startsWith("/")
      ? qrSuffixRaw
      : `/${qrSuffixRaw}`;

    const qrCodeText = `${parentsPortalBaseUrl}${qrPrefix}${badgeData.student.id}${qrSuffix}`;

    // Generate QR code for preview
    const qrCodeDataUrl = await badgeService.generateQRCode(qrCodeText);

    // Return complete badge data including QR code
    const previewData = {
      ...badgeData,
      qrCode: qrCodeDataUrl,
      qrCodeText:
        process.env.DEBUG_BADGE_QR === "true" ? qrCodeText : undefined,
    };

    sendSuccess(res, previewData);
  } catch (error) {
    next(error);
  }
};
