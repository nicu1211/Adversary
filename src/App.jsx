import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import NodeWars from './pages/NodeWars';
import RawLog from './pages/RawLog';
import adversaryEmblem from './assets/adversary-emblem.png?url';
import classOrbArcher from './assets/class-orbs/Archer.webp';
import classOrbBerserker from './assets/class-orbs/Berserker.webp';
import classOrbCorsair from './assets/class-orbs/Corsair.webp';
import classOrbDarkKnight from './assets/class-orbs/DarkKnight.webp';
import classOrbDeadeye from './assets/class-orbs/Deadeye.webp';
import classOrbDosa from './assets/class-orbs/Dosa.webp';
import classOrbDrakania from './assets/class-orbs/Drakania.webp';
import classOrbGuardian from './assets/class-orbs/Guardian.webp';
import classOrbHashashin from './assets/class-orbs/Hashashin.webp';
import classOrbKunoichi from './assets/class-orbs/Kunoichi.webp';
import classOrbLahn from './assets/class-orbs/Lahn.webp';
import classOrbMaegu from './assets/class-orbs/Maegu.webp';
import classOrbMaehwa from './assets/class-orbs/Maehwa.webp';
import classOrbMusa from './assets/class-orbs/Musa.webp';
import classOrbMystic from './assets/class-orbs/Mystic.webp';
import classOrbNinja from './assets/class-orbs/Ninja.webp';
import classOrbNova from './assets/class-orbs/Nova.webp';
import classOrbRanger from './assets/class-orbs/Ranger.webp';
import classOrbSage from './assets/class-orbs/Sage.webp';
import classOrbScholar from './assets/class-orbs/Scholar.webp';
import classOrbSeraph from './assets/class-orbs/Seraph.webp';
import classOrbShai from './assets/class-orbs/Shai.webp';
import classOrbSorceress from './assets/class-orbs/Sorceress.webp';
import classOrbStriker from './assets/class-orbs/Striker.webp';
import classOrbTamer from './assets/class-orbs/Tamer.webp';
import classOrbValkyrie from './assets/class-orbs/Valkyrie.webp';
import classOrbWarrior from './assets/class-orbs/Warrior.webp';
import classOrbWitch from './assets/class-orbs/Witch.webp';
import classOrbWizard from './assets/class-orbs/Wizard.webp';
import classOrbWoosa from './assets/class-orbs/Woosa.webp';
import classOrbWukong from './assets/class-orbs/Wukong.webp';
import sidebarOrbHoverSound from './assets/class-orbs/orb-hover.mp3';
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
  parseClassRows,
  parseLog,
  readStorage,
  today,
} from './lib/logUtils';

const GUILD_ROSTER = Object.freeze([
  'Melifluous',
  'GojuSaki',
  'Aspeen',
  'MrOutlAw',
  'SpeedDrawFenix',
  'Dante_Senpai',
  'Jaxce',
  'Spilborghs',
  'Raizel',
  'AesirKing',
  'ARC',
  'URIZEN',
  'IllIlllIllIlllIl',
  'Winterious',
  'Kimezi',
  'Nkys',
  'Form',
  'MokrySpren',
  'Emotionz',
  'Emphonia',
  'EHASZz',
  'MrDethsTV',
  'MrsRaccoon',
  'Joeshot',
  'SexyCupquake',
  'FarewelI',
  'MadOzan',
  'CelestialElixir',
  'TaeHeeBaek',
  'Kiriva',
  'Baskona',
  'Sarres',
  'Gorz',
  'Working',
  'Bertoweed',
  'Mahikkii',
  'Facetasm',
  'Wallmann',
  'Askild',
  'Bazu19',
  'Reader',
  'TEKSONXV',
  'Honors',
  'JustSkel',
  'Staier',
  'Eviria',
  'Craifall',
  'Fweeky',
  'OAP',
  'Pandanotfound',
  'Flamingfred',
  'Ya_Ya',
  'Ellevest',
  'Wolfscream',
  'PmP',
  'Kawoy',
  'Hexanity',
  'TheWuffs',
  'TheFluffs',
  'Astin',
  'Eriofrien',
  'Rinslet',
  'Passler',
  'UberAlles',
  'Wirouz',
  'Effulgence',
  'OQuimBarreiros',
  'DeadToNeafink',
  'GoldFireNOR',
  'Jonah',
  'BogSmrti',
  'Hamsti',
  'Kaede_Lucifer',
  'Jostrel',
  'DevilKittenSins',
  'Dojopet',
  'OG_Hege',
  'Asrothx',
  'Dovah',
  'Potetmos',
  'Jeung',
]);

const Overview = lazy(() => import('./pages/Overview'));
const PlayerStats = lazy(() => import('./pages/PlayerStats'));
const HallOfFame = lazy(() => import('./pages/HallOfFame'));
const Guild = lazy(() => import('./pages/Guild'));
const MonthlyRecap = lazy(() => import('./pages/MonthlyRecap'));

const API_BASE = '';
const ADMIN_TOKEN_KEY = 'bdo_admin_token';

const SECONDARY_LOG_START = '===== ADVERSARY_SECONDARY_LOG_START =====';
const CLASS_LOG_START = '===== ADVERSARY_CLASS_LOG_START =====';

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
  const markerIndexes = [
    text.indexOf(SECONDARY_LOG_START),
    text.indexOf(CLASS_LOG_START),
  ].filter((index) => index >= 0);
  const firstMarkerIndex = markerIndexes.length
    ? Math.min(...markerIndexes)
    : text.length;

  return text.slice(0, firstMarkerIndex).trim();
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

