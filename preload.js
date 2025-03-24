// Questo script viene eseguito prima di qualsiasi altro script nella pagina web e
// espone funzionalità di Electron e Node.js all'applicazione
// Questo script è eseguito in un contesto isolato e non ha accesso a oggetti globali della pagina web

const {contextBridge, ipcRenderer} = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Espone funzionalità sicure di Electron e Node.js all'applicazione
contextBridge.exposeInMainWorld('electronAPI', {
    // API di autenticazione
    auth: {
        // Login con credenziali
        login: async (credentials) => {
            try {
                const result = await ipcRenderer.invoke('auth:login', credentials);
                console.log("Risultato login:", result);
                return result;
            } catch (error) {
                console.error("Errore in electronAPI.auth.login:", error);
                return {success: false, message: error.message || "Errore durante il login"};
            }
        },

        // Login con MySQL
        loginWithMySQL: async (credentials) => {
            try {
                const result = await ipcRenderer.invoke('auth:loginMySQL', credentials);
                console.log("Risultato login MySQL:", result);
                return result;
            } catch (error) {
                console.error("Errore in electronAPI.auth.loginWithMySQL:", error);
                return {success: false, message: error.message || "Errore durante il login con MySQL"};
            }
        },

        // Registrazione di un nuovo utente
        register: async (userData) => {
            try {
                return await ipcRenderer.invoke('auth:register', userData);
            } catch (error) {
                console.error("Errore in electronAPI.auth.register:", error);
                return {success: false, message: error.message || "Errore durante la registrazione"};
            }
        },

        // Registrazione con MySQL
        registerWithMySQL: async (userData) => {
            try {
                return await ipcRenderer.invoke('auth:registerMySQL', userData);
            } catch (error) {
                console.error("Errore in electronAPI.auth.registerWithMySQL:", error);
                return {success: false, message: error.message || "Errore durante la registrazione con MySQL"};
            }
        },

        // Reset password richiesta
        requestPasswordReset: async (email) => {
            try {
                return await ipcRenderer.invoke('auth:requestPasswordReset', email);
            } catch (error) {
                console.error("Errore in electronAPI.auth.requestPasswordReset:", error);
                return {success: false, message: error.message || "Errore nella richiesta di reset password"};
            }
        },

        // Logout dell'utente corrente
        logout: () => {
            ipcRenderer.send('auth:logout');
        },

        // Ottiene l'utente corrente
        getCurrentUser: async () => {
            try {
                return await ipcRenderer.invoke('auth:getCurrentUser');
            } catch (error) {
                console.error("Errore in electronAPI.auth.getCurrentUser:", error);
                return null;
            }
        },

        // Aggiorna i dati dell'utente
        updateProfile: async (userData) => {
            try {
                return await ipcRenderer.invoke('user:updateProfile', userData);
            } catch (error) {
                console.error("Errore in electronAPI.auth.updateProfile:", error);
                return {success: false, message: error.message || "Errore nell'aggiornamento del profilo"};
            }
        },

        // Cambia la password dell'utente
        changePassword: async (passwordData) => {
            try {
                return await ipcRenderer.invoke('user:changePassword', passwordData);
            } catch (error) {
                console.error("Errore in electronAPI.auth.changePassword:", error);
                return {success: false, message: error.message || "Errore nel cambio password"};
            }
        },

        // Naviga alla pagina di login
        navigateToLogin: () => {
            ipcRenderer.send('navigate:login');
        },

        // Naviga alla pagina di registrazione
        navigateToRegister: () => {
            ipcRenderer.send('navigate:register');
        },

        // Funzione per testare la connessione al database MySQL
        testMySQLConnection: async () => {
            try {
                return await ipcRenderer.invoke('database:testMySQLConnection');
            } catch (error) {
                console.error("Errore in electronAPI.auth.testMySQLConnection:", error);
                return {success: false, message: error.message || "Errore nel test della connessione MySQL"};
            }
        },

        // Funzioni per amministratori
        admin: {
            // Ottiene tutti gli utenti (solo admin)
            getAllUsers: async () => {
                try {
                    return await ipcRenderer.invoke('admin:getAllUsers');
                } catch (error) {
                    console.error("Errore in electronAPI.auth.admin.getAllUsers:", error);
                    return {success: false, message: error.message || "Errore nel recupero degli utenti"};
                }
            },

            // Ottiene tutti gli utenti da MySQL (solo admin)
            getAllUsersMySQL: async () => {
                try {
                    return await ipcRenderer.invoke('admin:getAllUsersMySQL');
                } catch (error) {
                    console.error("Errore in electronAPI.auth.admin.getAllUsersMySQL:", error);
                    return {success: false, message: error.message || "Errore nel recupero degli utenti da MySQL"};
                }
            },

            // Resetta la password di un utente (solo admin)
            resetUserPassword: async (userId) => {
                try {
                    return await ipcRenderer.invoke('admin:resetUserPassword', userId);
                } catch (error) {
                    console.error("Errore in electronAPI.auth.admin.resetUserPassword:", error);
                    return {success: false, message: error.message || "Errore nel reset della password"};
                }
            },

            // Disattiva/attiva un utente (solo admin)
            toggleUserStatus: async (userId) => {
                try {
                    return await ipcRenderer.invoke('admin:toggleUserStatus', userId);
                } catch (error) {
                    console.error("Errore in electronAPI.auth.admin.toggleUserStatus:", error);
                    return {success: false, message: error.message || "Errore nel cambio stato utente"};
                }
            }
        }
    },

    // API per gestione del database
    database: {
        // Configura le impostazioni di connessione MySQL
        configureMySQLConnection: async (config) => {
            try {
                return await ipcRenderer.invoke('database:configureMySQLConnection', config);
            } catch (error) {
                console.error("Errore in electronAPI.database.configureMySQLConnection:", error);
                return {success: false, message: error.message || "Errore nella configurazione MySQL"};
            }
        },

        // Ottiene le impostazioni di connessione MySQL
        getMySQLConfig: async () => {
            try {
                return await ipcRenderer.invoke('database:getMySQLConfig');
            } catch (error) {
                console.error("Errore in electronAPI.database.getMySQLConfig:", error);
                return {success: false, message: error.message || "Errore nel recupero configurazione MySQL"};
            }
        },

        // Esegue query MySQL personalizzate (solo admin)
        executeQuery: async (query, params) => {
            try {
                return await ipcRenderer.invoke('database:executeQuery', {query, params});
            } catch (error) {
                console.error("Errore in electronAPI.database.executeQuery:", error);
                return {success: false, message: error.message || "Errore nell'esecuzione della query"};
            }
        }
    },

    // Funzionalità per il sistema di file
    fileSystem: {
        saveFile: async (content, defaultPath, fileTypes) => {
            try {
                const result = await ipcRenderer.invoke('dialog:saveFile', {
                    defaultPath,
                    fileTypes
                });
                if (result.canceled) return {success: false, message: 'Operazione annullata.'};
                fs.writeFileSync(result.filePath, content);
                return {
                    success: true,
                    filePath: result.filePath,
                    message: 'File salvato con successo.'
                };
            } catch (error) {
                return {success: false, message: `Errore durante il salvataggio: ${error.message}`};
            }
        },

        readJsonFile: (filePath) => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return {success: true, data: JSON.parse(content)};
            } catch (error) {
                return {success: false, message: `Errore durante la lettura del file: ${error.message}`};
            }
        },

        readXmlFile: (filePath) => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return {success: true, data: content};
            } catch (error) {
                return {success: false, message: `Errore durante la lettura del file XML: ${error.message}`};
            }
        },

        readCsvFile: (filePath) => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                return {success: true, data: content};
            } catch (error) {
                return {success: false, message: `Errore durante la lettura del file CSV: ${error.message}`};
            }
        },

        fileExists: (filePath) => {
            try {
                return fs.existsSync(filePath);
            } catch (error) {
                console.error('Errore nel controllo esistenza file:', error);
                return false;
            }
        },

        getFileInfo: (filePath) => {
            try {
                const stats = fs.statSync(filePath);
                return {
                    success: true,
                    info: {
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime,
                        isDirectory: stats.isDirectory(),
                        isFile: stats.isFile(),
                        extension: path.extname(filePath)
                    }
                };
            } catch (error) {
                return {success: false, message: `Errore ottenendo info sul file: ${error.message}`};
            }
        }
    },

    // Informazioni di sistema
    system: {
        getOsInfo: () => {
            return {
                platform: os.platform(),
                release: os.release(),
                arch: os.arch(),
                hostname: os.hostname(),
                userInfo: os.userInfo().username,
                tempDir: os.tmpdir()
            };
        },
        getDocumentsPath: () => {
            return path.join(os.homedir(), 'Documents');
        },
        openExternalLink: (url) => {
            ipcRenderer.send('open:externalLink', url);
        }
    },

    // Gestione applicazione
    app: {
        getVersion: async () => {
            return await ipcRenderer.invoke('app:getVersion');
        },
        getAppPath: async () => {
            return await ipcRenderer.invoke('app:getPath');
        },
        minimizeWindow: () => {
            ipcRenderer.send('window:minimize');
        },
        maximizeWindow: () => {
            ipcRenderer.send('window:maximize');
        },
        closeWindow: () => {
            ipcRenderer.send('window:close');
        }
    }
});

