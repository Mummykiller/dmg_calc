class SpellCalculator {
    constructor(setId, manager, name) {
        this.setId = setId;
        this.manager = manager;
        this.name = name;
        this.idSuffix = `-set${setId}`;

        // Properties for spell calculations
        this.totalAverageDamage = 0;
        this.averageBaseHit = 0;
        this.averageCritHit = 0;
        this.finalAverageDamage = 0;
        this.mrrMitigation = 0;

        this.getElements();
        this.addEventListeners();

        // Initial calculation
        this.calculateSpellDamage();
    }

    getElements() {
        const get = (baseId) => document.getElementById(baseId + this.idSuffix);

        // Input elements
        this.spellDamageRowsContainer = get('spell-damage-rows-container');
        this.addSpellDamageRowBtn = get('add-spell-damage-row-btn');
        this.spellPowerInput = get('spell-power');
        this.spellCritChanceInput = get('spell-crit-chance');
        this.spellCritDamageInput = get('spell-crit-damage');
        this.targetMrrInput = get('target-mrr');
        this.empowerCheckbox = get('metamagic-empower');
        this.maximizeCheckbox = get('metamagic-maximize');
        this.intensifyCheckbox = get('metamagic-intensify');
        this.calculateBtn = get('calculate-spell-btn');

        // Output elements
        this.metamagicSpellPowerBonusSpan = get('metamagic-spell-power-bonus');
        this.avgSpellDamageSpan = get('avg-spell-damage');
        this.avgSpellCritDamageSpan = get('avg-spell-crit-damage');
        this.totalAvgSpellDamageSpan = get('total-avg-spell-damage');
        this.mrrMitigationSpan = get('mrr-mitigation');
        this.finalSpellDamageSpan = get('final-spell-damage');
    }

    addEventListeners() {
        this.calculateBtn.addEventListener('click', () => this.calculateSpellDamage());

        const calculatorElement = document.getElementById(`calculator-set-${this.setId}`);
        if (calculatorElement) {
            const recordChange = (e) => {
                this.calculateSpellDamage();
                this.manager.saveState();
            };
            calculatorElement.addEventListener('input', recordChange);
            calculatorElement.addEventListener('change', recordChange);

            // Add direct listeners for metamagic checkboxes
            this.empowerCheckbox.addEventListener('change', recordChange);
            this.maximizeCheckbox.addEventListener('change', recordChange);
            this.intensifyCheckbox.addEventListener('change', recordChange);

            // Add listener for adding a new spell damage row
            this.addSpellDamageRowBtn.addEventListener('click', (e) => this.addSpellDamageRow(e));

            // Use event delegation for remove buttons within the spellDamageRowsContainer
            this.spellDamageRowsContainer.addEventListener('click', (e) => {
                if (e.target && e.target.classList.contains('remove-row-btn')) {
                    e.preventDefault();
                    e.target.closest('.input-group-row').remove();
                    this.calculateSpellDamage(); // Recalculate after removing a row
                    this.manager.saveState();
                }
            });
        }
    }

    addSpellDamageRow(e) {
        e.preventDefault();

        let maxRowId = 0;
        this.spellDamageRowsContainer.querySelectorAll('.input-group-row').forEach(row => {
            const firstInput = row.querySelector('input[id^="spell-name-"]');
            if (firstInput) {
                const idNum = parseInt(firstInput.id.match(/spell-name-(\d+)/)[1], 10);
                if (idNum > maxRowId) {
                    maxRowId = idNum;
                }
            }
        });
        const newRowId = maxRowId + 1;

        const newRow = document.createElement('div');
        newRow.className = 'input-group-row';
        newRow.innerHTML = `
            <input type="text" id="spell-name-${newRowId}${this.idSuffix}" value="Source ${newRowId}" title="Name of the spell component" placeholder="Spell Name">
            <label for="spell-damage-${newRowId}${this.idSuffix}">Base Damage</label>
            <input type="text" id="spell-damage-${newRowId}${this.idSuffix}" value="0" title="The spell's base damage dice (e.g., 10d6+50)">
            <span class="plus-symbol">+</span>
            <label for="spell-cl-scaling-${newRowId}${this.idSuffix}" class="short-label">per CL</label>
            <input type="text" id="spell-cl-scaling-${newRowId}${this.idSuffix}" value="0" class="small-input" title="Bonus damage dice per caster level (e.g., 1d6 per CL)">
            <label for="caster-level-${newRowId}${this.idSuffix}" class="short-label">CL</label>
            <input type="number" id="caster-level-${newRowId}${this.idSuffix}" value="20" class="small-input" title="Caster Level for this damage component">
            <button class="remove-row-btn" title="Remove this damage source">&times;</button>
        `;
        this.spellDamageRowsContainer.appendChild(newRow);
    }

    _getInputs() {
        const spellDamageSources = [];
        let i = 1;
        while (true) {
            const spellNameInput = document.getElementById(`spell-name-${i}${this.idSuffix}`);
            const baseDmgInput = document.getElementById(`spell-damage-${i}${this.idSuffix}`);
            const clScalingInput = document.getElementById(`spell-cl-scaling-${i}${this.idSuffix}`);
            const casterLevelInput = document.getElementById(`caster-level-${i}${this.idSuffix}`);

            if (!spellNameInput || !baseDmgInput || !clScalingInput || !casterLevelInput) break;

            spellDamageSources.push({
                name: spellNameInput.value || `Source ${i}`,
                base: this.parseDiceNotation(baseDmgInput.value),
                clScaled: this.parseDiceNotation(clScalingInput.value),
                casterLevel: parseInt(casterLevelInput.value) || 0
            });
            i++;
        }

        const inputs = {
            spellDamageSources: spellDamageSources,
            spellPower: parseInt(this.spellPowerInput.value) || 0,
            critChance: (parseFloat(this.spellCritChanceInput.value) || 0) / 100,
            critDamage: (parseFloat(this.spellCritDamageInput.value) || 0) / 100,
            targetMrr: parseInt(this.targetMrrInput.value) || 0,
            isEmpowered: this.empowerCheckbox.checked,
            isMaximized: this.maximizeCheckbox.checked,
            isIntensified: this.intensifyCheckbox.checked,
        };
        return inputs;
    }

    calculateSpellDamage() {
        let totalBaseDamage = 0;
        const individualSpellDamages = []; // To store results for each spell
        const inputs = this._getInputs();

        let metamagicSpellPower = 0;
        if (inputs.isIntensified) {
            metamagicSpellPower += 75;
        }
        if (inputs.isEmpowered) {
            metamagicSpellPower += 75;
        }
        if (inputs.isMaximized) {
            metamagicSpellPower += 150;
        }

        this.metamagicSpellPowerBonusSpan.textContent = metamagicSpellPower;
        const totalSpellPower = inputs.spellPower + metamagicSpellPower;
        const spellPowerMultiplier = 1 + (totalSpellPower / 100);
        const critMultiplier = 2 + inputs.critDamage;

        inputs.spellDamageSources.forEach(source => {
            const spellBaseDamage = source.base + (source.clScaled * source.casterLevel);
            const averageHit = spellBaseDamage * spellPowerMultiplier;
            const averageCrit = averageHit * critMultiplier;
            const totalAverage = (averageHit * (1 - inputs.critChance)) + (averageCrit * inputs.critChance);

            individualSpellDamages.push({
                name: source.name,
                averageHit: averageHit,
                averageCrit: averageCrit,
                totalAverage: totalAverage
            });
            totalBaseDamage += totalAverage; // Summing up the individual total averages for the grand total
        });

        // This is the aggregated average BEFORE MRR for all spells combined
        this.totalAverageDamagePreMrr = totalBaseDamage;

        const mrrMitigation = this.totalAverageDamagePreMrr * (inputs.targetMrr / 100);
        const finalDamage = this.totalAverageDamagePreMrr - mrrMitigation;

        // Store for comparison table - this is the final damage for ALL spells combined
        this.totalAverageDamage = finalDamage;
        this.individualSpellDamages = individualSpellDamages; // Store individual results

        // Update UI
        this.avgSpellDamageSpan.textContent = this.totalAverageDamagePreMrr.toFixed(2); // This now represents total pre-MRR average
        this.avgSpellCritDamageSpan.textContent = 'N/A'; // No single value for all
        this.totalAvgSpellDamageSpan.textContent = this.totalAverageDamagePreMrr.toFixed(2);
        this.mrrMitigationSpan.textContent = mrrMitigation.toFixed(2);
        this.finalSpellDamageSpan.textContent = finalDamage.toFixed(2);

        this._updateSummaryUI(); // Call the new UI update method
    }

    _updateSummaryUI() {
        const individualSpellDamageSummary = document.getElementById(`individual-spell-damage-summary${this.idSuffix}`);
        if (!individualSpellDamageSummary) return;

        individualSpellDamageSummary.innerHTML = '<h3>Individual Spell Damage</h3>'; // Clear previous results

        this.individualSpellDamages.forEach(spell => {
            const p = document.createElement('p');
            p.innerHTML = `<strong>${spell.name}:</strong> Avg Dmg (pre-crit): ${spell.averageHit.toFixed(2)}, Avg Crit: ${spell.averageCrit.toFixed(2)}`;
            individualSpellDamageSummary.appendChild(p);
        });
    }

    getState() {
        const state = {};
        const allInputs = document.querySelectorAll(`#calculator-set-${this.setId} input, #calculator-set-${this.setId} select`);
        allInputs.forEach(input => {
            const key = input.id.replace(`-set${this.setId}`, '');
            if (input.type === 'checkbox') {
                state[key] = input.checked;
            } else {
                state[key] = input.value;
            }
        });

        // Store spell damage rows separately
        const spellDamageSourcesState = [];
        this.spellDamageRowsContainer.querySelectorAll('.input-group-row').forEach((row) => {
            const spellNameInput = row.querySelector('input[id^="spell-name-"]');
            const baseDmgInput = row.querySelector('input[id^="spell-damage-"]');
            const clScalingInput = row.querySelector('input[id^="spell-cl-scaling-"]');
            const casterLevelInput = row.querySelector('input[id^="caster-level-"]');
            if (spellNameInput && baseDmgInput && clScalingInput && casterLevelInput) {
                spellDamageSourcesState.push({
                    name: spellNameInput.value,
                    base: baseDmgInput.value,
                    clScaled: clScalingInput.value,
                    casterLevel: casterLevelInput.value
                });
            }
        });
        state.spellDamageSources = spellDamageSourcesState;

        return state;
    }

    setState(state) {
        if (!state) return;

        const allInputs = document.querySelectorAll(`#calculator-set-${this.setId} input, #calculator-set-${this.setId} select`);
        allInputs.forEach(input => {
            const key = input.id.replace(`-set${this.setId}`, '');
            // Skip dynamic spell damage source inputs here, as they are handled below
            if (key.startsWith('spell-name-') || key.startsWith('spell-damage-') || key.startsWith('spell-cl-scaling-') || key.startsWith('caster-level-')) {
                return;
            }

            if (state.hasOwnProperty(key)) {
                if (input.type === 'checkbox') {
                    input.checked = state[key];
                } else {
                    input.value = state[key];
                }
            }
        });

        // Handle spell damage rows
        // Clear all existing dynamic spell damage rows
        let existingRows = this.spellDamageRowsContainer.querySelectorAll('.input-group-row');
        existingRows.forEach(row => row.remove());

        if (state.spellDamageSources && state.spellDamageSources.length > 0) {
            state.spellDamageSources.forEach((source, index) => {
                // Call addSpellDamageRow to create the div with the correct dynamic IDs
                this.addSpellDamageRow(new Event('dummy')); // Pass a dummy event

                // Get the newly added row (always the last child)
                const newRow = this.spellDamageRowsContainer.lastElementChild;

                // Populate the inputs within this new row
                if (newRow) {
                    const spellNameInput = newRow.querySelector('input[id^="spell-name-"]');
                    const baseDmgInput = newRow.querySelector('input[id^="spell-damage-"]');
                    const clScalingInput = newRow.querySelector('input[id^="spell-cl-scaling-"]');
                    const casterLevelInput = newRow.querySelector('input[id^="caster-level-"]');

                    if (spellNameInput) spellNameInput.value = source.name;
                    if (baseDmgInput) baseDmgInput.value = source.base;
                    if (clScalingInput) clScalingInput.value = source.clScaled;
                    if (casterLevelInput) casterLevelInput.value = source.casterLevel;
                }
            });
        } else {
            // If no saved sources, ensure at least one default empty row if needed
            // This case should be handled by the initial template, but to be safe:
            if (this.spellDamageRowsContainer.children.length === 0) {
                this.addSpellDamageRow(new Event('dummy'));
            }
        }

        this.calculateSpellDamage();
    }

    parseDiceNotation(diceString) {
        // Ensure we have a string, trim whitespace
        let cleanString = (diceString || '').trim();

        if (!cleanString) {
            return 0;
        }

        // First, find and replace all range notations (e.g., "100-300") with their average value.
        // This prevents the '-' in a range from being treated as subtraction.
        cleanString = cleanString.replace(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)/g, (match, minStr, maxStr) => {
            const min = parseFloat(minStr);
            const max = parseFloat(maxStr);
            return ((min + max) / 2).toString();
        });
        // Standardize operators: replace all '-' with '+-' to make splitting easier
        cleanString = cleanString.replace(/\s/g, '');
        // Handle negative numbers at the start of the string
        if (cleanString.startsWith('-')) {
            cleanString = cleanString.substring(1).replace(/-/g, '+-');
            cleanString = '-' + cleanString;
        } else {
            cleanString = cleanString.replace(/-/g, '+-');
        }

        // Split the string by the '+' operator to get all the terms
        const terms = cleanString.split('+');

        let totalAverage = 0;

        for (const term of terms) {
            if (!term) continue; // Skip empty terms that can result from " -5"

            // Check if the term is a die roll (e.g., "2d6")
            if (term.toLowerCase().includes('d')) {
                const parts = term.toLowerCase().split('d');
                if (parts.length !== 2) continue; // Invalid format, skip

                const numDice = parseInt(parts[0], 10) || 1; // Default to 1 if missing, e.g., "d6"
                const numSides = parseFloat(parts[1]); // Use parseFloat to handle dice like 'd100' or 'd4.5' if ever needed

                if (isNaN(numSides) || numSides <= 0) continue; // Invalid sides, skip

                // Average of one die is (sides + 1) / 2. Multiply by the number of dice.
                totalAverage += numDice * (numSides + 1) / 2;
            } else {
                // If not a die roll, it's a flat number (e.g., "5" or "-2")
                totalAverage += parseFloat(term) || 0;
            }
        }
        return totalAverage;
    }

    getTabName() {
        const tab = document.querySelector(`.nav-tab[data-set="${this.setId}"] .tab-name`);
        return tab ? tab.textContent : `Set ${this.setId}`;
    }


    setTabName(name) {
        const tab = document.querySelector(`.nav-tab[data-set="${this.setId}"] .tab-name`);
        if (tab) {
            tab.textContent = name;
        }
    }
}
