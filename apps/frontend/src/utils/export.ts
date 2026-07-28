import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// biome-ignore lint/suspicious/noExplicitAny: SafeAny helper for dynamic data exports
export type SafeAny = any;

export interface ExportColumn<T = SafeAny> {
  header: string;
  accessor: string | ((row: T) => string | number);
}

function getValue(row: SafeAny, accessor: string | ((row: SafeAny) => string | number)): string | number {
  if (typeof accessor === 'function') return accessor(row);
  const keys = accessor.split('.');
  let val: SafeAny = row;
  for (const k of keys) {
    if (val && typeof val === 'object') {
      val = (val as Record<string, SafeAny>)[k];
    } else {
      val = undefined;
    }
  }
  return (val as string | number | undefined | null) ?? '-';
}

export function exportToExcel(data: SafeAny[], columns: ExportColumn[], filename: string) {
  const rows = data.map((row) => {
    const obj: Record<string, SafeAny> = {};
    columns.forEach((col) => {
      obj[col.header] = getValue(row, col.accessor);
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  data: SafeAny[],
  columns: ExportColumn[],
  filename: string,
  title: string,
  subtitle?: string,
) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });
  }

  // Line
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.5);
  doc.line(14, 32, pageWidth - 14, 32);

  // Date
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 38);

  // Table
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((col) => getValue(row, col.accessor)));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 42,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { top: 40 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `SIMAK Vokasi - Politeknik Sorowako | Halaman ${i} dari ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    );
  }

  doc.save(`${filename}.pdf`);
}

export function exportToCSV(data: SafeAny[], columns: ExportColumn[], filename: string) {
  const header = columns.map((c) => `"${c.header}"`).join(',');
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = getValue(row, col.accessor);
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(','),
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
