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
        this.casterLevelInput = get('caster-level');
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
            const firstInput = row.querySelector('input[id^="spell-damage-"]');
            if (firstInput) {
                const idNum = parseInt(firstInput.id.match(/spell-damage-(\d+)/)[1], 10);
                if (idNum > maxRowId) {
                    maxRowId = idNum;
                }
            }
        });
        const newRowId = maxRowId + 1;

        const newRow = document.createElement('div');
        newRow.className = 'input-group-row';
        newRow.innerHTML = `
            <label for="spell-damage-${newRowId}${this.idSuffix}">Base Damage ${newRowId}</label>
            <input type="text" id="spell-damage-${newRowId}${this.idSuffix}" value="0" title="The spell's base damage dice (e.g., 10d6+50)">
            <label for="spell-cl-scaling-${newRowId}${this.idSuffix}" class="short-label">CL Scale</label>
            <input type="text" id="spell-cl-scaling-${newRowId}${this.idSuffix}" value="0" class="small-input" title="Bonus damage dice per caster level (e.g., 1d6 per CL)">
            <button class="remove-row-btn" title="Remove this damage source">&times;</button>
        `;
        this.spellDamageRowsContainer.appendChild(newRow);
    }

    _getInputs() {
        const spellDamageSources = [];
        let i = 1;
        while (true) {
            const baseDmgInput = document.getElementById(`spell-damage-${i}${this.idSuffix}`);
            const clScalingInput = document.getElementById(`spell-cl-scaling-${i}${this.idSuffix}`);

            if (!baseDmgInput || !clScalingInput) break;

            spellDamageSources.push({
                base: this.parseDiceNotation(baseDmgInput.value),
                clScaled: this.parseDiceNotation(clScalingInput.value)
            });
            i++;
        }

        return {
            spellDamageSources: spellDamageSources,
            casterLevel: parseInt(this.casterLevelInput.value) || 0,
            spellPower: parseInt(this.spellPowerInput.value) || 0,
            critChance: (parseFloat(this.spellCritChanceInput.value) || 0) / 100,
            critDamage: (parseFloat(this.spellCritDamageInput.value) || 0) / 100,
            targetMrr: parseInt(this.targetMrrInput.value) || 0,
            isEmpowered: this.empowerCheckbox.checked,
            isMaximized: this.maximizeCheckbox.checked,
            isIntensified: this.intensifyCheckbox.checked,
        };
    }

    calculateSpellDamage() {
        const inputs = this._getInputs();

        let totalBaseDamage = 0;
        inputs.spellDamageSources.forEach(source => {
            totalBaseDamage += source.base;
            totalBaseDamage += (source.clScaled * inputs.casterLevel);
        });

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
        const averageHit = totalBaseDamage * spellPowerMultiplier;

        const critMultiplier = 2 + inputs.critDamage;
        const averageCrit = averageHit * critMultiplier;
        
        const totalAverage = (averageHit * (1 - inputs.critChance)) + (averageCrit * inputs.critChance);
        
        const mrrMitigation = totalAverage * (inputs.targetMrr / 100);
        const finalDamage = totalAverage - mrrMitigation;

        // Store for comparison table
        this.totalAverageDamage = finalDamage;

        // Update UI
        this.avgSpellDamageSpan.textContent = averageHit.toFixed(2);
        this.avgSpellCritDamageSpan.textContent = averageCrit.toFixed(2);
        this.totalAvgSpellDamageSpan.textContent = totalAverage.toFixed(2);
        this.mrrMitigationSpan.textContent = mrrMitigation.toFixed(2);
        this.finalSpellDamageSpan.textContent = finalDamage.toFixed(2);
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
        this.spellDamageRowsContainer.querySelectorAll('.input-group-row').forEach((row, index) => {
            const baseDmgInput = row.querySelector('input[id^="spell-damage-"]');
            const clScalingInput = row.querySelector('input[id^="spell-cl-scaling-"]');
            if (baseDmgInput && clScalingInput) {
                spellDamageSourcesState.push({
                    base: baseDmgInput.value,
                    clScaled: clScalingInput.value
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
            if (key.startsWith('spell-damage-') || key.startsWith('spell-cl-scaling-')) {
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
        // Clear existing rows first (except the first one if it's there and needs to be updated)
        let existingRows = this.spellDamageRowsContainer.querySelectorAll('.input-group-row');
        for (let i = existingRows.length - 1; i >= 1; i--) { // Keep the first row, remove others
            existingRows[i].remove();
        }

        if (state.spellDamageSources && state.spellDamageSources.length > 0) {
            // Update the first row if it exists
            const firstBaseDmgInput = document.getElementById(`spell-damage-1${this.idSuffix}`);
            const firstClScalingInput = document.getElementById(`spell-cl-scaling-1${this.idSuffix}`);
            if (firstBaseDmgInput && firstClScalingInput) {
                firstBaseDmgInput.value = state.spellDamageSources[0].base;
                firstClScalingInput.value = state.spellDamageSources[0].clScaled;
            } else { // If even the first row is missing, create it
                this.addSpellDamageRow(new Event('dummy'));
                document.getElementById(`spell-damage-1${this.idSuffix}`).value = state.spellDamageSources[0].base;
                document.getElementById(`spell-cl-scaling-1${this.idSuffix}`).value = state.spellDamageSources[0].clScaled;
            }

            // Add remaining rows
            for (let i = 1; i < state.spellDamageSources.length; i++) {
                this.addSpellDamageRow(new Event('dummy')); // Add a new row
                const newRowIndex = i + 1; // ID will be i+1
                document.getElementById(`spell-damage-${newRowIndex}${this.idSuffix}`).value = state.spellDamageSources[i].base;
                document.getElementById(`spell-cl-scaling-${newRowIndex}${this.idSuffix}`).value = state.spellDamageSources[i].clScaled;
            }
        } else if (existingRows.length === 1) { // If no saved sources but one default row exists, clear it
            document.getElementById(`spell-damage-1${this.idSuffix}`).value = "0";
            document.getElementById(`spell-cl-scaling-1${this.idSuffix}`).value = "0";
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
