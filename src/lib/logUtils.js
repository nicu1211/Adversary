const NL = String.fromCharCode(10);

const SECONDARY_LOG_START = '===== ADVERSARY_SECONDARY_LOG_START =====';
const SECONDARY_LOG_END = '===== ADVERSARY_SECONDARY_LOG_END =====';
const CLASS_LOG_START = '===== ADVERSARY_CLASS_LOG_START =====';
const CLASS_LOG_END = '===== ADVERSARY_CLASS_LOG_END =====';

export const LOG_KEY = 'bdo_logs_v10';
export const MEMBER_KEY = 'bdo_members_v10';

export const achievements = [
  ['100 Kills', 100, 'k'],
  ['500 Kills', 500, 'k'],
  ['1000 Kills', 1000, 'k'],
  ['K/D 2+', 2, 'kd'],
  ['K/D 5+', 5, 'kd'],
  ['5 Killstreak', 5, 's'],
  ['10 Killstreak', 10, 's'],
  ['5 KillFeed', 5, 'f'],
];

export const scrollCls =
  '[scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb:hover]:bg-slate-600';


const RAW_PARSE_CACHE_LIMIT = 320;
const STATS_CACHE_LIMIT = 12;

const rawParseCache = new Map();
const rawIdentityCache = new Map();
const calculatedStatsCache = new Map();

function rememberLru(map, key, value, limit) {
  if (map.has(key)) {
    map.delete(key);
  }

  map.set(key, value);

  while (map.size > limit) {
    const oldestKey = map.keys().next().value;
    map.delete(oldestKey);
  }

  return value;
}

function rawIdentity(rawValue) {
  const raw = String(rawValue || '');

  if (rawIdentityCache.has(raw)) {
    const cached = rawIdentityCache.get(raw);
    rawIdentityCache.delete(raw);
    rawIdentityCache.set(raw, cached);
    return cached;
  }

  const identity = `${raw.length}:${hashLog(raw)}`;

  return rememberLru(
    rawIdentityCache,
    raw,
    identity,
    RAW_PARSE_CACHE_LIMIT,
  );
}

function summaryIdentity(log) {
  const summary =
    log?.summary ||
    log?.stats ||
    log?.analytics ||
    null;

  if (!summary) return 'no-summary';

  const players = Array.isArray(summary.players)
    ? summary.players
    : [];
  const guilds = Array.isArray(summary.guilds)
    ? summary.guilds
    : [];

  return [
    summary.version || 1,
    summary.calculatedAt || summary.calculated_at || '',
    summary.kills || 0,
    summary.deaths || 0,
    players.length,
    guilds.length,
    summary.secondary?.rows?.length ||
      summary.secondaryStats?.rows?.length ||
      0,
  ].join(':');
}

function calculateStatsSignature(logs) {
  return logs
    .map((log, index) => {
      const raw = String(log?.raw || '');

      return [
        index,
        log?.id || '',
        log?.date || '',
        log?.name || '',
        raw ? rawIdentity(raw) : summaryIdentity(log),
      ].join('|');
    })
    .join('||');
}

export function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(d.getDate()).padStart(2, '0')}`;
}

export function today() {
  return iso(new Date());
}

export function monthId(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(m) {
  const [year, month] = m.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function shiftMonth(m, n) {
  const [year, month] = m.split('-').map(Number);

  return monthId(new Date(year, month - 1 + n, 1));
}

export function monthDays(m) {
  const [year, month] = m.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const start = new Date(year, month - 1, 1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start);

    d.setDate(start.getDate() + index);

    return {
      iso: iso(d),
      day: d.getDate(),
      currentMonth: d.getMonth() === month - 1,
    };
  });
}

export function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function add(obj, key, amount = 1) {
  obj[key] = (obj[key] || 0) + amount;
}

export function secondsFromTime(time) {
  const p = String(time || '00:00:00')
    .split(':')
    .map(Number);

  return (p[0] || 0) * 3600 + (p[1] || 0) * 60 + (p[2] || 0);
}

export function minuteLabel(seconds) {
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(
    Math.floor(seconds / 60) % 60,
  ).padStart(2, '0')}`;
}

export function cleanLog(text) {
  return String(text || '')
    .split(NL)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(NL);
}

export function hashLog(text) {
  let hash = 0;
  const cleaned = cleanLog(text);

  for (const char of cleaned) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }

  return String(hash);
}

export function dateOf(log) {
  return (
    log?.date ||
    log?.warDate ||
    log?.war_date ||
    log?.createdAt?.slice?.(0, 10) ||
    log?.created_at?.slice?.(0, 10) ||
    today()
  );
}

function normalizeSummary(summary) {
  if (!summary || typeof summary !== 'object') return null;

  const secondary = summary.secondary || summary.secondaryStats || null;

  return {
    version: summary.version || 1,
    kills: Number(summary.kills) || 0,
    deaths: Number(summary.deaths) || 0,
    kd: String(summary.kd ?? '0.00'),
    playersCount:
      Number(summary.playersCount) ||
      Number(summary.players_count) ||
      Number(summary.players?.length) ||
      0,
    players: Array.isArray(summary.players) ? summary.players : [],
    guilds: Array.isArray(summary.guilds) ? summary.guilds : [],
    line: Array.isArray(summary.line) ? summary.line : [],
    topEnemies: Array.isArray(summary.topEnemies)
      ? summary.topEnemies
      : Array.isArray(summary.top_enemies)
        ? summary.top_enemies
        : [],
    enemyNames: Array.isArray(summary.enemyNames)
      ? summary.enemyNames
      : Array.isArray(summary.enemy_names)
        ? summary.enemy_names
        : [],
    st: summary.st || {},
    fd: summary.fd || {},
    secondary,
    hasTimeline: Boolean(summary.hasTimeline),
    summaryOnly: Boolean(summary.summaryOnly),
    calculatedAt: summary.calculatedAt || summary.calculated_at || null,
  };
}

export function normalizeLog(log) {
  const apiId =
    log.id ??
    log._id ??
    log.log_id ??
    log.key ??
    log.objectKey ??
    log.filename ??
    log.fileName ??
    log.path ??
    log.slug;

  return {
    id: String(apiId ?? Date.now() + Math.random()),
    apiId,
    _src: log,
    name: log.name ?? log.title ?? log.date ?? log.warDate ?? 'Battle log',
    date: dateOf(log),
    raw: log.raw ?? log.rawLog ?? log.raw_log ?? log.log ?? log.content ?? '',
    hash: log.hash,
    summary: normalizeSummary(log.summary || log.stats || log.analytics),
    created: log.created ?? log.createdAt ?? log.created_at,
    createdAt: log.createdAt ?? log.created_at ?? log.created,
    localOnly: log.localOnly || false,
  };
}

export function normalizeLogs(data) {
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data?.logs)
      ? data.logs
      : Array.isArray(data?.data)
        ? data.data
        : [];

  return arr.map(normalizeLog).filter((log) => log.raw || log.summary);
}

export function normalizeMembers(data) {
  return Array.isArray(data) ? data : data?.members || data?.data || [];
}


