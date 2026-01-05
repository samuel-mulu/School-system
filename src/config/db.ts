import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
