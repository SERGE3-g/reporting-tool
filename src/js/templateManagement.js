// js/templateManagement.js

// Costanti e variabili globali
const STORAGE_KEY_TEMPLATES = 'reportTemplates';
let currentTemplateId = null;

// --- Helper minimal per l'esempio ---
const getFrequencyText = frequency => {
  switch (frequency) {
    case 'daily': return 'Giornaliera';
    case 'weekly': return 'Settimanale';
    case 'monthly': return 'Mensile';
    case 'quarterly': return 'Trimestrale';
    default: return 'Manuale';
  }
};

const calculateNextRun = frequency => "Data non calcolata";

const createFormGroup = (labelText, id, type, value, placeholder, required) => {
  const group = document.createElement('div');
  group.className = 'form-group';
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;
  group.appendChild(label);
  let input;
  if (type === 'textarea') {
    input = document.createElement('textarea');
  } else {
    input = document.createElement('input');
    input.type = type;
  }
  input.id = id;
  input.className = 'form-control';
  input.placeholder = placeholder || '';
  if (value) input.value = value;
  if (required) input.required = true;
  group.appendChild(input);
  return group;
};

const addFilterRow = (container, filter = { field: '', operator: '', value: '' }) => {
  const row = document.createElement('div');
  row.className = 'filter-row';
  const fieldInput = document.createElement('input');
  fieldInput.type = 'text';
  fieldInput.className = 'form-control';
  fieldInput.placeholder = 'Campo';
  fieldInput.value = filter.field;
  row.appendChild(fieldInput);
  const operatorInput = document.createElement('input');
  operatorInput.type = 'text';
  operatorInput.className = 'form-control';
  operatorInput.placeholder = 'Operatore';
  operatorInput.value = filter.operator;
  row.appendChild(operatorInput);
  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.className = 'form-control';
  valueInput.placeholder = 'Valore';
  valueInput.value = filter.value;
  row.appendChild(valueInput);
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-danger';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.addEventListener('click', () => container.removeChild(row));
  row.appendChild(removeBtn);
  container.appendChild(row);
};

const addRecipientToForm = (email, container) => {
  const div = document.createElement('div');
  div.className = 'recipient-item';
  div.textContent = email;
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn-danger btn-sm';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.addEventListener('click', () => container.removeChild(div));
  div.appendChild(removeBtn);
  container.appendChild(div);
};

const isValidEmail = email => /\S+@\S+\.\S+/.test(email);

const showNotification = (message, type) => {
  console.log(`[${type}] ${message}`);
};

const saveTemplateFromDialog = (form, existingTemplate) => {
  const name = form.querySelector('#template-name').value.trim();
  const description = form.querySelector('#template-description').value.trim();
  const type = form.querySelector('#template-type').value;
  const format = form.querySelector('#template-format').value;
  const includeCharts = form.querySelector('#template-charts').checked;
  const includeStatistics = form.querySelector('#template-stats').checked;
  const frequency = form.querySelector('#template-frequency').value;

  // Recupera destinatari
  const recipients = [];
  form.querySelectorAll('.recipient-item').forEach(item => {
    recipients.push(item.firstChild.textContent);
  });

  // Recupera filtri
  const filters = [];
  form.querySelectorAll('.filter-row').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs.length >= 3) {
      filters.push({
        field: inputs[0].value,
        operator: inputs[1].value,
        value: inputs[2].value
      });
    }
  });

  let templates = loadTemplates();
  if (existingTemplate) {
    templates = templates.map(t => {
      if (t.id === existingTemplate.id) {
        return {
          ...t,
          name,
          description,
          type,
          format,
          includeCharts,
          includeStatistics,
          frequency,
          recipients,
          filters,
          lastModified: new Date().toLocaleDateString('it-IT')
        };
      }
      return t;
    });
    showNotification(`Template "${name}" aggiornato`, 'success');
  } else {
    const newTemplate = {
      id: 'template' + (templates.length + 1),
      name,
      description,
      type,
      format,
      includeCharts,
      includeStatistics,
      frequency,
      recipients,
      filters,
      created: new Date().toLocaleDateString('it-IT'),
      lastModified: new Date().toLocaleDateString('it-IT'),
      usageCount: 0,
      lastUsed: null
    };
    templates.push(newTemplate);
    showNotification(`Template "${name}" creato`, 'success');
  }
  saveTemplates(templates);
  populateTemplateGrid();
  return true;
};

