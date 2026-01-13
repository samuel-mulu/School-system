import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

export interface UploadOptions {
  folder?: string;
  public_id?: string;
  transformation?: Array<Record<string, unknown>>;
}

/**
 * Upload image to Cloudinary
 * @param filePath - Path to the file or base64 string
 * @param options - Upload options (folder, public_id, transformations)
 * @returns Promise with upload result containing URL
 */
export async function uploadToCloudinary(
  filePath: string | Buffer,
  options: UploadOptions = {}
): Promise<UploadApiResponse> {
  const { folder, public_id, transformation } = options;

  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      resource_type: 'image',
      ...(folder && { folder }),
      ...(public_id && { public_id }),
      ...(transformation && { transformation }),
    };

    if (Buffer.isBuffer(filePath)) {
      // Upload from buffer
      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed: No result returned'));
          }
        })
        .end(filePath);
    } else {
      // Upload from file path or URL
      cloudinary.uploader.upload(filePath, uploadOptions, (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      });
    }
  });
}

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Promise with deletion result
 */
export async function deleteFromCloudinary(
  publicId: string
): Promise<{ result: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error);
      } else if (result) {
        resolve(result as { result: string });
      } else {
        reject(new Error('Deletion failed: No result returned'));
      }
    });
  });
}

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID or null if URL is invalid
 */
export function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    // Or: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (match && match[1]) {
      // Remove folder prefix if present (e.g., "students/profiles/abc123" -> "students/profiles/abc123")
      return match[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Delete image from Cloudinary by URL
 * Extracts public ID from URL and deletes the image
 * @param url - Cloudinary URL
 * @returns Promise with deletion result
 */
export async function deleteImageByUrl(url: string): Promise<{ result: string }> {
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) {
    throw new Error('Invalid Cloudinary URL: Could not extract public ID');
  }
  return deleteFromCloudinary(publicId);
}

export default cloudinary;
