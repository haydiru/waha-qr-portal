# .harness / EXPERIENCE.md — Architectural Memory & Verification Records

## Context & Project Scope
- Project: WAHA Sentinel Gateway (Dedicated Session Scanner & Status Portal)
- Tech Stack: Node.js 20 LTS (Alpine base) Express Proxy + Vanilla HTML5/Tailwind/GSAP 3.12+ Single Page Interface.
- Target: Coolify Docker Network (`coolify`), Traefik ingress, reverse-proxied to internal `waha:3000`.

## Architectural Invariants & Learned Heuristics
1. **Zero Client-Side Token Exposure**:
   - The WAHA Core API token (`WAHA_API_KEY`) must never be delivered or referenced in client-side bundles or network payloads.
   - All client calls target `/api/session/...` and are validated by the gateway's server process.
2. **Tactile PIN UX & Ergonomics**:
   - PIN slots should auto-advance, support backspace deletion, and handle both physical hardware keyboard strokes and oversized virtual touch keys (minimum 56px touch target height for mobile on-site deployment).
   - Monospace bullet masking (`•`) maintains font consistency without character width jitter.
3. **GSAP Orchestration Patterns**:
   - Avoid instant DOM removal. Use `gsap.timeline` with `opacity: 0, y: -20` before setting `display: 'none'`, and fade in the next container with `opacity: 1, y: 0`.
   - Continuous animations (such as radar sweep line and countdown ring) should be cleanly paused/killed when switching away from `SCAN_QR_CODE` state to prevent background CPU waste.
4. **Resilience & Standalone Preview**:
   - The frontend should operate seamlessly both when connected to a live backend `/api/...` and in local standalone / preview mode (with a built-in forensic simulation drawer) so developers and stakeholders can test all states without having a live WAHA Docker container running.