const populateReportForm = template => {
  // Qui inserisci la logica per pre-compilare il form del report
  console.log('Populating report form with template:', template);
};

//
// --- Funzioni principali di gestione template ---
//

const initTemplateManagement = () => {
  const templates = loadTemplates();
  if (templates.length === 0) {
    createDefaultTemplates();
  }
  populateTemplateGrid();
  setupTemplateButtons();
  setupTemplateFormListeners();
  console.log('Gestione template inizializzata');
};

const loadTemplates = () => {
  try {
    const templatesJson = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    return templatesJson ? JSON.parse(templatesJson) : [];
  } catch (error) {
    console.error('Errore nel caricamento dei template:', error);
    return [];
  }
};

const saveTemplates = templates => {
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch (error) {
    console.error('Errore nel salvataggio dei template:', error);
    showNotification('Errore nel salvataggio dei template', 'error');
  }
};

const createDefaultTemplates = () => {
  const defaultTemplates = [
    {
      id: 'template1',
      name: 'Report Mensile Commissioni',
      description: 'Riepilogo mensile delle commissioni con analisi per tipo di transazione e confronto con il mese precedente.',
      type: 'detailed',
      format: 'pdf',
      includeCharts: true,
      includeStatistics: true,
      frequency: 'monthly',
      recipients: ['finance@example.com', 'manager@example.com'],
      filters: [{ field: 'Addebito', operator: '>', value: '100' }],
      created: new Date().toLocaleDateString('it-IT'),
      lastModified: null,
      usageCount: 0,
      lastUsed: null
    },
    {
      id: 'template2',
      name: 'Report Finanziario',
      description: 'Report dettagliato finanziario con analisi dei flussi di cassa e proiezioni future.',
      type: 'summary',
      format: 'xlsx',
      includeCharts: true,
      includeStatistics: true,
      frequency: 'quarterly',
      recipients: ['cfo@example.com'],
      filters: [{ field: 'totale transazioni', operator: '>', value: '10' }],
      created: new Date().toLocaleDateString('it-IT'),
      lastModified: null,
      usageCount: 0,
      lastUsed: null
    },
    {
      id: 'template3',
      name: 'Analisi Trend',
      description: 'Analisi dei trend delle commissioni e transazioni negli ultimi 12 mesi con proiezioni.',
      type: 'comparison',
      format: 'pdf',
      includeCharts: true,
      includeStatistics: true,
      frequency: 'weekly',
      recipients: ['marketing@example.com', 'analysis@example.com'],
      filters: [{ field: 'fee scadenza', operator: 'contiene', value: '2023' }],
      created: new Date().toLocaleDateString('it-IT'),
      lastModified: null,
      usageCount: 0,
      lastUsed: null
    }
  ];
  saveTemplates(defaultTemplates);
  return defaultTemplates;
};

const populateTemplateGrid = () => {
  const templateGrid = document.querySelector('.templates-grid');
  if (!templateGrid) return;
  templateGrid.innerHTML = '';
  const templates = loadTemplates();
  templates.forEach(template => {
    const templateCard = createTemplateCard(template);
    templateGrid.appendChild(templateCard);
  });
  if (!document.querySelector('.template-new')) {
    templateGrid.appendChild(createNewTemplateCard());
  }
};

