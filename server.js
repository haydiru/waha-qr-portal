/**
 * WAHA SENTINEL GATEWAY — PRODUCTION PROXY SERVER
 * Strict Zero-Leakage Architecture for Coolify & Traefik Ingress
 * ISO 27001 Least-Privilege Standard
 */

const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();

// --- Configuration & Environment Variables ---
const PORT = parseInt(process.env.PORT || '3000', 10);
const WAHA_BASE_URL = (process.env.WAHA_BASE_URL || 'http://waha:3000').replace(/\/+$/, '');
const WAHA_API_KEY = process.env.WAHA_API_KEY || '';
const WAHA_SESSION = process.env.WAHA_SESSION || 'default';
const MASTER_PIN = process.env.MASTER_PIN || '123456';
const SECRET_AUTH_TOKEN = process.env.SECRET_AUTH_TOKEN || process.env.AUTH_TOKEN || 'SEC_9f4b29a17c0e8281d4e38c92a11b058a';
const ALLOWED_PHONE_NUMBER = process.env.ALLOWED_PHONE_NUMBER ? process.env.ALLOWED_PHONE_NUMBER.split(',').map(s => s.trim().replace(/\D/g, '')) : [];
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const NODE_ENV = process.env.NODE_ENV || 'production';

// --- In-Memory Rate Limiting Cache ---
// Max 5 failed attempts per IP per 5-minute window
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000;
const rateLimitCache = new Map();

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitCache.get(ip);
  if (!entry) return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };

  // Check if locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, locked: true, retryAfterSeconds };
  }

  // Reset if window expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitCache.delete(ip);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - entry.failedCount);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  let entry = rateLimitCache.get(ip);
  if (!entry || (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS)) {
    entry = { failedCount: 1, firstAttempt: now, lockedUntil: null };
  } else {
    entry.failedCount++;
  }

  if (entry.failedCount >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
  }
  rateLimitCache.set(ip, entry);
  return entry;
}

function resetRateLimit(ip) {
  rateLimitCache.delete(ip);
}

// --- Session Cookie Signature Helper ---
function signSessionValue(data) {
  const serialized = JSON.stringify(data);
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(serialized).digest('hex');
  return Buffer.from(`${serialized}.${hmac}`).toString('base64');
}

function verifySessionCookie(cookieValue) {
  if (!cookieValue) return null;
  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf8');
    const lastDotIndex = decoded.lastIndexOf('.');
    if (lastDotIndex === -1) return null;

    const serialized = decoded.substring(0, lastDotIndex);
    const expectedHmac = decoded.substring(lastDotIndex + 1);
    const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(serialized).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(expectedHmac), Buffer.from(hmac))) {
      const data = JSON.parse(serialized);
      // Check expiry (2 hours)
      if (Date.now() - data.createdAt < 2 * 60 * 60 * 1000) {
        return data;
      }
    }
  } catch (e) {
    // Malformed cookie
  }
  return null;
}

// --- Middleware Configuration ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(express.json());
app.use(cookieParser());

// --- Static Asset Serving ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Authentication Middleware for API endpoints ---
function requireAuth(req, res, next) {
  // Check session cookie
  const session = verifySessionCookie(req.cookies.sentinel_session);
  if (session && session.authenticated) {
    req.sentinelUser = session;
    return next();
  }

  // Check query auth token if provided
  const queryToken = req.query.auth || req.headers['x-sentinel-token'];
  if (SECRET_AUTH_TOKEN && queryToken === SECRET_AUTH_TOKEN) {
    return next();
  }

  return res.status(401).json({
    error: 'UNAUTHORIZED',
    message: 'Valid master authentication or session cookie required'
  });
}

// --- WAHA HTTP Client Helper ---
async function fetchWaha(endpoint, options = {}) {
  const url = `${WAHA_BASE_URL}${endpoint}`;
  const headers = {
    ...(options.headers || {})
  };
  if (WAHA_API_KEY) {
    headers['x-api-key'] = WAHA_API_KEY;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// =========================================================================
// API ENDPOINTS
// =========================================================================

// 1. Healthcheck Endpoint for Coolify / Traefik
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'waha-sentinel-gateway',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    targetSession: WAHA_SESSION,
    wahaTarget: WAHA_BASE_URL
  });
});

