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

export interface ExportSheet {
  name: string;
  columns: ExportColumn[];
  data: SafeAny[];
}

export function exportToExcelMultipleSheets(sheets: ExportSheet[], filename: string) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sheet, index) => {
    const rows = sheet.data.map((row) => {
      const obj: Record<string, SafeAny> = {};
      sheet.columns.forEach((col) => {
        obj[col.header] = getValue(row, col.accessor);
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const sheetName = sheet.name.slice(0, 31) || `Sheet${index + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export interface PdfKopOptions {
  logoDataUrl?: string;
  institusi?: string;
  alamat?: string;
  judulDokumen?: string;
  infoLines?: string[];
  signatures?: string[];
}

export function exportToPDF(
  data: SafeAny[],
  columns: ExportColumn[],
  filename: string,
  title: string,
  subtitle?: string,
  options?: PdfKopOptions,
) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const hasKop = Boolean(options && (options.logoDataUrl || options.institusi));
  let tableStartY = 42;

  if (hasKop) {
    if (options?.logoDataUrl) {
      try {
        doc.addImage(options.logoDataUrl, 'PNG', 14, 8, 20, 20);
      } catch {
        /* logo gagal dimuat — lanjutkan tanpa logo */
      }
    }

    const centerX = pageWidth / 2;
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text(options?.institusi || '', centerX, 14, { align: 'center' });

    if (options?.alamat) {
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(options.alamat, centerX, 20, { align: 'center' });
    }

    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text(options?.judulDokumen || title, centerX, 30, { align: 'center' });

    let infoY = 35;
    for (const line of options?.infoLines || []) {
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text(line, 14, infoY);
      infoY += 4.5;
    }

    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(14, infoY + 1, pageWidth - 14, infoY + 1);

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, infoY + 6);

    tableStartY = infoY + 10;
  } else {
    // Perilaku default (tidak berubah)
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.text(title, pageWidth / 2, 20, { align: 'center' });

    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(subtitle, pageWidth / 2, 28, { align: 'center' });
    }

    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(14, 32, pageWidth - 14, 32);

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 14, 38);
  }

  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((col) => getValue(row, col.accessor)));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: tableStartY,
    styles: { fontSize: hasKop ? 7 : 8, cellPadding: 2 },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { top: 40 },
  });

  // Blok tanda tangan opsional di halaman terakhir
  if (options?.signatures && options.signatures.length > 0) {
    const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    let y = (lastAutoTable?.finalY ?? tableStartY) + 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y > pageHeight - 40) {
      doc.addPage();
      y = 25;
    }
    const labels = options.signatures;
    const colW = (pageWidth - 28) / labels.length;
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    labels.forEach((label, i) => {
      const x = 14 + colW * i + colW / 2;
      doc.text(label, x, y, { align: 'center' });
      doc.text('..............................', x, y + 18, { align: 'center' });
    });
  }

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