function extractMarkedSection(text, startMarker, endMarker) {
  const startIndex = text.indexOf(startMarker);
  const endIndex = text.indexOf(endMarker, startIndex + startMarker.length);

  if (startIndex < 0 || endIndex < 0) return '';

  return text.slice(startIndex + startMarker.length, endIndex).trim();
}

function splitRawLogSections(raw) {
  const text = String(raw || '');
  const markerIndexes = [
    text.indexOf(SECONDARY_LOG_START),
    text.indexOf(CLASS_LOG_START),
  ].filter((index) => index >= 0);
  const firstMarkerIndex = markerIndexes.length
    ? Math.min(...markerIndexes)
    : text.length;

  return {
    mainRaw: text.slice(0, firstMarkerIndex).trim(),
    secondaryRaw: extractMarkedSection(
      text,
      SECONDARY_LOG_START,
      SECONDARY_LOG_END,
    ),
    classRaw: extractMarkedSection(text, CLASS_LOG_START, CLASS_LOG_END),
  };
}

function parseSecondaryNumber(value) {
  const raw = String(value || '').trim();

  if (!raw) return 0;

  const suffixMatch = raw.match(/([kKmMbBtT])\s*$/);
  const suffix = suffixMatch?.[1]?.toLowerCase() || '';
  const multiplier =
    suffix === 't'
      ? 1000000000000
      : suffix === 'b'
        ? 1000000000
        : suffix === 'm'
          ? 1000000
          : suffix === 'k'
            ? 1000
            : 1;

  const withoutSuffix = raw.replace(/[kKmMbBtT]\s*$/g, '').trim();
  const compact = withoutSuffix.replace(/\s+/g, '');
  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  const decimalSeparator =
    lastComma >= 0 && lastDot >= 0
      ? lastComma > lastDot
        ? ','
        : '.'
      : null;

  let normalized = compact;

  if (decimalSeparator === ',') {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (decimalSeparator === '.') {
    normalized = normalized.replace(/,/g, '');
  } else {
    normalized = normalized.replace(/(?<=\d)[,.](?=\d{3}(\D|$))/g, '').replace(',', '.');
  }

  const number = Number(normalized.replace(/[^\d.-]/g, ''));

  return Number.isFinite(number) ? number * multiplier : 0;
}

function isSecondaryNumber(value) {
  const raw = String(value || '').trim();

  if (!raw || !/\d/.test(raw)) return false;

  const withoutUnitSuffix = raw.replace(/[kKmMbBtT]\s*$/g, '').trim();

  if (/[A-Za-z]/.test(withoutUnitSuffix)) return false;

  const cleaned = raw
    .replace(/[^\d\s.,+\-kKmMbBtT]/g, '')
    .trim();

  return /^[-+]?\d[\d\s.,]*(?:[kKmMbBtT])?$/.test(cleaned);
}

function splitSecondaryColumns(line) {
  const text = String(line || '').trim();

  if (!text) return [];

  const separatorCandidates = [
    text.split(/\t+/),
    text.split(/\s*\|\s*/),
    text.split(/\s*;\s*/),
  ].filter((parts) => parts.length > 1);

  const bestSeparated = separatorCandidates
    .map((parts) => parts.map((part) => part.trim()).filter(Boolean))
    .sort((a, b) => b.length - a.length)[0];

  if (bestSeparated?.length > 1) return bestSeparated;

  const multiSpace = text.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);

  if (multiSpace.length > 1) return multiSpace;

  return text.split(/\s+/).map((part) => part.trim()).filter(Boolean);
}

function expandPackedSecondaryNumberColumns(columns) {
  return columns.flatMap((column) => {
    const text = String(column || '').trim();
    const parts = text.split(/\s+/).filter(Boolean);

    if (parts.length > 1 && parts.every(isSecondaryNumber)) {
      return parts;
    }

    return [column];
  });
}

