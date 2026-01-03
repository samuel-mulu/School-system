import * as attendanceService from '../services/attendance.service';
import { sendSuccess } from '../utils/responses';
export const markAttendance = async (req, res, next) => {
    try {
        const attendance = await attendanceService.markAttendance(req.body, req.user?.userId, req.user?.role);
        sendSuccess(res, attendance, 'Attendance marked successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
export const markBulkAttendance = async (req, res, next) => {
    try {
        const { classId, date, attendanceData } = req.body;
        const results = await attendanceService.markBulkAttendance(classId, new Date(date), attendanceData, req.user?.userId, req.user?.role);
        sendSuccess(res, results, 'Bulk attendance marked successfully');
    }
    catch (error) {
        next(error);
    }
};
export const getAttendance = async (req, res, next) => {
    try {
        const filters = {
            studentId: req.query.studentId,
            classId: req.query.classId,
            date: req.query.date ? new Date(req.query.date) : undefined,
            startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
            endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
            status: req.query.status,
            page: req.query.page ? parseInt(req.query.page) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            userId: req.user?.userId,
            userRole: req.user?.role,
        };
        const result = await attendanceService.getAttendance(filters);
        sendSuccess(res, result);
    }
    catch (error) {
        next(error);
    }
};
export const getAttendanceById = async (req, res, next) => {
    try {
        const attendance = await attendanceService.getAttendanceById(req.params.id, req.user?.userId, req.user?.role);
        sendSuccess(res, attendance);
    }
    catch (error) {
        next(error);
    }
};
export const getClassAttendanceForDate = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const result = await attendanceService.getClassAttendanceForDate(classId, date, req.user?.userId, req.user?.role);
        sendSuccess(res, result);
    }
    catch (error) {
        next(error);
    }
};
export const updateAttendance = async (req, res, next) => {
    try {
        const attendance = await attendanceService.updateAttendance(req.params.id, req.body, req.user?.userId, req.user?.role);
        sendSuccess(res, attendance, 'Attendance updated successfully');
    }
    catch (error) {
        next(error);
    }
};
export const deleteAttendance = async (req, res, next) => {
    try {
        const result = await attendanceService.deleteAttendance(req.params.id);
        sendSuccess(res, result, 'Attendance deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
export const getClassAttendanceDates = async (req, res, next) => {
    try {
        const { classId } = req.params;
        const dates = await attendanceService.getClassAttendanceDates(classId, req.user?.userId, req.user?.role);
        sendSuccess(res, dates);
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=attendance.controller.js.map