// settings.js - Gestione delle impostazioni dell'applicazione

// Oggetto per gestire le impostazioni
const settingsManager = {
    // Chiave per le impostazioni nel localStorage
    storageKey: 'reportingToolSettings',

    // Impostazioni predefinite
    defaultSettings: {
        general: {
            defaultExportFormat: 'csv',
            maxRecentFiles: 10,
            defaultDateFormat: 'dd/mm/yyyy',
            defaultLanguage: 'it',
            autoSaveEnabled: true,
            notificationsEnabled: true
        },
        email: {
            service: '',
            user: '',
            password: '',  // Nota: in un'app reale le password non dovrebbero mai essere salvate in chiaro
            smtpServer: '',
            smtpPort: 587,
            smtpSecure: true,
            defaultSubject: 'Report Commissioni',
            defaultMessage: 'In allegato il report delle commissioni generato.'
        },
        appearance: {
            theme: 'light',
            primaryColor: '#4361ee',
            secondaryColor: '#3f37c9',
            fontSize: 'medium',
            fontFamily: 'roboto',
            enableAnimations: true
        }
    },

    // Carica le impostazioni salvate o quelle predefinite
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem(this.storageKey);
            if (savedSettings) {
                return JSON.parse(savedSettings);
            }
        } catch (error) {
            console.error('Errore nel caricamento delle impostazioni:', error);
        }
        return JSON.parse(JSON.stringify(this.defaultSettings)); // Copia profonda
    },

    // Salva le impostazioni
    saveSettings(settings) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Errore nel salvataggio delle impostazioni:', error);
            return false;
        }
    },

    // Ottiene una singola impostazione
    getSetting(category, key) {
        const settings = this.loadSettings();
        return settings[category] && settings[category][key] !== undefined
            ? settings[category][key]
            : this.defaultSettings[category][key];
    },

    // Imposta una singola impostazione
    setSetting(category, key, value) {
        const settings = this.loadSettings();
        if (!settings[category]) settings[category] = {};
        settings[category][key] = value;
        return this.saveSettings(settings);
    },

    // Resetta tutte le impostazioni ai valori predefiniti
    resetAllSettings() {
        return this.saveSettings(JSON.parse(JSON.stringify(this.defaultSettings)));
    },

    // Resetta una categoria specifica di impostazioni
    resetCategorySettings(category) {
        const settings = this.loadSettings();
        settings[category] = JSON.parse(JSON.stringify(this.defaultSettings[category]));
        return this.saveSettings(settings);
    },

    // Esporta le impostazioni come JSON
    exportSettings() {
        const settings = this.loadSettings();
        // Filtriamo dati sensibili
        const exportedSettings = JSON.parse(JSON.stringify(settings));
        if (exportedSettings.email) {
            exportedSettings.email.password = '';  // Non esportiamo la password
        }
        return JSON.stringify(exportedSettings, null, 2);
    },

    // Importa le impostazioni da JSON
    importSettings(jsonString) {
        try {
            const importedSettings = JSON.parse(jsonString);
            // Merge con le impostazioni esistenti
            const currentSettings = this.loadSettings();

            // Controlla ogni categoria
            for (const category in importedSettings) {
                if (currentSettings[category]) {
                    // Merge delle proprietà
                    for (const key in importedSettings[category]) {
                        currentSettings[category][key] = importedSettings[category][key];
                    }
                } else {
                    // Nuova categoria
                    currentSettings[category] = importedSettings[category];
                }
            }

            return this.saveSettings(currentSettings);
        } catch (error) {
            console.error('Errore nell\'importazione delle impostazioni:', error);
            return false;
        }
    }
};

