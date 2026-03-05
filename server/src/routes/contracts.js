import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// ─── Contracts ────────────────────────────────────────────────────────────────

// GET /api/contracts
router.get('/', async (_req, res) => {
  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { clins: true, scenarios: true, competitors: true } },
    },
  });
  res.json(contracts);
});

// GET /api/contracts/:id
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      clins: { orderBy: { clinNumber: 'asc' } },
      scenarios: { orderBy: { createdAt: 'asc' } },
      competitors: { orderBy: { name: 'asc' } },
    },
  });
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json(contract);
});

// POST /api/contracts
router.post('/', async (req, res) => {
  const { contractNumber, title, agency, description, naicsCode, setAside, popStart, popEnd, status, clins } = req.body;

  if (!contractNumber || !title || !agency) {
    return res.status(400).json({ error: 'contractNumber, title, and agency are required' });
  }

  const contract = await prisma.contract.create({
    data: {
      contractNumber,
      title,
      agency,
      description,
      naicsCode,
      setAside,
      popStart: popStart ? new Date(popStart) : undefined,
      popEnd: popEnd ? new Date(popEnd) : undefined,
      status: status ?? 'OPEN',
      clins: clins?.length
        ? { create: clins.map(({ clinNumber, description: d, clinType, quantity, unit, isOption, optionYear }) => ({
            clinNumber, description: d, clinType, quantity, unit,
            isOption: isOption ?? false,
            optionYear: optionYear ?? null,
          })) }
        : undefined,
    },
    include: { clins: { orderBy: { clinNumber: 'asc' } } },
  });

  res.status(201).json(contract);
});

// PUT /api/contracts/:id
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { contractNumber, title, agency, description, naicsCode, setAside, popStart, popEnd, status } = req.body;

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      contractNumber,
      title,
      agency,
      description,
      naicsCode,
      setAside,
      popStart: popStart ? new Date(popStart) : undefined,
      popEnd: popEnd ? new Date(popEnd) : undefined,
      status,
    },
  }).catch(() => null);

  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json(contract);
});

// DELETE /api/contracts/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await prisma.contract.delete({ where: { id } }).catch(() => null);
  res.status(204).send();
});

// ─── CLINs (nested under contract) ───────────────────────────────────────────

// GET /api/contracts/:id/clins
router.get('/:id/clins', async (req, res) => {
  const contractId = Number(req.params.id);
  const clins = await prisma.clin.findMany({
    where: { contractId },
    orderBy: { clinNumber: 'asc' },
  });
  res.json(clins);
});

// POST /api/contracts/:id/clins
router.post('/:id/clins', async (req, res) => {
  const contractId = Number(req.params.id);
  const { clinNumber, description, clinType, quantity, unit, isOption, optionYear } = req.body;

  if (!clinNumber || !description || !clinType || quantity == null || !unit) {
    return res.status(400).json({ error: 'clinNumber, description, clinType, quantity, and unit are required' });
  }

  const clin = await prisma.clin.create({
    data: {
      contractId,
      clinNumber,
      description,
      clinType,
      quantity: Number(quantity),
      unit,
      isOption: isOption ?? false,
      optionYear: optionYear ?? null,
    },
  });
  res.status(201).json(clin);
});

// PUT /api/contracts/:contractId/clins/:clinId
router.put('/:contractId/clins/:clinId', async (req, res) => {
  const id = Number(req.params.clinId);
  const { clinNumber, description, clinType, quantity, unit, isOption, optionYear } = req.body;

  const clin = await prisma.clin.update({
    where: { id },
    data: {
      clinNumber,
      description,
      clinType,
      quantity: quantity != null ? Number(quantity) : undefined,
      unit,
      isOption,
      optionYear,
    },
  }).catch(() => null);

  if (!clin) return res.status(404).json({ error: 'CLIN not found' });
  res.json(clin);
});

// DELETE /api/contracts/:contractId/clins/:clinId
router.delete('/:contractId/clins/:clinId', async (req, res) => {
  const id = Number(req.params.clinId);
  await prisma.clin.delete({ where: { id } }).catch(() => null);
  res.status(204).send();
});

// ─── Competitors (nested under contract) ─────────────────────────────────────

// GET /api/contracts/:id/competitors
router.get('/:id/competitors', async (req, res) => {
  const contractId = Number(req.params.id);
  const competitors = await prisma.competitor.findMany({
    where: { contractId },
    include: { rateProfile: true },
    orderBy: { name: 'asc' },
  });
  res.json(competitors);
});

// POST /api/contracts/:id/competitors
router.post('/:id/competitors', async (req, res) => {
  const contractId = Number(req.params.id);
  const { name, dunsNumber, gsaScheduleNumber, historicalWinRate, estimatedRevenue, strengths, weaknesses, likelyBidPrice } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const competitor = await prisma.competitor.create({
    data: {
      contractId,
      name,
      dunsNumber,
      gsaScheduleNumber,
      historicalWinRate: historicalWinRate != null ? Number(historicalWinRate) : undefined,
      estimatedRevenue: estimatedRevenue != null ? Number(estimatedRevenue) : undefined,
      strengths,
      weaknesses,
      likelyBidPrice: likelyBidPrice != null ? Number(likelyBidPrice) : undefined,
    },
  });
  res.status(201).json(competitor);
});

export default router;
