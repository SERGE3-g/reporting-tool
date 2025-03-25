// export-integration.js - Script to integrate the export functionality with the existing application

// Execute when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Wait for necessary libraries to load
  loadDependencies()
    .then(() => {
      console.log('Export dependencies loaded successfully');
      initializeExportFeatures();
    })
    .catch(error => {
      console.error('Failed to load export dependencies:', error);
    });
});

/**
 * Loads all required dependencies for export functionality
 * @returns {Promise} Resolves when all dependencies are loaded
 */
function loadDependencies() {
  return new Promise((resolve, reject) => {
    // Track loaded libraries
    const requiredLibraries = {
      xlsx: false,
      jspdf: false,
      jspdfAutotable: false
    };

    // Check if XLSX is already loaded (might be included from CDN in HTML)
    if (window.XLSX) {
      requiredLibraries.xlsx = true;
    } else {
      // Load XLSX library from CDN
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')
        .then(() => {
          requiredLibraries.xlsx = true;
          checkAllLoaded();
        })
        .catch(error => {
          console.error('Failed to load XLSX library:', error);
          reject(error);
        });
    }

    // Load jsPDF if not already loaded
    if (window.jspdf && window.jspdf.jsPDF) {
      requiredLibraries.jspdf = true;
    } else {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
        .then(() => {
          requiredLibraries.jspdf = true;
          checkAllLoaded();
        })
        .catch(error => {
          console.error('Failed to load jsPDF library:', error);
          reject(error);
        });
    }

    // Load jsPDF-AutoTable plugin if not already loaded
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) {
      requiredLibraries.jspdfAutotable = true;
    } else {
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js')
        .then(() => {
          requiredLibraries.jspdfAutotable = true;
          checkAllLoaded();
        })
        .catch(error => {
          console.error('Failed to load jsPDF-AutoTable plugin:', error);
          reject(error);
        });
    }

    // Helper function to check if all libraries are loaded
    function checkAllLoaded() {
      if (Object.values(requiredLibraries).every(loaded => loaded)) {
        resolve();
      }
    }

    // Initial check in case all libraries are already loaded
    checkAllLoaded();
  });
}

/**
 * Load a JavaScript library from URL
 * @param {string} url - URL of the script to load
 * @returns {Promise} Resolves when script is loaded
 */
function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));

    document.head.appendChild(script);
  });
}

/**
 * Initialize export features and connect to the existing application
 */
function initializeExportFeatures() {
  // Add PDF export button if it doesn't exist
  const exportSection = document.querySelector('.section:nth-child(4)') ||
                        document.querySelector('.section');

  if (exportSection) {
    const exportButtons = exportSection.querySelector('.export-buttons');

    if (exportButtons) {
      // Check if PDF button already exists
      if (!document.getElementById('exportPdfButton')) {
        const pdfButton = document.createElement('button');
        pdfButton.id = 'exportPdfButton';
        pdfButton.className = 'btn btn-danger';
        pdfButton.innerHTML = '<i class="fas fa-file-pdf"></i> Esporta come PDF';
        pdfButton.disabled = true;

        exportButtons.appendChild(pdfButton);
      }
    }
  }

  // Initialize export UI
  const exportUI = initExportUI({
    getData: () => window.filteredData || window.allExtractedData || [],
    onExportStart: (format) => {
      const progressContainer = document.getElementById('progressContainer');
      if (progressContainer) {
        progressContainer.style.display = 'block';
        const progressBar = document.getElementById('progressBar');
        const progressPercentage = document.getElementById('progressPercentage');

        if (progressBar) progressBar.value = 10;
        if (progressPercentage) progressPercentage.textContent = '10%';
      }
    },
    onExportComplete: (format) => {
      const progressContainer = document.getElementById('progressContainer');
      if (progressContainer) {
        const progressBar = document.getElementById('progressBar');
        const progressPercentage = document.getElementById('progressPercentage');

        if (progressBar) progressBar.value = 100;
        if (progressPercentage) progressPercentage.textContent = '100%';

        setTimeout(() => {
          progressContainer.style.display = 'none';
        }, 1000);
      }
    },
    onExportError: (format, error) => {
      const progressContainer = document.getElementById('progressContainer');
      if (progressContainer) {
        progressContainer.style.display = 'none';
      }
    }
  });

  // Hook into the existing process button functionality
  const processButton = document.getElementById('processButton');
  if (processButton) {
    const originalProcessFunction = processButton.onclick;

    processButton.onclick = function(event) {
      // Call the original process function if it exists
      if (typeof originalProcessFunction === 'function') {
        originalProcessFunction.call(this, event);
      } else if (typeof window.processJSONFiles === 'function') {
        window.processJSONFiles();
      }

      // Enable export buttons after processing is done
      setTimeout(() => {
        const hasData = window.filteredData?.length > 0 || window.allExtractedData?.length > 0;
        exportUI.setEnabled(hasData);
      }, 1000);
    };
  }

  // Hook into the existing displayResults function to enable export buttons
  if (typeof window.displayResults === 'function') {
    const originalDisplayResults = window.displayResults;

    window.displayResults = function(data) {
      // Call the original display function
      originalDisplayResults(data);

      // Enable export buttons if we have data
      exportUI.setEnabled(data && data.length > 0);
    };
  }

  // Add keyboard shortcuts for export functions
  document.addEventListener('keydown', function(event) {
    // Only trigger if Control/Command key is pressed
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'e') {
        // Ctrl+E: Export as CSV
        event.preventDefault();
        const csvButton = document.getElementById('exportCsvButton');
        if (csvButton && !csvButton.disabled) {
          csvButton.click();
        }
      } else if (event.key === 'x' || (event.shiftKey && event.key === 'E')) {
        // Ctrl+X or Ctrl+Shift+E: Export as Excel
        event.preventDefault();
        const xlsxButton = document.getElementById('exportXlsxButton');
        if (xlsxButton && !xlsxButton.disabled) {
          xlsxButton.click();
        }
      } else if (event.key === 'p') {
        // Ctrl+P: Export as PDF
        event.preventDefault();
        const pdfButton = document.getElementById('exportPdfButton');
        if (pdfButton && !pdfButton.disabled) {
          pdfButton.click();
        }
      }
    }
  });

  console.log('Export features initialized successfully');
}