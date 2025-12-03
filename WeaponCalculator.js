import { parseDiceNotation } from './utils.js';
import { BaseCalculator } from './BaseCalculator.js';

export class WeaponCalculator extends BaseCalculator {
    constructor(setId, manager, name) {
        super(setId, manager, name);
        this.totalAvgBaseHitDmg = 0;
        this.totalAvgSneakDmg = 0;
        this.totalAvgUnscaledDmg = 0;
        this.totalAvgImbueDmg = 0;
        this.totalAvgScaledDiceDmg = 0;
        this.unscaledRowCount = this.unscaledRowsContainer.querySelectorAll('.input-group-row').length;
        this.recalculateHandler = this.handleInputChange.bind(this);
    }

    getElements() {
        super.getElements();
        const get = (baseId) => document.getElementById(baseId + this.idSuffix);

        this.weaponDiceInput = get('weapon-dice');
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
        this.imbueToggleBonusSpan = get('imbue-toggle-bonus');
        this.calculateBtn = get('calculate-btn');
        this.avgBaseDamageSpan = get('avg-base-damage');
        this.avgSneakDamageSpan = get('avg-sneak-damage');
        this.avgImbueDamageSpan = get('avg-imbue-damage');
        this.avgUnscaledDamageSpan = get('avg-unscaled-damage');
        this.avgScaledDiceDamageSpan = get('avg-scaled-dice-damage');
        this.totalAvgDamageSpan = get('total-avg-damage');
        this.weaponScalingSpan = get('weapon-scaling');
        this.sneakScalingSpan = get('sneak-scaling');
        this.imbueScalingBreakdownSpan = get('imbue-scaling-breakdown');
        this.scaledDiceScalingBreakdownSpan = get('scaled-dice-scaling-breakdown');
        this.scaledDiceAddedInputDisplaySpan = get('scaled-dice-added-input-display');
        this.imbuePowerSourceSpan = get('imbue-power-source');
        this.summaryHeader = get('summary-header');
        this.reaperPenaltySpan = get('reaper-penalty');
        this.rollDamageTbody = get('roll-damage-tbody');
        this.set75ScalingBtn = get('set-75-scaling-btn');
        this.set100ScalingBtn = get('set-100-scaling-btn');
        this.set150ScalingBtn = get('set-150-scaling-btn');
        this.set200ScalingBtn = get('set-200-scaling-btn');
        this.unscaledRowsContainer = get('unscaled-rows-container');
        this.addUnscaledRowBtn = get('add-unscaled-row-btn');
        this.scaledDiceRowsContainer = get('scaled-dice-rows-container');
        this.addScaledDiceRowBtn = get('add-scaled-dice-row-btn');
    }

