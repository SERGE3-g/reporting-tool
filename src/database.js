// database.js
// Modulo per la gestione del database MySQL
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class Database {
  constructor() {
    // Configurazione MySQL: adatta questi valori oppure impostali tramite variabili d'ambiente
    this.config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '3892978507Gs',
      database: process.env.MYSQL_DATABASE || 'reporting_tool',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
    this.pool = null;
    this.initialized = false;
  }

  /**
   * Inizializza il database
   * @returns {Promise<boolean>} True se l'inizializzazione ha successo
   */
  async initialize() {
    if (this.initialized) return true;

    try {
      // Crea il pool di connessioni
      this.pool = mysql.createPool(this.config);

      // Verifica se la tabella "users" esiste
      const [rows] = await this.pool.query("SHOW TABLES LIKE 'users'");
      if (rows.length === 0) {
        // Se non esiste, esegui lo schema iniziale
        await this.setupSchema();
        console.log('Database creato e inizializzato correttamente');
      } else {
        console.log('Connessione al database esistente stabilita');
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Errore durante l'inizializzazione del database:", error);
      return false;
    }
  }

  /**
   * Esegue lo schema iniziale
   * @returns {Promise<void>}
   */
  async setupSchema() {
    const schemaFilePath = path.join(__dirname, 'schema.sql');
    try {
      const schema = fs.readFileSync(schemaFilePath, 'utf8');
      // Divide lo schema in singole query (assumendo che le query siano separate da ;)
      const queries = schema.split(';').map(q => q.trim()).filter(q => q.length > 0);
      for (const query of queries) {
        await this.run(query);
      }
    } catch (error) {
      console.error("Errore durante la creazione dello schema:", error);
      throw error;
    }
  }

  /**
   * Esegue una query (INSERT, UPDATE, DELETE)
   * @param {string} sql - La query SQL
   * @param {Array} params - I parametri della query
   * @returns {Promise<Object>}
   */
  async run(sql, params = []) {
    try {
      const [result] = await this.pool.execute(sql, params);
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Esegue una query SELECT e restituisce tutti i risultati
   * @param {string} sql - La query SQL
   * @param {Array} params - I parametri della query
   * @returns {Promise<Array>}
   */
  async all(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Esegue una query SELECT e restituisce la prima riga
   * @param {string} sql - La query SQL
   * @param {Array} params - I parametri della query
   * @returns {Promise<Object>}
   */
  async get(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Chiude il pool di connessioni
   * @returns {Promise<void>}
   */
  async close() {
    try {
      await this.pool.end();
      this.initialized = false;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Genera un hash della password con un salt usando PBKDF2 con sha512
   * @param {string} password - La password da hashing
   * @param {string} [salt] - Il salt da usare (opzionale, ne genera uno se non fornito)
   * @returns {Object} { hash, salt }
   */
  hashPassword(password, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  /**
   * Verifica se una password corrisponde all'hash salvato
   * @param {string} password - La password da verificare
   * @param {string} storedHash - L'hash salvato nel database
   * @param {string} salt - Il salt usato
   * @returns {boolean} True se la password è corretta
   */
  verifyPassword(password, storedHash, salt) {
    const { hash } = this.hashPassword(password, salt);
    return hash === storedHash;
  }

  /**
   * Registra un nuovo utente
   * @param {Object} userData - I dati dell'utente
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  async registerUser(userData) {
    const { username, email, full_name, password } = userData;
    try {
      const existingUser = await this.get(
        "SELECT username, email FROM users WHERE username = ? OR email = ?",
        [username, email]
      );
      if (existingUser) {
        if (existingUser.username === username) {
          return { success: false, message: 'Username già in uso' };
        }
        if (existingUser.email === email) {
          return { success: false, message: 'Email già registrata' };
        }
      }
      const { hash, salt } = this.hashPassword(password);
      const result = await this.run(
        "INSERT INTO users (username, email, full_name, password_hash, salt) VALUES (?, ?, ?, ?, ?)",
        [username, email, full_name, hash, salt]
      );
      if (result.insertId) {
        return { success: true, userId: result.insertId, message: 'Utente registrato con successo' };
      } else {
        return { success: false, message: 'Errore durante la registrazione' };
      }
    } catch (error) {
      console.error("Errore durante la registrazione:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Autentica un utente
   * @param {Object} credentials - Credenziali (username/email e password)
   * @returns {Promise<Object>} Risultato dell'autenticazione
   */
  async loginUser(credentials) {
    const { username, password } = credentials;
    try {
      const user = await this.get(
        "SELECT user_id, username, email, full_name, password_hash, salt, role, is_active FROM users WHERE username = ? OR email = ?",
        [username, username]
      );
      if (!user) {
        return { success: false, message: 'Utente non trovato' };
      }
      if (!user.is_active) {
        return { success: false, message: 'Account disattivato' };
      }
      if (!this.verifyPassword(password, user.password_hash, user.salt)) {
        return { success: false, message: 'Password non corretta' };
      }
      await this.run("UPDATE users SET last_login = NOW() WHERE user_id = ?", [user.user_id]);
      await this.run(
        "INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)",
        [user.user_id, 'login', 'Login effettuato con successo']
      );
      const userData = {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      };
      return { success: true, user: userData, message: 'Login effettuato con successo' };
    } catch (error) {
      console.error("Errore durante il login:", error);
      return { success: false, message: "Errore durante l'autenticazione" };
    }
  }

  /**
   * Aggiunge un file alla lista dei file recenti di un utente
   * @param {number} userId - ID dell'utente
   * @param {string} filePath - Percorso completo del file
   * @param {string} fileType - Tipo di file (json, xml, csv)
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  async addRecentFile(userId, filePath, fileType) {
    try {
      const fileName = path.basename(filePath);
      const existingFile = await this.get(
        "SELECT file_id FROM recent_files WHERE user_id = ? AND file_path = ?",
        [userId, filePath]
      );
      if (existingFile) {
        await this.run("UPDATE recent_files SET last_accessed = NOW() WHERE file_id = ?", [existingFile.file_id]);
      } else {
        await this.run(
          "INSERT INTO recent_files (user_id, file_path, file_name, file_type) VALUES (?, ?, ?, ?)",
          [userId, filePath, fileName, fileType]
        );
        await this.run(`
          DELETE FROM recent_files 
          WHERE user_id = ? AND file_id NOT IN (
            SELECT file_id FROM (
              SELECT file_id FROM recent_files WHERE user_id = ? ORDER BY last_accessed DESC LIMIT 10
            ) AS t
          )
        `, [userId, userId]);
      }
      return { success: true };
    } catch (error) {
      console.error("Errore aggiungendo file recente:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Ottiene i file recenti di un utente
   * @param {number} userId - ID dell'utente
   * @returns {Promise<Object>} Lista di file recenti
   */
  async getRecentFiles(userId) {
    try {
      const files = await this.all(
        "SELECT file_id, file_path, file_name, file_type, last_accessed FROM recent_files WHERE user_id = ? ORDER BY last_accessed DESC LIMIT 10",
        [userId]
      );
      return { success: true, files };
    } catch (error) {
      console.error("Errore ottenendo file recenti:", error);
      return { success: false, message: error.message, files: [] };
    }
  }

  /**
   * Salva un preset di filtro
   * @param {number} userId - ID dell'utente
   * @param {Object} preset - Configurazione del preset
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  async saveFilterPreset(userId, preset) {
    try {
      const { name, description, filterConfig } = preset;
      const configStr = JSON.stringify(filterConfig);
      const existingPreset = await this.get(
        "SELECT preset_id FROM filter_presets WHERE user_id = ? AND name = ?",
        [userId, name]
      );
      if (existingPreset) {
        await this.run(
          "UPDATE filter_presets SET description = ?, filter_config = ?, updated_at = NOW() WHERE preset_id = ?",
          [description, configStr, existingPreset.preset_id]
        );
        return { success: true, presetId: existingPreset.preset_id, message: "Preset aggiornato con successo" };
      } else {
        const result = await this.run(
          "INSERT INTO filter_presets (user_id, name, description, filter_config) VALUES (?, ?, ?, ?)",
          [userId, name, description, configStr]
        );
        return { success: true, presetId: result.insertId, message: "Preset salvato con successo" };
      }
    } catch (error) {
      console.error("Errore salvando preset filtro:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Ottiene tutti i preset di filtro di un utente
   * @param {number} userId - ID dell'utente
   * @returns {Promise<Object>} Lista di preset
   */
  async getFilterPresets(userId) {
    try {
      const presets = await this.all(
        "SELECT preset_id, name, description, filter_config, created_at, updated_at FROM filter_presets WHERE user_id = ? ORDER BY name",
        [userId]
      );
      return {
        success: true,
        presets: presets.map(p => ({ ...p, filterConfig: JSON.parse(p.filter_config) }))
      };
    } catch (error) {
      console.error("Errore ottenendo preset filtri:", error);
      return { success: false, message: error.message, presets: [] };
    }
  }

  /**
   * Elimina un preset di filtro
   * @param {number} userId - ID dell'utente
   * @param {number} presetId - ID del preset
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  async deleteFilterPreset(userId, presetId) {
    try {
      const result = await this.run(
        "DELETE FROM filter_presets WHERE preset_id = ? AND user_id = ?",
        [presetId, userId]
      );
      if (result.affectedRows > 0) {
        return { success: true, message: "Preset eliminato con successo" };
      } else {
        return { success: false, message: "Preset non trovato" };
      }
    } catch (error) {
      console.error("Errore eliminando preset filtro:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Salva la configurazione email di un utente
   * @param {number} userId - ID dell'utente
   * @param {Object} config - Configurazione email
   * @returns {Promise<Object>} Risultato dell'operazione
   */
  async saveEmailConfig(userId, config) {
    try {
      const { service, smtp_host, smtp_port, smtp_secure, username, password, from_address } = config;
      const passwordEncrypted = password ? Buffer.from(password).toString('base64') : null;
      const existingConfig = await this.get(
        "SELECT config_id FROM email_configs WHERE user_id = ?",
        [userId]
      );
      if (existingConfig) {
        await this.run(
          `UPDATE email_configs 
           SET service = ?, smtp_host = ?, smtp_port = ?, smtp_secure = ?, 
               username = ?, password_encrypted = ?, from_address = ?, 
               updated_at = NOW() 
           WHERE config_id = ?`,
          [service, smtp_host, smtp_port, smtp_secure ? 1 : 0, username, passwordEncrypted, from_address, existingConfig.config_id]
        );
      } else {
        await this.run(
          `INSERT INTO email_configs 
           (user_id, service, smtp_host, smtp_port, smtp_secure, username, password_encrypted, from_address) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, service, smtp_host, smtp_port, smtp_secure ? 1 : 0, username, passwordEncrypted, from_address]
        );
      }
      return { success: true, message: "Configurazione email salvata con successo" };
    } catch (error) {
      console.error("Errore salvando configurazione email:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Ottiene la configurazione email di un utente
   * @param {number} userId - ID dell'utente
   * @returns {Promise<Object>} Configurazione email
   */
  async getEmailConfig(userId) {
    try {
      const config = await this.get(
        `SELECT service, smtp_host, smtp_port, smtp_secure, username, password_encrypted, from_address 
         FROM email_configs 
         WHERE user_id = ?`,
        [userId]
      );
      if (!config) {
        return { success: true, config: null };
      }
      let password = null;
      if (config.password_encrypted) {
        password = Buffer.from(config.password_encrypted, 'base64').toString();
      }
      return {
        success: true,
        config: {
          ...config,
          smtp_secure: Boolean(config.smtp_secure),
          password
        }
      };
    } catch (error) {
      console.error("Errore ottenendo configurazione email:", error);
      return { success: false, message: error.message, config: null };
    }
  }
}

module.exports = new Database();