const createTemplateCard = template => {
  const card = document.createElement('div');
  card.className = 'template-card';
  card.dataset.templateId = template.id;
  const header = document.createElement('div');
  header.className = 'template-header';
  const icon = document.createElement('i');
  if (template.type === 'detailed') {
    icon.className = 'fas fa-chart-line';
  } else if (template.type === 'summary') {
    icon.className = 'fas fa-file-invoice-dollar';
  } else if (template.type === 'comparison') {
    icon.className = 'fas fa-chart-line';
  } else {
    icon.className = 'fas fa-file-alt';
  }
  header.appendChild(icon);
  const title = document.createElement('h3');
  title.textContent = template.name;
  header.appendChild(title);
  card.appendChild(header);
  const body = document.createElement('div');
  body.className = 'template-body';
  const desc = document.createElement('p');
  desc.textContent = template.description;
  body.appendChild(desc);
  const meta = document.createElement('div');
  meta.className = 'template-meta';
  const createdSpan = document.createElement('span');
  createdSpan.innerHTML = `<i class="fas fa-clock"></i> Creato: ${template.created}`;
  meta.appendChild(createdSpan);
  if (template.lastModified) {
    const modifiedSpan = document.createElement('span');
    modifiedSpan.innerHTML = `<i class="fas fa-sync-alt"></i> Modificato: ${template.lastModified}`;
    meta.appendChild(modifiedSpan);
  }
  body.appendChild(meta);
  card.appendChild(body);
  const actions = document.createElement('div');
  actions.className = 'template-actions';
  const useBtn = document.createElement('button');
  useBtn.className = 'btn btn-primary use-template';
  useBtn.textContent = 'Usa Modello';
  actions.appendChild(useBtn);
  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-info edit-template';
  editBtn.textContent = 'Modifica';
  actions.appendChild(editBtn);
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-danger delete-template';
  deleteBtn.textContent = 'Elimina';
  actions.appendChild(deleteBtn);
  card.appendChild(actions);
  return card;
};

const createNewTemplateCard = () => {
  const card = document.createElement('div');
  card.className = 'template-card template-new';
  const content = document.createElement('div');
  content.className = 'template-new-content';
  const icon = document.createElement('i');
  icon.className = 'fas fa-plus-circle';
  content.appendChild(icon);
  const title = document.createElement('h3');
  title.textContent = 'Crea Nuovo Modello';
  content.appendChild(title);
  const desc = document.createElement('p');
  desc.textContent = 'Definisci un nuovo modello di report personalizzato';
  content.appendChild(desc);
  const btn = document.createElement('button');
  btn.id = 'createNewTemplate';
  btn.className = 'btn btn-success';
  btn.textContent = 'Crea Modello';
  btn.addEventListener('click', () => showTemplateDialog());
  content.appendChild(btn);
  card.appendChild(content);
  return card;
};

const setupTemplateButtons = () => {
  document.querySelectorAll('.use-template').forEach(button => {
    button.addEventListener('click', function () {
      const templateId = this.closest('.template-card').dataset.templateId;
      useReportTemplate(templateId);
    });
  });
  document.querySelectorAll('.edit-template').forEach(button => {
    button.addEventListener('click', function () {
      const templateId = this.closest('.template-card').dataset.templateId;
      editReportTemplate(templateId);
    });
  });
  document.querySelectorAll('.delete-template').forEach(button => {
    button.addEventListener('click', function () {
      const templateId = this.closest('.template-card').dataset.templateId;
      const templateName = this.closest('.template-card').querySelector('h3').textContent;
      deleteReportTemplate(templateId, templateName);
    });
  });
};

const setupTemplateFormListeners = () => {
  const templateForm = document.getElementById('templateForm');
  if (!templateForm) return;
  templateForm.addEventListener('submit', e => {
    e.preventDefault();
    saveTemplateFromDialog(templateForm, null);
  });
};

// Nella funzione "use", cambiamo anche il tab verso "Nuovo Report"
const useReportTemplate = templateId => {
  const templates = loadTemplates();
  const template = templates.find(t => t.id === templateId);
  if (!template) {
    showNotification('Template non trovato', 'error');
    return;
  }
  template.usageCount = (template.usageCount || 0) + 1;
  template.lastUsed = new Date().toLocaleDateString('it-IT');
  const updatedTemplates = templates.map(t => (t.id === templateId ? template : t));
  saveTemplates(updatedTemplates);
  // Cambio tab verso "Nuovo Report"
  const newReportTabButton = document.querySelector('.tab-btn[data-tab="new-report"]');
  if (newReportTabButton) newReportTabButton.click();
  populateReportForm(template);
  showNotification(`Template "${template.name}" caricato con successo`, 'success');
};

const editReportTemplate = templateId => {
  const templates = loadTemplates();
  const template = templates.find(t => t.id === templateId);
  if (!template) {
    showNotification('Template non trovato', 'error');
    return;
  }
  currentTemplateId = templateId;
  showTemplateDialog(template);
};

