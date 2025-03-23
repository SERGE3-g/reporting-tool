// reporting.js - Logica per l'elaborazione e l'esportazione dei report

/************************************************************************
 * VARIABILI GLOBALI
 ************************************************************************/
let allExtractedData = [];
let currentFiles = [];
let filteredData = [];
let charts = [];  // Array per i grafici Chart.js

// Riferimenti ai campi DOM per la selezione file
const fileInput = document.getElementById('reportFileInput');
const fileInfo = document.getElementById('reportFileInfo');

// Riferimenti ai campi DOM per l'elaborazione
const generateReportBtn = document.getElementById('generateReportBtn');
const progressContainer = document.getElementById('reportProgressContainer');
const progressBar = document.getElementById('reportProgressBar');
const progressPercentage = document.getElementById('reportProgressPercentage');

// Riferimenti ai campi DOM per esportazione
const exportReportCsv = document.getElementById('exportReportCsv');
const exportReportXlsx = document.getElementById('exportReportXlsx');
const exportReportPdf = document.getElementById('exportReportPdf');
const exportReportHtml = document.getElementById('exportReportHtml');
const emailReport = document.getElementById('emailReport');

// Riferimenti ai campi DOM per filtri
const addFilterBtn = document.getElementById('addFilter');
const clearFiltersBtn = document.getElementById('clearFilters');
const loadPresetBtn = document.getElementById('loadPreset');
const savePresetBtn = document.getElementById('savePreset');
const filtersContainer = document.getElementById('reportFilters');

// Riferimenti ai campi DOM per la visualizzazione del report
const reportPreview = document.getElementById('reportPreview');
const reportSummary = document.getElementById('reportSummary');
const reportTableContainer = document.getElementById('reportTableContainer');
const reportChartContainer = document.getElementById('reportChartContainer');

// Riferimenti per le Data Source Options
const dataSourceOptions = document.querySelectorAll('.data-source-option');
const dataSourceContent = document.querySelectorAll('.data-source-content');

// Riferimenti per i tab
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

/************************************************************************
 * INIZIALIZZAZIONE E LISTENERS
 ************************************************************************/
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Setup tab navigation
    setupTabNavigation();

    // Setup data source selection
    setupDataSourceSelection();

    // Event Listeners per file input e gestione drag & drop
    setupFileInputListeners();

    // Event Listeners per i pulsanti e controlli
    setupButtonListeners();

    // Event Listeners per filtri
    setupFilterListeners();

    // Inizializza il report preview (nascosto inizialmente)
    reportPreview.style.display = 'none';

    // Popola i dati per storia, report programmati, modelli (per demo)
    populateDemoData();
}

function setupTabNavigation() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Rimuovi active da tutti i pulsanti e contenuti
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Aggiungi active al pulsante cliccato e al contenuto corrispondente
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function setupDataSourceSelection() {
    dataSourceOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Rimuovi selected da tutte le opzioni
            dataSourceOptions.forEach(opt => opt.classList.remove('selected'));

            // Aggiungi selected all'opzione cliccata
            option.classList.add('selected');

            // Nascondi tutti i contenuti e mostra quello selezionato
            const sourceId = option.getAttribute('data-source');
            dataSourceContent.forEach(content => content.classList.remove('active'));
            document.getElementById(`source-${sourceId}`).classList.add('active');
        });
    });
}

function setupFileInputListeners() {
    // File input change listener
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelection);
    }

    // Gestione drag & drop per file
    const fileInputLabel = document.querySelector('.file-input-label');
    if (fileInputLabel) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileInputLabel.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            fileInputLabel.addEventListener(eventName, () => {
                fileInputLabel.style.backgroundColor = '#e2e8f0';
                fileInputLabel.style.borderColor = '#4361ee';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileInputLabel.addEventListener(eventName, () => {
                fileInputLabel.style.backgroundColor = '#f1f5f9';
                fileInputLabel.style.borderColor = '#cbd5e1';
            }, false);
        });

        fileInputLabel.addEventListener('drop', handleDrop, false);
    }
}

