import {
  adjustForGeography,
  escalate,
  calcDirectLabor,
  calcLoadedLabor,
  calcCostBeforeGA,
  calcTotalCost,
  calcFee,
  calcClinTep,
  sumClinTeps,
  calcFullClinCost,
} from '../tepCalculator.js';

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 – Geographic Adjustment
// ─────────────────────────────────────────────────────────────────────────────
describe('adjustForGeography', () => {
  it('scales rate up in a high-cost market', () => {
    expect(adjustForGeography(100, 1.28)).toBeCloseTo(128);
  });

  it('scales rate down in a low-cost market', () => {
    expect(adjustForGeography(100, 0.95)).toBeCloseTo(95);
  });

  it('returns the base rate unchanged for national average (index 1.0)', () => {
    expect(adjustForGeography(75.5, 1.0)).toBeCloseTo(75.5);
  });

  it('handles zero base rate', () => {
    expect(adjustForGeography(0, 1.28)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 – Escalation
// ─────────────────────────────────────────────────────────────────────────────
describe('escalate', () => {
  it('returns the rate unchanged in the base year (years=0)', () => {
    expect(escalate(128, 0.03, 0)).toBeCloseTo(128);
  });

  it('compounds once for option year 1', () => {
    // 128 × 1.03¹ = 131.84
    expect(escalate(128, 0.03, 1)).toBeCloseTo(131.84);
  });

  it('compounds twice for option year 2', () => {
    // 100 × 1.03² = 106.09
    expect(escalate(100, 0.03, 2)).toBeCloseTo(106.09);
  });

  it('compounds five times for option year 5', () => {
    // 100 × 1.03⁵ = 115.927...
    expect(escalate(100, 0.03, 5)).toBeCloseTo(115.927, 2);
  });

  it('returns the base rate when escalation rate is zero', () => {
    expect(escalate(200, 0, 3)).toBeCloseTo(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 – Direct Labor Cost
// ─────────────────────────────────────────────────────────────────────────────
describe('calcDirectLabor', () => {
  it('multiplies rate by hours', () => {
    expect(calcDirectLabor(128, 1000)).toBeCloseTo(128_000);
  });

  it('handles fractional hours', () => {
    expect(calcDirectLabor(75.5, 500.5)).toBeCloseTo(75.5 * 500.5);
  });

  it('returns zero for zero hours', () => {
    expect(calcDirectLabor(128, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 – Loaded Labor
// ─────────────────────────────────────────────────────────────────────────────
describe('calcLoadedLabor', () => {
  it('applies fringe then overhead when fringe is separate', () => {
    // 100,000 × 1.30 × 1.25 = 162,500
    expect(calcLoadedLabor(100_000, 0.30, true, 0.25)).toBeCloseTo(162_500);
  });

  it('skips fringe multiplication when fringe is embedded in overhead', () => {
    // 100,000 × 1.25 = 125,000
    expect(calcLoadedLabor(100_000, 0.30, false, 0.25)).toBeCloseTo(125_000);
  });

  it('applies only overhead when fringe rate is zero', () => {
    // 100,000 × 1.0 × 1.25 = 125,000  (same as fringeIsSeparate=false)
    expect(calcLoadedLabor(100_000, 0, true, 0.25)).toBeCloseTo(125_000);
  });

  it('returns direct labor unchanged when both rates are zero', () => {
    expect(calcLoadedLabor(50_000, 0, true, 0)).toBeCloseTo(50_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 – Cost Before G&A
// ─────────────────────────────────────────────────────────────────────────────
describe('calcCostBeforeGA', () => {
  it('sums loaded labor, ODCs, and marked-up SubK and materials', () => {
    //   loaded labor      100,000
    //   ODCs               10,000
    //   SubK  50,000 × 1.03 = 51,500
    //   mats   5,000 × 1.05 =  5,250
    //   total            166,750
    expect(
      calcCostBeforeGA(100_000, 10_000, 50_000, 0.03, 5_000, 0.05),
    ).toBeCloseTo(166_750);
  });

  it('ignores SubK and materials when they are zero', () => {
    expect(calcCostBeforeGA(100_000, 10_000, 0, 0.03, 0, 0.05)).toBeCloseTo(110_000);
  });

  it('includes only loaded labor when all other costs are zero', () => {
    expect(calcCostBeforeGA(80_000, 0, 0, 0, 0, 0)).toBeCloseTo(80_000);
  });

  it('adds a handling fee on SubK even at zero ODCs/materials', () => {
    // 0 + 0 + 20,000 × 1.05 + 0 = 21,000
    expect(calcCostBeforeGA(0, 0, 20_000, 0.05, 0, 0)).toBeCloseTo(21_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 – Total Cost
// ─────────────────────────────────────────────────────────────────────────────
describe('calcTotalCost', () => {
  it('applies G&A markup to cost before G&A', () => {
    // 166,750 × 1.12 = 186,760
    expect(calcTotalCost(166_750, 0.12)).toBeCloseTo(186_760);
  });

  it('returns cost unchanged when G&A rate is zero', () => {
    expect(calcTotalCost(100_000, 0)).toBeCloseTo(100_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 7 – Fee
// ─────────────────────────────────────────────────────────────────────────────
describe('calcFee', () => {
  describe('COST mode (default)', () => {
    it('calculates fee as a percentage of total cost', () => {
      // 186,760 × 0.08 = 14,940.80
      expect(calcFee(186_760, 0.08, 'COST')).toBeCloseTo(14_940.8);
    });

    it('returns zero fee when rate is zero', () => {
      expect(calcFee(186_760, 0, 'COST')).toBe(0);
    });
  });

  describe('GOVT_ESTIMATE mode', () => {
    it('calculates fee as a percentage of the government estimate', () => {
      // 200,000 × 0.08 = 16,000
      expect(calcFee(186_760, 0.08, 'GOVT_ESTIMATE', 200_000)).toBeCloseTo(16_000);
    });

    it('falls back to COST mode when govtEstimate is null', () => {
      expect(calcFee(186_760, 0.08, 'GOVT_ESTIMATE', null)).toBeCloseTo(14_940.8);
    });

    it('falls back to COST mode when govtEstimate is undefined', () => {
      expect(calcFee(186_760, 0.08, 'GOVT_ESTIMATE')).toBeCloseTo(14_940.8);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 8 – TEP per CLIN
// ─────────────────────────────────────────────────────────────────────────────
describe('calcClinTep', () => {
  it('adds fee to total cost', () => {
    expect(calcClinTep(186_760, 14_940.8)).toBeCloseTo(201_700.8);
  });

  it('returns total cost when fee is zero', () => {
    expect(calcClinTep(100_000, 0)).toBeCloseTo(100_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Step 9 – Total TEP
// ─────────────────────────────────────────────────────────────────────────────
describe('sumClinTeps', () => {
  it('sums an array of CLIN TEPs', () => {
    expect(sumClinTeps([100_000, 200_000, 50_000])).toBeCloseTo(350_000);
  });

  it('returns zero for an empty array', () => {
    expect(sumClinTeps([])).toBe(0);
  });

  it('handles a single CLIN', () => {
    expect(sumClinTeps([201_700.8])).toBeCloseTo(201_700.8);
  });

  it('handles decimal precision across many CLINs', () => {
    expect(sumClinTeps([1.1, 2.2, 3.3])).toBeCloseTo(6.6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// calcFullClinCost — full 8-step chain
// ─────────────────────────────────────────────────────────────────────────────
describe('calcFullClinCost', () => {
  // ── Worked example (single labour category, base year) ───────────────────
  // PM: base $80/hr, DC Metro geo 1.28, escalation 3%, year 0
  //   Step 1: 80 × 1.28 = 102.40
  //   Step 2: 102.40 × 1.03⁰ = 102.40
  //   Step 3: 102.40 × 1,000 hrs = 102,400
  //   Step 4: 102,400 × 1.30 × 1.25 = 166,400   (fringe separate)
  //   ODCs: 10,000
  //   Step 5: 166,400 + 10,000 = 176,400
  //   Step 6: 176,400 × 1.11 = 195,804
  //   Step 7: 195,804 × 0.07 = 13,706.28
  //   Step 8: 195,804 + 13,706.28 = 209,510.28
  const singleLaborInput = {
    laborLines: [
      {
        laborCategory: 'Program Manager',
        hours: 1_000,
        baseRate: 80,
        geoIndex: 1.28,
        escalationRate: 0.03,
        years: 0,
        fringeRate: 0.30,
        overheadRate: 0.25,
      },
    ],
    odcs: 10_000,
    subkCosts: 0,
    subkHandlingRate: 0,
    materials: 0,
    materialsHandlingRate: 0,
    gaRate: 0.11,
    feeRate: 0.07,
    feeMode: 'COST',
    fringeIsSeparate: true,
  };

  it('produces the correct tepPerClin for the single-labor worked example', () => {
    const { tepPerClin } = calcFullClinCost(singleLaborInput);
    expect(tepPerClin).toBeCloseTo(209_510.28, 1);
  });

  it('returns correct intermediate values', () => {
    const result = calcFullClinCost(singleLaborInput);
    expect(result.totalLoadedLabor).toBeCloseTo(166_400);
    expect(result.costBeforeGA).toBeCloseTo(176_400);
    expect(result.totalCost).toBeCloseTo(195_804);
    expect(result.fee).toBeCloseTo(13_706.28, 1);
  });

  // ── Escalation in option year 2 ──────────────────────────────────────────
  // SE: base $78/hr, national geo 1.0, escalation 3%, year 2
  //   Step 1: 78 × 1.0 = 78
  //   Step 2: 78 × 1.03² = 78 × 1.0609 = 82.7502
  //   Step 3: 82.7502 × 2,000 = 165,500.4
  //   Step 4: 165,500.4 × 1.30 × 1.28 = 275,393.47  (fringe separate)
  //   Step 5: 275,393.47 (no ODCs/SubK/materials)
  //   Step 6: 275,393.47 × 1.11 = 305,686.75
  //   Step 7: 305,686.75 × 0.07 = 21,398.07
  //   Step 8: 305,686.75 + 21,398.07 = 327,084.82
  it('correctly escalates rates for option year 2', () => {
    const { tepPerClin, laborBreakdown } = calcFullClinCost({
      laborLines: [
        {
          laborCategory: 'Software Engineer',
          hours: 2_000,
          baseRate: 78,
          geoIndex: 1.0,
          escalationRate: 0.03,
          years: 2,
          fringeRate: 0.30,
          overheadRate: 0.28,
        },
      ],
      gaRate: 0.11,
      feeRate: 0.07,
      fringeIsSeparate: true,
    });
    // escalated rate = 78 × 1.0609 = 82.7502
    expect(laborBreakdown[0].escalatedRate).toBeCloseTo(82.7502, 3);
    // direct labor = 82.7502 × 2,000 = 165,500.4
    expect(laborBreakdown[0].directLabor).toBeCloseTo(165_500.4, 0);
    expect(tepPerClin).toBeCloseTo(327_083.87, 0);
  });

  // ── Multiple labour categories ────────────────────────────────────────────
  it('sums loaded labor across multiple labour categories', () => {
    // PM:  base $80, geo 1.0, 1,000 hrs, fringe 0.30, OH 0.25 → direct 80,000 → loaded 130,000
    // Dev: base $70, geo 1.0, 2,000 hrs, fringe 0.30, OH 0.25 → direct 140,000 → loaded 227,500
    // Total loaded = 357,500
    const { totalLoadedLabor } = calcFullClinCost({
      laborLines: [
        { laborCategory: 'PM',  hours: 1_000, baseRate: 80, geoIndex: 1.0, fringeRate: 0.30, overheadRate: 0.25 },
        { laborCategory: 'Dev', hours: 2_000, baseRate: 70, geoIndex: 1.0, fringeRate: 0.30, overheadRate: 0.25 },
      ],
      gaRate: 0,
      feeRate: 0,
      fringeIsSeparate: true,
    });
    expect(totalLoadedLabor).toBeCloseTo(357_500);
  });

  // ── SubK and materials handling ───────────────────────────────────────────
  it('applies handling rates to SubK and materials before G&A', () => {
    // loaded labor 100,000 (no labor lines — forces 0)
    // SubK  50,000 × 1.03 = 51,500
    // mats   5,000 × 1.05 =  5,250
    // ODCs  10,000
    // costBeforeGA = 0 + 10,000 + 51,500 + 5,250 = 66,750
    const { costBeforeGA, subkCostsWithHandling, materialsWithHandling } = calcFullClinCost({
      laborLines: [],
      odcs: 10_000,
      subkCosts: 50_000,
      subkHandlingRate: 0.03,
      materials: 5_000,
      materialsHandlingRate: 0.05,
      gaRate: 0,
      feeRate: 0,
    });
    expect(subkCostsWithHandling).toBeCloseTo(51_500);
    expect(materialsWithHandling).toBeCloseTo(5_250);
    expect(costBeforeGA).toBeCloseTo(66_750);
  });

  // ── GOVT_ESTIMATE fee mode ────────────────────────────────────────────────
  it('calculates fee against govtEstimate when mode is GOVT_ESTIMATE', () => {
    // total cost = 100,000 × 1.11 = 111,000
    // fee = 200,000 × 0.07 = 14,000   ← on govt estimate, not contractor cost
    const { fee, totalCost } = calcFullClinCost({
      laborLines: [
        { laborCategory: 'PM', hours: 1_000, baseRate: 100, geoIndex: 1.0, fringeRate: 0, overheadRate: 0 },
      ],
      gaRate: 0.11,
      feeRate: 0.07,
      feeMode: 'GOVT_ESTIMATE',
      govtEstimate: 200_000,
    });
    expect(totalCost).toBeCloseTo(111_000);
    expect(fee).toBeCloseTo(14_000);
  });

  // ── Fringe embedded in overhead ───────────────────────────────────────────
  it('skips fringe step when fringeIsSeparate is false', () => {
    // direct labor 100,000; overhead 0.25; fringe 0.30 (ignored)
    // loaded = 100,000 × 1.25 = 125,000
    const { totalLoadedLabor } = calcFullClinCost({
      laborLines: [
        { laborCategory: 'Analyst', hours: 1_000, baseRate: 100, geoIndex: 1.0, fringeRate: 0.30, overheadRate: 0.25 },
      ],
      gaRate: 0,
      feeRate: 0,
      fringeIsSeparate: false,
    });
    expect(totalLoadedLabor).toBeCloseTo(125_000);
  });

  // ── Zero-cost CLIN (e.g. unfunded informational CLIN) ────────────────────
  it('handles a CLIN with no labor lines and no costs — returns zero TEP', () => {
    const { tepPerClin } = calcFullClinCost({
      laborLines: [],
      gaRate: 0.12,
      feeRate: 0.08,
    });
    expect(tepPerClin).toBe(0);
  });

  // ── Labour breakdown shape ────────────────────────────────────────────────
  it('returns a labor breakdown entry for each labor line', () => {
    const { laborBreakdown } = calcFullClinCost({
      laborLines: [
        { laborCategory: 'PM',  hours: 500, baseRate: 90, geoIndex: 1.0, fringeRate: 0.30, overheadRate: 0.25 },
        { laborCategory: 'Dev', hours: 800, baseRate: 75, geoIndex: 1.0, fringeRate: 0.30, overheadRate: 0.25 },
      ],
      gaRate: 0.11,
      feeRate: 0.07,
    });
    expect(laborBreakdown).toHaveLength(2);
    expect(laborBreakdown[0]).toMatchObject({ laborCategory: 'PM', hours: 500 });
    expect(laborBreakdown[1]).toMatchObject({ laborCategory: 'Dev', hours: 800 });
    // Each entry must expose the intermediate rates
    expect(laborBreakdown[0]).toHaveProperty('adjustedRate');
    expect(laborBreakdown[0]).toHaveProperty('escalatedRate');
    expect(laborBreakdown[0]).toHaveProperty('directLabor');
    expect(laborBreakdown[0]).toHaveProperty('loadedLabor');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Full scenario: two CLINs summed via sumClinTeps
// ─────────────────────────────────────────────────────────────────────────────
describe('end-to-end two-CLIN scenario', () => {
  it('total TEP equals sum of individual CLIN TEPs', () => {
    const baseInput = {
      laborLines: [
        { laborCategory: 'PM', hours: 1_000, baseRate: 80, geoIndex: 1.0, fringeRate: 0.30, overheadRate: 0.25 },
      ],
      gaRate: 0.11,
      feeRate: 0.07,
    };
    const oy1Input = {
      laborLines: [
        { laborCategory: 'PM', hours: 1_000, baseRate: 80, geoIndex: 1.0, escalationRate: 0.03, years: 1, fringeRate: 0.30, overheadRate: 0.25 },
      ],
      gaRate: 0.11,
      feeRate: 0.07,
    };

    const clin0001 = calcFullClinCost(baseInput);
    const clin1001 = calcFullClinCost(oy1Input);
    const total = sumClinTeps([clin0001.tepPerClin, clin1001.tepPerClin]);

    // OY1 TEP must be > base year (due to escalation)
    expect(clin1001.tepPerClin).toBeGreaterThan(clin0001.tepPerClin);
    // Total must equal the sum
    expect(total).toBeCloseTo(clin0001.tepPerClin + clin1001.tepPerClin);
  });
});
