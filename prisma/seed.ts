import { PrismaClient, UserRole, ClassStatus, PaymentStatus, AttendanceStatus } from '../src/generated/prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning existing data...');
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.mark.deleteMany();
  await prisma.subExam.deleteMany();
  await prisma.term.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.studentClass.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  console.log('👤 Creating users...');
  const owner = await prisma.user.create({
    data: {
      email: 'owner@school.com',
      password: hashedPassword,
      role: UserRole.OWNER,
      name: 'School Owner',
    },
  });

  const registrar = await prisma.user.create({
    data: {
      email: 'registrar@school.com',
      password: hashedPassword,
      role: UserRole.REGISTRAR,
      name: 'School Registrar',
    },
  });

  const teacher1 = await prisma.user.create({
    data: {
      email: 'teacher1@school.com',
      password: hashedPassword,
      role: UserRole.TEACHER,
      name: 'John Smith',
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: 'teacher2@school.com',
      password: hashedPassword,
      role: UserRole.TEACHER,
      name: 'Sarah Johnson',
    },
  });

  const teacher3 = await prisma.user.create({
    data: {
      email: 'teacher3@school.com',
      password: hashedPassword,
      role: UserRole.TEACHER,
      name: 'Michael Brown',
    },
  });

  // 2. Create Classes
  console.log('📚 Creating classes...');
  const class1 = await prisma.class.create({
    data: {
      name: 'Grade 1A',
      description: 'First Grade - Section A',
      academicYear: '2024-2025',
      headTeacherId: teacher1.id,
    },
  });

  const class2 = await prisma.class.create({
    data: {
      name: 'Grade 1B',
      description: 'First Grade - Section B',
      academicYear: '2024-2025',
      headTeacherId: teacher2.id,
    },
  });

  const class3 = await prisma.class.create({
    data: {
      name: 'Grade 2A',
      description: 'Second Grade - Section A',
      academicYear: '2024-2025',
      headTeacherId: teacher3.id,
    },
  });

  // 3. Create Teachers
  console.log('👨‍🏫 Creating teachers...');
  const teacherRecord1 = await prisma.teacher.create({
    data: {
      userId: teacher1.id,
      name: 'John Smith',
      email: 'teacher1@school.com',
      phone: '+1234567890',
      subject: 'Mathematics',
    },
  });

  const teacherRecord2 = await prisma.teacher.create({
    data: {
      userId: teacher2.id,
      name: 'Sarah Johnson',
      email: 'teacher2@school.com',
      phone: '+1234567891',
      subject: 'English',
    },
  });

  const teacherRecord3 = await prisma.teacher.create({
    data: {
      userId: teacher3.id,
      name: 'Michael Brown',
      email: 'teacher3@school.com',
      phone: '+1234567892',
      subject: 'Science',
    },
  });

  // 4. Create Terms
  console.log('📅 Creating terms...');
  const term1 = await prisma.term.create({
    data: {
      name: 'Term 1',
    },
  });

  const term2 = await prisma.term.create({
    data: {
      name: 'Term 2',
    },
  });

  // 5. Create Subjects
  console.log('📖 Creating subjects...');
  const subjects1 = await Promise.all([
    prisma.subject.create({
      data: {
        classId: class1.id,
        name: 'Mathematics',
        code: 'MATH-101',
        description: 'Basic Mathematics',
      },
    }),
    prisma.subject.create({
      data: {
        classId: class1.id,
        name: 'English',
        code: 'ENG-101',
        description: 'English Language',
      },
    }),
    prisma.subject.create({
      data: {
        classId: class1.id,
        name: 'Science',
        code: 'SCI-101',
        description: 'General Science',
      },
    }),
  ]);

  const subjects2 = await Promise.all([
    prisma.subject.create({
      data: {
        classId: class2.id,
        name: 'Mathematics',
        code: 'MATH-101',
        description: 'Basic Mathematics',
      },
    }),
    prisma.subject.create({
      data: {
        classId: class2.id,
        name: 'English',
        code: 'ENG-101',
        description: 'English Language',
      },
    }),
  ]);

  const subjects3 = await Promise.all([
    prisma.subject.create({
      data: {
        classId: class3.id,
        name: 'Mathematics',
        code: 'MATH-201',
        description: 'Advanced Mathematics',
      },
    }),
    prisma.subject.create({
      data: {
        classId: class3.id,
        name: 'English',
        code: 'ENG-201',
        description: 'Advanced English',
      },
    }),
    prisma.subject.create({
      data: {
        classId: class3.id,
        name: 'Science',
        code: 'SCI-201',
        description: 'Advanced Science',
      },
    }),
  ]);

  // 6. Create Sub-Exams for Subjects
  console.log('📝 Creating sub-exams...');
  
  // Create sub-exams for Science subject (example: Biology structure)
  // For each subject in each term, create sub-exams
  const allSubjects = [...subjects1, ...subjects2, ...subjects3];
  
  for (const subject of allSubjects) {
    // Create sub-exams for Term 1
    const subExamsTerm1 = await Promise.all([
      // 2 Assignments: 5 marks each, 5% weight each
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term1.id,
          name: 'Assignment 1',
          maxScore: 5,
          weightPercent: 5,
          examType: 'assignment',
        },
      }),
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term1.id,
          name: 'Assignment 2',
          maxScore: 5,
          weightPercent: 5,
          examType: 'assignment',
        },
      }),
      // 3 Quizzes: 10 marks each, 10% weight each
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term1.id,
          name: 'Quiz 1',
          maxScore: 10,
          weightPercent: 10,
          examType: 'quiz',
        },
      }),
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term1.id,
          name: 'Quiz 2',
          maxScore: 10,
          weightPercent: 10,
          examType: 'quiz',
        },
      }),
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term1.id,
          name: 'Quiz 3',
          maxScore: 10,
          weightPercent: 10,
          examType: 'quiz',
        },
      }),
      // 1 Mid Exam: 20 marks, 20% weight
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term1.id,
          name: 'Mid Exam',
          maxScore: 20,
          weightPercent: 20,
          examType: 'mid_exam',
        },
      }),
      // 1 General Test: 100 marks, 40% weight
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term1.id,
          name: 'General Test',
          maxScore: 100,
          weightPercent: 40,
          examType: 'general_test',
        },
      }),
    ]);

    // Create sub-exams for Term 2 (same structure)
    await Promise.all([
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term2.id,
          name: 'Assignment 1',
          maxScore: 5,
          weightPercent: 5,
          examType: 'assignment',
        },
      }),
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term2.id,
          name: 'Assignment 2',
          maxScore: 5,
          weightPercent: 5,
          examType: 'assignment',
        },
      }),
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term2.id,
          name: 'Quiz 1',
          maxScore: 10,
          weightPercent: 10,
          examType: 'quiz',
        },
      }),
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term2.id,
          name: 'Quiz 2',
          maxScore: 10,
          weightPercent: 10,
          examType: 'quiz',
        },
      }),
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term2.id,
          name: 'Quiz 3',
          maxScore: 10,
          weightPercent: 10,
          examType: 'quiz',
        },
      }),
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term2.id,
          name: 'Mid Exam',
          maxScore: 20,
          weightPercent: 20,
          examType: 'mid_exam',
        },
      }),
      prisma.subExam.create({
        data: {
          subjectId: subject.id,
          termId: term2.id,
          name: 'General Test',
          maxScore: 100,
          weightPercent: 40,
          examType: 'general_test',
        },
      }),
    ]);
  }

  // 7. Create Students
  console.log('🎓 Creating students...');
  const students = await Promise.all([
    // Assigned students
    prisma.student.create({
      data: {
        firstName: 'Alice',
        lastName: 'Williams',
        dateOfBirth: new Date('2018-05-15'),
        gender: 'Female',
        nationality: 'US',
        religion: 'Christian',
        email: 'alice.williams@example.com',
        phone: '+1234567001',
        parentName: 'Robert Williams',
        parentPhone: '+1234567002',
        parentEmail: 'robert.williams@example.com',
        parentRelation: 'Father',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        emergencyName: 'Mary Williams',
        emergencyPhone: '+1234567003',
        emergencyRelation: 'Mother',
        medicalConditions: null,
        allergies: 'Peanuts',
        bloodGroup: 'O+',
        previousSchool: 'ABC Elementary',
        previousClass: 'Kindergarten',
        transferReason: 'Family relocation',
        classStatus: ClassStatus.assigned,
        paymentStatus: PaymentStatus.confirmed,
      },
    }),
    prisma.student.create({
      data: {
        firstName: 'Bob',
        lastName: 'Davis',
        dateOfBirth: new Date('2018-08-20'),
        gender: 'Male',
        nationality: 'US',
        religion: 'Christian',
        email: 'bob.davis@example.com',
        phone: '+1234567004',
        parentName: 'Jennifer Davis',
        parentPhone: '+1234567005',
        parentEmail: 'jennifer.davis@example.com',
        parentRelation: 'Mother',
        address: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        country: 'USA',
        emergencyName: 'Tom Davis',
        emergencyPhone: '+1234567006',
        emergencyRelation: 'Father',
        medicalConditions: 'Asthma',
        allergies: null,
        bloodGroup: 'A+',
        previousSchool: null,
        previousClass: null,
        transferReason: null,
        classStatus: ClassStatus.assigned,
        paymentStatus: PaymentStatus.pending,
      },
    }),
    prisma.student.create({
      data: {
        firstName: 'Charlie',
        lastName: 'Miller',
        dateOfBirth: new Date('2017-12-10'),
        gender: 'Male',
        nationality: 'US',
        religion: 'Jewish',
        email: 'charlie.miller@example.com',
        phone: '+1234567007',
        parentName: 'Lisa Miller',
        parentPhone: '+1234567008',
        parentEmail: 'lisa.miller@example.com',
        parentRelation: 'Mother',
        address: '789 Pine Rd',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        emergencyName: 'David Miller',
        emergencyPhone: '+1234567009',
        emergencyRelation: 'Father',
        medicalConditions: null,
        allergies: null,
        bloodGroup: 'B+',
        previousSchool: 'XYZ School',
        previousClass: 'Grade 1',
        transferReason: 'Better curriculum',
        classStatus: ClassStatus.assigned,
        paymentStatus: PaymentStatus.confirmed,
      },
    }),
    // New students (not assigned)
    prisma.student.create({
      data: {
        firstName: 'Diana',
        lastName: 'Wilson',
        dateOfBirth: new Date('2019-03-25'),
        gender: 'Female',
        nationality: 'US',
        religion: 'Christian',
        email: null,
        phone: '+1234567010',
        parentName: 'James Wilson',
        parentPhone: '+1234567011',
        parentEmail: 'james.wilson@example.com',
        parentRelation: 'Father',
        address: '321 Elm St',
        city: 'Houston',
        state: 'TX',
        zipCode: '77001',
        country: 'USA',
        emergencyName: 'Patricia Wilson',
        emergencyPhone: '+1234567012',
        emergencyRelation: 'Mother',
        medicalConditions: null,
        allergies: 'Dairy',
        bloodGroup: 'AB+',
        previousSchool: null,
        previousClass: null,
        transferReason: null,
        classStatus: ClassStatus.new,
        paymentStatus: PaymentStatus.pending,
      },
    }),
    prisma.student.create({
      data: {
        firstName: 'Emma',
        lastName: 'Moore',
        dateOfBirth: new Date('2018-11-30'),
        gender: 'Female',
        nationality: 'US',
        religion: 'Catholic',
        email: 'emma.moore@example.com',
        phone: '+1234567013',
        parentName: 'Richard Moore',
        parentPhone: '+1234567014',
        parentEmail: 'richard.moore@example.com',
        parentRelation: 'Father',
        address: '654 Maple Dr',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: '85001',
        country: 'USA',
        emergencyName: 'Susan Moore',
        emergencyPhone: '+1234567015',
        emergencyRelation: 'Mother',
        medicalConditions: null,
        allergies: null,
        bloodGroup: 'O-',
        previousSchool: null,
        previousClass: null,
        transferReason: null,
        classStatus: ClassStatus.new,
        paymentStatus: PaymentStatus.pending,
      },
    }),
  ]);

  // 8. Create Student-Class relationships
  console.log('🔗 Creating student-class assignments...');
  await prisma.studentClass.create({
    data: {
      studentId: students[0].id,
      classId: class1.id,
      startDate: new Date('2024-09-01'),
      reason: 'initial assignment',
    },
  });

  await prisma.studentClass.create({
    data: {
      studentId: students[1].id,
      classId: class2.id,
      startDate: new Date('2024-09-01'),
      reason: 'initial assignment',
    },
  });

  await prisma.studentClass.create({
    data: {
      studentId: students[2].id,
      classId: class3.id,
      startDate: new Date('2024-09-01'),
      reason: 'initial assignment',
    },
  });

  // 9. Create Attendance records
  console.log('📅 Creating attendance records...');
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  // Create attendance for the last 7 days for assigned students
  for (let i = 0; i < 7; i++) {
    const date = new Date(lastWeek);
    date.setDate(lastWeek.getDate() + i);

    // Student 1 (Alice) - mostly present
    await prisma.attendance.create({
      data: {
        studentId: students[0].id,
        classId: class1.id,
        date: date,
        status: i === 2 ? AttendanceStatus.late : AttendanceStatus.present,
        notes: i === 2 ? 'Arrived 10 minutes late' : null,
      },
    });

    // Student 2 (Bob) - mix of present and absent
    await prisma.attendance.create({
      data: {
        studentId: students[1].id,
        classId: class2.id,
        date: date,
        status: i === 1 || i === 5 ? AttendanceStatus.absent : AttendanceStatus.present,
        notes: i === 1 || i === 5 ? 'Sick leave' : null,
      },
    });

    // Student 3 (Charlie) - all present
    await prisma.attendance.create({
      data: {
        studentId: students[2].id,
        classId: class3.id,
        date: date,
        status: AttendanceStatus.present,
      },
    });
  }

  // 10. Create Marks
  console.log('📊 Creating marks...');
  
  // Get sub-exams for Math subject Term 1
  const mathTerm1SubExams = await prisma.subExam.findMany({
    where: {
      subjectId: subjects1[0].id,
      termId: term1.id,
    },
  });

  // Get sub-exams for English subject Term 1
  const englishTerm1SubExams = await prisma.subExam.findMany({
    where: {
      subjectId: subjects1[1].id,
      termId: term1.id,
    },
  });

  // Student 1 - Math Term 1 marks (example scores)
  for (const subExam of mathTerm1SubExams) {
    let score = 0;
    if (subExam.examType === 'assignment') {
      score = 4; // 4 out of 5
    } else if (subExam.examType === 'quiz') {
      score = 8; // 8 out of 10
    } else if (subExam.examType === 'mid_exam') {
      score = 18; // 18 out of 20
    } else if (subExam.examType === 'general_test') {
      score = 85; // 85 out of 100
    }

    await prisma.mark.create({
      data: {
        studentId: students[0].id,
        classId: class1.id,
        subjectId: subjects1[0].id,
        termId: term1.id,
        subExamId: subExam.id,
        score,
        maxScore: subExam.maxScore,
      },
    });
  }

  // Student 1 - English Term 1 marks
  for (const subExam of englishTerm1SubExams) {
    let score = 0;
    if (subExam.examType === 'assignment') {
      score = 5; // 5 out of 5
    } else if (subExam.examType === 'quiz') {
      score = 9; // 9 out of 10
    } else if (subExam.examType === 'mid_exam') {
      score = 19; // 19 out of 20
    } else if (subExam.examType === 'general_test') {
      score = 92; // 92 out of 100
    }

    await prisma.mark.create({
      data: {
        studentId: students[0].id,
        classId: class1.id,
        subjectId: subjects1[1].id,
        termId: term1.id,
        subExamId: subExam.id,
        score,
        maxScore: subExam.maxScore,
      },
    });
  }

  // 11. Create Payments
  console.log('💰 Creating payments...');
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Create payments for the last 3 months
  for (let i = 0; i < 3; i++) {
    const month = currentMonth - i;
    const year = currentYear;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    // Student 1 - confirmed payments
    const payment1 = await prisma.payment.create({
      data: {
        studentId: students[0].id,
        amount: 500.00,
        month: monthStr,
        year: year,
        status: PaymentStatus.confirmed,
        paymentDate: new Date(year, month - 1, 15),
        paymentMethod: 'bank_transfer',
        notes: `Monthly fee for ${monthStr}`,
      },
    });

    // Create receipt for confirmed payment
    await prisma.receipt.create({
      data: {
        paymentId: payment1.id,
        receiptNumber: `REC-${year}${String(month).padStart(2, '0')}-${String(students[0].id).substring(0, 8).toUpperCase()}`,
        issuedDate: new Date(year, month - 1, 15),
      },
    });

    // Student 2 - pending payment for current month, confirmed for others
    const isPending = i === 0;
    const payment2 = await prisma.payment.create({
      data: {
        studentId: students[1].id,
        amount: 500.00,
        month: monthStr,
        year: year,
        status: isPending ? PaymentStatus.pending : PaymentStatus.confirmed,
        paymentDate: isPending ? null : new Date(year, month - 1, 20),
        paymentMethod: isPending ? null : 'cash',
        notes: `Monthly fee for ${monthStr}`,
      },
    });

    if (!isPending) {
      await prisma.receipt.create({
        data: {
          paymentId: payment2.id,
          receiptNumber: `REC-${year}${String(month).padStart(2, '0')}-${String(students[1].id).substring(0, 8).toUpperCase()}`,
          issuedDate: new Date(year, month - 1, 20),
        },
      });
    }

    // Student 3 - confirmed payments
    const payment3 = await prisma.payment.create({
      data: {
        studentId: students[2].id,
        amount: 500.00,
        month: monthStr,
        year: year,
        status: PaymentStatus.confirmed,
        paymentDate: new Date(year, month - 1, 10),
        paymentMethod: 'card',
        notes: `Monthly fee for ${monthStr}`,
      },
    });

    await prisma.receipt.create({
      data: {
        paymentId: payment3.id,
        receiptNumber: `REC-${year}${String(month).padStart(2, '0')}-${String(students[2].id).substring(0, 8).toUpperCase()}`,
        issuedDate: new Date(year, month - 1, 10),
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Users: 5 (1 Owner, 1 Registrar, 3 Teachers)`);
  console.log(`   - Terms: 2 (Term 1, Term 2)`);
  console.log(`   - Classes: 3`);
  console.log(`   - Students: 5 (3 assigned, 2 new)`);
  console.log(`   - Subjects: 8`);
  console.log(`   - Sub-exams: ${8 * 2 * 7} (7 per subject per term)`);
  console.log(`   - Attendance records: 21`);
  console.log(`   - Marks: ${mathTerm1SubExams.length + englishTerm1SubExams.length} (sample marks for Student 1)`);
  console.log(`   - Payments: 9`);
  console.log(`   - Receipts: 7`);
  console.log('\n🔑 Test Credentials:');
  console.log('   Owner: owner@school.com / password123');
  console.log('   Registrar: registrar@school.com / password123');
  console.log('   Teacher 1: teacher1@school.com / password123');
  console.log('   Teacher 2: teacher2@school.com / password123');
  console.log('   Teacher 3: teacher3@school.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