function setupButtonListeners() {
    // Bottoni principali
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', processFiles);
    }

    if (exportReportCsv) {
        exportReportCsv.addEventListener('click', () => exportData('csv'));
    }

    if (exportReportXlsx) {
        exportReportXlsx.addEventListener('click', () => exportData('xlsx'));
    }

    if (exportReportPdf) {
        exportReportPdf.addEventListener('click', () => exportData('pdf'));
    }

    if (exportReportHtml) {
        exportReportHtml.addEventListener('click', () => exportData('html'));
    }

    if (emailReport) {
        emailReport.addEventListener('click', showEmailDialog);
    }

    // Bottoni per scheduled reports
    const addScheduledReportBtn = document.getElementById('addScheduledReport');
    if (addScheduledReportBtn) {
        addScheduledReportBtn.addEventListener('click', () => {
            const modal = document.getElementById('scheduledReportModal');
            if (modal) modal.style.display = 'block';
        });
    }

    // Bottoni per templates
    const createNewTemplateBtn = document.getElementById('createNewTemplate');
    if (createNewTemplateBtn) {
        createNewTemplateBtn.addEventListener('click', () => {
            // Mostra un dialogo o reindirizza alla pagina di creazione template
            showNotification('Funzionalità di creazione template in fase di sviluppo', 'info');
        });
    }

    // Bottoni nelle modal
    setupModalListeners();

    // Collegamenti per i template esistenti
    setupTemplateButtons();
}

function setupFilterListeners() {
    if (addFilterBtn) {
        addFilterBtn.addEventListener('click', addNewFilter);
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }

    if (loadPresetBtn) {
        loadPresetBtn.addEventListener('click', showLoadPresetDialog);
    }

    if (savePresetBtn) {
        savePresetBtn.addEventListener('click', showSavePresetDialog);
    }

    // Aggiungi event listener per il bottone di rimozione del filtro iniziale
    const initialRemoveBtn = document.querySelector('.remove-filter');
    if (initialRemoveBtn) {
        initialRemoveBtn.addEventListener('click', function() {
            this.closest('.filter-item').remove();
        });
    }
}

function setupModalListeners() {
    // Modal close buttons
    const modalCloseButtons = document.querySelectorAll('.modal-close, .modal-close-btn');
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Save scheduled report button
    const saveScheduledReportBtn = document.getElementById('saveScheduledReport');
    if (saveScheduledReportBtn) {
        saveScheduledReportBtn.addEventListener('click', saveScheduledReport);
    }
}

function saveScheduledReport() {
    // Raccoglie i dati dal form
    const name = document.getElementById('scheduledReportName').value;
    const type = document.getElementById('scheduledReportType').value;
    const frequency = document.getElementById('scheduledFrequency').value;
    const time = document.getElementById('scheduledTime').value;
    const emails = document.getElementById('scheduledEmails').value;

    // Validazione base
    if (!name || !emails) {
        showNotification('Per favore compila tutti i campi obbligatori', 'warning');
        return;
    }

    // In una versione completa, qui si salverebbero i dati
    // Per ora, mostriamo un successo e chiudiamo il modal
    showNotification(`Report programmato "${name}" salvato con successo`, 'success');

    // Aggiungi alla tabella (solo per demo)
    addScheduledReportToTable(name, frequency, time, emails, type);

    // Chiudi il modal
    document.getElementById('scheduledReportModal').style.display = 'none';
}

function addScheduledReportToTable(name, frequency, time, emails, type) {
    const tbody = document.getElementById('scheduledTableBody');
    if (!tbody) return;

    // Calcola la prossima esecuzione
    const nextRun = calculateNextRun(frequency);

    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${name}</td>
        <td>${getFrequencyText(frequency)}</td>
        <td>${nextRun}</td>
        <td>${emails}</td>
        <td><span class="badge badge-success">Attivo</span></td>
        <td>
            <button class="btn btn-sm btn-info edit-schedule">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-schedule">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;

    // Aggiungi event listeners
    const editBtn = row.querySelector('.edit-schedule');
    const deleteBtn = row.querySelector('.delete-schedule');

    editBtn.addEventListener('click', function() {
        // Implementazione reale: aprirebbe il modal con i dati pre-compilati
        showNotification('Funzionalità di modifica in fase di sviluppo', 'info');
    });

    deleteBtn.addEventListener('click', function() {
        if (confirm('Sei sicuro di voler eliminare questo report programmato?')) {
            row.remove();
            showNotification('Report programmato eliminato', 'success');
        }
    });

    tbody.appendChild(row);
}

function calculateNextRun(frequency) {
    const now = new Date();
    let next = new Date(now);

    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            break;
    }

    return next.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getFrequencyText(frequency) {
    switch (frequency) {
        case 'daily': return 'Giornaliero';
        case 'weekly': return 'Settimanale';
        case 'monthly': return 'Mensile';
        case 'quarterly': return 'Trimestrale';
        default: return frequency;
    }
}

