import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/competitors/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const competitor = await prisma.competitor.findUnique({ where: { id } });
  if (!competitor) return res.status(404).json({ error: 'Competitor not found' });
  res.json(competitor);
});

// PUT /api/competitors/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, dunsNumber, gsaScheduleNumber, historicalWinRate, estimatedRevenue, strengths, weaknesses, likelyBidPrice } = req.body;

  const competitor = await prisma.competitor.update({
    where: { id },
    data: {
      name,
      dunsNumber,
      gsaScheduleNumber,
      historicalWinRate: historicalWinRate != null ? Number(historicalWinRate) : undefined,
      estimatedRevenue: estimatedRevenue != null ? Number(estimatedRevenue) : undefined,
      strengths,
      weaknesses,
      likelyBidPrice: likelyBidPrice != null ? Number(likelyBidPrice) : undefined,
    },
  }).catch(() => null);

  if (!competitor) return res.status(404).json({ error: 'Competitor not found' });
  res.json(competitor);
});

// DELETE /api/competitors/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.competitor.delete({ where: { id } }).catch(() => null);
  res.status(204).send();
});

// ─── Competitor Rates (TEP results attributed to this competitor) ─────────────
//
// In the PTW model, a competitor's "rates" are the per-CLIN evaluated prices
// stored in TepResult (competitorId = this competitor's id).  These are usually
// populated via the /scenarios/:id/calculate endpoint but can also be entered
// manually here for competitive-intelligence purposes.

// GET /api/competitors/:id/rates
router.get('/:id/rates', async (req, res) => {
  const competitorId = Number(req.params.id);

  const results = await prisma.tepResult.findMany({
    where: { competitorId },
    include: {
      scenario: { select: { id: true, name: true } },
      clin: { select: { id: true, clinNumber: true, description: true, clinType: true } },
    },
    orderBy: [{ scenario: { name: 'asc' } }, { clin: { clinNumber: 'asc' } }],
  });

  // Group by scenario for easier consumption
  const grouped = results.reduce((acc, row) => {
    const key = row.scenario.id;
    if (!acc[key]) {
      acc[key] = { scenarioId: row.scenario.id, scenarioName: row.scenario.name, clins: [] };
    }
    acc[key].clins.push({
      clinId: row.clin.id,
      clinNumber: row.clin.clinNumber,
      description: row.clin.description,
      clinType: row.clin.clinType,
      totalPrice: row.totalPrice,
      evaluatedPrice: row.evaluatedPrice,
      technicalScore: row.technicalScore,
      notes: row.notes,
      breakdown: row.breakdown,
    });
    return acc;
  }, {});

  res.json(Object.values(grouped));
});

// POST /api/competitors/:id/rates
// Manually record / update a competitor's estimated price for a specific CLIN.
router.post('/:id/rates', async (req, res) => {
  const competitorId = Number(req.params.id);
  const { scenarioId, clinId, totalPrice, evaluatedPrice, technicalScore, notes, breakdown } = req.body;

  if (!scenarioId || !clinId || totalPrice == null) {
    return res.status(400).json({ error: 'scenarioId, clinId, and totalPrice are required' });
  }

  const existing = await prisma.tepResult.findFirst({
    where: { scenarioId: Number(scenarioId), clinId: Number(clinId), competitorId },
  });

  const payload = {
    scenarioId: Number(scenarioId),
    clinId: Number(clinId),
    competitorId,
    totalPrice: Number(totalPrice),
    evaluatedPrice: evaluatedPrice != null ? Number(evaluatedPrice) : Number(totalPrice),
    technicalScore: technicalScore != null ? Number(technicalScore) : undefined,
    notes,
    breakdown,
  };

  const result = existing
    ? await prisma.tepResult.update({ where: { id: existing.id }, data: payload })
    : await prisma.tepResult.create({ data: payload });

  res.status(existing ? 200 : 201).json(result);
});

export default router;
