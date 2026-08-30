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
import {
  BarChart3,
  Settings,
  Shield,
  Swords as MenuSwords,
  Trophy,
  UsersRound,
} from 'lucide-react';
import NodeWars from './pages/NodeWars';
import RawLog from './pages/RawLog';
import adversaryEmblem from './assets/adversary-emblem.png?url';
import adversaryEmblemBackground from './assets/adversary-emblem.png?url';
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
import classOrbAgent from './assets/class-orbs/Agent.webp';
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
import panelHoverSound from './assets/panel-hover.mp3';
import adversaryStartupClip from './assets/adversary-startup.mp4?url';

// The user's click sound lives at src/assets/Page-click.mp3. Using import.meta.glob
// keeps this source buildable even when the audio file is not present in a shared
// patch archive; when the file exists in the project Vite bundles its URL normally.
const PAGE_CLICK_SOUND_MODULES = import.meta.glob('./assets/Page-click.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
});
const PAGE_CLICK_SOUND = PAGE_CLICK_SOUND_MODULES['./assets/Page-click.mp3'] || '';

// Optional persistent website background loop. Drop the finished loop into
// src/assets as Loop-video.mp4 (or .webm). The glob keeps the project buildable
// before that file is added.
const LOOP_VIDEO_MODULES = import.meta.glob('./assets/Loop-video.*', {
  eager: true,
  query: '?url',
  import: 'default',
});
const ADVERSARY_LOOP_VIDEO =
  LOOP_VIDEO_MODULES['./assets/Loop-video.mp4'] ||
  LOOP_VIDEO_MODULES['./assets/Loop-video.webm'] ||
  LOOP_VIDEO_MODULES['./assets/Loop-video.mov'] ||
  '';
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
  'Gandolfini',
  'Alneim',
  'Telvanis',
  'Scarmartem',
  'Shizzai',
  'Karabela69',
  'HAZEKUSH',
  'INoGameNoLife',
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
  if (!element) return PANEL_ACCENTS[index % PANEL_ACCENTS.length];

  const ownClassText =
    typeof element.className === 'string' ? element.className : '';

  /* Preserve the page's original semantic colour wherever possible. Many of
     the old panels carried their tint on an icon/value child rather than on
     the panel border itself, so inspect a small descendant sample too. */
  const descendantClassText = [...element.querySelectorAll?.(
    '[class*="text-"], [class*="bg-"], [class*="border-"], [class*="from-"], [class*="via-"]',
  ) || []]
    .slice(0, 28)
    .map((node) => (typeof node.className === 'string' ? node.className : ''))
    .join(' ');

  const classText = `${ownClassText} ${descendantClassText}`;

  for (const [name, rgb] of Object.entries(PANEL_ACCENT_BY_CLASS)) {
    const colorClassPattern = new RegExp(
      `(?:border|text|bg|from|via|to)-${name}(?:-|\\/|\\[|\\s|$)`,
      'i',
    );

    if (colorClassPattern.test(classText)) {
      return rgb;
    }
  }

  /* Stat cards that have neutral shells still get the same familiar semantic
     tints as Node Wars. */
  const text = String(element.textContent || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const semanticAccents = [
    [/damage taken|taken\b/, PANEL_ACCENT_BY_CLASS.pink],
    [/deaths?|death\b/, PANEL_ACCENT_BY_CLASS.rose],
    [/fort(?: damage)?|fortification/, PANEL_ACCENT_BY_CLASS.violet],
    [/cc hits?|crowd control/, PANEL_ACCENT_BY_CLASS.cyan],
    [/kills?|frags?/, PANEL_ACCENT_BY_CLASS.emerald],
    [/k\s*\/\s*d|\bkd\b|ratio/, PANEL_ACCENT_BY_CLASS.cyan],
    [/damage|dmg/, PANEL_ACCENT_BY_CLASS.amber],
    [/players?|roster|members?/, PANEL_ACCENT_BY_CLASS.indigo],
    [/wars?|matches?|participation/, PANEL_ACCENT_BY_CLASS.violet],
    [/rank|score|milestone|record|trophy/, PANEL_ACCENT_BY_CLASS.amber],
  ];

  for (const [pattern, rgb] of semanticAccents) {
    if (pattern.test(text)) return rgb;
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
    width: 100%;
    height: 100%;
    max-width: none;
    flex: none;
    object-fit: cover;
    object-position: center;
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
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
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
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
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
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
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
     sidebar, bounce softly from its edges and are pushed
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
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  .adversary-class-modal {
    position: relative;
    isolation: isolate;
    width: min(1600px, 97vw);
    max-width: calc(100vw - 20px);
    max-height: 92vh;
    overflow-x: hidden;
    overflow-y: auto;
    border: 1px solid rgba(242, 194, 22, 0.52);
    border-radius: 23px;
    padding: 20px;
    color: #e2e8f0;
    background-color: rgba(3, 5, 6, 0.92);
    background-image:
      radial-gradient(ellipse at 12% -8%, rgba(var(--class-rgb, 250, 204, 21), 0.18), transparent 44%),
      radial-gradient(ellipse at 88% 108%, rgba(var(--class-rgb, 250, 204, 21), 0.07), transparent 42%),
      var(--adversary-tech-art),
      radial-gradient(circle at 10% 28%, rgba(255, 210, 52, .09) 0 1px, transparent 2px),
      radial-gradient(circle at 82% 66%, rgba(255, 205, 39, .07) 0 1px, transparent 2px),
      linear-gradient(145deg, rgba(10, 12, 12, 0.91), rgba(2, 5, 6, 0.94));
    background-size: 100% 100%, 100% 100%, 650px 255px, 190px 155px, 250px 195px, 100% 100%;
    background-position: center, center, 0 50%, 8% 24%, 80% 68%, center;
    background-repeat: no-repeat, no-repeat, repeat, repeat, repeat, no-repeat;
    box-shadow:
      inset 0 1px 0 rgba(255, 235, 135, .06),
      inset 0 0 34px rgba(242, 194, 22, .025),
      0 28px 90px rgba(0, 0, 0, 0.65),
      0 0 34px rgba(242, 194, 22, 0.12);
    scrollbar-gutter: stable;
  }

  .adversary-class-modal::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    border-radius: inherit;
    opacity: .48;
    background-image:
      linear-gradient(90deg, transparent 0 7%, rgba(242,194,22,.14) 7% 7.12%, transparent 7.12% 31%, rgba(242,194,22,.10) 31% 31.12%, transparent 31.12% 100%),
      linear-gradient(0deg, transparent 0 24%, rgba(242,194,22,.12) 24% 24.2%, transparent 24.2% 69%, rgba(242,194,22,.09) 69% 69.2%, transparent 69.2% 100%);
    background-size: 220px 100%, 100% 88px;
    -webkit-mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,.82) 72%, transparent 100%);
    mask-image: linear-gradient(90deg, #000 0%, rgba(0,0,0,.82) 72%, transparent 100%);
  }

  .adversary-class-modal::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    border-radius: inherit;
    box-shadow:
      inset 0 0 0 1px rgba(255, 218, 62, .05),
      inset 0 0 44px rgba(242, 194, 22, .018);
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

  .adversary-class-modal-content {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: clip;
  }

  @supports not (overflow: clip) {
    .adversary-class-modal-content {
      overflow-x: hidden;
    }
  }

  .adversary-class-overall-dashboard {
    display: grid;
    grid-template-columns: max-content minmax(420px, 1fr);
    align-items: start;
    gap: 14px;
    margin-top: 10px;
  }

  .adversary-class-overall-distribution,
  .adversary-class-rankings-panel {
    min-width: 0;
    border: 1px solid rgba(242, 194, 22, 0.30);
    border-radius: 18px;
    background-color: rgba(3,5,6,.72);
    background-image:
      radial-gradient(ellipse at 10% -10%, rgba(var(--class-rgb, 250,204,21), .13), transparent 50%),
      var(--adversary-tech-art),
      linear-gradient(180deg, rgba(8,9,8,.68), rgba(2,4,5,.74));
    background-size: 100% 100%, 500px 196px, 100% 100%;
    background-position: center, 0 50%, center;
    background-repeat: no-repeat, repeat, no-repeat;
    box-shadow: inset 0 1px 0 rgba(255, 235, 135, .04), inset 0 0 24px rgba(242,194,22,.018);
  }

  .adversary-class-overall-distribution {
    display: grid;
    grid-template-columns: 170px 278px;
    width: max-content;
    max-width: 100%;
    gap: 10px;
    padding: 10px;
  }

  .adversary-class-overall-list {
    width: 278px;
    max-width: 100%;
  }

  .adversary-class-rankings-panel {
    padding: 13px;
  }

  .adversary-class-rankings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.11);
  }

  .adversary-class-ranking-select {
    min-width: 130px;
    border: 1px solid rgba(var(--class-rgb, 250, 204, 21), 0.28);
    border-radius: 10px;
    padding: 7px 28px 7px 9px;
    color: #f8fafc;
    background: rgba(15, 23, 42, 0.92);
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .adversary-class-ranking-list {
    max-height: 390px;
    overflow: auto;
    margin-top: 9px;
    padding-right: 3px;
  }

  .adversary-class-ranking-columns {
    display: grid;
    grid-template-columns: minmax(150px, 1fr) repeat(3, minmax(72px, 0.62fr));
    align-items: center;
    gap: 6px;
    margin-top: 9px;
    padding: 0 7px 6px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.10);
  }

  .adversary-class-ranking-columns > span {
    color: #64748b;
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .adversary-class-ranking-sort-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 8px;
    padding: 5px 4px;
    color: #64748b;
    background: rgba(15, 23, 42, 0.46);
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    cursor: pointer;
  }

  .adversary-class-ranking-sort-button:hover,
  .adversary-class-ranking-sort-button.is-active {
    border-color: rgba(var(--class-rgb, 250, 204, 21), 0.32);
    color: rgb(var(--class-rgb, 250, 204, 21));
    background: rgba(var(--class-rgb, 250, 204, 21), 0.08);
  }

  .adversary-class-ranking-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
  }

  .adversary-class-ranking-wars {
    display: inline-flex;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 999px;
    padding: 2px 6px;
    color: #94a3b8;
    background: rgba(15, 23, 42, 0.56);
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .adversary-class-ranking-row {
    display: grid;
    grid-template-columns: minmax(150px, 1fr) repeat(3, minmax(72px, 0.62fr));
    align-items: center;
    gap: 6px;
    padding: 7px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  }

  .adversary-class-ranking-row:last-child {
    border-bottom: 0;
  }

  .adversary-class-ranking-identity {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 7px;
  }

  .adversary-class-ranking-identity img {
    width: 31px;
    height: 31px;
    flex: 0 0 auto;
    object-fit: contain;
  }

  .adversary-class-ranking-mode {
    display: inline-flex;
    margin-top: 2px;
    border-radius: 999px;
    padding: 2px 6px;
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .adversary-class-ranking-mode.is-succession {
    color: #a5f3fc;
    background: rgba(6, 182, 212, 0.12);
  }

  .adversary-class-ranking-mode.is-awakening {
    color: #fecdd3;
    background: rgba(244, 63, 94, 0.12);
  }

  .adversary-class-ranking-value {
    min-width: 0;
    border: 1px solid rgba(var(--class-rgb, 250, 204, 21), 0.10);
    border-radius: 9px;
    padding: 5px 4px;
    background: rgba(15, 23, 42, 0.54);
    text-align: center;
  }

  .adversary-class-ranking-value span {
    display: block;
    color: #64748b;
    font-size: 7px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .adversary-class-ranking-value strong {
    display: block;
    margin-top: 2px;
    overflow: hidden;
    color: #f8fafc;
    font-size: 12px;
    font-weight: 1000;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .adversary-class-ranking-list {
    scrollbar-width: thin;
    scrollbar-color: rgba(var(--class-rgb, 250, 204, 21), 0.72) rgba(15, 23, 42, 0.52);
  }

  .adversary-class-ranking-list::-webkit-scrollbar {
    width: 8px;
  }

  .adversary-class-ranking-list::-webkit-scrollbar-thumb {
    border: 2px solid rgba(15, 23, 42, 0.72);
    border-radius: 999px;
    background: rgba(var(--class-rgb, 250, 204, 21), 0.72);
  }

  @media (max-width: 1180px) {
    .adversary-class-overall-dashboard {
      grid-template-columns: 1fr;
    }

    .adversary-class-overall-distribution {
      grid-template-columns: 150px 278px;
      justify-self: start;
    }
  }

  @media (max-width: 720px) {
    .adversary-class-overall-distribution {
      width: 100%;
      grid-template-columns: 1fr;
    }

    .adversary-class-overall-list {
      width: 100%;
    }

    .adversary-class-ranking-row {
      grid-template-columns: minmax(120px, 1fr) repeat(3, minmax(58px, 0.62fr));
    }
  }


  .adversary-class-modal :is(
    .adversary-class-player-stat-card,
    .adversary-class-performance-card,
    .adversary-class-player-list,
    .adversary-class-stats-table-wrap
  ) {
    border-color: rgba(242,194,22,.26) !important;
    background-color: rgba(3,5,6,.66) !important;
    background-image:
      radial-gradient(ellipse at 12% -10%, rgba(var(--metric-rgb, var(--class-rgb, 250,204,21)), .10), transparent 48%),
      var(--adversary-tech-art),
      linear-gradient(180deg, rgba(8,9,8,.62), rgba(2,4,5,.70)) !important;
    background-size: 100% 100%, 430px 169px, 100% 100% !important;
    background-position: center, 0 50%, center !important;
    background-repeat: no-repeat, repeat, no-repeat !important;
  }

  .adversary-class-modal-close {
    position: sticky;
    float: right;
    right: 0;
    top: 0;
    z-index: 100;
    display: grid;
    width: 40px;
    height: 40px;
    margin: -4px -4px 4px 12px;
    place-items: center;
    border: 1px solid rgba(255, 218, 62, 0.68);
    border-radius: 12px;
    color: #ffe46b;
    background:
      radial-gradient(circle at 50% 40%, rgba(255,218,62,.16), transparent 68%),
      rgba(2,5,6,.96);
    box-shadow: inset 0 0 16px rgba(242,194,22,.05), 0 0 16px rgba(242,194,22,.11);
    cursor: pointer;
    pointer-events: auto !important;
    touch-action: manipulation;
  }

  .adversary-class-modal-close:hover,
  .adversary-class-modal-close:focus-visible {
    border-color: rgba(255, 226, 96, 0.92);
    color: #fff7c2;
    background:
      radial-gradient(circle at 50% 40%, rgba(255,218,62,.25), transparent 68%),
      rgba(5,7,6,.98);
    box-shadow: inset 0 0 18px rgba(242,194,22,.08), 0 0 20px rgba(242,194,22,.18);
    outline: none;
  }

  .adversary-class-modal-orb {
    width: 83px;
    height: 83px;
    object-fit: contain;
    filter: drop-shadow(0 0 20px rgba(var(--class-rgb, 250, 204, 21), 0.42));
  }

  .adversary-class-pie {
    position: relative;
    display: grid;
    width: 106px;
    height: 106px;
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
    inset: 14px;
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
    border-radius: 15px;
    padding: 11px 13px 12px;
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
    gap: 10px;
    margin-bottom: 7px;
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
    height: 17px;
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
    width: 29px;
    height: 29px;
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
    border-radius: 12px;
    padding: 7px 9px;
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


  .adversary-class-top-summary {
    border-color: rgba(var(--class-rgb, 250, 204, 21), 0.28) !important;
    background:
      radial-gradient(circle at 8% 10%, rgba(var(--class-rgb, 250, 204, 21), 0.14), transparent 42%),
      linear-gradient(145deg, rgba(var(--class-rgb, 250, 204, 21), 0.055), rgba(2, 6, 23, 0.54));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.028),
      inset 0 0 30px rgba(var(--class-rgb, 250, 204, 21), 0.035),
      0 8px 22px rgba(0, 0, 0, 0.15);
  }

  .adversary-class-top-summary .adversary-class-summary-card {
    border-color: rgba(var(--class-rgb, 250, 204, 21), 0.22);
  }


  .adversary-class-top-summary {
    width: 85%;
    justify-self: end;
    grid-template-columns: 96px minmax(0, 1fr) !important;
    gap: 5px !important;
    padding: 6px !important;
  }

  .adversary-class-top-summary .adversary-class-pie {
    width: 90px;
    height: 90px;
  }

  .adversary-class-top-summary .adversary-class-pie::before {
    inset: 12px;
  }

  .adversary-class-top-summary .adversary-class-summary-card {
    padding: 6px 8px;
  }

  .adversary-class-overall-row {
    display: grid !important;
    width: 278px !important;
    max-width: 100%;
    grid-template-columns: 40px 150px 72px;
    justify-content: start;
    column-gap: 6px !important;
  }

  .adversary-class-overall-row .adversary-class-overall-name {
    min-width: 0;
  }

  @media (max-width: 1100px) {
    .adversary-class-top-summary {
      width: 100%;
    }
  }

  @media (max-width: 720px) {
    .adversary-class-top-summary {
      grid-template-columns: 84px minmax(0, 1fr) !important;
    }

    .adversary-class-overall-row {
      width: 100% !important;
      grid-template-columns: 36px minmax(105px, 1fr) 68px;
    }
  }

  .adversary-class-player-cards {
    display: grid;
    max-height: 400px;
    gap: 10px;
    overflow: auto;
    padding: 2px 4px 6px 2px;
  }

  .adversary-class-player-stat-card {
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 16px;
    padding: 11px;
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
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.10);
  }

  .adversary-class-player-rank {
    display: grid;
    width: 31px;
    height: 31px;
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
    padding: 2px 7px;
    font-size: 8px;
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
    background: rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.14);
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
    margin-top: 9px;
    border: 1px solid rgba(var(--class-rgb, 250, 204, 21), 0.18);
    border-radius: 14px;
    padding: 10px;
    background:
      radial-gradient(circle at 8% 0%, rgba(var(--class-rgb, 250, 204, 21), 0.08), transparent 36%),
      rgba(2, 6, 23, 0.42);
  }

  .adversary-class-performance-grid,
  .adversary-class-player-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .adversary-class-performance-grid {
    margin-top: 8px;
  }

  .adversary-class-player-metrics {
    margin-top: 8px;
  }

  .adversary-class-performance-card,
  .adversary-class-player-metric {
    --metric-rgb: 148, 163, 184;
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(var(--metric-rgb), 0.22);
    border-radius: 10px;
    padding: 6px;
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
    font-size: 9px;
    font-weight: 1000;
    text-overflow: ellipsis;
    text-transform: uppercase;
    letter-spacing: 0.10em;
    white-space: nowrap;
  }

  .adversary-class-metric-values {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 5px;
    overflow: hidden;
    border: 1px solid rgba(var(--metric-rgb), 0.13);
    border-radius: 8px;
    background: rgba(2, 6, 23, 0.44);
  }

  .adversary-class-metric-value {
    display: flex;
    min-width: 0;
    min-height: 40px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 5px 4px;
    text-align: center;
  }

  .adversary-class-metric-value + .adversary-class-metric-value {
    border-left: 1px solid rgba(var(--metric-rgb), 0.13);
  }

  .adversary-class-metric-value span {
    color: #7c8aa0;
    font-size: 7px;
    font-weight: 1000;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .adversary-class-metric-value strong {
    max-width: 100%;
    overflow: hidden;
    color: #f8fafc;
    font-size: 15px;
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
    width: 207px;
    height: 207px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 999px;
    box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.38), 0 0 32px rgba(250, 204, 21, 0.10);
  }

  .adversary-class-overall-pie::before {
    content: '';
    position: absolute;
    inset: 28px;
    border-radius: inherit;
    background: rgba(2, 6, 23, 0.97);
    box-shadow: inset 0 0 20px rgba(15, 23, 42, 0.78);
  }


  /* Refined class popup layout: matching Overall panels, compact rankings,
     no visible side scrollbars outside Player Statistics. */
  .adversary-class-modal {
    scrollbar-width: none;
  }

  .adversary-class-modal::-webkit-scrollbar,
  .adversary-class-overall-list::-webkit-scrollbar,
  .adversary-class-ranking-list::-webkit-scrollbar,
  .adversary-class-player-list::-webkit-scrollbar,
  .adversary-class-stats-table-wrap::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .adversary-class-overall-list,
  .adversary-class-ranking-list,
  .adversary-class-player-list,
  .adversary-class-stats-table-wrap {
    scrollbar-width: none;
  }

  .adversary-class-overall-dashboard {
    grid-template-columns: 548px minmax(0, 1fr);
    align-items: stretch;
    gap: 12px;
  }

  .adversary-class-overall-distribution,
  .adversary-class-rankings-panel {
    height: 430px;
    box-sizing: border-box;
  }

  .adversary-class-overall-distribution {
    grid-template-columns: 188px minmax(0, 1fr);
    width: 548px;
    gap: 9px;
    padding: 10px;
  }

  .adversary-class-overall-list {
    width: 100%;
    height: 100%;
    min-width: 0;
    max-width: none;
    overflow-x: hidden;
    overflow-y: auto;
    padding-right: 0;
  }

  .adversary-class-overall-row {
    width: 100% !important;
    min-width: 0;
    box-sizing: border-box;
    grid-template-columns: 38px minmax(0, 1fr) 86px !important;
    column-gap: 7px !important;
    padding: 8px !important;
  }

  .adversary-class-overall-row img {
    width: 36px !important;
    height: 36px !important;
  }

  .adversary-class-rankings-panel {
    display: flex;
    min-width: 0;
    flex-direction: column;
    padding: 10px;
  }

  .adversary-class-rankings-header {
    flex: 0 0 auto;
    gap: 8px;
    padding-bottom: 7px;
  }

  .adversary-class-rankings-header p {
    margin-top: 2px !important;
  }

  .adversary-class-ranking-select {
    min-width: 116px;
    padding: 6px 24px 6px 8px;
    font-size: 9px;
  }

  .adversary-class-ranking-columns {
    grid-template-columns: minmax(130px, 0.9fr) repeat(3, minmax(62px, 0.54fr));
    gap: 5px;
    margin-top: 6px;
    padding: 0 5px 5px;
  }

  .adversary-class-ranking-sort-button {
    padding: 4px 3px;
    font-size: 7px;
  }

  .adversary-class-ranking-list {
    min-height: 0;
    max-height: none;
    flex: 1 1 auto;
    overflow-x: hidden;
    overflow-y: auto;
    margin-top: 4px;
    padding-right: 0;
  }

  .adversary-class-ranking-row {
    grid-template-columns: minmax(130px, 0.9fr) repeat(3, minmax(62px, 0.54fr));
    gap: 5px;
    padding: 4px 5px;
  }

  .adversary-class-ranking-identity {
    gap: 5px;
  }

  .adversary-class-ranking-identity img {
    width: 27px;
    height: 27px;
  }

  .adversary-class-ranking-meta {
    gap: 4px;
    margin-top: 1px;
  }

  .adversary-class-ranking-mode,
  .adversary-class-ranking-wars {
    padding: 1px 5px;
    font-size: 7px;
  }

  .adversary-class-ranking-value {
    border-radius: 8px;
    padding: 4px 3px;
  }

  .adversary-class-ranking-value strong {
    margin-top: 0;
    font-size: 11px;
  }

  .adversary-class-player-stat-card {
    --player-rgb: var(--class-rgb, 250, 204, 21);
    border-color: rgba(var(--player-rgb), 0.30);
    background:
      radial-gradient(circle at 0% 0%, rgba(var(--player-rgb), 0.18), transparent 38%),
      linear-gradient(145deg, rgba(var(--player-rgb), 0.075), rgba(4, 10, 22, 0.88));
    box-shadow:
      0 12px 30px rgba(0, 0, 0, 0.20),
      inset 0 1px 0 rgba(255, 255, 255, 0.025),
      inset 0 0 28px rgba(var(--player-rgb), 0.04);
  }

  .adversary-class-player-stat-card:hover {
    border-color: rgba(var(--player-rgb), 0.52);
    box-shadow:
      0 16px 38px rgba(0, 0, 0, 0.30),
      0 0 24px rgba(var(--player-rgb), 0.12),
      inset 0 0 30px rgba(var(--player-rgb), 0.06);
  }

  .adversary-class-player-stat-card .adversary-class-player-rank {
    border-color: rgba(var(--player-rgb), 0.36);
    color: rgb(var(--player-rgb));
    background: rgba(var(--player-rgb), 0.10);
  }

  .adversary-class-player-title-row {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 7px;
  }

  .adversary-class-player-title-row h4 {
    flex: 1 1 auto;
  }

  .adversary-class-player-mode-summary {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    border: 1px solid rgba(var(--player-rgb), 0.28);
    border-radius: 999px;
    padding: 2px 7px;
    color: rgb(var(--player-rgb));
    background: rgba(var(--player-rgb), 0.09);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.05em;
  }

  @media (max-width: 1180px) {
    .adversary-class-overall-dashboard {
      grid-template-columns: 1fr;
    }

    .adversary-class-overall-distribution,
    .adversary-class-rankings-panel {
      width: 100%;
      height: 430px;
    }
  }

  @media (max-width: 720px) {
    .adversary-class-overall-distribution {
      grid-template-columns: 150px minmax(0, 1fr);
    }

    .adversary-class-player-title-row {
      flex-wrap: wrap;
    }
  }


  /* Clickable class-mode filter and compact paired streak/feed player card. */
  .adversary-class-mode-label-button {
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    transition: opacity 160ms ease, filter 160ms ease, transform 160ms ease;
  }

  .adversary-class-mode-label-button:not(.is-selected),
  .adversary-class-mode-fill:not(.is-selected) {
    opacity: 0.82;
  }

  .adversary-class-mode-label-button:hover,
  .adversary-class-mode-label-button.is-selected {
    opacity: 1;
    filter: brightness(1.18);
  }

  .adversary-class-mode-label-button.is-selected {
    transform: translateY(-1px);
  }

  .adversary-class-mode-fill {
    display: block;
    border: 0;
    padding: 0;
    cursor: pointer;
  }

  .adversary-class-mode-fill.is-selected {
    opacity: 1;
    filter: brightness(1.18) saturate(1.12);
  }

  .adversary-class-mode-clash {
    border: 2px solid rgba(255, 255, 255, 0.82);
    padding: 0;
    cursor: pointer;
  }

  .adversary-class-ranking-sort-button.is-disabled,
  .adversary-class-ranking-sort-button:disabled {
    cursor: not-allowed;
    opacity: 0.38;
    color: #475569;
    border-color: rgba(71, 85, 105, 0.18);
    background: rgba(15, 23, 42, 0.30);
  }

  .adversary-class-player-stat-card {
    padding: 9px;
  }

  .adversary-class-player-stat-header {
    padding-bottom: 6px;
  }

  .adversary-class-player-metrics {
    gap: 5px;
    margin-top: 6px;
  }

  .adversary-class-player-metrics .adversary-class-player-metric {
    padding: 5px;
  }

  .adversary-class-player-metrics .adversary-class-metric-values {
    margin-top: 4px;
  }

  .adversary-class-player-metrics .adversary-class-metric-value {
    min-height: 34px;
    gap: 1px;
    padding: 3px;
  }

  .adversary-class-player-metrics .adversary-class-metric-value strong {
    font-size: 13px;
  }

  .adversary-class-performance-card.is-combined-feed,
  .adversary-class-player-metric.is-combined-feed {
    display: grid;
    align-content: center;
    gap: 3px;
    padding: 4px 5px;
  }

  .adversary-class-combined-feed-row {
    display: grid;
    grid-template-columns: minmax(62px, 0.62fr) minmax(0, 1.38fr);
    min-width: 0;
    align-items: center;
    gap: 4px;
  }

  .adversary-class-combined-feed-row + .adversary-class-combined-feed-row {
    border-top: 1px solid rgba(148, 163, 184, 0.10);
    padding-top: 3px;
  }

  .adversary-class-combined-feed-label {
    overflow: hidden;
    color: rgb(var(--combined-metric-rgb));
    font-size: 8px;
    font-weight: 1000;
    text-overflow: ellipsis;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }

  .adversary-class-combined-feed-values {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(var(--combined-metric-rgb), 0.14);
    border-radius: 6px;
    background: rgba(2, 6, 23, 0.42);
  }

  .adversary-class-combined-feed-values > span {
    display: flex;
    min-width: 0;
    min-height: 25px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 2px;
    text-align: center;
  }

  .adversary-class-combined-feed-values > span + span {
    border-left: 1px solid rgba(var(--combined-metric-rgb), 0.12);
  }

  .adversary-class-combined-feed-values small {
    color: #64748b;
    font-size: 5.5px;
    font-weight: 1000;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .adversary-class-combined-feed-values strong {
    max-width: 100%;
    overflow: hidden;
    color: #f8fafc;
    font-size: 11px;
    font-weight: 1000;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    --player-stats-summary-rgb: var(--adversary-panel-accent-rgb, 6, 182, 212) !important;
    --player-stats-panel-rgb: var(--adversary-panel-accent-rgb, 6, 182, 212) !important;
    --nodewars-accent-rgb: var(--adversary-panel-accent-rgb, 6, 182, 212) !important;
    --monthly-panel-accent-rgb: var(--adversary-panel-accent-rgb, 6, 182, 212) !important;
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.46) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.14) 0%,
        rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.07) 42%,
        rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.026) 74%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.050) 0%,
        rgba(7, 13, 29, 0.38) 54%,
        rgba(2, 6, 23, 0.50) 100%
      ) !important;
    box-shadow:
      inset 0 0 36px rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.055),
      0 10px 24px rgba(0, 0, 0, 0.18) !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  .adversary-content .adversary-stat-panel:hover,
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-stat-panel:hover {
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.44) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.20) 0%,
        rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.10) 44%,
        rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.038) 76%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.07) 0%,
        rgba(7, 13, 29, 0.36) 54%,
        rgba(2, 6, 23, 0.48) 100%
      ) !important;
    box-shadow:
      inset 0 0 40px rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.080),
      0 0 16px rgba(var(--adversary-panel-accent-rgb, 6,182,212), 0.16),
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
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.42) !important;
  }


  /* ----------------------------------------------------------------------
     GOLDEN HEX-TECH THEME
     Shared visual language for every analytics page. This deliberately lives
     in the global shell so new panels inherit the same treatment without
     duplicating page-specific CSS.
     ---------------------------------------------------------------------- */
  .adversary-app {
    --adversary-gold: 250, 204, 21;
    --adversary-gold-hot: 255, 221, 64;
    --adversary-gold-deep: 180, 112, 0;
  }

  .adversary-site-background::before,
  .adversary-site-background::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .adversary-site-background::before {
    opacity: .34;
    background-image:
      linear-gradient(30deg, rgba(250,204,21,.055) 12%, transparent 12.5%, transparent 87%, rgba(250,204,21,.055) 87.5%),
      linear-gradient(150deg, rgba(250,204,21,.055) 12%, transparent 12.5%, transparent 87%, rgba(250,204,21,.055) 87.5%),
      linear-gradient(30deg, rgba(250,204,21,.055) 12%, transparent 12.5%, transparent 87%, rgba(250,204,21,.055) 87.5%),
      linear-gradient(150deg, rgba(250,204,21,.055) 12%, transparent 12.5%, transparent 87%, rgba(250,204,21,.055) 87.5%),
      linear-gradient(60deg, rgba(250,204,21,.032) 25%, transparent 25.5%, transparent 75%, rgba(250,204,21,.032) 75%);
    background-size: 56px 98px;
    background-position: 0 0, 0 0, 28px 49px, 28px 49px, 0 0;
    -webkit-mask-image: radial-gradient(ellipse at center, #000 0 58%, transparent 94%);
    mask-image: radial-gradient(ellipse at center, #000 0 58%, transparent 94%);
  }

  .adversary-site-background::after {
    opacity: .48;
    background-image:
      radial-gradient(circle at 9% 16%, rgba(255,221,64,.8) 0 1px, transparent 2px),
      radial-gradient(circle at 84% 23%, rgba(255,221,64,.55) 0 1px, transparent 2px),
      radial-gradient(circle at 19% 74%, rgba(255,221,64,.5) 0 1px, transparent 2px),
      radial-gradient(circle at 92% 77%, rgba(255,221,64,.55) 0 1px, transparent 2px);
    background-size: 240px 240px, 310px 310px, 360px 360px, 420px 420px;
  }

  .adversary-page-brand {
    border-color: rgba(250,204,21,.52) !important;
    background:
      linear-gradient(90deg, rgba(250,204,21,.075), transparent 22%, transparent 76%, rgba(250,204,21,.04)),
      rgba(2,6,17,.80) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,238,145,.10),
      inset 0 -1px 0 rgba(180,112,0,.30),
      0 0 0 1px rgba(250,204,21,.05),
      0 0 22px rgba(250,204,21,.11),
      0 20px 55px rgba(0,0,0,.32) !important;
  }

  .adversary-page-brand::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: .24;
    background-image:
      linear-gradient(30deg, rgba(250,204,21,.16) 12%, transparent 12.5%, transparent 87%, rgba(250,204,21,.16) 87.5%),
      linear-gradient(150deg, rgba(250,204,21,.16) 12%, transparent 12.5%, transparent 87%, rgba(250,204,21,.16) 87.5%);
    background-size: 38px 66px;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 18%, transparent 58%);
    mask-image: linear-gradient(90deg, transparent 0, #000 18%, transparent 58%);
  }

  /* Gold frame over the existing semantic-color cards. */
  .adversary-content :is(section, article, div)[class*="rounded"][class*="border"]:not(.adversary-class-modal) {
    border-color: rgba(250,204,21,.24) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,244,181,.04),
      inset 0 -1px 0 rgba(180,112,0,.14),
      0 10px 28px rgba(0,0,0,.20);
  }

  .adversary-content :is(section, article, div)[class*="rounded"][class*="border"]:not(.adversary-class-modal):hover {
    border-color: rgba(250,204,21,.44) !important;
  }

  /* Keep strong semantic accents inside cards, but make the panel shell gold. */
  .adversary-content .adversary-color-panel,
  .adversary-content .adversary-stat-panel,
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel,
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-stat-panel {
    border-color: rgba(250,204,21,.25) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,246,194,.05),
      inset 0 -1px 0 rgba(180,112,0,.17),
      inset 0 0 36px rgba(var(--adversary-panel-accent-rgb, 250,204,21),.035),
      0 10px 25px rgba(0,0,0,.20) !important;
  }

  .adversary-content .adversary-color-panel:hover,
  .adversary-content .adversary-stat-panel:hover,
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-color-panel:hover,
  body[data-adversary-page="guild"] .adversary-page-guild .adversary-stat-panel:hover {
    border-color: rgba(255,221,64,.58) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,246,194,.08),
      inset 0 -1px 0 rgba(180,112,0,.24),
      inset 0 0 42px rgba(var(--adversary-panel-accent-rgb, 250,204,21),.055),
      0 0 18px rgba(250,204,21,.14),
      0 14px 30px rgba(0,0,0,.24) !important;
  }

  .adversary-content button[class*="border"],
  .adversary-content select[class*="border"],
  .adversary-content input[class*="border"] {
    border-color: rgba(250,204,21,.22) !important;
  }

  .adversary-content button[class*="border"]:hover,
  .adversary-content select[class*="border"]:hover,
  .adversary-content input[class*="border"]:focus {
    border-color: rgba(250,204,21,.55) !important;
    box-shadow: 0 0 14px rgba(250,204,21,.10);
  }

  /* Page-specific shells: preserve the information architecture while making
     Node Wars, Monthly Recap, Hall of Fame, Overview, Player Stats and Guild
     visually read as one product. */
  body[data-adversary-page="nodewars"] .adversary-page-nodewars,
  body[data-adversary-page="monthly"] .adversary-page-monthly,
  body[data-adversary-page="hall"] .adversary-page-hall,
  body[data-adversary-page="overview"] .adversary-page-overview,
  body[data-adversary-page="players"] .adversary-page-players,
  body[data-adversary-page="guild"] .adversary-page-guild {
    --adversary-panel-border: rgba(250,204,21,.27);
  }

  /* Sidebar becomes the dark/gold control rail from the mockups. */
  .adversary-sidebar {
    border-right-color: rgba(250,204,21,.20) !important;
    background:
      radial-gradient(circle at 54% 16%, rgba(250,204,21,.07), transparent 24%),
      linear-gradient(180deg, rgba(4,6,15,.94), rgba(2,6,23,.89)) !important;
    box-shadow: inset -1px 0 0 rgba(255,221,64,.05), 16px 0 42px rgba(0,0,0,.22);
  }

  .adversary-sidebar::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    opacity: .24;
    background-image:
      linear-gradient(30deg, rgba(250,204,21,.11) 12%, transparent 12.5%, transparent 87%, rgba(250,204,21,.11) 87.5%),
      linear-gradient(150deg, rgba(250,204,21,.11) 12%, transparent 12.5%, transparent 87%, rgba(250,204,21,.11) 87.5%);
    background-size: 48px 84px;
    -webkit-mask-image: linear-gradient(180deg, transparent, #000 28%, #000 78%, transparent);
    mask-image: linear-gradient(180deg, transparent, #000 28%, #000 78%, transparent);
  }

  .adversary-sidebar .adversary-menu-button {
    min-height: 48px;
    border-color: transparent !important;
    background: rgba(2,6,23,.34) !important;
    color: rgba(226,232,240,.88) !important;
    text-shadow: 0 1px 10px rgba(0,0,0,.65);
  }

  .adversary-sidebar .adversary-menu-button:hover {
    border-color: rgba(250,204,21,.24) !important;
    background: linear-gradient(90deg, rgba(250,204,21,.10), rgba(2,6,23,.42) 68%) !important;
    color: #fff !important;
  }

  .adversary-sidebar .adversary-menu-button.is-active {
    border-color: rgba(250,204,21,.64) !important;
    background:
      radial-gradient(circle at 12% 50%, rgba(255,221,64,.18), transparent 42%),
      linear-gradient(90deg, rgba(250,204,21,.12), rgba(2,6,23,.62) 68%) !important;
    color: #fff !important;
    box-shadow:
      inset 0 0 24px rgba(250,204,21,.06),
      0 0 18px rgba(250,204,21,.14) !important;
  }

  .adversary-sidebar .adversary-menu-button.is-active::before {
    width: 3px;
    background: rgb(255,221,64);
    box-shadow: 0 0 12px rgba(255,221,64,.85), 0 0 24px rgba(250,204,21,.40);
  }

  /* Orbs stay vivid but yield to navigation: JS physically repels them from
     menu buttons; this small depth cue makes close passes less distracting. */
  .adversary-sidebar-nav-zone {
    position: relative;
  }

  .adversary-sidebar-nav-zone::before {
    content: '';
    position: absolute;
    inset: -10px -8px;
    pointer-events: none;
    background: radial-gradient(ellipse at center, rgba(2,6,23,.20), transparent 74%);
    z-index: -1;
  }

  .adversary-sidebar-class-orb-shell {
    mix-blend-mode: screen;
  }

  /* Wider emblem-tech rail with labels and restored floating class orbs. */
  @media (min-width: 1024px) {
    .adversary-layout-grid {
      grid-template-columns: 220px minmax(0, 1fr) !important;
      min-height: 0 !important;
      align-items: stretch !important;
    }

    .adversary-site-artwork {
      padding-left: 220px !important;
    }

    .adversary-sidebar {
      width: 220px;
      height: auto !important;
      min-height: 0 !important;
      position: relative !important;
      top: auto !important;
      align-self: stretch !important;
      padding: 14px 12px 12px !important;
      align-items: center;
      border-right: 1px solid rgba(246,201,21,.22) !important;
      background:
        radial-gradient(circle at 50% 7%, rgba(246,201,21,.055), transparent 20%),
        linear-gradient(180deg, rgba(2,4,8,.985), rgba(2,4,7,.965)) !important;
      box-shadow:
        inset -1px 0 0 rgba(255,223,86,.055),
        12px 0 38px rgba(0,0,0,.34) !important;
    }

    .adversary-sidebar::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      opacity: .38;
      background-image:
        var(--adversary-tech-art),
        radial-gradient(circle at 18% 19%, rgba(255,220,64,.30) 0 1px, transparent 2px),
        radial-gradient(circle at 77% 42%, rgba(255,220,64,.24) 0 1px, transparent 2px),
        radial-gradient(ellipse at 44% 58%, rgba(193,116,8,.06), transparent 34%);
      background-size: 500px 196px, 150px 140px, 190px 165px, 100% 100%;
      background-position: 18% 5%, 10% 18%, 72% 48%, center;
      background-repeat: repeat, repeat, repeat, no-repeat;
      -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,.92), rgba(0,0,0,.70) 44%, rgba(0,0,0,.28) 78%, transparent 100%);
      mask-image: linear-gradient(180deg, rgba(0,0,0,.92), rgba(0,0,0,.70) 44%, rgba(0,0,0,.28) 78%, transparent 100%);
    }

    .adversary-sidebar::after {
      content: '';
      position: absolute;
      left: 6px;
      right: 6px;
      bottom: 48px;
      height: 270px;
      z-index: 1;
      pointer-events: none;
      opacity: .48;
      background-image:
        var(--adversary-tech-art),
        radial-gradient(circle at 23% 70%, rgba(255,215,47,.40) 0 1.4px, transparent 2.4px),
        radial-gradient(circle at 76% 44%, rgba(255,215,47,.28) 0 1.2px, transparent 2.2px),
        radial-gradient(ellipse at 52% 70%, rgba(166,96,6,.10), transparent 45%);
      background-size: 390px 153px, 130px 120px, 170px 150px, 100% 100%;
      background-position: 8% 50%, 14% 68%, 74% 42%, center;
      background-repeat: repeat, repeat, repeat, no-repeat;
      -webkit-mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,.34) 10%, #000 42%, rgba(0,0,0,.76) 84%, transparent 100%);
      mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,.34) 10%, #000 42%, rgba(0,0,0,.76) 84%, transparent 100%);
    }

    .adversary-sidebar > h1,
    .adversary-nodewars-submenu {
      display: none !important;
    }

    .adversary-sidebar-class-orbs {
      display: block !important;
      z-index: 2 !important;
      opacity: 1 !important;
    }

    .adversary-sidebar-nav-zone {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 0 0 auto !important;
      gap: 5px;
      padding-top: 0;
      z-index: 30;
    }

    .adversary-sidebar-nav-zone::before {
      display: none !important;
    }

    .adversary-sidebar-nav-zone > div {
      width: 100%;
      margin-bottom: 0 !important;
      display: flex;
      justify-content: center;
    }

    .adversary-sidebar .adversary-menu-button {
      width: 176px !important;
      min-width: 176px !important;
      min-height: 58px !important;
      padding: 5px 8px 6px !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      overflow: visible !important;
      border-radius: 14px !important;
      border: 1px solid transparent !important;
      background: rgba(3,5,7,.68) !important;
      color: rgba(246,201,21,.72) !important;
      box-shadow: inset 0 0 14px rgba(246,201,21,.02) !important;
      backdrop-filter: none !important;
    }

    .adversary-sidebar-nav-zone > div:first-child .adversary-menu-button {
      width: 176px !important;
      min-width: 176px !important;
      min-height: 70px !important;
      margin-bottom: 6px;
      border-radius: 16px !important;
      border-color: rgba(246,201,21,.52) !important;
      background:
        radial-gradient(circle at 50% 38%, rgba(255,218,55,.08), transparent 64%),
        rgba(1,3,5,.88) !important;
      box-shadow:
        inset 0 0 18px rgba(246,201,21,.045),
        0 0 16px rgba(246,201,21,.10) !important;
    }

    .adversary-sidebar .adversary-menu-button:hover {
      color: #ffd83e !important;
      border-color: rgba(246,201,21,.46) !important;
      background:
        radial-gradient(circle at 30% 32%, rgba(255,220,62,.11), transparent 48%),
        linear-gradient(135deg, rgba(45,35,8,.44), rgba(2,5,7,.90)) !important;
      box-shadow:
        inset 0 0 16px rgba(255,216,56,.035),
        0 0 12px rgba(246,201,21,.08) !important;
    }

    .adversary-sidebar .adversary-menu-button.is-active {
      border-color: rgba(255,218,58,.72) !important;
      color: #ffd83e !important;
      background:
        radial-gradient(circle at 28% 30%, rgba(255,220,62,.17), transparent 46%),
        linear-gradient(135deg, rgba(68,52,8,.66), rgba(4,6,7,.95)) !important;
      box-shadow:
        inset 0 0 20px rgba(255,216,56,.075),
        0 0 15px rgba(246,201,21,.14) !important;
    }

    .adversary-sidebar .adversary-menu-button.is-active::before {
      left: -9px;
      top: 14px;
      bottom: 14px;
      width: 2px;
      border-radius: 99px;
      background: #ffd83e;
      box-shadow: 0 0 9px rgba(255,216,56,.95), 0 0 18px rgba(246,201,21,.42);
    }

    .adversary-rail-active-dot {
      position: absolute;
      right: -7px;
      top: 50%;
      width: 5px;
      height: 5px;
      margin-top: -2.5px;
      border-radius: 999px;
      opacity: 0;
      pointer-events: none;
      background: #ffd83e;
      box-shadow: 0 0 7px rgba(255,216,56,.95), 0 0 14px rgba(246,201,21,.52);
      transition: opacity 140ms ease;
    }

    .adversary-menu-button.is-active .adversary-rail-active-dot {
      opacity: 1;
    }

    .adversary-sidebar-menu-icon {
      display: flex !important;
      align-items: center;
      justify-content: center;
      width: 32px !important;
      height: 32px !important;
      border: 0 !important;
      background: transparent !important;
      color: currentColor;
      flex: 0 0 auto;
    }

    .adversary-sidebar-nav-zone > div:first-child .adversary-sidebar-menu-icon {
      width: 46px !important;
      height: 46px !important;
      overflow: hidden !important;
      border-radius: 9px !important;
      background:
        radial-gradient(circle at 50% 42%, rgba(255,215,44,.10), transparent 70%),
        rgba(0,0,0,.30) !important;
    }

    .adversary-sidebar-nav-zone > div:first-child .adversary-sidebar-menu-icon img {
      width: 83px !important;
      min-width: 83px !important;
      max-width: none !important;
      height: 46px !important;
      object-fit: cover !important;
      object-position: center center !important;
      filter: saturate(1.16) contrast(1.08) drop-shadow(0 0 8px rgba(246,201,21,.28));
    }

    .adversary-sidebar-menu-label {
      display: block !important;
      width: 100%;
      text-align: center;
      font-size: 11px;
      line-height: 1.05;
      font-weight: 850;
      letter-spacing: .035em;
      text-shadow: 0 1px 8px rgba(0,0,0,.78);
      color: inherit;
    }

    .adversary-rail-tooltip {
      display: none !important;
    }

    .adversary-sidebar > .adversary-rail-bottom {
      width: 100%;
      margin-top: auto;
      display: flex;
      justify-content: center;
      padding-top: 14px !important;
      padding-bottom: 2px;
      z-index: 30;
    }

    .adversary-sidebar > .adversary-rail-bottom .adversary-menu-button {
      width: 176px !important;
      min-width: 176px !important;
      min-height: 56px !important;
      color: rgba(246,201,21,.72) !important;
      background: rgba(1,3,5,.72) !important;
    }

    /* Orbs move freely underneath the readable navigation layer. */
    .adversary-sidebar-class-orbs {
      display: block !important;
      z-index: 4 !important;
      opacity: 1 !important;
    }

    .adversary-sidebar-nav-zone,
    .adversary-sidebar > .adversary-rail-bottom {
      z-index: 30 !important;
    }

    .adversary-sidebar .adversary-menu-button {
      background-color: rgba(3,5,7,.50) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
  }

  body[data-adversary-page="nodewars"] .adversary-page-nodewars {
    overflow: hidden;
  }

  body[data-adversary-page="nodewars"] .adversary-page-brand.adversary-nodewars-brand {
    min-height: 94px;
    margin: 0 0 8px !important;
    padding: 0 6px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  body[data-adversary-page="nodewars"] .adversary-nodewars-brand::after {
    display: none !important;
  }

  body[data-adversary-page="nodewars"] .adversary-nodewars-brand-icon {
    border: 1px solid rgba(246,201,21,.55);
    background:
      radial-gradient(circle at 50% 35%, rgba(255,218,55,.14), transparent 66%),
      rgba(1,3,5,.82);
    box-shadow:
      inset 0 0 18px rgba(246,201,21,.055),
      0 0 13px rgba(246,201,21,.11);
  }

  body[data-adversary-page="nodewars"] .adversary-nodewars-brand-watermark {
    opacity: .18;
    filter: saturate(1.2) contrast(1.08) drop-shadow(0 0 34px rgba(246,201,21,.17));
    -webkit-mask-image: linear-gradient(180deg, #000 0, rgba(0,0,0,.94) 50%, transparent 100%);
    mask-image: linear-gradient(180deg, #000 0, rgba(0,0,0,.94) 50%, transparent 100%);
  }

  body[data-adversary-page="nodewars"] .adversary-nodewars-brand-grid {
    opacity: .32;
    background-image:
      linear-gradient(30deg, rgba(246,201,21,.10) 12%, transparent 12.5%, transparent 87%, rgba(246,201,21,.10) 87.5%),
      linear-gradient(150deg, rgba(246,201,21,.10) 12%, transparent 12.5%, transparent 87%, rgba(246,201,21,.10) 87.5%);
    background-size: 46px 80px;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 20%, #000 82%, transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 20%, #000 82%, transparent 100%);
  }

  body[data-adversary-page="nodewars"] .adversary-nodewars-brand-circuit {
    opacity: .48;
    background-image:
      linear-gradient(90deg, transparent 0 8%, rgba(246,201,21,.24) 8% 8.2%, transparent 8.2% 28%, rgba(246,201,21,.17) 28% 28.2%, transparent 28.2% 100%),
      linear-gradient(0deg, transparent 0 28%, rgba(246,201,21,.18) 28% 29%, transparent 29% 62%, rgba(246,201,21,.15) 62% 63%, transparent 63% 100%);
    background-size: 180px 100%, 100% 66px;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 24%, #000 100%);
    mask-image: linear-gradient(90deg, transparent, #000 24%, #000 100%);
  }

  @media (max-width: 1023px) {
    .adversary-page-brand {
      margin-top: 2px;
    }
  }
`;


const ALL_PAGES_NODEWARS_TECH_CSS = `
  /* Unified visual language for every page except Node Wars, which already owns
     its exact reference-match CSS. No calculations or page logic are changed. */
  :root,
  body:not([data-adversary-page="nodewars"]) .adversary-content {
    --tech-gold: #f2c216;
    --tech-gold-bright: #ffdc46;
    --tech-gold-rgb: 242, 194, 22;
    --tech-line: rgba(242, 194, 22, .36);
    --tech-line-hot: rgba(255, 218, 62, .74);
    --adversary-tech-art: url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%20560%20220'%3E%0A%3Cg%20fill%3D'none'%20stroke%3D'%23d9aa17'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%0A%20%20%3Cg%20stroke-width%3D'1'%20stroke-opacity%3D'.34'%3E%0A%20%20%20%20%3Cpolygon%20points%3D'44,20%2060,11%2076,20%2076,38%2060,47%2044,38'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'77,39%2090,31%20103,39%20103,54%2090,62%2077,54'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'18,74%2035,64%2052,74%2052,94%2035,104%2018,94'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'52,74%2069,64%2086,74%2086,94%2069,104%2052,94'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'86,74%20103,64%20120,74%20120,94%20103,104%2086,94'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'211,24%20230,13%20249,24%20249,46%20230,57%20211,46'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'246,60%20258,53%20270,60%20270,74%20258,81%20246,74'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'387,24%20415,8%20443,24%20443,56%20415,72%20387,56'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'420,70%20438,60%20456,70%20456,91%20438,101%20420,91'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'468,126%20493,112%20518,126%20518,155%20493,169%20468,155'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'267,142%20292,128%20317,142%20317,171%20292,185%20267,171'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'136,144%20151,135%20166,144%20166,162%20151,171%20136,162'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'93,166%20111,156%20129,166%20129,187%20111,197%2093,187'%2F%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3Cg%20stroke-width%3D'.8'%20stroke-opacity%3D'.18'%3E%0A%20%20%20%20%3Cpolygon%20points%3D'154,22%20162,17%20170,22%20170,31%20162,36%20154,31'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'170,31%20178,26%20186,31%20186,40%20178,45%20170,40'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'186,22%20194,17%20202,22%20202,31%20194,36%20186,31'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'325,91%20334,86%20343,91%20343,101%20334,106%20325,101'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'343,101%20352,96%20361,101%20361,111%20352,116%20343,111'%2F%3E%0A%20%20%20%20%3Cpolygon%20points%3D'361,91%20370,86%20379,91%20379,101%20370,106%20361,101'%2F%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3Cg%20stroke-width%3D'1.05'%20stroke-opacity%3D'.38'%3E%0A%20%20%20%20%3Cpath%20d%3D'M4%20130%20H50%20L62%20118%20H103%20L118%20103%20H151'%2F%3E%0A%20%20%20%20%3Cpath%20d%3D'M151%20103%20H186%20L198%2091%20H230'%2F%3E%0A%20%20%20%20%3Cpath%20d%3D'M336%2036%20H365%20L379%2050%20H411'%2F%3E%0A%20%20%20%20%3Cpath%20d%3D'M443%2056%20H484%20L496%2068%20H548'%2F%3E%0A%20%20%20%20%3Cpath%20d%3D'M10%20203%20H62%20L78%20187%20H111'%2F%3E%0A%20%20%20%20%3Cpath%20d%3D'M166%20153%20H204%20L219%20168%20H256'%2F%3E%0A%20%20%20%20%3Cpath%20d%3D'M317%20156%20H354%20L370%20140%20H415%20L431%20124%20H461'%2F%3E%0A%20%20%20%20%3Cpath%20d%3D'M493%20169%20V190%20H536'%2F%3E%0A%20%20%3C%2Fg%3E%0A%3C%2Fg%3E%0A%3Cg%20fill%3D'%23e5b61d'%3E%0A%20%20%3Cg%20fill-opacity%3D'.62'%3E%0A%20%20%20%20%3Ccircle%20cx%3D'4'%20cy%3D'130'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'50'%20cy%3D'130'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'103'%20cy%3D'118'%20r%3D'1.7'%2F%3E%0A%20%20%20%20%3Ccircle%20cx%3D'151'%20cy%3D'103'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'198'%20cy%3D'91'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'230'%20cy%3D'91'%20r%3D'1.7'%2F%3E%0A%20%20%20%20%3Ccircle%20cx%3D'336'%20cy%3D'36'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'411'%20cy%3D'50'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'548'%20cy%3D'68'%20r%3D'1.7'%2F%3E%0A%20%20%20%20%3Ccircle%20cx%3D'10'%20cy%3D'203'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'111'%20cy%3D'187'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'166'%20cy%3D'153'%20r%3D'1.7'%2F%3E%0A%20%20%20%20%3Ccircle%20cx%3D'256'%20cy%3D'168'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'317'%20cy%3D'156'%20r%3D'1.7'%2F%3E%3Ccircle%20cx%3D'461'%20cy%3D'124'%20r%3D'1.7'%2F%3E%0A%20%20%20%20%3Ccircle%20cx%3D'536'%20cy%3D'190'%20r%3D'1.7'%2F%3E%0A%20%20%3C%2Fg%3E%0A%20%20%3Cg%20fill-opacity%3D'.18'%3E%0A%20%20%20%20%3Ccircle%20cx%3D'145'%20cy%3D'57'%20r%3D'2.2'%2F%3E%3Ccircle%20cx%3D'282'%20cy%3D'36'%20r%3D'1.6'%2F%3E%3Ccircle%20cx%3D'382'%20cy%3D'113'%20r%3D'2.4'%2F%3E%0A%20%20%20%20%3Ccircle%20cx%3D'535'%20cy%3D'28'%20r%3D'1.8'%2F%3E%3Ccircle%20cx%3D'241'%20cy%3D'199'%20r%3D'2.1'%2F%3E%3Ccircle%20cx%3D'69'%20cy%3D'151'%20r%3D'1.5'%2F%3E%0A%20%20%3C%2Fg%3E%0A%3C%2Fg%3E%0A%3C%2Fsvg%3E");
  }

  /* Use the same compact open header composition as Node Wars on every page. */
  .adversary-page-brand.adversary-tech-brand {
    min-height: 94px;
    margin: 0 0 8px !important;
    padding: 0 6px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .adversary-page-brand.adversary-tech-brand::after { display: none !important; }

  .adversary-page-brand.adversary-tech-brand .adversary-nodewars-brand-icon {
    border: 1px solid rgba(246,201,21,.55);
    background: radial-gradient(circle at 50% 35%, rgba(255,218,55,.14), transparent 66%), rgba(1,3,5,.82);
    box-shadow: inset 0 0 18px rgba(246,201,21,.055), 0 0 13px rgba(246,201,21,.11);
  }

  .adversary-page-brand.adversary-tech-brand .adversary-nodewars-brand-watermark {
    opacity: .18;
    filter: saturate(1.2) contrast(1.08) drop-shadow(0 0 34px rgba(246,201,21,.17));
    -webkit-mask-image: linear-gradient(180deg, #000 0, rgba(0,0,0,.94) 50%, transparent 100%);
    mask-image: linear-gradient(180deg, #000 0, rgba(0,0,0,.94) 50%, transparent 100%);
  }

  .adversary-page-brand.adversary-tech-brand .adversary-nodewars-brand-grid {
    opacity: .32;
    background-image:
      linear-gradient(30deg, rgba(246,201,21,.10) 12%, transparent 12.5%, transparent 87%, rgba(246,201,21,.10) 87.5%),
      linear-gradient(150deg, rgba(246,201,21,.10) 12%, transparent 12.5%, transparent 87%, rgba(246,201,21,.10) 87.5%);
    background-size: 46px 80px;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 20%, #000 82%, transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 20%, #000 82%, transparent 100%);
  }

  .adversary-page-brand.adversary-tech-brand .adversary-nodewars-brand-circuit {
    opacity: .48;
    background-image:
      linear-gradient(90deg, transparent 0 8%, rgba(246,201,21,.24) 8% 8.2%, transparent 8.2% 28%, rgba(246,201,21,.17) 28% 28.2%, transparent 28.2% 100%),
      linear-gradient(0deg, transparent 0 28%, rgba(246,201,21,.18) 28% 29%, transparent 29% 62%, rgba(246,201,21,.15) 62% 63%, transparent 63% 100%);
    background-size: 180px 100%, 100% 66px;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 24%, #000 100%);
    mask-image: linear-gradient(90deg, transparent, #000 24%, #000 100%);
  }

  /* Major panels copy the Node Wars black-metal surface, gold edge and the
     exact hex / connected-circuit texture used inside its cards. */
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(
    .adversary-color-panel,
    .monthly-guild-panel,
    .overview-guild-panel,
    .player-stats-guild-panel,
    .player-stats-section-shell,
    .player-stats-enemy-panel,
    .player-stats-targets-panel,
    .player-stats-match-panel,
    .player-comparison-panel,
    .adversary-panel
  ) {
    position: relative !important;
    isolation: isolate;
    overflow: hidden;
    border-color: rgba(var(--tech-gold-rgb), .42) !important;
    background-color: rgba(3,5,6,.76) !important;
    background-image:
      radial-gradient(ellipse at 12% -18%, rgba(var(--adversary-panel-accent-rgb, 242,194,22), .18), transparent 48%),
      radial-gradient(ellipse at 92% 118%, rgba(var(--adversary-panel-accent-rgb, 242,194,22), .055), transparent 38%),
      var(--adversary-tech-art),
      radial-gradient(circle at 10% 28%, rgba(255,210,52,.075) 0 1px, transparent 2px),
      radial-gradient(circle at 82% 66%, rgba(255,205,39,.06) 0 1px, transparent 2px),
      linear-gradient(180deg, rgba(8,9,8,.76), rgba(2,4,5,.79)) !important;
    background-size: 100% 100%, 100% 100%, 650px 255px, 190px 155px, 250px 195px, 100% 100% !important;
    background-position: center, center, 0 50%, 8% 24%, 80% 68%, center !important;
    background-repeat: no-repeat, no-repeat, repeat, repeat, repeat, no-repeat !important;
    box-shadow:
      inset 0 1px 0 rgba(255,232,125,.035),
      inset 0 0 26px rgba(var(--tech-gold-rgb),.018),
      0 8px 22px rgba(0,0,0,.26) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  body:not([data-adversary-page="nodewars"]) .adversary-content :is(
    .adversary-color-panel, .monthly-guild-panel, .overview-guild-panel,
    .player-stats-guild-panel, .player-stats-section-shell, .player-stats-enemy-panel,
    .player-stats-targets-panel, .player-stats-match-panel, .player-comparison-panel, .adversary-panel
  ):hover {
    border-color: rgba(var(--tech-gold-rgb), .72) !important;
    box-shadow: inset 0 0 30px rgba(var(--tech-gold-rgb),.026), 0 0 13px rgba(var(--tech-gold-rgb),.07), 0 10px 24px rgba(0,0,0,.28) !important;
  }

  /* Compact stat tiles: preserve their semantic icon/value colours, but use
     the same gold frame and embedded circuit texture as Node Wars. */
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(
    .adversary-stat-panel, .overview-battle-metric, .player-stats-summary-card, .monthly-panel-subtle
  ) {
    position: relative !important;
    overflow: hidden !important;
    border: 1px solid rgba(var(--tech-gold-rgb), .34) !important;
    border-radius: 13px !important;
    background-color: rgba(3,5,6,.79) !important;
    background-image:
      radial-gradient(ellipse at 16% -6%, rgba(var(--adversary-panel-accent-rgb, 6,182,212), .20), transparent 55%),
      radial-gradient(ellipse at 88% 118%, rgba(var(--adversary-panel-accent-rgb, 6,182,212), .055), transparent 42%),
      var(--adversary-tech-art),
      linear-gradient(145deg, rgba(13,13,11,.76), rgba(2,5,6,.79)) !important;
    background-size: 100% 100%, 100% 100%, 360px 142px, 100% 100% !important;
    background-position: center, center, 12% 50%, center !important;
    background-repeat: no-repeat, no-repeat, repeat, no-repeat !important;
    box-shadow: inset 0 0 22px rgba(var(--adversary-panel-accent-rgb, 6,182,212),.018), 0 7px 18px rgba(0,0,0,.22) !important;
  }

  body:not([data-adversary-page="nodewars"]) .adversary-content .adversary-stat-panel:hover {
    border-color: rgba(var(--tech-gold-rgb), .60) !important;
    transform: translateY(-1px);
  }

  /* Hall of Fame uses custom PremiumPanel/PageFrame components rather than the
     shared page panel classes, so give every large bordered Hall surface the
     same treatment. */
  body[data-adversary-page="hall"] .adversary-content .adversary-tech-hall-page,
  body[data-adversary-page="hall"] .adversary-content .adversary-tech-hall-page :is(section,article,div)[class*="rounded"][class*="border"] {
    border-color: rgba(var(--tech-gold-rgb), .38) !important;
    background-color: rgba(3,5,6,.70) !important;
    background-image:
      radial-gradient(ellipse at 14% -12%, rgba(var(--adversary-panel-accent-rgb, 250,204,21), .15), transparent 48%),
      var(--adversary-tech-art),
      linear-gradient(180deg, rgba(8,9,8,.73), rgba(2,4,5,.77)) !important;
    background-size: 100% 100%, 620px 244px, 100% 100% !important;
    background-position: center, 0 50%, center !important;
    background-repeat: no-repeat, repeat, no-repeat !important;
    box-shadow: inset 0 1px 0 rgba(255,232,125,.03), 0 8px 22px rgba(0,0,0,.24) !important;
  }

  /* The Guild page's dynamically generated cards and tier rows keep their
     semantic values, while their shells follow the same Node Wars metalwork. */
  body[data-adversary-page="guild"] .adversary-content .adversary-tech-guild-page :is(section,article,div)[class*="rounded"][class*="border"] {
    border-color: rgba(var(--tech-gold-rgb), .36) !important;
  }

  /* Controls / tabs / selectors. */
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(button,select,input,textarea)[class*="border"] {
    border-color: rgba(var(--tech-gold-rgb), .34) !important;
    background-color: rgba(2,4,5,.84) !important;
    color: #eee7d3 !important;
    box-shadow: inset 0 1px 0 rgba(255,231,124,.02) !important;
  }

  body:not([data-adversary-page="nodewars"]) .adversary-content :is(button,select,input,textarea)[class*="border"]:hover,
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(select,input,textarea)[class*="border"]:focus {
    border-color: rgba(var(--tech-gold-rgb), .72) !important;
    box-shadow: inset 0 0 12px rgba(var(--tech-gold-rgb),.035), 0 0 11px rgba(var(--tech-gold-rgb),.065) !important;
  }

  body:not([data-adversary-page="nodewars"]) .adversary-content select option {
    background: #040505;
    color: #eee7d3;
  }

  /* Tables / rankings / long lists. */
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(thead,.player-stats-table-header,.monthly-guild-ranking-header) {
    border-color: rgba(var(--tech-gold-rgb), .30) !important;
    background: linear-gradient(180deg, rgba(18,15,6,.82), rgba(3,5,6,.94)) !important;
    color: #e9d995 !important;
  }

  body:not([data-adversary-page="nodewars"]) .adversary-content tbody tr {
    border-color: rgba(var(--tech-gold-rgb), .11) !important;
    background-color: rgba(2,4,5,.34) !important;
  }

  body:not([data-adversary-page="nodewars"]) .adversary-content tbody tr:hover {
    background-color: rgba(var(--tech-gold-rgb), .035) !important;
  }

  /* Section dividers and headings use Node Wars' muted gold typography. */
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(.monthly-section-header,.overview-section-header,.player-stats-table-header) {
    border-color: rgba(var(--tech-gold-rgb), .22) !important;
  }

  body:not([data-adversary-page="nodewars"]) .adversary-content :is(.monthly-section-header,.overview-section-header) h1,
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(.monthly-section-header,.overview-section-header) h2,
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(.monthly-section-header,.overview-section-header) h3 {
    color: #f6e7aa !important;
  }

  body:not([data-adversary-page="nodewars"]) .adversary-content :is(.text-slate-500,.text-slate-600) {
    color: #837f70 !important;
  }

  /* Gold corner cut used by Node Wars rows, applied only to large panels so
     tiny buttons/chips are not overloaded. */
  body:not([data-adversary-page="nodewars"]) .adversary-content .adversary-color-panel::after {
    content: '';
    position: absolute !important;
    left: 0;
    top: 0;
    width: 18px;
    height: 18px;
    z-index: 8;
    pointer-events: none;
    background: linear-gradient(135deg, #ffdd43 0 40%, rgba(var(--tech-gold-rgb),.30) 41% 55%, transparent 56%);
    filter: drop-shadow(0 0 6px rgba(var(--tech-gold-rgb),.18));
  }

  /* Prevent legacy page CSS from painting large blue/purple shell backgrounds
     over the unified techno theme. */
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(.monthly-recap-guild-style,.overview-guild-page,.player-stats-page,.adversary-tech-guild-page,.adversary-tech-hall-page,.adversary-tech-rawlog-page) {
    background: transparent !important;
  }

  /* Remove old page-level wrappers so content reads like the open Node Wars scene. */
  body[data-adversary-page="hall"] .adversary-content .adversary-tech-hall-page {
    padding: 0 !important;
    overflow: visible !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  body[data-adversary-page="players"] .adversary-content .adversary-tech-player-page {
    padding: 0 !important;
  }

  /* The compact app header is now the page title; keep native contextual
     subtitles/filters, but remove duplicate page-name headings. */
  body[data-adversary-page="monthly"] .adversary-tech-monthly-page > .flex:first-of-type h1,
  body[data-adversary-page="players"] .adversary-tech-player-page > h2 {
    display: none !important;
  }

  /* Controls use the exact dark/gold treatment rather than retaining old
     blue/violet background images from individual page styles. */
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(button,select,input,textarea)[class*="border"] {
    background-image: linear-gradient(180deg, rgba(12,12,9,.96), rgba(2,4,5,.98)) !important;
  }

  /* Raw Logs has several legacy slate cards without borders. Pull those into
     the same panel family without changing any editor actions. */
  body[data-adversary-page="raw"] .adversary-tech-rawlog-page :is(div,details)[class*="rounded"][class*="bg-slate"] {
    border: 1px solid rgba(var(--tech-gold-rgb), .28) !important;
    background-color: rgba(3,5,6,.88) !important;
    background-image: var(--adversary-tech-art), linear-gradient(180deg, rgba(8,9,8,.90), rgba(2,4,5,.93)) !important;
    background-size: 520px 205px, 100% 100% !important;
    background-repeat: repeat, no-repeat !important;
  }

  /* Ranking/tab strips get the same slim gold dividers as the Node Wars
     filter strip instead of thick coloured blocks. */
  body:not([data-adversary-page="nodewars"]) .adversary-content :is(
    .monthly-guild-ranking-header, .player-stats-table-header, [role="tablist"]
  ) {
    border-color: rgba(var(--tech-gold-rgb), .28) !important;
    box-shadow: inset 0 -1px 0 rgba(var(--tech-gold-rgb), .08) !important;
  }



  /* Hall of Fame top tabs: 50% semantic colour when idle, full-intensity when selected. */
  body[data-adversary-page="hall"] .adversary-content .hall-header-card {
    position: relative !important;
    isolation: isolate;
    overflow: hidden;
    border-color: rgba(var(--hall-accent-rgb), .74) !important;
    background-color: rgba(2,4,5,.72) !important;
    background-image:
      var(--adversary-tech-art),
      linear-gradient(145deg, rgba(5,8,10,.38), rgba(2,4,5,.72)) !important;
    background-size: 420px 165px, 100% 100% !important;
    background-position: 12% 50%, center !important;
    background-repeat: repeat, no-repeat !important;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.10),
      inset 0 0 30px rgba(var(--hall-accent-rgb), .20),
      0 8px 20px rgba(0,0,0,.22) !important;
  }

  body[data-adversary-page="hall"] .adversary-content .hall-header-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(ellipse at 15% 4%, rgba(var(--hall-accent-rgb), .92), rgba(var(--hall-accent-rgb), .60) 35%, rgba(var(--hall-accent-rgb), .26) 70%, transparent 92%),
      linear-gradient(120deg, rgba(var(--hall-accent-rgb), .56), rgba(var(--hall-accent-rgb), .28) 58%, transparent 100%);
    opacity: .50;
    transition: opacity 160ms ease, filter 160ms ease;
  }

  body[data-adversary-page="hall"] .adversary-content .hall-header-card > div:first-child {
    z-index: 1;
  }

  body[data-adversary-page="hall"] .adversary-content .hall-header-card > div:last-child {
    position: relative;
    z-index: 2;
  }

  body[data-adversary-page="hall"] .adversary-content .hall-header-card:hover::before {
    opacity: .72;
  }

  body[data-adversary-page="hall"] .adversary-content .hall-header-card[aria-pressed="true"] {
    border-color: rgba(var(--hall-accent-rgb), 1) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.14),
      inset 0 0 42px rgba(var(--hall-accent-rgb), .36),
      0 0 24px rgba(var(--hall-accent-rgb), .28),
      0 10px 24px rgba(0,0,0,.24) !important;
  }

  body[data-adversary-page="hall"] .adversary-content .hall-header-card[aria-pressed="true"]::before {
    opacity: .96;
    filter: saturate(1.12) brightness(1.03);
  }

  @media (max-width: 1023px) {
    .adversary-page-brand.adversary-tech-brand { min-height: 82px; }
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

const PAGE_SUBTITLES = {
  guild: 'Guild',
  monthly: 'Node Wars Performance Overview',
  nodewars: 'Guild Warfare Analytics',
  overview: 'Battle Analytics',
  players: 'Player Performance Analytics',
  hall: 'Elite Records & Milestones',
  raw: 'Battle Log Operations',
};

const NODEWARS_RAIL_ICONS = Object.freeze({
  monthly: BarChart3,
  nodewars: MenuSwords,
  overview: Shield,
  players: UsersRound,
  hall: Trophy,
  raw: Settings,
});

const SIDEBAR_STANDARD_CLASS_ORB_SIZE = 68;

const SIDEBAR_CLASS_ORBS = Object.freeze([
  {
    id: 'archer',
    name: 'Archer',
    src: classOrbArcher,
    className: 'is-red',
    glow: '239, 68, 68',
    accent: '222, 241, 43',
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
    accent: '211, 32, 29',
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
    accent: '30, 195, 193',
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
    accent: '222, 83, 196',
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
    accent: '202, 26, 19',
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
    accent: '28, 139, 222',
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
    accent: '140, 62, 235',
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
    accent: '114, 173, 203',
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
    accent: '240, 192, 97',
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
    accent: '215, 77, 178',
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
    accent: '226, 58, 60',
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
    accent: '230, 112, 148',
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
    accent: '134, 177, 235',
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
    accent: '229, 84, 48',
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
    accent: '73, 174, 228',
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
    accent: '167, 6, 24',
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
    accent: '138, 188, 227',
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
    accent: '40, 157, 27',
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
    accent: '230, 167, 37',
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
    accent: '247, 207, 28',
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
    accent: '146, 38, 40',
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
    id: 'agent',
    name: 'Agent',
    src: classOrbAgent,
    className: 'is-extra',
    glow: '99, 102, 241',
    accent: '236, 72, 153',
    startX: 0.20,
    startY: 0.89,
    size: SIDEBAR_STANDARD_CLASS_ORB_SIZE,
    opacity: 0.60,
    duration: '8.95s',
    delay: '-6.75s',
    velocityX: -0.25,
    velocityY: -0.20,
    gravity: 0.0011,
    drift: 0.0092,
    driftSpeed: 0.000710,
    maxSpeed: 1.82,
    pointerRadius: 160,
    pointerForce: 0.52,
    pointerCarry: 0.045,
    phase: 24.88,
  },
  {
    id: 'shai',
    name: 'Shai',
    src: classOrbShai,
    className: 'is-extra',
    glow: '239, 68, 68',
    accent: '9, 166, 90',
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
    accent: '207, 69, 243',
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
    accent: '228, 110, 15',
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
    accent: '121, 157, 211',
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
    accent: '158, 178, 214',
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
    accent: '226, 16, 8',
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
    accent: '60, 209, 210',
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
    accent: '246, 160, 70',
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
    accent: '168, 66, 233',
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
    accent: '160, 29, 23',
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

const PLAYER_CLASS_ICON_BY_NAME = Object.freeze(
  Object.fromEntries(
    SIDEBAR_CLASS_ORBS.map(({ name, src }) => [name, src]),
  ),
);

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
  { key: 'killStreak', label: 'Kill Streak', rgb: '251, 113, 133' },
  { key: 'killFeed', label: 'Kill Feed', rgb: '249, 115, 22' },
  { key: 'damageDealt', label: 'Damage Dealt', rgb: '6, 182, 212' },
  { key: 'damageTaken', label: 'Damage Taken', rgb: '236, 72, 153' },
  { key: 'ccHits', label: 'CC Hits', rgb: '139, 92, 246' },
  { key: 'fortDamage', label: 'Fort Damage', rgb: '245, 158, 11' },
]);

const CLASS_KD_METRIC = Object.freeze({
  key: 'kd',
  label: 'K/D',
  rgb: '34, 197, 94',
});

const CLASS_COMBINED_FEED_METRIC = Object.freeze({
  key: 'killStreakFeed',
  label: 'Kill Streak / Kill Feed',
  rgb: '249, 115, 22',
  combined: true,
});

// Keep Class Overall and Player Statistics at eight cards by combining
// Kill Streak and Kill Feed into the same compact panel.
const CLASS_STATS_DISPLAY_METRICS = Object.freeze([
  CLASS_KD_METRIC,
  CLASS_STATS_METRICS.find(({ key }) => key === 'kills'),
  CLASS_STATS_METRICS.find(({ key }) => key === 'deaths'),
  CLASS_COMBINED_FEED_METRIC,
  ...CLASS_STATS_METRICS.filter(
    ({ key }) => !['kills', 'deaths', 'killStreak', 'killFeed'].includes(key),
  ),
]);

const CLASS_RANKING_METRICS = Object.freeze([
  CLASS_KD_METRIC,
  ...CLASS_STATS_METRICS,
]);

const CLASS_PLAYER_METRIC_LAYOUT = CLASS_STATS_DISPLAY_METRICS;

function normalizeRosterPlayerKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getClassPlayerShade(rgbText, index) {
  const channels = String(rgbText || '250, 204, 21')
    .split(',')
    .map((value) => Math.max(0, Math.min(255, Number(value) || 0)))
    .slice(0, 3);
  const shadeSteps = [-0.18, -0.10, -0.03, 0.05, 0.12, 0.20, 0.27];
  const shade = shadeSteps[index % shadeSteps.length];

  return channels
    .map((channel) =>
      Math.round(
        shade >= 0
          ? channel + (255 - channel) * shade
          : channel * (1 + shade),
      ),
    )
    .join(', ');
}

function formatClassStatNumber(value, maximumFractionDigits = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '—';

  const absolute = Math.abs(number);

  if (absolute >= 1_000_000) {
    const compactValue = number / 1_000_000;
    const compactDigits = Math.abs(compactValue) >= 100 ? 0 : Math.abs(compactValue) >= 10 ? 1 : 2;

    return `${new Intl.NumberFormat(undefined, {
      maximumFractionDigits: compactDigits,
      minimumFractionDigits: 0,
    }).format(compactValue)}M`;
  }

  if (absolute >= 1_000) {
    const compactValue = number / 1_000;
    const compactDigits = Math.abs(compactValue) >= 100 ? 0 : Math.abs(compactValue) >= 10 ? 1 : 2;

    return `${new Intl.NumberFormat(undefined, {
      maximumFractionDigits: compactDigits,
      minimumFractionDigits: 0,
    }).format(compactValue)}K`;
  }

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

function buildOverviewPlayerClassMap(logs) {
  const classOrbByName = new Map(
    SIDEBAR_CLASS_ORBS.map((orb) => [orb.name, orb]),
  );
  const assignments = new Map();

  (Array.isArray(logs) ? logs : []).forEach((log, logIndex) => {
    const date = String(dateOf(log) || '').trim();
    const chronology = `${date || '0000-00-00'}@@${String(logIndex).padStart(6, '0')}`;

    classRowsForLog(log).forEach((row, rowIndex) => {
      const playerKey = normalizeRosterPlayerKey(row.player);
      const className = normalizeClassName(row.className || row.class);
      const orb = classOrbByName.get(className);

      if (!playerKey || !orb) return;

      const rowChronology = `${chronology}@@${String(rowIndex).padStart(6, '0')}`;
      const previous = assignments.get(playerKey);

      if (!previous || rowChronology >= previous.chronology) {
        assignments.set(playerKey, {
          src: orb.src,
          className,
          mode: row.mode === 'Awakening' ? 'Awakening' : 'Succession',
          chronology: rowChronology,
        });
      }
    });
  });

  return Object.fromEntries(
    [...assignments.entries()].map(([playerKey, assignment]) => [
      playerKey,
      {
        src: assignment.src,
        className: assignment.className,
        mode: assignment.mode,
      },
    ]),
  );
}

function buildMonthlyPlayerClassMap(logs) {
  const classOrbByName = new Map(
    SIDEBAR_CLASS_ORBS.map((orb) => [orb.name, orb]),
  );
  const players = new Map();

  (Array.isArray(logs) ? logs : []).forEach((log, logIndex) => {
    const date = String(dateOf(log) || '').trim();
    const chronology = `${date || '0000-00-00'}@@${String(logIndex).padStart(6, '0')}`;

    classRowsForLog(log).forEach((row, rowIndex) => {
      const playerKey = normalizeRosterPlayerKey(row.player);
      const className = normalizeClassName(row.className || row.class);
      const orb = classOrbByName.get(className);

      if (!playerKey || !orb) return;

      if (!players.has(playerKey)) {
        players.set(playerKey, new Map());
      }

      const byClass = players.get(playerKey);
      const rowChronology = `${chronology}@@${String(rowIndex).padStart(6, '0')}`;
      const current = byClass.get(className);

      if (!current) {
        byClass.set(className, {
          src: orb.src,
          className,
          mode: row.mode === 'Awakening' ? 'Awakening' : 'Succession',
          count: 1,
          chronology: rowChronology,
        });
        return;
      }

      current.count += 1;

      if (rowChronology >= current.chronology) {
        current.mode =
          row.mode === 'Awakening' ? 'Awakening' : 'Succession';
        current.chronology = rowChronology;
      }
    });
  });

  return Object.fromEntries(
    [...players.entries()].map(([playerKey, byClass]) => [
      playerKey,
      [...byClass.values()]
        .sort(
          (a, b) =>
            b.count - a.count ||
            String(b.chronology).localeCompare(String(a.chronology)) ||
            a.className.localeCompare(b.className),
        )
        .map(({ src, className, mode }) => ({
          src,
          className,
          mode,
        })),
    ]),
  );
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
  const [selectedClassMode, setSelectedClassMode] = useState(null);
  const [classRankingMetric, setClassRankingMetric] = useState('kills');
  const [classRankingSort, setClassRankingSort] = useState({
    key: 'average',
    direction: 'desc',
  });

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
    const classModeRecords = new Map();
    const recentModeRecords = new Map();
    const usageByRosterPlayer = new Map();

    const createMetricTotals = () =>
      Object.fromEntries(CLASS_STATS_METRICS.map(({ key }) => [key, 0]));
    const createMetricBest = () =>
      Object.fromEntries(CLASS_STATS_METRICS.map(({ key }) => [key, null]));
    const createMetricCounts = () =>
      Object.fromEntries(CLASS_STATS_METRICS.map(({ key }) => [key, 0]));

    const createPlayerRecord = (playerKey, playerName) => ({
      key: playerKey,
      name: playerName,
      wars: 0,
      succession: 0,
      awakening: 0,
      statsWars: 0,
      kdSum: 0,
      kdWarCount: 0,
      bestKd: null,
      totals: createMetricTotals(),
      best: createMetricBest(),
      metricWarCounts: createMetricCounts(),
    });

    const ensureRecentModeRecord = (className, mode) => {
      const key = `${className}@@${mode}`;

      if (!recentModeRecords.has(key)) {
        recentModeRecords.set(key, {
          className,
          mode,
          appearances: 0,
          playerKeys: new Set(),
          warIds: new Set(),
          kdSum: 0,
          kdWarCount: 0,
          bestKd: null,
          totals: createMetricTotals(),
          best: createMetricBest(),
          metricWarCounts: createMetricCounts(),
        });
      }

      return recentModeRecords.get(key);
    };

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

    const ensureClassModeRecord = (className, mode) => {
      const key = `${className}@@${mode}`;

      if (!classModeRecords.has(key)) {
        classModeRecords.set(key, {
          className,
          mode,
          playerKeys: new Set(),
          players: new Map(),
          appearances: 0,
          succession: 0,
          awakening: 0,
        });
      }

      return classModeRecords.get(key);
    };

    const applyMetricValues = (record, metricValues) => {
      CLASS_STATS_METRICS.forEach(({ key }) => {
        const value = metricValues[key];
        if (!Number.isFinite(value)) return;

        record.totals[key] += value;
        record.metricWarCounts[key] += 1;
        record.best[key] =
          record.best[key] == null ? value : Math.max(record.best[key], value);
      });

      const warKills = metricValues.kills;
      const warDeaths = metricValues.deaths;

      if (Number.isFinite(warKills) && Number.isFinite(warDeaths)) {
        const warKd = warDeaths > 0 ? warKills / warDeaths : warKills;
        record.kdSum += warKd;
        record.kdWarCount += 1;
        record.bestKd =
          record.bestKd == null ? warKd : Math.max(record.bestKd, warKd);
      }
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
      const streakByPlayer = new Map(
        Object.entries(perWarStats.st || {}).map(([name, value]) => [
          normalizeRosterPlayerKey(name),
          value,
        ]),
      );
      const killFeedByPlayer = new Map(
        Object.entries(perWarStats.fd || {}).map(([name, value]) => [
          normalizeRosterPlayerKey(name),
          value,
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
        const classModeRecord = ensureClassModeRecord(className, mode);
        classRecord.playerKeys.add(playerKey);
        classRecord.appearances += 1;
        classRecord[mode === 'Awakening' ? 'awakening' : 'succession'] += 1;
        classModeRecord.playerKeys.add(playerKey);
        classModeRecord.appearances += 1;
        classModeRecord[mode === 'Awakening' ? 'awakening' : 'succession'] += 1;

        const recentModeRecord = isRecent
          ? ensureRecentModeRecord(className, mode)
          : null;

        if (recentModeRecord) {
          recentModeRecord.appearances += 1;
          recentModeRecord.playerKeys.add(playerKey);
          recentModeRecord.warIds.add(logId);
        }

        if (!classRecord.players.has(playerKey)) {
          classRecord.players.set(
            playerKey,
            createPlayerRecord(playerKey, rosterPlayer.name),
          );
        }

        if (!classModeRecord.players.has(playerKey)) {
          classModeRecord.players.set(
            playerKey,
            createPlayerRecord(playerKey, rosterPlayer.name),
          );
        }

        const playerRecord = classRecord.players.get(playerKey);
        const modePlayerRecord = classModeRecord.players.get(playerKey);
        playerRecord.wars += 1;
        playerRecord[mode === 'Awakening' ? 'awakening' : 'succession'] += 1;
        modePlayerRecord.wars += 1;
        modePlayerRecord[mode === 'Awakening' ? 'awakening' : 'succession'] += 1;

        const playerStats = statsByPlayer.get(playerKey);
        const metricValues = Object.fromEntries(
          CLASS_STATS_METRICS.map(({ key }) => {
            let rawValue;

            if (key === 'killStreak') {
              rawValue = streakByPlayer.has(playerKey)
                ? streakByPlayer.get(playerKey)
                : playerStats?.killStreak ??
                  playerStats?.killstreak ??
                  playerStats?.streak ??
                  playerStats?.maxKillStreak;
            } else if (key === 'killFeed') {
              rawValue = killFeedByPlayer.has(playerKey)
                ? killFeedByPlayer.get(playerKey)
                : playerStats?.killFeed;
            } else {
              rawValue = playerStats?.[key];
            }

            const value = Number(rawValue);
            return [key, Number.isFinite(value) ? value : null];
          }),
        );
        const hasMetricValues = Object.values(metricValues).some((value) =>
          Number.isFinite(value),
        );

        if (hasMetricValues) {
          playerRecord.statsWars += 1;
          modePlayerRecord.statsWars += 1;
          applyMetricValues(playerRecord, metricValues);
          applyMetricValues(modePlayerRecord, metricValues);

          if (recentModeRecord) {
            applyMetricValues(recentModeRecord, metricValues);
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

    const buildClassEntry = (orb, record, mode = null) => {
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
      const kd = totals.deaths > 0 ? totals.kills / totals.deaths : totals.kills;
      const averageKd = totalKdWarCount > 0 ? totalKdSum / totalKdWarCount : null;
      const bestKdValues = players
        .map((player) => player.bestKd)
        .filter((value) => Number.isFinite(Number(value)))
        .map(Number);
      const bestKd = bestKdValues.length > 0 ? Math.max(...bestKdValues) : null;

      return {
        ...orb,
        mode,
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
    };

    const classBreakdown = SIDEBAR_CLASS_ORBS.map((orb) =>
      buildClassEntry(orb, classRecords.get(orb.name)),
    );

    const classModeBreakdown = SIDEBAR_CLASS_ORBS.flatMap((orb) =>
      ['Succession', 'Awakening'].map((mode) =>
        buildClassEntry(
          orb,
          classModeRecords.get(`${orb.name}@@${mode}`),
          mode,
        ),
      ),
    );

    const modeRankings = SIDEBAR_CLASS_ORBS.flatMap((orb) =>
      ['Succession', 'Awakening'].map((mode) => {
        const record = recentModeRecords.get(`${orb.name}@@${mode}`);

        if (!record || record.appearances <= 0) return null;

        const kd =
          record.totals.deaths > 0
            ? record.totals.kills / record.totals.deaths
            : record.totals.kills;

        return {
          id: `${orb.id}-${mode.toLowerCase()}`,
          className: orb.name,
          mode,
          orb,
          appearances: record.appearances,
          playerCount: record.playerKeys.size,
          warCount: record.warIds.size,
          totals: record.totals,
          averages: Object.fromEntries(
            CLASS_STATS_METRICS.map(({ key }) => [
              key,
              record.metricWarCounts[key] > 0
                ? record.totals[key] / record.metricWarCounts[key]
                : null,
            ]),
          ),
          best: record.best,
          metricWarCounts: record.metricWarCounts,
          kd,
          averageKd:
            record.kdWarCount > 0 ? record.kdSum / record.kdWarCount : null,
          bestKd: record.bestKd,
        };
      }),
    ).filter(Boolean);

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
          color: `rgb(${classEntry.accent || classEntry.glow || '250, 204, 21'})`,
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
      byClassMode: Object.fromEntries(
        classModeBreakdown.map((entry) => [`${entry.name}@@${entry.mode}`, entry]),
      ),
      overallSlices,
      overallGradient: buildOverallClassGradient(overallSlices),
      overallClassPlayerCount,
      playersWithRecentClassData,
      modeRankings,
    };
  }, [logs]);

  const emptyClassStats = useCallback(
    () => ({
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
    }),
    [],
  );

  const combinedClassStats = useMemo(() => {
    if (!selectedClass) return emptyClassStats();

    return (
      classAnalytics.byClass[selectedClass.name] || {
        ...selectedClass,
        ...emptyClassStats(),
      }
    );
  }, [classAnalytics, emptyClassStats, selectedClass]);

  const classStats = useMemo(() => {
    if (!selectedClassMode || !selectedClass) return combinedClassStats;

    return (
      classAnalytics.byClassMode?.[
        `${selectedClass.name}@@${selectedClassMode}`
      ] || {
        ...selectedClass,
        mode: selectedClassMode,
        ...emptyClassStats(),
      }
    );
  }, [
    classAnalytics,
    combinedClassStats,
    emptyClassStats,
    selectedClass,
    selectedClassMode,
  ]);

  const classModeTotal =
    combinedClassStats.succession + combinedClassStats.awakening;
  const successionModeShare =
    classModeTotal > 0
      ? (combinedClassStats.succession / classModeTotal) * 100
      : 50;
  const awakeningModeShare =
    classModeTotal > 0
      ? (combinedClassStats.awakening / classModeTotal) * 100
      : 50;

  const classPerformanceMetrics = useMemo(
    () =>
      CLASS_STATS_DISPLAY_METRICS.map((metric) => {
        if (metric.combined) {
          return {
            ...metric,
            combinedMetrics: CLASS_STATS_METRICS.filter(({ key }) =>
              ['killStreak', 'killFeed'].includes(key),
            ).map((combinedMetric) => ({
              ...combinedMetric,
              hasValue:
                Number(classStats.metricWarCounts?.[combinedMetric.key]) > 0,
              overall: classStats.totals?.[combinedMetric.key],
              average: classStats.averages?.[combinedMetric.key],
              best: classStats.best?.[combinedMetric.key],
            })),
          };
        }

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

  const classRankingRows = useMemo(() => {
    const metric =
      CLASS_RANKING_METRICS.find((entry) => entry.key === classRankingMetric) ||
      CLASS_RANKING_METRICS[0];

    return (classAnalytics.modeRankings || [])
      .map((entry) => {
        const isKd = metric.key === 'kd';
        const hasValue = isKd
          ? entry.averageKd != null || entry.kd != null
          : Number(entry.metricWarCounts?.[metric.key]) > 0;

        const totalUnavailable = ['kd', 'killStreak', 'killFeed'].includes(
          metric.key,
        );

        return {
          ...entry,
          metric,
          hasValue,
          totalUnavailable,
          overall:
            hasValue && !totalUnavailable
              ? isKd
                ? entry.kd
                : entry.totals?.[metric.key]
              : null,
          average: hasValue
            ? isKd
              ? entry.averageKd
              : entry.averages?.[metric.key]
            : null,
          best: hasValue
            ? isKd
              ? entry.bestKd
              : entry.best?.[metric.key]
            : null,
        };
      })
      .sort((first, second) => {
        const hasValueDifference =
          Number(second.hasValue) - Number(first.hasValue);

        if (hasValueDifference !== 0) return hasValueDifference;

        const firstValue = Number(first[classRankingSort.key]);
        const secondValue = Number(second[classRankingSort.key]);
        const safeFirstValue = Number.isFinite(firstValue) ? firstValue : 0;
        const safeSecondValue = Number.isFinite(secondValue) ? secondValue : 0;
        const direction = classRankingSort.direction === 'asc' ? 1 : -1;
        const valueDifference =
          (safeFirstValue - safeSecondValue) * direction;

        if (valueDifference !== 0) return valueDifference;

        return (
          first.className.localeCompare(second.className) ||
          first.mode.localeCompare(second.mode)
        );
      });
  }, [
    classAnalytics.modeRankings,
    classRankingMetric,
    classRankingSort.direction,
    classRankingSort.key,
  ]);

  const openClassDetails = useCallback(
    async (orb) => {
      setSelectedClass(orb);
      setSelectedClassMode(null);
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
      audio.volume = 0.06;
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
      audio.volume = 0.06;

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
      const previousLayerWidth = layerWidth;
      const previousLayerHeight = layerHeight;
      const nextLayerWidth = Math.max(1, bounds.width);
      const nextLayerHeight = Math.max(1, bounds.height);

      layerWidth = nextLayerWidth;
      layerHeight = nextLayerHeight;

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
          // The sidebar height changes after each page finishes rendering. Keep
          // every orb at the same relative position when that happens instead
          // of leaving all of them packed into the old, shorter top area.
          const previousMaxX = Math.max(
            ORB_EDGE_PADDING,
            previousLayerWidth - config.size - ORB_EDGE_PADDING,
          );
          const previousMaxY = Math.max(
            ORB_EDGE_PADDING,
            previousLayerHeight - config.size - ORB_EDGE_PADDING,
          );
          const previousSpanX = Math.max(1, previousMaxX - ORB_EDGE_PADDING);
          const previousSpanY = Math.max(1, previousMaxY - ORB_EDGE_PADDING);
          const nextSpanX = Math.max(1, maxX - ORB_EDGE_PADDING);
          const nextSpanY = Math.max(1, maxY - ORB_EDGE_PADDING);
          const normalizedX = previousLayerWidth > 1
            ? clampOrb((previous.x - ORB_EDGE_PADDING) / previousSpanX, 0, 1)
            : config.startX;
          const normalizedY = previousLayerHeight > 1
            ? clampOrb((previous.y - ORB_EDGE_PADDING) / previousSpanY, 0, 1)
            : config.startY;

          return {
            ...previous,
            x: clampOrb(
              ORB_EDGE_PADDING + normalizedX * nextSpanX,
              ORB_EDGE_PADDING,
              maxX,
            ),
            y: clampOrb(
              ORB_EDGE_PADDING + normalizedY * nextSpanY,
              ORB_EDGE_PADDING,
              maxY,
            ),
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

    // Orb-to-orb collision physics removed for performance.

    let navigationObstacles = [];

    const measureNavigationObstacles = () => {
      const layerBounds = layer.getBoundingClientRect();
      navigationObstacles = Array.from(
        sidebar.querySelectorAll('.adversary-sidebar-nav-zone .adversary-menu-button'),
      ).map((element) => {
        const bounds = element.getBoundingClientRect();
        const paddingX = 13;
        const paddingY = 10;

        return {
          left: bounds.left - layerBounds.left - paddingX,
          right: bounds.right - layerBounds.left + paddingX,
          top: bounds.top - layerBounds.top - paddingY,
          bottom: bounds.bottom - layerBounds.top + paddingY,
        };
      });
    };

    // Let class orbs travel behind the translucent navigation labels instead of
    // being trapped between menu buttons. Cursor repulsion
    // remains active, so the bubbles still feel alive and interactive.
    const repelFromNavigation = () => {};

    const ORB_FRAME_INTERVAL = 1000 / 24;

    const animate = (time) => {
      const pointer = pointerRef.current;

      if (time - previousTime < ORB_FRAME_INTERVAL) {
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      const delta = Math.min(4.2, Math.max(0.35, (time - previousTime) / 16.667));
      previousTime = time;

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

        repelFromNavigation(state, config, delta);

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
      measureNavigationObstacles();
      writeOrbStyles(pointerRef.current.active);
    };

    measureLayer();
    measureNavigationObstacles();
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

    // Page content is asynchronous and can make the sidebar much taller after
    // the first render. Watch the real sidebar size so the orb physics field
    // expands with it immediately instead of remaining at the initial height.
    const sidebarResizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          handleResize();
        })
      : null;

    sidebarResizeObserver?.observe(sidebar);
    if (layer !== sidebar) sidebarResizeObserver?.observe(layer);

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
      sidebarResizeObserver?.disconnect();

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
            style={{ '--class-rgb': selectedClass.accent || selectedClass.glow || '250, 204, 21' }}
          >
            <button
              type="button"
              className="adversary-class-modal-close"
              aria-label="Close class details"
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSelectedClass(null);
              }}
            >
              ×
            </button>

            <div className="adversary-class-modal-content">
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
                    setSelectedClassMode(null);
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
                onClick={() => {
                  setSelectedClassMode(null);
                  setClassModalView('overall');
                  setClassRankingSort({ key: 'average', direction: 'desc' });
                }}
              >
                Overall
              </button>
            </div>

            {classModalView === 'overall' ? (
              <div className="mt-5">
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
                  </div>
                </div>

                <div className="adversary-class-overall-dashboard">
                  <section className="adversary-class-overall-distribution">
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="adversary-class-overall-pie"
                        style={{ background: classAnalytics.overallGradient }}
                        aria-label="Guild class distribution for the last 30 days"
                      />
                    </div>

                    <div className="adversary-class-overall-list space-y-1.5">
                      {classAnalytics.overallSlices.length > 0 ? (
                        classAnalytics.overallSlices.map((slice) => (
                          <button
                            key={slice.id}
                            type="button"
                            disabled={!slice.orb}
                            className="adversary-class-overall-row w-full rounded-[14px] border border-slate-700/45 bg-slate-900/55 p-2.5 text-left transition hover:border-slate-500/70 disabled:cursor-default disabled:hover:border-slate-700/45"
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
                                className="h-10 w-10 shrink-0 object-contain"
                                draggable="false"
                              />
                            ) : (
                              <span
                                className="h-7 w-7 shrink-0 rounded-full"
                                style={{ background: slice.color }}
                              />
                            )}
                            <span className="adversary-class-overall-name">
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
                  </section>

                  <section className="adversary-class-rankings-panel">
                    <div className="adversary-class-rankings-header">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-200">
                          Class Rankings
                        </h3>
                        <p className="mt-1 text-[10px] font-bold text-slate-500">
                          Every played class and mode · Last {CLASS_STATS_WINDOW_DAYS} days
                        </p>
                      </div>
                      <select
                        className="adversary-class-ranking-select"
                        value={classRankingMetric}
                        onChange={(event) => {
                          const nextMetric = event.target.value;
                          setClassRankingMetric(nextMetric);

                          if (
                            ['kd', 'killStreak', 'killFeed'].includes(nextMetric) &&
                            classRankingSort.key === 'overall'
                          ) {
                            setClassRankingSort({ key: 'average', direction: 'desc' });
                          }
                        }}
                        aria-label="Class ranking statistic"
                      >
                        {CLASS_RANKING_METRICS.map((metric) => (
                          <option key={metric.key} value={metric.key}>
                            {metric.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="adversary-class-ranking-columns">
                      <span>Class / Mode</span>
                      {[
                        ['overall', 'Total'],
                        ['average', 'Average'],
                        ['best', 'Best'],
                      ].map(([sortKey, label]) => {
                        const isActive = classRankingSort.key === sortKey;
                        const isUnavailableTotal =
                          sortKey === 'overall' &&
                          ['kd', 'killStreak', 'killFeed'].includes(classRankingMetric);

                        return (
                          <button
                            key={sortKey}
                            type="button"
                            disabled={isUnavailableTotal}
                            className={`adversary-class-ranking-sort-button ${
                              isActive ? 'is-active' : ''
                            } ${isUnavailableTotal ? 'is-disabled' : ''}`}
                            onClick={() =>
                              setClassRankingSort((current) => ({
                                key: sortKey,
                                direction:
                                  current.key === sortKey && current.direction === 'desc'
                                    ? 'asc'
                                    : 'desc',
                              }))
                            }
                          >
                            {label}
                            <span aria-hidden="true">
                              {isActive
                                ? classRankingSort.direction === 'desc'
                                  ? '↓'
                                  : '↑'
                                : '↕'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="adversary-class-ranking-list">
                      {classRankingRows.length > 0 ? (
                        classRankingRows.map((entry, index) => {
                          const decimals = entry.metric.key === 'kd' ? 2 : 0;

                          return (
                            <div key={entry.id} className="adversary-class-ranking-row">
                              <div className="adversary-class-ranking-identity">
                                <span className="text-[9px] font-black text-slate-600">
                                  #{index + 1}
                                </span>
                                <img src={entry.orb.src} alt="" draggable="false" />
                                <div className="min-w-0">
                                  <div className="truncate text-[11px] font-black text-slate-100">
                                    {entry.className}
                                  </div>
                                  <div className="adversary-class-ranking-meta">
                                    <span
                                      className={`adversary-class-ranking-mode ${
                                        entry.mode === 'Awakening'
                                          ? 'is-awakening'
                                          : 'is-succession'
                                      }`}
                                    >
                                      {entry.mode}
                                    </span>
                                    <span className="adversary-class-ranking-wars">
                                      {entry.warCount} {entry.warCount === 1 ? 'war' : 'wars'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="adversary-class-ranking-value">
                                <strong>
                                  {entry.totalUnavailable
                                    ? '-'
                                    : formatClassStatNumber(entry.overall, decimals)}
                                </strong>
                              </div>
                              <div className="adversary-class-ranking-value">
                                <strong>{formatClassStatNumber(entry.average, 2)}</strong>
                              </div>
                              <div className="adversary-class-ranking-value">
                                <strong>{formatClassStatNumber(entry.best, decimals)}</strong>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-[14px] border border-dashed border-slate-700/65 bg-slate-950/42 p-4 text-center text-xs text-slate-400">
                          No mode statistics are available for this metric.
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="mt-2.5">
                <div className="grid items-center gap-2.5 xl:grid-cols-[minmax(285px,0.72fr)_minmax(530px,1.28fr)]">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img
                      src={selectedClass.src}
                      alt=""
                      className="adversary-class-modal-orb"
                      draggable="false"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                        Guild Roster only
                      </p>
                      <h2
                        id="adversary-class-modal-title"
                        className="mt-1 truncate text-3xl font-black text-white"
                      >
                        {selectedClass.name}
                      </h2>
                    </div>
                  </div>

                  <div className="adversary-class-top-summary grid min-w-0 items-center gap-1.5 rounded-[14px] border p-[7px] sm:grid-cols-[112px_minmax(0,1fr)]">
                    <div className="flex items-center justify-center">
                      <div
                        className="adversary-class-pie"
                        style={{ '--class-share': Math.min(100, classStats.share) }}
                        aria-label={`${classStats.share.toFixed(2)} percent of the Guild Roster played ${selectedClass.name} in saved Class Logs`}
                      >
                        <div className="adversary-class-pie-value">
                          <div className="text-xl font-black text-white">
                            {classStats.share.toFixed(2)}%
                          </div>
                          <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Guild roster
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-1.5 sm:grid-cols-2">
                      <div className="adversary-class-summary-card">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Players
                        </div>
                        <div className="mt-0.5 text-xl font-black text-white">
                          {classStats.playerCount}
                          <span className="ml-1.5 text-xs font-bold text-slate-400">
                            of {classAnalytics.rosterSize}
                          </span>
                        </div>
                        <div className="mt-1 text-[10px] font-bold leading-tight text-slate-500">
                          Roster players with this class
                        </div>
                      </div>
                      <div className="adversary-class-summary-card">
                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Class appearances
                        </div>
                        <div className="mt-0.5 text-xl font-black text-white">
                          {classStats.appearances}
                        </div>
                        <div className="mt-1 text-[10px] font-bold leading-tight text-slate-500">
                          Node Wars assigned to {selectedClass.name}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`adversary-class-mode-tug mt-2.5 ${
                    selectedClassMode ? 'has-selected-mode' : ''
                  }`}
                >
                  <div className="adversary-class-mode-tug-labels">
                    <button
                      type="button"
                      className={`adversary-class-mode-label adversary-class-mode-label-button is-succession ${
                        selectedClassMode === 'Succession' ? 'is-selected' : ''
                      }`}
                      aria-pressed={selectedClassMode === 'Succession'}
                      onClick={() =>
                        setSelectedClassMode((current) =>
                          current === 'Succession' ? null : 'Succession',
                        )
                      }
                    >
                      <span>Succession</span>
                      <strong>{combinedClassStats.succession}</strong>
                      <small>
                        {classModeTotal > 0
                          ? `${successionModeShare.toFixed(2)}%`
                          : 'No data'}
                      </small>
                    </button>
                    <button
                      type="button"
                      className={`adversary-class-mode-label adversary-class-mode-label-button is-awakening ${
                        selectedClassMode === 'Awakening' ? 'is-selected' : ''
                      }`}
                      aria-pressed={selectedClassMode === 'Awakening'}
                      onClick={() =>
                        setSelectedClassMode((current) =>
                          current === 'Awakening' ? null : 'Awakening',
                        )
                      }
                    >
                      <small>
                        {classModeTotal > 0
                          ? `${awakeningModeShare.toFixed(2)}%`
                          : 'No data'}
                      </small>
                      <strong>{combinedClassStats.awakening}</strong>
                      <span>Awakening</span>
                    </button>
                  </div>
                  <div
                    className="adversary-class-mode-track"
                    aria-label={`${selectedClass.name} mode split: ${combinedClassStats.succession} Succession and ${combinedClassStats.awakening} Awakening`}
                  >
                    <button
                      type="button"
                      aria-label={`Show ${selectedClass.name} Succession statistics`}
                      aria-pressed={selectedClassMode === 'Succession'}
                      className={`adversary-class-mode-fill is-succession ${
                        selectedClassMode === 'Succession' ? 'is-selected' : ''
                      }`}
                      style={{ width: `${successionModeShare}%` }}
                      onClick={() => setSelectedClassMode('Succession')}
                    />
                    <button
                      type="button"
                      aria-label={`Show ${selectedClass.name} Awakening statistics`}
                      aria-pressed={selectedClassMode === 'Awakening'}
                      className={`adversary-class-mode-fill is-awakening ${
                        selectedClassMode === 'Awakening' ? 'is-selected' : ''
                      }`}
                      style={{ width: `${awakeningModeShare}%` }}
                      onClick={() => setSelectedClassMode('Awakening')}
                    />
                    <button
                      type="button"
                      className="adversary-class-mode-clash"
                      aria-label="Show combined class statistics"
                      title="Show combined statistics"
                      onClick={() => setSelectedClassMode(null)}
                    >
                      {selectedClassMode ? 'ALL' : 'VS'}
                    </button>
                  </div>
                </div>


                <section className="adversary-class-overall-performance">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-200">
                        Class Overall Performance
                        {selectedClassMode ? ` · ${selectedClassMode}` : ''}
                      </h3>
                    </div>
                    <span className="rounded-full border border-slate-700/55 bg-slate-900/72 px-3 py-1 text-xs font-bold text-slate-400">
                      {classStats.appearances} class {classStats.appearances === 1 ? 'appearance' : 'appearances'}
                    </span>
                  </div>

                  <div className="adversary-class-performance-grid">
                    {classPerformanceMetrics.map((metric) => {
                      if (metric.combined) {
                        return (
                          <div
                            key={metric.key}
                            className="adversary-class-performance-card is-combined-feed"
                            style={{ '--metric-rgb': metric.rgb }}
                          >
                            {metric.combinedMetrics.map((combinedMetric) => (
                              <div
                                key={combinedMetric.key}
                                className="adversary-class-combined-feed-row"
                                style={{
                                  '--combined-metric-rgb': combinedMetric.rgb,
                                }}
                              >
                                <span className="adversary-class-combined-feed-label">
                                  {combinedMetric.label}
                                </span>
                                <div className="adversary-class-combined-feed-values">
                                  <span>
                                    <small>Overall</small>
                                    <strong>-</strong>
                                  </span>
                                  <span>
                                    <small>Average</small>
                                    <strong>
                                      {combinedMetric.hasValue
                                        ? formatClassStatNumber(
                                            combinedMetric.average,
                                            2,
                                          )
                                        : '—'}
                                    </strong>
                                  </span>
                                  <span>
                                    <small>Best</small>
                                    <strong>
                                      {combinedMetric.hasValue
                                        ? formatClassStatNumber(
                                            combinedMetric.best,
                                            0,
                                          )
                                        : '—'}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      const decimals = metric.key === 'kd' ? 2 : 0;
                      const totalUnavailable = metric.key === 'kd';

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
                                {totalUnavailable
                                  ? '-'
                                  : metric.hasValue
                                    ? formatClassStatNumber(
                                        metric.overall,
                                        decimals,
                                      )
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

                <div className="mt-3.5">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-300">
                        {selectedClass.name} player statistics
                      </h3>
                    </div>
                    <span className="rounded-full border border-slate-700/55 bg-slate-900/72 px-3 py-1 text-xs font-bold text-slate-400">
                      {classStats.playerCount} roster players
                    </span>
                  </div>

                  {classStats.players.length > 0 ? (
                    <div className="adversary-class-player-cards">
                      {classStats.players.map((player, playerIndex) => (
                        <article
                          key={player.key}
                          className="adversary-class-player-stat-card"
                          style={{
                            '--player-rgb': getClassPlayerShade(
                              selectedClass.accent || selectedClass.glow,
                              playerIndex,
                            ),
                          }}
                        >
                          <header className="adversary-class-player-stat-header">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="adversary-class-player-rank">#{playerIndex + 1}</span>
                              <div className="adversary-class-player-title-row min-w-0">
                                <h4 className="min-w-0 truncate text-base font-black text-white">
                                  {player.name}
                                </h4>
                                <span className="adversary-class-player-war-pill">
                                  {player.wars} {player.wars === 1 ? 'war' : 'wars'}
                                </span>
                                <span className="adversary-class-player-mode-summary">
                                  S{player.succession}/A{player.awakening}
                                </span>
                              </div>
                            </div>

                          </header>

                          <div className="adversary-class-player-metrics">
                            {CLASS_PLAYER_METRIC_LAYOUT.map((metric) => {
                              if (metric.combined) {
                                const combinedMetrics = CLASS_STATS_METRICS.filter(
                                  ({ key }) =>
                                    ['killStreak', 'killFeed'].includes(key),
                                );

                                return (
                                  <div
                                    key={metric.key}
                                    className="adversary-class-player-metric is-combined-feed"
                                    style={{ '--metric-rgb': metric.rgb }}
                                  >
                                    {combinedMetrics.map((combinedMetric) => {
                                      const hasValue =
                                        player.metricWarCounts[combinedMetric.key] > 0;
                                      const overall = player.totals[combinedMetric.key];
                                      const average = player.averages[combinedMetric.key];
                                      const best = player.best[combinedMetric.key];

                                      return (
                                        <div
                                          key={combinedMetric.key}
                                          className="adversary-class-combined-feed-row"
                                          style={{ '--combined-metric-rgb': combinedMetric.rgb }}
                                        >
                                          <span className="adversary-class-combined-feed-label">
                                            {combinedMetric.label}
                                          </span>
                                          <div className="adversary-class-combined-feed-values">
                                            <span>
                                              <small>Overall</small>
                                              <strong>-</strong>
                                            </span>
                                            <span>
                                              <small>Average</small>
                                              <strong>
                                                {hasValue
                                                  ? formatClassStatNumber(average, 2)
                                                  : '—'}
                                              </strong>
                                            </span>
                                            <span>
                                              <small>Best</small>
                                              <strong>
                                                {hasValue
                                                  ? formatClassStatNumber(best, 0)
                                                  : '—'}
                                              </strong>
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              }

                              const { key, label, rgb } = metric;
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
                                        {isKd
                                          ? '-'
                                          : hasValue
                                            ? formatClassStatNumber(
                                                overall,
                                                decimals,
                                              )
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
            </div>
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
  const subtitle = PAGE_SUBTITLES[page] || 'Adversary Analytics';

  return (
    <section className="adversary-page-brand adversary-nodewars-brand adversary-tech-brand relative mb-2 overflow-hidden">
      <div className="adversary-nodewars-brand-grid pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="adversary-nodewars-brand-watermark pointer-events-none absolute left-1/2 top-[-122px] h-[300px] w-[420px] -translate-x-1/2 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${adversaryEmblem}")` }}
      />
      <div className="adversary-nodewars-brand-circuit pointer-events-none absolute inset-y-0 right-0 w-[48%]" />

      <div className="relative z-10 flex min-h-[92px] items-start gap-3 pt-2">
        <div className="adversary-nodewars-brand-icon relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl">
          <img
            src={adversaryEmblem}
            alt=""
            aria-hidden="true"
            className="relative h-[88%] w-[88%] object-contain"
          />
        </div>

        <div className="min-w-0 pt-0.5">
          <h2 className="truncate text-[28px] font-black leading-none tracking-[-0.025em] text-white sm:text-[31px]">
            {title}
          </h2>
          <div className="mt-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
            {subtitle}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [page, setPage] = useState('nodewars');
  const startupVideoRef = useRef(null);
  const backgroundLoopVideoRef = useRef(null);
  const backgroundLoopTransitionRef = useRef(false);
  const startupExitTimerRef = useRef(null);
  const startupRevealTimerRef = useRef(null);
  const startupMutedFallbackRef = useRef(false);
  const [startupFinished, setStartupFinished] = useState(false);
  const [startupStarted, setStartupStarted] = useState(false);
  const [startupFading, setStartupFading] = useState(false);
  const [backgroundLoopReady, setBackgroundLoopReady] = useState(false);
  const [backgroundLoopActive, setBackgroundLoopActive] = useState(false);
  const panelHoverAudioRef = useRef([]);
  const panelHoverAudioIndexRef = useRef(0);

  const playPanelHoverSound = useCallback(() => {
    const pool = panelHoverAudioRef.current;
    if (!pool.length) return;

    const audio = pool[panelHoverAudioIndexRef.current % pool.length];
    panelHoverAudioIndexRef.current += 1;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 0.105;

      const playback = audio.play();
      if (playback?.catch) playback.catch(() => {});
    } catch {
      // Ignore browser media-policy failures.
    }
  }, []);

  const finishStartup = useCallback(() => {
    if (startupRevealTimerRef.current) {
      window.clearTimeout(startupRevealTimerRef.current);
      startupRevealTimerRef.current = null;
    }

    if (startupExitTimerRef.current) return;

    setStartupFading(true);
    startupExitTimerRef.current = window.setTimeout(() => {
      setStartupFinished(true);
      startupExitTimerRef.current = null;
    }, 520);
  }, []);

  const handleStartupPlaying = useCallback(() => {
    setStartupStarted(true);

    if (backgroundLoopActive || startupRevealTimerRef.current || startupFinished) return;

    startupRevealTimerRef.current = window.setTimeout(() => {
      startupRevealTimerRef.current = null;
      finishStartup();
    }, 5500);
  }, [backgroundLoopActive, finishStartup, startupFinished]);

  const startBackgroundLoop = useCallback(() => {
    if (!ADVERSARY_LOOP_VIDEO || backgroundLoopTransitionRef.current || backgroundLoopActive) {
      return;
    }

    const loopVideo = backgroundLoopVideoRef.current;
    if (!loopVideo) return;

    backgroundLoopTransitionRef.current = true;

    try {
      // The loop is a separate preloaded video element underneath the intro.
      // Starting it just before the intro ends avoids the black frame caused by
      // swapping the src on one video element.
      if (loopVideo.currentTime > 0.08) loopVideo.currentTime = 0;
      loopVideo.muted = true;
      loopVideo.defaultMuted = true;
      loopVideo.volume = 0;

      const playPromise = loopVideo.play();

      if (playPromise?.then) {
        playPromise
          .then(() => {
            setBackgroundLoopActive(true);
          })
          .catch(() => {
            backgroundLoopTransitionRef.current = false;
          });
      } else {
        setBackgroundLoopActive(true);
      }
    } catch {
      backgroundLoopTransitionRef.current = false;
    }
  }, [backgroundLoopActive]);

  const handleIntroTimeUpdate = useCallback((event) => {
    if (!ADVERSARY_LOOP_VIDEO || backgroundLoopActive) return;

    const video = event.currentTarget;
    const duration = Number(video.duration);
    const currentTime = Number(video.currentTime);

    if (!Number.isFinite(duration) || !Number.isFinite(currentTime) || duration <= 0) return;

    // Begin the loop a fraction of a second early so its first decoded frame is
    // already on screen beneath the intro when the crossfade happens.
    if (duration - currentTime <= 0.45 && (backgroundLoopReady || video.readyState >= 3)) {
      startBackgroundLoop();
    }
  }, [backgroundLoopActive, backgroundLoopReady, startBackgroundLoop]);

  const handleBackgroundVideoEnded = useCallback(() => {
    if (ADVERSARY_LOOP_VIDEO) {
      startBackgroundLoop();
      return;
    }

    // No Loop-video has been added yet. Restart the intro immediately as a
    // fallback so the full-page background never falls back to black.
    const video = startupVideoRef.current;
    if (!video) return;

    try {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    } catch {
      // Keep the last rendered video frame if replay is unavailable.
    }
  }, [startBackgroundLoop]);

  useEffect(() => {
    const video = startupVideoRef.current;
    if (!video) return undefined;

    let cancelled = false;

    const unlockBackgroundAudio = () => {
      if (cancelled || !startupMutedFallbackRef.current) return;

      try {
        video.muted = false;
        video.volume = 0.25;
        startupMutedFallbackRef.current = false;

        const playPromise = video.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {
            // If the browser still refuses audible playback, keep the video
            // running muted rather than interrupting the background.
            video.muted = true;
            video.volume = 0;
            startupMutedFallbackRef.current = true;
            video.play().catch(() => {});
          });
        }
      } catch {
        // Browser policy can still reject audible autoplay without a gesture.
      }
    };

    const tryAutoplay = async () => {
      try {
        video.muted = false;
        video.defaultMuted = false;
        video.volume = 0.25;
        await video.play();
        startupMutedFallbackRef.current = false;
      } catch {
        if (cancelled) return;

        // Modern browsers may block autoplay with audio. There is no standards-
        // compliant way to bypass that policy without a user gesture, so keep
        // the visual background running muted and unlock it on the first normal
        // interaction instead of showing a click-to-start gate.
        try {
          video.muted = true;
          video.volume = 0;
          startupMutedFallbackRef.current = true;
          await video.play();
        } catch {
          // If playback itself fails, reveal the UI and leave the static fallback.
          finishStartup();
        }
      }
    };

    document.addEventListener('pointerdown', unlockBackgroundAudio, { passive: true });
    document.addEventListener('keydown', unlockBackgroundAudio);
    document.addEventListener('touchstart', unlockBackgroundAudio, { passive: true });

    tryAutoplay();

    return () => {
      cancelled = true;
      document.removeEventListener('pointerdown', unlockBackgroundAudio);
      document.removeEventListener('keydown', unlockBackgroundAudio);
      document.removeEventListener('touchstart', unlockBackgroundAudio);

      if (startupRevealTimerRef.current) {
        window.clearTimeout(startupRevealTimerRef.current);
        startupRevealTimerRef.current = null;
      }

      if (startupExitTimerRef.current) {
        window.clearTimeout(startupExitTimerRef.current);
        startupExitTimerRef.current = null;
      }
    };
  }, [finishStartup]);

  useEffect(() => {
    const audios = Array.from({ length: 3 }, () => {
      const audio = new Audio(panelHoverSound);
      audio.preload = 'auto';
      audio.volume = 0.105;
      return audio;
    });

    panelHoverAudioRef.current = audios;

    const unlockPanelHoverAudio = () => {
      panelHoverAudioRef.current.forEach((audio) => {
        if (!audio) return;

        const previousMuted = audio.muted;
        audio.muted = true;

        try {
          const playback = audio.play();

          const resetAudio = () => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = previousMuted;
            audio.volume = 0.105;
          };

          if (playback?.then) {
            playback.then(resetAudio).catch(() => {
              audio.muted = previousMuted;
            });
          } else {
            resetAudio();
          }
        } catch {
          audio.muted = previousMuted;
        }
      });
    };

    document.addEventListener('pointerdown', unlockPanelHoverAudio, {
      once: true,
      capture: true,
    });

    return () => {
      document.removeEventListener('pointerdown', unlockPanelHoverAudio, {
        capture: true,
      });

      panelHoverAudioRef.current.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });

      panelHoverAudioRef.current = [];
    };
  }, []);

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
    if (!PAGE_CLICK_SOUND) return undefined;

    // A small pool prevents rapid clicks from cutting the previous click sound off.
    const audioPool = Array.from({ length: 4 }, () => {
      const audio = new Audio(PAGE_CLICK_SOUND);
      audio.preload = 'auto';
      audio.volume = 0.12;
      return audio;
    });
    let audioIndex = 0;

    const clickableSelector = [
      'button:not(:disabled)',
      'a[href]',
      '[role="button"]:not([aria-disabled="true"])',
      '.cursor-pointer',
      'input[type="checkbox"]',
      'input[type="radio"]',
      'select',
    ].join(',');

    const playPageClick = (event) => {
      if (!(event.target instanceof Element)) return;

      const clickable = event.target.closest(clickableSelector);
      if (!clickable || clickable.closest('[data-no-page-click-sound="true"]')) return;

      const audio = audioPool[audioIndex % audioPool.length];
      audioIndex += 1;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    document.addEventListener('click', playPageClick, true);

    return () => {
      document.removeEventListener('click', playPageClick, true);
      audioPool.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);

  useEffect(() => {
    document.body.dataset.adversaryPage = page;

    let frameId = 0;

    const decorateSurfaces = () => {
      frameId = 0;

      const contentRoot = document.querySelector('.adversary-content');

      if (contentRoot && page !== 'nodewars') {
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

  const overviewPlayerClassMap = useMemo(
    () => buildOverviewPlayerClassMap(activeLogs),
    [activeLogs],
  );

  const monthlyPlayerClassMap = useMemo(
    () =>
      buildMonthlyPlayerClassMap(
        Array.isArray(allLogs) ? allLogs : [],
      ),
    [allLogs],
  );

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

  const overviewLabel = useMemo(() => {
    if (page !== 'overview') return label;

    const loadedDates = [
      ...new Set(
        (Array.isArray(overviewLogs) ? overviewLogs : [])
          .map((log) => dateOf(log))
          .filter(Boolean),
      ),
    ];

    if (loadedDates.length === 1) return loadedDates[0];
    if (loadedDates.length > 1) return `${loadedDates.length} selected node wars`;

    const selectedDate = selectedDays.find(
      (day) => day && day !== 'all' && day !== 'current',
    );

    return selectedDate || label;
  }, [page, label, overviewLogs, selectedDays]);

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
    // Overview from the navigation always opens the newest saved node war.
    // Existing explicit match/war links still keep their own selected war.
    const combinedLogs = [
      ...(Array.isArray(nodeLogs) ? nodeLogs : []),
      ...(Array.isArray(allLogs) ? allLogs : []),
    ];

    const uniqueLogs = [...new Map(
      combinedLogs
        .filter((log) => log?.id != null)
        .map((log) => [String(log.id), log]),
    ).values()];

    const latestWar = uniqueLogs.sort((a, b) => {
      const dateCompare = String(dateOf(b) || '').localeCompare(
        String(dateOf(a) || ''),
      );

      if (dateCompare) return dateCompare;

      const bCreated = String(
        b?.createdAt || b?.created_at || b?.timestamp || '',
      );
      const aCreated = String(
        a?.createdAt || a?.created_at || a?.timestamp || '',
      );

      return bCreated.localeCompare(aCreated);
    })[0];

    if (!latestWar) {
      setNodeWarsWarning('No saved node wars are available yet.');
      setPage('nodewars');
      return;
    }

    setNodeWarsWarning('');
    setMatchHistoryDateFilter('');
    setSelectedDays([dateOf(latestWar)]);
    setSelectedWars([String(latestWar.id)]);
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
      <style>{ALL_PAGES_NODEWARS_TECH_CSS}</style>

      <div
        aria-hidden="true"
        className="adversary-site-background pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black"
      >
        <div className="absolute inset-0 bg-slate-950" />

        {ADVERSARY_LOOP_VIDEO && (
          <video
            ref={backgroundLoopVideoRef}
            src={ADVERSARY_LOOP_VIDEO}
            playsInline
            preload="auto"
            loop
            muted
            disablePictureInPicture
            aria-hidden="true"
            onLoadedData={() => setBackgroundLoopReady(true)}
            onCanPlay={() => setBackgroundLoopReady(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
              backgroundLoopActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        <video
          ref={startupVideoRef}
          src={adversaryStartupClip}
          autoPlay
          playsInline
          preload="auto"
          loop={!ADVERSARY_LOOP_VIDEO}
          muted={false}
          disablePictureInPicture
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
            backgroundLoopActive ? 'opacity-0' : 'opacity-100'
          }`}
          onPlaying={handleStartupPlaying}
          onTimeUpdate={handleIntroTimeUpdate}
          onEnded={handleBackgroundVideoEnded}
          onError={() => {
            if (!startupFinished) finishStartup();
          }}
        />

        {/* Readability layers only; the moving video is now the actual full-site background. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(0,0,0,.14)_68%,rgba(0,0,0,.48)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,3,7,.18),rgba(1,3,7,.05)_42%,rgba(1,3,7,.28))]" />
      </div>

      {!startupFinished && (
        <button
          type="button"
          data-no-page-click-sound="true"
          onClick={finishStartup}
          className={`fixed right-5 top-5 z-[100001] rounded-lg border border-amber-300/25 bg-black/55 px-3 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-amber-100/75 transition-all duration-300 hover:border-amber-300/55 hover:bg-black/80 hover:text-amber-100 ${
            startupStarted ? 'opacity-55 hover:opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          Skip
        </button>
      )}
      <div className={`sticky top-0 z-40 border-b border-slate-800 bg-slate-950/88 p-3 transition-opacity duration-500 lg:hidden ${
        startupFading || startupFinished ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}>
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

      <div className={`adversary-layout-grid relative z-10 grid transition-opacity duration-500 lg:grid-cols-[250px_1fr] ${
        startupFading || startupFinished ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}>
        <aside className="adversary-sidebar relative hidden min-h-screen flex-col overflow-hidden border-r border-slate-800/90 bg-slate-950/82 p-4 lg:flex">
          <SidebarClassOrbs
            members={members}
            logs={Array.isArray(allLogs) ? allLogs : nodeLogs}
            loadLogs={loadAllLogs}
          />

          <h1 className="pointer-events-none relative z-30 mb-6 text-2xl font-black tracking-[0.16em] text-amber-300 drop-shadow-[0_0_18px_rgba(250,204,21,.38)]">
            Adversary
          </h1>

          <nav className="adversary-sidebar-nav-zone pointer-events-none relative z-30 flex-1">
            {[
              ['guild', 'Guild'],
              ['monthly', 'Monthly Recap'],
              ['nodewars', 'Node Wars'],
              ['overview', 'Overview'],
              ['hall', 'Hall of Fame'],
              ['players', 'Player Stats'],
            ].map(([id, title]) => {
              const RailIcon = NODEWARS_RAIL_ICONS[id];
              const active = id === 'overview' ? page === 'overview' : page === id;

              return (
                <div key={id}>
                  <button
                    type="button"
                    onPointerEnter={playPanelHoverSound}
                    onClick={() => {
                      if (id === 'overview') {
                        openOverviewFromMenu();
                        return;
                      }

                      openPage(id);
                    }}
                    className={`adversary-menu-button pointer-events-auto relative ${
                      active ? 'is-active' : ''
                    }`}
                    style={{
                      '--adversary-menu-rgb':
                        MENU_ACCENTS[id] || MENU_ACCENTS.nodewars,
                    }}
                    aria-label={title}
                    title={title}
                  >
                    <span className="adversary-sidebar-menu-icon">
                      {id === 'guild' ? (
                        <img
                          src={adversaryEmblem}
                          alt=""
                          aria-hidden="true"
                          className="object-contain"
                        />
                      ) : RailIcon ? (
                        <RailIcon size={22} strokeWidth={1.7} />
                      ) : null}
                    </span>
                    <span className="adversary-sidebar-menu-label">{title}</span>
                    <span className="adversary-rail-active-dot" aria-hidden="true" />
                    <span className="adversary-rail-tooltip" aria-hidden="true">{title}</span>
                  </button>
                </div>
              );
            })}
          </nav>

          <div className="adversary-rail-bottom pointer-events-none relative z-30 pt-4">
            <button
              type="button"
              onPointerEnter={playPanelHoverSound}
              onClick={() => openPage('raw')}
              className={`adversary-menu-button pointer-events-auto relative w-full rounded-xl border px-4 py-3 text-left font-bold ${
                isMenuActive('raw') ? 'is-active' : ''
              }`}
              style={{ '--adversary-menu-rgb': MENU_ACCENTS.raw }}
              aria-label="Raw Logs"
              title="Raw Logs"
            >
              <span className="adversary-sidebar-menu-icon">
                <Settings size={22} strokeWidth={1.7} />
              </span>
              <span className="adversary-sidebar-menu-label">Raw Logs</span>
              <span className="adversary-rail-active-dot" aria-hidden="true" />
              <span className="adversary-rail-tooltip" aria-hidden="true">Raw Logs</span>
            </button>
          </div>
        </aside>

        <main className={`adversary-content adversary-page-${page} relative min-w-0 ${page === 'nodewars' ? 'p-2 sm:p-3 lg:p-4' : 'p-3 sm:p-5 lg:p-6'}`}>
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
                  label={overviewLabel}
                  members={members}
                  selectedLogs={activeLogs}
                  lifetimeLogs={Array.isArray(allLogs) ? allLogs : []}
                  loadLifetimeLogs={loadAllLogs}
                  playerClassMap={overviewPlayerClassMap}
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
                  playerClassMap={monthlyPlayerClassMap}
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
                  logs={Array.isArray(allLogs) ? allLogs : []}
                  classIconByName={PLAYER_CLASS_ICON_BY_NAME}
                  getClassRowsForLog={classRowsForLog}
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
