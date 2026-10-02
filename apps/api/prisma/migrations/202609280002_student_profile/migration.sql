ALTER TABLE "Student" ADD COLUMN "gender" TEXT, ADD COLUMN "address" TEXT;
ALTER TABLE "Student" ADD CONSTRAINT "Student_gender_check" CHECK ("gender" IS NULL OR "gender" IN ('M', 'F'));