async function updateApiLog(log, payload) {
  const source = log?._src || {};
  const apiId =
    log?.apiId ||
    log?.id ||
    source.id ||
    source._id ||
    source.log_id ||
    source.key ||
    source.objectKey ||
    source.filename ||
    source.fileName ||
    source.path ||
    source.slug;

  if (!apiId) {
    throw new Error('Cannot update this log because it has no database id.');
  }

  const id = String(apiId);
  const body = { ...payload, id: apiId };
  const attempts = [
    [`/api/logs/${encodeURIComponent(id)}`, 'PUT', payload],
    [`/api/logs/${encodeURIComponent(id)}`, 'PATCH', payload],
    ['/api/logs', 'PUT', body],
    ['/api/logs', 'PATCH', body],
    ['/api/logs/update', 'POST', body],
    ['/api/logs', 'POST', { ...body, action: 'update', _method: 'PUT' }],
  ];
  let lastError = null;

  for (const [path, method, attemptBody] of attempts) {
    try {
      return await apiWriteWithRetry(path, method, attemptBody, {
        maxAttempts: 3,
        baseDelayMs: 500,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Update failed. Backend did not accept any update route. Last error: ${
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

const MENU_ACCENTS = Object.freeze({
  guild: '245, 158, 11',
  monthly: '6, 182, 212',
  nodewars: '59, 130, 246',
  overview: '6, 182, 212',
  players: '139, 92, 246',
  hall: '250, 204, 21',
  raw: '148, 163, 184',
});

const KNOWN_STAT_PANEL_SELECTOR = [
  '.overview-battle-metric',
  '.player-stats-summary-card',
  '.nodewars-summary-stat',
  '.monthly-panel-subtle',
].join(',');

const STAT_PANEL_LABEL_PATTERN = /(?:^|\b)(?:total|average|avg|kills?|deaths?|k\s*\/\s*d|kd|wars?|matches?|players?|damage|cc hits?|fort(?: damage)?|rank|score|streak|kill\s*feed|killfeed|participation|win rate|efficiency)(?:\b|$)/i;
const STAT_PANEL_VALUE_PATTERN = /(?:^|\s)[+−-]?\d[\d,.]*(?:\s*(?:%|k|m|b|t))?(?:\s|$)/i;

function looksLikeStatPanel(panel, activePage) {
  if (!panel) return false;

  if (panel.matches?.(KNOWN_STAT_PANEL_SELECTOR)) {
    return true;
  }

  if (
    panel.closest?.(
      '.adversary-enemy-tier-panel, .adversary-guild-tooltip, table, tbody, thead, tr, [role="row"]',
    )
  ) {
    return false;
  }

  if (
    activePage === 'guild' &&
    panel.closest?.(
      '.adversary-enemy-tier-row, .adversary-enemy-tier-card',
    )
  ) {
    return false;
  }

  const bounds = panel.getBoundingClientRect();
  const text = String(panel.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    bounds.width < 140 ||
    bounds.height < 48 ||
    bounds.height > 240 ||
    text.length < 2 ||
    text.length > 210
  ) {
    return false;
  }

  const nestedPanels = panel.querySelectorAll?.(MAJOR_PANEL_SELECTOR)?.length || 0;

  if (nestedPanels > 0) return false;

  return (
    STAT_PANEL_LABEL_PATTERN.test(text) &&
    STAT_PANEL_VALUE_PATTERN.test(` ${text} `)
  );
}

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

  .adversary-site-artwork {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .adversary-site-artwork > img {
    width: auto;
    height: 106%;
    max-width: none;
    flex: none;
    object-fit: contain;
  }

  @media (min-width: 1024px) {
    /* Center the artwork inside the content area rather than the full
       viewport while preserving the 250px desktop sidebar. */
    .adversary-site-artwork {
      padding-left: 250px;
    }
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

  /* Sidebar navigation uses the same restrained coloured-glass language as
     the rest of the site. Each page keeps a distinct accent while inactive
     labels remain muted instead of plain grey. */
  .adversary-menu-button {
    --adversary-menu-rgb: 96, 165, 250;
    color: rgba(var(--adversary-menu-rgb), 0.78) !important;
    border-color: transparent !important;
    background-color: transparent !important;
    background-image: linear-gradient(
      105deg,
      rgba(var(--adversary-menu-rgb), 0.025),
      transparent 64%
    ) !important;
    box-shadow: none !important;
    transition:
      color 170ms ease,
      border-color 170ms ease,
      background-color 170ms ease,
      background-image 170ms ease,
      box-shadow 170ms ease,
      transform 170ms ease;
  }

  .adversary-menu-button:hover {
    color: rgb(var(--adversary-menu-rgb)) !important;
    border-color: rgba(var(--adversary-menu-rgb), 0.22) !important;
    background-color: rgba(2, 6, 23, 0.44) !important;
    background-image:
      radial-gradient(
        ellipse at 8% 50%,
        rgba(var(--adversary-menu-rgb), 0.16),
        transparent 64%
      ),
      linear-gradient(
        105deg,
        rgba(var(--adversary-menu-rgb), 0.07),
        rgba(2, 6, 23, 0.22) 72%
      ) !important;
    box-shadow:
      inset 0 0 20px rgba(var(--adversary-menu-rgb), 0.035),
      0 0 16px rgba(var(--adversary-menu-rgb), 0.08) !important;
  }

  .adversary-menu-button.is-active {
    color: rgb(255, 255, 255) !important;
    border-color: rgba(var(--adversary-menu-rgb), 0.36) !important;
    background-color: rgba(2, 6, 23, 0.58) !important;
    background-image:
      radial-gradient(
        ellipse at 10% 50%,
        rgba(var(--adversary-menu-rgb), 0.24),
        rgba(var(--adversary-menu-rgb), 0.08) 48%,
        transparent 78%
      ),
      linear-gradient(
        105deg,
        rgba(var(--adversary-menu-rgb), 0.105),
        rgba(2, 6, 23, 0.38) 72%
      ) !important;
    box-shadow:
      inset 0 0 24px rgba(var(--adversary-menu-rgb), 0.065),
      0 0 18px rgba(var(--adversary-menu-rgb), 0.13) !important;
  }

  .adversary-menu-button.is-active::before {
    content: '';
    position: absolute;
    left: -1px;
    top: 22%;
    bottom: 22%;
    width: 2px;
    border-radius: 999px;
    background: rgb(var(--adversary-menu-rgb));
    box-shadow: 0 0 10px rgba(var(--adversary-menu-rgb), 0.72);
  }

  .adversary-menu-button-mobile.is-active::before {
    left: 18%;
    right: 18%;
    top: auto;
    bottom: -1px;
    width: auto;
    height: 2px;
  }

  /* Floating class orbs live behind the desktop navigation. Their movement is
     handled by a small low-gravity physics loop: they drift across the full
     sidebar, bounce softly from its edges, nudge one another, and are pushed
     away by the cursor without ever blocking the navigation. */
  .adversary-sidebar-class-orbs {
    position: absolute;
    inset: 0;
    z-index: 20;
    overflow: hidden;
    pointer-events: none;
  }

  .adversary-sidebar-class-orb-shell {
    position: absolute;
    left: 0;
    top: 0;
    width: var(--orb-size, 76px);
    height: var(--orb-size, 76px);
    opacity: var(--orb-opacity, 0.68);
    transform: translate3d(
        var(--orb-x, 0px),
        var(--orb-y, 0px),
        0
      )
      rotate(var(--orb-rotation, 0deg))
      scale(var(--orb-react-scale, 1));
    transform-origin: center;
    will-change: transform, opacity;
    transition: opacity 150ms ease, filter 150ms ease;
    pointer-events: auto;
    cursor: pointer;
    border: 0;
    padding: 0;
    background: transparent;
    appearance: none;
    -webkit-appearance: none;
  }

  .adversary-sidebar-class-orb-shell:hover,
  .adversary-sidebar-class-orb-shell:focus-visible {
    opacity: 1;
    filter: brightness(1.12);
    outline: none;
  }

  .adversary-sidebar-class-orb-shell:focus-visible::after {
    content: '';
    position: absolute;
    inset: 8%;
    border-radius: 999px;
    border: 1px solid rgba(250, 204, 21, 0.82);
    box-shadow: 0 0 16px rgba(250, 204, 21, 0.48);
  }

  .adversary-sidebar-class-orb-shell::before {
    content: '';
    position: absolute;
    inset: 15%;
    border-radius: 999px;
    background: radial-gradient(
      circle,
      rgba(var(--orb-glow-rgb, 239, 68, 68), 0.18),
      rgba(var(--orb-glow-rgb, 239, 68, 68), 0.055) 48%,
      transparent 74%
    );
    filter: blur(11px);
    transform: scale(1.38);
  }

  .adversary-sidebar-class-orb {
    position: relative;
    pointer-events: none;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
    animation: adversary-sidebar-orb-breathe var(--orb-duration, 8s)
      ease-in-out infinite;
    animation-delay: var(--orb-delay, 0s);
    filter:
      saturate(1.12)
      contrast(1.05)
      drop-shadow(0 0 10px rgba(var(--orb-glow-rgb, 239, 68, 68), 0.34))
      drop-shadow(0 8px 16px rgba(0, 0, 0, 0.32));
  }

  .adversary-sidebar-class-orb-shell.is-red {
    --orb-glow-rgb: 239, 68, 68;
  }

  .adversary-sidebar-class-orb-shell.is-violet-orange {
    --orb-glow-rgb: 217, 70, 239;
  }

  .adversary-sidebar-class-orb-shell.is-red-silver {
    --orb-glow-rgb: 239, 68, 68;
  }


  .adversary-class-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 20000;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(2, 6, 23, 0.78);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
  }

  .adversary-class-modal {
    position: relative;
    width: min(1380px, 92vw);
    max-height: 86vh;
    overflow: auto;
    border: 1px solid rgba(var(--class-rgb, 250, 204, 21), 0.30);
    border-radius: 26px;
    padding: 22px;
    color: #e2e8f0;
    background:
      radial-gradient(circle at 12% 0%, rgba(var(--class-rgb, 250, 204, 21), 0.15), transparent 38%),
      linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98));
    box-shadow:
      0 28px 90px rgba(0, 0, 0, 0.65),
      0 0 40px rgba(var(--class-rgb, 250, 204, 21), 0.13);
    scrollbar-gutter: stable;
  }

  .adversary-class-modal,
  .adversary-class-player-cards,
  .adversary-class-player-list,
  .adversary-class-stats-table-wrap {
    scrollbar-width: thin;
    scrollbar-color:
      rgba(var(--class-rgb, 250, 204, 21), 0.72)
      rgba(15, 23, 42, 0.52);
  }

  .adversary-class-modal::-webkit-scrollbar,
  .adversary-class-player-cards::-webkit-scrollbar,
  .adversary-class-player-list::-webkit-scrollbar,
  .adversary-class-stats-table-wrap::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  .adversary-class-modal::-webkit-scrollbar-track,
  .adversary-class-player-cards::-webkit-scrollbar-track,
  .adversary-class-player-list::-webkit-scrollbar-track,
  .adversary-class-stats-table-wrap::-webkit-scrollbar-track {
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.48);
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.08);
  }

  .adversary-class-modal::-webkit-scrollbar-thumb,
  .adversary-class-player-cards::-webkit-scrollbar-thumb,
  .adversary-class-player-list::-webkit-scrollbar-thumb,
  .adversary-class-stats-table-wrap::-webkit-scrollbar-thumb {
    min-height: 42px;
    border: 2px solid rgba(15, 23, 42, 0.72);
    border-radius: 999px;
    background: linear-gradient(
      180deg,
      rgba(var(--class-rgb, 250, 204, 21), 0.92),
      rgba(var(--class-rgb, 250, 204, 21), 0.48)
    );
    box-shadow: 0 0 12px rgba(var(--class-rgb, 250, 204, 21), 0.20);
  }

  .adversary-class-modal::-webkit-scrollbar-thumb:hover,
  .adversary-class-player-cards::-webkit-scrollbar-thumb:hover,
  .adversary-class-player-list::-webkit-scrollbar-thumb:hover,
  .adversary-class-stats-table-wrap::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(
      180deg,
      rgb(var(--class-rgb, 250, 204, 21)),
      rgba(var(--class-rgb, 250, 204, 21), 0.68)
    );
  }

  .adversary-class-modal-close {
    position: absolute;
    right: 16px;
    top: 16px;
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 12px;
    color: #cbd5e1;
    background: rgba(15, 23, 42, 0.78);
    cursor: pointer;
  }

  .adversary-class-modal-close:hover {
    border-color: rgba(var(--class-rgb, 250, 204, 21), 0.50);
    color: #fff;
  }

  .adversary-class-modal-orb {
    width: 92px;
    height: 92px;
    object-fit: contain;
    filter: drop-shadow(0 0 20px rgba(var(--class-rgb, 250, 204, 21), 0.42));
  }

  .adversary-class-pie {
    position: relative;
    display: grid;
    width: 150px;
    height: 150px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 999px;
    background: conic-gradient(
      rgb(var(--class-rgb, 250, 204, 21)) calc(var(--class-share, 0) * 1%),
      rgba(51, 65, 85, 0.72) 0
    );
    box-shadow:
      inset 0 0 24px rgba(0, 0, 0, 0.32),
      0 0 28px rgba(var(--class-rgb, 250, 204, 21), 0.16);
  }

  .adversary-class-pie::before {
    content: '';
    position: absolute;
    inset: 20px;
    border-radius: inherit;
    background: rgba(2, 6, 23, 0.96);
    box-shadow: inset 0 0 18px rgba(15, 23, 42, 0.72);
  }

  .adversary-class-pie-value {
    position: relative;
    z-index: 1;
    text-align: center;
  }

  .adversary-class-player-list {
    max-height: 250px;
    overflow: auto;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 18px;
    background: rgba(2, 6, 23, 0.44);
  }

  .adversary-class-player-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 11px 14px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.10);
  }

  .adversary-class-player-row:last-child {
    border-bottom: 0;
  }

  .adversary-class-modal-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding-right: 48px;
  }

  .adversary-class-modal-select {
    min-width: 190px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 12px;
    padding: 9px 34px 9px 12px;
    color: #f8fafc;
    background: rgba(15, 23, 42, 0.92);
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
  }

  .adversary-class-modal-tab {
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 12px;
    padding: 9px 14px;
    color: #94a3b8;
    background: rgba(15, 23, 42, 0.68);
    font-size: 12px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
  }

  .adversary-class-modal-tab:hover,
  .adversary-class-modal-tab.is-active {
    border-color: rgba(var(--class-rgb, 250, 204, 21), 0.52);
    color: #fff;
    background: rgba(var(--class-rgb, 250, 204, 21), 0.13);
    box-shadow: 0 0 18px rgba(var(--class-rgb, 250, 204, 21), 0.10);
  }

  .adversary-class-stats-table-wrap {
    max-height: 360px;
    overflow: auto;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 18px;
    background: rgba(2, 6, 23, 0.48);
  }

  .adversary-class-stats-table {
    width: 100%;
    min-width: 1050px;
    border-collapse: collapse;
  }

  .adversary-class-stats-table th {
    position: sticky;
    top: 0;
    z-index: 2;
    padding: 10px 11px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    color: #94a3b8;
    background: rgba(15, 23, 42, 0.98);
    font-size: 10px;
    font-weight: 900;
    text-align: right;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .adversary-class-stats-table th:first-child,
  .adversary-class-stats-table td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    text-align: left;
    background: rgba(9, 15, 29, 0.98);
  }

  .adversary-class-stats-table th:first-child {
    z-index: 3;
    background: rgba(15, 23, 42, 0.99);
  }

  .adversary-class-stats-table td {
    padding: 11px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.09);
    color: #e2e8f0;
    font-size: 12px;
    font-weight: 700;
    text-align: right;
    white-space: nowrap;
  }

  .adversary-class-stats-table tr:last-child td {
    border-bottom: 0;
  }

  .adversary-class-stat-average {
    display: block;
    margin-top: 2px;
    color: #64748b;
    font-size: 9px;
    font-weight: 700;
  }

  .adversary-class-mode-tug {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(var(--class-rgb, 250, 204, 21), 0.24);
    border-radius: 17px;
    padding: 12px 14px 13px;
    background:
      radial-gradient(circle at 50% 100%, rgba(var(--class-rgb, 250, 204, 21), 0.10), transparent 58%),
      linear-gradient(135deg, rgba(8, 15, 30, 0.95), rgba(2, 6, 23, 0.86));
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 14px 38px rgba(0, 0, 0, 0.20);
  }

  .adversary-class-mode-tug::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(90deg, rgba(34, 211, 238, 0.055), transparent 42%, transparent 58%, rgba(244, 63, 94, 0.055));
  }

  .adversary-class-mode-tug-labels {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .adversary-class-mode-label {
    display: flex;
    min-width: 0;
    align-items: baseline;
    gap: 8px;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .adversary-class-mode-label strong {
    color: #fff;
    font-size: 22px;
    line-height: 1;
  }

  .adversary-class-mode-label small {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .adversary-class-mode-label.is-succession {
    color: #67e8f9;
  }

  .adversary-class-mode-label.is-succession small {
    color: #64748b;
  }

  .adversary-class-mode-label.is-awakening {
    justify-content: flex-end;
    color: #fda4af;
    text-align: right;
  }

  .adversary-class-mode-label.is-awakening small {
    color: #64748b;
  }

  .adversary-class-mode-track {
    position: relative;
    z-index: 1;
    display: flex;
    height: 19px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 999px;
    background: rgba(2, 6, 23, 0.82);
    box-shadow: inset 0 2px 9px rgba(0, 0, 0, 0.52);
  }

  .adversary-class-mode-fill {
    height: 100%;
    min-width: 0;
    transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .adversary-class-mode-fill.is-succession {
    background: linear-gradient(90deg, #0891b2, #22d3ee, #67e8f9);
    box-shadow: 0 0 20px rgba(34, 211, 238, 0.42);
  }

  .adversary-class-mode-fill.is-awakening {
    background: linear-gradient(90deg, #fb7185, #f43f5e, #be123c);
    box-shadow: 0 0 20px rgba(244, 63, 94, 0.42);
  }

  .adversary-class-mode-clash {
    position: absolute;
    left: 50%;
    top: 50%;
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border: 2px solid rgba(255, 255, 255, 0.82);
    border-radius: 999px;
    color: #fff;
    background: radial-gradient(circle, rgb(var(--class-rgb, 250, 204, 21)), #0f172a 72%);
    box-shadow: 0 0 18px rgba(var(--class-rgb, 250, 204, 21), 0.48), 0 0 0 5px rgba(2, 6, 23, 0.78);
    font-size: 9px;
    font-weight: 1000;
    letter-spacing: 0.05em;
    transform: translate(-50%, -50%);
  }

  .adversary-class-summary-card {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(var(--class-rgb, 250, 204, 21), 0.18);
    border-radius: 14px;
    padding: 10px 11px;
    background:
      linear-gradient(135deg, rgba(var(--class-rgb, 250, 204, 21), 0.075), transparent 56%),
      rgba(15, 23, 42, 0.62);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
  }

  .adversary-class-summary-card::after {
    content: '';
    position: absolute;
    inset-x: 16px;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(var(--class-rgb, 250, 204, 21), 0.5), transparent);
  }

  .adversary-class-player-cards {
    display: grid;
    max-height: 430px;
    gap: 12px;
    overflow: auto;
    padding: 2px 4px 6px 2px;
  }

  .adversary-class-player-stat-card {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 20px;
    padding: 15px;
    background:
      radial-gradient(circle at 0% 0%, rgba(var(--class-rgb, 250, 204, 21), 0.085), transparent 34%),
      linear-gradient(145deg, rgba(15, 23, 42, 0.82), rgba(4, 10, 22, 0.86));
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.025);
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .adversary-class-player-stat-card:hover {
    border-color: rgba(var(--class-rgb, 250, 204, 21), 0.36);
    box-shadow: 0 16px 38px rgba(0, 0, 0, 0.30), 0 0 24px rgba(var(--class-rgb, 250, 204, 21), 0.075);
    transform: translateY(-1px);
  }

  .adversary-class-player-stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.10);
  }

  .adversary-class-player-rank {
    display: grid;
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid rgba(var(--class-rgb, 250, 204, 21), 0.28);
    border-radius: 11px;
    color: rgb(var(--class-rgb, 250, 204, 21));
    background: rgba(var(--class-rgb, 250, 204, 21), 0.08);
    font-size: 10px;
    font-weight: 1000;
  }

  .adversary-class-player-war-pill,
  .adversary-class-mode-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 3px 8px;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .adversary-class-player-war-pill {
    border: 1px solid rgba(148, 163, 184, 0.18);
    color: #94a3b8;
    background: rgba(15, 23, 42, 0.72);
  }

  .adversary-class-mode-pill.is-succession {
    border: 1px solid rgba(34, 211, 238, 0.24);
    color: #a5f3fc;
    background: rgba(6, 182, 212, 0.10);
  }

  .adversary-class-mode-pill.is-awakening {
    border: 1px solid rgba(244, 63, 94, 0.24);
    color: #fecdd3;
    background: rgba(244, 63, 94, 0.10);
  }

  .adversary-class-player-kd {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    align-items: end;
  }

  .adversary-class-player-kd span {
    color: #64748b;
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .adversary-class-player-kd strong {
    color: rgb(var(--class-rgb, 250, 204, 21));
    font-size: 24px;
    font-weight: 1000;
    line-height: 1.05;
    text-shadow: 0 0 16px rgba(var(--class-rgb, 250, 204, 21), 0.22);
  }

  .adversary-class-overall-performance {
    margin-top: 12px;
    border: 1px solid rgba(var(--class-rgb, 250, 204, 21), 0.18);
    border-radius: 18px;
    padding: 14px;
    background:
      radial-gradient(circle at 8% 0%, rgba(var(--class-rgb, 250, 204, 21), 0.08), transparent 36%),
      rgba(2, 6, 23, 0.42);
  }

  .adversary-class-performance-grid,
  .adversary-class-player-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 9px;
  }

  .adversary-class-performance-grid {
    margin-top: 11px;
  }

  .adversary-class-player-metrics {
    margin-top: 12px;
  }

  .adversary-class-performance-card,
  .adversary-class-player-metric {
    --metric-rgb: 148, 163, 184;
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(var(--metric-rgb), 0.22);
    border-radius: 13px;
    padding: 9px;
    background:
      radial-gradient(circle at 12% 0%, rgba(var(--metric-rgb), 0.13), transparent 52%),
      linear-gradient(145deg, rgba(var(--metric-rgb), 0.055), rgba(2, 6, 23, 0.52));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.025),
      0 8px 20px rgba(0, 0, 0, 0.14);
  }

  .adversary-class-performance-label,
  .adversary-class-player-metric-label {
    display: block;
    overflow: hidden;
    color: rgb(var(--metric-rgb));
    font-size: 10px;
    font-weight: 1000;
    text-overflow: ellipsis;
    text-transform: uppercase;
    letter-spacing: 0.10em;
    white-space: nowrap;
  }

  .adversary-class-metric-values {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 8px;
    overflow: hidden;
    border: 1px solid rgba(var(--metric-rgb), 0.13);
    border-radius: 10px;
    background: rgba(2, 6, 23, 0.44);
  }

  .adversary-class-metric-value {
    display: flex;
    min-width: 0;
    min-height: 50px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 6px 4px;
    text-align: center;
  }

  .adversary-class-metric-value + .adversary-class-metric-value {
    border-left: 1px solid rgba(var(--metric-rgb), 0.13);
  }

  .adversary-class-metric-value span {
    color: #7c8aa0;
    font-size: 8px;
    font-weight: 1000;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .adversary-class-metric-value strong {
    max-width: 100%;
    overflow: hidden;
    color: #f8fafc;
    font-size: 17px;
    font-weight: 1000;
    line-height: 1.05;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 0 14px rgba(var(--metric-rgb), 0.18);
  }

  @media (max-width: 1100px) {
    .adversary-class-performance-grid,
    .adversary-class-player-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .adversary-class-modal-backdrop {
      padding: 10px;
    }

    .adversary-class-modal {
      width: 96vw;
      max-height: 90vh;
      padding: 16px;
    }

    .adversary-class-performance-grid,
    .adversary-class-player-metrics {
      grid-template-columns: 1fr;
    }
  }

  .adversary-class-overall-pie {
    position: relative;
    display: grid;
    width: 230px;
    height: 230px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 999px;
    box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.38), 0 0 32px rgba(250, 204, 21, 0.10);
  }

  .adversary-class-overall-pie::before {
    content: '';
    position: absolute;
    inset: 31px;
    border-radius: inherit;
    background: rgba(2, 6, 23, 0.97);
    box-shadow: inset 0 0 20px rgba(15, 23, 42, 0.78);
  }

  @keyframes adversary-sidebar-orb-breathe {
    0%,
    100% {
      transform: scale(0.965);
      filter:
        saturate(1.08)
        contrast(1.04)
        drop-shadow(0 0 9px rgba(var(--orb-glow-rgb, 239, 68, 68), 0.30))
        drop-shadow(0 8px 16px rgba(0, 0, 0, 0.32));
    }

    50% {
      transform: scale(1.035);
      filter:
        saturate(1.16)
        contrast(1.06)
        drop-shadow(0 0 14px rgba(var(--orb-glow-rgb, 239, 68, 68), 0.42))
        drop-shadow(0 10px 18px rgba(0, 0, 0, 0.34));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .adversary-sidebar-class-orb,
    .adversary-sidebar-class-orb-shell {
      animation: none !important;
      transition: none !important;
    }
  }

  /* Compact cards that present a statistic now use the exact quiet cyan glass
     recipe from Monthly Recap -> Players Performance. Metric text and icons
     retain their semantic colours; only the card surface is unified. */
  .adversary-content .adversary-stat-panel,
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-stat-panel {
    --adversary-panel-accent-rgb: 6, 182, 212 !important;
    --player-stats-summary-rgb: 6, 182, 212 !important;
    --player-stats-panel-rgb: 6, 182, 212 !important;
    --nodewars-accent-rgb: 6, 182, 212 !important;
    --monthly-panel-accent-rgb: 6, 182, 212 !important;
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.46) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(6, 182, 212, 0.10) 0%,
        rgba(6, 182, 212, 0.05) 42%,
        rgba(6, 182, 212, 0.018) 74%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(6, 182, 212, 0.035) 0%,
        rgba(7, 13, 29, 0.38) 54%,
        rgba(2, 6, 23, 0.50) 100%
      ) !important;
    box-shadow:
      inset 0 0 36px rgba(6, 182, 212, 0.04),
      0 10px 24px rgba(0, 0, 0, 0.18) !important;
    -webkit-backdrop-filter: blur(8px) saturate(122%) !important;
    backdrop-filter: blur(8px) saturate(122%) !important;
  }

  .adversary-content .adversary-stat-panel:hover,
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-stat-panel:hover {
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.44) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(6, 182, 212, 0.15) 0%,
        rgba(6, 182, 212, 0.075) 44%,
        rgba(6, 182, 212, 0.028) 76%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(6, 182, 212, 0.05) 0%,
        rgba(7, 13, 29, 0.36) 54%,
        rgba(2, 6, 23, 0.48) 100%
      ) !important;
    box-shadow:
      inset 0 0 40px rgba(6, 182, 212, 0.065),
      0 0 16px rgba(6, 182, 212, 0.16),
      0 12px 28px rgba(0, 0, 0, 0.20) !important;
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


const SIDEBAR_ORB_HOVER_SOUND = sidebarOrbHoverSound;


const PAGE_TITLES = {
  guild: 'Guild',
  monthly: 'Monthly Recap',
  nodewars: 'Node Wars',
  overview: 'Overview',
  players: 'Player Stats',
  hall: 'Hall of Fame',
  raw: 'Raw Logs',
};

const SIDEBAR_STANDARD_CLASS_ORB_SIZE = 68;

const SIDEBAR_CLASS_ORBS = Object.freeze([
  {
    id: 'archer',
    name: 'Archer',
    src: classOrbArcher,
    className: 'is-red',
    glow: '239, 68, 68',
    startX: 0.88,
    startY: 0.18,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.68,
    duration: '7.6s',
    delay: '-2.1s',
    velocityX: -0.38,
    velocityY: 0.20,
    gravity: 0.0020,
    drift: 0.011,
    driftSpeed: 0.00072,
    maxSpeed: 2.05,
    pointerRadius: 215,
    pointerForce: 0.58,
    pointerCarry: 0.050,
    phase: 0.7,
  },
  {
    id: 'berserker',
    name: 'Berserker',
    src: classOrbBerserker,
    className: 'is-violet-orange',
    glow: '217, 70, 239',
    startX: 0.10,
    startY: 0.52,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.72,
    duration: '9.2s',
    delay: '-4.8s',
    velocityX: 0.34,
    velocityY: -0.24,
    gravity: 0.0015,
    drift: 0.013,
    driftSpeed: 0.00058,
    maxSpeed: 2.00,
    pointerRadius: 225,
    pointerForce: 0.62,
    pointerCarry: 0.055,
    phase: 3.2,
  },
  {
    id: 'corsair',
    name: 'Corsair',
    src: classOrbCorsair,
    className: 'is-red-silver',
    glow: '239, 68, 68',
    startX: 0.53,
    startY: 0.78,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.74,
    duration: '8.4s',
    delay: '-3.4s',
    velocityX: 0.40,
    velocityY: -0.18,
    gravity: 0.0018,
    drift: 0.012,
    driftSpeed: 0.00064,
    maxSpeed: 2.15,
    pointerRadius: 232,
    pointerForce: 0.66,
    pointerCarry: 0.060,
    phase: 5.4,
  },
  {
    id: 'dark-knight',
    name: 'Dark Knight',
    src: classOrbDarkKnight,
    className: 'is-extra',
    glow: '34, 211, 238',
    startX: 0.06,
    startY: 0.08,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.58,
    duration: '7.00s',
    delay: '-1.10s',
    velocityX: 0.29,
    velocityY: 0.18,
    gravity: 0.0007,
    drift: 0.0075,
    driftSpeed: 0.000460,
    maxSpeed: 1.65,
    pointerRadius: 145,
    pointerForce: 0.470,
    pointerCarry: 0.038,
    phase: 0.9,
  },
  {
    id: 'deadeye',
    name: 'Deadeye',
    src: classOrbDeadeye,
    className: 'is-extra',
    glow: '163, 230, 53',
    startX: 0.72,
    startY: 0.12,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.56,
    duration: '7.55s',
    delay: '-1.73s',
    velocityX: -0.24,
    velocityY: 0.25,
    gravity: 0.0010,
    drift: 0.0086,
    driftSpeed: 0.000515,
    maxSpeed: 1.76,
    pointerRadius: 154,
    pointerForce: 0.505,
    pointerCarry: 0.042,
    phase: 2.27,
  },
  {
    id: 'dosa',
    name: 'Dosa',
    src: classOrbDosa,
    className: 'is-extra',
    glow: '168, 85, 247',
    startX: 0.27,
    startY: 0.19,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.60,
    duration: '8.10s',
    delay: '-2.36s',
    velocityX: 0.31,
    velocityY: -0.20,
    gravity: 0.0014,
    drift: 0.0097,
    driftSpeed: 0.000570,
    maxSpeed: 1.87,
    pointerRadius: 163,
    pointerForce: 0.540,
    pointerCarry: 0.046,
    phase: 3.64,
  },
  {
    id: 'drakania',
    name: 'Drakania',
    src: classOrbDrakania,
    className: 'is-extra',
    glow: '56, 189, 248',
    startX: 0.56,
    startY: 0.24,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.62,
    duration: '8.65s',
    delay: '-2.99s',
    velocityX: -0.28,
    velocityY: -0.23,
    gravity: 0.0017,
    drift: 0.0108,
    driftSpeed: 0.000625,
    maxSpeed: 1.98,
    pointerRadius: 172,
    pointerForce: 0.575,
    pointerCarry: 0.050,
    phase: 5.01,
  },
  {
    id: 'guardian',
    name: 'Guardian',
    src: classOrbGuardian,
    className: 'is-extra',
    glow: '236, 72, 153',
    startX: 0.83,
    startY: 0.29,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.58,
    duration: '9.20s',
    delay: '-3.62s',
    velocityX: -0.34,
    velocityY: 0.16,
    gravity: 0.0007,
    drift: 0.0119,
    driftSpeed: 0.000680,
    maxSpeed: 1.65,
    pointerRadius: 181,
    pointerForce: 0.470,
    pointerCarry: 0.054,
    phase: 6.38,
  },
  {
    id: 'hashashin',
    name: 'Hashashin',
    src: classOrbHashashin,
    className: 'is-extra',
    glow: '125, 211, 252',
    startX: 0.13,
    startY: 0.34,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.56,
    duration: '9.75s',
    delay: '-4.25s',
    velocityX: 0.27,
    velocityY: 0.22,
    gravity: 0.0010,
    drift: 0.0075,
    driftSpeed: 0.000735,
    maxSpeed: 1.76,
    pointerRadius: 145,
    pointerForce: 0.505,
    pointerCarry: 0.038,
    phase: 7.75,
  },
  {
    id: 'kunoichi',
    name: 'Kunoichi',
    src: classOrbKunoichi,
    className: 'is-extra',
    glow: '245, 158, 11',
    startX: 0.41,
    startY: 0.39,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.55,
    duration: '10.30s',
    delay: '-4.88s',
    velocityX: -0.25,
    velocityY: -0.24,
    gravity: 0.0014,
    drift: 0.0086,
    driftSpeed: 0.000460,
    maxSpeed: 1.87,
    pointerRadius: 154,
    pointerForce: 0.540,
    pointerCarry: 0.042,
    phase: 9.12,
  },
  {
    id: 'lahn',
    name: 'Lahn',
    src: classOrbLahn,
    className: 'is-extra',
    glow: '244, 114, 182',
    startX: 0.68,
    startY: 0.43,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.60,
    duration: '7.00s',
    delay: '-5.51s',
    velocityX: 0.32,
    velocityY: 0.19,
    gravity: 0.0017,
    drift: 0.0097,
    driftSpeed: 0.000515,
    maxSpeed: 1.98,
    pointerRadius: 163,
    pointerForce: 0.575,
    pointerCarry: 0.046,
    phase: 10.49,
  },
  {
    id: 'maegu',
    name: 'Maegu',
    src: classOrbMaegu,
    className: 'is-extra',
    glow: '239, 68, 68',
    startX: 0.88,
    startY: 0.48,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.57,
    duration: '7.55s',
    delay: '-6.14s',
    velocityX: -0.31,
    velocityY: -0.20,
    gravity: 0.0007,
    drift: 0.0108,
    driftSpeed: 0.000570,
    maxSpeed: 1.65,
    pointerRadius: 172,
    pointerForce: 0.470,
    pointerCarry: 0.050,
    phase: 11.86,
  },
  {
    id: 'maehwa',
    name: 'Maehwa',
    src: classOrbMaehwa,
    className: 'is-extra',
    glow: '217, 70, 239',
    startX: 0.05,
    startY: 0.53,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.58,
    duration: '8.10s',
    delay: '-1.10s',
    velocityX: 0.26,
    velocityY: -0.25,
    gravity: 0.0010,
    drift: 0.0119,
    driftSpeed: 0.000625,
    maxSpeed: 1.76,
    pointerRadius: 181,
    pointerForce: 0.505,
    pointerCarry: 0.054,
    phase: 13.23,
  },
  {
    id: 'musa',
    name: 'Musa',
    src: classOrbMusa,
    className: 'is-extra',
    glow: '56, 189, 248',
    startX: 0.31,
    startY: 0.57,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.59,
    duration: '8.65s',
    delay: '-1.73s',
    velocityX: -0.30,
    velocityY: 0.19,
    gravity: 0.0014,
    drift: 0.0075,
    driftSpeed: 0.000680,
    maxSpeed: 1.87,
    pointerRadius: 145,
    pointerForce: 0.540,
    pointerCarry: 0.038,
    phase: 14.6,
  },
  {
    id: 'mystic',
    name: 'Mystic',
    src: classOrbMystic,
    className: 'is-extra',
    glow: '249, 115, 22',
    startX: 0.58,
    startY: 0.61,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.62,
    duration: '9.20s',
    delay: '-2.36s',
    velocityX: 0.31,
    velocityY: 0.23,
    gravity: 0.0017,
    drift: 0.0086,
    driftSpeed: 0.000735,
    maxSpeed: 1.98,
    pointerRadius: 154,
    pointerForce: 0.575,
    pointerCarry: 0.042,
    phase: 15.97,
  },
  {
    id: 'ninja',
    name: 'Ninja',
    src: classOrbNinja,
    className: 'is-extra',
    glow: '147, 197, 253',
    startX: 0.82,
    startY: 0.65,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.54,
    duration: '9.75s',
    delay: '-2.99s',
    velocityX: -0.28,
    velocityY: -0.22,
    gravity: 0.0007,
    drift: 0.0097,
    driftSpeed: 0.000460,
    maxSpeed: 1.65,
    pointerRadius: 163,
    pointerForce: 0.470,
    pointerCarry: 0.046,
    phase: 17.34,
  },
  {
    id: 'nova',
    name: 'Nova',
    src: classOrbNova,
    className: 'is-extra',
    glow: '34, 197, 94',
    startX: 0.12,
    startY: 0.70,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.60,
    duration: '10.30s',
    delay: '-3.62s',
    velocityX: 0.33,
    velocityY: -0.17,
    gravity: 0.0010,
    drift: 0.0108,
    driftSpeed: 0.000515,
    maxSpeed: 1.76,
    pointerRadius: 172,
    pointerForce: 0.505,
    pointerCarry: 0.050,
    phase: 18.71,
  },
  {
    id: 'ranger',
    name: 'Ranger',
    src: classOrbRanger,
    className: 'is-extra',
    glow: '125, 211, 252',
    startX: 0.39,
    startY: 0.74,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.57,
    duration: '7.00s',
    delay: '-4.25s',
    velocityX: -0.26,
    velocityY: 0.24,
    gravity: 0.0014,
    drift: 0.0119,
    driftSpeed: 0.000570,
    maxSpeed: 1.87,
    pointerRadius: 181,
    pointerForce: 0.540,
    pointerCarry: 0.054,
    phase: 20.08,
  },
  {
    id: 'sage',
    name: 'Sage',
    src: classOrbSage,
    className: 'is-extra',
    glow: '239, 68, 68',
    startX: 0.67,
    startY: 0.78,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.59,
    duration: '7.55s',
    delay: '-4.88s',
    velocityX: 0.27,
    velocityY: -0.26,
    gravity: 0.0017,
    drift: 0.0075,
    driftSpeed: 0.000625,
    maxSpeed: 1.98,
    pointerRadius: 145,
    pointerForce: 0.575,
    pointerCarry: 0.038,
    phase: 21.45,
  },
  {
    id: 'scholar',
    name: 'Scholar',
    src: classOrbScholar,
    className: 'is-extra',
    glow: '234, 179, 8',
    startX: 0.87,
    startY: 0.82,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.61,
    duration: '8.10s',
    delay: '-5.51s',
    velocityX: -0.34,
    velocityY: 0.19,
    gravity: 0.0007,
    drift: 0.0086,
    driftSpeed: 0.000680,
    maxSpeed: 1.65,
    pointerRadius: 154,
    pointerForce: 0.470,
    pointerCarry: 0.042,
    phase: 22.82,
  },
  {
    id: 'seraph',
    name: 'Seraph',
    src: classOrbSeraph,
    className: 'is-extra',
    glow: '245, 158, 11',
    startX: 0.07,
    startY: 0.87,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.56,
    duration: '8.65s',
    delay: '-6.14s',
    velocityX: 0.29,
    velocityY: -0.22,
    gravity: 0.0010,
    drift: 0.0097,
    driftSpeed: 0.000735,
    maxSpeed: 1.76,
    pointerRadius: 163,
    pointerForce: 0.505,
    pointerCarry: 0.046,
    phase: 24.19,
  },
  {
    id: 'shai',
    name: 'Shai',
    src: classOrbShai,
    className: 'is-extra',
    glow: '239, 68, 68',
    startX: 0.34,
    startY: 0.91,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.60,
    duration: '9.20s',
    delay: '-1.10s',
    velocityX: -0.27,
    velocityY: -0.24,
    gravity: 0.0014,
    drift: 0.0108,
    driftSpeed: 0.000460,
    maxSpeed: 1.87,
    pointerRadius: 172,
    pointerForce: 0.540,
    pointerCarry: 0.050,
    phase: 25.56,
  },
  {
    id: 'sorceress',
    name: 'Sorceress',
    src: classOrbSorceress,
    className: 'is-extra',
    glow: '249, 115, 22',
    startX: 0.69,
    startY: 0.94,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.58,
    duration: '9.75s',
    delay: '-1.73s',
    velocityX: 0.32,
    velocityY: -0.19,
    gravity: 0.0017,
    drift: 0.0119,
    driftSpeed: 0.000515,
    maxSpeed: 1.98,
    pointerRadius: 181,
    pointerForce: 0.575,
    pointerCarry: 0.054,
    phase: 26.93,
  },
  {
    id: 'striker',
    name: 'Striker',
    src: classOrbStriker,
    className: 'is-extra',
    glow: '34, 197, 94',
    startX: 0.14,
    startY: 0.13,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.64,
    duration: '7.80s',
    delay: '-2.05s',
    velocityX: 0.30,
    velocityY: 0.18,
    gravity: 0.0012,
    drift: 0.0088,
    driftSpeed: 0.000560,
    maxSpeed: 1.82,
    pointerRadius: 166,
    pointerForce: 0.520,
    pointerCarry: 0.044,
    phase: 28.30,
  },
  {
    id: 'tamer',
    name: 'Tamer',
    src: classOrbTamer,
    className: 'is-extra',
    glow: '168, 85, 247',
    startX: 0.46,
    startY: 0.14,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.65,
    duration: '8.35s',
    delay: '-2.68s',
    velocityX: -0.28,
    velocityY: 0.21,
    gravity: 0.0014,
    drift: 0.0098,
    driftSpeed: 0.000610,
    maxSpeed: 1.90,
    pointerRadius: 174,
    pointerForce: 0.545,
    pointerCarry: 0.047,
    phase: 29.67,
  },
  {
    id: 'valkyrie',
    name: 'Valkyrie',
    src: classOrbValkyrie,
    className: 'is-extra',
    glow: '191, 219, 254',
    startX: 0.77,
    startY: 0.14,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.62,
    duration: '8.90s',
    delay: '-3.31s',
    velocityX: 0.26,
    velocityY: 0.22,
    gravity: 0.0010,
    drift: 0.0105,
    driftSpeed: 0.000520,
    maxSpeed: 1.74,
    pointerRadius: 182,
    pointerForce: 0.495,
    pointerCarry: 0.050,
    phase: 31.04,
  },
  {
    id: 'warrior',
    name: 'Warrior',
    src: classOrbWarrior,
    className: 'is-extra',
    glow: '196, 84, 255',
    startX: 0.25,
    startY: 0.32,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.66,
    duration: '7.25s',
    delay: '-3.94s',
    velocityX: -0.32,
    velocityY: -0.18,
    gravity: 0.0016,
    drift: 0.0112,
    driftSpeed: 0.000590,
    maxSpeed: 1.95,
    pointerRadius: 190,
    pointerForce: 0.570,
    pointerCarry: 0.053,
    phase: 32.41,
  },
  {
    id: 'witch',
    name: 'Witch',
    src: classOrbWitch,
    className: 'is-extra',
    glow: '239, 68, 68',
    startX: 0.58,
    startY: 0.30,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.64,
    duration: '8.00s',
    delay: '-4.57s',
    velocityX: 0.33,
    velocityY: -0.23,
    gravity: 0.0013,
    drift: 0.0082,
    driftSpeed: 0.000670,
    maxSpeed: 1.86,
    pointerRadius: 162,
    pointerForce: 0.525,
    pointerCarry: 0.042,
    phase: 33.78,
  },
  {
    id: 'wizard',
    name: 'Wizard',
    src: classOrbWizard,
    className: 'is-extra',
    glow: '226, 232, 240',
    startX: 0.86,
    startY: 0.34,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.61,
    duration: '8.55s',
    delay: '-5.20s',
    velocityX: -0.25,
    velocityY: -0.20,
    gravity: 0.0011,
    drift: 0.0094,
    driftSpeed: 0.000540,
    maxSpeed: 1.72,
    pointerRadius: 170,
    pointerForce: 0.500,
    pointerCarry: 0.045,
    phase: 35.15,
  },
  {
    id: 'woosa',
    name: 'Woosa',
    src: classOrbWoosa,
    className: 'is-extra',
    glow: '45, 212, 191',
    startX: 0.18,
    startY: 0.88,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.63,
    duration: '9.10s',
    delay: '-5.83s',
    velocityX: 0.27,
    velocityY: -0.25,
    gravity: 0.0015,
    drift: 0.0101,
    driftSpeed: 0.000620,
    maxSpeed: 1.91,
    pointerRadius: 178,
    pointerForce: 0.555,
    pointerCarry: 0.048,
    phase: 36.52,
  },
  {
    id: 'wukong',
    name: 'Wukong',
    src: classOrbWukong,
    className: 'is-extra',
    glow: '251, 146, 60',
    startX: 0.81,
    startY: 0.90,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.65,
    duration: '9.65s',
    delay: '-6.46s',
    velocityX: -0.31,
    velocityY: -0.18,
    gravity: 0.0017,
    drift: 0.0116,
    driftSpeed: 0.000575,
    maxSpeed: 1.98,
    pointerRadius: 186,
    pointerForce: 0.585,
    pointerCarry: 0.052,
    phase: 37.89,
  },
]);

const ORB_EDGE_PADDING = 7;
const ORB_BOUNCE = 0.94;
const ORB_AIR_DRAG = 0.9992;

function clampOrb(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

const CLASS_NAME_LOOKUP = Object.freeze(
  SIDEBAR_CLASS_ORBS.reduce((lookup, orb) => {
    const keys = [orb.id, orb.name]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, ''));

    keys.forEach((key) => {
      lookup[key] = orb.name;
    });

    return lookup;
  }, {
    berzerker: 'Berserker',
    wizzard: 'Wizard',
  }),
);

