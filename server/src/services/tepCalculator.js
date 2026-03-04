/**
 * TEP (Total Evaluated Price) Calculation Engine
 *
 * Implements the full PTW cost-build-up chain:
 *
 *  Step 1 – Base rate × geographic index          = adjusted rate
 *  Step 2 – Adjusted rate × escalation^years      = escalated rate
 *  Step 3 – Escalated rate × hours                = direct labor
 *  Step 4 – Direct labor × (1+fringe) × (1+OH)   = loaded labor
 *  Step 5 – Loaded labor + ODCs + SubK + materials = cost before G&A
 *  Step 6 – Cost before G&A × (1 + G&A)           = total cost
 *  Step 7 – Fee on total cost OR on govt estimate  = fee
 *  Step 8 – Total cost + fee                       = TEP per CLIN
 *  Step 9 – Sum of CLIN TEPs                       = scenario TEP
 */

// ─── Step 1: Geographic Adjustment ──────────────────────────────────────────
/**
 * Multiply the base labor rate by the location cost index.
 * @param {number} baseRate   - Raw $/hour for this labor category
 * @param {number} geoIndex   - Cost-of-labor multiplier (1.0 = national avg)
 * @returns {number} Geographically adjusted $/hour
 */
export function adjustForGeography(baseRate, geoIndex) {
  return baseRate * geoIndex;
}

// ─── Step 2: Escalation (compounded) ────────────────────────────────────────
/**
 * Compound the adjusted rate over N option years.
 * Base year = 0 (no escalation). OY1 = 1, OY2 = 2, …
 * @param {number} adjustedRate    - Post-geographic $/hour
 * @param {number} escalationRate  - Annual escalation (decimal, e.g. 0.03)
 * @param {number} years           - Number of years of escalation to apply
 * @returns {number} Escalated $/hour
 */
export function escalate(adjustedRate, escalationRate, years) {
  return adjustedRate * Math.pow(1 + escalationRate, years);
}

// ─── Step 3: Direct Labor Cost ───────────────────────────────────────────────
/**
 * @param {number} escalatedRate - Fully escalated $/hour
 * @param {number} hours         - Most-Likely Quantity (MLQ) hours
 * @returns {number} Direct labor dollars
 */
export function calcDirectLabor(escalatedRate, hours) {
  return escalatedRate * hours;
}

// ─── Step 4: Loaded Labor ────────────────────────────────────────────────────
/**
 * Apply fringe (optionally) and overhead to direct labor.
 *
 * When fringe is carried separately (not embedded in the OH rate):
 *   loaded = direct × (1 + fringe) × (1 + overhead)
 * When fringe is already included in overhead:
 *   loaded = direct × (1 + overhead)
 *
 * @param {number}  directLabor      - Direct labor cost ($)
 * @param {number}  fringeRate       - Fringe benefit rate (decimal)
 * @param {boolean} fringeIsSeparate - True if fringe is a separate pool
 * @param {number}  overheadRate     - Overhead rate (decimal)
 * @returns {number} Loaded labor dollars
 */
export function calcLoadedLabor(directLabor, fringeRate, fringeIsSeparate, overheadRate) {
  const withFringe = fringeIsSeparate ? directLabor * (1 + fringeRate) : directLabor;
  return withFringe * (1 + overheadRate);
}

// ─── Step 5: Cost Before G&A ─────────────────────────────────────────────────
/**
 * Aggregate loaded labor with other cost elements.
 * Subcontractor costs and materials are marked up by their respective
 * handling/material-handling rates before being added.
 *
 * @param {number} loadedLabor           - Total loaded labor ($)
 * @param {number} odcs                  - Other Direct Costs ($)
 * @param {number} subkCosts             - Raw subcontractor pass-through ($)
 * @param {number} subkHandlingRate      - Handling rate applied to SubK (decimal)
 * @param {number} materials             - Raw materials cost ($)
 * @param {number} materialsHandlingRate - Handling rate applied to materials (decimal)
 * @returns {number} Cost before G&A ($)
 */
