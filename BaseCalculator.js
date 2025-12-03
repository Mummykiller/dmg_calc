export class BaseCalculator {
    constructor(setId, manager, name) {
        if (this.constructor === BaseCalculator) {
            throw new Error("BaseCalculator cannot be instantiated directly.");
        }
        this.setId = setId;
        this.manager = manager;
        this.name = name;
        this.idSuffix = `-set${setId}`;
        this.totalAverageDamage = 0;

        this._measurementSpan = document.createElement('span');
        this._measurementSpan.style.position = 'absolute';
        this._measurementSpan.style.visibility = 'hidden';
        this._measurementSpan.style.whiteSpace = 'nowrap';
        document.body.appendChild(this._measurementSpan);

        this.getElements();
        this.addEventListeners();
        this._initializeAdaptiveInputs();
    }

    getElements() {
        // This method will be implemented by subclasses
    }

    addEventListeners() {
        const calculatorElement = document.getElementById(`calculator-set-${this.setId}`);
        if (!calculatorElement) return;

        const recordChange = (e) => {
            this.handleInputChange();
            if (this.manager) {
                this.manager.saveState();
            }
        };

        calculatorElement.addEventListener('input', recordChange);
        calculatorElement.addEventListener('change', recordChange);

        // Subclasses will add their specific listeners
    }

    removeEventListeners() {
        // With event delegation, we don't need to remove listeners from individual inputs.
        // The listeners are on the container, which gets removed from the DOM entirely
        // when a set is deleted, cleaning up the listeners automatically.
    }

    handleInputChange() {
        // This method will be implemented by subclasses
    }

    getState() {
        const state = {};
        const allInputs = document.querySelectorAll(`#calculator-set-${this.setId} input, #calculator-set-${this.setId} select`);
        allInputs.forEach(input => {
            const key = input.id.replace(this.idSuffix, '');
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
            const key = input.id.replace(this.idSuffix, '');
            if (state.hasOwnProperty(key)) {
                if (input.type === 'checkbox') {
                    input.checked = state[key];
                } else {
                    input.value = state[key];
                }
            }
        });

        this.resizeAllAdaptiveInputs();
        // Subclasses should call this and then their specific calculation method
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

    _resizeInput(inputElement) {
        const computedStyle = window.getComputedStyle(inputElement);
        this._measurementSpan.style.fontFamily = computedStyle.fontFamily;
        this._measurementSpan.style.fontSize = computedStyle.fontSize;
        this._measurementSpan.style.fontWeight = computedStyle.fontWeight;
        this._measurementSpan.style.letterSpacing = computedStyle.letterSpacing;
        this._measurementSpan.style.textTransform = computedStyle.textTransform;

        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const borderWidthLeft = parseFloat(computedStyle.borderLeftWidth);
        const borderWidthRight = parseFloat(computedStyle.borderRightWidth);

        this._measurementSpan.textContent = inputElement.value || inputElement.placeholder || '';
        let desiredWidth = this._measurementSpan.offsetWidth + paddingLeft + paddingRight + borderWidthLeft + borderWidthRight + 4;
        const minWidth = parseFloat(computedStyle.minWidth) || 50;

        inputElement.style.width = `${Math.max(minWidth, desiredWidth)}px`;
    }

    _initializeAdaptiveInputs() {
        const calculatorElement = document.getElementById(`calculator-set-${this.setId}`);
        if (!calculatorElement) return;

        calculatorElement.addEventListener('input', (e) => {
            if (e.target.classList.contains('adaptive-text-input')) {
                this._resizeInput(e.target);
            }
        });

        this.resizeAllAdaptiveInputs();
    }

    resizeAllAdaptiveInputs() {
        const calculatorElement = document.getElementById(`calculator-set-${this.setId}`);
        if (!calculatorElement) return;
        calculatorElement.querySelectorAll('.adaptive-text-input').forEach(input => this._resizeInput(input));
    }
}
