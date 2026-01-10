import { prisma } from "../config/db.js";
import { NotFoundError, ConflictError, BadRequestError } from "../utils/errors.js";

interface CreatePaymentTypeData {
  name: string;
  amount: number;
  description?: string;
  isActive?: boolean;
}

interface UpdatePaymentTypeData extends Partial<CreatePaymentTypeData> {}

export const createPaymentType = async (data: CreatePaymentTypeData) => {
  // Validate amount
  if (data.amount <= 0) {
    throw new BadRequestError('Amount must be greater than 0');
  }

  // Check if payment type name already exists
  const existing = await prisma.paymentType.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw new ConflictError('Payment type with this name already exists');
  }

  const paymentType = await prisma.paymentType.create({
    data: {
      name: data.name,
      amount: data.amount,
      description: data.description,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  return paymentType;
};

export const getPaymentTypes = async (filters?: { includeInactive?: boolean }) => {
  const where: any = {};
  
  // By default, only return active payment types
  if (!filters?.includeInactive) {
    where.isActive = true;
  }

  const paymentTypes = await prisma.paymentType.findMany({
    where,
    orderBy: {
      name: 'asc',
    },
  });

  return paymentTypes;
};

export const getPaymentTypeById = async (id: string) => {
  const paymentType = await prisma.paymentType.findUnique({
    where: { id },
    include: {
      payments: {
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  if (!paymentType) {
    throw new NotFoundError('Payment type not found');
  }

  return paymentType;
};

export const updatePaymentType = async (id: string, data: UpdatePaymentTypeData) => {
  const paymentType = await prisma.paymentType.findUnique({
    where: { id },
  });

  if (!paymentType) {
    throw new NotFoundError('Payment type not found');
  }

  // Validate amount if being updated
  if (data.amount !== undefined && data.amount <= 0) {
    throw new BadRequestError('Amount must be greater than 0');
  }

  // Check name uniqueness if name is being updated
  if (data.name && data.name !== paymentType.name) {
    const existing = await prisma.paymentType.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictError('Payment type with this name already exists');
    }
  }

  const updated = await prisma.paymentType.update({
    where: { id },
    data,
  });

  return updated;
};

export const deletePaymentType = async (id: string) => {
  const paymentType = await prisma.paymentType.findUnique({
    where: { id },
    include: {
      payments: {
        take: 1,
      },
    },
  });

  if (!paymentType) {
    throw new NotFoundError('Payment type not found');
  }

  // Check if payment type is used in existing payments
  if (paymentType.payments.length > 0) {
    // Soft delete instead of hard delete
    const updated = await prisma.paymentType.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Payment type deactivated successfully', paymentType: updated };
  }

  // Hard delete if no payments associated
  await prisma.paymentType.delete({
    where: { id },
  });

  return { message: 'Payment type deleted successfully' };
};
