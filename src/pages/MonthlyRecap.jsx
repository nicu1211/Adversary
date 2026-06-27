import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Castle,
  ChevronRight,
  Crosshair,
  Flag,
  Flame,
  Gauge,
  Medal,
  Shield,
  Skull,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

import {
  buildNodeWarRow,
  calculateStats,
  calculateStreaks,
  dateOf,
  scrollCls,
} from '../lib/logUtils';

const MIN_MONTH = '2026-05';
const DEFAULT_RECAP_DAYS_AGO = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const GUILD_ROSTER = Object.freeze([
  'GojuSaki',
  'Aspeen',
  'MrOutlAw',
  'SpeedDrawFenix',
  'Dante_Senpai',
  'Jaxce',
  'Spilborghs',
  'Raizel',
  'AesirKing',
  'GMW',
  'ARC',
  'URIZEN',
  'Animal_Dylan',
  'MokrySpren',
  'Emotionz',
  'Emphonia',
  'EHASZz',
  'MrDethsTV',
  'MrsRaccoon',
  'Joeshot',
  'SexyCupquake',
  'DGN',
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
  'Vollkornbeet',
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

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compact(value, digits = 1) {
  const number = num(value);
  const absolute = Math.abs(number);

  if (absolute >= 1_000_000_000_000) {
    return `${(number / 1_000_000_000_000)
      .toFixed(digits)
      .replace(/\.0$/, '')}T`;
  }

  if (absolute >= 1_000_000_000) {
    return `${(number / 1_000_000_000)
      .toFixed(digits)
      .replace(/\.0$/, '')}B`;
  }

  if (absolute >= 1_000_000) {
    return `${(number / 1_000_000)
      .toFixed(digits)
      .replace(/\.0$/, '')}M`;
  }

  if (absolute >= 1_000) {
    return `${(number / 1_000)
      .toFixed(digits)
      .replace(/\.0$/, '')}K`;
  }

  return Math.round(number).toLocaleString('en-US');
}

function ratio(kills, deaths) {
  const safeKills = num(kills);
  const safeDeaths = num(deaths);

  return safeDeaths > 0
    ? safeKills / safeDeaths
    : safeKills > 0
      ? safeKills
      : 0;
}

function monthFromDate(value) {
  const text = String(value || '');
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : '';
}

function localMonthId(timestamp = Date.now()) {
  const date = new Date(timestamp);

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}`;
}

function dateTimestamp(value) {
  const text = String(value || '');
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);

  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      12,
      0,
      0,
      0,
    ).getTime();
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthDateWindow(
  monthId,
  daysAgo = DEFAULT_RECAP_DAYS_AGO,
) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ''))) {
    return {
      start: 0,
      end: 0,
      days: 0,
    };
  }

  const [year, month] = monthId.split('-').map(Number);
  const monthStart = new Date(
    year,
    month - 1,
    1,
    0,
    0,
    0,
    0,
  ).getTime();
  const monthEnd = new Date(
    year,
    month,
    0,
    23,
    59,
    59,
    999,
  ).getTime();

  // The selected month defines where the rolling range ends.
  // Current month ends at the current moment; historical months
  // end on their final calendar day.
  const end =
    monthId === localMonthId()
      ? Math.min(Date.now(), monthEnd)
      : monthEnd;

  const safeDays = Math.max(0, Math.floor(num(daysAgo)));

  let start = monthStart;

  if (safeDays > 0) {
    const startDate = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(
      startDate.getDate() - (safeDays - 1),
    );
    start = startDate.getTime();
  }

  return {
    start,
    end,
    days:
      safeDays > 0
        ? safeDays
        : Math.max(
            1,
            Math.ceil((end - start + 1) / DAY_MS),
          ),
  };
}

function previousDateWindow(window) {
  if (!window?.start || !window?.days) {
    return {
      start: 0,
      end: 0,
      days: 0,
    };
  }

  const end = window.start - 1;
  const start = window.start - window.days * DAY_MS;

  return {
    start,
    end,
    days: window.days,
  };
}

function dateIsInWindow(value, window) {
  const timestamp = dateTimestamp(value);

  return Boolean(
    timestamp &&
      window?.start &&
      timestamp >= window.start &&
      timestamp <= window.end,
  );
}

function monthLabel(monthId) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ''))) return 'Unknown month';

  const [year, month] = monthId.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function previousMonthId(monthId) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ''))) return '';

  const [year, month] = monthId.split('-').map(Number);
  const previous = new Date(year, month - 2, 1);

  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(
    2,
    '0',
  )}`;
}

function shortMonthLabel(monthId) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ''))) return 'previous month';

  const [year, month] = monthId.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
}