// 2. PIN Verification & Cookie Issuance
app.post('/api/auth/verify', (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many failed authentication attempts. Perimeter locked.',
      retryAfterSeconds: rateLimit.retryAfterSeconds || 60
    });
  }

  const { pin, token } = req.body || {};

  // Verify Perimeter URL Token if configured
  if (SECRET_AUTH_TOKEN && token && token !== SECRET_AUTH_TOKEN) {
    recordFailedAttempt(ip);
    return res.status(403).json({
      error: 'INVALID_PERIMETER_TOKEN',
      message: 'Cryptographic URL token is invalid.'
    });
  }

  // Verify 6-digit Master PIN
  if (pin && pin === MASTER_PIN) {
    resetRateLimit(ip);

    const sessionPayload = {
      authenticated: true,
      ip: ip,
      createdAt: Date.now()
    };
    const signedCookie = signSessionValue(sessionPayload);

    // Set HttpOnly 2-hour session cookie
    res.cookie('sentinel_session', signedCookie, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });

    return res.json({
      success: true,
      message: 'AUTHENTICATED',
      sessionExpiresIn: 7200
    });
  }

  // Failed PIN
  const attempt = recordFailedAttempt(ip);
  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - attempt.failedCount);

  if (remaining === 0) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Max failed attempts reached. Perimeter locked for 60 seconds.',
      retryAfterSeconds: 60
    });
  }

  return res.status(401).json({
    error: 'INVALID_PIN',
    message: 'Incorrect 6-digit Master PIN.',
    remainingAttempts: remaining
  });
});

// 3. Live WAHA Session Status & QR Polling
app.get('/api/session/status', requireAuth, async (req, res) => {
  try {
    const startTime = Date.now();
    // Query WAHA session endpoint
    const sessionRes = await fetchWaha(`/api/sessions/${WAHA_SESSION}`);
    const pingMs = Date.now() - startTime;

    if (!sessionRes.ok) {
      if (sessionRes.status === 404) {
        // Session does not exist yet in WAHA
        return res.json({
          session: WAHA_SESSION,
          status: 'STOPPED',
          engine: 'UNKNOWN',
          pingMs,
          isLiveWaha: true,
          message: `Session '${WAHA_SESSION}' is not active in WAHA.`
        });
      }
      const errText = await sessionRes.text();
      return res.json({
        session: WAHA_SESSION,
        status: 'FAILED',
        error: `WAHA_HTTP_${sessionRes.status}`,
        message: errText,
        pingMs,
        isLiveWaha: true
      });
    }

    const sessionData = await sessionRes.json();
    let connectionStatus = sessionData.status || 'STOPPED';
    let qrDataUri = null;

    // Handle Phone Whitelist Security Check (PRD 1.5 & 5.2)
    if (connectionStatus === 'WORKING' && ALLOWED_PHONE_NUMBER.length > 0 && sessionData.me) {
      const rawJid = sessionData.me.id || '';
      const cleanScannedDigits = rawJid.split('@')[0].replace(/\D/g, '');

      const isWhitelisted = ALLOWED_PHONE_NUMBER.some(allowed => {
        return cleanScannedDigits.endsWith(allowed) || allowed.endsWith(cleanScannedDigits);
      });

      if (!isWhitelisted) {
        console.warn(`[SECURITY ALERT] Unauthorized phone number paired (${cleanScannedDigits}). Triggering instant logout.`);
        // Force logout in WAHA immediately
        try {
          await fetchWaha(`/api/sessions/${WAHA_SESSION}/logout`, { method: 'POST' });
        } catch (e) {
          console.error('Failed to trigger auto-logout:', e);
        }

        return res.status(403).json({
          session: WAHA_SESSION,
          status: 'FAILED',
          error: 'UNAUTHORIZED_PHONE_NUMBER',
          message: `Scanned number +${cleanScannedDigits} is not authorized in whitelist. Session revoked.`
        });
      }
    }

    // If status is SCAN_QR_CODE, fetch the QR code matrix
    if (connectionStatus === 'SCAN_QR_CODE') {
      try {
        // Try fetching raw QR image from WAHA
        const qrRes = await fetchWaha(`/api/${WAHA_SESSION}/auth/qr`);
        if (qrRes.ok) {
          const contentType = qrRes.headers.get('content-type') || '';
          if (contentType.includes('image/')) {
            const buffer = Buffer.from(await qrRes.arrayBuffer());
            qrDataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
          } else {
            // Some WAHA versions return text/plain or json
            const text = await qrRes.text();
            if (text.startsWith('data:image/')) {
              qrDataUri = text;
            } else {
              qrDataUri = `data:image/png;base64,${text}`;
            }
          }
        } else {
          // Alternative fallback endpoint for WAHA Plus / GOWEB
          const qrAltRes = await fetchWaha(`/api/sessions/${WAHA_SESSION}/auth/qr`);
          if (qrAltRes.ok) {
            const buffer = Buffer.from(await qrAltRes.arrayBuffer());
            qrDataUri = `data:image/png;base64,${buffer.toString('base64')}`;
          }
        }
      } catch (qrErr) {
        console.error('Error fetching QR from WAHA:', qrErr.message);
      }
    }

    // Format human-friendly phone number if JID is present
    let formattedPhone = '';
    if (sessionData.me && sessionData.me.id) {
      const digits = sessionData.me.id.split('@')[0];
      if (digits.startsWith('62')) {
        formattedPhone = `+62 ${digits.substring(2, 5)}-${digits.substring(5, 9)}-${digits.substring(9)}`;
      } else {
        formattedPhone = `+${digits}`;
      }
    }

    return res.json({
      session: WAHA_SESSION,
      status: connectionStatus,
      qr: qrDataUri,
      qrTtlSeconds: 20,
      me: sessionData.me ? {
        id: sessionData.me.id,
        pushName: sessionData.me.pushName || 'WhatsApp User',
        platform: sessionData.engine || 'NOWEB',
        formattedPhone: formattedPhone
      } : null,
      engine: sessionData.engine || 'NOWEB',
      uptimeSeconds: Math.floor(process.uptime()),
      pingMs: pingMs,
      isLiveWaha: true
    });

  } catch (err) {
    // WAHA daemon is offline or network unreachable
    return res.json({
      session: WAHA_SESSION,
      status: 'STOPPED',
      error: 'WAHA_UNREACHABLE',
      message: `Cannot reach WAHA daemon at ${WAHA_BASE_URL} (${err.message}). Session daemon dormant.`,
      pingMs: 0,
      isLiveWaha: false
    });
  }
});

