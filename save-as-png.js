/************************************************************************
 * NOTIFICHE
 ************************************************************************/
function showNotification(message, type = 'info') {
    resultInfo.textContent = message;
    resultInfo.style.display = 'block';
    switch (type) {
        case 'error':
            resultInfo.style.borderLeftColor = 'var(--danger)';
            break;
        case 'success':
            resultInfo.style.borderLeftColor = 'var(--success)';
            break;
        case 'warning':
            resultInfo.style.borderLeftColor = 'var(--warning)';
            break;
        default:
            resultInfo.style.borderLeftColor = 'var(--primary)';
    }
    // Nascondi il messaggio dopo 5 secondi per success e info
    if (type === 'success' || type === 'info') {
        setTimeout(closeNotification, 5000);
    }
}

function closeNotification() {
    resultInfo.style.display = 'none';
}

/************************************************************************
 * VARIABILI GLOBALI E RIFERIMENTI DOM
 ************************************************************************/
let allExtractedData = [];
let currentFiles = [];
let filteredData = [];
let charts = [];            // Array per i grafici Chart.js
let filterPresets = [];
let emailConfig = {
    service: '',
    user: '',
    password: '',
    smtpServer: '',
    smtpPort: ''
};

// Riferimenti agli elementi DOM
const jsonFileInput     = document.getElementById('jsonFileInput');
const fileInfo          = document.getElementById('fileInfo');
const processButton     = document.getElementById('processButton');
const progressContainer = document.getElementById('progressContainer');
const progressBar       = document.getElementById('progressBar');
const progressPercentage= document.getElementById('progressPercentage');
const resultInfo        = document.getElementById('resultInfo');
const previewDiv        = document.getElementById('preview');
const exportCsvButton   = document.getElementById('exportCsvButton');
const exportXlsxButton  = document.getElementById('exportXlsxButton');
const exportPdfButton   = document.getElementById('exportPdfButton');
const generateStatsBtn  = document.getElementById('generateStatsButton');

// Filtri
const enableFilterCheck = document.getElementById('enableFilter');
const filterFieldSelect = document.getElementById('filterField');
const filterOperatorSel = document.getElementById('filterOperator');
const filterValueInput  = document.getElementById('filterValue');

// Checkbox per i campi da estrarre
const fieldsMap = {
    "descriptionMerchant": document.getElementById('field_descriptionMerchant'),
    "Addebito":            document.getElementById('field_Addebito'),
    "IBAN":                document.getElementById('field_IBAN'),
    "fee scadenza":        document.getElementById('field_feeScadenza'),
    "totale transazioni":  document.getElementById('field_totaleTransazioni'),
    "descrizione":         document.getElementById('field_descrizione'),
};

// Statistiche e Dashboard
const statsFieldSelectElem = document.getElementById('statsFieldSelect');
const statsPreview        = document.getElementById('statsPreview');
const chartsContainer     = document.getElementById('chartsContainer');
const dashboardContainer  = document.getElementById('dashboardContainer');

// Elementi Email UI (se presenti)
const emailElements = {
    tabBtns: document.querySelectorAll('.tab-btn'),
    emailRecipients: document.getElementById('emailRecipients'),
    emailSubject: document.getElementById('emailSubject'),
    emailMessage: document.getElementById('emailMessage'),
    formatCsvRadio: document.getElementById('formatCsv'),
    formatXlsxRadio: document.getElementById('formatXlsx'),
    includeStatsCheck: document.getElementById('includeStats'),
    sendEmailBtn: document.getElementById('sendEmailBtn'),
    emailStatus: document.getElementById('emailStatus'),
    emailService: document.getElementById('emailService'),
    emailUser: document.getElementById('emailUser'),
    emailPassword: document.getElementById('emailPassword'),
    smtpServer: document.getElementById('smtpServer'),
    smtpPort: document.getElementById('smtpPort'),
    smtpSecure: document.getElementById('smtpSecure'),
    smtpFrom: document.getElementById('smtpFrom'),
    smtpSettings: document.getElementById('smtpSettings'),
    testSmtpBtn: document.getElementById('testSmtpBtn'),
    saveSmtpBtn: document.getElementById('saveSmtpBtn'),
    smtpStatus: document.getElementById('smtpStatus')
};

/************************************************************************
 * LISTENER PRINCIPALI
 ************************************************************************/
// Gestione file
jsonFileInput.addEventListener('change', handleFileSelection);
processButton.addEventListener('click', processJSONFiles);
exportCsvButton.addEventListener('click', () => exportData('csv'));
exportXlsxButton.addEventListener('click', () => exportData('xlsx'));
exportPdfButton.addEventListener('click', () => exportData('pdf'));
generateStatsBtn.addEventListener('click', generateStatistics);

// Preset filtri
document.getElementById('savePresetButton').addEventListener('click', saveFilterPreset);
document.getElementById('loadPresetButton').addEventListener('click', () => {
    const presetSelect = document.getElementById('filterPresetSelect');
    if (presetSelect.value) applyFilterPreset(presetSelect.value);
});
document.getElementById('deletePresetButton').addEventListener('click', deleteFilterPreset);

