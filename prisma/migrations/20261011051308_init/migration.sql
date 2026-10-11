-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RESERVIST', 'RANGE_MANAGER', 'POLICY_ADMIN');

-- CreateEnum
CREATE TYPE "RangeType" AS ENUM ('MOBILIZATION', 'REGIONAL');

-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('MOBILIZATION', 'MOBILIZATION_NOSTAY', 'BASIC', 'FOLLOWUP');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('TRANSPORT', 'MEAL', 'FACILITY', 'OPERATION', 'EQUIPMENT', 'COMMUNICATION', 'COMPENSATION', 'ETC');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('RECEIVED', 'REVIEWING', 'PLANNED', 'DONE', 'LONG_TERM');

-- CreateEnum
CREATE TYPE "ContentState" AS ENUM ('VISIBLE', 'HIDDEN_BY_REPORTS', 'HIDDEN_BY_ADMIN');

-- CreateEnum
CREATE TYPE "AiDecision" AS ENUM ('PENDING', 'ADOPTED', 'ADOPTED_EDITED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GuideSection" AS ENUM ('CHECKLIST', 'TRANSPORT', 'MEAL', 'ENTRY', 'ETC');

-- CreateTable
CREATE TABLE "TrainingRange" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RangeType" NOT NULL,
    "sido" TEXT NOT NULL,
    "sigungu" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "nickname" TEXT NOT NULL,
    "ageBand" TEXT,
    "loginId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "managedRangeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rangeId" TEXT NOT NULL,
    "trainingType" "TrainingType" NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rangeId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "scoreTransport" INTEGER NOT NULL,
    "scoreMeal" INTEGER NOT NULL,
    "scoreFacility" INTEGER NOT NULL,
    "scoreOperation" INTEGER NOT NULL,
    "scoreComm" INTEGER NOT NULL,
    "comment" TEXT,
    "state" "ContentState" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "subtopic" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isSafety" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "rangeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "subtopic" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'RECEIVED',
    "sentiment" INTEGER,
    "issueId" TEXT,
    "state" "ContentState" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalEmpathy" (
    "userId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalEmpathy_pkey" PRIMARY KEY ("userId","proposalId")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "from" "ProposalStatus",
    "to" "ProposalStatus" NOT NULL,
    "note" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialReply" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfficialReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSolution" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "maskedRequest" TEXT NOT NULL,
    "responseJson" JSONB NOT NULL,
    "editedJson" JSONB,
    "decision" "AiDecision" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "reviewed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BestPractice" (
    "id" TEXT NOT NULL,
    "rangeId" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "title" TEXT NOT NULL,
    "before" TEXT NOT NULL,
    "after" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "sourceProposalId" TEXT,

    CONSTRAINT "BestPractice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideEntry" (
    "id" TEXT NOT NULL,
    "rangeId" TEXT NOT NULL,
    "section" "GuideSection" NOT NULL,
    "body" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "state" "ContentState" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuideEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "rangeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "authorId" TEXT,
    "isAi" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT NOT NULL,
    "sourceGuideIds" TEXT[],
    "state" "ContentState" NOT NULL DEFAULT 'VISIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaskingAudit" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "maskedText" TEXT NOT NULL,
    "entityCounts" JSONB NOT NULL,
    "blocked" BOOLEAN NOT NULL,
    "blockReasons" TEXT[],
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaskingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingRange_code_key" ON "TrainingRange"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_recordId_key" ON "Review"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_category_subtopic_key" ON "Issue"("category", "subtopic");

-- CreateIndex
CREATE INDEX "Proposal_rangeId_status_idx" ON "Proposal"("rangeId", "status");

-- CreateIndex
CREATE INDEX "Proposal_issueId_idx" ON "Proposal"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialReply_targetType_targetId_key" ON "OfficialReply"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Report_targetType_targetId_reporterId_key" ON "Report"("targetType", "targetId", "reporterId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managedRangeId_fkey" FOREIGN KEY ("managedRangeId") REFERENCES "TrainingRange"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_rangeId_fkey" FOREIGN KEY ("rangeId") REFERENCES "TrainingRange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_rangeId_fkey" FOREIGN KEY ("rangeId") REFERENCES "TrainingRange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrainingRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_rangeId_fkey" FOREIGN KEY ("rangeId") REFERENCES "TrainingRange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalEmpathy" ADD CONSTRAINT "ProposalEmpathy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalEmpathy" ADD CONSTRAINT "ProposalEmpathy_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSolution" ADD CONSTRAINT "AiSolution_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPractice" ADD CONSTRAINT "BestPractice_rangeId_fkey" FOREIGN KEY ("rangeId") REFERENCES "TrainingRange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideEntry" ADD CONSTRAINT "GuideEntry_rangeId_fkey" FOREIGN KEY ("rangeId") REFERENCES "TrainingRange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_rangeId_fkey" FOREIGN KEY ("rangeId") REFERENCES "TrainingRange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
