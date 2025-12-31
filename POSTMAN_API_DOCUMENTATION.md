# School Management System - Postman API Documentation

**Base URL:** `http://localhost:4000`

**Note:** Most endpoints require authentication. First login to get a token, then use it in subsequent requests.

---

## 🔐 Authentication Endpoints

### 1. Register User

**POST** `/api/auth/register`

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "email": "newuser@school.com",
  "password": "password123",
  "name": "New User",
  "role": "TEACHER"
}
```

**Roles:** `REGISTRAR`, `OWNER`, `TEACHER`

---

### 2. Login

**POST** `/api/auth/login`

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "email": "owner@school.com",
  "password": "password123"
}
```

**Response:** Sets a cookie with the JWT token. Use this cookie for authenticated requests.

**Test Credentials:**

- Owner: `owner@school.com` / `password123`
- Registrar: `registrar@school.com` / `password123`
- Teacher: `teacher1@school.com` / `password123`

---

### 3. Logout

**POST** `/api/auth/logout`

**Headers:**

```
Cookie: token=<your-token>
```

**Body:** None

---

### 4. Get Current User

**GET** `/api/auth/me`

**Headers:**

```
Cookie: token=<your-token>
```

**Body:** None

---

## 🎓 Student Endpoints

**Note:** All student endpoints require authentication and `REGISTRAR` or `OWNER` role (except where noted).

### 5. Create Student

**POST** `/api/students`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "2018-05-15",
  "gender": "Male",
  "nationality": "US",
  "religion": "Christian",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "parentName": "Jane Doe",
  "parentPhone": "+1234567891",
  "parentEmail": "jane.doe@example.com",
  "parentRelation": "Mother",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "emergencyName": "Bob Doe",
  "emergencyPhone": "+1234567892",
  "emergencyRelation": "Father",
  "medicalConditions": null,
  "allergies": "Peanuts",
  "bloodGroup": "O+",
  "previousSchool": "ABC Elementary",
  "previousClass": "Kindergarten",
  "transferReason": "Family relocation"
}
```

**Minimal Required Fields:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "2018-05-15",
  "gender": "Male",
  "parentName": "Jane Doe",
  "parentPhone": "+1234567891",
  "parentRelation": "Mother",
  "address": "123 Main St",
  "city": "New York",
  "emergencyName": "Bob Doe",
  "emergencyPhone": "+1234567892",
  "emergencyRelation": "Father"
}
```

---

### 6. Get All Students

**GET** `/api/students`

**Query Parameters (optional):**

- `classStatus`: `new` or `assigned`
- `paymentStatus`: `pending` or `confirmed`
- `classId`: UUID of class
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Example:**

```
GET /api/students?classStatus=assigned&page=1&limit=10
```

**Headers:**

```
Cookie: token=<your-token>
```

---

### 7. Get Student by ID

**GET** `/api/students/:id`

**Headers:**

```
Cookie: token=<your-token>
```

**Example:**

```
GET /api/students/<student-uuid>
```

---

### 8. Update Student

**PATCH** `/api/students/:id`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body (all fields optional):**

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Ave"
}
```

---

### 9. Assign Student to Class

**POST** `/api/students/:id/assign-class`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "classId": "<class-uuid>",
  "reason": "initial assignment"
}
```

---

### 10. Transfer Student to Another Class

**POST** `/api/students/:id/transfer`

**Note:** Requires `OWNER` role only.

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "newClassId": "<new-class-uuid>",
  "reason": "Academic performance"
}
```

---

### 11. Delete Student

**DELETE** `/api/students/:id`

**Note:** Requires `OWNER` role only.

**Headers:**

```
Cookie: token=<your-token>
```

---

## 📚 Class Endpoints

### 12. Create Class

**POST** `/api/classes`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "name": "Grade 3A",
  "description": "Third Grade - Section A",
  "academicYear": "2024-2025",
  "headTeacherId": "<teacher-user-uuid>"
}
```

