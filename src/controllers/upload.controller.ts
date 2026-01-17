import type { Request, Response, NextFunction } from 'express';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import { sendSuccess } from '../utils/responses.js';
import { BadRequestError } from '../utils/errors.js';

/**
 * Upload KYC (Know Your Customer) documents
 * Accepts image files and uploads them to Cloudinary
 */
export const uploadKYC = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    
    if (!file) {
      throw new BadRequestError('No file provided');
    }

    // Validate file type (images only by default, but can be extended)
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestError('File must be an image');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestError('File size must be less than 5MB');
    }

    // Upload to Cloudinary in KYC folder
    const result = await uploadToCloudinary(file.buffer, {
      folder: 'kyc/documents',
    });

    sendSuccess(res, {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    }, 'KYC document uploaded successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * General file upload endpoint
 * Accepts image files and uploads them to Cloudinary
 */
export const uploadFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    const folder = (req.body.folder as string) || 'uploads';
    
    if (!file) {
      throw new BadRequestError('No file provided');
    }

    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestError('File must be an image');
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestError('File size must be less than 5MB');
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file.buffer, {
      folder: folder,
    });

    sendSuccess(res, {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    }, 'File uploaded successfully');
  } catch (error) {
    next(error);
  }
};
