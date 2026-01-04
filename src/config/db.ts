import { PrismaClient } from "../generated/prisma/client.js";
import dotenv from 'dotenv';

dotenv.config();

// Initialize Prisma Client with connection string from environment
export const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

// Handle Prisma connection errors
prisma.$on('error' as never, (e: Error) => {
  console.error('Prisma Client Error:', e);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
