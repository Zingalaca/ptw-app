-- CreateTable
CREATE TABLE "Contract" (
    "id" SERIAL NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "description" TEXT,
    "naicsCode" TEXT,
    "setAside" TEXT,
    "popStart" TIMESTAMP(3),
    "popEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clin" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "clinNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "clinType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "isOption" BOOLEAN NOT NULL DEFAULT false,
    "optionYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "dunsNumber" TEXT,
    "gsaScheduleNumber" TEXT,
    "historicalWinRate" DOUBLE PRECISION,
    "estimatedRevenue" DOUBLE PRECISION,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "likelyBidPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateAssumption" (
    "id" SERIAL NOT NULL,
    "scenarioId" INTEGER NOT NULL,
    "laborCategory" TEXT NOT NULL,
    "level" TEXT,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "escalationRate" DOUBLE PRECISION NOT NULL DEFAULT 0.03,
    "fringeRate" DOUBLE PRECISION NOT NULL,
    "overheadRate" DOUBLE PRECISION NOT NULL,
    "gaRate" DOUBLE PRECISION NOT NULL,
    "feeRate" DOUBLE PRECISION NOT NULL,
    "wrappedRate" DOUBLE PRECISION NOT NULL,
    "geographicIndexId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TepResult" (
    "id" SERIAL NOT NULL,
    "scenarioId" INTEGER NOT NULL,
    "clinId" INTEGER NOT NULL,
    "competitorId" INTEGER,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "evaluatedPrice" DOUBLE PRECISION,
    "technicalScore" DOUBLE PRECISION,
    "notes" TEXT,
    "breakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TepResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeographicIndex" (
    "id" SERIAL NOT NULL,
    "location" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "msa" TEXT,
    "index" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "effectiveYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeographicIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract"("contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Clin_contractId_clinNumber_key" ON "Clin"("contractId", "clinNumber");

-- CreateIndex
CREATE UNIQUE INDEX "GeographicIndex_location_effectiveYear_key" ON "GeographicIndex"("location", "effectiveYear");

-- AddForeignKey
ALTER TABLE "Clin" ADD CONSTRAINT "Clin_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateAssumption" ADD CONSTRAINT "RateAssumption_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateAssumption" ADD CONSTRAINT "RateAssumption_geographicIndexId_fkey" FOREIGN KEY ("geographicIndexId") REFERENCES "GeographicIndex"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TepResult" ADD CONSTRAINT "TepResult_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TepResult" ADD CONSTRAINT "TepResult_clinId_fkey" FOREIGN KEY ("clinId") REFERENCES "Clin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TepResult" ADD CONSTRAINT "TepResult_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