**Minimal:**

```json
{
  "name": "Grade 3A"
}
```

---

### 13. Get All Classes

**GET** `/api/classes`

**Headers:**

```
Cookie: token=<your-token>
```

---

### 14. Get Class by ID

**GET** `/api/classes/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

### 15. Update Class

**PATCH** `/api/classes/:id`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body (all fields optional):**

```json
{
  "name": "Grade 3B",
  "description": "Updated description",
  "headTeacherId": "<new-teacher-uuid>"
}
```

---

### 16. Delete Class

**DELETE** `/api/classes/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

## 📖 Subject Endpoints

### 17. Create Subject for Class

**POST** `/api/classes/:classId/subjects`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "name": "Mathematics",
  "code": "MATH-301",
  "description": "Advanced Mathematics"
}
```

**Minimal:**

```json
{
  "name": "Mathematics"
}
```

---

### 18. Get Subjects by Class

**GET** `/api/classes/:classId/subjects`

**Headers:**

```
Cookie: token=<your-token>
```

---

### 19. Update Subject

**PATCH** `/api/classes/subjects/:subjectId`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body (all fields optional):**

```json
{
  "name": "Advanced Mathematics",
  "code": "MATH-301-A",
  "description": "Updated description"
}
```

---

### 20. Delete Subject

**DELETE** `/api/classes/subjects/:subjectId`

**Headers:**

```
Cookie: token=<your-token>
```

---

## 📅 Attendance Endpoints

**Note:** Most attendance endpoints require `TEACHER` role.

### 21. Mark Attendance (Single Student)

**POST** `/api/attendance`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "studentId": "<student-uuid>",
  "classId": "<class-uuid>",
  "date": "2024-12-31",
  "status": "present",
  "notes": "On time"
}
```

**Status values:** `present`, `absent`, `late`

---

### 22. Mark Bulk Attendance

**POST** `/api/attendance/bulk`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "classId": "<class-uuid>",
  "date": "2024-12-31",
  "attendanceData": [
    {
      "studentId": "<student-1-uuid>",
      "status": "present",
      "notes": "On time"
    },
    {
      "studentId": "<student-2-uuid>",
      "status": "late",
      "notes": "Arrived 10 minutes late"
    },
    {
      "studentId": "<student-3-uuid>",
      "status": "absent",
      "notes": "Sick leave"
    }
  ]
}
```

---

### 23. Get Attendance Records

**GET** `/api/attendance`

**Query Parameters (optional):**

- `studentId`: UUID
- `classId`: UUID
- `date`: Date (YYYY-MM-DD)
- `startDate`: Start date for range
- `endDate`: End date for range

**Example:**

```
GET /api/attendance?classId=<class-uuid>&date=2024-12-31
```

**Headers:**

```
Cookie: token=<your-token>
```

---

### 24. Get Attendance by ID

**GET** `/api/attendance/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

### 25. Get Class Attendance for Date

**GET** `/api/attendance/class/:classId`

**Query Parameters:**

- `date`: Date (YYYY-MM-DD) - **Required**

**Example:**

```
GET /api/attendance/class/<class-uuid>?date=2024-12-31
```

**Headers:**

```
Cookie: token=<your-token>
```

---

### 26. Update Attendance

**PATCH** `/api/attendance/:id`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body (all fields optional):**

```json
{
  "status": "late",
  "notes": "Updated: Arrived 15 minutes late"
}
```

---

### 27. Delete Attendance

**DELETE** `/api/attendance/:id`

**Note:** Requires `REGISTRAR` or `OWNER` role.

**Headers:**

```
Cookie: token=<your-token>
```

---

## 📅 Term Endpoints

**Note:** All term endpoints require authentication. Creating terms requires `REGISTRAR` or `OWNER` role.

### 28. Create Term

