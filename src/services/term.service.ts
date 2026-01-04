import { prisma } from "../config/db.js";
import { NotFoundError, ConflictError, BadRequestError } from "../utils/errors.js";

export const createTerm = async (data: {
  name: string;
  academicYearId: string;
  startDate: Date;
  endDate?: Date;
}) => {
  // Check if term already exists for this academic year
  // Use findFirst since composite unique constraint might not exist until migration is run
  const existing = await prisma.term.findFirst({
    where: {
      name: data.name,
      academicYearId: data.academicYearId,
    },
  });

  if (existing) {
    throw new ConflictError(
      `Term "${data.name}" already exists for this academic year`
    );
  }

  // Validate dates
  if (data.endDate && data.endDate <= data.startDate) {
    throw new BadRequestError('End date must be after start date');
  }

  // Validate that academic year exists
  const academicYear = await prisma.academicYear.findUnique({
    where: { id: data.academicYearId },
  });

  if (!academicYear) {
    throw new NotFoundError('Academic year not found');
  }

  // Validate that term dates are within academic year dates
  if (data.startDate < academicYear.startDate) {
    throw new BadRequestError('Term start date must be after academic year start date');
  }

  if (academicYear.endDate && data.endDate && data.endDate > academicYear.endDate) {
    throw new BadRequestError('Term end date must be before academic year end date');
  }

  const term = await prisma.term.create({
    data: {
      name: data.name,
      academicYearId: data.academicYearId,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  });

  return term;
};

export const getTerms = async (academicYearId?: string) => {
  const where = academicYearId ? { academicYearId } : {};

  try {
    const terms = await prisma.term.findMany({
      where,
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { startDate: 'asc' },
      ],
    });

    return terms;
  } catch (error: any) {
    // Fallback if relation doesn't exist or Prisma client is out of sync
    // Try without the relation first
    if (error.message?.includes('academicYear') || error.message?.includes('Unknown argument')) {
      const terms = await prisma.term.findMany({
        where,
        orderBy: { startDate: 'asc' },
      });
      return terms;
    }
    throw error;
  }
};

export const getTermById = async (id: string) => {
  const term = await prisma.term.findUnique({
    where: { id },
    include: {
      subExams: {
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  return term;
};

export const getTermByName = async (name: string, academicYearId?: string) => {
  if (academicYearId) {
    // Use findFirst since composite unique constraint might not exist until migration is run
    const term = await prisma.term.findFirst({
      where: {
        name,
        academicYearId,
      },
    });

    if (!term) {
      throw new NotFoundError(`Term "${name}" not found for this academic year`);
    }

    return term;
  }

  // If no academicYearId provided, find first matching term (for backward compatibility)
  const term = await prisma.term.findFirst({
    where: { name },
  });

  if (!term) {
    throw new NotFoundError(`Term "${name}" not found`);
  }

  return term;
};

export const closeTerm = async (id: string) => {
  const term = await prisma.term.findUnique({
    where: { id },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  // Only Term 2 can be closed for promotion
  if (term.name !== 'Term 2') {
    throw new BadRequestError('Only Term 2 can be closed');
  }

  const updated = await prisma.term.update({
    where: { id },
    data: {
      status: 'CLOSED' as const,
    },
  });

  return updated;
};

export const openTerm = async (id: string) => {
  const term = await prisma.term.findUnique({
    where: { id },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  const updated = await prisma.term.update({
    where: { id },
    data: {
      status: 'OPEN' as const,
    },
  });

  return updated;
};

export const activateTerm = async (id: string) => {
  const term = await prisma.term.findUnique({
    where: { id },
    include: { academicYear: true },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  // Check if academic year is active
  if (term.academicYear.status !== 'ACTIVE') {
    throw new BadRequestError(
      'Cannot activate term for inactive academic year'
    );
  }

  // Optionally: Close other terms in the same academic year
  // Or allow multiple active terms (your choice)
  // For now, we allow multiple active terms

  const updated = await prisma.term.update({
    where: { id },
    data: {
      status: 'OPEN' as const,
    },
  });

  return updated;
};

