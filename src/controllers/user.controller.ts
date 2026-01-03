import type { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { sendSuccess } from '../utils/responses';

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { role } = req.query;
    const users = await userService.getUsers(role as string | undefined);
    sendSuccess(res, users);
  } catch (error) {
    next(error);
  }
};

export const getTeachers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teachers = await userService.getTeachers();
    sendSuccess(res, teachers);
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.createUser(req.body);
    sendSuccess(res, user, 'User created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getUserById(req.params.id);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    sendSuccess(res, user, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await userService.deleteUser(req.params.id);
    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

