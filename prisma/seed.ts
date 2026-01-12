import { PrismaClient, UserRole, ClassStatus, PaymentStatus, AttendanceStatus } from '../src/generated/prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const NUM_CLASSES = 4;
const STUDENTS_PER_CLASS = 40;
const SUBJECTS_PER_CLASS = 6;
const MONTHS_OF_ATTENDANCE = 3;

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Starting seed (4 classes, 40 students each, 6 subjects per class)...');

  // Clean existing data
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

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Users: owner + registrar
  const owner = await prisma.user.create({ data: { email: 'owner@school.com', password: hashedPassword, role: UserRole.OWNER, name: 'School Owner' } });
  const registrar = await prisma.user.create({ data: { email: 'registrar@school.com', password: hashedPassword, role: UserRole.REGISTRAR, name: 'School Registrar' } });

  // Create head teacher users and teacher records (one per class)
  const headTeachers: { user: any; record: any }[] = [];
  for (let i = 1; i <= NUM_CLASSES; i++) {
    const email = `head${i}@school.com`;
    const user = await prisma.user.create({ data: { email, password: hashedPassword, role: UserRole.TEACHER, name: `Head Teacher ${i}` } });
    const teacherRecord = await prisma.teacher.create({ data: { userId: user.id, name: `Head Teacher ${i}`, email, phone: `+10000000${i}`, subject: null } });
    headTeachers.push({ user, record: teacherRecord });
  }

  // Create classes
  console.log('📚 Creating classes...');
  const classes: any[] = [];
  for (let i = 1; i <= NUM_CLASSES; i++) {
    const cls = await prisma.class.create({ data: { name: `Class ${i}`, description: `Class ${i} - auto seeded`, academicYear: '2025-2026', headTeacherId: headTeachers[i - 1].user.id } });
    classes.push(cls);
  }

  // Create term (single term used for marks)
  console.log('📅 Creating term...');
  const term = await prisma.term.create({ data: { name: 'Term 1' } });

  // Subjects per class
  console.log('📖 Creating subjects (6 per class)...');
  const subjectNames = ['Mathematics', 'English', 'Science', 'Social Studies', 'ICT', 'Art'];
  const allSubjects: any[] = [];
  for (const cls of classes) {
    for (let s = 0; s < SUBJECTS_PER_CLASS; s++) {
      const sub = await prisma.subject.create({ data: { classId: cls.id, name: subjectNames[s] ?? `Subject ${s + 1}`, code: `${subjectNames[s]?.slice(0,3).toUpperCase() || 'SUB'}-${cls.name.replace(/\s+/g,'')}-${s+1}`, description: `${subjectNames[s] ?? 'Subject'} for ${cls.name}` } });
      allSubjects.push(sub);
    }
  }

  // Create sub-exams for each subject for the term (full coverage)
  console.log('📝 Creating sub-exams for term...');
  const createdSubExams: any[] = [];
  for (const subject of allSubjects) {
    const subExams = await Promise.all([
      prisma.subExam.create({ data: { subjectId: subject.id, termId: term.id, name: 'Assignment 1', maxScore: 5, weightPercent: 5, examType: 'assignment' } }),
      prisma.subExam.create({ data: { subjectId: subject.id, termId: term.id, name: 'Assignment 2', maxScore: 5, weightPercent: 5, examType: 'assignment' } }),
      prisma.subExam.create({ data: { subjectId: subject.id, termId: term.id, name: 'Quiz 1', maxScore: 10, weightPercent: 10, examType: 'quiz' } }),
      prisma.subExam.create({ data: { subjectId: subject.id, termId: term.id, name: 'Quiz 2', maxScore: 10, weightPercent: 10, examType: 'quiz' } }),
      prisma.subExam.create({ data: { subjectId: subject.id, termId: term.id, name: 'Quiz 3', maxScore: 10, weightPercent: 10, examType: 'quiz' } }),
      prisma.subExam.create({ data: { subjectId: subject.id, termId: term.id, name: 'Mid Exam', maxScore: 20, weightPercent: 20, examType: 'mid_exam' } }),
      prisma.subExam.create({ data: { subjectId: subject.id, termId: term.id, name: 'General Test', maxScore: 100, weightPercent: 40, examType: 'general_test' } }),
    ]);
    createdSubExams.push(...subExams);
  }

  // Create students and assign to classes
  console.log(`🎓 Creating ${NUM_CLASSES * STUDENTS_PER_CLASS} students and assignments...`);
  const students: any[] = [];
  for (let ci = 0; ci < classes.length; ci++) {
    const cls = classes[ci];
    for (let si = 1; si <= STUDENTS_PER_CLASS; si++) {
      const firstName = `Student${ci + 1}_${si}`;
      const lastName = `Auto`;
      const dob = new Date(2015 + (ci % 5), randInt(0, 11), randInt(1, 28));
      const student = await prisma.student.create({ data: {
        firstName,
        lastName,
        dateOfBirth: dob,
        gender: si % 2 === 0 ? 'Male' : 'Female',
        nationality: 'Local',
        religion: 'None',
        email: null,
        phone: null,
        parentName: `${firstName} Parent`,
        parentPhone: `+100${ci}${si}`,
        parentEmail: null,
        parentRelation: 'Guardian',
        address: 'Auto Address',
        city: 'City',
        state: 'State',
        zipCode: null,
        country: 'Country',
        emergencyName: `${firstName} Emergency`,
        emergencyPhone: `+200${ci}${si}`,
        emergencyRelation: 'Guardian',
        medicalConditions: null,
        allergies: null,
        bloodGroup: null,
        previousSchool: null,
        previousClass: null,
        transferReason: null,
        classStatus: ClassStatus.assigned,
        paymentStatus: PaymentStatus.pending,
      }});

      await prisma.studentClass.create({ data: { studentId: student.id, classId: cls.id, startDate: new Date('2024-09-01'), reason: 'initial assignment' } });
      students.push({ ...student, classId: cls.id });
    }
  }

  // Attendance for last MONTHS_OF_ATTENDANCE months (weekdays only)
  console.log(`📅 Creating attendance for last ${MONTHS_OF_ATTENDANCE} months (weekdays)...`);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - (MONTHS_OF_ATTENDANCE - 1), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const dates: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const copy = new Date(d);
    const day = copy.getDay();
    if (day === 0 || day === 6) continue; // skip weekends
    dates.push(new Date(copy));
  }

  for (const date of dates) {
    // batch create per class to reduce round trips
    for (const cls of classes) {
      const classStudents = students.filter(s => s.classId === cls.id);
      const attendanceCreates = classStudents.map(s => ({ studentId: s.id, classId: cls.id, date: date, status: Math.random() < 0.9 ? AttendanceStatus.present : (Math.random() < 0.5 ? AttendanceStatus.late : AttendanceStatus.absent), notes: null }));
      // create many one by one
      for (const a of attendanceCreates) {
        await prisma.attendance.create({ data: a });
      }
    }
  }

  // Marks: for each student, for their class subjects, for term create marks for each subExam
  console.log('📊 Creating marks for term (randomized scores)...');
  for (const stud of students) {
    const classSubjects = allSubjects.filter(s => s.classId === stud.classId);
    for (const subj of classSubjects) {
      const subExams = createdSubExams.filter(se => se.subjectId === subj.id && se.termId === term.id);
      for (const se of subExams) {
        const score = randInt(Math.max(0, Math.floor(se.maxScore * 0.5)), se.maxScore);
        await prisma.mark.create({ data: { studentId: stud.id, classId: stud.classId, subjectId: subj.id, termId: term.id, subExamId: se.id, score, maxScore: se.maxScore } });
      }
    }
  }

  // Payments for last 3 months per student
  console.log('💰 Creating payments for last 3 months...');
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  for (let m = 0; m < 3; m++) {
    const month = currentMonth - m;
    const year = currentYear;
    const monthStr = `${year}-${String((month + 12) % 12 || 12).padStart(2, '0')}`;
    for (const stud of students) {
      const isPending = Math.random() < 0.1;
      const payment = await prisma.payment.create({ data: { studentId: stud.id, amount: 500.0, month: monthStr, year, status: isPending ? PaymentStatus.pending : PaymentStatus.confirmed, paymentDate: isPending ? null : new Date(year, (month - 1 + 12) % 12, randInt(5, 25)), paymentMethod: isPending ? null : (Math.random() < 0.5 ? 'cash' : 'card'), notes: `Monthly fee for ${monthStr}` } });
      if (!isPending) {
        await prisma.receipt.create({ data: { paymentId: payment.id, receiptNumber: `REC-${year}${String((month + 12) % 12 || 12).padStart(2,'0')}-${String(stud.id).substring(0,8).toUpperCase()}`, issuedDate: payment.paymentDate || new Date() } });
      }
    }
  }

  console.log('✅ Seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - Users: ${2 + headTeachers.length} (Owner, Registrar, ${headTeachers.length} Head Teachers)`);
  console.log(`   - Term: 1`);
  console.log(`   - Classes: ${classes.length}`);
  console.log(`   - Students: ${students.length}`);
  console.log(`   - Subjects: ${allSubjects.length}`);
  console.log(`   - Sub-exams: ${createdSubExams.length}`);
  console.log(`   - Attendance records: approx ${dates.length * students.length}`);
  console.log(`   - Marks: approx ${students.length * SUBJECTS_PER_CLASS * 7}`);
  console.log(`   - Payments: approx ${students.length * 3}`);
  console.log('\n🔑 Test Credentials:');
  console.log('   Owner: owner@school.com / password123');
  console.log('   Registrar: registrar@school.com / password123');
  headTeachers.forEach((ht, idx) => console.log(`   Head Teacher ${idx + 1}: ${ht.user.email} / password123`));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




