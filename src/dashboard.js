// dashboard.js - Script per la gestione della dashboard

// Variabili per i grafici Chart.js
let chargesTimeChart;
let transactionsTimeChart;
let feesTimeChart;
let categoryChart;

// Colori per i grafici
const chartColors = {
    primary: '#4361ee',
    secondary: '#3f37c9',
    success: '#4cc9f0',
    danger: '#f72585',
    warning: '#f8961e',
    info: '#a5abae',
    light: '#f8f9fa',
    dark: '#212529',
    // Array di colori per grafici multipli
    palette: [
        '#4361ee', '#f72585', '#4cc9f0', '#f8961e', '#3f37c9',
        '#7209b7', '#560bad', '#480ca8', '#3a0ca3', '#3f37c9'
    ]
};

// Funzione per formattare numeri in Euro
function formatEuro(value) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
}

// Funzione per formattare numeri con separatore migliaia
function formatNumber(value) {
    return new Intl.NumberFormat('it-IT').format(value);
}

// Inizializzazione dei grafici della dashboard
function initDashboardCharts() {
    // Controlla se l'utente è loggato
    if (window.auth && !window.auth.isLoggedIn()) {
        // Reindirizza alla pagina di login
        window.location.href = 'login.html';
        return;
    }

    // Inizializza i tab della dashboard
    initTabs();

    // Carica i dati della dashboard
    loadDashboardData();

    // Evento per aggiornare la dashboard
    document.getElementById('refreshDashboard').addEventListener('click', function() {
        loadDashboardData();
    });
}

// Gestione delle tab
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');

            // Rimuovi la classe active da tutti i pulsanti e contenuti
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Aggiungi la classe active al pulsante e contenuto selezionato
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Carica i dati della dashboard
function loadDashboardData() {
    // In un'app reale, qui faresti una chiamata API
    // Per questo esempio, utilizziamo dati simulati

    const period = document.getElementById('periodSelect').value;
    const dataType = document.getElementById('dataTypeSelect').value;

    // Simulazione caricamento
    showLoader();

    setTimeout(() => {
        // Dati simulati basati sui filtri
        const dashboardData = generateDashboardData(period, dataType);

        // Aggiorna i contatori
        updateCounters(dashboardData);

        // Aggiorna i grafici
        updateCharts(dashboardData);

        // Aggiorna la tabella delle elaborazioni recenti
        updateRecentProcessingTable(dashboardData.recentProcessing);

        hideLoader();
    }, 800); // Simulazione di caricamento di 800ms
}

// Mostra un indicatore di caricamento
function showLoader() {
    // Se esiste un loader, mostralo
    const loader = document.querySelector('.dashboard-loader');
    if (loader) {
        loader.style.display = 'flex';
        return;
    }

    // Altrimenti, crea un elemento loader
    const newLoader = document.createElement('div');
    newLoader.className = 'dashboard-loader';
    newLoader.innerHTML = `
        <div class="loader-spinner">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
        <div class="loader-text">Caricamento dati...</div>
    `;

    // Stile inline per il loader
    newLoader.style.position = 'fixed';
    newLoader.style.top = '0';
    newLoader.style.left = '0';
    newLoader.style.width = '100%';
    newLoader.style.height = '100%';
    newLoader.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    newLoader.style.display = 'flex';
    newLoader.style.flexDirection = 'column';
    newLoader.style.alignItems = 'center';
    newLoader.style.justifyContent = 'center';
    newLoader.style.zIndex = '1000';

    document.body.appendChild(newLoader);
}

// Nascondi il loader
function hideLoader() {
    const loader = document.querySelector('.dashboard-loader');
    if (loader) {
        loader.style.display = 'none';
    }
}

// Aggiorna i contatori delle card
function updateCounters(data) {
    // Aggiorna i valori delle card
    document.getElementById('fileProcessedCount').textContent = formatNumber(data.fileProcessed.value);
    document.getElementById('totalChargesValue').textContent = formatEuro(data.totalCharges.value);
    document.getElementById('transactionsCount').textContent = formatNumber(data.transactions.value);
    document.getElementById('averageFeeValue').textContent = data.averageFee.value + '%';

    // Aggiorna le variazioni con le classi corrette
    updateChangeValue('fileProcessedChange', data.fileProcessed.change);
    updateChangeValue('totalChargesChange', data.totalCharges.change);
    updateChangeValue('transactionsChange', data.transactions.change);
    updateChangeValue('averageFeeChange', data.averageFee.change);
}

