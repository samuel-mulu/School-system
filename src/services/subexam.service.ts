import { prisma } from '../config/db';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';

interface CreateSubExamData {
  subjectId: string;
  termId: string;
  name: string;
  maxScore: number;
  weightPercent: number;
  examType: string;
}

interface UpdateSubExamData {
  name?: string;
  maxScore?: number;
  weightPercent?: number;
  examType?: string;
}

export const createSubExam = async (data: CreateSubExamData) => {
  // Verify subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: data.subjectId },
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  // Verify term exists
  const term = await prisma.term.findUnique({
    where: { id: data.termId },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  // Check if sub-exam with same name already exists for this subject+term
  const existing = await prisma.subExam.findUnique({
    where: {
      subjectId_termId_name: {
        subjectId: data.subjectId,
        termId: data.termId,
        name: data.name,
      },
    },
  });

  if (existing) {
    throw new ConflictError(
      `Sub-exam "${data.name}" already exists for this subject and term`
    );
  }

  // Validate weight percent
  if (data.weightPercent < 0 || data.weightPercent > 100) {
    throw new BadRequestError('Weight percent must be between 0 and 100');
  }

  // Validate max score
  if (data.maxScore <= 0) {
    throw new BadRequestError('Max score must be greater than 0');
  }

  const subExam = await prisma.subExam.create({
    data,
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      term: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Validate weights after creation
  await validateWeights(data.subjectId, data.termId);

  return subExam;
};

export const getSubExamsBySubjectAndTerm = async (
  subjectId: string,
  termId: string
) => {
  // Verify subject exists
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  // Verify term exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    throw new NotFoundError('Term not found');
  }

  const subExams = await prisma.subExam.findMany({
    where: {
      subjectId,
      termId,
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      term: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      {
        examType: 'asc',
      },
      {
        name: 'asc',
      },
    ],
  });

  return subExams;
};

export const updateSubExam = async (
  id: string,
  data: UpdateSubExamData
) => {
  const subExam = await prisma.subExam.findUnique({
    where: { id },
  });

  if (!subExam) {
    throw new NotFoundError('Sub-exam not found');
  }

  // Validate weight percent if provided
  if (data.weightPercent !== undefined) {
    if (data.weightPercent < 0 || data.weightPercent > 100) {
      throw new BadRequestError('Weight percent must be between 0 and 100');
    }
  }

  // Validate max score if provided
  if (data.maxScore !== undefined) {
    if (data.maxScore <= 0) {
      throw new BadRequestError('Max score must be greater than 0');
    }
  }

  const updated = await prisma.subExam.update({
    where: { id },
    data,
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      term: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Validate weights after update
  await validateWeights(subExam.subjectId, subExam.termId);

  return updated;
};

export const deleteSubExam = async (id: string) => {
  const subExam = await prisma.subExam.findUnique({
    where: { id },
  });

  if (!subExam) {
    throw new NotFoundError('Sub-exam not found');
  }

  await prisma.subExam.delete({
    where: { id },
  });

  return { message: 'Sub-exam deleted successfully' };
};

export const validateWeights = async (
  subjectId: string,
  termId: string
): Promise<{ isValid: boolean; subExamTotal: number; generalTestTotal: number; total: number }> => {
  const subExams = await prisma.subExam.findMany({
    where: {
      subjectId,
      termId,
    },
  });

  let subExamTotal = 0;
  let generalTestTotal = 0;

  for (const subExam of subExams) {
    if (subExam.examType === 'general_test') {
      generalTestTotal += subExam.weightPercent;
    } else {
      subExamTotal += subExam.weightPercent;
    }
  }

  const total = subExamTotal + generalTestTotal;
  const isValid = Math.abs(subExamTotal - 60) < 0.01 && Math.abs(generalTestTotal - 40) < 0.01 && Math.abs(total - 100) < 0.01;

  if (!isValid) {
    throw new BadRequestError(
      `Invalid weight distribution. Sub-exams should total 60% (currently ${subExamTotal.toFixed(2)}%), ` +
      `General test should be 40% (currently ${generalTestTotal.toFixed(2)}%), ` +
      `Total should be 100% (currently ${total.toFixed(2)}%)`
    );
  }

  return {
    isValid,
    subExamTotal,
    generalTestTotal,
    total,
  };
};

