import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Crown,
  Flame,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

const nf = new Intl.NumberFormat('en-US');

function num(value) {
  return Number(value) || 0;
}

function shortNum(value) {
  const valueNumber = num(value);
  const abs = Math.abs(valueNumber);

  if (abs >= 1_000_000_000_000) {
    return `${(valueNumber / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '')}T`;
  }

  if (abs >= 1_000_000_000) {
    return `${(valueNumber / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  }

  if (abs >= 1_000_000) {
    return `${(valueNumber / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (abs >= 1_000) {
    return `${(valueNumber / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }

  return nf.format(Math.round(valueNumber));
}

function cls(...items) {
  return items.filter(Boolean).join(' ');
}

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function kd(kills, deaths) {
  const deathsNumber = num(deaths);
  if (!deathsNumber) return num(kills);
  return num(kills) / deathsNumber;
}

const demoStats = {
  kills: 5384,
  deaths: 2416,
  kd: 2.23,
  players: [
    { name: 'Aethon', family: 'Adversary', kills: 1284, deaths: 421, guild: 'Adversary' },
    { name: 'Ravienne', family: 'Adversary', kills: 1128, deaths: 384, guild: 'Adversary' },
    { name: 'Nyxara', family: 'Adversary', kills: 973, deaths: 311, guild: 'Adversary' },
    { name: 'Silvren', family: 'Adversary', kills: 812, deaths: 190, guild: 'Adversary' },
    { name: 'Zerathos', family: 'Adversary', kills: 745, deaths: 276, guild: 'Adversary' },
    { name: 'Kaelthar', family: 'Adversary', kills: 622, deaths: 232, guild: 'Adversary' },
    { name: 'Lunara', family: 'Adversary', kills: 528, deaths: 198, guild: 'Adversary' },
    { name: 'Oldregard', family: 'Adversary', kills: 421, deaths: 255, guild: 'Adversary' },
    { name: 'Elysia', family: 'Adversary', kills: 319, deaths: 128, guild: 'Adversary' },
    { name: 'Valgrim', family: 'Adversary', kills: 286, deaths: 153, guild: 'Adversary' },
  ],
  st: {
    Aethon: 17,
    Ravienne: 14,
    Nyxara: 12,
    Silvren: 22,
    Zerathos: 10,
    Kaelthar: 9,
    Lunara: 7,
    Oldregard: 5,
    Elysia: 6,
    Valgrim: 4,
  },
  fd: {
    Aethon: 8,
    Ravienne: 6,
    Nyxara: 5,
    Silvren: 7,
    Zerathos: 4,
    Kaelthar: 4,
    Lunara: 3,
    Oldregard: 2,
    Elysia: 3,
    Valgrim: 2,
  },
  ev: [
    ...Array.from({ length: 24 }, (_, index) => ({ id: 'war-1', date: '2026-05-04', type: index % 5 === 0 ? 'death' : 'kill', killer: ['Aethon', 'Ravienne', 'Nyxara', 'Silvren'][index % 4], victim: `Enemy${index % 8}` })),
    ...Array.from({ length: 19 }, (_, index) => ({ id: 'war-2', date: '2026-05-01', type: index % 4 === 0 ? 'death' : 'kill', killer: ['Zerathos', 'Aethon', 'Kaelthar'][index % 3], victim: `Enemy${index % 7}` })),
    ...Array.from({ length: 21 }, (_, index) => ({ id: 'war-3', date: '2026-04-28', type: index % 6 === 0 ? 'death' : 'kill', killer: ['Lunara', 'Silvren', 'Ravienne', 'Nyxara'][index % 4], victim: `Rival${index % 9}` })),
    ...Array.from({ length: 17 }, (_, index) => ({ id: 'war-4', date: '2026-04-18', type: index % 3 === 0 ? 'death' : 'kill', killer: ['Oldregard', 'Elysia', 'Valgrim'][index % 3], victim: `Rival${index % 6}` })),
  ],
};

function buildHallData(stats) {
  const safe = stats?.players?.length ? stats : demoStats;
  const events = safe.ev || [];
  const secondaryRows =
    safe.secondary?.rows ||
    safe.secondaryRows ||
    safe.manualRows ||
    safe.secondary ||
    [];
  const playerNames = new Set((safe.players || []).map((player) => player.name));
  const warMap = {};
  const playerMatchMap = {};
  const thresholds = [1000, 3000, 5000];

  function eventWarId(event) {
    return String(event.id || event.war || event.date || 'war');
  }

  function secondaryWarId(row, index = 0) {
    return String(row?.id || row?.date || row?.war || `secondary-${index}`);
  }

  function eventSortKey(event) {
    return [
      String(event.date || '9999-99-99'),
      String(event.sec ?? 0).padStart(8, '0'),
      String(event.i ?? 0).padStart(8, '0'),
      eventWarId(event),
    ].join(' ');
  }

  function warSortKey(id, date = '') {
    const matchingEvents = warMap[id]?.events || [];
    const firstEvent = [...matchingEvents].sort((a, b) =>
      eventSortKey(a).localeCompare(eventSortKey(b)),
    )[0];

    return firstEvent
      ? eventSortKey(firstEvent)
      : [String(date || '9999-99-99'), '00000000', '00000000', String(id)].join(' ');
  }

  function parseHallNumber(value, fallback = NaN) {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;

    let text = String(value).trim().toLowerCase();
    if (!text) return fallback;

    const multiplier = text.endsWith('b')
      ? 1_000_000_000
      : text.endsWith('m')
        ? 1_000_000
        : text.endsWith('k')
          ? 1_000
          : 1;

    if (multiplier !== 1) {
      text = text.slice(0, -1);
    }

    text = text
      .replace(/\s+/g, '')
      .replace(/[^\d,.\-]/g, '');

    const commaCount = (text.match(/,/g) || []).length;
    const dotCount = (text.match(/\./g) || []).length;

    if (commaCount && dotCount) {
      const lastComma = text.lastIndexOf(',');
      const lastDot = text.lastIndexOf('.');

      if (lastComma > lastDot) {
        text = text.replace(/\./g, '').replace(',', '.');
      } else {
        text = text.replace(/,/g, '');
      }
    } else if (commaCount > 1) {
      text = text.replace(/,/g, '');
    } else if (commaCount === 1) {
      const [left, right = ''] = text.split(',');
      text = right.length === 3 && left.replace('-', '').length <= 3
        ? `${left}${right}`
        : `${left}.${right}`;
    } else if (dotCount > 1) {
      text = text.replace(/\./g, '');
    } else if (dotCount === 1) {
      const [left, right = ''] = text.split('.');
      text = right.length === 3 && left.replace('-', '').length <= 3
        ? `${left}${right}`
        : text;
    }

    const number = Number(text);

    return Number.isFinite(number) ? number * multiplier : fallback;
  }

  function findRowKey(row, keys) {
    return keys.find(
      (key) => row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '',
    );
  }

  const secondaryPlayerKeys = [
    'player',
    'name',
    'family',
    'playerName',
    'Player',
    'Name',
    'Family',
  ];

  const secondaryKillKeys = ['kills', 'Kills', 'kill', 'Kill', 'k', 'K'];
  const secondaryDeathKeys = ['deaths', 'Deaths', 'death', 'Death', 'd', 'D'];

  function getSecondaryPlayerName(row) {
    const key = findRowKey(row, secondaryPlayerKeys);
    return key ? String(row[key] || '').trim() : '';
  }

  function hasSecondaryKills(row) {
    return Boolean(findRowKey(row, secondaryKillKeys));
  }

  function getSecondaryKills(row) {
    const key = findRowKey(row, secondaryKillKeys);
    return key ? parseHallNumber(row[key], 0) : 0;
  }

  function hasSecondaryDeaths(row) {
    return Boolean(findRowKey(row, secondaryDeathKeys));
  }

  function getSecondaryDeaths(row) {
    const key = findRowKey(row, secondaryDeathKeys);
    return key ? parseHallNumber(row[key], 0) : 0;
  }

  function getGuildKillPlayer(event) {
    if (event.guildPlayer && event.type === 'kill') return event.guildPlayer;
    if (event.type === 'kill' && playerNames.has(event.killer)) return event.killer;
    if (event.type !== 'death' && playerNames.has(event.killer)) return event.killer;

    return '';
  }

  function getGuildInvolvedPlayer(event) {
    if (event.guildPlayer) return event.guildPlayer;
    if (event.type === 'kill' && playerNames.has(event.killer)) return event.killer;
    if (event.type === 'death' && playerNames.has(event.victim)) return event.victim;
    if (playerNames.has(event.killer)) return event.killer;
    if (playerNames.has(event.victim)) return event.victim;

    return '';
  }

  function ensureWar(id, date = '') {
    warMap[id] ||= {
      id,
      date: String(date || ''),
      events: [],
    };

    if (!warMap[id].date && date) {
      warMap[id].date = String(date);
    }

    return warMap[id];
  }

  function ensurePlayerMatch(name, warId, date = '') {
    if (!name) return null;

    playerMatchMap[name] ||= {};
    playerMatchMap[name][warId] ||= {
      warId,
      date,
      kills: 0,
      deaths: 0,
      hasKills: false,
      hasDeaths: false,
    };

    if (!playerMatchMap[name][warId].date && date) {
      playerMatchMap[name][warId].date = date;
    }

    return playerMatchMap[name][warId];
  }

  events.forEach((event) => {
    const id = eventWarId(event);
    const war = ensureWar(id, event.date);
    war.events.push(event);

    const involvedPlayer = getGuildInvolvedPlayer(event);
    const killPlayer = getGuildKillPlayer(event);

    if (involvedPlayer) {
      const match = ensurePlayerMatch(involvedPlayer, id, event.date);
      match.hasKills = true;
      match.hasDeaths = true;

      if (event.type === 'death') {
        match.deaths += 1;
      }
    }

    if (killPlayer) {
      const match = ensurePlayerMatch(killPlayer, id, event.date);
      match.kills += 1;
      match.hasKills = true;
    }
  });

  (Array.isArray(secondaryRows) ? secondaryRows : []).forEach((row, index) => {
    const name = getSecondaryPlayerName(row);

    if (!name) return;

    const id = secondaryWarId(row, index);
    const date = row.date || row.war || id;
    ensureWar(id, date);

    const match = ensurePlayerMatch(name, id, date);

    // Same behavior as Player Stats Match History:
    // if a secondary/manual row has a Kills/Deaths cell, that cell is the match value.
    if (hasSecondaryKills(row)) {
      match.kills = getSecondaryKills(row);
      match.hasKills = true;
    }

    if (hasSecondaryDeaths(row)) {
      match.deaths = getSecondaryDeaths(row);
      match.hasDeaths = true;
    }
  });

  const warList = Object.values(warMap).sort((a, b) =>
    warSortKey(a.id, a.date).localeCompare(warSortKey(b.id, b.date)),
  );

  const warIndexById = Object.fromEntries(
    warList.map((war, index) => [war.id, index]),
  );

  const totalWars = warList.length || new Set(events.map((event) => String(event.id || event.date))).size;

  const firstSeenWarIndex = {};
  const thresholdReached = Object.fromEntries(
    thresholds.map((threshold) => [threshold, []]),
  );

  Object.entries(playerMatchMap).forEach(([name, matchesByWar]) => {
    const orderedMatches = Object.values(matchesByWar).sort((a, b) => {
      const ai = warIndexById[a.warId] ?? 999999;
      const bi = warIndexById[b.warId] ?? 999999;

      if (ai !== bi) return ai - bi;

      return String(a.warId).localeCompare(String(b.warId));
    });

    if (orderedMatches.length) {
      firstSeenWarIndex[name] = warIndexById[orderedMatches[0].warId] ?? 0;
    }

    let cumulativeKills = 0;

    orderedMatches.forEach((match) => {
      if (!match.hasKills) return;

      const globalWarIndex = warIndexById[match.warId] ?? 0;
      const before = cumulativeKills;
      const after = before + (Number(match.kills) || 0);
      cumulativeKills = after;

      thresholds.forEach((threshold) => {
        if (
          before < threshold &&
          after >= threshold &&
          !thresholdReached[threshold].some((item) => item.name === name)
        ) {
          thresholdReached[threshold].push({
            name,
            threshold,
            date: match.date || match.warId,
            warId: match.warId,
            globalWarIndex,
            fromFirstLogWars: globalWarIndex + 1,
            fromPlayerFirstLogWars:
              globalWarIndex - (firstSeenWarIndex[name] ?? globalWarIndex) + 1,
            totalKillsAtReach: after,
          });
        }
      });
    });
  });

  function getPlayerMatchValues(name) {
    return Object.values(playerMatchMap[name] || {}).filter((match) => match.hasKills);
  }

  function getPlayerAvgKills(name) {
    const matches = getPlayerMatchValues(name);

    if (!matches.length) return null;

    return (
      matches.reduce((sum, match) => sum + (Number(match.kills) || 0), 0) /
      matches.length
    );
  }

  function getPlayerAvgKd(name) {
    const matches = Object.values(playerMatchMap[name] || {}).filter(
      (match) => match.hasKills || match.hasDeaths,
    );

    if (!matches.length) return null;

    return (
      matches.reduce(
        (sum, match) => sum + kd(Number(match.kills) || 0, Number(match.deaths) || 0),
        0,
      ) / matches.length
    );
  }

  const rows = (safe.players || [])
    .map((player) => {
      const kills = num(player.kills);
      const deaths = num(player.deaths);
      const ratio = kd(kills, deaths);
      const streak = num(safe.st?.[player.name]);
      const feed = num(safe.fd?.[player.name]);
      const damageDealt = num(player.damageDealt);
      const damageTaken = num(player.damageTaken);
      const ccHits = num(player.ccHits);
      const fortDamage = num(player.fortDamage);
      const matchValues = getPlayerMatchValues(player.name);
      const avgKillsMatchCount = matchValues.length;
      const wars = Object.keys(playerMatchMap[player.name] || {}).length;
      const maxMatchKills = Math.max(
        0,
        ...matchValues.map((match) => Number(match.kills) || 0),
      );
      const avgKillsPerMatch = getPlayerAvgKills(player.name);
      const avgKdPerMatch = getPlayerAvgKd(player.name);
      const avgKdMatchCount = Object.values(playerMatchMap[player.name] || {}).filter(
        (match) => match.hasKills || match.hasDeaths,
      ).length;
      const score = Math.max(
        0,
        Math.round(
          kills * 3 +
            ratio * 420 +
            streak * 90 +
            feed * 120 +
            wars * 60 +
            damageDealt / 2_000_000 +
            fortDamage / 1_000_000 +
            ccHits * 8 -
            deaths * 0.7,
        ),
      );

      let title = 'Guild Veteran';
      if (kills >= 1000) title = 'Top Fragger';
      if (ratio >= 4) title = 'Best K/D';
      if (streak >= 15) title = 'Clutch King';
      if (feed >= 7) title = 'Killfeed Master';
      if (wars >= 8) title = 'Siege Veteran';

      return {
        ...player,
        kills,
        deaths,
        kd: ratio,
        streak,
        feed,
        wars,
        damageDealt,
        damageTaken,
        ccHits,
        fortDamage,
        maxMatchKills,
        avgKillsPerMatch,
        avgKillsMatchCount,
        avgKdPerMatch,
        avgKdMatchCount,
        score,
        title,
      };
    })
    .sort((a, b) => b.score - a.score || b.kills - a.kills || a.name.localeCompare(b.name));

  const bestKd = [...rows].filter((row) => row.kills >= 5).sort((a, b) => b.kd - a.kd)[0] || rows[0];
  const topKills = [...rows].sort((a, b) => b.kills - a.kills)[0] || rows[0];
  const topStreak = [...rows].sort((a, b) => b.streak - a.streak)[0] || rows[0];
  const topFeed = [...rows].sort((a, b) => b.feed - a.feed)[0] || rows[0];
  const topWars = [...rows].sort((a, b) => b.wars - a.wars)[0] || rows[0];

  const achievements = [
    { title: 'Hall MVP', icon: Crown, player: rows[0], value: shortNum(rows[0]?.score), sub: 'Highest total score', tone: 'amber' },
    { title: 'Top Fragger', icon: Swords, player: topKills, value: nf.format(topKills?.kills || 0), sub: 'Most kills', tone: 'rose' },
    { title: 'Best K/D', icon: Target, player: bestKd, value: (bestKd?.kd || 0).toFixed(2), sub: 'Best ratio', tone: 'emerald' },
    { title: 'Clutch King', icon: Flame, player: topStreak, value: nf.format(topStreak?.streak || 0), sub: 'Longest streak', tone: 'orange' },
    { title: 'Killfeed Master', icon: Zap, player: topFeed, value: nf.format(topFeed?.feed || 0), sub: 'Best feed', tone: 'cyan' },
    { title: 'Siege Veteran', icon: Shield, player: topWars, value: nf.format(topWars?.wars || 0), sub: 'Most wars', tone: 'blue' },
  ];

  const months = Object.values(
    events.reduce((acc, event) => {
      const month = String(event.date || '').slice(0, 7) || 'Unknown';
      acc[month] ||= { month, kills: 0, deaths: 0, wars: new Set() };

      if (event.type === 'death') acc[month].deaths += 1;
      else if (getGuildKillPlayer(event)) acc[month].kills += 1;

      acc[month].wars.add(String(event.id || event.date));

      return acc;
    }, {}),
  )
    .map((item) => ({ ...item, wars: item.wars.size }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const thresholdLeaderboards = Object.fromEntries(
    thresholds.map((threshold) => [
      threshold,
      {
        first: [...thresholdReached[threshold]]
          .sort(
            (a, b) =>
              a.globalWarIndex - b.globalWarIndex ||
              a.name.localeCompare(b.name),
          )
          .slice(0, 10),
        fastest: [...thresholdReached[threshold]]
          .sort(
            (a, b) =>
              a.fromPlayerFirstLogWars - b.fromPlayerFirstLogWars ||
              a.globalWarIndex - b.globalWarIndex ||
              a.name.localeCompare(b.name),
          )
          .slice(0, 10),
      },
    ]),
  );

  return {
    rows,
    achievements,
    months,
    thresholdLeaderboards,
    topKillers: [...rows]
      .filter((row) => row.kills > 0)
      .sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name))
      .slice(0, 10),
    topDamagePlayers: [...rows]
      .filter((row) => row.damageDealt > 0)
      .sort((a, b) => b.damageDealt - a.damageDealt || a.name.localeCompare(b.name))
      .slice(0, 10),
    totals: {
      kills: num(safe.kills) || rows.reduce((sum, row) => sum + row.kills, 0),
      deaths: num(safe.deaths) || rows.reduce((sum, row) => sum + row.deaths, 0),
      kd: num(safe.kd) || kd(num(safe.kills), num(safe.deaths)),
      players: rows.length,
      wars: totalWars,
      score: rows.reduce((sum, row) => sum + row.score, 0),
      damageDealt: rows.reduce((sum, row) => sum + row.damageDealt, 0),
    },
  };
}

const toneClasses = {
  amber: {
    soft: 'border-amber-400/25 bg-amber-500/10 text-amber-300 shadow-amber-500/10',
    text: 'text-amber-300',
    bar: 'from-amber-500 to-yellow-300',
    glow: 'shadow-[0_0_35px_rgba(245,158,11,.18)]',
  },
  rose: {
    soft: 'border-rose-400/25 bg-rose-500/10 text-rose-300 shadow-rose-500/10',
    text: 'text-rose-300',
    bar: 'from-rose-500 to-red-300',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,.15)]',
  },
  emerald: {
    soft: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300 shadow-emerald-500/10',
    text: 'text-emerald-300',
    bar: 'from-emerald-500 to-lime-300',
    glow: 'shadow-[0_0_35px_rgba(16,185,129,.15)]',
  },
  orange: {
    soft: 'border-orange-400/25 bg-orange-500/10 text-orange-300 shadow-orange-500/10',
    text: 'text-orange-300',
    bar: 'from-orange-500 to-amber-300',
    glow: 'shadow-[0_0_35px_rgba(249,115,22,.15)]',
  },
  cyan: {
    soft: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-300 shadow-cyan-500/10',
    text: 'text-cyan-300',
    bar: 'from-cyan-500 to-blue-300',
    glow: 'shadow-[0_0_35px_rgba(6,182,212,.15)]',
  },
  blue: {
    soft: 'border-blue-400/25 bg-blue-500/10 text-blue-300 shadow-blue-500/10',
    text: 'text-blue-300',
    bar: 'from-blue-500 to-sky-300',
    glow: 'shadow-[0_0_35px_rgba(59,130,246,.18)]',
  },
  violet: {
    soft: 'border-violet-400/25 bg-violet-500/10 text-violet-300 shadow-violet-500/10',
    text: 'text-violet-300',
    bar: 'from-violet-500 to-fuchsia-300',
    glow: 'shadow-[0_0_35px_rgba(139,92,246,.15)]',
  },
  slate: {
    soft: 'border-slate-700 bg-slate-950/70 text-slate-300 shadow-slate-900/10',
    text: 'text-slate-300',
    bar: 'from-slate-500 to-slate-300',
    glow: 'shadow-[0_0_35px_rgba(15,23,42,.4)]',
  },
};

function getTone(tone) {
  return toneClasses[tone] || toneClasses.blue;
}

function PageFrame({ children }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-800/90 bg-[#050b16] p-4 shadow-2xl sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,.18),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,.12),transparent_28%),linear-gradient(180deg,rgba(15,23,42,.3),transparent)]" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-20 h-72 w-72 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="relative space-y-5">{children}</div>
    </div>
  );
}

function PremiumPanel({ children, className = '', glow = false }) {
  return (
    <div
      className={cls(
        'relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-950/72 shadow-2xl backdrop-blur-xl',
        glow && 'shadow-[0_0_40px_rgba(59,130,246,.12)]',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

function Avatar({ name, size = 'md', rank = 0 }) {
  const sizes = {
    sm: 'h-9 w-9 text-xs rounded-xl',
    md: 'h-12 w-12 text-sm rounded-2xl',
    lg: 'h-16 w-16 text-lg rounded-2xl',
    xl: 'h-24 w-24 text-3xl rounded-[1.65rem]',
  };

  const ring =
    rank === 1
      ? 'border-amber-300/50 shadow-[0_0_30px_rgba(245,158,11,.2)]'
      : rank === 2
        ? 'border-slate-300/35 shadow-[0_0_24px_rgba(148,163,184,.14)]'
        : rank === 3
          ? 'border-orange-300/40 shadow-[0_0_24px_rgba(249,115,22,.14)]'
          : 'border-blue-300/20 shadow-[0_0_24px_rgba(59,130,246,.08)]';

  return (
    <div
      className={cls(
        'grid shrink-0 place-items-center border bg-gradient-to-br from-slate-700 via-slate-950 to-blue-950 font-black text-blue-100',
        sizes[size],
        ring,
      )}
    >
      {initials(name)}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = 'blue' }) {
  const toneInfo = getTone(tone);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/75 p-4 shadow-xl transition duration-200 hover:-translate-y-0.5 hover:border-blue-400/25 hover:bg-slate-900/80">
      <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-blue-500/5 blur-2xl transition group-hover:bg-blue-500/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-slate-100">{value}</div>
          {sub && <div className="mt-1 text-xs font-bold text-slate-500">{sub}</div>}
        </div>
        <div className={cls('grid h-11 w-11 place-items-center rounded-xl border shadow-lg', toneInfo.soft, toneInfo.glow)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h3>
      {action && (
        <button className="group flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs font-black text-blue-300 transition hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-blue-200">
          {action}
          <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

function RankBadge({ rank }) {
  const classes =
    rank === 1
      ? 'border-amber-300/40 bg-amber-500/15 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,.18)]'
      : rank === 2
        ? 'border-slate-300/30 bg-slate-400/10 text-slate-200'
        : rank === 3
          ? 'border-orange-300/35 bg-orange-500/10 text-orange-200'
          : 'border-slate-700 bg-slate-900 text-slate-400';

  return (
    <div className={cls('grid h-10 w-10 place-items-center rounded-xl border text-sm font-black', classes)}>
      #{rank}
    </div>
  );
}

function LegendRow({ row, rank }) {
  return (
    <div className="group grid grid-cols-[54px_1.35fr_.85fr_.6fr_.55fr_.55fr] items-center gap-3 border-b border-slate-900/90 px-4 py-3.5 last:border-b-0 hover:bg-blue-500/[0.045]">
      <RankBadge rank={rank} />
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={row.name} size="sm" rank={rank} />
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">{row.name}</div>
          <div className="truncate text-xs font-bold text-blue-300">{row.family || row.guild || 'Adversary'}</div>
        </div>
      </div>
      <div className="truncate text-sm font-bold text-slate-300">{row.title}</div>
      <div className="text-right text-sm font-black text-blue-200">{shortNum(row.score)}</div>
      <div className="text-right text-sm font-black text-emerald-300">{row.kd.toFixed(2)}</div>
      <div className="text-right text-sm font-black text-slate-200">{nf.format(row.kills)}</div>
    </div>
  );
}

function Leaderboard({ rows, limit = 8, title = 'Hall Leaderboard' }) {
  return (
    <PremiumPanel>
      <div className="p-5 pb-0">
        <SectionTitle icon={BarChart3} title={title} action="View all" />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[54px_1.35fr_.85fr_.6fr_.55fr_.55fr] gap-3 border-y border-slate-800 bg-slate-950/80 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <div>Rank</div>
            <div>Player</div>
            <div>Title</div>
            <div className="text-right">Score</div>
            <div className="text-right">K/D</div>
            <div className="text-right">Kills</div>
          </div>
          {rows.slice(0, limit).map((row, index) => <LegendRow key={row.name} row={row} rank={index + 1} />)}
        </div>
      </div>
    </PremiumPanel>
  );
}

function AchievementCard({ item, compact = false }) {
  const Icon = item.icon;
  const toneInfo = getTone(item.tone);

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-xl transition duration-200 hover:-translate-y-1 hover:border-blue-400/30 hover:bg-slate-900/85">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl transition group-hover:bg-blue-500/12" />
      <div className="relative flex items-start justify-between gap-3">
        <div className={cls('grid h-12 w-12 place-items-center rounded-2xl border shadow-lg', toneInfo.soft, toneInfo.glow)}>
          <Icon className="h-6 w-6" />
        </div>
        <Sparkles className="h-4 w-4 text-slate-600 group-hover:text-blue-300" />
      </div>
      <div className={cls('relative', compact ? 'mt-3' : 'mt-5')}>
        <div className="text-sm font-black uppercase tracking-wide text-white">{item.title}</div>
        <div className="mt-1 text-xs font-bold text-slate-500">{item.sub}</div>
      </div>
      <div className="relative mt-4 flex items-center gap-3 rounded-2xl border border-slate-800 bg-black/25 p-3">
        <Avatar name={item.player?.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-slate-100">{item.player?.name || '-'}</div>
          <div className="text-xs font-bold text-slate-500">{item.player?.title || 'Legend'}</div>
        </div>
        <div className={cls('text-lg font-black', toneInfo.text)}>{item.value}</div>
      </div>
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-slate-900">
        <div className={cls('h-full w-3/4 rounded-full bg-gradient-to-r', toneInfo.bar)} />
      </div>
    </div>
  );
}

function TopLegendCard({ row, rank, wide = false, center = false }) {
  const isGold = rank === 1;
  const frame =
    rank === 1
      ? 'border-amber-300/35 bg-gradient-to-br from-amber-500/12 via-slate-950 to-blue-950/35'
      : rank === 2
        ? 'border-slate-300/20 bg-gradient-to-br from-slate-300/8 via-slate-950 to-blue-950/20'
        : rank === 3
          ? 'border-orange-300/25 bg-gradient-to-br from-orange-500/10 via-slate-950 to-blue-950/20'
          : 'border-slate-800 bg-slate-950/70';

  return (
    <div
      className={cls(
        'group relative overflow-hidden rounded-3xl border p-4 shadow-xl transition duration-200 hover:-translate-y-1',
        frame,
        isGold && 'shadow-[0_0_40px_rgba(245,158,11,.13)]',
        wide && 'md:col-span-2',
        center && 'xl:scale-105',
      )}
    >
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl transition group-hover:bg-blue-500/15" />
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
      <div className="relative flex items-center gap-4">
        <RankBadge rank={rank} />
        <Avatar name={row.name} size={center ? 'xl' : 'lg'} rank={rank} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-black text-white">{row.name}</div>
          <div className="truncate text-sm font-bold text-blue-300">{row.title}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-black text-slate-400">
            <span>{nf.format(row.kills)} kills</span>
            <span>·</span>
            <span>{row.kd.toFixed(2)} K/D</span>
            <span>·</span>
            <span>{shortNum(row.score)} score</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <PremiumPanel className="p-8 text-center">
      <Trophy className="mx-auto mb-3 h-10 w-10 text-slate-600" />
      <h3 className="text-xl font-black text-white">No data yet.</h3>
      <p className="mt-2 text-sm font-semibold text-slate-500">Selectează un log, o zi sau All Logs ca să fie calculate statisticile.</p>
    </PremiumPanel>
  );
}

function HallProgressRow({ label, value, max, right, tone = 'blue' }) {
  const width = max ? Math.max(5, Math.min(100, (num(value) / max) * 100)) : 0;
  const colors = {
    blue: 'from-blue-500 to-sky-300',
    emerald: 'from-emerald-500 to-lime-300',
    amber: 'from-amber-500 to-yellow-300',
    rose: 'from-rose-500 to-red-300',
  };

  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black">
        <span className="truncate text-slate-200">{label}</span>
        <span className="shrink-0 text-slate-400">{right ?? shortNum(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-900/90">
        <div className={cls('h-2 rounded-full bg-gradient-to-r', colors[tone] || colors.blue)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function HallHeaderCard({
  icon: Icon,
  title,
  value,
  sub,
  tone = 'blue',
  active = false,
  onClick,
}) {
  const toneInfo = getTone(tone);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cls(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 text-left shadow-xl transition duration-200 hover:-translate-y-0.5',
        toneInfo.soft,
        active && 'ring-2 ring-white/20',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.055),transparent)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-75">
            {title}
          </p>
          <p className="mt-2 text-3xl font-black leading-none">{value}</p>
          {sub && <p className="mt-2 text-xs font-bold opacity-70">{sub}</p>}
        </div>

        <div className={cls('grid h-11 w-11 shrink-0 place-items-center rounded-2xl border bg-slate-950/55', toneInfo.soft)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

function HallTopHeaders({ data, activeTab, onTabChange }) {
  const bestKd = [...data.rows]
    .filter((player) => player.kills >= 5)
    .sort((a, b) => b.kd - a.kd || b.kills - a.kills || a.name.localeCompare(b.name))[0];

  const topStreak = [...data.rows]
    .sort((a, b) => b.streak - a.streak || b.kills - a.kills || a.name.localeCompare(b.name))[0];

  return (
    <header className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <HallHeaderCard
          icon={Swords}
          title="Kills"
          value={shortNum(data.totals.kills)}
          sub="Total kills"
          tone="blue"
          active={activeTab === 'kills'}
          onClick={() => onTabChange('kills')}
        />

        <HallHeaderCard
          icon={Target}
          title="Highlights"
          value={bestKd ? bestKd.kd.toFixed(2) : '0.00'}
          sub={topStreak ? `Best K/D · Streak ${shortNum(topStreak.streak)}` : 'Best K/D · Streak'}
          tone="emerald"
          active={activeTab === 'highlights'}
          onClick={() => onTabChange('highlights')}
        />
      </div>
    </header>
  );
}

function CombatOutputPanel({ data }) {
  const topTotalKills = [...data.rows]
    .filter((player) => player.kills > 0)
    .sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name))
    .slice(0, 10);

  const topAverageKills = [...data.rows]
    .filter(
      (player) =>
        Number(player.avgKillsMatchCount) >= 30 &&
        Number.isFinite(Number(player.avgKillsPerMatch)),
    )
    .sort(
      (a, b) =>
        b.avgKillsPerMatch - a.avgKillsPerMatch ||
        b.kills - a.kills ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 10);

  const topFraggers = [...data.rows]
    .filter(
      (player) =>
        Number(player.avgKillsMatchCount) >= 30 &&
        player.maxMatchKills > 0,
    )
    .sort((a, b) => b.maxMatchKills - a.maxMatchKills || b.kills - a.kills || a.name.localeCompare(b.name))
    .slice(0, 10);

  const maxTotalKills = Math.max(1, ...topTotalKills.map((player) => player.kills));
  const maxAverageKills = Math.max(1, ...topAverageKills.map((player) => player.avgKillsPerMatch));
  const maxSingleMatchKills = Math.max(1, ...topFraggers.map((player) => player.maxMatchKills));

  return (
    <PremiumPanel className="p-5">
      <SectionTitle icon={Swords} title="Kills" />
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Total Kills</p>
          {topTotalKills.length ? (
            topTotalKills.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.kills}
                max={maxTotalKills}
                right={shortNum(player.kills)}
                tone="rose"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No kills yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">AVG Kills · Top 10 · Min 30 matches</p>
          {topAverageKills.length ? (
            topAverageKills.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.avgKillsPerMatch}
                max={maxAverageKills}
                right={player.avgKillsPerMatch.toFixed(2)}
                tone="blue"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No players with at least 30 matches yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Top Fraggers · Top 10 · Min 30 matches</p>
          {topFraggers.length ? (
            topFraggers.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.maxMatchKills}
                max={maxSingleMatchKills}
                right={shortNum(player.maxMatchKills)}
                tone="emerald"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No players with at least 30 matches yet.</p>
          )}
        </div>
      </div>
    </PremiumPanel>
  );
}

function CombatRecordsPanel({ data }) {
  const topBestKd = [...data.rows]
    .filter((player) => player.kills >= 5)
    .sort((a, b) => b.kd - a.kd || b.kills - a.kills || a.name.localeCompare(b.name))
    .slice(0, 10);

  const topAverageKd = [...data.rows]
    .filter(
      (player) =>
        Number(player.avgKdMatchCount) > 0 &&
        Number.isFinite(Number(player.avgKdPerMatch)),
    )
    .sort(
      (a, b) =>
        b.avgKdPerMatch - a.avgKdPerMatch ||
        b.kd - a.kd ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 10);

  const topStreaks = [...data.rows]
    .filter((player) => player.streak > 0)
    .sort((a, b) => b.streak - a.streak || b.kills - a.kills || a.name.localeCompare(b.name))
    .slice(0, 10);

  const topFeeds = [...data.rows]
    .filter((player) => player.feed > 0)
    .sort((a, b) => b.feed - a.feed || b.kills - a.kills || a.name.localeCompare(b.name))
    .slice(0, 10);

  const maxBestKd = Math.max(1, ...topBestKd.map((player) => player.kd));
  const maxAverageKd = Math.max(1, ...topAverageKd.map((player) => player.avgKdPerMatch));
  const maxStreak = Math.max(1, ...topStreaks.map((player) => player.streak));
  const maxFeed = Math.max(1, ...topFeeds.map((player) => player.feed));

  return (
    <PremiumPanel className="p-5">
      <SectionTitle icon={Target} title="Highlights" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Highest K/D · Top 10</p>
          {topBestKd.length ? (
            topBestKd.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.kd}
                max={maxBestKd}
                right={player.kd.toFixed(2)}
                tone="emerald"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No K/D data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Average K/D</p>
          {topAverageKd.length ? (
            topAverageKd.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.avgKdPerMatch}
                max={maxAverageKd}
                right={player.avgKdPerMatch.toFixed(2)}
                tone="blue"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No average K/D data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Highest Kill Streak</p>
          {topStreaks.length ? (
            topStreaks.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.streak}
                max={maxStreak}
                right={shortNum(player.streak)}
                tone="orange"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No kill streak data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Biggest Kill Feed</p>
          {topFeeds.length ? (
            topFeeds.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.feed}
                max={maxFeed}
                right={shortNum(player.feed)}
                tone="cyan"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No kill feed data yet.</p>
          )}
        </div>
      </div>
    </PremiumPanel>
  );
}

function FirstMilestonesPanel({ data }) {
  const thresholds = [1000, 3000, 5000];

  function renderFirstLeaderboard(threshold) {
    const rows = data.thresholdLeaderboards?.[threshold]?.first || [];
    const maxValue = Math.max(1, ...rows.map((row) => row.fromFirstLogWars || 0));

    return (
      <div>
        <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          First to {threshold} Kills · Top 10
        </p>
        {rows.length ? (
          rows.map((row, index) => (
            <HallProgressRow
              key={`${threshold}-first-${row.name}`}
              label={`${index + 1}. ${row.name}`}
              value={Math.max(1, maxValue - row.fromFirstLogWars + 1)}
              max={maxValue}
              right={row.date ? `${row.date} · log ${row.fromFirstLogWars}` : `Log ${row.fromFirstLogWars}`}
              tone="amber"
            />
          ))
        ) : (
          <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">
            No player reached {threshold} kills yet.
          </p>
        )}
      </div>
    );
  }

  return (
    <PremiumPanel className="p-5">
      <SectionTitle icon={Trophy} title="First Milestones" />
      <div className="grid gap-5 md:grid-cols-3">
        {thresholds.map((threshold) => (
          <React.Fragment key={`first-${threshold}`}>
            {renderFirstLeaderboard(threshold)}
          </React.Fragment>
        ))}
      </div>
    </PremiumPanel>
  );
}

function FastestMilestonesPanel({ data }) {
  const thresholds = [1000, 3000, 5000];

  function renderFastestLeaderboard(threshold) {
    const rows = data.thresholdLeaderboards?.[threshold]?.fastest || [];
    const maxValue = Math.max(1, ...rows.map((row) => row.fromPlayerFirstLogWars || 0));

    return (
      <div>
        <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Fastest to {threshold} Kills · Top 10
        </p>
        {rows.length ? (
          rows.map((row, index) => (
            <HallProgressRow
              key={`${threshold}-fastest-${row.name}`}
              label={`${index + 1}. ${row.name}`}
              value={Math.max(1, maxValue - row.fromPlayerFirstLogWars + 1)}
              max={maxValue}
              right={`${row.fromPlayerFirstLogWars} logs`}
              tone="cyan"
            />
          ))
        ) : (
          <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">
            No player reached {threshold} kills yet.
          </p>
        )}
      </div>
    );
  }

  return (
    <PremiumPanel className="p-5">
      <SectionTitle icon={Zap} title="Fastest Milestones" />
      <div className="grid gap-5 md:grid-cols-3">
        {thresholds.map((threshold) => (
          <React.Fragment key={`fastest-${threshold}`}>
            {renderFastestLeaderboard(threshold)}
          </React.Fragment>
        ))}
      </div>
    </PremiumPanel>
  );
}

function ArsenalOutputPanel({ data }) {
  const maxKills = Math.max(1, ...data.topKillers.map((player) => player.kills));
  const maxDamage = Math.max(1, ...data.topDamagePlayers.map((player) => player.damageDealt));

  return (
    <PremiumPanel className="p-5">
      <SectionTitle icon={BarChart3} title="Arsenal Output" action="Hall V1" />
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Kill Leaders</p>
          {data.topKillers.length ? (
            data.topKillers.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.kills}
                max={maxKills}
                right={shortNum(player.kills)}
                tone="emerald"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No kill leaders yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Damage Leaders</p>
          {data.topDamagePlayers.length ? (
            data.topDamagePlayers.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.damageDealt}
                max={maxDamage}
                right={shortNum(player.damageDealt)}
                tone="amber"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No secondary damage data yet.</p>
          )}
        </div>
      </div>
    </PremiumPanel>
  );
}

function Variant1({ data }) {
  const [activeTab, setActiveTab] = useState('kills');

  return (
    <div className="space-y-5">
      <HallTopHeaders
        data={data}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'kills' ? (
        <>
          <CombatOutputPanel data={data} />

          <FirstMilestonesPanel data={data} />

          <FastestMilestonesPanel data={data} />
        </>
      ) : (
        <CombatRecordsPanel data={data} />
      )}
    </div>
  );
}

function PreviewAll({ data }) {
  return (
    <div className="min-h-screen bg-[#050b16] p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-10">
        <PageFrame>
          <Variant1 data={data} />
        </PageFrame>
      </div>
    </div>
  );
}

export default function HallOfFame({ stats, allTimeStats } = {}) {
  const previewMode = !stats && !allTimeStats;
  const data = useMemo(() => buildHallData(allTimeStats?.players?.length ? allTimeStats : stats), [stats, allTimeStats]);

  if (!data.rows.length) return <EmptyState />;
  if (previewMode) return <PreviewAll data={buildHallData(demoStats)} />;

  return (
    <PageFrame>
      <Variant1 data={data} />
    </PageFrame>
  );
}
