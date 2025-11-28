---
[Create Time]: 2025-11-28T00:22:22.000Z
[Title]: DDO Damage Calculator - UI/UX and State Persistence
[Summary]:
- **Spell Calculator Fixes**: Resolved initial bugs preventing the spell calculator from functioning.
- **UI Refinements for "Spell Crafter"**:
  - Renamed "Spell Properties" to "Spell Crafter".
  - Replaced the global caster level with a per-row "CL" input.
  - Re-introduced the "Spell Name" input field while removing its label.
  - Adjusted labels for clarity (e.g., "per CL") and added a "+" symbol for better visual flow.
  - Made input boxes smaller and adaptive to their content for a more compact UI.
- **State Persistence**:
  - Implemented functionality to save the active set/tab to session storage.
  - Ensured the application correctly reloads to the last active set on a page refresh.
  - Debugged and fixed issues related to the state-loading logic.
---