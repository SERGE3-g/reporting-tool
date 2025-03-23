// auth.js - Gestione dell'autenticazione senza JWT

// Funzione per mostrare messaggi di errore o successo
function showMessage(message, type = 'error') {
    const messageElement = document.getElementById('authMessage');
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = 'auth-message';
    messageElement.classList.add(type === 'error' ? 'auth-error' : 'auth-success');
    messageElement.style.display = 'block';

    // Nascondi il messaggio dopo 5 secondi
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 5000);
}

// Inizializzazione della pagina di login
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // Toggle per mostrare/nascondere la password
    const showPasswordCheckbox = document.getElementById('showPassword');
    if (showPasswordCheckbox) {
        showPasswordCheckbox.addEventListener('change', function() {
            const passwordInput = document.getElementById('loginPassword');
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    }

    // Gestione del submit del form di login
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;

        // Simulazione di database utenti (in produzione usare una vera API)
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email);

        if (!user || user.password !== password) {
            showMessage('Email o password non validi. Riprova.', 'error');
            return;
        }

        // Login riuscito
        // In un'app reale, qui si farebbe una chiamata API per autenticarsi

        // Salva info di autenticazione (simulate)
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userEmail', user.email);

        if (rememberMe) {
            // In un'app reale, qui si impostarebbe un cookie più duraturo o un token
            localStorage.setItem('rememberUser', 'true');
        }

        showMessage('Login effettuato con successo! Reindirizzamento...', 'success');

        // Reindirizza alla home page dopo 1 secondo
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    });
}

// Inizializzazione della pagina di registrazione
function initRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    // Logica per la verifica della sicurezza della password
    const passwordInput = document.getElementById('registerPassword');
    const passwordConfirmInput = document.getElementById('registerPasswordConfirm');
    const passwordStrengthBar = document.getElementById('passwordStrength');
    const passwordStrengthText = document.getElementById('passwordStrengthText');

    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            let strength = 0;
            let feedback = '';

            // Calcola la sicurezza della password
            if (password.length >= 8) strength += 25;
            if (password.match(/[a-z]+/)) strength += 25;
            if (password.match(/[A-Z]+/)) strength += 25;
            if (password.match(/[0-9]+/) || password.match(/[^a-zA-Z0-9]+/)) strength += 25;

            // Aggiorna la UI in base alla sicurezza
            passwordStrengthBar.style.width = strength + '%';

            if (strength < 25) {
                passwordStrengthBar.className = 'strength-bar very-weak';
                feedback = 'Molto debole';
            } else if (strength < 50) {
                passwordStrengthBar.className = 'strength-bar weak';
                feedback = 'Debole';
            } else if (strength < 75) {
                passwordStrengthBar.className = 'strength-bar medium';
                feedback = 'Media';
            } else {
                passwordStrengthBar.className = 'strength-bar strong';
                feedback = 'Forte';
            }

            passwordStrengthText.textContent = feedback;
        });
    }

    // Gestione del submit del form di registrazione
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;
        const acceptTerms = document.getElementById('acceptTerms').checked;

        // Validazioni base
        if (password !== passwordConfirm) {
            showMessage('Le password non coincidono', 'error');
            return;
        }

        if (password.length < 8) {
            showMessage('La password deve essere di almeno 8 caratteri', 'error');
            return;
        }

        if (!acceptTerms) {
            showMessage('Devi accettare i termini e le condizioni', 'error');
            return;
        }

        // Controlla se l'email è già in uso
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(u => u.email === email)) {
            showMessage('Email già registrata. Prova con un\'altra email o effettua il login.', 'error');
            return;
        }

        // Simulazione registrazione (in produzione usare una vera API)
        const newUser = {
            id: Date.now().toString(),
            name,
            email,
            password, // NOTA: in produzione, mai salvare password in chiaro!
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));

        // Registrazione riuscita
        showMessage('Registrazione completata con successo! Reindirizzamento alla pagina di login...', 'success');

        // Reindirizza alla pagina di login dopo 2 secondi
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    });
}

// Inizializzazione in base alla pagina corrente
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'login.html') {
        initLoginPage();
    } else if (currentPage === 'register.html') {
        initRegisterPage();
    }

    // Se l'utente è già loggato e cerca di accedere alla pagina di login/registrazione
    if ((currentPage === 'login.html' || currentPage === 'register.html') &&
        localStorage.getItem('isLoggedIn') === 'true') {
        // Reindirizza alla home
        window.location.href = 'index.html';
    }
});

// Funzione per il logout (utilizzata dalla navbar)
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');

    // Mantieni l'opzione "ricordami" se impostata
    if (localStorage.getItem('rememberUser') !== 'true') {
        localStorage.removeItem('rememberUser');
    }

    // Reindirizza alla home
    window.location.href = 'index.html';
}

// Esporta funzioni per altri script
window.auth = {
    logout,
    showMessage,
    isLoggedIn: () => localStorage.getItem('isLoggedIn') === 'true',
    getUserName: () => localStorage.getItem('userName') || 'Utente',
    getUserEmail: () => localStorage.getItem('userEmail') || ''
};