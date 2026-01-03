import * as studentService from '../services/student.service';
import { sendSuccess } from '../utils/responses';
export const createStudent = async (req, res, next) => {
    try {
        const student = await studentService.createStudent(req.body);
        sendSuccess(res, student, 'Student registered successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
export const getStudents = async (req, res, next) => {
    try {
        const filters = {
            classStatus: req.query.classStatus,
            paymentStatus: req.query.paymentStatus,
            search: req.query.search,
            classId: req.query.classId,
            page: req.query.page ? parseInt(req.query.page) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            userId: req.user?.userId,
            userRole: req.user?.role,
        };
        const result = await studentService.getStudents(filters);
        sendSuccess(res, result);
    }
    catch (error) {
        next(error);
    }
};
export const getStudentById = async (req, res, next) => {
    try {
        const student = await studentService.getStudentById(req.params.id, req.user?.userId, req.user?.role);
        sendSuccess(res, student);
    }
    catch (error) {
        next(error);
    }
};
export const updateStudent = async (req, res, next) => {
    try {
        const student = await studentService.updateStudent(req.params.id, req.body);
        sendSuccess(res, student, 'Student updated successfully');
    }
    catch (error) {
        next(error);
    }
};
export const assignStudentToClass = async (req, res, next) => {
    try {
        const { classId, reason } = req.body;
        const student = await studentService.assignStudentToClass(req.params.id, classId, reason);
        sendSuccess(res, student, 'Student assigned to class successfully');
    }
    catch (error) {
        next(error);
    }
};
export const transferStudent = async (req, res, next) => {
    try {
        const { newClassId, reason } = req.body;
        const student = await studentService.transferStudent(req.params.id, newClassId, reason);
        sendSuccess(res, student, 'Student transferred successfully');
    }
    catch (error) {
        next(error);
    }
};
export const deleteStudent = async (req, res, next) => {
    try {
        const result = await studentService.deleteStudent(req.params.id);
        sendSuccess(res, result, 'Student deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=student.controller.js.map