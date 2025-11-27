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
        this.spellDamageInput = get('spell-damage');
        this.casterLevelInput = get('caster-level');
        this.spellPowerInput = get('spell-power');
        this.spellCritChanceInput = get('spell-crit-chance');
        this.spellCritDamageInput = get('spell-crit-damage');
        this.targetMrrInput = get('target-mrr');
        this.empowerCheckbox = get('metamagic-empower');
        this.maximizeCheckbox = get('metamagic-maximize');
        this.calculateBtn = get('calculate-spell-btn');

        // Output elements
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
        }
    }

    _getInputs() {
        return {
            baseDamage: this.parseDiceNotation(this.spellDamageInput.value) || 0,
            casterLevel: parseInt(this.casterLevelInput.value) || 0,
            spellPower: parseInt(this.spellPowerInput.value) || 0,
            critChance: (parseFloat(this.spellCritChanceInput.value) || 0) / 100,
            critDamage: (parseFloat(this.spellCritDamageInput.value) || 0) / 100,
            targetMrr: parseInt(this.targetMrrInput.value) || 0,
            isEmpowered: this.empowerCheckbox.checked,
            isMaximized: this.maximizeCheckbox.checked,
        };
    }

    calculateSpellDamage() {
        const inputs = this._getInputs();

        let baseDamage = inputs.baseDamage;
        if (inputs.isMaximized) {
            // Assuming the dice notation is something like '10d6+50', we need to maximize the dice part.
            // This is a simplified maximization, assuming a single dice term.
            const diceMatch = this.spellDamageInput.value.match(/(\d+)d(\d+)/);
            if (diceMatch) {
                const numDice = parseInt(diceMatch[1]);
                const numSides = parseInt(diceMatch[2]);
                const flatPart = baseDamage - (numDice * (numSides + 1) / 2);
                baseDamage = (numDice * numSides) + flatPart;
            }
        }
        if (inputs.isEmpowered) {
            // Empower adds 75% to the base damage.
            baseDamage *= 1.75;
        }

        const spellPowerMultiplier = 1 + (inputs.spellPower / 100);
        const averageHit = baseDamage * spellPowerMultiplier;

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
        return state;
    }

    setState(state) {
        if (!state) return;

        const allInputs = document.querySelectorAll(`#calculator-set-${this.setId} input, #calculator-set-${this.setId} select`);
        allInputs.forEach(input => {
            const key = input.id.replace(`-set${this.setId}`, '');
            if (state.hasOwnProperty(key)) {
                if (input.type === 'checkbox') {
                    input.checked = state[key];
                } else {
                    input.value = state[key];
                }
            }
        });

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
