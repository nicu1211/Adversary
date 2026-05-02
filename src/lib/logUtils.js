const NL = String.fromCharCode(10);

export const LOG_KEY = 'bdo_logs_v10';
export const MEMBER_KEY = 'bdo_members_v10';

export const HIDDEN_LEGACY_DATES = new Set([
  '2026-04-19',
  '2026-04-26',
]);

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

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
  const p = time.split(':').map(Number);
  return p[0] * 3600 + p[1] * 60 + p[2];
}

export function minuteLabel(seconds) {
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}`;
}

export function cleanLog(text) {
  return String(text || '')
    .split(NL)
    .map((x) => x.trim())
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
    today()
  );
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
    date:
      log.date ??
      log.warDate ??
      log.war_date ??
      log.createdAt?.slice?.(0, 10) ??
      today(),
    raw:
      log.raw ??
      log.rawLog ??
      log.raw_log ??
      log.log ??
      log.content ??
      '',
    hash: log.hash,
    created: log.created ?? log.createdAt ?? log.created_at,
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

  return arr
    .map(normalizeLog)
    .filter((x) => x.raw)
    .filter(
      (x) =>
        !(
          HIDDEN_LEGACY_DATES.has(dateOf(x)) &&
          (x.name === dateOf(x) || !x.apiId)
        ),
    );
}

export function normalizeMembers(data) {
  return Array.isArray(data) ? data : data?.members || data?.data || [];
}

export function parseLog(raw, name, date, id) {
  return cleanLog(raw)
    .split(NL)
    .map((line, index) => {
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
            }
          : null;
      }

      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.sec - b.sec || a.i - b.i);
}

export function calculateStreaks(events) {
  const current = {};
  const best = {};

  events.forEach((event) => {
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
    .filter((event) => event.type === 'kill')
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
          victims: bestList.map((x) => x.victim),
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

export function calculateStats(items) {
  const events = items
    .flatMap((x) => parseLog(x.raw, x.name, x.date, x.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sec - b.sec);

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
    if (event.type === 'kill') {
      add(playerKills, event.killer);
      add(guildKills, event.guild);
    } else {
      add(playerDeaths, event.victim);
      add(guildDeaths, event.guild);
    }

    families[event.killer] = event.kf;
    families[event.victim] = event.vf;

    const minute = minuteLabel(Math.floor(event.sec / 60) * 60);
    minutes[minute] ||= { time: minute, kills: 0, deaths: 0 };
    minutes[minute][event.type === 'kill' ? 'kills' : 'deaths'] += 1;
  });

  const first = Math.min(...events.map((x) => x.sec));
  const last = Math.max(...events.map((x) => x.sec));
  const line = [];

  for (
    let t = Math.floor(first / 60) * 60;
    t <= Math.floor(last / 60) * 60;
    t += 60
  ) {
    line.push(minutes[minuteLabel(t)] || { time: minuteLabel(t), kills: 0, deaths: 0 });
  }

  const players = [...new Set([...Object.keys(playerKills), ...Object.keys(playerDeaths)])]
    .map((name) => {
      const kills = playerKills[name] || 0;
      const deaths = playerDeaths[name] || 0;

      return {
        name,
        family: families[name] || '-',
        kills,
        deaths,
        kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
      };
    })
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);

  const guilds = [...new Set([...Object.keys(guildKills), ...Object.keys(guildDeaths)])].map(
    (name) => {
      const kills = guildKills[name] || 0;
      const deaths = guildDeaths[name] || 0;

      return {
        name,
        kills,
        deaths,
        kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
      };
    },
  );

  const kills = events.filter((x) => x.type === 'kill').length;
  const deaths = events.filter((x) => x.type === 'death').length;

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
