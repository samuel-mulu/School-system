import * as reportService from '../services/report.service';
import { sendSuccess } from '../utils/responses';
export const getStudentReport = async (req, res, next) => {
    try {
        const report = await reportService.getStudentReport(req.params.studentId);
        sendSuccess(res, report);
    }
    catch (error) {
        next(error);
    }
};
export const getPaymentHistory = async (req, res, next) => {
    try {
        const history = await reportService.getPaymentHistory(req.params.studentId);
        sendSuccess(res, history);
    }
    catch (error) {
        next(error);
    }
};
export const getClassReport = async (req, res, next) => {
    try {
        const term = req.query.term;
        const report = await reportService.getClassReport(req.params.classId, term);
        sendSuccess(res, report);
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=report.controller.js.map