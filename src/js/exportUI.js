// exportUI.js - UI integration for export functionality

/**
 * Initialize export buttons and attach event listeners
 * @param {Object} options - Configuration options
 */
function initExportUI(options = {}) {
  const defaultOptions = {
    csvButtonId: 'exportCsvButton',
    xlsxButtonId: 'exportXlsxButton',
    pdfButtonId: 'exportPdfButton',
    exportMenuId: 'exportDropdownMenu',
    container: document.body,
    onExportStart: null,
    onExportComplete: null,
    onExportError: null
  };

  const config = { ...defaultOptions, ...options };

  // Create export dropdown if it doesn't exist
  let exportMenu = document.getElementById(config.exportMenuId);
  if (!exportMenu) {
    exportMenu = createExportMenu(config);
    config.container.appendChild(exportMenu);
  }

  // Attach event listeners to export buttons
  const csvButton = document.getElementById(config.csvButtonId);
  const xlsxButton = document.getElementById(config.xlsxButtonId);
  const pdfButton = document.getElementById(config.pdfButtonId);

  if (csvButton) {
    csvButton.addEventListener('click', () => handleExport('csv', config));
  }

  if (xlsxButton) {
    xlsxButton.addEventListener('click', () => handleExport('xlsx', config));
  }

  if (pdfButton) {
    pdfButton.addEventListener('click', () => handleExport('pdf', config));
  }

  // Return methods for programmatic control
  return {
    exportAs: (format, data, options) => performExport(format, data, options, config),
    setEnabled: (enabled) => setExportButtonsState(enabled, config),
    addExtraExportFormat: (format, label, handler) =>
      addCustomExportFormat(format, label, handler, config)
  };
}

/**
 * Creates the export dropdown menu
 * @param {Object} config - UI configuration
 * @returns {HTMLElement} The created dropdown menu
 */
function createExportMenu(config) {
  // Create the container div
  const container = document.createElement('div');
  container.className = 'export-buttons';
  container.id = config.exportMenuId;

  // Create CSV button
  const csvButton = document.createElement('button');
  csvButton.id = config.csvButtonId;
  csvButton.className = 'btn btn-success';
  csvButton.disabled = true;
  csvButton.innerHTML = '<i class="fas fa-file-csv"></i> Esporta come CSV';

  // Create XLSX button
  const xlsxButton = document.createElement('button');
  xlsxButton.id = config.xlsxButtonId;
  xlsxButton.className = 'btn btn-warning';
  xlsxButton.disabled = true;
  xlsxButton.innerHTML = '<i class="fas fa-file-excel"></i> Esporta come XLSX';

  // Create PDF button
  const pdfButton = document.createElement('button');
  pdfButton.id = config.pdfButtonId;
  pdfButton.className = 'btn btn-danger';
  pdfButton.disabled = true;
  pdfButton.innerHTML = '<i class="fas fa-file-pdf"></i> Esporta come PDF';

  // Append buttons to container
  container.appendChild(csvButton);
  container.appendChild(xlsxButton);
  container.appendChild(pdfButton);

  return container;
}

/**
 * Handles export button click
 * @param {string} format - Export format (csv, xlsx, pdf)
 * @param {Object} config - UI configuration
 */
function handleExport(format, config) {
  // Get data from global variable or through a callback
  let data = window.filteredData || [];

  if (typeof config.getData === 'function') {
    data = config.getData();
  }

  if (!data || data.length === 0) {
    showNotification('Nessun dato da esportare. Elabora i file prima di esportare.', 'error');
    return;
  }

  // Perform export
  performExport(format, data, {}, config);
}

/**
 * Performs the actual export operation
 * @param {string} format - Export format (csv, xlsx, pdf)
 * @param {Array} data - Data to export
 * @param {Object} options - Export options
 * @param {Object} config - UI configuration
 */
async function performExport(format, data, options = {}, config) {
  if (!data || data.length === 0) {
    showNotification('Nessun dato da esportare', 'error');
    return;
  }

  // Trigger onExportStart callback if provided
  if (typeof config.onExportStart === 'function') {
    config.onExportStart(format);
  }

  try {
    let result;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Report_Commissioni_${timestamp}`;

    switch (format.toLowerCase()) {
      case 'csv':
        result = exportToCSV(data, { filename: `${filename}.csv`, ...options });
        break;

      case 'xlsx':
        // Make sure XLSX library is available
        if (typeof exportToExcel !== 'function') {
          throw new Error('La libreria per l\'esportazione Excel non è disponibile');
        }
        result = exportToExcel(data, { fileName: `${filename}.xlsx`, ...options });
        downloadFile(result, `${filename}.xlsx`);
        break;

      case 'pdf':
        // Make sure PDF export function is available
        if (typeof exportToPDF !== 'function') {
          throw new Error('La libreria per l\'esportazione PDF non è disponibile');
        }

        // PDF generation may be asynchronous
        const pdfBuffer = await exportToPDF(data, { fileName: `${filename}.pdf`, ...options });
        const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
        downloadFile(pdfBlob, `${filename}.pdf`);
        break;

      default:
        throw new Error(`Formato di esportazione non supportato: ${format}`);
    }

    // Trigger onExportComplete callback if provided
    if (typeof config.onExportComplete === 'function') {
      config.onExportComplete(format, result);
    }

    showNotification(`Esportazione in formato ${format.toUpperCase()} completata`, 'success');
  } catch (error) {
    console.error('Errore durante l\'esportazione:', error);

    // Trigger onExportError callback if provided
    if (typeof config.onExportError === 'function') {
      config.onExportError(format, error);
    }

    showNotification(`Errore durante l'esportazione in formato ${format.toUpperCase()}: ${error.message}`, 'error');
  }
}

