import bcrypt from 'bcrypt';
import { prisma } from "../config/db.js";
import { ConflictError, NotFoundError, BadRequestError } from "../utils/errors.js";

export const getUsers = async (role?: string) => {
  const where: any = {};
  if (role) {
    where.role = role;
  }
  
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      teacherClasses: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return users;
};

export const getTeachers = async () => {
  const teachers = await prisma.user.findMany({
    where: {
      role: 'TEACHER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      teacherClasses: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return teachers;
};

export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
  role: 'REGISTRAR' | 'TEACHER';
}) => {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      teacherClasses: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return user;
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      teacherClasses: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
};

export const updateUser = async (id: string, data: {
  name?: string;
  email?: string;
  password?: string;
}) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // If email is being updated, check for conflicts
  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }
  }

  // Prepare update data
  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.password) {
    // Hash password if provided
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      teacherClasses: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedUser;
};

export const deleteUser = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Prevent deleting OWNER
  if (user.role === 'OWNER') {
    throw new BadRequestError('Cannot delete OWNER user');
  }

  // Check if user is assigned as head teacher
  const classesWithTeacher = await prisma.class.findMany({
    where: { headTeacherId: id },
  });

  if (classesWithTeacher.length > 0) {
    throw new BadRequestError(
      `Cannot delete user. They are assigned as head teacher to ${classesWithTeacher.length} class(es). Please reassign classes first.`
    );
  }

  await prisma.user.delete({
    where: { id },
  });
};