**POST** `/api/terms`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "name": "Term 1"
}
```

---

### 29. Get All Terms

**GET** `/api/terms`

**Headers:**

```
Cookie: token=<your-token>
```

---

### 30. Get Term by ID

**GET** `/api/terms/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

## 📝 SubExam Endpoints

**Note:** All sub-exam endpoints require authentication. Creating/updating sub-exams requires `REGISTRAR` or `OWNER` role.

### 31. Create SubExam

**POST** `/api/subexams`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "subjectId": "<subject-uuid>",
  "termId": "<term-uuid>",
  "name": "Quiz 1",
  "maxScore": 10,
  "weightPercent": 10,
  "examType": "quiz"
}
```

**Exam Types:** `quiz`, `assignment`, `mid_exam`, `general_test`

**Note:** Sub-exams (excluding general test) should total 60% weight, and general test should be 40% weight.

---

### 32. Get SubExams by Subject and Term

**GET** `/api/subexams/subject/:subjectId/term/:termId`

**Headers:**

```
Cookie: token=<your-token>
```

**Returns:** List of all sub-exams for the specified subject and term.

---

### 33. Update SubExam

**PATCH** `/api/subexams/:id`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body (all fields optional):**

```json
{
  "name": "Quiz 1 Updated",
  "maxScore": 15,
  "weightPercent": 12,
  "examType": "quiz"
}
```

**Note:** Updating weights will trigger validation to ensure totals remain 60% + 40% = 100%.

---

### 34. Delete SubExam

**DELETE** `/api/subexams/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

## 📊 Marks Endpoints

**Note:** Creating/updating marks requires `TEACHER` role.

### 35. Create Mark

**POST** `/api/marks`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "studentId": "<student-uuid>",
  "classId": "<class-uuid>",
  "subjectId": "<subject-uuid>",
  "termId": "<term-uuid>",
  "subExamId": "<subexam-uuid>",
  "score": 8,
  "notes": "Good performance"
}
```

**Note:** Score must not exceed the sub-exam's maxScore. Grade is calculated automatically.

---

### 36. Record Mark (Simplified)

**POST** `/api/marks/record/student/:studentId/subexam/:subExamId`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "score": 8,
  "notes": "Good performance"
}
```

**Note:** This endpoint automatically determines classId, subjectId, and termId from the sub-exam.

---

### 37. Get All Marks

**GET** `/api/marks`

**Query Parameters (optional):**

- `studentId`: UUID
- `classId`: UUID
- `subjectId`: UUID
- `termId`: UUID
- `subExamId`: UUID
- `page`: Page number
- `limit`: Items per page

**Example:**

```
GET /api/marks?studentId=<student-uuid>&termId=<term-uuid>
```

**Headers:**

```
Cookie: token=<your-token>
```

---

### 38. Get Mark by ID

