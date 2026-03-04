// Synthetic demo data for the PTW (Price to Win) application
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ── Geographic Indices ────────────────────────────────────────────────────
  const geoIndices = await Promise.all([
    prisma.geographicIndex.upsert({
      where: { location_effectiveYear: { location: "Washington DC Metro", effectiveYear: 2025 } },
      update: {},
      create: {
        location: "Washington DC Metro",
        state: "DC",
        msa: "Washington-Arlington-Alexandria DC-VA-MD-WV",
        index: 1.28,
        source: "BLS",
        effectiveYear: 2025,
      },
    }),
    prisma.geographicIndex.upsert({
      where: { location_effectiveYear: { location: "Hampton Roads", effectiveYear: 2025 } },
      update: {},
      create: {
        location: "Hampton Roads",
        state: "VA",
        msa: "Virginia Beach-Norfolk-Newport News VA-NC",
        index: 1.08,
        source: "BLS",
        effectiveYear: 2025,
      },
    }),
    prisma.geographicIndex.upsert({
      where: { location_effectiveYear: { location: "San Antonio", effectiveYear: 2025 } },
      update: {},
      create: {
        location: "San Antonio",
        state: "TX",
        msa: "San Antonio-New Braunfels TX",
        index: 0.95,
        source: "BLS",
        effectiveYear: 2025,
      },
    }),
    prisma.geographicIndex.upsert({
      where: { location_effectiveYear: { location: "Denver", effectiveYear: 2025 } },
      update: {},
      create: {
        location: "Denver",
        state: "CO",
        msa: "Denver-Aurora-Lakewood CO",
        index: 1.12,
        source: "BLS",
        effectiveYear: 2025,
      },
    }),
    prisma.geographicIndex.upsert({
      where: { location_effectiveYear: { location: "National Average", effectiveYear: 2025 } },
      update: {},
      create: {
        location: "National Average",
        state: "US",
        msa: null,
        index: 1.0,
        source: "BLS",
        effectiveYear: 2025,
      },
    }),
  ]);
  console.log(`  ✓ ${geoIndices.length} geographic indices`);

  // ── Contract ──────────────────────────────────────────────────────────────
  const contract = await prisma.contract.upsert({
    where: { contractNumber: "W91WAW-26-R-0042" },
    update: {},
    create: {
      contractNumber: "W91WAW-26-R-0042",
      title: "Army Intelligence Systems Modernization (AISM)",
      agency: "U.S. Army",
      description:
        "Full lifecycle support for modernization of the Army's intelligence data processing and analysis platforms, including systems engineering, software development, cybersecurity, and program management support.",
      naicsCode: "541512",
      setAside: "Full and Open",
      popStart: new Date("2026-10-01"),
      popEnd: new Date("2031-09-30"),
      status: "OPEN",
    },
  });
  console.log(`  ✓ Contract: ${contract.contractNumber}`);

  // ── CLINs ─────────────────────────────────────────────────────────────────
  const clinData = [
    {
      clinNumber: "0001",
      description: "Base Year – Systems Engineering & Technical Assistance (SETA)",
      clinType: "T&M",
      quantity: 50000,
      unit: "HOUR",
      isOption: false,
      optionYear: 0,
    },
    {
      clinNumber: "0002",
      description: "Base Year – Software Development & Integration",
      clinType: "T&M",
      quantity: 40000,
      unit: "HOUR",
      isOption: false,
      optionYear: 0,
    },
    {
      clinNumber: "0003",
      description: "Base Year – Program Management Support",
      clinType: "FFP",
      quantity: 1,
      unit: "LOT",
      isOption: false,
      optionYear: 0,
    },
    {
      clinNumber: "0004",
      description: "Base Year – Other Direct Costs (ODCs)",
      clinType: "CPFF",
      quantity: 1,
      unit: "LOT",
      isOption: false,
      optionYear: 0,
    },
    {
      clinNumber: "1001",
      description: "Option Year 1 – Systems Engineering & Technical Assistance (SETA)",
      clinType: "T&M",
      quantity: 52000,
      unit: "HOUR",
      isOption: true,
      optionYear: 1,
    },
    {
      clinNumber: "1002",
      description: "Option Year 1 – Software Development & Integration",
      clinType: "T&M",
      quantity: 42000,
      unit: "HOUR",
      isOption: true,
      optionYear: 1,
    },
  ];

  const clins = [];
  for (const clin of clinData) {
    const record = await prisma.clin.upsert({
      where: { contractId_clinNumber: { contractId: contract.id, clinNumber: clin.clinNumber } },
      update: {},
      create: { contractId: contract.id, ...clin },
    });
    clins.push(record);
  }
  console.log(`  ✓ ${clins.length} CLINs`);

  // ── Competitors ───────────────────────────────────────────────────────────
  const competitorData = [
    {
      name: "Leidos Inc.",
      dunsNumber: "065206952",
      gsaScheduleNumber: "GS-00F-009CA",
      historicalWinRate: 0.38,
      estimatedRevenue: 14800,
      strengths: "Strong Army customer relationships; proven incumbent performance on similar programs; deep cleared workforce.",
      weaknesses: "Higher overhead structure due to large corporate infrastructure; less agile on price.",
      likelyBidPrice: 487500000,
    },
    {
      name: "Booz Allen Hamilton",
      dunsNumber: "006928857",
      gsaScheduleNumber: "GS-10F-0091J",
      historicalWinRate: 0.42,
      estimatedRevenue: 9400,
      strengths: "Dominant intelligence community reputation; top-tier cleared talent pipeline; strong PM bench.",
      weaknesses: "Premium pricing strategy; may be over-staffed relative to scope requirements.",
      likelyBidPrice: 512000000,
    },
    {
      name: "SAIC (Science Applications International Corporation)",
      dunsNumber: "809958885",
      gsaScheduleNumber: "GS-35F-0119Y",
      historicalWinRate: 0.31,
      estimatedRevenue: 7600,
      strengths: "Competitive labor rates; proven modernization delivery; strong subcontractor network.",
      weaknesses: "Recent protest history on Army awards; turnover challenges in cyber workforce.",
      likelyBidPrice: 463000000,
    },
    {
      name: "Peraton Inc.",
      dunsNumber: "198614200",
      gsaScheduleNumber: null,
      historicalWinRate: 0.27,
      estimatedRevenue: 6200,
      strengths: "Aggressive pricing posture; strong NRO/DIA heritage; lean G&A structure.",
      weaknesses: "Smaller cleared workforce pool; integration risk from recent acquisitions.",
      likelyBidPrice: 441000000,
    },
  ];

  const competitors = [];
  for (const comp of competitorData) {
    const record = await prisma.competitor.upsert({
      where: { id: competitors.length + 1 },
      update: {},
      create: { contractId: contract.id, ...comp },
    }).catch(() =>
      prisma.competitor.create({ data: { contractId: contract.id, ...comp } })
    );
    competitors.push(record);
  }
  console.log(`  ✓ ${competitors.length} competitors`);

  // ── Scenarios ─────────────────────────────────────────────────────────────
  const scenarioData = [
    {
      name: "Conservative",
      description: "High-cost estimate using senior labor mix and DC Metro rates. Models risk-adjusted pricing.",
      isBaseline: false,
    },
    {
      name: "Base Case",
      description: "Most-likely estimate using blended labor mix and national average rates. Primary PTW reference.",
      isBaseline: true,
    },
    {
      name: "Aggressive",
      description: "Low-cost estimate using junior labor mix and lower-cost geography. Models minimum-price strategy.",
      isBaseline: false,
    },
  ];

  const scenarios = [];
  for (const sc of scenarioData) {
    const record = await prisma.scenario.create({
      data: { contractId: contract.id, ...sc },
    });
    scenarios.push(record);
  }
  console.log(`  ✓ ${scenarios.length} scenarios`);

  const [conservative, baseCase, aggressive] = scenarios;
  const dcGeo = geoIndices[0];      // DC Metro 1.28
  const nationalGeo = geoIndices[4]; // National Average 1.0
  const sanAntonioGeo = geoIndices[2]; // San Antonio 0.95

  // ── Rate Assumptions ──────────────────────────────────────────────────────
  // Helper: compute wrapped rate
  const wrap = (base, geo, fringe, overhead, ga, fee) => {
    const adjusted = base * geo;
    return parseFloat(
      (adjusted * (1 + fringe) * (1 + overhead) * (1 + ga) * (1 + fee)).toFixed(2)
    );
  };

  const rateRows = [
    // ── Conservative Scenario (DC Metro, senior-heavy) ──
    {
      scenarioId: conservative.id,
      laborCategory: "Program Manager",
      level: "Senior",
      baseRate: 95.0,
      fringeRate: 0.32,
      overheadRate: 0.28,
      gaRate: 0.12,
      feeRate: 0.08,
      geographicIndexId: dcGeo.id,
    },
    {
      scenarioId: conservative.id,
      laborCategory: "Software Engineer",
      level: "Senior",
      baseRate: 85.0,
      fringeRate: 0.32,
      overheadRate: 0.28,
      gaRate: 0.12,
      feeRate: 0.08,
      geographicIndexId: dcGeo.id,
    },
    {
      scenarioId: conservative.id,
      laborCategory: "Systems Engineer",
      level: "Senior",
      baseRate: 82.0,
      fringeRate: 0.32,
      overheadRate: 0.28,
      gaRate: 0.12,
      feeRate: 0.08,
      geographicIndexId: dcGeo.id,
    },
    {
      scenarioId: conservative.id,
      laborCategory: "Cybersecurity Analyst",
      level: "Mid",
      baseRate: 75.0,
      fringeRate: 0.32,
      overheadRate: 0.28,
      gaRate: 0.12,
      feeRate: 0.08,
      geographicIndexId: dcGeo.id,
    },

    // ── Base Case Scenario (National Average, blended) ──
    {
      scenarioId: baseCase.id,
      laborCategory: "Program Manager",
      level: "Mid",
      baseRate: 88.0,
      fringeRate: 0.30,
      overheadRate: 0.25,
      gaRate: 0.11,
      feeRate: 0.07,
      geographicIndexId: nationalGeo.id,
    },
    {
      scenarioId: baseCase.id,
      laborCategory: "Software Engineer",
      level: "Mid",
      baseRate: 78.0,
      fringeRate: 0.30,
      overheadRate: 0.25,
      gaRate: 0.11,
      feeRate: 0.07,
      geographicIndexId: nationalGeo.id,
    },
    {
      scenarioId: baseCase.id,
      laborCategory: "Systems Engineer",
      level: "Mid",
      baseRate: 75.0,
      fringeRate: 0.30,
      overheadRate: 0.25,
      gaRate: 0.11,
      feeRate: 0.07,
      geographicIndexId: nationalGeo.id,
    },
    {
      scenarioId: baseCase.id,
      laborCategory: "Cybersecurity Analyst",
      level: "Mid",
      baseRate: 70.0,
      fringeRate: 0.30,
      overheadRate: 0.25,
      gaRate: 0.11,
      feeRate: 0.07,
      geographicIndexId: nationalGeo.id,
    },

    // ── Aggressive Scenario (San Antonio, junior-heavy) ──
    {
      scenarioId: aggressive.id,
      laborCategory: "Program Manager",
      level: "Mid",
      baseRate: 80.0,
      fringeRate: 0.28,
      overheadRate: 0.22,
      gaRate: 0.10,
      feeRate: 0.06,
      geographicIndexId: sanAntonioGeo.id,
    },
    {
      scenarioId: aggressive.id,
      laborCategory: "Software Engineer",
      level: "Junior",
      baseRate: 62.0,
      fringeRate: 0.28,
      overheadRate: 0.22,
      gaRate: 0.10,
      feeRate: 0.06,
      geographicIndexId: sanAntonioGeo.id,
    },
    {
      scenarioId: aggressive.id,
      laborCategory: "Systems Engineer",
      level: "Junior",
      baseRate: 60.0,
      fringeRate: 0.28,
      overheadRate: 0.22,
      gaRate: 0.10,
      feeRate: 0.06,
      geographicIndexId: sanAntonioGeo.id,
    },
    {
      scenarioId: aggressive.id,
      laborCategory: "Cybersecurity Analyst",
      level: "Junior",
      baseRate: 55.0,
      fringeRate: 0.28,
      overheadRate: 0.22,
      gaRate: 0.10,
      feeRate: 0.06,
      geographicIndexId: sanAntonioGeo.id,
    },
  ];

  const rateAssumptions = [];
  for (const row of rateRows) {
    const geoIdx = geoIndices.find((g) => g.id === row.geographicIndexId);
    const wrappedRate = wrap(
      row.baseRate,
      geoIdx.index,
      row.fringeRate,
      row.overheadRate,
      row.gaRate,
      row.feeRate
    );
    const record = await prisma.rateAssumption.create({
      data: { ...row, escalationRate: 0.03, wrappedRate },
    });
    rateAssumptions.push(record);
  }
  console.log(`  ✓ ${rateAssumptions.length} rate assumptions`);

  // ── TEP Results (Base Case scenario) ─────────────────────────────────────
  // Model each competitor's estimated total price per CLIN for the base case
  const tepData = [
    // Leidos estimates
    { competitorId: competitors[0].id, clinNumber: "0001", totalPrice: 185000000, evaluatedPrice: 185000000, technicalScore: 88 },
    { competitorId: competitors[0].id, clinNumber: "0002", totalPrice: 152000000, evaluatedPrice: 152000000, technicalScore: 88 },
    { competitorId: competitors[0].id, clinNumber: "0003", totalPrice: 28000000,  evaluatedPrice: 28000000,  technicalScore: 88 },
    { competitorId: competitors[0].id, clinNumber: "0004", totalPrice: 22000000,  evaluatedPrice: 22000000,  technicalScore: 88 },

    // Booz Allen estimates
    { competitorId: competitors[1].id, clinNumber: "0001", totalPrice: 197000000, evaluatedPrice: 197000000, technicalScore: 92 },
    { competitorId: competitors[1].id, clinNumber: "0002", totalPrice: 161000000, evaluatedPrice: 161000000, technicalScore: 92 },
    { competitorId: competitors[1].id, clinNumber: "0003", totalPrice: 30000000,  evaluatedPrice: 30000000,  technicalScore: 92 },
    { competitorId: competitors[1].id, clinNumber: "0004", totalPrice: 24000000,  evaluatedPrice: 24000000,  technicalScore: 92 },

    // SAIC estimates
    { competitorId: competitors[2].id, clinNumber: "0001", totalPrice: 175000000, evaluatedPrice: 175000000, technicalScore: 84 },
    { competitorId: competitors[2].id, clinNumber: "0002", totalPrice: 144000000, evaluatedPrice: 144000000, technicalScore: 84 },
    { competitorId: competitors[2].id, clinNumber: "0003", totalPrice: 25000000,  evaluatedPrice: 25000000,  technicalScore: 84 },
    { competitorId: competitors[2].id, clinNumber: "0004", totalPrice: 19000000,  evaluatedPrice: 19000000,  technicalScore: 84 },

    // Peraton estimates
    { competitorId: competitors[3].id, clinNumber: "0001", totalPrice: 168000000, evaluatedPrice: 168000000, technicalScore: 80 },
    { competitorId: competitors[3].id, clinNumber: "0002", totalPrice: 137000000, evaluatedPrice: 137000000, technicalScore: 80 },
    { competitorId: competitors[3].id, clinNumber: "0003", totalPrice: 22000000,  evaluatedPrice: 22000000,  technicalScore: 80 },
    { competitorId: competitors[3].id, clinNumber: "0004", totalPrice: 14000000,  evaluatedPrice: 14000000,  technicalScore: 80 },
  ];

  const clinMap = Object.fromEntries(clins.map((c) => [c.clinNumber, c]));

  const tepResults = [];
  for (const tep of tepData) {
    const { clinNumber, ...rest } = tep;
    const clin = clinMap[clinNumber];
    const record = await prisma.tepResult.create({
      data: {
        scenarioId: baseCase.id,
        clinId: clin.id,
        notes: `Base Case estimate for ${clin.clinNumber}`,
        breakdown: {
          laborHours: clin.quantity,
          laborCost: rest.totalPrice * 0.78,
          odcs: rest.totalPrice * 0.12,
          fee: rest.totalPrice * 0.10,
        },
        ...rest,
      },
    });
    tepResults.push(record);
  }
  console.log(`  ✓ ${tepResults.length} TEP results`);

  console.log("\n✅ Database seeded successfully!");
  console.log(`   Contract: ${contract.title}`);
  console.log(`   CLINs: ${clins.length} | Scenarios: ${scenarios.length} | Competitors: ${competitors.length}`);
  console.log(`   Rate Assumptions: ${rateAssumptions.length} | TEP Results: ${tepResults.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