function normalizeSecondaryPlayerName(parts) {
  const name = parts.join(' ').replace(/^[-#•\d.\s]+/, '').trim();

  if (!name || isSecondaryNumber(name)) return '';

  const normalized = name
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const headerWords = new Set([
    'player',
    'name',
    'family',
    'kills',
    'kill',
    'deaths',
    'death',
    'kd',
    'k d',
    'damage',
    'damage dealt',
    'damage taken',
    'killstreak',
    'kill streak',
    'streak',
    'killfeed',
    'kill feed',
    'feed',
    'total',
    'fort',
    'damage to fort',
    'cc hits',
    'cc',
    'role',
    'main',
    'flex',
    'utility',
  ]);

  if (headerWords.has(normalized)) {
    return '';
  }

  return name;
}

function normalizeStatsRole(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  if (key === 'main') return 'Main';
  if (key === 'flex') return 'Flex';
  if (key === 'utility' || key === 'util') return 'Utility';

  return '';
}

function parseSecondaryIdentity(parts) {
  const tokens = parts
    .flatMap((part) => String(part || '').trim().split(/\s+/))
    .filter(Boolean);

  if (tokens.length < 3) {
    return {
      player: normalizeSecondaryPlayerName(parts),
      className: '',
      mode: '',
    };
  }

  const mode = normalizeClassLogMode(tokens.at(-1));

  if (!mode) {
    return {
      player: normalizeSecondaryPlayerName(parts),
      className: '',
      mode: '',
    };
  }

  for (const classWordCount of [2, 1]) {
    const classStart = tokens.length - 1 - classWordCount;

    if (classStart < 1) continue;

    const className = normalizeClassLogClass(
      tokens.slice(classStart, -1).join(' '),
    );
    const player = normalizeSecondaryPlayerName(tokens.slice(0, classStart));

    if (player && className) {
      return { player, className, mode };
    }
  }

  return {
    player: normalizeSecondaryPlayerName(parts),
    className: '',
    mode: '',
  };
}

function parseSecondaryLine(line, index) {
  let columns = splitSecondaryColumns(line);
  columns = expandPackedSecondaryNumberColumns(columns);

  if (columns.length < 2) return null;

  // Role is stored as one Stats Log field (`Main`, `Flex`, or `Utility`).
  // Prefer the final column, but scan the full row as a fallback because
  // spreadsheet pastes can attach irregular spacing or move the role token
  // into a neighbouring parsed column. Old rows without Role default to Main.
  let role = '';
  let roleColumnIndex = -1;

  for (let columnIndex = columns.length - 1; columnIndex >= 0; columnIndex -= 1) {
    const columnTokens = String(columns[columnIndex] || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    for (let tokenIndex = columnTokens.length - 1; tokenIndex >= 0; tokenIndex -= 1) {
      const normalizedRole = normalizeStatsRole(columnTokens[tokenIndex]);

      if (!normalizedRole) continue;

      role = normalizedRole;
      roleColumnIndex = columnIndex;
      columnTokens.splice(tokenIndex, 1);

      if (columnTokens.length) {
        columns[columnIndex] = columnTokens.join(' ');
      } else {
        columns.splice(columnIndex, 1);
      }

      break;
    }

    if (roleColumnIndex >= 0) break;
  }

  const firstNumberIndex = columns.findIndex(isSecondaryNumber);

  if (firstNumberIndex < 0) return null;

  const numericColumns = columns.slice(firstNumberIndex).filter(isSecondaryNumber);

  if (numericColumns.length < 2) return null;

  const identity = parseSecondaryIdentity(columns.slice(0, firstNumberIndex));
  const { player, className, mode } = identity;
  const kills = Math.round(parseSecondaryNumber(numericColumns[0]));
  const deaths = Math.round(parseSecondaryNumber(numericColumns[1]));

  const thirdColumn = String(numericColumns[2] || '').trim();
  const thirdNumber = parseSecondaryNumber(thirdColumn);
  const looksLikeKdColumn =
    player &&
    !className &&
    numericColumns.length >= 9 &&
    /[.,]/.test(thirdColumn) &&
    thirdNumber >= 0 &&
    thirdNumber <= 50;

  const killFeedIndex = looksLikeKdColumn ? 4 : 2;
  const damageDealtIndex = looksLikeKdColumn ? 5 : 3;
  const damageTakenIndex = looksLikeKdColumn ? 6 : 4;
  const ccHitsIndex = looksLikeKdColumn ? 7 : 5;

  const killFeed = Math.round(
    parseSecondaryNumber(numericColumns[killFeedIndex]),
  );
  const damageDealt = Math.round(
    parseSecondaryNumber(numericColumns[damageDealtIndex]),
  );
  const damageTaken = Math.round(
    parseSecondaryNumber(numericColumns[damageTakenIndex]),
  );
  const ccHits = Math.round(
    parseSecondaryNumber(numericColumns[ccHitsIndex]),
  );

  // New combined rows contain Heal and Ally Protection before Fort Damage.
  // Old rows remain supported because Fort Damage is still read from the
  // final numeric column when nine or more numeric columns are present.
  const hasExtendedSupportColumns = !looksLikeKdColumn && numericColumns.length >= 9;
  const heal = hasExtendedSupportColumns
    ? Math.round(parseSecondaryNumber(numericColumns[6]))
    : 0;
  const allyProtection = hasExtendedSupportColumns
    ? Math.round(parseSecondaryNumber(numericColumns[7]))
    : 0;
  // Fort Damage is not present in short legacy rows such as
  // `Name Kills Deaths`. Only treat the final value as Fort Damage when the
  // row has the full legacy metric set (7+ numeric values) or the new
  // extended combined layout (9 numeric values).
  const hasFortDamageColumn = numericColumns.length >= 7;
  const fortDamageIndex = numericColumns.length >= 9 ? 8 : numericColumns.length - 1;
  const fortDamage = hasFortDamageColumn
    ? Math.round(parseSecondaryNumber(numericColumns[fortDamageIndex]))
    : 0;

  if (
    !player &&
    kills === 0 &&
    deaths === 0 &&
    killFeed === 0 &&
    damageDealt === 0 &&
    damageTaken === 0 &&
    ccHits === 0 &&
    fortDamage === 0
  ) {
    return null;
  }

  return {
    player,
    ...(className
      ? {
          className,
          class: className,
          mode,
        }
      : {}),
    role: role || 'Main',
    kills,
    deaths,
    killFeed,
    damageDealt,
    damageTaken,
    ccHits,
    heal,
    allyProtection,
    fortDamage,
    has_kills: numericColumns.length > 0,
    has_deaths: numericColumns.length > 1,
    has_kill_feed: numericColumns.length > killFeedIndex,
    has_damage_dealt: numericColumns.length > damageDealtIndex,
    has_damage_taken: numericColumns.length > damageTakenIndex,
    has_cc_hits: numericColumns.length > ccHitsIndex,
    has_heal: hasExtendedSupportColumns,
    has_ally_protection: hasExtendedSupportColumns,
    has_fort_damage: hasFortDamageColumn,
    line: index + 1,
  };
}

export function parseSecondaryRows(raw) {
  const { secondaryRaw } = splitRawLogSections(raw);
  const source = secondaryRaw || String(raw || '');
  const rows = [];

  cleanLog(source)
    .split(NL)
    .forEach((line, index) => {
      const standaloneRole = normalizeStatsRole(line);

      // Some spreadsheet/browser pastes put the final Role value on its own
      // physical line. In that case it belongs to the previously parsed row.
      if (standaloneRole && rows.length) {
        rows[rows.length - 1].role = standaloneRole;
        return;
      }

      const parsed = parseSecondaryLine(line, index);

      if (parsed) rows.push(parsed);
    });

  return rows;
}

const CLASS_LOG_CLASS_NAMES = Object.freeze([
  'Archer',
  'Berserker',
  'Corsair',
  'Dark Knight',
  'Deadeye',
  'Dosa',
  'Drakania',
  'Guardian',
  'Hashashin',
  'Kunoichi',
  'Lahn',
  'Maegu',
  'Maehwa',
  'Musa',
  'Mystic',
  'Ninja',
  'Nova',
  'Ranger',
  'Sage',
  'Scholar',
  'Seraph',
  'Shai',
  'Sorceress',
  'Striker',
  'Tamer',
  'Valkyrie',
  'Warrior',
  'Witch',
  'Wizard',
  'Woosa',
  'Wukong',
]);

const CLASS_LOG_CLASS_LOOKUP = Object.freeze(
  CLASS_LOG_CLASS_NAMES.reduce(
    (lookup, className) => {
      lookup[className.toLowerCase().replace(/[^a-z0-9]/g, '')] = className;
      return lookup;
    },
    {
      berzerker: 'Berserker',
      wizzard: 'Wizard',
      darkknight: 'Dark Knight',
    },
  ),
);

function normalizeClassLogClass(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return CLASS_LOG_CLASS_LOOKUP[key] || '';
}

function normalizeClassLogMode(value) {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  if (key === 'awakening' || key === 'awakened' || key === 'awa') {
    return 'Awakening';
  }

  if (
    key === 'succession' ||
    key === 'succesion' ||
    key === 'sucession' ||
    key === 'succ' ||
    key === 'suc' ||
    key === 'talent' ||
    key === 'ascension'
  ) {
    return 'Succession';
  }

  return '';
}

function parseClassLogLine(line, index) {
  const text = String(line || '').trim();

  if (!text) return null;

  const normalizedHeader = text
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .trim();

  if (
    normalizedHeader === 'player class mode' ||
    normalizedHeader === 'name class mode' ||
    normalizedHeader === 'player class mode role' ||
    normalizedHeader === 'name class mode role'
  ) {
    return null;
  }

  const columns = text
    .split(/\t+|\s*\|\s*|\s*;\s*|\s{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (columns.length >= 3) {
    const role = normalizeStatsRole(columns.at(-1));
    const modeIndex = role ? -2 : -1;
    const player = String(columns[0] || '').trim();
    const className = normalizeClassLogClass(columns[1]);
    const mode = normalizeClassLogMode(columns.at(modeIndex));

    if (player && className && mode) {
      return {
        player,
        className,
        class: className,
        mode,
        role: role || 'Main',
        line: index + 1,
      };
    }
  }

  let parts = text.split(/\s+/).filter(Boolean);

  if (parts.length < 3) return null;

  const role = normalizeStatsRole(parts.at(-1));

  if (role) parts = parts.slice(0, -1);

  const mode = normalizeClassLogMode(parts.at(-1));

  if (!mode) return null;

  for (const classWordCount of [2, 1]) {
    const classStart = parts.length - 1 - classWordCount;

    if (classStart < 1) continue;

    const className = normalizeClassLogClass(
      parts.slice(classStart, -1).join(' '),
    );
    const player = parts.slice(0, classStart).join(' ').trim();

    if (!player || !className) continue;

    return {
      player,
      className,
      class: className,
      mode,
      role: role || 'Main',
      line: index + 1,
    };
  }

  return null;
}

export function parseClassRows(raw) {
  const { secondaryRaw, classRaw } = splitRawLogSections(raw);
  const sources = [];

  // Combined Stats + Class rows are valid class assignments too.
  if (secondaryRaw) sources.push(secondaryRaw);
  if (classRaw) sources.push(classRaw);
  if (!sources.length) sources.push(String(raw || ''));

  const byPlayer = new Map();

  sources.forEach((source) => {
    cleanLog(source)
      .split(NL)
      .forEach((line, index) => {
        const directClassRow = parseClassLogLine(line, index);

        if (directClassRow) {
          byPlayer.set(directClassRow.player, directClassRow);
          return;
        }

        const combinedRow = parseSecondaryLine(line, index);

        if (combinedRow?.player && combinedRow.className && combinedRow.mode) {
          byPlayer.set(combinedRow.player, {
            player: combinedRow.player,
            className: combinedRow.className,
            class: combinedRow.className,
            mode: combinedRow.mode,
            role: combinedRow.role || 'Main',
            line: index + 1,
          });
        }
      });
  });

  return Array.from(byPlayer.values());
}

function secondaryRowsTotals(rows) {
  return rows.reduce(
    (totals, row) => ({
      kills: totals.kills + (Number(row.kills) || 0),
      deaths: totals.deaths + (Number(row.deaths) || 0),
      killFeed: Math.max(totals.killFeed, Number(row.killFeed) || 0),
      damageDealt: totals.damageDealt + (Number(row.damageDealt) || 0),
      damageTaken: totals.damageTaken + (Number(row.damageTaken) || 0),
      ccHits: totals.ccHits + (Number(row.ccHits) || 0),
      fortDamage: totals.fortDamage + (Number(row.fortDamage) || 0),
    }),
    {
      kills: 0,
      deaths: 0,
      killFeed: 0,
      damageDealt: 0,
      damageTaken: 0,
      ccHits: 0,
      fortDamage: 0,
    },
  );
}

function parseClassicEventLine(line, index, name, date, id) {
  const closeBracket = line.indexOf(']');
  const openParenthesis = line.lastIndexOf('(');
  const closeParenthesis = line.lastIndexOf(')');

  if (closeBracket < 0 || openParenthesis < 0 || closeParenthesis < 0) {
    return null;
  }

  const time = line.slice(1, closeBracket);
  const info = line.slice(closeBracket + 2, openParenthesis).trim();
  const families = line.slice(openParenthesis + 1, closeParenthesis).split(',');

  if (families.length < 2) return null;

  if (info.includes(' has killed ')) {
    const [killer, rest] = info.split(' has killed ');
    const [victim, guild] = rest.split(' from ');

    return guild
      ? {
          i: index,
          type: 'kill',
          time,
          sec: secondsFromTime(time),
          killer,
          victim,
          guild,
          guildPlayer: killer,
          enemyPlayer: victim,
          kf: families[0],
          vf: families[1],
          war: name,
          date,
          id,
          source: 'classic',
          hasTimestamp: true,
        }
      : null;
  }

  if (info.includes(' died to ')) {
    const [victim, rest] = info.split(' died to ');
    const [killer, guild] = rest.split(' from ');

    return guild
      ? {
          i: index,
          type: 'death',
          time,
          sec: secondsFromTime(time),
          killer,
          victim,
          guild,
          guildPlayer: victim,
          enemyPlayer: killer,
          kf: families[1],
          vf: families[0],
          war: name,
          date,
          id,
          source: 'classic',
          hasTimestamp: true,
        }
      : null;
  }

  return null;
}

function parseSummaryLine(line) {
  const match = String(line || '').match(
    /^\s*(.+?)\s*\|\s*Kills\s*:\s*(\d+)\s*\|\s*Deaths\s*:\s*(\d+)\s*$/i,
  );

  if (!match) return null;

  const player = match[1].trim();
  const kills = Number(match[2]) || 0;
  const deaths = Number(match[3]) || 0;

  if (!player) return null;

  return {
    player,
    kills,
    deaths,
  };
}

function parseSummaryRows(raw) {
  return cleanLog(raw)
    .split(NL)
    .map(parseSummaryLine)
    .filter(Boolean);
}

function parseClassicEvents(raw, name, date, id) {
  return cleanLog(raw)
    .split(NL)
    .map((line, index) => parseClassicEventLine(line, index, name, date, id))
    .filter(Boolean)
    .sort((a, b) => a.sec - b.sec || a.i - b.i);
}

function summaryRowsToValidationEvents(rows, name, date, id) {
  const events = [];

  rows.forEach((row, rowIndex) => {
    for (let i = 0; i < row.kills; i += 1) {
      events.push({
        i: rowIndex * 10000 + i,
        type: 'kill',
        time: null,
        sec: 0,
        killer: row.player,
        victim: `Unknown_${rowIndex}_${i}`,
        guild: '',
        guildPlayer: row.player,
        enemyPlayer: `Unknown_${rowIndex}_${i}`,
        kf: '-',
        vf: '-',
        war: name,
        date,
        id,
        source: 'summary',
        hasTimestamp: false,
      });
    }

    for (let i = 0; i < row.deaths; i += 1) {
      events.push({
        i: rowIndex * 10000 + row.kills + i,
        type: 'death',
        time: null,
        sec: 0,
        killer: `Unknown_${rowIndex}_${i}`,
        victim: row.player,
        guild: '',
        guildPlayer: row.player,
        enemyPlayer: `Unknown_${rowIndex}_${i}`,
        kf: '-',
        vf: '-',
        war: name,
        date,
        id,
        source: 'summary',
        hasTimestamp: false,
      });
    }
  });

  return events;
}

export function parseLog(raw, name, date, id) {
  const { mainRaw, secondaryRaw } = splitRawLogSections(raw);
  const cleanedMain = cleanLog(mainRaw);
  const cleanedSecondary = cleanLog(secondaryRaw);

  if (!cleanedMain && !cleanedSecondary) return [];

  const classicEvents = parseClassicEvents(cleanedMain, name, date, id);
  const summaryRows = parseSummaryRows(cleanedMain);
  const secondaryRows = parseSecondaryRows(secondaryRaw);
  const secondarySummaryRows = secondaryRows
    .filter((row) => row.player)
    .map((row) => ({
      player: row.player,
      kills: row.kills,
      deaths: row.deaths,
    }));

  const summaryEvents = summaryRowsToValidationEvents(
    [...summaryRows, ...secondarySummaryRows],
    name,
    date,
    id,
  );

  return [...classicEvents, ...summaryEvents].sort(
    (a, b) => a.sec - b.sec || a.i - b.i,
  );
}

function getGuildPlayerFromEvent(event) {
  return event?.guildPlayer || (event?.type === 'kill' ? event?.killer : event?.victim) || '';
}

function getEnemyPlayerFromEvent(event) {
  return event?.enemyPlayer || (event?.type === 'kill' ? event?.victim : event?.killer) || '';
}

export function calculateStreaks(events) {
  const current = {};
  const best = {};

  events
    .filter((event) => event.hasTimestamp !== false && event.source !== 'summary')
    .forEach((event) => {
      const playerName = getGuildPlayerFromEvent(event);

      if (!playerName) return;

      if (event.type === 'kill') {
        current[playerName] = (current[playerName] || 0) + 1;
        best[playerName] = Math.max(best[playerName] || 0, current[playerName]);
      } else {
        current[playerName] = 0;
      }
    });

  return best;
}

export function calculateKillFeed(events, windowSeconds = 10, details = false) {
  const byPlayerAndWar = {};

  events
    .filter(
      (event) =>
        event.type === 'kill' &&
        event.hasTimestamp !== false &&
        event.source !== 'summary',
    )
    .forEach((event) => {
      const playerName = getGuildPlayerFromEvent(event);

      if (!playerName) return;

      const key = `${playerName}@@${event.id}`;

      (byPlayerAndWar[key] ||= []).push(event);
    });

  const output = details ? [] : {};

  for (const [key, list] of Object.entries(byPlayerAndWar)) {
    list.sort((a, b) => a.sec - b.sec);

    const name = key.split('@@')[0];
    let left = 0;
    let bestStart = 0;
    let bestEnd = 0;

    for (let right = 0; right < list.length; right += 1) {
      while (list[right].sec - list[left].sec > windowSeconds) {
        left += 1;
      }

      if (right - left > bestEnd - bestStart) {
        bestStart = left;
        bestEnd = right;
      }
    }

    const bestList = list.slice(bestStart, bestEnd + 1);

    if (details) {
      if (bestList.length > 1) {
        output.push({
          name,
          count: bestList.length,
          start: bestList[0].time,
          end: bestList.at(-1).time,
          war: bestList[0].war,
          date: bestList[0].date,
          id: bestList[0].id,
          victims: bestList.map((event) => getEnemyPlayerFromEvent(event)),
        });
      }
    } else {
      output[name] = Math.max(output[name] || 0, bestList.length);
    }
  }

  return details
    ? output.sort((a, b) => b.count - a.count || a.date.localeCompare(b.date))
    : output;
}

function getCachedRawLogParts(log) {
  const raw = String(log?.raw || '');
  const metadataKey = [
    String(log?.id || ''),
    String(log?.date || ''),
    String(log?.name || ''),
  ].join('|');

  let metadataMap = rawParseCache.get(raw);

  if (!metadataMap) {
    metadataMap = new Map();
    rememberLru(
      rawParseCache,
      raw,
      metadataMap,
      RAW_PARSE_CACHE_LIMIT,
    );
  } else {
    rawParseCache.delete(raw);
    rawParseCache.set(raw, metadataMap);
  }

  if (metadataMap.has(metadataKey)) {
    return metadataMap.get(metadataKey);
  }

  const sections = splitRawLogSections(raw);
  const classicEvents = parseClassicEvents(
    sections.mainRaw,
    log?.name,
    log?.date,
    log?.id,
  );
  const summaryRows = parseSummaryRows(sections.mainRaw).map(
    (row) => ({
      ...row,
      date: log?.date,
      id: log?.id,
      war: log?.name,
    }),
  );
  const secondaryRows = parseSecondaryRows(
    sections.secondaryRaw,
  ).map((row) => ({
    ...row,
    date: log?.date,
    id: log?.id,
    war: log?.name,
  }));

  const parsed = {
    classicEvents,
    summaryRows,
    secondaryRows,
  };

  metadataMap.set(metadataKey, parsed);

  return parsed;
}

function calculateStatsFromRaw(items) {
  const parsedItems = items.map(getCachedRawLogParts);

  const classicEvents = parsedItems
    .flatMap((item) => item.classicEvents)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.sec - b.sec ||
        a.i - b.i,
    );

  const summaryRows = parsedItems.flatMap(
    (item) => item.summaryRows,
  );

  const secondaryRows = parsedItems.flatMap(
    (item) => item.secondaryRows,
  );

  if (!classicEvents.length && !summaryRows.length && !secondaryRows.length) {
    return {
      ev: [],
      players: [],
      guilds: [],
      line: [],
      kills: 0,
      deaths: 0,
      kd: '0.00',
      st: {},
      fd: {},
      secondary: {
        rows: [],
        totals: secondaryRowsTotals([]),
      },
      hasTimeline: false,
      summaryOnly: false,
    };
  }

  const playerKills = {};
  const playerDeaths = {};
  const families = {};
  const guildKills = {};
  const guildDeaths = {};
  const minutes = {};
  const classicPlayerKills = {};
  const classicPlayerDeaths = {};
  const secondaryByPlayer = {};
  const secondaryByPlayerLog = {};

  // Shared indexes remove repeated full-array scans for every secondary row.
  const basePlayersByWar = {};
  const classicCountsByWarPlayer = {};
  const summaryCountsByWarPlayer = {};

  function normalizedWarId(value) {
    return String(value || 'secondary');
  }

  function warPlayerKey(warId, playerName) {
    return `${normalizedWarId(warId)}::${playerName}`;
  }

  function ensureBaseWarPlayer(warId, playerName) {
    const id = normalizedWarId(warId);

    basePlayersByWar[id] ||= {};
    basePlayersByWar[id][playerName] ||= {
      name: playerName,
      kills: 0,
      deaths: 0,
    };

    return basePlayersByWar[id][playerName];
  }

  classicEvents.forEach((event) => {
    const playerName = getGuildPlayerFromEvent(event);

    if (!playerName) return;

    const basePlayer = ensureBaseWarPlayer(
      event.id,
      playerName,
    );
    const indexedKey = warPlayerKey(event.id, playerName);

    classicCountsByWarPlayer[indexedKey] ||= {
      kills: 0,
      deaths: 0,
    };

    if (event.type === 'kill') {
      basePlayer.kills += 1;
      classicCountsByWarPlayer[indexedKey].kills += 1;
      add(playerKills, playerName);
      add(classicPlayerKills, playerName);
      add(guildKills, event.guild);
      families[playerName] = event.kf || families[playerName] || '-';
    } else {
      basePlayer.deaths += 1;
      classicCountsByWarPlayer[indexedKey].deaths += 1;
      add(playerDeaths, playerName);
      add(classicPlayerDeaths, playerName);
      add(guildDeaths, event.guild);
      families[playerName] = event.vf || families[playerName] || '-';
    }

    const minute = minuteLabel(Math.floor(event.sec / 60) * 60);

    minutes[minute] ||= {
      time: minute,
      kills: 0,
      deaths: 0,
    };

    minutes[minute][event.type === 'kill' ? 'kills' : 'deaths'] += 1;
  });

  summaryRows.forEach((row) => {
    add(playerKills, row.player, row.kills);
    add(playerDeaths, row.player, row.deaths);
    families[row.player] = families[row.player] || '-';

    const basePlayer = ensureBaseWarPlayer(
      row.id,
      row.player,
    );
    const indexedKey = warPlayerKey(row.id, row.player);

    basePlayer.kills += Number(row.kills) || 0;
    basePlayer.deaths += Number(row.deaths) || 0;

    summaryCountsByWarPlayer[indexedKey] ||= {
      kills: 0,
      deaths: 0,
    };
    summaryCountsByWarPlayer[indexedKey].kills +=
      Number(row.kills) || 0;
    summaryCountsByWarPlayer[indexedKey].deaths +=
      Number(row.deaths) || 0;
  });

  function mergeSecondaryValues(current, playerName, row) {
    return {
      ...current,
      player: playerName,
      id: row.id,
      date: row.date,
      war: row.war,
      kills: (Number(current.kills) || 0) + (Number(row.kills) || 0),
      deaths: (Number(current.deaths) || 0) + (Number(row.deaths) || 0),
      killFeed: Math.max(
        Number(current.killFeed) || 0,
        Number(row.killFeed) || 0,
      ),
      damageDealt:
        (Number(current.damageDealt) || 0) + (Number(row.damageDealt) || 0),
      damageTaken:
        (Number(current.damageTaken) || 0) + (Number(row.damageTaken) || 0),
      ccHits: (Number(current.ccHits) || 0) + (Number(row.ccHits) || 0),
      fortDamage:
        (Number(current.fortDamage) || 0) + (Number(row.fortDamage) || 0),
    };
  }

  function emptySecondaryRow(playerName, row = {}) {
    return {
      player: playerName,
      id: row.id,
      date: row.date,
      war: row.war,
      kills: 0,
      deaths: 0,
      killFeed: 0,
      damageDealt: 0,
      damageTaken: 0,
      ccHits: 0,
      fortDamage: 0,
    };
  }

  function secondaryLogKey(row, playerName) {
    return `${String(row.id || row.date || 'secondary')}::${playerName}`;
  }

  function mergeSecondaryRow(playerName, row) {
    if (!playerName) return;

    const current = secondaryByPlayer[playerName] || emptySecondaryRow(playerName, row);
    secondaryByPlayer[playerName] = mergeSecondaryValues(current, playerName, row);

    const logKey = secondaryLogKey(row, playerName);
    const currentLog = secondaryByPlayerLog[logKey] || emptySecondaryRow(playerName, row);
    secondaryByPlayerLog[logKey] = mergeSecondaryValues(currentLog, playerName, row);
  }

  const scopedBasePlayersCache = {};
  let fallbackBasePlayers = null;

  function sortBasePlayers(rows) {
    return rows.sort(
      (a, b) =>
        b.kills - a.kills ||
        a.deaths - b.deaths ||
        a.name.localeCompare(b.name),
    );
  }

  function buildBasePlayersForSecondary(row) {
    const warId = normalizedWarId(row.id);

    if (!scopedBasePlayersCache[warId]) {
      scopedBasePlayersCache[warId] = sortBasePlayers(
        Object.values(basePlayersByWar[warId] || {}).map(
          (player) => ({ ...player }),
        ),
      );
    }

    const scopedPlayers = scopedBasePlayersCache[warId];

    if (scopedPlayers.length) {
      return scopedPlayers;
    }

    if (!fallbackBasePlayers) {
      fallbackBasePlayers = sortBasePlayers(
        [
          ...new Set([
            ...Object.keys(playerKills),
            ...Object.keys(playerDeaths),
          ]),
        ].map((name) => ({
          name,
          kills: playerKills[name] || 0,
          deaths: playerDeaths[name] || 0,
        })),
      );
    }

    return fallbackBasePlayers;
  }

  const assignedSecondaryPlayers = new Set();
  const unnamedSecondaryCounters = {};

  secondaryRows.forEach((row) => {
    if (row.player) {
      mergeSecondaryRow(row.player, row);
      assignedSecondaryPlayers.add(`${row.id}:${row.player}`);
      return;
    }

    const candidates = buildBasePlayersForSecondary(row).filter(
      (candidate) => !assignedSecondaryPlayers.has(`${row.id}:${candidate.name}`),
    );

    const exactMatches = candidates.filter(
      (candidate) =>
        Number(candidate.kills) === Number(row.kills) &&
        Number(candidate.deaths) === Number(row.deaths),
    );

    const killMatches = candidates.filter(
      (candidate) => Number(candidate.kills) === Number(row.kills),
    );

    const counterKey = String(row.id || row.date || 'secondary');
    const fallbackIndex = unnamedSecondaryCounters[counterKey] || 0;
    unnamedSecondaryCounters[counterKey] = fallbackIndex + 1;

    const target =
      exactMatches[0] ||
      (killMatches.length === 1 ? killMatches[0] : null) ||
      candidates[fallbackIndex] ||
      candidates[0];

    if (!target?.name) return;

    mergeSecondaryRow(target.name, row);
    assignedSecondaryPlayers.add(`${row.id}:${target.name}`);
  });

  Object.values(secondaryByPlayerLog).forEach((row) => {
    const playerName = row.player;

    if (!playerName) return;

    const indexedKey = warPlayerKey(row.id, playerName);
    const classicCounts =
      classicCountsByWarPlayer[indexedKey] || {};
    const summaryCounts =
      summaryCountsByWarPlayer[indexedKey] || {};

    const classicKillsForSameLog =
      Number(classicCounts.kills) || 0;
    const classicDeathsForSameLog =
      Number(classicCounts.deaths) || 0;
    const summaryKillsForSameLog =
      Number(summaryCounts.kills) || 0;
    const summaryDeathsForSameLog =
      Number(summaryCounts.deaths) || 0;

    playerKills[playerName] = Math.max(
      0,
      (Number(playerKills[playerName]) || 0) -
        classicKillsForSameLog -
        summaryKillsForSameLog +
        (Number(row.kills) || 0),
    );

    playerDeaths[playerName] = Math.max(
      0,
      (Number(playerDeaths[playerName]) || 0) -
        classicDeathsForSameLog -
        summaryDeathsForSameLog +
        (Number(row.deaths) || 0),
    );

    families[playerName] = families[playerName] || '-';
  });

  const hasTimeline = classicEvents.length > 0;
  const summaryOnly =
    (summaryRows.length > 0 || secondaryRows.length > 0) && classicEvents.length === 0;
  const line = [];

  if (hasTimeline) {
    const first = Math.min(...classicEvents.map((event) => event.sec));
    const last = Math.max(...classicEvents.map((event) => event.sec));

    for (
      let t = Math.floor(first / 60) * 60;
      t <= Math.floor(last / 60) * 60;
      t += 60
    ) {
      line.push(
        minutes[minuteLabel(t)] || {
          time: minuteLabel(t),
          kills: 0,
          deaths: 0,
        },
      );
    }
  }

  const secondaryPlayerNames = new Set(Object.keys(secondaryByPlayer));
  const secondaryTotals = secondaryRowsTotals(secondaryRows);
  const hasNamedSecondaryRows = secondaryPlayerNames.size > 0;
  const hasSecondaryRows = secondaryRows.length > 0;

  const players = [
    ...new Set([...Object.keys(playerKills), ...Object.keys(playerDeaths)]),
  ]
    .map((name) => {
      const secondary = secondaryByPlayer[name] || null;
      const kills = playerKills[name] || 0;
      const deaths = playerDeaths[name] || 0;

      return {
        name,
        family: families[name] || '-',
        kills,
        deaths,
        kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
        ...(secondary
          ? {
              killFeed: secondary.killFeed,
              damageDealt: secondary.damageDealt,
              damageTaken: secondary.damageTaken,
              ccHits: secondary.ccHits,
              fortDamage: secondary.fortDamage,
            }
          : {}),
      };
    })
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);

  const guilds = [
    ...new Set([...Object.keys(guildKills), ...Object.keys(guildDeaths)]),
  ].map((name) => {
    const kills = guildKills[name] || 0;
    const deaths = guildDeaths[name] || 0;

    return {
      name,
      kills,
      deaths,
      kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
    };
  });

  const kills = Object.values(playerKills).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );

  const deaths = Object.values(playerDeaths).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );

  const classicStreaks = hasTimeline ? calculateStreaks(classicEvents) : {};
  const classicKillFeed = hasTimeline ? calculateKillFeed(classicEvents) : {};
  const st = { ...classicStreaks };
  const fd = { ...classicKillFeed };

  Object.values(secondaryByPlayer).forEach((row) => {
    fd[row.player] = Math.max(
      Number(fd[row.player]) || 0,
      Number(row.killFeed) || 0,
    );
  });

  return {
    ev: classicEvents,
    players,
    guilds,
    line,
    kills,
    deaths,
    kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
    st,
    fd,
    secondary: {
      rows: secondaryRows,
      totals: secondaryTotals,
    },
    hasTimeline,
    summaryOnly,
  };
}

function mergeStatsFromSummaries(items) {
  const playerKills = {};
  const playerDeaths = {};
  const playerFamilies = {};
  const guildKills = {};
  const guildDeaths = {};
  const lineMap = {};
  const st = {};
  const fd = {};
  const secondaryByPlayer = {};
  const secondaryTotals = {
    kills: 0,
    deaths: 0,
    killFeed: 0,
    damageDealt: 0,
    damageTaken: 0,
    ccHits: 0,
    fortDamage: 0,
  };

  let kills = 0;
  let deaths = 0;
  let hasTimeline = false;
  let summaryOnly = false;

  items.forEach((log) => {
    const summary = getLogSummary(log);

    kills += Number(summary.kills) || 0;
    deaths += Number(summary.deaths) || 0;

    if (summary.hasTimeline) hasTimeline = true;
    if (summary.summaryOnly) summaryOnly = true;

    summary.players.forEach((player) => {
      add(playerKills, player.name, Number(player.kills) || 0);
      add(playerDeaths, player.name, Number(player.deaths) || 0);

      playerFamilies[player.name] =
        player.family || playerFamilies[player.name] || '-';

      if (
        player.killFeed != null ||
        player.killStreak != null ||
        player.damageDealt != null ||
        player.damageTaken != null ||
        player.ccHits != null ||
        player.fortDamage != null
      ) {
        const current = secondaryByPlayer[player.name] || {
          killFeed: 0,
          damageDealt: 0,
          damageTaken: 0,
          ccHits: 0,
          fortDamage: 0,
        };

        // Legacy summaries stored the third stats column as killStreak.
        const playerKillFeed =
          Number(player.killFeed ?? player.killStreak) || 0;

        secondaryByPlayer[player.name] = {
          killFeed: Math.max(current.killFeed, playerKillFeed),
          damageDealt: current.damageDealt + (Number(player.damageDealt) || 0),
          damageTaken: current.damageTaken + (Number(player.damageTaken) || 0),
          ccHits: current.ccHits + (Number(player.ccHits) || 0),
          fortDamage: current.fortDamage + (Number(player.fortDamage) || 0),
        };
      }
    });

    if (summary.secondary?.totals) {
      secondaryTotals.kills += Number(summary.secondary.totals.kills) || 0;
      secondaryTotals.deaths += Number(summary.secondary.totals.deaths) || 0;
      const summaryKillFeed =
        Number(
          summary.secondary.totals.killFeed ??
            summary.secondary.totals.killStreak,
        ) || 0;

      secondaryTotals.killFeed = Math.max(
        secondaryTotals.killFeed,
        summaryKillFeed,
      );
      secondaryTotals.damageDealt += Number(summary.secondary.totals.damageDealt) || 0;
      secondaryTotals.damageTaken += Number(summary.secondary.totals.damageTaken) || 0;
      secondaryTotals.ccHits += Number(summary.secondary.totals.ccHits) || 0;
      secondaryTotals.fortDamage += Number(summary.secondary.totals.fortDamage) || 0;
    }

    summary.guilds.forEach((guild) => {
      add(guildKills, guild.name, Number(guild.kills) || 0);
      add(guildDeaths, guild.name, Number(guild.deaths) || 0);
    });

    if (summary.hasTimeline) {
      summary.line.forEach((point) => {
        const key = `${log.date || dateOf(log)} ${point.time}`;

        lineMap[key] ||= {
          time: point.time,
          kills: 0,
          deaths: 0,
        };

        lineMap[key].kills += Number(point.kills) || 0;
        lineMap[key].deaths += Number(point.deaths) || 0;
      });

    }

    Object.entries(summary.st || {}).forEach(([name, value]) => {
      st[name] = Math.max(Number(st[name]) || 0, Number(value) || 0);
    });

    Object.entries(summary.fd || {}).forEach(([name, value]) => {
      fd[name] = Math.max(Number(fd[name]) || 0, Number(value) || 0);
    });
  });

  Object.entries(secondaryByPlayer).forEach(([name, secondary]) => {
    fd[name] = Math.max(
      Number(fd[name]) || 0,
      Number(secondary.killFeed) || 0,
    );
  });

  const players = [
    ...new Set([...Object.keys(playerKills), ...Object.keys(playerDeaths)]),
  ]
    .map((name) => {
      const pk = playerKills[name] || 0;
      const pd = playerDeaths[name] || 0;

      const secondary = secondaryByPlayer[name] || null;

      return {
        name,
        family: playerFamilies[name] || '-',
        kills: pk,
        deaths: pd,
        kd: pd ? (pk / pd).toFixed(2) : pk.toFixed(2),
        ...(secondary
          ? {
              killFeed: secondary.killFeed,
              damageDealt: secondary.damageDealt,
              damageTaken: secondary.damageTaken,
              ccHits: secondary.ccHits,
              fortDamage: secondary.fortDamage,
            }
          : {}),
      };
    })
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);

  const guilds = [
    ...new Set([...Object.keys(guildKills), ...Object.keys(guildDeaths)]),
  ].map((name) => {
    const gk = guildKills[name] || 0;
    const gd = guildDeaths[name] || 0;

    return {
      name,
      kills: gk,
      deaths: gd,
      kd: gd ? (gk / gd).toFixed(2) : gk.toFixed(2),
    };
  });

  const line = Object.values(lineMap);

  return {
    ev: [],
    players,
    guilds,
    line,
    kills,
    deaths,
    kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
    st,
    fd,
    secondary: {
      rows: [],
      totals: secondaryTotals,
    },
    hasTimeline,
    summaryOnly: summaryOnly && !hasTimeline,
  };
}

