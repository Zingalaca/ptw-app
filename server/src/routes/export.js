import { Router } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USD = (n) => (n == null ? '' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));
const PCT = (n) => (n == null ? '' : `${(Number(n) * 100).toFixed(1)}%`);
const DATE = (d) => (d ? new Date(d).toLocaleDateString('en-US') : '');

function applyColWidths(ws, widths) {
  ws['!cols'] = widths.map((w) => ({ wch: w }));
}

function headerStyle() {
  return { font: { bold: true } };
}

/** Convert an array-of-arrays to a worksheet with a bold header row. */
function aoaSheet(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Style first row bold via cell metadata (SheetJS community edition supports limited styling)
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = headerStyle();
  }
  return ws;
}

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildSummarySheet(scenario, contract, totals) {
  const rows = [
    ['PTW Analysis Export'],
    [],
    ['Contract', contract.contractNumber],
    ['Title', contract.title],
    ['Agency', contract.agency],
    ['NAICS Code', contract.naicsCode ?? ''],
    ['Set-Aside', contract.setAside ?? ''],
    ['Period of Performance', `${DATE(contract.popStart)} – ${DATE(contract.popEnd)}`],
    ['Status', contract.status],
    [],
    ['Scenario', scenario.name],
    ['Description', scenario.description ?? ''],
    ['Baseline?', scenario.isBaseline ? 'Yes' : 'No'],
    [],
    ['── TEP Summary by Competitor ──'],
    ['Competitor', 'Total TEP', 'vs. Lowest ($)', 'vs. Lowest (%)'],
    ...(() => {
      const sorted = [...totals].sort((a, b) => a.totalTep - b.totalTep);
      const lowest = sorted[0]?.totalTep ?? 0;
      return sorted.map((t) => [
        t.competitorName,
        t.totalTep,
        t.totalTep - lowest,
        lowest ? (t.totalTep - lowest) / lowest : 0,
      ]);
    })(),
    [],
    ['Generated', new Date().toLocaleString('en-US')],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  applyColWidths(ws, [30, 25, 20, 15]);
  return ws;
}

function buildClinSheet(clinResults, competitors) {
  // Build a pivot: rows = CLINs, cols = competitor names
  const compNames = competitors.map((c) => c.competitorName);

  const header = ['CLIN #', 'Description', 'Type', 'Option Year', ...compNames];
  const dataRows = clinResults.map((clin) => {
    const priceByComp = Object.fromEntries(
      clin.entries.map((e) => [e.competitorName, e.totalPrice]),
    );
    return [
      clin.clinNumber,
      clin.description,
      clin.clinType,
      clin.optionYear ?? 'Base',
      ...compNames.map((name) => priceByComp[name] ?? ''),
    ];
  });

  // Total row
  const totalByComp = Object.fromEntries(
    competitors.map((c) => [c.competitorName, c.totalTep]),
  );
  const totalRow = ['TOTAL', '', '', '', ...compNames.map((name) => totalByComp[name] ?? '')];

  const rows = [header, ...dataRows, [], totalRow];
  const ws = aoaSheet(rows);
  applyColWidths(ws, [10, 45, 8, 12, ...compNames.map(() => 18)]);
  return ws;
}

function buildRateSheet(rateAssumptions) {
  const header = [
    'Labor Category', 'Level', 'Geo Location', 'Geo Index',
    'Base Rate ($/hr)', 'Escalation Rate', 'Fringe Rate', 'OH Rate',
    'G&A Rate', 'Fee Rate', 'Wrapped Rate ($/hr)',
  ];
  const rows = [
    header,
    ...rateAssumptions.map((ra) => [
      ra.laborCategory,
      ra.level ?? '',
      ra.geographicIndex?.location ?? 'National Average',
      ra.geographicIndex?.index ?? 1.0,
      ra.baseRate,
      PCT(ra.escalationRate),
      PCT(ra.fringeRate),
      PCT(ra.overheadRate),
      PCT(ra.gaRate),
      PCT(ra.feeRate),
      ra.wrappedRate,
    ]),
  ];
  const ws = aoaSheet(rows);
  applyColWidths(ws, [25, 10, 22, 10, 16, 14, 12, 10, 10, 10, 18]);
  return ws;
}

function buildCompetitorSheet(competitors) {
  const header = [
    'Name', 'DUNS Number', 'GSA Schedule', 'Historical Win Rate',
    'Est. Annual Revenue ($M)', 'Likely Bid Price', 'Strengths', 'Weaknesses',
  ];
  const rows = [
    header,
    ...competitors.map((c) => [
      c.name,
      c.dunsNumber ?? '',
      c.gsaScheduleNumber ?? '',
      c.historicalWinRate != null ? PCT(c.historicalWinRate) : '',
      c.estimatedRevenue ?? '',
      c.likelyBidPrice ?? '',
      c.strengths ?? '',
      c.weaknesses ?? '',
    ]),
  ];
  const ws = aoaSheet(rows);
  applyColWidths(ws, [30, 14, 16, 18, 22, 18, 40, 40]);
  return ws;
}

function buildBreakdownSheet(clinResults) {
  const header = [
    'CLIN #', 'Description', 'Competitor', 'Total Loaded Labor',
    'ODCs', 'SubK (w/ handling)', 'Materials (w/ handling)',
    'Cost Before G&A', 'Total Cost (after G&A)', 'Fee', 'TEP',
  ];

  const rows = [header];
  for (const clin of clinResults) {
    for (const entry of clin.entries) {
      const b = entry.breakdown ?? {};
      rows.push([
        clin.clinNumber,
        clin.description,
        entry.competitorName,
        b.totalLoadedLabor ?? '',
        b.odcs ?? '',
        b.subkCostsWithHandling ?? '',
        b.materialsWithHandling ?? '',
        b.costBeforeGA ?? '',
        b.totalCost ?? '',
        b.fee ?? '',
        entry.totalPrice,
      ]);
    }
  }

  const ws = aoaSheet(rows);
  applyColWidths(ws, [10, 40, 25, 18, 14, 18, 20, 18, 20, 14, 16]);
  return ws;
}

// ─── Export endpoint ──────────────────────────────────────────────────────────

// GET /api/export/:scenarioId/excel
router.get('/:scenarioId/excel', async (req, res) => {
  const scenarioId = Number(req.params.scenarioId);

  // ── Fetch all required data ─────────────────────────────────────────────
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: {
      rateAssumptions: {
        include: { geographicIndex: true },
        orderBy: { laborCategory: 'asc' },
      },
      contract: {
        include: { competitors: { orderBy: { name: 'asc' } } },
      },
    },
  });

  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

  const tepResults = await prisma.tepResult.findMany({
    where: { scenarioId },
    include: {
      clin: true,
      competitor: { select: { id: true, name: true } },
    },
    orderBy: [{ clin: { clinNumber: 'asc' } }, { competitorId: 'asc' }],
  });

  // ── Assemble grouped structures (mirrors /scenarios/:id/results) ──────
  const clinMap = {};
  for (const r of tepResults) {
    const key = r.clinId;
    if (!clinMap[key]) {
      clinMap[key] = {
        clinId: r.clin.id,
        clinNumber: r.clin.clinNumber,
        description: r.clin.description,
        clinType: r.clin.clinType,
        isOption: r.clin.isOption,
        optionYear: r.clin.optionYear,
        entries: [],
      };
    }
    clinMap[key].entries.push({
      competitorId: r.competitorId,
      competitorName: r.competitor?.name ?? 'Own Estimate',
      totalPrice: r.totalPrice,
      evaluatedPrice: r.evaluatedPrice,
      technicalScore: r.technicalScore,
      breakdown: r.breakdown,
    });
  }
  const clinResults = Object.values(clinMap);

  const totalsMap = {};
  for (const clin of clinResults) {
    for (const entry of clin.entries) {
      const key = entry.competitorId ?? 'own';
      totalsMap[key] = totalsMap[key] ?? {
        competitorId: entry.competitorId,
        competitorName: entry.competitorName,
        totalTep: 0,
      };
      totalsMap[key].totalTep += entry.totalPrice;
    }
  }
  const totals = Object.values(totalsMap).sort((a, b) => a.totalTep - b.totalTep);

  // ── Build workbook ───────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(scenario, scenario.contract, totals), 'Summary');
  XLSX.utils.book_append_sheet(wb, buildClinSheet(clinResults, totals), 'TEP by CLIN');
  XLSX.utils.book_append_sheet(wb, buildBreakdownSheet(clinResults), 'Cost Breakdown');
  XLSX.utils.book_append_sheet(wb, buildRateSheet(scenario.rateAssumptions), 'Rate Build-Up');
  XLSX.utils.book_append_sheet(wb, buildCompetitorSheet(scenario.contract.competitors), 'Competitors');

  // ── Stream the buffer ────────────────────────────────────────────────────
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `PTW_${scenario.contract.contractNumber}_${scenario.name.replace(/\s+/g, '_')}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

export default router;