// Email
document.getElementById('sendEmailButton').addEventListener('click', sendReportEmail);
document.getElementById('configEmailButton').addEventListener('click', showEmailConfigModal);
document.getElementById('saveEmailConfigButton').addEventListener('click', saveEmailConfig);
document.getElementById('cancelEmailConfigButton').addEventListener('click', closeEmailConfigModal);
document.querySelector('.close-modal').addEventListener('click', closeEmailConfigModal);
document.getElementById('emailService').addEventListener('change', updateSmtpFields);

// Aggiornamenti
document.getElementById('updateNowButton').addEventListener('click', downloadAndInstallUpdate);
document.getElementById('updateLaterButton').addEventListener('click', hideUpdateBanner);

// Drag & Drop
const fileInputLabel = document.querySelector('.file-input-label');
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

// Inizializzazione all'avvio
document.addEventListener('DOMContentLoaded', function () {
    loadFilterPresets();
    initEmailUI();
    // Eventuali controlli aggiornamenti possono essere attivati qui
});

// Se in ambiente Electron, ascolta eventi dal processo principale (se applicabile)
if (window.events) {
    window.events.on('app:sendEmail', () => {
        if (filteredData.length === 0) {
            showNotification('Non ci sono dati da inviare. Elabora prima i file JSON.', 'warning');
            return;
        }
        switchEmailTab('send-tab');
    });
    window.events.on('app:configureEmail', () => {
        switchEmailTab('config-tab');
    });
}

/************************************************************************
 * GESTIONE FILE
 ************************************************************************/
function handleFileSelection(e) {
    console.log("handleFileSelection: evento 'change' ricevuto");
    currentFiles = Array.from(e.target.files);
    console.log("File selezionati:", currentFiles);
    if (currentFiles.length > 0) {
        let infoStr = '';
        currentFiles.forEach(f => {
            infoStr += `<div><i class="fas fa-file-code"></i> ${f.name} (${formatFileSize(f.size)})</div>`;
        });
        fileInfo.innerHTML = `<strong>File selezionati:</strong><br>${infoStr}`;
        processButton.disabled = false;
    } else {
        fileInfo.innerHTML = '';
        processButton.disabled = true;
    }
    // Reset dei dati
    allExtractedData = [];
    filteredData = [];
    previewDiv.innerHTML = '';
    resultInfo.style.display = 'none';
    statsPreview.style.display = 'none';
    dashboardContainer.style.display = 'none';
    exportCsvButton.disabled = true;
    exportXlsxButton.disabled = true;
    exportPdfButton.disabled = true;
    generateStatsBtn.disabled = true;
    if (emailElements.sendEmailBtn) {
        emailElements.sendEmailBtn.disabled = true;
    }
    chartsContainer.innerHTML = '';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsText(file);
    });
}

