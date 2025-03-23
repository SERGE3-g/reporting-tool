// script.js - Script principale per il Tool di Reporting Commissioni

// Variabili globali
let allExtractedData = [];
let currentFiles = [];
let filteredData = [];

// Componenti standard
document.addEventListener('DOMContentLoaded', function() {
    // Carica componenti condivisi se necessario
    if (document.getElementById('navbar-container')) {
        loadComponent('components/navbar.html', 'navbar-container');
    }

    if (document.getElementById('footer-container')) {
        loadComponent('components/footer.html', 'footer-container');
    }

    // Inizializza le tab in tutti i container con classe 'tabs'
    initTabs();

    // Gestisce le notifiche da query params (utile per reindirizzamenti)
    handleNotificationsFromUrl();

    // Inizializza il modulo di reporting se si è nella pagina corretta
    initReportingTool();
});

// Funzione per caricare componenti HTML dinamicamente
function loadComponent(url, containerId) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Errore HTTP: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            document.getElementById(containerId).innerHTML = html;
        })
        .catch(error => {
            console.error(`Errore nel caricamento del componente ${url}:`, error);
            document.getElementById(containerId).innerHTML = `
                <div class="alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Impossibile caricare il componente. Riprova più tardi.
                </div>
            `;
        });
}

// Inizializza le tab
function initTabs() {
    const tabContainers = document.querySelectorAll('.tabs');

    tabContainers.forEach(container => {
        const tabBtns = container.querySelectorAll('.tab-btn');
        const contentId = container.getAttribute('data-content') || '';
        const prefix = contentId ? `#${contentId} ` : '';

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');

                // Rimuovi la classe active da tutti i pulsanti nella stessa container
                container.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                });

                // Aggiungi la classe active a questo pulsante
                this.classList.add('active');

                // Nascondi tutti i contenuti relativi e mostra quello selezionato
                const allContents = document.querySelectorAll(`${prefix}.tab-content`);
                allContents.forEach(content => {
                    content.classList.remove('active');
                });

                document.getElementById(tabId).classList.add('active');
            });
        });
    });
}

// Gestisci notifiche da URL query params
function handleNotificationsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const type = urlParams.get('type') || 'info';

    if (message) {
        showNotification(decodeURIComponent(message), type);

        // Pulisci l'URL dopo aver mostrato la notifica
        const url = new URL(window.location);
        url.searchParams.delete('message');
        url.searchParams.delete('type');
        window.history.replaceState({}, '', url);
    }
}

// Funzione per mostrare notifiche
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;

    document.body.appendChild(notification);

    // Aggiungi classe per animazione
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Pulsante per chiudere
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });

    // Chiudi automaticamente dopo 5 secondi
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Funzione per formattare la dimensione del file
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Inizializza il modulo di reporting
function initReportingTool() {
    // Riferimenti ai campi DOM
    const jsonFileInput = document.getElementById('jsonFileInput');
    const fileInfo = document.getElementById('fileInfo');
    const processButton = document.getElementById('processButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const resultInfo = document.getElementById('resultInfo');
    const previewDiv = document.getElementById('preview');
    const exportCsvButton = document.getElementById('exportCsvButton');
    const exportXlsxButton = document.getElementById('exportXlsxButton');
    const exportPdfButton = document.getElementById('exportPdfButton');
    const generateStatsBtn = document.getElementById('generateStatsButton');

    // Se non siamo nella pagina di reporting, esci
    if (!jsonFileInput) return;

    // Gestione file
    jsonFileInput.addEventListener('change', handleFileSelection);

    // Gestione Drag & Drop
    const fileInputLabel = document.querySelector('.file-input-label');
    if (fileInputLabel) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileInputLabel.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

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

    // Gestione processamento
    if (processButton) {
        processButton.addEventListener('click', processJSONFiles);
    }

    // Gestione esportazione
    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', () => exportData('csv'));
    }

    if (exportXlsxButton) {
        exportXlsxButton.addEventListener('click', () => exportData('xlsx'));
    }

    if (exportPdfButton) {
        exportPdfButton.addEventListener('click', () => exportData('pdf'));
    }

    // Gestione statistiche
    if (generateStatsBtn) {
        generateStatsBtn.addEventListener('click', generateStatistics);
    }

    // Gestione filtri
    const enableFilterCheck = document.getElementById('enableFilter');
    const filterFieldSelect = document.getElementById('filterField');
    const filterOperatorSel = document.getElementById('filterOperator');
    const filterValueInput = document.getElementById('filterValue');

    if (enableFilterCheck) {
        enableFilterCheck.addEventListener('change', function() {
            const filterControls = document.querySelector('.filter-controls');
            filterControls.style.display = this.checked ? 'flex' : 'none';

            // Se il filtro è attivato e ci sono dati, applicalo
            if (this.checked && allExtractedData.length > 0) {
                filteredData = applyFilter(allExtractedData);
                displayResults(filteredData);
            } else if (allExtractedData.length > 0) {
                // Se il filtro è disattivato, mostra tutti i dati
                filteredData = [...allExtractedData];
                displayResults(filteredData);
            }
        });
    }

    // Aggiorna i filtri quando i valori cambiano
    if (filterFieldSelect && filterOperatorSel && filterValueInput) {
        [filterFieldSelect, filterOperatorSel, filterValueInput].forEach(el => {
            el.addEventListener('change', function() {
                if (enableFilterCheck && enableFilterCheck.checked && allExtractedData.length > 0) {
                    filteredData = applyFilter(allExtractedData);
                    displayResults(filteredData);
                }
            });
        });

        filterValueInput.addEventListener('input', function() {
            if (enableFilterCheck && enableFilterCheck.checked && allExtractedData.length > 0) {
                filteredData = applyFilter(allExtractedData);
                displayResults(filteredData);
            }
        });
    }

    // Funzioni di gestione file
    function handleFileSelection(e) {
        currentFiles = Array.from(e.target.files);
        updateFileInfo();
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        // Filtra solo i file JSON
        currentFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.json'));

        if (currentFiles.length === 0) {
            showNotification('Seleziona almeno un file JSON valido', 'error');
            return;
        }

        // Aggiorna l'input file con i file selezionati (se possibile)
        try {
            const dataTransfer = new DataTransfer();
            currentFiles.forEach(file => dataTransfer.items.add(file));
            jsonFileInput.files = dataTransfer.files;
        } catch (err) {
            console.error('Errore nel settaggio dei file:', err);
        }

        updateFileInfo();
    }

    function updateFileInfo() {
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

        // Reset
        allExtractedData = [];
        filteredData = [];
        previewDiv.innerHTML = '';
        resultInfo.style.display = 'none';

        if (document.getElementById('statsPreview')) {
            document.getElementById('statsPreview').style.display = 'none';
        }

        if (document.getElementById('chartsContainer')) {
            document.getElementById('chartsContainer').innerHTML = '';
        }

        if (document.getElementById('dashboardContainer')) {
            document.getElementById('dashboardContainer').style.display = 'none';
        }

        // Disabilita i pulsanti di esportazione
        if (exportCsvButton) exportCsvButton.disabled = true;
        if (exportXlsxButton) exportXlsxButton.disabled = true;
        if (exportPdfButton) exportPdfButton.disabled = true;
        if (generateStatsBtn) generateStatsBtn.disabled = true;
    }

    // Funzioni di elaborazione
    async function processJSONFiles() {
        if (currentFiles.length === 0) return;

        progressContainer.style.display = 'block';
        progressBar.value = 0;
        progressPercentage.textContent = '0%';
        resultInfo.style.display = 'none';
        previewDiv.innerHTML = '';

        if (document.getElementById('statsPreview')) {
            document.getElementById('statsPreview').style.display = 'none';
        }

        if (document.getElementById('chartsContainer')) {
            document.getElementById('chartsContainer').innerHTML = '';
        }

        if (document.getElementById('dashboardContainer')) {
            document.getElementById('dashboardContainer').style.display = 'none';
        }

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

        if (enableFilterCheck && enableFilterCheck.checked) {
            filteredData = applyFilter(allExtractedData);
        } else {
            filteredData = allExtractedData.slice();
        }

        displayResults(filteredData);

        // Abilita/disabilita i pulsanti in base ai risultati
        const hasData = filteredData.length > 0;
        if (exportCsvButton) exportCsvButton.disabled = !hasData;
        if (exportXlsxButton) exportXlsxButton.disabled = !hasData;
        if (exportPdfButton) exportPdfButton.disabled = !hasData;
        if (generateStatsBtn) generateStatsBtn.disabled = !hasData;

        progressContainer.style.display = 'none';

        // Salva l'elaborazione nella cronologia recente (localStorage)
        saveProcessingHistory(filteredData);
    }

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }

    // Funzione per salvare la cronologia delle elaborazioni
    function saveProcessingHistory(data) {
        if (!data || data.length === 0) return;

        try {
            // Ottieni la cronologia esistente o inizializza una nuova array
            const history = JSON.parse(localStorage.getItem('processingHistory') || '[]');

            // Crea un nuovo elemento della cronologia
            const newEntry = {
                id: Date.now().toString(),
                date: new Date().toLocaleDateString('it-IT'),
                time: new Date().toLocaleTimeString('it-IT'),
                fileName: currentFiles.map(f => f.name).join(', '),
                recordCount: data.length,
                total: calculateTotal(data),
                timestamp: Date.now()
            };

            // Aggiungi il nuovo elemento all'inizio dell'array
            history.unshift(newEntry);

            // Limita la cronologia a 20 elementi
            const trimmedHistory = history.slice(0, 20);

            // Salva la cronologia aggiornata
            localStorage.setItem('processingHistory', JSON.stringify(trimmedHistory));
        } catch (error) {
            console.error('Errore nel salvataggio della cronologia:', error);
        }
    }

    // Calcola il totale degli addebiti
    function calculateTotal(data) {
        return data.reduce((sum, item) => {
            const addebitoStr = item['Addebito'] || '0';
            // Estrai solo i numeri, considera virgole e punti
            const numericValue = addebitoStr.replace(/[^\d,\.]/g, '')
                .replace(',', '.');

            return sum + (parseFloat(numericValue) || 0);
        }, 0);
    }
}

