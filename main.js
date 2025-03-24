// Descrizione: File principale dell'applicazione Electron con funzionalità di autenticazione e gestione dei report.
// Autore: Serge Guea
// Data: 22/03/2025

const {app, BrowserWindow, ipcMain, dialog, shell, Menu} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const nodemailer = require('nodemailer');
const {autoUpdater} = require('electron-updater');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const emailService = require('./emailService');
const authService = require('./src/auth-service.js');
const database = require('./src/database');

// Variabili per finestre
let mainWindow = null;
let authWindow = null;  // Non verrà utilizzata, poiché non viene mostrata la pagina di login
let splashWindow = null;

// Stato dell'autenticazione
let currentUser = null;

// Configurazione MySQL
let mysqlConfig = {
    host: 'localhost',
    user: 'root',
    password: '3892928507Gs',
    database: 'reporting_tool',
    port: 3306
};

// Connessione MySQL
let mysqlPool = null;

// Gestione configurazione dell'applicazione
const appConfig = {
    recentFiles: [],
    maxRecentFiles: 10,
    configPath: path.join(app.getPath('userData'), 'config.json'),
    filterPresetsPath: path.join(app.getPath('userData'), 'filter-presets.json'),
    emailConfigPath: path.join(app.getPath('userData'), 'email-config.json'),
    mysqlConfigPath: path.join(app.getPath('userData'), 'mysql-config.json'),
    // Il file schema.sql deve contenere lo schema MySQL (vedi schema di esempio fornito)
    schemaPath: path.join(__dirname, 'schema.sql'),

    // Carica la configurazione
    load() {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                this.recentFiles = data.recentFiles || [];
                this.maxRecentFiles = data.maxRecentFiles || 10;
            }
            // Carica configurazione MySQL
            if (fs.existsSync(this.mysqlConfigPath)) {
                const mysqlData = JSON.parse(fs.readFileSync(this.mysqlConfigPath, 'utf8'));
                mysqlConfig = {...mysqlConfig, ...mysqlData};
                console.log('Configurazione MySQL caricata');
            }
        } catch (error) {
            console.error('Errore nel caricamento della configurazione:', error);
        }
    },

    // Salva la configurazione
    save() {
        try {
            const data = {
                recentFiles: this.recentFiles,
                maxRecentFiles: this.maxRecentFiles
            };
            fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('Errore nel salvataggio della configurazione:', error);
        }
    },

    // Salva configurazione MySQL
    saveMySQLConfig(config) {
        try {
            mysqlConfig = {...mysqlConfig, ...config};
            fs.writeFileSync(this.mysqlConfigPath, JSON.stringify(mysqlConfig, null, 2), 'utf8');
            console.log('Configurazione MySQL salvata');
            return {success: true};
        } catch (error) {
            console.error('Errore nel salvataggio della configurazione MySQL:', error);
            return {success: false, message: error.message};
        }
    },

    // Aggiunge un file alla lista dei recenti
    async addRecentFile(filePath, userId) {
        try {
            // Salva nel database se è fornito un userId
            if (userId) {
                const fileType = path.extname(filePath).toLowerCase().substring(1);
                const fileName = path.basename(filePath);
                await addRecentFileToMySQL(userId, filePath, fileName, fileType);
            }
            // Aggiorna configurazione locale
            this.recentFiles = this.recentFiles.filter(p => p !== filePath);
            this.recentFiles.unshift(filePath);
            if (this.recentFiles.length > this.maxRecentFiles) {
                this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
            }
            this.save();
        } catch (error) {
            console.error('Errore nell\'aggiunta del file recente:', error);
        }
    },

    // Ottiene i file recenti dell'utente dal database
    async getUserRecentFiles(userId) {
        if (!userId) return {success: false, files: []};
        try {
            return await database.getRecentFiles(userId);
        } catch (error) {
            console.error('Errore nel recupero dei file recenti:', error);
            return {success: false, files: []};
        }
    },

    // Verifica lo schema MySQL: se il file schema.sql non esiste, lo crea
    async verifySchema() {
        try {
            if (!fs.existsSync(this.schemaPath)) {
                const schemaSQL = `-- Schema del database per Tool di Reporting Commissioni Mensile
-- MySQL

-- Tabella Utenti
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL DEFAULT NULL,
    is_active TINYINT(1) DEFAULT 1,
    preferences TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabella File Recenti per utente
CREATE TABLE recent_files (
    file_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabella Preset Filtri
CREATE TABLE filter_presets (
    preset_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filter_config TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabella Configurazioni Email
CREATE TABLE email_configs (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    service VARCHAR(100),
    smtp_host VARCHAR(255),
    smtp_port INT,
    smtp_secure TINYINT(1) DEFAULT 0,
    username VARCHAR(255),
    password_encrypted VARCHAR(255),
    from_address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabella Report Salvati
CREATE TABLE saved_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    report_data TEXT,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabella Log Attività
CREATE TABLE activity_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip_address VARCHAR(50),
    user_agent VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indici
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_recent_files_user_id ON recent_files(user_id);
CREATE INDEX idx_recent_files_last_accessed ON recent_files(last_accessed);
CREATE INDEX idx_filter_presets_user_id ON filter_presets(user_id);
CREATE INDEX idx_saved_reports_user_id ON saved_reports(user_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);

-- Inserimento utente admin di default
INSERT INTO users (username, email, full_name, password_hash, salt, role)
VALUES (
    'admin',
    'gueaserge2@gmail.com',
    'Amministratore',
    '0a3b6e7f8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5e6f7081928374655041327980dbe8c8a5a5d8f0e71bb2c10eeb192a0e2dcf6d0e0a7b9c3d8f9e2b1c4d5f6a7b8',
    'default_salt',
    'admin'
);`;
                fs.writeFileSync(this.schemaPath, schemaSQL, 'utf8');
                console.log('Schema SQL creato con successo');
            }
            return true;
        } catch (error) {
            console.error('Errore nella verifica dello schema SQL:', error);
            return false;
        }
    }
};

