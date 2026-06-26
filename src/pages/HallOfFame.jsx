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
const MIN_HALL_WARS = 50;

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

function compareChronology(a, b) {
  return (
    String(a?.chronologyKey || '9999-99-99 99999999 99999999').localeCompare(
      String(b?.chronologyKey || '9999-99-99 99999999 99999999'),
    ) ||
    String(a?.name || '').localeCompare(String(b?.name || ''))
  );
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

function buildHallData(stats, minimumWars = MIN_HALL_WARS) {
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
  const secondaryDamageDealtKeys = [
    'damageDealt',
    'damage_dealt',
    'damage dealt',
    'damageDone',
    'damage',
    'Damage Dealt',
    'DamageDealt',
    'DMG Dealt',
    'dmgDealt',
    'dmg dealt',
  ];
  const secondaryFortDamageKeys = [
    'fortDamage',
    'damageToFort',
    'damage_to_fort',
    'damage to fort',
    'damageFort',
    'Damage to Fort',
    'DamageToFort',
    'fort damage',
    'Fort Damage',
    'dmgToFort',
    'DMG to Fort',
  ];
  const secondaryCcHitsKeys = [
    'ccHits',
    'cc_hits',
    'cc hits',
    'CC Hits',
    'CCHits',
    'cc',
    'CC',
    'crowdControl',
    'crowd control',
    'Crowd Control',
  ];

  const secondaryMetricKeys = {
    kills: secondaryKillKeys,
    deaths: secondaryDeathKeys,
    damageDealt: secondaryDamageDealtKeys,
    fortDamage: secondaryFortDamageKeys,
    ccHits: secondaryCcHitsKeys,
  };

  const secondaryCoreMetrics = new Set(['kills', 'deaths']);
  const secondaryDetailMetrics = ['damageDealt', 'fortDamage', 'ccHits'];

  function normalizeHallMetricText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function getRowRawText(row) {
    if (!row) return '';

    return [
      row.raw,
      row.rawLine,
      row.original,
      row.originalLine,
      row.source,
      row.sourceLine,
      row.text,
      row.line,
      row.input,
      row.entry,
      row.content,
      row.note,
    ]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .join(' ');
  }

  function getStructuredPresenceText(value, depth = 0) {
    if (value === undefined || value === null || depth > 3) return '';

    if (Array.isArray(value)) {
      return value.map((item) => getStructuredPresenceText(item, depth + 1)).join(' ');
    }

    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([key, item]) => `${key} ${getStructuredPresenceText(item, depth + 1)}`)
        .join(' ');
    }

    return String(value);
  }

  function hasMetricNameInStructuredFields(row, keys) {
    if (!row) return false;

    const containers = [
      row.headers,
      row.header,
      row.columns,
      row.columnNames,
      row.fieldNames,
      row.fields,
      row.providedFields,
      row.availableFields,
      row.schema,
      row.metrics,
    ];

    const structuredText = normalizeHallMetricText(
      containers
        .map((value) => getStructuredPresenceText(value))
        .filter(Boolean)
        .join(' '),
    );

    if (!structuredText) return false;

    return keys.some((key) => {
      const alias = normalizeHallMetricText(key);
      const spacedAlias = normalizeHallMetricText(
        String(key)
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/[_-]/g, ' '),
      );

      return Boolean(
        (alias && structuredText.includes(alias)) ||
          (spacedAlias && structuredText.includes(spacedAlias)),
      );
    });
  }

  function rowHasOwnMetricKey(row, keys) {
    return Boolean(row && keys.some((key) => Object.prototype.hasOwnProperty.call(row, key)));
  }

  function getPresenceFlag(row, keys) {
    if (!row) return undefined;

    const suffixes = [
      'HasValue',
      'hasValue',
      'Exists',
      'exists',
      'Present',
      'present',
      'Provided',
      'provided',
      'Added',
      'added',
    ];

    for (const key of keys) {
      const keyText = String(key);
      const compact = keyText.replace(/[^a-zA-Z0-9]/g, '');
      const camel = compact.charAt(0).toLowerCase() + compact.slice(1);
      const pascal = compact.charAt(0).toUpperCase() + compact.slice(1);
      const snake = keyText
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();

      const candidates = [
        `has_${snake}`,
        `${snake}_exists`,
        `${snake}_present`,
        `${snake}_provided`,
        `${snake}_added`,
        ...suffixes.flatMap((suffix) => [`${camel}${suffix}`, `${pascal}${suffix}`]),
      ];

      const found = candidates.find((candidate) =>
        Object.prototype.hasOwnProperty.call(row, candidate),
      );

      if (found) return Boolean(row[found]);
    }

    return undefined;
  }

  function hasMetricNameInRawText(row, keys) {
    const rawText = normalizeHallMetricText(getRowRawText(row));

    if (!rawText) return false;

    return keys.some((key) => {
      const alias = normalizeHallMetricText(key);
      const spacedAlias = normalizeHallMetricText(
        String(key)
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/[_-]/g, ' '),
      );

      return Boolean(
        (alias && rawText.includes(alias)) ||
          (spacedAlias && rawText.includes(spacedAlias)),
      );
    });
  }

  function getSecondaryMetricNumber(row, metric, fallback = NaN) {
    const keys = secondaryMetricKeys[metric] || [metric];
    const key = findRowKey(row, keys);

    if (!key) return fallback;

    return parseHallNumber(row[key], fallback);
  }

  function hasRawMetricValue(row, keys) {
    const key = findRowKey(row, keys);

    if (!key) return false;

    const number = parseHallNumber(row[key], NaN);

    if (!Number.isFinite(number)) return false;

    const presenceFlag = getPresenceFlag(row, keys);

    if (presenceFlag !== undefined) return presenceFlag;

    if (number !== 0) return true;

    return hasMetricNameInRawText(row, keys);
  }

  function getSecondaryWarMetricPresence(rows) {
    const output = {};

    (rows || []).forEach((row, index) => {
      const warId = secondaryWarId(row, index);

      output[warId] ||= {
        __detailed: false,
      };

      Object.entries(secondaryMetricKeys).forEach(([metric, keys]) => {
        const key = findRowKey(row, keys);
        const number = key ? parseHallNumber(row[key], NaN) : NaN;
        const presenceFlag = getPresenceFlag(row, keys);
        const explicitPresence =
          presenceFlag === true ||
          hasMetricNameInRawText(row, keys) ||
          hasMetricNameInStructuredFields(row, keys);
        const nonZeroValue = Number.isFinite(number) && number !== 0;

        if (explicitPresence || nonZeroValue) {
          output[warId][metric] = true;
        }

        if (secondaryDetailMetrics.includes(metric) && (explicitPresence || nonZeroValue)) {
          output[warId].__detailed = true;
        }
      });
    });

    (rows || []).forEach((row, index) => {
      const warId = secondaryWarId(row, index);
      const presence = output[warId];

      if (!presence?.__detailed) return;

      secondaryDetailMetrics.forEach((metric) => {
        const keys = secondaryMetricKeys[metric] || [metric];
        const number = getSecondaryMetricNumber(row, metric, NaN);

        if (rowHasOwnMetricKey(row, keys) && Number.isFinite(number)) {
          presence[metric] = true;
        }
      });
    });

    return output;
  }

  function getSecondaryMetricExists(row, metric, warPresence = {}) {
    const keys = secondaryMetricKeys[metric] || [metric];

    if (hasRawMetricValue(row, keys)) return true;

    const number = getSecondaryMetricNumber(row, metric, NaN);

    if (!Number.isFinite(number)) return false;

    if (secondaryCoreMetrics.has(metric) && rowHasOwnMetricKey(row, keys)) {
      return true;
    }

    if (number !== 0) return true;

    if (warPresence?.[metric]) return true;

    if (
      secondaryDetailMetrics.includes(metric) &&
      warPresence?.__detailed &&
      rowHasOwnMetricKey(row, keys)
    ) {
      return true;
    }

    return false;
  }

  function getSecondaryPlayerName(row) {
    const key = findRowKey(row, secondaryPlayerKeys);
    return key ? String(row[key] || '').trim() : '';
  }

  function hasSecondaryKills(row, warPresence = {}) {
    return getSecondaryMetricExists(row, 'kills', warPresence);
  }

  function getSecondaryKills(row) {
    return getSecondaryMetricNumber(row, 'kills', 0);
  }

  function hasSecondaryDeaths(row, warPresence = {}) {
    return getSecondaryMetricExists(row, 'deaths', warPresence);
  }

  function getSecondaryDeaths(row) {
    return getSecondaryMetricNumber(row, 'deaths', 0);
  }

  function hasSecondaryDamageDealt(row, warPresence = {}) {
    return getSecondaryMetricExists(row, 'damageDealt', warPresence);
  }

  function getSecondaryDamageDealt(row) {
    return getSecondaryMetricNumber(row, 'damageDealt', 0);
  }

  function hasSecondaryFortDamage(row, warPresence = {}) {
    return getSecondaryMetricExists(row, 'fortDamage', warPresence);
  }

  function getSecondaryFortDamage(row) {
    return getSecondaryMetricNumber(row, 'fortDamage', 0);
  }

  function hasSecondaryCcHits(row, warPresence = {}) {
    return getSecondaryMetricExists(row, 'ccHits', warPresence);
  }

  function getSecondaryCcHits(row) {
    return getSecondaryMetricNumber(row, 'ccHits', 0);
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
      damageDealt: 0,
      fortDamage: 0,
      ccHits: 0,
      hasKills: false,
      hasDeaths: false,
      hasDamageDealt: false,
      hasFortDamage: false,
      hasCcHits: false,
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

  const secondaryWarPresence = getSecondaryWarMetricPresence(
    Array.isArray(secondaryRows) ? secondaryRows : [],
  );

  (Array.isArray(secondaryRows) ? secondaryRows : []).forEach((row, index) => {
    const name = getSecondaryPlayerName(row);

    if (!name) return;

    const id = secondaryWarId(row, index);
    const date = row.date || row.war || id;
    ensureWar(id, date);

    const match = ensurePlayerMatch(name, id, date);
    const warPresence = secondaryWarPresence[id] || {};

    // Same behavior as Player Stats Match History:
    // averages use only values that actually exist in the match-history row.
    if (hasSecondaryKills(row, warPresence)) {
      match.kills = getSecondaryKills(row);
      match.hasKills = true;
    }

    if (hasSecondaryDeaths(row, warPresence)) {
      match.deaths = getSecondaryDeaths(row);
      match.hasDeaths = true;
    }

    if (hasSecondaryDamageDealt(row, warPresence)) {
      match.damageDealt = getSecondaryDamageDealt(row);
      match.hasDamageDealt = true;
    }

    if (hasSecondaryFortDamage(row, warPresence)) {
      match.fortDamage = getSecondaryFortDamage(row);
      match.hasFortDamage = true;
    }

    if (hasSecondaryCcHits(row, warPresence)) {
      match.ccHits = getSecondaryCcHits(row);
      match.hasCcHits = true;
    }
  });

  const warList = Object.values(warMap).sort((a, b) =>
    warSortKey(a.id, a.date).localeCompare(warSortKey(b.id, b.date)),
  );

  const warIndexById = Object.fromEntries(
    warList.map((war, index) => [war.id, index]),
  );

  // Build chronology once. This avoids repeatedly scanning and sorting the
  // complete Combat Log inside every player and leaderboard calculation.
  const firstCombatKeyByPlayer = {};
  const firstCombatKeyByWarPlayer = {};

  [...events]
    .sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b)))
    .forEach((event) => {
      const playerName = getGuildInvolvedPlayer(event);

      if (!playerName) return;

      const eventKey = eventSortKey(event);
      const warPlayerKey = `${eventWarId(event)}::${playerName}`;

      firstCombatKeyByPlayer[playerName] ||= eventKey;
      firstCombatKeyByWarPlayer[warPlayerKey] ||= eventKey;
    });

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
    let participatedWarCount = 0;

    orderedMatches.forEach((match) => {
      participatedWarCount += 1;

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
            fromPlayerFirstLogWars: participatedWarCount,
            totalKillsAtReach: after,
            chronologyKey: warSortKey(match.warId, match.date),
          });
        }
      });
    });
  });

  function getPlayerChronologyKey(name) {
    const firstTrackedWarIndex = firstSeenWarIndex[name];

    return (
      firstCombatKeyByPlayer[name] ||
      (Number.isFinite(Number(firstTrackedWarIndex))
        ? `${String(firstTrackedWarIndex).padStart(8, '0')} 00000000 00000000`
        : '9999-99-99 99999999 99999999')
    );
  }

  function getPlayerWarChronologyKey(warId, name) {
    return (
      firstCombatKeyByWarPlayer[`${warId}::${name}`] ||
      getPlayerChronologyKey(name)
    );
  }

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

  function getPlayerAvgDamageDealt(name) {
    const matches = Object.values(playerMatchMap[name] || {}).filter(
      (match) => match.hasDamageDealt,
    );

    if (!matches.length) return null;

    return (
      matches.reduce((sum, match) => sum + (Number(match.damageDealt) || 0), 0) /
      matches.length
    );
  }

  function getPlayerAvgCcHits(name) {
    const matches = Object.values(playerMatchMap[name] || {}).filter(
      (match) => match.hasCcHits,
    );

    if (!matches.length) return null;

    return (
      matches.reduce((sum, match) => sum + (Number(match.ccHits) || 0), 0) /
      matches.length
    );
  }

  function getPlayerWarIndices(name) {
    return Object.values(playerMatchMap[name] || {})
      .map((match) => warIndexById[match.warId])
      .filter((index) => Number.isFinite(Number(index)))
      .map((index) => Number(index))
      .sort((a, b) => a - b);
  }

  function getLongestConsecutiveWarStreak(name) {
    const indices = getPlayerWarIndices(name);

    if (!indices.length) return 0;

    let best = 1;
    let current = 1;

    for (let index = 1; index < indices.length; index += 1) {
      if (indices[index] === indices[index - 1]) continue;

      if (indices[index] === indices[index - 1] + 1) {
        current += 1;
      } else {
        current = 1;
      }

      best = Math.max(best, current);
    }

    return best;
  }

  function getJoinParticipation(name) {
    const playerWarIndices = getPlayerWarIndices(name);

    if (!playerWarIndices.length || !totalWars) return 0;

    const firstWarIndex = playerWarIndices[0];
    const possibleWarsFromFirstAppearance = Math.max(1, totalWars - firstWarIndex);

    return (playerWarIndices.length / possibleWarsFromFirstAppearance) * 100;
  }

  function getWarEventsSorted(warEvents) {
    return [...(warEvents || [])].sort(
      (a, b) =>
        Number(a.sec || 0) - Number(b.sec || 0) ||
        Number(a.i || 0) - Number(b.i || 0) ||
        String(a.killer || '').localeCompare(String(b.killer || '')) ||
        String(a.victim || '').localeCompare(String(b.victim || '')),
    );
  }

  function getBestWarKillstreak(warEvents, playerName) {
    const sortedEvents = getWarEventsSorted(warEvents);

    let current = 0;
    let best = 0;

    sortedEvents.forEach((event) => {
      const involvedPlayer = getGuildInvolvedPlayer(event);
      const killPlayer = getGuildKillPlayer(event);

      if (event.type === 'kill' && killPlayer === playerName) {
        current += 1;
        best = Math.max(best, current);
      }

      if (event.type === 'death' && involvedPlayer === playerName) {
        current = 0;
      }
    });

    return best;
  }

  function getBestWarKillfeed(warEvents, playerName, seconds = 10) {
    const kills = getWarEventsSorted(warEvents)
      .filter((event) => event.type === 'kill' && getGuildKillPlayer(event) === playerName)
      .map((event) => Number(event.sec) || 0);

    let left = 0;
    let best = 0;

    for (let right = 0; right < kills.length; right += 1) {
      while (kills[right] - kills[left] > seconds) {
        left += 1;
      }

      best = Math.max(best, right - left + 1);
    }

    return best;
  }

  function buildTieAwareRank(rowsForWar, key, desc = true) {
    return Object.fromEntries(
      [...rowsForWar]
        .sort((a, b) => {
          const av = Number(a[key]) || 0;
          const bv = Number(b[key]) || 0;

          if (av !== bv) {
            return desc ? bv - av : av - bv;
          }

          return compareChronology(a, b);
        })
        .map((row, index) => [row.name, index + 1]),
    );
  }

  function buildKillsRankLikePlayerStats(rowsForWar, warEvents) {
    const sortedEvents = getWarEventsSorted(warEvents);
    const byName = Object.fromEntries(rowsForWar.map((row) => [row.name, row]));
    const runningKills = {};
    const reached = {};

    sortedEvents
      .filter((event) => event.type === 'kill')
      .forEach((event) => {
        const guildPlayer = getGuildKillPlayer(event);

        if (!guildPlayer) return;

        runningKills[guildPlayer] = (runningKills[guildPlayer] || 0) + 1;

        const finalKills = byName[guildPlayer]?.kills || 0;

        if (finalKills && runningKills[guildPlayer] === finalKills && !reached[guildPlayer]) {
          reached[guildPlayer] = `${String(event.sec || 0).padStart(8, '0')} ${String(
            event.i || 0,
          ).padStart(8, '0')}`;
        }
      });

    return Object.fromEntries(
      [...rowsForWar]
        .sort(
          (a, b) =>
            b.kills - a.kills ||
            (reached[a.name] || '99999999').localeCompare(reached[b.name] || '99999999') ||
            compareChronology(a, b),
        )
        .map((row, index) => [row.name, index + 1]),
    );
  }

  function getRankRowsForWar(warId) {
    const warEvents = warMap[warId]?.events || [];

    return Object.entries(playerMatchMap)
      .map(([name, matchesByWar]) => {
        const match = matchesByWar[warId];

        if (!match) return null;

        const kills = Number(match.kills) || 0;
        const deaths = Number(match.deaths) || 0;
        const eventStreak = getBestWarKillstreak(warEvents, name);
        const eventFeed = getBestWarKillfeed(warEvents, name);

        return {
          name,
          kills,
          deaths,
          kdNumber: kd(kills, deaths),
          streak: eventStreak,
          feed: eventFeed,
          chronologyKey: getPlayerWarChronologyKey(warId, name),
        };
      })
      .filter(Boolean);
  }

  function getPlayerAverageRankValues(name) {
    return Object.keys(playerMatchMap[name] || {})
      .map((warId) => {
        const rowsForWar = getRankRowsForWar(warId);

        if (!rowsForWar.some((row) => row.name === name)) return null;

        const warEvents = warMap[warId]?.events || [];
        const hasEventData = warEvents.length > 0;

        const ranks = {
          kills: hasEventData
            ? buildKillsRankLikePlayerStats(rowsForWar, warEvents)
            : buildTieAwareRank(rowsForWar, 'kills', true),
          deaths: buildTieAwareRank(rowsForWar, 'deaths', false),
          kd: buildTieAwareRank(rowsForWar, 'kdNumber', true),
          streak: buildTieAwareRank(rowsForWar, 'streak', true),
          feed: buildTieAwareRank(rowsForWar, 'feed', true),
        };

        const rankParts = hasEventData
          ? [ranks.kills[name], ranks.deaths[name], ranks.kd[name], ranks.streak[name], ranks.feed[name]]
          : [ranks.kills[name], ranks.deaths[name], ranks.kd[name], ranks.streak[name]];

        const cleanParts = rankParts.filter((value) => Number.isFinite(Number(value)));

        if (!cleanParts.length) return null;

        return cleanParts.reduce((sum, value) => sum + Number(value), 0) / cleanParts.length;
      })
      .filter((value) => Number.isFinite(Number(value)));
  }

  function getPlayerAverageRank(name) {
    const values = getPlayerAverageRankValues(name);

    if (!values.length) return null;

    return values.reduce((sum, value) => sum + value, 0) / values.length;
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
      const trackedWars = Object.keys(playerMatchMap[player.name] || {}).length;
      const wars = Math.max(
        trackedWars,
        num(player.wars),
        num(player.warCount),
        num(player.matches),
      );
      const maxMatchKills = Math.max(
        0,
        ...matchValues.map((match) => Number(match.kills) || 0),
      );
      const fiftyPlusKillWars = matchValues.filter(
        (match) => (Number(match.kills) || 0) >= 50,
      ).length;
      const kdMatchValues = Object.values(playerMatchMap[player.name] || {}).filter(
        (match) => match.hasKills || match.hasDeaths,
      );
      const maxMatchKd = Math.max(
        0,
        ...kdMatchValues.map((match) =>
          kd(Number(match.kills) || 0, Number(match.deaths) || 0),
        ),
      );
      const avgKillsPerMatch = getPlayerAvgKills(player.name);
      const avgKdPerMatch = getPlayerAvgKd(player.name);
      const avgKdMatchCount = kdMatchValues.length;
      const allTrackedMatchValues = Object.values(playerMatchMap[player.name] || {}).filter(
        (match) =>
          match.hasKills ||
          match.hasDeaths ||
          match.hasDamageDealt ||
          match.hasFortDamage ||
          match.hasCcHits,
      );
      const hallMatchCount = allTrackedMatchValues.length;
      const damageMatchValues = Object.values(playerMatchMap[player.name] || {}).filter(
        (match) => match.hasDamageDealt,
      );
      const fortDamageMatchValues = Object.values(playerMatchMap[player.name] || {}).filter(
        (match) => match.hasFortDamage,
      );
      const ccHitsMatchValues = Object.values(playerMatchMap[player.name] || {}).filter(
        (match) => match.hasCcHits,
      );
      const maxMatchDamageDealt = Math.max(
        0,
        ...damageMatchValues.map((match) => Number(match.damageDealt) || 0),
      );
      const maxMatchFortDamage = Math.max(
        0,
        ...fortDamageMatchValues.map((match) => Number(match.fortDamage) || 0),
      );
      const maxMatchCcHits = Math.max(
        0,
        ...ccHitsMatchValues.map((match) => Number(match.ccHits) || 0),
      );
      const avgDamageDealtPerMatch = getPlayerAvgDamageDealt(player.name);
      const avgDamageDealtMatchCount = damageMatchValues.length;
      const avgCcHitsPerMatch = getPlayerAvgCcHits(player.name);
      const avgCcHitsMatchCount = ccHitsMatchValues.length;
      const joinParticipation = getJoinParticipation(player.name);
      const consecutiveWars = getLongestConsecutiveWarStreak(player.name);
      const averageRankValues = getPlayerAverageRankValues(player.name);
      const averageRank = getPlayerAverageRank(player.name);
      const averageRankMatchCount = averageRankValues.length;
      const chronologyKey = getPlayerChronologyKey(player.name);
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
        fiftyPlusKillWars,
        maxMatchKd,
        hallMatchCount,
        avgKillsPerMatch,
        avgKillsMatchCount,
        avgKdPerMatch,
        avgKdMatchCount,
        maxMatchDamageDealt,
        maxMatchFortDamage,
        maxMatchCcHits,
        avgDamageDealtPerMatch,
        avgDamageDealtMatchCount,
        avgCcHitsPerMatch,
        avgCcHitsMatchCount,
        joinParticipation,
        consecutiveWars,
        averageRank,
        averageRankMatchCount,
        chronologyKey,
        score,
        title,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        compareChronology(a, b),
    );

  const eligibleRows = rows.filter((row) => row.wars >= minimumWars);

  function buildCareerRankMap(rowsToRank, valueGetter, desc = true) {
    return Object.fromEntries(
      [...rowsToRank]
        .sort((a, b) => {
          const av = Number(valueGetter(a)) || 0;
          const bv = Number(valueGetter(b)) || 0;

          if (av !== bv) {
            return desc ? bv - av : av - bv;
          }

          return compareChronology(a, b);
        })
        .map((player, index) => [player.name, index + 1]),
    );
  }

  // Career Average Rank uses the player's complete recorded war count.
  // This avoids limiting the result to only wars that have detailed
  // per-match rows. Lower Average Rank is better.
  const careerRanks = {
    killsPerWar: buildCareerRankMap(
      eligibleRows,
      (player) => player.wars ? player.kills / player.wars : 0,
      true,
    ),
    deathsPerWar: buildCareerRankMap(
      eligibleRows,
      (player) => player.wars ? player.deaths / player.wars : 0,
      false,
    ),
    kd: buildCareerRankMap(
      eligibleRows,
      (player) => player.kd,
      true,
    ),
  };

  const leaderboardRows = eligibleRows
    .map((player) => {
      const rankParts = [
        careerRanks.killsPerWar[player.name],
        careerRanks.deathsPerWar[player.name],
        careerRanks.kd[player.name],
      ].filter((value) => Number.isFinite(Number(value)));

      const careerAverageRank = rankParts.length
        ? rankParts.reduce((sum, value) => sum + Number(value), 0) /
          rankParts.length
        : null;

      return {
        ...player,
        averageRank: careerAverageRank,
        averageRankMatchCount: player.wars,
        averageRankDetailedMatchCount: player.averageRankMatchCount,
        averageKillsAllWars: player.wars ? player.kills / player.wars : 0,
        averageDeathsAllWars: player.wars ? player.deaths / player.wars : 0,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        compareChronology(a, b),
    );

  const eligiblePlayerNames = new Set(leaderboardRows.map((row) => row.name));

  const bestKd =
    [...leaderboardRows]
      .filter((row) => row.kills >= 5)
      .sort((a, b) => b.kd - a.kd || compareChronology(a, b))[0] ||
    leaderboardRows[0];

  const topKills =
    [...leaderboardRows].sort(
      (a, b) => b.kills - a.kills || compareChronology(a, b),
    )[0] || leaderboardRows[0];

  const topStreak =
    [...leaderboardRows].sort(
      (a, b) => b.streak - a.streak || compareChronology(a, b),
    )[0] || leaderboardRows[0];

  const topFeed =
    [...leaderboardRows].sort(
      (a, b) => b.feed - a.feed || compareChronology(a, b),
    )[0] || leaderboardRows[0];

  const topWars =
    [...leaderboardRows].sort(
      (a, b) => b.wars - a.wars || compareChronology(a, b),
    )[0] || leaderboardRows[0];

  const achievements = [
    { title: 'Hall MVP', icon: Crown, player: leaderboardRows[0], value: shortNum(leaderboardRows[0]?.score), sub: 'Highest total score', tone: 'amber' },
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
          .filter((item) => eligiblePlayerNames.has(item.name))
          .sort(
            (a, b) =>
              a.globalWarIndex - b.globalWarIndex ||
              compareChronology(a, b),
          )
          .slice(0, 10),
        fastest: [...thresholdReached[threshold]]
          .filter((item) => eligiblePlayerNames.has(item.name))
          .sort(
            (a, b) =>
              a.fromPlayerFirstLogWars - b.fromPlayerFirstLogWars ||
              a.globalWarIndex - b.globalWarIndex ||
              compareChronology(a, b),
          )
          .slice(0, 10),
      },
    ]),
  );

  return {
    rows: leaderboardRows,
    achievements,
    months,
    thresholdLeaderboards,
    topKillers: [...leaderboardRows]
      .filter((row) => row.kills > 0)
      .sort((a, b) => b.kills - a.kills || compareChronology(a, b))
      .slice(0, 10),
    topDamagePlayers: [...leaderboardRows]
      .filter((row) => row.damageDealt > 0)
      .sort((a, b) => b.damageDealt - a.damageDealt || compareChronology(a, b))
      .slice(0, 10),
    totals: {
      kills: num(safe.kills) || rows.reduce((sum, row) => sum + row.kills, 0),
      deaths: num(safe.deaths) || rows.reduce((sum, row) => sum + row.deaths, 0),
      kd: num(safe.kd) || kd(num(safe.kills), num(safe.deaths)),
      players: leaderboardRows.length,
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
  greenDeep: {
    soft: 'border-emerald-700/30 bg-emerald-950/20 text-emerald-300 shadow-emerald-900/10',
    text: 'text-emerald-300',
    bar: 'from-emerald-900 to-emerald-500',
    glow: 'shadow-[0_0_35px_rgba(6,78,59,.16)]',
  },
  greenEmerald: {
    soft: 'border-emerald-500/28 bg-emerald-500/12 text-emerald-200 shadow-emerald-500/10',
    text: 'text-emerald-200',
    bar: 'from-emerald-600 to-green-300',
    glow: 'shadow-[0_0_35px_rgba(16,185,129,.16)]',
  },
  greenMint: {
    soft: 'border-teal-400/28 bg-teal-500/10 text-teal-200 shadow-teal-400/10',
    text: 'text-teal-200',
    bar: 'from-teal-500 to-emerald-200',
    glow: 'shadow-[0_0_35px_rgba(45,212,191,.14)]',
  },
  greenLime: {
    soft: 'border-lime-400/28 bg-lime-500/10 text-lime-300 shadow-lime-400/10',
    text: 'text-lime-300',
    bar: 'from-lime-500 to-green-300',
    glow: 'shadow-[0_0_35px_rgba(132,204,22,.14)]',
  },
  greenTeal: {
    soft: 'border-green-400/28 bg-green-500/10 text-green-300 shadow-green-400/10',
    text: 'text-green-300',
    bar: 'from-green-600 to-teal-300',
    glow: 'shadow-[0_0_35px_rgba(34,197,94,.14)]',
  },
  yellowGold: {
    soft: 'border-yellow-400/30 bg-yellow-500/12 text-yellow-300 shadow-yellow-500/10',
    text: 'text-yellow-300',
    bar: 'from-yellow-600 via-yellow-400 to-amber-300',
    glow: 'shadow-[0_0_35px_rgba(234,179,8,.15)]',
  },
  yellowAmber: {
    soft: 'border-amber-400/30 bg-amber-500/12 text-amber-300 shadow-amber-500/10',
    text: 'text-amber-300',
    bar: 'from-amber-600 via-yellow-400 to-yellow-200',
    glow: 'shadow-[0_0_35px_rgba(245,158,11,.15)]',
  },
  yellowLemon: {
    soft: 'border-yellow-300/30 bg-yellow-400/10 text-yellow-200 shadow-yellow-400/10',
    text: 'text-yellow-200',
    bar: 'from-yellow-500 via-yellow-300 to-lime-200',
    glow: 'shadow-[0_0_35px_rgba(250,204,21,.14)]',
  },
  yellowHoney: {
    soft: 'border-yellow-500/28 bg-yellow-500/12 text-yellow-300 shadow-yellow-500/10',
    text: 'text-yellow-300',
    bar: 'from-yellow-700 via-yellow-500 to-amber-300',
    glow: 'shadow-[0_0_35px_rgba(234,179,8,.14)]',
  },
  yellowSand: {
    soft: 'border-amber-300/26 bg-yellow-300/10 text-amber-200 shadow-yellow-300/10',
    text: 'text-amber-200',
    bar: 'from-amber-500 via-yellow-300 to-yellow-100',
    glow: 'shadow-[0_0_35px_rgba(253,224,71,.12)]',
  },
  redDeep: {
    soft: 'border-red-700/30 bg-red-950/20 text-red-300 shadow-red-900/10',
    text: 'text-red-300',
    bar: 'from-red-900 to-red-500',
    glow: 'shadow-[0_0_35px_rgba(127,29,29,.16)]',
  },
  redCrimson: {
    soft: 'border-red-500/28 bg-red-500/12 text-red-200 shadow-red-500/10',
    text: 'text-red-200',
    bar: 'from-red-600 to-rose-300',
    glow: 'shadow-[0_0_35px_rgba(239,68,68,.15)]',
  },
  redRose: {
    soft: 'border-rose-400/28 bg-rose-500/10 text-rose-200 shadow-rose-400/10',
    text: 'text-rose-200',
    bar: 'from-rose-600 to-red-300',
    glow: 'shadow-[0_0_35px_rgba(244,63,94,.14)]',
  },
  redRuby: {
    soft: 'border-red-400/28 bg-red-500/10 text-red-300 shadow-red-400/10',
    text: 'text-red-300',
    bar: 'from-red-500 to-orange-300',
    glow: 'shadow-[0_0_35px_rgba(248,113,113,.14)]',
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
  blueDark: {
    soft: 'border-blue-700/30 bg-blue-900/18 text-blue-300 shadow-blue-800/10',
    text: 'text-blue-300',
    bar: 'from-blue-800 to-blue-500',
    glow: 'shadow-[0_0_35px_rgba(30,64,175,.16)]',
  },
  blueRoyal: {
    soft: 'border-blue-500/28 bg-blue-600/12 text-blue-200 shadow-blue-600/10',
    text: 'text-blue-200',
    bar: 'from-blue-600 to-blue-300',
    glow: 'shadow-[0_0_35px_rgba(37,99,235,.16)]',
  },
  blueSky: {
    soft: 'border-sky-400/28 bg-sky-500/10 text-sky-300 shadow-sky-500/10',
    text: 'text-sky-300',
    bar: 'from-sky-500 to-cyan-300',
    glow: 'shadow-[0_0_35px_rgba(14,165,233,.15)]',
  },
  blueIce: {
    soft: 'border-cyan-300/25 bg-cyan-500/10 text-cyan-200 shadow-cyan-400/10',
    text: 'text-cyan-200',
    bar: 'from-cyan-400 to-blue-200',
    glow: 'shadow-[0_0_35px_rgba(34,211,238,.14)]',
  },
  blueIndigo: {
    soft: 'border-indigo-400/28 bg-indigo-500/10 text-indigo-300 shadow-indigo-500/10',
    text: 'text-indigo-300',
    bar: 'from-indigo-500 to-blue-300',
    glow: 'shadow-[0_0_35px_rgba(99,102,241,.15)]',
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
    blueDark: 'from-blue-950 via-blue-800 to-blue-600',
    blueRoyal: 'from-blue-700 via-blue-500 to-blue-300',
    blueSky: 'from-sky-600 via-sky-400 to-cyan-200',
    blueIndigo: 'from-indigo-700 via-indigo-500 to-blue-300',
    blueIce: 'from-cyan-500 via-sky-300 to-blue-100',
    emerald: 'from-emerald-500 to-lime-300',
    greenDeep: 'from-emerald-950 via-emerald-700 to-green-500',
    greenEmerald: 'from-emerald-600 via-green-400 to-lime-200',
    greenMint: 'from-teal-500 via-emerald-300 to-green-100',
    greenLime: 'from-lime-500 via-green-300 to-emerald-200',
    greenTeal: 'from-green-700 via-teal-400 to-emerald-200',
    yellowGold: 'from-yellow-600 via-yellow-400 to-amber-300',
    yellowAmber: 'from-amber-600 via-yellow-400 to-yellow-200',
    yellowLemon: 'from-yellow-500 via-yellow-300 to-lime-200',
    yellowHoney: 'from-yellow-700 via-yellow-500 to-amber-300',
    yellowSand: 'from-amber-500 via-yellow-300 to-yellow-100',
    redDeep: 'from-red-950 via-red-700 to-red-500',
    redCrimson: 'from-red-700 via-red-500 to-rose-300',
    redRose: 'from-rose-700 via-rose-500 to-red-200',
    redRuby: 'from-red-500 via-orange-400 to-red-200',
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
          {false && <p className="mt-2 text-3xl font-black leading-none">{value}</p>}
          {false && sub && <p className="mt-2 text-xs font-bold opacity-70">{sub}</p>}
        </div>

        <div className={cls('grid h-11 w-11 shrink-0 place-items-center rounded-2xl border bg-slate-950/55', toneInfo.soft)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
}

function HallTopHeaders({ data, activeTab, onTabChange }) {
  const leaderboardRows = data.rows;

  const bestKd = [...leaderboardRows]
    .filter((player) => player.kills >= 5)
    .sort((a, b) => b.kd - a.kd || compareChronology(a, b))[0];

  const topStreak = [...leaderboardRows]
    .sort((a, b) => b.streak - a.streak || compareChronology(a, b))[0];

  const totalEligibleKills = leaderboardRows.reduce((sum, player) => sum + player.kills, 0);
  const totalEligibleDamage = leaderboardRows.reduce((sum, player) => sum + player.damageDealt, 0);

  return (
    <header className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5">
      <div className="grid gap-3 md:grid-cols-4">
        <HallHeaderCard
          icon={Swords}
          title="Kills"
          value={shortNum(totalEligibleKills)}
          sub={`Min ${MIN_HALL_WARS} wars`}
          tone="blueRoyal"
          active={activeTab === 'kills'}
          onClick={() => onTabChange('kills')}
        />

        <HallHeaderCard
          icon={Target}
          title="Highlights"
          value={bestKd ? bestKd.kd.toFixed(2) : '0.00'}
          sub={topStreak ? `Best K/D · Streak ${shortNum(topStreak.streak)}` : 'Best K/D · Streak'}
          tone="greenDeep"
          active={activeTab === 'highlights'}
          onClick={() => onTabChange('highlights')}
        />

        <HallHeaderCard
          icon={BarChart3}
          title="Damage"
          value={shortNum(totalEligibleDamage)}
          sub={`Min ${MIN_HALL_WARS} wars`}
          tone="yellowGold"
          active={activeTab === 'damage'}
          onClick={() => onTabChange('damage')}
        />

        <HallHeaderCard
          icon={CalendarDays}
          title="Node Wars"
          value={shortNum(data.totals.wars)}
          sub={`Min ${MIN_HALL_WARS} wars`}
          tone="redDeep"
          active={activeTab === 'nodeWars'}
          onClick={() => onTabChange('nodeWars')}
        />
      </div>
    </header>
  );
}

function CombatOutputPanel({ data }) {
  const topTotalKills = [...data.rows]
    .filter((player) => player.kills > 0)
    .sort((a, b) => b.kills - a.kills || compareChronology(a, b))
    .slice(0, 10);

  const topAverageKills = [...data.rows]
    .filter(
      (player) =>
        Number(player.avgKillsMatchCount) > 0 &&
        Number.isFinite(Number(player.avgKillsPerMatch)),
    )
    .sort(
      (a, b) =>
        b.avgKillsPerMatch - a.avgKillsPerMatch ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const topFraggers = [...data.rows]
    .filter(
      (player) =>
        Number(player.avgKillsMatchCount) > 0 &&
        player.maxMatchKills > 0,
    )
    .sort((a, b) => b.maxMatchKills - a.maxMatchKills || compareChronology(a, b))
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
                tone="blueDark"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible players with at least 50 wars yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">AVG Kills</p>
          {topAverageKills.length ? (
            topAverageKills.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.avgKillsPerMatch}
                max={maxAverageKills}
                right={player.avgKillsPerMatch.toFixed(2)}
                tone="blueRoyal"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible players with at least 50 wars yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Top Fraggers</p>
          {topFraggers.length ? (
            topFraggers.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.maxMatchKills}
                max={maxSingleMatchKills}
                right={shortNum(player.maxMatchKills)}
                tone="blueSky"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible players with at least 50 wars yet.</p>
          )}
        </div>
      </div>
    </PremiumPanel>
  );
}

function CombatRecordsPanel({ data }) {
  const topAverageKd = [...data.rows]
    .filter(
      (player) =>
        Number(player.avgKdMatchCount) > 0 &&
        Number.isFinite(Number(player.avgKdPerMatch)),
    )
    .sort(
      (a, b) =>
        b.avgKdPerMatch - a.avgKdPerMatch ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const topHighestMatchKd = [...data.rows]
    .filter(
      (player) =>
        Number(player.maxMatchKd) > 0 &&
        Number.isFinite(Number(player.maxMatchKd)),
    )
    .sort(
      (a, b) =>
        b.maxMatchKd - a.maxMatchKd ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const topAverageRank = [...data.rows]
    .filter(
      (player) =>
        Number(player.averageRankMatchCount) > 0 &&
        Number.isFinite(Number(player.averageRank)),
    )
    .sort(
      (a, b) =>
        a.averageRank - b.averageRank ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const topStreaks = [...data.rows]
    .filter((player) => player.streak > 0)
    .sort((a, b) => b.streak - a.streak || compareChronology(a, b))
    .slice(0, 10);

  const topFeeds = [...data.rows]
    .filter((player) => player.feed > 0)
    .sort((a, b) => b.feed - a.feed || compareChronology(a, b))
    .slice(0, 10);

  const topFiftyPlusKillWars = [...data.rows]
    .filter(
      (player) =>
        Number(player.fiftyPlusKillWars) > 0,
    )
    .sort(
      (a, b) =>
        b.fiftyPlusKillWars - a.fiftyPlusKillWars ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const maxAverageKd = Math.max(1, ...topAverageKd.map((player) => player.avgKdPerMatch));
  const maxHighestMatchKd = Math.max(1, ...topHighestMatchKd.map((player) => player.maxMatchKd));
  const maxAverageRank = Math.max(1, ...topAverageRank.map((player) => player.averageRank));
  const maxStreak = Math.max(1, ...topStreaks.map((player) => player.streak));
  const maxFeed = Math.max(1, ...topFeeds.map((player) => player.feed));
  const maxFiftyPlusKillWars = Math.max(
    1,
    ...topFiftyPlusKillWars.map((player) => player.fiftyPlusKillWars),
  );

  return (
    <PremiumPanel className="p-5">
      <SectionTitle icon={Target} title="Highlights" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Best Average K/D</p>
          {topAverageKd.length ? (
            topAverageKd.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.avgKdPerMatch}
                max={maxAverageKd}
                right={player.avgKdPerMatch.toFixed(2)}
                tone="greenDeep"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible average K/D data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Highest K/D · Single Match</p>
          {topHighestMatchKd.length ? (
            topHighestMatchKd.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.maxMatchKd}
                max={maxHighestMatchKd}
                right={player.maxMatchKd.toFixed(2)}
                tone="greenEmerald"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible single-match K/D data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Best Average Rank · All Wars</p>
          {topAverageRank.length ? (
            topAverageRank.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={Math.max(0.01, maxAverageRank - player.averageRank + 1)}
                max={maxAverageRank}
                right={player.averageRank.toFixed(2)}
                tone="greenMint"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible average rank data yet.</p>
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
                tone="greenLime"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible kill streak data yet.</p>
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
                tone="greenTeal"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible kill feed data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">50+ Kills in Wars</p>
          {topFiftyPlusKillWars.length ? (
            topFiftyPlusKillWars.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.fiftyPlusKillWars}
                max={maxFiftyPlusKillWars}
                right={`${shortNum(player.fiftyPlusKillWars)} Wars`}
                tone="greenTeal"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible 50+ kills wars data yet.</p>
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
          First to {threshold} Kills
        </p>
        {rows.length ? (
          rows.map((row, index) => (
            <HallProgressRow
              key={`${threshold}-first-${row.name}`}
              label={`${index + 1}. ${row.name}`}
              value={Math.max(1, maxValue - row.fromFirstLogWars + 1)}
              max={maxValue}
              right={row.date || '-'}
              tone="blueIndigo"
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
          Fastest to {threshold} Kills
        </p>
        {rows.length ? (
          rows.map((row, index) => (
            <HallProgressRow
              key={`${threshold}-fastest-${row.name}`}
              label={`${index + 1}. ${row.name}`}
              value={Math.max(1, maxValue - row.fromPlayerFirstLogWars + 1)}
              max={maxValue}
              right={`${row.fromPlayerFirstLogWars} Node Wars`}
              tone="blueIce"
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

function DamageRecordsPanel({ data }) {
  const topSingleGameDamageDealt = [...data.rows]
    .filter((player) => player.maxMatchDamageDealt > 0)
    .sort(
      (a, b) =>
        b.maxMatchDamageDealt - a.maxMatchDamageDealt ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const topAverageDamageDealt = [...data.rows]
    .filter(
      (player) =>
        Number(player.avgDamageDealtMatchCount) > 0 &&
        Number.isFinite(Number(player.avgDamageDealtPerMatch)),
    )
    .sort(
      (a, b) =>
        b.avgDamageDealtPerMatch - a.avgDamageDealtPerMatch ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const topSingleGameFortDamage = [...data.rows]
    .filter((player) => player.maxMatchFortDamage > 0)
    .sort(
      (a, b) =>
        b.maxMatchFortDamage - a.maxMatchFortDamage ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const topSingleGameCcHits = [...data.rows]
    .filter((player) => player.maxMatchCcHits > 0)
    .sort(
      (a, b) =>
        b.maxMatchCcHits - a.maxMatchCcHits ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const topAverageCcHits = [...data.rows]
    .filter(
      (player) =>
        Number(player.avgCcHitsMatchCount) > 0 &&
        Number.isFinite(Number(player.avgCcHitsPerMatch)),
    )
    .sort(
      (a, b) =>
        b.avgCcHitsPerMatch - a.avgCcHitsPerMatch ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const maxSingleGameDamageDealt = Math.max(1, ...topSingleGameDamageDealt.map((player) => player.maxMatchDamageDealt));
  const maxAverageDamageDealt = Math.max(1, ...topAverageDamageDealt.map((player) => player.avgDamageDealtPerMatch));
  const maxSingleGameFortDamage = Math.max(1, ...topSingleGameFortDamage.map((player) => player.maxMatchFortDamage));
  const maxSingleGameCcHits = Math.max(1, ...topSingleGameCcHits.map((player) => player.maxMatchCcHits));
  const maxAverageCcHits = Math.max(1, ...topAverageCcHits.map((player) => player.avgCcHitsPerMatch));

  return (
    <PremiumPanel className="p-5">
      <SectionTitle icon={BarChart3} title="Damage" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">DMG Dealt in 1 Game</p>
          {topSingleGameDamageDealt.length ? (
            topSingleGameDamageDealt.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.maxMatchDamageDealt}
                max={maxSingleGameDamageDealt}
                right={shortNum(player.maxMatchDamageDealt)}
                tone="yellowGold"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible single-game damage dealt data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Average DMG Dealt</p>
          {topAverageDamageDealt.length ? (
            topAverageDamageDealt.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.avgDamageDealtPerMatch}
                max={maxAverageDamageDealt}
                right={shortNum(player.avgDamageDealtPerMatch)}
                tone="yellowAmber"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible average damage dealt data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Fort Damage in 1 Game</p>
          {topSingleGameFortDamage.length ? (
            topSingleGameFortDamage.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.maxMatchFortDamage}
                max={maxSingleGameFortDamage}
                right={shortNum(player.maxMatchFortDamage)}
                tone="yellowLemon"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible single-game fort damage data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Most CC Hits in 1 Game</p>
          {topSingleGameCcHits.length ? (
            topSingleGameCcHits.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.maxMatchCcHits}
                max={maxSingleGameCcHits}
                right={shortNum(player.maxMatchCcHits)}
                tone="yellowHoney"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible single-game CC hits data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Average CC Hits</p>
          {topAverageCcHits.length ? (
            topAverageCcHits.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.avgCcHitsPerMatch}
                max={maxAverageCcHits}
                right={player.avgCcHitsPerMatch.toFixed(1).replace(/\.0$/, '')}
                tone="yellowSand"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible average CC hits data yet.</p>
          )}
        </div>
      </div>
    </PremiumPanel>
  );
}

function NodeWarsRecordsPanel({ data }) {
  const topMostNodeWars = [...data.rows]
    .filter((player) => player.wars > 0)
    .sort((a, b) => b.wars - a.wars || compareChronology(a, b))
    .slice(0, 10);

  const topJoinParticipation = [...data.rows]
    .filter((player) => player.wars > 0)
    .sort(
      (a, b) =>
        b.joinParticipation - a.joinParticipation ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const topConsecutiveWars = [...data.rows]
    .filter((player) => player.consecutiveWars > 0)
    .sort(
      (a, b) =>
        b.consecutiveWars - a.consecutiveWars ||
        compareChronology(a, b),
    )
    .slice(0, 10);

  const maxNodeWars = Math.max(1, ...topMostNodeWars.map((player) => player.wars));
  const maxJoinParticipation = Math.max(1, ...topJoinParticipation.map((player) => player.joinParticipation));
  const maxConsecutiveWars = Math.max(1, ...topConsecutiveWars.map((player) => player.consecutiveWars));

  return (
    <PremiumPanel className="p-5">
      <SectionTitle icon={CalendarDays} title="Node Wars" />
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Most Node Wars</p>
          {topMostNodeWars.length ? (
            topMostNodeWars.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.wars}
                max={maxNodeWars}
                right={shortNum(player.wars)}
                tone="redDeep"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible Node Wars data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Highest Join Participation</p>
          {topJoinParticipation.length ? (
            topJoinParticipation.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.joinParticipation}
                max={maxJoinParticipation}
                right={`${player.joinParticipation.toFixed(1).replace(/\.0$/, '')}%`}
                tone="redCrimson"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible participation data yet.</p>
          )}
        </div>

        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Most Consecutive Matches</p>
          {topConsecutiveWars.length ? (
            topConsecutiveWars.map((player, index) => (
              <HallProgressRow
                key={player.name}
                label={`${index + 1}. ${player.name}`}
                value={player.consecutiveWars}
                max={maxConsecutiveWars}
                right={shortNum(player.consecutiveWars)}
                tone="redRose"
              />
            ))
          ) : (
            <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">No eligible consecutive match data yet.</p>
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
      ) : activeTab === 'damage' ? (
        <DamageRecordsPanel data={data} />
      ) : activeTab === 'nodeWars' ? (
        <NodeWarsRecordsPanel data={data} />
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
  const data = useMemo(
    () =>
      buildHallData(
        allTimeStats?.players?.length ? allTimeStats : stats,
        MIN_HALL_WARS,
      ),
    [stats, allTimeStats],
  );

  if (previewMode) return <PreviewAll data={buildHallData(demoStats, 0)} />;
  if (!data.rows.length) return <EmptyState />;

  return (
    <PageFrame>
      <Variant1 data={data} />
    </PageFrame>
  );
}
