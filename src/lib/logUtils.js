const NL = String.fromCharCode(10);

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

function summaryRowsToEvents(rows, name, date, id) {
  const events = [];
  let eventIndex = 0;

  rows.forEach((row, rowIndex) => {
    for (let killIndex = 0; killIndex < row.kills; killIndex += 1) {
      events.push({
        i: eventIndex,
        type: 'kill',
        time: minuteLabel(eventIndex),
        sec: eventIndex,
        killer: row.player,
        victim: `Unknown_${rowIndex}_${killIndex}`,
        guild: 'Manual Summary',
        kf: '-',
        vf: '-',
        war: name,
        date,
        id,
        source: 'summary',
      });

      eventIndex += 1;
    }

    for (let deathIndex = 0; deathIndex < row.deaths; deathIndex += 1) {
      events.push({
        i: eventIndex,
        type: 'death',
        time: minuteLabel(eventIndex),
        sec: eventIndex,
        killer: `Unknown_${rowIndex}_${deathIndex}`,
        victim: row.player,
        guild: 'Manual Summary',
        kf: '-',
        vf: '-',
        war: name,
        date,
        id,
        source: 'summary',
      });

      eventIndex += 1;
    }
  });

  return events;
}

function parseSummaryLog(raw, name, date, id) {
  const rows = parseSummaryRows(raw);

  if (!rows.length) return [];

  return summaryRowsToEvents(rows, name, date, id);
}

export function parseLog(raw, name, date, id) {
  const cleaned = cleanLog(raw);

  if (!cleaned) return [];

  const lines = cleaned.split(NL);

  const classicEvents = lines
    .map((line, index) => parseClassicEventLine(line, index, name, date, id))
    .filter(Boolean);

  const summaryEvents = parseSummaryLog(cleaned, name, date, id);

  return [...classicEvents, ...summaryEvents].sort(
    (a, b) => a.sec - b.sec || a.i - b.i,
  );
}

export function calculateStreaks(events) {
  const current = {};
  const best = {};

  events.forEach((event) => {
    if (event.source === 'summary') return;

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
    .filter((event) => event.type === 'kill' && event.source !== 'summary')
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
  const events = items
    .flatMap((log) => parseLog(log.raw, log.name, log.date, log.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sec - b.sec || a.i - b.i);

  if (!events.length) {
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
    };
  }

  const playerKills = {};
  const playerDeaths = {};
  const families = {};
  const guildKills = {};
  const guildDeaths = {};
  const minutes = {};

  events.forEach((event) => {
    const killerIsUnknown = String(event.killer || '').startsWith('Unknown_');
    const victimIsUnknown = String(event.victim || '').startsWith('Unknown_');

    if (event.type === 'kill') {
      if (!killerIsUnknown) {
        add(playerKills, event.killer);
      }

      if (event.guild && event.guild !== 'Manual Summary') {
        add(guildKills, event.guild);
      }
    } else {
      if (!victimIsUnknown) {
        add(playerDeaths, event.victim);
      }

      if (event.guild && event.guild !== 'Manual Summary') {
        add(guildDeaths, event.guild);
      }
    }

    if (!killerIsUnknown) {
      families[event.killer] = event.kf || families[event.killer] || '-';
    }

    if (!victimIsUnknown) {
      families[event.victim] = event.vf || families[event.victim] || '-';
    }

    const minute = minuteLabel(Math.floor(event.sec / 60) * 60);

    minutes[minute] ||= {
      time: minute,
      kills: 0,
      deaths: 0,
    };

    minutes[minute][event.type === 'kill' ? 'kills' : 'deaths'] += 1;
  });

  const first = Math.min(...events.map((event) => event.sec));
  const last = Math.max(...events.map((event) => event.sec));
  const line = [];

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

  const players = [
    ...new Set([...Object.keys(playerKills), ...Object.keys(playerDeaths)]),
  ]
    .map((player) => {
      const kills = playerKills[player] || 0;
      const deaths = playerDeaths[player] || 0;

      return {
        name: player,
        family: families[player] || '-',
        kills,
        deaths,
        kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
      };
    })
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);

  const guilds = [
    ...new Set([...Object.keys(guildKills), ...Object.keys(guildDeaths)]),
  ].map((guild) => {
    const kills = guildKills[guild] || 0;
    const deaths = guildDeaths[guild] || 0;

    return {
      name: guild,
      kills,
      deaths,
      kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
    };
  });

  const kills = events.filter((event) => event.type === 'kill').length;
  const deaths = events.filter((event) => event.type === 'death').length;

  return {
    ev: events,
    players,
    guilds,
    line,
    kills,
    deaths,
    kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
    st: calculateStreaks(events),
    fd: calculateKillFeed(events),
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

  let kills = 0;
  let deaths = 0;

  items.forEach((log) => {
    const summary = getLogSummary(log);

    kills += Number(summary.kills) || 0;
    deaths += Number(summary.deaths) || 0;

    summary.players.forEach((player) => {
      add(playerKills, player.name, Number(player.kills) || 0);
      add(playerDeaths, player.name, Number(player.deaths) || 0);

      playerFamilies[player.name] =
        player.family || playerFamilies[player.name] || '-';
    });

    summary.guilds.forEach((guild) => {
      add(guildKills, guild.name, Number(guild.kills) || 0);
      add(guildDeaths, guild.name, Number(guild.deaths) || 0);
    });

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

    Object.entries(summary.st || {}).forEach(([player, value]) => {
      st[player] = Math.max(Number(st[player]) || 0, Number(value) || 0);
    });

    Object.entries(summary.fd || {}).forEach(([player, value]) => {
      fd[player] = Math.max(Number(fd[player]) || 0, Number(value) || 0);
    });
  });

  const players = [
    ...new Set([...Object.keys(playerKills), ...Object.keys(playerDeaths)]),
  ]
    .map((player) => {
      const killsForPlayer = playerKills[player] || 0;
      const deathsForPlayer = playerDeaths[player] || 0;

      return {
        name: player,
        family: playerFamilies[player] || '-',
        kills: killsForPlayer,
        deaths: deathsForPlayer,
        kd: deathsForPlayer
          ? (killsForPlayer / deathsForPlayer).toFixed(2)
          : killsForPlayer.toFixed(2),
      };
    })
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);

  const guilds = [
    ...new Set([...Object.keys(guildKills), ...Object.keys(guildDeaths)]),
  ].map((guild) => {
    const guildKillsCount = guildKills[guild] || 0;
    const guildDeathsCount = guildDeaths[guild] || 0;

    return {
      name: guild,
      kills: guildKillsCount,
      deaths: guildDeathsCount,
      kd: guildDeathsCount
        ? (guildKillsCount / guildDeathsCount).toFixed(2)
        : guildKillsCount.toFixed(2),
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
    };
  }

  const logsWithRaw = logs.filter((log) => Boolean(log.raw));

  if (logsWithRaw.length > 0) {
    return calculateStatsFromRaw(logsWithRaw);
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
    line: stats.line,
    topEnemies,
    enemyNames: stats.guilds.map((guild) => guild.name).filter(Boolean),
    st: stats.st,
    fd: stats.fd,
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
  };
}