// Funzioni MySQL
async function getMySQLConnection() {
    try {
        if (!mysqlPool) {
            console.log('Creazione pool di connessioni MySQL...');
            mysqlPool = mysql.createPool({
                host: mysqlConfig.host,
                user: mysqlConfig.user,
                password: mysqlConfig.password,
                database: mysqlConfig.database,
                port: mysqlConfig.port,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            console.log('Pool MySQL creato con successo');
        }
        return mysqlPool;
    } catch (error) {
        console.error('Errore nella creazione del pool MySQL:', error);
        throw error;
    }
}

async function testMySQLConnection() {
    try {
        const pool = await getMySQLConnection();
        const connection = await pool.getConnection();
        connection.release();
        console.log('Connessione MySQL testata con successo');
        return {success: true, message: 'Connessione MySQL stabilita con successo'};
    } catch (error) {
        console.error('Errore nel test della connessione MySQL:', error);
        return {success: false, message: `Errore nella connessione MySQL: ${error.message}`};
    }
}

async function createDatabaseIfNotExists() {
    try {
        console.log("Tentativo di accesso al database...");
        console.log(`Utilizzo del database esistente ${mysqlConfig.database}`);
        return true;
    } catch (error) {
        console.error('Errore nell\'accesso al database:', error);
        return false;
    }
}

async function initializeMySQLDatabase() {
    try {
        const dbCreated = await createDatabaseIfNotExists();
        if (!dbCreated) {
            return false;
        }
        await appConfig.verifySchema();
        const schemaSQL = fs.readFileSync(appConfig.schemaPath, 'utf8');
        const queries = schemaSQL.split(';').filter(query => query.trim().length > 0);
        const pool = await getMySQLConnection();
        for (const query of queries) {
            try {
                await pool.query(query);
            } catch (error) {
                if (!error.message.includes('already exists')) {
                    console.error('Errore nell\'esecuzione della query:', error);
                    console.error('Query:', query);
                }
            }
        }
        console.log('Database MySQL inizializzato correttamente');
        return true;
    } catch (error) {
        console.error('Errore nell\'inizializzazione del database MySQL:', error);
        return false;
    }
}

async function loginWithMySQL(credentials) {
    try {
        const pool = await getMySQLConnection();
        const [rows] = await pool.query(
            'SELECT user_id, username, email, full_name, password_hash, salt, role FROM users WHERE email = ? AND is_active = 1',
            [credentials.username]
        );
        if (rows.length === 0) {
            return {success: false, message: 'Utente non trovato'};
        }
        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isPasswordValid) {
            return {success: false, message: 'Password non valida'};
        }
        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
            [user.user_id]
        );
        await logActivityToMySQL(user.user_id, 'login', 'Login effettuato con successo');
        return {
            success: true,
            userData: {
                userId: user.user_id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            }
        };
    } catch (error) {
        console.error('Errore durante il login MySQL:', error);
        return {success: false, message: `Errore di database: ${error.message}`};
    }
}

async function registerWithMySQL(userData) {
    try {
        const pool = await getMySQLConnection();
        const [existingUsers] = await pool.query(
            'SELECT user_id FROM users WHERE email = ?',
            [userData.email]
        );
        if (existingUsers.length > 0) {
            return {success: false, message: 'Questa email è già registrata'};
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(userData.password, salt);
        const [result] = await pool.query(
            'INSERT INTO users (username, email, full_name, password_hash, salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [userData.username, userData.email, userData.full_name, passwordHash, salt, 'user']
        );
        if (result.affectedRows !== 1) {
            return {success: false, message: 'Errore durante la registrazione'};
        }
        return {
            success: true,
            message: 'Registrazione completata con successo',
            userData: {
                userId: result.insertId,
                username: userData.username,
                email: userData.email,
                fullName: userData.full_name,
                role: 'user'
            }
        };
    } catch (error) {
        console.error('Errore durante la registrazione MySQL:', error);
        return {success: false, message: `Errore di database: ${error.message}`};
    }
}

async function addRecentFileToMySQL(userId, filePath, fileName, fileType) {
    try {
        const pool = await getMySQLConnection();
        const [existingFiles] = await pool.query(
            'SELECT file_id FROM recent_files WHERE user_id = ? AND file_path = ?',
            [userId, filePath]
        );
        if (existingFiles.length > 0) {
            await pool.query(
                'UPDATE recent_files SET last_accessed = CURRENT_TIMESTAMP WHERE file_id = ?',
                [existingFiles[0].file_id]
            );
        } else {
            await pool.query(
                'INSERT INTO recent_files (user_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)',
                [userId, filePath, fileName, fileType]
            );
            const [allFiles] = await pool.query(
                'SELECT file_id FROM recent_files WHERE user_id = ? ORDER BY last_accessed DESC',
                [userId]
            );
            if (allFiles.length > appConfig.maxRecentFiles) {
                const filesToDelete = allFiles.slice(appConfig.maxRecentFiles);
                for (const file of filesToDelete) {
                    await pool.query(
                        'DELETE FROM recent_files WHERE file_id = ?',
                        [file.file_id]
                    );
                }
            }
        }
        return {success: true};
    } catch (error) {
        console.error('Errore nell\'aggiunta del file recente a MySQL:', error);
        return {success: false, message: error.message};
    }
}

async function getRecentFilesFromMySQL(userId) {
    try {
        const pool = await getMySQLConnection();
        const [files] = await pool.query(
            'SELECT file_id, file_path, file_name, file_type, last_accessed FROM recent_files WHERE user_id = ? ORDER BY last_accessed DESC',
            [userId]
        );
        return {success: true, files};
    } catch (error) {
        console.error('Errore nel recupero dei file recenti da MySQL:', error);
        return {success: false, message: error.message, files: []};
    }
}

async function logActivityToMySQL(userId, action, details, ipAddress = '', userAgent = '') {
    try {
        const pool = await getMySQLConnection();
        await pool.query(
            'INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [userId, action, details, ipAddress, userAgent]
        );
        return {success: true};
    } catch (error) {
        console.error('Errore nella registrazione dell\'attività su MySQL:', error);
        return {success: false, message: error.message};
    }
}

async function initializeDatabase() {
    try {
        const sqliteInitialized = await database.initialize();
        const mysqlInitialized = await initializeMySQLDatabase();
        return sqliteInitialized || mysqlInitialized;
    } catch (error) {
        console.error('Errore durante l\'inizializzazione dei database:', error);
        return false;
    }
}

appConfig.load();

// Finestra di splash (non viene richiamato il login, ma dopo la splash si avvia direttamente la finestra principale)
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 500,
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    splashWindow.loadFile(path.join(__dirname, 'src/splash.html'));
    splashWindow.on('closed', () => {
        splashWindow = null;
    });
    initializeDatabase().then(() => {
        setTimeout(() => {
            // Invece di chiamare createAuthWindow(), avviamo direttamente la finestra principale
            createMainWindow();
            if (splashWindow) splashWindow.close();
        }, 2000);
    }).catch(error => {
        console.error('Errore durante l\'inizializzazione:', error);
        dialog.showErrorBox(
            'Errore nell\'inizializzazione del database',
            'Si è verificato un errore durante l\'inizializzazione del database. L\'applicazione verrà chiusa.'
        );
        app.quit();
    });
}

// Eliminata la funzione createAuthWindow() in quanto non più necessaria

// Finestra principale
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'src/icon.png'),
        show: false,
        backgroundColor: '#f5f7fa'
    });
    mainWindow.loadFile(path.join(__dirname, 'src/index.html'));
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.webContents.executeJavaScript(
            'document.body.style.opacity = "0"; setTimeout(() => { document.body.style.transition = "opacity 400ms ease"; document.body.style.opacity = "1"; }, 100);'
        );
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    createAppMenu();
}

