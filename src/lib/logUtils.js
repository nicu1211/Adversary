const NL = String.fromCharCode(10);

const SECONDARY_LOG_START = '===== ADVERSARY_SECONDARY_LOG_START =====';
const SECONDARY_LOG_END = '===== ADVERSARY_SECONDARY_LOG_END =====';

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


function splitRawLogSections(raw) {
  const text = String(raw || '');

  if (!text.includes(SECONDARY_LOG_START) || !text.includes(SECONDARY_LOG_END)) {
    return {
      mainRaw: text,
      secondaryRaw: '',
    };
  }

  const mainRaw = text.split(SECONDARY_LOG_START)[0] || '';
  const afterStart = text.split(SECONDARY_LOG_START)[1] || '';
  const secondaryRaw = afterStart.split(SECONDARY_LOG_END)[0] || '';

  return {
    mainRaw: mainRaw.trim(),
    secondaryRaw: secondaryRaw.trim(),
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

function splitSecondaryColumns(line, preferredMode = '') {
  const raw = String(line ?? '').replace(/\r$/, '');
  const text = raw.trim();

  if (!text) {
    return {
      columns: [],
      mode: preferredMode || '',
    };
  }

  function detectMode() {
    if (raw.includes('\t')) return 'tab';
    if (raw.includes('|')) return 'pipe';
    if (raw.includes(';')) return 'semicolon';
    if (/\s{2,}/.test(text)) return 'spaces';
    return 'whitespace';
  }

  function splitByMode(mode) {
    let columns;

    if (mode === 'tab') {
      // Split on every tab so an empty tab-separated cell stays empty.
      columns = raw.split('\t');
    } else if (mode === 'pipe') {
      // Do not use `\s*\|\s*` here. Plain split preserves empty cells.
      columns = raw.split('|');
    } else if (mode === 'semicolon') {
      columns = raw.split(';');
    } else if (mode === 'spaces') {
      columns = text.split(/\s{2,}/);
    } else {
      columns = text.split(/\s+/);
    }

    columns = columns.map((part) => String(part ?? '').trim());

    // Markdown/table borders often add one decorative empty cell at each end.
    // Remove only those outside cells; internal empty cells must remain.
    if (mode === 'pipe' || mode === 'semicolon') {
      const separator = mode === 'pipe' ? '|' : ';';
      const trimmedRaw = raw.trim();

      if (trimmedRaw.startsWith(separator) && columns[0] === '') {
        columns.shift();
      }

      if (trimmedRaw.endsWith(separator) && columns.at(-1) === '') {
        columns.pop();
      }
    }

    return columns;
  }

  let mode = preferredMode || detectMode();
  let columns = splitByMode(mode);

  // A copied table can occasionally use a different delimiter on a later line.
  // Fall back to automatic detection rather than treating the whole row as one cell.
  if (preferredMode && columns.length <= 1) {
    const detectedMode = detectMode();

    if (detectedMode !== preferredMode) {
      mode = detectedMode;
      columns = splitByMode(mode);
    }
  }

  return {
    columns,
    mode,
  };
}

function expandPackedSecondaryNumberColumns(columns) {
  return columns.flatMap((column) => {
    const text = String(column || '').trim();
    const parts = text.split(/\s+/).filter(Boolean);

    if (parts.length > 1 && parts.every(isSecondaryNumber)) {
      return parts;
    }

    // Keep empty cells. They carry positional meaning in old headerless rows.
    return [column];
  });
}

function normalizeSecondaryPlayerName(parts) {
  const name = parts.join(' ').replace(/^[-#•\d.\s]+/, '').trim();

  if (!name || isSecondaryNumber(name)) return '';

  const normalized = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const headerWords = new Set([
    'player',
    'player name',
    'name',
    'family',
    'family name',
    'character',
    'character name',
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
    'fort damage',
    'cc hits',
    'cc',
  ]);

  if (headerWords.has(normalized)) {
    return '';
  }

  return name;
}

function normalizeSecondaryHeaderCell(value) {
  return String(value ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function secondaryMetricFromHeader(value) {
  const header = normalizeSecondaryHeaderCell(value);

  if (!header) return '';

  const exactAliases = {
    player: new Set([
      'player',
      'player name',
      'name',
      'family',
      'family name',
      'character',
      'character name',
      'member',
      'member name',
    ]),
    kills: new Set(['kills', 'kill', 'k', 'total kills']),
    deaths: new Set(['deaths', 'death', 'd', 'total deaths']),
    kd: new Set(['kd', 'k d', 'ratio', 'kill death ratio', 'kills deaths ratio']),
    killStreak: new Set([
      'killstreak',
      'kill streak',
      'streak',
      'best streak',
      'max streak',
      'ks',
    ]),
    killFeed: new Set([
      'killfeed',
      'kill feed',
      'feed',
      'best feed',
      'max feed',
      'kf',
    ]),
    damageDealt: new Set([
      'damage',
      'dmg',
      'damage dealt',
      'dmg dealt',
      'damage done',
      'dmg done',
      'total damage',
      'damage output',
    ]),
    damageTaken: new Set([
      'damage taken',
      'dmg taken',
      'damage received',
      'dmg received',
    ]),
    ccHits: new Set([
      'cc',
      'cc hit',
      'cc hits',
      'crowd control',
      'crowd controls',
      'crowd control hits',
    ]),
    fortDamage: new Set([
      'fort',
      'fort damage',
      'damage to fort',
      'dmg to fort',
      'fort dmg',
      'structure damage',
      'damage to structure',
    ]),
  };

  for (const [metric, aliases] of Object.entries(exactAliases)) {
    if (aliases.has(header)) return metric;
  }

  // Flexible fallbacks for slightly different exported header wording.
  if (/^(player|family|character|member)( name)?$/.test(header)) return 'player';
  if (/^(total )?kills?$/.test(header)) return 'kills';
  if (/^(total )?deaths?$/.test(header)) return 'deaths';
  if (/^(k d|kd)( ratio)?$/.test(header)) return 'kd';
  if (header.includes('kill') && header.includes('streak')) return 'killStreak';
  if (header.includes('kill') && header.includes('feed')) return 'killFeed';
  if (header.includes('cc') || header.includes('crowd control')) return 'ccHits';

  if (header.includes('damage') || header.includes('dmg')) {
    if (header.includes('fort') || header.includes('structure')) {
      return 'fortDamage';
    }

    if (header.includes('taken') || header.includes('received')) {
      return 'damageTaken';
    }

    if (
      header.includes('dealt') ||
      header.includes('done') ||
      header.includes('output') ||
      header.includes('total')
    ) {
      return 'damageDealt';
    }
  }

  return '';
}

function buildSecondaryHeader(columns, mode) {
  const indexes = {};

  columns.forEach((column, index) => {
    const metric = secondaryMetricFromHeader(column);

    if (metric && indexes[metric] === undefined) {
      indexes[metric] = index;
    }
  });

  const mappedMetrics = Object.keys(indexes);
  const hasIdentityColumn = indexes.player !== undefined;
  const hasCoreColumns =
    indexes.kills !== undefined && indexes.deaths !== undefined;

  // Require a player column and either the K/D core or at least three recognised
  // statistics. This avoids mistaking a normal player row for a header.
  if (
    !hasIdentityColumn ||
    (!hasCoreColumns && mappedMetrics.length < 4)
  ) {
    return null;
  }

  return {
    indexes,
    mode,
    columnCount: columns.length,
    columns: [...columns],
  };
}

function parseSecondaryLineWithHeader(line, index, header) {
  const split = splitSecondaryColumns(line, header.mode);
  const columns = [...split.columns];

  while (columns.length < header.columnCount) {
    columns.push('');
  }

  function readMetric(metric) {
    const columnIndex = header.indexes[metric];

    if (columnIndex === undefined || columnIndex >= columns.length) {
      return {
        present: false,
        value: 0,
      };
    }

    const rawValue = String(columns[columnIndex] ?? '').trim();
    const present = isSecondaryNumber(rawValue);

    return {
      present,
      value: present
        ? Math.round(parseSecondaryNumber(rawValue))
        : 0,
    };
  }

  const playerIndex = header.indexes.player;
  const player = normalizeSecondaryPlayerName([
    playerIndex !== undefined ? columns[playerIndex] : '',
  ]);

  const kills = readMetric('kills');
  const deaths = readMetric('deaths');
  const killStreak = readMetric('killStreak');
  const killFeed = readMetric('killFeed');
  const damageDealt = readMetric('damageDealt');
  const damageTaken = readMetric('damageTaken');
  const ccHits = readMetric('ccHits');
  const fortDamage = readMetric('fortDamage');

  const anyMetricPresent = [
    kills,
    deaths,
    killStreak,
    killFeed,
    damageDealt,
    damageTaken,
    ccHits,
    fortDamage,
  ].some((metric) => metric.present);

  if (!player && !anyMetricPresent) return null;

  return {
    player,
    kills: kills.value,
    deaths: deaths.value,
    killStreak: killStreak.value,
    killFeed: killFeed.value,
    damageDealt: damageDealt.value,
    damageTaken: damageTaken.value,
    ccHits: ccHits.value,
    fortDamage: fortDamage.value,
    line: index + 1,
    rawLine: String(line || ''),
    source: 'header-mapped',
    availableFields: [
      kills.present && 'kills',
      deaths.present && 'deaths',
      killStreak.present && 'killStreak',
      killFeed.present && 'killFeed',
      damageDealt.present && 'damageDealt',
      damageTaken.present && 'damageTaken',
      ccHits.present && 'ccHits',
      fortDamage.present && 'fortDamage',
    ].filter(Boolean),
    has_kills: kills.present,
    has_deaths: deaths.present,
    has_kill_streak: killStreak.present,
    has_kill_feed: killFeed.present,
    has_damage_dealt: damageDealt.present,
    has_damage_taken: damageTaken.present,
    has_cc_hits: ccHits.present,
    has_fort_damage: fortDamage.present,
  };
}

function parseSecondaryLineLegacy(line, index) {
  const split = splitSecondaryColumns(line);
  let columns = expandPackedSecondaryNumberColumns(split.columns);

  if (columns.length < 2) return null;

  const firstNumberIndex = columns.findIndex(isSecondaryNumber);

  if (firstNumberIndex < 0) return null;

  // Keep all cells after Kills, including empty cells. Filtering numeric values
  // is what previously shifted Damage/CC/Fort values into the wrong fields.
  const statColumns = columns.slice(firstNumberIndex);

  if (statColumns.length < 2) return null;

  const player = normalizeSecondaryPlayerName(columns.slice(0, firstNumberIndex));

  function hasColumn(columnIndex) {
    return (
      columnIndex >= 0 &&
      columnIndex < statColumns.length &&
      isSecondaryNumber(statColumns[columnIndex])
    );
  }

  function readColumn(columnIndex) {
    return hasColumn(columnIndex)
      ? Math.round(parseSecondaryNumber(statColumns[columnIndex]))
      : 0;
  }

  const kills = readColumn(0);
  const deaths = readColumn(1);
  const thirdColumn = String(statColumns[2] || '').trim();
  const thirdNumber = parseSecondaryNumber(thirdColumn);
  const laterValuesLookLikeDamage =
    parseSecondaryNumber(statColumns[5]) >= 1000 ||
    parseSecondaryNumber(statColumns[6]) >= 1000;

  /*
   * Headerless compatibility only. Header-based tables never use this guess.
   * Current layout: K, D, K/D, Killstreak, Killfeed, Damage Dealt,
   * Damage Taken, CC Hits, Fort Damage.
   * Older layouts can omit K/D or both K/D and Killstreak.
   */
  const looksLikeKdColumn =
    player &&
    statColumns.length >= 9 &&
    hasColumn(2) &&
    thirdNumber >= 0 &&
    thirdNumber <= 50 &&
    (/[.,]/.test(thirdColumn) || laterValuesLookLikeDamage);

  const hasSeparateKillstreak =
    looksLikeKdColumn || statColumns.length >= 8;

  const killstreakIndex = looksLikeKdColumn
    ? 3
    : hasSeparateKillstreak
      ? 2
      : -1;

  const killfeedIndex = looksLikeKdColumn
    ? 4
    : hasSeparateKillstreak
      ? 3
      : 2;

  const damageDealtIndex = looksLikeKdColumn
    ? 5
    : hasSeparateKillstreak
      ? 4
      : 3;

  const damageTakenIndex = looksLikeKdColumn
    ? 6
    : hasSeparateKillstreak
      ? 5
      : 4;

  const ccHitsIndex = looksLikeKdColumn
    ? 7
    : hasSeparateKillstreak
      ? 6
      : 5;

  const fortDamageIndex = looksLikeKdColumn
    ? 8
    : hasSeparateKillstreak
      ? 7
      : 6;

  const killStreak = readColumn(killstreakIndex);
  const killFeed = readColumn(killfeedIndex);
  const damageDealt = readColumn(damageDealtIndex);
  const damageTaken = readColumn(damageTakenIndex);
  const ccHits = readColumn(ccHitsIndex);
  const fortDamage = readColumn(fortDamageIndex);

  const anyMetricPresent = [
    0,
    1,
    killstreakIndex,
    killfeedIndex,
    damageDealtIndex,
    damageTakenIndex,
    ccHitsIndex,
    fortDamageIndex,
  ].some(hasColumn);

  if (!player && !anyMetricPresent) return null;

  return {
    player,
    kills,
    deaths,
    killStreak,
    killFeed,
    damageDealt,
    damageTaken,
    ccHits,
    fortDamage,
    line: index + 1,
    rawLine: String(line || ''),
    source: 'legacy-position',
    has_kills: hasColumn(0),
    has_deaths: hasColumn(1),
    has_kill_streak: hasColumn(killstreakIndex),
    has_kill_feed: hasColumn(killfeedIndex),
    has_damage_dealt: hasColumn(damageDealtIndex),
    has_damage_taken: hasColumn(damageTakenIndex),
    has_cc_hits: hasColumn(ccHitsIndex),
    has_fort_damage: hasColumn(fortDamageIndex),
  };
}

export function parseSecondaryRows(raw) {
  const { secondaryRaw } = splitRawLogSections(raw);
  const source = secondaryRaw || String(raw || '');
  const lines = String(source)
    .replace(/\r\n?/g, NL)
    .split(NL)
    .map((line, index) => ({
      line,
      index,
    }))
    .filter((entry) => entry.line.trim());

  const rows = [];
  let activeHeader = null;

  lines.forEach(({ line, index }) => {
    const split = splitSecondaryColumns(line);
    const detectedHeader = buildSecondaryHeader(
      split.columns,
      split.mode,
    );

    if (detectedHeader) {
      activeHeader = detectedHeader;
      return;
    }

    const row = activeHeader
      ? parseSecondaryLineWithHeader(
          line,
          index,
          activeHeader,
        )
      : parseSecondaryLineLegacy(line, index);

    if (row) rows.push(row);
  });

  return rows;
}

function secondaryRowsTotals(rows) {
  return rows.reduce(
    (totals, row) => ({
      kills: totals.kills + (Number(row.kills) || 0),
      deaths: totals.deaths + (Number(row.deaths) || 0),
      killStreak: Math.max(
        totals.killStreak,
        Number(row.killStreak ?? row.killstreak) || 0,
      ),
      killFeed: Math.max(totals.killFeed, Number(row.killFeed) || 0),
      damageDealt: totals.damageDealt + (Number(row.damageDealt) || 0),
      damageTaken: totals.damageTaken + (Number(row.damageTaken) || 0),
      ccHits: totals.ccHits + (Number(row.ccHits) || 0),
      fortDamage: totals.fortDamage + (Number(row.fortDamage) || 0),
    }),
    {
      kills: 0,
      deaths: 0,
      killStreak: 0,
      killFeed: 0,
      damageDealt: 0,
      damageTaken: 0,
      ccHits: 0,
      fortDamage: 0,
    },
  );
}

function explicitSecondaryMetricPresence(
  row,
  flagKeys,
  valueKeys,
) {
  if (!row) return null;

  for (const key of flagKeys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return Boolean(row[key]);
    }
  }

  for (const key of valueKeys) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) {
      continue;
    }

    const value = Number(row[key]);

    if (Number.isFinite(value) && value !== 0) {
      return true;
    }
  }

  return null;
}

function secondaryRowsAvailability(rows) {
  const definitions = {
    kills: {
      flags: ['has_kills', 'hasKills'],
      values: ['kills'],
    },
    deaths: {
      flags: ['has_deaths', 'hasDeaths'],
      values: ['deaths'],
    },
    killStreak: {
      flags: ['has_kill_streak', 'hasKillStreak'],
      values: ['killStreak', 'killstreak'],
    },
    killFeed: {
      flags: ['has_kill_feed', 'hasKillFeed'],
      values: ['killFeed', 'killfeed', 'feed'],
    },
    damageDealt: {
      flags: ['has_damage_dealt', 'hasDamageDealt'],
      values: ['damageDealt', 'damage_dealt', 'damage'],
    },
    damageTaken: {
      flags: ['has_damage_taken', 'hasDamageTaken'],
      values: ['damageTaken', 'damage_taken'],
    },
    ccHits: {
      flags: ['has_cc_hits', 'hasCcHits'],
      values: ['ccHits', 'cc_hits', 'cc'],
    },
    fortDamage: {
      flags: ['has_fort_damage', 'hasFortDamage'],
      values: ['fortDamage', 'damageToFort', 'damage_to_fort'],
    },
  };

  return Object.fromEntries(
    Object.entries(definitions).map(([metric, definition]) => [
      metric,
      (rows || []).some(
        (row) =>
          explicitSecondaryMetricPresence(
            row,
            definition.flags,
            definition.values,
          ) === true,
      ),
    ]),
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
        available: secondaryRowsAvailability([]),
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
      killStreak: Math.max(
        Number(current.killStreak) || 0,
        Number(row.killStreak ?? row.killstreak) || 0,
      ),
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
      killStreak: 0,
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

    /*
     * Persist the matched player on the row itself so the per-war
     * Player Stats history can use the row after a summary is saved.
     */
    row.player = target.name;

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
              killStreak: secondary.killStreak,
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
    st[row.player] = Math.max(
      Number(st[row.player]) || 0,
      Number(row.killStreak) || 0,
    );

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
      available: secondaryRowsAvailability(secondaryRows),
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
  const secondaryRows = [];
  const secondaryRowsByKey = new Map();

  const secondaryTotals = {
    kills: 0,
    deaths: 0,
    killStreak: 0,
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

  function normalizePlayerKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  function findPlayerMetric(source, playerName) {
    if (!source || typeof source !== 'object') {
      return {
        exists: false,
        value: 0,
      };
    }

    if (Object.prototype.hasOwnProperty.call(source, playerName)) {
      return {
        exists: true,
        value: Number(source[playerName]) || 0,
      };
    }

    const normalizedName = normalizePlayerKey(playerName);
    const matchingKey = Object.keys(source).find(
      (key) => normalizePlayerKey(key) === normalizedName,
    );

    if (!matchingKey) {
      return {
        exists: false,
        value: 0,
      };
    }

    return {
      exists: true,
      value: Number(source[matchingKey]) || 0,
    };
  }

  function addSecondaryRow(row, fallback, index = 0) {
    const playerName = String(
      row?.player ||
        row?.name ||
        row?.playerName ||
        '',
    ).trim();

    const normalized = {
      ...row,
      player: playerName,
      id: String(
        row?.id ??
          row?.warId ??
          fallback.id,
      ),
      date:
        row?.date ||
        fallback.date,
      war:
        row?.war ||
        row?.warName ||
        fallback.war,
      line:
        row?.line ??
        index + 1,
      fortDamage:
        Number(
          row?.fortDamage ??
            row?.damageToFort,
        ) || 0,
    };

    const rowKey = [
      normalized.id,
      normalizePlayerKey(playerName) || `unnamed-${index}`,
    ].join('::');

    const existing = secondaryRowsByKey.get(rowKey);

    if (existing) {
      return existing;
    }

    secondaryRowsByKey.set(rowKey, normalized);
    secondaryRows.push(normalized);

    return normalized;
  }

  items.forEach((log) => {
    const summary = getLogSummary(log);
    const summaryVersion = Number(summary.version) || 1;

    const logId = String(
      log?.id ??
        log?.apiId ??
        log?.date ??
        log?.name ??
        `summary-${secondaryRows.length}`,
    );

    const logDate = dateOf(log);
    const logName = log?.name || logDate || 'Battle log';

    const fallback = {
      id: logId,
      date: logDate,
      war: logName,
    };

    const summaryPlayers = Array.isArray(summary.players)
      ? summary.players
      : [];

    const summaryGuilds = Array.isArray(summary.guilds)
      ? summary.guilds
      : [];

    const summaryRows = Array.isArray(summary.secondary?.rows)
      ? summary.secondary.rows
      : [];

    kills += Number(summary.kills) || 0;
    deaths += Number(summary.deaths) || 0;

    if (summary.hasTimeline) {
      hasTimeline = true;
    }

    if (summary.summaryOnly) {
      summaryOnly = true;
    }

    const rowsByPlayer = new Map();

    summaryRows.forEach((sourceRow, index) => {
      const playerName = String(
        sourceRow?.player ||
          sourceRow?.name ||
          sourceRow?.playerName ||
          '',
      ).trim();

      const streakMetric = findPlayerMetric(
        summary.st,
        playerName,
      );

      const feedMetric = findPlayerMetric(
        summary.fd,
        playerName,
      );

      /*
       * Before summary version 3, some saved rows used killStreak as
       * the name of the Killfeed column. Use summary.st for the real
       * streak whenever it is available and preserve the old value as
       * Killfeed.
       */
      const legacyKillFeed =
        summaryVersion < 3 &&
        sourceRow?.killFeed == null &&
        sourceRow?.killStreak != null
          ? Number(sourceRow.killStreak) || 0
          : 0;

      const normalizedRow = addSecondaryRow(
        {
          ...sourceRow,
          killStreak: streakMetric.exists
            ? streakMetric.value
            : summaryVersion >= 3
              ? Number(
                  sourceRow?.killStreak ??
                    sourceRow?.killstreak,
                ) || 0
              : 0,
          killFeed:
            Number(
              sourceRow?.killFeed ??
                sourceRow?.killfeed ??
                feedMetric.value ??
                legacyKillFeed,
            ) ||
            legacyKillFeed ||
            0,
          has_kill_streak:
            sourceRow?.has_kill_streak ??
            sourceRow?.hasKillStreak ??
            streakMetric.exists ??
            false,
          has_kill_feed:
            sourceRow?.has_kill_feed ??
            sourceRow?.hasKillFeed ??
            feedMetric.exists ??
            Boolean(
              sourceRow?.killFeed != null ||
                sourceRow?.killfeed != null ||
                legacyKillFeed,
            ),
        },
        fallback,
        index,
      );

      const playerKey = normalizePlayerKey(
        normalizedRow?.player,
      );

      if (playerKey && normalizedRow) {
        rowsByPlayer.set(playerKey, normalizedRow);
      }
    });

    summaryPlayers.forEach((player, playerIndex) => {
      if (!player?.name) return;

      const playerName = String(player.name).trim();
      const playerKey = normalizePlayerKey(playerName);

      const playerKillsValue =
        Number(player.kills) || 0;

      const playerDeathsValue =
        Number(player.deaths) || 0;

      add(
        playerKills,
        playerName,
        playerKillsValue,
      );

      add(
        playerDeaths,
        playerName,
        playerDeathsValue,
      );

      playerFamilies[playerName] =
        player.family ||
        playerFamilies[playerName] ||
        '-';

      const streakMetric = findPlayerMetric(
        summary.st,
        playerName,
      );

      const feedMetric = findPlayerMetric(
        summary.fd,
        playerName,
      );

      let matchRow = rowsByPlayer.get(playerKey);

      /*
       * Presence is NOT the same thing as a numeric property existing.
       * Older summaries filled missing columns with zero, so checking
       * `player.damageDealt !== undefined` incorrectly marked missing
       * historical columns as available. Explicit per-row flags are the
       * source of truth. A non-zero value is only a legacy fallback.
       */
      function explicitMetricPresence(source, flagKeys, valueKeys) {
        if (!source) return null;

        for (const key of flagKeys) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            return Boolean(source[key]);
          }
        }

        for (const key of valueKeys) {
          if (!Object.prototype.hasOwnProperty.call(source, key)) {
            continue;
          }

          const value = Number(source[key]);

          if (Number.isFinite(value) && value !== 0) {
            return true;
          }
        }

        return null;
      }

      function resolveMetricPresence(flagKeys, valueKeys, extra = false) {
        const rowPresence = explicitMetricPresence(
          matchRow,
          flagKeys,
          valueKeys,
        );

        if (rowPresence !== null) return rowPresence;

        const playerPresence = explicitMetricPresence(
          player,
          flagKeys,
          valueKeys,
        );

        if (playerPresence !== null) return playerPresence;

        return Boolean(extra);
      }

      const legacyPlayerKillFeed =
        summaryVersion < 3 &&
        player.killFeed == null &&
        player.killStreak != null
          ? Number(player.killStreak) || 0
          : 0;

      const playerHasKillStreak = resolveMetricPresence(
        ['has_kill_streak', 'hasKillStreak'],
        ['killStreak', 'killstreak'],
        streakMetric.exists || Boolean(summary.hasTimeline),
      );

      const playerKillStreak =
        matchRow && playerHasKillStreak
          ? Number(
              matchRow.killStreak ??
                matchRow.killstreak,
            ) || 0
          : streakMetric.exists
            ? streakMetric.value
            : summaryVersion >= 3
              ? Number(
                  player.killStreak ??
                    player.killstreak,
                ) || 0
              : 0;

      const playerHasKillFeed = resolveMetricPresence(
        ['has_kill_feed', 'hasKillFeed'],
        ['killFeed', 'killfeed', 'feed'],
        feedMetric.exists ||
          Boolean(legacyPlayerKillFeed) ||
          Boolean(summary.hasTimeline),
      );

      const playerKillFeed =
        matchRow && playerHasKillFeed
          ? Number(
              matchRow.killFeed ??
                matchRow.killfeed ??
                matchRow.feed,
            ) || 0
          : Number(
              player.killFeed ??
                player.killfeed ??
                player.feed ??
                (feedMetric.exists
                  ? feedMetric.value
                  : legacyPlayerKillFeed),
            ) || 0;

      const playerHasDamageDealt = resolveMetricPresence(
        ['has_damage_dealt', 'hasDamageDealt'],
        ['damageDealt', 'damage_dealt', 'damage'],
      );

      const playerHasDamageTaken = resolveMetricPresence(
        ['has_damage_taken', 'hasDamageTaken'],
        ['damageTaken', 'damage_taken'],
      );

      const playerHasCcHits = resolveMetricPresence(
        ['has_cc_hits', 'hasCcHits'],
        ['ccHits', 'cc_hits', 'cc'],
      );

      const playerHasFortDamage = resolveMetricPresence(
        ['has_fort_damage', 'hasFortDamage'],
        ['fortDamage', 'damageToFort', 'damage_to_fort'],
      );

      const damageDealtValue = playerHasDamageDealt
        ? Number(
            matchRow?.damageDealt ??
              player.damageDealt,
          ) || 0
        : 0;

      const damageTakenValue = playerHasDamageTaken
        ? Number(
            matchRow?.damageTaken ??
              player.damageTaken,
          ) || 0
        : 0;

      const ccHitsValue = playerHasCcHits
        ? Number(
            matchRow?.ccHits ??
              player.ccHits,
          ) || 0
        : 0;

      const fortDamageValue = playerHasFortDamage
        ? Number(
            matchRow?.fortDamage ??
              matchRow?.damageToFort ??
              player.fortDamage ??
              player.damageToFort,
          ) || 0
        : 0;

      const currentSecondary =
        secondaryByPlayer[playerName] || {
          killStreak: 0,
          killFeed: 0,
          damageDealt: 0,
          damageTaken: 0,
          ccHits: 0,
          fortDamage: 0,
          has_kill_streak: false,
          has_kill_feed: false,
          has_damage_dealt: false,
          has_damage_taken: false,
          has_cc_hits: false,
          has_fort_damage: false,
        };

      secondaryByPlayer[playerName] = {
        killStreak: playerHasKillStreak
          ? Math.max(
              currentSecondary.killStreak,
              playerKillStreak,
            )
          : currentSecondary.killStreak,
        killFeed: playerHasKillFeed
          ? Math.max(
              currentSecondary.killFeed,
              playerKillFeed,
            )
          : currentSecondary.killFeed,
        damageDealt:
          currentSecondary.damageDealt +
          damageDealtValue,
        damageTaken:
          currentSecondary.damageTaken +
          damageTakenValue,
        ccHits:
          currentSecondary.ccHits +
          ccHitsValue,
        fortDamage:
          currentSecondary.fortDamage +
          fortDamageValue,
        has_kill_streak:
          currentSecondary.has_kill_streak ||
          playerHasKillStreak,
        has_kill_feed:
          currentSecondary.has_kill_feed ||
          playerHasKillFeed,
        has_damage_dealt:
          currentSecondary.has_damage_dealt ||
          playerHasDamageDealt,
        has_damage_taken:
          currentSecondary.has_damage_taken ||
          playerHasDamageTaken,
        has_cc_hits:
          currentSecondary.has_cc_hits ||
          playerHasCcHits,
        has_fort_damage:
          currentSecondary.has_fort_damage ||
          playerHasFortDamage,
      };

      if (!matchRow) {
        matchRow = addSecondaryRow(
          {
            player: playerName,
            kills: playerKillsValue,
            deaths: playerDeathsValue,
            killStreak: playerKillStreak,
            killFeed: playerKillFeed,
            damageDealt:
              Number(player.damageDealt) || 0,
            damageTaken:
              Number(player.damageTaken) || 0,
            ccHits:
              Number(player.ccHits) || 0,
            fortDamage:
              Number(
                player.fortDamage ??
                  player.damageToFort,
              ) || 0,
            has_kills: true,
            has_deaths: true,
            has_kill_streak:
              playerHasKillStreak,
            has_kill_feed:
              playerHasKillFeed,
            has_damage_dealt:
              playerHasDamageDealt,
            has_damage_taken:
              playerHasDamageTaken,
            has_cc_hits:
              playerHasCcHits,
            has_fort_damage:
              playerHasFortDamage,
            source: 'summary-player',
          },
          fallback,
          playerIndex,
        );

        rowsByPlayer.set(playerKey, matchRow);
      } else {
        if (
          matchRow.kills === undefined ||
          matchRow.kills === null
        ) {
          matchRow.kills = playerKillsValue;
        }

        if (
          matchRow.deaths === undefined ||
          matchRow.deaths === null
        ) {
          matchRow.deaths = playerDeathsValue;
        }

        if (
          matchRow.killStreak === undefined ||
          matchRow.killStreak === null ||
          playerHasKillStreak
        ) {
          matchRow.killStreak = playerKillStreak;
        }

        if (
          matchRow.killFeed === undefined ||
          matchRow.killFeed === null ||
          playerHasKillFeed
        ) {
          matchRow.killFeed = playerKillFeed;
        }

        if (
          playerHasDamageDealt &&
          (
            matchRow.damageDealt === undefined ||
            matchRow.damageDealt === null
          )
        ) {
          matchRow.damageDealt = damageDealtValue;
        }

        if (
          playerHasDamageTaken &&
          (
            matchRow.damageTaken === undefined ||
            matchRow.damageTaken === null
          )
        ) {
          matchRow.damageTaken = damageTakenValue;
        }

        if (
          playerHasCcHits &&
          (
            matchRow.ccHits === undefined ||
            matchRow.ccHits === null
          )
        ) {
          matchRow.ccHits = ccHitsValue;
        }

        if (
          playerHasFortDamage &&
          (
            matchRow.fortDamage === undefined ||
            matchRow.fortDamage === null
          )
        ) {
          matchRow.fortDamage = fortDamageValue;
        }

        matchRow.has_kills = true;
        matchRow.has_deaths = true;

        if (playerHasKillStreak) {
          matchRow.has_kill_streak = true;
        }

        if (playerHasKillFeed) {
          matchRow.has_kill_feed = true;
        }

        if (playerHasDamageDealt) {
          matchRow.has_damage_dealt = true;
        }

        if (playerHasDamageTaken) {
          matchRow.has_damage_taken = true;
        }

        if (playerHasCcHits) {
          matchRow.has_cc_hits = true;
        }

        if (playerHasFortDamage) {
          matchRow.has_fort_damage = true;
        }
      }
    });

    summaryGuilds.forEach((guild) => {
      if (!guild?.name) return;

      add(
        guildKills,
        guild.name,
        Number(guild.kills) || 0,
      );

      add(
        guildDeaths,
        guild.name,
        Number(guild.deaths) || 0,
      );
    });

    if (summary.hasTimeline) {
      (summary.line || []).forEach((point) => {
        if (!point?.time) return;

        const pointDate =
          point.date ||
          logDate;

        const key = `${pointDate} ${point.time}`;

        lineMap[key] ||= {
          date: pointDate,
          time: point.time,
          kills: 0,
          deaths: 0,
        };

        lineMap[key].kills +=
          Number(point.kills) || 0;

        lineMap[key].deaths +=
          Number(point.deaths) || 0;
      });
    }

    Object.entries(summary.st || {}).forEach(
      ([name, value]) => {
        st[name] = Math.max(
          Number(st[name]) || 0,
          Number(value) || 0,
        );
      },
    );

    Object.entries(summary.fd || {}).forEach(
      ([name, value]) => {
        fd[name] = Math.max(
          Number(fd[name]) || 0,
          Number(value) || 0,
        );
      },
    );

    const totals = summary.secondary?.totals || {};

    secondaryTotals.kills +=
      Number(totals.kills) || 0;

    secondaryTotals.deaths +=
      Number(totals.deaths) || 0;

    secondaryTotals.killStreak = Math.max(
      secondaryTotals.killStreak,
      Number(
        totals.killStreak ??
          totals.killstreak,
      ) || 0,
    );

    secondaryTotals.killFeed = Math.max(
      secondaryTotals.killFeed,
      Number(
        totals.killFeed ??
          totals.killfeed ??
          (
            summaryVersion < 3
              ? totals.killStreak
              : 0
          ),
      ) || 0,
    );

    secondaryTotals.damageDealt +=
      Number(totals.damageDealt) || 0;

    secondaryTotals.damageTaken +=
      Number(totals.damageTaken) || 0;

    secondaryTotals.ccHits +=
      Number(totals.ccHits) || 0;

    secondaryTotals.fortDamage +=
      Number(
        totals.fortDamage ??
          totals.damageToFort,
      ) || 0;
  });

  Object.entries(secondaryByPlayer).forEach(
    ([name, secondary]) => {
      st[name] = Math.max(
        Number(st[name]) || 0,
        Number(secondary.killStreak) || 0,
      );

      fd[name] = Math.max(
        Number(fd[name]) || 0,
        Number(secondary.killFeed) || 0,
      );
    },
  );

  const players = [
    ...new Set([
      ...Object.keys(playerKills),
      ...Object.keys(playerDeaths),
    ]),
  ]
    .map((name) => {
      const pk = playerKills[name] || 0;
      const pd = playerDeaths[name] || 0;

      const secondary =
        secondaryByPlayer[name] || null;

      return {
        name,
        family:
          playerFamilies[name] || '-',
        kills: pk,
        deaths: pd,
        kd: pd
          ? (pk / pd).toFixed(2)
          : pk.toFixed(2),
        ...(secondary
          ? {
              killStreak:
                secondary.killStreak,
              killFeed:
                secondary.killFeed,
              damageDealt:
                secondary.damageDealt,
              damageTaken:
                secondary.damageTaken,
              ccHits:
                secondary.ccHits,
              fortDamage:
                secondary.fortDamage,
              has_kill_streak:
                Boolean(secondary.has_kill_streak),
              has_kill_feed:
                Boolean(secondary.has_kill_feed),
              has_damage_dealt:
                Boolean(secondary.has_damage_dealt),
              has_damage_taken:
                Boolean(secondary.has_damage_taken),
              has_cc_hits:
                Boolean(secondary.has_cc_hits),
              has_fort_damage:
                Boolean(secondary.has_fort_damage),
            }
          : {}),
      };
    })
    .sort(
      (a, b) =>
        b.kills - a.kills ||
        a.deaths - b.deaths ||
        a.name.localeCompare(b.name),
    );

  const guilds = [
    ...new Set([
      ...Object.keys(guildKills),
      ...Object.keys(guildDeaths),
    ]),
  ].map((name) => {
    const gk = guildKills[name] || 0;
    const gd = guildDeaths[name] || 0;

    return {
      name,
      kills: gk,
      deaths: gd,
      kd: gd
        ? (gk / gd).toFixed(2)
        : gk.toFixed(2),
    };
  });

  const line = Object.values(lineMap).sort(
    (a, b) =>
      String(a.date || '').localeCompare(
        String(b.date || ''),
      ) ||
      String(a.time || '').localeCompare(
        String(b.time || ''),
      ),
  );

  secondaryRows.sort(
    (a, b) =>
      String(a.date || '').localeCompare(
        String(b.date || ''),
      ) ||
      String(a.id || '').localeCompare(
        String(b.id || ''),
      ) ||
      String(a.player || '').localeCompare(
        String(b.player || ''),
      ),
  );

  return {
    /*
     * Do not put every raw kill event into the all-time result.
     * Keeping this empty prevents the browser freeze.
     */
    ev: [],
    players,
    guilds,
    line,
    kills,
    deaths,
    kd: deaths
      ? (kills / deaths).toFixed(2)
      : kills.toFixed(2),
    st,
    fd,
    secondary: {
      rows: secondaryRows,
      totals: secondaryTotals,
      available: secondaryRowsAvailability(secondaryRows),
    },
    hasTimeline,
    summaryOnly:
      summaryOnly && !hasTimeline,
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
        available: secondaryRowsAvailability([]),
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
    version: 5,
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
  const raw = String(log?.raw || '');

  /*
   * Summary version 5 is the first version that maps Stats Log values by
   * their header names and preserves empty cells. When raw text is available,
   * rebuild older summaries instead of continuing to use shifted columns.
   */
  if (normalized && (Number(normalized.version) >= 5 || !raw)) {
    return normalized;
  }

  if (!raw) {
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
      secondary: {
        rows: [],
        totals: secondaryRowsTotals([]),
        available: secondaryRowsAvailability([]),
      },
      hasTimeline: false,
      summaryOnly: false,
    });
  }

  return buildLogSummary(log);
}

export function buildNodeWarRow(log) {
  const summary = getLogSummary(log);
  const secondary = summary.secondary || {};
  const secondaryTotals = secondary.totals || {};
  const secondaryAvailable = secondary.available || {};
  const secondaryRows = Array.isArray(secondary.rows)
    ? secondary.rows
    : [];
  const players = Array.isArray(summary.players)
    ? summary.players
    : [];

  function hasOwn(source, key) {
    return Boolean(
      source &&
        Object.prototype.hasOwnProperty.call(source, key),
    );
  }

  function explicitAvailability(source, flagKeys, valueKeys) {
    if (!source) return null;

    for (const key of flagKeys) {
      if (hasOwn(source, key)) {
        return Boolean(source[key]);
      }
    }

    for (const key of valueKeys) {
      if (!hasOwn(source, key)) continue;

      const value = Number(source[key]);

      // A non-zero legacy value proves that the metric existed. A zero
      // without an availability flag remains unknown and must display as —.
      if (Number.isFinite(value) && value !== 0) {
        return true;
      }
    }

    return null;
  }

  const metricDefinitions = {
    damageDealt: {
      flags: ['has_damage_dealt', 'hasDamageDealt'],
      values: ['damageDealt', 'damage_dealt', 'damage'],
    },
    damageTaken: {
      flags: ['has_damage_taken', 'hasDamageTaken'],
      values: ['damageTaken', 'damage_taken'],
    },
    ccHits: {
      flags: ['has_cc_hits', 'hasCcHits'],
      values: ['ccHits', 'cc_hits', 'cc'],
    },
    fortDamage: {
      flags: ['has_fort_damage', 'hasFortDamage'],
      values: ['fortDamage', 'damageToFort', 'damage_to_fort'],
    },
  };

  function metricIsAvailable(metric) {
    if (hasOwn(secondaryAvailable, metric)) {
      return Boolean(secondaryAvailable[metric]);
    }

    const definition = metricDefinitions[metric];

    if (!definition) return false;

    const sources = [...secondaryRows, ...players];

    return sources.some(
      (source) =>
        explicitAvailability(
          source,
          definition.flags,
          definition.values,
        ) === true,
    );
  }

  function sumPlayerMetric(metric, aliases = []) {
    return players.reduce((total, player) => {
      const key = [metric, ...aliases].find((candidate) =>
        hasOwn(player, candidate),
      );

      return total + (key ? Number(player[key]) || 0 : 0);
    }, 0);
  }

  function metricValue(metric, aliases = []) {
    const totalCandidates = [metric, ...aliases];
    const totalKey = totalCandidates.find((candidate) =>
      hasOwn(secondaryTotals, candidate),
    );
    const totalValue = totalKey
      ? Number(secondaryTotals[totalKey]) || 0
      : 0;
    const playerValue = sumPlayerMetric(metric, aliases);

    // Legacy summaries sometimes omitted totals but kept player values.
    return totalValue !== 0 ? totalValue : playerValue;
  }

  const hasDamageDealt = metricIsAvailable('damageDealt');
  const hasDamageTaken = metricIsAvailable('damageTaken');
  const hasCcHits = metricIsAvailable('ccHits');
  const hasFortDamage = metricIsAvailable('fortDamage');

  const damageDealt = metricValue('damageDealt', [
    'damage_dealt',
    'damage',
  ]);
  const damageTaken = metricValue('damageTaken', [
    'damage_taken',
  ]);
  const ccHits = metricValue('ccHits', ['cc_hits', 'cc']);
  const fortDamage = metricValue('fortDamage', [
    'damageToFort',
    'damage_to_fort',
  ]);

  return {
    ...log,
    date: dateOf(log),
    players:
      Number(summary.playersCount) ||
      Number(summary.players?.length) ||
      0,
    kills: Number(summary.kills) || 0,
    deaths: Number(summary.deaths) || 0,
    kd: summary.kd || '0.00',
    kdNumber: Number(summary.kd) || 0,
    damageDealt,
    damageTaken,
    ccHits,
    fortDamage,
    hasDamageDealt,
    hasDamageTaken,
    hasCcHits,
    hasFortDamage,
    statAvailability: {
      damageDealt: hasDamageDealt,
      damageTaken: hasDamageTaken,
      ccHits: hasCcHits,
      fortDamage: hasFortDamage,
    },
    topEnemies: summary.topEnemies || [],
    allEnemyNames:
      summary.enemyNames?.length > 0
        ? summary.enemyNames
        : (summary.guilds || [])
            .map((guild) => guild.name)
            .filter(Boolean),
    hasTimeline: Boolean(summary.hasTimeline),
    summaryOnly: Boolean(summary.summaryOnly),
  };
}
