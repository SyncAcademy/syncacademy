CREATE TABLE "FeeStructure" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "yearId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeStructure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentCharge" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "feeId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "yearId" UUID NOT NULL,
    "classroomId" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCharge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "yearId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "date" DATE NOT NULL,
    "receipt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidReason" TEXT,
    "voidAt" TIMESTAMP(3),
    "voidBy" UUID,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Adjustment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "yearId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "term" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adjustment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeeStructure_schoolId_yearId_classroomId_term_name_key"
    ON "FeeStructure"("schoolId", "yearId", "classroomId", "term", "name");
CREATE INDEX "FeeStructure_schoolId_yearId_idx" ON "FeeStructure"("schoolId", "yearId");
CREATE UNIQUE INDEX "StudentCharge_schoolId_feeId_studentId_key"
    ON "StudentCharge"("schoolId", "feeId", "studentId");
CREATE INDEX "StudentCharge_schoolId_yearId_studentId_term_idx"
    ON "StudentCharge"("schoolId", "yearId", "studentId", "term");
CREATE UNIQUE INDEX "Payment_schoolId_receipt_key" ON "Payment"("schoolId", "receipt");
CREATE INDEX "Payment_schoolId_yearId_studentId_term_idx"
    ON "Payment"("schoolId", "yearId", "studentId", "term");
CREATE INDEX "Payment_schoolId_reference_idx" ON "Payment"("schoolId", "reference");
CREATE INDEX "Adjustment_schoolId_yearId_studentId_term_idx"
    ON "Adjustment"("schoolId", "yearId", "studentId", "term");

ALTER TABLE "FeeStructure"
    ADD CONSTRAINT "FeeStructure_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeeStructure"
    ADD CONSTRAINT "FeeStructure_yearId_schoolId_fkey"
    FOREIGN KEY ("yearId", "schoolId") REFERENCES "AcademicYear"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeeStructure"
    ADD CONSTRAINT "FeeStructure_classroomId_schoolId_fkey"
    FOREIGN KEY ("classroomId", "schoolId") REFERENCES "Classroom"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentCharge"
    ADD CONSTRAINT "StudentCharge_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentCharge"
    ADD CONSTRAINT "StudentCharge_feeId_fkey"
    FOREIGN KEY ("feeId") REFERENCES "FeeStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentCharge"
    ADD CONSTRAINT "StudentCharge_studentId_schoolId_fkey"
    FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_studentId_schoolId_fkey"
    FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Adjustment"
    ADD CONSTRAINT "Adjustment_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Adjustment"
    ADD CONSTRAINT "Adjustment_studentId_schoolId_fkey"
    FOREIGN KEY ("studentId", "schoolId") REFERENCES "Student"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;