function formatDate(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return String(value || '-');

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getGuildPlayer(event) {
  return (
    event?.guildPlayer ||
    (event?.type === 'kill' ? event?.killer : event?.victim) ||
    ''
  );
}

function cleanGuild(value) {
  const text = String(value || '').trim();

  if (!text || /^\d{4}-\d{2}-\d{2}$/.test(text)) return '';

  return text;
}

function hasOwnStatMetric(row, aliases) {
  return Boolean(
    row &&
      aliases.some(
        (alias) =>
          Object.prototype.hasOwnProperty.call(row, alias) &&
          row[alias] !== undefined &&
          row[alias] !== null &&
          row[alias] !== '',
      ),
  );
}

function readStatMetric(row, aliases, fallback = 0) {
  if (!row) return fallback;

  const alias = aliases.find(
    (key) =>
      Object.prototype.hasOwnProperty.call(row, key) &&
      row[key] !== undefined &&
      row[key] !== null &&
      row[key] !== '',
  );

  return alias == null ? fallback : num(row[alias]);
}

function chronologyTimestamp(item) {
  const candidates = [
    item?.timestamp,
    item?.time,
    item?.datetime,
    item?.dateTime,
    item?.date,
    item?.createdAt,
    item?.startTime,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') {
      continue;
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate < 100000000000
        ? candidate * 1000
        : candidate;
    }

    const numeric = Number(candidate);

    if (
      String(candidate).trim() !== '' &&
      Number.isFinite(numeric) &&
      numeric > 0
    ) {
      return numeric < 100000000000
        ? numeric * 1000
        : numeric;
    }

    const parsed = Date.parse(String(candidate));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function chronologicalCompare(a, b) {
  const aTime = Number.isFinite(a?.firstAppearanceTime)
    ? a.firstAppearanceTime
    : Number.POSITIVE_INFINITY;
  const bTime = Number.isFinite(b?.firstAppearanceTime)
    ? b.firstAppearanceTime
    : Number.POSITIVE_INFINITY;

  if (aTime !== bTime) {
    return aTime < bTime ? -1 : 1;
  }

  const aOrder = Number.isFinite(a?.firstAppearanceOrder)
    ? a.firstAppearanceOrder
    : Number.POSITIVE_INFINITY;
  const bOrder = Number.isFinite(b?.firstAppearanceOrder)
    ? b.firstAppearanceOrder
    : Number.POSITIVE_INFINITY;

  if (aOrder !== bOrder) {
    return aOrder < bOrder ? -1 : 1;
  }

  const aRosterOrder = Number.isFinite(a?.rosterOrder)
    ? a.rosterOrder
    : Number.POSITIVE_INFINITY;
  const bRosterOrder = Number.isFinite(b?.rosterOrder)
    ? b.rosterOrder
    : Number.POSITIVE_INFINITY;

  if (aRosterOrder !== bRosterOrder) {
    return aRosterOrder < bRosterOrder ? -1 : 1;
  }

  return String(a?.name || '').localeCompare(
    String(b?.name || ''),
  );
}

function buildPlayerChronology(stats) {
  const byPlayer = new Map();
  let sourceOrder = 0;

  function consider(name, item) {
    const cleanName = String(name || '').trim();
    const order = sourceOrder++;

    if (!cleanName) return;

    const key = cleanName.toLowerCase();
    const time = chronologyTimestamp(item);
    const current = byPlayer.get(key);

    if (
      !current ||
      time < current.time ||
      (time === current.time && order < current.order)
    ) {
      byPlayer.set(key, {
        time,
        order,
      });
    }
  }

  (stats?.secondary?.rows || []).forEach((row) => {
    consider(row?.player || row?.name, row);
  });

  (stats?.ev || []).forEach((event) => {
    consider(getGuildPlayer(event), event);
  });

  return byPlayer;
}

function buildStatsLogPlayers(stats) {
  const sourceRows = Array.isArray(stats?.secondary?.rows)
    ? stats.secondary.rows
    : [];

  // One Stats Log should contain one row per player. When duplicate rows
  // exist for the same player and war, keep the row with the largest K+D
  // total rather than double-counting it.
  const uniqueRows = new Map();

  sourceRows.forEach((row, index) => {
    const name = String(row?.player || row?.name || '').trim();

    if (!name) return;

    const warId = String(
      row?.id ||
        row?.war ||
        row?.date ||
        `stats-log-${index}`,
    );

    const key = `${warId}::${name.toLowerCase()}`;
    const current = uniqueRows.get(key);
    const rowInteractions = num(row?.kills) + num(row?.deaths);
    const currentInteractions = current
      ? num(current?.kills) + num(current?.deaths)
      : -1;

    if (!current || rowInteractions > currentInteractions) {
      uniqueRows.set(key, {
        ...row,
        player: name,
        __warId: warId,
      });
    }
  });

  const byPlayer = new Map();

  uniqueRows.forEach((row) => {
    const name = String(row?.player || row?.name || '').trim();

    if (!name) return;

    const key = name.toLowerCase();

    if (!byPlayer.has(key)) {
      byPlayer.set(key, {
        name,
        wars: new Set(),
        kills: 0,
        deaths: 0,
        kdSum: 0,
        kdCount: 0,
        killFeed: 0,
        killFeedTotal: 0,
        killStreak: 0,
        hasKillStreak: false,
        damage: 0,
        damageAverageSum: 0,
        damageAverageCount: 0,
        damageTaken: 0,
        ccHits: 0,
        ccAverageSum: 0,
        ccAverageCount: 0,
        fortDamage: 0,
      });
    }

    const player = byPlayer.get(key);

    player.wars.add(String(row.__warId));

    const rowKills = num(row?.kills);
    const rowDeaths = num(row?.deaths);
    const rowKd = ratio(rowKills, rowDeaths);

    player.kills += rowKills;
    player.deaths += rowDeaths;
    player.kdSum += rowKd;
    player.kdCount += 1;
    const damageAliases = [
      'damageDealt',
      'damage_dealt',
      'damage dealt',
      'damageDone',
      'damage',
    ];
    const ccAliases = [
      'ccHits',
      'cc_hits',
      'cc hits',
      'CC Hits',
      'cc',
      'CC',
    ];

    const rowDamage = readStatMetric(row, damageAliases, 0);
    const rowCcHits = readStatMetric(row, ccAliases, 0);

    player.damage += rowDamage;

    if (hasOwnStatMetric(row, damageAliases)) {
      player.damageAverageSum += rowDamage;
      player.damageAverageCount += 1;
    }

    player.damageTaken += readStatMetric(
      row,
      [
        'damageTaken',
        'damage_taken',
        'damage taken',
        'Damage Taken',
      ],
      0,
    );

    player.ccHits += rowCcHits;

    if (hasOwnStatMetric(row, ccAliases)) {
      player.ccAverageSum += rowCcHits;
      player.ccAverageCount += 1;
    }
    player.fortDamage += readStatMetric(
      row,
      [
        'fortDamage',
        'damageToFort',
        'damage_to_fort',
        'damage to fort',
        'Fort Damage',
      ],
      0,
    );

    const rowKillFeed = readStatMetric(
      row,
      ['killFeed', 'feed'],
      0,
    );

    // Player Highlights uses the best saved Stats Log KillFeed.
    player.killFeed = Math.max(player.killFeed, rowKillFeed);

    // Players Performance Total/Average uses the monthly sum.
    player.killFeedTotal += rowKillFeed;

    // No Combat Log fallback. A streak is shown only when the Stats Log
    // explicitly contains a streak field.
    const streakAliases = [
      'killStreak',
      'killstreak',
      'kill_streak',
      'kill streak',
      'streak',
    ];

    if (hasOwnStatMetric(row, streakAliases)) {
      player.hasKillStreak = true;
      player.killStreak = Math.max(
        player.killStreak,
        readStatMetric(row, streakAliases, 0),
      );
    }
  });

  return [...byPlayer.values()]
    .map((player) => ({
      ...player,
      wars: player.wars.size,
      kd: ratio(player.kills, player.deaths),
      averageKd: player.kdCount
        ? player.kdSum / player.kdCount
        : ratio(player.kills, player.deaths),
      averageDamageDealt: player.damageAverageCount
        ? player.damageAverageSum / player.damageAverageCount
        : 0,
      averageCcHits: player.ccAverageCount
        ? player.ccAverageSum / player.ccAverageCount
        : 0,
    }))
    .sort(
      (a, b) =>
        b.kills - a.kills ||
        b.kd - a.kd ||
        a.name.localeCompare(b.name),
    );
}

function buildSingleGamePlayerHighlights(stats) {
  const sourceRows = Array.isArray(stats?.secondary?.rows)
    ? stats.secondary.rows
    : [];

  const uniqueRows = new Map();

  sourceRows.forEach((row, sourceOrder) => {
    const name = String(row?.player || row?.name || '').trim();

    if (!name) return;

    const warId = String(
      row?.warId ||
        row?.war_id ||
        row?.war ||
        row?.id ||
        row?.date ||
        `stats-war-${sourceOrder}`,
    );

    const key = `${warId}::${name.toLowerCase()}`;
    const current = uniqueRows.get(key);
    const interactions = num(row?.kills) + num(row?.deaths);
    const currentInteractions = current
      ? num(current?.kills) + num(current?.deaths)
      : -1;

    if (
      !current ||
      interactions > currentInteractions ||
      (
        interactions === currentInteractions &&
        sourceOrder < current.__sourceOrder
      )
    ) {
      uniqueRows.set(key, {
        ...row,
        player: name,
        __warId: warId,
        __sourceOrder: sourceOrder,
        __time: chronologyTimestamp(row),
      });
    }
  });

  const statRecords = [...uniqueRows.values()].map((row) => {
    const kills = num(row?.kills);
    const deaths = num(row?.deaths);

    return {
      name: String(row?.player || row?.name || '').trim(),
      warId: String(row.__warId),
      date:
        row?.date ||
        row?.datetime ||
        row?.dateTime ||
        row?.timestamp ||
        row?.time ||
        '',
      firstAppearanceTime: row.__time,
      firstAppearanceOrder: row.__sourceOrder,
      kills,
      deaths,
      kd: ratio(kills, deaths),
      damage: readStatMetric(
        row,
        [
          'damageDealt',
          'damage_dealt',
          'damage dealt',
          'damageDone',
          'damage',
        ],
        0,
      ),
      fortDamage: readStatMetric(
        row,
        [
          'fortDamage',
          'damageToFort',
          'damage_to_fort',
          'damage to fort',
          'Fort Damage',
        ],
        0,
      ),
      killFeed: readStatMetric(
        row,
        ['killFeed', 'feed'],
        0,
      ),
    };
  });

  function bestStatRecord(metricKey, isValid) {
    return (
      statRecords
        .filter((record) =>
          isValid ? isValid(record) : num(record?.[metricKey]) > 0,
        )
        .sort(
          (a, b) =>
            num(b?.[metricKey]) - num(a?.[metricKey]) ||
            chronologicalCompare(a, b),
        )[0] || null
    );
  }

  const combatWars = new Map();

  (stats?.ev || []).forEach((event, sourceOrder) => {
    const warId = String(
      event?.warId ||
        event?.war_id ||
        event?.nodeWarId ||
        event?.war ||
        event?.id ||
        event?.date ||
        `combat-war-${sourceOrder}`,
    );

    if (!combatWars.has(warId)) {
      combatWars.set(warId, {
        events: [],
        date:
          event?.date ||
          event?.datetime ||
          event?.dateTime ||
          event?.timestamp ||
          event?.time ||
          '',
        time: chronologyTimestamp(event),
        order: sourceOrder,
      });
    }

    const war = combatWars.get(warId);
    war.events.push(event);

    const eventTime = chronologyTimestamp(event);

    if (
      eventTime < war.time ||
      (eventTime === war.time && sourceOrder < war.order)
    ) {
      war.time = eventTime;
      war.order = sourceOrder;
      war.date =
        event?.date ||
        event?.datetime ||
        event?.dateTime ||
        event?.timestamp ||
        event?.time ||
        war.date;
    }
  });

  const streakRecords = [];

  combatWars.forEach((war, warId) => {
    const warStreaks = calculateStreaks(war.events);

    Object.entries(warStreaks || {}).forEach(([name, value]) => {
      const cleanName = String(name || '').trim();
      const streak = num(value);

      if (!cleanName || streak <= 0) return;

      streakRecords.push({
        name: cleanName,
        warId,
        date: war.date,
        value: streak,
        firstAppearanceTime: war.time,
        firstAppearanceOrder: war.order,
      });
    });
  });

  const longestStreak =
    streakRecords.sort(
      (a, b) =>
        b.value - a.value ||
        chronologicalCompare(a, b),
    )[0] || null;

  const bestFeedRecord = bestStatRecord(
    'killFeed',
    (record) => record.killFeed > 0,
  );

  return {
    topFragger: bestStatRecord(
      'kills',
      (record) => record.kills > 0,
    ),
    bestKd: bestStatRecord(
      'kd',
      (record) => record.kills > 0,
    ),
    damageLeader: bestStatRecord(
      'damage',
      (record) => record.damage > 0,
    ),
    fortBreaker: bestStatRecord(
      'fortDamage',
      (record) => record.fortDamage > 0,
    ),
    longestStreak,
    bestFeed: bestFeedRecord
      ? {
          ...bestFeedRecord,
          value: bestFeedRecord.killFeed,
        }
      : null,
  };
}

function buildCombatStreakMetrics(stats) {
  const eventsByWar = new Map();

  (stats?.ev || []).forEach((event, index) => {
    const warId = String(
      event?.id ||
        event?.war ||
        event?.date ||
        `combat-war-${index}`,
    );

    if (!eventsByWar.has(warId)) {
      eventsByWar.set(warId, []);
    }

    eventsByWar.get(warId).push(event);
  });

  const byPlayer = new Map();

  eventsByWar.forEach((events) => {
    const warStreaks = calculateStreaks(events);

    Object.entries(warStreaks || {}).forEach(([name, value]) => {
      const key = String(name || '').trim().toLowerCase();
      const streak = num(value);

      if (!key) return;

      if (!byPlayer.has(key)) {
        byPlayer.set(key, {
          total: 0,
          maximum: 0,
        });
      }

      const player = byPlayer.get(key);
      player.total += streak;
      player.maximum = Math.max(player.maximum, streak);
    });
  });

  return byPlayer;
}

function buildMonthlyPerformancePlayers(
  stats,
  statLogPlayers,
  warCounts,
) {
  const primaryByName = new Map(
    (stats?.players || []).map((player) => [
      String(player?.name || '').trim().toLowerCase(),
      player,
    ]),
  );

  const statsLogByName = new Map(
    (statLogPlayers || []).map((player) => [
      String(player?.name || '').trim().toLowerCase(),
      player,
    ]),
  );

  const warsByName = new Map(
    Object.entries(warCounts || {}).map(([name, wars]) => [
      String(name || '').trim().toLowerCase(),
      num(wars),
    ]),
  );

  const streakMetricsByName = buildCombatStreakMetrics(stats);
  const chronologyByName = buildPlayerChronology(stats);

  const playerKeys = new Set([
    ...primaryByName.keys(),
    ...statsLogByName.keys(),
    ...warsByName.keys(),
    ...streakMetricsByName.keys(),
  ]);

  return [...playerKeys]
    .map((key) => {
      const primary = primaryByName.get(key);
      const secondary = statsLogByName.get(key);
      const name =
        secondary?.name ||
        primary?.name ||
        key;

      const kills = secondary
        ? num(secondary.kills)
        : num(primary?.kills);
      const deaths = secondary
        ? num(secondary.deaths)
        : num(primary?.deaths);

      const wars = Math.max(
        num(warsByName.get(key)),
        num(secondary?.wars),
      );
      const streakMetrics = streakMetricsByName.get(key);
      const chronology = chronologyByName.get(key);

      return {
        name,
        wars,
        firstAppearanceTime:
          chronology?.time ?? Number.POSITIVE_INFINITY,
        firstAppearanceOrder:
          chronology?.order ?? Number.POSITIVE_INFINITY,
        kills,
        deaths,
        kd: ratio(kills, deaths),
        averageKd: secondary
          ? num(secondary.averageKd)
          : ratio(kills, deaths),
        averageDamageDealt: secondary
          ? num(secondary.averageDamageDealt)
          : wars > 0
            ? readStatMetric(
                primary,
                [
                  'damageDealt',
                  'damage_dealt',
                  'damage dealt',
                  'damageDone',
                  'damage',
                ],
                0,
              ) / wars
            : 0,
        averageCcHits: secondary
          ? num(secondary.averageCcHits)
          : wars > 0
            ? readStatMetric(
                primary,
                [
                  'ccHits',
                  'cc_hits',
                  'cc hits',
                  'CC Hits',
                  'cc',
                  'CC',
                ],
                0,
              ) / wars
            : 0,
        killStreak: num(streakMetrics?.total),
        longestKillStreak: num(streakMetrics?.maximum),
        killFeed: secondary
          ? num(secondary.killFeedTotal)
          : readStatMetric(
              primary,
              ['killFeed', 'feed'],
              0,
            ),
        bestKillFeed: secondary
          ? num(secondary.killFeed)
          : readStatMetric(
              primary,
              ['killFeed', 'feed'],
              0,
            ),
        damageDealt: secondary
          ? num(secondary.damage)
          : readStatMetric(
              primary,
              [
                'damageDealt',
                'damage_dealt',
                'damage dealt',
                'damageDone',
                'damage',
              ],
              0,
            ),
        damageTaken: secondary
          ? num(secondary.damageTaken)
          : readStatMetric(
              primary,
              [
                'damageTaken',
                'damage_taken',
                'damage taken',
                'Damage Taken',
              ],
              0,
            ),
        ccHits: secondary
          ? num(secondary.ccHits)
          : readStatMetric(
              primary,
              [
                'ccHits',
                'cc_hits',
                'cc hits',
                'CC Hits',
                'cc',
                'CC',
              ],
              0,
            ),
        fortDamage: secondary
          ? num(secondary.fortDamage)
          : readStatMetric(
              primary,
              [
                'fortDamage',
                'damageToFort',
                'damage_to_fort',
                'damage to fort',
                'Fort Damage',
              ],
              0,
            ),
      };
    })
    .filter((player) => String(player.name || '').trim());
}

function buildPlayerWarCounts(stats) {
  const map = new Map();

  function add(name, warId) {
    const cleanName = String(name || '').trim();
    const cleanWar = String(warId || '').trim();

    if (!cleanName || !cleanWar) return;

    if (!map.has(cleanName)) {
      map.set(cleanName, new Set());
    }

    map.get(cleanName).add(cleanWar);
  }

  (stats?.ev || []).forEach((event, index) => {
    add(
      getGuildPlayer(event),
      event?.id || event?.war || event?.date || `event-${index}`,
    );
  });

  (stats?.secondary?.rows || []).forEach((row, index) => {
    add(
      row?.player || row?.name,
      row?.id || row?.war || row?.date || `secondary-${index}`,
    );
  });

  return Object.fromEntries(
    [...map.entries()].map(([name, wars]) => [name, wars.size]),
  );
}

// A guild encounter qualifies only when that exact Node War reaches
// the requested combined kills + deaths threshold.
function getWarGuildBreakdown(log, minimumInteractions = 30) {
  const summary = log?.summary || log?.stats || log?.analytics || {};
  const guilds = Array.isArray(summary?.guilds) ? summary.guilds : [];

  return guilds
    .map((guild) => ({
      name: cleanGuild(guild?.name),
      // Same interpretation used by Overview:
      // our kills are the enemy guild's recorded deaths,
      // our deaths are the enemy guild's recorded kills.
      kills: num(guild?.deaths),
      deaths: num(guild?.kills),
    }))
    .filter(
      (guild) =>
        guild.name &&
        guild.kills + guild.deaths >= minimumInteractions,
    )
    .sort(
      (a, b) =>
        b.kills + b.deaths - (a.kills + a.deaths) ||
        b.kills - a.kills ||
        a.name.localeCompare(b.name),
    );
}

function getFeaturedWarGuild(log, minimumInteractions = 30) {
  return (
    getWarGuildBreakdown(log, minimumInteractions)[0] ||
    null
  );
}

function buildEnemyRows(
  logs,
  stats,
  minimumInteractions = 30,
) {
  const byGuild = {};

  function add(name, kills, deaths, warId) {
    const guildName = cleanGuild(name);

    if (!guildName) return;

    byGuild[guildName] ||= {
      name: guildName,
      kills: 0,
      deaths: 0,
      wars: new Set(),
      warRows: [],
    };

    byGuild[guildName].kills += num(kills);
    byGuild[guildName].deaths += num(deaths);

    if (warId) {
      byGuild[guildName].wars.add(String(warId));
    }
  }

  (logs || []).forEach((log, index) => {
    const summary = log?.summary || {};
    const guilds = Array.isArray(summary?.guilds) ? summary.guilds : [];
    const warId = log?.id || dateOf(log) || `log-${index}`;

    guilds.forEach((guild) => {
      // Same formula and field direction as Overview.
      const ourKills = num(guild?.deaths);
      const ourDeaths = num(guild?.kills);
      const totalInteractions = ourKills + ourDeaths;

      if (totalInteractions < minimumInteractions) return;

      add(guild?.name, ourKills, ourDeaths, warId);
    });
  });

  if (!Object.keys(byGuild).length) {
    (stats?.ev || []).forEach((event, index) => {
      const guild = cleanGuild(event?.guild);
      const warId = event?.id || event?.war || event?.date || `event-${index}`;

      if (event?.type === 'kill') add(guild, 1, 0, warId);
      if (event?.type === 'death') add(guild, 0, 1, warId);
    });
  }

  return Object.values(byGuild)
    .map((guild) => {
      const kills = num(guild.kills);
      const deaths = num(guild.deaths);
      const totalInteractions = kills + deaths;
      const kd = ratio(kills, deaths);

      return {
        name: guild.name,
        wars: guild.wars.size,
        kills,
        deaths,
        totalInteractions,
        kd,
      };
    })
    .filter(
      (guild) =>
        guild.wars > 0 &&
        guild.totalInteractions >= minimumInteractions,
    )
    .sort(
      (a, b) =>
        b.wars - a.wars ||
        b.kills + b.deaths - (a.kills + a.deaths) ||
        a.name.localeCompare(b.name),
    );
}

function percentageChange(current, previous) {
  if (!num(previous)) {
    return num(current) ? null : 0;
  }

  return ((num(current) - num(previous)) / Math.abs(num(previous))) * 100;
}

function comparisonInfo(
  current,
  previous,
  previousPeriodLabel,
  lowerIsBetter = false,
) {
  const change = percentageChange(current, previous);

  if (change == null) {
    return {
      text: `No ${previousPeriodLabel || 'previous period'} baseline`,
      tone: 'neutral',
    };
  }

  if (change === 0) {
    return {
      text: `• 0% vs ${previousPeriodLabel || 'previous period'}`,
      tone: 'neutral',
    };
  }

  const improved = lowerIsBetter ? change < 0 : change > 0;

  return {
    text: `${change > 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(
      0,
    )}% vs ${previousPeriodLabel || 'previous period'} · ${
      improved ? 'better' : 'worse'
    }`,
    tone: improved ? 'positive' : 'negative',
  };
}

function buildRosterPerformancePlayers(activePlayers) {
  const activeByName = new Map(
    (activePlayers || []).map((player) => [
      String(player?.name || '').trim().toLowerCase(),
      player,
    ]),
  );

  return GUILD_ROSTER.map((rosterName, rosterOrder) => {
    const activePlayer = activeByName.get(
      rosterName.toLowerCase(),
    );

    if (activePlayer) {
      const wars = num(activePlayer.wars);

      return {
        ...activePlayer,
        name: rosterName,
        wars,
        rosterOrder,
        inactive: wars <= 0,
      };
    }

    return {
      name: rosterName,
      wars: 0,
      rosterOrder,
      firstAppearanceTime: Number.POSITIVE_INFINITY,
      firstAppearanceOrder: Number.POSITIVE_INFINITY,
      kills: 0,
      deaths: 0,
      kd: 0,
      averageKd: 0,
      averageDamageDealt: 0,
      averageCcHits: 0,
      killStreak: 0,
      longestKillStreak: 0,
      killFeed: 0,
      bestKillFeed: 0,
      damageDealt: 0,
      damageTaken: 0,
      ccHits: 0,
      fortDamage: 0,
      inactive: true,
    };
  }).sort((a, b) => {
    if (a.inactive !== b.inactive) {
      return a.inactive ? 1 : -1;
    }

    if (!a.inactive) {
      return (
        b.kills - a.kills ||
        b.kd - a.kd ||
        b.damageDealt - a.damageDealt ||
        chronologicalCompare(a, b)
      );
    }

    return chronologicalCompare(a, b);
  });
}

function buildReview(
  logs,
  selectedMonth,
  daysAgo = DEFAULT_RECAP_DAYS_AGO,
) {
  const selectedWindow = monthDateWindow(
    selectedMonth,
    daysAgo,
  );
  const previousCalendarMonth =
    previousMonthId(selectedMonth);
  const previousWindow =
    num(daysAgo) > 0
      ? previousDateWindow(selectedWindow)
      : monthDateWindow(previousCalendarMonth, 0);
  const previousPeriodLabel =
    num(daysAgo) > 0
      ? `previous ${selectedWindow.days} days`
      : shortMonthLabel(previousCalendarMonth);

  const monthLogs = (logs || [])
    .filter((log) =>
      dateIsInWindow(
        dateOf(log),
        selectedWindow,
      ),
    )
    .map((log) => ({
      ...log,
      date: dateOf(log),
    }));

  const previousLogs = (logs || [])
    .filter((log) =>
      dateIsInWindow(
        dateOf(log),
        previousWindow,
      ),
    )
    .map((log) => ({
      ...log,
      date: dateOf(log),
    }));

  const rows = monthLogs.map(buildNodeWarRow);
  const previousRows = previousLogs.map(buildNodeWarRow);

  const sourceLogById = new Map(
    monthLogs.map((log) => [String(log?.id || ''), log]),
  );

  const sourceLogByDate = new Map();

  monthLogs.forEach((log) => {
    const date = String(dateOf(log) || '');

    if (date && !sourceLogByDate.has(date)) {
      sourceLogByDate.set(date, log);
    }
  });

  function sourceLogForRow(row) {
    return (
      sourceLogById.get(String(row?.id || '')) ||
      sourceLogByDate.get(String(row?.date || '')) ||
      null
    );
  }

  function featuredGuildForRow(row) {
    return getFeaturedWarGuild(sourceLogForRow(row));
  }

  const stats = calculateStats(monthLogs);
  const warCounts = buildPlayerWarCounts(stats);

  const totals = {
    wars: rows.length,
    kills: rows.reduce((sum, row) => sum + num(row.kills), 0),
    deaths: rows.reduce((sum, row) => sum + num(row.deaths), 0),
    damage: rows.reduce((sum, row) => sum + num(row.damageDealt), 0),
    fortDamage: rows.reduce((sum, row) => sum + num(row.fortDamage), 0),
  };

  totals.kd = ratio(totals.kills, totals.deaths);
  totals.avgKills = totals.wars ? totals.kills / totals.wars : 0;
  totals.avgDeaths = totals.wars ? totals.deaths / totals.wars : 0;
  totals.avgDamage = totals.wars ? totals.damage / totals.wars : 0;
  totals.avgFortDamage = totals.wars
    ? totals.fortDamage / totals.wars
    : 0;
  totals.avgWarKd = rows.length
    ? rows.reduce(
        (sum, row) =>
          sum + num(row.kdNumber ?? row.kd),
        0,
      ) / rows.length
    : 0;

  totals.avgWarsPerWeek = selectedWindow.days
    ? totals.wars / (selectedWindow.days / 7)
    : 0;

  const previousTotals = {
    wars: previousRows.length,
    kills: previousRows.reduce((sum, row) => sum + num(row.kills), 0),
    deaths: previousRows.reduce((sum, row) => sum + num(row.deaths), 0),
    damage: previousRows.reduce((sum, row) => sum + num(row.damageDealt), 0),
    fortDamage: previousRows.reduce(
      (sum, row) => sum + num(row.fortDamage),
      0,
    ),
  };

  previousTotals.kd = ratio(
    previousTotals.kills,
    previousTotals.deaths,
  );

  const statLogPlayers = buildStatsLogPlayers(stats);
  const activePlayers = buildMonthlyPerformancePlayers(
    stats,
    statLogPlayers,
    warCounts,
  );
  const players = buildRosterPerformancePlayers(activePlayers);
  const {
    topFragger,
    bestKd,
    damageLeader,
    fortBreaker,
    longestStreak,
    bestFeed,
  } = buildSingleGamePlayerHighlights(stats);

  const enemies = buildEnemyRows(monthLogs, stats, 30);

  const highlightEnemies = buildEnemyRows(
    monthLogs,
    stats,
    50,
  ).map((enemy) => {
    const matchingRows = rows
      .filter((row) =>
        getWarGuildBreakdown(
          sourceLogForRow(row),
          50,
        ).some((guild) => guild.name === enemy.name),
      )
      .sort(
        (a, b) =>
          String(b.date || '').localeCompare(String(a.date || '')),
      );

    return {
      ...enemy,
      warRows: matchingRows,
    };
  });

  const mostFought = highlightEnemies[0] || null;

  // Inverted by request:
  // Best Matchup uses the lowest K/D result.
  // Toughest Opponent uses the highest K/D result.
  const bestMatchup =
    [...highlightEnemies]
      .filter((enemy) => enemy.kills + enemy.deaths > 0)
      .sort(
        (a, b) =>
          a.kd - b.kd ||
          b.wars - a.wars ||
          b.deaths - a.deaths,
      )[0] || null;

  const toughestMatchup =
    [...highlightEnemies]
      .filter((enemy) => enemy.kills + enemy.deaths > 0)
      .sort(
        (a, b) =>
          b.kd - a.kd ||
          b.wars - a.wars ||
          b.kills - a.kills,
      )[0] || null;

  const highestKillsWar =
    [...rows].sort(
      (a, b) =>
        num(b.kills) - num(a.kills) ||
        String(b.date).localeCompare(String(a.date)),
    )[0] || null;

  const bestKdWar =
    [...rows].sort(
      (a, b) =>
        num(b.kdNumber ?? b.kd) - num(a.kdNumber ?? a.kd) ||
        num(b.kills) - num(a.kills),
    )[0] || null;

  const highestDamageWar =
    [...rows]
      .filter((row) => num(row.damageDealt) > 0)
      .sort(
        (a, b) =>
          num(b.damageDealt) - num(a.damageDealt),
      )[0] || null;

  return {
    previousMonth: previousPeriodLabel,
    totals,
    previousTotals,
    players,
    topFragger,
    bestKd,
    damageLeader,
    fortBreaker,
    longestStreak,
    bestFeed,
    enemies,
    mostFought,
    bestMatchup,
    toughestMatchup,
    featuredWars: [
      highestKillsWar && {
        id: 'kills',
        label: 'Highest Kill Total',
        value: `${compact(highestKillsWar.kills)} Kills`,
        date: highestKillsWar.date,
        guild: featuredGuildForRow(highestKillsWar),
        row: highestKillsWar,
        accent: 'blue',
      },
      bestKdWar && {
        id: 'kd',
        label: 'Best K/D War',
        value: `${num(bestKdWar.kdNumber ?? bestKdWar.kd).toFixed(
          2,
        )} K/D`,
        date: bestKdWar.date,
        guild: featuredGuildForRow(bestKdWar),
        row: bestKdWar,
        accent: 'violet',
      },
      highestDamageWar && {
        id: 'damage',
        label: 'Highest Damage War',
        value: compact(highestDamageWar.damageDealt),
        date: highestDamageWar.date,
        guild: featuredGuildForRow(highestDamageWar),
        row: highestDamageWar,
        accent: 'cyan',
      },
    ].filter(Boolean),
  };
}

function SectionShell({ icon: Icon, title, children }) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-[#13243a] bg-[#020813] shadow-[0_14px_40px_rgba(0,0,0,.32)]">
      <div className="flex h-8 items-center gap-2 border-b border-[#13243a] bg-[#06111f] px-3">
        <Icon size={14} className="text-[#5fa8ff]" />
        <h2 className="text-[12px] font-black uppercase tracking-[0.08em] text-[#d8e5f7]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  averageLabel,
  averageValue,
  comparison,
  accent,
}) {
  const theme = {
    blue: {
      icon: 'text-[#4ea1ff]',
      shadow: 'shadow-[inset_0_0_32px_rgba(59,130,246,.08)]',
    },
    violet: {
      icon: 'text-[#a66cff]',
      shadow: 'shadow-[inset_0_0_32px_rgba(139,92,246,.08)]',
    },
    rose: {
      icon: 'text-[#ff657a]',
      shadow: 'shadow-[inset_0_0_32px_rgba(244,63,94,.08)]',
    },
    cyan: {
      icon: 'text-[#37d9ff]',
      shadow: 'shadow-[inset_0_0_32px_rgba(34,211,238,.08)]',
    },
    green: {
      icon: 'text-[#74ff37]',
      shadow: 'shadow-[inset_0_0_32px_rgba(132,204,22,.08)]',
    },
    amber: {
      icon: 'text-[#ffc54d]',
      shadow: 'shadow-[inset_0_0_32px_rgba(245,158,11,.08)]',
    },
  }[accent];

  return (
    <div
      className={`min-h-[86px] rounded-[10px] border border-[#13243a] bg-gradient-to-br from-[#071322] to-[#020813] p-3 ${theme.shadow}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-white/[.04] bg-black/20 ${theme.icon}`}
        >
          <Icon size={28} strokeWidth={2.1} />
        </div>

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#8090a8]">
            {label}
          </p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-[26px] font-black leading-none text-white">
              {value}
            </p>
            {averageLabel && (
              <div className="mb-0.5 border-l border-white/10 pl-2">
                <p className="text-[8px] font-black uppercase tracking-[0.08em] text-[#6f7d90]">
                  {averageLabel}
                </p>
                <p className="text-[12px] font-black leading-none text-[#c8d6e8]">
                  {averageValue}
                </p>
              </div>
            )}
          </div>

          <p
            className={`mt-2 truncate text-[10px] font-black ${
              comparison?.tone === 'positive'
                ? 'text-[#75e34f]'
                : comparison?.tone === 'negative'
                  ? 'text-[#ff6077]'
                  : 'text-[#7f8da2]'
            }`}
          >
            {comparison?.text}
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchupCard({
  icon: Icon,
  label,
  name,
  wars,
  value,
  accent,
  onClick,
  openLabel,
}) {
  const classes = {
    violet:
      'border-violet-500/40 bg-gradient-to-r from-violet-950/55 to-[#020813] text-violet-300',
    cyan:
      'border-cyan-500/40 bg-gradient-to-r from-cyan-950/45 to-[#020813] text-cyan-300',
    rose:
      'border-rose-500/40 bg-gradient-to-r from-rose-950/45 to-[#020813] text-rose-300',
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group flex min-h-[86px] w-full items-center gap-3 rounded-[10px] border p-3 text-left transition ${
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:brightness-110'
          : 'cursor-default'
      } ${classes}`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-current/30 bg-black/25">
        <Icon size={30} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.1em]">
          {label}
        </p>

        <div className="mt-1 flex min-w-0 items-center gap-2">
          <p className="truncate text-[14px] font-black text-white">
            {name || '-'}
          </p>

          {wars > 0 && (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black text-slate-300">
              {wars} war{wars === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <p className="mt-1 text-[10px] font-black text-slate-400">
          {value || 'No data'}
        </p>

        {onClick && (
          <p className="mt-1 flex items-center gap-1 text-[9px] font-black text-slate-500 group-hover:text-white">
            {openLabel || 'Open node wars'}
            <ChevronRight size={11} />
          </p>
        )}
      </div>
    </button>
  );
}

function PlayerHighlight({ icon: Icon, label, name, value, unit, accent }) {
  const classes = {
    blue: 'border-blue-500/30 text-blue-300',
    violet: 'border-violet-500/30 text-violet-300',
    cyan: 'border-cyan-500/30 text-cyan-300',
    green: 'border-emerald-500/30 text-emerald-300',
    amber: 'border-amber-500/30 text-amber-300',
    pink: 'border-fuchsia-500/30 text-fuchsia-300',
  }[accent];

  return (
    <div className={`min-h-[96px] rounded-[10px] border bg-gradient-to-br from-[#071322] to-[#020813] p-3 ${classes}`}>
      <div className="flex h-full items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[12px] border border-current/25 bg-black/25">
          <Icon size={34} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.08em]">
            {label}
          </p>
          <p className="mt-1 truncate text-[13px] font-black text-white">
            {name || '-'}
          </p>
          <p className="mt-1 text-[21px] font-black leading-none text-white">
            {value || '-'}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[#8c9bb0]">
            {unit}
          </p>
        </div>
      </div>
    </div>
  );
}

function FeaturedWar({ item, onOpen }) {
  const accent = {
    blue: 'border-blue-500/55 from-blue-950/90 via-[#07162b]',
    violet: 'border-violet-500/55 from-violet-950/90 via-[#1a0d31]',
    cyan: 'border-cyan-500/55 from-cyan-950/85 via-[#06242c]',
  }[item.accent];

  return (
    <button
      type="button"
      onClick={() => onOpen(item.row)}
      className={`group relative min-h-[108px] overflow-hidden rounded-[10px] border bg-gradient-to-r ${accent} to-[#020813] p-4 text-left transition hover:-translate-y-0.5 hover:brightness-110`}
    >
      <div className="absolute inset-y-0 right-0 w-[58%] opacity-75">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_45%,rgba(255,255,255,.14),transparent_30%)]" />
        <div className="absolute bottom-0 right-0 h-20 w-full bg-[linear-gradient(150deg,transparent_0%,transparent_32%,rgba(255,255,255,.06)_32%,rgba(255,255,255,.06)_36%,transparent_36%,transparent_48%,rgba(255,255,255,.05)_48%,rgba(255,255,255,.05)_52%,transparent_52%)]" />
      </div>

      <div className="relative z-10 flex h-full items-center gap-4">
        <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-[8px] border border-current/40 bg-black/30 text-current">
          <Shield size={30} />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-current">
            {item.label}
          </p>
          <p className="mt-2 text-[25px] font-black leading-none text-white">
            {item.value}
          </p>
          <p className="mt-2 text-[11px] font-black text-[#dbe8f8]">
            {formatDate(item.date)}
          </p>

          <p className="mt-1 truncate text-[11px] font-bold text-[#9fb0c6]">
            vs {item.guild?.name || 'Enemy guild unavailable'}
          </p>

          <p className="mt-1 text-[10px] font-black text-[#6f7d90]">
            {item.guild
              ? `${compact(item.guild.kills)} kills · ${compact(
                  item.guild.deaths,
                )} deaths against this guild`
              : `${compact(item.row?.kills)} total kills · ${compact(
                  item.row?.deaths,
                )} total deaths`}
          </p>
        </div>
      </div>
    </button>
  );
}

function BarCell({ value, max, color }) {
  const width = value > 0 ? Math.max(3, (value / Math.max(1, max)) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="w-[48px] text-right text-[11px] font-black text-[#d8e5f7]">
        {compact(value)}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0b1728]">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className = '',
  toneClass = 'text-[#7f8da2]',
  rainbow = false,
}) {
  const active = sort.key === sortKey;
  const arrow = active
    ? sort.direction === 'asc'
      ? '↑'
      : '↓'
    : '↕';

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 text-left transition hover:brightness-125 ${
        active ? 'brightness-125' : ''
      } ${
        rainbow
          ? 'bg-clip-text text-transparent'
          : toneClass
      } ${className}`}
      style={
        rainbow
          ? {
              backgroundImage:
                'linear-gradient(90deg, #fb7185, #facc15, #4ade80, #38bdf8, #a78bfa)',
            }
          : undefined
      }
    >
      <span>{label}</span>
      <span className="text-[10px]">{arrow}</span>
    </button>
  );
}

const DEFAULT_OVERALL_WEIGHTS = Object.freeze({
  kills: 0,
  deaths: 0,
  kd: 10,
  killStreak: 0,
  killFeed: 0,
  damageDealt: 40,
  damageTaken: 0,
  ccHits: 20,
  fortDamage: 30,
});

const OVERALL_WEIGHT_CONTROLS = Object.freeze([
  {
    key: 'kills',
    label: 'Kills',
    tone: 'text-blue-400',
    accent: '#60a5fa',
  },
  {
    key: 'deaths',
    label: 'Deaths ↓',
    tone: 'text-rose-400',
    accent: '#fb7185',
  },
  {
    key: 'kd',
    label: 'K/D',
    tone: 'text-emerald-400',
    accent: '#34d399',
  },
  {
    key: 'killStreak',
    label: 'Killstreak',
    tone: 'text-slate-200',
    accent: '#e2e8f0',
  },
  {
    key: 'killFeed',
    label: 'KillFeed',
    tone: 'text-orange-400',
    accent: '#fb923c',
  },
  {
    key: 'damageDealt',
    label: 'DMG Dealt',
    tone: 'text-cyan-400',
    accent: '#22d3ee',
  },
  {
    key: 'damageTaken',
    label: 'DMG Taken ↓',
    tone: 'text-pink-400',
    accent: '#f472b6',
  },
  {
    key: 'ccHits',
    label: 'CC Hits',
    tone: 'text-violet-400',
    accent: '#a78bfa',
  },
  {
    key: 'fortDamage',
    label: 'DMG to Fort',
    tone: 'text-amber-400',
    accent: '#fbbf24',
  },
]);

function percentileScore(
  player,
  entries,
  lowerIsBetter = false,
) {
  const ranked = [...(entries || [])].sort((a, b) => {
    const aValue = num(a?.value);
    const bValue = num(b?.value);
    const valueDifference = lowerIsBetter
      ? aValue - bValue
      : bValue - aValue;

    return (
      valueDifference ||
      chronologicalCompare(a?.player, b?.player)
    );
  });

  if (!ranked.length) return 50;
  if (ranked.length === 1) return 100;

  const index = ranked.findIndex(
    (entry) => entry?.player === player,
  );

  if (index < 0) return 50;

  return (
    ((ranked.length - 1 - index) /
      (ranked.length - 1)) *
    100
  );
}

function weightedImpactPart(parts) {
  const totalWeight = parts.reduce(
    (sum, part) => sum + num(part.weight),
    0,
  );

  if (!totalWeight) return 0;

  return (
    parts.reduce(
      (sum, part) =>
        sum + num(part.score) * num(part.weight),
      0,
    ) / totalWeight
  );
}

function overallMetricValue(player, key, viewMode) {
  const wars = Math.max(1, num(player?.wars));

  if (viewMode === 'average') {
    switch (key) {
      case 'kills':
        return num(player?.kills) / wars;
      case 'deaths':
        return num(player?.deaths) / wars;
      case 'kd':
        return num(player?.averageKd);
      case 'killStreak':
        return num(player?.killStreak) / wars;
      case 'killFeed':
        return num(player?.killFeed) / wars;
      case 'damageDealt':
        return num(player?.averageDamageDealt);
      case 'damageTaken':
        return num(player?.damageTaken) / wars;
      case 'ccHits':
        return num(player?.averageCcHits);
      case 'fortDamage':
        return num(player?.fortDamage) / wars;
      default:
        return 0;
    }
  }

  switch (key) {
    case 'kills':
      return num(player?.kills);
    case 'deaths':
      return num(player?.deaths);
    case 'kd':
      return num(player?.kd);
    case 'killStreak':
      return num(player?.longestKillStreak);
    case 'killFeed':
      return num(player?.bestKillFeed);
    case 'damageDealt':
      return num(player?.damageDealt);
    case 'damageTaken':
      return num(player?.damageTaken);
    case 'ccHits':
      return num(player?.ccHits);
    case 'fortDamage':
      return num(player?.fortDamage);
    default:
      return 0;
  }
}

function addImpactScores(
  players,
  weights,
  viewMode,
) {
  const activePlayers = (players || []).filter(
    (player) => !player.inactive && num(player.wars) > 0,
  );

  if (!activePlayers.length) {
    return (players || []).map((player) => ({
      ...player,
      impact: 0,
    }));
  }

  const activeControls = OVERALL_WEIGHT_CONTROLS.filter(
    ({ key }) => num(weights?.[key]) > 0,
  );

  const totalWeight = activeControls.reduce(
    (sum, { key }) => sum + num(weights?.[key]),
    0,
  );

  if (!totalWeight) {
    return (players || []).map((player) => ({
      ...player,
      impact: 0,
    }));
  }

  const metricEntries = Object.fromEntries(
    activeControls.map(({ key }) => [
      key,
      activePlayers.map((player) => ({
        player,
        value: overallMetricValue(
          player,
          key,
          viewMode,
        ),
      })),
    ]),
  );

  return (players || []).map((player) => {
    if (player.inactive || num(player.wars) <= 0) {
      return {
        ...player,
        impact: 0,
      };
    }

    const parts = activeControls.map(({ key }) => ({
      score: percentileScore(
        player,
        metricEntries[key],
        key === 'deaths' || key === 'damageTaken',
      ),
      weight: num(weights?.[key]),
    }));

    const impact = weightedImpactPart(parts);

    return {
      ...player,
      impact: Math.round(
        Math.max(0, Math.min(100, impact)) * 10,
      ) / 10,
    };
  });
}

function performanceValue(player, key, viewMode) {
  if (viewMode !== 'average') {
    if (key === 'killStreak') {
      return num(player?.longestKillStreak);
    }

    if (key === 'killFeed') {
      return num(player?.bestKillFeed);
    }

    return num(player?.[key]);
  }

  if (key === 'wars' || key === 'impact') {
    return num(player?.[key]);
  }

  if (key === 'kd') {
    return num(player?.averageKd);
  }

  const wars = num(player?.wars);
  return wars > 0 ? num(player?.[key]) / wars : 0;
}

function formatPerformanceValue(key, value, viewMode) {
  if (key === 'kd') {
    return num(value).toFixed(2);
  }

  if (key === 'impact') {
    return num(value).toFixed(1);
  }

  if (viewMode === 'average' && key !== 'wars') {
    if (
      ['damageDealt', 'damageTaken', 'fortDamage'].includes(key)
    ) {
      return compact(value);
    }

    return num(value).toFixed(1);
  }

  return compact(value);
}

const performanceColumnThemes = {
  kills: {
    text: 'text-blue-400',
    bar: 'bg-blue-400',
  },
  deaths: {
    text: 'text-rose-400',
    bar: 'bg-rose-400',
  },
  kdPositive: {
    text: 'text-emerald-400',
    bar: 'bg-emerald-400',
  },
  kdNegative: {
    text: 'text-red-400',
    bar: 'bg-red-400',
  },
  impact: {
    text: '',
    bar: '',
  },
  killStreak: {
    text: 'text-slate-200',
    bar: 'bg-slate-200',
  },
  killFeed: {
    text: 'text-orange-400',
    bar: 'bg-orange-400',
  },
  damageDealt: {
    text: 'text-cyan-400',
    bar: 'bg-cyan-400',
  },
  damageTaken: {
    text: 'text-pink-400',
    bar: 'bg-pink-400',
  },
  ccHits: {
    text: 'text-violet-400',
    bar: 'bg-violet-400',
  },
  fortDamage: {
    text: 'text-amber-400',
    bar: 'bg-amber-400',
  },
};

function PerformanceMetricCell({
  player,
  metricKey,
  max,
  viewMode,
}) {
  if (player.inactive) {
    return (
      <span className="text-center font-black text-slate-700">
        —
      </span>
    );
  }

  const value = performanceValue(player, metricKey, viewMode);
  const width =
    value <= 0
      ? 0
      : Math.max(
          3,
          Math.min(
            100,
            Math.round((value / Math.max(1, max)) * 100),
          ),
        );

  const isImpact = metricKey === 'impact';
  const theme =
    metricKey === 'kd'
      ? value >= 1
        ? performanceColumnThemes.kdPositive
        : performanceColumnThemes.kdNegative
      : performanceColumnThemes[metricKey] || {
          text: 'text-slate-300',
          bar: 'bg-slate-300',
        };

  const rainbowGradient =
    'linear-gradient(90deg, #fb7185, #facc15, #4ade80, #38bdf8, #a78bfa)';

  return (
    <div className="mx-auto flex w-full min-w-0 flex-col items-center">
      <span
        className={`whitespace-nowrap text-center text-[11px] font-black leading-none ${
          isImpact
            ? 'bg-clip-text text-transparent'
            : theme.text
        }`}
        style={
          isImpact
            ? { backgroundImage: rainbowGradient }
            : undefined
        }
      >
        {formatPerformanceValue(metricKey, value, viewMode)}
      </span>

      <span className="mt-1 block h-[2px] w-[64%] overflow-visible rounded-full bg-slate-800/55">
        <span
          className={`relative block h-full rounded-full ${
            isImpact ? '' : theme.bar
          }`}
          style={{
            width: `${width}%`,
            backgroundImage: isImpact
              ? rainbowGradient
              : undefined,
            boxShadow: isImpact
              ? '0 0 8px rgba(56,189,248,0.4)'
              : '0 0 7px currentColor',
          }}
        >
          {width > 0 && (
            <span
              className={`absolute right-0 top-1/2 h-[4px] w-[4px] -translate-y-1/2 rounded-full ${
                isImpact ? 'bg-violet-300' : theme.bar
              } shadow-[0_0_6px_currentColor]`}
            />
          )}
        </span>
      </span>
    </div>
  );
}

function PlayersTable({ players }) {
  const [viewMode, setViewMode] = useState('total');
  const [overallWeights, setOverallWeights] = useState(
    () => ({ ...DEFAULT_OVERALL_WEIGHTS }),
  );
  const [sort, setSort] = useState({
    key: 'impact',
    direction: 'desc',
  });

  const playersWithImpact = useMemo(
    () =>
      addImpactScores(
        players || [],
        overallWeights,
        viewMode,
      ),
    [players, overallWeights, viewMode],
  );

  const rows = useMemo(() => {
    const sorted = [...playersWithImpact];

    sorted.sort((a, b) => {
      if (a.inactive !== b.inactive) {
        return a.inactive ? 1 : -1;
      }

      if (a.inactive && b.inactive) {
        return a.name.localeCompare(b.name);
      }

      if (sort.key === 'name') {
        const result = a.name.localeCompare(b.name);
        return sort.direction === 'asc' ? result : -result;
      }

      const aValue = performanceValue(a, sort.key, viewMode);
      const bValue = performanceValue(b, sort.key, viewMode);
      const result = aValue - bValue;

      if (result !== 0) {
        return sort.direction === 'asc' ? result : -result;
      }

      return chronologicalCompare(a, b);
    });

    return sorted;
  }, [playersWithImpact, sort, viewMode]);

  const activeRows = rows.filter((player) => !player.inactive);

  const metricMaximums = useMemo(() => {
    const metricKeys = [
      'kills',
      'deaths',
      'kd',
      'impact',
      'killStreak',
      'killFeed',
      'damageDealt',
      'damageTaken',
      'ccHits',
      'fortDamage',
    ];

    return Object.fromEntries(
      metricKeys.map((key) => [
        key,
        key === 'impact'
          ? 100
          : Math.max(
              1,
              ...activeRows.map((player) =>
                performanceValue(player, key, viewMode),
              ),
            ),
      ]),
    );
  }, [activeRows, viewMode]);

  const overallWeightTotal = OVERALL_WEIGHT_CONTROLS.reduce(
    (sum, { key }) => sum + num(overallWeights[key]),
    0,
  );

  function handleOverallWeight(key, value) {
    setOverallWeights((current) => ({
      ...current,
      [key]: Math.max(0, Math.min(100, num(value))),
    }));
    setSort({
      key: 'impact',
      direction: 'desc',
    });
  }

  function resetOverallWeights() {
    setOverallWeights({ ...DEFAULT_OVERALL_WEIGHTS });
    setSort({
      key: 'impact',
      direction: 'desc',
    });
  }

  function handleViewMode(mode) {
    setViewMode(mode);
    setSort({
      key: 'impact',
      direction: 'desc',
    });
  }

  function handleSort(key) {
    setSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction:
            current.direction === 'desc' ? 'asc' : 'desc',
        };
      }

      return {
        key,
        direction: key === 'name' ? 'asc' : 'desc',
      };
    });
  }

  if (!rows.length) {
    return <p className="p-5 text-sm text-slate-500">No player data.</p>;
  }

  const gridColumns =
    'grid-cols-[28px_minmax(170px,1.45fr)_minmax(92px,.72fr)_minmax(48px,.42fr)_minmax(72px,.58fr)_minmax(72px,.58fr)_minmax(62px,.5fr)_minmax(82px,.66fr)_minmax(80px,.64fr)_minmax(98px,.82fr)_minmax(98px,.82fr)_minmax(74px,.6fr)_minmax(100px,.84fr)]';

  return (
    <>
      <div className="border-b border-[#13243a] bg-[#05101d] px-3 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.09em] text-white">
                Overall Formula
              </p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black text-slate-400">
                Live
              </span>
            </div>
            <p className="mt-1 text-[9px] font-bold text-slate-500">
              Only slider weights affect Overall · Total and Average rank independently · Deaths and DMG Taken reward lower values
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-md border border-[#263c59] bg-[#071422] px-2.5 py-1.5 text-[9px] font-black text-slate-400">
              Weight pool:{' '}
              <span className="text-white">
                {overallWeightTotal}
              </span>
            </div>

            <button
              type="button"
              onClick={resetOverallWeights}
              className="rounded-md border border-[#263c59] bg-[#071422] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.06em] text-slate-400 transition hover:border-[#4ea1ff] hover:text-white"
            >
              Reset
            </button>

            <div className="flex items-center rounded-lg border border-[#263c59] bg-[#071422] p-1">
              {[
                ['total', 'Total'],
                ['average', 'Average'],
              ].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleViewMode(mode)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] transition ${
                    viewMode === mode
                      ? 'bg-[#315dff] text-white shadow-[0_4px_14px_rgba(49,93,255,.25)]'
                      : 'text-[#7f8da2] hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {OVERALL_WEIGHT_CONTROLS.map(
            ({ key, label, tone, accent }) => {
              const rawWeight = num(overallWeights[key]);
              const effectiveWeight =
                overallWeightTotal > 0
                  ? (rawWeight / overallWeightTotal) * 100
                  : 0;

              return (
                <label
                  key={key}
                  className="grid grid-cols-[96px_minmax(0,1fr)_58px] items-center gap-2"
                >
                  <span
                    className={`truncate text-[9px] font-black uppercase tracking-[0.045em] ${tone}`}
                  >
                    {label}
                  </span>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={rawWeight}
                    onChange={(event) =>
                      handleOverallWeight(
                        key,
                        event.target.value,
                      )
                    }
                    className="h-1.5 w-full cursor-pointer transition-all duration-75 ease-linear"
                    style={{ accentColor: accent }}
                  />

                  <span className="text-right text-[9px] font-black tabular-nums text-slate-300">
                    {effectiveWeight.toFixed(1)}%
                  </span>
                </label>
              );
            },
          )}
        </div>
      </div>

      <div className={`max-h-[720px] overflow-y-auto overflow-x-hidden ${scrollCls}`}>
        <div className="w-full min-w-0">
          <div
            className={`sticky top-0 z-10 grid ${gridColumns} items-center gap-1 border-b border-[#13243a] bg-[#071422] px-2 py-2 text-[9px] font-black uppercase tracking-[0.045em]`}
          >
            <span className="text-[#7f8da2]">#</span>

            <SortHeader
              label="Player"
              sortKey="name"
              sort={sort}
              onSort={handleSort}
              className="pr-3"
            />
            <SortHeader
              label="Overall"
              sortKey="impact"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              rainbow
            />
            <SortHeader
              label="Wars"
              sortKey="wars"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
            />
            <SortHeader
              label="Kills"
              sortKey="kills"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              toneClass="text-blue-400"
            />
            <SortHeader
              label="Deaths"
              sortKey="deaths"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              toneClass="text-rose-400"
            />
            <SortHeader
              label="K/D"
              sortKey="kd"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              toneClass="text-emerald-400"
            />
            <SortHeader
              label="Killstreak"
              sortKey="killStreak"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              toneClass="text-slate-200"
            />
            <SortHeader
              label="KillFeed"
              sortKey="killFeed"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              toneClass="text-orange-400"
            />
            <SortHeader
              label="DMG Dealt"
              sortKey="damageDealt"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              toneClass="text-cyan-400"
            />
            <SortHeader
              label="DMG Taken"
              sortKey="damageTaken"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              toneClass="text-pink-400"
            />
            <SortHeader
              label="CC Hits"
              sortKey="ccHits"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              toneClass="text-violet-400"
            />
            <SortHeader
              label="DMG to Fort"
              sortKey="fortDamage"
              sort={sort}
              onSort={handleSort}
              className="justify-center"
              toneClass="text-amber-400"
            />
          </div>

          <div className="divide-y divide-[#102038]">
            {rows.map((player, index) => {
              const inactive = player.inactive;

              return (
                <div
                  key={player.name}
                  className={`grid ${gridColumns} items-center gap-1 px-2 py-2 text-[12px] transition hover:bg-white/[.02] ${
                    inactive ? 'bg-[#030914]/55' : ''
                  }`}
                >
                  <span
                    className={`font-black ${
                      inactive
                        ? 'text-[#405067]'
                        : 'text-[#64748b]'
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div className="flex min-w-0 items-center gap-1.5 pr-3">
                    <span
                      className={`truncate font-black ${
                        inactive ? 'text-slate-500' : 'text-white'
                      }`}
                    >
                      {player.name}
                    </span>

                    {inactive && (
                      <span className="shrink-0 rounded-full border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.04em] text-rose-400">
                        Inactive
                      </span>
                    )}
                  </div>

                  <PerformanceMetricCell
                    player={player}
                    metricKey="impact"
                    max={100}
                    viewMode={viewMode}
                  />

                  <span
                    className={`text-center font-black ${
                      inactive
                        ? 'text-slate-700'
                        : 'text-[#d8e5f7]'
                    }`}
                  >
                    {inactive ? '—' : player.wars}
                  </span>

                  <PerformanceMetricCell
                    player={player}
                    metricKey="kills"
                    max={metricMaximums.kills}
                    viewMode={viewMode}
                  />
                  <PerformanceMetricCell
                    player={player}
                    metricKey="deaths"
                    max={metricMaximums.deaths}
                    viewMode={viewMode}
                  />
                  <PerformanceMetricCell
                    player={player}
                    metricKey="kd"
                    max={metricMaximums.kd}
                    viewMode={viewMode}
                  />
                  <PerformanceMetricCell
                    player={player}
                    metricKey="killStreak"
                    max={metricMaximums.killStreak}
                    viewMode={viewMode}
                  />
                  <PerformanceMetricCell
                    player={player}
                    metricKey="killFeed"
                    max={metricMaximums.killFeed}
                    viewMode={viewMode}
                  />
                  <PerformanceMetricCell
                    player={player}
                    metricKey="damageDealt"
                    max={metricMaximums.damageDealt}
                    viewMode={viewMode}
                  />
                  <PerformanceMetricCell
                    player={player}
                    metricKey="damageTaken"
                    max={metricMaximums.damageTaken}
                    viewMode={viewMode}
                  />
                  <PerformanceMetricCell
                    player={player}
                    metricKey="ccHits"
                    max={metricMaximums.ccHits}
                    viewMode={viewMode}
                  />
                  <PerformanceMetricCell
                    player={player}
                    metricKey="fortDamage"
                    max={metricMaximums.fortDamage}
                    viewMode={viewMode}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function EnemyGuildReport({ enemies }) {
  const [sortBy, setSortBy] = useState('wars');

  const rows = useMemo(() => {
    const sorted = [...enemies];

    sorted.sort((a, b) => {
      if (sortBy === 'kd') {
        return (
          b.kd - a.kd ||
          b.wars - a.wars ||
          b.kills - a.kills ||
          a.name.localeCompare(b.name)
        );
      }

      if (sortBy === 'kills') {
        return (
          b.kills - a.kills ||
          b.wars - a.wars ||
          b.kd - a.kd ||
          a.name.localeCompare(b.name)
        );
      }

      return (
        b.wars - a.wars ||
        b.kills - a.kills ||
        b.kd - a.kd ||
        a.name.localeCompare(b.name)
      );
    });

    return sorted;
  }, [enemies, sortBy]);

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#13243a] bg-[#05101d] px-3 py-2">
        <p className="text-[10px] font-black uppercase tracking-[0.09em] text-[#8291a7]">
          Guild Rankings
        </p>

        <label className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-[0.07em] text-[#64748b]">
            Rank by
          </span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="h-8 rounded-md border border-[#263c59] bg-[#071422] px-2 text-[11px] font-black text-[#d8e5f7] outline-none focus:border-[#4ea1ff]"
          >
            <option value="wars">Wars</option>
            <option value="kd">K/D</option>
            <option value="kills">Kills</option>
          </select>
        </label>
      </div>

      {!rows.length ? (
        <div className="flex min-h-[280px] items-center justify-center p-5 text-sm font-bold text-slate-500">
          No enemy guild data for this month.
        </div>
      ) : (
        <div
          className={`max-h-[448px] overflow-y-auto divide-y divide-[#102038] ${scrollCls}`}
        >
          {rows.map((enemy, index) => {
            const positive = enemy.kd >= 1;

            return (
              <div
                key={enemy.name}
                className="group grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3.5 transition hover:bg-white/[.025]"
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] font-black ${
                    index === 0
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                      : index === 1
                        ? 'border-slate-300/20 bg-slate-300/5 text-slate-300'
                        : index === 2
                          ? 'border-orange-400/25 bg-orange-400/10 text-orange-300'
                          : 'border-[#263c59] bg-[#081626] text-[#7589a3]'
                  }`}
                >
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[14px] font-black text-white">
                      {enemy.name}
                    </p>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.05em] text-slate-400">
                      {enemy.wars} war{enemy.wars === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-[11px] font-black">
                    <span className="text-blue-300">
                      {compact(enemy.kills)} K
                    </span>
                    <span className="text-rose-300">
                      {compact(enemy.deaths)} D
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-[17px] font-black ${
                      positive ? 'text-[#75e34f]' : 'text-[#ff6077]'
                    }`}
                  >
                    {enemy.kd.toFixed(2)}
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
                    K/D
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function MonthlyRecap({
  logs = [],
  onOpenMatchOverview = () => {},
}) {
  const months = useMemo(() => {
    const available = [
      ...new Set(
        (logs || [])
          .map((log) => monthFromDate(dateOf(log)))
          .filter((month) => month && month >= MIN_MONTH),
      ),
    ].sort((a, b) => b.localeCompare(a));

    if (!available.includes(MIN_MONTH)) {
      available.push(MIN_MONTH);
      available.sort((a, b) => b.localeCompare(a));
    }

    return available;
  }, [logs]);

  const [selectedMonth, setSelectedMonth] = useState(
    months[0] || MIN_MONTH,
  );
  const [daysAgo, setDaysAgo] = useState(
    DEFAULT_RECAP_DAYS_AGO,
  );

  useEffect(() => {
    if (!months.includes(selectedMonth)) {
      setSelectedMonth(months[0] || MIN_MONTH);
    }
  }, [months, selectedMonth]);

  const review = useMemo(
    () =>
      buildReview(
        logs,
        selectedMonth,
        daysAgo,
      ),
    [logs, selectedMonth, daysAgo],
  );

  const activeDateWindow = useMemo(
    () => monthDateWindow(selectedMonth, daysAgo),
    [selectedMonth, daysAgo],
  );

  const {
    previousMonth,
    totals,
    previousTotals,
    players,
    topFragger,
    bestKd,
    damageLeader,
    fortBreaker,
    longestStreak,
    bestFeed,
    enemies,
    mostFought,
    bestMatchup,
    toughestMatchup,
    featuredWars,
  } = review;

  return (
    <div className="space-y-2.5 bg-[#020611] text-white">
      <div className="flex flex-col gap-3 pb-1 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[32px] font-black leading-none tracking-[-0.02em] text-white">
            Monthly Recap
          </h1>
          <p className="mt-1 text-[13px] font-medium text-[#8d9bb0]">
            Node Wars Performance Overview —{' '}
            <span className="font-bold text-[#4ea1ff]">
              {monthLabel(selectedMonth)}
            </span>
            <span className="text-[#52637b]">
              {' '}
              ·{' '}
              {daysAgo
                ? `${formatDate(activeDateWindow.start)} – ${formatDate(
                    activeDateWindow.end,
                  )}`
                : 'Full month'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <CalendarDays
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8da2]"
            />
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-10 rounded-[8px] border border-[#23364f] bg-[#020813] py-2 pl-9 pr-9 text-[12px] font-bold text-[#d8e5f7] outline-none focus:border-[#4ea1ff]"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-10 items-center gap-2 rounded-[8px] border border-[#23364f] bg-[#020813] px-3 focus-within:border-[#4ea1ff]">
            <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.07em] text-[#7f8da2]">
              Days Ago
            </span>
            <input
              type="number"
              min="0"
              max="366"
              step="1"
              value={daysAgo}
              onChange={(event) =>
                setDaysAgo(
                  Math.max(
                    0,
                    Math.min(
                      366,
                      Math.floor(num(event.target.value)),
                    ),
                  ),
                )
              }
              className="w-14 bg-transparent text-right text-[12px] font-black tabular-nums text-[#d8e5f7] outline-none"
            />
            <span className="whitespace-nowrap text-[9px] font-bold text-[#52637b]">
              0 = full month
            </span>
          </label>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          icon={Flag}
          label="Total Wars"
          value={compact(totals.wars, 0)}
          comparison={comparisonInfo(
            totals.wars,
            previousTotals.wars,
            previousMonth,
          )}
          accent="blue"
        />
        <KpiCard
          icon={Swords}
          label="Total Kills"
          value={compact(totals.kills)}
          averageLabel="Avg / War"
          averageValue={totals.avgKills.toFixed(1)}
          comparison={comparisonInfo(
            totals.kills,
            previousTotals.kills,
            previousMonth,
          )}
          accent="violet"
        />
        <KpiCard
          icon={Skull}
          label="Total Deaths"
          value={compact(totals.deaths)}
          averageLabel="Avg / War"
          averageValue={totals.avgDeaths.toFixed(1)}
          comparison={comparisonInfo(
            totals.deaths,
            previousTotals.deaths,
            previousMonth,
            true,
          )}
          accent="rose"
        />
        <KpiCard
          icon={Crosshair}
          label="Overall K/D"
          value={totals.kd.toFixed(2)}
          averageLabel="Avg War K/D"
          averageValue={totals.avgWarKd.toFixed(2)}
          comparison={comparisonInfo(
            totals.kd,
            previousTotals.kd,
            previousMonth,
          )}
          accent="cyan"
        />
        <KpiCard
          icon={Zap}
          label="Damage"
          value={compact(totals.damage)}
          averageLabel="Avg / War"
          averageValue={compact(totals.avgDamage)}
          comparison={comparisonInfo(
            totals.damage,
            previousTotals.damage,
            previousMonth,
          )}
          accent="green"
        />
        <KpiCard
          icon={Castle}
          label="Fort Damage"
          value={compact(totals.fortDamage)}
          averageLabel="Avg / War"
          averageValue={compact(totals.avgFortDamage)}
          comparison={comparisonInfo(
            totals.fortDamage,
            previousTotals.fortDamage,
            previousMonth,
          )}
          accent="amber"
        />
      </div>

      <SectionShell icon={Swords} title="Featured Wars">
        <div className="grid gap-2 p-2 xl:grid-cols-3">
          {featuredWars.length ? (
            featuredWars.map((item) => (
              <FeaturedWar
                key={item.id}
                item={item}
                onOpen={onOpenMatchOverview}
              />
            ))
          ) : (
            <p className="col-span-full p-5 text-sm text-slate-500">
              No featured wars for this month.
            </p>
          )}
        </div>
      </SectionShell>

      <SectionShell icon={Shield} title="Enemy Guild Report">
        <div className="grid items-stretch gap-0 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,.95fr)]">
          <div className="border-b border-[#13243a] p-2 xl:border-b-0 xl:border-r">
            <div className="grid min-h-[488px] grid-cols-1 content-stretch gap-2">
              <MatchupCard
                icon={Swords}
                label="Most Fought Guild"
                name={mostFought?.name}
                wars={mostFought?.wars}
                value={
                  mostFought
                    ? `${compact(mostFought.kills)} K · ${compact(
                        mostFought.deaths,
                      )} D`
                    : null
                }
                accent="violet"
                onClick={
                  mostFought?.warRows?.length
                    ? () => onOpenMatchOverview(mostFought.warRows)
                    : undefined
                }
                openLabel={
                  mostFought?.warRows?.length
                    ? `Open all ${mostFought.warRows.length} node war${
                        mostFought.warRows.length === 1 ? '' : 's'
                      }`
                    : undefined
                }
              />

              <MatchupCard
                icon={Trophy}
                label="Best Matchup"
                name={bestMatchup?.name}
                wars={bestMatchup?.wars}
                value={
                  bestMatchup
                    ? `${bestMatchup.kd.toFixed(2)} K/D`
                    : null
                }
                accent="cyan"
                onClick={
                  bestMatchup?.warRows?.length
                    ? () => onOpenMatchOverview(bestMatchup.warRows)
                    : undefined
                }
                openLabel={
                  bestMatchup?.warRows?.length
                    ? `Open all ${bestMatchup.warRows.length} node war${
                        bestMatchup.warRows.length === 1 ? '' : 's'
                      }`
                    : undefined
                }
              />

              <MatchupCard
                icon={Target}
                label="Toughest Opponent"
                name={toughestMatchup?.name}
                wars={toughestMatchup?.wars}
                value={
                  toughestMatchup
                    ? `${toughestMatchup.kd.toFixed(2)} K/D`
                    : null
                }
                accent="rose"
                onClick={
                  toughestMatchup?.warRows?.length
                    ? () => onOpenMatchOverview(toughestMatchup.warRows)
                    : undefined
                }
                openLabel={
                  toughestMatchup?.warRows?.length
                    ? `Open all ${toughestMatchup.warRows.length} node war${
                        toughestMatchup.warRows.length === 1 ? '' : 's'
                      }`
                    : undefined
                }
              />
            </div>
          </div>

          <div className="min-w-0">
            <EnemyGuildReport enemies={enemies} />
          </div>
        </div>
      </SectionShell>

      <SectionShell icon={Users} title="Player Highlights">
        <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <PlayerHighlight
            icon={Crosshair}
            label="Top Fragger"
            name={topFragger?.name}
            value={topFragger ? compact(topFragger.kills) : '-'}
            unit={
              topFragger?.date
                ? `Kills · ${formatDate(topFragger.date)}`
                : 'Kills'
            }
            accent="blue"
          />
          <PlayerHighlight
            icon={Gauge}
            label="Best K/D"
            name={bestKd?.name}
            value={bestKd ? bestKd.kd.toFixed(2) : '-'}
            unit={
              bestKd?.date
                ? `K/D · ${formatDate(bestKd.date)}`
                : 'K/D Ratio'
            }
            accent="violet"
          />
          <PlayerHighlight
            icon={Zap}
            label="Damage Leader"
            name={damageLeader?.name}
            value={damageLeader ? compact(damageLeader.damage) : '-'}
            unit={
              damageLeader?.date
                ? `Damage · ${formatDate(damageLeader.date)}`
                : 'Damage'
            }
            accent="cyan"
          />
          <PlayerHighlight
            icon={Castle}
            label="Fort Breaker"
            name={fortBreaker?.name}
            value={fortBreaker ? compact(fortBreaker.fortDamage) : '-'}
            unit={
              fortBreaker?.date
                ? `Fort Damage · ${formatDate(fortBreaker.date)}`
                : 'Fort Damage'
            }
            accent="green"
          />
          <PlayerHighlight
            icon={Medal}
            label="Longest Killstreak"
            name={longestStreak?.name}
            value={longestStreak ? compact(longestStreak.value, 0) : '-'}
            unit={
              longestStreak?.date
                ? `Kills · ${formatDate(longestStreak.date)}`
                : 'Kills'
            }
            accent="amber"
          />
          <PlayerHighlight
            icon={Flame}
            label="Best Kill Feed"
            name={bestFeed?.name}
            value={bestFeed ? compact(bestFeed.value, 0) : '-'}
            unit={
              bestFeed?.date
                ? `Kills · ${formatDate(bestFeed.date)}`
                : 'Kills'
            }
            accent="pink"
          />
        </div>
      </SectionShell>

      <SectionShell icon={Activity} title="Players Performance">
        <PlayersTable players={players} />
      </SectionShell>

    </div>
  );
}
