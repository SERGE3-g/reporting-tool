// emailService.js
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const {app} = require('electron');
const database = require('./src/database');

class EmailService {
    constructor() {
        // Percorso del file di configurazione locale (fallback)
        this.configPath = path.join(app.getPath('userData'), 'email-config.json');
        this.config = this.loadLocalConfig();
        this.transporter = null;
        this.currentUser = null;

        // Inizializza il transporter se è presente una configurazione valida
        if (this.config && ((this.config.service && this.config.service !== 'other') || (this.config.smtp && this.config.smtp.host))) {
            this.initTransporter();
        }
    }

    /**
     * Carica la configurazione email dal file locale.
     * Questa configurazione viene usata come fallback se l'utente non è autenticato.
     * @returns {Object} La configurazione email o un oggetto di default.
     */
    loadLocalConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            }
        } catch (error) {
            console.error('Errore nel caricamento della configurazione email locale:', error);
        }
        // Configurazione di default
        return {
            service: '',
            user: '',
            password: '',
            smtp: {
                host: '',
                port: 587,
                secure: false,
                user: '',
                password: '',
                from: ''
            }
        };
    }

    /**
     * Salva la configurazione email nel file locale.
     * Questo viene usato solo se l'utente non è autenticato.
     * @param {Object} config - La configurazione da salvare.
     * @returns {Object} Risultato dell'operazione.
     */
    saveLocalConfig(config) {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
            this.config = config;
            this.initTransporter();
            return {success: true};
        } catch (error) {
            console.error('Errore nel salvataggio della configurazione email locale:', error);
            return {success: false, message: error.message};
        }
    }

    /**
     * Inizializza il transporter nodemailer con la configurazione corrente.
     */
    initTransporter() {
        try {
            let transportConfig;
            if (this.config.service && this.config.service !== 'other') {
                // Configurazione basata sul servizio (es. Gmail, Outlook, ecc.)
                transportConfig = {
                    service: this.config.service,
                    auth: {
                        user: this.config.user,
                        pass: this.config.password
                    }
                };
            } else if (this.config.smtp && this.config.smtp.host) {
                // Configurazione SMTP personalizzata
                transportConfig = {
                    host: this.config.smtp.host,
                    port: this.config.smtp.port || 587,
                    secure: this.config.smtp.secure || false,
                    auth: {
                        user: this.config.smtp.user || this.config.user,
                        pass: this.config.smtp.password || this.config.password
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                };
            } else {
                console.error('Configurazione email non valida');
                return;
            }
            this.transporter = nodemailer.createTransport(transportConfig);
        } catch (error) {
            console.error('Errore nell\'inizializzazione del transporter:', error);
            this.transporter = null;
        }
    }

    /**
     * Imposta l'utente corrente.
     * Se l'utente è autenticato, carica la configurazione email dal database.
     * @param {Object} user - L'utente corrente.
     */
    setCurrentUser(user) {
        this.currentUser = user;
        if (user && user.userId) {
            this.loadUserConfig(user.userId);
        }
    }

    /**
     * Carica la configurazione email dal database per un utente specifico.
     * @param {number} userId - ID dell'utente.
     */
    async loadUserConfig(userId) {
        try {
            if (!database.initialized) {
                await database.initialize();
            }
            const result = await database.getEmailConfig(userId);
            if (result.success && result.config) {
                this.config = result.config;
                this.initTransporter();
            }
        } catch (error) {
            console.error('Errore nel caricamento della configurazione email dal database:', error);
        }
    }

    /**
     * Verifica la connessione SMTP tramite il transporter.
     * @returns {Promise<Object>} Risultato della verifica.
     */
    async verifyConnection() {
        if (!this.transporter) {
            return {success: false, message: 'Transporter non inizializzato'};
        }
        try {
            await this.transporter.verify();
            return {success: true, message: 'Connessione verificata con successo'};
        } catch (error) {
            console.error('Errore nella verifica della connessione SMTP:', error);
            return {success: false, message: error.message || 'Errore nella verifica della connessione'};
        }
    }

    /**
     * Invia un'email con eventuali allegati.
     * @param {Object} options - Opzioni per l'email.
     * @param {string|Array} options.to - Destinatario o lista di destinatari.
     * @param {string} options.subject - Oggetto dell'email.
     * @param {string} options.text - Corpo dell'email in testo semplice.
     * @param {string} options.html - Corpo dell'email in HTML.
     * @param {Array} options.attachments - Array di allegati.
     * @returns {Promise<Object>} Risultato dell'invio.
     */
    async sendEmail(options) {
        if (!this.transporter) {
            return {success: false, message: 'Configurazione email non disponibile'};
        }
        const {to, subject, text, html, attachments = []} = options;
        if (!to || !subject || (!text && !html)) {
            return {success: false, message: 'Parametri email mancanti (destinatario, oggetto o corpo)'};
        }
        try {
            let from;
            if (this.config.service && this.config.service !== 'other') {
                from = this.config.user;
            } else if (this.config.smtp) {
                from = this.config.smtp.from || this.config.smtp.user || this.config.user;
            }
            const mailOptions = {
                from,
                to: Array.isArray(to) ? to.join(',') : to,
                subject,
                text,
                html,
                attachments
            };
            const info = await this.transporter.sendMail(mailOptions);
            // Registra l'attività nel database se l'utente è autenticato
            if (this.currentUser && this.currentUser.userId && database.initialized) {
                try {
                    await database.run(
                        'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
                        [this.currentUser.userId, 'send_email', `Email inviata a: ${to} - Oggetto: ${subject}`]
                    );
                } catch (logError) {
                    console.error('Errore nel log dell\'attività di invio email:', logError);
                }
            }
            return {success: true, messageId: info.messageId, info};
        } catch (error) {
            console.error('Errore nell\'invio dell\'email:', error);
            return {success: false, message: error.message || 'Errore nell\'invio dell\'email', error};
        }
    }

    /**
     * Invia un report come allegato email.
     * @param {Object} options - Opzioni per l'invio del report.
     * @returns {Promise<Object>} Risultato dell'invio.
     */
    async sendReport(options) {
        const {to, subject, message, filePath, fileName} = options;
        if (!fs.existsSync(filePath)) {
            return {success: false, message: 'File non trovato: ' + filePath};
        }
        const attachment = {
            filename: fileName || path.basename(filePath),
            path: filePath
        };
        const now = new Date();
        const formattedDate = now.toLocaleDateString('it-IT');
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #4361ee;">Report Commissioni</h2>
        <p>Data di generazione: ${formattedDate}</p>
        <p>${message || 'In allegato il report delle commissioni richiesto.'}</p>
        <p>Il report è stato generato automaticamente dal Tool di Reporting Commissioni Mensile.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">© 2025 - Tool Reporting Commissioni | Powered by <b>Serge Guea</b></p>
      </div>
    `;
        const result = await this.sendEmail({
            to,
            subject: subject || 'Report Commissioni - ' + formattedDate,
            text: message || 'In allegato il report delle commissioni richiesto.',
            html: htmlContent,
            attachments: [attachment]
        });
        // Se l'utente è autenticato, salva il report nel database
        if (this.currentUser && this.currentUser.userId && result.success && database.initialized) {
            try {
                const reportTitle = subject || `Report Commissioni - ${formattedDate}`;
                const description = message || 'Report generato automaticamente';
                await database.run(
                    'INSERT INTO saved_reports (user_id, title, description, file_path) VALUES (?, ?, ?, ?)',
                    [this.currentUser.userId, reportTitle, description, filePath]
                );
            } catch (dbError) {
                console.error('Errore nel salvataggio del report nel database:', dbError);
            }
        }
        // Elimina il file temporaneo dopo 5 secondi
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`File temporaneo eliminato: ${filePath}`);
                }
            } catch (err) {
                console.warn('Errore nella pulizia del file temporaneo:', err);
            }
        }, 5000);
        return result;
    }

    /**
     * Invia un report direttamente dai dati estratti.
     * Supporta i formati CSV e XLSX (il PDF non è implementato).
     * @param {Object} options - Opzioni per l'invio.
     * @returns {Promise<Object>} Risultato dell'invio.
     */
    async sendReportFromData(options) {
        const {to, subject, message, data, format = 'csv', includeStats, statsHtml} = options;
        if (!data || !Array.isArray(data) || data.length === 0) {
            return {success: false, message: 'Dati non validi o vuoti'};
        }
        try {
            const tempDir = path.join(app.getPath('temp'), 'commissioni-reports');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, {recursive: true});
            }
            const now = new Date();
            const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
            let filePath, fileName;
            if (format === 'csv') {
                fileName = `Report_Commissioni_${timestamp}.csv`;
                filePath = path.join(tempDir, fileName);
                const headers = Object.keys(data[0]);
                const csvContent = [headers.join(',')];
                data.forEach(row => {
                    const values = headers.map(header => {
                        const val = row[header] || '';
                        return `"${val.toString().replace(/"/g, '""')}"`;
                    });
                    csvContent.push(values.join(','));
                });
                fs.writeFileSync(filePath, csvContent.join('\n'), 'utf8');
            } else if (format === 'xlsx') {
                const XLSX = require('xlsx');
                fileName = `Report_Commissioni_${timestamp}.xlsx`;
                filePath = path.join(tempDir, fileName);
                const worksheet = XLSX.utils.json_to_sheet(data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Dati Estratti');
                XLSX.writeFile(workbook, filePath);
            } else if (format === 'pdf') {
                return {success: false, message: 'Formato PDF non ancora supportato per l\'invio diretto'};
            } else {
                return {success: false, message: 'Formato non supportato'};
            }
            const formattedDate = now.toLocaleDateString('it-IT');
            let htmlBody = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #4361ee;">Report Commissioni</h2>
          <p>Data di generazione: ${formattedDate}</p>
          ${message ? `<p>${message}</p>` : ''}
          <p>In allegato trovi il report delle commissioni in formato ${format.toUpperCase()}.</p>
      `;
            if (includeStats && statsHtml) {
                htmlBody += `
          <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
            <h3 style="color: #4361ee; margin-top: 0;">Statistiche</h3>
            ${statsHtml}
          </div>
        `;
            }
            htmlBody += `
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #666;">Questo report è stato generato automaticamente dal Tool di Reporting Commissioni Mensile.<br>
          © 2025 - Tool Reporting Commissioni | Powered by <b>Serge Guea</b></p>
        </div>
      `;
            const result = await this.sendEmail({
                to,
                subject: subject || `Report Commissioni - ${formattedDate}`,
                text: message || 'In allegato il report delle commissioni richiesto.',
                html: htmlBody,
                attachments: [{filename: fileName, path: filePath}]
            });
            if (this.currentUser && this.currentUser.userId && result.success && database.initialized) {
                try {
                    const reportTitle = subject || `Report Commissioni - ${formattedDate}`;
                    const description = message || 'Report generato automaticamente';
                    await database.run(
                        'INSERT INTO saved_reports (user_id, title, description, file_path) VALUES (?, ?, ?, ?)',
                        [this.currentUser.userId, reportTitle, description, filePath]
                    );
                } catch (dbError) {
                    console.error('Errore nel salvataggio del report nel database:', dbError);
                }
            }
            setTimeout(() => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`File temporaneo eliminato: ${filePath}`);
                    }
                } catch (err) {
                    console.warn('Errore nella pulizia del file temporaneo:', err);
                }
            }, 5000);
            return result;
        } catch (error) {
            console.error('Errore nella generazione e invio del report:', error);
            return {success: false, message: error.message || 'Errore nella generazione e invio del report'};
        }
    }

    /**
     * Restituisce la configurazione email corrente.
     * @returns {Object} La configurazione email.
     */
    getEmailConfig() {
        return this.config;
    }

    /**
     * Salva la configurazione email.
     * Se l'utente è autenticato, la salva nel database; altrimenti usa il file locale.
     * @param {Object} config - La nuova configurazione.
     * @returns {Object} Risultato dell'operazione.
     */
    saveEmailConfig(config) {
        if (this.currentUser && this.currentUser.userId && database.initialized) {
            try {
                return database.saveEmailConfig(this.currentUser.userId, config);
            } catch (error) {
                console.error('Errore nel salvataggio della configurazione email nel database:', error);
            }
        }
        return this.saveLocalConfig(config);
    }

    /**
     * Testa la connessione con la configurazione corrente.
     * @returns {Promise<Object>} Risultato del test.
     */
    async testEmailConnection() {
        return this.verifyConnection();
    }

    /**
     * Invia un messaggio di benvenuto a un nuovo utente.
     * @param {Object} user - Dati dell'utente registrato.
     * @returns {Promise<Object>} Risultato dell'invio.
     */
    async sendWelcomeEmail(user) {
        if (!user || !user.email) {
            return {success: false, message: 'Email utente non disponibile'};
        }
        const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4361ee; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Benvenuto nel Tool di Reporting Commissioni</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Ciao <strong>${user.fullName || user.username}</strong>,</p>
          <p>Il tuo account è stato creato con successo. Ora puoi accedere a tutte le funzionalità del Tool di Reporting Commissioni Mensile.</p>
          <p>Con questo strumento potrai:</p>
          <ul>
            <li>Estrarre dati da file JSON, XML e CSV</li>
            <li>Applicare filtri personalizzati ai tuoi dati</li>
            <li>Generare statistiche e visualizzazioni</li>
            <li>Esportare i report in vari formati</li>
            <li>Inviare i report via email</li>
          </ul>
          <p>Se hai bisogno di assistenza, non esitare a contattare il nostro team di supporto.</p>
          <p>Cordiali saluti,<br>Il Team del Tool di Reporting</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
          <p>© 2025 - Tool Reporting Commissioni | Powered by <b>Serge Guea</b></p>
        </div>
      </div>
    `;
        return this.sendEmail({
            to: user.email,
            subject: 'Benvenuto nel Tool di Reporting Commissioni',
            text: `Benvenuto nel Tool di Reporting Commissioni, ${user.fullName || user.username}! Il tuo account è stato creato con successo.`,
            html
        });
    }

    /**
     * Invia una notifica di reset password.
     * @param {Object} userData - Dati dell'utente.
     * @param {string} tempPassword - Password temporanea generata.
     * @returns {Promise<Object>} Risultato dell'invio.
     */
    async sendPasswordResetEmail(userData, tempPassword) {
        if (!userData || !userData.email) {
            return {success: false, message: 'Email utente non disponibile'};
        }
        const html = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4361ee; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Reset Password</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Ciao <strong>${userData.fullName || userData.username}</strong>,</p>
          <p>La tua password è stata resettata. Utilizza la seguente password temporanea per accedere:</p>
          <div style="background-color: #f5f7fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; font-family: monospace; font-size: 18px; letter-spacing: 1px;">
            ${tempPassword}
          </div>
          <p><strong>Importante:</strong> Ti consigliamo di cambiare questa password temporanea dopo il primo accesso.</p>
          <p>Se non hai richiesto questo reset, contatta immediatamente il nostro team di supporto.</p>
          <p>Cordiali saluti,<br>Il Team del Tool di Reporting</p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
          <p>© 2025 - Tool Reporting Commissioni | Powered by <b>Serge Guea</b></p>
        </div>
      </div>
    `;
        return this.sendEmail({
            to: userData.email,
            subject: 'Reset Password - Tool di Reporting Commissioni',
            text: `La tua password è stata resettata. Password temporanea: ${tempPassword}`,
            html
        });
    }
}

module.exports = new EmailService();
