import { UserRole } from "@prisma/client";
import bcrypt from 'bcrypt';
import { prisma } from "../config/db.js";
import { generateToken } from "../config/jwt.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors.js";

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

interface LoginData {
  email: string;
  password: string;
}

export const register = async (data: RegisterData) => {
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
    },
  });

  return user;
};

export const login = async (data: LoginData) => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.password);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate token
  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Get teacher classes if user is a teacher
  let teacherClasses: Array<{ id: string; name: string }> | undefined;
  if (user.role === 'TEACHER') {
    const classes = await prisma.class.findMany({
      where: { headTeacherId: user.id },
      select: {
        id: true,
        name: true,
      },
    });
    teacherClasses = classes;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      teacherClasses,
    },
    token,
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

