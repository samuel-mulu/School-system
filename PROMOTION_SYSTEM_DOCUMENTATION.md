# Academic Year Promotion System - Complete Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema & Relationships](#database-schema--relationships)
3. [Core Concepts](#core-concepts)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [API Endpoints](#api-endpoints)
7. [Data Flow & Workflows](#data-flow--workflows)
8. [Best Practices](#best-practices)

---

## System Overview

The Academic Year Promotion System enables schools to:

- Manage grade progression sequences
- Track academic years with ACTIVE/CLOSED states
- Automatically promote students based on performance
- Preserve complete academic history
- Configure promotion thresholds

**Key Principle**: Students progress forward in time through academic years. Classes reset every year, and history is never erased.

---

## Database Schema & Relationships

### Entity Relationship Diagram

```
┌─────────────┐
│   Student   │
└──────┬──────┘
       │
       │ 1:N
       │
┌──────▼──────────────┐
│   StudentClass      │
│  (Historical Record)│
└──────┬──────────────┘
       │
       │ N:1
       │
┌──────▼──────┐      ┌──────────────┐
│    Class    │◄─────┤ AcademicYear │
└──────┬──────┘      └──────────────┘
       │
       │ N:1
       │
┌──────▼──────┐
│    Grade    │
└─────────────┘

┌─────────────┐
│    Term     │───┐
└─────────────┘   │
                  │
┌─────────────┐   │ N:1
│   SubExam   │───┤
└──────┬──────┘   │
       │          │
       │ N:1      │
┌──────▼──────┐   │
│    Mark     │───┘
└──────┬──────┘
       │
       │ N:1
┌──────▼──────┐
│   Student   │
└─────────────┘
```

### Core Models

#### 1. Grade

**Purpose**: Defines the ordered sequence of grade levels for progression.

```prisma
model Grade {
  id        String   @id @default(uuid())
  name      String   @unique        // "Grade 1", "Grade 2"
  order     Int      @unique        // Sequential: 1, 2, 3...
  isHighest Boolean  @default(false) // Marks graduation level
  classes   Class[]
}
```

**Relationships**:

- `Grade` 1:N `Class` - One grade can have many classes

**Key Logic**:

- `order` determines progression sequence
- `isHighest` marks the final grade (no promotion beyond this)
- Used to determine next grade during promotion

---

#### 2. AcademicYear

**Purpose**: Represents a complete academic year with ACTIVE/CLOSED status.

```prisma
model AcademicYear {
  id        String            @id @default(uuid())
  name      String            @unique  // "2024-2025"
  startDate DateTime
  endDate   DateTime?
  status    AcademicYearStatus @default(CLOSED) // ACTIVE | CLOSED
  classes   Class[]
}
```

**Relationships**:

- `AcademicYear` 1:N `Class` - One year has many classes

**Key Logic**:

- Only ONE academic year can be ACTIVE at a time
- CLOSED years are read-only (historical data)
- Classes are linked to academic years for isolation

---

#### 3. Class

**Purpose**: Represents a class within a specific academic year and grade.

```prisma
model Class {
  id            String   @id @default(uuid())
  name          String   @unique  // "Grade 1A"
  description   String?
  academicYearId String?  // Links to AcademicYear
  gradeId       String?  // Links to Grade
  headTeacherId String?

  // Relations
  academicYear  AcademicYear?
  grade         Grade?
  headTeacher   User?
  studentClasses StudentClass[]
  subjects      Subject[]
  attendance    Attendance[]
  marks         Mark[]
}
```

**Relationships**:

- `Class` N:1 `AcademicYear` - Many classes per year
- `Class` N:1 `Grade` - Many classes per grade
- `Class` N:1 `User` (headTeacher)
- `Class` 1:N `StudentClass`
- `Class` 1:N `Subject`
- `Class` 1:N `Attendance`
- `Class` 1:N `Mark`

**Key Logic**:

- Each class belongs to ONE academic year
- Each class belongs to ONE grade
- Class names can repeat across years (e.g., "Grade 1A" in 2024 ≠ "Grade 1A" in 2025)

---

#### 4. StudentClass

**Purpose**: Historical record of a student's enrollment in a class during an academic year.

```prisma
model StudentClass {
  id             String          @id @default(uuid())
  studentId      String
  classId        String
  startDate      DateTime        @default(now())
  endDate        DateTime?       // NULL = active assignment
  reason         String          // "initial assignment", "transfer", "promoted"
  promotionStatus PromotionStatus? // PROMOTED | REPEATED | GRADUATED | null

  // Relations
  student Student
  class   Class
}
```

**Relationships**:

- `StudentClass` N:1 `Student` - Many records per student (timeline)
- `StudentClass` N:1 `Class` - Many students per class

**Key Logic**:

- `endDate = NULL` means active assignment
- `endDate != NULL` means historical record
- `promotionStatus` tracks how the record was closed
- One student can have multiple `StudentClass` records across years
- One student can have only ONE active `StudentClass` per academic year

---

#### 5. Term

**Purpose**: Academic terms (Term 1, Term 2) with OPEN/CLOSED status.

```prisma
model Term {
  id        String     @id @default(uuid())
  name      String     @unique  // "Term 1", "Term 2"
  status    TermStatus @default(OPEN) // OPEN | CLOSED
  subExams  SubExam[]
  marks     Mark[]
}
```

**Key Logic**:

- Term 2 must be CLOSED before promotion can occur
- Status controls whether marks can be entered

---

#### 6. SystemSettings

**Purpose**: Stores system-wide configuration.

```prisma
model SystemSettings {
  id          String   @id @default(uuid())
  key         String   @unique  // "promotionThreshold"
  value       String   // "60.0"
  description String?
}
```

**Key Settings**:

- `promotionThreshold`: Minimum average (0-100) required for promotion

---

## Core Concepts

### 1. Academic Year Isolation

**Concept**: Each academic year has completely isolated data.

- Classes in 2024-2025 are separate from classes in 2025-2026
- Attendance, marks, and payments are linked to specific academic years through classes
- Past years become read-only when CLOSED

**Implementation**:

```typescript
// Only show classes from active academic year
const activeYear = await getActiveAcademicYear();
const classes = await prisma.class.findMany({
  where: { academicYearId: activeYear.id },
});
```

---

### 2. Student Timeline

**Concept**: A student's academic journey is a timeline of `StudentClass` records.

```
Student Timeline:
├─ StudentClass (2024-2025, Grade 1A) [endDate: 2025-06-30, status: PROMOTED]
├─ StudentClass (2025-2026, Grade 2A) [endDate: NULL, status: null] ← ACTIVE
└─ StudentClass (2026-2027, Grade 3A) [future]
```

**Implementation**:

```typescript
// Get student's complete history
const history = await prisma.studentClass.findMany({
  where: { studentId },
  include: { class: { include: { academicYear: true, grade: true } } },
  orderBy: { startDate: "desc" },
});

// Get active assignment
const active = await prisma.studentClass.findFirst({
  where: { studentId, endDate: null },
});
```

---

### 3. Promotion Logic

**Flow**:

1. Term 2 must be CLOSED
2. Calculate yearly average for each student (across all subjects)
3. Compare against `promotionThreshold`
4. Determine outcome:
   - **PASS** (average ≥ threshold) → Next grade
   - **REPEAT** (average < threshold) → Same grade
   - **GRADUATE** (at highest grade) → No new record

**Implementation**:

```typescript
// Calculate overall yearly average
const subjects = await prisma.subject.findMany({ where: { classId } });
const averages = await Promise.all(
  subjects.map((subject) => calculateYearAverage(studentId, subject.id))
);
const overallAverage =
  averages.reduce((sum, avg) => sum + avg, 0) / averages.length;

// Determine outcome
if (currentGrade.isHighest) {
  outcome = "GRADUATE";
} else if (overallAverage >= threshold) {
  outcome = "PASS";
  nextGrade = await getNextGrade(currentGrade.id);
} else {
  outcome = "REPEAT";
  nextGrade = currentGrade;
}
```

---

## Backend Architecture

### Service Layer Structure

```
src/services/
├── grade.service.ts          # Grade CRUD + progression logic
├── academicYear.service.ts   # Academic year management
├── promotion.service.ts      # Core promotion logic
├── settings.service.ts       # System settings
├── term.service.ts           # Term status management
├── class.service.ts          # Class management (updated)
├── student.service.ts       # Student management
├── marks.service.ts          # Marks management
└── calculation.service.ts   # Score calculations
```

### Key Services

#### 1. Grade Service (`grade.service.ts`)

**Functions**:

- `createGrade()` - Create new grade
- `getGrades()` - Get all grades (ordered)
- `getNextGrade(currentGradeId)` - Get next grade in sequence
- `getHighestGrade()` - Get highest grade

**Example**:

```typescript
// Get next grade for promotion
const nextGrade = await getNextGrade("grade-1-id");
// Returns: { id: 'grade-2-id', name: 'Grade 2', order: 2 }

// Check if student can graduate
const highestGrade = await getHighestGrade();
if (currentGrade.id === highestGrade.id) {
  // Student graduates
}
```

---

#### 2. Academic Year Service (`academicYear.service.ts`)

**Functions**:

- `createAcademicYear()` - Create new year (starts as CLOSED)
- `getActiveAcademicYear()` - Get currently active year
- `activateAcademicYear(id)` - Set year to ACTIVE (closes others)
- `closeAcademicYear(id)` - Set year to CLOSED

**Example**:

```typescript
// Activate new academic year
await activateAcademicYear("2025-2026-id");
// Automatically closes previous active year

// Get active year for filtering
const activeYear = await getActiveAcademicYear();
const classes = await prisma.class.findMany({
  where: { academicYearId: activeYear.id },
});
```

---

#### 3. Promotion Service (`promotion.service.ts`)

**Functions**:

- `getPromotionPreview()` - Preview promotion outcomes
- `promoteStudents()` - Execute promotion

**Promotion Flow**:

```typescript
export const promoteStudents = async () => {
  // 1. Validate Term 2 is closed
  const term2 = await prisma.term.findUnique({ where: { name: 'Term 2' } });
  if (term2.status !== 'CLOSED') throw new Error('Term 2 must be closed');

  // 2. Get active academic year
  const activeYear = await getActiveAcademicYear();

  // 3. Get all active students
  const activeStudents = await prisma.studentClass.findMany({
    where: {
      class: { academicYearId: activeYear.id },
      endDate: null
    }
  });

  // 4. Create next academic year
  const nextYear = await createAcademicYear({ name: '2025-2026', ... });

  // 5. Process each student
  for (const studentClass of activeStudents) {
    // Calculate average
    const average = await calculateStudentYearlyAverage(
      studentClass.studentId,
      studentClass.classId
    );

    // Determine outcome
    const outcome = determineOutcome(average, threshold, currentGrade);

    // Close current record
    await prisma.studentClass.update({
      where: { id: studentClass.id },
      data: {
        endDate: new Date(),
        promotionStatus: outcome === 'PASS' ? 'PROMOTED' :
                        outcome === 'REPEAT' ? 'REPEATED' : 'GRADUATED'
      }
    });

    // Create new record (if not graduating)
    if (outcome !== 'GRADUATE') {
      await prisma.studentClass.create({
        data: {
          studentId: studentClass.studentId,
          classId: nextClassId,
          reason: outcome === 'PASS' ? 'Promoted to next grade' : 'Repeated same grade',
          startDate: new Date()
        }
      });
    }
  }
};
```

---

#### 4. Settings Service (`settings.service.ts`)

**Functions**:

- `getSetting(key)` - Get setting value
- `updateSetting(key, value)` - Update setting
- `getAllSettings()` - Get all settings

**Example**:

```typescript
// Get promotion threshold
const threshold = await getSetting("promotionThreshold");
const numThreshold = parseFloat(threshold.value); // "60.0" → 60.0

// Update threshold
await updateSetting(
  "promotionThreshold",
  "65.0",
  "Minimum score for promotion"
);
```

---

## Frontend Architecture

### Hook Structure

```
lib/hooks/
├── use-grades.ts              # Grade management hooks
├── use-academicYears.ts      # Academic year hooks
├── use-promotion.ts          # Promotion hooks
├── use-settings.ts           # Settings hooks
└── use-classes.ts            # Class hooks (existing)
```

### Key Hooks

#### 1. Grade Hooks (`use-grades.ts`)

```typescript
// Get all grades
const { data, isLoading } = useGrades();
// Returns: { data: Grade[] }

// Create grade
const createGrade = useCreateGrade();
await createGrade.mutateAsync({
  name: "Grade 1",
  order: 1,
  isHighest: false,
});

// Update grade
const updateGrade = useUpdateGrade();
await updateGrade.mutateAsync({
  id: "grade-id",
  data: { isHighest: true },
});
```

---

#### 2. Academic Year Hooks (`use-academicYears.ts`)

```typescript
// Get all academic years
const { data } = useAcademicYears();

// Get active academic year
const { data: activeYear } = useActiveAcademicYear();

// Activate academic year
const activateYear = useActivateAcademicYear();
await activateYear.mutateAsync("year-id");
```

---

#### 3. Promotion Hooks (`use-promotion.ts`)

```typescript
// Get promotion preview
const { data: preview } = usePromotionPreview();
// Returns: {
//   canPromote: boolean,
//   students: PromotionPreviewStudent[],
//   summary: { total, passing, repeating, graduating }
// }

// Execute promotion
const promoteStudents = usePromoteStudents();
await promoteStudents.mutateAsync();
```

---

### Component Structure

```
app/dashboard/
├── settings/
│   └── page.tsx              # Unified settings (tabs: System, Grades, Academic Years)
├── grades/
│   └── page.tsx              # Grade management
├── academic-years/
│   └── page.tsx              # Academic year management
└── promotion/
    └── page.tsx              # Promotion interface
```

---

## API Endpoints

### Grades Endpoints

```
GET    /api/grades              # Get all grades
GET    /api/grades/:id          # Get grade by ID
POST   /api/grades              # Create grade (OWNER/REGISTRAR)
PATCH  /api/grades/:id          # Update grade (OWNER/REGISTRAR)
DELETE /api/grades/:id          # Delete grade (OWNER/REGISTRAR)
```

**Request/Response Examples**:

```typescript
// POST /api/grades
Request: {
  name: "Grade 1",
  order: 1,
  isHighest: false
}

Response: {
  success: true,
  data: {
    id: "uuid",
    name: "Grade 1",
    order: 1,
    isHighest: false,
    createdAt: "2025-01-01T00:00:00Z"
  }
}
```

---

### Academic Years Endpoints

```
GET    /api/academic-years              # Get all academic years
GET    /api/academic-years/active       # Get active academic year
GET    /api/academic-years/:id          # Get academic year by ID
POST   /api/academic-years              # Create academic year (OWNER/REGISTRAR)
PATCH  /api/academic-years/:id          # Update academic year (OWNER/REGISTRAR)
POST   /api/academic-years/:id/activate # Activate year (OWNER/REGISTRAR)
POST   /api/academic-years/:id/close    # Close year (OWNER/REGISTRAR)
```

**Request/Response Examples**:

```typescript
// POST /api/academic-years
Request: {
  name: "2025-2026",
  startDate: "2025-09-01T00:00:00Z",
  endDate: "2026-06-30T00:00:00Z"
}

Response: {
  success: true,
  data: {
    id: "uuid",
    name: "2025-2026",
    status: "CLOSED",
    startDate: "2025-09-01T00:00:00Z",
    endDate: "2026-06-30T00:00:00Z"
  }
}

// POST /api/academic-years/:id/activate
Response: {
  success: true,
  data: {
    id: "uuid",
    name: "2025-2026",
    status: "ACTIVE",  // Changed to ACTIVE
    // ... other fields
  }
}
```

---

### Promotion Endpoints

```
GET  /api/promotion/preview    # Get promotion preview (OWNER/REGISTRAR)
POST /api/promotion/execute    # Execute promotion (OWNER/REGISTRAR)
```

**Request/Response Examples**:

```typescript
// GET /api/promotion/preview
Response: {
  success: true,
  data: {
    canPromote: true,
    term2Status: "CLOSED",
    activeAcademicYear: {
      id: "uuid",
      name: "2024-2025"
    },
    students: [
      {
        studentId: "uuid",
        firstName: "John",
        lastName: "Doe",
        currentClassName: "Grade 1A",
        overallAverage: 75.5,
        outcome: "PASS",
        nextGradeName: "Grade 2",
        nextClassName: "Grade 2A"
      },
      // ... more students
    ],
    summary: {
      total: 50,
      passing: 35,
      repeating: 10,
      graduating: 5
    }
  }
}

// POST /api/promotion/execute
Response: {
  success: true,
  data: {
    message: "Promotion completed successfully",
    promoted: 35,
    repeated: 10,
    graduated: 5
  }
}
```

---

### Settings Endpoints

```
GET    /api/settings              # Get all settings (OWNER)
GET    /api/settings/:key         # Get setting by key (OWNER)
PATCH  /api/settings/:key         # Update setting (OWNER)
```

**Request/Response Examples**:

```typescript
// PATCH /api/settings/promotionThreshold
Request: {
  value: "65.0",
  description: "Minimum score for promotion"
}

Response: {
  success: true,
  data: {
    id: "uuid",
    key: "promotionThreshold",
    value: "65.0",
    description: "Minimum score for promotion"
  }
}
```

---

### Term Endpoints (Updated)

```
GET  /api/terms              # Get all terms
GET  /api/terms/:id          # Get term by ID
POST /api/terms/:id/close    # Close term (OWNER/REGISTRAR)
POST /api/terms/:id/open     # Open term (OWNER/REGISTRAR)
```

---

## Data Flow & Workflows

### 1. Academic Year Setup Workflow

```
1. Create Academic Year
   POST /api/academic-years
   → Creates year with status: CLOSED

2. Activate Academic Year
   POST /api/academic-years/:id/activate
   → Sets status: ACTIVE
   → Closes previous active year

3. Create Classes for Year
   POST /api/classes
   → Link to academicYearId and gradeId
```

---

### 2. Student Registration Workflow

```
1. Create Student
   POST /api/students
   → Creates student with classStatus: "new"

2. Assign to Class
   POST /api/students/:id/assign-class
   → Creates StudentClass record
   → Sets classStatus: "assigned"
   → Sets startDate: now()
   → Sets endDate: null (active)
```

---

### 3. Promotion Workflow

```
1. Complete Term 2
   POST /api/terms/:term2-id/close
   → Sets Term 2 status: CLOSED

2. Preview Promotion
   GET /api/promotion/preview
   → Calculates averages for all students
   → Shows outcomes (PASS/REPEAT/GRADUATE)
   → Shows summary statistics

3. Execute Promotion
   POST /api/promotion/execute
   → Validates Term 2 is closed
   → Creates next academic year
   → For each student:
     a. Calculate yearly average
     b. Determine outcome
     c. Close current StudentClass
     d. Create new StudentClass (if not graduating)
```

---

### 4. Querying Student History

```typescript
// Get student's complete academic history
const student = await prisma.student.findUnique({
  where: { id: studentId },
  include: {
    classHistory: {
      include: {
        class: {
          include: {
            academicYear: true,
            grade: true
          }
        }
      },
      orderBy: { startDate: 'desc' }
    }
  }
});

// Result structure:
{
  id: "student-id",
  firstName: "John",
  lastName: "Doe",
  classHistory: [
    {
      id: "sc-3",
      startDate: "2025-09-01",
      endDate: null,
      promotionStatus: null,
      class: {
        name: "Grade 2A",
        academicYear: { name: "2025-2026", status: "ACTIVE" },
        grade: { name: "Grade 2", order: 2 }
      }
    },
    {
      id: "sc-2",
      startDate: "2024-09-01",
      endDate: "2025-06-30",
      promotionStatus: "PROMOTED",
      class: {
        name: "Grade 1A",
        academicYear: { name: "2024-2025", status: "CLOSED" },
        grade: { name: "Grade 1", order: 1 }
      }
    }
  ]
}
```

---

## Best Practices

### 1. Always Filter by Active Academic Year

```typescript
// ✅ Good: Filter by active year
const activeYear = await getActiveAcademicYear();
const classes = await prisma.class.findMany({
  where: { academicYearId: activeYear.id },
});

// ❌ Bad: Get all classes without filtering
const classes = await prisma.class.findMany();
```

---

### 2. Never Modify Historical Records

```typescript
// ✅ Good: Create new record
await prisma.studentClass.create({
  data: {
    studentId,
    classId: newClassId,
    startDate: new Date(),
    reason: "Promoted to next grade",
  },
});

// ❌ Bad: Modify existing record
await prisma.studentClass.update({
  where: { id: oldRecordId },
  data: { classId: newClassId }, // DON'T DO THIS
});
```

---

### 3. Always Check Term Status Before Promotion

```typescript
// ✅ Good: Validate before promotion
const term2 = await prisma.term.findUnique({ where: { name: "Term 2" } });
if (term2.status !== "CLOSED") {
  throw new Error("Term 2 must be closed before promotion");
}

// ❌ Bad: Skip validation
await promoteStudents(); // Could fail silently
```

---

### 4. Use Transactions for Promotion

```typescript
// ✅ Good: Use transaction for atomicity
await prisma.$transaction(async (tx) => {
  // Close current records
  await tx.studentClass.updateMany({ ... });

  // Create new records
  await tx.studentClass.createMany({ ... });

  // If any step fails, all rollback
});
```

---

### 5. Validate Grade Progression

```typescript
// ✅ Good: Check if next grade exists
const nextGrade = await getNextGrade(currentGradeId);
if (!nextGrade) {
  // Student is at highest grade - graduate
  outcome = "GRADUATE";
}

// ❌ Bad: Assume next grade exists
const nextGrade = grades.find((g) => g.order === currentGrade.order + 1);
// Could be undefined
```

---

### 6. Frontend: Use React Query for Caching

```typescript
// ✅ Good: Use React Query hooks
const { data, isLoading } = useGrades();
// Automatically cached, refetched on mutations

// ❌ Bad: Direct API calls in components
const [grades, setGrades] = useState([]);
useEffect(() => {
  fetch("/api/grades")
    .then((res) => res.json())
    .then(setGrades);
}, []);
// No caching, manual refetching needed
```

---

### 7. Frontend: Show Loading States

```typescript
// ✅ Good: Handle loading states
if (isLoading) return <LoadingState />;
if (error) return <ErrorState onRetry={refetch} />;

// ❌ Bad: No loading states
return <div>{data.map(...)}</div>; // Could crash if data is undefined
```

---

## Common Patterns

### Pattern 1: Get Active Student Assignment

```typescript
const getActiveStudentClass = async (studentId: string) => {
  return await prisma.studentClass.findFirst({
    where: {
      studentId,
      endDate: null, // Active assignment
    },
    include: {
      class: {
        include: {
          academicYear: true,
          grade: true,
        },
      },
    },
  });
};
```

---

### Pattern 2: Filter Classes by Active Year

```typescript
const getActiveYearClasses = async () => {
  const activeYear = await getActiveAcademicYear();
  if (!activeYear) return [];

  return await prisma.class.findMany({
    where: {
      academicYearId: activeYear.id,
    },
    include: {
      grade: true,
      academicYear: true,
    },
  });
};
```

---

### Pattern 3: Calculate Student Yearly Average

```typescript
const calculateStudentYearlyAverage = async (
  studentId: string,
  classId: string
): Promise<number> => {
  // Get all subjects
  const subjects = await prisma.subject.findMany({ where: { classId } });

  // Calculate average for each subject
  const subjectAverages = await Promise.all(
    subjects.map(async (subject) => {
      const yearResult = await calculateYearAverage(studentId, subject.id);
      return yearResult.yearAverage;
    })
  );

  // Overall average
  return subjectAverages.length > 0
    ? subjectAverages.reduce((sum, avg) => sum + avg, 0) /
        subjectAverages.length
    : 0;
};
```

---

## Error Handling

### Backend Error Handling

```typescript
// Service layer
export const promoteStudents = async () => {
  try {
    // Validate prerequisites
    const term2 = await prisma.term.findUnique({ where: { name: "Term 2" } });
    if (!term2) throw new NotFoundError("Term 2 not found");
    if (term2.status !== "CLOSED") {
      throw new BadRequestError("Term 2 must be closed before promotion");
    }

    // ... promotion logic
  } catch (error) {
    // Errors are caught by error handler middleware
    throw error;
  }
};
```

### Frontend Error Handling

```typescript
// React Query automatically handles errors
const promoteStudents = usePromoteStudents();

// In component
try {
  await promoteStudents.mutateAsync();
  toast.success("Promotion completed");
} catch (error) {
  // Error is already handled by hook's onError
  // Shows toast automatically
}
```

---

## Testing Considerations

### Unit Tests

```typescript
// Test grade progression
describe("getNextGrade", () => {
  it("should return next grade in sequence", async () => {
    const grade1 = await createGrade({ name: "Grade 1", order: 1 });
    const grade2 = await createGrade({ name: "Grade 2", order: 2 });

    const next = await getNextGrade(grade1.id);
    expect(next.id).toBe(grade2.id);
  });

  it("should return null for highest grade", async () => {
    const highest = await createGrade({
      name: "Grade 12",
      order: 12,
      isHighest: true,
    });
    const next = await getNextGrade(highest.id);
    expect(next).toBeNull();
  });
});
```

### Integration Tests

```typescript
// Test promotion flow
describe("promoteStudents", () => {
  it("should promote students correctly", async () => {
    // Setup: Create year, classes, students
    const year = await createAcademicYear({ name: "2024-2025" });
    await activateAcademicYear(year.id);

    // Close Term 2
    const term2 = await getTermByName("Term 2");
    await closeTerm(term2.id);

    // Execute promotion
    const result = await promoteStudents();

    expect(result.promoted).toBeGreaterThan(0);

    // Verify old records are closed
    const oldRecords = await prisma.studentClass.findMany({
      where: { endDate: { not: null } },
    });
    expect(oldRecords.length).toBeGreaterThan(0);

    // Verify new records are created
    const newRecords = await prisma.studentClass.findMany({
      where: { endDate: null },
    });
    expect(newRecords.length).toBeGreaterThan(0);
  });
});
```

---

## Summary

This promotion system provides:

1. **Complete History**: All student records are preserved
2. **Year Isolation**: Each academic year has separate data
3. **Flexible Configuration**: Grades, years, and thresholds are configurable
4. **Safe Operations**: Validation prevents data corruption
5. **Clear Workflows**: Step-by-step promotion process
6. **Type Safety**: Full TypeScript support
7. **React Integration**: Hooks and components ready to use

The system follows the principle: **Students progress forward in time; history is never erased.**
