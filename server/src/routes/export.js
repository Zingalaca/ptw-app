import { Router } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma.js';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const USD = (n) => (n == null ? '' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));
const PCT = (n) => (n == null ? '' : `${Number(n).toFixed(1)}%`);
const DATE = (d) => (d ? new Date(d).toLocaleDateString('en-US') : '');

function applyColWidths(ws, widths) {
  ws['!cols'] = widths.map((w) => ({ wch: w }));
}

/** Convert an array-of-arrays to a worksheet with a bold header row. */
function aoaSheet(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = { font: { bold: true } };
  }
  return ws;
}

// ─── Tab 1: Rate Inputs ───────────────────────────────────────────────────────

function buildRateInputsSheet(tepResults, rateAssumptions) {
  const rows = [['Rate Inputs by Competitor'], []];

  // Collect unique competitors (including null = own estimate) in insertion order
  const seen = new Map(); // key -> { competitorId, competitorName }
  for (const r of tepResults) {
    const key = r.competitorId ?? 'own';
    if (!seen.has(key)) {
      seen.set(key, {
        competitorId: r.competitorId,
        competitorName: r.competitor?.name ?? 'Own Estimate',
      });
    }
  }

  for (const [key, { competitorId, competitorName }] of seen) {
    // Section header
    rows.push([`── ${competitorName} ──`]);

    if (competitorId === null) {
      // Own estimate: use scenario rateAssumptions table
      if (rateAssumptions.length === 0) {
        rows.push(['(no rate assumptions recorded)']);
      } else {
        rows.push(['Labor Category', 'Level', 'Geo Location', 'Geo Index', 'Base Rate ($/hr)', 'Escalation', 'Fringe', 'OH Rate', 'G&A', 'Fee', 'Wrapped Rate']);
        for (const ra of rateAssumptions) {
          rows.push([
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
          ]);
        }
      }
    } else {
      // Competitor: find rateAssumption from any of their TepResult breakdown fields
      let ra = null;
      for (const r of tepResults) {
        if (r.competitorId === competitorId && r.breakdown?.rateAssumption) {
          ra = r.breakdown.rateAssumption;
          break;
        }
      }

      if (!ra) {
        rows.push(['(no rate assumptions recorded)']);
      } else {
        rows.push(['Field', 'Value']);
        const fields = [
          ['Company Name', ra.companyName ?? ''],
          ['Company Type', ra.companyType ?? ''],
          ['Comparable Public Co.', ra.comparablePublicCompany ?? ''],
          ['Eng. Location', ra.engLocation ?? ''],
          ['Eng. Geo Offset', PCT(ra.engGeoOffset)],
          ['Prod. Location', ra.prodLocation ?? ''],
          ['Prod. Geo Offset', PCT(ra.prodGeoOffset)],
          ['Fringe in OH?', ra.fringeIncludedInOH ? 'Yes' : 'No'],
          ['Fringe Rate', PCT(ra.fringeRate)],
          ['Eng. OH Rate', PCT(ra.engOHRate)],
          ['Mfg OH Rate', PCT(ra.mfgOHRate)],
          ['Material Handling Rate', PCT(ra.materialHandlingRate)],
          ['SubK Handling Rate', PCT(ra.subKHandlingRate)],
          ['G&A Rate', PCT(ra.gaRate)],
          ['Fee Rate', PCT(ra.feeRate)],
          ['Escalation Rate', PCT(ra.escalationRate)],
        ];
        for (const [field, value] of fields) {
          rows.push([field, value]);
        }
      }
    }

    rows.push([]); // blank separator between competitors
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  applyColWidths(ws, [30, 25, 22, 12, 16, 12, 12, 12, 10, 10, 16]);
  return ws;
}

// ─── Tab 2: TEP Results ───────────────────────────────────────────────────────

function buildTepResultsSheet(clinResults, totals) {
  // Part A: CLIN pivot
  const compNames = totals.map((c) => c.competitorName);
  const pivotHeader = ['CLIN #', 'Description', 'Type', 'Option Year', ...compNames];

  const pivotRows = clinResults.map((clin) => {
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

  const totalByComp = Object.fromEntries(totals.map((c) => [c.competitorName, c.totalTep]));
  const totalRow = ['TOTAL TEP', '', '', '', ...compNames.map((name) => totalByComp[name] ?? '')];

  // Part B: Cost Breakdown
  const breakdownHeader = [
    'CLIN #', 'Description', 'Competitor', 'Total Loaded Labor',
    'ODCs', 'SubK (w/ handling)', 'Materials (w/ handling)',
    'Cost Before G&A', 'Total Cost (after G&A)', 'Fee', 'TEP',
  ];

  const breakdownRows = [];
  for (const clin of clinResults) {
    for (const entry of clin.entries) {
      const b = entry.breakdown ?? {};
      breakdownRows.push([
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

  const rows = [
    pivotHeader,
    ...pivotRows,
    [],
    totalRow,
    [],
    ['── Cost Breakdown Detail ──'],
    breakdownHeader,
    ...breakdownRows,
  ];

  const ws = aoaSheet(rows);
  const numCols = Math.max(pivotHeader.length, breakdownHeader.length);
  const colWidths = [10, 45, 8, 12, ...compNames.map(() => 18)];
  // Ensure enough widths for breakdown cols too
  while (colWidths.length < numCols) colWidths.push(16);
  applyColWidths(ws, colWidths);
  return ws;
}

// ─── Tab 3: PTW Summary ───────────────────────────────────────────────────────

function buildPtwSummarySheet(scenario, contract, totals) {
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
        lowest ? ((t.totalTep - lowest) / lowest * 100).toFixed(1) + '%' : '0.0%',
      ]);
    })(),
    [],
    ['Generated', new Date().toLocaleString('en-US')],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  applyColWidths(ws, [30, 25, 20, 15]);
  return ws;
}

// ─── Export endpoint ──────────────────────────────────────────────────────────

// GET /api/export/:scenarioId/excel
router.get('/:scenarioId/excel', async (req, res) => {
  const scenarioId = Number(req.params.scenarioId);

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

  // Build grouped clinResults structure
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
      breakdown: r.breakdown,
    });
  }
  const clinResults = Object.values(clinMap);

  // Build totals
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

  // Build workbook with 3 tabs
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildRateInputsSheet(tepResults, scenario.rateAssumptions), 'Rate Inputs');
  XLSX.utils.book_append_sheet(wb, buildTepResultsSheet(clinResults, totals), 'TEP Results');
  XLSX.utils.book_append_sheet(wb, buildPtwSummarySheet(scenario, scenario.contract, totals), 'PTW Summary');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `PTW_${scenario.contract.contractNumber}_${scenario.name.replace(/\s+/g, '_')}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
});

export default router;
