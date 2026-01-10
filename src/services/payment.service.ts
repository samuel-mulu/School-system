import { PaymentStatus } from "@prisma/client";
import { prisma } from "../config/db.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors.js";

interface CreatePaymentData {
  studentId: string;
  paymentTypeId: string; // Required: payment type ID instead of amount
  month: string; // Format: "2024-01"
  year: number;
  paymentMethod?: string;
  notes?: string;
  amount?: number; // Optional for backward compatibility, but will be fetched from PaymentType
}

export const createPayment = async (data: CreatePaymentData) => {
  // Verify student exists
  const student = await prisma.student.findUnique({
    where: { id: data.studentId },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  // Fetch payment type to get amount
  const paymentType = await prisma.paymentType.findUnique({
    where: { id: data.paymentTypeId },
  });

  if (!paymentType) {
    throw new NotFoundError('Payment type not found');
  }

  if (!paymentType.isActive) {
    throw new BadRequestError('Payment type is not active');
  }

  // Use amount from payment type, or fallback to provided amount (backward compatibility)
  const amount = paymentType.amount || data.amount || 0;

  if (amount <= 0) {
    throw new BadRequestError('Payment amount must be greater than 0');
  }

  // Check if payment for this month/year already exists
  const existing = await prisma.payment.findUnique({
    where: {
      studentId_month_year: {
        studentId: data.studentId,
        month: data.month,
        year: data.year,
      },
    },
  });

  if (existing) {
    throw new ConflictError('Payment for this month already exists');
  }

  // Validate month format (YYYY-MM)
  const monthRegex = /^\d{4}-\d{2}$/;
  if (!monthRegex.test(data.month)) {
    throw new BadRequestError('Invalid month format. Use YYYY-MM (e.g., 2024-01)');
  }

  const payment = await prisma.payment.create({
    data: {
      studentId: data.studentId,
      paymentTypeId: data.paymentTypeId,
      amount: amount,
      month: data.month,
      year: data.year,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      status: PaymentStatus.pending,
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          parentName: true,
        },
      },
      paymentType: true,
    },
  });

  return payment;
};

export const getPayments = async (filters?: {
  studentId?: string;
  status?: PaymentStatus;
  month?: string;
  year?: number;
  page?: number;
  limit?: number;
}) => {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters?.studentId) {
    where.studentId = filters.studentId;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.month) {
    where.month = filters.month;
  }

  if (filters?.year) {
    where.year = filters.year;
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            parentName: true,
          },
        },
        paymentType: true,
        receipt: true,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPaymentById = async (id: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          parentName: true,
        },
      },
      paymentType: true,
      receipt: true,
    },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  return payment;
};

export const confirmPayment = async (
  id: string,
  paymentDate?: Date,
  paymentMethod?: string
) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          parentName: true,
        },
      },
      receipt: true,
      paymentType: true,
    },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status === PaymentStatus.confirmed) {
    throw new BadRequestError('Payment is already confirmed');
  }

  // Update payment status
  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: {
      status: PaymentStatus.confirmed,
      paymentDate: paymentDate || new Date(),
      paymentMethod: paymentMethod || payment.paymentMethod,
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          parentName: true,
        },
      },
      paymentType: true,
    },
  });

  // Generate receipt if not already exists
  let receipt = payment.receipt;
  if (!receipt) {
    const receiptNumber = `REC-${Date.now()}-${payment.id.slice(0, 8).toUpperCase()}`;
    receipt = await prisma.receipt.create({
      data: {
        paymentId: id,
        receiptNumber,
      },
    });
  }

  // Update student's payment status if all recent payments are confirmed
  await updateStudentPaymentStatus(payment.studentId);

  return {
    ...updatedPayment,
    receipt,
  };
};

export const generateReceipt = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      receipt: true,
    },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status !== PaymentStatus.confirmed) {
    throw new BadRequestError('Cannot generate receipt for unconfirmed payment');
  }

  if (payment.receipt) {
    return payment.receipt;
  }

  const receiptNumber = `REC-${Date.now()}-${payment.id.slice(0, 8).toUpperCase()}`;
  const receipt = await prisma.receipt.create({
    data: {
      paymentId,
      receiptNumber,
    },
  });

  return receipt;
};

export const getReceiptById = async (id: string) => {
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      payment: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              parentName: true,
            },
          },
          paymentType: true,
        },
      },
    },
  });

  if (!receipt) {
    throw new NotFoundError('Receipt not found');
  }

  return receipt;
};

export const getReceiptByNumber = async (receiptNumber: string) => {
  const receipt = await prisma.receipt.findUnique({
    where: { receiptNumber },
    include: {
      payment: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              parentName: true,
            },
          },
          paymentType: true,
        },
      },
    },
  });

  if (!receipt) {
    throw new NotFoundError('Receipt not found');
  }

  return receipt;
};

// Helper function to update student payment status
const updateStudentPaymentStatus = async (studentId: string) => {
  // Get current month and year
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = now.getFullYear();

  // Check if current month payment exists and is confirmed
  const currentPayment = await prisma.payment.findUnique({
    where: {
      studentId_month_year: {
        studentId,
        month: currentMonth,
        year: currentYear,
      },
    },
  });

  if (currentPayment && currentPayment.status === PaymentStatus.confirmed) {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        paymentStatus: PaymentStatus.confirmed,
      },
    });
  } else {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        paymentStatus: PaymentStatus.pending,
      },
    });
  }
};

export const deletePayment = async (id: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.status === PaymentStatus.confirmed) {
    throw new BadRequestError('Cannot delete confirmed payment');
  }

  await prisma.payment.delete({
    where: { id },
  });

  return { message: 'Payment deleted successfully' };
};