export function calcCostBeforeGA(
  loadedLabor,
  odcs,
  subkCosts,
  subkHandlingRate,
  materials,
  materialsHandlingRate,
) {
  return (
    loadedLabor +
    odcs +
    subkCosts * (1 + subkHandlingRate) +
    materials * (1 + materialsHandlingRate)
  );
}

// ─── Step 6: Total Cost ──────────────────────────────────────────────────────
/**
 * Apply G&A rate to the pre-G&A cost base.
 * @param {number} costBeforeGA - Aggregated cost before G&A ($)
 * @param {number} gaRate       - G&A rate (decimal)
 * @returns {number} Total cost ($)
 */
export function calcTotalCost(costBeforeGA, gaRate) {
  return costBeforeGA * (1 + gaRate);
}

// ─── Step 7: Fee ─────────────────────────────────────────────────────────────
/**
 * Calculate profit/fee.
 *
 * FEE_MODE.COST          – fee is a % of the contractor's total cost
 * FEE_MODE.GOVT_ESTIMATE – fee is a % of the government's independent cost
 *                          estimate (IGCE); useful for price-realism modeling
 *
 * @param {number}      totalCost    - Contractor total cost ($)
 * @param {number}      feeRate      - Fee rate (decimal, e.g. 0.08)
 * @param {'COST'|'GOVT_ESTIMATE'} feeMode
 * @param {number|null} govtEstimate - IGCE ($); required when feeMode='GOVT_ESTIMATE'
 * @returns {number} Fee ($)
 */
export function calcFee(totalCost, feeRate, feeMode, govtEstimate = null) {
  if (feeMode === 'GOVT_ESTIMATE' && govtEstimate != null) {
    return govtEstimate * feeRate;
  }
  return totalCost * feeRate;
}

// ─── Step 8: TEP per CLIN ────────────────────────────────────────────────────
/**
 * @param {number} totalCost - Contractor total cost ($)
 * @param {number} fee       - Profit/fee ($)
 * @returns {number} TEP for this CLIN ($)
 */
export function calcClinTep(totalCost, fee) {
  return totalCost + fee;
}

// ─── Step 9: Total TEP ───────────────────────────────────────────────────────
/**
 * Sum TEP across all CLINs to get the scenario total.
 * @param {number[]} clinTeps - Array of per-CLIN TEP values
 * @returns {number} Scenario-level TEP ($)
 */
export function sumClinTeps(clinTeps) {
  return clinTeps.reduce((sum, tep) => sum + tep, 0);
}

// ─── Full CLIN calculation (chains steps 1-8) ────────────────────────────────

/**
 * @typedef {Object} LaborLine
 * @property {string}  laborCategory
 * @property {number}  hours           - MLQ hours for this category on this CLIN
 * @property {number}  baseRate        - Raw $/hour (pre-geography)
 * @property {number}  [geoIndex=1.0]  - Geographic cost index
 * @property {number}  [escalationRate=0] - Annual escalation (decimal)
 * @property {number}  [years=0]       - Option year number (0=base)
 * @property {number}  [fringeRate=0]  - Fringe rate (decimal)
 * @property {number}  [overheadRate=0]- Overhead rate (decimal)
 */

/**
 * @typedef {Object} ClinCostInput
 * @property {LaborLine[]} laborLines
 * @property {number}  [odcs=0]
 * @property {number}  [subkCosts=0]
 * @property {number}  [subkHandlingRate=0]
 * @property {number}  [materials=0]
 * @property {number}  [materialsHandlingRate=0]
 * @property {number}  gaRate
 * @property {number}  feeRate
 * @property {'COST'|'GOVT_ESTIMATE'} [feeMode='COST']
 * @property {number|null} [govtEstimate=null]
 * @property {boolean} [fringeIsSeparate=true]
 */