// Funzione per estrarre dati dal JSON
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

// Estrae i campi dal testo
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

// Applica filtri ai dati
function applyFilter(data) {
    const enableFilterCheck = document.getElementById('enableFilter');
    const filterFieldSelect = document.getElementById('filterField');
    const filterOperatorSel = document.getElementById('filterOperator');
    const filterValueInput = document.getElementById('filterValue');

    if (!enableFilterCheck || !enableFilterCheck.checked) {
        return data.slice(); // Ritorna una copia dei dati senza filtro
    }

    const field = filterFieldSelect.value;
    const operator = filterOperatorSel.value;
    const filterVal = filterValueInput.value;
    const out = [];

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

// Visualizza i risultati in una tabella
function displayResults(data) {
    const resultInfo = document.getElementById('resultInfo');
    const previewDiv = document.getElementById('preview');

    if (!resultInfo || !previewDiv) return;

    if (data.length === 0) {
        resultInfo.innerHTML = '<div class="alert-warning">Nessun record estratto oppure nessun dato corrisponde al filtro.</div>';
        resultInfo.style.display = 'block';
        previewDiv.innerHTML = '';
        return;
    }

    resultInfo.style.display = 'block';
    resultInfo.innerHTML = `<strong>Trovati ${data.length} record.</strong> ${data.length > 50 ? '(Mostriamo i primi 50)' : ''}`;

    // Get campo selezionati
    const fieldsMap = {};
    document.querySelectorAll('input[id^="field_"]').forEach(checkbox => {
        const fieldName = checkbox.id.replace('field_', '');
        fieldsMap[fieldName] = checkbox;
    });

    let table = document.createElement('table');
    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');

    // Usa solo i campi selezionati
    let activeFields = Object.keys(fieldsMap).filter(k => fieldsMap[k].checked);

    // Crea intestazione tabella
    let headerRow = document.createElement('tr');
    activeFields.forEach(f => {
        let th = document.createElement('th');
        th.textContent = f;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Aggiungi righe di dati (limita a 50 per prestazioni)
    let limit = Math.min(50, data.length);
    for (let i = 0; i < limit; i++) {
        let row = document.createElement('tr');
        activeFields.forEach(f => {
            let td = document.createElement('td');
            let val = data[i][f] || "";

            // Tronca valori lunghi
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

    // Aggiungi messaggio se ci sono più record
    if (data.length > limit) {
        let p = document.createElement('p');
        p.textContent = `Mostrati ${limit} record su ${data.length}. Esporta per visualizzare tutti i dati.`;
        p.style.marginTop = '10px';
        p.style.fontStyle = 'italic';
        p.style.color = '#64748b';
        previewDiv.appendChild(p);
    }
}

// Esporta i dati in vari formati
function exportData(format) {
    // Verifica se ci sono dati da esportare
    if (!filteredData || filteredData.length === 0) {
        showNotification('Nessun dato da esportare', 'warning');
        return;
    }

    // Ottieni i campi attivi
    const activeFields = {};
    document.querySelectorAll('input[id^="field_"]').forEach(checkbox => {
        if (checkbox.checked) {
            const fieldName = checkbox.id.replace('field_', '');
            activeFields[fieldName] = true;
        }
    });

    // Verifica se ci sono campi selezionati
    if (Object.keys(activeFields).length === 0) {
        showNotification('Seleziona almeno un campo da esportare', 'warning');
        return;
    }

    // Prepara i dati filtrati
    const exportData = filteredData.map(item => {
        const exportItem = {};
        Object.keys(activeFields).forEach(field => {
            exportItem[field] = item[field] || '';
        });
        return exportItem;
    });

    // Genera timestamp per il nome del file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Report_Commissioni_${timestamp}`;

    // Esporta in base al formato scelto
    switch (format) {
        case 'csv':
            exportAsCSV(exportData, filename + '.csv');
            break;
        case 'xlsx':
            exportAsXLSX(exportData, filename + '.xlsx');
            break;
        case 'pdf':
            exportAsPDF(exportData, filename + '.pdf');
            break;
        default:
            showNotification('Formato non supportato', 'error');
    }
}

// Esporta in formato CSV
function exportAsCSV(data, filename) {
    if (!data || !data.length) {
        showNotification('Nessun dato da esportare', 'error');
        return;
    }

    try {
        const headers = Object.keys(data[0]);
        let csvRows = [headers.join(',')];

        data.forEach(row => {
            let rowArr = headers.map(h => {
                // Escape valori con virgole o virgolette
                const cellValue = (row[h] || '').toString();
                if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
                    return `"${cellValue.replace(/"/g, '""')}"`;
                }
                return cellValue;
            });
            csvRows.push(rowArr.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Crea link per download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();

        // Pulizia
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 200);

        showNotification(`Esportazione CSV completata: ${data.length} record`, 'success');
    } catch (error) {
        console.error('Errore durante l\'esportazione CSV:', error);
        showNotification('Errore durante l\'esportazione CSV', 'error');
    }
}

// Esporta in formato XLSX
function exportAsXLSX(data, filename) {
    if (!data || !data.length) {
        showNotification('Nessun dato da esportare', 'error');
        return;
    }

    try {
        // Libreria SheetJS deve essere caricata
        if (typeof XLSX === 'undefined') {
            showNotification('Libreria XLSX non disponibile', 'error');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        // Personalizza la larghezza delle colonne
        const columnWidths = [];
        Object.keys(data[0]).forEach(key => {
            let maxLength = key.length;

            // Calcola la lunghezza massima per ogni colonna
            data.forEach(row => {
                const cellValue = row[key] || '';
                const cellLength = cellValue.toString().length;
                if (cellLength > maxLength) {
                    maxLength = cellLength;
                }
            });

            // Aggiunge un po' di margine
            columnWidths.push({ wch: Math.min(maxLength + 2, 50) });
        });

        worksheet['!cols'] = columnWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, "Dati Estratti");

        // Genera file e crea link per download
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();

        // Pulizia
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 200);

        showNotification(`Esportazione Excel completata: ${data.length} record`, 'success');
    } catch (error) {
        console.error('Errore durante l\'esportazione XLSX:', error);
        showNotification('Errore durante l\'esportazione Excel', 'error');
    }
}

// Esporta in formato PDF
function exportAsPDF(data, filename) {
    if (!data || !data.length) {
        showNotification('Nessun dato da esportare', 'error');
        return;
    }

    try {
        // Controlla se la libreria jsPDF è disponibile
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
            showNotification('Libreria jsPDF non disponibile', 'error');
            return;
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        // Titolo del report
        doc.setFontSize(18);
        doc.text('Report Commissioni', 14, 22);

        // Data e ora
        doc.setFontSize(11);
        doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, 14, 30);

        // Crea tabella se è disponibile autoTable
        if (typeof doc.autoTable === 'function') {
            const headers = Object.keys(data[0]);

            // Prepara righe per la tabella
            const rows = data.map(item => {
                return headers.map(header => item[header] || '');
            });

            // Genera tabella
            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 40,
                theme: 'grid',
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [67, 97, 238],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    // Personalizza larghezza colonne se necessario
                },
                didDrawPage: function(data) {
                    // Footer con numerazione pagine
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(8);
                    for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        const pageSize = doc.internal.pageSize;
                        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
                        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                        doc.text(`Pagina ${i} di ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                        doc.text(`Tool di Reporting Commissioni Mensile`, 14, pageHeight - 10);
                    }
                }
            });
        } else {
            // Fallback se autoTable non è disponibile
            doc.text('Dati esportati senza formattazione tabellare. Si consiglia di installare jspdf-autotable.', 14, 40);

            let y = 50;
            data.forEach((item, index) => {
                if (index < 20) { // Limitiamo per evitare PDF troppo grandi
                    doc.setFontSize(10);
                    doc.text(`Record #${index + 1}`, 14, y);
                    y += 5;

                    doc.setFontSize(8);
                    Object.entries(item).forEach(([key, value]) => {
                        const text = `${key}: ${value || ''}`;
                        doc.text(text, 20, y);
                        y += 4;
                    });

                    y += 5; // Spazio tra record

                    // Nuova pagina se necessario
                    if (y > 280) {
                        doc.addPage();
                        y = 20;
                    }
                }
            });

            if (data.length > 20) {
                doc.text(`... e altri ${data.length - 20} record non mostrati.`, 14, y + 5);
            }
        }

        // Salva il PDF
        doc.save(filename);

        showNotification(`Esportazione PDF completata: ${data.length} record`, 'success');
    } catch (error) {
        console.error('Errore durante l\'esportazione PDF:', error);
        showNotification('Errore durante l\'esportazione PDF', 'error');
    }
}

// Genera statistiche
function generateStatistics() {
    // Verifica se ci sono dati
    if (!filteredData || filteredData.length === 0) {
        showNotification('Nessun dato disponibile per generare statistiche', 'warning');
        return;
    }

    const statsFieldSelect = document.getElementById('statsFieldSelect');
    const statsPreview = document.getElementById('statsPreview');
    const chartsContainer = document.getElementById('chartsContainer');
    const visualizationType = document.getElementById('visualizationType');
    const dashboardContainer = document.getElementById('dashboardContainer');

    if (!statsFieldSelect || !statsPreview || !chartsContainer) return;

    const field = statsFieldSelect.value;

    // Estrai valori numerici validi per il campo selezionato
    const numericVals = [];
    filteredData.forEach(item => {
        const raw = item[field] || "";
        const num = parseFloat(raw.replace(',', '.').replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) numericVals.push(num);
    });

    statsPreview.style.display = 'block';

    if (numericVals.length === 0) {
        statsPreview.innerHTML = `Nessun valore numerico valido per il campo <strong>${field}</strong>.`;
        chartsContainer.innerHTML = "";
        return;
    }

    // Calcola statistiche base
    const count = numericVals.length;
    const minVal = Math.min(...numericVals);
    const maxVal = Math.max(...numericVals);
    const sumVal = numericVals.reduce((a, b) => a + b, 0);
    const meanVal = sumVal / count;
    const variance = numericVals.reduce((acc, v) => acc + (v - meanVal) ** 2, 0) / count;
    const stdVal = Math.sqrt(variance);

    // Calcola statistiche aggiuntive
    const sortedVals = [...numericVals].sort((a, b) => a - b);
    const medianVal = count % 2 === 0
        ? (sortedVals[count / 2 - 1] + sortedVals[count / 2]) / 2
        : sortedVals[Math.floor(count / 2)];

    // Mostra statistiche base
    const statsHtml = `
        <div class="stats-header">Statistiche per "${field}"</div>
        <div class="stats-summary">
            <div class="stats-row">
                <div class="stats-col">
                    <div class="stats-label">Conteggio</div>
                    <div class="stats-value">${count}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Minimo</div>
                    <div class="stats-value">${minVal.toFixed(2)}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Massimo</div>
                    <div class="stats-value">${maxVal.toFixed(2)}</div>
                </div>
            </div>
            <div class="stats-row">
                <div class="stats-col">
                    <div class="stats-label">Media</div>
                    <div class="stats-value">${meanVal.toFixed(2)}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Mediana</div>
                    <div class="stats-value">${medianVal.toFixed(2)}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Somma</div>
                    <div class="stats-value">${sumVal.toFixed(2)}</div>
                </div>
            </div>
            ${count > 1 ? `
            <div class="stats-row">
                <div class="stats-col">
                    <div class="stats-label">Deviazione standard</div>
                    <div class="stats-value">${stdVal.toFixed(2)}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Varianza</div>
                    <div class="stats-value">${variance.toFixed(2)}</div>
                </div>
                <div class="stats-col"></div>
            </div>
            ` : ''}
        </div>
    `;

    statsPreview.innerHTML = statsHtml;

    // Tipo di visualizzazione
    if (visualizationType && visualizationType.value === 'dashboard')// script.js - Script principale per il Tool di Reporting Commissioni

// Variabili globali
let allExtractedData = [];
let currentFiles = [];
let filteredData = [];

// Componenti standard
document.addEventListener('DOMContentLoaded', function() {
    // Carica componenti condivisi se necessario
    if (document.getElementById('navbar-container')) {
        loadComponent('components/navbar.html', 'navbar-container');
    }

    if (document.getElementById('footer-container')) {
        loadComponent('components/footer.html', 'footer-container');
    }

    // Inizializza le tab in tutti i container con classe 'tabs'
    initTabs();

    // Gestisce le notifiche da query params (utile per reindirizzamenti)
    handleNotificationsFromUrl();

    // Inizializza il modulo di reporting se si è nella pagina corretta
    initReportingTool();
});

// Funzione per caricare componenti HTML dinamicamente
function loadComponent(url, containerId) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Errore HTTP: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            document.getElementById(containerId).innerHTML = html;
        })
        .catch(error => {
            console.error(`Errore nel caricamento del componente ${url}:`, error);
            document.getElementById(containerId).innerHTML = `
                <div class="alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Impossibile caricare il componente. Riprova più tardi.
                </div>
            `;
        });
}

// Inizializza le tab
function initTabs() {
    const tabContainers = document.querySelectorAll('.tabs');

    tabContainers.forEach(container => {
        const tabBtns = container.querySelectorAll('.tab-btn');
        const contentId = container.getAttribute('data-content') || '';
        const prefix = contentId ? `#${contentId} ` : '';

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');

                // Rimuovi la classe active da tutti i pulsanti nella stessa container
                container.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                });

                // Aggiungi la classe active a questo pulsante
                this.classList.add('active');

                // Nascondi tutti i contenuti relativi e mostra quello selezionato
                const allContents = document.querySelectorAll(`${prefix}.tab-content`);
                allContents.forEach(content => {
                    content.classList.remove('active');
                });

                document.getElementById(tabId).classList.add('active');
            });
        });
    });
}