// Crea il menu dell'applicazione
function createAppMenu() {
    const isMac = process.platform === 'darwin';
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Apri JSON...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const {canceled, filePaths} = await dialog.showOpenDialog({
                            properties: ['openFile', 'multiSelections'],
                            filters: [
                                {name: 'JSON', extensions: ['json']},
                                {name: 'XML', extensions: ['xml']},
                                {name: 'CSV', extensions: ['csv']},
                                {name: 'Tutti i file', extensions: ['*']}
                            ]
                        });
                        if (!canceled && filePaths.length > 0) {
                            filePaths.forEach(async (filePath) => {
                                if (currentUser && currentUser.userId) {
                                    await appConfig.addRecentFile(filePath, currentUser.userId);
                                } else {
                                    await appConfig.addRecentFile(filePath);
                                }
                            });
                            mainWindow.webContents.send('files:opened', filePaths);
                        }
                    }
                },
                {
                    label: 'File recenti',
                    submenu: [{label: 'Nessun file recente', enabled: false}]
                },
                {type: 'separator'},
                {
                    label: 'Esporta come CSV',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('app:exportCsv');
                    }
                },
                {
                    label: 'Esporta come XLSX',
                    accelerator: 'CmdOrCtrl+Shift+E',
                    click: () => {
                        mainWindow.webContents.send('app:exportXlsx');
                    }
                },
                {
                    label: 'Esporta come PDF',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        mainWindow.webContents.send('app:exportPdf');
                    }
                },
                {type: 'separator'},
                isMac ? {role: 'close'} : {role: 'quit'}
            ]
        },
        {
            label: 'Modifica',
            submenu: [
                {role: 'undo'},
                {role: 'redo'},
                {type: 'separator'},
                {role: 'cut'},
                {role: 'copy'},
                {role: 'paste'},
                ...(isMac ? [
                    {role: 'delete'},
                    {role: 'selectAll'},
                    {type: 'separator'}
                ] : [
                    {role: 'delete'},
                    {type: 'separator'},
                    {role: 'selectAll'}
                ])
            ]
        },
        {
            label: 'Visualizza',
            submenu: [
                {role: 'reload'},
                {role: 'forceReload'},
                {type: 'separator'},
                {role: 'resetZoom'},
                {role: 'zoomIn'},
                {role: 'zoomOut'},
                {type: 'separator'},
                {role: 'togglefullscreen'},
                {type: 'separator'},
                {
                    label: 'Dashboard',
                    click: () => {
                        mainWindow.loadFile(path.join(__dirname, 'src/dashboard.html'));
                    }
                },
                {
                    label: 'Reporting',
                    click: () => {
                        mainWindow.loadFile(path.join(__dirname, 'src/reporting.html'));
                    }
                }
            ]
        },
        {
            label: 'Strumenti',
            submenu: [
                {
                    label: 'Configura Email',
                    click: () => {
                        mainWindow.webContents.send('app:configureEmail');
                    }
                },
                {
                    label: 'Gestisci Preset di Filtri',
                    click: () => {
                        mainWindow.webContents.send('app:manageFilterPresets');
                    }
                },
                {
                    label: 'Configurazione Database',
                    click: () => {
                        mainWindow.loadFile(path.join(__dirname, 'src/database-config.html'));
                    }
                },
                {type: 'separator'},
                {
                    label: 'Impostazioni',
                    click: () => {
                        mainWindow.loadFile(path.join(__dirname, 'src/settings.html'));
                    }
                }
            ]
        },
        {
            label: 'Utente',
            submenu: [
                {
                    label: 'Profilo',
                    click: () => {
                        mainWindow.loadFile(path.join(__dirname, 'src/profile.html'));
                    }
                },
                {
                    label: 'Cambia Password',
                    click: () => {
                        mainWindow.webContents.send('app:changePassword');
                    }
                },
                {type: 'separator'},
                {
                    label: 'Logout',
                    click: () => {
                        logoutUser();
                    }
                }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Guida utente',
                    click: async () => {
                        await shell.openExternal('https://gueaserge2.github.io/reporting-tool/docs');
                    }
                },
                {
                    label: 'Verifica aggiornamenti',
                    click: () => {
                        autoUpdater.checkForUpdatesAndNotify();
                    }
                },
                {type: 'separator'},
                {
                    label: 'Informazioni su',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            title: 'Informazioni',
                            message: 'Tool di Reporting Commissioni Mensile',
                            detail: `Versione: ${app.getVersion()}\n© 2025 - Tool Reporting Commissioni | Powered by Serge Guea`,
                            type: 'info',
                            buttons: ['Chiudi'],
                            defaultId: 0
                        });
                    }
                }
            ]
        }
    ];

    // Menu Amministrazione disponibile per tutti gli utenti
    template.splice(4, 0, {
        label: 'Amministrazione',
        submenu: [
            {
                label: 'Gestione Utenti',
                click: () => {
                    mainWindow.loadFile(path.join(__dirname, 'src/admin/users.html'));
                }
            },
            {
                label: 'Log Attività',
                click: () => {
                    mainWindow.loadFile(path.join(__dirname, 'src/admin/activity-logs.html'));
                }
            },
            {
                label: 'Configurazione Database',
                click: () => {
                    mainWindow.loadFile(path.join(__dirname, 'src/database-config.html'));
                }
            },
            {type: 'separator'},
            {
                label: 'Impostazioni di Sistema',
                click: () => {
                    mainWindow.loadFile(path.join(__dirname, 'src/admin/system-settings.html'));
                }
            },
            {type: 'separator'},
            {
                label: 'Informazioni Legali',
                submenu: [
                    {
                        label: 'Privacy',
                        click: () => {
                            mainWindow.loadFile(path.join(__dirname, 'src/privacy.html'));
                        }
                    },
                    {
                        label: 'Termini e Condizioni',
                        click: () => {
                            mainWindow.loadFile(path.join(__dirname, 'src/terms.html'));
                        }
                    },
                    {
                        label: 'Contatti',
                        click: () => {
                            mainWindow.loadFile(path.join(__dirname, 'src/contact.html'));
                        }
                    }
                ]
            }
        ]
    });
    updateRecentFilesMenu(template);
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

