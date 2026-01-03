import { PrismaClient, UserRole, ClassStatus, PaymentStatus, AttendanceStatus, AcademicYearStatus, TermStatus, PromotionStatus } from '../src/generated/prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

// Real student names for demonstration
const STUDENT_NAMES = [
  { firstName: 'Emma', lastName: 'Johnson' },
  { firstName: 'Liam', lastName: 'Williams' },
  { firstName: 'Olivia', lastName: 'Brown' },
  { firstName: 'Noah', lastName: 'Jones' },
  { firstName: 'Ava', lastName: 'Garcia' },
  { firstName: 'Ethan', lastName: 'Miller' },
  { firstName: 'Sophia', lastName: 'Davis' },
  { firstName: 'Mason', lastName: 'Rodriguez' },
  { firstName: 'Isabella', lastName: 'Martinez' },
  { firstName: 'James', lastName: 'Hernandez' },
  { firstName: 'Mia', lastName: 'Lopez' },
  { firstName: 'Benjamin', lastName: 'Wilson' },
  { firstName: 'Charlotte', lastName: 'Anderson' },
  { firstName: 'Lucas', lastName: 'Thomas' },
  { firstName: 'Amelia', lastName: 'Taylor' },
  { firstName: 'Henry', lastName: 'Moore' },
  { firstName: 'Harper', lastName: 'Jackson' },
  { firstName: 'Alexander', lastName: 'Martin' },
  { firstName: 'Evelyn', lastName: 'Lee' },
  { firstName: 'Michael', lastName: 'Thompson' },
];

