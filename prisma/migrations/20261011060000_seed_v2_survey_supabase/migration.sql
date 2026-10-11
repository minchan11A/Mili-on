-- DropForeignKey
ALTER TABLE "BestPractice" DROP CONSTRAINT "BestPractice_rangeId_fkey";

-- AlterTable
ALTER TABLE "BestPractice" ADD COLUMN     "basis" TEXT,
ADD COLUMN     "basisLabel" TEXT,
ADD COLUMN     "recommendedAt" TIMESTAMP(3),
ADD COLUMN     "sourceId" TEXT,
ALTER COLUMN "rangeId" DROP NOT NULL,
ALTER COLUMN "completedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "maskExpected" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "answers" JSONB;

-- AlterTable
ALTER TABLE "TrainingRange" ADD COLUMN     "address" TEXT,
ADD COLUMN     "isFictional" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "setting" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'fictional';

-- AlterTable
ALTER TABLE "TrainingRecord" ADD COLUMN     "selfReported" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authId" TEXT,
ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- AddForeignKey
ALTER TABLE "BestPractice" ADD CONSTRAINT "BestPractice_rangeId_fkey" FOREIGN KEY ("rangeId") REFERENCES "TrainingRange"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Supabase 보안: public 스키마 테이블은 anon 키로 Data API(PostgREST)에 노출됩니다.
-- 정책 없이 RLS만 켜 두면 API로는 읽기·쓰기가 모두 막히고, 테이블 소유자로 접속하는 Prisma는 그대로 동작합니다.
-- (일반 PostgreSQL·Railway에서도 해가 없습니다.)
ALTER TABLE "TrainingRange" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrainingRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Issue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Proposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProposalEmpathy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OfficialReply" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiSolution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BestPractice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GuideEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Question" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Answer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaskingAudit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
