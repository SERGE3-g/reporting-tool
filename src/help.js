// help.js - Logica per la guida interattiva

document.addEventListener('DOMContentLoaded', () => {
    // Inizializzazione
    setupNavigation();
    setupFAQToggle();
    setupSearch();
});

/**
 * Configura la navigazione nella sidebar
 */
function setupNavigation() {
    // Gestione menu con sottomenu
    const menuItems = document.querySelectorAll('.has-submenu');

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();

            // Trova il prossimo elemento che è un sub-nav
            const subNav = this.nextElementSibling;
            if (subNav && subNav.classList.contains('sub-nav')) {
                // Toggle class active
                subNav.classList.toggle('active');
                this.classList.toggle('active');
            }
        });
    });

    // Gestione click sui link della navigazione
    const navLinks = document.querySelectorAll('.help-nav a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Se è un submenu, non fare nulla (già gestito sopra)
            if (this.classList.contains('has-submenu')) {
                return;
            }

            e.preventDefault();

            // Rimuovi active da tutti i link
            navLinks.forEach(l => l.classList.remove('active'));

            // Aggiungi active a questo link
            this.classList.add('active');

            // Se fa parte di un submenu, aggiungi active anche al parent
            const parentLi = this.closest('li').parentElement;
            if (parentLi && parentLi.classList.contains('sub-nav')) {
                parentLi.previousElementSibling.classList.add('active');
            }

            // Scrolla alla sezione corrispondente
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Gestione scrolling e highlight della navigazione
    window.addEventListener('scroll', debounce(highlightCurrentSection, 100));
}

/**
 * Configura il toggle per le FAQ
 */
function setupFAQToggle() {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            // Toggle per questa domanda
            this.classList.toggle('active');

            // Trova la risposta corrispondente
            const answer = this.nextElementSibling;
            if (answer && answer.classList.contains('faq-answer')) {
                answer.classList.toggle('active');
            }
        });
    });
}

/**
 * Configura la funzionalità di ricerca
 */
function setupSearch() {
    const searchInput = document.getElementById('helpSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', debounce(function() {
        const searchTerm = this.value.toLowerCase().trim();

        if (!searchTerm) {
            // Se il campo è vuoto, mostra tutte le sezioni
            showAllSections();
            return;
        }

        // Cerca nel contenuto
        searchInContent(searchTerm);
    }, 300));
}

/**
 * Cerca il termine nel contenuto della guida
 * @param {string} term - Termine da cercare
 */
function searchInContent(term) {
    // Ottieni tutte le sezioni della guida
    const sections = document.querySelectorAll('.help-content section');
    let foundAny = false;

    sections.forEach(section => {
        const sectionText = section.textContent.toLowerCase();
        const sectionTitle = section.querySelector('h2')?.textContent.toLowerCase() || '';

        // Controlla se il termine di ricerca è presente nel titolo o nel contenuto
        if (sectionText.includes(term) || sectionTitle.includes(term)) {
            section.style.display = 'block';
            highlightSearchTerm(section, term);
            foundAny = true;

            // Trova il link corrispondente nella navigazione e aggiungilo come attivo
            const sectionId = section.id;
            const navLink = document.querySelector(`.help-nav a[href="#${sectionId}"]`);
            if (navLink) {
                navLink.classList.add('search-highlight');

                // Se fa parte di un submenu, espandi il submenu
                const parentLi = navLink.closest('li').parentElement;
                if (parentLi && parentLi.classList.contains('sub-nav')) {
                    parentLi.classList.add('active');
                    parentLi.previousElementSibling.classList.add('active');
                }
            }
        } else {
            section.style.display = 'none';

            // Rimuovi evidenziazione dal link della navigazione
            const sectionId = section.id;
            const navLink = document.querySelector(`.help-nav a[href="#${sectionId}"]`);
            if (navLink) {
                navLink.classList.remove('search-highlight');
            }
        }
    });

    // Se non è stato trovato nulla, mostra un messaggio
    const noResultsMessage = document.getElementById('noSearchResults');
    if (!foundAny) {
        if (!noResultsMessage) {
            const message = document.createElement('div');
            message.id = 'noSearchResults';
            message.className = 'warning-box';
            message.innerHTML = `<strong>Nessun risultato trovato per "${term}"</strong><p>Prova con termini diversi o più generici.</p>`;

            const helpContent = document.querySelector('.help-content');
            if (helpContent) {
                helpContent.prepend(message);
            }
        }
    } else if (noResultsMessage) {
        noResultsMessage.remove();
    }
}

/**
 * Evidenzia il termine di ricerca nel testo
 * @param {Element} section - Sezione in cui evidenziare il termine
 * @param {string} term - Termine da evidenziare
 */
function highlightSearchTerm(section, term) {
    // Questa è una funzione di base per evidenziare il termine
    // In una vera implementazione, dovresti usare un approccio più sofisticato
    // che non interferisca con gli eventi e la struttura HTML

    // Per ora, non modifichiamo il DOM per evitare problemi
}

/**
 * Mostra tutte le sezioni e resetta l'evidenziazione
 */
function showAllSections() {
    const sections = document.querySelectorAll('.help-content section');
    sections.forEach(section => {
        section.style.display = 'block';

        // Rimuovi eventuali evidenziazioni
        // Qui puoi implementare la rimozione delle evidenziazioni se le hai aggiunte
    });

    // Rimuovi evidenziazione dalla navigazione
    const navLinks = document.querySelectorAll('.help-nav a');
    navLinks.forEach(link => {
        link.classList.remove('search-highlight');
    });

    // Rimuovi il messaggio "Nessun risultato"
    const noResultsMessage = document.getElementById('noSearchResults');
    if (noResultsMessage) {
        noResultsMessage.remove();
    }
}

/**
 * Evidenzia la sezione corrente nella navigazione in base allo scroll
 */
function highlightCurrentSection() {
    const sections = document.querySelectorAll('.help-content section');
    const navLinks = document.querySelectorAll('.help-nav a:not(.has-submenu)');

    // Trova la sezione attualmente visibile
    let currentSection = null;

    sections.forEach(section => {
        const rect = section.getBoundingClientRect();

        // Controlla se la sezione è visibile (almeno parzialmente) nella viewport
        if (rect.top <= 150 && rect.bottom >= 150) {
            currentSection = section;
        }
    });

    if (currentSection) {
        const sectionId = currentSection.id;

        // Rimuovi active da tutti i link
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Aggiungi active al link corrispondente
        const activeLink = document.querySelector(`.help-nav a[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');

            // Se fa parte di un submenu, espandi il submenu
            const parentLi = activeLink.closest('li').parentElement;
            if (parentLi && parentLi.classList.contains('sub-nav')) {
                parentLi.classList.add('active');
                parentLi.previousElementSibling.classList.add('active');
            }
        }
    }
}

/**
 * Funzione di debounce per limitare la frequenza di esecuzione di una funzione
 * @param {Function} func - Funzione da eseguire
 * @param {number} wait - Tempo di attesa in millisecondi
 * @return {Function} Funzione con debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}