const deleteReportTemplate = (templateId, templateName) => {
  if (confirm(`Sei sicuro di voler eliminare il template "${templateName}"?`)) {
    const templates = loadTemplates();
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    saveTemplates(updatedTemplates);
    populateTemplateGrid();
    showNotification(`Template "${templateName}" eliminato con successo`, 'success');
  }
};

const showTemplateDialog = (template = null) => {
  const dialogOverlay = document.createElement('div');
  dialogOverlay.className = 'dialog-overlay';
  dialogOverlay.style.cssText =
    'position: fixed; top:0; left:0; width:100%; height:100%; background-color: rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:1000;';
  const dialogBox = document.createElement('div');
  dialogBox.className = 'dialog-box';
  dialogBox.style.cssText =
    'background-color: white; border-radius: 5px; padding: 20px; width:700px; max-width:90%;';
  const dialogTitle = document.createElement('h2');
  dialogTitle.style.color = 'var(--primary)';
  dialogTitle.style.marginBottom = '20px';
  dialogTitle.innerHTML = template
    ? `<i class="fas fa-edit"></i> Modifica Template: ${template.name}`
    : '<i class="fas fa-plus-circle"></i> Crea Nuovo Template';
  dialogBox.appendChild(dialogTitle);
  const form = createTemplateForm(template);
  dialogBox.appendChild(form);
  dialogOverlay.appendChild(dialogBox);
  document.body.appendChild(dialogOverlay);
  setTimeout(() => {
    const firstInput = form.querySelector('input[type="text"]');
    if (firstInput) firstInput.focus();
  }, 100);
  const closeDialog = () => {
    dialogOverlay.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(dialogOverlay);
    }, 300);
  };
  dialogOverlay.addEventListener('click', e => {
    if (e.target === dialogOverlay) closeDialog();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', escHandler);
    }
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const success = saveTemplateFromDialog(form, template);
    if (success) closeDialog();
  });
  const cancelButton = form.querySelector('.btn-cancel');
  if (cancelButton) {
    cancelButton.addEventListener('click', closeDialog);
  }
};

