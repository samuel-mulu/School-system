import * as userService from '../services/user.service';
import { sendSuccess } from '../utils/responses';
export const getUsers = async (req, res, next) => {
    try {
        const { role } = req.query;
        const users = await userService.getUsers(role);
        sendSuccess(res, users);
    }
    catch (error) {
        next(error);
    }
};
export const getTeachers = async (req, res, next) => {
    try {
        const teachers = await userService.getTeachers();
        sendSuccess(res, teachers);
    }
    catch (error) {
        next(error);
    }
};
export const createUser = async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body);
        sendSuccess(res, user, 'User created successfully', 201);
    }
    catch (error) {
        next(error);
    }
};
export const getUserById = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        sendSuccess(res, user);
    }
    catch (error) {
        next(error);
    }
};
export const updateUser = async (req, res, next) => {
    try {
        const user = await userService.updateUser(req.params.id, req.body);
        sendSuccess(res, user, 'User updated successfully');
    }
    catch (error) {
        next(error);
    }
};
export const deleteUser = async (req, res, next) => {
    try {
        await userService.deleteUser(req.params.id);
        sendSuccess(res, null, 'User deleted successfully');
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=user.controller.js.map