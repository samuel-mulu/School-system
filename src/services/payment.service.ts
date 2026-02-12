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
  proofImageUrl?: string;
  transactionNumber?: string;
  amount?: number; // Optional for backward compatibility, but will be fetched from PaymentType
}

interface CreateBulkPaymentData {
  studentId: string;
  paymentTypeId: string;
  months: string[]; // Array of YYYY-MM format
  paymentMethod?: string;
  notes?: string;
  proofImageUrl?: string;
  transactionNumber?: string;
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
      proofImageUrl: data.proofImageUrl,
      transactionNumber: data.transactionNumber,
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

export const createBulkPayments = async (data: CreateBulkPaymentData) => {
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

  const amount = paymentType.amount || 0;

  if (amount <= 0) {
    throw new BadRequestError('Payment amount must be greater than 0');
  }

  // Validate months array
  if (!Array.isArray(data.months) || data.months.length === 0) {
    throw new BadRequestError('At least one month must be provided');
  }

  // Validate month format and check for duplicates
  const monthRegex = /^\d{4}-\d{2}$/;
  const uniqueMonths = [...new Set(data.months)]; // Remove duplicates
  if (uniqueMonths.length !== data.months.length) {
    throw new BadRequestError('Duplicate months are not allowed');
  }

  for (const month of uniqueMonths) {
    if (!monthRegex.test(month)) {
      throw new BadRequestError(`Invalid month format: ${month}. Use YYYY-MM (e.g., 2024-01)`);
    }
  }

  // Check for existing payments for all months
  const existingPayments = await prisma.payment.findMany({
    where: {
      studentId: data.studentId,
      month: { in: uniqueMonths },
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

  // Separate confirmed and pending payments
  const confirmedPayments = existingPayments.filter(p => p.status === PaymentStatus.confirmed);
  const pendingPayments = existingPayments.filter(p => p.status === PaymentStatus.pending);
  const existingMonthsSet = new Set(existingPayments.map(p => p.month));

  // Check if any months already have confirmed payments
  if (confirmedPayments.length > 0) {
    const confirmedMonths = confirmedPayments.map(p => `${p.month} ${p.year}`).join(', ');
    throw new ConflictError(`Payments already confirmed for: ${confirmedMonths}`);
  }

  // Get months that need new payments created
  const monthsToCreate = uniqueMonths.filter(month => !existingMonthsSet.has(month));

  // Create new payments for months that don't have payments yet
  const newPayments = monthsToCreate.length > 0
    ? await prisma.$transaction(
        monthsToCreate.map((month) => {
          const [yearPart] = month.split('-');
          const year = parseInt(yearPart);

          return prisma.payment.create({
            data: {
              studentId: data.studentId,
              paymentTypeId: data.paymentTypeId,
              amount: amount,
              month: month,
              year: year,
              paymentMethod: data.paymentMethod,
              notes: data.notes,
              proofImageUrl: data.proofImageUrl,
              transactionNumber: data.transactionNumber,
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
        })
      )
    : [];

  // Return both new payments and existing pending payments (so they can all be confirmed together)
  return [...newPayments, ...pendingPayments];
};

export const getPayments = async (filters?: {
  studentId?: string;
  status?: PaymentStatus;
  month?: string;
  year?: number;
  paymentDate?: string; // YYYY-MM-DD
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

  if (filters?.paymentDate) {
    const startDate = new Date(filters.paymentDate + 'T00:00:00.000Z');
    const endDate = new Date(filters.paymentDate + 'T23:59:59.999Z');
    
    where.createdAt = {
      gte: startDate,
      lte: endDate,
    };
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
  paymentMethod?: string,
  proofImageUrl?: string,
  transactionNumber?: string
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
      proofImageUrl: proofImageUrl !== undefined ? proofImageUrl : payment.proofImageUrl,
      transactionNumber: transactionNumber !== undefined ? transactionNumber : payment.transactionNumber,
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
        receiptNumber,
      },
    });
    
    // Link payment to receipt
    await prisma.payment.update({
      where: { id },
      data: { receiptId: receipt.id },
    });
    
    // Reload payment with receipt
    const updatedPaymentWithReceipt = await prisma.payment.findUnique({
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
    
    // Update student's payment status if all recent payments are confirmed
    await updateStudentPaymentStatus(payment.studentId);
    
    return updatedPaymentWithReceipt!;
  }

  // Update student's payment status if all recent payments are confirmed
  await updateStudentPaymentStatus(payment.studentId);

  return {
    ...updatedPayment,
    receipt,
  };
};

export const confirmBulkPayments = async (
  paymentIds: string[],
  paymentDate?: Date,
  paymentMethod?: string,
  proofImageUrl?: string,
  transactionNumber?: string
) => {
  if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
    throw new BadRequestError('At least one payment ID must be provided');
  }

  // Fetch all payments
  const payments = await prisma.payment.findMany({
    where: {
      id: { in: paymentIds },
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
      receipt: true,
    },
  });

  if (payments.length !== paymentIds.length) {
    throw new NotFoundError('One or more payments not found');
  }

  // Check if all payments are for the same student
  const studentIds = [...new Set(payments.map(p => p.studentId))];
  if (studentIds.length > 1) {
    throw new BadRequestError('All payments must be for the same student');
  }

  // Check if any payment is already confirmed
  const alreadyConfirmed = payments.filter(p => p.status === PaymentStatus.confirmed);
  if (alreadyConfirmed.length > 0) {
    throw new BadRequestError('One or more payments are already confirmed');
  }

  // Generate one receipt number for all payments
  const receiptNumber = `REC-${Date.now()}-${studentIds[0].slice(0, 8).toUpperCase()}`;
  const receiptDate = paymentDate || new Date();

  // Create receipt and confirm all payments in a transaction with increased timeout
  const result = await prisma.$transaction(async (tx) => {
    // Create one receipt
    const receipt = await tx.receipt.create({
      data: {
        receiptNumber,
        issuedDate: receiptDate,
      },
    });

    // Prepare update data
    const updateData: any = {
      status: PaymentStatus.confirmed,
      paymentDate: receiptDate,
      receiptId: receipt.id,
    };
    
    // Only update paymentMethod if provided
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }
    
    // Only update proofImageUrl if provided
    if (proofImageUrl !== undefined) {
      updateData.proofImageUrl = proofImageUrl;
    }
    
    // Only update transactionNumber if provided
    if (transactionNumber !== undefined) {
      updateData.transactionNumber = transactionNumber;
    }

    // Update all payments at once using updateMany (more efficient)
    await tx.payment.updateMany({
      where: {
        id: { in: paymentIds },
      },
      data: updateData,
    });

    // Fetch updated payments with all relations
    const updatedPayments = await tx.payment.findMany({
      where: {
        id: { in: paymentIds },
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
        receipt: true,
      },
      orderBy: {
        month: 'asc',
      },
    });

    return {
      receipt,
      payments: updatedPayments,
    };
  }, {
    maxWait: 10000, // Maximum time to wait for a transaction slot
    timeout: 10000, // Maximum time the transaction can run (10 seconds)
  });

  // Update student's payment status outside transaction to avoid timeout
  await updateStudentPaymentStatus(studentIds[0]);

  return result;
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
      receiptNumber,
    },
  });
  
  // Link payment to receipt
  await prisma.payment.update({
    where: { id: paymentId },
    data: { receiptId: receipt.id },
  });

  return receipt;
};

export const getReceiptById = async (id: string) => {
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      payments: {
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
        orderBy: {
          month: 'asc',
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
      payments: {
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
        orderBy: {
          month: 'asc',
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

