import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function addOwner() {
  const email = 'yared@digital.com';
  const plainPassword = 'digital1219';

  // Check if the owner already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`⚠️ User with email ${email} already exists.`);
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Create the owner user
  const owner = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: UserRole.OWNER,
      name: 'Second Owner', // customize name
    },
  });

  console.log('✅ Owner created successfully:', owner.email);
}

addOwner()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });