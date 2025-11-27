# DDO Damage Calculator

Formulate a plan before just running off with the user's instructions.

This project implements a web-based Dungeons and Dragons Online (DDO) Damage Calculator. It allows users to input various combat statistics and character attributes to calculate and compare average damage per hit for different weapon sets.

## Features

-   **Dynamic Calculator Sets:** Users can add multiple calculator sets to compare different weapon configurations or character builds side-by-side.
-   **Comprehensive Damage Calculation:** The calculator takes into account:
    -   Weapon dice and bonus base damage
    -   Critical threat range and multiplier (including 19-20 specific multipliers)
    -   Miss and graze thresholds with adjustable graze damage percentage
    -   Melee/Ranged Power and Spell Power
    -   Sneak Attack dice and flat bonuses
    -   Imbue dice, die type, scaling, and spell power utilization
    -   Unscaled damage sources with proc chance, multi-strike scaling, and on-crit conditions
    -   Reaper Skull difficulty scaling
-   **Interactive UI:**
    -   Input fields for all relevant combat stats.
    -   Real-time update of average damage results.
    -   Detailed breakdown of damage scaling.
    -   Table showing damage per d20 roll for a visual understanding of hit outcomes.
    -   Drag-and-drop functionality for reordering calculator sets.
    -   Tabbed navigation for switching between different calculator sets.
    -   Theming toggle (Light/Dark mode).
-   **Comparison Table:** A summary table displays the total average damage and components for all active calculator sets, highlighting the best performing set.
-   **State Management:** The calculator's state (all input values and active sets) is saved locally in the browser, allowing users to return to their previous calculations.
-   **Import/Export Functionality:** Users can import and export calculator set data in JSON format or as a human-readable summary. This allows for sharing configurations or backing them up.

## Technologies Used

-   **HTML5:** For the basic structure and content of the web page.
-   **CSS3:** For styling the application, including responsive design, light/dark themes, and visual layout.
-   **JavaScript (ES6+):** For all interactive functionality, damage calculation logic, DOM manipulation, and state management. The application uses two main classes:
    -   `Calculator`: Handles the logic and UI interactions for a single damage calculator instance.
    -   `CalculatorManager`: Manages multiple `Calculator` instances, tab navigation, drag-and-drop, import/export, and overall application state.

## How it Works

The core logic revolves around parsing user inputs, calculating probabilities for different hit outcomes (miss, graze, normal hit, critical hit), and then combining these probabilities with various damage components (base weapon damage, sneak attack, imbue, unscaled damage) and their respective scaling factors (Melee/Ranged Power, Spell Power, critical multipliers, multi-strike, Reaper penalty).

Damage calculation is performed based on standard DDO mechanics, such as:
-   Average dice roll calculation (`1d6` averages to `3.5`).
-   Application of percentage-based scaling from Melee/Ranged/Spell Power.
-   Special handling for critical hits and grazes.
-   Dynamic unscaled damage sources with individual proc chances and multi-strike applicability.

The UI is dynamically generated and updated using JavaScript, allowing for a flexible and interactive user experience. The use of local storage ensures persistence of user data across sessions.
