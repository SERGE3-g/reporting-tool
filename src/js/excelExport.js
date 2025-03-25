// excelExport.js - Enhanced functions for exporting data to Excel

/**
 * Export data to Excel (XLSX) with advanced formatting
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @returns {Blob} Excel file as blob
 */
function exportToExcel(data, options = {}) {
  if (!data || !data.length) {
    throw new Error('Nessun dato da esportare');
  }

  // Import XLSX if we're in a browser environment
  const XLSX = window.XLSX || require('xlsx');

  // Default options
  const defaultOptions = {
    sheetName: 'Dati Estratti',
    fileName: `Report_Commissioni_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`,
    includeHeaders: true,
    headerStyle: {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4361EE" } }
    },
    cellStyles: true,
    addSummarySheet: true
  };

  // Merge default options with provided options
  const exportOptions = { ...defaultOptions, ...options };

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Apply header styling if cellStyles is enabled
  if (exportOptions.cellStyles && exportOptions.includeHeaders) {
    const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRange.s.r, c: col });
      if (!worksheet[cellAddress]) continue;

      worksheet[cellAddress].s = exportOptions.headerStyle;
    }
  }

  // Add the main data worksheet
  XLSX.utils.book_append_sheet(workbook, worksheet, exportOptions.sheetName);

  // Add summary worksheet if requested
  if (exportOptions.addSummarySheet && data.length > 0) {
    addSummaryWorksheet(workbook, data);
  }

  // Generate Excel buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // Create blob from buffer
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}

/**
 * Adds a summary worksheet with statistics to the workbook
 * @param {Object} workbook - XLSX workbook
 * @param {Array} data - Data array
 */
function addSummaryWorksheet(workbook, data) {
  const XLSX = window.XLSX || require('xlsx');

  // Find numeric fields for statistics
  const firstRow = data[0];
  const numericFields = [];

  for (const field in firstRow) {
    // Check if the field contains numeric values
    const fieldValues = data.map(row => row[field]);
    const numericValues = fieldValues.filter(val => {
      const num = parseFloat(String(val).replace(',', '.').replace(/[^0-9.-]/g, ''));
      return !isNaN(num);
    });

    // If at least 50% of values are numeric, include this field
    if (numericValues.length >= data.length * 0.5) {
      numericFields.push(field);
    }
  }

  // Prepare summary data
  const summaryData = [];

  // Add record count
  summaryData.push({ Statistica: 'Numero totale di record', Valore: data.length });

  // Calculate statistics for numeric fields
  numericFields.forEach(field => {
    const numericValues = data.map(row => {
      const strVal = String(row[field] || '0');
      return parseFloat(strVal.replace(',', '.').replace(/[^0-9.-]/g, ''));
    }).filter(val => !isNaN(val));

    if (numericValues.length > 0) {
      // Calculate min, max, avg, sum
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const avg = sum / numericValues.length;

      summaryData.push({ Statistica: `${field} - Minimo`, Valore: min.toFixed(2) });
      summaryData.push({ Statistica: `${field} - Massimo`, Valore: max.toFixed(2) });
      summaryData.push({ Statistica: `${field} - Media`, Valore: avg.toFixed(2) });
      summaryData.push({ Statistica: `${field} - Totale`, Valore: sum.toFixed(2) });

      // Add empty row for readability
      summaryData.push({ Statistica: '', Valore: '' });
    }
  });

  // Create summary worksheet
  const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);

  // Apply styling
  const range = XLSX.utils.decode_range(summaryWorksheet['!ref']);
  for (let row = range.s.r; row <= range.e.r; row++) {
    // Style the statistic names (first column)
    const statCell = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (summaryWorksheet[statCell]) {
      summaryWorksheet[statCell].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "F1F5F9" } }
      };
    }

    // Style the values (second column)
    const valCell = XLSX.utils.encode_cell({ r: row, c: 1 });
    if (summaryWorksheet[valCell]) {
      summaryWorksheet[valCell].s = {
        alignment: { horizontal: "right" }
      };
    }
  }

  // Add the summary worksheet
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Statistiche');
}

// PDF export functionality
/**
 * Generate PDF from extracted data
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @returns {ArrayBuffer} PDF content as ArrayBuffer
 */
