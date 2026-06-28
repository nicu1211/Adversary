import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NodeWars from './pages/NodeWars';
import RawLog from './pages/RawLog';
import adversaryEmblem from './assets/adversary-emblem.png?url';
import {
  MEMBER_KEY,
  buildLogSummary,
  calculateStats,
  dateOf,
  hashLog,
  monthId,
  normalizeLog,
  normalizeLogs,
  normalizeMembers,
  parseLog,
  readStorage,
  today,
} from './lib/logUtils';

const Overview = lazy(() => import('./pages/Overview'));
const PlayerStats = lazy(() => import('./pages/PlayerStats'));
const HallOfFame = lazy(() => import('./pages/HallOfFame'));
const Guild = lazy(() => import('./pages/Guild'));
const MonthlyRecap = lazy(() => import('./pages/MonthlyRecap'));

const API_BASE = '';
const ADMIN_TOKEN_KEY = 'bdo_admin_token';

const SECONDARY_LOG_START = '===== ADVERSARY_SECONDARY_LOG_START =====';

function getAdminToken() {
  let token = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (!token) {
    token = prompt('Admin token for saving/deleting logs:') || '';

    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
  }

  return token;
}

function parseApiResponse(text) {
  if (!text) return { ok: true };

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function queryString(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    search.set(key, String(value));
  });

  const text = search.toString();

  return text ? `?${text}` : '';
}

function logsPath(params = {}) {
  return `/api/logs${queryString(params)}`;
}

function isRetryableError(error) {
  const text = String(error?.message || error || '').toLowerCase();

  return (
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('network error') ||
    text.includes('timeout') ||
    text.includes('500') ||
    text.includes('502') ||
    text.includes('503') ||
    text.includes('504') ||
    text.includes('429')
  );
}

function getMainLogOnly(rawLog) {
  const text = String(rawLog || '');

  if (!text.includes(SECONDARY_LOG_START)) {
    return text;
  }

  return text.split(SECONDARY_LOG_START)[0].trim();
}

function stripSecondaryFromLog(log) {
  return {
    ...log,
    raw: getMainLogOnly(log.raw),
  };
}

function stripSecondaryFromLogs(logs) {
  return Array.isArray(logs) ? logs.map(stripSecondaryFromLog) : [];
}

async function apiGet(path, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(API_BASE + path, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || `GET ${path} failed: ${response.status}`);
    }

    return parseApiResponse(text);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`GET ${path} timeout after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function apiWrite(path, method, body, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(API_BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-admin-token': getAdminToken(),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();

    if (response.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      throw new Error(text || 'Invalid admin token');
    }

    if (!response.ok) {
      throw new Error(text || `${method} ${path} failed: ${response.status}`);
    }

    return parseApiResponse(text);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${method} ${path} timeout after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function apiWriteWithRetry(path, method, body, options = {}) {
  const maxAttempts = options.maxAttempts || 5;
  const baseDelayMs = options.baseDelayMs || 700;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await apiWrite(path, method, body, options);
    } catch (error) {
      lastError = error;

      const text = String(error?.message || error || '');

      if (
        text.includes('Invalid admin token') ||
        text.includes('Duplicate log') ||
        text.includes('UnsupportedHttpVerb') ||
        text.includes('ResourceNotFound') ||
        text.includes('404')
      ) {
        throw error;
      }

      if (attempt >= maxAttempts || !isRetryableError(error)) {
        throw new Error(
          `Database save failed after ${attempt}/${maxAttempts} attempt(s): ${text}`,
        );
      }

      await sleep(baseDelayMs * attempt);
    }
  }

  throw new Error(
    `Database save failed after ${maxAttempts} attempts: ${
      lastError?.message || lastError || 'unknown error'
    }`,
  );
}

async function deleteApiLog(log) {
  const source = log._src || {};
  const apiId =
    log.apiId ||
    log.id ||
    source.id ||
    source._id ||
    source.log_id ||
    source.key ||
    source.objectKey ||
    source.filename ||
    source.fileName ||
    source.path ||
    source.slug;

  const body = {
    id: apiId,
    date: log.date,
    name: log.name,
    hash: log.hash,
  };

  const attempts = [];

  if (apiId) {
    attempts.push([
      `/api/logs/${encodeURIComponent(String(apiId))}`,
      'DELETE',
      undefined,
    ]);
  }

  attempts.push(
    ['/api/logs', 'DELETE', body],
    ['/api/logs/delete', 'POST', body],
    ['/api/logs', 'POST', { ...body, action: 'delete', _method: 'DELETE' }],
  );

  let lastError = null;

  for (const [path, method, payload] of attempts) {
    try {
      return await apiWriteWithRetry(path, method, payload, {
        maxAttempts: 3,
        baseDelayMs: 500,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Delete failed.\nBackend did not accept any delete route.\nLast error: ${
      lastError?.message || lastError || 'unknown error'
    }`,
  );
}

function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
      {text}
    </div>
  );
}

const PANEL_ACCENTS = [
  '96, 165, 250',
  '52, 211, 153',
  '250, 204, 21',
  '251, 113, 133',
];

const PANEL_ACCENT_BY_CLASS = {
  blue: '59, 130, 246',
  sky: '14, 165, 233',
  cyan: '6, 182, 212',
  teal: '20, 184, 166',
  emerald: '16, 185, 129',
  green: '34, 197, 94',
  amber: '245, 158, 11',
  yellow: '234, 179, 8',
  orange: '249, 115, 22',
  red: '239, 68, 68',
  rose: '244, 63, 94',
  pink: '236, 72, 153',
  fuchsia: '217, 70, 239',
  purple: '168, 85, 247',
  violet: '139, 92, 246',
  indigo: '99, 102, 241',
};

const MAJOR_PANEL_SELECTOR =
  ':is(section, article, div)[class*="rounded"][class*="border"]';

function getPanelAccent(element, index) {
  const classText =
    typeof element?.className === 'string' ? element.className : '';

  for (const [name, rgb] of Object.entries(PANEL_ACCENT_BY_CLASS)) {
    if (classText.includes(`border-${name}-`)) {
      return rgb;
    }
  }

  const borderColor = window.getComputedStyle(element).borderTopColor;
  const match = borderColor.match(
    /rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\s*\)/,
  );

  if (match) {
    const red = Number(match[1]);
    const green = Number(match[2]);
    const blue = Number(match[3]);
    const alpha = match[4] == null ? 1 : Number(match[4]);
    const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

    if (alpha > 0.05 && spread >= 36) {
      return `${red}, ${green}, ${blue}`;
    }
  }

  return PANEL_ACCENTS[index % PANEL_ACCENTS.length];
}

