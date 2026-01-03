import * as academicYearService from '../services/academicYear.service';
import { sendSuccess } from '../utils/responses';
export const createAcademicYear = async (req, res, next) => {
    try {
        const academicYear = await academicYearService.createAcademicYear({
            name: req.body.name,
            startDate: new Date(req.body.startDate),
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        });
        sendSuccess(res, academicYear, 'Academic year created successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
export const getAcademicYears = async (req, res, next) => {
    try {
        const academicYears = await academicYearService.getAcademicYears();
        sendSuccess(res, academicYears);
    }
    catch (error) {
        next(error);
    }
};
export const getAcademicYearById = async (req, res, next) => {
    try {
        const academicYear = await academicYearService.getAcademicYearById(req.params.id);
        sendSuccess(res, academicYear);
    }
    catch (error) {
        next(error);
    }
};
export const getActiveAcademicYear = async (req, res, next) => {
    try {
        const academicYear = await academicYearService.getActiveAcademicYear();
        sendSuccess(res, academicYear);
    }
    catch (error) {
        next(error);
    }
};
export const activateAcademicYear = async (req, res, next) => {
    try {
        const academicYear = await academicYearService.activateAcademicYear(req.params.id);
        sendSuccess(res, academicYear, 'Academic year activated successfully');
    }
    catch (error) {
        next(error);
    }
};
export const closeAcademicYear = async (req, res, next) => {
    try {
        const academicYear = await academicYearService.closeAcademicYear(req.params.id);
        sendSuccess(res, academicYear, 'Academic year closed successfully');
    }
    catch (error) {
        next(error);
    }
};
export const updateAcademicYear = async (req, res, next) => {
    try {
        const updateData = {};
        if (req.body.name)
            updateData.name = req.body.name;
        if (req.body.startDate)
            updateData.startDate = new Date(req.body.startDate);
        if (req.body.endDate !== undefined) {
            updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
        }
        const academicYear = await academicYearService.updateAcademicYear(req.params.id, updateData);
        sendSuccess(res, academicYear, 'Academic year updated successfully');
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=academicYear.controller.js.map