const createTemplateForm = (template = null) => {
  const form = document.createElement('form');
  form.id = 'templateForm';
  form.className = 'template-form';
  const basicSection = document.createElement('div');
  basicSection.className = 'form-section';
  const basicTitle = document.createElement('h3');
  basicTitle.innerHTML = '<i class="fas fa-info-circle"></i> Informazioni di base';
  basicTitle.style.cssText = 'border-bottom: 1px solid #e2e8f0; padding-bottom:10px; margin-bottom:15px;';
  basicSection.appendChild(basicTitle);
  const nameGroup = createFormGroup('Nome template:', 'template-name', 'text', template ? template.name : '', 'Nome del template', true);
  basicSection.appendChild(nameGroup);
  const descGroup = createFormGroup('Descrizione:', 'template-description', 'textarea', template ? template.description : '', 'Descrivi cosa fa questo template');
  basicSection.appendChild(descGroup);
  form.appendChild(basicSection);
  const optionsSection = document.createElement('div');
  optionsSection.className = 'form-section';
  optionsSection.style.marginTop = '20px';
  const optionsTitle = document.createElement('h3');
  optionsTitle.innerHTML = '<i class="fas fa-cog"></i> Opzioni report';
  optionsTitle.style.cssText = 'border-bottom: 1px solid #e2e8f0; padding-bottom:10px; margin-bottom:15px;';
  optionsSection.appendChild(optionsTitle);
  const typeGroup = document.createElement('div');
  typeGroup.className = 'form-group';
  typeGroup.style.marginBottom = '15px';
  const typeLabel = document.createElement('label');
  typeLabel.htmlFor = 'template-type';
  typeLabel.textContent = 'Tipo di report:';
  typeGroup.appendChild(typeLabel);
  const typeSelect = document.createElement('select');
  typeSelect.id = 'template-type';
  typeSelect.className = 'form-control';
  typeSelect.required = true;
  const typeOptions = [
    { value: 'detailed', text: 'Dettagliato' },
    { value: 'summary', text: 'Riepilogativo' },
    { value: 'comparison', text: 'Comparativo' }
  ];
  typeOptions.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.text;
    if (template && template.type === option.value) opt.selected = true;
    typeSelect.appendChild(opt);
  });
  typeGroup.appendChild(typeSelect);
  optionsSection.appendChild(typeGroup);
  const formatGroup = document.createElement('div');
  formatGroup.className = 'form-group';
  formatGroup.style.marginBottom = '15px';
  const formatLabel = document.createElement('label');
  formatLabel.htmlFor = 'template-format';
  formatLabel.textContent = 'Formato:';
  formatGroup.appendChild(formatLabel);
  const formatSelect = document.createElement('select');
  formatSelect.id = 'template-format';
  formatSelect.className = 'form-control';
  formatSelect.required = true;
  const formatOptions = [
    { value: 'pdf', text: 'PDF' },
    { value: 'xlsx', text: 'Excel (XLSX)' },
    { value: 'csv', text: 'CSV' }
  ];
  formatOptions.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.text;
    if (template && template.format === option.value) opt.selected = true;
    formatSelect.appendChild(opt);
  });
  formatGroup.appendChild(formatSelect);
  optionsSection.appendChild(formatGroup);
  const checkboxGroup = document.createElement('div');
  checkboxGroup.className = 'form-group checkbox-group';
  checkboxGroup.style.cssText = 'margin-bottom:15px; display:flex; gap:20px;';
  const chartsContainer = document.createElement('div');
  chartsContainer.className = 'checkbox-container';
  chartsContainer.style.display = 'flex';
  chartsContainer.style.alignItems = 'center';
  const chartsCheck = document.createElement('input');
  chartsCheck.type = 'checkbox';
  chartsCheck.id = 'template-charts';
  chartsCheck.checked = template ? !!template.includeCharts : true;
  chartsCheck.style.marginRight = '5px';
  chartsContainer.appendChild(chartsCheck);
  const chartsLabel = document.createElement('label');
  chartsLabel.htmlFor = 'template-charts';
  chartsLabel.textContent = 'Includi grafici';
  chartsContainer.appendChild(chartsLabel);
  checkboxGroup.appendChild(chartsContainer);
  const statsContainer = document.createElement('div');
  statsContainer.className = 'checkbox-container';
  statsContainer.style.display = 'flex';
  statsContainer.style.alignItems = 'center';
  const statsCheck = document.createElement('input');
  statsCheck.type = 'checkbox';
  statsCheck.id = 'template-stats';
  statsCheck.checked = template ? !!template.includeStatistics : true;
  statsCheck.style.marginRight = '5px';
  statsContainer.appendChild(statsCheck);
  const statsLabel = document.createElement('label');
  statsLabel.htmlFor = 'template-stats';
  statsLabel.textContent = 'Includi statistiche';
  statsContainer.appendChild(statsLabel);
  checkboxGroup.appendChild(statsContainer);
  optionsSection.appendChild(checkboxGroup);
  const frequencyGroup = document.createElement('div');
  frequencyGroup.className = 'form-group';
  frequencyGroup.style.marginBottom = '15px';
  const frequencyLabel = document.createElement('label');
  frequencyLabel.htmlFor = 'template-frequency';
  frequencyLabel.textContent = 'Frequenza di esecuzione:';
  frequencyGroup.appendChild(frequencyLabel);
  const frequencySelect = document.createElement('select');
  frequencySelect.id = 'template-frequency';
  frequencySelect.className = 'form-control';
  const frequencyOptions = [
    { value: '', text: 'Nessuna (manuale)' },
    { value: 'daily', text: 'Giornaliera' },
    { value: 'weekly', text: 'Settimanale' },
    { value: 'monthly', text: 'Mensile' },
    { value: 'quarterly', text: 'Trimestrale' }
  ];
  frequencyOptions.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.text;
    if (template && template.frequency === option.value) opt.selected = true;
    frequencySelect.appendChild(opt);
  });
  frequencyGroup.appendChild(frequencySelect);
  optionsSection.appendChild(frequencyGroup);
  form.appendChild(optionsSection);
  const recipientsSection = document.createElement('div');
  recipientsSection.className = 'form-section';
  recipientsSection.style.marginTop = '20px';
  const recipientsTitle = document.createElement('h3');
  recipientsTitle.innerHTML = '<i class="fas fa-envelope"></i> Destinatari Email';
  recipientsTitle.style.cssText = 'border-bottom: 1px solid #e2e8f0; padding-bottom:10px; margin-bottom:15px;';
  recipientsSection.appendChild(recipientsTitle);
  const recipientGroup = document.createElement('div');
  recipientGroup.className = 'form-group';
  recipientGroup.style.cssText = 'margin-bottom:15px; display:flex; gap:10px;';
  const recipientInput = document.createElement('input');
  recipientInput.type = 'email';
  recipientInput.id = 'template-recipient';
  recipientInput.className = 'form-control';
  recipientInput.placeholder = 'Aggiungi indirizzo email';
  recipientInput.style.flex = '1';
  recipientGroup.appendChild(recipientInput);
  const addRecipientButton = document.createElement('button');
  addRecipientButton.type = 'button';
  addRecipientButton.className = 'btn btn-primary';
  addRecipientButton.innerHTML = '<i class="fas fa-plus"></i> Aggiungi';
  addRecipientButton.addEventListener('click', () => {
    const email = recipientInput.value.trim();
    if (email && isValidEmail(email)) {
      addRecipientToForm(email, recipientsList);
      recipientInput.value = '';
      recipientInput.focus();
    } else {
      showNotification('Inserisci un indirizzo email valido', 'warning');
    }
  });
  recipientGroup.appendChild(addRecipientButton);
  recipientsSection.appendChild(recipientGroup);
  const recipientsList = document.createElement('div');
  recipientsList.className = 'recipients-list';
  recipientsList.style.cssText = 'margin-bottom:15px; max-height:150px; overflow-y:auto;';
  if (template && template.recipients && template.recipients.length > 0) {
    template.recipients.forEach(email => addRecipientToForm(email, recipientsList));
  }
  recipientsSection.appendChild(recipientsList);
  form.appendChild(recipientsSection);
  const filtersSection = document.createElement('div');
  filtersSection.className = 'form-section';
  filtersSection.style.marginTop = '20px';
  const filtersTitle = document.createElement('h3');
  filtersTitle.innerHTML = '<i class="fas fa-filter"></i> Filtri';
  filtersTitle.style.cssText = 'border-bottom: 1px solid #e2e8f0; padding-bottom:10px; margin-bottom:15px;';
  filtersSection.appendChild(filtersTitle);
  const filtersContainer = document.createElement('div');
  filtersContainer.id = 'template-filters-container';
  filtersContainer.style.marginBottom = '15px';
  if (template && template.filters && template.filters.length > 0) {
    template.filters.forEach(filter => addFilterRow(filtersContainer, filter));
  } else {
    addFilterRow(filtersContainer);
  }
  filtersSection.appendChild(filtersContainer);
  const addFilterButton = document.createElement('button');
  addFilterButton.type = 'button';
  addFilterButton.className = 'btn btn-primary';
  addFilterButton.innerHTML = '<i class="fas fa-plus"></i> Aggiungi filtro';
  addFilterButton.addEventListener('click', () => addFilterRow(filtersContainer));
  filtersSection.appendChild(addFilterButton);
  form.appendChild(filtersSection);
  const actionButtons = document.createElement('div');
  actionButtons.className = 'form-actions';
  actionButtons.style.cssText = 'display:flex; justify-content:flex-end; gap:10px; margin-top:20px; border-top: 1px solid #e2e8f0; padding-top:20px;';
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'btn btn-cancel';
  cancelButton.textContent = 'Annulla';
  cancelButton.style.backgroundColor = '#cbd5e1';
  actionButtons.appendChild(cancelButton);
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.className = 'btn btn-primary';
  saveButton.innerHTML = template ? '<i class="fas fa-save"></i> Aggiorna Template' : '<i class="fas fa-plus"></i> Crea Template';
  actionButtons.appendChild(saveButton);
  form.appendChild(actionButtons);
  return form;
};

// Se il documento è già pronto, esegue immediatamente l'inizializzazione
if (document.readyState !== 'loading') {
  initTemplateManagement();
} else {
  document.addEventListener('DOMContentLoaded', initTemplateManagement);
}
