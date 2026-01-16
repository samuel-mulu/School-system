import type { Request, Response, NextFunction } from 'express';
import * as badgeService from '../services/badge.service.js';
import { sendSuccess, sendError } from '../utils/responses.js';
import { BadRequestError } from '../utils/errors.js';

export const getBadge = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const format = (req.query.format as string) || 'pdf';
    const side = (req.query.side as string) || 'combined';

    // Validate format
    if (!['pdf', 'png'].includes(format)) {
      throw new BadRequestError('Invalid format. Must be "pdf" or "png"');
    }

    // Validate side
    if (!['front', 'back', 'combined'].includes(side)) {
      throw new BadRequestError('Invalid side. Must be "front", "back", or "combined"');
    }

    // Get student badge data
    const badgeData = await badgeService.getStudentBadgeData(studentId);

    // Generate QR code using student number (5-digit format) or fallback to UUID
    const qrCodeText = badgeData.student.studentNumber 
      ? String(badgeData.student.studentNumber).padStart(5, '0')
      : badgeData.student.id;
    const qrCodeDataUrl = await badgeService.generateQRCode(qrCodeText);

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    if (side === 'combined' && format === 'pdf') {
      // Generate combined PDF (front + back)
      const frontHtml = badgeService.renderBadgeHTML('front', badgeData, qrCodeDataUrl);
      const backHtml = badgeService.renderBadgeHTML('back', badgeData, qrCodeDataUrl);
      buffer = await badgeService.generateCombinedPDF(frontHtml, backHtml);
      contentType = 'application/pdf';
      filename = `badge-${studentId}-combined.pdf`;
    } else {
      // Generate single side
      const html = badgeService.renderBadgeHTML(side, badgeData, qrCodeDataUrl);
      
      if (format === 'pdf') {
        buffer = await badgeService.generateBadgePDF(html, side as 'front' | 'back');
        contentType = 'application/pdf';
        filename = `badge-${studentId}-${side}.pdf`;
      } else {
        buffer = await badgeService.generateBadgePNG(html, side as 'front' | 'back');
        contentType = 'image/png';
        filename = `badge-${studentId}-${side}.png`;
      }
    }

    // Set headers and send response
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const getBadgePreview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { studentId } = req.params;
    const badgeData = await badgeService.getStudentBadgeData(studentId);
    sendSuccess(res, badgeData);
  } catch (error) {
    next(error);
  }
};
