// Auto-generated from netlify/database/migrations/0001_init/migration.sql.
// Embedded as a source string (not read from disk) because Netlify DB's
// build-time migration mechanism only fires on webhook-triggered deploys,
// not on manually triggered ones, and the migrations directory may not be
// bundled into the deployed function. See src/app/api/admin/migrate/route.ts.
export const SCHEMA_SQL = `-- CreateEnum
CREATE TYPE "Role" AS ENUM ('COMPANY_ADMIN', 'EMPLOYEE', 'SPECIALIST', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('ORGANIZATION', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ImpactLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ComplexityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('IDENTIFIED', 'PLANNED', 'IN_PROGRESS', 'IMPLEMENTED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "WorkflowAdoptionStatus" AS ENUM ('NOT_ADOPTED', 'LEARNING', 'IN_PROGRESS', 'ADOPTED');

-- CreateEnum
CREATE TYPE "InitiativeStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('DISCOVERY', 'WORKFLOW_DESIGN', 'IMPLEMENTATION', 'TRAINING', 'LAUNCH', 'MEASUREMENT', 'OPTIMIZATION');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('OPEN', 'PROPOSED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- CreateEnum
CREATE TYPE "SpecialistTagType" AS ENUM ('INDUSTRY', 'FUNCTION', 'TOOL', 'CERTIFICATION');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('HOURLY', 'PROJECT');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'RELEASED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "revenueRange" TEXT NOT NULL,
    "geography" TEXT NOT NULL,
    "businessModel" TEXT NOT NULL,
    "goals" TEXT[],
    "logoUrl" TEXT,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT,
    "jobTitle" TEXT NOT NULL,
    "isDepartmentAdmin" BOOLEAN NOT NULL DEFAULT false,
    "aiFluencyScore" INTEGER,
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialist" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "photoUrl" TEXT,
    "yearsExperience" INTEGER NOT NULL,
    "hourlyRate" INTEGER,
    "projectRateMin" INTEGER,
    "projectRateMax" INTEGER,
    "availability" TEXT NOT NULL,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "completedProjects" INTEGER NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Specialist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialistTag" (
    "id" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "type" "SpecialistTagType" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "SpecialistTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialistService" (
    "id" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceType" "PriceType" NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "SpecialistService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "organizationId" TEXT,
    "employeeId" TEXT,
    "overallScore" INTEGER,
    "scoreBreakdown" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSkill" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT,
    "roleLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "learningPathId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "workflowId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "exercise" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "durationMin" INTEGER NOT NULL DEFAULT 8,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCompletion" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Simulation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" "ComplexityLevel" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "Simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationAttempt" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "industryTags" TEXT[],
    "summary" TEXT NOT NULL,
    "currentProcess" TEXT NOT NULL,
    "aiProcess" TEXT NOT NULL,
    "timeSavedMinutes" INTEGER NOT NULL,
    "difficulty" "ComplexityLevel" NOT NULL DEFAULT 'MEDIUM',
    "skillLevel" TEXT NOT NULL DEFAULT 'Intermediate',
    "toolsRequired" TEXT[],
    "skillsRequired" TEXT[],
    "securityNotes" TEXT,
    "trainingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "aiPrompt" TEXT,
    "humanCheckpoint" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationWorkflow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "WorkflowAdoptionStatus" NOT NULL DEFAULT 'NOT_ADOPTED',
    "adoptedAt" TIMESTAMP(3),
    "usersAdopted" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OrganizationWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "departmentId" TEXT,
    "workflowId" TEXT,
    "title" TEXT NOT NULL,
    "currentProcess" TEXT NOT NULL,
    "aiOpportunity" TEXT NOT NULL,
    "impact" "ImpactLevel" NOT NULL,
    "complexity" "ComplexityLevel" NOT NULL,
    "estHoursSavedMonthly" INTEGER NOT NULL,
    "estAnnualValue" INTEGER NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'IDENTIFIED',
    "recommendedSpecialist" BOOLEAN NOT NULL DEFAULT false,
    "businessImpactScore" INTEGER NOT NULL,
    "adoptionPotentialScore" INTEGER NOT NULL,
    "frequencyScore" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "toolsRequired" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goalDescription" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "departments" TEXT[],
    "status" "InitiativeStatus" NOT NULL DEFAULT 'PLANNED',
    "kpis" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeMember" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "roleOnInitiative" TEXT NOT NULL DEFAULT 'Contributor',

    CONSTRAINT "InitiativeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InitiativeWorkflow" (
    "id" TEXT NOT NULL,
    "initiativeId" TEXT NOT NULL,
    "opportunityId" TEXT,

    CONSTRAINT "InitiativeWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "specialistId" TEXT,
    "workflowId" TEXT,
    "opportunityId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stage" "ProjectStage" NOT NULL DEFAULT 'DISCOVERY',
    "status" "ProjectStatus" NOT NULL DEFAULT 'OPEN',
    "budget" INTEGER,
    "startDate" TIMESTAMP(3),
    "targetEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "assignee" TEXT,
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "stage" "ProjectStage" NOT NULL,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDeliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "specialistId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoKey" TEXT NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "lastSyncAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "mockData" JSONB,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT,
    "tool" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdoptionMetricSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "department" TEXT,
    "month" TIMESTAMP(3) NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "adoptionPct" INTEGER NOT NULL,
    "hoursSavedMonthly" INTEGER NOT NULL,
    "aiAdoptionScore" INTEGER NOT NULL,
    "literacyScore" INTEGER NOT NULL,
    "usageScore" INTEGER NOT NULL,
    "workflowIntegrationScore" INTEGER NOT NULL,
    "governanceScore" INTEGER NOT NULL,
    "measurementScore" INTEGER NOT NULL,
    "leadershipScore" INTEGER NOT NULL,

    CONSTRAINT "AdoptionMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ROIMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowLabel" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "investment" INTEGER NOT NULL,
    "annualValue" INTEGER NOT NULL,

    CONSTRAINT "ROIMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'STARTER',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "seats" INTEGER NOT NULL DEFAULT 25,
    "pricePerMonth" INTEGER NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceTransaction" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_industry_idx" ON "Organization"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "Department_organizationId_name_key" ON "Department"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Specialist_userId_key" ON "Specialist"("userId");

-- CreateIndex
CREATE INDEX "Specialist_approved_idx" ON "Specialist"("approved");

-- CreateIndex
CREATE INDEX "SpecialistTag_specialistId_idx" ON "SpecialistTag"("specialistId");

-- CreateIndex
CREATE INDEX "SpecialistTag_type_value_idx" ON "SpecialistTag"("type", "value");

-- CreateIndex
CREATE INDEX "SpecialistService_specialistId_idx" ON "SpecialistService"("specialistId");

-- CreateIndex
CREATE INDEX "Assessment_organizationId_idx" ON "Assessment"("organizationId");

-- CreateIndex
CREATE INDEX "Assessment_employeeId_idx" ON "Assessment"("employeeId");

-- CreateIndex
CREATE INDEX "AssessmentResponse_assessmentId_idx" ON "AssessmentResponse"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSkill_employeeId_skillId_key" ON "EmployeeSkill"("employeeId", "skillId");

-- CreateIndex
CREATE INDEX "LearningPath_organizationId_idx" ON "LearningPath"("organizationId");

-- CreateIndex
CREATE INDEX "Course_learningPathId_idx" ON "Course"("learningPathId");

-- CreateIndex
CREATE INDEX "Lesson_courseId_idx" ON "Lesson"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletion_employeeId_lessonId_key" ON "LessonCompletion"("employeeId", "lessonId");

-- CreateIndex
CREATE INDEX "SimulationAttempt_employeeId_idx" ON "SimulationAttempt"("employeeId");

-- CreateIndex
CREATE INDEX "Workflow_department_idx" ON "Workflow"("department");

-- CreateIndex
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationWorkflow_organizationId_workflowId_key" ON "OrganizationWorkflow"("organizationId", "workflowId");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");

-- CreateIndex
CREATE INDEX "Opportunity_departmentId_idx" ON "Opportunity"("departmentId");

-- CreateIndex
CREATE INDEX "Initiative_organizationId_idx" ON "Initiative"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "InitiativeMember_initiativeId_employeeId_key" ON "InitiativeMember"("initiativeId", "employeeId");

-- CreateIndex
CREATE INDEX "InitiativeWorkflow_initiativeId_idx" ON "InitiativeWorkflow"("initiativeId");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Project_specialistId_idx" ON "Project"("specialistId");

-- CreateIndex
CREATE INDEX "ProjectTask_projectId_idx" ON "ProjectTask"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_projectId_idx" ON "ProjectDeliverable"("projectId");

-- CreateIndex
CREATE INDEX "Message_projectId_idx" ON "Message"("projectId");

-- CreateIndex
CREATE INDEX "Review_specialistId_idx" ON "Review"("specialistId");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_key_key" ON "Integration"("key");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_organizationId_integrationId_key" ON "IntegrationConnection"("organizationId", "integrationId");

-- CreateIndex
CREATE INDEX "AIUsageEvent_organizationId_idx" ON "AIUsageEvent"("organizationId");

-- CreateIndex
CREATE INDEX "AdoptionMetricSnapshot_organizationId_idx" ON "AdoptionMetricSnapshot"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AdoptionMetricSnapshot_organizationId_department_month_key" ON "AdoptionMetricSnapshot"("organizationId", "department", "month");

-- CreateIndex
CREATE INDEX "ROIMetric_organizationId_idx" ON "ROIMetric"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_idx" ON "Invoice"("organizationId");

-- CreateIndex
CREATE INDEX "MarketplaceTransaction_projectId_idx" ON "MarketplaceTransaction"("projectId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specialist" ADD CONSTRAINT "Specialist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistTag" ADD CONSTRAINT "SpecialistTag_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialistService" ADD CONSTRAINT "SpecialistService_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSkill" ADD CONSTRAINT "EmployeeSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPath" ADD CONSTRAINT "LearningPath_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_learningPathId_fkey" FOREIGN KEY ("learningPathId") REFERENCES "LearningPath"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAttempt" ADD CONSTRAINT "SimulationAttempt_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationWorkflow" ADD CONSTRAINT "OrganizationWorkflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationWorkflow" ADD CONSTRAINT "OrganizationWorkflow_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeMember" ADD CONSTRAINT "InitiativeMember_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeMember" ADD CONSTRAINT "InitiativeMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeWorkflow" ADD CONSTRAINT "InitiativeWorkflow_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InitiativeWorkflow" ADD CONSTRAINT "InitiativeWorkflow_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_specialistId_fkey" FOREIGN KEY ("specialistId") REFERENCES "Specialist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageEvent" ADD CONSTRAINT "AIUsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageEvent" ADD CONSTRAINT "AIUsageEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdoptionMetricSnapshot" ADD CONSTRAINT "AdoptionMetricSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ROIMetric" ADD CONSTRAINT "ROIMetric_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceTransaction" ADD CONSTRAINT "MarketplaceTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Patch: Stripe billing fields (idempotent - safe to re-run against an
-- already-migrated database; only the statements below will succeed on a
-- re-run, everything above will fail harmlessly as "already exists").
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;

DO $$ BEGIN ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_stripeSubscriptionId_key" UNIQUE ("stripeSubscriptionId"); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "stripeInvoiceId" TEXT;

DO $$ BEGIN ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_stripeInvoiceId_key" UNIQUE ("stripeInvoiceId"); EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: real OAuth integration fields (idempotent, same rules as above).
ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "accessToken" TEXT;

ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "externalAccountId" TEXT;

ALTER TABLE "IntegrationConnection" ADD COLUMN IF NOT EXISTS "externalAccountName" TEXT;

-- Patch: per-step workflow completion tracking (idempotent, same rules).
CREATE TABLE IF NOT EXISTS "WorkflowStepCompletion" ("id" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "workflowStepId" TEXT NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WorkflowStepCompletion_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowStepCompletion_employeeId_workflowStepId_key" ON "WorkflowStepCompletion"("employeeId", "workflowStepId");

CREATE INDEX IF NOT EXISTS "WorkflowStepCompletion_workflowStepId_idx" ON "WorkflowStepCompletion"("workflowStepId");

DO $$ BEGIN ALTER TABLE "WorkflowStepCompletion" ADD CONSTRAINT "WorkflowStepCompletion_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "WorkflowStepCompletion" ADD CONSTRAINT "WorkflowStepCompletion_workflowStepId_fkey" FOREIGN KEY ("workflowStepId") REFERENCES "WorkflowStep"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: structured detail on audit log entries (idempotent, same rules).
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Patch: extra stakeholders to keep in the loop on an expert-help request (idempotent, same rules).
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "ccEmails" TEXT[] NOT NULL DEFAULT '{}';

-- Patch: fuller workflow deployment lifecycle + an owning employee (idempotent, same rules).
ALTER TYPE "WorkflowAdoptionStatus" ADD VALUE IF NOT EXISTS 'PILOT';

ALTER TYPE "WorkflowAdoptionStatus" ADD VALUE IF NOT EXISTS 'OPTIMIZING';

ALTER TYPE "WorkflowAdoptionStatus" ADD VALUE IF NOT EXISTS 'COMPLETE';

ALTER TABLE "OrganizationWorkflow" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

CREATE INDEX IF NOT EXISTS "OrganizationWorkflow_ownerId_idx" ON "OrganizationWorkflow"("ownerId");

DO $$ BEGIN ALTER TABLE "OrganizationWorkflow" ADD CONSTRAINT "OrganizationWorkflow_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: Tool Library (idempotent, same rules).
DO $$ BEGIN CREATE TYPE "ToolCategory" AS ENUM ('AI_ASSISTANT', 'CRM', 'ERP', 'PRODUCTIVITY', 'DESIGN', 'DEVELOPMENT', 'COMMUNICATION', 'ANALYTICS', 'CUSTOMER_SERVICE', 'FINANCE', 'HR', 'INTERNAL_PLATFORM', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ToolApprovalStatus" AS ENUM ('APPROVED', 'RECOMMENDED', 'UNDER_REVIEW', 'RESTRICTED', 'DEPRECATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Tool" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "category" "ToolCategory" NOT NULL, "vendor" TEXT, "description" TEXT NOT NULL, "capabilities" TEXT[], "isCustom" BOOLEAN NOT NULL DEFAULT false, "organizationId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Tool_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "Tool_name_key" ON "Tool"("name");

CREATE INDEX IF NOT EXISTS "Tool_organizationId_idx" ON "Tool"("organizationId");

DO $$ BEGIN ALTER TABLE "Tool" ADD CONSTRAINT "Tool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OrganizationTool" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "toolId" TEXT NOT NULL, "status" "ToolApprovalStatus" NOT NULL DEFAULT 'UNDER_REVIEW', "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "OrganizationTool_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationTool_organizationId_toolId_key" ON "OrganizationTool"("organizationId", "toolId");

DO $$ BEGIN ALTER TABLE "OrganizationTool" ADD CONSTRAINT "OrganizationTool_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "OrganizationTool" ADD CONSTRAINT "OrganizationTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: tool playbooks - guidance + approved/restricted uses per org tool (idempotent, same rules).
ALTER TABLE "OrganizationTool" ADD COLUMN IF NOT EXISTS "guidance" TEXT;

ALTER TABLE "OrganizationTool" ADD COLUMN IF NOT EXISTS "approvedUses" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "OrganizationTool" ADD COLUMN IF NOT EXISTS "restrictedUses" TEXT[] NOT NULL DEFAULT '{}';

-- Patch: unique simulation titles so the catalog can be topped up idempotently (idempotent, same rules).
CREATE UNIQUE INDEX IF NOT EXISTS "Simulation_title_key" ON "Simulation"("title");

-- Patch: deepened Learn/Simulation pedagogy + certifications + reward system (idempotent, same rules).
DO $$ BEGIN CREATE TYPE "LessonType" AS ENUM ('CONCEPT', 'DEMONSTRATION', 'INTERACTIVE_EXERCISE', 'TOOL_PRACTICE', 'PROMPT_EXERCISE', 'DECISION_EXERCISE', 'KNOWLEDGE_CHECK', 'REFLECTION', 'WORKFLOW_PRACTICE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "RewardCategory" AS ENUM ('GIFT_CARD', 'LEARNING_CREDIT', 'MERCHANDISE', 'PTO', 'DONATION', 'EXPERIENCE', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'FULFILLED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "RecognitionType" AS ENUM ('PEER', 'MANAGER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "RecognitionCategory" AS ENUM ('AI_ADOPTION', 'WORKFLOW_INNOVATION', 'LEARNING', 'BUSINESS_IMPACT', 'COLLABORATION', 'AI_LEADERSHIP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "role" TEXT;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "skills" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "tools" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "type" "LessonType" NOT NULL DEFAULT 'CONCEPT';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "objective" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "whyItMatters" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "tryItPrompt" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "evaluatePrompt" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "knowledgeCheckQuestion" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "knowledgeCheckOptions" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "knowledgeCheckCorrectIndex" INTEGER NOT NULL DEFAULT -1;

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "takeaway" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "skills" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "objective" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "availableTools" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "companyPolicy" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "workflowNote" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "constraints" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "successCriteria" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "timeLimitMinutes" INTEGER;

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "decisionPrompt" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "decisionOptions" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "aiOutputSample" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "aiOutputIssues" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "expertApproach" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Simulation" ADD COLUMN IF NOT EXISTS "skills" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "SimulationAttempt" ADD COLUMN IF NOT EXISTS "dimensions" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "SimulationAttempt" ADD COLUMN IF NOT EXISTS "decisionChoiceId" TEXT;

ALTER TABLE "SimulationAttempt" ADD COLUMN IF NOT EXISTS "evaluationChoices" TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE "SimulationAttempt" ADD COLUMN IF NOT EXISTS "passed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "Certification" ("id" TEXT NOT NULL, "key" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL, "minFluency" INTEGER, "requiredSkills" JSONB NOT NULL DEFAULT '[]', "minCoursesCompleted" INTEGER NOT NULL DEFAULT 0, "minSimulationsPassed" INTEGER NOT NULL DEFAULT 0, "pointsAwarded" INTEGER NOT NULL DEFAULT 0, "order" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Certification_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "Certification_key_key" ON "Certification"("key");

CREATE TABLE IF NOT EXISTS "EmployeeCertification" ("id" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "certificationId" TEXT NOT NULL, "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "EmployeeCertification_pkey" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "EmployeeCertification_employeeId_idx" ON "EmployeeCertification"("employeeId");

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeCertification_employeeId_certificationId_key" ON "EmployeeCertification"("employeeId", "certificationId");

DO $$ BEGIN ALTER TABLE "EmployeeCertification" ADD CONSTRAINT "EmployeeCertification_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "EmployeeCertification" ADD CONSTRAINT "EmployeeCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PointsRule" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "key" TEXT NOT NULL, "label" TEXT NOT NULL, "points" INTEGER NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT true, "monthlyCap" INTEGER, CONSTRAINT "PointsRule_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "PointsRule_organizationId_key_key" ON "PointsRule"("organizationId", "key");

DO $$ BEGIN ALTER TABLE "PointsRule" ADD CONSTRAINT "PointsRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PointsTransaction" ("id" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "amount" INTEGER NOT NULL, "reason" TEXT NOT NULL, "ruleKey" TEXT, "entityType" TEXT, "entityId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PointsTransaction_pkey" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "PointsTransaction_employeeId_idx" ON "PointsTransaction"("employeeId");

CREATE INDEX IF NOT EXISTS "PointsTransaction_organizationId_idx" ON "PointsTransaction"("organizationId");

DO $$ BEGIN ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "PointsTransaction" ADD CONSTRAINT "PointsTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "RewardItem" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT NOT NULL, "category" "RewardCategory" NOT NULL, "pointCost" INTEGER NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RewardItem_pkey" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "RewardItem_organizationId_idx" ON "RewardItem"("organizationId");

DO $$ BEGIN ALTER TABLE "RewardItem" ADD CONSTRAINT "RewardItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "RewardRedemption" ("id" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "rewardItemId" TEXT NOT NULL, "pointCost" INTEGER NOT NULL, "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING', "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" TIMESTAMP(3), CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "RewardRedemption_employeeId_idx" ON "RewardRedemption"("employeeId");

DO $$ BEGIN ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardItemId_fkey" FOREIGN KEY ("rewardItemId") REFERENCES "RewardItem"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Recognition" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "fromUserId" TEXT NOT NULL, "toEmployeeId" TEXT NOT NULL, "type" "RecognitionType" NOT NULL, "category" "RecognitionCategory" NOT NULL, "message" TEXT NOT NULL, "pointsAwarded" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Recognition_pkey" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "Recognition_toEmployeeId_idx" ON "Recognition"("toEmployeeId");

CREATE INDEX IF NOT EXISTS "Recognition_organizationId_idx" ON "Recognition"("organizationId");

DO $$ BEGIN ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "Recognition" ADD CONSTRAINT "Recognition_toEmployeeId_fkey" FOREIGN KEY ("toEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: unique course titles so the catalog can be topped up idempotently (idempotent, same rules).
CREATE UNIQUE INDEX IF NOT EXISTS "Course_title_key" ON "Course"("title");

-- Patch: sales-led demo requests (idempotent, same rules).
DO $$ BEGIN CREATE TYPE "DemoRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'DECLINED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "DemoRequest" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "companyName" TEXT NOT NULL, "companySize" TEXT, "message" TEXT, "status" "DemoRequestStatus" NOT NULL DEFAULT 'NEW', "organizationId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "DemoRequest_status_idx" ON "DemoRequest"("status");

DO $$ BEGIN ALTER TABLE "DemoRequest" ADD CONSTRAINT "DemoRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: team-authored custom lessons + first-login product tour (idempotent, same rules).
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "createdByName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasSeenTour" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Course_organizationId_idx" ON "Course"("organizationId");

DO $$ BEGIN ALTER TABLE "Course" ADD CONSTRAINT "Course_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: optional lesson images (idempotent, same rules).
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Patch: optional lesson video links (idempotent, same rules).
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- Patch: login lockout after repeated failed attempts (idempotent, same rules).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

-- Patch: team-authored custom workflows (idempotent, same rules as team-authored lessons).
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "createdByName" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "Workflow_organizationId_idx" ON "Workflow"("organizationId");

DO $$ BEGIN ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: optional workflow step images and video links (idempotent, same rules).
ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

ALTER TABLE "WorkflowStep" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- Patch: department pain points captured during onboarding (idempotent, same rules).
ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "painPoints" TEXT[] NOT NULL DEFAULT '{}';

-- Patch: project team members, so a company admin can loop internal colleagues into an expert-help engagement alongside the assigned specialist (idempotent, same rules).
CREATE TABLE IF NOT EXISTS "ProjectMember" ("id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "roleOnProject" TEXT NOT NULL DEFAULT 'Contributor', "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMember_projectId_employeeId_key" ON "ProjectMember"("projectId", "employeeId");

CREATE INDEX IF NOT EXISTS "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

CREATE INDEX IF NOT EXISTS "ProjectMember_employeeId_idx" ON "ProjectMember"("employeeId");

DO $$ BEGIN ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: deeper specialist intake fields - link/portfolio, notable past work, and preferred engagement types (idempotent, same rules).
ALTER TABLE "Specialist" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;

ALTER TABLE "Specialist" ADD COLUMN IF NOT EXISTS "portfolioUrl" TEXT;

ALTER TABLE "Specialist" ADD COLUMN IF NOT EXISTS "notableProjects" TEXT;

ALTER TABLE "Specialist" ADD COLUMN IF NOT EXISTS "preferredEngagementTypes" TEXT[] NOT NULL DEFAULT '{}';

-- Patch: fixed-window rate limiting for unauthenticated endpoints (idempotent, same rules).
CREATE TABLE IF NOT EXISTS "RateLimitHit" ("id" TEXT NOT NULL, "key" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");

-- Patch: per-org department isolation toggle for workflow/learning visibility (idempotent, same rules).
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "departmentIsolationEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Patch: standalone admin/lead-authored prompt templates (idempotent, same rules).
CREATE TABLE IF NOT EXISTS "Template" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "department" TEXT NOT NULL, "title" TEXT NOT NULL, "prompt" TEXT NOT NULL, "createdByName" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Template_pkey" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "Template_organizationId_idx" ON "Template"("organizationId");

DO $$ BEGIN ALTER TABLE "Template" ADD CONSTRAINT "Template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: workflow assignee (distinct from owner) and real implementation-checklist completion tracking (idempotent, same rules).
ALTER TABLE "OrganizationWorkflow" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT;

CREATE INDEX IF NOT EXISTS "OrganizationWorkflow_assigneeId_idx" ON "OrganizationWorkflow"("assigneeId");

DO $$ BEGIN ALTER TABLE "OrganizationWorkflow" ADD CONSTRAINT "OrganizationWorkflow_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "WorkflowChecklistCompletion" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "workflowId" TEXT NOT NULL, "itemIndex" INTEGER NOT NULL, "completedByName" TEXT NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WorkflowChecklistCompletion_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowChecklistCompletion_organizationId_workflowId_item_key" ON "WorkflowChecklistCompletion"("organizationId", "workflowId", "itemIndex");

CREATE INDEX IF NOT EXISTS "WorkflowChecklistCompletion_organizationId_workflowId_idx" ON "WorkflowChecklistCompletion"("organizationId", "workflowId");

DO $$ BEGIN ALTER TABLE "WorkflowChecklistCompletion" ADD CONSTRAINT "WorkflowChecklistCompletion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "WorkflowChecklistCompletion" ADD CONSTRAINT "WorkflowChecklistCompletion_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: per-employee cross-department content visibility override (idempotent, same rules).
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "viewAllDepartments" BOOLEAN NOT NULL DEFAULT false;

-- Patch: tool-in-context tagging for standalone templates (idempotent, same rules).
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "tools" TEXT[] NOT NULL DEFAULT '{}';

-- Patch: org-defined related-workflow links and prerequisite (dependency) workflows (idempotent, same rules).
CREATE TABLE IF NOT EXISTS "WorkflowLink" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "workflowId" TEXT NOT NULL, "linkedWorkflowId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WorkflowLink_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowLink_organizationId_workflowId_linkedWorkflowId_key" ON "WorkflowLink"("organizationId", "workflowId", "linkedWorkflowId");

CREATE INDEX IF NOT EXISTS "WorkflowLink_organizationId_workflowId_idx" ON "WorkflowLink"("organizationId", "workflowId");

DO $$ BEGIN ALTER TABLE "WorkflowLink" ADD CONSTRAINT "WorkflowLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "WorkflowLink" ADD CONSTRAINT "WorkflowLink_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "WorkflowLink" ADD CONSTRAINT "WorkflowLink_linkedWorkflowId_fkey" FOREIGN KEY ("linkedWorkflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "WorkflowDependency" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "workflowId" TEXT NOT NULL, "dependsOnWorkflowId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "WorkflowDependency_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowDependency_organizationId_workflowId_dependsOnWork_key" ON "WorkflowDependency"("organizationId", "workflowId", "dependsOnWorkflowId");

CREATE INDEX IF NOT EXISTS "WorkflowDependency_organizationId_workflowId_idx" ON "WorkflowDependency"("organizationId", "workflowId");

CREATE INDEX IF NOT EXISTS "WorkflowDependency_organizationId_dependsOnWorkflowId_idx" ON "WorkflowDependency"("organizationId", "dependsOnWorkflowId");

DO $$ BEGIN ALTER TABLE "WorkflowDependency" ADD CONSTRAINT "WorkflowDependency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "WorkflowDependency" ADD CONSTRAINT "WorkflowDependency_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "WorkflowDependency" ADD CONSTRAINT "WorkflowDependency_dependsOnWorkflowId_fkey" FOREIGN KEY ("dependsOnWorkflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: org-configurable blended hourly rate, and real employee-reported time-saved logs (idempotent, same rules).
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "blendedHourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 45;

CREATE TABLE IF NOT EXISTS "WorkflowTimeSavedLog" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "workflowId" TEXT NOT NULL, "employeeId" TEXT NOT NULL, "minutesSaved" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "WorkflowTimeSavedLog_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowTimeSavedLog_employeeId_workflowId_key" ON "WorkflowTimeSavedLog"("employeeId", "workflowId");

CREATE INDEX IF NOT EXISTS "WorkflowTimeSavedLog_organizationId_workflowId_idx" ON "WorkflowTimeSavedLog"("organizationId", "workflowId");

DO $$ BEGIN ALTER TABLE "WorkflowTimeSavedLog" ADD CONSTRAINT "WorkflowTimeSavedLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "WorkflowTimeSavedLog" ADD CONSTRAINT "WorkflowTimeSavedLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "WorkflowTimeSavedLog" ADD CONSTRAINT "WorkflowTimeSavedLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: precise per-template copy counts (idempotent, same rules).
ALTER TABLE "AIUsageEvent" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;

CREATE INDEX IF NOT EXISTS "AIUsageEvent_organizationId_eventType_sourceId_idx" ON "AIUsageEvent"("organizationId", "eventType", "sourceId");

-- Patch: image/video attachments on standalone templates, same as workflow steps (idempotent, same rules).
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Template" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- Patch: track first login so pending invites can be told apart from active accounts (idempotent, same rules).
-- Existing accounts default to "now" so they are not mistaken for pending invites; the default is then dropped so new invites start as null.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "User" ALTER COLUMN "lastLoginAt" DROP DEFAULT;

-- Patch: per-org removal of shared-catalog content (idempotent, same rules).
CREATE TABLE IF NOT EXISTS "HiddenContent" ("id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "hiddenByName" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "HiddenContent_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX IF NOT EXISTS "HiddenContent_organizationId_entityType_entityId_key" ON "HiddenContent"("organizationId", "entityType", "entityId");

CREATE INDEX IF NOT EXISTS "HiddenContent_organizationId_entityType_idx" ON "HiddenContent"("organizationId", "entityType");

DO $$ BEGIN ALTER TABLE "HiddenContent" ADD CONSTRAINT "HiddenContent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- Patch: frontline safety operations tables (idempotent, same rules).
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "isSafetyLead" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "siteId" TEXT;

CREATE TABLE IF NOT EXISTS "Site" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'JOBSITE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "safetyLeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SafetyReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "transcript" TEXT,
    "siteId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "privacy" TEXT NOT NULL DEFAULT 'NAMED',
    "injuryInvolved" BOOLEAN NOT NULL DEFAULT false,
    "immediateAction" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "reporterId" TEXT,
    "ownerId" TEXT,
    "respondBy" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReportEvent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorName" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT,
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Investigation" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "leadId" TEXT,
    "facts" TEXT NOT NULL DEFAULT '',
    "sequenceNotes" TEXT NOT NULL DEFAULT '',
    "contributingFactors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rootCauseNotes" TEXT NOT NULL DEFAULT '',
    "lessonText" TEXT NOT NULL DEFAULT '',
    "shareLesson" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Investigation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InvestigationStatement" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "providedBy" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "addedByName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationStatement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InvestigationQuestion" (
    "id" TEXT NOT NULL,
    "investigationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "aiDrafted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CorrectiveAction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "reportId" TEXT,
    "inspectionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "proposedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "completionNotes" TEXT NOT NULL DEFAULT '',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "completedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectiveAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InspectionTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SITE_INSPECTION',
    "items" JSONB NOT NULL DEFAULT '[]',
    "frequencyDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Inspection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "results" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ToolboxTalk" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "sourceMaterial" TEXT NOT NULL DEFAULT '',
    "siteId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "aiDrafted" BOOLEAN NOT NULL DEFAULT false,
    "createdByName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolboxTalk_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TalkAcknowledgement" (
    "id" TEXT NOT NULL,
    "talkId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TalkAcknowledgement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Qualification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuedOn" TIMESTAMP(3),
    "expiresOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EscalationRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "minSeverity" TEXT NOT NULL,
    "category" TEXT,
    "siteId" TEXT,
    "ownerId" TEXT,
    "respondWithinHours" INTEGER NOT NULL DEFAULT 24,
    "escalateToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscalationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Site_organizationId_idx" ON "Site"("organizationId");

CREATE INDEX IF NOT EXISTS "SafetyReport_organizationId_status_idx" ON "SafetyReport"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "SafetyReport_siteId_idx" ON "SafetyReport"("siteId");

CREATE UNIQUE INDEX IF NOT EXISTS "SafetyReport_organizationId_number_key" ON "SafetyReport"("organizationId", "number");

CREATE INDEX IF NOT EXISTS "ReportEvent_reportId_idx" ON "ReportEvent"("reportId");

CREATE UNIQUE INDEX IF NOT EXISTS "Investigation_reportId_key" ON "Investigation"("reportId");

CREATE INDEX IF NOT EXISTS "Investigation_organizationId_idx" ON "Investigation"("organizationId");

CREATE INDEX IF NOT EXISTS "InvestigationStatement_investigationId_idx" ON "InvestigationStatement"("investigationId");

CREATE INDEX IF NOT EXISTS "InvestigationQuestion_investigationId_idx" ON "InvestigationQuestion"("investigationId");

CREATE INDEX IF NOT EXISTS "CorrectiveAction_organizationId_status_idx" ON "CorrectiveAction"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "CorrectiveAction_reportId_idx" ON "CorrectiveAction"("reportId");

CREATE UNIQUE INDEX IF NOT EXISTS "CorrectiveAction_organizationId_number_key" ON "CorrectiveAction"("organizationId", "number");

CREATE INDEX IF NOT EXISTS "InspectionTemplate_organizationId_idx" ON "InspectionTemplate"("organizationId");

CREATE INDEX IF NOT EXISTS "Inspection_organizationId_status_idx" ON "Inspection"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "Inspection_siteId_idx" ON "Inspection"("siteId");

CREATE INDEX IF NOT EXISTS "ToolboxTalk_organizationId_idx" ON "ToolboxTalk"("organizationId");

CREATE UNIQUE INDEX IF NOT EXISTS "TalkAcknowledgement_talkId_employeeId_key" ON "TalkAcknowledgement"("talkId", "employeeId");

CREATE INDEX IF NOT EXISTS "Qualification_organizationId_idx" ON "Qualification"("organizationId");

CREATE INDEX IF NOT EXISTS "Qualification_employeeId_idx" ON "Qualification"("employeeId");

CREATE INDEX IF NOT EXISTS "EscalationRule_organizationId_idx" ON "EscalationRule"("organizationId");

DO $$ BEGIN ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "SafetyReport" ADD CONSTRAINT "SafetyReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "ReportEvent" ADD CONSTRAINT "ReportEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "Investigation" ADD CONSTRAINT "Investigation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "InvestigationStatement" ADD CONSTRAINT "InvestigationStatement_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "InvestigationQuestion" ADD CONSTRAINT "InvestigationQuestion_investigationId_fkey" FOREIGN KEY ("investigationId") REFERENCES "Investigation"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyReport"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "ToolboxTalk" ADD CONSTRAINT "ToolboxTalk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "TalkAcknowledgement" ADD CONSTRAINT "TalkAcknowledgement_talkId_fkey" FOREIGN KEY ("talkId") REFERENCES "ToolboxTalk"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "Qualification" ADD CONSTRAINT "Qualification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "EscalationRule" ADD CONSTRAINT "EscalationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- incident workspace, private follow-up, severity confirmation, demo flag

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS     "emergencyInstructions" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS     "isDemo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SafetyReport" ADD COLUMN IF NOT EXISTS     "followUpHash" TEXT,
ADD COLUMN IF NOT EXISTS     "inspectionId" TEXT,
ADD COLUMN IF NOT EXISTS     "locationNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS     "severityConfirmedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS     "severityConfirmedById" TEXT;

ALTER TABLE "ReportEvent" ADD COLUMN IF NOT EXISTS     "attachments" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS     "toReporter" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "EscalationRule" ADD COLUMN IF NOT EXISTS     "openIncident" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "IncidentResponse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "leadId" TEXT,
    "summary" TEXT NOT NULL DEFAULT '',
    "nextAction" TEXT NOT NULL DEFAULT '',
    "nextActionDueAt" TIMESTAMP(3),
    "closeoutSummary" TEXT NOT NULL DEFAULT '',
    "standDownReason" TEXT NOT NULL DEFAULT '',
    "openedBy" TEXT NOT NULL DEFAULT 'MANUAL',
    "openedById" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IncidentResponder" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT '',
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentResponder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IncidentResponse_reportId_key" ON "IncidentResponse"("reportId");

CREATE INDEX IF NOT EXISTS "IncidentResponse_organizationId_status_idx" ON "IncidentResponse"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "IncidentResponder_employeeId_idx" ON "IncidentResponder"("employeeId");

CREATE UNIQUE INDEX IF NOT EXISTS "IncidentResponder_incidentId_employeeId_key" ON "IncidentResponder"("incidentId", "employeeId");

CREATE UNIQUE INDEX IF NOT EXISTS "SafetyReport_followUpHash_key" ON "SafetyReport"("followUpHash");

DO $$ BEGIN ALTER TABLE "IncidentResponse" ADD CONSTRAINT "IncidentResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "IncidentResponse" ADD CONSTRAINT "IncidentResponse_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "SafetyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "IncidentResponder" ADD CONSTRAINT "IncidentResponder_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "IncidentResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SupportMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SupportMessage_userId_createdAt_idx" ON "SupportMessage"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "SupportMessage_organizationId_idx" ON "SupportMessage"("organizationId");

DO $$ BEGIN ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;
`;