function setupTemplateButtons() {
    // Use template buttons
    const useTemplateButtons = document.querySelectorAll('.use-template');
    useTemplateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const templateName = this.closest('.template-card').querySelector('h3').textContent;
            useReportTemplate(templateName);
        });
    });

    // Edit template buttons
    const editTemplateButtons = document.querySelectorAll('.edit-template');
    editTemplateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const templateName = this.closest('.template-card').querySelector('h3').textContent;
            editReportTemplate(templateName);
        });
    });

    // Delete template buttons
    const deleteTemplateButtons = document.querySelectorAll('.delete-template');
    deleteTemplateButtons.forEach(button => {
        button.addEventListener('click', function() {
            const templateName = this.closest('.template-card').querySelector('h3').textContent;
            deleteReportTemplate(templateName);
        });
    });
}

function useReportTemplate(templateName) {
    // Cambia tab a "Nuovo Report"
    const newReportTab = document.querySelector('[data-tab="new-report"]');
    if (newReportTab) newReportTab.click();

    // Implementa la logica di pre-compilazione dei campi in base al template selezionato
    showNotification(`Template "${templateName}" caricato con successo`, 'success');

    // Pre-compila i campi del report in base al template (solo per demo)
    document.getElementById('reportName').value = templateName;

    switch(templateName) {
        case 'Report Mensile Commissioni':
            document.getElementById('reportDescription').value = 'Riepilogo mensile delle commissioni con analisi per tipo di transazione e confronto con il mese precedente.';
            document.getElementById('reportType').value = 'detailed';
            document.getElementById('includeCharts').checked = true;
            break;
        case 'Report Finanziario':
            document.getElementById('reportDescription').value = 'Report dettagliato finanziario con analisi dei flussi di cassa e proiezioni future.';
            document.getElementById('reportType').value = 'summary';
            document.getElementById('reportFormat').value = 'xlsx';
            break;
        case 'Analisi Trend':
            document.getElementById('reportDescription').value = 'Analisi dei trend delle commissioni e transazioni negli ultimi 12 mesi con proiezioni.';
            document.getElementById('reportType').value = 'comparison';
            document.getElementById('includeStatistics').checked = true;
            break;
    }
}

function editReportTemplate(templateName) {
    // In una versione completa, qui si aprirebbe un form di editing
    showNotification(`Modifica del template "${templateName}" in fase di sviluppo`, 'info');
}