function calculateStatsUncached(logs) {
  const logsWithRaw = logs.filter((log) => Boolean(log.raw));
  const logsWithoutRaw = logs.filter((log) => !log.raw);

  if (logsWithRaw.length > 0 && !logsWithoutRaw.length) {
    return calculateStatsFromRaw(logsWithRaw);
  }

  if (logsWithRaw.length > 0) {
    const rawStats = calculateStatsFromRaw(logsWithRaw);
    const summaryStats = mergeStatsFromSummaries(logsWithoutRaw);

    const merged = mergeStatsFromSummaries([
      {
        id: '__raw_stats__',
        date: logsWithRaw[0]?.date || today(),
        summary: rawStats,
      },
      {
        id: '__summary_stats__',
        date: logsWithoutRaw[0]?.date || today(),
        summary: summaryStats,
      },
    ]);

    return {
      ...merged,
      ev: rawStats.ev || [],
      hasTimeline: Boolean(
        rawStats.hasTimeline || summaryStats.hasTimeline,
      ),
      summaryOnly: Boolean(
        summaryStats.summaryOnly && !rawStats.hasTimeline,
      ),
    };
  }

  return mergeStatsFromSummaries(logs);
}

export function calculateStats(items) {
  const logs = Array.isArray(items) ? items : [];

  if (!logs.length) {
    return {
      ev: [],
      players: [],
      guilds: [],
      line: [],
      kills: 0,
      deaths: 0,
      kd: '0.00',
      st: {},
      fd: {},
      secondary: {
        rows: [],
        totals: secondaryRowsTotals([]),
      },
      hasTimeline: false,
      summaryOnly: false,
    };
  }

  const signature = calculateStatsSignature(logs);

  if (calculatedStatsCache.has(signature)) {
    const cached = calculatedStatsCache.get(signature);

    calculatedStatsCache.delete(signature);
    calculatedStatsCache.set(signature, cached);

    return cached;
  }

  const result = calculateStatsUncached(logs);

  return rememberLru(
    calculatedStatsCache,
    signature,
    result,
    STATS_CACHE_LIMIT,
  );
}

