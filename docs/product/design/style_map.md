# Skelenote Style Map (Framer)

**Goal:** Transform the **Dreelio Templates** (Cool Blue/Tech) into **Skelenote** (Warm/Cozy Rationalism).

This guide maps Dreelio's variables to Skelenote's Design System tokens.

---

## 1. Color Mapping

| Dreelio Element (Original) | Skelenote Replacement | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Global Background** (Light Blue) | **Canvas** | `#FAFAFA` | Warm, paper-like background. |
| **Card Background** (White/Glass) | **Paper** | `#FFFFFF` | Clean, crisp surfaces. |
| **Primary Text** (Black/Charcoal) | **Carbon** | `#18181B` | Softer than pure black. |
| **Secondary Text** (Gray) | **Graphite** | `#52525B` | readable metadata. |
| **Accent / Button** (Deep Blue) | **Ember** | `#B85C50` | **CRITICAL IDENTIFIER.** The primary brand color. |
| **Secondary Accent** (Light Blue) | **Sage** | `#5E8C61` | Use for "Success" or positive states. |
| **Borders/Lines** | **Vellum** | `#E4E4E7` | Subtle 1px definition. |

---

## 2. Typography Settings

Dreelio uses **Open Runde**.
**Recommendation:** Switch to **Inter** (Google Fonts) to match the app, or stick with Open Runde if you want a friendlier marketing vibe.

If using **Inter**:

* **Headings (H1-H3):** Semibold (600), Tight Tracking (`-0.02em`)
* **Body:** Regular (400), Relaxed Line Height (`1.5`)
* **Monospace (Code/Keys):** JetBrains Mono or Fragment Mono

---

## 3. Visual Treatment Rules

### 1. "Cozy" Borders

* **Do:** Use 1px borders in `Vellum` (`#E4E4E7`) to define card edges.
* **Don't:** Use heavy drop shadows. Dreelio relies on soft shadows; try to reduce their opacity or remove them in favor of borders.

### 2. Corner Radius

* Dreelio uses large rounded corners (~24px).
* **Skelenote Brand:** Uses tighter radius (`4px` - `8px`).
* **Instruction:** Reduce all Card and Button corner radii to **8px** to feel more "Rational" and less "Toy-like".

### 3. Whitespace (Density)

* Dreelio is very airy.
* **Instruction:** Tighten specific vertical gaps between text and subheads to match our "High Density" philosophy, but keep section spacing large to maintain elegance.
