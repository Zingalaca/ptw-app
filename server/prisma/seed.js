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

  // ── Competitor Rate Profiles ───────────────────────────────────────────────
  // Company-level overhead/burden rate assumptions keyed by competitor
  const rateProfileData = [
    {
      // OurCo — own company (competitorId: null)
      competitorId: null,
      companyName: "Our Company",
      companyType: "private",
      engLocation: "Washington DC Metro",
      prodLocation: "Hampton Roads VA",
      engGeoOffset: 0,
      prodGeoOffset: 0,
      fringeInOH: true,
      engOHRate: 95,
      mfgOHRate: 85,
      materialHandlingRate: 5,
      subkHandlingRate: 3,
      gaRate: 12,
      feeRate: 10,
      valueAddedGA: false,
      escalationRate: 3,
    },
    {
      // Leidos Inc. — index 0
      companyName: "Leidos Inc.",
      companyType: "public",
      engLocation: "Reston VA",
      prodLocation: "Various",
      engGeoOffset: 0,
      prodGeoOffset: 0,
      fringeInOH: true,
      engOHRate: 88,
      mfgOHRate: 78,
      materialHandlingRate: 4,
      subkHandlingRate: 2,
      gaRate: 11,
      feeRate: 10,
      valueAddedGA: false,
      escalationRate: 3,
    },
    {
      // Booz Allen Hamilton — index 1
      companyName: "Booz Allen Hamilton",
      companyType: "public",
      engLocation: "McLean VA",
      prodLocation: "N/A",
      engGeoOffset: 0,
      prodGeoOffset: 0,
      fringeInOH: true,
      engOHRate: 110,
      mfgOHRate: 95,
      materialHandlingRate: 5,
      subkHandlingRate: 3,
      gaRate: 14,
      feeRate: 10,
      valueAddedGA: false,
      escalationRate: 3,
    },
    {
      // SAIC — index 2
      companyName: "SAIC",
      companyType: "public",
      engLocation: "Reston VA",
      prodLocation: "San Diego CA",
      engGeoOffset: 0,
      prodGeoOffset: 0,
      fringeInOH: true,
      engOHRate: 92,
      mfgOHRate: 82,
      materialHandlingRate: 4,
      subkHandlingRate: 2,
      gaRate: 13,
      feeRate: 10,
      valueAddedGA: false,
      escalationRate: 3,
    },
    {
      // Peraton Inc. — index 3; uses Value-Added G&A (key differentiator)
      companyName: "Peraton Inc.",
      companyType: "public",
      engLocation: "Herndon VA",
      prodLocation: "Various",
      engGeoOffset: 0,
      prodGeoOffset: 0,
      fringeInOH: true,
      engOHRate: 98,
      mfgOHRate: 88,
      materialHandlingRate: 5,
      subkHandlingRate: 3,
      gaRate: 15,
      feeRate: 9,
      valueAddedGA: true,
      escalationRate: 3,
    },
  ];

  // OurCo profile (competitorId=null — upsert by contractId match)
  const ourCoProfile = rateProfileData[0];
  const existingOurCo = await prisma.competitorRateProfile.findFirst({
    where: { competitorId: null, contractId: contract.id },
  });
  if (existingOurCo) {
    await prisma.competitorRateProfile.update({
      where: { id: existingOurCo.id },
      data: { contractId: contract.id, ...ourCoProfile },
    });
  } else {
    await prisma.competitorRateProfile.create({
      data: { contractId: contract.id, ...ourCoProfile },
    });
  }

  // Competitor profiles (competitorId set from seeded competitors array)
  let rateProfileCount = 1; // OurCo already counted
  for (let i = 0; i < competitors.length; i++) {
    const comp = competitors[i];
    const profileData = rateProfileData[i + 1]; // offset by 1 (OurCo is index 0)
    if (!profileData) continue;
    await prisma.competitorRateProfile.upsert({
      where: { competitorId: comp.id },
      update: { contractId: contract.id, ...profileData },
      create: { competitorId: comp.id, contractId: contract.id, ...profileData },
    });
    rateProfileCount++;
  }
  console.log(`  ✓ ${rateProfileCount} competitor rate profiles`);

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

  // ── Clean slate for re-seedable data ─────────────────────────────────────
  // scenarios, rateAssumptions and tepResults use create() not upsert,
  // so wipe them before recreating to keep re-runs idempotent.
  await prisma.tepResult.deleteMany({});
  await prisma.rateAssumption.deleteMany({});
  await prisma.scenario.deleteMany({ where: { contractId: contract.id } });
  console.log("  ✓ Cleared prior scenarios, rate assumptions, and TEP results");

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

  // ── TEP Results — all three scenarios ────────────────────────────────────
  // competitor[0]=Leidos  [1]=BAH  [2]=SAIC  [3]=Peraton
  // competitorId: null  = OurCo own estimate
  //
  // Pricing rationale:
  //   Base Case      1.00×  |  OurCo $317M  (−7.1% vs Peraton $341M)
  //   Conservative  +1.15×  |  OurCo $365M  (−6.9% vs Peraton $392M)
  //   Aggressive    −0.90×  |  OurCo $283M  (−7.8% vs Peraton $307M)
  //
  // OurCo is positioned as a Strong Incumbent — 7% below lowest competitor
  // reflects transition-risk advantage without leaving money on the table.

  function scenarioRows(sc, leidos, bah, saic, peraton, ourco) {
    const rows = [];
    const groups = [
      { competitorId: competitors[0].id, prices: leidos,  score: 88 },
      { competitorId: competitors[1].id, prices: bah,     score: 92 },
      { competitorId: competitors[2].id, prices: saic,    score: 84 },
      { competitorId: competitors[3].id, prices: peraton, score: 80 },
      { competitorId: null,              prices: ourco,   score: null },
    ];
    for (const { competitorId, prices, score } of groups) {
      ["0001", "0002", "0003", "0004"].forEach((clinNum, i) => {
        rows.push({ scenarioId: sc.id, competitorId, clinNumber: clinNum, totalPrice: prices[i], technicalScore: score });
      });
    }
    return rows;
  }

  const tepData = [
    // ── Base Case ─────────────────────────────────────────────────────────
    ...scenarioRows(baseCase,
      [185_000_000, 152_000_000, 28_000_000, 22_000_000],  // Leidos   $387M
      [197_000_000, 161_000_000, 30_000_000, 24_000_000],  // BAH      $412M
      [175_000_000, 144_000_000, 25_000_000, 19_000_000],  // SAIC     $363M
      [168_000_000, 137_000_000, 22_000_000, 14_000_000],  // Peraton  $341M  ← lowest
      [157_000_000, 128_000_000, 20_000_000, 12_000_000],  // OurCo    $317M  (−7.0%)
    ),

    // ── Conservative (+15%) ───────────────────────────────────────────────
    ...scenarioRows(conservative,
      [213_000_000, 175_000_000, 32_000_000, 25_000_000],  // Leidos   $445M
      [227_000_000, 185_000_000, 35_000_000, 28_000_000],  // BAH      $475M
      [201_000_000, 166_000_000, 29_000_000, 22_000_000],  // SAIC     $418M
      [193_000_000, 158_000_000, 25_000_000, 16_000_000],  // Peraton  $392M  ← lowest
      [181_000_000, 147_000_000, 23_000_000, 14_000_000],  // OurCo    $365M  (−6.9%)
    ),

    // ── Aggressive (−10%) ─────────────────────────────────────────────────
    ...scenarioRows(aggressive,
      [167_000_000, 137_000_000, 25_000_000, 20_000_000],  // Leidos   $349M
      [177_000_000, 145_000_000, 27_000_000, 22_000_000],  // BAH      $371M
      [158_000_000, 130_000_000, 23_000_000, 17_000_000],  // SAIC     $328M
      [151_000_000, 123_000_000, 20_000_000, 13_000_000],  // Peraton  $307M  ← lowest
      [140_000_000, 114_000_000, 18_000_000, 11_000_000],  // OurCo    $283M  (−7.8%)
    ),
  ];

  // ── Rate assumptions per competitor (stored in CLIN 0001 base-case breakdown) ─
  // These populate the Rate Model form when a competitor is selected.
  const competitorRateAssumptions = [
    { // Leidos
      companyName: 'Leidos Inc.', companyType: 'public', comparablePublicCompany: '',
      engLocation: 'Washington DC Metro', engGeoOffset: '28.00',
      prodLocation: 'Hampton Roads', prodGeoOffset: '8.00',
      fringeIncludedInOH: false, fringeRate: '32.00',
      engOHRate: '28.00', mfgOHRate: '24.00',
      materialHandlingRate: '5.00', subKHandlingRate: '3.00',
      gaRate: '12.00', feeRate: '8.00', escalationRate: '3.00',
    },
    { // Booz Allen Hamilton
      companyName: 'Booz Allen Hamilton', companyType: 'public', comparablePublicCompany: '',
      engLocation: 'Washington DC Metro', engGeoOffset: '28.00',
      prodLocation: 'Washington DC Metro', prodGeoOffset: '28.00',
      fringeIncludedInOH: true, fringeRate: '',
      engOHRate: '35.00', mfgOHRate: '30.00',
      materialHandlingRate: '6.00', subKHandlingRate: '4.00',
      gaRate: '14.00', feeRate: '10.00', escalationRate: '3.00',
    },
    { // SAIC
      companyName: 'SAIC (Science Applications International Corporation)', companyType: 'public', comparablePublicCompany: '',
      engLocation: 'National Average', engGeoOffset: '0.00',
      prodLocation: 'National Average', prodGeoOffset: '0.00',
      fringeIncludedInOH: false, fringeRate: '30.00',
      engOHRate: '25.00', mfgOHRate: '20.00',
      materialHandlingRate: '4.50', subKHandlingRate: '3.00',
      gaRate: '11.00', feeRate: '7.00', escalationRate: '3.00',
    },
    { // Peraton
      companyName: 'Peraton Inc.', companyType: 'public', comparablePublicCompany: '',
      engLocation: 'San Antonio', engGeoOffset: '-5.00',
      prodLocation: 'San Antonio', prodGeoOffset: '-5.00',
      fringeIncludedInOH: false, fringeRate: '28.00',
      engOHRate: '22.00', mfgOHRate: '18.00',
      materialHandlingRate: '4.00', subKHandlingRate: '2.50',
      gaRate: '10.00', feeRate: '6.00', escalationRate: '3.00',
    },
  ];

  // Map competitorId → rateAssumption for quick lookup
  const raByCompetitor = new Map(
    competitors.map((c, i) => [c.id, competitorRateAssumptions[i]])
  );

  const clinMap = Object.fromEntries(clins.map((c) => [c.clinNumber, c]));

  const tepResults = [];
  for (const tep of tepData) {
    const { clinNumber, scenarioId, ...rest } = tep;
    const clin = clinMap[clinNumber];

    // Attach rateAssumption to base-case CLIN 0001 for each named competitor
    const rateAssumption =
      scenarioId === baseCase.id && clinNumber === '0001' && rest.competitorId != null
        ? raByCompetitor.get(rest.competitorId) ?? undefined
        : undefined;

    const record = await prisma.tepResult.create({
      data: {
        scenarioId,
        clinId: clin.id,
        evaluatedPrice: rest.totalPrice,
        notes: `Analyst estimate — CLIN ${clin.clinNumber}`,
        breakdown: {
          laborHours: clin.quantity,
          laborCost: rest.totalPrice * 0.76,
          odcs:       rest.totalPrice * 0.10,
          fee:        rest.totalPrice * 0.09,
          ...(rateAssumption ? { rateAssumption } : {}),
        },
        ...rest,
      },
    });
    tepResults.push(record);
  }
  const perScenario = tepResults.length / 3;
  console.log(`  ✓ ${tepResults.length} TEP results (3 scenarios × ${perScenario} records each)`);

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
