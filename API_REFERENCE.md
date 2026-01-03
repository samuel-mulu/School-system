# API Reference - Promotion System

## Quick Endpoint Reference

### Grades API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/grades` | ✅ | Get all grades (ordered) |
| GET | `/api/grades/:id` | ✅ | Get grade by ID |
| POST | `/api/grades` | 🔒 OWNER/REGISTRAR | Create grade |
| PATCH | `/api/grades/:id` | 🔒 OWNER/REGISTRAR | Update grade |
| DELETE | `/api/grades/:id` | 🔒 OWNER/REGISTRAR | Delete grade |

**Request Body (POST/PATCH)**:
```json
{
  "name": "Grade 1",
  "order": 1,
  "isHighest": false
}
```

---

### Academic Years API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/academic-years` | ✅ | Get all academic years |
| GET | `/api/academic-years/active` | ✅ | Get active academic year |
| GET | `/api/academic-years/:id` | ✅ | Get academic year by ID |
| POST | `/api/academic-years` | 🔒 OWNER/REGISTRAR | Create academic year |
| PATCH | `/api/academic-years/:id` | 🔒 OWNER/REGISTRAR | Update academic year |
| POST | `/api/academic-years/:id/activate` | 🔒 OWNER/REGISTRAR | Activate year (closes others) |
| POST | `/api/academic-years/:id/close` | 🔒 OWNER/REGISTRAR | Close year |

**Request Body (POST/PATCH)**:
```json
{
  "name": "2025-2026",
  "startDate": "2025-09-01T00:00:00Z",
  "endDate": "2026-06-30T00:00:00Z"
}
```

---

### Promotion API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/promotion/preview` | 🔒 OWNER/REGISTRAR | Get promotion preview |
| POST | `/api/promotion/execute` | 🔒 OWNER/REGISTRAR | Execute promotion |

**Response (GET /preview)**:
```json
{
  "success": true,
  "data": {
    "canPromote": true,
    "term2Status": "CLOSED",
    "activeAcademicYear": {
      "id": "uuid",
      "name": "2024-2025"
    },
    "students": [
      {
        "studentId": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "currentClassName": "Grade 1A",
        "currentGradeName": "Grade 1",
        "overallAverage": 75.5,
        "outcome": "PASS",
        "nextGradeName": "Grade 2",
        "nextClassName": "Grade 2A"
      }
    ],
    "summary": {
      "total": 50,
      "passing": 35,
      "repeating": 10,
      "graduating": 5
    }
  }
}
```

**Response (POST /execute)**:
```json
{
  "success": true,
  "data": {
    "message": "Promotion completed successfully",
    "promoted": 35,
    "repeated": 10,
    "graduated": 5
  }
}
```

---

### Settings API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | 🔒 OWNER | Get all settings |
| GET | `/api/settings/:key` | 🔒 OWNER | Get setting by key |
| PATCH | `/api/settings/:key` | 🔒 OWNER | Update setting |

**Request Body (PATCH)**:
```json
{
  "value": "65.0",
  "description": "Minimum score for promotion"
}
```

---

### Terms API (Updated)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/terms` | ✅ | Get all terms |
| GET | `/api/terms/:id` | ✅ | Get term by ID |
| POST | `/api/terms/:id/close` | 🔒 OWNER/REGISTRAR | Close term (Term 2 only) |
| POST | `/api/terms/:id/open` | 🔒 OWNER/REGISTRAR | Open term |

---

## Frontend Hooks Reference

### Grade Hooks

```typescript
// Get all grades
const { data, isLoading, error } = useGrades();

// Create grade
const createGrade = useCreateGrade();
await createGrade.mutateAsync({
  name: 'Grade 1',
  order: 1,
  isHighest: false
});

// Update grade
const updateGrade = useUpdateGrade();
await updateGrade.mutateAsync({
  id: 'grade-id',
  data: { isHighest: true }
});

// Delete grade
const deleteGrade = useDeleteGrade();
await deleteGrade.mutateAsync('grade-id');
```

---