/**
 * Run the full 8-step calculation chain for a single CLIN.
 * All cost elements default to zero; only gaRate and feeRate are required.
 *
 * @param {ClinCostInput} clinInput
 * @returns {{ tepPerClin, totalCost, fee, costBeforeGA, totalLoadedLabor,
 *             odcs, subkCostsWithHandling, materialsWithHandling, laborBreakdown }}
 */
export function calcFullClinCost(clinInput) {
  const {
    laborLines = [],
    odcs = 0,
    subkCosts = 0,
    subkHandlingRate = 0,
    materials = 0,
    materialsHandlingRate = 0,
    gaRate = 0,
    feeRate = 0,
    feeMode = 'COST',
    govtEstimate = null,
    fringeIsSeparate = true,
  } = clinInput;

  // Steps 1-4: process each labor line, accumulate loaded labor
  let totalLoadedLabor = 0;
  const laborBreakdown = laborLines.map((line) => {
    const geoIndex = line.geoIndex ?? 1.0;
    const years = line.years ?? 0;
    const escalationRate = line.escalationRate ?? 0;
    const fringeRate = line.fringeRate ?? 0;
    const overheadRate = line.overheadRate ?? 0;

    const adjustedRate = adjustForGeography(line.baseRate, geoIndex);       // Step 1
    const escalatedRate = escalate(adjustedRate, escalationRate, years);     // Step 2
    const directLabor = calcDirectLabor(escalatedRate, line.hours);          // Step 3
    const loadedLabor = calcLoadedLabor(                                     // Step 4
      directLabor, fringeRate, fringeIsSeparate, overheadRate,
    );

    totalLoadedLabor += loadedLabor;

    return {
      laborCategory: line.laborCategory,
      hours: line.hours,
      adjustedRate,
      escalatedRate,
      directLabor,
      loadedLabor,
    };
  });

  const subkCostsWithHandling = subkCosts * (1 + subkHandlingRate);
  const materialsWithHandling = materials * (1 + materialsHandlingRate);

  const costBeforeGA = calcCostBeforeGA(                                     // Step 5
    totalLoadedLabor, odcs, subkCosts, subkHandlingRate, materials, materialsHandlingRate,
  );
  const totalCost = calcTotalCost(costBeforeGA, gaRate);                     // Step 6
  const fee = calcFee(totalCost, feeRate, feeMode, govtEstimate);            // Step 7
  const tepPerClin = calcClinTep(totalCost, fee);                            // Step 8

  return {
    tepPerClin,
    totalCost,
    fee,
    costBeforeGA,
    totalLoadedLabor,
    odcs,
    subkCostsWithHandling,
    materialsWithHandling,
    laborBreakdown,
  };
}

// ─── DB-aware service function ───────────────────────────────────────────────

/**
 * @typedef {Object} ClinicOverride
 * @property {number}  [clinId]
 * @property {string}  [clinNumber]
 * @property {Array<{laborCategory:string, hours:number}>} [laborMix]
 * @property {number}  [odcs]
 * @property {number}  [subkCosts]
 * @property {number}  [subkHandlingRate]
 * @property {number}  [materials]
 * @property {number}  [materialsHandlingRate]
 * @property {number}  [gaRate]
 * @property {number}  [feeRate]
 * @property {'COST'|'GOVT_ESTIMATE'} [feeMode]
 * @property {number|null} [govtEstimate]
 * @property {boolean} [fringeIsSeparate]
 */

/**
 * Fetch a scenario and its related data from the database, run the full TEP
 * calculation chain, persist results to TepResult, and return the summary.
 *
 * Per-CLIN labour mix defaults to distributing the CLIN's total quantity
 * evenly across all RateAssumptions in the scenario. Pass `clinCostInputs`
 * overrides to specify an explicit labour mix or non-zero ODC/SubK/materials.
 *
 * @param {number}           scenarioId
 * @param {object}           opts
 * @param {ClinicOverride[]} [opts.clinCostInputs=[]]  - Per-CLIN overrides
 * @param {object}           opts.prisma               - Prisma client instance
 * @returns {Promise<{scenarioId, scenarioName, totalTep, clinResults[]}>}
 */
