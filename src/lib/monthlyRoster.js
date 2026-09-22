import { apiDeleteLog, apiGet, apiWrite, logsPath } from './api';

export const MONTHLY_ROSTER_STORAGE_KEY = 'adversary_monthly_roster_v1';
export const MONTHLY_ROSTER_LOG_NAME = '__ADVERSARY_MONTHLY_ROSTER__';
export const MONTHLY_ROSTER_LOG_DATE = '1900-01-01';
const MONTHLY_ROSTER_LOG_ID = 'adversary-monthly-roster-v1';
const MONTHLY_ROSTER_LOG_NAME_PREFIX = `${MONTHLY_ROSTER_LOG_NAME}:`;
const MONTHLY_ROSTER_LOG_ID_PREFIX = `${MONTHLY_ROSTER_LOG_ID}-`;
const MONTHLY_ROSTER_MARKER = '===== ADVERSARY_MONTHLY_ROSTER_V1 =====';

export const DEFAULT_GUILD_ROSTER = Object.freeze([
  'TwinDsclplNs',
  'Kacp12',
  'Revekk',
  'GamblingProblem',
  'Paddies',
  'Challenger_ADC',
  'Exolvuntur',
  'MrOutlAw',
  'SpeedDrawFenix',
  'Dante_Senpai',
  'Raizel',
  'AesirKing',
  'ARC',
  'Unavailable',
  'IllIlllIllIlllIl',
  'Winterious',
  'Gorz',
  'Nkys',
  'Form',
  'Emphonia',
  'MrsRaccoon',
  'SexyCupquake',
  'FarewelI',
  'CelestialElixir',
  'TaeHeeBaek',
  'Bolides',
  'Baskona',
  'Sarres',
  'Alexvale',
  'Bertoweed',
  'Facetasm',
  'Askild',
  'Bazu19',
  'Reader',
  'Honors',
  'JustSkel',
  'Staier',
  'Eviria',
  'Fweeky',
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
  'QSA',
  'Telvanis',
  'XscarX',
  'INoGameNoLife',
  'RXJ',
  'ItsPretense',
  'SirNicholas',
  'TheMidgets',
  'Deathscyv1',
  'Skilacci',
  'Ain',
  'Echoe',
  'AiryRyu',
  'TheChills',
  'FartedNervously',
  'Ferz',
  'Attack',
  'Protect',
  'Shizzai',
  'Buenaa',
  'McPero'
]);

export function normalizeMonthlyRosterKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function sanitizeMonthlyRoster(values) {
  const seen = new Set();

  return (Array.isArray(values) ? values : [])
    .map((value) =>
      typeof value === 'string'
        ? value.trim()
        : String(value?.name || value?.player || '').trim(),
    )
    .filter((name) => {
      if (!name) return false;
      const key = normalizeMonthlyRosterKey(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function rosterArrayFromApi(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.logs)) return data.logs;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function sourceId(log) {
  return (
    log?.id ??
    log?._id ??
    log?.log_id ??
    log?.key ??
    log?.objectKey ??
    log?.filename ??
    log?.fileName ??
    log?.path ??
    log?.slug ??
    null
  );
}

export function isMonthlyRosterSystemLog(log) {
  if (!log) return false;

  const name = String(log.name ?? log.title ?? '').trim();
  const id = String(sourceId(log) ?? '').trim();
  const raw = String(
    log.raw ?? log.rawLog ?? log.raw_log ?? log.log ?? log.content ?? '',
  );

  return (
    name === MONTHLY_ROSTER_LOG_NAME ||
    name.startsWith(MONTHLY_ROSTER_LOG_NAME_PREFIX) ||
    id === MONTHLY_ROSTER_LOG_ID ||
    id.startsWith(MONTHLY_ROSTER_LOG_ID_PREFIX) ||
    raw.includes(MONTHLY_ROSTER_MARKER)
  );
}

function encodeRosterRaw(values, metadata = {}) {
  const members = sanitizeMonthlyRoster(values);
  return `${MONTHLY_ROSTER_MARKER}\n${JSON.stringify({
    type: 'adversary-monthly-roster',
    version: 1,
    members,
    ...metadata,
  })}`;
}

function decodeRosterRaw(raw) {
  const text = String(raw || '');
  const markerIndex = text.indexOf(MONTHLY_ROSTER_MARKER);

  if (markerIndex < 0) return null;

  const jsonText = text.slice(markerIndex + MONTHLY_ROSTER_MARKER.length).trim();

  try {
    const parsed = JSON.parse(jsonText);
    return Array.isArray(parsed?.members)
      ? sanitizeMonthlyRoster(parsed.members)
      : null;
  } catch {
    return null;
  }
}

function hashText(value) {
  const text = String(value || '');
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `roster-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function readMonthlyRoster() {
  if (typeof window === 'undefined') {
    return [...DEFAULT_GUILD_ROSTER];
  }

  try {
    const raw = window.localStorage.getItem(MONTHLY_ROSTER_STORAGE_KEY);

    if (raw === null) {
      return [...DEFAULT_GUILD_ROSTER];
    }

    const stored = JSON.parse(raw);

    return Array.isArray(stored)
      ? sanitizeMonthlyRoster(stored)
      : [...DEFAULT_GUILD_ROSTER];
  } catch {
    return [...DEFAULT_GUILD_ROSTER];
  }
}

export function writeMonthlyRoster(values) {
  const roster = sanitizeMonthlyRoster(values);

  if (typeof window === 'undefined') return roster;

  try {
    window.localStorage.setItem(
      MONTHLY_ROSTER_STORAGE_KEY,
      JSON.stringify(roster),
    );
    window.dispatchEvent(
      new CustomEvent('adversary-monthly-roster-changed', { detail: roster }),
    );
  } catch {
    // The shared API remains the source of truth even if browser caching fails.
  }

  return roster;
}

function rosterRecordTimestamp(log) {
  const candidates = [
    log?.updatedAt,
    log?.updated_at,
    log?.createdAt,
    log?.created_at,
    log?.created,
  ];

  for (const value of candidates) {
    const parsed = Date.parse(String(value || ''));
    if (Number.isFinite(parsed)) return parsed;
  }

  const name = String(log?.name ?? log?.title ?? '');
  const id = String(sourceId(log) ?? '');
  const revisionMatch = `${name} ${id}`.match(/(?:roster-v1-|ROSTER__:)\s*(\d{10,})/i);

  if (revisionMatch) {
    const numeric = Number(revisionMatch[1]);
    if (Number.isFinite(numeric)) return numeric;
  }

  return 0;
}

async function getSharedRosterRecords() {
  const data = await apiGet(
    logsPath({
      range: 'all',
      includeRaw: 1,
      refresh: Date.now(),
    }),
    { timeoutMs: 30000 },
  );

  return rosterArrayFromApi(data)
    .filter(isMonthlyRosterSystemLog)
    .sort((a, b) => rosterRecordTimestamp(b) - rosterRecordTimestamp(a));
}

async function getSharedRosterRecord() {
  const records = await getSharedRosterRecords();
  return records[0] || null;
}

export async function loadSharedMonthlyRoster(options = {}) {
  const { fallbackToLocal = true } = options;

  try {
    const record = await getSharedRosterRecord();

    if (!record) {
      const fallback = fallbackToLocal
        ? readMonthlyRoster()
        : [...DEFAULT_GUILD_ROSTER];
      return {
        roster: fallback,
        shared: false,
        record: null,
      };
    }

    const raw =
      record.raw ??
      record.rawLog ??
      record.raw_log ??
      record.log ??
      record.content ??
      '';
    const decoded = decodeRosterRaw(raw);

    if (!decoded) {
      throw new Error('Shared roster record is unreadable.');
    }

    return {
      roster: writeMonthlyRoster(decoded),
      shared: true,
      record,
    };
  } catch (error) {
    if (!fallbackToLocal) throw error;

    return {
      roster: readMonthlyRoster(),
      shared: false,
      record: null,
      error,
    };
  }
}

export async function saveSharedMonthlyRoster(values) {
  const roster = sanitizeMonthlyRoster(values);
  const existingRecords = await getSharedRosterRecords();
  const revision = Date.now();
  const revisionToken = `${revision}-${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date(revision).toISOString();
  const raw = encodeRosterRaw(roster, {
    revision,
    updatedAt: createdAt,
  });
  const payload = {
    id: `${MONTHLY_ROSTER_LOG_ID}-${revisionToken}`,
    name: `${MONTHLY_ROSTER_LOG_NAME}:${revisionToken}`,
    date: MONTHLY_ROSTER_LOG_DATE,
    raw,
    hash: hashText(raw),
    createdAt,
    summary: {
      system: true,
      type: 'monthly-roster',
      revision,
      memberCount: roster.length,
    },
  };

  // This backend supports creating and deleting logs, but does not expose a
  // reliable update route. Store each roster edit as a new hidden revision.
  // Creating first prevents a failed cleanup from ever erasing the roster.
  await apiWrite('/api/logs', 'POST', payload, {
    maxAttempts: 5,
    baseDelayMs: 700,
  });

  // Old roster revisions are no longer needed. Cleanup is deliberately
  // best-effort: if a delete route fails, all revisions remain hidden from
  // battle analytics and the newest revision is still used by visitors.
  for (const record of existingRecords) {
    try {
      await apiDeleteLog(record);
    } catch {
      // Keep going; stale system revisions are harmless and stay filtered.
    }
  }

  return writeMonthlyRoster(roster);
}