async function processJSONFiles() {
    if (currentFiles.length === 0) return;
    progressContainer.style.display = 'block';
    progressBar.value = 0;
    progressPercentage.textContent = '0%';
    resultInfo.style.display = 'none';
    previewDiv.innerHTML = '';
    statsPreview.style.display = 'none';
    chartsContainer.innerHTML = '';
    dashboardContainer.style.display = 'none';

    allExtractedData = [];
    let fileCount = currentFiles.length;
    for (let i = 0; i < fileCount; i++) {
        let file = currentFiles[i];
        try {
            let text = await readFileAsText(file);
            let jsonData = JSON.parse(text);
            extractDataFromJson(jsonData);
        } catch (err) {
            console.error("Errore lettura file:", file.name, err);
            showNotification(`Errore nel file ${file.name}: ${err.message}`, 'error');
        }
        let percentage = Math.round(((i + 1) / fileCount) * 100);
        progressBar.value = percentage;
        progressPercentage.textContent = `${percentage}%`;
    }
    filteredData = enableFilterCheck.checked ? applyFilter(allExtractedData) : allExtractedData.slice();
    displayResults(filteredData);
    progressContainer.style.display = 'none';
    document.dispatchEvent(new CustomEvent('dataProcessed', { detail: { count: filteredData.length } }));
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
            let record = { "descriptionMerchant": String(merchantValue) };
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

function extractFieldsFromText(record, text) {
    let t = text || "";
    // Estrazione campo Addebito
    let rgxAddebito = new RegExp(
        '(?:addebito|importo|pagamento|EUR|euro|USD|€|\\$)\\s*[di]*\\s*:*\\s*([0-9.,]+)',
        'i'
    );
    let matchAddebito = t.match(rgxAddebito);
    record["Addebito"] = matchAddebito ? matchAddebito[1].trim() : (t.match(/(€\s*[0-9.,]+|\$\s*[0-9.,]+|[0-9.,]+\s*€|[0-9.,]+\s*\$|[0-9.,]+\s*EUR)/i) || [""])[0];

    // Estrazione campo IBAN
    let rgxIban = new RegExp('(?:IBAN|conto)\\s*:*\\s*([A-Z0-9 ]{10,34})', 'i');
    let matchIban = t.match(rgxIban);
    record["IBAN"] = matchIban ? matchIban[1].trim() : (t.match(/(IT\s*[0-9A-Z ]{10,30})/i) || [""])[0];

    // Estrazione di fee e scadenza
    let rgxFee = new RegExp('(?:fee|commissione|spese)\\s*[di]*\\s*:*\\s*([0-9.,]+)(?:\\s*[€\\$%])?', 'i');
    let matchFee = t.match(rgxFee);
    let rgxScad = new RegExp('(?:scadenza|scad\\.|entro il)\\s*:*\\s*(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}\\s+[a-z]{3,10}\\s+\\d{2,4})', 'i');
    let matchScad = t.match(rgxScad);
    if (matchFee && matchScad) {
        record["fee scadenza"] = `${matchFee[1].trim()} - ${matchScad[1].trim()}`;
    } else if (matchFee) {
        record["fee scadenza"] = matchFee[1].trim();
    } else if (matchScad) {
        record["fee scadenza"] = matchScad[1].trim();
    } else {
        record["fee scadenza"] = "";
    }

    // Estrazione di totale transazioni
    let rgxTot = new RegExp('(?:totale|transazioni|operazioni)\\s*[di]*\\s*:*\\s*([0-9.,]+)', 'i');
    let matchTot = t.match(rgxTot);
    record["totale transazioni"] = matchTot ? matchTot[1].trim() : (t.match(/transazioni\s*(?:[a-z ]*)\s*([0-9]+)/i) || [""])[0];

    // Estrazione di descrizione
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
 * FILTRI E PRESET
 ************************************************************************/
function applyFilter(data) {
    let field = filterFieldSelect.value;
    let operator = filterOperatorSel.value;
    let filterVal = filterValueInput.value;
    let out = [];
    data.forEach(item => {
        let itemVal = item[field] || "";
        if (!itemVal) return;
        if (["<", ">", "<=", ">=", "="].includes(operator)) {
            let numericVal = parseFloat(itemVal.replace(',', '.').replace(/[^0-9.-]/g, ''));
            let numericFilter = parseFloat(filterVal.replace(',', '.'));
            if (isNaN(numericVal) || isNaN(numericFilter)) return;
            switch (operator) {
                case ">":
                    if (numericVal > numericFilter) out.push(item);
                    break;
                case "<":
                    if (numericVal < numericFilter) out.push(item);
                    break;
                case ">=":
                    if (numericVal >= numericFilter) out.push(item);
                    break;
                case "<=":
                    if (numericVal <= numericFilter) out.push(item);
                    break;
                case "=":
                    if (numericVal === numericFilter) out.push(item);
                    break;
            }
        } else if (operator === "contiene") {
            if (String(itemVal).toLowerCase().includes(filterVal.toLowerCase())) {
                out.push(item);
            }
        }
    });
    return out;
}

function loadFilterPresets() {
    try {
        const savedPresets = localStorage.getItem('filterPresets');
        if (savedPresets) {
            filterPresets = JSON.parse(savedPresets);
            updateFilterPresetsList();
        }
    } catch (error) {
        console.error("Errore nel caricamento dei preset:", error);
    }
}

function saveFilterPreset() {
    const presetName = prompt("Inserisci un nome per questo preset:", "Preset " + (filterPresets.length + 1));
    if (!presetName) return;
    const preset = {
        name: presetName,
        enableFilter: enableFilterCheck.checked,
        field: filterFieldSelect.value,
        operator: filterOperatorSel.value,
        value: filterValueInput.value,
        selectedFields: Object.keys(fieldsMap).reduce((acc, key) => {
            acc[key] = fieldsMap[key].checked;
            return acc;
        }, {})
    };
    filterPresets.push(preset);
    localStorage.setItem('filterPresets', JSON.stringify(filterPresets));
    updateFilterPresetsList();
}

function updateFilterPresetsList() {
    const presetSelect = document.getElementById('filterPresetSelect');
    presetSelect.innerHTML = '<option value="">-- Seleziona un preset --</option>';
    filterPresets.forEach((preset, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = preset.name;
        presetSelect.appendChild(option);
    });
}

function applyFilterPreset(index) {
    const preset = filterPresets[index];
    if (!preset) return;
    enableFilterCheck.checked = preset.enableFilter;
    filterFieldSelect.value = preset.field;
    filterOperatorSel.value = preset.operator;
    filterValueInput.value = preset.value;
    Object.keys(preset.selectedFields).forEach(key => {
        if (fieldsMap[key]) {
            fieldsMap[key].checked = preset.selectedFields[key];
        }
    });
}

function deleteFilterPreset() {
    const presetSelect = document.getElementById('filterPresetSelect');
    const index = presetSelect.value;
    if (index === "" || index == null) return;
    if (confirm(`Sei sicuro di voler eliminare il preset "${filterPresets[index].name}"?`)) {
        filterPresets.splice(index, 1);
        localStorage.setItem('filterPresets', JSON.stringify(filterPresets));
        updateFilterPresetsList();
    }
}

/************************************************************************
 * VISUALIZZAZIONE RISULTATI
 ************************************************************************/
function displayResults(data) {
    if (data.length === 0) {
        resultInfo.innerHTML = '<div class="alert-warning">Nessun record estratto oppure nessun dato corrisponde al filtro.</div>';
        resultInfo.style.display = 'block';
        previewDiv.innerHTML = '';
        exportCsvButton.disabled = true;
        exportXlsxButton.disabled = true;
        exportPdfButton.disabled = true;
        generateStatsBtn.disabled = true;
        if (emailElements.sendEmailBtn) {
            emailElements.sendEmailBtn.disabled = true;
        }
        return;
    }
    resultInfo.style.display = 'block';
    resultInfo.innerHTML = `<strong>Trovati ${data.length} record.</strong> (Mostriamo i primi 50)`;

    let table = document.createElement('table');
    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');
    let activeFields = Object.keys(fieldsMap).filter(k => fieldsMap[k].checked);

    let headerRow = document.createElement('tr');
    activeFields.forEach(f => {
        let th = document.createElement('th');
        th.textContent = f;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    let limit = Math.min(50, data.length);
    for (let i = 0; i < limit; i++) {
        let row = document.createElement('tr');
        activeFields.forEach(f => {
            let td = document.createElement('td');
            let val = data[i][f] || "";
            if (val.length > 50) {
                val = val.substring(0, 47) + "...";
            }
            td.textContent = val;
            row.appendChild(td);
        });
        tbody.appendChild(row);
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    previewDiv.innerHTML = "";
    previewDiv.appendChild(table);

    if (data.length > limit) {
        let p = document.createElement('p');
        p.textContent = `Mostrati ${limit} record su ${data.length}. Esporta per visualizzare tutti i dati.`;
        previewDiv.appendChild(p);
    }

    exportCsvButton.disabled = false;
    exportXlsxButton.disabled = false;
    exportPdfButton.disabled = false;
    generateStatsBtn.disabled = false;
    updateSendButtonState();
}

/************************************************************************
 * ESPORTAZIONE DATI
 ************************************************************************/
function exportData(format) {
    if (filteredData.length === 0) return;
    let activeFields = Object.keys(fieldsMap).filter(k => fieldsMap[k].checked);
    if (activeFields.length === 0) {
        alert("Nessun campo selezionato per l'esportazione!");
        return;
    }
    let exportArr = filteredData.map(item => {
        let obj = {};
        activeFields.forEach(f => {
            obj[f] = item[f] || "";
        });
        return obj;
    });
    let ts = new Date().toISOString().replace(/[:.]/g, '-');
    let filename = `Report_Commissioni_${ts}`;
    if (format === 'csv') {
        exportAsCSV(exportArr, filename + '.csv');
    } else if (format === 'xlsx') {
        exportAsXLSX(exportArr, filename + '.xlsx');
    } else if (format === 'pdf') {
        exportAsPDF(exportArr, filename + '.pdf');
    }
}

function exportAsCSV(data, filename) {
    if (!data.length) return;
    let headers = Object.keys(data[0]);
    let csvRows = [headers.join(',')];
    data.forEach(row => {
        let rowArr = headers.map(h => `"${(row[h] || "").toString().replace(/"/g, '""')}"`);
        csvRows.push(rowArr.join(','));
    });
    let csvContent = csvRows.join('\n');
    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, filename);
}

function exportAsXLSX(data, filename) {
    if (!data.length) return;
    let worksheet = XLSX.utils.json_to_sheet(data);
    let workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dati Estratti");
    let excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    let blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadFile(blob, filename);
}

function exportAsPDF(data, filename) {
    if (!data.length) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Report Commissioni", 14, 22);
    doc.setFontSize(11);
    const today = new Date().toLocaleDateString();
    doc.text(`Generato il: ${today}`, 14, 30);
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => row[h] || ""));
    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 35,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [67, 97, 238] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { top: 35 }
    });
    if (filteredData.length > 0) {
        const statsField = statsFieldSelectElem.value;
        let numericVals = [];
        filteredData.forEach(item => {
            let raw = item[statsField] || "";
            let num = parseFloat(raw.replace(',', '.').replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) numericVals.push(num);
        });
        if (numericVals.length > 0) {
            const pageHeight = doc.internal.pageSize.height;
            const currentY = doc.previousAutoTable.finalY + 10;
            if (currentY < pageHeight - 40) {
                doc.setFontSize(14);
                doc.text(`Statistiche per ${statsField}`, 14, currentY);
                doc.setFontSize(10);
                const count = numericVals.length;
                const minVal = Math.min(...numericVals);
                const maxVal = Math.max(...numericVals);
                const sumVal = numericVals.reduce((a, b) => a + b, 0);
                const meanVal = sumVal / count;
                doc.text(`Totale record: ${count}`, 14, currentY + 8);
                doc.text(`Minimo: ${minVal.toFixed(2)}`, 14, currentY + 14);
                doc.text(`Massimo: ${maxVal.toFixed(2)}`, 14, currentY + 20);
                doc.text(`Media: ${meanVal.toFixed(2)}`, 14, currentY + 26);
                doc.text(`Somma: ${sumVal.toFixed(2)}`, 14, currentY + 32);
            }
        }
    }
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
            `Pagina ${i} di ${pageCount} - Tool Reporting Commissioni`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        );
    }
    doc.save(filename);
}

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

