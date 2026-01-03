import * as promotionService from '../services/promotion.service';
import { sendSuccess } from '../utils/responses';
export const getPromotionPreview = async (req, res, next) => {
    try {
        const preview = await promotionService.getPromotionPreview();
        sendSuccess(res, preview);
    }
    catch (error) {
        next(error);
    }
};
export const promoteStudents = async (req, res, next) => {
    try {
        const result = await promotionService.promoteStudents();
        sendSuccess(res, result, 'Promotion completed successfully');
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=promotion.controller.js.map