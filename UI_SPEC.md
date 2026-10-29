# UI_SPEC — WAHA Sentinel Gateway Design System & Frontend Architecture

## 1. Visual Identity & Design Archetype

### 1.1 Aesthetic Benchmark
- **Primary Benchmark:** **Linear & Raycast Developer Tools** — Characterized by razor-sharp technical hierarchy, 1px structural hairline borders, precision monospace metadata tags, and purposeful mechanical micro-interactions.
- **Secondary Benchmark:** **Stripe Dashboard / Vercel Status Page** — Uncompromising daylight legibility, deliberate density, high-contrast typography, and absence of decorative fluff.

### 1.2 Design Philosophy
The design language embodies **High-Craft Daylight Utility & Forensic Telemetry**. It rejects frivolous digital ornamentation in favor of an ergonomic, mission-critical instrument feel. Every line, badge, and transition serves a diagnostic function:
- Surfaces feel like machined alabaster and matte cardstock.
- Motion (powered by GSAP 3.x) is strictly physics-informed and communicative, providing clear spatial continuity as the system transitions between locked, scanning, and active states.

### 1.3 Theme Polarity
- **Polarity:** **High-Craft Light Mode (Daylight-First)**.
- **Surface Construction:** Warm alabaster/ivory canvas (`#FAF9F5`) paired with crisp pure white elevation cards (`#FFFFFF`), anchored by neutral zinc structural borders (`#E4E4E7`) and deep carbon typographic ink (`#18181B`).

---

## 2. Anti-AI-Slop Blacklist (Zero-Tolerance Rules)

To ensure the interface feels custom-engineered rather than generated from generic AI templates, the following practices are **strictly forbidden**:

