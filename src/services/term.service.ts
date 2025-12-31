import { prisma } from '../config/db';
import { NotFoundError, ConflictError } from '../utils/errors';

export const createTerm = async (name: string) => {
  // Check if term already exists
  const existing = await prisma.term.findUnique({
    where: { name },
  });

  if (existing) {
    throw new ConflictError(`Term "${name}" already exists`);
  }

  const term = await prisma.term.create({
    data: { name },
  });

  return term;
};

export const getTerms = async () => {
  const terms = await prisma.term.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return terms;
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

export const getTermByName = async (name: string) => {
  const term = await prisma.term.findUnique({
    where: { name },
  });

  if (!term) {
    throw new NotFoundError(`Term "${name}" not found`);
  }

  return term;
};

