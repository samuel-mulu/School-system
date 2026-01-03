import * as settingsService from '../services/settings.service';
import { sendSuccess } from '../utils/responses';
export const getSetting = async (req, res, next) => {
    try {
        const setting = await settingsService.getSetting(req.params.key);
        sendSuccess(res, setting);
    }
    catch (error) {
        next(error);
    }
};
export const getAllSettings = async (req, res, next) => {
    try {
        const settings = await settingsService.getAllSettings();
        sendSuccess(res, settings);
    }
    catch (error) {
        next(error);
    }
};
export const updateSetting = async (req, res, next) => {
    try {
        const setting = await settingsService.updateSetting(req.params.key, req.body.value, req.body.description);
        sendSuccess(res, setting, 'Setting updated successfully');
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=settings.controller.js.map