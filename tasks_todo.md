# Tasks To Do — WAHA Sentinel Gateway

## Phase 1: Supporting Documentation & Architecture Setup
- [x] Analyze PRD.md and UI_SPEC.md requirements
- [x] Create ARCHITECTURE.md (Technical Topology & Spec)
- [x] Establish Task Management System (`tasks_todo.md`, `tasks_running.md`, `tasks_done.md`, `qa_verification.md`)
- [x] Initialize `.harness/EXPERIENCE.md`

## Phase 2: Frontend Engineering (Phase 1 Prototype & High-Craft UI)
- [x] Construct base layout with Tailwind CSS CDN, Lucide Icons, and GSAP 3.12+ (Flip, CustomEase)
- [x] Implement Design System Tokens (Daylight Alabaster `#FAF9F5`, 1px hairline zinc borders, Inter & JetBrains Mono typography)
- [x] Implement State 1: Perimeter Lock Screen
  - [x] 6-slot segmented PIN input box with monospace dot mask (`•`)
  - [x] Virtual touch-friendly numeric keypad (56px targets) + physical keyboard input
  - [x] GSAP tactile shake animation on invalid PIN attempt
  - [x] Rate-limit cooldown display (60s timer after 5 failed attempts)
  - [x] URL token validator banner / perimeter gate check
- [x] Implement State 2: Session Polling & QR Scanner Hub
  - [x] Top Telemetry Bar (Session ID, Engine NOWEB/GOWEB, Uptime, Live Clock)
  - [x] Perceived Momentum / Goal Gradient progress tracker (40% -> 70% -> 100%)
  - [x] Precision Architectural QR frame with corner L-crosshairs
  - [x] Continuous vertical GSAP Radar sweep line
  - [x] Synchronized SVG circular countdown ring (20s expiry cycle)
  - [x] Monospace instruction card and Force Refresh QR trigger
- [x] Implement State 3: Active Sentinel Dashboard (`WORKING` State)
  - [x] GSAP Flip/Morph transition from QR to Verified Identity Shield
  - [x] Verified Account Hero Card with pulsing emerald green beacon
  - [x] Large monospace formatted phone number / JID (`+62 811-XXXX-XXXX`)
  - [x] Forensic metadata table (Session, Push Name, Socket Health 99.9%, Policy)
  - [x] Anti-tamper permanent lock seal & policy warning notice (zero disconnect buttons)
- [x] Implement State 4: Halted Session Recovery (`STOPPED` / `FAILED` State)
  - [x] Crimson alert pill & diagnostic status message
  - [x] `[ INITIALIZE SESSION ]` tactile CTA button with terminal cursor `>_`
  - [x] Indeterminate segmented progress bar animation on activation
- [x] Implement State 5: Technical Telemetry Footer
  - [x] Fixed bottom bar with WIB timestamp (`UTC+07:00 [WIB]`), ping latency telemetry, and version badge
- [x] Implement Interactive Simulation / Dev Controller & API Live Hook
  - [x] Built-in developer telemetry panel (switchable between LOCKED, STOPPED, SCAN_QR_CODE, WORKING, RATE_LIMITED)
  - [x] Live API adapter for `/api/session/status` and `/api/auth/verify`

## Phase 3: Express Backend & Dockerization
- [x] Initialize Node.js 20 LTS project (`package.json`, Express.js, Helmet, cookie-parser, dotenv)
- [x] Implement rate-limited auth endpoints (`POST /api/auth/verify`)
- [x] Implement WAHA proxy endpoints (`GET /api/session/status`, `POST /api/session/start`, `POST /api/session/refresh-qr`)
- [x] Implement Phone Whitelist Guard (`ALLOWED_PHONE_NUMBER` auto-logout)
- [x] Configure Dockerfile (Node 20 Alpine, non-root user, healthcheck monitoring)
- [x] Configure docker-compose.yml for Coolify Traefik network
- [x] Create .dockerignore, .gitignore, .env.example, and README.md

## Phase 4: Git & Coolify Deployment
- [x] Initialize Git repository
- [x] Commit all production artifacts
- [x] Create GitHub repository `haydiru/waha-qr-portal`
- [x] Push commits to origin/main