// Helper function to generate random score within range
function randomScore(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to generate score based on performance level
function getScoreByPerformance(performance: 'excellent' | 'good' | 'average' | 'poor', maxScore: number): number {
  const ranges = {
    excellent: { min: Math.floor(maxScore * 0.85), max: maxScore },
    good: { min: Math.floor(maxScore * 0.70), max: Math.floor(maxScore * 0.84) },
    average: { min: Math.floor(maxScore * 0.55), max: Math.floor(maxScore * 0.69) },
    poor: { min: Math.floor(maxScore * 0.40), max: Math.floor(maxScore * 0.54) },
  };
  const range = ranges[performance];
  return randomScore(range.min, range.max);
}

async function main() {
  console.log('🌱 Starting comprehensive seed with 4 academic years...');

  // Test database connection first
  console.log('🔌 Testing database connection...');
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('   ✓ Database connection successful');
  } catch (error) {
    console.error('   ❌ Database connection failed!');
    console.error('   Please ensure:');
    console.error('   1. Your database server is running');
    console.error('   2. DATABASE_URL is correct in .env file');
    console.error('   3. If using Neon, the database may be paused - wake it up first');
    throw error;
  }

  // Clear existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.receipt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.mark.deleteMany();
  await prisma.subExam.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.studentClass.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.term.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.user.deleteMany();

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  console.log('👤 Creating users...');
  const owner = await prisma.user.create({
    data: {
      email: 'owner@school.com',
      password: hashedPassword,
      role: UserRole.OWNER,
      name: 'Dr. Sarah Anderson',
    },
  });

  const registrar = await prisma.user.create({
    data: {
      email: 'registrar@school.com',
      password: hashedPassword,
      role: UserRole.REGISTRAR,
      name: 'Michael Chen',
    },
  });

  const teachers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'teacher1@school.com',
        password: hashedPassword,
        role: UserRole.TEACHER,
        name: 'Jennifer Martinez',
      },
    }),
    prisma.user.create({
      data: {
        email: 'teacher2@school.com',
        password: hashedPassword,
        role: UserRole.TEACHER,
        name: 'Robert Thompson',
      },
    }),
    prisma.user.create({
      data: {
        email: 'teacher3@school.com',
        password: hashedPassword,
        role: UserRole.TEACHER,
        name: 'Emily Rodriguez',
      },
    }),
    prisma.user.create({
      data: {
        email: 'teacher4@school.com',
        password: hashedPassword,
        role: UserRole.TEACHER,
        name: 'David Kim',
      },
    }),
  ]);

  // Create teacher records
  await Promise.all([
    prisma.teacher.create({
      data: {
        userId: teachers[0].id,
        name: 'Jennifer Martinez',
        email: 'teacher1@school.com',
        phone: '+1-555-0101',
        subject: 'Mathematics',
      },
    }),
    prisma.teacher.create({
      data: {
        userId: teachers[1].id,
        name: 'Robert Thompson',
        email: 'teacher2@school.com',
        phone: '+1-555-0102',
        subject: 'English',
      },
    }),
    prisma.teacher.create({
      data: {
        userId: teachers[2].id,
        name: 'Emily Rodriguez',
        email: 'teacher3@school.com',
        phone: '+1-555-0103',
        subject: 'Science',
      },
    }),
    prisma.teacher.create({
      data: {
        userId: teachers[3].id,
        name: 'David Kim',
        email: 'teacher4@school.com',
        phone: '+1-555-0104',
        subject: 'Social Studies',
      },
    }),
  ]);

  // 2. Create Grades
  console.log('📚 Creating grades...');
  const grades = await Promise.all([
    prisma.grade.create({
      data: {
        name: 'Grade 1',
        order: 1,
        isHighest: false,
      },
    }),
    prisma.grade.create({
      data: {
        name: 'Grade 2',
        order: 2,
        isHighest: false,
      },
    }),
    prisma.grade.create({
      data: {
        name: 'Grade 3',
        order: 3,
        isHighest: false,
      },
    }),
    prisma.grade.create({
      data: {
        name: 'Grade 4',
        order: 4,
        isHighest: true, // Highest grade - students graduate from here
      },
    }),
  ]);

  // 3. Create Academic Years (4 years: 2021-2022, 2022-2023, 2023-2024, 2024-2025)
  console.log('📅 Creating academic years...');
  const academicYears = await Promise.all([
    prisma.academicYear.create({
      data: {
        name: '2021-2022',
        startDate: new Date('2021-09-01'),
        endDate: new Date('2022-06-30'),
        status: AcademicYearStatus.CLOSED,
      },
    }),
    prisma.academicYear.create({
      data: {
        name: '2022-2023',
        startDate: new Date('2022-09-01'),
        endDate: new Date('2023-06-30'),
        status: AcademicYearStatus.CLOSED,
      },
    }),
    prisma.academicYear.create({
      data: {
        name: '2023-2024',
        startDate: new Date('2023-09-01'),
        endDate: new Date('2024-06-30'),
        status: AcademicYearStatus.CLOSED,
      },
    }),
    prisma.academicYear.create({
      data: {
        name: '2024-2025',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        status: AcademicYearStatus.ACTIVE, // Current active year
      },
    }),
  ]);

  // 4. Create Terms
  console.log('📖 Creating terms...');
  const term1 = await prisma.term.create({
    data: {
      name: 'Term 1',
      status: TermStatus.OPEN,
    },
  });

  const term2 = await prisma.term.create({
    data: {
      name: 'Term 2',
      status: TermStatus.OPEN, // Will be closed before promotion
    },
  });

  // 5. Create System Settings
  console.log('⚙️ Creating system settings...');
  await prisma.systemSettings.create({
    data: {
      key: 'promotionThreshold',
      value: '60.0',
      description: 'Minimum average score (0-100) required for student promotion',
    },
  });

  // 6. Create Classes for each academic year
  console.log('🏫 Creating classes for all academic years...');
  const classesByYear: { [yearId: string]: any[] } = {};

  for (const year of academicYears) {
    const yearClasses = [];
    
    // Create classes for each grade
    for (let i = 0; i < grades.length; i++) {
      const grade = grades[i];
      const sections = ['A', 'B']; // Two sections per grade
      
      for (const section of sections) {
        // Include academic year in class name to make it unique
        const className = `${grade.name}${section} (${year.name})`;
        const classData = await prisma.class.create({
          data: {
            name: className,
            description: `${grade.name} - Section ${section} (${year.name})`,
            academicYearId: year.id,
            gradeId: grade.id,
            headTeacherId: teachers[i % teachers.length].id,
          },
        });
        yearClasses.push(classData);
      }
    }
    
    classesByYear[year.id] = yearClasses;
  }

  // 7. Create Subjects for all classes
  console.log('📚 Creating subjects...');
  const allClasses = Object.values(classesByYear).flat();
  const subjectsByClass: { [classId: string]: any[] } = {};

  for (const classItem of allClasses) {
    const subjects = await Promise.all([
      prisma.subject.create({
        data: {
          classId: classItem.id,
          name: 'Mathematics',
          code: 'MATH',
          description: 'Mathematics',
        },
      }),
      prisma.subject.create({
        data: {
          classId: classItem.id,
          name: 'English',
          code: 'ENG',
          description: 'English Language',
        },
      }),
      prisma.subject.create({
        data: {
          classId: classItem.id,
          name: 'Science',
          code: 'SCI',
          description: 'General Science',
        },
      }),
      prisma.subject.create({
        data: {
          classId: classItem.id,
          name: 'Social Studies',
          code: 'SOC',
          description: 'Social Studies',
        },
      }),
    ]);
    subjectsByClass[classItem.id] = subjects;
  }

  // 8. Create SubExams for all subjects
  console.log('📝 Creating sub-exams...');
  const subExamsBySubject: { [subjectId: string]: { term1: any[], term2: any[] } } = {};

  for (const subjects of Object.values(subjectsByClass)) {
    for (const subject of subjects) {
      const term1SubExams = await Promise.all([
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

      const term2SubExams = await Promise.all([
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

      subExamsBySubject[subject.id] = {
        term1: term1SubExams,
        term2: term2SubExams,
      };
    }
  }

  // 9. Create Students (sequentially to avoid connection pool exhaustion)
  console.log('🎓 Creating students...');
  const students = [];
  
  for (let index = 0; index < STUDENT_NAMES.length; index++) {
    const name = STUDENT_NAMES[index];
    const birthYear = 2015 + (index % 4); // Mix of ages
    const birthMonth = Math.floor(Math.random() * 12) + 1;
    const birthDay = Math.floor(Math.random() * 28) + 1;
    
    const student = await prisma.student.create({
      data: {
        firstName: name.firstName,
        lastName: name.lastName,
        dateOfBirth: new Date(`${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`),
        gender: index % 2 === 0 ? 'Female' : 'Male',
        nationality: 'US',
        religion: ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu'][index % 5],
        email: `${name.firstName.toLowerCase()}.${name.lastName.toLowerCase()}@example.com`,
        phone: `+1-555-${String(1000 + index).padStart(4, '0')}`,
        parentName: `Parent of ${name.firstName} ${name.lastName}`,
        parentPhone: `+1-555-${String(2000 + index).padStart(4, '0')}`,
        parentEmail: `parent.${name.lastName.toLowerCase()}@example.com`,
        parentRelation: index % 2 === 0 ? 'Mother' : 'Father',
        address: `${100 + index} Main Street`,
        city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][index % 5],
        state: ['NY', 'CA', 'IL', 'TX', 'AZ'][index % 5],
        zipCode: String(10000 + index),
        country: 'USA',
        emergencyName: `Emergency Contact ${name.lastName}`,
        emergencyPhone: `+1-555-${String(3000 + index).padStart(4, '0')}`,
        emergencyRelation: 'Aunt',
        medicalConditions: index % 10 === 0 ? 'Asthma' : null,
        allergies: index % 7 === 0 ? 'Peanuts' : null,
        bloodGroup: ['O+', 'A+', 'B+', 'AB+', 'O-'][index % 5],
        previousSchool: index < 5 ? 'Previous Elementary School' : null,
        previousClass: index < 5 ? 'Kindergarten' : null,
        transferReason: index < 5 ? 'Family relocation' : null,
        classStatus: ClassStatus.assigned,
        paymentStatus: index % 3 === 0 ? PaymentStatus.pending : PaymentStatus.confirmed,
      },
    });
    
    students.push(student);
    
    // Small delay every 5 students to prevent overwhelming the connection
    if ((index + 1) % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`   ✓ Created ${students.length} students`);

  // 10. Create Student-Class assignments with progression history
  console.log('🔗 Creating student-class assignments with 4-year progression...');
  
  // Performance levels for each student (determines their scores)
  const studentPerformance: { [studentId: string]: 'excellent' | 'good' | 'average' | 'poor' } = {};
  
  // Assign performance levels: 30% excellent, 30% good, 25% average, 15% poor
  students.forEach((student, index) => {
    const rand = index % 20;
    if (rand < 6) studentPerformance[student.id] = 'excellent';
    else if (rand < 12) studentPerformance[student.id] = 'good';
    else if (rand < 17) studentPerformance[student.id] = 'average';
    else studentPerformance[student.id] = 'poor';
  });

  // Create assignments for each academic year
  for (let yearIndex = 0; yearIndex < academicYears.length; yearIndex++) {
    const year = academicYears[yearIndex];
    const yearClasses = classesByYear[year.id];
    
    // Assign students to classes based on their progression
    for (let studentIndex = 0; studentIndex < students.length; studentIndex++) {
      const student = students[studentIndex];
      
      // Determine which grade the student should be in for this year
      // Students start in Grade 1 in 2021-2022
      let gradeIndex = yearIndex;
      
      // Check if student should have been promoted or repeated
      // For demonstration: excellent/good students progress, average/poor may repeat
      if (yearIndex > 0) {
        const prevYear = academicYears[yearIndex - 1];
        const prevYearClasses = classesByYear[prevYear.id];
        
        // Find previous assignment
        const prevAssignment = await prisma.studentClass.findFirst({
          where: {
            studentId: student.id,
            class: {
              academicYearId: prevYear.id,
            },
          },
        });
        
        if (prevAssignment) {
          const prevClass = prevYearClasses.find(c => c.id === prevAssignment.classId);
          if (prevClass) {
            const prevGradeIndex = grades.findIndex(g => g.id === prevClass.gradeId);
            
            // Determine if student was promoted or repeated
            const performance = studentPerformance[student.id];
            const shouldPromote = performance === 'excellent' || performance === 'good' || 
                                 (performance === 'average' && Math.random() > 0.3);
            
            if (shouldPromote && prevGradeIndex < grades.length - 1) {
              gradeIndex = prevGradeIndex + 1; // Promoted
            } else {
              gradeIndex = prevGradeIndex; // Repeated
            }
            
            // Mark previous assignment as closed
            await prisma.studentClass.update({
              where: { id: prevAssignment.id },
              data: {
                endDate: new Date(year.startDate.getTime() - 1), // Day before new year starts
                promotionStatus: shouldPromote && prevGradeIndex < grades.length - 1 
                  ? PromotionStatus.PROMOTED 
                  : PromotionStatus.REPEATED,
              },
            });
          }
        }
      }
      
      // Don't create assignment if student graduated (reached highest grade)
      if (gradeIndex >= grades.length) continue;
      
      // Find class for this grade
      const targetGrade = grades[gradeIndex];
      const targetClass = yearClasses.find(c => c.gradeId === targetGrade.id);
      
      if (targetClass) {
        await prisma.studentClass.create({
          data: {
            studentId: student.id,
            classId: targetClass.id,
            startDate: year.startDate,
            endDate: yearIndex === academicYears.length - 1 ? null : new Date(year.endDate.getTime()),
            reason: yearIndex === 0 ? 'initial assignment' : 
                   (gradeIndex > (yearIndex - 1) ? 'promoted to next grade' : 'repeated same grade'),
            promotionStatus: null, // Will be set when year closes
          },
        });
      }
    }
  }

  // 11. Create Marks for all students across all years (batched for performance)
  console.log('📊 Creating marks for all students across all academic years...');
  
  const BATCH_SIZE = 100; // Insert marks in batches of 100
  let marksToCreate: any[] = [];
  let totalMarks = 0;
  
  for (const year of academicYears) {
    console.log(`   Processing marks for ${year.name}...`);
    const yearClasses = classesByYear[year.id];
    
    for (const classItem of yearClasses) {
      const subjects = subjectsByClass[classItem.id];
      
      // Get all students in this class for this year
      const classStudents = await prisma.studentClass.findMany({
        where: {
          classId: classItem.id,
          startDate: { lte: year.endDate },
          OR: [
            { endDate: { gte: year.startDate } },
            { endDate: null },
          ],
        },
      });
      
      for (const studentClass of classStudents) {
        const performance = studentPerformance[studentClass.studentId] || 'average';
        
        // Create marks for each subject and term
        for (const subject of subjects) {
          const subExams = subExamsBySubject[subject.id];
          
          // Term 1 marks
          for (const subExam of subExams.term1) {
            const score = getScoreByPerformance(performance, subExam.maxScore);
            marksToCreate.push({
              studentId: studentClass.studentId,
              classId: classItem.id,
              subjectId: subject.id,
              termId: term1.id,
              subExamId: subExam.id,
              score,
              maxScore: subExam.maxScore,
            });
            
            // Batch insert when we reach batch size
            if (marksToCreate.length >= BATCH_SIZE) {
              await prisma.mark.createMany({
                data: marksToCreate,
                skipDuplicates: true,
              });
              totalMarks += marksToCreate.length;
              marksToCreate = [];
            }
          }
          
          // Term 2 marks
          for (const subExam of subExams.term2) {
            const score = getScoreByPerformance(performance, subExam.maxScore);
            marksToCreate.push({
              studentId: studentClass.studentId,
              classId: classItem.id,
              subjectId: subject.id,
              termId: term2.id,
              subExamId: subExam.id,
              score,
              maxScore: subExam.maxScore,
            });
            
            // Batch insert when we reach batch size
            if (marksToCreate.length >= BATCH_SIZE) {
              await prisma.mark.createMany({
                data: marksToCreate,
                skipDuplicates: true,
              });
              totalMarks += marksToCreate.length;
              marksToCreate = [];
            }
          }
        }
      }
    }
  }
  
  // Insert remaining marks
  if (marksToCreate.length > 0) {
    await prisma.mark.createMany({
      data: marksToCreate,
      skipDuplicates: true,
    });
    totalMarks += marksToCreate.length;
  }
  
  console.log(`   ✓ Created ${totalMarks} marks in batches`);

  // 12. Create some attendance records for current year (batched)
  console.log('📅 Creating attendance records...');
  const currentYear = academicYears[academicYears.length - 1];
  const currentYearClasses = classesByYear[currentYear.id];
  
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  
  const attendanceToCreate: any[] = [];
  
  for (const classItem of currentYearClasses) {
    const classStudents = await prisma.studentClass.findMany({
      where: {
        classId: classItem.id,
        endDate: null, // Active students
      },
    });
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(lastWeek);
      date.setDate(lastWeek.getDate() + i);
      
      for (const studentClass of classStudents) {
        const status = Math.random() > 0.1 
          ? AttendanceStatus.present 
          : (Math.random() > 0.5 ? AttendanceStatus.late : AttendanceStatus.absent);
        
        attendanceToCreate.push({
          studentId: studentClass.studentId,
          classId: classItem.id,
          date,
          status,
          notes: status === AttendanceStatus.absent ? 'Absent' : null,
        });
      }
    }
  }
  
  // Batch insert attendance
  if (attendanceToCreate.length > 0) {
    await prisma.attendance.createMany({
      data: attendanceToCreate,
      skipDuplicates: true,
    });
    console.log(`   ✓ Created ${attendanceToCreate.length} attendance records`);
  }

  // 13. Create some payment records
  console.log('💰 Creating payment records...');
  const currentYearStudents = await prisma.studentClass.findMany({
    where: {
      class: {
        academicYearId: currentYear.id,
      },
      endDate: null,
    },
  });
  
  for (let month = 1; month <= 3; month++) {
    for (const studentClass of currentYearStudents.slice(0, 10)) { // First 10 students
      const isPaid = Math.random() > 0.3;
      const payment = await prisma.payment.create({
        data: {
          studentId: studentClass.studentId,
          amount: 500.0,
          month: `2024-${String(month).padStart(2, '0')}`,
          year: 2024,
          status: isPaid ? PaymentStatus.confirmed : PaymentStatus.pending,
          paymentDate: isPaid ? new Date(2024, month - 1, 15) : null,
          paymentMethod: isPaid ? ['bank_transfer', 'cash', 'card'][Math.floor(Math.random() * 3)] : null,
          notes: `Monthly fee for ${month}/2024`,
        },
      });
      
      if (isPaid) {
        await prisma.receipt.create({
          data: {
            paymentId: payment.id,
            receiptNumber: `REC-2024${String(month).padStart(2, '0')}-${String(payment.id).substring(0, 8).toUpperCase()}`,
            issuedDate: new Date(2024, month - 1, 15),
          },
        });
      }
    }
  }

  console.log('✅ Comprehensive seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Users: ${1 + 1 + teachers.length} (1 Owner, 1 Registrar, ${teachers.length} Teachers)`);
  console.log(`   - Grades: ${grades.length} (Grade 1 to Grade 4)`);
  console.log(`   - Academic Years: ${academicYears.length} (2021-2022, 2022-2023, 2023-2024, 2024-2025)`);
  console.log(`   - Classes: ${allClasses.length} (${grades.length} grades × 2 sections × ${academicYears.length} years)`);
  console.log(`   - Students: ${students.length} (with real names)`);
  console.log(`   - Student-Class Assignments: ${await prisma.studentClass.count()} (showing 4-year progression)`);
  console.log(`   - Subjects: ${Object.values(subjectsByClass).flat().length} (4 subjects per class)`);
  console.log(`   - SubExams: ${Object.values(subExamsBySubject).flatMap(s => [...s.term1, ...s.term2]).length} (7 per subject per term)`);
  console.log(`   - Marks: ${await prisma.mark.count()} (complete marks for all students across all years)`);
  console.log(`   - Attendance: ${await prisma.attendance.count()} (recent records)`);
  console.log(`   - Payments: ${await prisma.payment.count()}`);
  console.log(`   - Receipts: ${await prisma.receipt.count()}`);
  console.log('\n🎯 Key Features Demonstrated:');
  console.log('   ✓ 4 complete academic years with progression history');
  console.log('   ✓ Students showing promotion/repeat patterns based on performance');
  console.log('   ✓ Complete marks data for Term 1 and Term 2 across all years');
  console.log('   ✓ Real student names for better demonstration');
  console.log('   ✓ Performance-based scoring (excellent, good, average, poor)');
  console.log('   ✓ Historical data preserved (old records never modified)');
  console.log('\n🔑 Test Credentials:');
  console.log('   Owner: owner@school.com / password123');
  console.log('   Registrar: registrar@school.com / password123');
  console.log('   Teachers: teacher1@school.com to teacher4@school.com / password123');
  console.log('\n💡 Promotion System Ready:');
  console.log('   - Current active year: 2024-2025');
  console.log('   - Promotion threshold: 60.0%');
  console.log('   - Students have complete academic history');
  console.log('   - Ready to test promotion flow!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