**GET** `/api/marks/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

### 39. Get Student Marks by Term

**GET** `/api/marks/term/:termId/student/:studentId`

**Example:**

```
GET /api/marks/term/<term-uuid>/student/<student-uuid>
```

**Headers:**

```
Cookie: token=<your-token>
```

**Returns:** Marks grouped by subject with all sub-exam scores.

---

### 40. Get Class Marks by Term

**GET** `/api/marks/class/:classId/term/:termId`

**Example:**

```
GET /api/marks/class/<class-uuid>/term/<term-uuid>
```

**Headers:**

```
Cookie: token=<your-token>
```

---

### 41. Calculate Term Score

**GET** `/api/marks/calculate/term/:termId/student/:studentId/subject/:subjectId`

**Example:**

```
GET /api/marks/calculate/term/<term-uuid>/student/<student-uuid>/subject/<subject-uuid>
```

**Headers:**

```
Cookie: token=<your-token>
```

**Returns:** Calculated term score with breakdown:

- `subExamTotal`: Weighted sum of sub-exams (should be ~60%)
- `generalTestTotal`: Weighted general test score (should be ~40%)
- `termTotal`: Total term score (100%)
- `grade`: Letter grade (A, B, C, D, F)
- `breakdown`: Detailed breakdown per sub-exam

---

### 42. Calculate Year Score

**GET** `/api/marks/calculate/year/student/:studentId/subject/:subjectId`

**Example:**

```
GET /api/marks/calculate/year/student/<student-uuid>/subject/<subject-uuid>
```

**Headers:**

```
Cookie: token=<your-token>
```

**Returns:** Year average from Term 1 and Term 2:

- `term1Total`: Term 1 total score
- `term2Total`: Term 2 total score
- `yearAverage`: Average of both terms
- `grade`: Letter grade based on year average
- `term1Details` and `term2Details`: Breakdown for each term

---

### 43. Get Term Report

**GET** `/api/marks/report/term/:termId/student/:studentId`

**Example:**

```
GET /api/marks/report/term/<term-uuid>/student/<student-uuid>
```

**Headers:**

```
Cookie: token=<your-token>
```

**Returns:** Complete term report with all subjects, calculated scores, and overall average.

---

### 44. Generate Roster

**GET** `/api/marks/roster/class/:classId`

**Query Parameters (optional):**

- `termId`: UUID - If provided, shows term-specific roster. If omitted, shows yearly roster.

**Example:**

```
GET /api/marks/roster/class/<class-uuid>?termId=<term-uuid>
```

**Headers:**

```
Cookie: token=<your-token>
```

**Returns:** Class roster with:

- All students ranked by overall average
- Subject-wise scores (term or year based on query)
- Overall average and grade for each student
- Rankings

---

### 45. Update Mark

**PATCH** `/api/marks/:id`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body (all fields optional):**

```json
{
  "score": 9,
  "grade": "A",
  "notes": "Improved performance"
}
```

**Note:** Score is validated against the sub-exam's maxScore. Grade is recalculated if score changes.

---

### 46. Delete Mark

**DELETE** `/api/marks/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

## 💰 Payment Endpoints

**Note:** All payment endpoints require `REGISTRAR` or `OWNER` role.

### 47. Create Payment

**POST** `/api/payments`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body:**

```json
{
  "studentId": "<student-uuid>",
  "amount": 500.0,
  "month": "2024-12",
  "year": 2024,
  "paymentMethod": "bank_transfer",
  "notes": "Monthly fee for December"
}
```

**Minimal:**

```json
{
  "studentId": "<student-uuid>",
  "amount": 500.0,
  "month": "2024-12",
  "year": 2024
}
```

---

### 48. Get All Payments

**GET** `/api/payments`

**Query Parameters (optional):**

- `studentId`: UUID
- `status`: `pending` or `confirmed`
- `month`: YYYY-MM format
- `year`: Year number

**Example:**

```
GET /api/payments?studentId=<student-uuid>&status=pending
```

**Headers:**

```
Cookie: token=<your-token>
```

---

### 49. Get Payment by ID

**GET** `/api/payments/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

### 50. Confirm Payment

**POST** `/api/payments/:id/confirm`

**Headers:**

```
Content-Type: application/json
Cookie: token=<your-token>
```

**Body (all fields optional):**

```json
{
  "paymentDate": "2024-12-31",
  "paymentMethod": "cash"
}
```

---

### 51. Generate Receipt

**POST** `/api/payments/:paymentId/receipt`

**Headers:**

```
Cookie: token=<your-token>
```

**Body:** None

**Note:** Payment must be confirmed first.

---

### 52. Get Receipt by ID

**GET** `/api/payments/receipts/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

### 53. Get Receipt by Number

**GET** `/api/payments/receipts/number/:receiptNumber`

**Example:**

```
GET /api/payments/receipts/number/REC-202412-ABC12345
```

**Headers:**

```
Cookie: token=<your-token>
```

---

### 54. Delete Payment

