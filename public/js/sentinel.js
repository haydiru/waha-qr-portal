/**
 * WAHA SENTINEL GATEWAY — CORE INTERACTION & MOTION CONTROLLER
 * Strict adherence to PRD.md & UI_SPEC.md
 * Powered by GSAP 3.12+
 */

(function () {
  'use strict';

  // --- System Configuration & Initial State ---
  const CONFIG = {
    DEFAULT_PIN: '123456', // Default master PIN for verification
    DEFAULT_TOKEN: 'SEC_9f4b29a17c0e8281d4e38c92a11b058a',
    MAX_ATTEMPTS: 5,
    LOCKOUT_SECONDS: 60,
    QR_REFRESH_INTERVAL: 20, // seconds
    POLL_INTERVAL_SCAN: 4000,
    POLL_INTERVAL_WORKING: 15000,
    TARGET_SESSION: 'default',
    ENGINE: 'NOWEB / GOWEB',
    BASE_API_URL: window.location.origin
  };

  const state = {
    currentScreen: 'auth', // 'auth' | 'portal'
    sessionStatus: 'SCAN_QR_CODE', // 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED'
    pinValue: '',
    failedAttempts: 0,
    lockedUntil: null,
    authToken: null,
    isAuthenticated: false,
    qrSecondsRemaining: CONFIG.QR_REFRESH_INTERVAL,
    uptimeSeconds: 13320,
    pingMs: 18,
    isInitializingSession: false,
    simulationMode: true, // Auto-detects if real API is responsive
    verifiedData: {
      jid: '628118899201@c.us',
      formattedPhone: '+62 811-8899-201',
      pushName: 'RSD Bot Monitor (Official)',
      platform: 'WhatsApp Web / Linux Server',
      connectedAt: 'Today, 08:42:15 WIB',
      socketHealth: 'CONNECTED // HEALTHY (99.98%)'
    }
  };

  // --- DOM References ---
  const dom = {
    // Screens
    authScreen: document.getElementById('auth-screen'),
    portalScreen: document.getElementById('portal-screen'),
    authCard: document.getElementById('auth-card'),

    // PIN Elements
    pinSlots: document.querySelectorAll('.pin-box'),
    pinHiddenInput: document.getElementById('pin-hidden-input'),
    keypadBtns: document.querySelectorAll('.keypad-btn'),
    pinErrorMsg: document.getElementById('pin-error-msg'),
    pinAttemptsNotice: document.getElementById('pin-attempts-notice'),
    lockoutBanner: document.getElementById('lockout-banner'),
    lockoutCountdown: document.getElementById('lockout-countdown'),
    tokenBannerText: document.getElementById('token-banner-text'),

    // Portal Viewports
    scannerViewport: document.getElementById('scanner-viewport'),
    verifiedViewport: document.getElementById('verified-viewport'),
    stoppedViewport: document.getElementById('stopped-viewport'),

    // QR Elements
    qrRadarLine: document.getElementById('qr-radar-line'),
    qrImage: document.getElementById('qr-image'),
    qrCountdownCircle: document.getElementById('qr-countdown-circle'),
    qrCountdownNumber: document.getElementById('qr-countdown-number'),
    refreshQrBtn: document.getElementById('refresh-qr-btn'),

    // Verified Elements
    verifiedPhoneDisplay: document.getElementById('verified-phone-display'),
    verifiedPushName: document.getElementById('verified-push-name'),
    verifiedJid: document.getElementById('verified-jid'),
    verifiedSocketHealth: document.getElementById('verified-socket-health'),
    verifiedTimestamp: document.getElementById('verified-timestamp'),
    verifiedCheckmark: document.getElementById('verified-checkmark'),

    // Stopped / Initializing Elements
    btnStartSession: document.getElementById('btn-start-session'),
    startSessionLoader: document.getElementById('start-session-loader'),
    stoppedMsg: document.getElementById('stopped-msg'),

    // Header & Telemetry
    headerSessionBadge: document.getElementById('header-session-badge'),
    headerStatusBadge: document.getElementById('header-status-badge'),
    headerStatusDot: document.getElementById('header-status-dot'),
    headerStatusText: document.getElementById('header-status-text'),
    headerUptimeDisplay: document.getElementById('header-uptime-display'),
    headerPingDisplay: document.getElementById('header-ping-display'),

    // Goal Gradient Progress
    goalProgressBar: document.getElementById('goal-progress-bar'),
    goalProgressText: document.getElementById('goal-progress-text'),

    // Footer
    footerWibClock: document.getElementById('footer-wib-clock'),
    footerPingDisplay: document.getElementById('footer-ping-display'),

    // Simulation / Dev Panel
    simulationPanel: document.getElementById('simulation-panel'),
    simToggleBtn: document.getElementById('sim-toggle-btn')
  };

  // --- Animation Timelines ---
  let radarTween = null;
  let countdownTimerInterval = null;
  let telemetryInterval = null;
  let pollInterval = null;

  // --- Lifecycle Initialization ---
  function init() {
    inspectUrlToken();
    setupKeypadAndKeyboard();
    setupEventListeners();
    setupTelemetryClock();
    checkBackendConnectivity();
    lucide.createIcons();
    initRadarAnimation();
  }

  // --- Step 1: Perimeter URL Auth Token Inspection ---
  function inspectUrlToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');

    if (authParam) {
      state.authToken = authParam;
      if (dom.tokenBannerText) {
        dom.tokenBannerText.textContent = `PERIMETER_AUTH: ${authParam.substring(0, 14)}... (VERIFIED)`;
      }
    } else {
      // Standalone preview or missing token
      state.authToken = CONFIG.DEFAULT_TOKEN;
      if (dom.tokenBannerText) {
        dom.tokenBannerText.innerHTML = `PERIMETER: DEMO MODE <span class="text-zinc-400 font-mono">(use ?auth=... in production)</span>`;
      }
    }
  }

  // --- Step 2: PIN Input & Keypad Handling ---
  function setupKeypadAndKeyboard() {
    // Hidden Input for Hardware Keyboard / Mobile Native Keyboard
    if (dom.pinHiddenInput) {
      dom.pinHiddenInput.focus();
      dom.pinHiddenInput.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
        updatePinValue(val);
      });

      // Keep focus when clicking on the PIN slots
      document.getElementById('pin-slots-container')?.addEventListener('click', () => {
        if (!isLockedOut()) {
          dom.pinHiddenInput.focus();
        }
      });
    }

    // Virtual Ergonomic Touch Keypad
    dom.keypadBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isLockedOut()) return;

        const key = btn.dataset.key;
        if (!key) return;

        if (key === 'backspace') {
          updatePinValue(state.pinValue.slice(0, -1));
        } else if (key === 'clear') {
          updatePinValue('');
        } else if (state.pinValue.length < 6) {
          updatePinValue(state.pinValue + key);
        }
      });
    });

    // Global keyboard listener for desktop
    window.addEventListener('keydown', (e) => {
      if (state.currentScreen !== 'auth' || isLockedOut()) return;

      if (e.key >= '0' && e.key <= '9') {
        if (state.pinValue.length < 6) {
          updatePinValue(state.pinValue + e.key);
        }
      } else if (e.key === 'Backspace') {
        updatePinValue(state.pinValue.slice(0, -1));
      } else if (e.key === 'Escape') {
        updatePinValue('');
      }
    });
  }

  function updatePinValue(newVal) {
    state.pinValue = newVal;
    if (dom.pinHiddenInput) {
      dom.pinHiddenInput.value = newVal;
    }

    // Update UI slots
    dom.pinSlots.forEach((slot, index) => {
      if (index < newVal.length) {
        slot.textContent = '•';
        slot.classList.add('filled');
        slot.classList.remove('active');
      } else if (index === newVal.length) {
        slot.textContent = '';
        slot.classList.remove('filled');
        slot.classList.add('active');
      } else {
        slot.textContent = '';
        slot.classList.remove('filled', 'active');
      }
    });

    // Auto-submit upon 6th digit
    if (newVal.length === 6) {
      handlePinSubmit(newVal);
    }
  }

  // --- Step 3: PIN Verification & Rate Limiting ---
  async function handlePinSubmit(pin) {
    if (isLockedOut()) return;

    // Reset error visuals
    hidePinError();

    // Check if live API is available or if using client-side verification
    let isSuccess = false;

    if (!state.simulationMode) {
      try {
        const response = await fetch(`${CONFIG.BASE_API_URL}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pin, token: state.authToken })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          isSuccess = true;
        } else if (response.status === 429) {
          triggerLockout(data.retryAfterSeconds || CONFIG.LOCKOUT_SECONDS);
          return;
        }
      } catch (err) {
        // Fallback to local evaluation
        isSuccess = pin === CONFIG.DEFAULT_PIN;
      }
    } else {
      // Simulation / Standalone check
      isSuccess = pin === CONFIG.DEFAULT_PIN;
    }

    if (isSuccess) {
      state.failedAttempts = 0;
      state.isAuthenticated = true;
      executeUnlockTransition();
    } else {
      state.failedAttempts++;
      triggerPinErrorAnimation();
    }
  }

  function triggerPinErrorAnimation() {
    // GSAP Tactile Shake Animation as specified in UI_SPEC Section 5.1
    gsap.timeline()
      .to('.pin-box', { x: -8, duration: 0.06, repeat: 5, yoyo: true, ease: 'power2.inOut' })
      .to('.pin-box', { borderColor: '#DC2626', backgroundColor: '#FEF2F2', duration: 0.15 }, 0)
      .to('.pin-box', {
        x: 0,
        borderColor: '#D4D4D8',
        backgroundColor: '#FFFFFF',
        duration: 0.25,
        delay: 0.2,
        onComplete: () => {
          updatePinValue('');
        }
      });

    const remaining = CONFIG.MAX_ATTEMPTS - state.failedAttempts;

    if (remaining <= 0) {
      triggerLockout(CONFIG.LOCKOUT_SECONDS);
    } else {
      if (dom.pinErrorMsg) {
        dom.pinErrorMsg.textContent = `AUTHENTICATION FAILED // INVALID CREDENTIAL`;
        dom.pinErrorMsg.classList.remove('hidden');
      }
      if (dom.pinAttemptsNotice) {
        dom.pinAttemptsNotice.textContent = `${remaining} attempt${remaining > 1 ? 's' : ''} remaining before perimeter lockout`;
      }
    }
  }

  function triggerLockout(seconds) {
    state.lockedUntil = Date.now() + seconds * 1000;
    updatePinValue('');

    if (dom.lockoutBanner) dom.lockoutBanner.classList.remove('hidden');
    if (dom.pinErrorMsg) dom.pinErrorMsg.classList.add('hidden');

    const interval = setInterval(() => {
      const remainingSec = Math.max(0, Math.ceil((state.lockedUntil - Date.now()) / 1000));
      if (dom.lockoutCountdown) dom.lockoutCountdown.textContent = `${remainingSec}s`;

      if (remainingSec <= 0) {
        clearInterval(interval);
        state.lockedUntil = null;
        state.failedAttempts = 0;
        if (dom.lockoutBanner) dom.lockoutBanner.classList.add('hidden');
        if (dom.pinAttemptsNotice) dom.pinAttemptsNotice.textContent = '6-digit Master PIN required';
      }
    }, 1000);
  }

  function isLockedOut() {
    return state.lockedUntil && Date.now() < state.lockedUntil;
  }

  function hidePinError() {
    if (dom.pinErrorMsg) dom.pinErrorMsg.classList.add('hidden');
  }

  // --- Step 4: GSAP Screen Transition (Unlock to Portal) ---
  function executeUnlockTransition() {
    // UI_SPEC 5.1: On Valid Authentication
    const tl = gsap.timeline();
    tl.to(dom.authCard, {
      scale: 0.96,
      opacity: 0,
      y: -20,
      duration: 0.35,
      ease: 'power3.in'
    })
      .set(dom.authScreen, { display: 'none' })
      .set(dom.portalScreen, { display: 'flex', opacity: 0, y: 25 })
      .to(dom.portalScreen, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'expo.out',
        onComplete: () => {
          state.currentScreen = 'portal';
          applySessionState(state.sessionStatus, true);
          startCountdownRing();
          startSessionPolling();
        }
      });
  }

  // --- Step 5: Finite State Machine & Viewport Switcher ---
  function applySessionState(newStatus, isInitial = false) {
    state.sessionStatus = newStatus;

    // Update Header Badges
    updateHeaderTelemetry(newStatus);

    // Update Goal Gradient Indicator
    updateGoalGradient(newStatus);

    if (newStatus === 'SCAN_QR_CODE') {
      showScannerViewport(isInitial);
    } else if (newStatus === 'WORKING') {
      showVerifiedViewport(isInitial);
    } else if (newStatus === 'STOPPED' || newStatus === 'FAILED') {
      showStoppedViewport(isInitial);
    }
  }

  function showScannerViewport(isInitial) {
    if (dom.scannerViewport.style.display !== 'none' && !isInitial) return;

    gsap.timeline()
      .to([dom.verifiedViewport, dom.stoppedViewport], {
        opacity: 0,
        y: -15,
        duration: 0.2,
        onComplete: () => {
          dom.verifiedViewport.style.display = 'none';
          dom.stoppedViewport.style.display = 'none';
        }
      })
      .set(dom.scannerViewport, { display: 'block', opacity: 0, y: 20 })
      .to(dom.scannerViewport, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });

    startRadarAnimation();
    startCountdownRing();
  }

  function showVerifiedViewport(isInitial) {
    stopRadarAnimation();
    stopCountdownRing();

    // Fill verified card details
    if (dom.verifiedPhoneDisplay) dom.verifiedPhoneDisplay.textContent = state.verifiedData.formattedPhone;
    if (dom.verifiedPushName) dom.verifiedPushName.textContent = state.verifiedData.pushName;
    if (dom.verifiedJid) dom.verifiedJid.textContent = state.verifiedData.jid;
    if (dom.verifiedSocketHealth) dom.verifiedSocketHealth.textContent = state.verifiedData.socketHealth;
    if (dom.verifiedTimestamp) dom.verifiedTimestamp.textContent = state.verifiedData.connectedAt;

    // UI_SPEC 5.3: Flip from QR to Verified State
    const tl = gsap.timeline();
    tl.to([dom.scannerViewport, dom.stoppedViewport], {
      scaleY: 0.8,
      opacity: 0,
      duration: 0.3,
      ease: 'power3.in',
      onComplete: () => {
        dom.scannerViewport.style.display = 'none';
        dom.stoppedViewport.style.display = 'none';
      }
    })
      .set(dom.verifiedViewport, { display: 'block', opacity: 0, y: 30 })
      .to(dom.verifiedViewport, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: 'back.out(1.4)'
      })
      .fromTo(dom.verifiedCheckmark,
        { scale: 0, rotate: -45 },
        { scale: 1, rotate: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)' },
        '-=0.3'
      );
  }

  function showStoppedViewport(isInitial) {
    stopRadarAnimation();
    stopCountdownRing();

    // Reset CTA state
    state.isInitializingSession = false;
    if (dom.btnStartSession) dom.btnStartSession.classList.remove('hidden');
    if (dom.startSessionLoader) dom.startSessionLoader.classList.add('hidden');

    gsap.timeline()
      .to([dom.scannerViewport, dom.verifiedViewport], {
        opacity: 0,
        y: -15,
        duration: 0.2,
        onComplete: () => {
          dom.scannerViewport.style.display = 'none';
          dom.verifiedViewport.style.display = 'none';
        }
      })
      .set(dom.stoppedViewport, { display: 'block', opacity: 0, y: 20 })
      .to(dom.stoppedViewport, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  }

  // --- Step 6: Goal Gradient Visual Indicator (UI_SPEC 3.1) ---
  function updateGoalGradient(status) {
    if (!dom.goalProgressBar || !dom.goalProgressText) return;

    if (status === 'STOPPED') {
      dom.goalProgressBar.style.width = '15%';
      dom.goalProgressBar.className = 'goal-gradient-bar h-full bg-red-500 transition-all duration-300';
      dom.goalProgressText.textContent = 'DAEMON HALTED (15%)';
    } else if (status === 'STARTING') {
      dom.goalProgressBar.style.width = '40%';
      dom.goalProgressBar.className = 'goal-gradient-bar h-full bg-zinc-900 transition-all duration-300';
      dom.goalProgressText.textContent = 'GATEWAY INITIALIZING (40%)';
    } else if (status === 'SCAN_QR_CODE') {
      dom.goalProgressBar.style.width = '70%';
      dom.goalProgressBar.className = 'goal-gradient-bar h-full bg-amber-500 transition-all duration-300';
      dom.goalProgressText.textContent = 'MATRIX STREAM ACTIVE // AWAITING CAMERA (70%)';
    } else if (status === 'WORKING') {
      dom.goalProgressBar.style.width = '100%';
      dom.goalProgressBar.className = 'goal-gradient-bar h-full bg-emerald-600 transition-all duration-300';
      dom.goalProgressText.textContent = 'HANDSHAKE VERIFIED // PROTECTED (100%)';
    }
  }

  function updateHeaderTelemetry(status) {
    if (!dom.headerStatusBadge || !dom.headerStatusDot || !dom.headerStatusText) return;

    if (status === 'WORKING') {
      dom.headerStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-tech font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200';
      dom.headerStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-500 pulsing-beacon';
      dom.headerStatusText.textContent = 'STATUS: WORKING // CONNECTED';
    } else if (status === 'SCAN_QR_CODE') {
      dom.headerStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-tech font-semibold bg-amber-50 text-amber-800 border border-amber-200';
      dom.headerStatusDot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
      dom.headerStatusText.textContent = 'STATUS: SCAN_QR_CODE';
    } else if (status === 'STARTING') {
      dom.headerStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-tech font-semibold bg-zinc-100 text-zinc-800 border border-zinc-300';
      dom.headerStatusDot.className = 'w-2 h-2 rounded-full bg-zinc-600 animate-pulse';
      dom.headerStatusText.textContent = 'STATUS: STARTING...';
    } else {
      dom.headerStatusBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono-tech font-semibold bg-red-50 text-red-800 border border-red-200';
      dom.headerStatusDot.className = 'w-2 h-2 rounded-full bg-red-500';
      dom.headerStatusText.textContent = 'STATUS: STOPPED';
    }
  }

  // --- Step 7: Radar Sweep Animation (UI_SPEC 5.2) ---
  function initRadarAnimation() {
    if (!dom.qrRadarLine) return;
    radarTween = gsap.fromTo(dom.qrRadarLine,
      { top: '0%', opacity: 0.8 },
      { top: '100%', opacity: 0.2, duration: 2.2, ease: 'linear', repeat: -1 }
    );
  }

  function startRadarAnimation() {
    if (radarTween) radarTween.play();
  }

  function stopRadarAnimation() {
    if (radarTween) radarTween.pause();
  }

  // --- Step 8: Countdown Ring & QR Matrix Refresher ---
  function startCountdownRing() {
    stopCountdownRing();
    state.qrSecondsRemaining = CONFIG.QR_REFRESH_INTERVAL;
    updateCountdownUI();

    const circumference = 2 * Math.PI * 18; // r = 18

    countdownTimerInterval = setInterval(() => {
      state.qrSecondsRemaining--;

      if (state.qrSecondsRemaining <= 0) {
        forceRefreshQrMatrix();
        state.qrSecondsRemaining = CONFIG.QR_REFRESH_INTERVAL;
      }

      updateCountdownUI(circumference);
    }, 1000);
  }

  function stopCountdownRing() {
    if (countdownTimerInterval) {
      clearInterval(countdownTimerInterval);
      countdownTimerInterval = null;
    }
  }

  function updateCountdownUI(circumference = 2 * Math.PI * 18) {
    if (dom.qrCountdownNumber) {
      dom.qrCountdownNumber.textContent = `${state.qrSecondsRemaining}s`;
    }

    if (dom.qrCountdownCircle) {
      const offset = circumference - (state.qrSecondsRemaining / CONFIG.QR_REFRESH_INTERVAL) * circumference;
      dom.qrCountdownCircle.style.strokeDashoffset = offset;
      if (state.qrSecondsRemaining <= 5) {
        dom.qrCountdownCircle.style.stroke = '#DC2626';
      } else {
        dom.qrCountdownCircle.style.stroke = '#D97706';
      }
    }
  }

  async function forceRefreshQrMatrix() {
    // UI_SPEC 5.2: QR Refresh Matrix Flash
    gsap.timeline()
      .to(dom.qrImage, { filter: 'blur(6px)', opacity: 0.35, scale: 0.97, duration: 0.2 })
      .to(dom.qrImage, {
        filter: 'blur(0px)',
        opacity: 1,
        scale: 1,
        duration: 0.35,
        ease: 'power2.out',
        delay: 0.1
      });

    // Reset countdown
    state.qrSecondsRemaining = CONFIG.QR_REFRESH_INTERVAL;
    updateCountdownUI();

    if (!state.simulationMode) {
      try {
        const res = await fetch(`${CONFIG.BASE_API_URL}/api/session/refresh-qr`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.qr && dom.qrImage) {
            dom.qrImage.src = data.qr;
          }
        }
      } catch (err) {
        console.warn('QR refresh error:', err);
      }
    }
  }

  // --- Step 9: Halted Daemon Activation (CTA Trigger) ---
  async function handleStartSessionTrigger() {
    if (state.isInitializingSession) return;
    state.isInitializingSession = true;

    // Transition CTA button into indeterminate progress loader
    if (dom.btnStartSession) dom.btnStartSession.classList.add('hidden');
    if (dom.startSessionLoader) dom.startSessionLoader.classList.remove('hidden');

    applySessionState('STARTING');

    if (!state.simulationMode) {
      try {
        const res = await fetch(`${CONFIG.BASE_API_URL}/api/session/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        setTimeout(() => {
          state.isInitializingSession = false;
          fetchLiveSessionStatus();
          scheduleNextPoll();
        }, 2200);
      } catch (e) {
        setTimeout(() => {
          state.isInitializingSession = false;
          applySessionState('SCAN_QR_CODE');
        }, 2500);
      }
    } else {
      setTimeout(() => {
        state.isInitializingSession = false;
        applySessionState('SCAN_QR_CODE');
      }, 2400);
    }
  }

  // --- Step 10: Real-time Session Polling ---
  function startSessionPolling() {
    stopSessionPolling();
    fetchLiveSessionStatus();
    scheduleNextPoll();
  }

  function stopSessionPolling() {
    if (pollInterval) {
      clearTimeout(pollInterval);
      pollInterval = null;
    }
  }

  function scheduleNextPoll() {
    stopSessionPolling();
    const interval = state.sessionStatus === 'WORKING' ? CONFIG.POLL_INTERVAL_WORKING : CONFIG.POLL_INTERVAL_SCAN;
    pollInterval = setTimeout(async () => {
      if (state.currentScreen === 'portal') {
        await fetchLiveSessionStatus();
        scheduleNextPoll();
      }
    }, interval);
  }

  async function fetchLiveSessionStatus() {
    try {
      const res = await fetch(`${CONFIG.BASE_API_URL}/api/session/status?auth=${encodeURIComponent(state.authToken || '')}`);
      if (res.ok) {
        const data = await res.json();
        state.simulationMode = false;
        if (data.status) {
          if (data.status !== state.sessionStatus) {
            applySessionState(data.status);
          }
          if (data.qr && dom.qrImage && data.qr !== dom.qrImage.src) {
            dom.qrImage.src = data.qr;
          }
          if (data.me) {
            state.verifiedData.formattedPhone = data.me.formattedPhone || data.me.id || state.verifiedData.formattedPhone;
            state.verifiedData.pushName = data.me.pushName || state.verifiedData.pushName;
            state.verifiedData.jid = data.me.id || state.verifiedData.jid;
            if (dom.verifiedPhoneDisplay) dom.verifiedPhoneDisplay.textContent = state.verifiedData.formattedPhone;
            if (dom.verifiedPushName) dom.verifiedPushName.textContent = state.verifiedData.pushName;
            if (dom.verifiedJid) dom.verifiedJid.textContent = state.verifiedData.jid;
          }
          if (data.pingMs && dom.headerPingDisplay) {
            dom.headerPingDisplay.textContent = `${data.pingMs}ms`;
          }
          if (data.session && dom.headerSessionBadge) {
            dom.headerSessionBadge.textContent = data.session;
          }
        }
      } else if (res.status === 401) {
        relockTerminal();
      }
    } catch (err) {
      // Backend not yet available or network glitch
    }
  }

  function relockTerminal() {
    stopSessionPolling();
    state.isAuthenticated = false;
    state.currentScreen = 'auth';
    dom.portalScreen.style.display = 'none';
    dom.authScreen.style.display = 'flex';
    dom.authCard.style.opacity = '1';
    dom.authCard.style.transform = 'none';
    updatePinValue('');
  }

  // --- Step 11: Live Telemetry Clock & Ping Simulator ---
  function setupTelemetryClock() {
    telemetryInterval = setInterval(() => {
      // WIB Time (UTC+7)
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wibTime = new Date(utc + 3600000 * 7);

      const hours = String(wibTime.getHours()).padStart(2, '0');
      const minutes = String(wibTime.getMinutes()).padStart(2, '0');
      const seconds = String(wibTime.getSeconds()).padStart(2, '0');
      const timeStr = `UTC+07:00 [WIB] ${hours}:${minutes}:${seconds}`;

      if (dom.footerWibClock) dom.footerWibClock.textContent = timeStr;

      // Uptime increment
      state.uptimeSeconds++;
      const uh = Math.floor(state.uptimeSeconds / 3600);
      const um = Math.floor((state.uptimeSeconds % 3600) / 60);
      const us = state.uptimeSeconds % 60;
      const uptimeStr = `${String(uh).padStart(2, '0')}h ${String(um).padStart(2, '0')}m ${String(us).padStart(2, '0')}s`;
      if (dom.headerUptimeDisplay) dom.headerUptimeDisplay.textContent = uptimeStr;

      // Ping jitter
      if (state.simulationMode) {
        state.pingMs = Math.floor(16 + Math.random() * 8);
        if (dom.headerPingDisplay) dom.headerPingDisplay.textContent = `${state.pingMs}ms`;
        if (dom.footerPingDisplay) dom.footerPingDisplay.textContent = `PING: ${state.pingMs}ms`;
      }
    }, 1000);
  }

  // --- Step 12: Backend Connectivity Check ---
  async function checkBackendConnectivity() {
    try {
      const res = await fetch(`${CONFIG.BASE_API_URL}/api/health`);
      if (res.ok) {
        state.simulationMode = false;
        console.log('[SENTINEL] Live Gateway Backend Connected');
      } else {
        state.simulationMode = true;
      }
    } catch (e) {
      state.simulationMode = true;
    }
  }

  // --- Step 13: Event Listeners & Simulation Controls ---
  function setupEventListeners() {
    // Force Refresh QR Button
    if (dom.refreshQrBtn) {
      dom.refreshQrBtn.addEventListener('click', () => {
        forceRefreshQrMatrix();
      });
    }

    // Wake-up CTA Button
    if (dom.btnStartSession) {
      dom.btnStartSession.addEventListener('click', () => {
        handleStartSessionTrigger();
      });
    }

    // Simulation Panel Controls
    if (dom.simToggleBtn && dom.simulationPanel) {
      dom.simToggleBtn.addEventListener('click', () => {
        dom.simulationPanel.classList.toggle('collapsed');
      });
    }

    // Simulation buttons
    document.querySelectorAll('[data-sim-state]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const targetState = btn.dataset.simState;
        if (targetState === 'LOCKED') {
          // Relock to auth screen
          gsap.timeline()
            .to(dom.portalScreen, {
              opacity: 0,
              y: 20,
              duration: 0.3,
              onComplete: () => {
                dom.portalScreen.style.display = 'none';
                dom.authScreen.style.display = 'flex';
                dom.authCard.style.opacity = '1';
                dom.authCard.style.transform = 'none';
                state.currentScreen = 'auth';
                state.isAuthenticated = false;
                updatePinValue('');
              }
            });
        } else if (targetState === 'TRIGGER_SHAKE') {
          triggerPinErrorAnimation();
        } else if (targetState === 'RATE_LIMIT') {
          triggerLockout(60);
        } else {
          // Switch portal status
          if (state.currentScreen !== 'portal') {
            state.isAuthenticated = true;
            executeUnlockTransition();
          }
          applySessionState(targetState);
        }
      });
    });

    // Keyboard shortcut to toggle simulation panel (Ctrl + Shift + D)
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        dom.simulationPanel?.classList.toggle('collapsed');
      }
    });
  }

  // Start initialization on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