// Gestisci notifiche da URL query params
function handleNotificationsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const type = urlParams.get('type') || 'info';

    if (message) {
        showNotification(decodeURIComponent(message), type);

        // Pulisci l'URL dopo aver mostrato la notifica
        const url = new URL(window.location);
        url.searchParams.delete('message');
        url.searchParams.delete('type');
        window.history.replaceState({}, '', url);
    }
}

// Funzione per mostrare notifiche
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;

    document.body.appendChild(notification);

    // Aggiungi classe per animazione
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Pulsante per chiudere
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });

    // Chiudi automaticamente dopo 5 secondi
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Funzione per formattare la dimensione del file
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Inizializza il modulo di reporting
function initReportingTool() {
    // Riferimenti ai campi DOM
    const jsonFileInput = document.getElementById('jsonFileInput');
    const fileInfo = document.getElementById('fileInfo');
    const processButton = document.getElementById('processButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const resultInfo = document.getElementById('resultInfo');
    const previewDiv = document.getElementById('preview');
    const exportCsvButton = document.getElementById('exportCsvButton');
    const exportXlsxButton = document.getElementById('exportXlsxButton');
    const exportPdfButton = document.getElementById('exportPdfButton');
    const generateStatsBtn = document.getElementById('generateStatsButton');

    // Se non siamo nella pagina di reporting, esci
    if (!jsonFileInput) return;

    // Gestione file
    jsonFileInput.addEventListener('change', handleFileSelection);

    // Gestione Drag & Drop
    const fileInputLabel = document.querySelector('.file-input-label');
    if (fileInputLabel) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileInputLabel.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

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

    // Gestione processamento
    if (processButton) {
        processButton.addEventListener('click', processJSONFiles);
    }

    // Gestione esportazione
    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', () => exportData('csv'));
    }

    if (exportXlsxButton) {
        exportXlsxButton.addEventListener('click', () => exportData('xlsx'));
    }

    if (exportPdfButton) {
        exportPdfButton.addEventListener('click', () => exportData('pdf'));
    }

    // Gestione statistiche
    if (generateStatsBtn) {
        generateStatsBtn.addEventListener('click', generateStatistics);
    }

    // Gestione filtri
    const enableFilterCheck = document.getElementById('enableFilter');
    const filterFieldSelect = document.getElementById('filterField');
    const filterOperatorSel = document.getElementById('filterOperator');
    const filterValueInput = document.getElementById('filterValue');

    if (enableFilterCheck) {
        enableFilterCheck.addEventListener('change', function() {
            const filterControls = document.querySelector('.filter-controls');
            filterControls.style.display = this.checked ? 'flex' : 'none';

            // Se il filtro è attivato e ci sono dati, applicalo
            if (this.checked && allExtractedData.length > 0) {
                filteredData = applyFilter(allExtractedData);
                displayResults(filteredData);
            } else if (allExtractedData.length > 0) {
                // Se il filtro è disattivato, mostra tutti i dati
                filteredData = [...allExtractedData];
                displayResults(filteredData);
            }
        });
    }

    // Aggiorna i filtri quando i valori cambiano
    if (filterFieldSelect && filterOperatorSel && filterValueInput) {
        [filterFieldSelect, filterOperatorSel, filterValueInput].forEach(el => {
            el.addEventListener('change', function() {
                if (enableFilterCheck && enableFilterCheck.checked && allExtractedData.length > 0) {
                    filteredData = applyFilter(allExtractedData);
                    displayResults(filteredData);
                }
            });
        });

        filterValueInput.addEventListener('input', function() {
            if (enableFilterCheck && enableFilterCheck.checked && allExtractedData.length > 0) {
                filteredData = applyFilter(allExtractedData);
                displayResults(filteredData);
            }
        });
    }

    // Funzioni di gestione file
    function handleFileSelection(e) {
        currentFiles = Array.from(e.target.files);
        updateFileInfo();
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        // Filtra solo i file JSON
        currentFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.json'));

        if (currentFiles.length === 0) {
            showNotification('Seleziona almeno un file JSON valido', 'error');
            return;
        }

        // Aggiorna l'input file con i file selezionati (se possibile)
        try {
            const dataTransfer = new DataTransfer();
            currentFiles.forEach(file => dataTransfer.items.add(file));
            jsonFileInput.files = dataTransfer.files;
        } catch (err) {
            console.error('Errore nel settaggio dei file:', err);
        }

        updateFileInfo();
    }

    function updateFileInfo() {
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

       // Reset
        allExtractedData = [];
        filteredData = [];
        previewDiv.innerHTML = '';
        resultInfo.style.display = 'none';

        if (document.getElementById('statsPreview')) {
            document.getElementById('statsPreview').style.display = 'none';
        }

        if (document.getElementById('chartsContainer')) {
            document.getElementById('chartsContainer').innerHTML = '';
        }

        if (document.getElementById('dashboardContainer')) {
            document.getElementById('dashboardContainer').style.display = 'none';
        }

        // Disabilita i pulsanti di esportazione
        if (exportCsvButton) exportCsvButton.disabled = true;
        if (exportXlsxButton) exportXlsxButton.disabled = true;
        if (exportPdfButton) exportPdfButton.disabled = true;
        if (generateStatsBtn) generateStatsBtn.disabled = true;
    }

    // Funzioni di elaborazione
    async function processJSONFiles() {
        if (currentFiles.length === 0) return;

        progressContainer.style.display = 'block';
        progressBar.value = 0;
        progressPercentage.textContent = '0%';
        resultInfo.style.display = 'none';
        previewDiv.innerHTML = '';

        if (document.getElementById('statsPreview')) {
            document.getElementById('statsPreview').style.display = 'none';
        }

        if (document.getElementById('chartsContainer')) {
            document.getElementById('chartsContainer').innerHTML = '';
        }

        if (document.getElementById('dashboardContainer')) {
            document.getElementById('dashboardContainer').style.display = 'none';
        }

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

        if (enableFilterCheck && enableFilterCheck.checked) {
            filteredData = applyFilter(allExtractedData);
        } else {
            filteredData = allExtractedData.slice();
        }

        displayResults(filteredData);

        // Abilita/disabilita i pulsanti in base ai risultati
        const hasData = filteredData.length > 0;
        if (exportCsvButton) exportCsvButton.disabled = !hasData;
        if (exportXlsxButton) exportXlsxButton.disabled = !hasData;
        if (exportPdfButton) exportPdfButton.disabled = !hasData;
        if (generateStatsBtn) generateStatsBtn.disabled = !hasData;

        progressContainer.style.display = 'none';

        // Salva l'elaborazione nella cronologia recente (localStorage)
        saveProcessingHistory(filteredData);
    }

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    }

    // Funzione per salvare la cronologia delle elaborazioni
    function saveProcessingHistory(data) {
        if (!data || data.length === 0) return;

        try {
            // Ottieni la cronologia esistente o inizializza una nuova array
            const history = JSON.parse(localStorage.getItem('processingHistory') || '[]');

            // Crea un nuovo elemento della cronologia
            const newEntry = {
                id: Date.now().toString(),
                date: new Date().toLocaleDateString('it-IT'),
                time: new Date().toLocaleTimeString('it-IT'),
                fileName: currentFiles.map(f => f.name).join(', '),
                recordCount: data.length,
                total: calculateTotal(data),
                timestamp: Date.now()
            };

            // Aggiungi il nuovo elemento all'inizio dell'array
            history.unshift(newEntry);

            // Limita la cronologia a 20 elementi
            const trimmedHistory = history.slice(0, 20);

            // Salva la cronologia aggiornata
            localStorage.setItem('processingHistory', JSON.stringify(trimmedHistory));
        } catch (error) {
            console.error('Errore nel salvataggio della cronologia:', error);
        }
    }

    // Calcola il totale degli addebiti
    function calculateTotal(data) {
        return data.reduce((sum, item) => {
            const addebitoStr = item['Addebito'] || '0';
            // Estrai solo i numeri, considera virgole e punti
            const numericValue = addebitoStr.replace(/[^\d,\.]/g, '')
                .replace(',', '.');

            return sum + (parseFloat(numericValue) || 0);
        }, 0);
    }
}

