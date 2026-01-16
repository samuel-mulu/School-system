import { prisma } from "../config/db.js";
import { NotFoundError } from "../utils/errors.js";

const DEFAULT_PROMOTION_THRESHOLD = '60.0';

export const getSetting = async (key: string) => {
  const setting = await prisma.systemSettings.findUnique({
    where: { key },
  });

  if (!setting) {
    // Return default for promotionThreshold if not set
    if (key === 'promotionThreshold') {
      // Create default setting if it doesn't exist
      return await prisma.systemSettings.create({
        data: {
          key: 'promotionThreshold',
          value: DEFAULT_PROMOTION_THRESHOLD,
          description: 'Minimum average score required for student promotion (0-100)',
        },
      });
    }
    throw new NotFoundError(`Setting "${key}" not found`);
  }

  return setting;
};

export const updateSetting = async (key: string, value: string, description?: string) => {
  // Validate promotionThreshold value
  if (key === 'promotionThreshold') {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      throw new Error('Promotion threshold must be a number between 0 and 100');
    }
  }

  const existing = await prisma.systemSettings.findUnique({
    where: { key },
  });

  if (existing) {
    const updated = await prisma.systemSettings.update({
      where: { key },
      data: {
        value,
        description: description !== undefined ? description : existing.description,
      },
    });
    return updated;
  } else {
    // Create new setting if it doesn't exist
    const created = await prisma.systemSettings.create({
      data: {
        key,
        value,
        description: description || '',
      },
    });
    return created;
  }
};

export const getAllSettings = async () => {
  const settings = await prisma.systemSettings.findMany({
    orderBy: {
      key: 'asc',
    },
  });

  return settings;
};

// Helper functions for school information
export const getSchoolName = async (): Promise<string> => {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'schoolName' },
  });
  return setting?.value || 'School Name';
};

export const getSchoolContactNumber = async (): Promise<string> => {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'schoolContactNumber' },
  });
  return setting?.value || '(000) 0000 000 000';
};

export const getSchoolLogoUrl = async (): Promise<string | null> => {
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'schoolLogoUrl' },
  });
  return setting?.value || null;
};