// 4. Session Start Trigger (Controlled Startup)
app.post('/api/session/start', requireAuth, async (req, res) => {
  try {
    // Attempt standard WAHA start endpoint
    let startRes = await fetchWaha(`/api/sessions/${WAHA_SESSION}/start`, { method: 'POST' });

    if (!startRes.ok) {
      // Fallback for WAHA payload variant
      startRes = await fetchWaha('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: WAHA_SESSION })
      });
    }

    return res.json({
      success: true,
      status: 'STARTING',
      message: `Startup signal dispatched to WAHA session '${WAHA_SESSION}'.`
    });
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: 'WAHA_CONNECTION_ERROR',
      message: `Failed to dispatch start signal to WAHA daemon: ${err.message}`
    });
  }
});

// 5. Force Refresh QR Matrix
app.post('/api/session/refresh-qr', requireAuth, async (req, res) => {
  try {
    // Pull fresh QR bytes
    const qrRes = await fetchWaha(`/api/${WAHA_SESSION}/auth/qr`);
    if (qrRes.ok) {
      const contentType = qrRes.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await qrRes.arrayBuffer());
      return res.json({
        success: true,
        qr: `data:${contentType};base64,${buffer.toString('base64')}`,
        qrTtlSeconds: 20
      });
    }
    return res.json({ success: false, message: 'QR not currently available in WAHA.' });
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message });
  }
});

// Fallback Route: Serve Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Server Startup ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`[WAHA SENTINEL GATEWAY] Daemon Active on port ${PORT}`);
  console.log(`Target Session : ${WAHA_SESSION}`);
  console.log(`WAHA Base URL  : ${WAHA_BASE_URL}`);
  console.log(`Perimeter Auth : ${SECRET_AUTH_TOKEN ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Whitelist Phone: ${ALLOWED_PHONE_NUMBER.length > 0 ? ALLOWED_PHONE_NUMBER.join(', ') : 'DISABLED (ALL ALLOWED)'}`);
  console.log(`Environment    : ${NODE_ENV}`);
  console.log(`=======================================================`);
});
