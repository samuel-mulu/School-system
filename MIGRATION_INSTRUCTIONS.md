# Database Migration Instructions for Term Integration

## Important: Run Migration Before Using New Term Features

The backend code has been updated, but you **must run the database migration** before creating terms with the new fields.

## Steps to Run Migration

1. **Navigate to the backend directory:**
   ```bash
   cd "S:\projects master\School-system"
   ```

2. **Generate Prisma Client (if needed):**
   ```bash
   npx prisma generate
   ```

3. **Create and apply the migration:**
   ```bash
   npx prisma migrate dev --name add_term_academic_year_dates
   ```

   This will:
   - Create a new migration file
   - Add `academicYearId`, `startDate`, and `endDate` columns to the `Term` table
   - Remove the old unique constraint on `name`
   - Add the new composite unique constraint on `[name, academicYearId]`
   - Add the relation to `AcademicYear`

4. **If you have existing terms in the database:**
   - You'll need to either:
     - Delete them (if they're test data)
     - Or manually assign them to an academic year using a SQL script

## After Migration

Once the migration is complete:
- The error "Unknown argument `name_academicYearId`" will be resolved
- You can create terms with academic year, start date, and end date
- Terms will be properly linked to academic years

## Troubleshooting

If you get errors during migration:
1. Make sure your database is running
2. Check that you have the correct database connection string in `.env`
3. If you have existing terms, you may need to delete them first or update them manually

## Note

The code has been updated to use `findFirst` instead of `findUnique` with the composite constraint, so it should work even before the migration. However, the database schema must be updated for the new fields to be stored.

