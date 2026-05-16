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

function normalizeSecondaryPlayerName(parts) {
  const name = parts.join(' ').replace(/^[-#•\d.\s]+/, '').trim();

  if (!name || isSecondaryNumber(name)) return '';

  const lower = name.toLowerCase();

  if (
    lower.includes('kill') ||
    lower.includes('death') ||
    lower.includes('damage') ||
    lower.includes('streak') ||
    lower.includes('total') ||
    lower.includes('fort') ||
    lower.includes('cc')
  ) {
    return '';
  }

  return name;
}

function parseSecondaryLine(line, index) {
  const columns = splitSecondaryColumns(line);

  if (columns.length < 2) return null;

  const firstNumberIndex = columns.findIndex(isSecondaryNumber);

  if (firstNumberIndex < 0) return null;

  const numericColumns = columns.slice(firstNumberIndex).filter(isSecondaryNumber);

  if (numericColumns.length < 2) return null;

  const player = normalizeSecondaryPlayerName(columns.slice(0, firstNumberIndex));
  const kills = Math.round(parseSecondaryNumber(numericColumns[0]));
  const deaths = Math.round(parseSecondaryNumber(numericColumns[1]));

  const thirdColumn = String(numericColumns[2] || '').trim();
  const thirdNumber = parseSecondaryNumber(thirdColumn);
  const looksLikeKdColumn =
    player &&
    numericColumns.length >= 9 &&
    /[.,]/.test(thirdColumn) &&
    thirdNumber >= 0 &&
    thirdNumber <= 50;

  const killStreak = Math.round(
    parseSecondaryNumber(
      looksLikeKdColumn ? numericColumns[4] : numericColumns[2],
    ),
  );

  const damageDealt = Math.round(
    parseSecondaryNumber(
      looksLikeKdColumn ? numericColumns[5] : numericColumns[3],
    ),
  );

  const damageTaken = Math.round(
    parseSecondaryNumber(
      looksLikeKdColumn ? numericColumns[6] : numericColumns[4],
    ),
  );

  const ccHits = Math.round(
    parseSecondaryNumber(
      looksLikeKdColumn ? numericColumns[7] : numericColumns[5],
    ),
  );

  const fortDamage = Math.round(
    parseSecondaryNumber(
      looksLikeKdColumn ? numericColumns[8] : numericColumns[8],
    ),
  );

  if (
    kills === 0 &&
    deaths === 0 &&
    killStreak === 0 &&
    damageDealt === 0 &&
    damageTaken === 0 &&
    ccHits === 0 &&
    fortDamage === 0
  ) {
    return null;
  }

  return {
    player,
    kills,
    deaths,
    killStreak,
    damageDealt,
    damageTaken,
    ccHits,
    fortDamage,
    line: index + 1,
  };
}

export function parseSecondaryRows(raw) {
  const { secondaryRaw } = splitRawLogSections(raw);
  const source = secondaryRaw || String(raw || '');

  return cleanLog(source)
    .split(NL)
    .map(parseSecondaryLine)
    .filter(Boolean);
}

function secondaryRowsTotals(rows) {
  return rows.reduce(
    (totals, row) => ({
      kills: totals.kills + (Number(row.kills) || 0),
      deaths: totals.deaths + (Number(row.deaths) || 0),
      killStreak: Math.max(totals.killStreak, Number(row.killStreak) || 0),
      damageDealt: totals.damageDealt + (Number(row.damageDealt) || 0),
      damageTaken: totals.damageTaken + (Number(row.damageTaken) || 0),
      ccHits: totals.ccHits + (Number(row.ccHits) || 0),
      fortDamage: totals.fortDamage + (Number(row.fortDamage) || 0),
    }),
    {
      kills: 0,
      deaths: 0,
      killStreak: 0,
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

export function calculateStreaks(events) {
  const current = {};
  const best = {};

  events
    .filter((event) => event.hasTimestamp !== false && event.source !== 'summary')
    .forEach((event) => {
      if (event.type === 'kill') {
        current[event.killer] = (current[event.killer] || 0) + 1;
        best[event.killer] = Math.max(best[event.killer] || 0, current[event.killer]);
      } else {
        current[event.victim] = 0;
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
      const key = `${event.killer}@@${event.id}`;

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
          victims: bestList.map((event) => event.victim),
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

function calculateStatsFromRaw(items) {
  const normalizedItems = items.map((log) => {
    const sections = splitRawLogSections(log.raw);

    return {
      ...log,
      raw: String(log.raw || ''),
      mainRaw: sections.mainRaw,
      secondaryRaw: sections.secondaryRaw,
    };
  });

  const classicEvents = normalizedItems
    .flatMap((log) => parseClassicEvents(log.mainRaw, log.name, log.date, log.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sec - b.sec || a.i - b.i);

  const summaryRows = normalizedItems.flatMap((log) =>
    parseSummaryRows(log.mainRaw).map((row) => ({
      ...row,
      date: log.date,
      id: log.id,
      war: log.name,
    })),
  );

  const secondaryRows = normalizedItems.flatMap((log) =>
    parseSecondaryRows(log.secondaryRaw).map((row) => ({
      ...row,
      date: log.date,
      id: log.id,
      war: log.name,
    })),
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

  classicEvents.forEach((event) => {
    if (event.type === 'kill') {
      add(playerKills, event.killer);
      add(classicPlayerKills, event.killer);
      add(guildKills, event.guild);
    } else {
      add(playerDeaths, event.victim);
      add(classicPlayerDeaths, event.victim);
      add(guildDeaths, event.guild);
    }

    families[event.killer] = event.kf;
    families[event.victim] = event.vf;

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
  });

  function mergeSecondaryRow(playerName, row) {
    if (!playerName) return;

    const current = secondaryByPlayer[playerName] || {
      player: playerName,
      kills: 0,
      deaths: 0,
      killStreak: 0,
      damageDealt: 0,
      damageTaken: 0,
      ccHits: 0,
      fortDamage: 0,
    };

    secondaryByPlayer[playerName] = {
      ...current,
      kills: current.kills + (Number(row.kills) || 0),
      deaths: current.deaths + (Number(row.deaths) || 0),
      killStreak: Math.max(current.killStreak, Number(row.killStreak) || 0),
      damageDealt: current.damageDealt + (Number(row.damageDealt) || 0),
      damageTaken: current.damageTaken + (Number(row.damageTaken) || 0),
      ccHits: current.ccHits + (Number(row.ccHits) || 0),
      fortDamage: current.fortDamage + (Number(row.fortDamage) || 0),
    };
  }

  function buildBasePlayersForSecondary(row) {
    const byPlayer = {};

    classicEvents
      .filter((event) => event.id === row.id)
      .forEach((event) => {
        const name = event.type === 'kill' ? event.killer : event.victim;

        if (!name) return;

        byPlayer[name] ||= {
          name,
          kills: 0,
          deaths: 0,
        };

        byPlayer[name][event.type === 'kill' ? 'kills' : 'deaths'] += 1;
      });

    summaryRows
      .filter((summaryRow) => summaryRow.id === row.id)
      .forEach((summaryRow) => {
        byPlayer[summaryRow.player] ||= {
          name: summaryRow.player,
          kills: 0,
          deaths: 0,
        };

        byPlayer[summaryRow.player].kills += Number(summaryRow.kills) || 0;
        byPlayer[summaryRow.player].deaths += Number(summaryRow.deaths) || 0;
      });

    const scopedPlayers = Object.values(byPlayer);

    if (scopedPlayers.length) {
      return scopedPlayers.sort(
        (a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name),
      );
    }

    return [
      ...new Set([...Object.keys(playerKills), ...Object.keys(playerDeaths)]),
    ]
      .map((name) => ({
        name,
        kills: playerKills[name] || 0,
        deaths: playerDeaths[name] || 0,
      }))
      .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name));
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

  Object.values(secondaryByPlayer).forEach((row) => {
    playerKills[row.player] = Number(row.kills) || 0;
    playerDeaths[row.player] = Number(row.deaths) || 0;
    families[row.player] = families[row.player] || '-';
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

  const classicKills = classicEvents.filter((event) => event.type === 'kill').length;
  const classicDeaths = classicEvents.filter((event) => event.type === 'death').length;
  const summaryKills = summaryRows.reduce((sum, row) => sum + row.kills, 0);
  const summaryDeaths = summaryRows.reduce((sum, row) => sum + row.deaths, 0);

  const classicExtraKills = hasNamedSecondaryRows
    ? Object.entries(classicPlayerKills).reduce(
        (sum, [player, value]) =>
          secondaryPlayerNames.has(player) ? sum : sum + (Number(value) || 0),
        0,
      )
    : 0;

  const classicExtraDeaths = hasNamedSecondaryRows
    ? Object.entries(classicPlayerDeaths).reduce(
        (sum, [player, value]) =>
          secondaryPlayerNames.has(player) ? sum : sum + (Number(value) || 0),
        0,
      )
    : 0;

  const kills = hasSecondaryRows
    ? secondaryTotals.kills + classicExtraKills + summaryKills
    : classicKills + summaryKills;

  const deaths = hasSecondaryRows
    ? secondaryTotals.deaths + classicExtraDeaths + summaryDeaths
    : classicDeaths + summaryDeaths;

  const classicStreaks = hasTimeline ? calculateStreaks(classicEvents) : {};
  const st = { ...classicStreaks };

  Object.values(secondaryByPlayer).forEach((row) => {
    st[row.player] = Math.max(Number(st[row.player]) || 0, Number(row.killStreak) || 0);
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
    fd: hasTimeline ? calculateKillFeed(classicEvents) : {},
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
    killStreak: 0,
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
        player.killStreak != null ||
        player.damageDealt != null ||
        player.damageTaken != null ||
        player.ccHits != null ||
        player.fortDamage != null
      ) {
        const current = secondaryByPlayer[player.name] || {
          killStreak: 0,
          damageDealt: 0,
          damageTaken: 0,
          ccHits: 0,
          fortDamage: 0,
        };

        secondaryByPlayer[player.name] = {
          killStreak: Math.max(current.killStreak, Number(player.killStreak) || 0),
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
      secondaryTotals.killStreak = Math.max(
        secondaryTotals.killStreak,
        Number(summary.secondary.totals.killStreak) || 0,
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
              killStreak: secondary.killStreak,
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
      secondary: { rows: [], totals: secondaryRowsTotals([]) },
      hasTimeline: false,
      summaryOnly: false,
    };
  }

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
      hasTimeline: Boolean(rawStats.hasTimeline || summaryStats.hasTimeline),
      summaryOnly: Boolean(summaryStats.summaryOnly && !rawStats.hasTimeline),
    };
  }

  return mergeStatsFromSummaries(logs);
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
    fd: stats.hasTimeline ? stats.fd : {},
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

  return {
    ...log,
    date: dateOf(log),
    players: Number(summary.playersCount) || Number(summary.players?.length) || 0,
    kills: Number(summary.kills) || 0,
    deaths: Number(summary.deaths) || 0,
    kd: summary.kd || '0.00',
    kdNumber: Number(summary.kd) || 0,
    topEnemies: summary.topEnemies || [],
    allEnemyNames:
      summary.enemyNames?.length > 0
        ? summary.enemyNames
        : (summary.guilds || []).map((guild) => guild.name).filter(Boolean),
    hasTimeline: Boolean(summary.hasTimeline),
    summaryOnly: Boolean(summary.summaryOnly),
  };
}
