// presets.js - Logica per salvare/caricare preset

/************************************************************************
 * VARIABILI GLOBALI
 ************************************************************************/
let currentTags = [];
const presetList = document.getElementById('presetsList');
const criteriaContainer = document.getElementById('criteriaContainer');

// Form elements
const presetNameInput = document.getElementById('presetName');
const presetCategorySelect = document.getElementById('presetCategory');
const presetDescriptionInput = document.getElementById('presetDescription');
const tagInput = document.getElementById('tagInput');
const tagContainer = document.getElementById('tagContainer');
const savePresetBtn = document.getElementById('savePresetBtn');
const resetFormBtn = document.getElementById('resetFormBtn');
const addCriteriaBtn = document.getElementById('addCriteriaBtn');

// Search and filter elements
const searchPresetInput = document.getElementById('searchPreset');
const filterCategorySelect = document.getElementById('filterCategory');
const sortPresetsSelect = document.getElementById('sortPresets');

/************************************************************************
 * INIZIALIZZAZIONE E LISTENERS
 ************************************************************************/
document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    setupFormListeners();
    setupFilterListeners();
    setupPresetItemListeners();

    // Inizializza l'interfaccia
    // initializeCriteriaListeners();
});

function setupFormListeners() {
    // Tag input
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    });

    // Save preset
    savePresetBtn.addEventListener('click', savePreset);

    // Reset form
    resetFormBtn.addEventListener('click', resetForm);

    // Add criteria
    addCriteriaBtn.addEventListener('click', addCriteria);

    // Initial criteria row remove button
    document.querySelector('.remove-criteria').addEventListener('click', function(e) {
        if (document.querySelectorAll('.criteria-row').length > 1) {
            e.target.closest('.criteria-row').remove();
        } else {
            showNotification('Deve essere presente almeno un criterio', 'warning');
        }
    });
}

function setupFilterListeners() {
    // Search
    searchPresetInput.addEventListener('input', filterPresets);

    // Category filter
    filterCategorySelect.addEventListener('change', filterPresets);

    // Sort
    sortPresetsSelect.addEventListener('change', sortPresets);
}

function setupPresetItemListeners() {
    // Applica preset
    presetList.querySelectorAll('.btn-primary').forEach(btn => {
        btn.addEventListener('click', function() {
            const presetName = this.closest('.preset-item').querySelector('.preset-name').textContent.trim().split(' ')[0];
            applyPreset(presetName);
        });
    });

    // Modifica preset
    presetList.querySelectorAll('.btn-warning').forEach(btn => {
        btn.addEventListener('click', function() {
            const presetName = this.closest('.preset-item').querySelector('.preset-name').textContent.trim().split(' ')[0];
            editPreset(presetName);
        });
    });

    // Elimina preset
    presetList.querySelectorAll('.btn-danger').forEach(btn => {
        btn.addEventListener('click', function() {
            const presetItem = this.closest('.preset-item');
            const presetName = presetItem.querySelector('.preset-name').textContent.trim().split(' ')[0];
            deletePreset(presetName, presetItem);
        });
    });
}

/************************************************************************
 * GESTIONE PRESET
 ************************************************************************/
function savePreset() {
    // Validazione
    if (!validatePresetForm()) {
        return;
    }

    const presetName = presetNameInput.value.trim();
    const presetCategory = presetCategorySelect.value;
    const presetDescription = presetDescriptionInput.value.trim();

    // Raccolta criteri
    const criteriaRows = document.querySelectorAll('.criteria-row');
    const criteria = [];

    criteriaRows.forEach(row => {
        const field = row.querySelector('.criteria-field').value;
        const operator = row.querySelector('.criteria-operator').value;
        const value = row.querySelector('.criteria-value').value;

        criteria.push({ field, operator, value });
    });

    // Creazione oggetto preset
    const preset = {
        id: Date.now().toString(),
        name: presetName,
        category: presetCategory,
        description: presetDescription,
        criteria: criteria,
        tags: currentTags,
        created: new Date().toLocaleDateString('it-IT'),
        updated: new Date().toLocaleDateString('it-IT'),
        usageCount: 0
    };

    // In una vera implementazione, salveresti questo preset in un database o storage
    // Per ora, simuliamo l'aggiunta alla UI
    addPresetToUI(preset);

    // Reset form
    resetForm();

    showNotification(`Preset "${presetName}" creato con successo`, 'success');
}