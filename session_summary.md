---
[Create Time]: 2025-11-30
[Title]: DDO Damage Calculator - Spell Calculator Enhancements
[Summary]:
- Removed Magical Resistance Rating (MRR) inputs, calculations, and display elements from the spell damage calculator.
  - Resolved a bug where calculation stopped due to an undefined 'finalDamage' variable after MRR removal.
- Implemented functionality to dynamically add/remove "Additional Scaling" input boxes per spell row.
  - The "Add" button ("+") now appears within each spell row.
  - When pressed, it adds an "Additional Scaling" input field and a "Remove" button ("-").
  - A maximum of 5 "Additional Scaling" inputs can be added per spell row.
  - The "Remove" button deletes the last added "Additional Scaling" input.
  - Logic for handling visibility of "+" and "-" buttons based on the number of "Additional Scaling" inputs has been implemented.
  - `_getInputs()`, `getState()`, and `setState()` in `SpellCalculator.js` were updated to correctly handle multiple and optional "Additional Scaling" inputs for calculation and state persistence.
---