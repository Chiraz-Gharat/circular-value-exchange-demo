document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('extraction-form');
    const input = document.getElementById('free-text-input');
    const btnSubmit = document.getElementById('btn-submit');
    const btnDemo = document.getElementById('btn-demo');
    const validationBadge = document.getElementById('validation-badge');
    const outputPlaceholder = document.getElementById('output-placeholder');

    // Modus-Umschalter: KI-Extraktion (Standard) vs. manuelle Erfassung
    const modeBtnAi = document.getElementById('mode-btn-ai');
    const modeBtnManual = document.getElementById('mode-btn-manual');

    // Record-Formular
    const recordForm = document.getElementById('record-form');
    const jsonContainer = document.getElementById('json-container');
    const jsonOutput = document.getElementById('json-output');
    const btnToggleJson = document.getElementById('btn-toggle-json');
    const btnSave = document.getElementById('btn-save');
    const slotsContainer = document.getElementById('slots-container');
    const btnAddSlot = document.getElementById('btn-add-slot');
    const btnToggleOptional = document.getElementById('btn-toggle-optional');
    const optionalFields = document.getElementById('optional-fields');
    const optionalToggleIcon = document.getElementById('optional-toggle-icon');
    const qtyRow = document.getElementById('qty-row');
    const standardsContainer = document.getElementById('standards-container');
    const complianceContainer = document.getElementById('compliance-container');
    const btnAddStandard = document.getElementById('btn-add-standard');
    const btnAddCompliance = document.getElementById('btn-add-compliance');
    const catSelect = document.getElementById('f-category');
    const newCategoryRow = document.getElementById('new-category-row');
    const newCategoryInput = document.getElementById('f-new-category');
    const btnCheckCategory = document.getElementById('btn-check-category');
    const checkCategoryLoader = document.getElementById('check-category-loader');
    const newCategoryHint = document.getElementById('new-category-hint');

    // Database Table
    const tbody = document.getElementById('records-tbody');
    const btnRefresh = document.getElementById('btn-refresh');

    // Modal
    const modal = document.getElementById('json-modal');
    const modalClose = document.querySelector('.close-btn');
    const modalContent = document.getElementById('modal-json-content');

    // ─── Zustand ─────────────────────────────────────────────────────────────
    let vocab = { categories: [], properties: [], units: [], operators: [], record_types: [] };
    let currentRecord = null;
    let currentRecordId = null;
    let validateTimer = null;

    // DEMO DATA
    const demos = [
        "500 kg PP-Regranulat, Feuchte max 0,3 %, Berlin.",
        "Suche PP-Granulat, mind. 300 kg, Feuchte max 0,5 %, Berlin/Brandenburg.",
        "2 t Aluminiumspäne, Ölanteil max 1 %, Standort Dortmund.",
        "200 L Ethanol, Reinheit min 90 %, Flammpunkt > 15°C, Köln."
    ];
    let demoIdx = 0;

    btnDemo.addEventListener('click', () => {
        input.value = demos[demoIdx % demos.length];
        demoIdx++;
    });

    // ─── Modus-Umschalter: KI-Extraktion vs. manuelle Erfassung ───────────────
    // Leeres Formular fuer die rein manuelle Dateneingabe: kein
    // Extraktions-Aufruf, id wird clientseitig erzeugt (save_corrected macht
    // beim ersten Speichern einen Upsert statt eines reinen UPDATE).
    // id/raw_input/provenance sind laut CMRS-Schema Pflichtfelder auf oberster
    // Ebene, tauchen aber im Formular nicht als editierbares Feld auf (bei
    // echten Extraktionen setzt sie immer der Server) - deshalb hier einmalig
    // mit sinnvollen Werten vorbelegen, statt sie leer zu lassen.
    function startManualEntry() {
        currentRecordId = crypto.randomUUID();
        const blankRecord = {
            type: 'offer',
            id: currentRecordId,
            raw_input: { text: '(manuell erfasst)', language: 'de' },
            material: {},
            context: {},
            provenance: {
                created_at: new Date().toISOString(),
                source: 'manual',
                cmrs_version: '1.1.0'
            }
        };
        renderForm(blankRecord);
        validationBadge.classList.add('hidden');
        hideNewCategoryUi();
        scheduleValidate();
    }

    function setMode(mode) {
        const isManual = mode === 'manual';
        modeBtnManual.classList.toggle('active', isManual);
        modeBtnAi.classList.toggle('active', !isManual);
        form.classList.toggle('hidden', isManual);
        if (isManual) {
            startManualEntry();
        } else {
            // Zurueck zu KI-Extraktion: ein evtl. noch offenes Formular (aus
            // manueller Erfassung oder einer frueheren Extraktion) verschwindet
            // wieder, statt stehen zu bleiben - erst eine neue Extraktion zeigt
            // wieder ein Formular.
            currentRecord = null;
            currentRecordId = null;
            recordForm.classList.add('hidden');
            outputPlaceholder.classList.remove('hidden');
            validationBadge.classList.add('hidden');
            hideNewCategoryUi();
        }
    }
    modeBtnAi.addEventListener('click', () => setMode('ai'));
    modeBtnManual.addEventListener('click', () => setMode('manual'));

    // ─── Vokabulare laden (einzige Quelle: controlled_vocabularies.py) ────────
    async function loadVocabularies() {
        try {
            const res = await fetch('/api/vocabularies');
            vocab = await res.json();
            populateStaticDropdowns();
        } catch (err) {
            console.error('Vokabulare konnten nicht geladen werden', err);
        }
    }

    function populateStaticDropdowns() {
        const typeSelect = document.getElementById('f-type');
        typeSelect.innerHTML = vocab.record_types.map(
            t => `<option value="${t.key}">${t.label}</option>`
        ).join('');

        const catSelect = document.getElementById('f-category');
        catSelect.innerHTML = vocab.categories.map(
            c => `<option value="${c.key}">${c.label} (${c.key})</option>`
        ).join('') + '<option value="__new__">+ Neue Kategorie vorschlagen…</option>';

        const unitSelect = document.getElementById('f-qty-unit');
        unitSelect.innerHTML = '<option value="">– Einheit –</option>' + vocab.units.map(
            u => `<option value="${u.code}">${u.code}</option>`
        ).join('');
    }

    // Property-Dropdown gruppiert nach Kategorie (optgroups), damit der Nutzer
    // die richtige Eigenschaft schneller findet statt eine flache 41-Keys-Liste
    // durchsuchen zu muessen.
    function buildPropertyOptionsHtml(selectedKey) {
        const groups = {};
        vocab.properties.forEach(p => {
            const cats = (p.cats && p.cats.length) ? p.cats : ['sonstige'];
            const groupKey = cats.includes('all') ? 'Alle Kategorien' : cats.join(' / ');
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(p);
        });
        let html = '<option value="">– Eigenschaft wählen –</option>';
        Object.keys(groups).sort().forEach(groupKey => {
            html += `<optgroup label="${groupKey}">`;
            groups[groupKey].forEach(p => {
                const sel = p.key === selectedKey ? 'selected' : '';
                html += `<option value="${p.key}" ${sel}>${p.label} (${p.key})</option>`;
            });
            html += '</optgroup>';
        });
        return html;
    }

    function buildUnitOptionsHtml(allowedUnits, selectedUnit) {
        let opts = '<option value="">– Einheit –</option>';
        const list = (allowedUnits && allowedUnits.length) ? allowedUnits : vocab.units.map(u => u.code);
        list.forEach(code => {
            const sel = code === selectedUnit ? 'selected' : '';
            opts += `<option value="${code}" ${sel}>${code}</option>`;
        });
        return opts;
    }

    function buildOpOptionsHtml(allowedOps, selectedOp) {
        let opts = '<option value="">– Operator –</option>';
        const list = (allowedOps && allowedOps.length) ? allowedOps : vocab.operators.map(o => o.key);
        list.forEach(key => {
            const label = (vocab.operators.find(o => o.key === key) || {}).label || key;
            const sel = key === selectedOp ? 'selected' : '';
            opts += `<option value="${key}" ${sel}>${label} (${key})</option>`;
        });
        return opts;
    }

    // ─── Verschachtelte Feld-Pfade lesen/schreiben (z. B. "material.category") ─
    function getPath(obj, path) {
        return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
    }
    function setPath(obj, path, value) {
        const keys = path.split('.');
        let cur = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) cur[keys[i]] = {};
            cur = cur[keys[i]];
        }
        cur[keys[keys.length - 1]] = value;
    }
    function deletePath(obj, path) {
        const keys = path.split('.');
        let cur = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!cur[keys[i]]) return;
            cur = cur[keys[i]];
        }
        delete cur[keys[keys.length - 1]];
    }

    // Nutzereingabe -> Zahl falls moeglich (deutsches Komma erlaubt), sonst
    // qualitativer String (z. B. "trocken") unveraendert lassen.
    function parseUserValue(raw) {
        if (raw === '' || raw === null || raw === undefined) return undefined;
        const trimmed = String(raw).trim();
        const numLike = trimmed.replace(',', '.');
        if (/^-?\d+(\.\d+)?$/.test(numLike)) return parseFloat(numLike);
        return trimmed;
    }

    // ─── Formular aus einem CMRS-Record befuellen ─────────────────────────────
    function renderForm(record) {
        currentRecord = record;
        outputPlaceholder.classList.add('hidden');
        recordForm.classList.remove('hidden');

        document.getElementById('f-type').value = record.type || 'offer';
        document.getElementById('f-label').value = (record.material || {}).label_raw || '';
        document.getElementById('f-category').value = (record.material || {}).category || '';
        document.getElementById('f-location').value = (record.context || {}).location || '';
        document.getElementById('f-canonical').value = ((record.material || {}).normalized || {}).canonical_name || '';
        document.getElementById('f-basis').value = (record.quantity || {}).basis || '';
        document.getElementById('f-availability').value = (record.quantity || {}).availability || '';
        document.getElementById('f-intended-use').value = (record.context || {}).intended_use || '';

        const qty = record.quantity || {};
        document.getElementById('f-qty-value').value = qty.value !== undefined ? qty.value : '';
        document.getElementById('f-qty-unit').innerHTML = buildUnitOptionsHtml(null, qty.unit_ucum);
        qtyRow.querySelector('.req-tag-sm').textContent = record.type === 'offer' ? 'Pflicht' : 'optional';

        // Weitere optionale Schema-Felder
        const norm = (record.material || {}).normalized || {};
        document.getElementById('f-lowcode').value = (norm.codes || {}).low_code || '';
        document.getElementById('f-synonyms').value = (norm.synonyms || []).join(', ');
        document.getElementById('f-market-region').value = ((record.context || {}).market_region || []).join(', ');
        document.getElementById('f-frequency').value = qty.frequency || '';

        renderSlots(record);
        renderStandards(record);
        renderCompliance(record);
        renderJsonView(record);
    }

    // ─── standards[] (Normbezuege auf Record-Ebene) ──────────────────────────
    function renderStandards(record) {
        const list = record.standards || [];
        standardsContainer.innerHTML = '';
        list.forEach((std, idx) => {
            const row = document.createElement('div');
            row.className = 'slot-row slot-row-simple';
            row.innerHTML = `
                <input class="std-name" type="text" placeholder="Norm (z. B. ISO 14001)" value="${std.name || ''}">
                <input class="std-version" type="text" placeholder="Version/Jahr" value="${std.version || ''}">
                <button type="button" class="btn-remove-slot" title="Entfernen">✕</button>
            `;
            row.querySelectorAll('input').forEach(el => el.addEventListener('change', () => {
                const name = row.querySelector('.std-name').value.trim();
                const version = row.querySelector('.std-version').value.trim();
                if (name) record.standards[idx] = version ? { name, version } : { name };
                renderJsonView(record);
                scheduleValidate();
            }));
            row.querySelector('.btn-remove-slot').addEventListener('click', () => {
                record.standards.splice(idx, 1);
                if (!record.standards.length) delete record.standards;
                renderStandards(record); renderJsonView(record); scheduleValidate();
            });
            standardsContainer.appendChild(row);
        });
    }

    // ─── safety_compliance[] (REACH/RoHS/...) ────────────────────────────────
    function renderCompliance(record) {
        const list = record.safety_compliance || [];
        complianceContainer.innerHTML = '';
        list.forEach((entry, idx) => {
            const row = document.createElement('div');
            row.className = 'slot-row slot-row-simple';
            const opts = '<option value="">– Regime –</option>' + (vocab.regimes || []).map(
                r => `<option value="${r.key}" ${r.key === entry.regime ? 'selected' : ''}>${r.key}</option>`
            ).join('');
            row.innerHTML = `
                <select class="cmp-regime">${opts}</select>
                <input class="cmp-notes" type="text" placeholder="Hinweis (optional)" value="${entry.notes || ''}">
                <button type="button" class="btn-remove-slot" title="Entfernen">✕</button>
            `;
            row.querySelectorAll('select, input').forEach(el => el.addEventListener('change', () => {
                const regime = row.querySelector('.cmp-regime').value;
                const notes = row.querySelector('.cmp-notes').value.trim();
                if (regime) record.safety_compliance[idx] = notes ? { regime, notes } : { regime };
                renderJsonView(record);
                scheduleValidate();
            }));
            row.querySelector('.btn-remove-slot').addEventListener('click', () => {
                record.safety_compliance.splice(idx, 1);
                if (!record.safety_compliance.length) delete record.safety_compliance;
                renderCompliance(record); renderJsonView(record); scheduleValidate();
            });
            complianceContainer.appendChild(row);
        });
    }

    function getSlotListKey(record) {
        return record.type === 'demand' ? 'constraints' : 'properties';
    }

    function renderSlots(record) {
        const listKey = getSlotListKey(record);
        const slots = record[listKey] || [];
        slotsContainer.innerHTML = '';
        slots.forEach((slot, idx) => slotsContainer.appendChild(buildSlotRow(slot, idx)));
    }

    function buildSlotRow(slot, idx) {
        const row = document.createElement('div');
        row.className = 'slot-row';
        row.dataset.idx = String(idx);

        const propInfo = vocab.properties.find(p => p.key === slot.property_key) || {};
        const isRange = slot.op === 'range';

        row.innerHTML = `
            <select class="slot-property" data-field="property_key">${buildPropertyOptionsHtml(slot.property_key)}</select>
            <select class="slot-op" data-field="op">${buildOpOptionsHtml(propInfo.ops, slot.op)}</select>
            <input class="slot-value" data-field="value" type="text" placeholder="Wert"
                   value="${isRange ? '' : (slot.value !== undefined ? slot.value : '')}"
                   style="${isRange ? 'display:none' : ''}">
            <input class="slot-min" data-field="min" type="text" placeholder="von"
                   value="${isRange && slot.min !== undefined ? slot.min : ''}"
                   style="${isRange ? '' : 'display:none'}">
            <input class="slot-max" data-field="max" type="text" placeholder="bis"
                   value="${isRange && slot.max !== undefined ? slot.max : ''}"
                   style="${isRange ? '' : 'display:none'}">
            <select class="slot-unit" data-field="unit_ucum">${buildUnitOptionsHtml(propInfo.units, slot.unit_ucum)}</select>
            <button type="button" class="btn-remove-slot" title="Entfernen">✕</button>
            <input class="slot-method" data-field="method" type="text" placeholder="Messmethode (optional)"
                   value="${slot.method || ''}">
            <input class="slot-standard-ref" data-field="standard_ref" type="text" placeholder="Norm-Referenz (optional)"
                   value="${slot.standard_ref || ''}">
        `;

        row.querySelector('.slot-property').addEventListener('change', (e) => {
            const key = e.target.value;
            const info = vocab.properties.find(p => p.key === key) || {};
            const opSelect = row.querySelector('.slot-op');
            const curOp = opSelect.value;
            opSelect.innerHTML = buildOpOptionsHtml(info.ops, curOp);
            row.querySelector('.slot-unit').innerHTML = buildUnitOptionsHtml(info.units, row.querySelector('.slot-unit').value);
            updateSlotFromRow(row, idx);
        });

        row.querySelectorAll('.slot-op').forEach(el => el.addEventListener('change', () => {
            toggleSlotValueMode(row);
            updateSlotFromRow(row, idx);
        }));
        row.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('change', () => updateSlotFromRow(row, idx));
        });
        row.querySelector('.btn-remove-slot').addEventListener('click', () => {
            const listKey = getSlotListKey(currentRecord);
            currentRecord[listKey].splice(idx, 1);
            renderSlots(currentRecord);
            renderJsonView(currentRecord);
            scheduleValidate();
        });

        return row;
    }

    function toggleSlotValueMode(row) {
        const op = row.querySelector('.slot-op').value;
        const isRange = op === 'range';
        row.querySelector('.slot-value').style.display = isRange ? 'none' : '';
        row.querySelector('.slot-min').style.display = isRange ? '' : 'none';
        row.querySelector('.slot-max').style.display = isRange ? '' : 'none';
    }

    function updateSlotFromRow(row, idx) {
        const listKey = getSlotListKey(currentRecord);
        const slot = currentRecord[listKey][idx];
        const op = row.querySelector('.slot-op').value;

        slot.property_key = row.querySelector('.slot-property').value || undefined;
        slot.op = op || undefined;
        slot.unit_ucum = row.querySelector('.slot-unit').value || undefined;
        slot.method = row.querySelector('.slot-method').value.trim() || undefined;
        slot.standard_ref = row.querySelector('.slot-standard-ref').value.trim() || undefined;

        if (op === 'range') {
            slot.min = parseUserValue(row.querySelector('.slot-min').value);
            slot.max = parseUserValue(row.querySelector('.slot-max').value);
            delete slot.value;
        } else {
            slot.value = parseUserValue(row.querySelector('.slot-value').value);
            delete slot.min;
            delete slot.max;
        }
        Object.keys(slot).forEach(k => { if (slot[k] === undefined) delete slot[k]; });

        renderJsonView(currentRecord);
        scheduleValidate();
    }

    btnAddSlot.addEventListener('click', () => {
        if (!currentRecord) return;
        const listKey = getSlotListKey(currentRecord);
        if (!currentRecord[listKey]) currentRecord[listKey] = [];
        currentRecord[listKey].push({ property_key: '', op: 'max' });
        renderSlots(currentRecord);
        renderJsonView(currentRecord);
    });

    btnAddStandard.addEventListener('click', () => {
        if (!currentRecord) return;
        if (!currentRecord.standards) currentRecord.standards = [];
        currentRecord.standards.push({ name: '' });
        renderStandards(currentRecord);
        renderJsonView(currentRecord);
    });

    btnAddCompliance.addEventListener('click', () => {
        if (!currentRecord) return;
        if (!currentRecord.safety_compliance) currentRecord.safety_compliance = [];
        currentRecord.safety_compliance.push({ regime: '' });
        renderCompliance(currentRecord);
        renderJsonView(currentRecord);
    });

    // Kommagetrennte Eingaben -> Array (synonyms, market_region)
    document.querySelectorAll('#record-form [data-path-list]').forEach(el => {
        el.addEventListener('change', () => {
            if (!currentRecord) return;
            const path = el.dataset.pathList;
            const items = el.value.split(',').map(s => s.trim()).filter(Boolean);
            if (items.length) setPath(currentRecord, path, items);
            else deletePath(currentRecord, path);
            renderJsonView(currentRecord);
            scheduleValidate();
        });
    });

    btnToggleOptional.addEventListener('click', () => {
        const isHidden = optionalFields.classList.toggle('hidden');
        optionalToggleIcon.textContent = isHidden ? '▸' : '▾';
    });

    btnToggleJson.addEventListener('click', () => {
        const showing = !jsonContainer.classList.contains('hidden');
        jsonContainer.classList.toggle('hidden', showing);
        btnToggleJson.textContent = showing ? 'JSON anzeigen' : 'JSON ausblenden';
    });

    function renderJsonView(record) {
        jsonOutput.textContent = JSON.stringify(record, null, 2);
    }

    // ─── Top-Level-Felder: Aenderung -> Record aktualisieren -> revalidieren ──
    document.querySelectorAll('#record-form [data-path]').forEach(el => {
        el.addEventListener('change', () => {
            if (!currentRecord) return;
            const path = el.dataset.path;
            let value = el.value;
            if (path === 'quantity.value') {
                value = parseUserValue(value);
                if (value === undefined) deletePath(currentRecord, path);
                else setPath(currentRecord, path, value);
            } else if (value === '') {
                deletePath(currentRecord, path);
            } else {
                setPath(currentRecord, path, value);
            }
            if (path === 'type') {
                qtyRow.querySelector('.req-tag-sm').textContent = value === 'offer' ? 'Pflicht' : 'optional';
                renderSlots(currentRecord); // properties<->constraints Feld wechselt mit type
            }
            renderJsonView(currentRecord);
            scheduleValidate();
        });
    });

    // ─── Neue Kategorie vorschlagen (nur "Manuell erfassen") ──────────────────
    // "+ Neue Kategorie vorschlagen…" im Dropdown loest KEINE echte Kategorie
    // aus - der generische data-path-Handler oben haette sonst den Platzhalter-
    // Wert "__new__" als material.category gespeichert. Hier direkt danach
    // wieder entfernen und stattdessen die Eingabezeile einblenden.
    function hideNewCategoryUi() {
        newCategoryRow.classList.add('hidden');
        newCategoryHint.classList.add('hidden');
        newCategoryInput.value = '';
    }

    catSelect.addEventListener('change', () => {
        if (catSelect.value !== '__new__') {
            hideNewCategoryUi();
            return;
        }
        if (currentRecord) deletePath(currentRecord, 'material.category');
        newCategoryRow.classList.remove('hidden');
        newCategoryHint.classList.remove('hidden');
        newCategoryHint.classList.remove('hint-new');
        newCategoryHint.textContent = 'Material zuerst oben ausfüllen, dann Bezeichnung eingeben und prüfen.';
        newCategoryInput.focus();
    });

    btnCheckCategory.addEventListener('click', async () => {
        const materialLabel = document.getElementById('f-label').value.trim();
        const proposedLabel = newCategoryInput.value.trim();
        if (!materialLabel) {
            newCategoryHint.classList.remove('hidden');
            newCategoryHint.textContent = 'Bitte zuerst das Material-Feld oben ausfüllen.';
            return;
        }
        if (!proposedLabel) return;

        btnCheckCategory.disabled = true;
        checkCategoryLoader.classList.add('active');
        newCategoryHint.classList.remove('hidden');
        newCategoryHint.textContent = 'KI prüft, ob eine bestehende Kategorie passt…';

        try {
            const res = await fetch('/api/check_category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ material_label: materialLabel, proposed_label: proposedLabel })
            });
            const data = await res.json();
            if (data.error) {
                newCategoryHint.textContent = 'Fehler: ' + data.error;
                return;
            }

            let option = catSelect.querySelector(`option[value="${data.category}"]`);
            if (!option) {
                option = document.createElement('option');
                option.value = data.category;
                option.textContent = `${data.label} (${data.category})`;
                catSelect.insertBefore(option, catSelect.querySelector('option[value="__new__"]'));
            }
            catSelect.value = data.category;
            if (currentRecord) setPath(currentRecord, 'material.category', data.category);

            newCategoryHint.classList.add('hint-new');
            newCategoryHint.textContent = data.is_new
                ? `Neue Kategorie "${data.label}" wurde angelegt und ausgewählt.`
                : `Passt zur bestehenden Kategorie "${data.label}" – wurde ausgewählt.`;
            newCategoryRow.classList.add('hidden');
            renderJsonView(currentRecord);
            scheduleValidate();
        } catch (err) {
            console.error('Kategorie-Pruefung fehlgeschlagen', err);
            newCategoryHint.textContent = 'Unerwarteter Fehler bei der Kategorie-Prüfung.';
        } finally {
            btnCheckCategory.disabled = false;
            checkCategoryLoader.classList.remove('active');
        }
    });

    // ─── Live-Revalidierung (debounced) ───────────────────────────────────────
    function scheduleValidate() {
        clearTimeout(validateTimer);
        validateTimer = setTimeout(runValidate, 300);
    }

    async function runValidate() {
        if (!currentRecord) return;
        try {
            const res = await fetch('/api/validate_record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ record: currentRecord })
            });
            const data = await res.json();
            if (data.validation_summary) applyValidationHighlights(data.validation_summary);
        } catch (err) {
            console.error('Revalidierung fehlgeschlagen', err);
        }
    }

    // Fehlerpfade wie "quantity.value" oder "properties[0].unit_ucum" auf
    // Formularfelder abbilden und in Klartext (nicht nur Fehlercode) anzeigen.
    function applyValidationHighlights(summary) {
        document.querySelectorAll('.field-row').forEach(r => {
            r.classList.remove('has-error');
            const msg = r.querySelector('.field-error-msg');
            if (msg) msg.remove();
        });
        document.querySelectorAll('.slot-row').forEach(r => {
            r.classList.remove('has-error');
            const msg = r.querySelector('.slot-error-msg');
            if (msg) msg.remove();
        });

        const pathToFieldRow = {
            'type': 'f-type', 'material.label_raw': 'f-label', 'material.category': 'f-category',
            'context.location': 'f-location', 'quantity.value': 'f-qty-value', 'quantity.unit_ucum': 'f-qty-unit',
            'quantity': 'f-qty-value',
        };
        // Fehlermeldungen zeigen dieselbe Bezeichnung wie das Formular-Label,
        // nicht den technischen Schema-Pfad (z. B. "Material" statt "material.label_raw").
        const pathToLabel = {
            'type': 'Art', 'material.label_raw': 'Material', 'material.category': 'Kategorie',
            'context.location': 'Standort', 'quantity.value': 'Menge', 'quantity.unit_ucum': 'Menge',
            'quantity': 'Menge',
        };
        const toDisplayMessage = (err) => {
            const label = pathToLabel[err.path];
            return label ? err.message.replaceAll(err.path, label) : err.message;
        };

        (summary.errors || []).forEach(err => {
            const slotMatch = err.path.match(/^(properties|constraints)\[(\d+)\]/);
            if (slotMatch) {
                const idx = slotMatch[2];
                const row = slotsContainer.querySelector(`.slot-row[data-idx="${idx}"]`);
                if (row) {
                    row.classList.add('has-error');
                    if (!row.querySelector('.slot-error-msg')) {
                        const p = document.createElement('div');
                        p.className = 'slot-error-msg';
                        p.textContent = toDisplayMessage(err);
                        row.appendChild(p);
                    }
                }
                return;
            }
            const fieldId = pathToFieldRow[err.path];
            if (fieldId) {
                const el = document.getElementById(fieldId);
                const fieldRow = el ? el.closest('.field-row') : null;
                if (fieldRow) {
                    fieldRow.classList.add('has-error');
                    if (!fieldRow.querySelector('.field-error-msg')) {
                        const p = document.createElement('div');
                        p.className = 'field-error-msg';
                        p.textContent = toDisplayMessage(err);
                        fieldRow.appendChild(p);
                    }
                }
            }
        });

        setBadge(summary.valid, summary.valid ? 'GÜLTIG' : 'FEHLERHAFT');
    }

    // ─── FORM SUBMIT (Extraktion) ──────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const text = input.value.trim();
        if (!text) return;

        btnSubmit.classList.add('loading');
        btnSubmit.disabled = true;
        validationBadge.classList.add('hidden');

        try {
            const res = await fetch('/api/process_text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            const data = await res.json();

            if (data.error) {
                outputPlaceholder.textContent = 'Fehler: ' + data.error;
                outputPlaceholder.classList.remove('hidden');
                recordForm.classList.add('hidden');
                setBadge(false, 'FEHLER');
            } else {
                currentRecordId = data.record.id;
                renderForm(data.record.full_json);
                if (data.record.validation_summary) applyValidationHighlights(data.record.validation_summary);
                fetchRecords();
            }

        } catch (err) {
            console.error(err);
            outputPlaceholder.textContent = 'Unerwarteter Fehler: ' + err.message;
            outputPlaceholder.classList.remove('hidden');
        } finally {
            btnSubmit.classList.remove('loading');
            btnSubmit.disabled = false;
        }
    });

    // ─── SPEICHERN (Human-in-the-Loop-Korrektur uebernehmen) ──────────────────
    recordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentRecord || !currentRecordId) return;

        btnSave.classList.add('loading');
        btnSave.disabled = true;
        try {
            const res = await fetch('/api/save_corrected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: currentRecordId, record: currentRecord })
            });
            const data = await res.json();
            if (data.validation_summary) applyValidationHighlights(data.validation_summary);
            fetchRecords();
        } catch (err) {
            console.error('Speichern fehlgeschlagen', err);
        } finally {
            btnSave.classList.remove('loading');
            btnSave.disabled = false;
        }
    });

    function setBadge(isValid, text = "") {
        validationBadge.classList.remove('hidden', 'valid', 'invalid');
        validationBadge.classList.add(isValid ? 'valid' : 'invalid');
        validationBadge.textContent = text || (isValid ? "VALID" : "ERROR");
    }

    // ─── TABLE REFRESH ──────────────────────────────────────────────────────
    async function fetchRecords() {
        try {
            const res = await fetch('/api/records');
            const data = await res.json();

            tbody.innerHTML = '';

            data.records.forEach(rec => {
                const tr = document.createElement('tr');

                const validStatus = rec.is_valid
                    ? `<span class="status-dot status-green"></span> Valid`
                    : `<span class="status-dot status-red"></span> Error`;

                const qtyStr = rec.quantity_value !== null ? `${rec.quantity_value} ${rec.quantity_unit || ''}` : '-';

                tr.innerHTML = `
                    <td><span class="type-tag">${rec.record_type}</span></td>
                    <td title="${rec.raw_text}">${rec.raw_text.length > 40 ? rec.raw_text.substring(0,40)+'...' : rec.raw_text}</td>
                    <td>${rec.material_category || '-'}</td>
                    <td>${qtyStr}</td>
                    <td>${validStatus}</td>
                    <td><button class="btn-sm btn-secondary view-btn" data-json='${JSON.stringify(rec.full_json).replace(/'/g, "&apos;")}'>View JSON</button></td>
                `;
                tbody.appendChild(tr);
            });

            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const jsonStr = e.target.getAttribute('data-json');
                    modalContent.textContent = JSON.stringify(JSON.parse(jsonStr), null, 2);
                    modal.classList.remove('hidden');
                });
            });

        } catch (err) {
            console.error("Failed fetching records", err);
        }
    }

    btnRefresh.addEventListener('click', fetchRecords);

    // Initiales Laden
    loadVocabularies();
    fetchRecords();

    // Modal Close
    modalClose.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

});
