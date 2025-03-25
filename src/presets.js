/**
 * Funzioni integrate per la gestione dei preset di filtri
 * Compatibili con il sistema existente in presets.js
 */

// Array di tag per il preset corrente
let presetTags = [];
function showLoadPresetDialog() {
    // Recupera i preset salvati
    const savedPresets = loadSavedPresets();
    if (!savedPresets || savedPresets.length === 0) {
        showNotification('Nessun preset salvato trovato', 'warning');
        return;
    }

    // Crea un contenitore per il dialogo
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'dialog-overlay';
    dialogOverlay.style.position = 'fixed';
    dialogOverlay.style.top = '0';
    dialogOverlay.style.left = '0';
    dialogOverlay.style.width = '100%';
    dialogOverlay.style.height = '100%';
    dialogOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    dialogOverlay.style.display = 'flex';
    dialogOverlay.style.justifyContent = 'center';
    dialogOverlay.style.alignItems = 'center';
    dialogOverlay.style.zIndex = '1000';

    const dialogBox = document.createElement('div');
    dialogBox.className = 'dialog-box section'; // Usa lo stile 'section' esistente
    dialogBox.style.backgroundColor = 'white';
    dialogBox.style.borderRadius = 'var(--border-radius, 8px)';
    dialogBox.style.boxShadow = 'var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1))';
    dialogBox.style.width = '500px';
    dialogBox.style.maxWidth = '90%';
    dialogBox.style.maxHeight = '80%';
    dialogBox.style.overflow = 'auto';
    dialogBox.style.padding = '25px';

    // Titolo del dialogo
    const dialogTitle = document.createElement('h2');
    dialogTitle.innerHTML = '<i class="fas fa-folder-open"></i> Carica Preset';
    dialogTitle.style.color = 'var(--primary, #4361ee)';
    dialogTitle.style.marginBottom = '15px';
    dialogBox.appendChild(dialogTitle);

    // Barra di ricerca
    const searchContainer = document.createElement('div');
    searchContainer.className = 'control-group';
    searchContainer.style.marginBottom = '15px';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Cerca preset...';
    searchInput.className = 'form-control';
    searchInput.style.width = '100%';
    searchInput.style.padding = '8px 12px';
    searchInput.style.borderRadius = 'var(--border-radius, 4px)';
    searchInput.style.border = '1px solid #cbd5e1';
    searchInput.style.marginBottom = '10px';
    searchContainer.appendChild(searchInput);

    // Selezione categoria
    const categorySelect = document.createElement('select');
    categorySelect.className = 'form-control';
    categorySelect.style.width = '100%';
    categorySelect.style.padding = '8px 12px';
    categorySelect.style.borderRadius = 'var(--border-radius, 4px)';
    categorySelect.style.border = '1px solid #cbd5e1';

    // Opzione per tutte le categorie
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'Tutte le categorie';
    categorySelect.appendChild(allOption);

    // Raccogli categorie uniche dai preset
    const categories = [...new Set(savedPresets.map(p => p.category))].filter(Boolean);
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    searchContainer.appendChild(categorySelect);
    dialogBox.appendChild(searchContainer);

    // Lista dei preset
    const presetListContainer = document.createElement('div');
    presetListContainer.style.maxHeight = '400px';
    presetListContainer.style.overflowY = 'auto';
    presetListContainer.style.marginBottom = '15px';
    presetListContainer.style.border = '1px solid #e2e8f0';
    presetListContainer.style.borderRadius = 'var(--border-radius, 4px)';

    const presetListElement = document.createElement('div');
    presetListElement.className = 'preset-list';
    presetListElement.style.padding = '5px';

    // Popola la lista dei preset
    function renderPresetList(presets) {
        presetListElement.innerHTML = '';

        if (presets.length === 0) {
            presetListElement.innerHTML = '<div class="alert-warning" style="padding: 10px; margin: 10px 0;">Nessun preset corrisponde ai criteri di ricerca</div>';
            return;
        }

        presets.forEach(preset => {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            presetItem.style.padding = '15px';
            presetItem.style.marginBottom = '10px';
            presetItem.style.backgroundColor = '#f1f5f9';
            presetItem.style.borderRadius = 'var(--border-radius, 4px)';
            presetItem.style.transition = 'var(--transition, all 0.3s ease)';
            presetItem.dataset.presetId = preset.id;

            // Aggiunge hover effect
            presetItem.addEventListener('mouseover', () => {
                presetItem.style.backgroundColor = '#e2e8f0';
            });
            presetItem.addEventListener('mouseout', () => {
                presetItem.style.backgroundColor = '#f1f5f9';
            });

            // Header con nome e categoria
            const presetHeader = document.createElement('div');
            presetHeader.style.display = 'flex';
            presetHeader.style.justifyContent = 'space-between';
            presetHeader.style.marginBottom = '8px';

            const presetName = document.createElement('h3');
            presetName.className = 'preset-name';
            presetName.textContent = preset.name;
            presetName.style.margin = '0';
            presetName.style.fontSize = '1.1rem';
            presetName.style.fontWeight = '500';
            presetHeader.appendChild(presetName);

            if (preset.category) {
                const presetCategory = document.createElement('span');
                presetCategory.className = 'preset-category';
                presetCategory.textContent = preset.category;
                presetCategory.style.backgroundColor = 'var(--primary-light, #4895ef)';
                presetCategory.style.color = 'white';
                presetCategory.style.padding = '2px 8px';
                presetCategory.style.borderRadius = 'var(--border-radius, 4px)';
                presetCategory.style.fontSize = '0.75rem';
                presetHeader.appendChild(presetCategory);
            }

            presetItem.appendChild(presetHeader);

            // Descrizione
            if (preset.description) {
                const presetDesc = document.createElement('div');
                presetDesc.className = 'preset-description';
                presetDesc.textContent = preset.description;
                presetDesc.style.marginBottom = '8px';
                presetDesc.style.fontSize = '0.9rem';
                presetDesc.style.color = '#64748b';
                presetItem.appendChild(presetDesc);
            }

            // Criteri
            if (preset.criteria && preset.criteria.length > 0) {
                const criteriaSummary = document.createElement('div');
                criteriaSummary.className = 'preset-criteria';
                criteriaSummary.style.fontSize = '0.85rem';
                criteriaSummary.style.color = '#334155';
                criteriaSummary.style.marginBottom = '8px';

                const criteriaLabel = document.createElement('strong');
                criteriaLabel.textContent = 'Criteri: ';
                criteriaSummary.appendChild(criteriaLabel);

                const criteriaList = preset.criteria.map(c =>
                    `${c.field} ${c.operator} ${c.value}`
                ).join('; ');

                criteriaSummary.appendChild(document.createTextNode(criteriaList));
                presetItem.appendChild(criteriaSummary);
            }

            // Tags
            if (preset.tags && preset.tags.length > 0) {
                const tagsContainer = document.createElement('div');
                tagsContainer.className = 'tags-container';
                tagsContainer.style.display = 'flex';
                tagsContainer.style.flexWrap = 'wrap';
                tagsContainer.style.gap = '5px';
                tagsContainer.style.marginBottom = '8px';

                preset.tags.forEach(tag => {
                    const tagElement = document.createElement('span');
                    tagElement.className = 'tag';
                    tagElement.textContent = tag;
                    tagElement.style.backgroundColor = '#f1f5f9';
                    tagElement.style.border = '1px solid #cbd5e1';
                    tagElement.style.borderRadius = '999px';
                    tagElement.style.padding = '2px 8px';
                    tagElement.style.fontSize = '0.75rem';
                    tagsContainer.appendChild(tagElement);
                });

                presetItem.appendChild(tagsContainer);
            }

            // Footer con data e pulsanti
            const presetFooter = document.createElement('div');
            presetFooter.style.display = 'flex';
            presetFooter.style.justifyContent = 'space-between';
            presetFooter.style.alignItems = 'center';
            presetFooter.style.marginTop = '10px';

            // Info data e utilizzo
            const presetInfo = document.createElement('div');
            presetInfo.style.fontSize = '0.75rem';
            presetInfo.style.color = '#94a3b8';

            if (preset.created) {
                presetInfo.appendChild(document.createTextNode(`Creato: ${preset.created}`));
            }

            if (preset.usageCount !== undefined) {
                const usageInfo = document.createElement('span');
                usageInfo.textContent = ` | Utilizzato: ${preset.usageCount} volte`;
                presetInfo.appendChild(usageInfo);
            }

            presetFooter.appendChild(presetInfo);

            // Pulsanti azione
            const actionButtons = document.createElement('div');
            actionButtons.style.display = 'flex';
            actionButtons.style.gap = '5px';

            const applyButton = document.createElement('button');
            applyButton.className = 'btn btn-primary';
            applyButton.innerHTML = '<i class="fas fa-check"></i> Applica';
            applyButton.style.fontSize = '0.8rem';
            applyButton.style.padding = '4px 8px';
            applyButton.addEventListener('click', (e) => {
                e.stopPropagation();
                applyPreset(preset.id);
                closeDialog();
            });
            actionButtons.appendChild(applyButton);

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-danger';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.style.fontSize = '0.8rem';
            deleteButton.style.padding = '4px 8px';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Sei sicuro di voler eliminare il preset "${preset.name}"?`)) {
                    deletePresetById(preset.id);
                    presetItem.remove();

                    // Se non ci sono più preset, mostra messaggio
                    if (presetListElement.children.length === 0) {
                        presetListElement.innerHTML = '<div class="alert-warning" style="padding: 10px; margin: 10px 0;">Nessun preset disponibile</div>';
                    }

                    showNotification(`Preset "${preset.name}" eliminato con successo`, 'success');
                }
            });
            actionButtons.appendChild(deleteButton);

            presetFooter.appendChild(actionButtons);
            presetItem.appendChild(presetFooter);

            // Click sul preset per applicarlo
            presetItem.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    applyPreset(preset.id);
                    closeDialog();
                }
            });

            presetListElement.appendChild(presetItem);
        });
    }

    // Funzioni di ricerca e filtro
    function filterPresetList() {
        const searchTerm = searchInput.value.toLowerCase();
        const categoryFilter = categorySelect.value;

        const filteredPresets = savedPresets.filter(preset => {
            const nameMatch = preset.name.toLowerCase().includes(searchTerm);
            const descMatch = preset.description ? preset.description.toLowerCase().includes(searchTerm) : false;
            const tagMatch = preset.tags ? preset.tags.some(tag => tag.toLowerCase().includes(searchTerm)) : false;
            const categoryMatch = !categoryFilter || preset.category === categoryFilter;

            return categoryMatch && (nameMatch || descMatch || tagMatch);
        });

        renderPresetList(filteredPresets);
    }

    // Aggiungi event listener per ricerca e filtro
    searchInput.addEventListener('input', filterPresetList);
    categorySelect.addEventListener('change', filterPresetList);

    // Renderizza la lista iniziale
    renderPresetList(savedPresets);

    presetListContainer.appendChild(presetListElement);
    dialogBox.appendChild(presetListContainer);

    // Pulsanti delle azioni
    const actionButtons = document.createElement('div');
    actionButtons.style.display = 'flex';
    actionButtons.style.justifyContent = 'flex-end';
    actionButtons.style.gap = '10px';
    actionButtons.style.marginTop = '15px';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Chiudi';
    cancelButton.className = 'btn';
    cancelButton.style.backgroundColor = '#cbd5e1';
    cancelButton.onclick = closeDialog;
    actionButtons.appendChild(cancelButton);

    dialogBox.appendChild(actionButtons);
    dialogOverlay.appendChild(dialogBox);
    document.body.appendChild(dialogOverlay);

    // Funzione per chiudere il dialogo
    function closeDialog() {
        dialogOverlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(dialogOverlay);
        }, 300);
    }

    // Animazione di apertura
    requestAnimationFrame(() => {
        dialogOverlay.style.opacity = '0';
        dialogOverlay.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => {
            dialogOverlay.style.opacity = '1';
        });
    });

    // Chiusura cliccando fuori dal dialogo
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeDialog();
        }
    });

    // Chiusura con tasto ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

/**
 * Mostra un dialogo per salvare un nuovo preset
 */
function showSavePresetDialog() {
    // Verifica se ci sono filtri attivi da salvare
    const currentFilters = getCurrentFilters();
    if (!currentFilters || !currentFilters.filter.length) {
        showNotification('Nessun filtro attivo da salvare come preset', 'warning');
        return;
    }

    // Crea un contenitore per il dialogo
    const dialogOverlay = document.createElement('div');
    dialogOverlay.className = 'dialog-overlay';
    dialogOverlay.style.position = 'fixed';
    dialogOverlay.style.top = '0';
    dialogOverlay.style.left = '0';
    dialogOverlay.style.width = '100%';
    dialogOverlay.style.height = '100%';
    dialogOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    dialogOverlay.style.display = 'flex';
    dialogOverlay.style.justifyContent = 'center';
    dialogOverlay.style.alignItems = 'center';
    dialogOverlay.style.zIndex = '1000';

    const dialogBox = document.createElement('div');
    dialogBox.className = 'dialog-box section'; // Usa lo stile 'section' esistente
    dialogBox.style.backgroundColor = 'white';
    dialogBox.style.borderRadius = 'var(--border-radius, 8px)';
    dialogBox.style.boxShadow = 'var(--box-shadow, 0 4px 6px rgba(0, 0, 0, 0.1))';
    dialogBox.style.width = '500px';
    dialogBox.style.maxWidth = '90%';
    dialogBox.style.maxHeight = '80%';
    dialogBox.style.overflow = 'auto';
    dialogBox.style.padding = '25px';

    // Titolo del dialogo
    const dialogTitle = document.createElement('h2');
    dialogTitle.innerHTML = '<i class="fas fa-save"></i> Salva Preset';
    dialogTitle.style.color = 'var(--primary, #4361ee)';
    dialogTitle.style.marginBottom = '15px';
    dialogBox.appendChild(dialogTitle);

    // Form
    const form = document.createElement('form');
    form.id = 'savePresetForm';
    form.onsubmit = (e) => {
        e.preventDefault();
        savePresetFromDialog();
    };

    // Nome preset
    const nameGroup = document.createElement('div');
    nameGroup.className = 'control-group';
    nameGroup.style.marginBottom = '15px';

    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = 'preset-name';
    nameLabel.textContent = 'Nome del preset:';
    nameLabel.style.display = 'block';
    nameLabel.style.marginBottom = '5px';
    nameLabel.style.fontSize = '0.9rem';
    nameLabel.style.color = '#334155';
    nameGroup.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'preset-name';
    nameInput.required = true;
    nameInput.style.width = '100%';
    nameInput.style.padding = '8px 12px';
    nameInput.style.borderRadius = 'var(--border-radius, 4px)';
    nameInput.style.border = '1px solid #cbd5e1';
    nameInput.style.fontSize = '0.9rem';
    nameInput.placeholder = 'Es. Commissioni alte';
    nameGroup.appendChild(nameInput);

    form.appendChild(nameGroup);

    // Categoria
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'control-group';
    categoryGroup.style.marginBottom = '15px';

    const categoryLabel = document.createElement('label');
    categoryLabel.htmlFor = 'preset-category';
    categoryLabel.textContent = 'Categoria:';
    categoryLabel.style.display = 'block';
    categoryLabel.style.marginBottom = '5px';
    categoryLabel.style.fontSize = '0.9rem';
    categoryLabel.style.color = '#334155';
    categoryGroup.appendChild(categoryLabel);

    const categorySelect = document.createElement('select');
    categorySelect.id = 'preset-category';
    categorySelect.style.width = '100%';
    categorySelect.style.padding = '8px 12px';
    categorySelect.style.borderRadius = 'var(--border-radius, 4px)';
    categorySelect.style.border = '1px solid #cbd5e1';
    categorySelect.style.fontSize = '0.9rem';

    // Categorie predefinite
    const categories = ['Generale', 'Commissioni', 'IBAN', 'Transazioni', 'Priorità Alta', 'Priorità Bassa'];

    // Opzione vuota
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Seleziona una categoria';
    categorySelect.appendChild(emptyOption);

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    categoryGroup.appendChild(categorySelect);
    form.appendChild(categoryGroup);

    // Descrizione
    const descGroup = document.createElement('div');
    descGroup.className = 'control-group';
    descGroup.style.marginBottom = '15px';

    const descLabel = document.createElement('label');
    descLabel.htmlFor = 'preset-description';
    descLabel.textContent = 'Descrizione (opzionale):';
    descLabel.style.display = 'block';
    descLabel.style.marginBottom = '5px';
    descLabel.style.fontSize = '0.9rem';
    descLabel.style.color = '#334155';
    descGroup.appendChild(descLabel);

    const descInput = document.createElement('textarea');
    descInput.id = 'preset-description';
    descInput.style.width = '100%';
    descInput.style.padding = '8px 12px';
    descInput.style.borderRadius = 'var(--border-radius, 4px)';
    descInput.style.border = '1px solid #cbd5e1';
    descInput.style.fontSize = '0.9rem';
    descInput.style.minHeight = '80px';
    descInput.style.resize = 'vertical';
    descInput.placeholder = 'Descrivi brevemente questo preset e quando usarlo';
    descGroup.appendChild(descInput);

    form.appendChild(descGroup);

    // Tags
    const tagsGroup = document.createElement('div');
    tagsGroup.className = 'control-group';
    tagsGroup.style.marginBottom = '15px';

    const tagsLabel = document.createElement('label');
    tagsLabel.htmlFor = 'preset-tags';
    tagsLabel.textContent = 'Tags (opzionali):';
    tagsLabel.style.display = 'block';
    tagsLabel.style.marginBottom = '5px';
    tagsLabel.style.fontSize = '0.9rem';
    tagsLabel.style.color = '#334155';
    tagsGroup.appendChild(tagsLabel);

    const tagsInputContainer = document.createElement('div');
    tagsInputContainer.style.display = 'flex';
    tagsInputContainer.style.marginBottom = '5px';

    const tagsInput = document.createElement('input');
    tagsInput.type = 'text';
    tagsInput.id = 'preset-tags';
    tagsInput.style.flex = '1';
    tagsInput.style.padding = '8px 12px';
    tagsInput.style.borderRadius = 'var(--border-radius, 4px) 0 0 var(--border-radius, 4px)';
    tagsInput.style.border = '1px solid #cbd5e1';
    tagsInput.style.borderRight = 'none';
    tagsInput.style.fontSize = '0.9rem';
    tagsInput.placeholder = 'Aggiungi un tag';
    tagsInputContainer.appendChild(tagsInput);

    const addTagButton = document.createElement('button');
    addTagButton.type = 'button';
    addTagButton.className = 'btn btn-primary';
    addTagButton.innerHTML = '<i class="fas fa-plus"></i>';
    addTagButton.style.borderRadius = '0 var(--border-radius, 4px) var(--border-radius, 4px) 0';
    addTagButton.style.padding = '8px 12px';
    addTagButton.addEventListener('click', () => addTag(tagsInput, tagsContainer));
    tagsInputContainer.appendChild(addTagButton);

    tagsGroup.appendChild(tagsInputContainer);

    // Container per i tag
    const tagsContainer = document.createElement('div');
    tagsContainer.id = 'preset-tags-container';
    tagsContainer.style.display = 'flex';
    tagsContainer.style.flexWrap = 'wrap';
    tagsContainer.style.gap = '5px';
    tagsContainer.style.marginTop = '5px';
    tagsGroup.appendChild(tagsContainer);

    // Event listener per aggiungere tag con Enter
    tagsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(tagsInput, tagsContainer);
        }
    });

    form.appendChild(tagsGroup);

    // Anteprima filtri
    const previewGroup = document.createElement('div');
    previewGroup.className = 'control-group';
    previewGroup.style.marginBottom = '15px';

    const previewLabel = document.createElement('div');
    previewLabel.textContent = 'Filtri che verranno salvati:';
    previewLabel.style.display = 'block';
    previewLabel.style.marginBottom = '5px';
    previewLabel.style.fontSize = '0.9rem';
    previewLabel.style.color = '#334155';
    previewGroup.appendChild(previewLabel);

    const previewBox = document.createElement('div');
    previewBox.style.padding = '8px 12px';
    previewBox.style.backgroundColor = '#f1f5f9';
    previewBox.style.borderRadius = 'var(--border-radius, 4px)';
    previewBox.style.fontSize = '0.85rem';
    previewBox.style.color = '#334155';
    previewBox.style.maxHeight = '150px';
    previewBox.style.overflowY = 'auto';

    // Aggiungi anteprima dei filtri
    const filtersList = document.createElement('ul');
    filtersList.style.paddingLeft = '20px';
    filtersList.style.margin = '0';

    currentFilters.filter.forEach(filter => {
        const filterItem = document.createElement('li');
        filterItem.textContent = `${filter.field} ${filter.operator} ${filter.value}`;
        filtersList.appendChild(filterItem);
    });

    previewBox.appendChild(filtersList);
    previewGroup.appendChild(previewBox);
    form.appendChild(previewGroup);

    // Pulsanti delle azioni
    const actionButtons = document.createElement('div');
    actionButtons.style.display = 'flex';
    actionButtons.style.justifyContent = 'flex-end';
    actionButtons.style.gap = '10px';
    actionButtons.style.marginTop = '15px';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = 'Annulla';
    cancelButton.className = 'btn';
    cancelButton.style.backgroundColor = '#cbd5e1';
    cancelButton.onclick = closeDialog;
    actionButtons.appendChild(cancelButton);

    const saveButton = document.createElement('button');
    saveButton.type = 'submit';
    saveButton.textContent = 'Salva Preset';
    saveButton.className = 'btn btn-primary';
    saveButton.style.backgroundColor = 'var(--primary, #4361ee)';
    saveButton.style.color = 'white';
    actionButtons.appendChild(saveButton);

    form.appendChild(actionButtons);
    dialogBox.appendChild(form);
    dialogOverlay.appendChild(dialogBox);
    document.body.appendChild(dialogOverlay);

    // Focus sul campo del nome
    nameInput.focus();

    // Funzione per salvare il preset
    function savePresetFromDialog() {
        const name = nameInput.value.trim();
        const category = categorySelect.value;
        const description = descInput.value.trim();

        if (!name) {
            showNotification('Inserisci un nome per il preset', 'error');
            return;
        }

        // Raccogli i tag dal container
        const tags = [];
        tagsContainer.querySelectorAll('.tag').forEach(tagElement => {
            tags.push(tagElement.getAttribute('data-value'));
        });

        // Crea l'oggetto preset
        const preset = {
            id: Date.now().toString(),
            name: name,
            category: category,
            description: description,
            criteria: currentFilters.filter,
            tags: tags,
            created: new Date().toLocaleDateString('it-IT'),
            updated: new Date().toLocaleDateString('it-IT'),
            usageCount: 0
        };

        // Salva il preset
        savePresetToStorage(preset);

        // Se esiste una funzione per aggiungere il preset all'UI, chiamala
        if (typeof addPresetToUI === 'function') {
            addPresetToUI(preset);
        }

        closeDialog();
        showNotification(`Preset "${name}" salvato con successo`, 'success');
    }

    // Funzione per aggiungere un tag
    function addTag(input, container) {
        const tagText = input.value.trim();
        if (!tagText) return;

        // Verifica se il tag esiste già
        const existingTags = Array.from(container.querySelectorAll('.tag')).map(tag =>
            tag.getAttribute('data-value')
        );

        if (existingTags.includes(tagText)) {
            showNotification('Questo tag esiste già', 'warning');
            return;
        }

        // Crea il tag
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.setAttribute('data-value', tagText);
        tagElement.style.display = 'inline-flex';
        tagElement.style.alignItems = 'center';
        tagElement.style.backgroundColor = '#e2e8f0';
        tagElement.style.borderRadius = '999px';
        tagElement.style.padding = '3px 10px';
        tagElement.style.margin = '2px';
        tagElement.style.fontSize = '0.8rem';

        // Testo del tag
        const tagTextSpan = document.createElement('span');
        tagTextSpan.textContent = tagText;
        tagElement.appendChild(tagTextSpan);

        // Pulsante per rimuovere il tag
        const removeButton = document.createElement('span');
        removeButton.innerHTML = '&times;';
        removeButton.style.marginLeft = '5px';
        removeButton.style.cursor = 'pointer';
        removeButton.style.fontWeight = 'bold';
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            tagElement.remove();
        });
        tagElement.appendChild(removeButton);

        container.appendChild(tagElement);
        input.value = '';
        input.focus();
    }

    // Funzione per chiudere il dialogo
    function closeDialog() {
        dialogOverlay.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(dialogOverlay);
        }, 300);
    }

    // Animazione di apertura
    requestAnimationFrame(() => {
        dialogOverlay.style.opacity = '0';
        dialogOverlay.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => {
            dialogOverlay.style.opacity = '1';
        });
    });

    // Chiusura cliccando fuori dal dialogo
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeDialog();
        }
    });

    // Chiusura con tasto ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeDialog();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}