/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Clin` table. All the data in the column will be lost.
  - You are about to drop the column `isOption` on the `Clin` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Clin` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Clin` table. All the data in the column will be lost.
  - You are about to drop the column `breakdown` on the `TepResult` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `TepResult` table. All the data in the column will be lost.
  - You are about to drop the column `evaluatedPrice` on the `TepResult` table. All the data in the column will be lost.
  - You are about to drop the column `technicalScore` on the `TepResult` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `TepResult` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TepResult` table. All the data in the column will be lost.
  - Added the required column `contractType` to the `Clin` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `clinType` on the `Clin` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `optionYear` on table `Clin` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `baseYears` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `optionYears` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ClinType" AS ENUM ('LABOR', 'PRODUCTION', 'ODC', 'NSP');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('FFP', 'CPFF', 'CPIF', 'FPIF', 'COST', 'TM');

-- CreateEnum
CREATE TYPE "CostBasis" AS ENUM ('OFFEROR_PROPOSED', 'GOVT_ESTIMATE');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('PUBLIC', 'PRIVATE');

-- DropIndex
DROP INDEX "Clin_contractId_clinNumber_key";

-- AlterTable
ALTER TABLE "Clin" DROP COLUMN "createdAt",
DROP COLUMN "isOption",
DROP COLUMN "unit",
DROP COLUMN "updatedAt",
ADD COLUMN     "blockNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "contractType" "ContractType" NOT NULL,
ADD COLUMN     "costBasis" "CostBasis" NOT NULL DEFAULT 'OFFEROR_PROPOSED',
ADD COLUMN     "feeAllowed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "feeOnODCs" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "govtEstimate" DOUBLE PRECISION,
ADD COLUMN     "govtHourCeiling" DOUBLE PRECISION,
ADD COLUMN     "govtProvidedODCs" DOUBLE PRECISION,
ADD COLUMN     "isInTEP" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSeparatelyPriced" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isStepladder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nteAmount" DOUBLE PRECISION,
ADD COLUMN     "primeSubkMix" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "realismFactorPct" DOUBLE PRECISION,
ADD COLUMN     "sampleTaskRef" TEXT,
ADD COLUMN     "totalHours" DOUBLE PRECISION,
ADD COLUMN     "unitOfMeasure" TEXT,
DROP COLUMN "clinType",
ADD COLUMN     "clinType" "ClinType" NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "optionYear" SET NOT NULL,
ALTER COLUMN "optionYear" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Competitor" ADD COLUMN     "companyType" "CompanyType" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "isOurCompany" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "baseYears" INTEGER NOT NULL,
ADD COLUMN     "optionYears" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TepResult" DROP COLUMN "breakdown",
DROP COLUMN "createdAt",
DROP COLUMN "evaluatedPrice",
DROP COLUMN "technicalScore",
DROP COLUMN "totalPrice",
DROP COLUMN "updatedAt",
ADD COLUMN     "evaluatedTep" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "feeAmount" DOUBLE PRECISION,
ADD COLUMN     "gaAmount" DOUBLE PRECISION,
ADD COLUMN     "indirectCost" DOUBLE PRECISION,
ADD COLUMN     "isNSP" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "materialCost" DOUBLE PRECISION,
ADD COLUMN     "odcCost" DOUBLE PRECISION,
ADD COLUMN     "primeHours" DOUBLE PRECISION,
ADD COLUMN     "primeLaborCost" DOUBLE PRECISION,
ADD COLUMN     "proposedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "proposedFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "proposedTep" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "realismApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subkHours" DOUBLE PRECISION,
ADD COLUMN     "subkLaborCost" DOUBLE PRECISION,
ADD COLUMN     "totalLaborCost" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "CompetitorRateProfile" (
    "id" SERIAL NOT NULL,
    "competitorId" INTEGER NOT NULL,
    "contractId" INTEGER NOT NULL,
    "primeCompositeRate" DOUBLE PRECISION,
    "subkCompositeRate" DOUBLE PRECISION,
    "primeSubkMix" DOUBLE PRECISION DEFAULT 1.0,
    "engOHRate" DOUBLE PRECISION,
    "mfgOHRate" DOUBLE PRECISION,
    "materialHandlingRate" DOUBLE PRECISION,
    "subkHandlingRate" DOUBLE PRECISION,
    "gaRate" DOUBLE PRECISION,
    "valueAddedGA" BOOLEAN NOT NULL DEFAULT false,
    "feeRate" DOUBLE PRECISION,
    "cpifTargetFee" DOUBLE PRECISION,
    "cpifMinFee" DOUBLE PRECISION,
    "cpifMaxFee" DOUBLE PRECISION,
    "fpifTargetFee" DOUBLE PRECISION,
    "fpifCeilingPrice" DOUBLE PRECISION,
    "engLocation" TEXT,
    "prodLocation" TEXT,
    "engGeoOffset" DOUBLE PRECISION,
    "prodGeoOffset" DOUBLE PRECISION,
    "fringeInOH" BOOLEAN NOT NULL DEFAULT true,
    "escalationRate" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "CompetitorRateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepladderBreak" (
    "id" SERIAL NOT NULL,
    "clinId" INTEGER NOT NULL,
    "breakMin" DOUBLE PRECISION NOT NULL,
    "breakMax" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "mlqProbability" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "StepladderBreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitorRateProfile_competitorId_key" ON "CompetitorRateProfile"("competitorId");

-- AddForeignKey
ALTER TABLE "CompetitorRateProfile" ADD CONSTRAINT "CompetitorRateProfile_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepladderBreak" ADD CONSTRAINT "StepladderBreak_clinId_fkey" FOREIGN KEY ("clinId") REFERENCES "Clin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
