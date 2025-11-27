// Wait for the entire page to load before running the script
document.addEventListener('DOMContentLoaded', () => {

let nextSetId = 1;

class Calculator {
    constructor(setId, manager, name) { // Add 'name' to the constructor
        this.setId = setId;
        // Properties to store calculation results for the comparison table
        this.totalAverageDamage = 0;
        this.totalAvgBaseHitDmg = 0;
        this.totalAvgSneakDmg = 0;
        this.totalAvgUnscaledDmg = 0; // New property for unscaled damage
        this.totalAvgImbueDmg = 0; // This will hold the sum of all unscaled sources

        this.idSuffix = `-set${setId}`;
        this.getElements();
        this.manager = manager;
        this.addEventListeners();
        // Dynamically count the number of unscaled rows present in the template/DOM.
        this.unscaledRowCount = this.unscaledRowsContainer.querySelectorAll('.input-group-row').length;
        
        this.recalculateHandler = this.handleInputChange.bind(this);
        // We will call the initial calculation from the manager
    }


    getElements() {
        const get = (baseId) => document.getElementById(baseId + this.idSuffix);

        this.weaponDiceInput = get('weapon-dice'); // For setId=1, suffix is '', gets 'weapon-dice'. For setId=2, suffix is '-set2', gets 'weapon-dice-set2'.
        this.weaponDamageInput = get('weapon-damage');
        this.bonusBaseDamageInput = get('bonus-base-damage');
        this.meleePowerInput = get('melee-power');
        this.spellPowerInput = get('spell-power');
        this.critThreatInput = get('crit-threat');
        this.critMultiplierInput = get('crit-multiplier');
        this.seekerDamageInput = get('seeker-damage');
        this.critMultiplier1920Input = get('crit-multiplier-19-20');
        this.sneakAttackDiceInput = get('sneak-attack-dice');
        this.sneakBonusInput = get('sneak-bonus');
        this.doublestrikeInput = get('doublestrike');
        this.isDoubleshotCheckbox = get('is-doubleshot');
        this.missThresholdInput = get('miss-threshold');
        this.grazeThresholdInput = get('graze-threshold');
        this.reaperSkullsSelect = get('reaper-skulls');
        this.grazePercentInput = get('graze-percent');
        this.imbueDiceCountInput = get('imbue-dice-count');
        this.imbueDieTypeInput = get('imbue-die-type');
        this.imbueScalingInput = get('imbue-scaling');
        this.imbueUsesSpellpowerCheckbox = get('imbue-uses-spellpower');
        this.imbueCritsCheckbox = get('imbue-crits');
        this.calculateBtn = get('calculate-btn');
        this.avgBaseDamageSpan = get('avg-base-damage');
        this.avgSneakDamageSpan = get('avg-sneak-damage');
        this.avgImbueDamageSpan = get('avg-imbue-damage');
        this.avgUnscaledDamageSpan = get('avg-unscaled-damage'); // Get the new summary span
        this.totalAvgDamageSpan = get('total-avg-damage');
        this.weaponScalingSpan = get('weapon-scaling');
        this.sneakScalingSpan = get('sneak-scaling');
        this.imbueScalingBreakdownSpan = get('imbue-scaling-breakdown');
        this.imbuePowerSourceSpan = get('imbue-power-source');
        this.summaryHeader = get('summary-header');
        this.reaperPenaltySpan = get('reaper-penalty');
        this.rollDamageTbody = get('roll-damage-tbody');
        
        // Preset buttons
        this.set75ScalingBtn = get('set-75-scaling-btn');
        this.set100ScalingBtn = get('set-100-scaling-btn');
        this.set150ScalingBtn = get('set-150-scaling-btn');
        this.set200ScalingBtn = get('set-200-scaling-btn');
        
        this.unscaledRowsContainer = get('unscaled-rows-container');
        this.addUnscaledRowBtn = get('add-unscaled-row-btn');
    }

    /**
     * Parses a dice notation string (e.g., "2d6") and returns its average value.
     * Also handles flat numbers.
     * @param {string} diceString - The string to parse, like "1d8", "3d6", or "4.5".
     * @returns {number} The calculated average damage.
     */
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

    /**
     * Parses the critical threat input, which can be a number (e.g., "5")
     * or a range (e.g., "16-20").
     * @param {string} threatString - The value from the crit threat input field.
     * @returns {number} The size of the threat range.
     */
    parseThreatRange(threatString) {
        const cleanString = (threatString || '').trim();
        
        if (cleanString.includes('-')) {
            const parts = cleanString.split('-');
            if (parts.length === 2) {
                const start = parseInt(parts[0], 10);
                const end = parseInt(parts[1], 10);
                // Check for valid numbers and a valid DDO range (e.g., 16-20, not 20-16)
                if (!isNaN(start) && !isNaN(end) && start <= end && start >= 1 && end <= 20) {
                    return end - start + 1;
                }
            }
        } else {
            const rangeSize = parseInt(cleanString, 10);
            if (!isNaN(rangeSize) && rangeSize >= 1 && rangeSize <= 20) {
                return rangeSize;
            }
        }
        return 1; // Default to a range of 1 (a roll of 20) if input is invalid
    }

    /**
     * Gathers all raw input values from the DOM.
     * @returns {object} An object containing all necessary input values for calculation.
     */
    _getInputs() {
        const isDoubleshot = this.isDoubleshotCheckbox.checked;
        let multiStrikeValue = parseFloat(this.doublestrikeInput.value) || 0;
        if (!isDoubleshot) {
            multiStrikeValue = Math.min(multiStrikeValue, 100);
        }

        return {
            additionalWeaponDice: parseInt(this.weaponDiceInput.value) || 0,
            parsedWeaponDmg: this.parseDiceNotation(this.weaponDamageInput.value) || 0,
            bonusBaseDmg: parseFloat(this.bonusBaseDamageInput.value) || 0,
            meleePower: parseFloat(this.meleePowerInput.value) || 0,
            spellPower: parseFloat(this.spellPowerInput.value) || 0,
            threatRange: this.parseThreatRange(this.critThreatInput.value),
            critMult: parseFloat(this.critMultiplierInput.value) || 2,
            critMult1920: parseFloat(this.critMultiplier1920Input.value) || 0,
            seekerDmg: this.parseDiceNotation(this.seekerDamageInput.value), // Allow dice notation for seeker
            sneakDiceCount: parseInt(this.sneakAttackDiceInput.value) || 0,
            sneakBonusDmg: parseFloat(this.sneakBonusInput.value) || 0,
            missThreshold: Math.max(1, parseInt(this.missThresholdInput.value) || 1),
            grazeThreshold: parseInt(this.grazeThresholdInput.value) || 0,
            grazePercent: (parseFloat(this.grazePercentInput.value) || 0) / 100,
            reaperSkulls: parseInt(this.reaperSkullsSelect.value) || 0,
            imbueDiceCount: parseInt(this.imbueDiceCountInput.value) || 0,
            imbueDieType: parseInt(this.imbueDieTypeInput.value) || 0,
            imbueScaling: (parseFloat(this.imbueScalingInput.value) || 100) / 100,
            imbueCrits: this.imbueCritsCheckbox.checked,
            imbueUsesSpellpower: this.imbueUsesSpellpowerCheckbox.checked,
            doublestrikeChance: multiStrikeValue / 100,
            isDoubleshot: isDoubleshot,
            unscaled: this._parseUnscaledDamage()
        };
    }

    /**
     * Parses all unscaled damage rows and categorizes them.
     * @returns {object} An object containing categorized unscaled damage values.
     */
    _parseUnscaledDamage() {
        const unscaled = {
            normal_multi: 0,
            normal_noMulti: 0,
            crit_multi: 0,
            crit_noMulti: 0
        };

        let i = 1;
        while (true) {
            const dmgInput = document.getElementById(`unscaled-damage-${i}${this.idSuffix}`);
            if (!dmgInput) break;

            const procInput = document.getElementById(`unscaled-proc-chance-${i}${this.idSuffix}`);
            const multiStrikeCheckbox = document.getElementById(`unscaled-doublestrike-${i}${this.idSuffix}`);
            const onCritCheckbox = document.getElementById(`unscaled-on-crit-${i}${this.idSuffix}`);

            if (procInput && multiStrikeCheckbox && onCritCheckbox) {
                const damage = this.parseDiceNotation(dmgInput.value);
                const procChance = (parseFloat(procInput.value) || 100) / 100;
                const averageDamage = damage * procChance;

                if (multiStrikeCheckbox.checked) {
                    if (onCritCheckbox.checked) unscaled.crit_multi += averageDamage;
                    else unscaled.normal_multi += averageDamage;
                } else {
                    if (onCritCheckbox.checked) unscaled.crit_noMulti += averageDamage;
                    else unscaled.normal_noMulti += averageDamage;
                }
            }
            i++;
        }
        return unscaled;
    }

    /**
     * Calculates the probabilities of different hit outcomes based on d20 rolls.
     * @param {object} inputs - The object containing miss, graze, and crit thresholds.
     * @returns {object} An object with probabilities for each outcome.
     */
    _calculateProbabilities(inputs) {
        const { missThreshold, grazeThreshold, threatRange } = inputs;
        const critStartRoll = 21 - threatRange;
        let missChance = 0, grazeChance = 0, normalCritChance = 0, specialCritChance = 0, normalChance = 0;

        for (let roll = 1; roll <= 20; roll++) {
            if (roll <= missThreshold) missChance++;
            else if (roll <= grazeThreshold) grazeChance++;
            else if (roll >= 19 && roll >= critStartRoll) specialCritChance++;
            else if (roll >= critStartRoll) normalCritChance++;
            else normalChance++;
        }

        return {
            miss: missChance / 20,
            graze: grazeChance / 20,
            normal: normalChance / 20,
            normalCrit: normalCritChance / 20,
            specialCrit: specialCritChance / 20,
            crit: (normalCritChance + specialCritChance) / 20,
            hit: (normalChance + normalCritChance + specialCritChance) / 20
        };
    }

    /**
     * Calculates the base damage values for each component before applying probabilities or multipliers.
     * @param {object} inputs - The object containing all raw input values.
     * @returns {object} An object containing the calculated damage portions.
     */
    _calculateDamagePortions(inputs) {
        const {
            additionalWeaponDice, parsedWeaponDmg, bonusBaseDmg, meleePower, spellPower,
            seekerDmg, sneakDiceCount, sneakBonusDmg, imbueDiceCount, imbueDieType,
            imbueScaling, imbueUsesSpellpower
        } = inputs;

        const baseDmg = parsedWeaponDmg + (additionalWeaponDice * parsedWeaponDmg) + bonusBaseDmg;
        const powerMultiplier = 1 + (meleePower / 100);
        const weaponPortion = baseDmg * powerMultiplier;
        const seekerPortion = seekerDmg * powerMultiplier;

        const sneakDiceDmg = sneakDiceCount * 3.5;
        const sneakPortion = (sneakDiceDmg + sneakBonusDmg) * (1 + (meleePower * 1.5) / 100);

        const imbueDice = imbueDiceCount * (imbueDieType + 1) / 2;
        const powerForImbue = imbueUsesSpellpower ? spellPower : meleePower;
        const imbuePortion = imbueDice * (1 + (powerForImbue * imbueScaling) / 100);

        return { baseDmg, weaponPortion, seekerPortion, sneakDiceDmg, sneakPortion, imbueDice, imbuePortion, powerForImbue };
    }

    /**
     * Calculates the final average damage values by combining portions, probabilities, and multipliers.
     * @param {object} portions - The calculated damage portions.
     * @param {object} probabilities - The calculated outcome probabilities.
     * @param {object} inputs - The raw input values.
     * @returns {object} An object containing the final average damage for each component.
     */
    _calculateAverages(portions, probabilities, inputs) {
        const { critMult, critMult1920, grazePercent, reaperSkulls, doublestrikeChance, imbueCrits, unscaled } = inputs;
        const { weaponPortion, seekerPortion, sneakPortion, imbuePortion } = portions;

        const finalCritMult1920 = critMult + critMult1920;
        const multiStrikeMultiplier = 1 + doublestrikeChance;

        let reaperMultiplier = 1.0;
        if (reaperSkulls > 0) {
            if (reaperSkulls <= 6) reaperMultiplier = 20 / ((reaperSkulls ** 2) + reaperSkulls + 24);
            else reaperMultiplier = 5 / (4 * reaperSkulls - 8);
        }

        const avgBaseHitDmg =
            (((weaponPortion + seekerPortion) * finalCritMult1920) * probabilities.specialCrit) +
            (((weaponPortion + seekerPortion) * critMult) * probabilities.normalCrit) +
            (weaponPortion * probabilities.normal) +
            (weaponPortion * grazePercent * probabilities.graze);

        const avgSneakDmg = sneakPortion * (1 - probabilities.miss);
        const avgImbueDmg = imbuePortion * (probabilities.hit + (imbueCrits ? probabilities.crit : 0));

        const avgUnscaledNormal = ((unscaled.normal_multi * multiStrikeMultiplier) + unscaled.normal_noMulti) * probabilities.hit * reaperMultiplier;
        const avgUnscaledCrit = (((unscaled.crit_multi * multiStrikeMultiplier) + unscaled.crit_noMulti) * reaperMultiplier) * probabilities.crit;

        return {
            base: avgBaseHitDmg * multiStrikeMultiplier * reaperMultiplier,
            sneak: avgSneakDmg * multiStrikeMultiplier * reaperMultiplier,
            imbue: avgImbueDmg * multiStrikeMultiplier * reaperMultiplier,
            unscaled: avgUnscaledNormal + avgUnscaledCrit,
            reaperMultiplier,
            multiStrikeMultiplier
        };
    }

    /**
     * Updates the summary and breakdown sections of the UI with calculated results.
     * @param {object} averages - The final average damage values.
     * @param {object} portions - The calculated damage portions.
     * @param {object} inputs - The raw input values.
     */
    _updateSummaryUI(averages, portions, inputs) {
        this.avgBaseDamageSpan.textContent = averages.base.toFixed(2);
        this.avgSneakDamageSpan.textContent = averages.sneak.toFixed(2);
        this.avgImbueDamageSpan.textContent = averages.imbue.toFixed(2);
        this.avgUnscaledDamageSpan.textContent = averages.unscaled.toFixed(2);
        this.totalAvgDamageSpan.textContent = this.totalAverageDamage.toFixed(2);

        const { baseDmg, sneakDiceDmg, sneakPortion, imbueDice, imbuePortion, powerForImbue } = portions;
        const { meleePower, sneakBonusDmg, imbueScaling, imbueUsesSpellpower, spellPower } = inputs;

        this.weaponScalingSpan.textContent = `${baseDmg.toFixed(2)} * (1 + (${meleePower} / 100)) = ${portions.weaponPortion.toFixed(2)}`;
        this.sneakScalingSpan.textContent = `(${sneakDiceDmg.toFixed(2)} + ${sneakBonusDmg.toFixed(2)}) * (1 + (${meleePower} * 1.5) / 100) = ${sneakPortion.toFixed(2)}`;
        this.imbueScalingBreakdownSpan.textContent = `${imbueDice.toFixed(2)} * (1 + (${powerForImbue} * ${imbueScaling * 100}%) / 100) = ${imbuePortion.toFixed(2)}`;
        this.imbuePowerSourceSpan.textContent = imbueUsesSpellpower ? `Spell Power (${spellPower})` : `Melee Power (${meleePower})`;
        this.reaperPenaltySpan.textContent = `${((1 - averages.reaperMultiplier) * 100).toFixed(1)}% Reduction`;
    }

    calculateDdoDamage() {
        // 1. Gather all data
        const inputs = this._getInputs();

        // 2. Calculate probabilities of outcomes
        const probabilities = this._calculateProbabilities(inputs);

        // 3. Calculate base damage for each component
        const portions = this._calculateDamagePortions(inputs);

        // 4. Calculate final average damage, applying probabilities and multipliers
        const averages = this._calculateAverages(portions, probabilities, inputs);

        // 5. Store results on the instance for the comparison table
        this.totalAvgBaseHitDmg = averages.base;
        this.totalAvgSneakDmg = averages.sneak;
        this.totalAvgImbueDmg = averages.imbue;
        this.totalAvgUnscaledDmg = averages.unscaled;

        // Calculate the grand total average damage
        this.totalAverageDamage = this.totalAvgBaseHitDmg + this.totalAvgSneakDmg + this.totalAvgImbueDmg + this.totalAvgUnscaledDmg;

        // 6. Update the UI with all the calculated values
        this._updateSummaryUI(averages, portions, inputs);

        // 7. Update the per-roll breakdown table
        const critStartRoll = 21 - inputs.threatRange;
        const finalCritMult1920 = inputs.critMult + inputs.critMult1920;
        this.updateRollDamageTable({
            ...inputs,
            ...portions,
            ...averages,
            critStartRoll,
            finalCritMult1920,
            unscaled_normal_multi: inputs.unscaled.normal_multi,
            unscaled_normal_noMulti: inputs.unscaled.normal_noMulti,
            unscaled_crit_multi: inputs.unscaled.crit_multi,
            unscaled_crit_noMulti: inputs.unscaled.crit_noMulti
        });
    }

    /**
     * Populates the results table with damage for each d20 roll.
     */
    updateRollDamageTable(params) {
        const { missThreshold, grazeThreshold, critStartRoll, weaponPortion, seekerPortion, sneakPortion, imbuePortion, imbueCrits, grazePercent, critMult, finalCritMult1920, multiStrikeMultiplier, reaperMultiplier, unscaled_normal_multi, unscaled_normal_noMulti, unscaled_crit_multi, unscaled_crit_noMulti } = params;
        // Clear any existing rows from the table
        this.rollDamageTbody.innerHTML = '';

        for (let roll = 1; roll <= 20; roll++) {
            let baseDmg = 0, sneakDmg = 0, imbueDmg = 0;
            let rowClass = '';
            let outcome = '';

            if (roll <= missThreshold) { // Miss
                baseDmg = 0;
                sneakDmg = 0;
                imbueDmg = 0;
                outcome = 'Miss';
            } else if (roll <= grazeThreshold) { // Graze
                baseDmg = weaponPortion * grazePercent;
                sneakDmg = sneakPortion; // Sneak applies on graze
                imbueDmg = 0; // Imbue does not apply on graze
                rowClass = 'graze-row';
                outcome = 'Graze';
            } else if (roll >= 19 && roll >= critStartRoll) { // Special 19-20 Critical Hit
                baseDmg = (weaponPortion + seekerPortion) * finalCritMult1920;
                sneakDmg = sneakPortion;
                imbueDmg = imbuePortion * (1 + (imbueCrits ? 1 : 0));
                rowClass = 'crit-row';
                outcome = 'Critical';
            } else if (roll >= critStartRoll) { // Critical Hit
                baseDmg = (weaponPortion + seekerPortion) * critMult;
                sneakDmg = sneakPortion;
                imbueDmg = imbuePortion * (1 + (imbueCrits ? 1 : 0));
                rowClass = 'crit-row';
                outcome = 'Critical';
            } else { // Normal Hit
                baseDmg = weaponPortion;
                sneakDmg = sneakPortion;
                imbueDmg = imbuePortion;
                outcome = 'Hit';
            }

            // Apply multi-strike multiplier to each component
            const finalBase = baseDmg * multiStrikeMultiplier * reaperMultiplier;
            const finalSneak = sneakDmg * multiStrikeMultiplier * reaperMultiplier;
            const finalImbue = imbueDmg * multiStrikeMultiplier * reaperMultiplier;
            
            let finalUnscaled = 0;
            if (outcome === 'Hit' || outcome === 'Critical') {
                finalUnscaled += ((unscaled_normal_multi * multiStrikeMultiplier) + unscaled_normal_noMulti) * reaperMultiplier;
            }
            if (outcome === 'Critical') {
                finalUnscaled += (((unscaled_crit_multi * multiStrikeMultiplier) + unscaled_crit_noMulti) * reaperMultiplier);
            }
            const totalDamage = finalBase + finalSneak + finalImbue + finalUnscaled;

            // Create row and cells programmatically to prevent XSS.
            const row = document.createElement('tr');
            if (rowClass) {
                row.className = rowClass;
            }

            const createCell = (text) => {
                const cell = document.createElement('td');
                cell.textContent = text;
                return cell;
            };

            row.appendChild(createCell(roll));
            row.appendChild(createCell(finalBase.toFixed(2)));
            row.appendChild(createCell(finalSneak.toFixed(2)));
            row.appendChild(createCell(finalImbue.toFixed(2)));
            row.appendChild(createCell(finalUnscaled.toFixed(2)));
            row.appendChild(createCell(totalDamage.toFixed(2)));
            row.appendChild(createCell(outcome));

            this.rollDamageTbody.appendChild(row);
        }
    }

    handleInputChange(action = null) {
        if (action) this.manager.recordAction(action);
        this.calculateDdoDamage();
        this.manager.updateComparisonTable();
        this.manager.saveState();
    }

    addEventListeners() {
        this.calculateBtn.addEventListener('click', () => this.calculateDdoDamage());

        // Add listeners for preset scaling buttons
        // These are simple and don't need complex removal logic if the whole set is destroyed.
        this.set75ScalingBtn?.addEventListener('click', (e) => this.handleSetScalingClick(e, 75));
        this.set100ScalingBtn?.addEventListener('click', (e) => this.handleSetScalingClick(e, 100));
        this.set150ScalingBtn?.addEventListener('click', (e) => this.handleSetScalingClick(e, 150));
        this.set200ScalingBtn?.addEventListener('click', (e) => this.handleSetScalingClick(e, 200));

        const calculatorElement = document.getElementById(`calculator-set-${this.setId}`);
        let oldValue = null;

        if (calculatorElement) {
            // Use 'mousedown' to capture the value right before a change might occur.
            // This works for clicks, typing, and stepper buttons.
            calculatorElement.addEventListener('mousedown', (e) => {
                const targetTag = e.target.tagName;
                if (targetTag === 'INPUT' || targetTag === 'SELECT') {
                    oldValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                }
            });

            // Use 'input' for text/number fields as it fires immediately.
            // Use 'change' for checkboxes.
            const recordChange = (e) => {
                const targetTag = e.target.tagName;
                if (targetTag === 'INPUT' || targetTag === 'SELECT') {
                    const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                    // Only record if the value actually changed.
                    if (oldValue !== newValue) {
                        const action = {
                            type: 'VALUE_CHANGE',
                            setId: this.setId,
                            inputId: e.target.id,
                            oldValue: oldValue,
                            newValue: newValue
                        };
                        this.handleInputChange(action);
                        // CRITICAL FIX: Update oldValue after recording the change.
                        oldValue = newValue;
                    }
                }
            };
            calculatorElement.addEventListener('input', recordChange);
            calculatorElement.addEventListener('change', recordChange);

            // Add a 'blur' event listener to the container to catch when a user leaves an input.
            // This will set empty number fields to 0 for a better user experience.
            calculatorElement.addEventListener('blur', (e) => {
                const input = e.target;
                // Check if the target is a number input and its value is empty.
                const isNumericInput = input.type === 'number';
                // Also check for text inputs that are used for damage notation.
                const isDamageText = input.type === 'text' && (input.id.includes('unscaled-damage') || input.id.includes('weapon-damage'));

                if (input.tagName === 'INPUT' && (isNumericInput || isDamageText) && input.value.trim() === '') {
                    input.value = '0';

                    // Manually trigger a 'change' event so the new '0' value is calculated and saved.
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, true); // Use event capturing.
        }

         // Listener for adding a new unscaled damage row
        this.addUnscaledRowBtn.addEventListener('click', (e) => this.addUnscaledDamageRow(e));

        // Use event delegation for remove buttons. This single listener handles all
        // and for number input +/- buttons.
        // current and future remove buttons within this container.
        this.unscaledRowsContainer.addEventListener('click', (e) => {
            // Check if a remove button was clicked
            if (e.target && e.target.classList.contains('remove-row-btn')) {
                e.preventDefault();
                // Find the closest parent row and remove it
                e.target.closest('.input-group-row').remove();
                // Trigger a recalculation and save state
                this.handleInputChange(); // This doesn't need an action, as removing rows isn't undoable (yet)
            }
        });

    }

    addUnscaledDamageRow(e) {
        e.preventDefault(); // Prevent any default button behavior

        // Find the highest existing row number to avoid ID conflicts after removals
        let maxRowId = 0;
        this.unscaledRowsContainer.querySelectorAll('.input-group-row').forEach(row => {
            const firstInput = row.querySelector('input[id^="unscaled-damage-"]');
            if (firstInput) {
                const idNum = parseInt(firstInput.id.match(/unscaled-damage-(\d+)/)[1], 10);
                if (idNum > maxRowId) {
                    maxRowId = idNum;
                }
            }
        });
        const newRowId = maxRowId + 1;

        const newRow = document.createElement('div');
        newRow.className = 'input-group-row';
        newRow.innerHTML = `
            <label for="unscaled-damage-${newRowId}${this.idSuffix}">Unscaled Damage ${newRowId}</label>
            <input type="text" id="unscaled-damage-${newRowId}${this.idSuffix}" value="0" title="Additional source of unscaled damage">
            <label for="unscaled-proc-chance-${newRowId}${this.idSuffix}" class="short-label">Proc %</label><input type="number" id="unscaled-proc-chance-${newRowId}${this.idSuffix}" value="100" min="0" max="100" class="small-input" title="Chance for this damage to occur on a hit">
            <input type="checkbox" id="unscaled-doublestrike-${newRowId}${this.idSuffix}" checked><label for="unscaled-doublestrike-${newRowId}${this.idSuffix}" class="inline-checkbox-label" title="Should this damage scale with Doublestrike/Doubleshot?">Multi-Strike</label>
            <input type="checkbox" id="unscaled-on-crit-${newRowId}${this.idSuffix}"><label for="unscaled-on-crit-${newRowId}${this.idSuffix}" class="inline-checkbox-label" title="Should this damage only apply on a critical hit?">On Crit</label>
            <button class="remove-row-btn" title="Remove this damage source">&times;</button>                
        `;

        this.unscaledRowsContainer.appendChild(newRow);

        // Add the change listener to all new inputs in the row
        // Event delegation on the container handles these new inputs automatically.
    }

    removeEventListeners() {
        // Remove listeners from all inputs
        const calculatorElement = document.getElementById(`calculator-set-${this.setId}`);
        if (calculatorElement) {
            const allInputs = calculatorElement.querySelectorAll('input');
            // Event listeners are on the container, which gets removed, so no need to manually remove them.
        }
        // With event delegation, we don't need to remove listeners from individual inputs.
        // The listeners are on the container, which gets removed from the DOM entirely
        // when a set is deleted, cleaning up the listeners automatically.
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

    // Retrieves the current name of the tab for this calculator instance
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

    setState(state) {
        if (!state) return;

        const allInputs = document.querySelectorAll(`#calculator-set-${this.setId} input, #calculator-set-${this.setId} select`);
        allInputs.forEach(input => {
            const key = input.id.replace(`-set${this.setId}`, '');
            if (!state.hasOwnProperty(key)) {
                // If the key isn't in the state, it might be a dynamically added row that needs creating.
                if (key.startsWith('unscaled-damage-')) {
                    const rowNum = parseInt(key.match(/unscaled-damage-(\d+)/)[1], 10);
                    // Check if this row exists. If not, create it.
                    if (!document.getElementById(input.id)) {
                        this.addUnscaledDamageRow(new Event('dummy')); // Pass a dummy event
                    }
                } else {
                    return; // Skip other inputs not in state
                }
            }

            // If the key exists in the state, apply it
            if (input.type === 'checkbox') {
                input.checked = state[key];
            } else {
                input.value = state[key];
            }
        });

        // After loading state, count how many unscaled rows we have and update the counter
        const unscaledDamageKeys = Object.keys(state).filter(k => k.startsWith('unscaled-damage-'));
        this.unscaledRowCount = unscaledDamageKeys.length;


        // After setting state, recalculate to update results
        this.calculateDdoDamage();
    }

    applyValueChange(inputId, value) {
        const input = document.getElementById(inputId);
        if (!input) return;

        if (input.type === 'checkbox') {
            input.checked = value;
        } else {
            input.value = value;
        }
        // We don't record an action here because this is part of an undo/redo operation.
        // We just recalculate and save the new overall state.
        this.handleInputChange();
    }

    updateSummaryHeader() {
        const tabName = this.getTabName();
        if (this.summaryHeader) {
            this.summaryHeader.textContent = `Summary of ${tabName}`;
        }
    }

    handleSetScalingClick(e, value) {
        e.preventDefault();
        this.imbueScalingInput.value = value;
        // Manually trigger a change event so the calculation updates and state is saved
        const changeEvent = new Event('change', { bubbles: true });
        this.imbueScalingInput.dispatchEvent(changeEvent);
    }
}

class CalculatorManager {
    constructor() {
        this.calculators = new Map();
        this.navContainer = document.querySelector('.set-navigation');
        this.setsContainer = document.querySelector('.calculator-wrapper');
        this.addSetBtn = document.getElementById('add-set-btn');
        this.addSpellSetBtn = document.getElementById('add-spell-set-btn');
        this.comparisonTbody = document.getElementById('comparison-tbody'); // This is fine
        this.templateHTML = this.getTemplateHTML();

        // Import/Export Modal Elements
        this.importBtn = document.getElementById('import-btn');
        this.exportBtn = document.getElementById('export-btn');
        this.modalBackdrop = document.getElementById('modal-backdrop');
        this.modalTitle = document.getElementById('modal-title');
        this.modalDescription = document.getElementById('modal-description');
        this.modalTextarea = document.getElementById('modal-textarea');
        this.modalCopyBtn = document.getElementById('modal-copy-btn');
        this.modalSaveFileBtn = document.getElementById('modal-save-file-btn');
        this.modalLoadBtn = document.getElementById('modal-load-btn');
        this.modalFileInput = document.getElementById('modal-file-input');
        this.formatJsonBtn = document.getElementById('format-json-btn');
        this.formatSummaryBtn = document.getElementById('format-summary-btn');
        this.modalCloseBtn = document.getElementById('modal-close-btn');

        // Undo/Redo stacks
        this.undoStack = [];
        this.redoStack = [];

        this.activeSetId = 1;

        this.addSetBtn.addEventListener('click', () => this.addNewSet());
        this.addSpellSetBtn.addEventListener('click', () => this.addNewSpellSet());
        // Try to load state. If it fails (e.g., first visit), create the initial set.
        if (!this.loadState()) {
            this.addNewSet(1);
            this.calculators.get(1)?.calculateDdoDamage(); // Perform initial calculation
        }

        this.addDragAndDropListeners();
        this.addImportExportListeners();
        this.addUndoRedoListeners();
    }


    addNewSet(setIdToUse = null) {
        if (this.calculators.size >= 6) {
            alert("You have reached the maximum of 6 weapon sets.");
            return;
        }

        // If this is a user action (not part of loading or undo), record it.
        if (setIdToUse === null) {
            // We need to know the ID before creating it.
            const futureSetId = this.findNextAvailableId();
            this.recordAction({ type: 'add', setId: futureSetId });
        }

        // Get the state of the currently active set to copy it
        const activeCalc = this.calculators.get(this.activeSetId);
        const stateToCopy = (setIdToUse === null && activeCalc) ? activeCalc.getState() : null; // Only copy state if creating a new set from an existing one

        let newSetId;
        if (setIdToUse !== null) {
            newSetId = setIdToUse;
            // Ensure the global nextSetId counter is always ahead of the largest known ID.
            // This prevents ID collisions when adding a new set after loading a specific set.
            if (newSetId >= nextSetId) {
                nextSetId = newSetId + 1;
            }
        } else {
            newSetId = this.findNextAvailableId();
        }
        
        /*
         * ===================================================================================
         *   ** FIX FOR DYNAMIC SET CREATION **
         *
         *   PREVIOUS ISSUE: Cloning was done using the .outerHTML of the first set.
         *   This included the container div ('<div id="calculator-set-1">...</div>').
         *   The ID replacement logic would then incorrectly create a new container with an ID like
         *   "calculator-set-set2" instead of the expected "calculator-set-2". This caused
         *   all subsequent DOM lookups for the new set to fail, making it unresponsive.
         *
         *   THE FIX:
         *   The current implementation correctly uses the .innerHTML of the template, which excludes the container.
         *   A new container 'div' is created programmatically, and its ID is set explicitly. This ensures
         *   that new sets have the correct structure and IDs, allowing them to be managed properly.
         * ===================================================================================
        */

        // Get the inner HTML of the template set (calculator-set-1)
        const templateNode = document.getElementById('calculator-set-template').content.cloneNode(true);

        // Replace IDs and 'for' attributes within the inner HTML
        // Use a more specific regex to avoid accidentally modifying class names that contain "id=".
        let modifiedInnerHtml = templateNode.firstElementChild.outerHTML.replace(/\s(id)="([^"]+)"/g, (match, attr, id) => {
            // For inner elements, the original ID (e.g., "weapon-dice") is the base ID.
            // We just append the newSetId suffix.
            return ` id="${id}-set${newSetId}"`;
        });
        modifiedInnerHtml = modifiedInnerHtml.replace(/for="([^"]+)"/g, (match, id) => {
            return `for="${id}-set${newSetId}"`;
        });

        // Create the new container div and set its properties
        const newSetContainer = document.createElement('div');
        newSetContainer.id = `calculator-set-${newSetId}`; // e.g., calculator-set-2
        newSetContainer.className = 'calculator-container calculator-set'; // Copy classes from template
        newSetContainer.innerHTML = modifiedInnerHtml; // Set the modified inner HTML

        // Append the new container to the DOM
        this.setsContainer.appendChild(newSetContainer);

        // Create and add the new tab
        const tab = this.createTab(newSetId);
        this.navContainer.insertBefore(tab, this.addSetBtn);

        this.calculators.set(newSetId, new Calculator(newSetId, this, `Set ${newSetId}`));
        const newCalc = this.calculators.get(newSetId);

        // If we have a state to copy, apply it to the new set
        if (stateToCopy && newCalc) {
            newCalc.setState(stateToCopy);
        }

        this.switchToSet(newSetId);
        if (!this.isLoading) {
            this.saveState();
        }
        this.updateComparisonTable();
    }

    addNewSpellSet(setIdToUse = null) {
        if (this.calculators.size >= 6) {
            alert("You have reached the maximum of 6 sets.");
            return;
        }

        let newSetId;
        if (setIdToUse !== null) {
            newSetId = setIdToUse;
            if (newSetId >= nextSetId) {
                nextSetId = newSetId + 1;
            }
        } else {
            newSetId = this.findNextAvailableId();
        }

        const templateNode = document.getElementById('spell-calculator-template').content.cloneNode(true);

        let modifiedInnerHtml = templateNode.firstElementChild.outerHTML.replace(/\s(id)="([^"]+)"/g, (match, attr, id) => {
            return ` id="${id}-set${newSetId}"`;
        });
        modifiedInnerHtml = modifiedInnerHtml.replace(/for="([^"]+)"/g, (match, id) => {
            return `for="${id}-set${newSetId}"`;
        });

        const newSetContainer = document.createElement('div');
        newSetContainer.id = `calculator-set-${newSetId}`;
        newSetContainer.className = 'calculator-container calculator-set';
        newSetContainer.innerHTML = modifiedInnerHtml;

        this.setsContainer.appendChild(newSetContainer);

        const tab = this.createTab(newSetId);
        this.navContainer.insertBefore(tab, this.addSetBtn);

        this.calculators.set(newSetId, new SpellCalculator(newSetId, this, `Spell Set ${newSetId}`));
        
        this.switchToSet(newSetId);
        if (!this.isLoading) {
            this.saveState();
        }
        this.updateComparisonTable();
    }

    createTab(setId) {
        const tab = document.createElement('div');
        tab.className = 'nav-tab';
        tab.draggable = true; // Make the tab draggable
        tab.dataset.set = setId;

        const tabNameSpan = document.createElement('span');
        tabNameSpan.className = 'tab-name';
        tabNameSpan.textContent = `Set ${setId}`;
        tabNameSpan.contentEditable = true;
        tabNameSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                tabNameSpan.blur();
            }
        });
        tabNameSpan.addEventListener('blur', () => {
            const calc = this.calculators.get(setId);
            if (calc) {
                if (calc instanceof Calculator) {
                    calc.handleInputChange();
                } else {
                    calc.calculateSpellDamage();
                }
                if (this.activeSetId === setId) {
                    calc.updateSummaryHeader();
                }
            }
        });

        // We'll handle recording the name change via focus/blur on the span
        this.addNameChangeListeners(tabNameSpan, setId);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-tab-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = 'Remove this set';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent tab switch when closing
            this.removeSet(setId);
        });

        tab.appendChild(tabNameSpan);
        tab.appendChild(closeBtn);
        tab.addEventListener('click', () => this.switchToSet(setId));
        return tab;
    }

    addNameChangeListeners(span, setId) {
        let oldName = '';
        span.addEventListener('focus', () => {
            oldName = span.textContent;
        });
        span.addEventListener('blur', () => {
            const newName = span.textContent;
            if (oldName !== newName) {
                this.recordAction({
                            type: 'RENAME',
                    setId: setId,
                    oldValue: oldName,
                    newValue: newName
                });
                // Trigger a save and update
                const calc = this.calculators.get(setId);
                if (calc) {
                    if (calc instanceof Calculator) {
                        calc.handleInputChange();
                    } else {
                        calc.calculateSpellDamage();
                    }
                    if (this.activeSetId === setId) calc.updateSummaryHeader();
                }
            }
        });
    }

    recreateSet(setId, state, index) {
        if (state.type === 'spell') {
            this.addNewSpellSet(setId);
        } else {
            this.addNewSet(setId);
        }
        const newCalc = this.calculators.get(setId);
        if (newCalc) {
            newCalc.setState(state);
            newCalc.setTabName(state.tabName);
            if (newCalc instanceof Calculator) {
                newCalc.updateSummaryHeader();
            }
        }
        // When undoing a tab closure, we don't want to automatically switch to it.
        // We'll just make sure the currently active tab remains visibly active.
        // The new tab will be created but won't be active unless it was the only one.
        this.switchToSet(this.activeSetId || setId);
    }

    removeSet(setId, isLoading = false) {
        if (this.calculators.size <= 1) {
            // Allow removing the last set.
        }

        // Clean up
        const calcToRemove = this.calculators.get(setId);

        // If this is a user action (not part of loading or undo), record it.
        if (!isLoading) {
            const state = calcToRemove.getState();
            state.tabName = calcToRemove.getTabName();
            const tabs = [...this.navContainer.querySelectorAll('.nav-tab')];
            const index = tabs.findIndex(tab => parseInt(tab.dataset.set, 10) === setId);

                    this.recordAction({ type: 'REMOVE_SET', setId, state, index });
        }

        if (calcToRemove instanceof Calculator) {
            calcToRemove?.removeEventListeners();
        }
        this.calculators.delete(setId);

        document.getElementById(`calculator-set-${setId}`).remove();
        document.querySelector(`.nav-tab[data-set="${setId}"]`).remove();

        // If we deleted the active tab, switch to a new one
        if (this.activeSetId === setId) {
            if (this.calculators.size > 0) {
                const firstSetId = this.calculators.keys().next().value;
                this.switchToSet(firstSetId);
            } else {
                this.activeSetId = null; // No active set
            }
        }
        // Otherwise, the active tab remains the same, which is fine.

        if (!isLoading) {
            this.saveState();
            this.updateComparisonTable();
        }
    }

    switchToSet(setId) {
        // Deactivate all
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.calculator-set').forEach(s => s.classList.remove('active'));

        // Activate the selected one
        document.querySelector(`.nav-tab[data-set="${setId}"]`).classList.add('active');
        document.getElementById(`calculator-set-${setId}`).classList.add('active');
        this.activeSetId = setId;
        const calc = this.calculators.get(setId);
        if (calc instanceof Calculator) {
            calc.updateSummaryHeader();
        }
    }

    updateComparisonTable() {
        if (!this.comparisonTbody) return;

        this.comparisonTbody.innerHTML = ''; // Clear existing rows

        // First, find the maximum total average damage among all sets
        let maxDamage = 0;
        if (this.calculators.size > 0) {
            const allDamages = Array.from(this.calculators.values()).map(calc => calc.totalAverageDamage);
            maxDamage = Math.max(...allDamages);
        }

        this.calculators.forEach(calc => {
            const row = document.createElement('tr');

            let diffText = 'N/A';
            if (maxDamage > 0) {
                if (calc.totalAverageDamage === maxDamage) {
                    diffText = `<span class="best-damage-badge">Best</span>`;
                } else {
                    const diff = ((calc.totalAverageDamage - maxDamage) / maxDamage) * 100;
                    diffText = `${diff.toFixed(1)}%`;
                }
            }

            // Create cells programmatically to prevent XSS from user-provided tab names.
            const nameCell = document.createElement('td');
            nameCell.textContent = calc.getTabName(); // .textContent is safe
            row.appendChild(nameCell);

            const totalDmgCell = document.createElement('td');
            totalDmgCell.textContent = calc.totalAverageDamage.toFixed(2);
            row.appendChild(totalDmgCell);

            const diffCell = document.createElement('td');
            diffCell.innerHTML = diffText; // Safe because diffText is internally generated ('Best' badge or a number)
            row.appendChild(diffCell);

            if (calc instanceof Calculator) {
                const baseCell = document.createElement('td');
                baseCell.textContent = calc.totalAvgBaseHitDmg.toFixed(2);
                row.appendChild(baseCell);

                const sneakCell = document.createElement('td');
                sneakCell.textContent = calc.totalAvgSneakDmg.toFixed(2);
                row.appendChild(sneakCell);

                const imbueCell = document.createElement('td');
                imbueCell.textContent = calc.totalAvgImbueDmg.toFixed(2);
                row.appendChild(imbueCell);

                const unscaledCell = document.createElement('td');
                unscaledCell.textContent = calc.totalAvgUnscaledDmg.toFixed(2);
                row.appendChild(unscaledCell);
            } else {
                // For spell calculators, add empty cells to keep the table structure
                for (let i = 0; i < 4; i++) {
                    const emptyCell = document.createElement('td');
                    emptyCell.textContent = '-';
                    row.appendChild(emptyCell);
                }
            }

            this.comparisonTbody.appendChild(row);
        });
    }

    addDragAndDropListeners() {
        let draggedTab = null;
        let placeholder = null; // Placeholder element for drop location

        // Use event delegation on the container for drag events
        this.navContainer.addEventListener('dragstart', (e) => {
            const target = e.target.closest('.nav-tab');
            if (target) {
                draggedTab = target;
                // Use setTimeout to allow the browser to create the drag image before we add the class

                // Create placeholder
                placeholder = document.createElement('div');
                placeholder.className = 'nav-tab-placeholder';
                placeholder.style.width = `${draggedTab.offsetWidth}px`;
                placeholder.style.height = `${draggedTab.offsetHeight}px`;

                setTimeout(() => {
                    draggedTab.classList.add('dragging');
                }, 0);
            }
        });

        this.navContainer.addEventListener('dragend', (e) => {
            if (draggedTab) {
                draggedTab.classList.remove('dragging');
                draggedTab = null;
                // Clean up placeholder
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
                placeholder = null;
            }
        });

        this.navContainer.addEventListener('dragover', (e) => {
            e.preventDefault(); // This is necessary to allow a drop
            if (!placeholder) return;

            // If dragging over the 'add' button, treat it as a dead zone
            if (e.target.closest('#add-set-btn')) {
                if (placeholder && placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
                return;
            }

            const afterElement = this._getDragAfterElement(this.navContainer, e.clientX);
            
            if (afterElement === null) {
                // Insert placeholder before the 'Add Set' button
                this.navContainer.insertBefore(placeholder, this.addSetBtn);
            } else {
                // Insert placeholder before the element we're hovering over
                this.navContainer.insertBefore(placeholder, afterElement);
            }
        });

        this.navContainer.addEventListener('dragleave', (e) => {
            // Note: dragleave logic is simplified as the placeholder handles visual state.
            // We could add logic to remove the placeholder if the mouse leaves the container,
            // but dragend will handle cleanup reliably.
        });

        this.navContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedTab) return;

            const afterElement = this._getDragAfterElement(this.navContainer, e.clientX);
            const draggedSetId = draggedTab.dataset.set;
            const draggedContainer = document.getElementById(`calculator-set-${draggedSetId}`);

            if (afterElement == null) {
                // Dropping at the end
                this.navContainer.insertBefore(draggedTab, this.addSetBtn);
                this.setsContainer.appendChild(draggedContainer);
            } else {
                // Dropping before another element
                const afterElementSetId = afterElement.dataset.set;
                const afterContainer = document.getElementById(`calculator-set-${afterElementSetId}`);
                this.navContainer.insertBefore(draggedTab, afterElement);
                this.setsContainer.insertBefore(draggedContainer, afterContainer);
            }

            // After reordering, ensure the active tab's class is correctly applied
            // This handles cases where the active tab itself was dragged
            this.switchToSet(this.activeSetId);
            this.saveState(); // Save the new order
        });
    }
    
    addImportExportListeners() {
        this.exportBtn.addEventListener('click', () => this.showExportModal());
        this.importBtn.addEventListener('click', () => this.showImportModal());
        this.modalCloseBtn.addEventListener('click', () => this.hideModal());
        this.modalBackdrop.addEventListener('click', (e) => {
            if (e.target === this.modalBackdrop) {
                this.hideModal();
            }
        });

        this.modalCopyBtn.addEventListener('click', () => this.copyToClipboard());
        this.modalSaveFileBtn.addEventListener('click', () => this.saveToFile());
        this.modalLoadBtn.addEventListener('click', () => this.importFromText());

        // Trigger file input when "Load from File" is conceptually clicked
        this.modalFileInput.addEventListener('change', (e) => this.importFromFile(e));

        // Listeners for format toggle
        this.formatJsonBtn.addEventListener('click', () => this.setExportFormat('json'));
        this.formatSummaryBtn.addEventListener('click', () => this.setExportFormat('summary'));
    }

    showExportModal() {
        this.modalTitle.textContent = 'Export Sets';
        this.modalDescription.textContent = 'Copy the text below or save it to a file to import later.';
        this.modalTextarea.value = this.getSetsAsJSON();
        this.modalTextarea.readOnly = true;

        // Show export elements, hide import elements
        this.modalCopyBtn.classList.remove('hidden');
        this.modalSaveFileBtn.classList.remove('hidden');
        this.modalLoadBtn.classList.add('hidden');
        this.modalFileInput.classList.add('hidden');
        document.querySelector('.modal-format-toggle').classList.remove('hidden');

        this.modalBackdrop.classList.remove('hidden');
        this.setExportFormat('json'); // Default to JSON
    }

    setExportFormat(format) {
        this.formatJsonBtn.classList.toggle('active', format === 'json');
        this.formatSummaryBtn.classList.toggle('active', format === 'summary');
        this.modalTextarea.value = format === 'json' ? this.getSetsAsJSON() : this.getSetsAsSummary();
        this.modalDescription.textContent = format === 'json' ? 'Copy the text below or save it to a file to import later.' : 'A human-readable summary for sharing or saving as a .txt file.';
    }

    showImportModal() {
        this.modalTitle.textContent = 'Import Sets';
        this.modalDescription.textContent = 'Paste set data into the text area and click "Load", or upload a file.';
        this.modalTextarea.value = '';
        this.modalTextarea.readOnly = false;
        this.modalTextarea.placeholder = 'Paste your exported set data here...';

        // Show import elements, hide export elements
        this.modalCopyBtn.classList.add('hidden');
        this.modalSaveFileBtn.classList.add('hidden');
        this.modalLoadBtn.classList.remove('hidden');
        // We don't show the file input directly, but we'll trigger it.
        document.querySelector('.modal-format-toggle').classList.add('hidden');
        // Let's repurpose the "Save to File" button to be "Load from File"
        this.modalSaveFileBtn.textContent = 'Load from File';
        this.modalSaveFileBtn.classList.remove('hidden');
        this.modalSaveFileBtn.onclick = () => this.modalFileInput.click(); // Re-route click

        this.modalBackdrop.classList.remove('hidden');
    }

    hideModal() {
        this.modalBackdrop.classList.add('hidden');
        // Reset the repurposed button
        this.modalSaveFileBtn.textContent = 'Save to File';
        this.modalSaveFileBtn.onclick = () => this.saveToFile();
    }

    getSetsAsJSON() {
        const stateToSave = [];
        const orderedTabs = this.navContainer.querySelectorAll('.nav-tab');
        orderedTabs.forEach(tab => {
            const setId = parseInt(tab.dataset.set, 10);
            const calc = this.calculators.get(setId);
            if (calc) {
                const state = calc.getState();
                state.tabName = calc.getTabName();
                state.setId = calc.setId;
                state.type = calc instanceof SpellCalculator ? 'spell' : 'weapon';
                stateToSave.push(state);
            }
        });
        return JSON.stringify(stateToSave, null, 2); // Pretty-print the JSON
    }

    getSetsAsSummary() {
        let summary = `DDO Damage Calculator Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
        const orderedTabs = this.navContainer.querySelectorAll('.nav-tab');

        orderedTabs.forEach(tab => {
            const setId = parseInt(tab.dataset.set, 10);
            const calc = this.calculators.get(setId);
            if (!calc) return;

            const state = calc.getState();
            summary += `========================================\n`;
            summary += `  Set: ${calc.getTabName()}\n`;
            summary += `========================================\n\n`;

            if (calc instanceof Calculator) {
                summary += `--- Base Damage ---\n`;
                summary += `Weapon Dice [W]: ${state['weapon-dice'] || 0}\n`;
                summary += `Damage: ${state['weapon-damage'] || '0'} + ${state['bonus-base-damage'] || 0}\n\n`;

                summary += `--- Critical Profile ---\n`;
                summary += `Threat Range: ${state['crit-threat'] || '20'}\n`;
                summary += `Multiplier: x${state['crit-multiplier'] || 2}\n`;
                summary += `Seeker: +${state['seeker-damage'] || 0}\n`;
                summary += `19-20 Multiplier: +${state['crit-multiplier-19-20'] || 0}\n\n`;

                summary += `--- Hit/Miss Profile ---\n`;
                summary += `Miss on Roll <=: ${state['miss-threshold'] || 1}\n`;
                summary += `Graze on Roll <=: ${state['graze-threshold'] || 0}\n`;
                summary += `Graze Damage: ${state['graze-percent'] || 0}%\n\n`;

                summary += `--- Unscaled Damage ---\n`;
                let i = 1;
                while (state.hasOwnProperty(`unscaled-damage-${i}`)) {
                    const damage = state[`unscaled-damage-${i}`] || '0';
                    if (damage && damage !== '0') {
                        const proc = state[`unscaled-proc-chance-${i}`] || 100;
                        const multi = state[`unscaled-doublestrike-${i}`] ? 'Yes' : 'No';                            
                        const onCrit = state[`unscaled-on-crit-${i}`] ? ', On Crit Only' : '';
                        summary += `Source ${i}: ${damage} @ ${proc}% Proc, Multi-Strike: ${multi}${onCrit}\n`;
                    }
                    i++;
                }
                summary += `Melee/Ranged Power: ${state['melee-power'] || 0}\n`;
                summary += `Spell Power: ${state['spell-power'] || 0}\n`;
                summary += `Multi-Strike: ${state['doublestrike'] || 0}% (${state['is-doubleshot'] ? 'Doubleshot' : 'Doublestrike'})\n\n`;

                summary += `--- Sneak Attack ---\n`;
                summary += `Damage: ${state['sneak-attack-dice'] || 0}d6 + ${state['sneak-bonus'] || 0}\n\n`;

                summary += `--- Imbue Dice ---\n`;
                summary += `Dice: ${state['imbue-dice-count'] || 0}d${state['imbue-die-type'] || 6}\n`;
                summary += `Scaling: ${state['imbue-scaling'] || 100}% of ${state['imbue-uses-spellpower'] ? 'Spell Power' : 'Melee Power'}\n\n`;

                summary += `--- AVERAGES ---\n`;
                summary += `Total Avg Damage: ${calc.totalAverageDamage.toFixed(2)}\n`;
                summary += `Avg Base: ${calc.totalAvgBaseHitDmg.toFixed(2)}, Avg Sneak: ${calc.totalAvgSneakDmg.toFixed(2)}, Avg Imbue: ${calc.totalAvgImbueDmg.toFixed(2)}, Avg Unscaled: ${calc.totalAvgUnscaledDmg.toFixed(2)}\n\n\n`;
            } else if (calc instanceof SpellCalculator) {
                summary += `--- Spell Properties ---\n`;
                if (state.spellDamageSources && state.spellDamageSources.length > 0) {
                    state.spellDamageSources.forEach((source, index) => {
                        summary += `  Source ${index + 1}: Base Damage: ${source.base || '0'}, CL Scaled: ${source.clScaled || '0'}\n`;
                    });
                }
                summary += `Caster Level: ${state['caster-level'] || 0}\n`;
                summary += `Spell Power: ${state['spell-power'] || 0}\n`;
                summary += `Crit Chance: ${state['spell-crit-chance'] || 0}%\n`;
                summary += `Crit Damage: ${state['spell-crit-damage'] || 0}%\n`;
                summary += `Target MRR: ${state['target-mrr'] || 0}\n\n`;
                
                summary += `--- AVERAGES ---\n`;
                summary += `Total Avg Damage: ${calc.totalAverageDamage.toFixed(2)}\n\n\n`;
            }
        });

        return summary;
    }

    copyToClipboard() {
        navigator.clipboard.writeText(this.modalTextarea.value).then(() => {
            alert('Set data copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy. Please copy manually from the text box.');
        });
    }

    saveToFile() {
        const isJson = this.formatJsonBtn.classList.contains('active');
        const data = this.modalTextarea.value;
        const fileType = isJson ? 'application/json' : 'text/plain';
        const fileName = isJson ? 'ddo-calc-sets.json' : 'ddo-calc-summary.txt';
        const blob = new Blob([data], { type: fileType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importFromText() {
        const jsonString = this.modalTextarea.value;
        if (!jsonString.trim()) {
            alert('Text area is empty. Please paste your set data.');
            return;
        }
        this.loadSetsFromJSON(jsonString);
    }

    importFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const jsonString = e.target.result;
            this.loadSetsFromJSON(jsonString);
        };
        reader.onerror = () => {
            alert('Error reading file.');
        };
        reader.readAsText(file);

        // Reset file input to allow loading the same file again
        event.target.value = '';
    }

    // This method is called when a user directly changes an input,
    // or when an undo/redo action is completed.
    // It should not be called during the loading process.
    saveState() {
        if (this.isLoading) return; // Don't save while loading

        const stateToSave = [];
        // Get tabs in their current DOM order to save the correct sequence
        const orderedTabs = this.navContainer.querySelectorAll('.nav-tab');
        orderedTabs.forEach(tab => {
            const setId = parseInt(tab.dataset.set, 10);
            const calc = this.calculators.get(setId);
            const state = calc.getState();
            state.tabName = calc.getTabName(); // Save the tab name
            state.setId = calc.setId; // Save the ID
            state.type = calc instanceof SpellCalculator ? 'spell' : 'weapon';
            stateToSave.push(state);
        })
        sessionStorage.setItem('calculatorState', JSON.stringify(stateToSave));
    }

    loadState() {
        const jsonString = sessionStorage.getItem('calculatorState');
        if (this.loadSetsFromJSON(jsonString)) {
            return true;
        }
        return false;
    }

    loadSetsFromJSON(jsonString) {
        if (!jsonString) return false;

        let savedStates;
        try {
            savedStates = JSON.parse(jsonString);
            if (!Array.isArray(savedStates) || savedStates.length === 0) {
                throw new Error("Data is not a valid array of sets.");
            }
        } catch (error) {
            console.error("Failed to parse set data:", error);
            alert("Import failed. The provided data is not valid JSON or is incorrectly formatted.");
            return false;
        }
        
        this.isLoading = true;

        // Clear existing sets
        this.calculators.forEach((calc, setId) => this.removeSet(setId, true));
        this.calculators.clear();
        this.setsContainer.innerHTML = '';
        this.navContainer.querySelectorAll('.nav-tab').forEach(tab => tab.remove());
        nextSetId = 1; // Reset counter

        savedStates.forEach((state) => {
            if (state.type === 'spell') {
                this.addNewSpellSet(state.setId);
            } else {
                this.addNewSet(state.setId);
            }
            const newCalc = this.calculators.get(state.setId);
            newCalc?.setState(state);
            newCalc?.setTabName(state.tabName);
            if (newCalc instanceof Calculator) {
                newCalc.updateSummaryHeader();
            }
        });

        this.switchToSet(savedStates[0].setId); // Activate the first set from the saved state
        this.isLoading = false;
        this.updateComparisonTable(); // Populate comparison table after loading
        this.hideModal();
        return true;
    }

    addUndoRedoListeners() {
        document.addEventListener('keydown', (e) => {
            // Check for Ctrl+Z (Undo)
            if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
            // Check for Ctrl+Y or Ctrl+Shift+Z (Redo)
            if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
                e.preventDefault();
                this.redo();
            }
        });
    }

    recordAction(action) {
        this.undoStack.push(action);
        // A new action clears the redo stack
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;

        const action = this.undoStack.pop();
        this.isLoading = true; // Prevent saving state during undo

                if (action.type === 'REMOVE_SET') {
            // To undo a remove, we add the set back
            this.recreateSet(action.setId, action.state, action.index);
            // The redo action is to remove it again
                    this.redoStack.push({ ...action, type: 'REMOVE_SET' });
                } else if (action.type === 'ADD_SET') {
            // To undo an add, we remove the set
            this.removeSet(action.setId, true); // Use isLoading to prevent recording
            // The redo action is to add it back
                    this.redoStack.push({ ...action, type: 'ADD_SET' }); // The 'add' action doesn't have a state to copy
                } else if (action.type === 'VALUE_CHANGE' || action.type === 'RENAME') {
            const calc = this.calculators.get(action.setId);
            calc?.applyValueChange(action.inputId || `tab-name-${action.setId}`, action.oldValue);
            this.redoStack.push(action);
        }

        this.isLoading = false;
        this.saveState();
        this.updateComparisonTable();
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const action = this.redoStack.pop();
        this.isLoading = true; // Prevent saving state during redo

                if (action.type === 'REMOVE_SET') {
            this.removeSet(action.setId, true);
                    this.undoStack.push({ ...action, type: 'REMOVE_SET' });
                } else if (action.type === 'ADD_SET') {
            this.recreateSet(action.setId, action.state, action.index);
                    this.undoStack.push({ ...action, type: 'ADD_SET' });
                } else if (action.type === 'VALUE_CHANGE' || action.type === 'RENAME') {
            const calc = this.calculators.get(action.setId);
            calc?.applyValueChange(action.inputId || `tab-name-${action.setId}`, action.newValue);
            this.undoStack.push(action);
        }

        this.isLoading = false;
        this.saveState();
        this.updateComparisonTable();
    }

    /**
     * Helper function to determine the element a dragged tab should be placed before.
     * @param {HTMLElement} container - The parent container of the draggable elements.
     * @param {number} x - The current X coordinate of the mouse during drag.
     * @returns {HTMLElement|null} The element to drop before, or null if dropping at the end.
     */
    _getDragAfterElement(container, x) {
        const draggableElements = [...container.querySelectorAll('.nav-tab:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = x - box.left - box.width / 2;
            return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    // Global Enter key listener
    addGlobalEnterListener() {
        document.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default browser behavior (e.g., form submission)
                this.calculators.get(this.activeSetId)?.calculateDdoDamage();
            }
        });
    }

    getTemplateHTML() {
        const templateNode = document.getElementById('calculator-set-template');
        return templateNode ? templateNode.innerHTML : '';
    }

    findNextAvailableId() {
        let id = 1;
        while (this.calculators.has(id)) {
            id++;
        }
        if (id >= nextSetId) nextSetId = id + 1;
        return id;
    }
}

    // --- Theme Toggler Logic ---
    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');

    // Apply saved theme on load
    if (themeToggleCheckbox) {
        if (currentTheme === 'dark') {
            body.classList.add('dark-mode');
            themeToggleCheckbox.checked = true;
        }

        themeToggleCheckbox.addEventListener('change', () => {
            body.classList.toggle('dark-mode');
            let theme = 'light';
            if (body.classList.contains('dark-mode')) {
                theme = 'dark';
            }
            localStorage.setItem('theme', theme);
        });
    }

    // --- Instantiate Manager ---
    const manager = new CalculatorManager();
    manager.addGlobalEnterListener(); // Add the global listener after manager is ready
});