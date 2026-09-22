export const MONTHLY_ROSTER_STORAGE_KEY = 'adversary_monthly_roster_v1';

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
  'Kaelt',
  'Ain',
  'Echoe',
  'AiryRyu',
  'TheChills',
  'FartedNervously',
  'Ferz',
  'Attack',
  'Protect',
  'Cabbiie',
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
    // Keep the page usable even if browser storage is unavailable.
  }

  return roster;
}
