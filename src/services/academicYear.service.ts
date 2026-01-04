import { prisma } from "../config/db.js";
import { NotFoundError, ConflictError, BadRequestError } from "../utils/errors.js";

interface CreateAcademicYearData {
  name: string;
  startDate: Date;
  endDate?: Date;
}

export const createAcademicYear = async (data: CreateAcademicYearData) => {
  // Check if academic year name already exists
  const existing = await prisma.academicYear.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw new ConflictError('Academic year with this name already exists');
  }

  // Validate dates
  if (data.endDate && data.endDate <= data.startDate) {
    throw new BadRequestError('End date must be after start date');
  }

  const academicYear = await prisma.academicYear.create({
    data: {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'CLOSED' as const, // New years start as CLOSED
    },
  });

  return academicYear;
};

export const getAcademicYears = async () => {
  const academicYears = await prisma.academicYear.findMany({
    orderBy: {
      startDate: 'desc',
    },
    include: {
      classes: {
        take: 5,
        orderBy: {
          name: 'asc',
        },
      },
    },
  });

  return academicYears;
};

export const getAcademicYearById = async (id: string) => {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id },
    include: {
      classes: {
        include: {
          grade: true,
          headTeacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      },
    },
  });

  if (!academicYear) {
    throw new NotFoundError('Academic year not found');
  }

  return academicYear;
};

export const getActiveAcademicYear = async () => {
  const activeYear = await prisma.academicYear.findFirst({
    where: { status: 'ACTIVE' as const },
    include: {
      classes: {
        include: {
          grade: true,
        },
      },
    },
  });

  return activeYear;
};

export const activateAcademicYear = async (id: string) => {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id },
  });

  if (!academicYear) {
    throw new NotFoundError('Academic year not found');
  }

  // Close all other academic years
  await prisma.academicYear.updateMany({
    where: {
      status: 'ACTIVE' as const,
    },
    data: {
      status: 'CLOSED' as const,
    },
  });

  // Activate the selected year
  const updated = await prisma.academicYear.update({
    where: { id },
    data: {
      status: 'ACTIVE' as const,
    },
    include: {
      classes: {
        include: {
          grade: true,
        },
      },
    },
  });

  return updated;
};

export const closeAcademicYear = async (id: string) => {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id },
  });

  if (!academicYear) {
    throw new NotFoundError('Academic year not found');
  }

  const updated = await prisma.academicYear.update({
    where: { id },
    data: {
      status: 'CLOSED' as const,
    },
  });

  return updated;
};

export const updateAcademicYear = async (
  id: string,
  data: Partial<CreateAcademicYearData>
) => {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id },
  });

  if (!academicYear) {
    throw new NotFoundError('Academic year not found');
  }

  // Check name uniqueness if name is being updated
  if (data.name && data.name !== academicYear.name) {
    const existing = await prisma.academicYear.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictError('Academic year with this name already exists');
    }
  }

  // Validate dates
  const startDate = data.startDate || academicYear.startDate;
  const endDate = data.endDate !== undefined ? data.endDate : academicYear.endDate;

  if (endDate && endDate <= startDate) {
    throw new BadRequestError('End date must be after start date');
  }

  const updated = await prisma.academicYear.update({
    where: { id },
    data,
  });

  return updated;
};