- ❌ **No Cliché Gradients:** BAN all generic purple-to-indigo gradients (`from-indigo-500 to-purple-600`), floating colorful blurred mesh blobs, and neon glassmorphism cards. Surfaces must remain solid, crisp, and tactile.
- ❌ **No Juvenile Border Radii:** BAN `rounded-3xl`, `rounded-full` cards, and pill buttons on primary structural frames. All cards and viewports are capped at architectural bounds (`rounded-lg` max 8px to 10px; buttons `rounded-md` 6px).
- ❌ **No Mushy Shadows:** BAN heavy, diffused, ambient drop-shadows (`shadow-2xl` without border definition). Replace with high-precision 1px structural outlines (`border border-zinc-200`) and crisp offset micro-shadows (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)`).
- ❌ **No Centered Empty Voids:** BAN unanchored, floating input boxes adrift in vast whitespace. All viewports must feature structured technical headers, breadcrumbs, status watermarks, or telemetry footers.
- ❌ **No Lazy Loading Spinners:** BAN generic circular spinning wheels (`animate-spin`). Loading states must utilize segmented technical progress meters, monospace telemetry log feeds, or synchronized countdown rings.
- ❌ **No Jarring State Pops:** BAN raw DOM insertions that flicker into view. Every state shift MUST use GSAP orchestrated transitions (`gsap.timeline` with staggered children and opacity/transform coordination).

---

## 3. Behavioral Psychology & Cognitive UX Architecture

### 3.1 Goal Gradient Effect (Perceived Momentum)
- During the QR pairing process, the interface never displays an ambiguous "waiting" screen. 
- A progressive status bar immediately starts at **40% ("Gateway Initialized")**, steps to **70% ("Matrix Stream Active")**, and accelerates to **100% ("Handshake Verified")** upon WhatsApp scan completion. This removes perceived latency and assures the operator of forward progress.

### 3.2 Reciprocity Engine & Operational Clarity
- Prior to prompting for the PIN, the gateway displays clear, read-only operational telemetry:
  - Gateway Host Status: `ONLINE (24ms)`
  - Target Daemon: `WAHA Core (Internal)`
  - Bound Session Name: `SESSION: default`
- The user understands the exact context and authority of the terminal before committing their credentials.

### 3.3 Loss Aversion Framing & Anti-Tamper Feedback
- When a session is active (`WORKING`), the interface visually locks all modification tools with a prominent security seal:
  - Headline: `SESSION PERMANENTLY LOCKED & ACTIVE`
  - Subtext: `Disconnecting or switching accounts will break 12 automated reporting workflows. Administrative clearance required.`
- This psychological framing discourages operators from attempting unauthorized account swaps or testing arbitrary numbers.

### 3.4 Contrast Effect & Visual Hierarchy
- Critical pairing states use extreme typography scale contrast:
  - Massive, high-contrast monospace status tokens: `WORKING` (32px, bold, emerald).
  - Microscopic technical metadata: `JID: 62811xxxx@c.us` (11px, `JetBrains Mono`, zinc-500).
  - This allows a field operator standing 2 meters away from a desktop screen to immediately determine if the system is operational.

### 3.5 Smart Defaults & Ergonomic Focus
- Upon entering the portal with a valid URL token, keyboard focus is automatically routed to the PIN input container.
- For mobile users, a virtual touch keypad with oversized hit-targets (minimum 56px height) prevents fat-finger errors during on-site deployment.

---

## 4. Design Tokens & Semantic Variables

### 4.1 Color Palette
```css
:root {
  /* Surface Tokens */
  --bg-root: #FAF9F5;              /* Warm Alabaster Canvas */
  --bg-surface: #FFFFFF;           /* Crisp White Elevated Cards */
  --bg-surface-subtle: #F4F4F5;    /* Technical Recessed Containers */
  --bg-surface-elevated: #FFFFFF;  /* Overlays / Popovers */

  /* Structural Border Tokens */
  --border-subtle: #E4E4E7;        /* 1px Structural Grid Line */
  --border-strong: #D4D4D8;        /* Interactive Element Borders */
  --border-focus: #18181B;         /* High-Contrast Focus Ring */

  /* Semantic State Accents */
  --accent-primary: #18181B;       /* Technical Deep Ink (Buttons/Headers) */
  --accent-success: #059669;       /* Verified Connected Emerald */
  --accent-success-bg: #ECFDF5;    /* Emerald Tint Badge Background */
  --accent-warning: #D97706;       /* Awaiting QR Scan Amber */
  --accent-warning-bg: #FFFBEB;    /* Amber Tint Badge Background */
  --accent-danger: #DC2626;        /* Daemon Halted / Denied Crimson */
  --accent-danger-bg: #FEF2F2;     /* Crimson Tint Badge Background */

  /* Typography Colors */
  --text-primary: #18181B;         /* Carbon Deep Black */
  --text-secondary: #52525B;       /* Neutral Muted Zinc */
  --text-tertiary: #A1A1AA;        /* Inactive Placeholder Zinc */
  --text-mono-accent: #0284C7;     /* Technical Blue Monospace Highlighting */
}
```

### 4.2 Typography Matrix
- **Display & Interface Sans:**  
  `font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`  
  - Tracking: `letter-spacing: -0.025em;` (Tight, professional editorial feel).
  - Weights: `font-medium (500)`, `font-semibold (600)`.
- **Telemetry & Data Monospace:**  
  `font-family: 'JetBrains Mono', 'Fira Code', monospace;`  
  - Applied to: PIN slots, status badges, JIDs, phone numbers, uptime timers, and error trace IDs.
  - Tracking: `letter-spacing: -0.01em;`.

### 4.3 Borders, Shadows, and Elevation
- **Card Outline:** `border: 1px solid var(--border-subtle);`
- **Architectural Micro-Shadow:** `box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04);`
- **Active Focus Shadow:** `box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px var(--text-primary);`

---

## 5. Core Component Anatomy & GSAP Micro-Interactions

### 5.1 Component 1: Segmented Master PIN Lock Box
- **Anatomy:**
  - 6 individual square boxes (`width: 48px; height: 56px`) with 1px zinc borders (`border-zinc-300`).
  - Active box highlights with an ink-black border (`border-zinc-900`) and subtle scale `1.04`.
  - Filled slots render a centered monospace dot (`•`).
- **GSAP Interaction Rules:**
  ```javascript
  // On Incorrect PIN Submission (Tactile Shake)
  gsap.timeline()
    .to('.pin-box', { x: -8, duration: 0.06, repeat: 5, yoyo: true, ease: 'power2.inOut' })
    .to('.pin-box', { borderColor: '#DC2626', duration: 0.15 }, 0)
    .to('.pin-box', { x: 0, borderColor: '#D4D4D8', duration: 0.25, delay: 0.2 });

  // On Valid Authentication (Unlock & Entrance Morph)
  gsap.timeline()
    .to('#auth-card', { scale: 0.96, opacity: 0, y: -20, duration: 0.35, ease: 'power3.in' })
    .set('#auth-screen', { display: 'none' })
    .set('#portal-screen', { display: 'flex', opacity: 0, y: 25 })
    .to('#portal-screen', { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' });
  ```

---

### 5.2 Component 2: Architectural QR Pairing Matrix Frame
- **Anatomy:**
  - Precision white card container with corner alignment crosshairs (`L-shaped` 1px accents on all 4 corners).
  - High-resolution SVG / PNG QR code centered in the frame with `p-4` padding.
  - Linear Radar Sweep Line: A 1px horizontal green/amber hairline continuously sweeping vertically across the QR code surface.
  - Expiry Ring: An animated SVG circular progress ring indicating remaining time in the 20-second validity cycle.
- **GSAP Interaction Rules:**
  ```javascript
  // Continuous Radar Sweep Animation
  const radarTween = gsap.fromTo('#qr-radar-line', 
    { top: '0%', opacity: 0.8 }, 
    { top: '100%', opacity: 0.2, duration: 2.2, ease: 'linear', repeat: -1 }
  );

  // QR Refresh Matrix Flash (On new QR fetch)
  gsap.timeline()
    .to('#qr-image', { filter: 'blur(4px)', opacity: 0.4, scale: 0.98, duration: 0.2 })
    .set('#qr-image', { attr: { src: newQrBase64 } })
    .to('#qr-image', { filter: 'blur(0px)', opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
  ```

---

### 5.3 Component 3: Verified Account Identity Shield (`WORKING` State)
- **Anatomy:**
  - Status Beacon: Pill badge with pulsing emerald green dot (`animate-ping` duration 2s, opacity 75%).
  - Large Monospace Typography displaying formatted phone number: `+62 811-2345-6789`.
  - Identity Grid Table: 2-column key-value matrix with dashed bottom borders:
    - `SESSION ID` &rarr; `default`
    - `WHATSAPP PUSH NAME` &rarr; `RSD Bot Monitor`
    - `SOCKET CONNECTION` &rarr; `CONNECTED // HEALTHY (99.9%)`
    - `ACCESS POLICY` &rarr; `1_SESSION_LOCKED (LOGOUT DISABLED)`
- **GSAP Transition from QR to Verified State:**
  ```javascript
  // Flip from QR Scanner to Verified Shield
  const stateTimeline = gsap.timeline();
  stateTimeline
    .to('#scanner-viewport', { 
      scaleY: 0.8, 
      opacity: 0, 
      duration: 0.3, 
      ease: 'power3.in' 
    })
    .set('#scanner-viewport', { display: 'none' })
    .set('#verified-viewport', { display: 'block', opacity: 0, y: 30 })
    .to('#verified-viewport', { 
      opacity: 1, 
      y: 0, 
      duration: 0.55, 
      ease: 'back.out(1.4)' 
    })
    .fromTo('#verified-checkmark', 
      { scale: 0, rotate: -45 }, 
      { scale: 1, rotate: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)' }, 
      '-=0.3'
    );
  ```

---

### 5.4 Component 4: Dormant Session Wake-up CTA (`STOPPED` State)
- **Anatomy:**
  - Matte black button with 1px border (`bg-zinc-900 hover:bg-zinc-800 text-white`).
  - Terminal cursor icon (`>_`) accompanied by text: `[ INITIALIZE SESSION ]`.
  - Once clicked, button morphs into a technical progress line (`h-2 bg-zinc-200`) with an infinite marquee slider (`bg-zinc-900`) until the WAHA daemon responds with `SCAN_QR_CODE`.

---

### 5.5 Component 5: Technical Telemetry Footer
- **Anatomy:**
  - Fixed bottom bar with `border-t border-zinc-200 bg-white/80 backdrop-blur-sm`.
  - Displays live server timestamp: `UTC+07:00 [WIB] 09:25:00`.
  - Latency badge: `PING: 18ms`.
  - System label: `SENTINEL DAEMON v1.2.0 // COOLIFY DOCKER NETWORK`.
