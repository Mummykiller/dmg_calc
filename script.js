import { WeaponCalculator } from './WeaponCalculator.js';
import { SpellCalculator } from './SpellCalculator.js';
import { BaseCalculator } from './BaseCalculator.js';

document.addEventListener('DOMContentLoaded', () => {
    class CalculatorManager {
        constructor() {
            this.calculators = new Map();
            this.navContainer = document.querySelector('.set-navigation');
            this.setsContainer = document.querySelector('.calculator-wrapper');
            this.addSetBtn = document.getElementById('add-weapon-set-btn');
            this.addSpellSetBtn = document.getElementById('add-spell-set-btn');
            this.comparisonTbody = document.getElementById('comparison-tbody');
            this.templateHTML = this.getTemplateHTML();
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
            this.undoStack = [];
            this.redoStack = [];
            this.activeSetId = 1;
            this.nextSetId = 1;

            this.addSetBtn.addEventListener('click', () => this.addNewSet());
            this.addSpellSetBtn.addEventListener('click', () => this.addNewSpellSet());
            if (!this.loadState()) {
                this.addNewSet(1);
                this.calculators.get(1)?.calculateDdoDamage();
            }

            this.addDragAndDropListeners();
            this.addImportExportListeners();
            this.addUndoRedoListeners();
        }

        addNewSet(setIdToUse = null, index = -1) {
            if (this.calculators.size >= 6) {
                alert("You have reached the maximum of 6 weapon sets.");
                return;
            }

            if (setIdToUse === null) {
                this.recordAction({ type: 'add', setId: this.findNextAvailableId() });
            }

            const activeCalc = this.calculators.get(this.activeSetId);
            const stateToCopy = (setIdToUse === null && activeCalc instanceof WeaponCalculator) ? activeCalc.getState() : null;

            let newSetId = setIdToUse !== null ? setIdToUse : this.findNextAvailableId();
            if (newSetId >= this.nextSetId) {
                this.nextSetId = newSetId + 1;
            }

            const templateNode = document.getElementById('calculator-set-template').content.cloneNode(true);
            let modifiedInnerHtml = templateNode.firstElementChild.outerHTML.replace(/\s(id)="([^"]+)"/g, ` id="$2-set${newSetId}"`);
            modifiedInnerHtml = modifiedInnerHtml.replace(/for="([^"]+)"/g, `for="$1-set${newSetId}"`);

            const newSetContainer = document.createElement('div');
            newSetContainer.id = `calculator-set-${newSetId}`;
            newSetContainer.className = 'calculator-container calculator-set';
            newSetContainer.innerHTML = modifiedInnerHtml;

            const allContainers = this.setsContainer.querySelectorAll('.calculator-set');
            this.setsContainer.insertBefore(newSetContainer, index !== -1 && index < allContainers.length ? allContainers[index] : null);

            const tab = this.createTab(newSetId);
            const allTabs = this.navContainer.querySelectorAll('.nav-tab');
            const firstButton = this.navContainer.querySelector('.nav-action-btn');
            this.navContainer.insertBefore(tab, index !== -1 && index < allTabs.length ? allTabs[index] : (firstButton || null));

            const newCalc = new WeaponCalculator(newSetId, this, `Set ${newSetId}`);
            this.calculators.set(newSetId, newCalc);

            if (stateToCopy && newCalc) {
                newCalc.setState(stateToCopy);
            }

            this.switchToSet(newSetId);
            if (!this.isLoading) {
                this.saveState();
            }
            this.updateComparisonTable();
        }

        addNewSpellSet(setIdToUse = null, index = -1) {
            if (this.calculators.size >= 6) {
                alert("You have reached the maximum of 6 sets.");
                return;
            }

            const activeCalc = this.calculators.get(this.activeSetId);
            const stateToCopy = (setIdToUse === null && activeCalc instanceof SpellCalculator) ? activeCalc.getState() : null;

            let newSetId = setIdToUse !== null ? setIdToUse : this.findNextAvailableId();
            if (newSetId >= this.nextSetId) {
                this.nextSetId = newSetId + 1;
            }

            const templateNode = document.getElementById('spell-calculator-template').content.cloneNode(true);
            let modifiedInnerHtml = templateNode.firstElementChild.outerHTML.replace(/\s(id)="([^"]+)"/g, ` id="$2-set${newSetId}"`);
            modifiedInnerHtml = modifiedInnerHtml.replace(/for="([^"]+)"/g, `for="$1-set${newSetId}"`);

            const newSetContainer = document.createElement('div');
            newSetContainer.id = `calculator-set-${newSetId}`;
            newSetContainer.className = 'calculator-container calculator-set';
            newSetContainer.innerHTML = modifiedInnerHtml;

            const allContainers = this.setsContainer.querySelectorAll('.calculator-set');
            this.setsContainer.insertBefore(newSetContainer, index !== -1 && index < allContainers.length ? allContainers[index] : null);

            const tab = this.createTab(newSetId);
            tab.classList.add('spell-tab-indicator');
            const allTabs = this.navContainer.querySelectorAll('.nav-tab');
            const firstButton = this.navContainer.querySelector('.nav-action-btn');
            this.navContainer.insertBefore(tab, index !== -1 && index < allTabs.length ? allTabs[index] : (firstButton || null));

            const newCalc = new SpellCalculator(newSetId, this, `Spell Set ${newSetId}`);
            this.calculators.set(newSetId, newCalc);

            if (stateToCopy && newCalc) {
                newCalc.setState(stateToCopy);
            }

            this.switchToSet(newSetId);
            if (!this.isLoading) {
                this.saveState();
            }
            this.updateComparisonTable();
        }

        createTab(setId) {
            const tab = document.createElement('div');
            tab.className = 'nav-tab';
            tab.draggable = true;
            tab.dataset.set = setId;

            const tabNameSpan = document.createElement('span');
            tabNameSpan.className = 'tab-name';
            tabNameSpan.textContent = `Set ${setId}`;
            tabNameSpan.contentEditable = true;
            tabNameSpan.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    tabNameSpan.blur();
                }
            });
            tabNameSpan.addEventListener('blur', () => {
                const calc = this.calculators.get(setId);
                if (calc) {
                    calc.handleInputChange();
                    if (this.activeSetId === setId) {
                        calc.updateSummaryHeader();
                    }
                }
            });

            this.addNameChangeListeners(tabNameSpan, setId);
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-tab-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.title = 'Remove this set';
            closeBtn.addEventListener('click', e => {
                e.stopPropagation();
                this.removeSet(setId);
            });

            tab.append(tabNameSpan, closeBtn);
            tab.addEventListener('click', () => this.switchToSet(setId));
            return tab;
        }

        addNameChangeListeners(span, setId) {
            let oldName = '';
            span.addEventListener('focus', () => oldName = span.textContent);
            span.addEventListener('blur', () => {
                const newName = span.textContent;
                if (oldName !== newName) {
                    this.recordAction({ type: 'RENAME', setId, oldValue: oldName, newValue: newName });
                    const calc = this.calculators.get(setId);
                    if (calc) {
                        calc.handleInputChange();
                        if (this.activeSetId === setId) calc.updateSummaryHeader();
                    }
                }
            });
        }

        recreateSet(setId, state, index) {
            if (state.type === 'spell') {
                this.addNewSpellSet(setId, index);
            } else {
                this.addNewSet(setId, index);
            }
            const newCalc = this.calculators.get(setId);
            if (newCalc) {
                newCalc.setState(state);
                newCalc.setTabName(state.tabName);
                if (newCalc instanceof WeaponCalculator) {
                    newCalc.updateSummaryHeader();
                }
            }
            this.switchToSet(this.activeSetId || setId);
        }

        removeSet(setId, isLoading = false) {
            if (this.calculators.size <= 1) {
                alert("You cannot remove the last set.");
                return;
            }
            const calcToRemove = this.calculators.get(setId);
            if (!isLoading) {
                const state = calcToRemove.getState();
                state.tabName = calcToRemove.getTabName();
                state.type = calcToRemove instanceof SpellCalculator ? 'spell' : 'weapon';
                const tabs = [...this.navContainer.querySelectorAll('.nav-tab')];
                const index = tabs.findIndex(tab => parseInt(tab.dataset.set, 10) === setId);
                this.recordAction({ type: 'REMOVE_SET', setId, state, index });
            }
            calcToRemove?.removeEventListeners();
            this.calculators.delete(setId);
            document.getElementById(`calculator-set-${setId}`).remove();
            document.querySelector(`.nav-tab[data-set="${setId}"]`).remove();
            if (this.activeSetId === setId) {
                this.switchToSet(this.calculators.keys().next().value || null);
            }
            if (!isLoading) {
                this.saveState();
                this.updateComparisonTable();
            }
        }

        switchToSet(setId) {
            document.querySelectorAll('.nav-tab, .calculator-set').forEach(el => el.classList.remove('active'));
            document.querySelector(`.nav-tab[data-set="${setId}"]`)?.classList.add('active');
            document.getElementById(`calculator-set-${setId}`)?.classList.add('active');
            this.activeSetId = setId;
            const calc = this.calculators.get(setId);
            if (calc instanceof WeaponCalculator) {
                calc.updateSummaryHeader();
            }
        }

        updateComparisonTable() {
            if (!this.comparisonTbody) return;

            const damages = Array.from(this.calculators.values()).map(c => c.totalAverageDamage);
            const maxDamage = damages.length > 0 ? Math.max(...damages) : 0;
            this.comparisonTbody.innerHTML = '';

            this.calculators.forEach(calc => {
                const row = this.comparisonTbody.insertRow();
                let diffText = 'N/A';
                if (maxDamage > 0) {
                    if (calc.totalAverageDamage === maxDamage) {
                        diffText = '<span class="best-damage-badge">Best</span>';
                    } else {
                        diffText = `${(((calc.totalAverageDamage - maxDamage) / maxDamage) * 100).toFixed(1)}%`;
                    }
                }

                const nameCell = row.insertCell();
                nameCell.textContent = calc.getTabName();

                const totalDmgCell = row.insertCell();
                totalDmgCell.textContent = calc.totalAverageDamage.toFixed(2);

                const diffCell = row.insertCell();
                diffCell.innerHTML = diffText;

                if (calc instanceof WeaponCalculator) {
                    row.insertCell().textContent = calc.totalAvgBaseHitDmg.toFixed(2);
                    row.insertCell().textContent = calc.totalAvgSneakDmg.toFixed(2);
                    row.insertCell().textContent = calc.totalAvgImbueDmg.toFixed(2);
                    row.insertCell().textContent = calc.totalAvgUnscaledDmg.toFixed(2);
                    row.insertCell().textContent = calc.totalAvgScaledDiceDmg.toFixed(2);
                } else {
                    row.insertCell().textContent = calc.averageBaseHit.toFixed(2);
                    row.insertCell().textContent = calc.averageCritHit.toFixed(2);
                    row.insertCell().textContent = '-';
                    row.insertCell().textContent = '-';
                    row.insertCell().textContent = '-';
                }
            });
        }

        addDragAndDropListeners() {
            let draggedTab = null;
            let placeholder = null;
            this.navContainer.addEventListener('dragstart', e => {
                const target = e.target.closest('.nav-tab');
                if (target) {
                    draggedTab = target;
                    placeholder = document.createElement('div');
                    placeholder.className = 'nav-tab-placeholder';
                    placeholder.style.width = `${draggedTab.offsetWidth}px`;
                    placeholder.style.height = `${draggedTab.offsetHeight}px`;
                    setTimeout(() => draggedTab.classList.add('dragging'), 0);
                }
            });
            this.navContainer.addEventListener('dragend', () => {
                if (draggedTab) {
                    draggedTab.classList.remove('dragging');
                    draggedTab = null;
                    placeholder?.remove();
                    placeholder = null;
                }
            });
            this.navContainer.addEventListener('dragover', e => {
                e.preventDefault();
                if (!placeholder) return;
                const afterElement = this._getDragAfterElement(this.navContainer, e.clientX);
                this.navContainer.insertBefore(placeholder, afterElement || this.navContainer.querySelector('.nav-action-btn'));
            });
            this.navContainer.addEventListener('drop', e => {
                e.preventDefault();
                if (!draggedTab) return;
                const afterElement = this._getDragAfterElement(this.navContainer, e.clientX);
                const draggedContainer = document.getElementById(`calculator-set-${draggedTab.dataset.set}`);
                this.navContainer.insertBefore(draggedTab, afterElement || this.navContainer.querySelector('.nav-action-btn'));
                this.setsContainer.insertBefore(draggedContainer, afterElement ? document.getElementById(`calculator-set-${afterElement.dataset.set}`) : null);
                this.switchToSet(this.activeSetId);
                this.saveState();
            });
        }

        addImportExportListeners() {
            this.exportBtn.addEventListener('click', () => this.showExportModal());
            this.importBtn.addEventListener('click', () => this.showImportModal());
            this.modalCloseBtn.addEventListener('click', () => this.hideModal());
            this.modalBackdrop.addEventListener('click', e => {
                if (e.target === this.modalBackdrop) this.hideModal();
            });
            this.modalCopyBtn.addEventListener('click', () => this.copyToClipboard());
            this.modalSaveFileBtn.addEventListener('click', () => this.saveToFile());
            this.modalLoadBtn.addEventListener('click', () => this.importFromText());
            this.modalFileInput.addEventListener('change', e => this.importFromFile(e));
            this.formatJsonBtn.addEventListener('click', () => this.setExportFormat('json'));
            this.formatSummaryBtn.addEventListener('click', () => this.setExportFormat('summary'));
        }

        showExportModal() {
            this.modalTitle.textContent = 'Export Sets';
            this.modalDescription.textContent = 'Copy the text below or save it to a file to import later.';
            this.modalTextarea.value = this.getSetsAsJSON();
            this.modalTextarea.readOnly = true;
            this.modalCopyBtn.classList.remove('hidden');
            this.modalSaveFileBtn.classList.remove('hidden');
            this.modalLoadBtn.classList.add('hidden');
            this.modalFileInput.classList.add('hidden');
            document.querySelector('.modal-format-toggle').classList.remove('hidden');
            this.modalBackdrop.classList.remove('hidden');
            this.setExportFormat('json');
        }

        setExportFormat(format) {
            this.formatJsonBtn.classList.toggle('active', format === 'json');
            this.formatSummaryBtn.classList.toggle('active', format === 'summary');
            this.modalTextarea.value = format === 'json' ? this.getSetsAsJSON() : this.getSetsAsSummary();
        }

        showImportModal() {
            this.modalTitle.textContent = 'Import Sets';
            this.modalDescription.textContent = 'Paste set data into the text area and click "Load", or upload a file.';
            this.modalTextarea.value = '';
            this.modalTextarea.readOnly = false;
            this.modalTextarea.placeholder = 'Paste your exported set data here...';
            this.modalCopyBtn.classList.add('hidden');
            this.modalSaveFileBtn.textContent = 'Load from File';
            this.modalSaveFileBtn.onclick = () => this.modalFileInput.click();
            this.modalSaveFileBtn.classList.remove('hidden');
            this.modalLoadBtn.classList.remove('hidden');
            document.querySelector('.modal-format-toggle').classList.add('hidden');
            this.modalBackdrop.classList.remove('hidden');
        }

        hideModal() {
            this.modalBackdrop.classList.add('hidden');
            this.modalSaveFileBtn.textContent = 'Save to File';
            this.modalSaveFileBtn.onclick = () => this.saveToFile();
        }

        getSetsAsJSON() {
            const stateToSave = [];
            this.navContainer.querySelectorAll('.nav-tab').forEach(tab => {
                const calc = this.calculators.get(parseInt(tab.dataset.set, 10));
                if (calc) {
                    const state = calc.getState();
                    state.tabName = calc.getTabName();
                    state.setId = calc.setId;
                    state.type = calc instanceof SpellCalculator ? 'spell' : 'weapon';
                    stateToSave.push(state);
                }
            });
            return JSON.stringify(stateToSave, null, 2);
        }

        getSetsAsSummary() {
            let summary = `DDO Damage Calculator Export\nGenerated: ${new Date().toLocaleString()}\n\n`;
            this.navContainer.querySelectorAll('.nav-tab').forEach(tab => {
                const calc = this.calculators.get(parseInt(tab.dataset.set, 10));
                if (!calc) return;
                const state = calc.getState();
                summary += `========================================\n  Set: ${calc.getTabName()}\n========================================\n\n`;
                if (calc instanceof WeaponCalculator) {
                    summary += `--- Base Damage ---\nWeapon Dice [W]: ${state['weapon-dice'] || 0}\nDamage: ${state['weapon-damage'] || '0'} + ${state['bonus-base-damage'] || 0}\n\n`;
                    summary += `--- Critical Profile ---\nThreat Range: ${state['crit-threat'] || '20'}\nMultiplier: x${state['crit-multiplier'] || 2}\nSeeker: +${state['seeker-damage'] || 0}\n19-20 Multiplier: +${state['crit-multiplier-19-20'] || 0}\n\n`;
                    summary += `--- Hit/Miss Profile ---\nMiss on Roll <=: ${state['miss-threshold'] || 1}\nGraze on Roll <=: ${state['graze-threshold'] || 0}\nGraze Damage: ${state['graze-percent'] || 0}%\n\n`;
                    summary += `--- Unscaled Damage ---\n`;
                    let i = 1;
                    while(state.hasOwnProperty(`unscaled-damage-${i}`)) {
                        if (state[`unscaled-damage-${i}`] && state[`unscaled-damage-${i}`] !== '0') {
                            summary += `Source ${i}: ${state[`unscaled-damage-${i}`]} @ ${state[`unscaled-proc-chance-${i}`] || 100}% Proc, Multi-Strike: ${state[`unscaled-doublestrike-${i}`] ? 'Yes' : 'No'}${state[`unscaled-on-crit-${i}`] ? ', On Crit Only' : ''}\n`;
                        }
                        i++;
                    }
                    summary += `Melee/Ranged Power: ${state['melee-power'] || 0}\nSpell Power: ${state['spell-power'] || 0}\nMulti-Strike: ${state['doublestrike'] || 0}% (${state['is-doubleshot'] ? 'Doubleshot' : 'Doublestrike'})\n\n`;
                    summary += `--- Sneak Attack ---\nDamage: ${state['sneak-attack-dice'] || 0}d6 + ${state['sneak-bonus'] || 0}\n\n`;
                    summary += `--- Imbue Dice ---\nDice: ${state['imbue-dice-count'] || 0}d${state['imbue-die-type'] || 6}\nScaling: ${state['imbue-scaling'] || 100}% of ${state['imbue-uses-spellpower'] ? 'Spell Power' : 'Melee Power'}\n\n`;
                    summary += `--- AVERAGES ---\nTotal Avg Damage: ${calc.totalAverageDamage.toFixed(2)}\nAvg Base: ${calc.totalAvgBaseHitDmg.toFixed(2)}, Avg Sneak: ${calc.totalAvgSneakDmg.toFixed(2)}, Avg Imbue: ${calc.totalAvgImbueDmg.toFixed(2)}, Avg Unscaled: ${calc.totalAvgUnscaledDmg.toFixed(2)}\n\n\n`;
                } else if (calc instanceof SpellCalculator) {
                    summary += `--- Spell Properties ---\n`;
                    if (state.spellDamageSources) {
                        state.spellDamageSources.forEach((s, i) => {
                            summary += `  Spell ${i + 1} (${s.name || 'Unnamed'}):\n    Base Damage: ${s.base || '0'}\n    CL Scaled: ${s.clScaled || '0'}\n`;
                            if (calc.individualSpellDamages && calc.individualSpellDamages[i]) {
                                summary += `    Avg Hit (pre-crit): ${calc.individualSpellDamages[i].averageHit.toFixed(2)}\n    Avg Crit: ${calc.individualSpellDamages[i].averageCrit.toFixed(2)}\n`;
                            }
                        });
                    }
                    summary += `Caster Level: ${state['caster-level'] || 0}\nSpell Power: ${state['spell-power'] || 0}\nCrit Chance: ${state['spell-crit-chance'] || 0}%\nCrit Damage: ${state['spell-crit-damage'] || 0}%\n\n`;
                    summary += `--- AVERAGES ---\nTotal Avg Damage: ${calc.totalAverageDamage.toFixed(2)}\n\n\n`;
                }
            });
            return summary;
        }

        copyToClipboard() {
            navigator.clipboard.writeText(this.modalTextarea.value).then(() => alert('Set data copied to clipboard!'), () => alert('Failed to copy.'));
        }

        saveToFile() {
            const isJson = this.formatJsonBtn.classList.contains('active');
            const blob = new Blob([this.modalTextarea.value], { type: isJson ? 'application/json' : 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = isJson ? 'ddo-calc-sets.json' : 'ddo-calc-summary.txt';
            a.click();
            URL.revokeObjectURL(a.href);
        }

        importFromText() {
            this.loadSetsFromJSON(this.modalTextarea.value);
        }

        importFromFile(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = e => this.loadSetsFromJSON(e.target.result);
                reader.readAsText(file);
            }
            event.target.value = '';
        }

        saveState() {
            if (this.isLoading) return;
            const stateToSave = [];
            this.navContainer.querySelectorAll('.nav-tab').forEach(tab => {
                const calc = this.calculators.get(parseInt(tab.dataset.set, 10));
                if (calc) {
                    const state = calc.getState();
                    state.tabName = calc.getTabName();
                    state.setId = calc.setId;
                    state.type = calc instanceof SpellCalculator ? 'spell' : 'weapon';
                    stateToSave.push(state);
                }
            });
            sessionStorage.setItem('calculatorState', JSON.stringify(stateToSave));
            sessionStorage.setItem('activeSetId', this.activeSetId);
        }

        loadState() {
            return this.loadSetsFromJSON(sessionStorage.getItem('calculatorState'), sessionStorage.getItem('activeSetId'));
        }

        loadSetsFromJSON(jsonString, activeSetIdToLoad) {
            if (!jsonString) return false;
            try {
                const savedStates = JSON.parse(jsonString);
                if (!Array.isArray(savedStates) || savedStates.length === 0) return false;
                this.isLoading = true;
                this.calculators.clear();
                this.setsContainer.innerHTML = '';
                this.navContainer.querySelectorAll('.nav-tab').forEach(t => t.remove());
                this.nextSetId = 1;
                savedStates.forEach(state => {
                    if (state.type === 'spell') {
                        this.addNewSpellSet(state.setId);
                    } else {
                        this.addNewSet(state.setId);
                    }
                    const newCalc = this.calculators.get(state.setId);
                    newCalc?.setState(state);
                    newCalc?.setTabName(state.tabName);
                    if (newCalc instanceof WeaponCalculator) {
                        newCalc.updateSummaryHeader();
                    }
                });
                this.switchToSet(parseInt(activeSetIdToLoad, 10) || savedStates[0]?.setId || 1);
                this.isLoading = false;
                this.updateComparisonTable();
                this.hideModal();
                return true;
            } catch (error) {
                alert("Import failed. The provided data is not valid.");
                return false;
            }
        }

        addUndoRedoListeners() {
            document.addEventListener('keydown', e => {
                if (e.ctrlKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                }
                if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
                    e.preventDefault();
                    this.redo();
                }
            });
        }

        recordAction(action) {
            this.undoStack.push(action);
            this.redoStack = [];
        }

        undo() {
            if (this.undoStack.length === 0) return;
            const action = this.undoStack.pop();
            this.isLoading = true;
            if (action.type === 'REMOVE_SET') {
                this.recreateSet(action.setId, action.state, action.index);
                this.redoStack.push({ ...action, type: 'REMOVE_SET' });
            } else if (action.type === 'ADD_SET') {
                this.removeSet(action.setId, true);
                this.redoStack.push({ ...action, type: 'ADD_SET' });
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
            this.isLoading = true;
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

        _getDragAfterElement(container, x) {
            return [...container.querySelectorAll('.nav-tab:not(.dragging)')].reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = x - box.left - box.width / 2;
                return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }

        addGlobalEnterListener() {
            document.addEventListener('keyup', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const activeCalc = this.calculators.get(this.activeSetId);
                    activeCalc?.calculateDdoDamage?.();
                    activeCalc?.calculateSpellDamage?.();
                }
            });
        }

        getTemplateHTML() {
            const templateNode = document.getElementById('calculator-set-template');
            return templateNode ? templateNode.innerHTML : '';
        }

        findNextAvailableId() {
            let id = 1;
            while (this.calculators.has(id)) id++;
            if (id >= this.nextSetId) this.nextSetId = id + 1;
            return id;
        }
    }

    const themeToggleCheckbox = document.getElementById('theme-toggle-checkbox');
    const body = document.body;
    if (themeToggleCheckbox) {
        if (localStorage.getItem('theme') === 'dark') {
            body.classList.add('dark-mode');
            themeToggleCheckbox.checked = true;
        }
        themeToggleCheckbox.addEventListener('change', () => {
            body.classList.toggle('dark-mode');
            localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
        });
    }

    const manager = new CalculatorManager();
    manager.addGlobalEnterListener();
});
