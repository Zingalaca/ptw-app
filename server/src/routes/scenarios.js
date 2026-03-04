import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { runTepCalculation } from '../services/tepCalculator.js';

const router = Router();

// ─── Scenarios ────────────────────────────────────────────────────────────────

// GET /api/scenarios?contractId=
router.get('/', async (req, res) => {
  const contractId = req.query.contractId ? Number(req.query.contractId) : undefined;
  const scenarios = await prisma.scenario.findMany({
    where: contractId ? { contractId } : undefined,
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { rateAssumptions: true, tepResults: true } },
    },
  });
  res.json(scenarios);
});

// GET /api/scenarios/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: {
      rateAssumptions: {
        include: { geographicIndex: true },
        orderBy: { laborCategory: 'asc' },
      },
      contract: {
        select: { id: true, contractNumber: true, title: true, agency: true },
      },
    },
  });
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
  res.json(scenario);
});

// POST /api/scenarios
router.post('/', async (req, res) => {
  const { contractId, name, description, isBaseline, rateAssumptions } = req.body;

  if (!contractId || !name) {
    return res.status(400).json({ error: 'contractId and name are required' });
  }

  const scenario = await prisma.scenario.create({
    data: {
      contractId: Number(contractId),
      name,
      description,
      isBaseline: isBaseline ?? false,
      rateAssumptions: rateAssumptions?.length
        ? {
            create: rateAssumptions.map((ra) => ({
              laborCategory: ra.laborCategory,
              level: ra.level,
              baseRate: Number(ra.baseRate),
              escalationRate: ra.escalationRate != null ? Number(ra.escalationRate) : 0.03,
              fringeRate: Number(ra.fringeRate),
              overheadRate: Number(ra.overheadRate),
              gaRate: Number(ra.gaRate),
              feeRate: Number(ra.feeRate),
              wrappedRate: Number(ra.wrappedRate),
              geographicIndexId: ra.geographicIndexId ? Number(ra.geographicIndexId) : undefined,
            })),
          }
        : undefined,
    },
    include: {
      rateAssumptions: { include: { geographicIndex: true } },
    },
  });

  res.status(201).json(scenario);
});

// PUT /api/scenarios/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, isBaseline } = req.body;

  const scenario = await prisma.scenario.update({
    where: { id },
    data: { name, description, isBaseline },
  }).catch(() => null);

  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
  res.json(scenario);
});

// DELETE /api/scenarios/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  // Remove child records first to respect FK constraints
  await prisma.$transaction([
    prisma.tepResult.deleteMany({ where: { scenarioId: id } }),
    prisma.rateAssumption.deleteMany({ where: { scenarioId: id } }),
    prisma.scenario.delete({ where: { id } }),
  ]).catch(() => null);
  res.status(204).send();
});

// ─── Rate Assumptions (nested under scenario) ─────────────────────────────────

// GET /api/scenarios/:id/rates
router.get('/:id/rates', async (req, res) => {
  const scenarioId = Number(req.params.id);
  const rates = await prisma.rateAssumption.findMany({
    where: { scenarioId },
    include: { geographicIndex: true },
    orderBy: { laborCategory: 'asc' },
  });
  res.json(rates);
});

// POST /api/scenarios/:id/rates
router.post('/:id/rates', async (req, res) => {
  const scenarioId = Number(req.params.id);
  const { laborCategory, level, baseRate, escalationRate, fringeRate, overheadRate, gaRate, feeRate, wrappedRate, geographicIndexId } = req.body;

  if (!laborCategory || baseRate == null || fringeRate == null || overheadRate == null || gaRate == null || feeRate == null || wrappedRate == null) {
    return res.status(400).json({ error: 'laborCategory, baseRate, fringeRate, overheadRate, gaRate, feeRate, and wrappedRate are required' });
  }

  const ra = await prisma.rateAssumption.create({
    data: {
      scenarioId,
      laborCategory,
      level,
      baseRate: Number(baseRate),
      escalationRate: escalationRate != null ? Number(escalationRate) : 0.03,
      fringeRate: Number(fringeRate),
      overheadRate: Number(overheadRate),
      gaRate: Number(gaRate),
      feeRate: Number(feeRate),
      wrappedRate: Number(wrappedRate),
      geographicIndexId: geographicIndexId ? Number(geographicIndexId) : undefined,
    },
    include: { geographicIndex: true },
  });
  res.status(201).json(ra);
});