const GLOBAL_PANEL_CSS = `
  html,
  body,
  #root {
    min-height: 100%;
    background: rgb(2, 6, 23);
  }

  body {
    margin: 0;
  }

  .adversary-app {
    isolation: isolate;
    background-color: transparent !important;
  }

  .adversary-site-background {
    position: fixed;
    inset: 0;
    z-index: 0;
  }

  .adversary-content {
    --adversary-panel-bg-top: rgba(15, 23, 42, 0.24);
    --adversary-panel-bg-bottom: rgba(2, 6, 23, 0.12);
    --adversary-panel-border: rgba(100, 116, 139, 0.36);
  }

  /* Keep every page-level route wrapper transparent so the same fixed
     artwork remains visible on Overview, Node Wars, Player Stats, Monthly
     Recap, Guild, Hall of Fame and Raw Logs. Rounded inner cards are left
     untouched. */
  .adversary-content,
  .adversary-content > :is(div, section, article):not([class*="rounded"]),
  .adversary-content > :is(div, section, article) > :is(div, section, article):not([class*="rounded"]),
  .adversary-content > :is(div, section, article) > :is(div, section, article) > :is(div, section, article):not([class*="rounded"]) {
    background-color: transparent !important;
    background-image: none !important;
  }

  /* All bordered surfaces remain translucent. Major panels receive their own
     accent variable from React so their tint and hover glow always match. */
  .adversary-content :is(section, article, div)[class*="border"][class*="bg-"] {
    background-color: rgba(2, 6, 23, 0.16) !important;
    background-image: linear-gradient(
      145deg,
      var(--adversary-panel-bg-top),
      var(--adversary-panel-bg-bottom)
    ) !important;
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }

  .adversary-content .adversary-color-panel {
    --adversary-panel-accent-rgb: 96, 165, 250;
    background-color: rgba(2, 6, 23, 0.58) !important;
    background-image:
      radial-gradient(
        ellipse at 16% 0%,
        rgba(var(--adversary-panel-accent-rgb), 0.30) 0%,
        rgba(var(--adversary-panel-accent-rgb), 0.18) 38%,
        rgba(var(--adversary-panel-accent-rgb), 0.09) 68%,
        rgba(var(--adversary-panel-accent-rgb), 0.045) 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--adversary-panel-accent-rgb), 0.16) 0%,
        rgba(8, 15, 32, 0.44) 52%,
        rgba(2, 6, 23, 0.56) 100%
      ) !important;
    border-color: rgba(var(--adversary-panel-accent-rgb), 0.42) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.055),
      inset 0 -1px 0 rgba(var(--adversary-panel-accent-rgb), 0.22),
      inset 0 0 42px rgba(var(--adversary-panel-accent-rgb), 0.075),
      0 12px 28px rgba(0, 0, 0, 0.22);
    -webkit-backdrop-filter: blur(8px) saturate(122%);
    backdrop-filter: blur(8px) saturate(122%);
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background-image 180ms ease,
      filter 180ms ease;
  }

  .adversary-content .adversary-color-panel:hover {
    background-image:
      radial-gradient(
        ellipse at 16% 0%,
        rgba(var(--adversary-panel-accent-rgb), 0.40) 0%,
        rgba(var(--adversary-panel-accent-rgb), 0.25) 40%,
        rgba(var(--adversary-panel-accent-rgb), 0.12) 72%,
        rgba(var(--adversary-panel-accent-rgb), 0.06) 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--adversary-panel-accent-rgb), 0.21) 0%,
        rgba(8, 15, 32, 0.42) 52%,
        rgba(2, 6, 23, 0.54) 100%
      ) !important;
    border-color: rgba(var(--adversary-panel-accent-rgb), 0.68) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.075),
      inset 0 -1px 0 rgba(var(--adversary-panel-accent-rgb), 0.32),
      inset 0 0 48px rgba(var(--adversary-panel-accent-rgb), 0.13),
      0 0 0 1px rgba(var(--adversary-panel-accent-rgb), 0.11),
      0 0 20px rgba(var(--adversary-panel-accent-rgb), 0.30),
      0 0 42px rgba(var(--adversary-panel-accent-rgb), 0.15),
      0 16px 34px rgba(0, 0, 0, 0.26) !important;
  }

  /* Guild page: every real panel uses the exact same dark coloured-glass
     treatment as the stat cards at the top of the Guild page. The accent
     variable changes per panel; the glass recipe itself stays identical. */
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel {
    background-color: rgba(2, 6, 23, 0.62) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--adversary-panel-accent-rgb), 0.18) 0%,
        rgba(var(--adversary-panel-accent-rgb), 0.09) 42%,
        rgba(var(--adversary-panel-accent-rgb), 0.035) 74%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--adversary-panel-accent-rgb), 0.075) 0%,
        rgba(7, 13, 29, 0.52) 54%,
        rgba(2, 6, 23, 0.66) 100%
      ) !important;
    border-color: rgba(var(--adversary-panel-accent-rgb), 0.40) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      inset 0 -1px 0 rgba(var(--adversary-panel-accent-rgb), 0.16),
      0 12px 28px rgba(0, 0, 0, 0.24) !important;
    -webkit-backdrop-filter: blur(8px) saturate(122%);
    backdrop-filter: blur(8px) saturate(122%);
  }

  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel:hover {
    background-color: rgba(2, 6, 23, 0.58) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--adversary-panel-accent-rgb), 0.25) 0%,
        rgba(var(--adversary-panel-accent-rgb), 0.13) 44%,
        rgba(var(--adversary-panel-accent-rgb), 0.05) 76%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--adversary-panel-accent-rgb), 0.10) 0%,
        rgba(7, 13, 29, 0.48) 54%,
        rgba(2, 6, 23, 0.62) 100%
      ) !important;
    border-color: rgba(var(--adversary-panel-accent-rgb), 0.66) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      inset 0 -1px 0 rgba(var(--adversary-panel-accent-rgb), 0.22),
      0 0 0 1px rgba(var(--adversary-panel-accent-rgb), 0.08),
      0 0 22px rgba(var(--adversary-panel-accent-rgb), 0.22),
      0 14px 32px rgba(0, 0, 0, 0.26) !important;
  }

  /* The tier-list container keeps its original overflow and horizontal
     layout. Only stacking is adjusted for the real guild hover popup. */
  body[data-adversary-page="guild"] .adversary-enemy-tier-panel {
    position: relative;
    z-index: 100;
    isolation: isolate;
  }

  /* These three structural Guild sections should show the page artwork
     directly behind them. Keep their borders and hover glow, but remove all
     panel fill on both normal and hover states. */
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel.adversary-transparent-surface,
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel.adversary-transparent-surface:hover {
    background-color: transparent !important;
    background-image: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  body[data-adversary-page="guild"] .adversary-tier-letter {
    color: rgb(var(--adversary-tier-rgb)) !important;
    text-shadow:
      0 0 10px rgba(var(--adversary-tier-rgb), 0.62),
      0 0 22px rgba(var(--adversary-tier-rgb), 0.28);
  }

  body[data-adversary-page="guild"] .adversary-trash-label {
    color: rgba(var(--adversary-tier-rgb), 0.82) !important;
  }

  /* Guild page only: remove every visible panel outline without changing the
     panel dimensions. Keep the coloured glass fill and hover glow. */
  body[data-adversary-page="guild"] .adversary-page-guild :is(section, article, div)[class*="rounded"][class*="border"],
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel,
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel:hover {
    border-color: transparent !important;
  }

  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel {
    box-shadow:
      inset 0 0 42px rgba(var(--adversary-panel-accent-rgb), 0.075),
      0 12px 28px rgba(0, 0, 0, 0.24) !important;
  }

  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel:hover {
    box-shadow:
      inset 0 0 48px rgba(var(--adversary-panel-accent-rgb), 0.13),
      0 0 20px rgba(var(--adversary-panel-accent-rgb), 0.30),
      0 0 42px rgba(var(--adversary-panel-accent-rgb), 0.15),
      0 16px 34px rgba(0, 0, 0, 0.26) !important;
  }

  /* F tier uses a true brown accent, including the filled progress bars. */
  body[data-adversary-page="guild"] .adversary-tier-f {
    --adversary-panel-accent-rgb: 146, 92, 56 !important;
    --adversary-tier-rgb: 146, 92, 56 !important;
  }

  body[data-adversary-page="guild"] .adversary-tier-f [style*="width"]:not([style*="width: 100%"]),
  body[data-adversary-page="guild"] .adversary-tier-f [style*="width:"]:not([style*="width:100%"]) {
    background-color: rgb(146, 92, 56) !important;
    background-image: linear-gradient(
      90deg,
      rgb(183, 121, 74),
      rgb(146, 92, 56),
      rgb(111, 66, 40)
    ) !important;
  }

  /* Raise only the actual hovered guild card and its tier row. Do not change
     overflow on the horizontal tier-list wrappers, because that destroys the
     original grid/scroll layout. */
  body[data-adversary-page="guild"] .adversary-enemy-tier-row,
  body[data-adversary-page="guild"] .adversary-enemy-tier-card,
  body[data-adversary-page="guild"] .adversary-guild-tooltip-row,
  body[data-adversary-page="guild"] .adversary-guild-tooltip-card {
    position: relative !important;
  }

  body[data-adversary-page="guild"] .adversary-enemy-tier-row,
  body[data-adversary-page="guild"] .adversary-guild-tooltip-row {
    z-index: 1;
  }

  body[data-adversary-page="guild"] .adversary-enemy-tier-card,
  body[data-adversary-page="guild"] .adversary-guild-tooltip-card {
    z-index: 2;
  }

  body[data-adversary-page="guild"] .adversary-enemy-tier-row:has(.adversary-guild-tooltip-trigger:hover),
  body[data-adversary-page="guild"] .adversary-guild-tooltip-row:has(.adversary-guild-tooltip-trigger:hover) {
    z-index: 10000 !important;
  }

  body[data-adversary-page="guild"] .adversary-enemy-tier-card:has(.adversary-guild-tooltip-trigger:hover),
  body[data-adversary-page="guild"] .adversary-guild-tooltip-card:has(.adversary-guild-tooltip-trigger:hover),
  body[data-adversary-page="guild"] .adversary-enemy-tier-card:hover {
    z-index: 10010 !important;
  }

  body[data-adversary-page="guild"] .adversary-guild-tooltip-trigger {
    position: relative;
  }

  body[data-adversary-page="guild"] .adversary-guild-tooltip-trigger:hover {
    z-index: 10020 !important;
  }

  body[data-adversary-page="guild"] .adversary-guild-tooltip {
    z-index: 10030 !important;
  }

  /* The Overview player War Performance overlay is intentionally page-scoped
     so no other dialog or page layout is changed. */
  body[data-adversary-page="overview"] .adversary-war-performance-modal {
    position: fixed !important;
    inset: 0 !important;
    z-index: 10000 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: clamp(14px, 3vw, 36px) !important;
  }

  body[data-adversary-page="overview"] .adversary-war-performance-dialog {
    position: relative !important;
    inset: auto !important;
    width: min(1120px, 96vw) !important;
    max-width: 1120px !important;
    max-height: 90vh !important;
    margin: auto !important;
    overflow: auto !important;
    transform: none !important;
    z-index: 10001 !important;
  }

  @media (max-width: 640px) {
    body[data-adversary-page="overview"] .adversary-war-performance-dialog {
      width: 96vw !important;
      max-height: 88vh !important;
    }
  }

  /* Preserve the existing Player Performance scrolling and sticky header. */
  .adversary-content .monthly-player-performance-header {
    background: rgba(2, 6, 17, 0.94) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    backdrop-filter: blur(16px) !important;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.42) !important;
  }
`;


