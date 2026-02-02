import {
  ClassStatus,
  PaymentStatus,
  PrismaClient,
} from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const TOTAL_STUDENTS = 70;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Seeding 70 students → 1 class only...');

  // 🧹 Clean related data (order matters)
  await prisma.studentClass.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();

  // � Create Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { name: '2024-2025' },
    update: {},
    create: {
      name: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
      status: 'ACTIVE',
    },
  });

  // 📈 Create Grade
  const grade = await prisma.grade.upsert({
    where: { name: 'Grade 1' },
    update: {},
    create: {
      name: 'Grade 1',
      order: 1,
    },
  });

  // �📚 Create ONE class
  const oneClass = await prisma.class.create({
    data: {
      name: 'Class A',
      description: 'Single class for seeded students',
      academicYearId: academicYear.id,
      gradeId: grade.id,
    },
  });

  console.log(`📘 Created class: ${oneClass.name} in ${academicYear.name}`);

  const students = [];

  for (let i = 1; i <= TOTAL_STUDENTS; i++) {
    const firstName = `Student${i}`;
    const lastName = 'Auto';
    const dob = new Date(2014 + (i % 5), randInt(0, 11), randInt(1, 28));

    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        dateOfBirth: dob,
        gender: i % 2 === 0 ? 'Male' : 'Female',
        nationality: 'Local',
        religion: 'None',

        parentName: `${firstName} Parent`,
        parentPhone: `+25190000${i}`,
        parentRelation: 'Guardian',

        address: 'Auto Address',
        city: 'City',
        state: 'State',
        country: 'Country',

        emergencyName: `${firstName} Emergency`,
        emergencyPhone: `+25191111${i}`,
        emergencyRelation: 'Guardian',

        classStatus: ClassStatus.assigned,
        paymentStatus: PaymentStatus.pending,
      },
    });

    // 🔗 Assign student to the ONE class
    await prisma.studentClass.create({
      data: {
        studentId: student.id,
        classId: oneClass.id,
        startDate: new Date(),
        reason: 'Initial assignment',
      },
    });

    students.push(student);
  }

  console.log('✅ Seed completed!');
  console.log(`🎓 Students: ${students.length}`);
  console.log(`🏫 Assigned to class: ${oneClass.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