/************************************************************************
 * STATISTICHE E DASHBOARD
 ************************************************************************/
function generateStatistics() {
    if (filteredData.length === 0) {
        alert("Non ci sono dati filtrati da analizzare.");
        return;
    }
    const visualizationType = document.getElementById('visualizationType') ?
          document.getElementById('visualizationType').value : 'chart';
    if (visualizationType === 'dashboard') {
        createAdvancedDashboard();
        statsPreview.style.display = 'none';
        chartsContainer.style.display = 'none';
    } else {
        let field = statsFieldSelectElem.value;
        let numericVals = [];
        filteredData.forEach(item => {
            let raw = item[field] || "";
            let num = parseFloat(raw.replace(',', '.').replace(/[^0-9.-]/g, ''));
            if (!isNaN(num)) numericVals.push(num);
        });
        statsPreview.style.display = 'block';
        chartsContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
        statsPreview.innerHTML = "";
        if (numericVals.length === 0) {
            statsPreview.innerHTML = `Nessun valore numerico valido per il campo <strong>${field}</strong>.`;
            chartsContainer.innerHTML = "";
            return;
        }
        let count = numericVals.length;
        let minVal = Math.min(...numericVals);
        let maxVal = Math.max(...numericVals);
        let sumVal = numericVals.reduce((a, b) => a + b, 0);
        let meanVal = sumVal / count;
        let variance = numericVals.reduce((acc, v) => acc + (v - meanVal) ** 2, 0) / count;
        let stdVal = Math.sqrt(variance);
        let statsHtml = `
            <div class="stats-header">Statistiche per "${field}"</div>
            <ul class="stats-list">
                <li>Conteggio: ${count}</li>
                <li>Minimo: ${minVal.toFixed(2)}</li>
                <li>Massimo: ${maxVal.toFixed(2)}</li>
                <li>Media: ${meanVal.toFixed(2)}</li>
                <li>Somma: ${sumVal.toFixed(2)}</li>
                ${count > 1 ? `<li>Deviazione standard: ${stdVal.toFixed(2)}</li>` : ''}
            </ul>
        `;
        statsPreview.innerHTML = statsHtml;
        charts.forEach(c => c.destroy());
        charts = [];
        chartsContainer.innerHTML = "";
        let chartBox1 = document.createElement('div');
        chartBox1.className = 'chart-box';
        let canvas1 = document.createElement('canvas');
        chartBox1.appendChild(canvas1);
        chartsContainer.appendChild(chartBox1);
        let ctx1 = canvas1.getContext('2d');
        let histogramData = createHistogramData(numericVals, 10);
        let chart1 = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: histogramData.labels,
                datasets: [{
                    label: `Distribuzione di ${field}`,
                    data: histogramData.counts,
                    backgroundColor: 'var(--primary)'
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true },
                    x: { ticks: { autoSkip: false } }
                }
            }
        });
        charts.push(chart1);
        let chartBox2 = document.createElement('div');
        chartBox2.className = 'chart-box';
        let canvas2 = document.createElement('canvas');
        chartBox2.appendChild(canvas2);
        chartsContainer.appendChild(chartBox2);
        let ctx2 = canvas2.getContext('2d');
        let chart2 = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ["Minimo", "Massimo", "Media"],
                datasets: [{
                    label: `Statistiche di ${field}`,
                    data: [minVal, maxVal, meanVal],
                    backgroundColor: ['#e74c3c', '#2ecc71', '#f1c40f']
                }]
            },
            options: {
                scales: { y: { beginAtZero: true } }
            }
        });
        charts.push(chart2);
    }
}