async function updateRecentFilesMenu(template) {
    const recentFilesMenu = template[0].submenu[1].submenu;
    let recentFiles = [];
    if (currentUser && currentUser.userId) {
        try {
            const result = await getRecentFilesFromMySQL(currentUser.userId);
            if (result.success && result.files.length > 0) {
                recentFiles = result.files.map(file => ({
                    path: file.file_path,
                    name: file.file_name
                }));
            } else {
                const sqliteResult = await appConfig.getUserRecentFiles(currentUser.userId);
                if (sqliteResult.success && sqliteResult.files.length > 0) {
                    recentFiles = sqliteResult.files.map(file => ({
                        path: file.file_path,
                        name: file.file_name || path.basename(file.file_path)
                    }));
                }
            }
        } catch (error) {
            console.error('Errore nel recupero dei file recenti da MySQL:', error);
            const sqliteResult = await appConfig.getUserRecentFiles(currentUser.userId);
            if (sqliteResult.success && sqliteResult.files.length > 0) {
                recentFiles = sqliteResult.files.map(file => ({
                    path: file.file_path,
                    name: file.file_name || path.basename(file.file_path)
                }));
            }
        }
    } else {
        recentFiles = appConfig.recentFiles.map(p => ({
            path: p,
            name: path.basename(p)
        }));
    }
    if (recentFiles.length > 0) {
        recentFilesMenu.length = 0;
        recentFiles.forEach((file, index) => {
            if (fs.existsSync(file.path)) {
                recentFilesMenu.push({
                    label: `${index + 1}. ${file.name}`,
                    click: () => {
                        mainWindow.webContents.send('files:opened', [file.path]);
                    }
                });
            }
        });
        recentFilesMenu.push({type: 'separator'});
        recentFilesMenu.push({
            label: 'Cancella file recenti',
            click: async () => {
                if (currentUser && currentUser.userId) {
                    try {
                        const pool = await getMySQLConnection();
                        await pool.query('DELETE FROM recent_files WHERE user_id = ?', [currentUser.userId]);
                    } catch (error) {
                        console.error('Errore nella cancellazione dei file recenti da MySQL:', error);
                    }
                }
                appConfig.recentFiles = [];
                appConfig.save();
                updateRecentFilesMenu(template);
                Menu.setApplicationMenu(Menu.buildFromTemplate(template));
            }
        });
    } else {
        recentFilesMenu.length = 0;
        recentFilesMenu.push({label: 'Nessun file recente', enabled: false});
    }
}

function logoutUser() {
    if (currentUser && currentUser.userId) {
        logActivityToMySQL(currentUser.userId, 'logout', 'Logout effettuato');
    }
    currentUser = null;
    if (mainWindow) {
        mainWindow.close();
        mainWindow = null;
    }
    // Invece di aprire la pagina di login, avviamo direttamente la finestra principale
    createMainWindow();
}

app.whenReady().then(() => {
    createSplashWindow();
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
            createSplashWindow();
        }
    });
    setupIpcHandlers();
    setupAutoUpdater();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('quit', async () => {
    try {
        await database.close();
        console.log('Database SQLite chiuso correttamente');
        if (mysqlPool) {
            await mysqlPool.end();
            console.log('Pool di connessioni MySQL chiuso correttamente');
        }
    } catch (error) {
        console.error('Errore nella chiusura dei database:', error);
    }
});

function setupAutoUpdater() {
    autoUpdater.on('checking-for-update', () => {
        if (mainWindow) mainWindow.webContents.send('update:checking');
    });
    autoUpdater.on('update-available', (info) => {
        if (mainWindow) mainWindow.webContents.send('update:available', info);
    });
    autoUpdater.on('update-not-available', (info) => {
        if (mainWindow) mainWindow.webContents.send('update:not-available', info);
    });
    autoUpdater.on('error', (err) => {
        if (mainWindow) mainWindow.webContents.send('update:error', err);
    });
    autoUpdater.on('download-progress', (progressObj) => {
        if (mainWindow) mainWindow.webContents.send('update:progress', progressObj);
    });
    autoUpdater.on('update-downloaded', (info) => {
        if (mainWindow) {
            mainWindow.webContents.send('update:downloaded', info);
            dialog.showMessageBox({
                type: 'info',
                title: 'Aggiornamento disponibile',
                message: 'Un nuovo aggiornamento è stato scaricato. Riavviare adesso l\'applicazione?',
                buttons: ['Riavvia', 'Più tardi']
            }).then((returnValue) => {
                if (returnValue.response === 0) autoUpdater.quitAndInstall();
            });
        }
    });
}