export function buildLogSummary(log) {
  const stats = calculateStatsFromRaw([
    {
      ...log,
      date: dateOf(log),
    },
  ]);

  const topEnemies = [...stats.guilds]
    .map((guild) => {
      const ourKills = Number(guild.kills) || 0;
      const ourDeaths = Number(guild.deaths) || 0;
      const total = ourKills + ourDeaths;

      return {
        name: guild.name,
        kills: ourDeaths,
        deaths: ourKills,
        total,
        kd: ourKills ? (ourDeaths / ourKills).toFixed(2) : ourDeaths.toFixed(2),
      };
    })
    .sort((a, b) => b.total - a.total || b.kills - a.kills)
    .slice(0, 5);

  return {
    version: 1,
    kills: stats.kills,
    deaths: stats.deaths,
    kd: stats.kd,
    playersCount: stats.players.length,
    players: stats.players,
    guilds: stats.guilds,
    line: stats.hasTimeline ? stats.line : [],
    topEnemies,
    enemyNames: stats.guilds.map((guild) => guild.name).filter(Boolean),
    st: stats.st || {},
    fd: stats.fd || {},
    secondary: stats.secondary,
    hasTimeline: stats.hasTimeline,
    summaryOnly: stats.summaryOnly,
    calculatedAt: new Date().toISOString(),
  };
}