function deleteReportTemplate(templateName) {
    if (confirm(`Sei sicuro di voler eliminare il template "${templateName}"?`)) {
        // Trova e rimuovi la card del template
        const cards = document.querySelectorAll('.template-card');
        cards.forEach(card => {
            const title = card.querySelector('h3');
            if (title && title.textContent === templateName) {
                card.remove();
                showNotification(`Template "${templateName}" eliminato con successo`, 'success');
            }
        });
    }
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

/************************************************************************
 * GESTIONE FILE
 ************************************************************************/
function handleFileSelection(e) {
    currentFiles = Array.from(e.target.files);
    updateFileInfo();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;

    currentFiles = Array.from(files).filter(file => {
        const extension = file.name.split('.').pop().toLowerCase();
        return ['json', 'xml', 'csv', 'xlsx'].includes(extension);
    });

    fileInput.files = files; // Aggiorna l'input file
    updateFileInfo();
}

function updateFileInfo() {
    if (currentFiles.length > 0) {
        let infoStr = '';
        currentFiles.forEach(f => {
            infoStr += `<div><i class="fas fa-file-code"></i> ${f.name} (${formatFileSize(f.size)})</div>`;
        });
        fileInfo.innerHTML = `<strong>File selezionati:</strong><br>${infoStr}`;
        generateReportBtn.disabled = false;
    } else {
        fileInfo.innerHTML = '';
        generateReportBtn.disabled = true;
    }

    // Reset della preview
    resetPreview();
}

function resetPreview() {
    // Reset dei dati
    allExtractedData = [];
    filteredData = [];

    // Nascondi la preview del report
    reportPreview.style.display = 'none';
    reportSummary.innerHTML = '';
    reportTableContainer.innerHTML = '';
    reportChartContainer.innerHTML = '';

    // Disabilita i pulsanti di esportazione
    exportReportCsv.disabled = true;
    exportReportXlsx.disabled = true;
    exportReportPdf.disabled = true;
    exportReportHtml.disabled = true;
    emailReport.disabled = true;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

/************************************************************************
 * FILTRI
 ************************************************************************/
function addNewFilter() {
    const filterItem = document.createElement('div');
    filterItem.className = 'filter-item';

    filterItem.innerHTML = `
        <div class="filter-row">
            <select class="form-control filter-field">
                <option value="">Seleziona campo...</option>
                <option value="Addebito">Addebito</option>
                <option value="IBAN">IBAN</option>
                <option value="fee scadenza">Fee scadenza</option>
                <option value="totale transazioni">Totale transazioni</option>
                <option value="descrizione">Descrizione</option>
            </select>

            <select class="form-control filter-operator">
                <option value=">">></option>
                <option value="<"><</option>
                <option value="=">=</option>
                <option value=">=">>=</option>
                <option value="<="><=</option>
                <option value="contiene">contiene</option>
            </select>

            <input type="text" class="form-control filter-value" placeholder="Valore">

            <button class="btn btn-danger remove-filter">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Aggiungi event listener per il pulsante di rimozione
    const removeBtn = filterItem.querySelector('.remove-filter');
    removeBtn.addEventListener('click', function() {
        filterItem.remove();
    });

    // Aggiungi il nuovo filtro al container
    filtersContainer.appendChild(filterItem);
}

function showLoadPresetDialog() {
    // In una versione completa, qui si aprirebbe un dialogo per caricare presets
    // Per ora, mostriamo un messaggio informativo
    showNotification('Funzionalità di caricamento preset in fase di sviluppo', 'info');
}

function showSavePresetDialog() {
    // In una versione completa, qui si aprirebbe un dialogo per salvare presets
    // Per ora, mostriamo un messaggio informativo
    showNotification('Funzionalità di salvataggio preset in fase di sviluppo', 'info');
}

function clearAllFilters() {
    // Mantieni solo il primo filtro e resettalo
    const filterItems = filtersContainer.querySelectorAll('.filter-item');

    // Rimuovi tutti tranne il primo
    for (let i = 1; i < filterItems.length; i++) {
        filterItems[i].remove();
    }

    // Resetta il primo filtro
    if (filterItems.length > 0) {
        const firstFilter = filterItems[0];
        const fieldSelect = firstFilter.querySelector('.filter-field');
        const operatorSelect = firstFilter.querySelector('.filter-operator');
        const valueInput = firstFilter.querySelector('.filter-value');

        fieldSelect.value = '';
        operatorSelect.value = '>';
        valueInput.value = '';
    }
}

function getActiveFilters() {
    const filters = [];
    const filterItems = filtersContainer.querySelectorAll('.filter-item');

    filterItems.forEach(item => {
        const field = item.querySelector('.filter-field').value;
        const operator = item.querySelector('.filter-operator').value;
        const value = item.querySelector('.filter-value').value;

        if (field && value) {
            filters.push({ field, operator, value });
        }
    });

    return filters;
}

function applyFilters(data) {
    const filters = getActiveFilters();

    // Se non ci sono filtri, restituisci tutti i dati
    if (filters.length === 0) {
        return data.slice();
    }

    // Applica tutti i filtri in sequenza
    return data.filter(item => {
        // L'elemento deve passare TUTTI i filtri
        return filters.every(filter => {
            const { field, operator, value } = filter;
            const itemValue = item[field] || "";

            if (!itemValue) return false;

            if (["<", ">", "<=", ">=", "="].includes(operator)) {
                const numericVal = parseFloat(itemValue.replace(',', '.').replace(/[^0-9.-]/g, ''));
                const numericFilter = parseFloat(value.replace(',', '.'));

                if (isNaN(numericVal) || isNaN(numericFilter)) return false;

                switch (operator) {
                    case ">":
                        return numericVal > numericFilter;
                    case "<":
                        return numericVal < numericFilter;
                    case ">=":
                        return numericVal >= numericFilter;
                    case "<=":
                        return numericVal <= numericFilter;
                    case "=":
                        return numericVal === numericFilter;
                }
            } else if (operator === "contiene") {
                return String(itemValue).toLowerCase().includes(value.toLowerCase());
            }

            return false;
        });
    });
}

/************************************************************************
 * ELABORAZIONE FILE
 ************************************************************************/
async function processFiles() {
    if (currentFiles.length === 0) {
        showNotification('Nessun file selezionato. Seleziona almeno un file da elaborare.', 'warning');
        return;
    }

    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressPercentage.textContent = '0%';

    // Reset dei dati
    allExtractedData = [];

    let fileCount = currentFiles.length;
    for (let i = 0; i < fileCount; i++) {
        let file = currentFiles[i];
        try {
            let text = await readFileAsText(file);
            let data;

            // Gestione diversi formati di file
            const extension = file.name.split('.').pop().toLowerCase();

            switch (extension) {
                case 'json':
                    data = JSON.parse(text);
                    extractDataFromJson(data);
                    break;
                case 'xml':
                    data = parseXML(text);
                    extractDataFromXml(data);
                    break;
                case 'csv':
                    data = parseCSV(text);
                    extractDataFromCsv(data);
                    break;
                case 'xlsx':
                    // Per Excel servirebbe una libreria come SheetJS
                    showNotification('Il supporto per file Excel è in fase di sviluppo.', 'info');
                    break;
                default:
                    throw new Error(`Formato file non supportato: ${extension}`);
            }
        } catch (err) {
            console.error("Errore lettura file:", file.name, err);
            showNotification(`Errore nel file ${file.name}: ${err.message}`, 'error');
        }

        let percentage = Math.round(((i + 1) / fileCount) * 100);
        progressBar.value = percentage;
        progressPercentage.textContent = `${percentage}%`;
    }

    // Applica i filtri
    filteredData = applyFilters(allExtractedData);

    // Mostra i risultati
    displayResults(filteredData);

    // Disabilita la barra di progresso
    progressContainer.style.display = 'none';
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsText(file);
    });
}

/************************************************************************
 * ESPORTAZIONE DATI
 ************************************************************************/
function exportData(format) {
    if (filteredData.length === 0) {
        showNotification('Nessun dato disponibile per l\'esportazione', 'warning');
        return;
    }

    // Get report name from input or use default
    const reportName = document.getElementById('reportName').value || 'Report_Commissioni';

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${reportName}_${timestamp}`;

    switch (format) {
        case 'csv':
            exportAsCsv(filteredData, `${filename}.csv`);
            break;
        case 'xlsx':
            exportAsXlsx(filteredData, `${filename}.xlsx`);
            break;
        case 'pdf':
            exportAsPdf(filteredData, `${filename}.pdf`);
            break;
        case 'html':
            exportAsHtml(filteredData, `${filename}.html`);
            break;
    }
}

function exportAsCsv(data, filename) {
    // Get all unique keys as headers
    const headers = [];
    data.forEach(item => {
        Object.keys(item).forEach(key => {
            if (!headers.includes(key)) {
                headers.push(key);
            }
        });
    });

    // Create CSV content
    let csvContent = headers.join(',') + '\\n';

    // Add data rows
    data.forEach(item => {
        const row = headers.map(header => {
            // Format the cell content and escape commas, quotes, etc.
            const cellValue = item[header] || '';
            return `"${cellValue.toString().replace(/"/g, '""')}"`;
        });
        csvContent += row.join(',') + '\\n';
    });

    // Create and download the file
    downloadFile(csvContent, filename, 'text/csv');

    showNotification(`Report esportato con successo come CSV: ${filename}`, 'success');
}

function exportAsXlsx(data, filename) {
    // Nelle applicazioni reali, qui useremmo una libreria come SheetJS
    // Per ora, simuliamo l'esportazione
    showNotification('Esportazione XLSX in corso...', 'info');

    // Simulazione di elaborazione asincrona
    setTimeout(() => {
        showNotification(`Report esportato con successo come Excel: ${filename}`, 'success');
    }, 1000);
}

function exportAsPdf(data, filename) {
    // Nelle applicazioni reali, qui useremmo una libreria come jsPDF
    // Per ora, simuliamo l'esportazione
    showNotification('Esportazione PDF in corso...', 'info');

    // Simulazione di elaborazione asincrona
    setTimeout(() => {
        showNotification(`Report esportato con successo come PDF: ${filename}`, 'success');
    }, 1000);
}

function exportAsHtml(data, filename) {
    // Crea un HTML completo con tutti i dati
    const reportTitle = document.getElementById('reportName').value || 'Report Commissioni';
    const reportDescription = document.getElementById('reportDescription').value || '';

    let htmlContent = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportTitle}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #4361ee;
            text-align: center;
        }
        h2 {
            color: #3f37c9;
            margin-top: 30px;
        }
        .report-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px 15px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
        }
        th {
            background-color: #f1f5f9;
            font-weight: 500;
        }
        tr:hover {
            background-color: #f8fafc;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            color: #666;
            font-size: 0.9rem;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <h1>${reportTitle}</h1>
    <div class="report-info">
        <p><strong>Descrizione:</strong> ${reportDescription}</p>
        <p><strong>Data generazione:</strong> ${new Date().toLocaleString('it-IT')}</p>
        <p><strong>Numero record:</strong> ${data.length}</p>
    </div>
    
    <h2>Dati Estratti</h2>
    <table>
        <thead>
            <tr>
`;

    // Crea intestazioni tabella
    const headers = [];
    data.forEach(item => {
        Object.keys(item).forEach(key => {
            if (!headers.includes(key)) {
                headers.push(key);
            }
        });
    });

    headers.forEach(header => {
        htmlContent += `                <th>${header}</th>\n`;
    });

    htmlContent += `            </tr>
        </thead>
        <tbody>
`;

    // Aggiungi righe dati
    data.forEach(item => {
        htmlContent += `            <tr>\n`;
        headers.forEach(header => {
            htmlContent += `                <td>${item[header] || ''}</td>\n`;
        });
        htmlContent += `            </tr>\n`;
    });

    htmlContent += `        </tbody>
    </table>
    
    <div class="footer">
        <p>© 2025 - Tool Reporting Commissioni | Powered by Serge Guea</p>
    </div>
</body>
</html>`;

    // Crea e scarica il file
    downloadFile(htmlContent, filename, 'text/html');

    showNotification(`Report esportato con successo come HTML: ${filename}`, 'success');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function parseXML(xmlString) {
    const parser = new DOMParser();
    return parser.parseFromString(xmlString, 'text/xml');
}

function parseCSV(csvString) {
    // Implementazione semplice di parsing CSV
    const lines = csvString.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
        if (!line.trim()) return null;

        const values = line.split(',');
        const obj = {};

        headers.forEach((header, i) => {
            obj[header] = values[i] ? values[i].trim() : '';
        });

        return obj;
    }).filter(item => item !== null);
}

/************************************************************************
 * ESTRAZIONE DATI
 ************************************************************************/
function extractDataFromJson(jsonData) {
    exploreObject(jsonData);
}

function exploreObject(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
        obj.forEach(item => exploreObject(item));
    } else {
        let foundKey = Object.keys(obj).find(k => k.toLowerCase() === "descriptionmerchant");

        if (foundKey) {
            let merchantValue = obj[foundKey];
            let record = {"descriptionMerchant": String(merchantValue)};
            extractFieldsFromText(record, String(merchantValue));
            allExtractedData.push(record);
        }

        Object.keys(obj).forEach(k => {
            let val = obj[k];
            if (val && typeof val === 'object') {
                exploreObject(val);
            }
        });
    }
}

function extractDataFromXml(xmlData) {
    // Esempio di estrazione da XML
    const merchants = xmlData.getElementsByTagName('merchant');

    for (let i = 0; i < merchants.length; i++) {
        const merchant = merchants[i];
        const description = getXmlElementText(merchant, 'description');

        if (description) {
            let record = {"descriptionMerchant": description};
            extractFieldsFromText(record, description);
            allExtractedData.push(record);
        }
    }
}

function getXmlElementText(parent, tagName) {
    const elements = parent.getElementsByTagName(tagName);
    if (elements.length > 0) {
        return elements[0].textContent;
    }
    return '';
}

function extractDataFromCsv(csvData) {
    csvData.forEach(row => {
        // Cerca la colonna che potrebbe contenere la descrizione del merchant
        let description = '';

        // Cerca in vari possibili nomi di colonna
        const possibleKeys = ['description', 'descriptionMerchant', 'merchant', 'descrizione'];
        for (const key of possibleKeys) {
            if (row[key]) {
                description = row[key];
                break;
            }
        }

        // Se non troviamo una descrizione specifica, usa la prima colonna
        if (!description && Object.values(row).length > 0) {
            description = Object.values(row)[0];
        }

        if (description) {
            let record = {"descriptionMerchant": description};
            extractFieldsFromText(record, description);
            allExtractedData.push(record);
        }
    });
}

// Replica la logica di "extract_fields_from_text"
function extractFieldsFromText(record, text) {
    let t = text || "";

    // ADDEBITO
    let rgxAddebito = new RegExp(
        '(?:addebito|importo|pagamento|EUR|euro|USD|€|\\$)\\s*[di]*\\s*:*\\s*([0-9.,]+)',
        'i'
    );
    let matchAddebito = t.match(rgxAddebito);
    if (matchAddebito) {
        record["Addebito"] = matchAddebito[1].trim();
    } else {
        let rgxMoney2 = new RegExp('(€\\s*[0-9.,]+|\\$\\s*[0-9.,]+|[0-9.,]+\\s*€|[0-9.,]+\\s*\\$|[0-9.,]+\\s*EUR)', 'i');
        let m2 = t.match(rgxMoney2);
        record["Addebito"] = m2 ? m2[0].trim() : "";
    }

    // IBAN
    let rgxIban = new RegExp('(?:IBAN|conto)\\s*:*\\s*([A-Z0-9 ]{10,34})', 'i');
    let matchIban = t.match(rgxIban);
    if (matchIban) {
        record["IBAN"] = matchIban[1].trim();
    } else {
        let rgxIban2 = new RegExp('(IT\\s*[0-9A-Z ]{10,30})', 'i');
        let mIban2 = t.match(rgxIban2);
        record["IBAN"] = mIban2 ? mIban2[0].trim() : "";
    }

    // Fee + scadenza
    let rgxFee = new RegExp('(?:fee|commissione|spese)\\s*[di]*\\s*:*\\s*([0-9.,]+)(?:\\s*[€\\$%])?', 'i');
    let matchFee = t.match(rgxFee);
    let rgxScad = new RegExp('(?:scadenza|scad\\.|entro il)\\s*:*\\s*(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}\\s+[a-z]{3,10}\\s+\\d{2,4})', 'i');
    let matchScad = t.match(rgxScad);
    if (matchFee && matchScad) {
        record["fee scadenza"] = matchFee[1].trim() + " - " + matchScad[1].trim();
    } else if (matchFee) {
        record["fee scadenza"] = matchFee[1].trim();
    } else if (matchScad) {
        record["fee scadenza"] = matchScad[1].trim();
    } else {
        record["fee scadenza"] = "";
    }

    // Totale transazioni
    let rgxTot = new RegExp('(?:totale|transazioni|operazioni)\\s*[di]*\\s*:*\\s*([0-9.,]+)', 'i');
    let matchTot = t.match(rgxTot);
    if (matchTot) {
        record["totale transazioni"] = matchTot[1].trim();
    } else {
        let rgxTot2 = new RegExp('transazioni\\s*(?:[a-z ]*)\\s*([0-9]+)', 'i');
        let mTot2 = t.match(rgxTot2);
        record["totale transazioni"] = mTot2 ? mTot2[1].trim() : "";
    }

    // Descrizione
    let rgxDesc = new RegExp('(?:descrizione|note|dettagli|causale)\\s*:*\\s*(.+?)(?:\\.|$)', 'i');
    let matchDesc = t.match(rgxDesc);
    if (matchDesc) {
        record["descrizione"] = matchDesc[1].trim();
    } else {
        let words = t.split(/\s+/);
        record["descrizione"] = words.length > 5 ? words.slice(0, 5).join(" ") + "..." : t;
    }
}

/************************************************************************
 * VISUALIZZAZIONE RISULTATI
 ************************************************************************/
function displayResults(data) {
    if (data.length === 0) {
        showNotification('Nessun record estratto o nessun dato corrisponde ai filtri.', 'warning');
        reportPreview.style.display = 'none';
        return;
    }

    // Mostra il pannello di anteprima
    reportPreview.style.display = 'block';

    // Mostra il riepilogo
    reportSummary.innerHTML = `
        <div class="report-summary-item">
            <span class="summary-label">Records trovati:</span>
            <span class="summary-value">${data.length}</span>
        </div>
        <div class="report-summary-item">
            <span class="summary-label">File elaborati:</span>
            <span class="summary-value">${currentFiles.length}</span>
        </div>
        <div class="report-summary-item">
            <span class="summary-label">Dimensione dati:</span>
            <span class="summary-value">${formatFileSize(JSON.stringify(data).length)}</span>
        </div>
    `;

    // Crea la tabella dei dati
    createDataTable(data);

    // Crea i grafici
    createDataCharts(data);

    // Abilita i pulsanti di esportazione
    exportReportCsv.disabled = false;
    exportReportXlsx.disabled = false;
    exportReportPdf.disabled = false;
    exportReportHtml.disabled = false;
    emailReport.disabled = false;
}

function createDataTable(data) {
    reportTableContainer.innerHTML = '';

    // Identifica i campi da mostrare nella tabella
    const fields = ['descriptionMerchant', 'Addebito', 'IBAN', 'fee scadenza', 'totale transazioni', 'descrizione'];

    // Crea la tabella
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    // Crea l'intestazione
    const headerRow = document.createElement('tr');
    fields.forEach(field => {
        const th = document.createElement('th');
        th.textContent = field;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Limita a 50 righe per la visualizzazione
    const limit = Math.min(50, data.length);

    // Aggiungi le righe dei dati
    for (let i = 0; i < limit; i++) {
        const row = document.createElement('tr');
        fields.forEach(field => {
            const td = document.createElement('td');
            let value = data[i][field] || '';
            if (value.length > 50) {
                value = value.substring(0, 47) + '...';
            }
            td.textContent = value;
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }

    // Assembla la tabella
    table.appendChild(thead);
    table.appendChild(tbody);
    reportTableContainer.appendChild(table);

    // Aggiungi un messaggio se ci sono più record di quelli mostrati
    if (data.length > limit) {
        const p = document.createElement('p');
        p.className = 'table-info';
        p.textContent = `Mostrati ${limit} record su ${data.length}. Esporta per visualizzare tutti i dati.`;
        reportTableContainer.appendChild(p);
    }
}

function createDataCharts(data) {
    reportChartContainer.innerHTML = '';

    // Distruggi i grafici precedenti per evitare memory leak
    charts.forEach(chart => chart.destroy());
    charts = [];

    // Crea i contenitori per i grafici
    const chartBox1 = document.createElement('div');
    chartBox1.className = 'chart-box';
    const canvas1 = document.createElement('canvas');
    chartBox1.appendChild(canvas1);

    const chartBox2 = document.createElement('div');
    chartBox2.className = 'chart-box';
    const canvas2 = document.createElement('canvas');
    chartBox2.appendChild(canvas2);

    reportChartContainer.appendChild(chartBox1);
    reportChartContainer.appendChild(chartBox2);

    // Estrai i dati per i grafici
    const addebitoValues = [];
    const transazioniValues = [];

    data.forEach(item => {
        let addebito = parseFloat(item['Addebito']?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        let transazioni = parseFloat(item['totale transazioni']?.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;

        if (!isNaN(addebito)) addebitoValues.push(addebito);
        if (!isNaN(transazioni)) transazioniValues.push(transazioni);
    });

    // Crea il primo grafico (distribuzione degli addebiti)
    if (addebitoValues.length > 0) {
        const ctx1 = canvas1.getContext('2d');

        // Crea bins per l'istogramma
        const bins = createHistogramBins(addebitoValues, 10);

        const chart1 = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: bins.labels,
                datasets: [{
                    label: 'Distribuzione degli Addebiti',
                    data: bins.counts,
                    backgroundColor: 'rgba(67, 97, 238, 0.7)',
                    borderColor: 'rgba(67, 97, 238, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuzione degli Addebiti'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Frequenza'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Valore Addebito'
                        }
                    }
                }
            }
        });

        charts.push(chart1);
    }

    // Crea il secondo grafico (distribuzione delle transazioni)
    if (transazioniValues.length > 0) {
        const ctx2 = canvas2.getContext('2d');

        // Crea una distribuzione a torta per le transazioni
        // Raggruppa le transazioni in categorie
        const transazioniGroups = {
            'Basse (1-10)': 0,
            'Medie (11-50)': 0,
            'Alte (51-100)': 0,
            'Molto alte (>100)': 0
        };

        transazioniValues.forEach(val => {
            if (val <= 10) transazioniGroups['Basse (1-10)']++;
            else if (val <= 50) transazioniGroups['Medie (11-50)']++;
            else if (val <= 100) transazioniGroups['Alte (51-100)']++;
            else transazioniGroups['Molto alte (>100)']++;
        });

        const chart2 = new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: Object.keys(transazioniGroups),
                datasets: [{
                    data: Object.values(transazioniGroups),
                    backgroundColor: [
                        'rgba(76, 201, 240, 0.7)',
                        'rgba(72, 149, 239, 0.7)',
                        'rgba(63, 55, 201, 0.7)',
                        'rgba(247, 37, 133, 0.7)'
                    ],
                    borderColor: [
                        'rgba(76, 201, 240, 1)',
                        'rgba(72, 149, 239, 1)',
                        'rgba(63, 55, 201, 1)',
                        'rgba(247, 37, 133, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuzione delle Transazioni'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });

        charts.push(chart2);
    }
}

function createHistogramBins(values, binCount) {
    if (values.length === 0) return { labels: [], counts: [] };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const binSize = range / binCount;

    const counts = new Array(binCount).fill(0);
    const labels = [];

    // Crea le etichette dei bin
    for (let i = 0; i < binCount; i++) {
        const start = min + i * binSize;
        const end = start + binSize;
        labels.push(`${start.toFixed(2)} - ${end.toFixed(2)}`);
    }

    // Popola i bin
    values.forEach(value => {
        // Trova il bin appropriato
        if (value === max) {
            // Edge case: il valore massimo va nell'ultimo bin
            counts[binCount - 1]++;
        } else {
            const binIndex = Math.floor((value - min) / binSize);
            counts[binIndex]++;
        }
    });

    return { labels, counts };
}