### Academic Year Hooks

```typescript
// Get all academic years
const { data, isLoading } = useAcademicYears();

// Get active academic year
const { data: activeYear } = useActiveAcademicYear();

// Create academic year
const createYear = useCreateAcademicYear();
await createYear.mutateAsync({
  name: '2025-2026',
  startDate: '2025-09-01T00:00:00Z',
  endDate: '2026-06-30T00:00:00Z'
});

// Activate academic year
const activateYear = useActivateAcademicYear();
await activateYear.mutateAsync('year-id');

// Close academic year
const closeYear = useCloseAcademicYear();
await closeYear.mutateAsync('year-id');
```

---

### Promotion Hooks

```typescript
// Get promotion preview
const { data: preview, isLoading } = usePromotionPreview();
// preview.canPromote
// preview.students[]
// preview.summary

// Execute promotion
const promoteStudents = usePromoteStudents();
await promoteStudents.mutateAsync();
```

---

### Settings Hooks

```typescript
// Get all settings
const { data: settings } = useSettings();

// Get specific setting
const { data: threshold } = useSetting('promotionThreshold');

// Update setting
const updateSetting = useUpdateSetting();
await updateSetting.mutateAsync({
  key: 'promotionThreshold',
  data: { value: '65.0' }
});
```

---

## Data Models

### Grade
```typescript
interface Grade {
  id: string;
  name: string;           // "Grade 1"
  order: number;          // 1, 2, 3...
  isHighest: boolean;     // true if graduation level
  createdAt: string;
  updatedAt: string;
}
```

### AcademicYear
```typescript
interface AcademicYear {
  id: string;
  name: string;           // "2024-2025"
  startDate: string;
  endDate?: string;
  status: "ACTIVE" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  classes?: Class[];
}
```

### StudentClass
```typescript
interface StudentClass {
  id: string;
  studentId: string;
  classId: string;
  startDate: string;
  endDate?: string;       // null = active
  reason: string;
  promotionStatus?: "PROMOTED" | "REPEATED" | "GRADUATED";
  class?: Class;
  createdAt: string;
  updatedAt: string;
}
```

### PromotionPreview
```typescript
interface PromotionPreview {
  canPromote: boolean;
  term2Status: string;
  activeAcademicYear: { id: string; name: string } | null;
  students: PromotionPreviewStudent[];
  summary: {
    total: number;
    passing: number;
    repeating: number;
    graduating: number;
  };
}
```

---

## Common Workflows

### 1. Setup New Academic Year

```typescript
// 1. Create academic year
const year = await createAcademicYear({
  name: '2025-2026',
  startDate: '2025-09-01',
  endDate: '2026-06-30'
});

// 2. Activate it
await activateAcademicYear(year.id);

// 3. Create classes for the year
await createClass({
  name: 'Grade 1A',
  academicYearId: year.id,
  gradeId: grade1.id
});
```

---

### 2. Run Promotion

```typescript
// 1. Close Term 2
await closeTerm(term2Id);

// 2. Preview promotion
const preview = await getPromotionPreview();
console.log(`Will promote: ${preview.summary.passing}`);
console.log(`Will repeat: ${preview.summary.repeating}`);

// 3. Execute promotion
const result = await promoteStudents();
console.log(`Promoted: ${result.promoted}`);
```

---

### 3. Query Student History

```typescript
// Get student with complete history
const student = await getStudentById(studentId, {
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

// Active assignment
const active = student.classHistory.find(sc => !sc.endDate);

// Historical records
const history = student.classHistory.filter(sc => sc.endDate);
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 400 | Bad Request | Invalid input or business rule violation |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Validation Error | Validation failed |
| 500 | Server Error | Internal server error |

---

## Authentication

All endpoints require authentication via cookie-based session.

**Roles**:
- `OWNER`: Full access to all endpoints
- `REGISTRAR`: Access to most endpoints (except user management)
- `TEACHER`: Limited access (attendance, marks for assigned classes)

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production.

---

## Versioning

API versioning not implemented. All endpoints are under `/api/`.