function createHistogramData(values, nBins) {
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    let range = maxVal - minVal;
    let binSize = range / nBins;
    let counts = new Array(nBins).fill(0);
    values.forEach(v => {
        let idx = Math.floor((v - minVal) / binSize);
        if (idx === nBins) idx = nBins - 1;
        counts[idx]++;
    });
    let labels = [];
    for (let i = 0; i < nBins; i++) {
        let start = minVal + i * binSize;
        let end = start + binSize;
        labels.push(`${start.toFixed(2)} - ${end.toFixed(2)}`);
    }
    return { labels, counts };
}

/************************************************************************
 * DASHBOARD AVANZATA
 ************************************************************************/
function createAdvancedDashboard() {
    const dashboardContainer = document.getElementById('dashboardContainer');
    if (!dashboardContainer) {
        console.error("Dashboard container not found in the DOM");
        return;
    }
    if (filteredData.length === 0) {
        dashboardContainer.innerHTML = '<div class="alert-warning">Nessun dato disponibile per la dashboard.</div>';
        dashboardContainer.style.display = 'block';
        return;
    }
    dashboardContainer.style.display = 'block';
    statsPreview.style.display = 'none';
    chartsContainer.style.display = 'none';
    dashboardContainer.innerHTML = `
        <div class="dashboard-header">
            <h3>Dashboard interattiva</h3>
            <div class="dashboard-controls">
                <select id="dashboardField">
                    <option value="Addebito">Addebito</option>
                    <option value="totale transazioni">Totale transazioni</option>
                </select>
                <select id="dashboardGroupBy">
                    <option value="merchant">Raggruppa per merchant</option>
                    <option value="descr">Raggruppa per descrizione</option>
                </select>
            </div>
        </div>
        <div class="dashboard-grid">
            <div class="chart-box chart-box-large">
                <h4>Trend complessivo</h4>
                <canvas id="timeSeriesChart"></canvas>
            </div>
            <div class="chart-box">
                <h4>Distribuzione valori</h4>
                <canvas id="distributionChart"></canvas>
            </div>
            <div class="chart-box">
                <h4>Top 5 valori</h4>
                <canvas id="topFiveChart"></canvas>
            </div>
            <div class="chart-box">
                <h4>Suddivisione per categoria</h4>
                <canvas id="categoryComparisonChart"></canvas>
            </div>
        </div>
        <div class="dashboard-summary">
            <h4>Sintesi dei dati</h4>
            <div id="dataSummary" class="data-summary"></div>
        </div>
    `;
    updateDashboardCharts();
    document.getElementById('dashboardField').addEventListener('change', updateDashboardCharts);
    document.getElementById('dashboardGroupBy').addEventListener('change', updateDashboardCharts);
}

