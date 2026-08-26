import ExcelJS from 'exceljs';

export type IcalSyncRowStatus = 'Synced' | 'Not Synced' | 'Failed' | 'Pending';

export type IcalSyncExportRow = {
  unitName: string;
  exportUrl: string;
  importUrls: string[];
  syncStatus: IcalSyncRowStatus;
  lastSyncedAt: string | null;
  notes: string;
};

export type IcalSyncExportInput = {
  hostLabel: string;
  subtitle: string;
  rows: IcalSyncExportRow[];
};

function formatSyncStatusLabel(status: IcalSyncRowStatus): string {
  return status;
}

function formatLastSynced(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Build Ionica-style iCal sync tracker workbook for a host's properties. */
export async function buildIcalSyncWorkbook(input: IcalSyncExportInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'VibesBNB';
  wb.created = new Date();

  const ws = wb.addWorksheet('iCal Sync', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = `VibesBNB × ${input.hostLabel} — iCal Sync Tracker`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF111827' } };
  ws.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = input.subtitle;
  ws.getCell('A2').font = { size: 11, color: { argb: 'FF4B5563' } };

  const headerRow = ws.getRow(4);
  const headers = [
    'Unit Name',
    'VibesBNB Export iCal URL',
    'Import Into VibesBNB (Paste PMS iCal URL)',
    'Sync Status',
    'Last Synced',
    'Notes',
  ];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    cell.alignment = { wrapText: true, vertical: 'middle' };
  });
  headerRow.height = 32;

  ws.columns = [
    { width: 42 },
    { width: 56 },
    { width: 48 },
    { width: 14 },
    { width: 14 },
    { width: 36 },
  ];

  const yellowFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF59D' },
  };

  let rowIndex = 5;
  for (const row of input.rows) {
    const excelRow = ws.getRow(rowIndex);
    excelRow.getCell(1).value = row.unitName;

    if (row.exportUrl) {
      excelRow.getCell(2).value = {
        text: row.exportUrl,
        hyperlink: row.exportUrl,
      };
      excelRow.getCell(2).font = { color: { argb: 'FF2563EB' }, underline: true };
    } else {
      excelRow.getCell(2).value = '';
    }

    const importJoined = row.importUrls.filter(Boolean).join('\n');
    excelRow.getCell(3).value = importJoined || null;
    excelRow.getCell(3).fill = yellowFill;
    excelRow.getCell(3).alignment = { wrapText: true, vertical: 'top' };

    excelRow.getCell(4).value = formatSyncStatusLabel(row.syncStatus);
    if (row.syncStatus === 'Synced') {
      excelRow.getCell(4).font = { color: { argb: 'FF059669' }, bold: true };
    } else if (row.syncStatus === 'Failed') {
      excelRow.getCell(4).font = { color: { argb: 'FFDC2626' }, bold: true };
    } else if (row.syncStatus === 'Not Synced') {
      excelRow.getCell(4).font = { color: { argb: 'FF6B7280' } };
    }

    excelRow.getCell(5).value = formatLastSynced(row.lastSyncedAt);
    excelRow.getCell(6).value = row.notes || null;
    excelRow.alignment = { vertical: 'top', wrapText: true };
    rowIndex += 1;
  }

  rowIndex += 1;
  ws.mergeCells(`A${rowIndex}:F${rowIndex}`);
  ws.getCell(`A${rowIndex}`).value = 'Legend:';
  ws.getCell(`A${rowIndex}`).font = { bold: true };
  rowIndex += 1;

  ws.mergeCells(`A${rowIndex}:F${rowIndex}`);
  ws.getCell(`A${rowIndex}`).value = 'Yellow cells = fill in';
  ws.getCell(`A${rowIndex}`).fill = yellowFill;
  rowIndex += 1;

  ws.mergeCells(`A${rowIndex}:F${rowIndex}`);
  ws.getCell(`A${rowIndex}`).value =
    "VibesBNB Export iCal URL = copy from the unit's VibesBNB host calendar page, paste into the PM's other calendar tool (e.g. Airbnb, VRBO, Google Calendar) to export VibesBNB bookings out.";
  ws.getCell(`A${rowIndex}`).alignment = { wrapText: true };
  rowIndex += 1;

  ws.mergeCells(`A${rowIndex}:F${rowIndex}`);
  ws.getCell(`A${rowIndex}`).value =
    "Import Into VibesBNB = copy the PM's iCal link from their other platform, paste into the unit's VibesBNB calendar sync settings to block VibesBNB dates when booked elsewhere.";
  ws.getCell(`A${rowIndex}`).alignment = { wrapText: true };
  ws.getRow(rowIndex).height = 40;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function deriveIcalSyncStatus(sources: {
  is_active?: boolean | null;
  sync_status?: string | null;
  last_synced_at?: string | null;
  sync_error?: string | null;
  ical_url?: string | null;
  name?: string | null;
}[]): {
  status: IcalSyncRowStatus;
  lastSyncedAt: string | null;
  notes: string;
  importUrls: string[];
} {
  const active = sources.filter((s) => s.is_active !== false);
  if (active.length === 0) {
    return { status: 'Not Synced', lastSyncedAt: null, notes: '', importUrls: [] };
  }

  const importUrls = active
    .map((s) => (typeof s.ical_url === 'string' ? s.ical_url.trim() : ''))
    .filter(Boolean);

  const failed = active.filter(
    (s) => s.sync_status === 'failed' || (s.sync_error && String(s.sync_error).trim())
  );
  const lastSyncedAt =
    active
      .map((s) => s.last_synced_at)
      .filter((x): x is string => Boolean(x))
      .sort()
      .reverse()[0] ?? null;

  const names = active
    .map((s) => s.name)
    .filter((n): n is string => Boolean(n))
    .join(', ');

  if (failed.length > 0) {
    const err =
      failed
        .map((s) => s.sync_error)
        .filter(Boolean)
        .map(String)[0] || 'Import sync failed';
    return {
      status: 'Failed',
      lastSyncedAt,
      notes: names ? `${names}: ${err}` : err,
      importUrls,
    };
  }

  if (!lastSyncedAt) {
    return {
      status: 'Pending',
      lastSyncedAt: null,
      notes: names ? `Sources: ${names}` : 'Source added; waiting for first sync',
      importUrls,
    };
  }

  return {
    status: 'Synced',
    lastSyncedAt,
    notes: names ? `Linked: ${names}` : '',
    importUrls,
  };
}