// Ascoltatori di eventi DOM
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente caricato');
});

// Per comunicare messaggi di log al processo principale (utile per debug)
contextBridge.exposeInMainWorld('logger', {
    log: (message) => {
        ipcRenderer.send('log:message', message);
    },
    error: (message) => {
        ipcRenderer.send('log:error', message);
    }
});

// Espone funzionalità specifiche per l'applicazione di reporting
contextBridge.exposeInMainWorld('reportingTool', {
    saveCsvReport: async (data, defaultFilename) => {
        return await ipcRenderer.invoke('report:saveCsv', {data, defaultFilename});
    },
    saveXlsxReport: async (data, defaultFilename) => {
        return await ipcRenderer.invoke('report:saveXlsx', {data, defaultFilename});
    },
    savePdfReport: async (data, defaultFilename) => {
        return await ipcRenderer.invoke('report:savePdf', {data, defaultFilename});
    },
    saveReport: async (title, description, data) => {
        return await ipcRenderer.invoke('report:saveReport', {title, description, data});
    },
    // Salva report in MySQL
    saveReportToMySQL: async (title, description, data) => {
        return await ipcRenderer.invoke('report:saveReportToMySQL', {title, description, data});
    },
    getSavedReports: async () => {
        return await ipcRenderer.invoke('report:getSavedReports');
    },
    // Ottiene report salvati da MySQL
    getSavedReportsFromMySQL: async () => {
        return await ipcRenderer.invoke('report:getSavedReportsFromMySQL');
    },
    getSavedReport: async (reportId) => {
        return await ipcRenderer.invoke('report:getSavedReport', reportId);
    },
    // Ottiene un report specifico da MySQL
    getSavedReportFromMySQL: async (reportId) => {
        return await ipcRenderer.invoke('report:getSavedReportFromMySQL', reportId);
    },
    deleteReport: async (reportId) => {
        return await ipcRenderer.invoke('report:deleteReport', reportId);
    },
    // Elimina un report da MySQL
    deleteReportFromMySQL: async (reportId) => {
        return await ipcRenderer.invoke('report:deleteReportFromMySQL', reportId);
    },
    getRecentFiles: async () => {
        return await ipcRenderer.invoke('app:getRecentFiles');
    },
    // Ottiene i file recenti da MySQL
    getRecentFilesFromMySQL: async () => {
        return await ipcRenderer.invoke('app:getRecentFilesFromMySQL');
    },
    addRecentFile: (filePath) => {
        ipcRenderer.send('app:addRecentFile', filePath);
    },
    // Aggiunge un file recente in MySQL
    addRecentFileToMySQL: (filePath, fileName, fileType) => {
        ipcRenderer.send('app:addRecentFileToMySQL', {filePath, fileName, fileType});
    },
    checkForUpdates: () => {
        ipcRenderer.send('update:check');
    },
    downloadUpdate: () => {
        ipcRenderer.send('update:download');
    },
    installUpdate: () => {
        ipcRenderer.send('update:install');
    },
    getEmailConfig: async () => {
        return await ipcRenderer.invoke('email:getConfig');
    },
    // Ottiene configurazione email da MySQL
    getEmailConfigFromMySQL: async () => {
        return await ipcRenderer.invoke('email:getConfigFromMySQL');
    },
    saveEmailConfig: async (config) => {
        return await ipcRenderer.invoke('email:saveConfig', config);
    },
    // Salva configurazione email in MySQL
    saveEmailConfigToMySQL: async (config) => {
        return await ipcRenderer.invoke('email:saveConfigToMySQL', config);
    },
    testEmailConnection: async () => {
        return await ipcRenderer.invoke('email:testConnection');
    },
    sendEmailReport: async (options) => {
        return await ipcRenderer.invoke('email:sendReport', options);
    },
    sendEmailReportFromData: async (options) => {
        return await ipcRenderer.invoke('email:sendReportFromData', options);
    },
    getFilterPresets: async () => {
        return await ipcRenderer.invoke('filters:getPresets');
    },
    // Ottiene preset di filtro da MySQL
    getFilterPresetsFromMySQL: async () => {
        return await ipcRenderer.invoke('filters:getPresetsFromMySQL');
    },
    saveFilterPreset: async (preset) => {
        return await ipcRenderer.invoke('filters:savePreset', preset);
    },
    // Salva preset di filtro in MySQL
    saveFilterPresetToMySQL: async (preset) => {
        return await ipcRenderer.invoke('filters:savePresetToMySQL', preset);
    },
    deleteFilterPreset: async (presetId) => {
        return await ipcRenderer.invoke('filters:deletePreset', presetId);
    },
    // Elimina preset di filtro da MySQL
    deleteFilterPresetFromMySQL: async (presetId) => {
        return await ipcRenderer.invoke('filters:deletePresetFromMySQL', presetId);
    }
});