function updateDashboardCharts() {
    const field = document.getElementById('dashboardField').value;
    const groupBy = document.getElementById('dashboardGroupBy').value;
    let numericData = [];
    filteredData.forEach(item => {
        let raw = item[field] || "";
        let num = parseFloat(raw.replace(',', '.').replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) {
            numericData.push({
                value: num,
                merchant: item.descriptionMerchant || "",
                description: item.descrizione || "",
                category: groupBy === 'merchant' ? item.descriptionMerchant : item.descrizione
            });
        }
    });
    if (numericData.length === 0) {
        document.getElementById('dashboardContainer').innerHTML = '<div class="alert-warning">Nessun valore numerico valido per la dashboard.</div>';
        return;
    }
    createTimeSeriesChart(numericData);
    createDistributionChart(numericData);
    createTopFiveChart(numericData, groupBy);
    createCategoryComparisonChart(numericData, groupBy);
    createDataSummary(numericData);
}

function createTimeSeriesChart(data) {
    const canvas = document.getElementById('timeSeriesChart');
    const ctx = canvas.getContext('2d');
    const sortedData = [...data].sort((a, b) => a.value - b.value);
    const values = sortedData.map(d => d.value);
    const labels = Array.from({ length: values.length }, (_, i) => i + 1);
    if (window.timeSeriesChart && typeof window.timeSeriesChart.destroy === 'function') {
        window.timeSeriesChart.destroy();
    }
    window.timeSeriesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Trend valori',
                data: values,
                borderColor: '#4361ee',
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { beginAtZero: false },
                x: { title: { display: true, text: 'Sequenza record' } }
            }
        }
    });
}

function createDistributionChart(data) {
    const canvas = document.getElementById('distributionChart');
    const ctx = canvas.getContext('2d');
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
    const binSize = range / binCount;
    const bins = Array(binCount).fill(0);
    values.forEach(val => {
        const binIndex = Math.min(Math.floor((val - min) / binSize), binCount - 1);
        bins[binIndex]++;
    });
    const binLabels = [];
    for (let i = 0; i < binCount; i++) {
        const start = min + i * binSize;
        const end = start + binSize;
        binLabels.push(`${start.toFixed(1)}-${end.toFixed(1)}`);
    }
    if (window.distributionChart && typeof window.distributionChart.destroy === 'function') {
        window.distributionChart.destroy();
    }
    window.distributionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: [{
                label: 'Frequenza',
                data: bins,
                backgroundColor: '#4cc9f0',
                borderColor: '#3f37c9',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true }, x: { display: true } }
        }
    });
}

