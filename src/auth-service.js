// auth-service.js - Servizio per la gestione dell'autenticazione via MySQL
const crypto = require('crypto');
const database = require('./database'); // Assicurati che il percorso sia corretto

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  // Genera hash della password usando PBKDF2 con sha512
  hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  // Verifica se la password fornita corrisponde all'hash salvato
  verifyPassword(password, storedHash, salt) {
    const hashVerify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return storedHash === hashVerify;
  }

  // Login: cerca l'utente in base a username o email, verifica la password e aggiorna l'ultimo accesso
  async login(credentials) {
    const { username, password } = credentials;
    if (!username || !password) {
      return { success: false, message: 'Username e password sono richiesti' };
    }
    try {
      // Cerca l'utente nel database MySQL
      const user = await database.get(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        [username, username]
      );
      if (!user) {
        return { success: false, message: 'Utente non trovato' };
      }
      if (!this.verifyPassword(password, user.password_hash, user.salt)) {
        return { success: false, message: 'Password non valida' };
      }
      // Aggiorna l'ultimo accesso usando NOW() di MySQL
      await database.run(
        "UPDATE users SET last_login = NOW() WHERE user_id = ?",
        [user.user_id]
      );
      this.currentUser = user;
      return { success: true, user: this.getCurrentUser() };
    } catch (error) {
      console.error("Errore durante il login:", error);
      return { success: false, message: "Errore durante il login" };
    }
  }

  // Registrazione: crea un nuovo utente nel database
  async register(userData) {
    const { username, email, password, full_name } = userData;
    if (!username || !email || !password || !full_name) {
      return { success: false, message: 'Tutti i campi sono obbligatori' };
    }
    try {
      // Verifica se esiste già un utente con lo stesso username o email
      const existingUser = await database.get(
        "SELECT * FROM users WHERE username = ? OR email = ?",
        [username, email]
      );
      if (existingUser) {
        return { success: false, message: 'Username o email già in uso' };
      }
      // Crea hash e salt per la password
      const { hash, salt } = this.hashPassword(password);
      // Inserisci il nuovo utente; il campo created_at verrà gestito automaticamente da MySQL
      const result = await database.run(
        "INSERT INTO users (username, email, full_name, password_hash, salt, role) VALUES (?, ?, ?, ?, ?, ?)",
        [username, email, full_name, hash, salt, 'user']
      );
      // Recupera il nuovo utente usando l'ID generato
      const newUser = await database.get(
        "SELECT * FROM users WHERE user_id = ?",
        [result.insertId]
      );
      this.currentUser = newUser;
      return { success: true, user: this.getCurrentUser() };
    } catch (error) {
      console.error("Errore durante la registrazione:", error);
      return { success: false, message: "Errore durante la registrazione" };
    }
  }

  // Aggiorna i dati del profilo utente (nome ed email)
  async updateUserData(userData) {
    if (!this.currentUser) {
      return { success: false, message: 'Utente non autenticato' };
    }
    const { full_name, email } = userData;
    try {
      // Se viene fornita una nuova email, controlla che non sia già in uso da un altro utente
      if (email) {
        const emailCheck = await database.get(
          "SELECT * FROM users WHERE email = ? AND user_id != ?",
          [email, this.currentUser.user_id]
        );
        if (emailCheck) {
          return { success: false, message: 'Email già in uso' };
        }
      }
      // Aggiorna il record dell'utente
      await database.run(
        "UPDATE users SET full_name = ?, email = ? WHERE user_id = ?",
        [full_name || this.currentUser.full_name, email || this.currentUser.email, this.currentUser.user_id]
      );
      // Ricarica i dati aggiornati
      const updatedUser = await database.get(
        "SELECT * FROM users WHERE user_id = ?",
        [this.currentUser.user_id]
      );
      this.currentUser = updatedUser;
      return { success: true, user: this.getCurrentUser() };
    } catch (error) {
      console.error("Errore nell'aggiornamento del profilo:", error);
      return { success: false, message: "Errore nell'aggiornamento del profilo" };
    }
  }

  // Cambia la password dell'utente
  async changePassword(passwordData) {
    const { currentPassword, newPassword } = passwordData;
    if (!this.currentUser) {
      return { success: false, message: "Utente non autenticato" };
    }
    try {
      if (!this.verifyPassword(currentPassword, this.currentUser.password_hash, this.currentUser.salt)) {
        return { success: false, message: "Password corrente non valida" };
      }
      const { hash, salt } = this.hashPassword(newPassword);
      await database.run(
        "UPDATE users SET password_hash = ?, salt = ? WHERE user_id = ?",
        [hash, salt, this.currentUser.user_id]
      );
      // Aggiorna i dati dell'utente in memoria
      this.currentUser.password_hash = hash;
      this.currentUser.salt = salt;
      return { success: true, message: "Password modificata con successo" };
    } catch (error) {
      console.error("Errore nel cambio password:", error);
      return { success: false, message: "Errore nel cambio password" };
    }
  }

  // Logout: resetta l'utente corrente
  logout() {
    this.currentUser = null;
    return { success: true };
  }

  // Restituisce i dati dell'utente corrente, rimuovendo quelli sensibili
  getCurrentUser() {
    if (!this.currentUser) return null;
    const { password_hash, salt, ...safeUser } = this.currentUser;
    return safeUser;
  }
}

module.exports = new AuthService();