/**
 * Export data as CSV (reusing existing function from the application)
 * @param {Array} data - Data to export
 * @param {Object} options - Export options
 * @returns {Blob} CSV file as blob
 */
function exportToCSV(data, options = {}) {
  if (!data.length) return;

  let headers = Object.keys(data[0]);
  let csvRows = [headers.join(',')];

  data.forEach(row => {
    let rowArr = headers.map(h => `"${(row[h] || "").toString().replace(/"/g, '""')}"`);
    csvRows.push(rowArr.join(','));
  });

  let csvContent = csvRows.join('\n');
  let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  if (options.filename) {
    downloadFile(blob, options.filename);
  }

  return blob;
}

/**
 * Create and trigger download of a file
 * @param {Blob} blob - File content as Blob
 * @param {string} filename - Name of the file to download
 */
function downloadFile(blob, filename) {
  let url = window.URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

/**
 * Show notification message to the user
 * @param {string} message - Message to display
 * @param {string} type - Message type (info, success, error)
 */
function showNotification(message, type = 'info') {
  // Try to use existing notification system
  const resultInfo = document.getElementById('resultInfo');

  if (resultInfo) {
    resultInfo.textContent = message;
    resultInfo.style.display = 'block';

    switch(type) {
      case 'error':
        resultInfo.style.borderLeftColor = 'var(--danger)';
        break;
      case 'success':
        resultInfo.style.borderLeftColor = 'var(--success)';
        break;
      default:
        resultInfo.style.borderLeftColor = 'var(--primary)';
    }
    return;
  }

  // Fallback to alert if no notification system is available
  if (type === 'error') {
    console.error(message);
  } else {
    console.log(message);
  }

  // Optional: create a toast notification if no existing system
  createToastNotification(message, type);
}

/**
 * Create a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Message type (info, success, error)
 */
function createToastNotification(message, type = 'info') {
  // Check if toast container exists
  let toastContainer = document.querySelector('.toast-container');

  if (!toastContainer) {
    // Create toast container
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.backgroundColor = type === 'error' ? '#f72585' :
                               type === 'success' ? '#4cc9f0' : '#4361ee';
  toast.style.color = 'white';
  toast.style.padding = '10px 15px';
  toast.style.marginBottom = '10px';
  toast.style.borderRadius = '4px';
  toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  toast.style.minWidth = '250px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease';

  // Add toast message
  toast.textContent = message;

  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.float = 'right';
  closeBtn.style.background = 'transparent';
  closeBtn.style.border = 'none';
  closeBtn.style.color = 'white';
  closeBtn.style.fontSize = '16px';
  closeBtn.style.marginLeft = '10px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  };

  toast.insertBefore(closeBtn, toast.firstChild);

  // Add toast to container
  toastContainer.appendChild(toast);

  // Show toast with animation
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // Auto-remove toast after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

/**
 * Set the enabled/disabled state of export buttons
 * @param {boolean} enabled - Whether the buttons should be enabled
 * @param {Object} config - UI configuration
 */
function setExportButtonsState(enabled, config) {
  const csvButton = document.getElementById(config.csvButtonId);
  const xlsxButton = document.getElementById(config.xlsxButtonId);
  const pdfButton = document.getElementById(config.pdfButtonId);

  if (csvButton) csvButton.disabled = !enabled;
  if (xlsxButton) xlsxButton.disabled = !enabled;
  if (pdfButton) pdfButton.disabled = !enabled;
}

/**
 * Add custom export format to the UI
 * @param {string} format - Export format identifier
 * @param {string} label - Button label
 * @param {Function} handler - Export handler function
 * @param {Object} config - UI configuration
 */
function addCustomExportFormat(format, label, handler, config) {
  const exportMenu = document.getElementById(config.exportMenuId);

  if (!exportMenu) return;

  const buttonId = `export${format.charAt(0).toUpperCase() + format.slice(1)}Button`;

  // Check if button already exists
  if (document.getElementById(buttonId)) return;

  // Create new button
  const button = document.createElement('button');
  button.id = buttonId;
  button.className = 'btn btn-info';
  button.innerHTML = `<i class="fas fa-file-export"></i> ${label}`;

  // Add event listener
  button.addEventListener('click', () => {
    let data = window.filteredData || [];

    if (typeof config.getData === 'function') {
      data = config.getData();
    }

    if (!data || data.length === 0) {
      showNotification('Nessun dato da esportare', 'error');
      return;
    }

    if (typeof handler === 'function') {
      handler(data);
    }
  });

  // Add button to menu
  exportMenu.appendChild(button);

  return button;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initExportUI
  };
}