function createTopFiveChart(data, groupBy) {
    const canvas = document.getElementById('topFiveChart');
    const ctx = canvas.getContext('2d');
    const groupedData = {};
    data.forEach(item => {
        const category = item.category || "N/A";
        if (!groupedData[category]) {
            groupedData[category] = { sum: 0, count: 0 };
        }
        groupedData[category].sum += item.value;
        groupedData[category].count++;
    });
    const categoryData = Object.keys(groupedData).map(cat => ({
        category: cat,
        sum: groupedData[cat].sum,
        avg: groupedData[cat].sum / groupedData[cat].count
    }));
    const topFive = categoryData.sort((a, b) => b.sum - a.sum).slice(0, 5);
    if (window.topFiveChart && typeof window.topFiveChart.destroy === 'function') {
        window.topFiveChart.destroy();
    }
    window.topFiveChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topFive.map(d => d.category.length > 12 ? d.category.substring(0, 12) + '...' : d.category),
            datasets: [{
                label: 'Totale',
                data: topFive.map(d => d.sum),
                backgroundColor: '#f72585',
                borderColor: '#3f37c9',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const index = context.dataIndex;
                            return [
                                `Totale: ${topFive[index].sum.toFixed(2)}`,
                                `Media: ${topFive[index].avg.toFixed(2)}`
                            ];
                        }
                    }
                }
            },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function createCategoryComparisonChart(data, groupBy) {
    const canvas = document.getElementById('categoryComparisonChart');
    const ctx = canvas.getContext('2d');
    const groupedData = {};
    data.forEach(item => {
        const category = item.category || "N/A";
        if (!groupedData[category]) {
            groupedData[category] = { sum: 0, count: 0 };
        }
        groupedData[category].sum += item.value;
        groupedData[category].count++;
    });
    const categoryData = Object.keys(groupedData).map(cat => ({ category: cat, sum: groupedData[cat].sum }));
    let chartData;
    if (categoryData.length <= 8) {
        chartData = categoryData;
    } else {
        const sortedData = [...categoryData].sort((a, b) => b.sum - a.sum);
        const topSeven = sortedData.slice(0, 7);
        const others = sortedData.slice(7);
        const othersSum = others.reduce((total, item) => total + item.sum, 0);
        topSeven.push({ category: "Altri", sum: othersSum });
        chartData = topSeven;
    }
    const backgroundColors = [
        '#4361ee', '#3a0ca3', '#4895ef', '#4cc9f0',
        '#f72585', '#b5179e', '#7209b7', '#560bad'
    ];
    if (window.categoryChart && typeof window.categoryChart.destroy === 'function') {
        window.categoryChart.destroy();
    }
    window.categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartData.map(d => d.category.length > 10 ? d.category.substring(0, 10) + '...' : d.category),
            datasets: [{
                data: chartData.map(d => d.sum),
                backgroundColor: backgroundColors,
                borderColor: '#ffffff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 15, font: { size: 10 } } }
            }
        }
    });
}

function createDataSummary(data) {
    const summaryContainer = document.getElementById('dataSummary');
    const values = data.map(d => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sorted = [...values].sort((a, b) => a - b);
    const median = values.length % 2 === 0
        ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
        : sorted[Math.floor(values.length / 2)];
    const variance = values.reduce((total, val) => total + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    summaryContainer.innerHTML = `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-value">${values.length}</div>
          <div class="summary-label">Record</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${sum.toFixed(2)}</div>
          <div class="summary-label">Totale</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${avg.toFixed(2)}</div>
          <div class="summary-label">Media</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${median.toFixed(2)}</div>
          <div class="summary-label">Mediana</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${min.toFixed(2)}</div>
          <div class="summary-label">Minimo</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${max.toFixed(2)}</div>
          <div class="summary-label">Massimo</div>
        </div>
        <div class="summary-card">
          <div class="summary-value">${stdDev.toFixed(2)}</div>
          <div class="summary-label">Deviazione std</div>
        </div>
      </div>
    `;
}

/************************************************************************
 * GESTIONE EMAIL
 ************************************************************************/
function loadEmailConfig() {
    // Simula il caricamento della configurazione (ad esempio, da localStorage)
    emailConfig = {
        service: 'gmail',
        user: 'esempio@gmail.com',
        password: '********',
        smtpServer: '',
        smtpPort: ''
    };
}

async function sendReportEmail() {
    if (!emailConfig.service || !emailConfig.user || !emailConfig.password) {
        showNotification('Configurazione email incompleta. Configura prima le impostazioni email.', 'error');
        return;
    }
    const recipients = document.getElementById('emailRecipients').value.trim();
    if (!recipients) {
        showNotification('Inserisci almeno un destinatario.', 'error');
        return;
    }
    const subject = document.getElementById('emailSubject').value.trim() || 'Report Commissioni';
    const message = document.getElementById('emailMessage').value.trim() || 'Report commissioni in allegato.';
    const attachCSV = document.getElementById('attachCSV').checked;
    const attachXLSX = document.getElementById('attachXLSX').checked;
    const attachPDF = document.getElementById('attachPDF').checked;
    if (!attachCSV && !attachXLSX && !attachPDF) {
        showNotification('Seleziona almeno un formato da allegare.', 'error');
        return;
    }
    if (filteredData.length === 0) {
        showNotification('Nessun dato da inviare.', 'error');
        return;
    }
    try {
        const response = await fetch('/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipients: recipients.split(',').map(r => r.trim()),
                subject: subject,
                message: message,
                data: filteredData
            })
        });
        if (response.ok) {
            showNotification(`Email inviata con successo a ${recipients}!`, 'success');
        } else {
            showNotification('Errore durante l\'invio dell\'email', 'error');
        }
    } catch (error) {
        console.error("Errore durante l'invio dell'email:", error);
        showNotification('Errore durante l\'invio dell\'email', 'error');
    }
}