// Registra ascoltatori di eventi da processo principale a renderer
contextBridge.exposeInMainWorld('events', {
    on: (channel, callback) => {
        const validChannels = [
            'update:available',
            'update:downloaded',
            'update:error',
            'update:checking',
            'update:progress',
            'update:not-available',
            'email:sent',
            'email:error',
            'email:progress',
            'files:opened',
            'app:exportCsv',
            'app:exportXlsx',
            'app:exportPdf',
            'app:sendEmail',
            'app:configureEmail',
            'app:showDashboard',
            'app:manageFilterPresets',
            'app:showProfile',
            'app:changePassword',
            'auth:sessionExpired',
            'database:error',
            'database:connected',
            'database:disconnected',
            'mysql:connected',
            'mysql:error',
            'mysql:configChanged'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    off: (channel, callback) => {
        const validChannels = [
            'update:available',
            'update:downloaded',
            'update:error',
            'update:checking',
            'update:progress',
            'update:not-available',
            'email:sent',
            'email:error',
            'email:progress',
            'files:opened',
            'app:exportCsv',
            'app:exportXlsx',
            'app:exportPdf',
            'app:sendEmail',
            'app:configureEmail',
            'app:showDashboard',
            'app:manageFilterPresets',
            'app:showProfile',
            'app:changePassword',
            'auth:sessionExpired',
            'database:error',
            'database:connected',
            'database:disconnected',
            'mysql:connected',
            'mysql:error',
            'mysql:configChanged'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, callback);
        }
    },
    once: (channel, callback) => {
        const validChannels = [
            'update:available',
            'update:downloaded',
            'update:error',
            'update:checking',
            'update:progress',
            'update:not-available',
            'email:sent',
            'email:error',
            'email:progress',
            'auth:sessionExpired',
            'database:error',
            'database:connected',
            'database:disconnected',
            'mysql:connected',
            'mysql:error'
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.once(channel, (event, ...args) => callback(...args));
        }
    }
});