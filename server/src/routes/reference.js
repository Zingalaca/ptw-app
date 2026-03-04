import { Router } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

// ─── Geographic Indices ───────────────────────────────────────────────────────

// GET /api/reference/geo-indices
router.get('/geo-indices', async (req, res) => {
  const { year, state } = req.query;
  const indices = await prisma.geographicIndex.findMany({
    where: {
      effectiveYear: year ? Number(year) : undefined,
      state: state ?? undefined,
    },
    orderBy: [{ state: 'asc' }, { location: 'asc' }],
  });
  res.json(indices);
});

// GET /api/reference/geo-indices/:id
router.get('/geo-indices/:id', async (req, res) => {
  const id = Number(req.params.id);
  const index = await prisma.geographicIndex.findUnique({ where: { id } });
  if (!index) return res.status(404).json({ error: 'Geographic index not found' });
  res.json(index);
});

// ─── Win Presets ──────────────────────────────────────────────────────────────
//
// Hardcoded presets for common company profiles and bid strategies used in
// government contracting PTW analysis.

const WIN_PRESETS = [
  // ── Company Rate-Structure Profiles ─────────────────────────────────────
  {
    id: 'large-defense-prime',
    label: 'Large Defense Prime',
    description:
      'Typical fully-burdened rate structure for a large defense prime contractor with high overhead and strong past-performance record.',
    category: 'Company Profile',
    rateDefaults: {
      fringeRate: 0.35,
      overheadRate: 0.30,
      gaRate: 0.13,
      feeRate: 0.10,
      escalationRate: 0.03,
      subkHandlingRate: 0.02,
    },
    historicalWinRate: 0.38,
  },
  {
    id: 'mid-tier-it',
    label: 'Mid-Tier Federal IT Services',
    description:
      'Competitive rates for a mid-size federal IT integrator. Leaner structure than large primes; strong technical bench.',
    category: 'Company Profile',
    rateDefaults: {
      fringeRate: 0.31,
      overheadRate: 0.25,
      gaRate: 0.11,
      feeRate: 0.09,
      escalationRate: 0.03,
      subkHandlingRate: 0.025,
    },
    historicalWinRate: 0.32,
  },
  {
    id: 'small-business-8a',
    label: 'Small Business — 8(a)',
    description:
      'Typical cost structure for an SBA 8(a)-certified small disadvantaged business. Lower G&A offsets higher per-person costs.',
    category: 'Company Profile',
    rateDefaults: {
      fringeRate: 0.28,
      overheadRate: 0.22,
      gaRate: 0.09,
      feeRate: 0.10,
      escalationRate: 0.03,
      subkHandlingRate: 0.02,
    },
    historicalWinRate: 0.44,
  },
  {
    id: 'sdvosb',
    label: 'SDVOSB / VOSB',
    description:
      'Service-Disabled Veteran-Owned Small Business or Veteran-Owned Small Business. Benefits from set-aside preference; lean G&A.',
    category: 'Company Profile',
    rateDefaults: {
      fringeRate: 0.28,
      overheadRate: 0.20,
      gaRate: 0.08,
      feeRate: 0.10,
      escalationRate: 0.03,
      subkHandlingRate: 0.02,
    },
    historicalWinRate: 0.51,
  },
  {
    id: 'large-business-staffing',
    label: 'Large Business — Staffing / Bod-Shop',
    description:
      'High-volume labor staffing model with low overhead. Competes on price; lower technical scores typical.',
    category: 'Company Profile',
    rateDefaults: {
      fringeRate: 0.30,
      overheadRate: 0.18,
      gaRate: 0.08,
      feeRate: 0.07,
      escalationRate: 0.025,
      subkHandlingRate: 0.01,
    },
    historicalWinRate: 0.25,
  },

  // ── Bid Strategy Presets ─────────────────────────────────────────────────
  {
    id: 'strategy-aggressive',
    label: 'Aggressive — Win at Low Margin',
    description:
      'Price 8–12% below market to maximize probability of award. Best for strategic re-compete captures or new-logo priority accounts. Reduce fee rate by 3–5 percentage points.',
    category: 'Bid Strategy',
    priceAdjustmentPct: -0.10,
    feeAdjustmentPct: -0.04,
    notes: 'Ensure profitability floor is met before applying. Requires executive approval.',
  },
  {
    id: 'strategy-moderate',
    label: 'Moderate — Balanced Price / Margin',
    description:
      'Price at market with standard profit margins. Appropriate for competitive but not critical captures. No price adjustment.',
    category: 'Bid Strategy',
    priceAdjustmentPct: 0,
    feeAdjustmentPct: 0,
  },
  {
    id: 'strategy-conservative',
    label: 'Conservative — Protect Margin',
    description:
      'Price 5% above market to protect profitability. Suitable for lower-priority captures or when technical superiority commands a premium.',
    category: 'Bid Strategy',
    priceAdjustmentPct: 0.05,
    feeAdjustmentPct: 0.02,
  },

  // ── Competitive Position Presets ─────────────────────────────────────────
  {
    id: 'incumbent-advantage',
    label: 'Incumbent Advantage',
    description:
      'Incumbents win re-competes ~65% of the time. They typically price 3–5% below their current contract value due to reduced transition risk and established workforce.',
    category: 'Competitive Intelligence',
    historicalWinRate: 0.65,
    priceAdjustmentPct: -0.04,
    notes: 'Identify whether the incumbent is re-competing and adjust competitor estimates down accordingly.',
  },
  {
    id: 'new-entrant',
    label: 'New Entrant / Challenger',
    description:
      'Non-incumbent challengers win ~35% of re-competes. Must price 5–10% below incumbent to overcome past-performance advantage.',
    category: 'Competitive Intelligence',
    historicalWinRate: 0.35,
    priceAdjustmentPct: -0.07,
  },
  {
    id: 'teaming-prime',
    label: 'Teaming — Large Prime + Small Sub',
    description:
      'Large business as prime with a qualifying small business sub to capture set-aside credit. Slight price premium over pure small-business bids.',
    category: 'Competitive Intelligence',
    historicalWinRate: 0.42,
    priceAdjustmentPct: 0.03,
    notes: 'Common on full-and-open competitions to hedge against small-business challengers.',
  },
];

// GET /api/reference/win-presets
router.get('/win-presets', (_req, res) => {
  res.json(WIN_PRESETS);
});

// GET /api/reference/win-presets/:id
router.get('/win-presets/:id', (req, res) => {
  const preset = WIN_PRESETS.find((p) => p.id === req.params.id);
  if (!preset) return res.status(404).json({ error: 'Win preset not found' });
  res.json(preset);
});

export default router;