function showEmailConfigModal() {
    const modal = document.getElementById('emailConfigModal');
    modal.style.display = 'block';
    document.getElementById('emailService').value = emailConfig.service || 'gmail';
    document.getElementById('emailUser').value = emailConfig.user || '';
    document.getElementById('emailPassword').value = emailConfig.password || '';
    document.getElementById('smtpServer').value = emailConfig.smtpServer || '';
    document.getElementById('smtpPort').value = emailConfig.smtpPort || '';
    updateSmtpFields();
}

function closeEmailConfigModal() {
    document.getElementById('emailConfigModal').style.display = 'none';
}

function updateSmtpFields() {
    const service = document.getElementById('emailService').value;
    const smtpServerField = document.getElementById('smtpServer');
    const smtpPortField = document.getElementById('smtpPort');
    if (service === 'other') {
        smtpServerField.disabled = false;
        smtpPortField.disabled = false;
    } else {
        smtpServerField.disabled = true;
        smtpPortField.disabled = true;
    }
}

function saveEmailConfig() {
    const service = document.getElementById('emailService').value;
    const user = document.getElementById('emailUser').value.trim();
    const password = document.getElementById('emailPassword').value;
    const smtpServer = document.getElementById('smtpServer').value.trim();
    const smtpPort = document.getElementById('smtpPort').value.trim();
    if (!service || !user || !password) {
        alert('Completa tutti i campi obbligatori.');
        return;
    }
    if (service === 'other' && (!smtpServer || !smtpPort)) {
        alert('Per i servizi personalizzati è necessario specificare server e porta SMTP.');
        return;
    }
    emailConfig = { service, user, password, smtpServer, smtpPort };
    showNotification('Configurazione email salvata con successo!', 'success');
    closeEmailConfigModal();
    document.getElementById('sendEmailButton').disabled = filteredData.length === 0;
}

/************************************************************************
 * EVENTI DI DRAG & DROP PER FILE
 ************************************************************************/
const fileInputLabel = document.querySelector('.file-input-label');
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

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    jsonFileInput.files = files;
    handleFileSelection({ target: { files: files } });
}

/************************************************************************
 * EVENTI INIZIALI E INTEGRAZIONE CON PROCESSI ESTERNI
 ************************************************************************/
document.addEventListener('DOMContentLoaded', function () {
    loadFilterPresets();
    initEmailUI();
    // setTimeout(checkForUpdates, 5000); // Disabilitato per il test
});

// Se in ambiente Electron, ascolta eventi dal processo principale
if (window.events) {
    window.events.on('app:sendEmail', () => {
        if (filteredData.length === 0) {
            showNotification('Non ci sono dati da inviare. Elabora prima i file JSON.', 'warning');
            return;
        }
        switchEmailTab('send-tab');
    });
    window.events.on('app:configureEmail', () => {
        switchEmailTab('config-tab');
    });
}

/************************************************************************
 * FUNZIONI EMAIL UI E GESTIONE TABS
 ************************************************************************/
function initEmailUI() {
    loadEmailConfig();
    if (emailElements.tabBtns) {
        emailElements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => switchEmailTab(btn.dataset.tab));
        });
    }
    updateSendButtonState();
}

function switchEmailTab(tabId) {
    // Qui implementa la logica per mostrare/nascondere le sezioni in base alla tab selezionata
    console.log("Switch to tab:", tabId);
    // Esempio: rimuovi la classe "active" da tutte le tab-content e aggiungila a quella selezionata
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    // Aggiorna anche lo stato dei bottoni delle tab
    emailElements.tabBtns.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateSendButtonState() {
    const recipients = emailElements.emailRecipients ? emailElements.emailRecipients.value.trim() : "";
    if (recipients !== "" && emailConfig.service && emailConfig.user) {
        if (emailElements.sendEmailBtn) {
            emailElements.sendEmailBtn.disabled = false;
        } else {
            document.getElementById('sendEmailButton').disabled = false;
        }
    } else {
        if (emailElements.sendEmailBtn) {
            emailElements.sendEmailBtn.disabled = true;
        } else {
            document.getElementById('sendEmailButton').disabled = true;
        }
    }
}

/************************************************************************
 * FUNZIONE PER INVIARE EMAIL
 ************************************************************************/
async function sendEmailReport() {
    if (filteredData.length === 0) {
        showNotification('Non ci sono dati da inviare. Elabora prima i file JSON.', 'warning');
        return;
    }
    await sendReportEmail();
}

/************************************************************************
 * AGGIORNAMENTI AUTOMATICI
 ************************************************************************/
function downloadAndInstallUpdate() {
    showNotification('Download aggiornamento in corso...', 'info');
    setTimeout(() => {
        showNotification('Aggiornamento scaricato! Riavvio in corso...', 'success');
        setTimeout(() => {
            showNotification('Applicazione aggiornata con successo!', 'success');
            hideUpdateBanner();
        }, 2000);
    }, 3000);
}

function hideUpdateBanner() {
    const updateBanner = document.getElementById('updateBanner');
    updateBanner.style.height = '0';
    updateBanner.style.opacity = '0';
    setTimeout(() => {
        updateBanner.style.display = 'none';
    }, 300);
}

/************************************************************************
 * FINE DEL FILE
 ************************************************************************/
