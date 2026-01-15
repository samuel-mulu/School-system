import { prisma } from "../config/db.js";
import { NotFoundError, BadRequestError, ConflictError } from "../utils/errors.js";

interface CreateSubExamData {
  gradeId: string;
  subjectId: string;
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
  // Verify grade exists
  const grade = await prisma.grade.findUnique({
    where: { id: data.gradeId },
  });

  if (!grade) {
    throw new NotFoundError('Grade not found');
  }

  // Verify subject exists and belongs to grade
  const subject = await prisma.subject.findUnique({
    where: { id: data.subjectId },
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  if (subject.gradeId !== data.gradeId) {
    throw new BadRequestError('Subject does not belong to this grade');
  }

  // Check if sub-exam with same name already exists for this grade+subject
  const existing = await prisma.subExam.findUnique({
    where: {
      gradeId_subjectId_name: {
        gradeId: data.gradeId,
        subjectId: data.subjectId,
        name: data.name,
      },
    },
  });

  if (existing) {
    throw new ConflictError(
      `Sub-exam "${data.name}" already exists for this grade and subject`
    );
  }

  // Weight validation removed - no restrictions on weight values

  // Validate max score
  if (data.maxScore <= 0) {
    throw new BadRequestError('Max score must be greater than 0');
  }

  const subExam = await prisma.subExam.create({
    data,
    include: {
      grade: {
        select: {
          id: true,
          name: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  // Weight validation removed - no longer enforcing weight distribution

  return subExam;
};

export const getSubExamsBySubject = async (
  gradeId: string,
  subjectId: string
) => {
  // Verify grade exists
  const grade = await prisma.grade.findUnique({
    where: { id: gradeId },
  });

  if (!grade) {
    throw new NotFoundError('Grade not found');
  }

  // Verify subject exists and belongs to grade
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject) {
    throw new NotFoundError('Subject not found');
  }

  if (subject.gradeId !== gradeId) {
    throw new BadRequestError('Subject does not belong to this grade');
  }

  const subExams = await prisma.subExam.findMany({
    where: {
      gradeId,
      subjectId,
    },
    include: {
      grade: {
        select: {
          id: true,
          name: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
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

  // Weight validation removed - no restrictions on weight values

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
      grade: {
        select: {
          id: true,
          name: true,
        },
      },
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  // Weight validation removed - no longer enforcing weight distribution

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
  gradeId: string,
  subjectId: string
): Promise<{ isValid: boolean; subExamTotal: number; generalTestTotal: number; total: number }> => {
  const subExams = await prisma.subExam.findMany({
    where: {
      gradeId,
      subjectId,
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
  
  // Weight validation removed - no longer enforcing any weight distribution rules
  // Always return valid (no errors thrown)

  return {
    isValid: true,
    subExamTotal,
    generalTestTotal,
    total,
  };
};

