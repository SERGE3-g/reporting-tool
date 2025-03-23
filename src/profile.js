// profile.js - Gestione del profilo utente

// Controlla se l'utente è loggato
function checkAuth() {
    if (window.auth && typeof window.auth.isLoggedIn === 'function') {
        if (!window.auth.isLoggedIn()) {
            // Reindirizza alla pagina di login
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // Fallback se il modulo auth non è disponibile
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Mostra un messaggio di notifica
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

// Carica i dati dell'utente
function loadUserData() {
    // In un'app reale, qui faresti una chiamata API per ottenere i dati completi dell'utente
    // Per questo esempio, utilizziamo i dati simulati dal localStorage

    const userName = localStorage.getItem('userName') || 'Utente';
    const userEmail = localStorage.getItem('userEmail') || 'utente@esempio.com';

    // Simuliamo alcuni dati aggiuntivi
    const userData = {
        name: userName,
        email: userEmail,
        role: 'Utente Standard',
        bio: localStorage.getItem('userBio') || '',
        avatar: localStorage.getItem('userAvatar') || 'assets/default-avatar.png',
        stats: {
            reportCount: 24,
            fileCount: 56,
            loginCount: 18,
            daysActive: 32
        },
        dates: {
            lastLogin: '22 Marzo 2025, 15:30',
            accountCreated: '15 Gennaio 2025',
            lastPasswordChange: '15 Febbraio 2025'
        },
        activeSessions: 1
    };

    // Aggiorna i campi sulla pagina
    document.getElementById('profileName').textContent = userData.name;
    document.getElementById('profileEmail').textContent = userData.email;
    document.getElementById('profileRole').textContent = userData.role;

    // Aggiorna statistiche
    document.getElementById('reportCount').textContent = userData.stats.reportCount;
    document.getElementById('fileCount').textContent = userData.stats.fileCount;
    document.getElementById('loginCount').textContent = userData.stats.loginCount;
    document.getElementById('daysActive').textContent = userData.stats.daysActive;

    // Aggiorna date
    document.getElementById('lastLogin').textContent = userData.dates.lastLogin;
    document.getElementById('accountCreated').textContent = userData.dates.accountCreated;
    document.getElementById('lastPasswordChange').textContent = userData.dates.lastPasswordChange;
    document.getElementById('activeSessions').textContent = userData.activeSessions;

    // Compila i campi del form di modifica
    document.getElementById('editName').value = userData.name;
    document.getElementById('editEmail').value = userData.email;
    document.getElementById('editBio').value = userData.bio;

    // Aggiorna avatar se disponibile
    if (userData.avatar) {
        document.querySelector('.profile-avatar').innerHTML = `<img src="${userData.avatar}" alt="Avatar">`;
        document.getElementById('avatarPreview').style.backgroundImage = `url('${userData.avatar}')`;
    }

    return userData;
}

// Carica le attività recenti
function loadRecentActivities() {
    // In un'app reale, queste informazioni verrebbero da un database
    // Per questo esempio, utilizziamo dati simulati
    const activities = [
        {
            type: 'login',
            date: '22 Marzo 2025, 15:30',
            description: 'Accesso al sistema',
            icon: 'fa-sign-in-alt'
        },
        {
            type: 'report',
            date: '22 Marzo 2025, 14:15',
            description: 'Generato report "Commissioni Marzo 2025"',
            icon: 'fa-file-alt'
        },
        {
            type: 'export',
            date: '22 Marzo 2025, 14:10',
            description: 'Esportato report in formato Excel',
            icon: 'fa-file-export'
        },
        {
            type: 'upload',
            date: '22 Marzo 2025, 13:45',
            description: 'Caricato file "commissioni_marzo.json"',
            icon: 'fa-upload'
        },
        {
            type: 'settings',
            date: '21 Marzo 2025, 10:20',
            description: 'Aggiornate impostazioni email',
            icon: 'fa-cog'
        },
        {
            type: 'login',
            date: '21 Marzo 2025, 09:30',
            description: 'Accesso al sistema',
            icon: 'fa-sign-in-alt'
        }
    ];

    // Genera HTML per le attività
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';

    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = `activity-item activity-${activity.type}`;
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-description">${activity.description}</div>
                <div class="activity-date">${activity.date}</div>
            </div>
        `;

        activityList.appendChild(activityItem);
    });
}

// Inizializza i form di modifica del profilo
function initProfileForms() {
    // Form modifica profilo
    const editProfileBtn = document.getElementById('editProfileBtn');
    const profileEditForm = document.getElementById('profileEditForm');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editForm = document.getElementById('editForm');

    // Mostra/nascondi form modifica profilo
    editProfileBtn.addEventListener('click', function() {
        profileEditForm.style.display = 'block';
        editProfileBtn.style.display = 'none';
    });

    cancelEditBtn.addEventListener('click', function() {
        profileEditForm.style.display = 'none';
        editProfileBtn.style.display = 'block';
    });

    // Gestisci il submit del form di modifica profilo
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('editName').value;
        const email = document.getElementById('editEmail').value;
        const bio = document.getElementById('editBio').value;

        // Validazione base
        if (!name || !email) {
            showNotification('Nome e email sono obbligatori', 'error');
            return;
        }

        // Simulazione salvataggio dati (in un'app reale, qui faresti una chiamata API)
        localStorage.setItem('userName', name);
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userBio', bio);

        // Aggiorna l'interfaccia
        document.getElementById('profileName').textContent = name;
        document.getElementById('profileEmail').textContent = email;

        // Nasconde il form e mostra il pulsante modifica
        profileEditForm.style.display = 'none';
        editProfileBtn.style.display = 'block';

        showNotification('Profilo aggiornato con successo', 'success');
    });

    // Gestisci upload avatar
    const avatarUpload = document.getElementById('avatarUpload');
    avatarUpload.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = function(e) {
                const avatarPreview = document.getElementById('avatarPreview');
                avatarPreview.style.backgroundImage = `url('${e.target.result}')`;

                // Salva l'avatar nel localStorage (in un'app reale userei un server)
                localStorage.setItem('userAvatar', e.target.result);

                // Aggiorna anche l'avatar nella pagina
                document.querySelector('.profile-avatar').innerHTML = `<img src="${e.target.result}" alt="Avatar">`;
            };

            reader.readAsDataURL(file);
        }
    });

    // Form cambio password
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const passwordChangeForm = document.getElementById('passwordChangeForm');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const passwordForm = document.getElementById('passwordForm');

    // Mostra/nascondi form cambio password
    changePasswordBtn.addEventListener('click', function() {
        passwordChangeForm.style.display = 'block';
        changePasswordBtn.parentElement.style.display = 'none';
    });

    cancelPasswordBtn.addEventListener('click', function() {
        passwordChangeForm.style.display = 'none';
        changePasswordBtn.parentElement.style.display = 'flex';
    });

    // Valutazione sicurezza password
    const newPasswordInput = document.getElementById('newPassword');
    const passwordStrengthBar = document.getElementById('passwordStrength');
    const passwordStrengthText = document.getElementById('passwordStrengthText');

    newPasswordInput.addEventListener('input', function() {
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

    // Gestisci il submit del form cambio password
    passwordForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Simuliamo la password attuale salvata (in un'app reale questa verifica sarebbe sul server)
        const savedPassword = localStorage.getItem('userPassword') || 'password123';

        // Validazione
        if (currentPassword !== savedPassword) {
            showNotification('La password attuale non è corretta', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showNotification('Le nuove password non coincidono', 'error');
            return;
        }

        if (newPassword.length < 8) {
            showNotification('La nuova password deve essere di almeno 8 caratteri', 'error');
            return;
        }

        // Simulazione salvataggio password (in un'app reale, questa operazione sarebbe sul server)
        localStorage.setItem('userPassword', newPassword);

        // Aggiorna la data dell'ultimo cambio password
        const now = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const dateString = now.toLocaleDateString('it-IT', options);
        document.getElementById('lastPasswordChange').textContent = dateString;

        // Nasconde il form e mostra il pulsante cambio password
        passwordChangeForm.style.display = 'none';
        changePasswordBtn.parentElement.style.display = 'flex';

        // Pulisci i campi del form
        passwordForm.reset();

        showNotification('Password aggiornata con successo', 'success');
    });

    // Gestione disconnessione sessioni
    document.getElementById('logoutAllBtn').addEventListener('click', function() {
        if (confirm('Sei sicuro di voler disconnettere tutte le sessioni attive?')) {
            // In un'app reale, qui si invierebbe una richiesta al server
            // Per questo esempio, facciamo semplicemente il logout locale

            document.getElementById('activeSessions').textContent = '0';

            showNotification('Tutte le sessioni sono state disconnesse', 'success');

            // Reindirizza al login dopo 2 secondi
            setTimeout(() => {
                if (window.auth && typeof window.auth.logout === 'function') {
                    window.auth.logout();
                } else {
                    localStorage.removeItem('isLoggedIn');
                    localStorage.removeItem('userToken');
                    window.location.href = 'login.html';
                }
            }, 2000);
        }
    });

    // Gestione eliminazione account
    document.getElementById('deleteAccountBtn').addEventListener('click', function() {
        if (confirm('ATTENZIONE: Sei sicuro di voler eliminare definitivamente il tuo account? Questa operazione non può essere annullata.')) {
            if (confirm('Questa azione cancellerà tutti i tuoi dati e report. Confermi di voler procedere?')) {
                // In un'app reale, qui si invierebbe una richiesta al server
                // Per questo esempio, facciamo semplicemente il logout e pulizia dati locali

                showNotification('Account eliminato con successo', 'success');

                // Pulisci tutti i dati dell'utente
                localStorage.clear();

                // Reindirizza alla home page dopo 2 secondi
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        }
    });
}

// Inizializzazione pagina profilo
document.addEventListener('DOMContentLoaded', function() {
    // Verifica autenticazione
    if (!checkAuth()) {
        return; // Il redirect sarà già stato gestito dalla funzione checkAuth
    }

    // Carica i dati dell'utente
    loadUserData();

    // Carica le attività recenti
    loadRecentActivities();

    // Inizializza i form
    initProfileForms();
});