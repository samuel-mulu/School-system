import { prisma } from '../config/db';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';

interface CreateGradeData {
  name: string;
  order: number;
  isHighest?: boolean;
}

interface UpdateGradeData extends Partial<CreateGradeData> {}

export const createGrade = async (data: CreateGradeData) => {
  // Check if grade name already exists
  const existingName = await prisma.grade.findUnique({
    where: { name: data.name },
  });

  if (existingName) {
    throw new ConflictError('Grade with this name already exists');
  }

  // Check if order already exists
  const existingOrder = await prisma.grade.findUnique({
    where: { order: data.order },
  });

  if (existingOrder) {
    throw new ConflictError('Grade with this order already exists');
  }

  // If marking as highest, unmark any existing highest grade
  if (data.isHighest) {
    await prisma.grade.updateMany({
      where: { isHighest: true },
      data: { isHighest: false },
    });
  }

  const grade = await prisma.grade.create({
    data: {
      name: data.name,
      order: data.order,
      isHighest: data.isHighest || false,
    },
  });

  return grade;
};

export const getGrades = async () => {
  const grades = await prisma.grade.findMany({
    orderBy: {
      order: 'asc',
    },
  });

  return grades;
};

export const getGradeById = async (id: string) => {
  const grade = await prisma.grade.findUnique({
    where: { id },
    include: {
      classes: {
        take: 5,
        orderBy: {
          name: 'asc',
        },
      },
    },
  });

  if (!grade) {
    throw new NotFoundError('Grade not found');
  }

  return grade;
};

export const updateGrade = async (id: string, data: UpdateGradeData) => {
  const grade = await prisma.grade.findUnique({
    where: { id },
  });

  if (!grade) {
    throw new NotFoundError('Grade not found');
  }

  // Check name uniqueness if name is being updated
  if (data.name && data.name !== grade.name) {
    const existing = await prisma.grade.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictError('Grade with this name already exists');
    }
  }

  // Check order uniqueness if order is being updated
  if (data.order !== undefined && data.order !== grade.order) {
    const existing = await prisma.grade.findUnique({
      where: { order: data.order },
    });

    if (existing) {
      throw new ConflictError('Grade with this order already exists');
    }
  }

  // If marking as highest, unmark any existing highest grade
  if (data.isHighest && !grade.isHighest) {
    await prisma.grade.updateMany({
      where: { isHighest: true },
      data: { isHighest: false },
    });
  }

  const updated = await prisma.grade.update({
    where: { id },
    data,
  });

  return updated;
};

export const deleteGrade = async (id: string) => {
  const grade = await prisma.grade.findUnique({
    where: { id },
    include: {
      classes: {
        take: 1,
      },
    },
  });

  if (!grade) {
    throw new NotFoundError('Grade not found');
  }

  if (grade.classes.length > 0) {
    throw new BadRequestError('Cannot delete grade with associated classes');
  }

  await prisma.grade.delete({
    where: { id },
  });

  return { message: 'Grade deleted successfully' };
};

export const getNextGrade = async (currentGradeId: string) => {
  const currentGrade = await prisma.grade.findUnique({
    where: { id: currentGradeId },
  });

  if (!currentGrade) {
    throw new NotFoundError('Current grade not found');
  }

  // Check if current grade is highest
  if (currentGrade.isHighest) {
    return null; // No next grade
  }

  // Find next grade by order
  const nextGrade = await prisma.grade.findFirst({
    where: {
      order: {
        gt: currentGrade.order,
      },
    },
    orderBy: {
      order: 'asc',
    },
  });

  return nextGrade;
};

export const getHighestGrade = async () => {
  const highestGrade = await prisma.grade.findFirst({
    where: { isHighest: true },
  });

  return highestGrade;
};