// Aggiorna il valore di variazione e la classe CSS
function updateChangeValue(elementId, changeValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Aggiorna il testo
    element.textContent = (changeValue >= 0 ? '+' : '') + changeValue + '%';

    // Aggiorna la classe della variazione
    const parentElement = element.closest('.dashboard-card-change');
    if (parentElement) {
        parentElement.className = 'dashboard-card-change';
        if (changeValue > 0) {
            parentElement.classList.add('positive');
            parentElement.querySelector('i').className = 'fas fa-arrow-up';
        } else if (changeValue < 0) {
            parentElement.classList.add('negative');
            parentElement.querySelector('i').className = 'fas fa-arrow-down';
        } else {
            parentElement.classList.add('neutral');
            parentElement.querySelector('i').className = 'fas fa-equals';
        }
    }
}

// Aggiorna i grafici con i nuovi dati
function updateCharts(data) {
    // Distruggi i grafici esistenti se presenti
    if (chargesTimeChart) chargesTimeChart.destroy();
    if (transactionsTimeChart) transactionsTimeChart.destroy();
    if (feesTimeChart) feesTimeChart.destroy();
    if (categoryChart) categoryChart.destroy();

    // Crea i nuovi grafici con i dati aggiornati
    createTimeCharts(data);
    createCategoryChart(data.categories);
}

