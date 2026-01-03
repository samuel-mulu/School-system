import { prisma } from '../config/db';
import { NotFoundError } from '../utils/errors';
const DEFAULT_PROMOTION_THRESHOLD = '60.0';
export const getSetting = async (key) => {
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
export const updateSetting = async (key, value, description) => {
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
    }
    else {
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
//# sourceMappingURL=settings.service.js.map