export function getLogSummary(log) {
  const normalized = normalizeSummary(log?.summary || log?.stats || log?.analytics);

  if (normalized) return normalized;

  if (!log?.raw) {
    return normalizeSummary({
      kills: 0,
      deaths: 0,
      kd: '0.00',
      playersCount: 0,
      players: [],
      guilds: [],
      line: [],
      topEnemies: [],
      enemyNames: [],
      st: {},
      fd: {},
      secondary: { rows: [], totals: secondaryRowsTotals([]) },
      hasTimeline: false,
      summaryOnly: false,
    });
  }

  return buildLogSummary(log);
}

export function buildNodeWarRow(log) {
  const summary = getLogSummary(log);
  const secondaryTotals = summary.secondary?.totals || {};
  const playerSecondaryTotals = (summary.players || []).reduce(
    (totals, player) => ({
      damageDealt:
        totals.damageDealt + (Number(player.damageDealt) || 0),
      damageTaken:
        totals.damageTaken + (Number(player.damageTaken) || 0),
      ccHits: totals.ccHits + (Number(player.ccHits) || 0),
      fortDamage: totals.fortDamage + (Number(player.fortDamage) || 0),
    }),
    {
      damageDealt: 0,
      damageTaken: 0,
      ccHits: 0,
      fortDamage: 0,
    },
  );

  return {
    ...log,
    date: dateOf(log),
    players: Number(summary.playersCount) || Number(summary.players?.length) || 0,
    kills: Number(summary.kills) || 0,
    deaths: Number(summary.deaths) || 0,
    kd: summary.kd || '0.00',
    kdNumber: Number(summary.kd) || 0,
    damageDealt:
      Number(secondaryTotals.damageDealt) || playerSecondaryTotals.damageDealt || 0,
    damageTaken:
      Number(secondaryTotals.damageTaken) || playerSecondaryTotals.damageTaken || 0,
    ccHits: Number(secondaryTotals.ccHits) || playerSecondaryTotals.ccHits || 0,
    fortDamage:
      Number(secondaryTotals.fortDamage) || playerSecondaryTotals.fortDamage || 0,
    topEnemies: summary.topEnemies || [],
    allEnemyNames:
      summary.enemyNames?.length > 0
        ? summary.enemyNames
        : (summary.guilds || []).map((guild) => guild.name).filter(Boolean),
    hasTimeline: Boolean(summary.hasTimeline),
    summaryOnly: Boolean(summary.summaryOnly),
  };
}