// Crea i grafici temporali
function createTimeCharts(data) {
    // Grafico addebiti nel tempo
    const chargesCtx = document.getElementById('chargesTimeChart').getContext('2d');
    chargesTimeChart = new Chart(chargesCtx, {
        type: 'line',
        data: {
            labels: data.timeLabels,
            datasets: [{
                label: 'Addebiti (€)',
                data: data.chargesOverTime,
                backgroundColor: 'rgba(67, 97, 238, 0.1)',
                borderColor: chartColors.primary,
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatEuro(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatEuro(value);
                        }
                    }
                }
            }
        }
    });

    // Grafico transazioni nel tempo
    const transactionsCtx = document.getElementById('transactionsTimeChart').getContext('2d');
    transactionsTimeChart = new Chart(transactionsCtx, {
        type: 'bar',
        data: {
            labels: data.timeLabels,
            datasets: [{
                label: 'Transazioni',
                data: data.transactionsOverTime,
                backgroundColor: chartColors.secondary,
                borderColor: chartColors.secondary,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });

    // Grafico fee nel tempo
    const feesCtx = document.getElementById('feesTimeChart').getContext('2d');
    feesTimeChart = new Chart(feesCtx, {
        type: 'line',
        data: {
            labels: data.timeLabels,
            datasets: [{
                label: 'Fee Media (%)',
                data: data.feesOverTime,
                backgroundColor: 'rgba(247, 37, 133, 0.1)',
                borderColor: chartColors.danger,
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

// Crea il grafico di distribuzione per categoria
function createCategoryChart(categoriesData) {
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: categoriesData.map(item => item.name),
            datasets: [{
                label: 'Distribuzione per Categoria',
                data: categoriesData.map(item => item.value),
                backgroundColor: chartColors.palette,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw;
                            const percentage = Math.round((value / context.dataset.data.reduce((a, b) => a + b, 0)) * 100);
                            return `${label}: ${formatEuro(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Aggiorna la tabella delle elaborazioni recenti
function updateRecentProcessingTable(data) {
    const tableBody = document.getElementById('recentProcessingTable');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.fileName}</td>
            <td>${formatNumber(item.recordCount)}</td>
            <td>${formatEuro(item.total)}</td>
            <td><a href="#" class="btn-sm btn-primary" data-id="${item.id}"><i class="fas fa-eye"></i></a></td>
        `;
        tableBody.appendChild(row);
    });

    // Aggiungi event listener per i pulsanti di visualizzazione
    tableBody.querySelectorAll('.btn-sm').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const recordId = this.getAttribute('data-id');
            alert(`Visualizzazione dettaglio record ID: ${recordId}`);
            // In un'app reale, qui faresti la navigazione al dettaglio
        });
    });
}

// Genera dati di dashboard simulati in base ai filtri selezionati
function generateDashboardData(period, dataType) {
    // Genera etichette temporali in base al periodo
    let timeLabels = [];
    let dataPoints = 0;

    switch(period) {
        case 'week':
            timeLabels = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
            dataPoints = 7;
            break;
        case 'month':
            timeLabels = Array.from({length: 30}, (_, i) => (i + 1).toString());
            dataPoints = 30;
            break;
        case 'quarter':
            timeLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'].slice(0, 3);
            dataPoints = 3;
            break;
        case 'year':
            timeLabels = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
            dataPoints = 12;
            break;
    }

    // Genera dati casuali
    const getRandomValue = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Genera dati in base al tipo selezionato
    let multiplier = 1;
    if (dataType === 'addebiti') multiplier = 1.2;
    if (dataType === 'transazioni') multiplier = 0.9;

    const chargesData = Array.from({length: dataPoints}, () => getRandomValue(5000, 15000) * multiplier);
    const transactionsData = Array.from({length: dataPoints}, () => getRandomValue(100, 500) * multiplier);
    const feesData = Array.from({length: dataPoints}, () => (getRandomValue(15, 40) / 10) * multiplier);

    // Calcola i totali
    const totalCharges = chargesData.reduce((a, b) => a + b, 0);
    const totalTransactions = transactionsData.reduce((a, b) => a + b, 0);
    const averageFee = (feesData.reduce((a, b) => a + b, 0) / dataPoints).toFixed(1);

    // Genera le categorie
    const categories = [
        { name: 'Bancarie', value: getRandomValue(8000, 12000) * multiplier },
        { name: 'E-commerce', value: getRandomValue(5000, 9000) * multiplier },
        { name: 'Servizi', value: getRandomValue(3000, 7000) * multiplier },
        { name: 'Abbonamenti', value: getRandomValue(2000, 5000) * multiplier },
        { name: 'Altro', value: getRandomValue(1000, 3000) * multiplier }
    ];

    // Genera dati di elaborazioni recenti
    const recentProcessing = [
        {
            id: '1001',
            date: '22/03/2025',
            fileName: 'commissioni_marzo.json',
            recordCount: 156,
            total: 12450
        },
        {
            id: '1002',
            date: '15/03/2025',
            fileName: 'commissioni_febbraio.json',
            recordCount: 142,
            total: 11830
        },
        {
            id: '1003',
            date: '05/03/2025',
            fileName: 'commissioni_extra.json',
            recordCount: 28,
            total: 2150
        }
    ];

    if (period === 'week' || period === 'month') {
        recentProcessing.unshift({
            id: '1004',
            date: '25/03/2025',
            fileName: 'commissioni_recenti.json',
            recordCount: 78,
            total: 6450
        });
    }

    // Restituisci il set completo di dati
    return {
        timeLabels,
        chargesOverTime: chargesData,
        transactionsOverTime: transactionsData,
        feesOverTime: feesData,
        categories,
        recentProcessing,
        fileProcessed: {
            value: getRandomValue(80, 150),
            change: getRandomValue(-5, 15)
        },
        totalCharges: {
            value: totalCharges,
            change: getRandomValue(-10, 10)
        },
        transactions: {
            value: totalTransactions,
            change: getRandomValue(-5, 20)
        },
        averageFee: {
            value: averageFee,
            change: getRandomValue(-3, 3)
        }
    };
}

// Inizializzazione quando il DOM è caricato
document.addEventListener('DOMContentLoaded', function() {
    // Controlla se siamo nella pagina dashboard
    if (document.getElementById('chargesTimeChart')) {
        // Inizializza dopo un breve ritardo per garantire che tutti i componenti siano caricati
        setTimeout(initDashboardCharts, 100);
    }
});

// Esporta funzioni per altri script
window.dashboard = {
    refresh: loadDashboardData,
    formatEuro,
    formatNumber
};