function setupIpcHandlers() {
    ipcMain.handle('auth:login', async (event, credentials) => {
        try {
            console.log('Tentativo di login SQLite con:', credentials.username);
            const result = await authService.login(credentials);
            console.log('Risultato login SQLite:', result);
            if (result.success) {
                currentUser = result.user;
                // Non viene richiamata la pagina di login
                createMainWindow();
                return {success: true, user: currentUser};
            } else {
                return {success: false, message: result.message};
            }
        } catch (error) {
            console.error('Errore durante il login SQLite:', error);
            return {success: false, message: 'Errore durante l\'autenticazione'};
        }
    });

    // Aggiungi questo handler nella funzione setupIpcHandlers()
// insieme agli altri handler ipcMain

    ipcMain.handle('email:send', async (event, emailData) => {
        try {
            // Crea un'istanza di transporter temporaneo se non è disponibile il servizio email
            let transporter = null;

            // Primo tentativo: utilizza la configurazione email dell'utente corrente
            if (currentUser && currentUser.userId) {
                try {
                    const pool = await getMySQLConnection();
                    const [configs] = await pool.query(
                        'SELECT service, smtp_host, smtp_port, smtp_secure, username, password_encrypted, from_address FROM email_configs WHERE user_id = ?',
                        [currentUser.userId]
                    );

                    if (configs.length > 0) {
                        const config = configs[0];
                        let transportConfig;

                        if (config.service && config.service !== 'other') {
                            transportConfig = {
                                service: config.service,
                                auth: {
                                    user: config.username,
                                    pass: config.password_encrypted // In produzione, decifrare la password
                                }
                            };
                        } else {
                            transportConfig = {
                                host: config.smtp_host,
                                port: parseInt(config.smtp_port),
                                secure: config.smtp_secure === 1,
                                auth: {
                                    user: config.username,
                                    pass: config.password_encrypted // In produzione, decifrare la password
                                },
                                tls: {
                                    rejectUnauthorized: false
                                }
                            };
                        }

                        transporter = nodemailer.createTransport(transportConfig);

                        // Log dell'attività
                        await logActivityToMySQL(
                            currentUser.userId,
                            'send_email',
                            `Email inviata a ${emailData.to} con oggetto "${emailData.subject}"`
                        );
                    }
                } catch (error) {
                    console.error('Errore nel recupero della configurazione email da MySQL:', error);
                }
            }

            // Secondo tentativo: utilizza il servizio email dell'applicazione
            if (!transporter) {
                transporter = emailService.getTransporter();

                // Se non è disponibile nemmeno il transporter dell'applicazione, creane uno temporaneo
                if (!transporter) {
                    // Configurazione di default per l'invio di email
                    const defaultConfig = {
                        host: 'smtp.gmail.com',
                        port: 587,
                        secure: false,
                        auth: {
                            user: 'gueaserge2@gmail.com', // Usa la tua email qui
                            pass: process.env.EMAIL_PASSWORD || 'password_app' // In produzione, usare variabili d'ambiente
                        }
                    };

                    transporter = nodemailer.createTransport(defaultConfig);
                }
            }

            // Verifica la connessione prima di inviare
            await transporter.verify();

            // Prepara le opzioni email
            const mailOptions = {
                from: emailData.from || 'gueaserge2@gmail.com',
                to: emailData.to,
                subject: emailData.subject,
                html: emailData.html,
                replyTo: emailData.replyTo || emailData.from
            };

            // Invia l'email
            const info = await transporter.sendMail(mailOptions);

            console.log('Email inviata con successo:', info.messageId);
            return {success: true, messageId: info.messageId};
        } catch (error) {
            console.error('Errore nell\'invio dell\'email:', error);
            return {success: false, error: error.message};
        }
    });

    ipcMain.handle('auth:loginMySQL', async (event, credentials) => {
        try {
            console.log('Tentativo di login MySQL con:', credentials.username);
            const result = await loginWithMySQL(credentials);
            console.log('Risultato login MySQL:', result);
            if (result.success) {
                currentUser = result.userData;
                createMainWindow();
                return {success: true, userData: result.userData};
            } else {
                return {success: false, message: result.message};
            }
        } catch (error) {
            console.error('Errore durante il login MySQL:', error);
            return {success: false, message: `Errore durante l'autenticazione: ${error.message}`};
        }
    });

    ipcMain.handle('auth:register', async (event, userData) => {
        try {
            console.log('Tentativo di registrazione SQLite con dati:', userData);
            const result = await authService.register(userData);
            console.log('Risultato registrazione SQLite:', result);
            if (result.success) {
                currentUser = result.user;
                createMainWindow();
            }
            return result;
        } catch (error) {
            console.error('Errore durante la registrazione SQLite:', error);
            return {success: false, message: 'Errore durante la registrazione: ' + error.message};
        }
    });

    ipcMain.handle('auth:registerMySQL', async (event, userData) => {
        try {
            console.log('Tentativo di registrazione MySQL con dati:', userData);
            const result = await registerWithMySQL(userData);
            console.log('Risultato registrazione MySQL:', result);
            if (result.success) {
                currentUser = result.userData;
                createMainWindow();
            }
            return result;
        } catch (error) {
            console.error('Errore durante la registrazione MySQL:', error);
            return {success: false, message: `Errore durante la registrazione: ${error.message}`};
        }
    });

    // Eliminati i gestori per "navigate:login" e "navigate:register" poiché non si visualizza più la pagina di login

    ipcMain.on('auth:logout', () => {
        logoutUser();
    });

    ipcMain.handle('auth:getCurrentUser', () => currentUser);

    ipcMain.handle('user:updateProfile', async (event, userData) => {
        if (!currentUser || !currentUser.userId) {
            return {success: false, message: 'Utente non autenticato'};
        }
        try {
            try {
                const pool = await getMySQLConnection();
                await pool.query(
                    'UPDATE users SET full_name = ?, email = ? WHERE user_id = ?',
                    [userData.fullName, userData.email, currentUser.userId]
                );
                currentUser = {...currentUser, fullName: userData.fullName, email: userData.email};
                return {success: true, user: currentUser};
            } catch (mysqlError) {
                console.error('Errore nell\'aggiornamento del profilo su MySQL:', mysqlError);
                const result = await authService.updateUserData(userData);
                if (result.success) currentUser = result.user;
                return result;
            }
        } catch (error) {
            console.error('Errore durante l\'aggiornamento del profilo:', error);
            return {success: false, message: 'Errore durante l\'aggiornamento del profilo'};
        }
    });

    ipcMain.handle('user:changePassword', async (event, passwordData) => {
        if (!currentUser || !currentUser.userId) {
            return {success: false, message: 'Utente non autenticato'};
        }
        try {
            try {
                const pool = await getMySQLConnection();
                const [rows] = await pool.query(
                    'SELECT password_hash FROM users WHERE user_id = ?',
                    [currentUser.userId]
                );
                if (rows.length === 0) {
                    return {success: false, message: 'Utente non trovato'};
                }
                const isCurrentPasswordValid = await bcrypt.compare(
                    passwordData.currentPassword,
                    rows[0].password_hash
                );
                if (!isCurrentPasswordValid) {
                    return {success: false, message: 'Password attuale non valida'};
                }
                const salt = await bcrypt.genSalt(10);
                const newPasswordHash = await bcrypt.hash(passwordData.newPassword, salt);
                await pool.query(
                    'UPDATE users SET password_hash = ?, salt = ? WHERE user_id = ?',
                    [newPasswordHash, salt, currentUser.userId]
                );
                await logActivityToMySQL(currentUser.userId, 'password_change', 'Password cambiata con successo');
                return {success: true, message: 'Password cambiata con successo'};
            } catch (mysqlError) {
                console.error('Errore nel cambio password su MySQL:', mysqlError);
                return await authService.changePassword(passwordData);
            }
        } catch (error) {
            console.error('Errore durante il cambio password:', error);
            return {success: false, message: 'Errore durante il cambio password'};
        }
    });

    ipcMain.handle('dialog:saveFile', async (event, options) => {
        const {defaultPath, fileTypes} = options;
        const result = await dialog.showSaveDialog({
            defaultPath: defaultPath || 'export.csv',
            filters: fileTypes || [
                {name: 'CSV', extensions: ['csv']},
                {name: 'Excel', extensions: ['xlsx']},
                {name: 'PDF', extensions: ['pdf']},
                {name: 'Tutti i file', extensions: ['*']}
            ],
            properties: ['createDirectory', 'showOverwriteConfirmation']
        });
        return {canceled: result.canceled, filePath: result.filePath};
    });

    ipcMain.handle('app:getVersion', () => app.getVersion());
    ipcMain.handle('app:getPath', () => app.getAppPath());

    ipcMain.handle('app:getRecentFiles', async () => {
        if (currentUser && currentUser.userId) {
            try {
                const result = await getRecentFilesFromMySQL(currentUser.userId);
                if (result.success) return result.files.map(file => file.file_path);
            } catch (error) {
                console.error('Errore nel recupero dei file recenti da MySQL:', error);
            }
            const result = await appConfig.getUserRecentFiles(currentUser.userId);
            if (result.success) return result.files.map(file => file.file_path);
        }
        return appConfig.recentFiles;
    });

    ipcMain.on('app:addRecentFile', async (event, filePath) => {
        if (currentUser && currentUser.userId) {
            await appConfig.addRecentFile(filePath, currentUser.userId);
        } else {
            await appConfig.addRecentFile(filePath);
        }
        const template = Menu.getApplicationMenu().items.map(item => ({...item}));
        await updateRecentFilesMenu(template);
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    });

    ipcMain.on('app:addRecentFileToMySQL', async (event, {filePath, fileName, fileType}) => {
        if (currentUser && currentUser.userId) {
            try {
                await addRecentFileToMySQL(
                    currentUser.userId,
                    filePath,
                    fileName || path.basename(filePath),
                    fileType || path.extname(filePath).substring(1)
                );
                const template = Menu.getApplicationMenu().items.map(item => ({...item}));
                await updateRecentFilesMenu(template);
                Menu.setApplicationMenu(Menu.buildFromTemplate(template));
            } catch (error) {
                console.error('Errore nell\'aggiunta del file recente a MySQL:', error);
            }
        }
    });

    ipcMain.on('open:externalLink', (event, url) => {
        shell.openExternal(url);
    });

    ipcMain.on('window:minimize', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.on('window:maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) mainWindow.restore();
            else mainWindow.maximize();
        }
    });

    ipcMain.on('window:close', () => {
        if (mainWindow) mainWindow.close();
    });

    ipcMain.on('log:message', (event, message) => {
        console.log('Renderer Log:', message);
    });

    ipcMain.on('log:error', (event, message) => {
        console.error('Renderer Error:', message);
    });

    ipcMain.on('update:check', () => {
        autoUpdater.checkForUpdates();
    });

    ipcMain.on('update:download', () => {
        autoUpdater.downloadUpdate();
    });

    ipcMain.on('update:install', () => {
        autoUpdater.quitAndInstall();
    });

    ipcMain.handle('filters:getPresets', async () => {
        if (currentUser && currentUser.userId) {
            try {
                const pool = await getMySQLConnection();
                const [presets] = await pool.query(
                    'SELECT preset_id, name, description, filter_config, created_at, updated_at FROM filter_presets WHERE user_id = ? ORDER BY updated_at DESC',
                    [currentUser.userId]
                );
                return {
                    success: true,
                    presets: presets.map(p => ({
                        ...p,
                        filterConfig: JSON.parse(p.filter_config)
                    }))
                };
            } catch (mysqlError) {
                console.error('Errore nel recupero dei preset di filtro da MySQL:', mysqlError);
                return await database.getFilterPresets(currentUser.userId);
            }
        } else {
            return appConfig.getFilterPresets();
        }
    });

    ipcMain.handle('filters:savePreset', async (event, preset) => {
        if (currentUser && currentUser.userId) {
            try {
                const pool = await getMySQLConnection();
                if (preset.presetId) {
                    const [existingPresets] = await pool.query(
                        'SELECT preset_id FROM filter_presets WHERE preset_id = ? AND user_id = ?',
                        [preset.presetId, currentUser.userId]
                    );
                    if (existingPresets.length === 0) {
                        return {success: false, message: 'Preset non trovato o non autorizzato'};
                    }
                    await pool.query(
                        'UPDATE filter_presets SET name = ?, description = ?, filter_config = ?, updated_at = NOW() WHERE preset_id = ?',
                        [preset.name, preset.description, JSON.stringify(preset.filterConfig), preset.presetId]
                    );
                    return {success: true, presetId: preset.presetId, message: 'Preset aggiornato con successo'};
                } else {
                    const [result] = await pool.query(
                        'INSERT INTO filter_presets (user_id, name, description, filter_config) VALUES (?, ?, ?, ?)',
                        [currentUser.userId, preset.name, preset.description, JSON.stringify(preset.filterConfig)]
                    );
                    return {success: true, presetId: result.insertId, message: 'Preset salvato con successo'};
                }
            } catch (mysqlError) {
                console.error('Errore nel salvataggio del preset di filtro su MySQL:', mysqlError);
                return await database.saveFilterPreset(currentUser.userId, preset);
            }
        } else {
            return appConfig.saveFilterPreset(preset);
        }
    });

    ipcMain.handle('filters:deletePreset', async (event, presetId) => {
        if (currentUser && currentUser.userId) {
            try {
                const pool = await getMySQLConnection();
                const [existingPresets] = await pool.query(
                    'SELECT preset_id FROM filter_presets WHERE preset_id = ? AND user_id = ?',
                    [presetId, currentUser.userId]
                );
                if (existingPresets.length === 0) {
                    return {success: false, message: 'Preset non trovato o non autorizzato'};
                }
                await pool.query('DELETE FROM filter_presets WHERE preset_id = ?', [presetId]);
                return {success: true, message: 'Preset eliminato con successo'};
            } catch (mysqlError) {
                console.error('Errore nell\'eliminazione del preset di filtro da MySQL:', mysqlError);
                return await database.deleteFilterPreset(currentUser.userId, presetId);
            }
        } else {
            return appConfig.deleteFilterPreset(presetId);
        }
    });

    ipcMain.handle('email:getConfig', async () => {
        if (currentUser && currentUser.userId) {
            try {
                const pool = await getMySQLConnection();
                const [configs] = await pool.query(
                    'SELECT service, smtp_host, smtp_port, smtp_secure, username, password_encrypted, from_address FROM email_configs WHERE user_id = ?',
                    [currentUser.userId]
                );
                if (configs.length === 0) {
                    return {success: false, message: 'Configurazione email non trovata'};
                }
                return {success: true, config: configs[0]};
            } catch (mysqlError) {
                console.error('Errore nel recupero della configurazione email da MySQL:', mysqlError);
                return await database.getEmailConfig(currentUser.userId);
            }
        } else {
            return emailService.getEmailConfig();
        }
    });

    ipcMain.handle('email:saveConfig', async (event, config) => {
        if (currentUser && currentUser.userId) {
            try {
                const pool = await getMySQLConnection();
                const [existingConfigs] = await pool.query(
                    'SELECT config_id FROM email_configs WHERE user_id = ?',
                    [currentUser.userId]
                );
                const passwordEncrypted = config.password; // Semplificato: in produzione criptare la password
                if (existingConfigs.length > 0) {
                    await pool.query(
                        'UPDATE email_configs SET service = ?, smtp_host = ?, smtp_port = ?, smtp_secure = ?, username = ?, password_encrypted = ?, from_address = ?, updated_at = NOW() WHERE user_id = ?',
                        [config.service, config.smtpHost, config.smtpPort, config.smtpSecure ? 1 : 0, config.username, passwordEncrypted, config.fromAddress, currentUser.userId]
                    );
                } else {
                    await pool.query(
                        'INSERT INTO email_configs (user_id, service, smtp_host, smtp_port, smtp_secure, username, password_encrypted, from_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [currentUser.userId, config.service, config.smtpHost, config.smtpPort, config.smtpSecure ? 1 : 0, config.username, passwordEncrypted, config.fromAddress]
                    );
                }
                return {success: true, message: 'Configurazione email salvata con successo'};
            } catch (mysqlError) {
                console.error('Errore nel salvataggio della configurazione email su MySQL:', mysqlError);
                return await database.saveEmailConfig(currentUser.userId, config);
            }
        } else {
            return emailService.saveEmailConfig(config);
        }
    });

    ipcMain.handle('email:testConnection', async () => {
        return emailService.testEmailConnection();
    });

    ipcMain.handle('email:sendReport', async (event, options) => {
        return await emailService.sendReport(options);
    });

    ipcMain.handle('email:sendReportFromData', async (event, options) => {
        return await emailService.sendReportFromData(options);
    });

    ipcMain.handle('report:saveCsv', async (event, {data, defaultFilename}) => {
        try {
            const result = await dialog.showSaveDialog({
                defaultPath: defaultFilename || 'Report_Commissioni.csv',
                filters: [{name: 'CSV', extensions: ['csv']}],
                properties: ['createDirectory', 'showOverwriteConfirmation']
            });
            if (result.canceled) return {success: false, message: 'Operazione annullata.'};
            fs.writeFileSync(result.filePath, data, 'utf8');
            return {success: true, filePath: result.filePath};
        } catch (error) {
            return {success: false, message: error.message};
        }
    });

    ipcMain.handle('report:saveXlsx', async (event, {data, defaultFilename}) => {
        try {
            const result = await dialog.showSaveDialog({
                defaultPath: defaultFilename || 'Report_Commissioni.xlsx',
                filters: [{name: 'Excel', extensions: ['xlsx']}],
                properties: ['createDirectory', 'showOverwriteConfirmation']
            });
            if (result.canceled) return {success: false, message: 'Operazione annullata.'};
            fs.writeFileSync(result.filePath, data);
            return {success: true, filePath: result.filePath};
        } catch (error) {
            return {success: false, message: error.message};
        }
    });

    ipcMain.handle('report:savePdf', async (event, {data, defaultFilename}) => {
        try {
            const result = await dialog.showSaveDialog({
                defaultPath: defaultFilename || 'Report_Commissioni.pdf',
                filters: [{name: 'PDF', extensions: ['pdf']}],
                properties: ['createDirectory', 'showOverwriteConfirmation']
            });
            if (result.canceled) return {success: false, message: 'Operazione annullata.'};
            fs.writeFileSync(result.filePath, data);
            return {success: true, filePath: result.filePath};
        } catch (error) {
            return {success: false, message: error.message};
        }
    });

    ipcMain.handle('report:saveReport', async (event, {title, description, data}) => {
        if (!currentUser || !currentUser.userId) {
            return {success: false, message: 'Utente non autenticato'};
        }
        try {
            try {
                const pool = await getMySQLConnection();
                const [result] = await pool.query(
                    'INSERT INTO saved_reports (user_id, title, description, report_data) VALUES (?, ?, ?, ?)',
                    [currentUser.userId, title, description, JSON.stringify(data)]
                );
                return {success: true, reportId: result.insertId, message: 'Report salvato con successo'};
            } catch (mysqlError) {
                console.error('Errore nel salvataggio del report su MySQL:', mysqlError);
                await database.run(
                    `INSERT INTO saved_reports (user_id, title, description, report_data)
                     VALUES (?, ?, ?, ?)`,
                    [currentUser.userId, title, description, JSON.stringify(data)]
                );
                return {success: true, message: 'Report salvato con successo'};
            }
        } catch (error) {
            console.error('Errore durante il salvataggio del report:', error);
            return {success: false, message: error.message};
        }
    });

    ipcMain.handle('report:getSavedReports', async () => {
        if (!currentUser || !currentUser.userId) {
            return {success: false, message: 'Utente non autenticato', reports: []};
        }
        try {
            try {
                const pool = await getMySQLConnection();
                const [reports] = await pool.query(
                    `SELECT report_id, title, description, created_at, updated_at
                     FROM saved_reports
                     WHERE user_id = ?
                     ORDER BY updated_at DESC`,
                    [currentUser.userId]
                );
                return {success: true, reports};
            } catch (mysqlError) {
                console.error('Errore nel recupero dei report da MySQL:', mysqlError);
                const reports = await database.all(
                    `SELECT report_id, title, description, created_at, updated_at
                     FROM saved_reports
                     WHERE user_id = ?
                     ORDER BY updated_at DESC`,
                    [currentUser.userId]
                );
                return {success: true, reports};
            }
        } catch (error) {
            console.error('Errore durante il recupero dei report:', error);
            return {success: false, message: error.message, reports: []};
        }
    });

    ipcMain.handle('report:getSavedReport', async (event, reportId) => {
        if (!currentUser || !currentUser.userId) {
            return {success: false, message: 'Utente non autenticato'};
        }
        try {
            try {
                const pool = await getMySQLConnection();
                const [reports] = await pool.query(
                    `SELECT report_id, title, description, report_data, created_at, updated_at
                     FROM saved_reports
                     WHERE report_id = ?
                       AND user_id = ?`,
                    [reportId, currentUser.userId]
                );
                if (reports.length === 0) {
                    return {success: false, message: 'Report non trovato'};
                }
                return {success: true, report: {...reports[0], reportData: JSON.parse(reports[0].report_data)}};
            } catch (mysqlError) {
                console.error('Errore nel recupero del report da MySQL:', mysqlError);
                const report = await database.get(
                    `SELECT report_id, title, description, report_data, created_at, updated_at
                     FROM saved_reports
                     WHERE report_id = ?
                       AND user_id = ?`,
                    [reportId, currentUser.userId]
                );
                if (!report) {
                    return {success: false, message: 'Report non trovato'};
                }
                return {success: true, report: {...report, reportData: JSON.parse(report.report_data)}};
            }
        } catch (error) {
            console.error('Errore durante il recupero del report:', error);
            return {success: false, message: error.message};
        }
    });

    ipcMain.handle('report:deleteReport', async (event, reportId) => {
        if (!currentUser || !currentUser.userId) {
            return {success: false, message: 'Utente non autenticato'};
        }
        try {
            try {
                const pool = await getMySQLConnection();
                const [reports] = await pool.query(
                    "SELECT title FROM saved_reports WHERE report_id = ? AND user_id = ?",
                    [reportId, currentUser.userId]
                );
                if (reports.length === 0) {
                    return {success: false, message: 'Report non trovato'};
                }
                await pool.query(
                    "DELETE FROM saved_reports WHERE report_id = ? AND user_id = ?",
                    [reportId, currentUser.userId]
                );
                return {success: true, message: 'Report eliminato con successo'};
            } catch (mysqlError) {
                console.error('Errore nell\'eliminazione del report da MySQL:', mysqlError);
                const report = await database.get(
                    "SELECT title FROM saved_reports WHERE report_id = ? AND user_id = ?",
                    [reportId, currentUser.userId]
                );
                if (!report) return {success: false, message: 'Report non trovato'};
                await database.run(
                    "DELETE FROM saved_reports WHERE report_id = ? AND user_id = ?",
                    [reportId, currentUser.userId]
                );
                return {success: true, message: 'Report eliminato con successo'};
            }
        } catch (error) {
            console.error('Errore durante l\'eliminazione del report:', error);
            return {success: false, message: error.message};
        }
    });

    ipcMain.handle('database:testMySQLConnection', async () => {
        return await testMySQLConnection();
    });

    ipcMain.handle('database:configureMySQLConnection', async (event, config) => {
        try {
            if (mysqlPool) {
                await mysqlPool.end();
                mysqlPool = null;
            }
            const result = appConfig.saveMySQLConfig(config);
            if (!result.success) {
                return result;
            }
            return await testMySQLConnection();
        } catch (error) {
            console.error('Errore nella configurazione della connessione MySQL:', error);
            return {success: false, message: `Errore: ${error.message}`};
        }
    });

    ipcMain.handle('database:getMySQLConfig', async () => {
        return {success: true, config: mysqlConfig};
    });

    ipcMain.handle('database:executeQuery', async (event, {query, params}) => {
        if (!currentUser || currentUser.role !== 'admin') {
            return {success: false, message: 'Autorizzazione negata'};
        }
        try {
            const pool = await getMySQLConnection();
            const [results] = await pool.query(query, params || []);
            return {success: true, results};
        } catch (error) {
            console.error('Errore nell\'esecuzione della query:', error);
            return {success: false, message: `Errore: ${error.message}`};
        }
    });

    ipcMain.handle('auth:requestPasswordReset', async (event, email) => {
        try {
            const pool = await getMySQLConnection();
            const [users] = await pool.query(
                'SELECT user_id, full_name FROM users WHERE email = ? AND is_active = 1',
                [email]
            );
            if (users.length === 0) {
                return {success: true, message: 'Se l\'email esiste, riceverai le istruzioni per il reset'};
            }
            const user = users[0];
            console.log(`Reset password richiesto per ${email} (ID: ${user.user_id}, Nome: ${user.full_name})`);
            await logActivityToMySQL(user.user_id, 'password_reset_request', 'Richiesta di reset password');
            return {success: true, message: 'Se l\'email esiste, riceverai le istruzioni per il reset'};
        } catch (error) {
            console.error('Errore nella richiesta di reset password:', error);
            return {success: true, message: 'Se l\'email esiste, riceverai le istruzioni per il reset'};
        }
    });

    ipcMain.handle('admin:getAllUsers', async () => {
        if (!currentUser || currentUser.role !== 'admin') {
            return {success: false, message: 'Autorizzazione negata', users: []};
        }
        try {
            const pool = await getMySQLConnection();
            const [users] = await pool.query(
                `SELECT user_id,
                        username,
                        email,
                        full_name,
                        role,
                        created_at,
                        last_login,
                        is_active
                 FROM users
                 ORDER BY created_at DESC`
            );
            return {success: true, users};
        } catch (error) {
            console.error('Errore nel recupero degli utenti:', error);
            return {success: false, message: error.message, users: []};
        }
    });

    ipcMain.handle('admin:resetUserPassword', async (event, userId) => {
        if (!currentUser || currentUser.role !== 'admin') {
            return {success: false, message: 'Autorizzazione negata'};
        }
        try {
            const pool = await getMySQLConnection();
            const newPassword = Math.random().toString(36).slice(-8);
            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(newPassword, salt);
            await pool.query(
                'UPDATE users SET password_hash = ?, salt = ? WHERE user_id = ?',
                [newPasswordHash, salt, userId]
            );
            await logActivityToMySQL(currentUser.userId, 'admin_reset_password', `Reset password per l'utente ID: ${userId}`);
            return {success: true, message: 'Password resettata con successo', newPassword};
        } catch (error) {
            console.error('Errore nel reset della password:', error);
            return {success: false, message: error.message};
        }
    });

    ipcMain.handle('admin:toggleUserStatus', async (event, userId) => {
        if (!currentUser || currentUser.role !== 'admin') {
            return {success: false, message: 'Autorizzazione negata'};
        }
        try {
            const pool = await getMySQLConnection();
            const [users] = await pool.query(
                'SELECT is_active FROM users WHERE user_id = ?',
                [userId]
            );
            if (users.length === 0) {
                return {success: false, message: 'Utente non trovato'};
            }
            const newStatus = users[0].is_active ? 0 : 1;
            await pool.query(
                'UPDATE users SET is_active = ? WHERE user_id = ?',
                [newStatus, userId]
            );
            const action = newStatus ? 'activate_user' : 'deactivate_user';
            const details = `${newStatus ? 'Attivazione' : 'Disattivazione'} dell'utente ID: ${userId}`;
            await logActivityToMySQL(currentUser.userId, action, details);
            return {
                success: true,
                message: `Utente ${newStatus ? 'attivato' : 'disattivato'} con successo`,
                isActive: newStatus
            };
        } catch (error) {
            console.error('Errore nel cambio stato utente:', error);
            return {success: false, message: error.message};
        }
    });

    ipcMain.handle('admin:getActivityLogs', async (event, filters = {}) => {
        if (!currentUser || currentUser.role !== 'admin') {
            return {success: false, message: 'Autorizzazione negata', logs: []};
        }
        try {
            const pool = await getMySQLConnection();
            let query = `
                SELECT l.log_id,
                       l.user_id,
                       u.username,
                       u.full_name,
                       l.action,
                       l.details,
                       l.ip_address,
                       l.user_agent,
                       l.timestamp
                FROM activity_logs l
                         JOIN users u ON l.user_id = u.user_id
            `;
            const queryParams = [];
            const whereClauses = [];
            if (filters.userId) {
                whereClauses.push('l.user_id = ?');
                queryParams.push(filters.userId);
            }
            if (filters.action) {
                whereClauses.push('l.action = ?');
                queryParams.push(filters.action);
            }
            if (filters.startDate) {
                whereClauses.push('l.timestamp >= ?');
                queryParams.push(filters.startDate);
            }
            if (filters.endDate) {
                whereClauses.push('l.timestamp <= ?');
                queryParams.push(filters.endDate);
            }
            if (whereClauses.length > 0) {
                query += ' WHERE ' + whereClauses.join(' AND ');
            }
            query += ' ORDER BY l.timestamp DESC';
            if (filters.limit) {
                query += ' LIMIT ?';
                queryParams.push(parseInt(filters.limit));
            } else {
                query += ' LIMIT 100';
            }
            const [logs] = await pool.query(query, queryParams);
            return {success: true, logs};
        } catch (error) {
            console.error('Errore nel recupero dei log di attività:', error);
            return {success: false, message: error.message, logs: []};
        }
    });
}



