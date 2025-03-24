/**
 * common.js - Funzionalità JavaScript condivise
 * Tool di Reporting Commissioni Mensile
 */

// Caricamento dinamico di componenti (navbar, footer, sidebar)
function loadComponent(url, targetId) {
    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
        console.error(`Elemento target con ID "${targetId}" non trovato.`);
        return;
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Errore nel caricamento del componente: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            targetElement.innerHTML = html;
            // Esegue eventuali script nel componente caricato
            const scripts = targetElement.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                eval(scripts[i].innerHTML);
            }

            // Trigger evento di caricamento completato
            const event = new CustomEvent('componentLoaded', { detail: { url, targetId } });
            document.dispatchEvent(event);
        })
        .catch(error => {
            console.error('Errore nel caricamento del componente:', error);
            targetElement.innerHTML = `<div class="alert alert-danger">Errore nel caricamento del componente: ${error.message}</div>`;
        });
}

// Sistema di notifiche toast
class Toast {
    constructor(options = {}) {
        this.options = {
            position: options.position || 'top-right',
            duration: options.duration || 3000,
            containerClass: options.containerClass || 'toast-container',
            toastClass: options.toastClass || 'toast',
            successClass: options.successClass || 'toast-success',
            errorClass: options.errorClass || 'toast-error',
            warningClass: options.warningClass || 'toast-warning',
            infoClass: options.infoClass || 'toast-info'
        };

        this.initialize();
    }