    addEventListeners() {
        super.addEventListeners();
        this.calculateBtn.addEventListener('click', () => this.calculateDdoDamage());

        this.set75ScalingBtn?.addEventListener('click', (e) => this.handleSetScalingClick(e, 75));
        this.set100ScalingBtn?.addEventListener('click', (e) => this.handleSetScalingClick(e, 100));
        this.set150ScalingBtn?.addEventListener('click', (e) => this.handleSetScalingClick(e, 150));
        this.set200ScalingBtn?.addEventListener('click', (e) => this.handleSetScalingClick(e, 200));

        this.addUnscaledRowBtn.addEventListener('click', (e) => this.addUnscaledDamageRow(e));
        this.unscaledRowsContainer.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('remove-row-btn')) {
                e.preventDefault();
                e.target.closest('.input-group-row').remove();
                this.handleInputChange();
            }
        });

        this.addScaledDiceRowBtn.addEventListener('click', (e) => this.addScaledDiceDamageRow(e));
        this.scaledDiceRowsContainer.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('remove-row-btn')) {
                e.preventDefault();
                e.target.closest('.input-group-row').remove();
                this.handleInputChange();
            }
        });
    }

    parseThreatRange(threatString) {
        const cleanString = (threatString || '').trim();
        if (cleanString.includes('-')) {
            const parts = cleanString.split('-');
            if (parts.length === 2) {
                const start = parseInt(parts[0], 10);
                const end = parseInt(parts[1], 10);
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
        return 1;
    }

    _getInputs() {
        const isDoubleshot = this.isDoubleshotCheckbox.checked;
        let multiStrikeValue = parseFloat(this.doublestrikeInput.value) || 0;
        if (!isDoubleshot) {
            multiStrikeValue = Math.min(multiStrikeValue, 100);
        }

        const unscaled = {
            normal_multi: 0,
            normal_noMulti: 0,
            crit_multi: 0,
            crit_noMulti: 0
        };

        this.unscaledRowsContainer.querySelectorAll('.input-group-row').forEach(row => {
            const dmgInput = row.querySelector(`input[id^="unscaled-damage-"]`);
            const procInput = row.querySelector(`input[id^="unscaled-proc-chance-"]`);
            const multiStrikeCheckbox = row.querySelector(`input[id^="unscaled-doublestrike-"]`);
            const onCritCheckbox = row.querySelector(`input[id^="unscaled-on-crit-"]`);

            if (dmgInput && procInput && multiStrikeCheckbox && onCritCheckbox) {
                const damage = parseDiceNotation(dmgInput.value);
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
        });

        const scaledDiceDamage = [];
        this.scaledDiceRowsContainer.querySelectorAll('.input-group-row').forEach(row => {
            const baseDiceInput = row.querySelector(`input[id^="scaled-dice-base-"]`);
            const scalingToggle = row.querySelector(`input[id^="scaled-dice-scaling-toggle-"]`);
            const enabledCheckbox = row.querySelector(`input[id^="scaled-dice-enabled-"]`);
            if (baseDiceInput && scalingToggle && enabledCheckbox && enabledCheckbox.checked) {
                const procChanceInput = row.querySelector(`input[id^="scaled-dice-proc-chance-"]`);
                scaledDiceDamage.push({
                    baseDice: baseDiceInput.value,
                    procChance: (parseFloat(procChanceInput.value) || 100) / 100,
                    enableScaling: scalingToggle.checked,
                    scalingPercent: parseFloat(row.querySelector(`input[id^="scaled-dice-scaling-percent-"]`).value) || 100,
                    isEnabled: enabledCheckbox.checked
                });
            }
        });

        return {
            additionalWeaponDice: parseFloat(this.weaponDiceInput.value) || 0,
            parsedWeaponDmg: parseDiceNotation(this.weaponDamageInput.value) || 0,
            bonusBaseDmg: parseFloat(this.bonusBaseDamageInput.value) || 0,
            meleePower: parseFloat(this.meleePowerInput.value) || 0,
            spellPower: parseFloat(this.spellPowerInput.value) || 0,
            threatRange: this.parseThreatRange(this.critThreatInput.value),
            critMult: parseFloat(this.critMultiplierInput.value) || 2,
            critMult1920: parseFloat(this.critMultiplier1920Input.value) || 0,
            seekerDmg: parseDiceNotation(this.seekerDamageInput.value),
            sneakDiceCount: parseInt(this.sneakAttackDiceInput.value) || 0,
            sneakBonusDmg: parseFloat(this.sneakBonusInput.value) || 0,
            missThreshold: Math.max(1, parseInt(this.missThresholdInput.value) || 1),
            grazeThreshold: parseInt(this.grazeThresholdInput.value) || 0,
            grazePercent: (parseFloat(this.grazePercentInput.value) || 0) / 100,
            reaperSkulls: parseInt(this.reaperSkullsSelect.value) || 0,
            imbueDiceCount: parseInt(this.imbueDiceCountInput.value) || 0,
            imbueDieType: parseInt(this.imbueDieTypeInput.value) || 6,
            imbueScaling: (parseFloat(this.imbueScalingInput.value) || 100) / 100,
            imbueCrits: this.imbueCritsCheckbox.checked,
            imbueUsesSpellpower: this.imbueUsesSpellpowerCheckbox.checked,
            doublestrikeChance: multiStrikeValue / 100,
            isDoubleshot: isDoubleshot,
            unscaled: unscaled,
            scaledDiceDamage: scaledDiceDamage
        };
    }

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

    _calculateDamagePortions(inputs) {
        const {
            additionalWeaponDice, parsedWeaponDmg, bonusBaseDmg, meleePower, spellPower,
            seekerDmg, sneakDiceCount, sneakBonusDmg, imbueDiceCount, imbueDieType,
            imbueScaling, imbueUsesSpellpower, scaledDiceDamage
        } = inputs;

        const baseDmg = parsedWeaponDmg + (additionalWeaponDice * parsedWeaponDmg) + bonusBaseDmg;
        const powerMultiplier = 1 + (meleePower / 100);
        const weaponPortion = baseDmg * powerMultiplier;
        const seekerPortion = seekerDmg * powerMultiplier;

        const sneakDiceDmg = sneakDiceCount * 3.5;
        const sneakPortion = (sneakDiceDmg + sneakBonusDmg) * (1 + (meleePower * 1.5) / 100);

        const totalImbueDiceCount = imbueDiceCount > 0 ? imbueDiceCount + 1 : 0;
        const totalImbueDiceAverage = totalImbueDiceCount * (imbueDieType + 1) / 2;
        const powerForImbue = imbueUsesSpellpower ? spellPower : meleePower;
        const imbuePortion = totalImbueDiceAverage * (1 + (powerForImbue * imbueScaling) / 100);

        let totalAvgScaledDiceDmg = 0;
        let scaledDiceBreakdownText = [];
        const addedDiceBreakdown = [];
        scaledDiceDamage.forEach(scaledDmg => {
            const baseDiceAvg = parseDiceNotation(scaledDmg.baseDice);
            let additionalDiceAvg = 0;
            if (scaledDmg.enableScaling) {
                const numAdditionalDice = Math.floor(imbueDiceCount / 7) * 1;
                if (numAdditionalDice > 0) {
                    addedDiceBreakdown.push(numAdditionalDice);
                    const baseDiceParts = scaledDmg.baseDice.toLowerCase().split('d');
                    if (baseDiceParts.length === 2) {
                        additionalDiceAvg = numAdditionalDice * parseDiceNotation(`1d${baseDiceParts[1]}`);
                    }
                }
            }
            const lineResult = ((baseDiceAvg + additionalDiceAvg) * (1 + (meleePower * (scaledDmg.scalingPercent || 100) / 100))) * scaledDmg.procChance;
            totalAvgScaledDiceDmg += lineResult;
            scaledDiceBreakdownText.push(`(${baseDiceAvg.toFixed(2)} + ${additionalDiceAvg.toFixed(2)}) * ${(1 + (meleePower * (scaledDmg.scalingPercent || 100) / 100)).toFixed(2)} * ${scaledDmg.procChance.toFixed(2)} = ${lineResult.toFixed(2)}`);
        });

        return {
            baseDmg, weaponPortion, seekerPortion, sneakPortion, imbuePortion,
            powerForImbue, totalAvgScaledDiceDmg, addedDiceBreakdown,
            finalScaledDiceBreakdown: scaledDiceBreakdownText.join(' +<br>'),
            totalImbueDiceCount,
            imbueDice: totalImbueDiceAverage
        };
    }

    _calculateAverages(portions, probabilities, inputs) {
        const { critMult, critMult1920, grazePercent, reaperSkulls, doublestrikeChance, imbueCrits, unscaled } = inputs;
        const { weaponPortion, seekerPortion, sneakPortion, imbuePortion } = portions;
        const finalCritMult1920 = critMult + critMult1920;
        const multiStrikeMultiplier = 1 + doublestrikeChance;
        const reaperMultiplier = reaperSkulls > 0 ? (reaperSkulls <= 6 ? 20 / ((reaperSkulls ** 2) + reaperSkulls + 24) : 5 / (4 * reaperSkulls - 8)) : 1;

        const avgBaseHitDmg =
            (((weaponPortion + seekerPortion) * finalCritMult1920) * probabilities.specialCrit) +
            (((weaponPortion + seekerPortion) * critMult) * probabilities.normalCrit) +
            (weaponPortion * probabilities.normal) +
            (weaponPortion * grazePercent * probabilities.graze);
        const avgSneakDmg = sneakPortion * (1 - probabilities.miss);
        const avgImbueDmg = imbuePortion * (probabilities.hit + (imbueCrits ? probabilities.crit : 0));
        const avgUnscaledDmg =
            ((unscaled.normal_multi * multiStrikeMultiplier) + unscaled.normal_noMulti) * probabilities.hit +
            ((unscaled.crit_multi * multiStrikeMultiplier) + unscaled.crit_noMulti) * probabilities.crit;
        const avgScaledDiceDmg = portions.totalAvgScaledDiceDmg * probabilities.hit;

        return {
            base: avgBaseHitDmg * multiStrikeMultiplier * reaperMultiplier,
            sneak: avgSneakDmg * multiStrikeMultiplier * reaperMultiplier,
            imbue: avgImbueDmg * multiStrikeMultiplier * reaperMultiplier,
            unscaled: avgUnscaledDmg * reaperMultiplier,
            scaledDice: avgScaledDiceDmg * multiStrikeMultiplier * reaperMultiplier,
            reaperMultiplier,
            multiStrikeMultiplier
        };
    }

    _updateSummaryUI(averages, portions, inputs) {
        this.avgBaseDamageSpan.textContent = averages.base.toFixed(2);
        this.avgSneakDamageSpan.textContent = averages.sneak.toFixed(2);
        this.avgImbueDamageSpan.textContent = averages.imbue.toFixed(2);
        this.avgUnscaledDamageSpan.textContent = averages.unscaled.toFixed(2);
        this.avgScaledDiceDamageSpan.textContent = averages.scaledDice.toFixed(2);
        this.totalAvgDamageSpan.textContent = this.totalAverageDamage.toFixed(2);
        this.weaponScalingSpan.textContent = `${portions.baseDmg.toFixed(2)} * (1 + (${inputs.meleePower} / 100)) = ${portions.weaponPortion.toFixed(2)}`;
        this.sneakScalingSpan.textContent = `(${(portions.sneakDiceDmg || 0).toFixed(2)} + ${inputs.sneakBonusDmg.toFixed(2)}) * (1 + (${inputs.meleePower} * 1.5) / 100) = ${portions.sneakPortion.toFixed(2)}`;
        this.imbueScalingBreakdownSpan.textContent = `${portions.imbueDice.toFixed(2)} (from ${portions.totalImbueDiceCount}d${inputs.imbueDieType}) * (1 + (${portions.powerForImbue} * ${inputs.imbueScaling * 100}%) / 100) = ${portions.imbuePortion.toFixed(2)}`;
        this.scaledDiceScalingBreakdownSpan.innerHTML = portions.finalScaledDiceBreakdown || '0';
        this.imbuePowerSourceSpan.textContent = inputs.imbueUsesSpellpower ? `Spell Power (${inputs.spellPower})` : `Melee Power (${inputs.meleePower})`;
        this.scaledDiceAddedInputDisplaySpan.textContent = portions.addedDiceBreakdown.join(' + ') || '0';
        this.reaperPenaltySpan.textContent = `${((1 - averages.reaperMultiplier) * 100).toFixed(1)}% Reduction`;
        this.imbueToggleBonusSpan.classList.toggle('hidden', inputs.imbueDiceCount <= 0);
        this.imbueToggleBonusSpan.previousElementSibling.classList.toggle('hidden', inputs.imbueDiceCount <= 0);
    }

    calculateDdoDamage() {
        const inputs = this._getInputs();
        const probabilities = this._calculateProbabilities(inputs);
        const portions = this._calculateDamagePortions(inputs);
        const averages = this._calculateAverages(portions, probabilities, inputs);

        this.totalAvgBaseHitDmg = averages.base;
        this.totalAvgSneakDmg = averages.sneak;
        this.totalAvgImbueDmg = averages.imbue;
        this.totalAvgUnscaledDmg = averages.unscaled;
        this.totalAvgScaledDiceDmg = averages.scaledDice;
        this.totalAverageDamage = Object.values(averages).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0);

        this._updateSummaryUI(averages, portions, inputs);
        this.updateRollDamageTable({ ...inputs, ...portions, ...averages, critStartRoll: 21 - inputs.threatRange, finalCritMult1920: inputs.critMult + inputs.critMult1920 });
    }

    updateRollDamageTable(params) {
        const { missThreshold, grazeThreshold, critStartRoll, weaponPortion, seekerPortion, sneakPortion, imbuePortion, imbueCrits, grazePercent, critMult, finalCritMult1920, multiStrikeMultiplier, reaperMultiplier, unscaled_normal_multi, unscaled_normal_noMulti, unscaled_crit_multi, unscaled_crit_noMulti, scaledDice } = params;
        this.rollDamageTbody.innerHTML = '';

        for (let roll = 1; roll <= 20; roll++) {
            let baseDmg = 0, sneakDmg = 0, imbueDmg = 0, outcome = 'Miss';
            let rowClass = '';

            if (roll > missThreshold) {
                if (roll <= grazeThreshold) {
                    baseDmg = weaponPortion * grazePercent;
                    sneakDmg = sneakPortion;
                    outcome = 'Graze';
                    rowClass = 'graze-row';
                } else {
                    let currentCritMult = 1;
                    if (roll >= critStartRoll) {
                        currentCritMult = (roll >= 19) ? finalCritMult1920 : critMult;
                        outcome = 'Critical';
                        rowClass = 'crit-row';
                    } else {
                        outcome = 'Hit';
                    }
                    baseDmg = (weaponPortion + seekerPortion) * currentCritMult;
                    sneakDmg = sneakPortion;
                    imbueDmg = imbuePortion * (1 + (imbueCrits && currentCritMult > 1 ? 1 : 0));
                }
            }

            const finalBase = baseDmg * multiStrikeMultiplier * reaperMultiplier;
            const finalSneak = sneakDmg * multiStrikeMultiplier * reaperMultiplier;
            const finalImbue = imbueDmg * multiStrikeMultiplier * reaperMultiplier;
            let finalUnscaled = 0;
            if (outcome === 'Hit' || outcome === 'Critical') {
                finalUnscaled += ((unscaled_normal_multi * multiStrikeMultiplier) + unscaled_normal_noMulti) * reaperMultiplier;
                if (outcome === 'Critical') {
                    finalUnscaled += (((unscaled_crit_multi * multiStrikeMultiplier) + unscaled_crit_noMulti) * reaperMultiplier);
                }
            }
            const finalScaledDice = (outcome !== 'Miss' && outcome !== 'Graze') ? scaledDice * multiStrikeMultiplier * reaperMultiplier : 0;

            const totalDamage = finalBase + finalSneak + finalImbue + finalUnscaled + finalScaledDice;
            const row = this.rollDamageTbody.insertRow();
            row.className = rowClass;
            row.innerHTML = `<td>${roll}</td><td>${finalBase.toFixed(2)}</td><td>${finalSneak.toFixed(2)}</td><td>${finalImbue.toFixed(2)}</td><td>${finalUnscaled.toFixed(2)}</td><td>${finalScaledDice.toFixed(2)}</td><td>${totalDamage.toFixed(2)}</td><td>${outcome}</td>`;
        }
    }

    handleInputChange(action = null) {
        if (action) this.manager.recordAction(action);
        this.calculateDdoDamage();
        this.manager.updateComparisonTable();
        this.manager.saveState();
    }

    addUnscaledDamageRow(event) {
        event.preventDefault();
        const newIndex = Date.now();
        const template = document.getElementById('unscaled-row-template');
        if (!template) return;
        const newRow = template.content.cloneNode(true).firstElementChild;
        const nextLabelNumber = this.unscaledRowsContainer.querySelectorAll('.input-group-row').length + 1;

        newRow.querySelectorAll('[id*="-X"]').forEach(el => el.id = el.id.replace('-X', `-${newIndex}${this.idSuffix}`));
        newRow.querySelectorAll('[for*="-X"]').forEach(label => label.setAttribute('for', label.getAttribute('for').replace('-X', `-${newIndex}${this.idSuffix}`)));
        newRow.querySelector('label[for^="unscaled-damage-"]').textContent = `Unscaled Damage ${nextLabelNumber}`;

        this.unscaledRowsContainer.appendChild(newRow);
        newRow.querySelectorAll('.adaptive-text-input').forEach(input => this._resizeInput(input));
    }

    addScaledDiceDamageRow(event) {
        event.preventDefault();
        const newIndex = Date.now();
        const newRow = document.createElement('div');
        newRow.className = 'input-group-row';
        newRow.innerHTML = `
            <input type="checkbox" id="scaled-dice-enabled-${newIndex}${this.idSuffix}" checked title="Enable/disable this scaled dice source.">
            <label for="scaled-dice-base-${newIndex}${this.idSuffix}">Base Dice</label>
            <input type="text" id="scaled-dice-base-${newIndex}${this.idSuffix}" value="1d6" class="adaptive-text-input">
            <label for="scaled-dice-proc-chance-${newIndex}${this.idSuffix}" class="short-label">Proc %</label>
            <input type="number" id="scaled-dice-proc-chance-${newIndex}${this.idSuffix}" value="100" min="0" max="100" class="small-input adaptive-text-input" title="Chance for this damage to occur on a hit">
            <label for="scaled-dice-scaling-percent-${newIndex}${this.idSuffix}" class="short-label">Scaling %</label>
            <input type="number" id="scaled-dice-scaling-percent-${newIndex}${this.idSuffix}" value="100" class="small-input" title="Percentage of Melee/Ranged Power to apply to this damage source.">
            <input type="checkbox" id="scaled-dice-scaling-toggle-${newIndex}${this.idSuffix}" checked>
            <label for="scaled-dice-scaling-toggle-${newIndex}${this.idSuffix}" class="inline-checkbox-label" title="Enable scaling with imbue dice count.">Scale with Imbue</label>
            <button class="remove-row-btn" title="Remove this damage source">&times;</button>
        `;
        this.scaledDiceRowsContainer.appendChild(newRow);
        this.handleInputChange({ type: 'ADD_SCALED_ROW', setId: this.setId });
    }

    setState(state) {
        super.setState(state);
        this.unscaledRowsContainer.querySelectorAll('.input-group-row').forEach(row => row.remove());
        this.scaledDiceRowsContainer.querySelectorAll('.input-group-row:not(.read-only-display)').forEach(row => row.remove());

        if (state.unscaledDamageRows) {
            state.unscaledDamageRows.forEach(rowData => {
                this.addUnscaledDamageRow(new Event('dummy'));
                const newRow = this.unscaledRowsContainer.lastElementChild;
                newRow.querySelector(`input[id^="unscaled-damage-"]`).value = rowData.damage;
                newRow.querySelector(`input[id^="unscaled-proc-chance-"]`).value = rowData.procChance;
                newRow.querySelector(`input[id^="unscaled-doublestrike-"]`).checked = rowData.doublestrike;
                newRow.querySelector(`input[id^="unscaled-on-crit-"]`).checked = rowData.onCrit;
            });
        }

        if (state.scaledDiceDamageRows) {
            state.scaledDiceDamageRows.forEach(rowData => {
                this.addScaledDiceDamageRow(new Event('dummy'));
                const newRow = this.scaledDiceRowsContainer.lastElementChild;
                newRow.querySelector(`input[id^="scaled-dice-base-"]`).value = rowData.baseDice;
                newRow.querySelector(`input[id^="scaled-dice-scaling-toggle-"]`).checked = rowData.enableScaling;
                newRow.querySelector(`input[id^="scaled-dice-enabled-"]`).checked = rowData.isEnabled;
                newRow.querySelector(`input[id^="scaled-dice-proc-chance-"]`).value = rowData.procChance || 100;
                newRow.querySelector(`input[id^="scaled-dice-scaling-percent-"]`).value = rowData.scalingPercent || 100;
            });
        }
        this.calculateDdoDamage();
    }

    updateSummaryHeader() {
        if (this.summaryHeader) {
            this.summaryHeader.textContent = `Summary of ${this.getTabName()}`;
        }
    }

    handleSetScalingClick(e, value) {
        e.preventDefault();
        this.imbueScalingInput.value = value;
        this.imbueScalingInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    getState() {
        const state = super.getState();
        state.unscaledDamageRows = [];
        this.unscaledRowsContainer.querySelectorAll('.input-group-row').forEach(row => {
            const dmgInput = row.querySelector(`input[id^="unscaled-damage-"]`);
            const procInput = row.querySelector(`input[id^="unscaled-proc-chance-"]`);
            const multiStrikeCheckbox = row.querySelector(`input[id^="unscaled-doublestrike-"]`);
            const onCritCheckbox = row.querySelector(`input[id^="unscaled-on-crit-"]`);
            if (dmgInput && procInput && multiStrikeCheckbox && onCritCheckbox) {
                state.unscaledDamageRows.push({
                    damage: dmgInput.value,
                    procChance: procInput.value,
                    doublestrike: multiStrikeCheckbox.checked,
                    onCrit: onCritCheckbox.checked
                });
            }
        });

        state.scaledDiceDamageRows = [];
        this.scaledDiceRowsContainer.querySelectorAll('.input-group-row').forEach(row => {
            const baseDiceInput = row.querySelector(`input[id^="scaled-dice-base-"]`);
            const scalingToggle = row.querySelector(`input[id^="scaled-dice-scaling-toggle-"]`);
            const scalingPercentInput = row.querySelector(`input[id^="scaled-dice-scaling-percent-"]`);
            const enabledCheckbox = row.querySelector(`input[id^="scaled-dice-enabled-"]`);
            const procChanceInput = row.querySelector(`input[id^="scaled-dice-proc-chance-"]`);
            if (baseDiceInput && scalingToggle && scalingPercentInput && enabledCheckbox && procChanceInput) {
                state.scaledDiceDamageRows.push({
                    baseDice: baseDiceInput.value,
                    enableScaling: scalingToggle.checked,
                    procChance: procChanceInput.value,
                    scalingPercent: scalingPercentInput.value,
                    isEnabled: enabledCheckbox.checked
                });
            }
        });

        return state;
    }
}