**DELETE** `/api/payments/:id`

**Headers:**

```
Cookie: token=<your-token>
```

---

## 📈 Report Endpoints

**Note:** All report endpoints require `REGISTRAR` or `OWNER` role.

### 55. Get Student Report

**GET** `/api/reports/student/:studentId`

**Headers:**

```
Cookie: token=<your-token>
```

**Returns:** Complete student information including attendance, marks, and payments.

---

### 56. Get Student Payment History

**GET** `/api/reports/student/:studentId/payments`

**Headers:**

```
Cookie: token=<your-token>
```

---

### 57. Get Class Report

**GET** `/api/reports/class/:classId`

**Headers:**

```
Cookie: token=<your-token>
```

**Returns:** Class information with all students, attendance summary, and marks.

---

## 🏥 Health Check

### 58. Health Check

**GET** `/health`

**Headers:** None

**Body:** None

**Response:**

```json
{
  "status": "ok",
  "database": "connected"
}
```

---

## 📝 Important Notes

1. **Authentication:** Most endpoints require authentication via cookie. Login first to get the token cookie.

2. **Roles:**

   - `OWNER`: Full access to all endpoints
   - `REGISTRAR`: Can manage students, classes, payments, and reports
   - `TEACHER`: Can manage attendance and marks

3. **Date Formats:**

   - Use `YYYY-MM-DD` for dates
   - Use `YYYY-MM` for months in payments

4. **UUIDs:** Replace `<student-uuid>`, `<class-uuid>`, `<term-uuid>`, `<subexam-uuid>`, etc. with actual UUIDs from your database.

5. **Mark Management Flow:**

   1. Create terms (Term 1, Term 2)
   2. Create sub-exams for each subject and term (60% sub-exams + 40% general test)
   3. Record marks for each sub-exam
   4. Calculate term scores (weighted: 60% + 40%)
   5. Calculate year averages (Term 1 + Term 2 / 2)
   6. Generate rosters with rankings

6. **Testing Flow:**
   1. Login as owner/registrar/teacher
   2. Create terms
   3. Create classes
   4. Create students
   5. Create subjects for classes
   6. Create sub-exams for subjects and terms
   7. Assign students to classes
   8. Mark attendance
   9. Record marks for sub-exams
   10. Calculate term and year scores
   11. Generate rosters
   12. Create payments
   13. Generate reports

---

## 🔄 Example Testing Workflow

1. **Login:**

   ```
   POST /api/auth/login
   Body: { "email": "owner@school.com", "password": "password123" }
   ```

2. **Get Classes:**

   ```
   GET /api/classes
   (Copy a class ID)
   ```

3. **Get Students:**

   ```
   GET /api/students
   (Copy a student ID)
   ```

4. **Mark Attendance:**

   ```
   POST /api/attendance
   Body: { "studentId": "...", "classId": "...", "date": "2024-12-31", "status": "present" }
   ```

5. **Get SubExams for Subject and Term:**

   ```
   GET /api/subexams/subject/<subject-uuid>/term/<term-uuid>
   (Copy sub-exam IDs)
   ```

6. **Record Mark:**

   ```
   POST /api/marks/record/student/<student-uuid>/subexam/<subexam-uuid>
   Body: { "score": 8 }
   ```

7. **Calculate Term Score:**

   ```
   GET /api/marks/calculate/term/<term-uuid>/student/<student-uuid>/subject/<subject-uuid>
   ```

8. **Calculate Year Score:**

   ```
   GET /api/marks/calculate/year/student/<student-uuid>/subject/<subject-uuid>
   ```

9. **Generate Roster:**

   ```
   GET /api/marks/roster/class/<class-uuid>
   ```

10. **Create Payment:**
    ```
    POST /api/payments
    Body: { "studentId": "...", "amount": 500, "month": "2024-12", "year": 2024 }
    ```

---

**Happy Testing! 🚀**