    initialize() {
        // Crea il container per i toast se non esiste
        this.container = document.querySelector(`.${this.options.containerClass}`);

        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = this.options.containerClass;
            this.container.style.position = 'fixed';
            this.container.style.zIndex = '9999';

            // Posizionamento in base all'opzione
            switch(this.options.position) {
                case 'top-left':
                    this.container.style.top = '20px';
                    this.container.style.left = '20px';
                    break;
                case 'top-center':
                    this.container.style.top = '20px';
                    this.container.style.left = '50%';
                    this.container.style.transform = 'translateX(-50%)';
                    break;
                case 'top-right':
                    this.container.style.top = '20px';
                    this.container.style.right = '20px';
                    break;
                case 'bottom-left':
                    this.container.style.bottom = '20px';
                    this.container.style.left = '20px';
                    break;
                case 'bottom-center':
                    this.container.style.bottom = '20px';
                    this.container.style.left = '50%';
                    this.container.style.transform = 'translateX(-50%)';
                    break;
                case 'bottom-right':
                    this.container.style.bottom = '20px';
                    this.container.style.right = '20px';
                    break;
            }

            document.body.appendChild(this.container);
        }
    }

    /**
     * Mostra un toast
     * @param {string} message - Messaggio da mostrare
     * @param {string} type - Tipo di toast (success, error, warning, info)
     * @param {Object} options - Opzioni aggiuntive (durata, ecc.)
     */
    show(message, type = 'info', options = {}) {
        const toast = document.createElement('div');
        toast.className = `${this.options.toastClass} ${this.options[type + 'Class'] || this.options.infoClass}`;
        toast.innerHTML = `
            <div class="toast-content">
                ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : ''}
                ${type === 'error' ? '<i class="fas fa-times-circle"></i>' : ''}
                ${type === 'warning' ? '<i class="fas fa-exclamation-triangle"></i>' : ''}
                ${type === 'info' ? '<i class="fas fa-info-circle"></i>' : ''}
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        // Applica stile al toast
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        toast.style.marginBottom = '10px';
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.justifyContent = 'space-between';
        toast.style.minWidth = '250px';
        toast.style.maxWidth = '350px';

        // Aggiungi il toast al container
        this.container.appendChild(toast);

        // Trigger reflow per abilitare la transizione
        toast.offsetHeight;

        // Mostra il toast con animazione
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        // Gestione del pulsante di chiusura
        const closeButton = toast.querySelector('.toast-close');
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.color = 'inherit';
        closeButton.style.fontSize = '1.2rem';
        closeButton.style.cursor = 'pointer';
        closeButton.style.opacity = '0.7';

        closeButton.addEventListener('click', () => {
            this.hide(toast);
        });

        // Auto-chiusura dopo la durata specificata
        const duration = options.duration || this.options.duration;
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Nasconde un toast con animazione
     * @param {HTMLElement} toast - Elemento toast da nascondere
     */
    hide(toast) {
        // Anima l'uscita del toast
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';

        // Rimuovi il toast dopo l'animazione
        setTimeout(() => {
            if (toast.parentNode === this.container) {
                this.container.removeChild(toast);
            }

            // Se non ci sono più toast, rimuovi il container
            if (this.container.children.length === 0) {
                // Opzionale: rimuovere il container quando è vuoto
                // document.body.removeChild(this.container);
            }
        }, 300);
    }

    /**
     * Metodi di convenienza per diversi tipi di toast
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
}

// Inizializza il sistema toast globale
const toast = new Toast();

// Funzione per mostrare toast (interfaccia semplificata)
function showToast(message, type = 'info', duration = 3000) {
    return toast.show(message, type, { duration });
}

// Gestore modale generico
class Modal {
    /**
     * Inizializza una modale
     * @param {string} modalId - ID dell'elemento modale
     */
    constructor(modalId) {
        this.modal = document.getElementById(modalId);

        if (!this.modal) {
            console.error(`Modale con ID "${modalId}" non trovata.`);
            return;
        }

        // Trova elementi all'interno della modale
        this.closeBtn = this.modal.querySelector('.modal-close');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.hide());
        }

        // Chiusura quando si clicca fuori dalla modale (opzionale)
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });

        // Imposta stile base se non presente
        if (window.getComputedStyle(this.modal).display !== 'none' &&
            window.getComputedStyle(this.modal).display !== 'flex') {
            this.modal.style.display = 'none';
        }
    }

    /**
     * Mostra la modale
     * @param {Object} options - Opzioni (dati, callback, ecc.)
     */
    show(options = {}) {
        if (!this.modal) return;

        // Aggiorna il contenuto della modale se necessario
        if (options.title) {
            const titleElement = this.modal.querySelector('.modal-title');
            if (titleElement) {
                titleElement.textContent = options.title;
            }
        }

        if (options.content) {
            const bodyElement = this.modal.querySelector('.modal-body');
            if (bodyElement) {
                bodyElement.innerHTML = options.content;
            }
        }

        // Mostra la modale con animazione
        this.modal.style.display = 'flex';

        // Impedisci lo scroll del body
        document.body.style.overflow = 'hidden';

        // Esegui callback onShow se fornita
        if (typeof options.onShow === 'function') {
            options.onShow(this.modal);
        }

        // Trigger evento custom
        const event = new CustomEvent('modalShown', { detail: { modal: this.modal, options } });
        document.dispatchEvent(event);

        return this;
    }

    /**
     * Nasconde la modale
     * @param {Function} callback - Callback da eseguire dopo la chiusura
     */
    hide(callback) {
        if (!this.modal) return;

        // Nascondi con animazione
        this.modal.style.opacity = '0';

        setTimeout(() => {
            this.modal.style.display = 'none';
            this.modal.style.opacity = '1';

            // Ripristina scroll del body
            document.body.style.overflow = '';

            // Esegui callback se fornita
            if (typeof callback === 'function') {
                callback();
            }

            // Trigger evento custom
            const event = new CustomEvent('modalHidden', { detail: { modal: this.modal } });
            document.dispatchEvent(event);
        }, 300);

        return this;
    }

    /**
     * Aggiorna il contenuto della modale
     * @param {Object} options - Opzioni (titolo, contenuto, ecc.)
     */
    update(options = {}) {
        if (!this.modal) return;

        if (options.title) {
            const titleElement = this.modal.querySelector('.modal-title');
            if (titleElement) {
                titleElement.textContent = options.title;
            }
        }

        if (options.content) {
            const bodyElement = this.modal.querySelector('.modal-body');
            if (bodyElement) {
                bodyElement.innerHTML = options.content;
            }
        }

        return this;
    }
}

// Gestore di conferma generico
function confirmAction(message, yesCallback, noCallback, options = {}) {
    // Crea elementi della modale di conferma
    const modalId = 'confirm-modal-' + Math.random().toString(36).substr(2, 9);

    const modalHTML = `
        <div id="${modalId}" class="modal">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title">${options.title || 'Conferma'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-light" id="${modalId}-no">${options.noText || 'Annulla'}</button>
                    <button class="btn ${options.yesClass || 'btn-primary'}" id="${modalId}-yes">${options.yesText || 'Conferma'}</button>
                </div>
            </div>
        </div>
    `;

    // Aggiungi la modale al DOM
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = modalHTML;
    document.body.appendChild(tempDiv.firstElementChild);

    // Inizializza la modale
    const modal = new Modal(modalId);

    // Aggiungi event listener ai pulsanti
    document.getElementById(`${modalId}-yes`).addEventListener('click', () => {
        modal.hide(() => {
            if (typeof yesCallback === 'function') {
                yesCallback();
            }
            // Rimuovi la modale dal DOM dopo la chiusura
            const modalElement = document.getElementById(modalId);
            if (modalElement) {
                document.body.removeChild(modalElement);
            }
        });
    });

    document.getElementById(`${modalId}-no`).addEventListener('click', () => {
        modal.hide(() => {
            if (typeof noCallback === 'function') {
                noCallback();
            }
            // Rimuovi la modale dal DOM dopo la chiusura
            const modalElement = document.getElementById(modalId);
            if (modalElement) {
                document.body.removeChild(modalElement);
            }
        });
    });

    // Mostra la modale
    modal.show();

    return modal;
}

// Funzione per formattare date
function formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return '';

    if (!(date instanceof Date)) {
        date = new Date(date);
    }

    if (isNaN(date.getTime())) {
        return 'Data non valida';
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

// Funzione per formattare numeri
function formatNumber(number, options = {}) {
    if (number === null || number === undefined || isNaN(number)) {
        return options.placeholder || '-';
    }

    const decimals = options.decimals !== undefined ? options.decimals : 2;
    const decimalSeparator = options.decimalSeparator || ',';
    const thousandSeparator = options.thousandSeparator || '.';

    // Arrotonda il numero
    const rounded = decimals ? parseFloat(number).toFixed(decimals) : Math.round(number).toString();

    // Divide la parte intera dalla parte decimale
    const parts = rounded.split('.');

    // Formatta la parte intera con separatori delle migliaia
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);

    // Unisce le parti con il separatore decimale
    return parts.join(decimalSeparator);
}

// Funzione per generare una stringa casuale
function generateRandomString(length = 10) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
}

// Funzione per validare un indirizzo email
function isValidEmail(email) {
    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regex.test(String(email).toLowerCase());
}

// Funzione per copiare testo negli appunti
function copyToClipboard(text) {
    return new Promise((resolve, reject) => {
        // Metodo moderno con Clipboard API
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    resolve(true);
                })
                .catch(err => {
                    console.error('Errore nella copia del testo:', err);
                    reject(err);
                });
        } else {
            // Fallback per browser che non supportano Clipboard API
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    resolve(true);
                } else {
                    reject(new Error('Impossibile copiare il testo'));
                }
            } catch (err) {
                console.error('Errore nella copia del testo:', err);
                reject(err);
            }
        }
    });
}

// Funzione per recuperare parametri URL
function getUrlParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split('&');

    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        if (pair[0]) {
            params[decodeURIComponent(pair[0])] = pair[1] ? decodeURIComponent(pair[1]) : '';
        }
    }

    return params;
}

// Funzione per salvare dati in localStorage
function saveToLocalStorage(key, data) {
    try {
        const serializedData = JSON.stringify(data);
        localStorage.setItem(key, serializedData);
        return true;
    } catch (error) {
        console.error('Errore nel salvataggio dei dati in localStorage:', error);
        return false;
    }
}

// Funzione per recuperare dati da localStorage
function getFromLocalStorage(key, defaultValue = null) {
    try {
        const serializedData = localStorage.getItem(key);
        if (serializedData === null) {
            return defaultValue;
        }
        return JSON.parse(serializedData);
    } catch (error) {
        console.error('Errore nel recupero dei dati da localStorage:', error);
        return defaultValue;
    }
}

// Funzione per rimuovere dati da localStorage
function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Errore nella rimozione dei dati da localStorage:', error);
        return false;
    }
}

// Funzione per controllare se un elemento è nel viewport
function isElementInViewport(el) {
    if (typeof el === 'string') {
        el = document.querySelector(el);
    }

    if (!el) return false;

    const rect = el.getBoundingClientRect();

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Funzione per throttle delle chiamate a funzioni
function throttle(func, limit) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
            lastCall = now;
            return func.apply(this, args);
        }
    };
}

// Funzione per debounce delle chiamate a funzioni
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Funzione per simulare chiamate API (utile per testing)
function mockApiCall(data, delay = 1000, shouldFail = false, errorMessage = 'Errore simulato') {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldFail) {
                reject(new Error(errorMessage));
            } else {
                resolve(data);
            }
        }, delay);
    });
}

// Esporta funzioni e classi per uso globale
window.loadComponent = loadComponent;
window.Toast = Toast;
window.showToast = showToast;
window.Modal = Modal;
window.confirmAction = confirmAction;
window.formatDate = formatDate;
window.formatNumber = formatNumber;
window.generateRandomString = generateRandomString;
window.isValidEmail = isValidEmail;
window.copyToClipboard = copyToClipboard;
window.getUrlParams = getUrlParams;
window.saveToLocalStorage = saveToLocalStorage;
window.getFromLocalStorage = getFromLocalStorage;
window.removeFromLocalStorage = removeFromLocalStorage;
window.isElementInViewport = isElementInViewport;
window.throttle = throttle;
window.debounce = debounce;
window.mockApiCall = mockApiCall;

// Inizializzazione globale all'avvio della pagina
document.addEventListener('DOMContentLoaded', function() {
    console.log('common.js caricato e inizializzato.');

    // Imposta il tema in base alle preferenze utente (se salvato)
    const savedTheme = getFromLocalStorage('app_theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Aggiungi CSS per il sistema toast se non presente
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-container {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }
            
            .toast {
                background: white;
                color: #333;
                font-family: var(--font-family, 'Roboto', sans-serif);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 10px;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 250px;
                max-width: 350px;
            }
            
            .toast-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .toast i {
                font-size: 1.2rem;
            }
            
            .toast-success {
                background-color: #d1fae5;
                color: #065f46;
                border-left: 4px solid #10b981;
            }
            
            .toast-error {
                background-color: #fee2e2;
                color: #b91c1c;
                border-left: 4px solid #ef4444;
            }
            
            .toast-warning {
                background-color: #fff3cd;
                color: #856404;
                border-left: 4px solid #f59e0b;
            }
            
            .toast-info {
                background-color: #e0f2fe;
                color: #0e7490;
                border-left: 4px solid #0ea5e9;
            }
            
            .toast-close {
                background: none;
                border: none;
                color: inherit;
                font-size: 1.2rem;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.3s ease;
            }
            
            .toast-close:hover {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
});