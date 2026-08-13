# Study Group Chat Visual Enhancement Plan

The goal is to transform the "Study Group" chat interface from a plain white background to a professional, immersive, and department-specific experience similar to modern messaging apps like WhatsApp or Facebook Messenger.

## Proposed Changes

### 1. Thematic Backgrounds (WhatsApp Style)
- **Base Layer:** Replace the solid white/gray background with a subtle, textured pattern (geometric or themed).
- **Adaptive Theming:** 
  - The background will adjust its intensity based on Light/Dark mode.
  - In Dark mode, it will use deep "Seven Blue" tones with low-opacity patterns.
  - In Light mode, it will use soft off-white/cream tones with delicate gray patterns.

### 2. Department-Specific Visual Cues
Instead of identical backgrounds for everyone, we will introduce subtle color shifts and pattern variations based on the department:
- **Information Technology (IT):** Subtle circuit-board patterns or code-snippet silhouettes in cobalt blue/cyan tones.
- **Mechatronics:** Technical blueprint or gear patterns in slate/steel blue tones.
- **Autotronics:** Automotive curves or carbon fiber textures in charcoal/deep blue tones.
- **Renewable Energy:** Soft leaf or solar cell patterns in emerald/teal-tinted blues.

### 3. Glassmorphism & UI Polishing
- **Header & Footer:** Use high-blur glassmorphism (`backdrop-blur`) to keep the "Seven Blue" identity while letting the background texture peek through.
- **Message Bubbles:**
  - **Sent:** Gradient "Seven Blue" with subtle inner shadows.
  - **Received:** Soft surface color with a micro-border to maintain readability against the pattern.

### 4. Implementation Details
- Create a `ChatBackground` component that selects the pattern based on the department name/ID.
- Use CSS masks or low-opacity SVG backgrounds to ensure text remains 100% legible (WCAG compliant).
- Backgrounds will be "Fixed" so messages scroll over them smoothly.

## User Impact
- **Reduced Eye Strain:** Themed backgrounds provide better visual rest than pure white.
- **Professional Identity:** Students feel they are in a dedicated academic space for their specific major.
- **Modern Feel:** Aligns the app with high-end global communication platforms.