async function exportToPDF(data, options = {}) {
  // Check if we're in a Node.js environment or browser
  const isNode = typeof window === 'undefined';

  // Import appropriate PDF library (jsPDF for browser)
  let jsPDF;
  if (isNode) {
    // For Node.js environment, use a compatible library
    throw new Error('PDF export in Node.js environment requires additional setup');
  } else {
    // For browser environment, use jsPDF from window if available
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('jsPDF library is required for PDF export');
    }
    jsPDF = window.jspdf.jsPDF;
  }

  // Default options
  const defaultOptions = {
    title: 'Report Commissioni',
    orientation: 'landscape', // 'portrait' or 'landscape'
    fileName: `Report_Commissioni_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`,
    pageSize: 'a4',
    includeStats: true,
    includeHeader: true,
    includeFooter: true,
    maxRowsPerPage: 25,
    theme: {
      header: { fillColor: [67, 97, 238], textColor: [255, 255, 255] },
      alternateRows: true,
      rowColors: { even: [245, 247, 250], odd: [255, 255, 255] }
    }
  };

  // Merge default options with provided options
  const exportOptions = { ...defaultOptions, ...options };

  // Create new PDF document
  const doc = new jsPDF({
    orientation: exportOptions.orientation,
    unit: 'mm',
    format: exportOptions.pageSize
  });

  // Get page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10; // margin in mm

  // Get active fields from data
  if (!data || !data.length) {
    throw new Error('Nessun dato da esportare');
  }

  const fields = Object.keys(data[0]);

  // Helper to add page numbers
  const addPageNumbers = () => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Pagina ${i} di ${totalPages}`, pageWidth - 25, pageHeight - 5);
    }
  };

  // Add header
  if (exportOptions.includeHeader) {
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text(exportOptions.title, margin, margin + 5);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, margin, margin + 10);

    doc.line(margin, margin + 12, pageWidth - margin, margin + 12);
  }

  // Calculate table dimensions
  const startY = exportOptions.includeHeader ? margin + 15 : margin;
  const tableWidth = pageWidth - (margin * 2);
  const columnWidth = tableWidth / fields.length;

  // Prepare table data
  const tableData = {
    head: [fields],
    body: data.map(row => fields.map(field => row[field] || ''))
  };

  // Set table styles
  const styles = {
    fontSize: 8,
    cellPadding: 2,
    lineColor: [200, 200, 200],
    lineWidth: 0.1
  };

  const headerStyles = {
    fillColor: exportOptions.theme.header.fillColor,
    textColor: exportOptions.theme.header.textColor,
    fontStyle: 'bold'
  };

  const alternateRowStyles = exportOptions.theme.alternateRows ? {
    0: { fillColor: exportOptions.theme.rowColors.odd },
    1: { fillColor: exportOptions.theme.rowColors.even }
  } : {};

  // Generate table
  doc.autoTable({
    head: tableData.head,
    body: tableData.body,
    startY: startY,
    margin: { top: startY, left: margin, right: margin, bottom: 15 },
    styles: styles,
    headStyles: headerStyles,
    alternateRowStyles: alternateRowStyles,
    didDrawPage: (data) => {
      // Add header on each page
      if (exportOptions.includeHeader) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(exportOptions.title, margin, margin);
      }

      // Add footer on each page
      if (exportOptions.includeFooter) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Tool di Reporting Commissioni Mensile', margin, pageHeight - 5);
      }
    }
  });

  // Add statistics if requested
  if (exportOptions.includeStats && data.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Statistiche', margin, margin + 5);

    let yPos = margin + 15;

    // Add record count
    doc.setFontSize(10);
    doc.text(`Numero totale di record: ${data.length}`, margin, yPos);
    yPos += 7;

    // Find numeric fields for statistics
    for (const field of fields) {
      const numericValues = data
        .map(row => parseFloat(String(row[field] || '0').replace(',', '.').replace(/[^0-9.-]/g, '')))
        .filter(val => !isNaN(val));

      if (numericValues.length > 0) {
        // Calculate min, max, avg, sum
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const avg = sum / numericValues.length;

        doc.setFontSize(11);
        doc.setTextColor(67, 97, 238);
        doc.text(`Statistiche per: ${field}`, margin, yPos);
        yPos += 5;

        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`Minimo: ${min.toFixed(2)}`, margin + 5, yPos);
        yPos += 4;
        doc.text(`Massimo: ${max.toFixed(2)}`, margin + 5, yPos);
        yPos += 4;
        doc.text(`Media: ${avg.toFixed(2)}`, margin + 5, yPos);
        yPos += 4;
        doc.text(`Totale: ${sum.toFixed(2)}`, margin + 5, yPos);
        yPos += 8;
      }
    }
  }

  // Add page numbers
  addPageNumbers();

  // Return PDF as ArrayBuffer
  return doc.output('arraybuffer');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    exportToExcel,
    exportToPDF
  };
}