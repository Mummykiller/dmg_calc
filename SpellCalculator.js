import { parseDiceNotation } from './utils.js';
import { BaseCalculator } from './BaseCalculator.js';

export class SpellCalculator extends BaseCalculator {
    constructor(setId, manager, name) {
        super(setId, manager, name);
        this.averageBaseHit = 0;
        this.averageCritHit = 0;
        this.finalAverageDamage = 0;
        this.calculateSpellDamage();
    }

    getElements() {
        super.getElements();
        const get = (baseId) => document.getElementById(baseId + this.idSuffix);

        this.spellDamageRowsContainer = get('spell-damage-rows-container');
        this.addSpellDamageRowBtn = get('add-spell-damage-row-btn');
        this.addSpellPowerSourceBtn = get('add-spell-power-source-btn');
        this.empowerCheckbox = get('metamagic-empower');
        this.maximizeCheckbox = get('metamagic-maximize');
        this.intensifyCheckbox = get('metamagic-intensify');
        this.wellspringCheckbox = get('boost-wellspring');
        this.nightHorrorsCheckbox = get('boost-night-horrors');
        this.calculateBtn = get('calculate-spell-btn');
        this.spellPowerSourcesContainer = get('spell-power-sources-container');
        this.avgSpellDamageSpan = get('avg-spell-damage');
        this.avgSpellCritDamageSpan = get('avg-spell-crit-damage');
        this.totalAvgSpellDamageSpan = get('total-avg-spell-damage');
        this.finalSpellDamageSpan = get('final-spell-damage');
    }