export async function runTepCalculation(scenarioId, { clinCostInputs = [], prisma }) {
  // ── Fetch everything we need in two queries ────────────────────────────────
  const scenario = await prisma.scenario.findUniqueOrThrow({
    where: { id: scenarioId },
    include: {
      rateAssumptions: { include: { geographicIndex: true } },
      contract: { include: { clins: { orderBy: { clinNumber: 'asc' } } } },
    },
  });

  const { rateAssumptions, contract } = scenario;

  if (rateAssumptions.length === 0) {
    throw new Error(`Scenario ${scenarioId} has no rate assumptions — cannot calculate TEP.`);
  }

  // ── Process each CLIN ─────────────────────────────────────────────────────
  const clinResults = [];

  for (const clin of contract.clins) {
    const override = clinCostInputs.find(
      (c) => c.clinId === clin.id || c.clinNumber === clin.clinNumber,
    ) ?? {};

    const years = clin.optionYear ?? 0;

    // Build labor lines: use explicit mix or spread CLIN hours equally
    const laborLines = override.laborMix
      ? override.laborMix.map((mix) => {
          const ra = rateAssumptions.find((r) => r.laborCategory === mix.laborCategory);
          if (!ra) {
            throw new Error(
              `No RateAssumption found for labor category "${mix.laborCategory}" in scenario ${scenarioId}.`,
            );
          }
          return {
            laborCategory: ra.laborCategory,
            hours: mix.hours,
            baseRate: ra.baseRate,
            geoIndex: ra.geographicIndex?.index ?? 1.0,
            escalationRate: ra.escalationRate,
            years,
            fringeRate: ra.fringeRate,
            overheadRate: ra.overheadRate,
          };
        })
      : rateAssumptions.map((ra) => ({
          laborCategory: ra.laborCategory,
          hours: clin.quantity / rateAssumptions.length, // equal distribution
          baseRate: ra.baseRate,
          geoIndex: ra.geographicIndex?.index ?? 1.0,
          escalationRate: ra.escalationRate,
          years,
          fringeRate: ra.fringeRate,
          overheadRate: ra.overheadRate,
        }));

    // Use rates from first RateAssumption when not overridden
    // (G&A and fee are scenario-level in practice; grab from first record)
    const firstRa = rateAssumptions[0];

    const clinInput = {
      laborLines,
      odcs: override.odcs ?? 0,
      subkCosts: override.subkCosts ?? 0,
      subkHandlingRate: override.subkHandlingRate ?? 0,
      materials: override.materials ?? 0,
      materialsHandlingRate: override.materialsHandlingRate ?? 0,
      gaRate: override.gaRate ?? firstRa.gaRate,
      feeRate: override.feeRate ?? firstRa.feeRate,
      feeMode: override.feeMode ?? 'COST',
      govtEstimate: override.govtEstimate ?? null,
      fringeIsSeparate: override.fringeIsSeparate ?? true,
    };

    const result = calcFullClinCost(clinInput);

    // ── Upsert TepResult (competitorId=null = own/prime calculation) ─────────
    const existing = await prisma.tepResult.findFirst({
      where: { scenarioId, clinId: clin.id, competitorId: null },
    });

    const tepPayload = {
      scenarioId,
      clinId: clin.id,
      competitorId: null,
      totalPrice: result.tepPerClin,
      evaluatedPrice: result.tepPerClin,
      breakdown: result,
    };

    if (existing) {
      await prisma.tepResult.update({ where: { id: existing.id }, data: tepPayload });
    } else {
      await prisma.tepResult.create({ data: tepPayload });
    }

    clinResults.push({
      clinId: clin.id,
      clinNumber: clin.clinNumber,
      description: clin.description,
      clinType: clin.clinType,
      optionYear: clin.optionYear,
      ...result,
    });
  }

  const totalTep = sumClinTeps(clinResults.map((r) => r.tepPerClin));       // Step 9

  return {
    scenarioId,
    scenarioName: scenario.name,
    totalTep,
    clinResults,
  };
}
