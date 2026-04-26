CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'STUDENT';

CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subject_code_key" ON "Subject"("code");
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

ALTER TABLE "LearningPath"
ADD COLUMN "subjectId" TEXT;

CREATE INDEX "LearningPath_subjectId_idx" ON "LearningPath"("subjectId");

ALTER TABLE "LearningPath"
ADD CONSTRAINT "LearningPath_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