function normalizeClassName(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return CLASS_NAME_LOOKUP[key] || '';
}

function memberDisplayName(member, index) {
  if (typeof member === 'string') return member.trim();

  return String(
    member?.name ||
      member?.player ||
      member?.playerName ||
      member?.character ||
      member?.family ||
      `Player ${index + 1}`,
  ).trim();
}

function memberClassEntries(member) {
  if (!member || typeof member === 'string') return [];

  const directValues = [
    member.class,
    member.className,
    member.mainClass,
    member.characterClass,
  ];
  const listValues = [
    ...(Array.isArray(member.classes) ? member.classes : []),
    ...(Array.isArray(member.classHistory) ? member.classHistory : []),
    ...(Array.isArray(member.classUsage) ? member.classUsage : []),
  ];

  return [...directValues, ...listValues]
    .map((entry) => {
      if (typeof entry === 'string') {
        return { className: normalizeClassName(entry), count: 1 };
      }

      const className = normalizeClassName(
        entry?.class || entry?.className || entry?.name,
      );
      const count = Math.max(
        1,
        Number(entry?.wars || entry?.count || entry?.appearances || 1) || 1,
      );

      return { className, count };
    })
    .filter((entry) => entry.className);
}


const CLASS_STATS_WINDOW_DAYS = 30;
const CLASS_STATS_METRICS = Object.freeze([
  { key: 'kills', label: 'Kills', rgb: '59, 130, 246' },
  { key: 'deaths', label: 'Deaths', rgb: '239, 68, 68' },
  { key: 'killFeed', label: 'Kill Feed', rgb: '249, 115, 22' },
  { key: 'damageDealt', label: 'Damage Dealt', rgb: '6, 182, 212' },
  { key: 'damageTaken', label: 'Damage Taken', rgb: '236, 72, 153' },
  { key: 'ccHits', label: 'CC Hits', rgb: '139, 92, 246' },
  { key: 'fortDamage', label: 'Fort Damage', rgb: '245, 158, 11' },
]);