// PUT /api/scenarios/:scenarioId/rates/:rateId
router.put('/:scenarioId/rates/:rateId', async (req, res) => {
  const id = Number(req.params.rateId);
  const { laborCategory, level, baseRate, escalationRate, fringeRate, overheadRate, gaRate, feeRate, wrappedRate, geographicIndexId } = req.body;

  const ra = await prisma.rateAssumption.update({
    where: { id },
    data: {
      laborCategory,
      level,
      baseRate: baseRate != null ? Number(baseRate) : undefined,
      escalationRate: escalationRate != null ? Number(escalationRate) : undefined,
      fringeRate: fringeRate != null ? Number(fringeRate) : undefined,
      overheadRate: overheadRate != null ? Number(overheadRate) : undefined,
      gaRate: gaRate != null ? Number(gaRate) : undefined,
      feeRate: feeRate != null ? Number(feeRate) : undefined,
      wrappedRate: wrappedRate != null ? Number(wrappedRate) : undefined,
      geographicIndexId: geographicIndexId != null ? Number(geographicIndexId) : undefined,
    },
    include: { geographicIndex: true },
  }).catch(() => null);

  if (!ra) return res.status(404).json({ error: 'Rate assumption not found' });
  res.json(ra);
});

// DELETE /api/scenarios/:scenarioId/rates/:rateId
router.delete('/:scenarioId/rates/:rateId', async (req, res) => {
  const id = Number(req.params.rateId);
  await prisma.rateAssumption.delete({ where: { id } }).catch(() => null);
  res.status(204).send();
});

// ─── Calculate ────────────────────────────────────────────────────────────────

// POST /api/scenarios/:id/calculate
// Body: { clinCostInputs?: [...] }
router.post('/:id/calculate', async (req, res) => {
  const scenarioId = Number(req.params.id);
  const { clinCostInputs = [] } = req.body;

  const result = await runTepCalculation(scenarioId, { clinCostInputs, prisma });
  res.json(result);
});

// ─── Results ──────────────────────────────────────────────────────────────────

// GET /api/scenarios/:id/results
// Returns TEP results grouped by CLIN, with competitor breakdowns
router.get('/:id/results', async (req, res) => {
  const scenarioId = Number(req.params.id);

  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    select: { id: true, name: true, contractId: true },
  });
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

  const results = await prisma.tepResult.findMany({
    where: { scenarioId },
    include: {
      clin: true,
      competitor: { select: { id: true, name: true } },
    },
    orderBy: [{ clin: { clinNumber: 'asc' } }, { competitorId: 'asc' }],
  });

  // Group by CLIN
  const byClin = results.reduce((acc, r) => {
    const key = r.clinId;
    if (!acc[key]) {
      acc[key] = {
        clinId: r.clin.id,
        clinNumber: r.clin.clinNumber,
        description: r.clin.description,
        clinType: r.clin.clinType,
        isOption: r.clin.isOption,
        optionYear: r.clin.optionYear,
        entries: [],
      };
    }
    acc[key].entries.push({
      tepResultId: r.id,
      competitorId: r.competitorId,
      competitorName: r.competitor?.name ?? 'Own Estimate',
      totalPrice: r.totalPrice,
      evaluatedPrice: r.evaluatedPrice,
      technicalScore: r.technicalScore,
      notes: r.notes,
      breakdown: r.breakdown,
    });
    return acc;
  }, {});

  const clinResults = Object.values(byClin);

  // Compute totals per competitor across all CLINs
  const totalsMap = {};
  for (const clin of clinResults) {
    for (const entry of clin.entries) {
      const key = entry.competitorId ?? 'own';
      totalsMap[key] = totalsMap[key] ?? { competitorId: entry.competitorId, competitorName: entry.competitorName, totalTep: 0 };
      totalsMap[key].totalTep += entry.totalPrice;
    }
  }

  res.json({
    scenarioId,
    scenarioName: scenario.name,
    clins: clinResults,
    totals: Object.values(totalsMap).sort((a, b) => a.totalTep - b.totalTep),
  });
});

export default router;
