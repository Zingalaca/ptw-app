// PTW v2.0 seed — two government contracts with full CLIN, competitor, and rate profile data
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Helpers ────────────────────────────────────────────────────────────────────
// No @@unique on contractId+clinNumber in v2 schema, so upsert via findFirst+id
async function upsertClin(contractId, clinNumber, data) {
  const existing = await prisma.clin.findFirst({ where: { contractId, clinNumber } });
  if (existing) {
    return prisma.clin.update({ where: { id: existing.id }, data });
  }
  return prisma.clin.create({ data: { contractId, ...data } });
}

async function upsertCompetitor(contractId, name, data) {
  const existing = await prisma.competitor.findFirst({ where: { contractId, name } });
  if (existing) {
    return prisma.competitor.update({ where: { id: existing.id }, data });
  }
  return prisma.competitor.create({ data: { contractId, name, ...data } });
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding PTW v2.0 database...\n");

  // ── Clean slate (FK-safe order) ────────────────────────────────────────────
  await prisma.tepResult.deleteMany({});
  await prisma.rateAssumption.deleteMany({});
  await prisma.scenario.deleteMany({});
  await prisma.stepladderBreak.deleteMany({});
  await prisma.competitorRateProfile.deleteMany({});
  await prisma.competitor.deleteMany({});
  await prisma.clin.deleteMany({});
  await prisma.contract.deleteMany({});
  console.log("  ✓ Cleared existing data");

  // ── Geographic Indices ────────────────────────────────────────────────────
  const geoIndices = await Promise.all([
    prisma.geographicIndex.upsert({
      where: { location_effectiveYear: { location: "Washington DC Metro", effectiveYear: 2026 } },
      update: {},
      create: {
        location: "Washington DC Metro", state: "DC",
        msa: "Washington-Arlington-Alexandria DC-VA-MD-WV",
        index: 1.28, source: "BLS", effectiveYear: 2026,
      },
    }),
    prisma.geographicIndex.upsert({
      where: { location_effectiveYear: { location: "Hampton Roads VA", effectiveYear: 2026 } },
      update: {},
      create: {
        location: "Hampton Roads VA", state: "VA",
        msa: "Virginia Beach-Norfolk-Newport News VA-NC",
        index: 1.08, source: "BLS", effectiveYear: 2026,
      },
    }),
    prisma.geographicIndex.upsert({
      where: { location_effectiveYear: { location: "National Average", effectiveYear: 2026 } },
      update: {},
      create: {
        location: "National Average", state: "US",
        index: 1.0, source: "BLS", effectiveYear: 2026,
      },
    }),
  ]);
  console.log(`  ✓ ${geoIndices.length} geographic indices\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRACT 1 — TIH Systems Engineering & Production Support
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("  ── CONTRACT 1: TIH ──────────────────────────────────");

  const tih = await prisma.contract.upsert({
    where: { contractNumber: "W91WAW-26-R-0042" },
    update: {},
    create: {
      contractNumber: "W91WAW-26-R-0042",
      title:          "TIH Systems Engineering & Production Support",
      agency:         "U.S. Navy",
      naicsCode:      "541512",
      description:    "Systems engineering, field engineering, and production support for USN TI-28/30/32 programs",
      popStart:       new Date("2026-01-01"),
      popEnd:         new Date("2035-01-01"),
      baseYears:      1,
      optionYears:    8,
      status:         "OPEN",
    },
  });
  console.log(`  ✓ Contract: ${tih.contractNumber}`);

  // ── TIH CLINs ─────────────────────────────────────────────────────────────
  // optionYear: CY1=0, CY2=1, CY3=2, CY4=3, CY5=4, CY6=5, CY7=6, CY8=7, CY9=8
  // "CY1-5" multi-year CLINs assigned optionYear 0
  const tihClinDefs = [
    // Block 1 — Engineering (CPIF, isInTEP: true)
    {
      clinNumber: "0001", description: "CY1 Systems Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 0, blockNumber: 1,
      sampleTaskRef: "ST3", govtHourCeiling: 74512, totalHours: 71000,
      primeSubkMix: 0.60, costBasis: "OFFEROR_PROPOSED", feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "1001", description: "CY2 Systems Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 1, blockNumber: 1,
      sampleTaskRef: "ST2", govtHourCeiling: 58009, totalHours: 55500,
      primeSubkMix: 0.60, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "1002", description: "CY3 Systems Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 2, blockNumber: 1,
      sampleTaskRef: "ST2", govtHourCeiling: 125957, totalHours: 120000,
      primeSubkMix: 0.60, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "1003", description: "CY4 Systems Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 3, blockNumber: 1,
      sampleTaskRef: "ST2", govtHourCeiling: 178291, totalHours: 170000,
      primeSubkMix: 0.60, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "1004", description: "CY5 Systems Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 4, blockNumber: 1,
      sampleTaskRef: "ST2", govtHourCeiling: 131153, totalHours: 125000,
      primeSubkMix: 0.60, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "1005", description: "CY6 Systems Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 5, blockNumber: 1,
      sampleTaskRef: "ST2", govtHourCeiling: 90891, totalHours: 87000,
      primeSubkMix: 0.60, feeAllowed: true, isInTEP: true,
    },
    // Block 2 — Field Engineering (CPIF, isInTEP: true)
    {
      clinNumber: "4001", description: "CY1 Field Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 0, blockNumber: 2,
      sampleTaskRef: "ST1", govtHourCeiling: 6685, totalHours: 6400,
      primeSubkMix: 0.70, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "4002", description: "CY2 Field Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 1, blockNumber: 2,
      sampleTaskRef: "ST1", govtHourCeiling: 18965, totalHours: 18000,
      primeSubkMix: 0.70, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "4003", description: "CY3 Field Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 2, blockNumber: 2,
      sampleTaskRef: "ST1", govtHourCeiling: 35850, totalHours: 34000,
      primeSubkMix: 0.70, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "4004", description: "CY4 Field Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 3, blockNumber: 2,
      sampleTaskRef: "ST1", govtHourCeiling: 22035, totalHours: 21000,
      primeSubkMix: 0.70, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "4005", description: "CY5 Field Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 4, blockNumber: 2,
      sampleTaskRef: "ST1", govtHourCeiling: 15895, totalHours: 15200,
      primeSubkMix: 0.70, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "4006", description: "CY6 Field Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 5, blockNumber: 2,
      sampleTaskRef: "ST1", govtHourCeiling: 8220, totalHours: 7900,
      primeSubkMix: 0.70, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "4007", description: "CY7 Field Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 6, blockNumber: 2,
      sampleTaskRef: "ST1", govtHourCeiling: 11290, totalHours: 10800,
      primeSubkMix: 0.70, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "4008", description: "CY8 Field Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 7, blockNumber: 2,
      sampleTaskRef: "ST1", govtHourCeiling: 11290, totalHours: 10800,
      primeSubkMix: 0.70, feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "4009", description: "CY9 Field Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 8, blockNumber: 2,
      sampleTaskRef: "ST1", govtHourCeiling: 8220, totalHours: 7900,
      primeSubkMix: 0.70, feeAllowed: true, isInTEP: true,
    },
    // Block 3 — Production (Govt Estimated, isInTEP: true)
    // Fee terms (fpifTargetFee, fpifCeilingPrice, cpifTargetFee, etc.) live on
    // CompetitorRateProfile, not on Clin — stored there per competitor.
    {
      clinNumber: "0008", description: "Production FPIF CY1-5",
      clinType: "PRODUCTION", contractType: "FPIF", optionYear: 0, blockNumber: 3,
      govtEstimate: 92330000, costBasis: "GOVT_ESTIMATE",
      feeAllowed: true, isSeparatelyPriced: true, isInTEP: true,
    },
    {
      clinNumber: "0009", description: "Production CPIF CY1-5",
      clinType: "PRODUCTION", contractType: "CPIF", optionYear: 0, blockNumber: 3,
      govtEstimate: 30777000, costBasis: "GOVT_ESTIMATE",
      feeAllowed: true, isSeparatelyPriced: true, isInTEP: true,
    },
    // Non-TEP CLINs (isInTEP: false)
    {
      clinNumber: "2003", description: "CY7 Systems Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 6, blockNumber: 1,
      sampleTaskRef: "ST3", govtHourCeiling: 186740, totalHours: 178000,
      primeSubkMix: 0.60, feeAllowed: true, isInTEP: false,
    },
    {
      clinNumber: "2004", description: "CY8 Systems Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 7, blockNumber: 1,
      sampleTaskRef: "ST3", govtHourCeiling: 109718, totalHours: 105000,
      primeSubkMix: 0.60, feeAllowed: true, isInTEP: false,
    },
    {
      clinNumber: "2005", description: "CY9 Systems Engineering",
      clinType: "LABOR", contractType: "CPIF", optionYear: 8, blockNumber: 1,
      sampleTaskRef: "ST3", govtHourCeiling: 53570, totalHours: 51000,
      primeSubkMix: 0.60, feeAllowed: true, isInTEP: false,
    },
    {
      clinNumber: "0006", description: "SN TI-28 Non Production Materials",
      clinType: "ODC", contractType: "CPFF", optionYear: 0, blockNumber: 1,
      feeAllowed: false, isInTEP: false,
    },
    {
      clinNumber: "0010", description: "USN TI-28 Spares",
      clinType: "ODC", contractType: "CPFF", optionYear: 0, blockNumber: 1,
      feeAllowed: false, isInTEP: false,
    },
  ];

  const tihClins = [];
  for (const d of tihClinDefs) {
    tihClins.push(await upsertClin(tih.id, d.clinNumber, d));
  }
  const tihInTEP = tihClins.filter((c) => c.isInTEP).length;
  console.log(`  ✓ ${tihClins.length} CLINs (${tihInTEP} in TEP, ${tihClins.length - tihInTEP} non-TEP)`);

  // ── TIH Competitors ───────────────────────────────────────────────────────
  const tihCompDefs = [
    { name: "OurCo",               isOurCompany: true,  companyType: "PRIVATE" },
    { name: "Leidos Inc.",          isOurCompany: false, companyType: "PUBLIC", historicalWinRate: 0.38, estimatedRevenue: 14800 },
    { name: "Booz Allen Hamilton",  isOurCompany: false, companyType: "PUBLIC", historicalWinRate: 0.42, estimatedRevenue:  9400 },
    { name: "SAIC",                 isOurCompany: false, companyType: "PUBLIC", historicalWinRate: 0.31, estimatedRevenue:  7600 },
    { name: "Peraton Inc.",         isOurCompany: false, companyType: "PUBLIC", historicalWinRate: 0.27, estimatedRevenue:  6200 },
  ];

  const tihComps = [];
  for (const d of tihCompDefs) {
    tihComps.push(await upsertCompetitor(tih.id, d.name, d));
  }
  const [tihOurCo, tihLeidos, tihBAH, tihSAIC, tihPeraton] = tihComps;
  console.log(`  ✓ ${tihComps.length} competitors`);

  // ── TIH Rate Profiles ─────────────────────────────────────────────────────
  const tihRateProfileDefs = [
    {
      competitorId: tihOurCo.id,
      primeCompositeRate: 185, subkCompositeRate: 145, primeSubkMix: 0.60,
      engOHRate: 95, mfgOHRate: 85, gaRate: 12, valueAddedGA: false,
      feeRate: 10, cpifTargetFee: 9, fpifTargetFee: 8,
      escalationRate: 3,
      engLocation: "Washington DC Metro", prodLocation: "Hampton Roads VA",
    },
    {
      competitorId: tihLeidos.id,
      primeCompositeRate: 178, subkCompositeRate: 138, primeSubkMix: 0.55,
      engOHRate: 88, mfgOHRate: 78, gaRate: 11, valueAddedGA: false,
      feeRate: 10, cpifTargetFee: 9,
      escalationRate: 3,
      engLocation: "Reston VA", prodLocation: "Various",
    },
    {
      competitorId: tihBAH.id,
      primeCompositeRate: 210, subkCompositeRate: 165, primeSubkMix: 0.65,
      engOHRate: 110, mfgOHRate: 95, gaRate: 14, valueAddedGA: false,
      feeRate: 10, cpifTargetFee: 10,
      escalationRate: 3,
      engLocation: "McLean VA", prodLocation: "N/A",
    },
    {
      competitorId: tihSAIC.id,
      primeCompositeRate: 182, subkCompositeRate: 142, primeSubkMix: 0.58,
      engOHRate: 92, mfgOHRate: 82, gaRate: 13, valueAddedGA: false,
      feeRate: 10, cpifTargetFee: 9,
      escalationRate: 3,
      engLocation: "Reston VA", prodLocation: "San Diego CA",
    },
    {
      competitorId: tihPeraton.id,
      primeCompositeRate: 176, subkCompositeRate: 136, primeSubkMix: 0.50,
      engOHRate: 98, mfgOHRate: 88, gaRate: 15, valueAddedGA: true,
      feeRate: 9, cpifTargetFee: 8, fpifTargetFee: 7,
      escalationRate: 3,
      engLocation: "Herndon VA", prodLocation: "Various",
    },
  ];

  for (const rp of tihRateProfileDefs) {
    await prisma.competitorRateProfile.upsert({
      where:  { competitorId: rp.competitorId },
      update: { contractId: tih.id, ...rp },
      create: { contractId: tih.id, ...rp },
    });
  }
  console.log(`  ✓ ${tihRateProfileDefs.length} rate profiles`);

  // ── TIH Scenarios ─────────────────────────────────────────────────────────
  await prisma.scenario.deleteMany({ where: { contractId: tih.id } });
  const tihScenarios = await Promise.all([
    prisma.scenario.create({
      data: {
        contractId:  tih.id,
        name:        "Base Case",
        description: "Most likely composite rates and hour allocation",
        isBaseline:  true,
      },
    }),
    prisma.scenario.create({
      data: {
        contractId:  tih.id,
        name:        "Conservative",
        description: "Higher composite rates, more prime hours",
        isBaseline:  false,
      },
    }),
    prisma.scenario.create({
      data: {
        contractId:  tih.id,
        name:        "Aggressive",
        description: "Lower composite rates, more SubK hours",
        isBaseline:  false,
      },
    }),
  ]);
  console.log(`  ✓ ${tihScenarios.length} scenarios\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRACT 2 — VLS Production & Sustainment
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("  ── CONTRACT 2: VLS ──────────────────────────────────");

  const vls = await prisma.contract.upsert({
    where: { contractNumber: "N00024-26-R-0088" },
    update: {},
    create: {
      contractNumber: "N00024-26-R-0088",
      title:          "VLS Production & Sustainment",
      agency:         "U.S. Navy",
      naicsCode:      "332994",
      description:    "VLS production, spare parts, and field service support",
      popStart:       new Date("2026-01-01"),
      popEnd:         new Date("2029-01-01"),
      baseYears:      1,
      optionYears:    2,
      status:         "OPEN",
    },
  });
  console.log(`  ✓ Contract: ${vls.contractNumber}`);

  // ── VLS CLINs ─────────────────────────────────────────────────────────────
  const vlsClinDefs = [
    {
      clinNumber: "0001", description: "VLS Launcher Assemblies",
      clinType: "PRODUCTION", contractType: "FFP", optionYear: 0, blockNumber: 1,
      isStepladder: true, unitOfMeasure: "Each", feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "0002", description: "Spare Parts Package",
      clinType: "PRODUCTION", contractType: "FFP", optionYear: 0, blockNumber: 1,
      isStepladder: true, unitOfMeasure: "Each", feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "0003", description: "Field Service Representatives",
      clinType: "ODC", contractType: "FFP", optionYear: 0, blockNumber: 1,
      quantity: 1, unitOfMeasure: "Lot", feeAllowed: true, isInTEP: true,
    },
    {
      clinNumber: "1001", description: "VLS Launcher Assemblies OY1",
      clinType: "PRODUCTION", contractType: "FFP", optionYear: 1, blockNumber: 1,
      isStepladder: true, unitOfMeasure: "Each", isInTEP: true,
    },
    {
      clinNumber: "1002", description: "VLS Launcher Assemblies OY2",
      clinType: "PRODUCTION", contractType: "FFP", optionYear: 2, blockNumber: 1,
      isStepladder: true, unitOfMeasure: "Each", isInTEP: true,
    },
  ];

  const vlsClins = [];
  for (const d of vlsClinDefs) {
    vlsClins.push(await upsertClin(vls.id, d.clinNumber, d));
  }
  console.log(`  ✓ ${vlsClins.length} CLINs`);

  // ── VLS Stepladder Breaks ─────────────────────────────────────────────────
  const vlsClin0001 = vlsClins.find((c) => c.clinNumber === "0001");
  const vlsClin0002 = vlsClins.find((c) => c.clinNumber === "0002");

  await prisma.stepladderBreak.deleteMany({
    where: { clinId: { in: [vlsClin0001.id, vlsClin0002.id] } },
  });

  await prisma.stepladderBreak.createMany({
    data: [
      // CLIN 0001 — VLS Launcher Assemblies
      { clinId: vlsClin0001.id, breakMin: 1,  breakMax: 10,   unitPrice: 2_850_000, mlqProbability: 0.15 },
      { clinId: vlsClin0001.id, breakMin: 11, breakMax: 25,   unitPrice: 2_650_000, mlqProbability: 0.50 },
      { clinId: vlsClin0001.id, breakMin: 26, breakMax: 50,   unitPrice: 2_450_000, mlqProbability: 0.25 },
      { clinId: vlsClin0001.id, breakMin: 51, breakMax: null, unitPrice: 2_250_000, mlqProbability: 0.10 },
      // CLIN 0002 — Spare Parts Package
      { clinId: vlsClin0002.id, breakMin: 1,  breakMax: 5,    unitPrice: 185_000, mlqProbability: 0.20 },
      { clinId: vlsClin0002.id, breakMin: 6,  breakMax: 15,   unitPrice: 165_000, mlqProbability: 0.55 },
      { clinId: vlsClin0002.id, breakMin: 16, breakMax: null, unitPrice: 145_000, mlqProbability: 0.25 },
    ],
  });
  console.log("  ✓ 7 stepladder breaks (4 for CLIN 0001, 3 for CLIN 0002)");

  // ── VLS Competitors ───────────────────────────────────────────────────────
  const vlsCompDefs = [
    { name: "OurCo",       isOurCompany: true,  companyType: "PRIVATE" },
    { name: "Raytheon",    isOurCompany: false, companyType: "PUBLIC" },
    { name: "L3Harris",    isOurCompany: false, companyType: "PUBLIC" },
    { name: "BAE Systems", isOurCompany: false, companyType: "PUBLIC" },
  ];

  const vlsComps = [];
  for (const d of vlsCompDefs) {
    vlsComps.push(await upsertCompetitor(vls.id, d.name, d));
  }
  const [vlsOurCo, vlsRaytheon, vlsL3Harris, vlsBAE] = vlsComps;
  console.log(`  ✓ ${vlsComps.length} competitors`);

  // ── VLS Rate Profiles ─────────────────────────────────────────────────────
  const vlsRateProfileDefs = [
    { competitorId: vlsOurCo.id,     primeSubkMix: 0.30, mfgOHRate: 85, gaRate: 12, valueAddedGA: false, feeRate: 10 },
    { competitorId: vlsRaytheon.id,  mfgOHRate: 92, gaRate: 13, valueAddedGA: false, feeRate: 11 },
    { competitorId: vlsL3Harris.id,  mfgOHRate: 88, gaRate: 11, valueAddedGA: true,  feeRate: 10 },
    { competitorId: vlsBAE.id,       mfgOHRate: 95, gaRate: 14, valueAddedGA: false, feeRate: 10 },
  ];

  for (const rp of vlsRateProfileDefs) {
    await prisma.competitorRateProfile.upsert({
      where:  { competitorId: rp.competitorId },
      update: { contractId: vls.id, ...rp },
      create: { contractId: vls.id, ...rp },
    });
  }
  console.log(`  ✓ ${vlsRateProfileDefs.length} rate profiles`);

  // ── VLS Scenarios ─────────────────────────────────────────────────────────
  await prisma.scenario.deleteMany({ where: { contractId: vls.id } });
  const vlsScenarios = await Promise.all([
    prisma.scenario.create({ data: { contractId: vls.id, name: "Base Case",  isBaseline: true  } }),
    prisma.scenario.create({ data: { contractId: vls.id, name: "Aggressive", isBaseline: false } }),
  ]);
  console.log(`  ✓ ${vlsScenarios.length} scenarios\n`);

  // ── Final row counts ──────────────────────────────────────────────────────
  const [
    contractCount,
    clinCount,
    clinInTEP,
    clinNonTEP,
    stepladderCount,
    competitorCount,
    rateProfileCount,
    scenarioCount,
    geoCount,
  ] = await Promise.all([
    prisma.contract.count(),
    prisma.clin.count(),
    prisma.clin.count({ where: { isInTEP: true } }),
    prisma.clin.count({ where: { isInTEP: false } }),
    prisma.stepladderBreak.count(),
    prisma.competitor.count(),
    prisma.competitorRateProfile.count(),
    prisma.scenario.count(),
    prisma.geographicIndex.count(),
  ]);

  console.log("✅ Database seeded successfully!\n");
  console.log("   Table               Rows");
  console.log("   ─────────────────── ────");
  console.log(`   Contract            ${contractCount}`);
  console.log(`   Clin                ${clinCount}  (${clinInTEP} in TEP, ${clinNonTEP} non-TEP)`);
  console.log(`   StepladderBreak     ${stepladderCount}`);
  console.log(`   Competitor          ${competitorCount}`);
  console.log(`   CompetitorRateProf  ${rateProfileCount}`);
  console.log(`   Scenario            ${scenarioCount}`);
  console.log(`   GeographicIndex     ${geoCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