    addEventListeners() {
        super.addEventListeners();
        this.calculateBtn.addEventListener('click', () => this.calculateSpellDamage());
        this.addSpellDamageRowBtn.addEventListener('click', (e) => this.addSpellDamageRow(e));
        this.addSpellPowerSourceBtn.addEventListener('click', () => this.addSpellPowerSource());

        this.spellDamageRowsContainer.addEventListener('click', (e) => {
            if (e.target) {
                if (e.target.classList.contains('remove-row-btn')) {
                    e.preventDefault();
                    const mainRowToRemove = e.target.closest('.spell-damage-source-row');
                    if (mainRowToRemove) {
                        let nextSibling = mainRowToRemove.nextElementSibling;
                        while (nextSibling && nextSibling.classList.contains('additional-scaling-row')) {
                            const toRemove = nextSibling;
                            nextSibling = toRemove.nextElementSibling;
                            toRemove.remove();
                        }
                        mainRowToRemove.remove();
                    }
                    this.handleInputChange();
                } else if (e.target.classList.contains('duplicate-row-btn')) {
                    e.preventDefault();
                    this.duplicateSpellDamageRow(e.target.closest('.spell-damage-source-row'));
                } else if (e.target.classList.contains('add-scaling-input-btn')) {
                    e.preventDefault();
                    this._addAdditionalScalingInput(e.target.closest('.input-group-row'));
                }
            }
        });

        this.spellPowerSourcesContainer.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('remove-row-btn')) {
                e.preventDefault();
                const profileElement = e.target.closest('.spell-power-profile');
                if (profileElement) {
                    this.removeSpellPowerSource(profileElement);
                }
            }
        });
    }

    _addAdditionalScalingInput(rowElement) {
        const rowIdMatch = rowElement.querySelector('input[id^="spell-name-"]').id.match(/spell-name-(\d+)/);
        if (!rowIdMatch) return;
        const spellRowId = rowIdMatch[1];

        let existingScalingRows = 0;
        let nextSibling = rowElement.nextElementSibling;
        while (nextSibling && nextSibling.classList.contains('additional-scaling-row')) {
            existingScalingRows++;
            nextSibling = nextSibling.nextElementSibling;
        }

        const spellPowerOptions = this._getSpellPowerProfiles().map(p => `<option value="${p.id}">SP ${p.id}</option>`).join('');
        const wrapper = document.createElement('div');
        wrapper.className = 'input-group-row additional-scaling-row';
        wrapper.innerHTML = `
            <label for="additional-scaling-base-${spellRowId}-${existingScalingRows + 1}${this.idSuffix}" class="short-label">SP ${existingScalingRows + 2} Base</label>
            <input type="text" id="additional-scaling-base-${spellRowId}-${existingScalingRows + 1}${this.idSuffix}" value="0" class="small-input adaptive-text-input">
            <span class="plus-symbol">+</span>
            <label for="additional-scaling-cl-${spellRowId}-${existingScalingRows + 1}${this.idSuffix}" class="short-label">per CL</label>
            <input type="text" id="additional-scaling-cl-${spellRowId}-${existingScalingRows + 1}${this.idSuffix}" value="0" class="small-input adaptive-text-input">
            <select id="additional-scaling-sp-select-${spellRowId}-${existingScalingRows + 1}${this.idSuffix}" class="small-input">${spellPowerOptions}</select>
            <button class="remove-scaling-input-btn small-btn">&times;</button>
        `;
        rowElement.insertAdjacentElement('afterend', wrapper);

        const spSelect = wrapper.querySelector('select');
        if (spSelect) {
            const targetProfileId = existingScalingRows + 2;
            const profiles = this._getSpellPowerProfiles();
            if (profiles.some(p => p.id === targetProfileId)) {
                spSelect.value = targetProfileId;
            } else if (profiles.length > 0) {
                spSelect.value = profiles[profiles.length - 1].id;
            }
        }

        if (existingScalingRows + 1 >= 5) {
            rowElement.querySelector('.add-scaling-input-btn').classList.add('hidden');
        }

        wrapper.querySelector('.remove-scaling-input-btn').addEventListener('click', (e) => {
            e.preventDefault();
            wrapper.remove();
            rowElement.querySelector('.add-scaling-input-btn')?.classList.remove('hidden');
            this.handleInputChange();
        });

        this.calculateSpellDamage();
        this.manager.saveState();
    }

    addSpellDamageRow(e) {
        e.preventDefault();
        let maxRowId = 0;
        this.spellDamageRowsContainer.querySelectorAll('.input-group-row').forEach(row => {
            const firstInput = row.querySelector('input[id^="spell-name-"]');
            if (firstInput) {
                const idNum = parseInt(firstInput.id.match(/spell-name-(\d+)/)[1], 10);
                if (idNum > maxRowId) maxRowId = idNum;
            }
        });
        const newRowId = maxRowId + 1;
        const newRow = document.createElement('div');
        newRow.className = 'input-group-row spell-damage-source-row';
        newRow.innerHTML = `
            <input type="text" id="spell-name-${newRowId}${this.idSuffix}" value="Source ${newRowId}" class="adaptive-text-input">
            <label for="spell-damage-${newRowId}${this.idSuffix}">Base Damage</label>
            <input type="text" id="spell-damage-${newRowId}${this.idSuffix}" value="0" class="adaptive-text-input">
            <span class="plus-symbol">+</span>
            <label for="spell-cl-scaling-${newRowId}${this.idSuffix}" class="short-label">per CL</label>
            <input type="text" id="spell-cl-scaling-${newRowId}${this.idSuffix}" value="0" class="small-input adaptive-text-input">
            <label for="caster-level-${newRowId}${this.idSuffix}" class="short-label">CL</label>
            <input type="number" id="caster-level-${newRowId}${this.idSuffix}" value="20" class="small-input">
            <label for="spell-hit-count-${newRowId}${this.idSuffix}" class="short-label">Hits</label>
            <input type="number" id="spell-hit-count-${newRowId}${this.idSuffix}" value="1" min="1" class="small-input">
            <button class="add-scaling-input-btn small-btn">+</button>
            <button class="duplicate-row-btn small-btn">❐</button>
            <button class="remove-row-btn">&times;</button>
        `;
        this.spellDamageRowsContainer.appendChild(newRow);
        newRow.querySelectorAll('.adaptive-text-input').forEach(input => this._resizeInput(input));
        return newRow;
    }

    duplicateSpellDamageRow(originalRow) {
        if (!originalRow) return;
        const originalData = {
            name: originalRow.querySelector('input[id^="spell-name-"]').value,
            base: originalRow.querySelector('input[id^="spell-damage-"]').value,
            clScaled: originalRow.querySelector('input[id^="spell-cl-scaling-"]').value,
            casterLevel: originalRow.querySelector('input[id^="caster-level-"]').value,
            hitCount: originalRow.querySelector('input[id^="spell-hit-count-"]').value,
        };
        const additionalScalingsData = [];
        let nextSibling = originalRow.nextElementSibling;
        while (nextSibling && nextSibling.classList.contains('additional-scaling-row')) {
            additionalScalingsData.push({
                base: nextSibling.querySelector('input[id^="additional-scaling-base-"]').value,
                clScaled: nextSibling.querySelector('input[id^="additional-scaling-cl-"]').value,
                profileId: nextSibling.querySelector('select[id^="additional-scaling-sp-select-"]').value,
            });
            nextSibling = nextSibling.nextElementSibling;
        }

        const newRow = this.addSpellDamageRow(new Event('dummy'));
        newRow.querySelector('input[id^="spell-name-"]').value = originalData.name + " (Copy)";
        newRow.querySelector('input[id^="spell-damage-"]').value = originalData.base;
        newRow.querySelector('input[id^="spell-cl-scaling-"]').value = originalData.clScaled;
        newRow.querySelector('input[id^="caster-level-"]').value = originalData.casterLevel;
        newRow.querySelector('input[id^="spell-hit-count-"]').value = originalData.hitCount;

        additionalScalingsData.forEach(scalingData => {
            this._addAdditionalScalingInput(newRow);
            const lastScalingRow = Array.from(newRow.parentElement.querySelectorAll('.additional-scaling-row')).pop();
            if (lastScalingRow) {
                lastScalingRow.querySelector('input[id^="additional-scaling-base-"]').value = scalingData.base;
                lastScalingRow.querySelector('input[id^="additional-scaling-cl-"]').value = scalingData.clScaled;
                lastScalingRow.querySelector('select[id^="additional-scaling-sp-select-"]').value = scalingData.profileId;
            }
        });
        this.resizeAllAdaptiveInputs();
        this.handleInputChange();
        this.manager.saveState();
    }

    _getInputs() {
        const spellPowerProfiles = this._getSpellPowerProfiles();
        const spellDamageSources = [];
        this.spellDamageRowsContainer.querySelectorAll('.input-group-row:not(.additional-scaling-row)').forEach((row, i) => {
            const additionalScalings = [];
            let nextSibling = row.nextElementSibling;
            while (nextSibling && nextSibling.classList.contains('additional-scaling-row')) {
                additionalScalings.push({
                    base: parseDiceNotation(nextSibling.querySelector('input[id^="additional-scaling-base-"]').value),
                    clScaled: parseDiceNotation(nextSibling.querySelector('input[id^="additional-scaling-cl-"]').value),
                    profileId: parseInt(nextSibling.querySelector('select[id^="additional-scaling-sp-select-"]').value, 10) || 1
                });
                nextSibling = nextSibling.nextElementSibling;
            }
            spellDamageSources.push({
                name: row.querySelector('input[id^="spell-name-"]').value || `Source ${i + 1}`,
                base: parseDiceNotation(row.querySelector('input[id^="spell-damage-"]').value),
                clScaled: parseDiceNotation(row.querySelector('input[id^="spell-cl-scaling-"]').value),
                casterLevel: parseInt(row.querySelector('input[id^="caster-level-"]').value) || 0,
                hitCount: parseInt(row.querySelector('input[id^="spell-hit-count-"]').value) || 1,
                additionalScalings
            });
        });
        return {
            spellDamageSources,
            spellPowerProfiles,
            isEmpowered: this.empowerCheckbox.checked,
            isMaximized: this.maximizeCheckbox.checked,
            isIntensified: this.intensifyCheckbox.checked,
            isWellspring: this.wellspringCheckbox.checked,
            isNightHorrors: this.nightHorrorsCheckbox.checked,
        };
    }

    _getSpellPowerProfiles() {
        return Array.from(this.spellPowerSourcesContainer.querySelectorAll('.spell-power-profile')).map(p => ({
            id: parseInt(p.dataset.profileId, 10),
            spellPower: parseInt(p.querySelector(`input[id^="spell-power-"]`).value, 10) || 0,
            critChance: (parseFloat(p.querySelector(`input[id^="spell-crit-chance-"]`).value, 10) || 0) / 100,
            critDamage: (parseFloat(p.querySelector(`input[id^="spell-crit-damage-"]`).value, 10) || 0) / 100,
            type: p.querySelector(`input[id^="spell-power-type-"]`).value || ''
        }));
    }

    handleInputChange() {
        this.calculateSpellDamage();
        this.manager.updateComparisonTable();
    }

    calculateSpellDamage() {
        let totalBaseDamage = 0;
        const individualSpellDamages = [];
        const inputs = this._getInputs();
        const metamagicSpellPower = (inputs.isIntensified ? 75 : 0) + (inputs.isEmpowered ? 75 : 0) + (inputs.isMaximized ? 150 : 0);
        const totalBoostCritDamageBonus = (inputs.isWellspring ? 0.20 : 0) + (inputs.isNightHorrors ? 0.25 : 0);
        const totalSpellPowerBonus = metamagicSpellPower + (inputs.isWellspring ? 150 : 0);

        this.spellPowerSourcesContainer.querySelectorAll('.spell-power-profile').forEach(p => {
            const profileId = p.dataset.profileId;
            p.querySelector(`#metamagic-spell-power-bonus-${profileId}${this.idSuffix}`).textContent = totalSpellPowerBonus;
            p.querySelector(`#boost-crit-damage-bonus-${profileId}${this.idSuffix}`).textContent = `${totalBoostCritDamageBonus * 100}%`;
        });

        inputs.spellDamageSources.forEach(source => {
            let sourceTotalAverage = 0;
            const components = [];
            const baseProfile = inputs.spellPowerProfiles.find(p => p.id === 1) || inputs.spellPowerProfiles[0];
            if (baseProfile) {
                const totalSpellPower = baseProfile.spellPower + totalSpellPowerBonus;
                const spellPowerMultiplier = 1 + (totalSpellPower / 100);
                const critMultiplier = 2 + baseProfile.critDamage + totalBoostCritDamageBonus;
                const averageHit = (source.base + (source.clScaled * source.casterLevel)) * spellPowerMultiplier;
                sourceTotalAverage += (averageHit * (1 - baseProfile.critChance)) + (averageHit * critMultiplier * baseProfile.critChance);
                components.push({ name: `SP 1: ${baseProfile.type || 'Unnamed'}`, averageHit, averageCrit: averageHit * critMultiplier });
            }

            source.additionalScalings.forEach(scaling => {
                const profile = inputs.spellPowerProfiles.find(p => p.id === scaling.profileId) || inputs.spellPowerProfiles[0];
                if (profile) {
                    const totalSpellPower = profile.spellPower + totalSpellPowerBonus;
                    const averageHit = (scaling.base + (scaling.clScaled * source.casterLevel)) * (1 + (totalSpellPower / 100));
                    const critMultiplier = 2 + profile.critDamage + totalBoostCritDamageBonus;
                    sourceTotalAverage += (averageHit * (1 - profile.critChance)) + (averageHit * critMultiplier * profile.critChance);
                    components.push({ name: `SP ${scaling.profileId}: ${profile.type || 'Unnamed'}`, averageHit, averageCrit: averageHit * critMultiplier });
                }
            });

            sourceTotalAverage *= source.hitCount;
            individualSpellDamages.push({ name: source.name, components, totalAverage: sourceTotalAverage });
            totalBaseDamage += sourceTotalAverage;
        });

        this.totalAverageDamage = totalBaseDamage;
        this.individualSpellDamages = individualSpellDamages;
        this.averageBaseHit = individualSpellDamages.reduce((sum, s) => sum + s.components.reduce((cSum, c) => cSum + c.averageHit, 0), 0);
        this.averageCritHit = individualSpellDamages.reduce((sum, s) => sum + s.components.reduce((cSum, c) => cSum + c.averageCrit, 0), 0);

        this.avgSpellDamageSpan.textContent = totalBaseDamage.toFixed(2);
        this.totalAvgSpellDamageSpan.textContent = totalBaseDamage.toFixed(2);
        this.finalSpellDamageSpan.textContent = totalBaseDamage.toFixed(2);
        this._updateSummaryUI();
        this.updateSpellPowerSelectors();
    }

    _updateSummaryUI() {
        const summaryContainer = document.getElementById(`individual-spell-damage-summary${this.idSuffix}`);
        if (!summaryContainer) return;
        summaryContainer.innerHTML = '<h3>Individual Spell Damage</h3>';
        this.individualSpellDamages.forEach(spell => {
            const spellContainer = document.createElement('div');
            spellContainer.style.marginBottom = '0.5rem';
            spellContainer.innerHTML = `<strong>${spell.name} (Total Avg: ${spell.totalAverage.toFixed(2)})</strong>`;
            spell.components.forEach(c => {
                const p = document.createElement('p');
                p.style.marginLeft = '1rem';
                p.innerHTML = `<em>${c.name}</em><br>Avg Hit: ${c.averageHit.toFixed(2)}, Avg Crit: ${c.averageCrit.toFixed(2)}`;
                spellContainer.appendChild(p);
            });
            summaryContainer.appendChild(spellContainer);
        });
    }

    addSpellPowerSource(state = null) {
        const existingProfiles = this.spellPowerSourcesContainer.querySelectorAll('.spell-power-profile');
        const newProfileId = state?.id || (existingProfiles.length > 0 ? Math.max(...Array.from(existingProfiles).map(p => parseInt(p.dataset.profileId, 10))) + 1 : 1);
        const newProfile = document.createElement('div');
        newProfile.className = 'stats-group spell-power-profile';
        newProfile.dataset.profileId = newProfileId;
        newProfile.innerHTML = `
            <div class="profile-header">
                <label class="section-headline">Spell Power & Criticals ${newProfileId}</label>
                <input type="text" id="spell-power-type-${newProfileId}${this.idSuffix}" class="adaptive-text-input spell-power-type-input" value="${state?.type || ''}">
            </div>
            <div class="input-group-row">
                <label for="spell-power-${newProfileId}${this.idSuffix}">Spell Power</label>
                <input type="number" id="spell-power-${newProfileId}${this.idSuffix}" value="${state?.spellPower || '500'}" class="small-input">
                <span class="plus-symbol">+</span>
                <span id="metamagic-spell-power-bonus-${newProfileId}${this.idSuffix}" class="read-only-bonus">0</span>
            </div>
            <div class="input-group-row">
                <label for="spell-crit-chance-${newProfileId}${this.idSuffix}">Crit Chance %</label>
                <input type="number" id="spell-crit-chance-${newProfileId}${this.idSuffix}" value="${state?.critChance || '20'}" class="small-input">
            </div>
            <div class="input-group-row">
                <label for="spell-crit-damage-${newProfileId}${this.idSuffix}">Crit Dmg Bonus %</label>
                <input type="number" id="spell-crit-damage-${newProfileId}${this.idSuffix}" value="${state?.critDamage || '100'}" class="small-input">
                <span class="plus-symbol">+</span>
                <span id="boost-crit-damage-bonus-${newProfileId}${this.idSuffix}" class="read-only-bonus">0</span>
            </div>
            <button class="remove-row-btn">&times;</button>
        `;
        this.spellPowerSourcesContainer.appendChild(newProfile);
        if (!state) {
            this.updateSpellPowerSelectors();
            this.handleInputChange();
        }
    }

    removeSpellPowerSource(profileElement) {
        if (this.spellPowerSourcesContainer.children.length <= 1) {
            alert("You cannot remove the last spell power source.");
            return;
        }
        profileElement.remove();
        this.updateSpellPowerSelectors();
        this.handleInputChange();
    }

    updateSpellPowerSelectors() {
        const profiles = this._getSpellPowerProfiles();
        const profileOptions = profiles.map(p => `<option value="${p.id}">SP ${p.id}</option>`).join('');
        document.querySelectorAll(`#calculator-set-${this.setId} select[id^="additional-scaling-sp-select-"]`).forEach(select => {
            const currentValue = select.value;
            select.innerHTML = profileOptions;
            select.value = profiles.some(p => p.id.toString() === currentValue) ? currentValue : (profiles.length > 0 ? profiles[0].id : '');
        });
        const allProfiles = this.spellPowerSourcesContainer.querySelectorAll('.spell-power-profile');
        allProfiles.forEach(p => p.querySelector('.remove-row-btn').classList.toggle('hidden', allProfiles.length <= 1));
    }

    setState(state) {
        super.setState(state);
        this.spellPowerSourcesContainer.innerHTML = '';
        if (state.spellPowerProfiles && state.spellPowerProfiles.length > 0) {
            state.spellPowerProfiles.forEach(p => this.addSpellPowerSource(p));
        } else {
            this.addSpellPowerSource();
        }
        this.spellDamageRowsContainer.innerHTML = '';
        if (state.spellDamageSources && state.spellDamageSources.length > 0) {
            state.spellDamageSources.forEach(source => {
                const newRow = this.addSpellDamageRow(new Event('dummy'));
                newRow.querySelector('input[id^="spell-name-"]').value = source.name;
                newRow.querySelector('input[id^="spell-damage-"]').value = source.base;
                newRow.querySelector('input[id^="spell-cl-scaling-"]').value = source.clScaled;
                newRow.querySelector('input[id^="caster-level-"]').value = source.casterLevel;
                newRow.querySelector('input[id^="spell-hit-count-"]').value = source.hitCount;
                if (source.additionalScalings) {
                    source.additionalScalings.forEach(s => {
                        this._addAdditionalScalingInput(newRow);
                        const lastScalingRow = Array.from(this.spellDamageRowsContainer.querySelectorAll('.additional-scaling-row')).pop();
                        if (lastScalingRow) {
                            lastScalingRow.querySelector('input[id^="additional-scaling-base-"]').value = s.base;
                            lastScalingRow.querySelector('input[id^="additional-scaling-cl-"]').value = s.clScaled;
                            lastScalingRow.querySelector('select[id^="additional-scaling-sp-select-"]').value = s.profileId;
                        }
                    });
                }
            });
        } else {
            this.addSpellDamageRow(new Event('dummy'));
        }
        this.updateSpellPowerSelectors();
        this.calculateSpellDamage();
    }

    getState() {
        const state = super.getState();
        state.spellDamageSources = [];
        this.spellDamageRowsContainer.querySelectorAll('.input-group-row:not(.additional-scaling-row)').forEach(row => {
            const additionalScalings = [];
            let nextSibling = row.nextElementSibling;
            while (nextSibling && nextSibling.classList.contains('additional-scaling-row')) {
                additionalScalings.push({
                    base: nextSibling.querySelector('input[id^="additional-scaling-base-"]').value,
                    clScaled: nextSibling.querySelector('input[id^="additional-scaling-cl-"]').value,
                    profileId: nextSibling.querySelector('select[id^="additional-scaling-sp-select-"]').value
                });
                nextSibling = nextSibling.nextElementSibling;
            }
            state.spellDamageSources.push({
                name: row.querySelector('input[id^="spell-name-"]').value,
                base: row.querySelector('input[id^="spell-damage-"]').value,
                clScaled: row.querySelector('input[id^="spell-cl-scaling-"]').value,
                casterLevel: row.querySelector('input[id^="caster-level-"]').value,
                hitCount: row.querySelector('input[id^="spell-hit-count-"]').value,
                additionalScalings
            });
        });

        state.spellPowerProfiles = this._getSpellPowerProfiles().map(p => ({
            id: p.id,
            spellPower: p.spellPower,
            critChance: p.critChance * 100,
            critDamage: p.critDamage * 100,
            type: p.type
        }));

        return state;
    }
}