const PAGE_TITLES = {
  guild: 'Guild',
  monthly: 'Monthly Recap',
  nodewars: 'Node Wars',
  overview: 'Overview',
  players: 'Player Stats',
  hall: 'Hall of Fame',
  raw: 'Raw Logs',
};

function ActivePageBrand({ page }) {
  const title = PAGE_TITLES[page] || 'ADVERSARY';

  return (
    <section className="relative mb-4 overflow-hidden rounded-[26px] border border-amber-300/15 bg-slate-950/72 px-4 py-3 shadow-[0_24px_75px_rgba(0,0,0,.30)] backdrop-blur-2xl sm:px-5 sm:py-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(250,204,21,.07),transparent_34%,rgba(59,130,246,.045))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/45 to-transparent" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-5 top-1/2 h-40 w-40 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-20 drop-shadow-[0_0_35px_rgba(250,204,21,.20)] sm:right-4 sm:h-48 sm:w-48"
        style={{ backgroundImage: `url("${adversaryEmblem}")` }}
      />

      <div className="relative flex min-w-0 items-center gap-3.5">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-amber-300/20 bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_0_28px_rgba(250,204,21,.10)] sm:h-16 sm:w-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(250,204,21,.13),transparent_68%)]" />
          <img
            src={adversaryEmblem}
            alt=""
            aria-hidden="true"
            className="relative h-[88%] w-[88%] object-contain"
          />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-xl font-black tracking-tight text-white sm:text-2xl">
            {title}
          </h2>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState('nodewars');

  useEffect(() => {
    const title = PAGE_TITLES[page] || 'ADVERSARY';
    document.title = `${title} · ADVERSARY`;

    let icon = document.querySelector(
      'link[data-adversary-favicon="true"]',
    );

    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      icon.type = 'image/png';
      icon.dataset.adversaryFavicon = 'true';
      document.head.appendChild(icon);
    }

    icon.href = adversaryEmblem;
  }, [page]);

  useEffect(() => {
    document.body.dataset.adversaryPage = page;

    let frameId = 0;

    const decorateSurfaces = () => {
      frameId = 0;

      const contentRoot = document.querySelector('.adversary-content');

      if (contentRoot) {
        const panels = [...contentRoot.querySelectorAll(MAJOR_PANEL_SELECTOR)].filter(
          (panel) => {
            const bounds = panel.getBoundingClientRect();
            return bounds.width >= 140 && bounds.height >= 48;
          },
        );

        panels.forEach((panel, index) => {
          panel.classList.add('adversary-color-panel');
          panel.style.setProperty(
            '--adversary-panel-accent-rgb',
            getPanelAccent(panel, index),
          );
        });
      }

      if (page === 'guild' && contentRoot) {
        let enemyTierPanel = null;
        const titleElements = contentRoot.querySelectorAll(
          'h1, h2, h3, h4, h5, h6, [class*="font-black"], [class*="font-bold"]',
        );

        titleElements.forEach((heading) => {
          const title = heading.textContent?.trim().toLowerCase() || '';
          const panel = heading.closest(MAJOR_PANEL_SELECTOR);

          if (
            panel &&
            (title.includes('averages') ||
              title.includes('enemy guild tier list') ||
              title.includes('tier list filters'))
          ) {
            panel.classList.add('adversary-transparent-surface');
          }

          if (!title.includes('enemy guild tier list')) return;

          if (panel) {
            panel.classList.add('adversary-enemy-tier-panel');
            enemyTierPanel = panel;
          }
        });

        if (enemyTierPanel) {
          const tierAccentByName = {
            S: '245, 158, 11',
            A: '16, 185, 129',
            B: '59, 130, 246',
            C: '139, 92, 246',
            D: '244, 63, 94',
            E: '249, 115, 22',
            F: '146, 92, 56',
            T: '100, 116, 139',
          };

          /* Do not replace the tier-list panels with a different visual
             system. Keep every one of them on the exact same
             adversary-color-panel recipe used by the top Guild stat cards. */
          enemyTierPanel.classList.add(
            'adversary-color-panel',
            'adversary-enemy-tier-panel',
          );

          const enemyNestedPanels = [
            ...enemyTierPanel.querySelectorAll(MAJOR_PANEL_SELECTOR),
          ];

          enemyNestedPanels.forEach((panel) => {
            panel.classList.remove(
              'adversary-enemy-tier-neutral',
              'adversary-enemy-tier-row',
              'adversary-enemy-tier-card',
            );
            panel.classList.add('adversary-color-panel');
            panel.style.removeProperty('--adversary-tier-rgb');
          });

          const tierLabels = [
            ...enemyTierPanel.querySelectorAll('div, span, p, strong'),
          ].filter((element) => {
            const text = element.textContent?.trim().toUpperCase() || '';
            return Object.prototype.hasOwnProperty.call(tierAccentByName, text);
          });

          const tierRows = new Set();

          tierLabels.forEach((label) => {
            const tierName = label.textContent?.trim().toUpperCase() || '';
            const accent = tierAccentByName[tierName];

            label.classList.add('adversary-tier-letter');
            label.style.setProperty('--adversary-tier-rgb', accent);

            let ancestor = label.parentElement;
            let row = null;

            while (ancestor && ancestor !== enemyTierPanel) {
              if (ancestor.matches?.(MAJOR_PANEL_SELECTOR)) {
                const bounds = ancestor.getBoundingClientRect();
                const panelBounds = enemyTierPanel.getBoundingClientRect();
                const isWideTierRow =
                  bounds.width >= Math.max(520, panelBounds.width * 0.58) &&
                  bounds.height >= 62;

                if (isWideTierRow) {
                  row = ancestor;
                  break;
                }
              }

              ancestor = ancestor.parentElement;
            }

            if (!row || tierRows.has(row)) return;

            tierRows.add(row);
            row.classList.add(
              'adversary-color-panel',
              'adversary-enemy-tier-row',
            );
            row.style.setProperty('--adversary-panel-accent-rgb', accent);
            row.style.setProperty('--adversary-tier-rgb', accent);

            if (tierName === 'F') {
              row.classList.add('adversary-tier-f');
            }

            row.querySelectorAll(MAJOR_PANEL_SELECTOR).forEach((card) => {
              if (card === row) return;

              const bounds = card.getBoundingClientRect();
              const looksLikeGuildCard = bounds.width >= 170 && bounds.height >= 45;

              if (!looksLikeGuildCard) return;

              card.classList.add(
                'adversary-color-panel',
                'adversary-enemy-tier-card',
              );
              card.style.setProperty('--adversary-panel-accent-rgb', accent);
              card.style.setProperty('--adversary-tier-rgb', accent);

              if (tierName === 'F') {
                card.classList.add('adversary-tier-f');
              }
            });

            if (tierName === 'T') {
              const tierCaption = [...row.querySelectorAll('div, span, p, small, strong')]
                .find((element) => element.textContent?.trim().toUpperCase() === 'TIER');

              if (tierCaption) {
                if (tierCaption.textContent !== 'Trash') {
                  tierCaption.textContent = 'Trash';
                }

                tierCaption.classList.add('adversary-trash-label');
                tierCaption.style.setProperty('--adversary-tier-rgb', accent);
              }
            }
          });
        }

        const tooltipCandidates = enemyTierPanel
          ? [
              ...enemyTierPanel.querySelectorAll(
                [
                  '[role="tooltip"]',
                  '[data-tooltip]',
                  '[class*="tooltip"]:not(.adversary-guild-tooltip):not(.adversary-guild-tooltip-trigger)',
                  '[class*="popover"]',
                  '[class*="group-hover"][class*="absolute"]',
                  '[class*="group-hover"][class*="fixed"]',
                ].join(','),
              ),
            ].filter((candidate) => {
              const classText =
                typeof candidate.className === 'string' ? candidate.className : '';
              const role = candidate.getAttribute('role') || '';
              const styles = window.getComputedStyle(candidate);
              const positionedOverlay =
                styles.position === 'absolute' ||
                styles.position === 'fixed' ||
                classText.includes('absolute') ||
                classText.includes('fixed');
              const explicitlyTooltip =
                role === 'tooltip' ||
                candidate.hasAttribute('data-tooltip') ||
                classText.toLowerCase().includes('tooltip') ||
                classText.toLowerCase().includes('popover');
              const hoverOverlay =
                classText.includes('group-hover') && positionedOverlay;

              return positionedOverlay && (explicitlyTooltip || hoverOverlay);
            })
          : [];

        tooltipCandidates.forEach((tooltip) => {
          tooltip.classList.add('adversary-guild-tooltip');

          const trigger = tooltip.parentElement;
          trigger?.classList.add('adversary-guild-tooltip-trigger');

          const guildCard = trigger?.closest('.adversary-enemy-tier-card');
          const tierRow = trigger?.closest('.adversary-enemy-tier-row');

          guildCard?.classList.add('adversary-guild-tooltip-card');
          tierRow?.classList.add('adversary-guild-tooltip-row');
        });
      }

      if (page === 'overview') {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

        headings.forEach((heading) => {
          const title = heading.textContent?.trim().toLowerCase() || '';

          if (!title.includes('war performance')) return;

          const modal = heading.closest('[class*="fixed"]');

          if (!modal) return;

          modal.classList.add('adversary-war-performance-modal');

          const dialog = heading.closest(
            ':is(section, article, div)[class*="rounded"]',
          );

          if (dialog && modal.contains(dialog)) {
            dialog.classList.add('adversary-war-performance-dialog');
          }
        });
      }
    };

    const scheduleDecoration = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(decorateSurfaces);
    };

    scheduleDecoration();

    const observer = new MutationObserver(scheduleDecoration);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', scheduleDecoration);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleDecoration);

      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      if (document.body.dataset.adversaryPage === page) {
        delete document.body.dataset.adversaryPage;
      }
    };
  }, [page]);


  const [raw, setRaw] = useState('');
  const [date, setDate] = useState(today());

  const [nodeLogs, setNodeLogs] = useState([]);
  const [allLogs, setAllLogs] = useState(null);
  const [overviewLogs, setOverviewLogs] = useState([]);
  const [members, setMembers] = useState([]);

  const [periodDays, setPeriodDays] = useState(30);
  const [loadingNodeLogs, setLoadingNodeLogs] = useState(false);
  const [loadingAllLogs, setLoadingAllLogs] = useState(false);
  const [loadingOverviewLogs, setLoadingOverviewLogs] = useState(false);

  const [selectedDays, setSelectedDays] = useState(['current']);
  const [selectedWars, setSelectedWars] = useState(['current']);

  const [message, setMessage] = useState('');
  const [rawMonth, setRawMonth] = useState(monthId(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [nodeWarsWarning, setNodeWarsWarning] = useState('');
  const [matchHistoryDateFilter, setMatchHistoryDateFilter] = useState('');

  const logs = allLogs || nodeLogs;

  const loadNodeLogs = useCallback(async (nextPeriod = 30) => {
    try {
      setLoadingNodeLogs(true);

      const params = nextPeriod === 'all' ? { range: 'all' } : { days: nextPeriod };
      const data = await apiGet(logsPath(params));
      const normalized = normalizeLogs(data);

      setNodeLogs(normalized);
      setMessage('');
    } catch (error) {
      console.error('Failed to load node wars logs:', error);
      setNodeLogs([]);
      setMessage(
        `Database load failed: ${
          error?.message || error || 'unknown error'
        }.\nNu am încărcat loguri salvate local din browser.`,
      );
    } finally {
      setLoadingNodeLogs(false);
    }
  }, []);

  const loadAllLogs = useCallback(async () => {
    const allLogsAlreadyLoadedWithRaw =
      Array.isArray(allLogs) &&
      allLogs.length > 0 &&
      allLogs.every((log) => Boolean(log.raw));

    if (allLogsAlreadyLoadedWithRaw) {
      return allLogs;
    }

    try {
      setLoadingAllLogs(true);

      const data = await apiGet(logsPath({ range: 'all', includeRaw: 1 }));
      const normalized = normalizeLogs(data);

      setAllLogs(normalized);

      return normalized;
    } catch (error) {
      console.error('Failed to load all logs:', error);
      setMessage(
        `Database load failed: ${
          error?.message || error || 'unknown error'
        }.\nNu am încărcat loguri salvate local din browser.`,
      );

      return [];
    } finally {
      setLoadingAllLogs(false);
    }
  }, [allLogs]);

  const loadOverviewLogs = useCallback(async () => {
    if (page !== 'overview') return;

    try {
      setLoadingOverviewLogs(true);

      const availableLogs = Array.isArray(nodeLogs) ? nodeLogs : [];
      const needsAllLogs =
        selectedDays.includes('all') || selectedWars.includes('all');
      const allAvailableLogs = needsAllLogs
        ? await loadAllLogs()
        : Array.isArray(allLogs)
          ? allLogs
          : [];

      const sourceLogs = [
        ...new Map(
          [...availableLogs, ...allAvailableLogs]
            .filter(Boolean)
            .map((log) => [String(log.id), { ...log, date: dateOf(log) }]),
        ).values(),
      ];

      const selectedRealWars = selectedWars.includes('all')
        ? sourceLogs
            .map((log) => String(log.id))
            .filter((id) => id && id !== 'current' && id !== 'all')
        : selectedWars.filter((id) => id !== 'all' && id !== 'current');

      const uniqueSelectedWars = [...new Set(selectedRealWars)];

      if (!uniqueSelectedWars.length) {
        setOverviewLogs([]);
        return;
      }

      const fallbackById = new Map(
        sourceLogs.map((log) => [String(log.id), { ...log, date: dateOf(log) }]),
      );

      const rawById = new Map();

      sourceLogs.forEach((log) => {
        const id = String(log.id);

        if (!id || !log.raw) return;

        rawById.set(id, {
          ...log,
          date: dateOf(log),
        });
      });

      const idsToLoad = uniqueSelectedWars.filter((id) => !rawById.has(String(id)));

      const loaded = await Promise.allSettled(
        idsToLoad.map(async (id) => {
          const data = await apiGet(`/api/logs/${encodeURIComponent(id)}/raw`);
          return normalizeLog(data);
        }),
      );

      loaded.forEach((result) => {
        if (result.status !== 'fulfilled') return;

        const log = result.value;
        const id = String(log.id);

        if (!id || !log.raw) return;

        rawById.set(id, {
          ...log,
          date: dateOf(log),
        });
      });

      const selectedLogsWithFallback = uniqueSelectedWars
        .map((id) => rawById.get(String(id)) || fallbackById.get(String(id)))
        .filter(Boolean);

      setOverviewLogs(selectedLogsWithFallback);

      const loadedCount = uniqueSelectedWars.filter((id) => rawById.has(String(id))).length;
      const failedCount = uniqueSelectedWars.length - loadedCount;

      if (failedCount > 0) {
        console.warn(
          `Overview loaded ${loadedCount}/${uniqueSelectedWars.length} raw log(s). Falling back to saved summaries for ${failedCount} log(s).`,
        );
      }
    } catch (error) {
      console.error('Failed to load overview raw logs:', error);
      setOverviewLogs([]);
      setMessage(
        `Failed to load selected raw logs: ${
          error?.message || error || 'unknown error'
        }`,
      );
    } finally {
      setLoadingOverviewLogs(false);
    }
  }, [page, selectedDays, selectedWars, nodeLogs, allLogs, loadAllLogs]);

  useEffect(() => {
    loadNodeLogs(30);

    apiGet('/api/members')
      .then((data) => {
        setMembers(normalizeMembers(data));
      })
      .catch(() => {
        setMembers(readStorage(MEMBER_KEY, []));
      });
  }, [loadNodeLogs]);

  useEffect(() => {
    if (
      page === 'players' ||
      page === 'hall' ||
      page === 'raw' ||
      page === 'guild' ||
      page === 'monthly'
    ) {
      loadAllLogs();
    }
  }, [page, loadAllLogs]);

  useEffect(() => {
    loadOverviewLogs();
  }, [loadOverviewLogs]);

  const current = selectedDays.includes('current');
  const all = selectedDays.includes('all');

  const activeLogs = useMemo(() => {
    let baseLogs;

    if (current) {
      baseLogs = [
        {
          id: 'current',
          name: date,
          date,
          raw,
        },
      ];
    } else if (page === 'overview') {
      baseLogs = overviewLogs.map((log) => ({
        ...log,
        date: dateOf(log),
      }));
    } else {
      const base = all
        ? logs
        : logs.filter((log) => selectedDays.includes(dateOf(log)));

      baseLogs = base
        .filter(
          (log) =>
            selectedWars.includes('all') || selectedWars.includes(String(log.id)),
        )
        .map((log) => ({
          ...log,
          date: dateOf(log),
        }));
    }

    return baseLogs;
  }, [
    current,
    page,
    overviewLogs,
    all,
    logs,
    selectedDays,
    selectedWars,
    date,
    raw,
  ]);

  const stats = useMemo(() => calculateStats(activeLogs), [activeLogs]);

  const allTimeStats = useMemo(() => {
    if (page !== 'players' && page !== 'hall' && page !== 'guild') {
      return calculateStats([]);
    }

    const sourceLogs = Array.isArray(allLogs) ? allLogs : [];

    return calculateStats(
      sourceLogs
        .filter((log) => Boolean(log.raw))
        .map((log) => ({
          ...log,
          date: dateOf(log),
        })),
    );
  }, [page, allLogs]);

  const playerStatsReady =
    page !== 'players' ||
    (Array.isArray(allLogs) &&
      allLogs.length > 0 &&
      allLogs.some((log) => Boolean(log.raw)));

  const hallOfFameReady =
    page !== 'hall' ||
    (Array.isArray(allLogs) &&
      allLogs.length > 0 &&
      allLogs.some((log) => Boolean(log.raw)));

  const guildReady =
    page !== 'guild' ||
    (Array.isArray(allLogs) &&
      allLogs.length > 0 &&
      allLogs.some((log) => Boolean(log.raw)));

  const monthlyRecapReady =
    page !== 'monthly' || Array.isArray(allLogs);

  const label = current ? 'Current log' : all ? 'All saved days' : selectedDays[0] || 'No day';

  const markedDates = useMemo(
    () => new Set([...new Set(logs.map(dateOf))]),
    [logs],
  );

  async function saveLog(rawOverride) {
    const rawToSave = rawOverride == null ? raw : rawOverride;

    if (!parseLog(rawToSave, date, date, 'x').length) {
      setMessage('Invalid log');
      return;
    }

    const localHash = hashLog(rawToSave);

    const duplicate = logs.find((log) => {
      if (log.hash && log.hash === localHash) return true;
      if (log.raw) return hashLog(log.raw) === localHash;
      return false;
    });

    if (duplicate) {
      setSelectedDays([dateOf(duplicate)]);
      setSelectedWars([String(duplicate.id)]);
      setMessage('Duplicate log detected locally');
      return;
    }

    const draftLog = {
      id: `${date}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: date,
      date,
      raw: rawToSave,
      hash: localHash,
      createdAt: new Date().toISOString(),
    };

    const summary = buildLogSummary(draftLog);

    const payload = {
      ...draftLog,
      summary,
    };

    setMessage('Saving log to database...\nattempt 1/5');

    try {
      const response = await apiWriteWithRetry('/api/logs', 'POST', payload, {
        maxAttempts: 5,
        baseDelayMs: 700,
      });

      const savedLog = normalizeLog({
        ...payload,
        ...response,
        summary: response?.summary || payload.summary,
      });

      setNodeLogs((currentLogs) => [savedLog, ...currentLogs]);

      setAllLogs((currentLogs) =>
        Array.isArray(currentLogs) ? [savedLog, ...currentLogs] : currentLogs,
      );

      setOverviewLogs((currentLogs) =>
        Array.isArray(currentLogs) ? [savedLog, ...currentLogs] : currentLogs,
      );

      setSelectedDays([savedLog.date]);
      setSelectedWars([String(savedLog.id)]);
      setMessage('Log saved to database.\nSummary calculated and saved.');
    } catch (error) {
      const text = String(error?.message || error || 'Unknown error');

      console.error('Database save failed:', error);

      if (text.includes('Duplicate log')) {
        setMessage(
          `Database refused save: ${text}.\nLogul NU a fost salvat local în browser.`,
        );
        return;
      }

      if (
        text.includes('UnsupportedHttpVerb') ||
        text.includes('404') ||
        text.includes('ResourceNotFound')
      ) {
        setMessage(
          `API save endpoint is not available: ${text}.\nLogul NU a fost salvat local în browser.`,
        );
        return;
      }

      setMessage(
        `Database save failed after 5 attempts: ${text}.\nLogul NU a fost salvat local în browser.`,
      );
    }
  }

  async function deleteLog() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      await deleteApiLog(deleteTarget);

      setNodeLogs((currentLogs) =>
        currentLogs.filter((log) => String(log.id) !== String(deleteTarget.id)),
      );

      setAllLogs((currentLogs) =>
        Array.isArray(currentLogs)
          ? currentLogs.filter((log) => String(log.id) !== String(deleteTarget.id))
          : currentLogs,
      );

      setOverviewLogs((currentLogs) =>
        currentLogs.filter((log) => String(log.id) !== String(deleteTarget.id)),
      );

      setMessage('Log deleted from database');
      setDeleteTarget(null);
    } catch (error) {
      setMessage(error?.message || 'Delete error');
    } finally {
      setDeleting(false);
    }
  }

  function changePeriod(nextPeriod) {
    setPeriodDays(nextPeriod);
    loadNodeLogs(nextPeriod);
  }

  const menu = [
    ['guild', 'Guild'],
    ['monthly', 'Monthly Recap'],
    ['nodewars', 'Node Wars'],
    ['players', 'Player Stats'],
    ['hall', 'Hall of Fame'],
    ['raw', 'Raw Logs'],
  ];

  function isMenuActive(id) {
    return id === 'nodewars' ? page === 'nodewars' || page === 'overview' : page === id;
  }

  function openOverviewFromMenu() {
    const allSavedLogsSelected = selectedWars.includes('all');
    const selectedRealWars = selectedWars.filter(
      (id) => id !== 'all' && id !== 'current',
    );

    if (!allSavedLogsSelected && !selectedRealWars.length) {
      setNodeWarsWarning('No node war selected.\nSelect at least one war first.');
      setPage('nodewars');
      return;
    }

    setNodeWarsWarning('');
    setSelectedDays(['all']);
    setPage('overview');
  }

  function openPage(nextPage) {
    setNodeWarsWarning('');
    setMatchHistoryDateFilter('');
    setPage(nextPage);
  }

  function openMatchOverviewFromPlayerStats(match) {
    const warId = String(match?.warId || '').trim();

    if (!warId) {
      setMessage('This match has no valid war ID.');
      return;
    }

    setNodeWarsWarning('');
    setMatchHistoryDateFilter('');
    setSelectedDays(['all']);
    setSelectedWars([warId]);
    setPage('overview');
  }

  function openMatchOverviewFromMonthlyRecap(match) {
    const warId = String(match?.id || match?.warId || '').trim();

    if (!warId) {
      setMessage('This match has no valid war ID.');
      return;
    }

    setNodeWarsWarning('');
    setMatchHistoryDateFilter('');
    setSelectedDays(['all']);
    setSelectedWars([warId]);
    setPage('overview');
  }

  const rawHistoryLogs = allLogs || nodeLogs;

  return (
    <div className="adversary-app relative min-h-screen overflow-x-hidden text-slate-100">
      <style>{GLOBAL_PANEL_CSS}</style>
      <div
        aria-hidden="true"
        className="adversary-site-background pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-slate-950" />

        <div
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage: [
              'radial-gradient(ellipse 46% 82% at 0% 48%, rgba(250,204,21,.17) 0%, rgba(245,158,11,.105) 24%, rgba(180,83,9,.055) 48%, transparent 76%)',
              'radial-gradient(ellipse 46% 82% at 100% 52%, rgba(250,204,21,.17) 0%, rgba(245,158,11,.105) 24%, rgba(180,83,9,.055) 48%, transparent 76%)',
              'radial-gradient(ellipse 32% 54% at 10% 18%, rgba(253,224,71,.075) 0%, rgba(217,119,6,.035) 52%, transparent 78%)',
              'radial-gradient(ellipse 32% 54% at 90% 82%, rgba(253,224,71,.075) 0%, rgba(217,119,6,.035) 52%, transparent 78%)',
            ].join(', '),
            filter: 'blur(24px)',
            transform: 'scale(1.04)',
          }}
        />

        <div
          className="absolute inset-0 bg-center bg-no-repeat opacity-[0.30]"
          style={{
            backgroundImage: `url("${adversaryEmblem}")`,
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'auto 100%',
            filter: 'saturate(1.18) contrast(1.06)',
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0%, rgba(0,0,0,.28) 7%, rgba(0,0,0,.78) 18%, #000 29%, #000 71%, rgba(0,0,0,.78) 82%, rgba(0,0,0,.28) 93%, transparent 100%)',
            maskImage:
              'linear-gradient(90deg, transparent 0%, rgba(0,0,0,.28) 7%, rgba(0,0,0,.78) 18%, #000 29%, #000 71%, rgba(0,0,0,.78) 82%, rgba(0,0,0,.28) 93%, transparent 100%)',
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,.13)_0%,rgba(250,204,21,.06)_32%,rgba(180,83,9,.04)_56%,transparent_76%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_38%,rgba(120,53,15,.10)_66%,rgba(2,6,23,.74)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,.34),rgba(120,53,15,.035)_28%,rgba(120,53,15,.055)_68%,rgba(2,6,23,.66))]" />
      </div>
      <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/88 p-3 backdrop-blur-xl lg:hidden">
        <div className="mb-3 text-lg font-black tracking-[0.18em] text-amber-300 drop-shadow-[0_0_16px_rgba(250,204,21,.38)]">
          ADVERSARY
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {menu.map(([id, title]) => (
            <button
              key={id}
              type="button"
              onClick={() => openPage(id)}
              className={`rounded-xl px-3 py-2 text-center text-xs font-black ${
                isMenuActive(id)
                  ? 'border border-blue-400 bg-blue-500/20 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {id === 'guild' && (
                  <img
                    src={adversaryEmblem}
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,.28)]"
                  />
                )}
                <span>{title}</span>
              </span>
            </button>
          ))}
        </div>

        {(page === 'nodewars' || page === 'overview') && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openPage('nodewars')}
              className={`rounded-xl px-3 py-2 text-center text-xs font-black ${
                page === 'nodewars'
                  ? 'border border-blue-400 bg-blue-500/20 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              Match History
            </button>

            <button
              type="button"
              onClick={openOverviewFromMenu}
              className={`rounded-xl px-3 py-2 text-center text-xs font-black ${
                page === 'overview'
                  ? 'border border-blue-400 bg-blue-500/20 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              Overview
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[250px_1fr]">
        <aside className="hidden min-h-screen flex-col border-r border-slate-800/90 bg-slate-950/82 p-4 backdrop-blur-2xl lg:flex">
          <h1 className="mb-6 text-2xl font-black tracking-[0.16em] text-amber-300 drop-shadow-[0_0_18px_rgba(250,204,21,.38)]">
            ADVERSARY
          </h1>

          <nav className="flex-1">
            {menu
              .filter(([id]) => id !== 'raw')
              .map(([id, title]) => {
                const isNodeWars = id === 'nodewars';

                return (
                  <div key={id} className="mb-2">
                    <button
                      type="button"
                      onClick={() => openPage(id)}
                      className={`w-full rounded-xl px-4 py-3 text-left font-bold ${
                        isMenuActive(id)
                          ? 'border border-blue-400 bg-blue-500/20'
                          : 'hover:bg-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {id === 'guild' && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-300/15 bg-black/30">
                            <img
                              src={adversaryEmblem}
                              alt=""
                              aria-hidden="true"
                              className="h-7 w-7 object-contain drop-shadow-[0_0_10px_rgba(250,204,21,.26)]"
                            />
                          </span>
                        )}
                        <span>{title}</span>
                      </span>
                    </button>

                    {isNodeWars && (
                      <div className="ml-4 mt-2 space-y-1 border-l border-slate-800 pl-3">
                        <button
                          type="button"
                          onClick={() => openPage('nodewars')}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${
                            page === 'nodewars'
                              ? 'bg-blue-500/20 text-white'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                          }`}
                        >
                          Match History
                        </button>

                        <button
                          type="button"
                          onClick={openOverviewFromMenu}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${
                            page === 'overview'
                              ? 'bg-blue-500/20 text-white'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                          }`}
                        >
                          Overview
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => openPage('raw')}
              className={`w-full rounded-xl px-4 py-3 text-left font-bold ${
                isMenuActive('raw')
                  ? 'border border-blue-400 bg-blue-500/20'
                  : 'hover:bg-slate-900'
              }`}
            >
              Raw Logs
            </button>
          </div>
        </aside>

        <main className={`adversary-content adversary-page-${page} relative min-w-0 p-3 sm:p-5 lg:p-6`}>
          <ActivePageBrand page={page} />
          {page === 'guild' && (
            <Suspense fallback={<PageLoader text="Loading guild stats..." />}>
              {!guildReady || loadingAllLogs ? (
                <PageLoader text="Loading all logs for Guild..." />
              ) : (
                <Guild stats={allTimeStats} logs={Array.isArray(allLogs) ? allLogs : []} />
              )}
            </Suspense>
          )}

          {page === 'nodewars' && (
            <NodeWars
              logs={nodeLogs}
              loading={loadingNodeLogs}
              periodDays={periodDays}
              onPeriodChange={changePeriod}
              setPage={setPage}
              setSelectedDays={setSelectedDays}
              setSelectedWars={setSelectedWars}
              selectedWars={selectedWars}
              matchHistoryDateFilter={matchHistoryDateFilter}
              externalWarning={nodeWarsWarning}
              clearExternalWarning={() => setNodeWarsWarning('')}
            />
          )}

          {page === 'overview' && (
            <Suspense fallback={<PageLoader text="Loading overview..." />}>
              {loadingOverviewLogs ? (
                <PageLoader text="Loading selected raw logs for overview..." />
              ) : (
                <Overview
                  stats={stats}
                  label={label}
                  members={members}
                  selectedLogs={activeLogs}
                  lifetimeLogs={Array.isArray(allLogs) ? allLogs : []}
                  loadLifetimeLogs={loadAllLogs}
                />
              )}
            </Suspense>
          )}

          {page === 'monthly' && (
            <Suspense
              fallback={<PageLoader text="Loading Monthly Recap..." />}
            >
              {!monthlyRecapReady || loadingAllLogs ? (
                <PageLoader text="Loading all logs for Monthly Recap..." />
              ) : (
                <MonthlyRecap
                  logs={Array.isArray(allLogs) ? allLogs : []}
                  onOpenMatchOverview={openMatchOverviewFromMonthlyRecap}
                />
              )}
            </Suspense>
          )}

          {page === 'players' && (
            <Suspense fallback={<PageLoader text="Loading player stats..." />}>
              {!playerStatsReady || loadingAllLogs ? (
                <PageLoader text="Loading all logs for Player Stats..." />
              ) : (
                <PlayerStats
                  stats={allTimeStats}
                  onOpenMatchOverview={openMatchOverviewFromPlayerStats}
                />
              )}
            </Suspense>
          )}

          {page === 'hall' && (
            <Suspense fallback={<PageLoader text="Loading Hall of Fame..." />}>
              {!hallOfFameReady || loadingAllLogs ? (
                <PageLoader text="Loading all logs for Hall of Fame..." />
              ) : (
                <HallOfFame stats={stats} allTimeStats={allTimeStats} />
              )}
            </Suspense>
          )}

          {page === 'raw' && (
            <>
              {loadingAllLogs && !allLogs && (
                <div className="mb-4">
                  <PageLoader text="Loading full log history..." />
                </div>
              )}

              <RawLog
                raw={raw}
                setRaw={setRaw}
                date={date}
                setDate={setDate}
                logs={rawHistoryLogs}
                message={message}
                saveLog={saveLog}
                rawMonth={rawMonth}
                setRawMonth={setRawMonth}
                calendarOpen={calendarOpen}
                setCalendarOpen={setCalendarOpen}
                markedDates={markedDates}
                deleteTarget={deleteTarget}
                setDeleteTarget={setDeleteTarget}
                deleting={deleting}
                deleteLog={deleteLog}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