const CLASS_STATS_DISPLAY_METRICS = Object.freeze([
  { key: 'kd', label: 'K/D', rgb: '34, 197, 94' },
  ...CLASS_STATS_METRICS,
]);

function normalizeRosterPlayerKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function formatClassStatNumber(value, maximumFractionDigits = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '—';

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(number);
}

function classRowsForLog(log) {
  const directRows = [
    log?.classRows,
    log?.classes,
    log?.summary?.classRows,
    log?.summary?.classes,
  ]
    .filter(Array.isArray)
    .flat()
    .map((row) => ({
      player: row?.player || row?.name || row?.playerName || '',
      className: normalizeClassName(
        row?.className || row?.class || row?.characterClass,
      ),
      mode:
        String(row?.mode || '').toLowerCase().startsWith('awak')
          ? 'Awakening'
          : 'Succession',
    }))
    .filter((row) => row.player && row.className);

  const rawSources = [
    log?.raw,
    log?.classRaw,
    log?.classLog,
    log?.class_log,
    log?.summary?.classRaw,
    log?.summary?.classLog,
  ].filter((value) => typeof value === 'string' && value.trim());

  const parsedRows = rawSources.flatMap((source) => parseClassRows(source));
  const seen = new Set();

  return [...directRows, ...parsedRows].filter((row) => {
    const key = [
      normalizeRosterPlayerKey(row.player),
      normalizeClassName(row.className || row.class),
      row.mode === 'Awakening' ? 'Awakening' : 'Succession',
    ].join('@@');

    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function classStatsDateValue(log) {
  const value = String(dateOf(log) || '').trim();
  const parsed = new Date(`${value}T00:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildOverallClassGradient(slices) {
  const visible = slices.filter((slice) => slice.count > 0);

  if (!visible.length) return 'conic-gradient(rgba(51, 65, 85, 0.72) 0 100%)';

  let cursor = 0;
  const stops = visible.map((slice) => {
    const start = cursor;
    const slicePercentage = Number(slice.piePercentage ?? slice.percentage) || 0;
    cursor += slicePercentage;
    return `${slice.color} ${start.toFixed(4)}% ${Math.min(100, cursor).toFixed(4)}%`;
  });

  if (cursor < 100) {
    stops.push(`rgba(51, 65, 85, 0.72) ${cursor.toFixed(4)}% 100%`);
  }

  return `conic-gradient(${stops.join(', ')})`;
}

function SidebarClassOrbs({ members = [], logs = [], loadLogs }) {
  const layerRef = useRef(null);
  const orbRefs = useRef([]);
  const physicsRef = useRef([]);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    active: false,
  });
  const orbAudioRefs = useRef([]);
  const orbHoverStateRef = useRef([]);
  const orbLastSoundAtRef = useRef([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classModalView, setClassModalView] = useState('class');

  const [loadingClassLogs, setLoadingClassLogs] = useState(false);

  const classAnalytics = useMemo(() => {
    const rosterMap = new Map();
    const rosterPlayers = [];

    GUILD_ROSTER.forEach((member, index) => {
      const name = memberDisplayName(member, index);
      const key = normalizeRosterPlayerKey(name);

      if (!key || rosterMap.has(key)) return;

      const rosterPlayer = { key, name };
      rosterMap.set(key, rosterPlayer);
      rosterPlayers.push(rosterPlayer);
    });

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate.setDate(startDate.getDate() - (CLASS_STATS_WINDOW_DAYS - 1));
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const availableLogs = (Array.isArray(logs) ? logs : []).filter(Boolean);
    const recentLogs = availableLogs.filter((log) => {
      const logDate = classStatsDateValue(log);
      return logDate && logDate >= startDate && logDate < endDate;
    });

    const classRecords = new Map();
    const usageByRosterPlayer = new Map();

    const ensureClassRecord = (className) => {
      if (!classRecords.has(className)) {
        classRecords.set(className, {
          className,
          playerKeys: new Set(),
          players: new Map(),
          appearances: 0,
          succession: 0,
          awakening: 0,
        });
      }

      return classRecords.get(className);
    };

    availableLogs.forEach((log, logIndex) => {
      const logDate = classStatsDateValue(log);
      const logDateValue = logDate?.getTime?.() || 0;
      const isRecent = Boolean(logDate && logDate >= startDate && logDate < endDate);
      const logId = String(log.id ?? log.apiId ?? logIndex);
      const perWarStats = calculateStats([
        {
          ...log,
          date: dateOf(log),
        },
      ]);
      const statsByPlayer = new Map(
        (Array.isArray(perWarStats.players) ? perWarStats.players : []).map((player) => [
          normalizeRosterPlayerKey(player?.name),
          player,
        ]),
      );
      const seenAssignments = new Set();

      classRowsForLog(log).forEach((row) => {
        const playerKey = normalizeRosterPlayerKey(row.player);
        const rosterPlayer = rosterMap.get(playerKey);
        const className = normalizeClassName(row.className || row.class);
        const mode = row.mode === 'Awakening' ? 'Awakening' : 'Succession';

        if (!rosterPlayer || !className) return;

        const assignmentKey = `${logId}@@${playerKey}@@${className}`;
        if (seenAssignments.has(assignmentKey)) return;
        seenAssignments.add(assignmentKey);

        const classRecord = ensureClassRecord(className);
        classRecord.playerKeys.add(playerKey);
        classRecord.appearances += 1;
        classRecord[mode === 'Awakening' ? 'awakening' : 'succession'] += 1;

        if (!classRecord.players.has(playerKey)) {
          classRecord.players.set(playerKey, {
            key: playerKey,
            name: rosterPlayer.name,
            wars: 0,
            succession: 0,
            awakening: 0,
            statsWars: 0,
            kdSum: 0,
            kdWarCount: 0,
            bestKd: null,
            totals: Object.fromEntries(CLASS_STATS_METRICS.map(({ key }) => [key, 0])),
            best: Object.fromEntries(CLASS_STATS_METRICS.map(({ key }) => [key, null])),
            metricWarCounts: Object.fromEntries(
              CLASS_STATS_METRICS.map(({ key }) => [key, 0]),
            ),
          });
        }

        const playerRecord = classRecord.players.get(playerKey);
        playerRecord.wars += 1;
        playerRecord[mode === 'Awakening' ? 'awakening' : 'succession'] += 1;

        const playerStats = statsByPlayer.get(playerKey);

        if (playerStats) {
          playerRecord.statsWars += 1;

          CLASS_STATS_METRICS.forEach(({ key }) => {
            if (playerStats[key] == null || playerStats[key] === '') return;

            const value = Number(playerStats[key]);
            if (!Number.isFinite(value)) return;

            playerRecord.totals[key] += value;
            playerRecord.metricWarCounts[key] += 1;
            playerRecord.best[key] =
              playerRecord.best[key] == null
                ? value
                : Math.max(playerRecord.best[key], value);
          });

          const warKills = Number(playerStats.kills);
          const warDeaths = Number(playerStats.deaths);

          if (Number.isFinite(warKills) && Number.isFinite(warDeaths)) {
            const warKd = warDeaths > 0 ? warKills / warDeaths : warKills;
            playerRecord.kdSum += warKd;
            playerRecord.kdWarCount += 1;
            playerRecord.bestKd =
              playerRecord.bestKd == null
                ? warKd
                : Math.max(playerRecord.bestKd, warKd);
          }
        }

        if (isRecent) {
          if (!usageByRosterPlayer.has(playerKey)) {
            usageByRosterPlayer.set(playerKey, new Map());
          }

          const playerUsage = usageByRosterPlayer.get(playerKey);
          const previousUsage = playerUsage.get(className) || {
            className,
            wars: 0,
            latest: 0,
          };
          previousUsage.wars += 1;
          previousUsage.latest = Math.max(previousUsage.latest, logDateValue);
          playerUsage.set(className, previousUsage);
        }
      });
    });

    const classBreakdown = SIDEBAR_CLASS_ORBS.map((orb) => {
      const record = classRecords.get(orb.name);
      const players = record
        ? [...record.players.values()]
            .map((player) => ({
              ...player,
              kd:
                player.totals.deaths > 0
                  ? player.totals.kills / player.totals.deaths
                  : player.totals.kills,
              averageKd:
                player.kdWarCount > 0 ? player.kdSum / player.kdWarCount : null,
              bestKd: player.bestKd,
              averages: Object.fromEntries(
                CLASS_STATS_METRICS.map(({ key }) => [
                  key,
                  player.metricWarCounts[key] > 0
                    ? player.totals[key] / player.metricWarCounts[key]
                    : null,
                ]),
              ),
            }))
            .sort(
              (first, second) =>
                second.wars - first.wars ||
                second.totals.kills - first.totals.kills ||
                first.name.localeCompare(second.name),
            )
        : [];

      const totals = Object.fromEntries(
        CLASS_STATS_METRICS.map(({ key }) => [
          key,
          players.reduce((sum, player) => sum + (Number(player.totals[key]) || 0), 0),
        ]),
      );
      const metricWarCounts = Object.fromEntries(
        CLASS_STATS_METRICS.map(({ key }) => [
          key,
          players.reduce(
            (sum, player) => sum + (Number(player.metricWarCounts[key]) || 0),
            0,
          ),
        ]),
      );
      const best = Object.fromEntries(
        CLASS_STATS_METRICS.map(({ key }) => {
          const values = players
            .map((player) => player.best[key])
            .filter((value) => Number.isFinite(Number(value)))
            .map(Number);

          return [key, values.length > 0 ? Math.max(...values) : null];
        }),
      );
      const totalKdWarCount = players.reduce(
        (sum, player) => sum + (Number(player.kdWarCount) || 0),
        0,
      );
      const totalKdSum = players.reduce(
        (sum, player) => sum + (Number(player.kdSum) || 0),
        0,
      );
      const kd =
        totals.deaths > 0 ? totals.kills / totals.deaths : totals.kills;
      const averageKd =
        totalKdWarCount > 0 ? totalKdSum / totalKdWarCount : null;
      const bestKdValues = players
        .map((player) => player.bestKd)
        .filter((value) => Number.isFinite(Number(value)))
        .map(Number);
      const bestKd =
        bestKdValues.length > 0 ? Math.max(...bestKdValues) : null;

      return {
        ...orb,
        players,
        playerCount: players.length,
        share: rosterPlayers.length > 0 ? (players.length / rosterPlayers.length) * 100 : 0,
        appearances: record?.appearances || 0,
        succession: record?.succession || 0,
        awakening: record?.awakening || 0,
        totals,
        averages: Object.fromEntries(
          CLASS_STATS_METRICS.map(({ key }) => [
            key,
            metricWarCounts[key] > 0 ? totals[key] / metricWarCounts[key] : null,
          ]),
        ),
        best,
        kd,
        averageKd,
        bestKd,
        metricWarCounts,
      };
    });

    const overallClassPlayerCounts = new Map();
    let playersWithRecentClassData = 0;

    rosterPlayers.forEach((rosterPlayer) => {
      const usages = [...(usageByRosterPlayer.get(rosterPlayer.key)?.values() || [])];

      if (!usages.length) return;
      playersWithRecentClassData += 1;

      // A roster player contributes once to every different class they played
      // during the 30-day window, rather than only to their most-played class.
      usages.forEach((usage) => {
        overallClassPlayerCounts.set(
          usage.className,
          (overallClassPlayerCounts.get(usage.className) || 0) + 1,
        );
      });
    });

    const overallClassPlayerCount = [...overallClassPlayerCounts.values()].reduce(
      (sum, count) => sum + count,
      0,
    );

    const overallSlices = classBreakdown
      .map((classEntry) => {
        const count = overallClassPlayerCounts.get(classEntry.name) || 0;

        return {
          id: classEntry.id,
          name: classEntry.name,
          count,
          // Displayed percentage answers: what percentage of the full Guild Roster
          // played this class. Because players may use multiple classes, these shares
          // can overlap and do not need to add up to 100%.
          percentage:
            rosterPlayers.length > 0 ? (count / rosterPlayers.length) * 100 : 0,
          // The pie geometry uses unique player-class selections so its slices form
          // one valid 100% circle while still including every class a player used.
          piePercentage:
            overallClassPlayerCount > 0 ? (count / overallClassPlayerCount) * 100 : 0,
          color: `rgb(${classEntry.glow || '250, 204, 21'})`,
          orb: classEntry,
        };
      })
      .filter((slice) => slice.count > 0)
      .sort(
        (first, second) =>
          second.count - first.count || first.name.localeCompare(second.name),
      );

    return {
      rosterSize: rosterPlayers.length,
      recentWarCount: recentLogs.length,
      classLogCount: availableLogs.filter((log) => classRowsForLog(log).length > 0).length,
      startDate,
      endDate,
      byClass: Object.fromEntries(classBreakdown.map((entry) => [entry.name, entry])),
      overallSlices,
      overallGradient: buildOverallClassGradient(overallSlices),
      overallClassPlayerCount,
      playersWithRecentClassData,
    };
  }, [logs]);

  const classStats = useMemo(() => {
    if (!selectedClass) {
      return {
        players: [],
        playerCount: 0,
        share: 0,
        appearances: 0,
        succession: 0,
        awakening: 0,
        totals: {},
        averages: {},
        best: {},
        kd: null,
        averageKd: null,
        bestKd: null,
        metricWarCounts: {},
      };
    }

    return (
      classAnalytics.byClass[selectedClass.name] || {
        ...selectedClass,
        players: [],
        playerCount: 0,
        share: 0,
        appearances: 0,
        succession: 0,
        awakening: 0,
        totals: {},
        averages: {},
        best: {},
        kd: null,
        averageKd: null,
        bestKd: null,
        metricWarCounts: {},
      }
    );
  }, [classAnalytics, selectedClass]);

  const classModeTotal = classStats.succession + classStats.awakening;
  const successionModeShare =
    classModeTotal > 0 ? (classStats.succession / classModeTotal) * 100 : 50;
  const awakeningModeShare =
    classModeTotal > 0 ? (classStats.awakening / classModeTotal) * 100 : 50;

  const classPerformanceMetrics = useMemo(
    () =>
      CLASS_STATS_DISPLAY_METRICS.map((metric) => {
        if (metric.key === 'kd') {
          return {
            ...metric,
            hasValue: Number.isFinite(Number(classStats.kd)),
            overall: classStats.kd,
            average: classStats.averageKd,
            best: classStats.bestKd,
          };
        }

        return {
          ...metric,
          hasValue: Number(classStats.metricWarCounts?.[metric.key]) > 0,
          overall: classStats.totals?.[metric.key],
          average: classStats.averages?.[metric.key],
          best: classStats.best?.[metric.key],
        };
      }),
    [classStats],
  );

  const openClassDetails = useCallback(
    async (orb) => {
      setSelectedClass(orb);
      setClassModalView('class');

      if (typeof loadLogs !== 'function') return;

      try {
        setLoadingClassLogs(true);
        await loadLogs(true);
      } finally {
        setLoadingClassLogs(false);
      }
    },
    [loadLogs],
  );

  useEffect(() => {
    if (!selectedClass) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedClass(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedClass]);

  useEffect(() => {
    const layer = layerRef.current;
    const sidebar = layer?.parentElement;

    if (!layer || !sidebar) return undefined;

    const orbAudios = SIDEBAR_CLASS_ORBS.map(() => {
      const audio = new Audio(SIDEBAR_ORB_HOVER_SOUND);
      audio.preload = 'auto';
      audio.volume = 0.24;
      return audio;
    });

    orbAudioRefs.current = orbAudios;
    orbHoverStateRef.current = SIDEBAR_CLASS_ORBS.map(() => false);
    orbLastSoundAtRef.current = SIDEBAR_CLASS_ORBS.map(() => 0);

    const playOrbHoverSound = (index) => {
      const now = performance.now();
      const lastPlayed = orbLastSoundAtRef.current[index] || 0;

      if (now - lastPlayed < 320) return;

      const audio = orbAudioRefs.current[index];

      if (!audio) return;

      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.24;

      const playback = audio.play();

      if (playback?.catch) {
        playback.catch(() => {
          // Browsers may block hover audio until the first click/tap.
        });
      }

      orbLastSoundAtRef.current[index] = now;
    };

    const unlockOrbAudio = () => {
      orbAudioRefs.current.forEach((audio) => {
        if (!audio) return;

        const previousMuted = audio.muted;
        audio.muted = true;
        const playback = audio.play();

        const resetAudio = () => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = previousMuted;
        };

        if (playback?.then) {
          playback.then(resetAudio).catch(() => {
            audio.muted = previousMuted;
          });
        } else {
          resetAudio();
        }
      });
    };

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    let animationFrame = 0;
    let previousTime = performance.now();
    let layerWidth = 0;
    let layerHeight = 0;

    const measureLayer = () => {
      const bounds = layer.getBoundingClientRect();
      layerWidth = Math.max(1, bounds.width);
      layerHeight = Math.max(1, bounds.height);

      physicsRef.current = SIDEBAR_CLASS_ORBS.map((config, index) => {
        const previous = physicsRef.current[index];
        const maxX = Math.max(
          ORB_EDGE_PADDING,
          layerWidth - config.size - ORB_EDGE_PADDING,
        );
        const maxY = Math.max(
          ORB_EDGE_PADDING,
          layerHeight - config.size - ORB_EDGE_PADDING,
        );

        if (previous) {
          return {
            ...previous,
            x: clampOrb(previous.x, ORB_EDGE_PADDING, maxX),
            y: clampOrb(previous.y, ORB_EDGE_PADDING, maxY),
          };
        }

        return {
          x:
            ORB_EDGE_PADDING +
            (maxX - ORB_EDGE_PADDING) * config.startX,
          y:
            ORB_EDGE_PADDING +
            (maxY - ORB_EDGE_PADDING) * config.startY,
          vx: config.velocityX,
          vy: config.velocityY,
          rotation: index ? 8 : -6,
          rotationVelocity: index ? -0.035 : 0.042,
        };
      });
    };

    const writeOrbStyles = (pointerActive = false) => {
      physicsRef.current.forEach((state, index) => {
        const orb = orbRefs.current[index];
        const config = SIDEBAR_CLASS_ORBS[index];

        if (!orb || !state || !config) return;

        let proximity = 0;
        let distance = Number.POSITIVE_INFINITY;

        if (pointerActive) {
          const pointer = pointerRef.current;
          const centerX = state.x + config.size / 2;
          const centerY = state.y + config.size / 2;
          distance = Math.hypot(
            centerX - pointer.x,
            centerY - pointer.y,
          );
          proximity = Math.max(
            0,
            1 - distance / config.pointerRadius,
          );
        }

        const hoverRadius = config.size * 0.52;
        const hoverReleaseRadius = config.size * 0.72;
        const wasHovered = Boolean(orbHoverStateRef.current[index]);
        const isHovered = pointerActive && distance <= hoverRadius;

        if (isHovered && !wasHovered) {
          orbHoverStateRef.current[index] = true;
          playOrbHoverSound(index);
        } else if (!pointerActive || distance >= hoverReleaseRadius) {
          orbHoverStateRef.current[index] = false;
        }

        const eased = proximity * proximity;

        orb.style.setProperty('--orb-x', `${state.x.toFixed(2)}px`);
        orb.style.setProperty('--orb-y', `${state.y.toFixed(2)}px`);
        orb.style.setProperty(
          '--orb-rotation',
          `${state.rotation.toFixed(2)}deg`,
        );
        orb.style.setProperty(
          '--orb-react-scale',
          String((1 + eased * 0.18).toFixed(3)),
        );
        orb.style.setProperty(
          '--orb-opacity',
          String(
            Math.min(1, config.opacity + eased * 0.30).toFixed(3),
          ),
        );
      });
    };

    const resolveOrbCollision = () => {
      const states = physicsRef.current;

      for (let firstIndex = 0; firstIndex < states.length; firstIndex += 1) {
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < states.length;
          secondIndex += 1
        ) {
          const first = states[firstIndex];
          const second = states[secondIndex];
          const firstConfig = SIDEBAR_CLASS_ORBS[firstIndex];
          const secondConfig = SIDEBAR_CLASS_ORBS[secondIndex];

          if (!first || !second || !firstConfig || !secondConfig) continue;

          const firstCenterX = first.x + firstConfig.size / 2;
          const firstCenterY = first.y + firstConfig.size / 2;
          const secondCenterX = second.x + secondConfig.size / 2;
          const secondCenterY = second.y + secondConfig.size / 2;
          const deltaX = secondCenterX - firstCenterX;
          const deltaY = secondCenterY - firstCenterY;
          const distance = Math.max(0.001, Math.hypot(deltaX, deltaY));
          const minimumDistance =
            (firstConfig.size + secondConfig.size) * 0.40;

          if (distance >= minimumDistance) continue;

          const normalX = deltaX / distance;
          const normalY = deltaY / distance;
          const overlap = minimumDistance - distance;
          const relativeVelocityX = second.vx - first.vx;
          const relativeVelocityY = second.vy - first.vy;
          const separatingSpeed =
            relativeVelocityX * normalX + relativeVelocityY * normalY;

          first.x -= normalX * overlap * 0.5;
          first.y -= normalY * overlap * 0.5;
          second.x += normalX * overlap * 0.5;
          second.y += normalY * overlap * 0.5;

          if (separatingSpeed < 0) {
            const impulse = -(1 + 0.90) * separatingSpeed * 0.5;
            first.vx -= impulse * normalX;
            first.vy -= impulse * normalY;
            second.vx += impulse * normalX;
            second.vy += impulse * normalY;
          }
        }
      }
    };

    const animate = (time) => {
      const delta = Math.min(2.2, Math.max(0.35, (time - previousTime) / 16.667));
      previousTime = time;
      const pointer = pointerRef.current;

      pointer.vx *= Math.pow(0.84, delta);
      pointer.vy *= Math.pow(0.84, delta);

      physicsRef.current.forEach((state, index) => {
        const config = SIDEBAR_CLASS_ORBS[index];
        const centerX = state.x + config.size / 2;
        const centerY = state.y + config.size / 2;

        state.vx +=
          Math.sin(time * config.driftSpeed + config.phase) *
          config.drift *
          delta;
        state.vy +=
          (config.gravity +
            Math.cos(
              time * config.driftSpeed * 0.83 + config.phase * 1.7,
            ) *
              config.drift) *
          delta;

        if (pointer.active) {
          const deltaX = centerX - pointer.x;
          const deltaY = centerY - pointer.y;
          const distance = Math.max(1, Math.hypot(deltaX, deltaY));
          const proximity = Math.max(
            0,
            1 - distance / config.pointerRadius,
          );
          const easedProximity = proximity * proximity;
          const radialForce =
            config.pointerForce * easedProximity * delta;
          const sweepForce =
            config.pointerCarry * proximity * delta;

          state.vx +=
            (deltaX / distance) * radialForce +
            pointer.vx * sweepForce;
          state.vy +=
            (deltaY / distance) * radialForce +
            pointer.vy * sweepForce;
        }

        state.vx *= Math.pow(ORB_AIR_DRAG, delta);
        state.vy *= Math.pow(ORB_AIR_DRAG, delta);

        const speed = Math.hypot(state.vx, state.vy);

        if (speed > config.maxSpeed) {
          const ratio = config.maxSpeed / speed;
          state.vx *= ratio;
          state.vy *= ratio;
        }

        state.x += state.vx * delta;
        state.y += state.vy * delta;
        state.rotation += state.rotationVelocity * delta;

        const minX = ORB_EDGE_PADDING;
        const minY = ORB_EDGE_PADDING;
        const maxX = Math.max(
          minX,
          layerWidth - config.size - ORB_EDGE_PADDING,
        );
        const maxY = Math.max(
          minY,
          layerHeight - config.size - ORB_EDGE_PADDING,
        );

        if (state.x <= minX) {
          state.x = minX;
          state.vx = Math.abs(state.vx) * ORB_BOUNCE + 0.035;
          state.rotationVelocity = Math.abs(state.rotationVelocity);
        } else if (state.x >= maxX) {
          state.x = maxX;
          state.vx = -Math.abs(state.vx) * ORB_BOUNCE - 0.035;
          state.rotationVelocity = -Math.abs(state.rotationVelocity);
        }

        if (state.y <= minY) {
          state.y = minY;
          state.vy = Math.abs(state.vy) * ORB_BOUNCE + 0.025;
        } else if (state.y >= maxY) {
          state.y = maxY;
          state.vy = -Math.abs(state.vy) * ORB_BOUNCE - 0.055;
        }
      });

      resolveOrbCollision();
      writeOrbStyles(pointer.active);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event) => {
      const bounds = layer.getBoundingClientRect();
      const pointer = pointerRef.current;
      const nextX = event.clientX - bounds.left;
      const nextY = event.clientY - bounds.top;

      if (pointer.active) {
        pointer.vx = clampOrb((nextX - pointer.x) * 0.90, -28, 28);
        pointer.vy = clampOrb((nextY - pointer.y) * 0.90, -28, 28);
      } else {
        pointer.vx = 0;
        pointer.vy = 0;
      }

      pointer.x = nextX;
      pointer.y = nextY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointerRef.current.active = false;
      pointerRef.current.vx *= 0.45;
      pointerRef.current.vy *= 0.45;
      orbHoverStateRef.current = SIDEBAR_CLASS_ORBS.map(() => false);
    };

    const handleResize = () => {
      measureLayer();
      writeOrbStyles(pointerRef.current.active);
    };

    measureLayer();
    writeOrbStyles(false);

    sidebar.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    sidebar.addEventListener('pointerleave', handlePointerLeave);
    document.addEventListener('pointerdown', unlockOrbAudio, {
      once: true,
      capture: true,
    });
    window.addEventListener('resize', handleResize);

    if (!reducedMotion) {
      animationFrame = window.requestAnimationFrame(animate);
    }

    return () => {
      sidebar.removeEventListener('pointermove', handlePointerMove);
      sidebar.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('pointerdown', unlockOrbAudio, {
        capture: true,
      });
      window.removeEventListener('resize', handleResize);

      orbAudioRefs.current.forEach((audio) => {
        if (!audio) return;
        audio.pause();
        audio.currentTime = 0;
      });

      orbAudioRefs.current = [];

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  const classModal = selectedClass && typeof document !== 'undefined'
    ? createPortal(
        <div
          className="adversary-class-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedClass(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="adversary-class-modal-title"
            className="adversary-class-modal"
            style={{ '--class-rgb': selectedClass.glow || '250, 204, 21' }}
          >
            <button
              type="button"
              className="adversary-class-modal-close"
              aria-label="Close class details"
              onClick={() => setSelectedClass(null)}
            >
              ×
            </button>

            <div className="adversary-class-modal-toolbar">
              <label className="sr-only" htmlFor="adversary-class-selection">
                Class selection
              </label>
              <select
                id="adversary-class-selection"
                className="adversary-class-modal-select"
                value={classModalView === 'overall' ? '' : selectedClass.id}
                onChange={(event) => {
                  const nextClass = SIDEBAR_CLASS_ORBS.find(
                    (orb) => orb.id === event.target.value,
                  );

                  if (nextClass) {
                    setSelectedClass(nextClass);
                    setClassModalView('class');
                  }
                }}
              >
                <option value="" disabled>
                  Select class
                </option>
                {SIDEBAR_CLASS_ORBS.map((orb) => (
                  <option key={orb.id} value={orb.id}>
                    {orb.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className={`adversary-class-modal-tab ${
                  classModalView === 'overall' ? 'is-active' : ''
                }`}
                onClick={() => setClassModalView('overall')}
              >
                Overall
              </button>
            </div>

            {classModalView === 'overall' ? (
              <div className="mt-6">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      Last {CLASS_STATS_WINDOW_DAYS} days · Guild Roster only
                    </p>
                    <h2
                      id="adversary-class-modal-title"
                      className="mt-1 text-3xl font-black text-white"
                    >
                      Guild Class Overall
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm text-slate-400">
                      Every roster player appears in every different class they used during the last {CLASS_STATS_WINDOW_DAYS} days. Each player is counted once per class, and classes with no recorded players are hidden.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 rounded-[22px] border border-slate-700/55 bg-slate-950/48 p-5 lg:grid-cols-[260px_1fr]">
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="adversary-class-overall-pie"
                      style={{ background: classAnalytics.overallGradient }}
                      aria-label="Guild class distribution for the last 30 days"
                    >
                      <div className="adversary-class-pie-value">
                        <div className="text-4xl font-black text-white">
                          {classAnalytics.overallClassPlayerCount}
                        </div>
                        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          Player-class picks
                        </div>
                        <div className="mt-1 text-[10px] font-bold text-slate-500">
                          {classAnalytics.playersWithRecentClassData} roster players
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 text-center text-xs font-bold text-slate-500">
                      {classAnalytics.recentWarCount} recorded {classAnalytics.recentWarCount === 1 ? 'war' : 'wars'}
                    </div>
                  </div>

                  <div className="max-h-[430px] space-y-2 overflow-auto pr-1">
                    {classAnalytics.overallSlices.length > 0 ? (
                      classAnalytics.overallSlices.map((slice) => (
                        <button
                          key={slice.id}
                          type="button"
                          disabled={!slice.orb}
                          className="flex w-full items-center gap-3 rounded-2xl border border-slate-700/45 bg-slate-900/55 p-3 text-left transition hover:border-slate-500/70 disabled:cursor-default disabled:hover:border-slate-700/45"
                          onClick={() => {
                            if (!slice.orb) return;
                            setSelectedClass(slice.orb);
                            setClassModalView('class');
                          }}
                        >
                          {slice.orb ? (
                            <img
                              src={slice.orb.src}
                              alt=""
                              className="h-11 w-11 shrink-0 object-contain"
                              draggable="false"
                            />
                          ) : (
                            <span
                              className="h-7 w-7 shrink-0 rounded-full"
                              style={{ background: slice.color }}
                            />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-black text-slate-100">
                              {slice.name}
                            </span>
                            <span className="mt-0.5 block text-[11px] font-bold text-slate-500">
                              {slice.count} {slice.count === 1 ? 'player' : 'players'}
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block text-xl font-black text-white">
                              {slice.percentage.toFixed(2)}%
                            </span>
                            <span className="block text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
                              of roster
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-slate-700/65 bg-slate-950/42 p-5 text-center text-sm text-slate-400">
                        {loadingClassLogs
                          ? 'Loading class history...'
                          : 'No Guild Roster or class assignments were found for the last 30 days.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedClass.src}
                    alt=""
                    className="adversary-class-modal-orb"
                    draggable="false"
                  />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      All Class Logs · Guild Roster only
                    </p>
                    <h2
                      id="adversary-class-modal-title"
                      className="mt-1 text-3xl font-black text-white"
                    >
                      {selectedClass.name}
                    </h2>
                  </div>
                </div>

                <div className="adversary-class-mode-tug mt-4">
                  <div className="adversary-class-mode-tug-labels">
                    <div className="adversary-class-mode-label is-succession">
                      <span>Succession</span>
                      <strong>{classStats.succession}</strong>
                      <small>{classModeTotal > 0 ? `${successionModeShare.toFixed(2)}%` : 'No data'}</small>
                    </div>
                    <div className="adversary-class-mode-label is-awakening">
                      <small>{classModeTotal > 0 ? `${awakeningModeShare.toFixed(2)}%` : 'No data'}</small>
                      <strong>{classStats.awakening}</strong>
                      <span>Awakening</span>
                    </div>
                  </div>
                  <div className="adversary-class-mode-track" aria-label={`${selectedClass.name} mode split: ${classStats.succession} Succession and ${classStats.awakening} Awakening`}>
                    <div
                      className="adversary-class-mode-fill is-succession"
                      style={{ width: `${successionModeShare}%` }}
                    />
                    <div
                      className="adversary-class-mode-fill is-awakening"
                      style={{ width: `${awakeningModeShare}%` }}
                    />
                    <div className="adversary-class-mode-clash">VS</div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 rounded-[18px] border border-slate-700/55 bg-slate-950/48 p-3 lg:grid-cols-[170px_1fr]">
                  <div className="flex items-center justify-center">
                    <div
                      className="adversary-class-pie"
                      style={{ '--class-share': Math.min(100, classStats.share) }}
                      aria-label={`${classStats.share.toFixed(2)} percent of the Guild Roster played ${selectedClass.name} in saved Class Logs`}
                    >
                      <div className="adversary-class-pie-value">
                        <div className="text-2xl font-black text-white">
                          {classStats.share.toFixed(2)}%
                        </div>
                        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          Guild roster
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-2 sm:grid-cols-2">
                    <div className="adversary-class-summary-card">
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Players
                      </div>
                      <div className="mt-1 text-2xl font-black text-white">
                        {classStats.playerCount}
                        <span className="ml-2 text-sm font-bold text-slate-400">
                          of {classAnalytics.rosterSize}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] font-bold text-slate-500">
                        Guild Roster players with this class in saved logs
                      </div>
                    </div>
                    <div className="adversary-class-summary-card">
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Class appearances
                      </div>
                      <div className="mt-1 text-2xl font-black text-white">
                        {classStats.appearances}
                      </div>
                      <div className="mt-2 text-[11px] font-bold text-slate-500">
                        Total Node Wars assigned to {selectedClass.name}
                      </div>
                    </div>
                  </div>
                </div>

                <section className="adversary-class-overall-performance">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-200">
                        Class Overall Performance
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Combined {selectedClass.name} statistics from the saved wars with matching Class Logs.
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-700/55 bg-slate-900/72 px-3 py-1 text-xs font-bold text-slate-400">
                      {classStats.appearances} class {classStats.appearances === 1 ? 'appearance' : 'appearances'}
                    </span>
                  </div>

                  <div className="adversary-class-performance-grid">
                    {classPerformanceMetrics.map((metric) => {
                      const decimals = metric.key === 'kd' ? 2 : 0;

                      return (
                        <div
                          key={metric.key}
                          className="adversary-class-performance-card"
                          style={{ '--metric-rgb': metric.rgb }}
                        >
                          <span className="adversary-class-performance-label">
                            {metric.label}
                          </span>
                          <div className="adversary-class-metric-values">
                            <div className="adversary-class-metric-value">
                              <span>Overall</span>
                              <strong>
                                {metric.hasValue
                                  ? formatClassStatNumber(metric.overall, decimals)
                                  : '—'}
                              </strong>
                            </div>
                            <div className="adversary-class-metric-value">
                              <span>Average</span>
                              <strong>
                                {metric.hasValue
                                  ? formatClassStatNumber(metric.average, 2)
                                  : '—'}
                              </strong>
                            </div>
                            <div className="adversary-class-metric-value">
                              <span>Best</span>
                              <strong>
                                {metric.hasValue
                                  ? formatClassStatNumber(metric.best, decimals)
                                  : '—'}
                              </strong>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <div className="mt-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-300">
                        {selectedClass.name} player statistics
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Stats are joined by player name inside the same saved war as the Class Log assignment.
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-700/55 bg-slate-900/72 px-3 py-1 text-xs font-bold text-slate-400">
                      {classStats.playerCount} roster players
                    </span>
                  </div>

                  {classStats.players.length > 0 ? (
                    <div className="adversary-class-player-cards">
                      {classStats.players.map((player, playerIndex) => (
                        <article key={player.key} className="adversary-class-player-stat-card">
                          <header className="adversary-class-player-stat-header">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="adversary-class-player-rank">#{playerIndex + 1}</span>
                              <div className="min-w-0">
                                <h4 className="truncate text-base font-black text-white">{player.name}</h4>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="adversary-class-player-war-pill">{player.wars} {player.wars === 1 ? 'war' : 'wars'}</span>
                                  {player.succession > 0 && (
                                    <span className="adversary-class-mode-pill is-succession">S {player.succession}</span>
                                  )}
                                  {player.awakening > 0 && (
                                    <span className="adversary-class-mode-pill is-awakening">A {player.awakening}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                          </header>

                          <div className="adversary-class-player-metrics">
                            {CLASS_STATS_DISPLAY_METRICS.map(({ key, label, rgb }) => {
                              const isKd = key === 'kd';
                              const hasValue = isKd
                                ? player.kdWarCount > 0
                                : player.metricWarCounts[key] > 0;
                              const overall = isKd ? player.kd : player.totals[key];
                              const average = isKd
                                ? player.averageKd
                                : player.averages[key];
                              const best = isKd ? player.bestKd : player.best[key];
                              const decimals = isKd ? 2 : 0;

                              return (
                                <div
                                  key={key}
                                  className="adversary-class-player-metric"
                                  style={{ '--metric-rgb': rgb }}
                                >
                                  <span className="adversary-class-player-metric-label">
                                    {label}
                                  </span>
                                  <div className="adversary-class-metric-values">
                                    <div className="adversary-class-metric-value">
                                      <span>Overall</span>
                                      <strong>
                                        {hasValue
                                          ? formatClassStatNumber(overall, decimals)
                                          : '—'}
                                      </strong>
                                    </div>
                                    <div className="adversary-class-metric-value">
                                      <span>Average</span>
                                      <strong>
                                        {hasValue
                                          ? formatClassStatNumber(average, 2)
                                          : '—'}
                                      </strong>
                                    </div>
                                    <div className="adversary-class-metric-value">
                                      <span>Best</span>
                                      <strong>
                                        {hasValue
                                          ? formatClassStatNumber(best, decimals)
                                          : '—'}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-slate-700/65 bg-slate-950/42 p-5 text-center text-sm text-slate-400">
                      {loadingClassLogs
                        ? 'Loading class history...'
                        : `No Guild Roster players were assigned to ${selectedClass.name} in any saved Class Log.`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div ref={layerRef} className="adversary-sidebar-class-orbs">
        {SIDEBAR_CLASS_ORBS.map((orb, index) => (
          <button
            type="button"
            key={orb.id || `${orb.className}-${index}`}
            ref={(element) => {
              orbRefs.current[index] = element;
            }}
            className={`adversary-sidebar-class-orb-shell ${orb.className}`}
            title={orb.name}
            aria-label={`Open ${orb.name} class distribution`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              openClassDetails(orb);
            }}
            style={{
              '--orb-size': `${orb.size}px`,
              '--orb-opacity': orb.opacity,
              '--orb-duration': orb.duration,
              '--orb-delay': orb.delay,
              '--orb-glow-rgb': orb.glow || '239, 68, 68',
            }}
          >
            <img
              src={orb.src}
              alt=""
              aria-hidden="true"
              className="adversary-sidebar-class-orb"
              draggable="false"
            />
          </button>
        ))}
      </div>
      {classModal}
    </>
  );
}

function ActivePageBrand({ page }) {
  const title = PAGE_TITLES[page] || 'Adversary';

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
    const title = PAGE_TITLES[page] || 'Adversary';
    document.title = `Adversary · ${title}`;

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
          const isStatPanel = looksLikeStatPanel(panel, page);

          panel.classList.add('adversary-color-panel');
          panel.classList.toggle('adversary-stat-panel', isStatPanel);
          panel.style.setProperty(
            '--adversary-panel-accent-rgb',
            isStatPanel ? '6, 182, 212' : getPanelAccent(panel, index),
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

  const loadAllLogs = useCallback(async (forceRefresh = false) => {
    const allLogsAlreadyLoadedWithRaw =
      Array.isArray(allLogs) &&
      allLogs.length > 0 &&
      allLogs.every((log) => Boolean(log.raw));

    if (!forceRefresh && allLogsAlreadyLoadedWithRaw) {
      return allLogs;
    }

    try {
      setLoadingAllLogs(true);

      const data = await apiGet(
        logsPath({
          range: 'all',
          includeRaw: 1,
          refresh: forceRefresh ? Date.now() : null,
        }),
      );
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

  async function saveLog(rawOverride, editingLogId = null) {
    const rawToSave = rawOverride == null ? raw : rawOverride;

    if (!parseLog(rawToSave, date, date, 'x').length) {
      setMessage('Invalid log');
      return null;
    }

    const editingLog = editingLogId == null
      ? null
      : logs.find((log) => String(log.id) === String(editingLogId)) || null;
    const localHash = hashLog(rawToSave);

    const duplicate = logs.find((log) => {
      if (editingLog && String(log.id) === String(editingLog.id)) return false;
      if (log.hash && log.hash === localHash) return true;
      if (log.raw) return hashLog(log.raw) === localHash;
      return false;
    });

    if (duplicate) {
      setSelectedDays([dateOf(duplicate)]);
      setSelectedWars([String(duplicate.id)]);
      setMessage('Duplicate log detected locally');
      return null;
    }

    const draftLog = {
      id:
        editingLog?.id ||
        `${date}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: editingLog?.name || date,
      date,
      raw: rawToSave,
      hash: localHash,
      createdAt: editingLog?.createdAt || new Date().toISOString(),
    };

    const summary = buildLogSummary(draftLog);
    const payload = {
      ...draftLog,
      summary,
    };
    const actionLabel = editingLog ? 'Updating' : 'Saving';

    setMessage(`${actionLabel} log in database...\nattempt 1/5`);

    try {
      const response = editingLog
        ? await updateApiLog(editingLog, payload)
        : await apiWriteWithRetry('/api/logs', 'POST', payload, {
            maxAttempts: 5,
            baseDelayMs: 700,
          });

      const savedLog = normalizeLog({
        ...payload,
        ...response,
        id: response?.id ?? response?._id ?? payload.id,
        summary: response?.summary || payload.summary,
      });
      const replaceOrAdd = (currentLogs) => {
        if (!Array.isArray(currentLogs)) return currentLogs;

        if (!editingLog) return [savedLog, ...currentLogs];

        return currentLogs.map((log) =>
          String(log.id) === String(editingLog.id) ? savedLog : log,
        );
      };

      setNodeLogs(replaceOrAdd);
      setAllLogs((currentLogs) =>
        Array.isArray(currentLogs) ? replaceOrAdd(currentLogs) : currentLogs,
      );
      setOverviewLogs(replaceOrAdd);

      setSelectedDays([savedLog.date]);
      setSelectedWars([String(savedLog.id)]);
      setMessage(
        editingLog
          ? 'Log updated in database.\nCombat, Stats and Class data remain attached to the same war.'
          : 'Log saved to database.\nSummary calculated and saved.',
      );

      return savedLog;
    } catch (error) {
      const text = String(error?.message || error || 'Unknown error');

      console.error(editingLog ? 'Database update failed:' : 'Database save failed:', error);

      if (text.includes('Duplicate log')) {
        setMessage(
          `Database refused ${editingLog ? 'update' : 'save'}: ${text}.\nLogul NU a fost salvat local în browser.`,
        );
        return null;
      }

      if (
        text.includes('UnsupportedHttpVerb') ||
        text.includes('404') ||
        text.includes('ResourceNotFound')
      ) {
        setMessage(
          `API ${editingLog ? 'update' : 'save'} endpoint is not available: ${text}.\nLogul NU a fost salvat local în browser.`,
        );
        return null;
      }

      setMessage(
        `Database ${editingLog ? 'update' : 'save'} failed: ${text}.\nLogul NU a fost salvat local în browser.`,
      );
      return null;
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

        {/* A very soft enlarged copy of the same artwork supplies the exact
            edge colours. This replaces most of the artificial yellow smoke
            and prevents a visible seam where the main image ends. */}
        <div
          className="absolute -inset-[6%] bg-cover bg-center bg-no-repeat opacity-[0.13]"
          style={{
            backgroundImage: `url("${adversaryEmblem}")`,
            filter: 'blur(44px) saturate(.88) brightness(.52)',
            transform: 'scale(1.08)',
          }}
        />

        <div
          className="absolute inset-0 opacity-[0.34]"
          style={{
            backgroundImage: [
              'radial-gradient(ellipse 42% 78% at 0% 49%, rgba(217,119,6,.095) 0%, rgba(180,83,9,.065) 30%, rgba(120,53,15,.038) 54%, transparent 78%)',
              'radial-gradient(ellipse 42% 78% at 100% 51%, rgba(217,119,6,.095) 0%, rgba(180,83,9,.065) 30%, rgba(120,53,15,.038) 54%, transparent 78%)',
              'radial-gradient(ellipse 28% 46% at 11% 19%, rgba(245,158,11,.035) 0%, rgba(120,53,15,.022) 52%, transparent 80%)',
              'radial-gradient(ellipse 28% 46% at 89% 81%, rgba(245,158,11,.035) 0%, rgba(120,53,15,.022) 52%, transparent 80%)',
            ].join(', '),
            filter: 'blur(30px)',
            transform: 'scale(1.03)',
          }}
        />

        <div className="adversary-site-artwork absolute inset-0 opacity-[0.30]">
          <img
            src={adversaryEmblem}
            alt=""
            aria-hidden="true"
            style={{
              filter: 'saturate(1.18) contrast(1.06)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent 0%, rgba(0,0,0,.24) 4%, rgba(0,0,0,.62) 9%, rgba(0,0,0,.90) 15%, #000 21%, #000 79%, rgba(0,0,0,.90) 85%, rgba(0,0,0,.62) 91%, rgba(0,0,0,.24) 96%, transparent 100%)',
              maskImage:
                'linear-gradient(90deg, transparent 0%, rgba(0,0,0,.24) 4%, rgba(0,0,0,.62) 9%, rgba(0,0,0,.90) 15%, #000 21%, #000 79%, rgba(0,0,0,.90) 85%, rgba(0,0,0,.62) 91%, rgba(0,0,0,.24) 96%, transparent 100%)',
            }}
          />
        </div>

        {/* Keep only a faint, darker amber haze over the image edges. The
            colour now follows the artwork instead of adding bright yellow. */}
        <div
          className="absolute -inset-[4%] opacity-[0.28]"
          style={{
            backgroundImage: [
              'radial-gradient(ellipse 46% 90% at 7% 50%, rgba(217,119,6,.080) 0%, rgba(180,83,9,.060) 24%, rgba(120,53,15,.036) 46%, rgba(69,26,3,.018) 60%, transparent 76%)',
              'radial-gradient(ellipse 46% 90% at 93% 50%, rgba(217,119,6,.080) 0%, rgba(180,83,9,.060) 24%, rgba(120,53,15,.036) 46%, rgba(69,26,3,.018) 60%, transparent 76%)',
            ].join(', '),
            filter: 'blur(34px) saturate(.94)',
            transform: 'scale(1.025)',
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,.13)_0%,rgba(250,204,21,.06)_32%,rgba(180,83,9,.04)_56%,transparent_76%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_38%,rgba(120,53,15,.10)_66%,rgba(2,6,23,.74)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,.34),rgba(120,53,15,.035)_28%,rgba(120,53,15,.055)_68%,rgba(2,6,23,.66))]" />
      </div>
      <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/88 p-3 backdrop-blur-xl lg:hidden">
        <div className="mb-3 text-lg font-black tracking-[0.18em] text-amber-300 drop-shadow-[0_0_16px_rgba(250,204,21,.38)]">
          Adversary
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {menu.map(([id, title]) => (
            <button
              key={id}
              type="button"
              onClick={() => openPage(id)}
              className={`adversary-menu-button adversary-menu-button-mobile relative rounded-xl border px-3 py-2 text-center text-xs font-black ${
                isMenuActive(id) ? 'is-active' : ''
              }`}
              style={{
                '--adversary-menu-rgb':
                  MENU_ACCENTS[id] || MENU_ACCENTS.nodewars,
              }}
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
              className={`adversary-menu-button adversary-menu-button-mobile relative rounded-xl border px-3 py-2 text-center text-xs font-black ${
                page === 'nodewars' ? 'is-active' : ''
              }`}
              style={{ '--adversary-menu-rgb': MENU_ACCENTS.nodewars }}
            >
              Match History
            </button>

            <button
              type="button"
              onClick={openOverviewFromMenu}
              className={`adversary-menu-button adversary-menu-button-mobile relative rounded-xl border px-3 py-2 text-center text-xs font-black ${
                page === 'overview' ? 'is-active' : ''
              }`}
              style={{ '--adversary-menu-rgb': MENU_ACCENTS.overview }}
            >
              Overview
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[250px_1fr]">
        <aside className="relative hidden min-h-screen flex-col overflow-hidden border-r border-slate-800/90 bg-slate-950/82 p-4 backdrop-blur-2xl lg:flex">
          <SidebarClassOrbs
            members={members}
            logs={Array.isArray(allLogs) ? allLogs : nodeLogs}
            loadLogs={loadAllLogs}
          />

          <h1 className="pointer-events-none relative z-30 mb-6 text-2xl font-black tracking-[0.16em] text-amber-300 drop-shadow-[0_0_18px_rgba(250,204,21,.38)]">
            Adversary
          </h1>

          <nav className="pointer-events-none relative z-30 flex-1">
            {menu
              .filter(([id]) => id !== 'raw')
              .map(([id, title]) => {
                const isNodeWars = id === 'nodewars';

                return (
                  <div key={id} className="mb-2">
                    <button
                      type="button"
                      onClick={() => openPage(id)}
                      className={`adversary-menu-button pointer-events-auto relative w-full rounded-xl border px-4 py-3 text-left font-bold ${
                        isMenuActive(id) ? 'is-active' : ''
                      }`}
                      style={{
                        '--adversary-menu-rgb':
                          MENU_ACCENTS[id] || MENU_ACCENTS.nodewars,
                      }}
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
                          className={`adversary-menu-button pointer-events-auto relative w-full rounded-lg border px-3 py-2 text-left text-sm font-bold ${
                            page === 'nodewars' ? 'is-active' : ''
                          }`}
                          style={{ '--adversary-menu-rgb': MENU_ACCENTS.nodewars }}
                        >
                          Match History
                        </button>

                        <button
                          type="button"
                          onClick={openOverviewFromMenu}
                          className={`adversary-menu-button pointer-events-auto relative w-full rounded-lg border px-3 py-2 text-left text-sm font-bold ${
                            page === 'overview' ? 'is-active' : ''
                          }`}
                          style={{ '--adversary-menu-rgb': MENU_ACCENTS.overview }}
                        >
                          Overview
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>

          <div className="pointer-events-none relative z-30 pt-4">
            <button
              type="button"
              onClick={() => openPage('raw')}
              className={`adversary-menu-button pointer-events-auto relative w-full rounded-xl border px-4 py-3 text-left font-bold ${
                isMenuActive('raw') ? 'is-active' : ''
              }`}
              style={{ '--adversary-menu-rgb': MENU_ACCENTS.raw }}
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