// Funzione per mostrare un messaggio di notifica nella pagina
function showNotification(message, type = 'info') {
    // Se esiste un elemento per lo stato email, usa quello
    const emailStatus = document.getElementById('emailStatus');
    if (emailStatus) {
        emailStatus.textContent = message;
        emailStatus.className = 'status-message';
        emailStatus.classList.add(`status-${type}`);
        emailStatus.style.display = 'block';

        // Nascondi dopo 5 secondi
        setTimeout(() => {
            emailStatus.style.display = 'none';
        }, 5000);
        return;
    }

    // Altrimenti crea una notifica fluttuante
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

// Funzione per calcolare il contrasto con il colore di sfondo
function getContrastColor(hexColor) {
    // Converte il colore esadecimale in RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);

    // Calcola la luminosità (formula pesata per la percezione umana)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Restituisci bianco o nero in base alla luminosità
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Funzione per applicare le impostazioni di aspetto
function applyAppearanceSettings() {
    const settings = settingsManager.loadSettings();
    const appearance = settings.appearance;

    // Applica tema
    document.body.classList.remove('theme-light', 'theme-dark');

    if (appearance.theme === 'system') {
        // Usa le impostazioni del sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
    } else {
        document.body.classList.add(`theme-${appearance.theme}`);
    }

    // Applica colori personalizzati
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--primary', appearance.primaryColor);
    rootStyle.setProperty('--secondary', appearance.secondaryColor);

    // Calcola colori derivati
    const primaryLight = adjustColor(appearance.primaryColor, 30);
    rootStyle.setProperty('--primary-light', primaryLight);

    // Contrasto per il testo
    const primaryContrast = getContrastColor(appearance.primaryColor);
    const secondaryContrast = getContrastColor(appearance.secondaryColor);
    rootStyle.setProperty('--primary-contrast', primaryContrast);
    rootStyle.setProperty('--secondary-contrast', secondaryContrast);

    // Dimensione del testo
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${appearance.fontSize}`);

    // Famiglia di caratteri
    document.body.classList.remove('font-roboto', 'font-open-sans', 'font-montserrat', 'font-lato');
    document.body.classList.add(`font-${appearance.fontFamily}`);

    // Animazioni
    document.body.classList.toggle('no-animations', !appearance.enableAnimations);
}

// Funzione per schiarire/scurire un colore
function adjustColor(hexColor, amount) {
    // Rimuovi il carattere # se presente
    hexColor = hexColor.replace('#', '');

    // Converte colore esadecimale in RGB
    let r = parseInt(hexColor.substr(0, 2), 16);
    let g = parseInt(hexColor.substr(2, 2), 16);
    let b = parseInt(hexColor.substr(4, 2), 16);

    // Schiarisci/scurisci
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    // Converti di nuovo in esadecimale
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Inizializzazione dei tab delle impostazioni
function initSettingsTabs() {
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

// Inizializzazione delle impostazioni generali
function initGeneralSettings() {
    const settings = settingsManager.loadSettings();
    const general = settings.general;

    // Popola i campi con le impostazioni salvate
    document.getElementById('defaultExportFormat').value = general.defaultExportFormat;
    document.getElementById('maxRecentFiles').value = general.maxRecentFiles;
    document.getElementById('defaultDateFormat').value = general.defaultDateFormat;
    document.getElementById('defaultLanguage').value = general.defaultLanguage;
    document.getElementById('autoSaveEnabled').checked = general.autoSaveEnabled;
    document.getElementById('notificationsEnabled').checked = general.notificationsEnabled;

    // Gestisci il salvataggio delle impostazioni generali
    document.getElementById('saveGeneralSettings').addEventListener('click', function() {
        const newSettings = {
            defaultExportFormat: document.getElementById('defaultExportFormat').value,
            maxRecentFiles: parseInt(document.getElementById('maxRecentFiles').value),
            defaultDateFormat: document.getElementById('defaultDateFormat').value,
            defaultLanguage: document.getElementById('defaultLanguage').value,
            autoSaveEnabled: document.getElementById('autoSaveEnabled').checked,
            notificationsEnabled: document.getElementById('notificationsEnabled').checked
        };

        // Salva le nuove impostazioni
        settings.general = newSettings;
        if (settingsManager.saveSettings(settings)) {
            showNotification('Impostazioni generali salvate con successo', 'success');
        } else {
            showNotification('Errore nel salvataggio delle impostazioni', 'error');
        }
    });
}

// Inizializzazione delle impostazioni email
function initEmailSettings() {
    const settings = settingsManager.loadSettings();
    const email = settings.email;

    // Popola i campi con le impostazioni salvate
    document.getElementById('emailService').value = email.service;
    document.getElementById('emailUser').value = email.user;
    document.getElementById('emailPassword').value = email.password;
    document.getElementById('defaultSubject').value = email.defaultSubject;
    document.getElementById('defaultMessage').value = email.defaultMessage;

    // Mostra/nascondi le impostazioni SMTP personalizzate
    if (email.service === 'other') {
        document.getElementById('smtpSettings').style.display = 'block';
        document.getElementById('smtpServer').value = email.smtpServer;
        document.getElementById('smtpPort').value = email.smtpPort;
        document.getElementById('smtpSecure').checked = email.smtpSecure;
    }

    // Gestisci il cambio del servizio email
    document.getElementById('emailService').addEventListener('change', function() {
        const smtpSettings = document.getElementById('smtpSettings');
        smtpSettings.style.display = this.value === 'other' ? 'block' : 'none';
    });

    // Gestisci il test della connessione email
    document.getElementById('testEmailConnection').addEventListener('click', function() {
        const emailStatus = document.getElementById('emailStatus');
        emailStatus.textContent = 'Test della connessione in corso...';
        emailStatus.className = 'status-message status-info';
        emailStatus.style.display = 'block';

        // Simulazione del test (in un'app reale, qui si farebbe una vera verifica)
        setTimeout(() => {
            // Controlla almeno che siano stati inseriti i campi necessari
            const service = document.getElementById('emailService').value;
            const user = document.getElementById('emailUser').value;
            const password = document.getElementById('emailPassword').value;

            if (!service || !user || !password) {
                emailStatus.textContent = 'Inserisci tutti i campi richiesti';
                emailStatus.className = 'status-message status-error';
                return;
            }

            if (service === 'other') {
                const server = document.getElementById('smtpServer').value;
                const port = document.getElementById('smtpPort').value;

                if (!server || !port) {
                    emailStatus.textContent = 'Inserisci server e porta SMTP';
                    emailStatus.className = 'status-message status-error';
                    return;
                }
            }

            // Simulazione di successo
            emailStatus.textContent = 'Connessione verificata con successo!';
            emailStatus.className = 'status-message status-success';

            // Nascondi dopo 5 secondi
            setTimeout(() => {
                emailStatus.style.display = 'none';
            }, 5000);
        }, 1500);
    });

    // Gestisci il salvataggio delle impostazioni email
    document.getElementById('saveEmailSettings').addEventListener('click', function() {
        const newSettings = {
            service: document.getElementById('emailService').value,
            user: document.getElementById('emailUser').value,
            password: document.getElementById('emailPassword').value,
            defaultSubject: document.getElementById('defaultSubject').value,
            defaultMessage: document.getElementById('defaultMessage').value
        };

        // Aggiungi impostazioni SMTP personalizzate se necessario
        if (newSettings.service === 'other') {
            newSettings.smtpServer = document.getElementById('smtpServer').value;
            newSettings.smtpPort = parseInt(document.getElementById('smtpPort').value);
            newSettings.smtpSecure = document.getElementById('smtpSecure').checked;
        }

        // Salva le nuove impostazioni
        settings.email = newSettings;
        if (settingsManager.saveSettings(settings)) {
            showNotification('Configurazione email salvata con successo', 'success');
        } else {
            showNotification('Errore nel salvataggio della configurazione email', 'error');
        }
    });
}

// Inizializzazione delle impostazioni di aspetto
function initAppearanceSettings() {
    const settings = settingsManager.loadSettings();
    const appearance = settings.appearance;

    // Popola i campi con le impostazioni salvate
    document.getElementById('themeSelect').value = appearance.theme;
    document.getElementById('primaryColor').value = appearance.primaryColor;
    document.getElementById('secondaryColor').value = appearance.secondaryColor;
    document.getElementById('fontSize').value = appearance.fontSize;
    document.getElementById('fontFamily').value = appearance.fontFamily;
    document.getElementById('enableAnimations').checked = appearance.enableAnimations;

    // Aggiorna le etichette dei colori
    document.getElementById('primaryColorLabel').textContent = appearance.primaryColor;
    document.getElementById('secondaryColorLabel').textContent = appearance.secondaryColor;

    // Gestisci il cambio di colori
    document.getElementById('primaryColor').addEventListener('input', function() {
        document.getElementById('primaryColorLabel').textContent = this.value;
        updateThemePreview();
    });

    document.getElementById('secondaryColor').addEventListener('input', function() {
        document.getElementById('secondaryColorLabel').textContent = this.value;
        updateThemePreview();
    });

    // Gestisci il cambio di tema
    document.getElementById('themeSelect').addEventListener('change', updateThemePreview);

    // Inizializza l'anteprima
    updateThemePreview();

    // Gestisci il salvataggio delle impostazioni di aspetto
    document.getElementById('saveAppearanceSettings').addEventListener('click', function() {
        const newSettings = {
            theme: document.getElementById('themeSelect').value,
            primaryColor: document.getElementById('primaryColor').value,
            secondaryColor: document.getElementById('secondaryColor').value,
            fontSize: document.getElementById('fontSize').value,
            fontFamily: document.getElementById('fontFamily').value,
            enableAnimations: document.getElementById('enableAnimations').checked
        };

        // Salva le nuove impostazioni
        settings.appearance = newSettings;
        if (settingsManager.saveSettings(settings)) {
            showNotification('Impostazioni di aspetto salvate con successo', 'success');
            applyAppearanceSettings(); // Applica immediatamente le modifiche
        } else {
            showNotification('Errore nel salvataggio delle impostazioni', 'error');
        }
    });

    // Gestisci il ripristino delle impostazioni predefinite
    document.getElementById('resetAppearanceSettings').addEventListener('click', function() {
        if (confirm('Sei sicuro di voler ripristinare le impostazioni di aspetto predefinite?')) {
            settingsManager.resetCategorySettings('appearance');
            showNotification('Impostazioni di aspetto ripristinate', 'success');

            // Ricarica la pagina per applicare le impostazioni predefinite
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    });
}

// Aggiorna l'anteprima del tema
function updateThemePreview() {
    const previewElement = document.getElementById('themePreview');
    const primaryColor = document.getElementById('primaryColor').value;
    const secondaryColor = document.getElementById('secondaryColor').value;
    const theme = document.getElementById('themeSelect').value;

    // Aggiorna le classi di tema
    previewElement.classList.remove('preview-theme-light', 'preview-theme-dark');
    previewElement.classList.add(`preview-theme-${theme === 'system' ? 'light' : theme}`);

    // Aggiorna i colori
    previewElement.style.setProperty('--preview-primary', primaryColor);
    previewElement.style.setProperty('--preview-secondary', secondaryColor);

    // Aggiorna i colori di contrasto
    const primaryContrast = getContrastColor(primaryColor);
    const secondaryContrast = getContrastColor(secondaryColor);
    previewElement.style.setProperty('--preview-primary-contrast', primaryContrast);
    previewElement.style.setProperty('--preview-secondary-contrast', secondaryContrast);
}

// Inizializzazione delle impostazioni di gestione dati
function initDataSettings() {
    // Simula le dimensioni dei dati
    document.getElementById('processedDataSize').textContent = '2.3 MB';
    document.getElementById('tempFilesSize').textContent = '0.8 MB';
    document.getElementById('cacheSize').textContent = '1.5 MB';

    // Gestisci la cancellazione dei dati di elaborazione
    document.getElementById('clearProcessedData').addEventListener('click', function() {
        if (confirm('Sei sicuro di voler cancellare tutti i dati di elaborazione? Questa operazione non può essere annullata.')) {
            // Simulazione della cancellazione
            setTimeout(() => {
                document.getElementById('processedDataSize').textContent = '0 MB';
                showNotification('Dati di elaborazione cancellati con successo', 'success');
            }, 500);
        }
    });

    // Gestisci la cancellazione di tutti i dati
    document.getElementById('clearAllData').addEventListener('click', function() {
        if (confirm('Sei sicuro di voler cancellare TUTTI i dati dell\'applicazione? Questa operazione non può essere annullata.')) {
            if (confirm('ATTENZIONE: Questa operazione cancellerà tutte le impostazioni, i dati e la cache. Confermi?')) {
                // Simulazione della cancellazione
                setTimeout(() => {
                    document.getElementById('processedDataSize').textContent = '0 MB';
                    document.getElementById('tempFilesSize').textContent = '0 MB';
                    document.getElementById('cacheSize').textContent = '0 MB';
                    showNotification('Tutti i dati sono stati cancellati', 'success');

                    // Resetta le impostazioni
                    settingsManager.resetAllSettings();

                    // Ricarica la pagina dopo un breve ritardo
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }, 800);
            }
        }
    });

    // Gestisci l'esportazione delle impostazioni
    document.getElementById('exportSettings').addEventListener('click', function() {
        const settingsJson = settingsManager.exportSettings();
        const blob = new Blob([settingsJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Crea un link temporaneo per il download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reporting-tool-settings.json';
        document.body.appendChild(a);
        a.click();

        // Pulizia
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);

        showNotification('Impostazioni esportate con successo', 'success');
    });

    // Gestisci l'importazione delle impostazioni
    document.getElementById('importSettings').addEventListener('click', function() {
        // Mostra l'input file
        const fileInput = document.getElementById('settingsFileInput');
        fileInput.value = ''; // Resetta il valore precedente

        const fileImportContainer = document.querySelector('.file-import-container');
        fileImportContainer.style.display = 'block';

        fileInput.click();
    });

    // Gestisci la selezione del file di importazione
    document.getElementById('settingsFileInput').addEventListener('change', function(e) {
        if (!this.files || !this.files[0]) return;

        const file = this.files[0];
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const imported = settingsManager.importSettings(e.target.result);
                if (imported) {
                    showNotification('Impostazioni importate con successo. La pagina verrà ricaricata.', 'success');

                    // Ricarica la pagina dopo 2 secondi
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                } else {
                    showNotification('Errore nell\'importazione delle impostazioni', 'error');
                }
            } catch (error) {
                showNotification('File di impostazioni non valido', 'error');
                console.error('Error importing settings:', error);
            }
        };

        reader.readAsText(file);

        // Nascondi il contenitore
        document.querySelector('.file-import-container').style.display = 'none';
    });

    // Gestisci il ripristino di tutte le impostazioni
    document.getElementById('resetAllSettings').addEventListener('click', function() {
        if (confirm('Sei sicuro di voler ripristinare TUTTE le impostazioni ai valori predefiniti? Questa operazione non può essere annullata.')) {
            if (confirm('ATTENZIONE: Questo resetterà tutte le preferenze e le configurazioni. Confermi?')) {
                settingsManager.resetAllSettings();
                showNotification('Tutte le impostazioni sono state ripristinate ai valori predefiniti. La pagina verrà ricaricata.', 'success');

                // Ricarica la pagina dopo 2 secondi
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        }
    });
}

// Inizializzazione della pagina delle impostazioni
document.addEventListener('DOMContentLoaded', function() {
    // Controlla se l'utente è loggato (per le funzionalità riservate)
    if (window.auth && typeof window.auth.isLoggedIn === 'function') {
        const isLoggedIn = window.auth.isLoggedIn();

        // Nascondi alcune funzionalità per utenti non loggati
        const restrictedElements = document.querySelectorAll('.settings-restricted');
        restrictedElements.forEach(el => {
            el.style.display = isLoggedIn ? 'block' : 'none';
        });

        // Se non è loggato e ci sono elementi con restrizioni, mostra un messaggio
        if (!isLoggedIn && restrictedElements.length > 0) {
            const message = document.createElement('div');
            message.className = 'auth-message auth-warning';
            message.innerHTML = '<i class="fas fa-lock"></i> Alcune impostazioni sono disponibili solo dopo il login';
            document.querySelector('.app-container header').after(message);
        }
    }

    // Inizializza i componenti dell'interfaccia
    initSettingsTabs();
    initGeneralSettings();
    initEmailSettings();
    initAppearanceSettings();
    initDataSettings();

    // Applica le impostazioni di aspetto salvate
    applyAppearanceSettings();
});

// Esporta il gestore delle impostazioni per altri script
window.settingsManager = settingsManager;