// Funzione per estrarre dati dal JSON
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

// Estrae i campi dal testo
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

// Applica filtri ai dati
function applyFilter(data) {
    const enableFilterCheck = document.getElementById('enableFilter');
    const filterFieldSelect = document.getElementById('filterField');
    const filterOperatorSel = document.getElementById('filterOperator');
    const filterValueInput = document.getElementById('filterValue');

    if (!enableFilterCheck || !enableFilterCheck.checked) {
        return data.slice(); // Ritorna una copia dei dati senza filtro
    }

    const field = filterFieldSelect.value;
    const operator = filterOperatorSel.value;
    const filterVal = filterValueInput.value;
    const out = [];

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

// Visualizza i risultati in una tabella
function displayResults(data) {
    const resultInfo = document.getElementById('resultInfo');
    const previewDiv = document.getElementById('preview');

    if (!resultInfo || !previewDiv) return;

    if (data.length === 0) {
        resultInfo.innerHTML = '<div class="alert-warning">Nessun record estratto oppure nessun dato corrisponde al filtro.</div>';
        resultInfo.style.display = 'block';
        previewDiv.innerHTML = '';
        return;
    }

    resultInfo.style.display = 'block';
    resultInfo.innerHTML = `<strong>Trovati ${data.length} record.</strong> ${data.length > 50 ? '(Mostriamo i primi 50)' : ''}`;

    // Get campo selezionati
    const fieldsMap = {};
    document.querySelectorAll('input[id^="field_"]').forEach(checkbox => {
        const fieldName = checkbox.id.replace('field_', '');
        fieldsMap[fieldName] = checkbox;
    });

    let table = document.createElement('table');
    let thead = document.createElement('thead');
    let tbody = document.createElement('tbody');

    // Usa solo i campi selezionati
    let activeFields = Object.keys(fieldsMap).filter(k => fieldsMap[k].checked);

    // Crea intestazione tabella
    let headerRow = document.createElement('tr');
    activeFields.forEach(f => {
        let th = document.createElement('th');
        th.textContent = f;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    // Aggiungi righe di dati (limita a 50 per prestazioni)
    let limit = Math.min(50, data.length);
    for (let i = 0; i < limit; i++) {
        let row = document.createElement('tr');
        activeFields.forEach(f => {
            let td = document.createElement('td');
            let val = data[i][f] || "";

            // Tronca valori lunghi
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

    // Aggiungi messaggio se ci sono più record
    if (data.length > limit) {
        let p = document.createElement('p');
        p.textContent = `Mostrati ${limit} record su ${data.length}. Esporta per visualizzare tutti i dati.`;
        p.style.marginTop = '10px';
        p.style.fontStyle = 'italic';
        p.style.color = '#64748b';
        previewDiv.appendChild(p);
    }
}

// Esporta i dati in vari formati
function exportData(format) {
    // Verifica se ci sono dati da esportare
    if (!filteredData || filteredData.length === 0) {
        showNotification('Nessun dato da esportare', 'warning');
        return;
    }

    // Ottieni i campi attivi
    const activeFields = {};
    document.querySelectorAll('input[id^="field_"]').forEach(checkbox => {
        if (checkbox.checked) {
            const fieldName = checkbox.id.replace('field_', '');
            activeFields[fieldName] = true;
        }
    });

    // Verifica se ci sono campi selezionati
    if (Object.keys(activeFields).length === 0) {
        showNotification('Seleziona almeno un campo da esportare', 'warning');
        return;
    }

    // Prepara i dati filtrati
    const exportData = filteredData.map(item => {
        const exportItem = {};
        Object.keys(activeFields).forEach(field => {
            exportItem[field] = item[field] || '';
        });
        return exportItem;
    });

    // Genera timestamp per il nome del file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Report_Commissioni_${timestamp}`;

    // Esporta in base al formato scelto
    switch (format) {
        case 'csv':
            exportAsCSV(exportData, filename + '.csv');
            break;
        case 'xlsx':
            exportAsXLSX(exportData, filename + '.xlsx');
            break;
        case 'pdf':
            exportAsPDF(exportData, filename + '.pdf');
            break;
        default:
            showNotification('Formato non supportato', 'error');
    }
}

// Esporta in formato CSV
function exportAsCSV(data, filename) {
    if (!data || !data.length) {
        showNotification('Nessun dato da esportare', 'error');
        return;
    }

    try {
        const headers = Object.keys(data[0]);
        let csvRows = [headers.join(',')];

        data.forEach(row => {
            let rowArr = headers.map(h => {
                // Escape valori con virgole o virgolette
                const cellValue = (row[h] || '').toString();
                if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
                    return `"${cellValue.replace(/"/g, '""')}"`;
                }
                return cellValue;
            });
            csvRows.push(rowArr.join(','));
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Crea link per download
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();

        // Pulizia
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 200);

        showNotification(`Esportazione CSV completata: ${data.length} record`, 'success');
    } catch (error) {
        console.error('Errore durante l\'esportazione CSV:', error);
        showNotification('Errore durante l\'esportazione CSV', 'error');
    }
}

// Esporta in formato XLSX
function exportAsXLSX(data, filename) {
    if (!data || !data.length) {
        showNotification('Nessun dato da esportare', 'error');
        return;
    }

    try {
        // Libreria SheetJS deve essere caricata
        if (typeof XLSX === 'undefined') {
            showNotification('Libreria XLSX non disponibile', 'error');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();

        // Personalizza la larghezza delle colonne
        const columnWidths = [];
        Object.keys(data[0]).forEach(key => {
            let maxLength = key.length;

            // Calcola la lunghezza massima per ogni colonna
            data.forEach(row => {
                const cellValue = row[key] || '';
                const cellLength = cellValue.toString().length;
                if (cellLength > maxLength) {
                    maxLength = cellLength;
                }
            });

            // Aggiunge un po' di margine
            columnWidths.push({ wch: Math.min(maxLength + 2, 50) });
        });

        worksheet['!cols'] = columnWidths;

        XLSX.utils.book_append_sheet(workbook, worksheet, "Dati Estratti");

        // Genera file e crea link per download
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();

        // Pulizia
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 200);

        showNotification(`Esportazione Excel completata: ${data.length} record`, 'success');
    } catch (error) {
        console.error('Errore durante l\'esportazione XLSX:', error);
        showNotification('Errore durante l\'esportazione Excel', 'error');
    }
}

// Esporta in formato PDF
function exportAsPDF(data, filename) {
    if (!data || !data.length) {
        showNotification('Nessun dato da esportare', 'error');
        return;
    }

    try {
        // Controlla se la libreria jsPDF è disponibile
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
            showNotification('Libreria jsPDF non disponibile', 'error');
            return;
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        // Titolo del report
        doc.setFontSize(18);
        doc.text('Report Commissioni', 14, 22);

        // Data e ora
        doc.setFontSize(11);
        doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, 14, 30);

        // Crea tabella se è disponibile autoTable
        if (typeof doc.autoTable === 'function') {
            const headers = Object.keys(data[0]);

            // Prepara righe per la tabella
            const rows = data.map(item => {
                return headers.map(header => item[header] || '');
            });

            // Genera tabella
            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 40,
                theme: 'grid',
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                headStyles: {
                    fillColor: [67, 97, 238],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    // Personalizza larghezza colonne se necessario
                },
                didDrawPage: function(data) {
                    // Footer con numerazione pagine
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(8);
                    for (let i = 1; i <= pageCount; i++) {
                        doc.setPage(i);
                        const pageSize = doc.internal.pageSize;
                        const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
                        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                        doc.text(`Pagina ${i} di ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                        doc.text(`Tool di Reporting Commissioni Mensile`, 14, pageHeight - 10);
                    }
                }
            });
        } else {
            // Fallback se autoTable non è disponibile
            doc.text('Dati esportati senza formattazione tabellare. Si consiglia di installare jspdf-autotable.', 14, 40);

            let y = 50;
            data.forEach((item, index) => {
                if (index < 20) { // Limitiamo per evitare PDF troppo grandi
                    doc.setFontSize(10);
                    doc.text(`Record #${index + 1}`, 14, y);
                    y += 5;

                    doc.setFontSize(8);
                    Object.entries(item).forEach(([key, value]) => {
                        const text = `${key}: ${value || ''}`;
                        doc.text(text, 20, y);
                        y += 4;
                    });

                    y += 5; // Spazio tra record

                    // Nuova pagina se necessario
                    if (y > 280) {
                        doc.addPage();
                        y = 20;
                    }
                }
            });

            if (data.length > 20) {
                doc.text(`... e altri ${data.length - 20} record non mostrati.`, 14, y + 5);
            }
        }

        // Salva il PDF
        doc.save(filename);

        showNotification(`Esportazione PDF completata: ${data.length} record`, 'success');
    } catch (error) {
        console.error('Errore durante l\'esportazione PDF:', error);
        showNotification('Errore durante l\'esportazione PDF', 'error');
    }
}

// Genera statistiche
function generateStatistics() {
    // Verifica se ci sono dati
    if (!filteredData || filteredData.length === 0) {
        showNotification('Nessun dato disponibile per generare statistiche', 'warning');
        return;
    }

    const statsFieldSelect = document.getElementById('statsFieldSelect');
    const statsPreview = document.getElementById('statsPreview');
    const chartsContainer = document.getElementById('chartsContainer');
    const visualizationType = document.getElementById('visualizationType');
    const dashboardContainer = document.getElementById('dashboardContainer');

    if (!statsFieldSelect || !statsPreview || !chartsContainer) return;

    const field = statsFieldSelect.value;

    // Estrai valori numerici validi per il campo selezionato
    const numericVals = [];
    filteredData.forEach(item => {
        const raw = item[field] || "";
        const num = parseFloat(raw.replace(',', '.').replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) numericVals.push(num);
    });

    statsPreview.style.display = 'block';

    if (numericVals.length === 0) {
        statsPreview.innerHTML = `Nessun valore numerico valido per il campo <strong>${field}</strong>.`;
        chartsContainer.innerHTML = "";
        return;
    }

    // Calcola statistiche base
    const count = numericVals.length;
    const minVal = Math.min(...numericVals);
    const maxVal = Math.max(...numericVals);
    const sumVal = numericVals.reduce((a, b) => a + b, 0);
    const meanVal = sumVal / count;
    const variance = numericVals.reduce((acc, v) => acc + (v - meanVal) ** 2, 0) / count;
    const stdVal = Math.sqrt(variance);

    // Calcola statistiche aggiuntive
    const sortedVals = [...numericVals].sort((a, b) => a - b);
    const medianVal = count % 2 === 0
        ? (sortedVals[count / 2 - 1] + sortedVals[count / 2]) / 2
        : sortedVals[Math.floor(count / 2)];

    // Mostra statistiche base
    const statsHtml = `
        <div class="stats-header">Statistiche per "${field}"</div>
        <div class="stats-summary">
            <div class="stats-row">
                <div class="stats-col">
                    <div class="stats-label">Conteggio</div>
                    <div class="stats-value">${count}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Minimo</div>
                    <div class="stats-value">${minVal.toFixed(2)}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Massimo</div>
                    <div class="stats-value">${maxVal.toFixed(2)}</div>
                </div>
            </div>
            <div class="stats-row">
                <div class="stats-col">
                    <div class="stats-label">Media</div>
                    <div class="stats-value">${meanVal.toFixed(2)}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Mediana</div>
                    <div class="stats-value">${medianVal.toFixed(2)}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Somma</div>
                    <div class="stats-value">${sumVal.toFixed(2)}</div>
                </div>
            </div>
            ${count > 1 ? `
            <div class="stats-row">
                <div class="stats-col">
                    <div class="stats-label">Deviazione standard</div>
                    <div class="stats-value">${stdVal.toFixed(2)}</div>
                </div>
                <div class="stats-col">
                    <div class="stats-label">Varianza</div>
                    <div class="stats-value">${variance.toFixed(2)}</div>
                </div>
                <div class="stats-col"></div>
            </div>
            ` : ''}
        </div>
    `;

    statsPreview.innerHTML = statsHtml;

    // Tipo di visualizzazione
    if (visualizationType && visualizationType.value === 'dashboard' && dashboardContainer) {
        // Mostra dashboard avanzata
        chartsContainer.innerHTML = '';
        dashboardContainer.style.display = 'block';
        createDashboard(field, numericVals, filteredData);
    } else {
        // Mostra grafici standard
        dashboardContainer.style.display = 'none';
        chartsContainer.innerHTML = '';
        createStandardCharts(field, numericVals);
    }
}

// Crea grafici standard
function createStandardCharts(field, numericVals) {
    const chartsContainer = document.getElementById('chartsContainer');
    if (!chartsContainer) return;

    // Distruggi eventuali grafici esistenti
    Array.from(document.querySelectorAll('canvas')).forEach(canvas => {
        if (canvas.chart) {
            canvas.chart.destroy();
            canvas.chart = null;
        }
    });

    // Grafico 1: Istogramma
    const chartBox1 = document.createElement('div');
    chartBox1.className = 'chart-box';
    const canvas1 = document.createElement('canvas');
    chartBox1.appendChild(canvas1);
    chartsContainer.appendChild(chartBox1);

    const ctx1 = canvas1.getContext('2d');
    const histogramData = createHistogramData(numericVals, 10);

    canvas1.chart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: histogramData.labels,
            datasets: [{
                label: `Distribuzione di ${field}`,
                data: histogramData.counts,
                backgroundColor: '#4361ee'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true },
                x: { ticks: { autoSkip: false } }
            }
        }
    });

    // Grafico 2: Barre per Minimo, Massimo e Media
    const chartBox2 = document.createElement('div');
    chartBox2.className = 'chart-box';
    const canvas2 = document.createElement('canvas');
    chartBox2.appendChild(canvas2);
    chartsContainer.appendChild(chartBox2);

    const ctx2 = canvas2.getContext('2d');
    canvas2.chart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ["Minimo", "Massimo", "Media"],
            datasets: [{
                label: `Statistiche di ${field}`,
                data: [
                    Math.min(...numericVals),
                    Math.max(...numericVals),
                    numericVals.reduce((a, b) => a + b, 0) / numericVals.length
                ],
                backgroundColor: ['#e74c3c', '#2ecc71', '#f1c40f']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Crea dati per istogramma
function createHistogramData(values, nBins) {
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;
    const binSize = range / nBins;
    const counts = new Array(nBins).fill(0);

    values.forEach(v => {
        let idx = Math.floor((v - minVal) / binSize);
        if (idx === nBins) idx = nBins - 1; // Edge case per il valore massimo
        counts[idx]++;
    });

    const labels = [];
    for (let i = 0; i < nBins; i++) {
        const start = minVal + i * binSize;
        const end = start + binSize;
        labels.push(`${start.toFixed(2)} - ${end.toFixed(2)}`);
    }

    return { labels, counts };
}

// Crea dashboard avanzata
function createDashboard(field, numericVals, filteredData) {
    const dashboardContainer = document.getElementById('dashboardContainer');
    if (!dashboardContainer) return;

    // Formatta il contenitore della dashboard
    dashboardContainer.innerHTML = '';

    // Crea un pannello principale
    const mainPanel = document.createElement('div');
    mainPanel.className = 'dashboard-panel';
    dashboardContainer.appendChild(mainPanel);

    // Aggiungi intestazione
    const dashHeader = document.createElement('div');
    dashHeader.className = 'dashboard-header';
    dashHeader.innerHTML = `
        <h3>Dashboard Analitica: ${field}</h3>
        <p>Analisi avanzata basata su ${numericVals.length} valori validi</p>
    `;
    mainPanel.appendChild(dashHeader);

    // Crea griglia per i grafici
    const chartsGrid = document.createElement('div');
    chartsGrid.className = 'dashboard-charts-grid';
    mainPanel.appendChild(chartsGrid);

    // Crea il contenitore per il grafico principale
    const mainChartContainer = document.createElement('div');
    mainChartContainer.className = 'dashboard-chart-container main-chart';
    chartsGrid.appendChild(mainChartContainer);

    // Crea il canvas per il grafico principale
    const mainChartCanvas = document.createElement('canvas');
    mainChartContainer.appendChild(mainChartCanvas);

    // Crea il contenitore per il grafico a torta
    const pieChartContainer = document.createElement('div');
    pieChartContainer.className = 'dashboard-chart-container pie-chart';
    chartsGrid.appendChild(pieChartContainer);

    // Crea il canvas per il grafico a torta
    const pieChartCanvas = document.createElement('canvas');
    pieChartContainer.appendChild(pieChartCanvas);

    // Crea il contenitore per il grafico a barre
    const barChartContainer = document.createElement('div');
    barChartContainer.className = 'dashboard-chart-container bar-chart';
    chartsGrid.appendChild(barChartContainer);

    // Crea il canvas per il grafico a barre
    const barChartCanvas = document.createElement('canvas');
    barChartContainer.appendChild(barChartCanvas);

    // Genera dati per l'istogramma
    const histogramData = createHistogramData(numericVals, 10);

    // Crea il grafico principale (istogramma avanzato)
    const mainChartCtx = mainChartCanvas.getContext('2d');
    new Chart(mainChartCtx, {
        type: 'bar',
        data: {
            labels: histogramData.labels,
            datasets: [{
                label: `Distribuzione di ${field}`,
                data: histogramData.counts,
                backgroundColor: 'rgba(67, 97, 238, 0.7)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribuzione dei valori',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            return `Frequenza: ${context.raw} (${(context.raw * 100 / numericVals.length).toFixed(1)}%)`;
                        }
                    }
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
                        text: 'Intervalli'
                    }
                }
            }
        }
    });

    // Genera dati per il grafico a torta
    // Classifica i valori in gruppi (basso, medio, alto)
    const sortedVals = [...numericVals].sort((a, b) => a - b);
    const lowThreshold = sortedVals[Math.floor(sortedVals.length * 0.33)];
    const highThreshold = sortedVals[Math.floor(sortedVals.length * 0.66)];

    const lowCount = numericVals.filter(v => v <= lowThreshold).length;
    const mediumCount = numericVals.filter(v => v > lowThreshold && v <= highThreshold).length;
    const highCount = numericVals.filter(v => v > highThreshold).length;

    // Crea il grafico a torta
    const pieChartCtx = pieChartCanvas.getContext('2d');
    new Chart(pieChartCtx, {
        type: 'doughnut',
        data: {
            labels: ['Valori Bassi', 'Valori Medi', 'Valori Alti'],
            datasets: [{
                data: [lowCount, mediumCount, highCount],
                backgroundColor: [
                    'rgba(66, 153, 225, 0.7)',
                    'rgba(72, 187, 120, 0.7)',
                    'rgba(237, 100, 166, 0.7)'
                ],
                borderColor: [
                    'rgba(66, 153, 225, 1)',
                    'rgba(72, 187, 120, 1)',
                    'rgba(237, 100, 166, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Distribuzione per categorie',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const percentage = Math.round((value / numericVals.length) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Crea il grafico a barre per le statistiche
    const barChartCtx = barChartCanvas.getContext('2d');

    // Calcola le statistiche
    const mean = numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
    const median = sortedVals[Math.floor(sortedVals.length / 2)];
    const min = Math.min(...numericVals);
    const max = Math.max(...numericVals);
    const stdDev = Math.sqrt(numericVals.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / numericVals.length);

    new Chart(barChartCtx, {
        type: 'bar',
        data: {
            labels: ['Minimo', 'Media', 'Mediana', 'Massimo', 'Dev. Std'],
            datasets: [{
                label: 'Valore',
                data: [min, mean, median, max, stdDev],
                backgroundColor: [
                    'rgba(234, 88, 12, 0.7)',
                    'rgba(79, 70, 229, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(217, 70, 239, 0.7)',
                    'rgba(245, 158, 11, 0.7)'
                ],
                borderColor: [
                    'rgba(234, 88, 12, 1)',
                    'rgba(79, 70, 229, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(217, 70, 239, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Metriche statistiche',
                    font: {
                        size: 16
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Valore'
                    }
                }
            }
        }
    });

    // Aggiungi la sezione di dettaglio dei dati
    const dataDetailsSection = document.createElement('div');
    dataDetailsSection.className = 'dashboard-details-section';
    mainPanel.appendChild(dataDetailsSection);

    // Crea una tabella per i dettagli
    const detailsTable = document.createElement('table');
    detailsTable.className = 'dashboard-details-table';
    dataDetailsSection.appendChild(detailsTable);

    // Intestazione tabella
    const thead = document.createElement('thead');
    detailsTable.appendChild(thead);

    const headerRow = document.createElement('tr');
    thead.appendChild(headerRow);

    ['Metrica', 'Valore'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    // Corpo tabella
    const tbody = document.createElement('tbody');
    detailsTable.appendChild(tbody);

    // Aggiungi righe di dettaglio
    const detailRows = [
        { label: 'Conteggio valori', value: numericVals.length },
        { label: 'Minimo', value: min.toFixed(2) },
        { label: 'Massimo', value: max.toFixed(2) },
        { label: 'Media', value: mean.toFixed(2) },
        { label: 'Mediana', value: median.toFixed(2) },
        { label: 'Deviazione standard', value: stdDev.toFixed(2) },
        { label: 'Somma', value: numericVals.reduce((a, b) => a + b, 0).toFixed(2) },
        { label: 'Primo quartile', value: sortedVals[Math.floor(sortedVals.length * 0.25)].toFixed(2) },
        { label: 'Terzo quartile', value: sortedVals[Math.floor(sortedVals.length * 0.75)].toFixed(2) }
    ];

    detailRows.forEach(detail => {
        const tr = document.createElement('tr');

        const tdLabel = document.createElement('td');
        tdLabel.textContent = detail.label;
        tr.appendChild(tdLabel);

        const tdValue = document.createElement('td');
        tdValue.textContent = detail.value;
        tr.appendChild(tdValue);

        tbody.appendChild(tr);
    });
}
// script.js - Script principale per il Tool di Reporting Commissioni

// Variabili globali
let allExtractedData = [];
let currentFiles = [];
let filteredData = [];

// Componenti standard
document.addEventListener('DOMContentLoaded', function() {
    // Carica componenti condivisi se necessario
    if (document.getElementById('navbar-container')) {
        loadComponent('components/navbar.html', 'navbar-container');
    }

    if (document.getElementById('footer-container')) {
        loadComponent('components/footer.html', 'footer-container');
    }

    // Inizializza le tab in tutti i container con classe 'tabs'
    initTabs();

    // Gestisce le notifiche da query params (utile per reindirizzamenti)
    handleNotificationsFromUrl();

    // Inizializza il modulo di reporting se si è nella pagina corretta
    initReportingTool();
});

// Funzione per caricare componenti HTML dinamicamente
function loadComponent(url, containerId) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Errore HTTP: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            document.getElementById(containerId).innerHTML = html;
        })
        .catch(error => {
            console.error(`Errore nel caricamento del componente ${url}:`, error);
            document.getElementById(containerId).innerHTML = `
                <div class="alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Impossibile caricare il componente. Riprova più tardi.
                </div>
            `;
        });
}

// Inizializza le tab
function initTabs() {
    const tabContainers = document.querySelectorAll('.tabs');

    tabContainers.forEach(container => {
        const tabBtns = container.querySelectorAll('.tab-btn');
        const contentId = container.getAttribute('data-content') || '';
        const prefix = contentId ? `#${contentId} ` : '';

        tabBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');

                // Rimuovi la classe active da tutti i pulsanti nella stessa container
                container.querySelectorAll('.tab-btn').forEach(b => {
                    b.classList.remove('active');
                });

                // Aggiungi la classe active a questo pulsante
                this.classList.add('active');

                // Nascondi tutti i contenuti relativi e mostra quello selezionato
                const allContents = document.querySelectorAll(`${prefix}.tab-content`);
                allContents.forEach(content => {
                    content.classList.remove('active');
                });

                document.getElementById(tabId).classList.add('active');
            });
        });
    });
}

// Gestisci notifiche da URL query params
function handleNotificationsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const type = urlParams.get('type') || 'info';

    if (message) {
        showNotification(decodeURIComponent(message), type);

        // Pulisci l'URL dopo aver mostrato la notifica
        const url = new URL(window.location);
        url.searchParams.delete('message');
        url.searchParams.delete('type');
        window.history.replaceState({}, '', url);
    }
}

// Funzione per mostrare notifiche
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;

    document.body.appendChild(notification);

    // Aggiungi classe per animazione
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Pulsante per chiudere
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    });

    // Chiudi automaticamente dopo 5 secondi
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Funzione per formattare la dimensione del file
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Inizializza il modulo di reporting
function initReportingTool() {
    // Riferimenti ai campi DOM
    const jsonFileInput = document.getElementById('jsonFileInput');
    const fileInfo = document.getElementById('fileInfo');
    const processButton = document.getElementById('processButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressPercentage = document.getElementById('progressPercentage');
    const resultInfo = document.getElementById('resultInfo');
    const previewDiv = document.getElementById('preview');
    const exportCsvButton = document.getElementById('exportCsvButton');
    const exportXlsxButton = document.getElementById('exportXlsxButton');
    const exportPdfButton = document.getElementById('exportPdfButton');
    const generateStatsBtn = document.getElementById('generateStatsButton');

    // Se non siamo nella pagina di reporting, esci
    if (!jsonFileInput) return;

    // Gestione file
    jsonFileInput.addEventListener('change', handleFileSelection);

    // Gestione Drag & Drop
    const fileInputLabel = document.querySelector('.file-input-label');
    if (fileInputLabel) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            fileInputLabel.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

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

    // Gestione processamento
    if (processButton) {
        processButton.addEventListener('click', processJSONFiles);
    }

    // Gestione esportazione
    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', () => exportData('csv'));
    }

    if (exportXlsxButton) {
        exportXlsxButton.addEventListener('click', () => exportData('xlsx'));
    }

    if (exportPdfButton) {
        exportPdfButton.addEventListener('click', () => exportData('pdf'));
    }

    // Gestione statistiche
    if (generateStatsBtn) {
        generateStatsBtn.addEventListener('click', generateStatistics);
    }

    // Gestione filtri
    const enableFilterCheck = document.getElementById('enableFilter');
    const filterFieldSelect = document.getElementById('filterField');
    const filterOperatorSel = document.getElementById('filterOperator');
    const filterValueInput = document.getElementById('filterValue');

    if (enableFilterCheck) {
        enableFilterCheck.addEventListener('change', function() {
            const filterControls = document.querySelector('.filter-controls');
            filterControls.style.display = this.checked ? 'flex' : 'none';

            // Se il filtro è attivato e ci sono dati, applicalo
            if (this.checked && allExtractedData.length > 0) {
                filteredData = applyFilter(allExtractedData);
                displayResults(filteredData);
            } else if (allExtractedData.length > 0) {
                // Se il filtro è disattivato, mostra tutti i dati
                filteredData = [...allExtractedData];
                displayResults(filteredData);
            }
        });
    }

    // Aggiorna i filtri quando i valori cambiano
    if (filterFieldSelect && filterOperatorSel && filterValueInput) {
        [filterFieldSelect, filterOperatorSel, filterValueInput].forEach(el => {
            el.addEventListener('change', function() {
                if (enableFilterCheck && enableFilterCheck.checked && allExtractedData.length > 0) {
                    filteredData = applyFilter(allExtractedData);
                    displayResults(filteredData);
                }
            });
        });

        filterValueInput.addEventListener('input', function() {
            if (enableFilterCheck && enableFilterCheck.checked && allExtractedData.length > 0) {
                filteredData = applyFilter(allExtractedData);
                displayResults(filteredData);
            }
        });
    }

    // Funzioni di gestione file
    function handleFileSelection(e) {
        currentFiles = Array.from(e.target.files);
        updateFileInfo();
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        // Filtra solo i file JSON
        currentFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.json'));

        if (currentFiles.length === 0) {
            showNotification('Seleziona almeno un file JSON valido', 'error');
            return;
        }

        // Aggiorna l'input file con i file selezionati (se possibile)
        try {
            const dataTransfer = new DataTransfer();
            currentFiles.forEach(file => dataTransfer.items.add(file));
            jsonFileInput.files = dataTransfer.files;
        } catch (err) {
            console.error('Errore nel settaggio dei file:', err);
        }

        updateFileInfo();
    }

    function updateFileInfo() {
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
    }