import React, { useMemo } from 'react';
import {
  Activity,
  Castle,
  Crosshair,
  Database,
  Gauge,
  Shield,
  Skull,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';

const nf = new Intl.NumberFormat('en-US');

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compact(value, digits = 1) {
  const valueNumber = num(value);
  const abs = Math.abs(valueNumber);

  if (abs >= 1_000_000_000_000) {
    return `${(valueNumber / 1_000_000_000_000).toFixed(digits).replace(/\.0$/, '')}T`;
  }

  if (abs >= 1_000_000_000) {
    return `${(valueNumber / 1_000_000_000).toFixed(digits).replace(/\.0$/, '')}B`;
  }

  if (abs >= 1_000_000) {
    return `${(valueNumber / 1_000_000).toFixed(digits).replace(/\.0$/, '')}M`;
  }

  if (abs >= 1_000) {
    return `${(valueNumber / 1_000).toFixed(digits).replace(/\.0$/, '')}K`;
  }

  return nf.format(Math.round(valueNumber));
}

function decimal(value, digits = 2) {
  return num(value).toFixed(digits);
}

function cls(...items) {
  return items.filter(Boolean).join(' ');
}

function kd(kills, deaths) {
  const deathsNumber = num(deaths);
  if (!deathsNumber) return num(kills);
  return num(kills) / deathsNumber;
}

function uniqueLogCount(logs = [], stats = {}) {
  const fromLogs = new Set(
    (logs || [])
      .map((log) => String(log?.id || log?.date || log?.name || ''))
      .filter(Boolean),
  );

  if (fromLogs.size) return fromLogs.size;

  const fromEvents = new Set(
    (stats?.ev || [])
      .map((event) => String(event?.id || event?.date || ''))
      .filter(Boolean),
  );

  return fromEvents.size;
}

function hasSecondaryTotals(stats = {}) {
  const totals = stats?.secondary?.totals || {};

  return (
    num(totals.damageDealt) > 0 ||
    num(totals.damageTaken) > 0 ||
    num(totals.ccHits) > 0 ||
    num(totals.fortDamage) > 0
  );
}

function uniqueSecondaryLogCount(logs = [], stats = {}) {
  const secondaryRows = Array.isArray(stats?.secondary?.rows)
    ? stats.secondary.rows
    : [];

  const fromRows = new Set(
    secondaryRows
      .map((row, index) =>
        String(row?.id || row?.date || row?.war || row?.logId || index),
      )
      .filter(Boolean),
  );

  if (fromRows.size) return fromRows.size;

  const fromLogs = new Set(
    (logs || [])
      .filter((log) => {
        const raw = String(log?.raw || '');
        const summary = log?.summary || log?.stats || log?.analytics || {};
        const summaryTotals = summary?.secondary?.totals || {};

        return (
          raw.includes('ADVERSARY_SECONDARY_LOG_START') ||
          num(summaryTotals.damageDealt) > 0 ||
          num(summaryTotals.damageTaken) > 0 ||
          num(summaryTotals.ccHits) > 0 ||
          num(summaryTotals.fortDamage) > 0
        );
      })
      .map((log) => String(log?.id || log?.date || log?.name || ''))
      .filter(Boolean),
  );

  if (fromLogs.size) return fromLogs.size;

  return hasSecondaryTotals(stats) ? 1 : 0;
}


function cleanGuildName(value) {
  const text = String(value || '').trim();

  if (!text || /^\d{4}-\d{2}-\d{2}$/.test(text)) return '';

  return text;
}

function getTierByKd(value) {
  const kdNumber = num(value);

  if (kdNumber >= 2) return 'S';
  if (kdNumber >= 1.5) return 'A';
  if (kdNumber >= 1) return 'B';
  if (kdNumber >= 0.75) return 'C';

  return 'D';
}

const enemyTierMeta = {
  S: {
    label: 'S',
    range: '2.00+ K/D',
    className:
      'border-amber-300/35 bg-amber-500/15 text-amber-100 shadow-amber-500/10',
    badge: 'border-amber-300/40 bg-amber-400/20 text-amber-100',
  },
  A: {
    label: 'A',
    range: '1.50 - 1.99 K/D',
    className:
      'border-emerald-300/30 bg-emerald-500/12 text-emerald-100 shadow-emerald-500/10',
    badge: 'border-emerald-300/35 bg-emerald-400/18 text-emerald-100',
  },
  B: {
    label: 'B',
    range: '1.00 - 1.49 K/D',
    className:
      'border-blue-300/25 bg-blue-500/10 text-blue-100 shadow-blue-500/10',
    badge: 'border-blue-300/35 bg-blue-400/15 text-blue-100',
  },
  C: {
    label: 'C',
    range: '0.75 - 0.99 K/D',
    className:
      'border-violet-300/25 bg-violet-500/10 text-violet-100 shadow-violet-500/10',
    badge: 'border-violet-300/35 bg-violet-400/15 text-violet-100',
  },
  D: {
    label: 'D',
    range: '< 0.75 K/D',
    className:
      'border-rose-300/25 bg-rose-500/10 text-rose-100 shadow-rose-500/10',
    badge: 'border-rose-300/35 bg-rose-400/15 text-rose-100',
  },
};

function buildEnemyGuildTiers(stats = {}) {
  const guilds = Array.isArray(stats?.guilds) ? stats.guilds : [];
  const events = Array.isArray(stats?.ev) ? stats.ev : [];
  const guildMatches = {};

  events.forEach((event) => {
    const guildName = cleanGuildName(event?.guild);

    if (!guildName) return;

    guildMatches[guildName] ||= new Set();
    guildMatches[guildName].add(
      String(event?.id || event?.war || event?.date || `${event?.date || ''}-${event?.time || ''}`),
    );
  });

  const rows = guilds
    .map((guild) => {
      const name = cleanGuildName(guild?.name);
      const kills = num(guild?.deaths);
      const deaths = num(guild?.kills);
      const totalInteractions = kills + deaths;
      const kdNumber = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
      const matches = Math.max(
        1,
        guildMatches[name]?.size ||
          num(guild?.matches) ||
          num(guild?.wars) ||
          num(guild?.totalMatches) ||
          0,
      );
      const tier = getTierByKd(kdNumber);

      return {
        name,
        kills,
        deaths,
        totalInteractions,
        kdNumber,
        matches,
        tier,
      };
    })
    .filter((guild) => guild.name && guild.totalInteractions > 0)
    .sort(
      (a, b) =>
        b.kdNumber - a.kdNumber ||
        b.totalInteractions - a.totalInteractions ||
        a.name.localeCompare(b.name),
    );

  return ['S', 'A', 'B', 'C', 'D'].map((tier) => ({
    tier,
    meta: enemyTierMeta[tier],
    guilds: rows.filter((guild) => guild.tier === tier),
  }));
}

function topBy(rows, key, limit = 6) {
  return [...(rows || [])]
    .filter((row) => num(row?.[key]) > 0)
    .sort((a, b) => num(b[key]) - num(a[key]) || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);
}

function buildGuildData(stats, logs) {
  const players = Array.isArray(stats?.players) ? stats.players : [];
  const matches = uniqueLogCount(logs, stats);
  const secondaryMatches = uniqueSecondaryLogCount(logs, stats);
  const secondaryAverageMatches = secondaryMatches || matches;

  const kills = num(stats?.kills);
  const deaths = num(stats?.deaths);
  const ratio = kd(kills, deaths);

  const secondaryTotals = stats?.secondary?.totals || {};
  const playerDamageDealt = players.reduce((sum, player) => sum + num(player.damageDealt), 0);
  const playerDamageTaken = players.reduce((sum, player) => sum + num(player.damageTaken), 0);
  const playerCcHits = players.reduce((sum, player) => sum + num(player.ccHits), 0);
  const playerFortDamage = players.reduce((sum, player) => sum + num(player.fortDamage), 0);

  const damageDealt = num(secondaryTotals.damageDealt) || playerDamageDealt;
  const damageTaken = num(secondaryTotals.damageTaken) || playerDamageTaken;
  const ccHits = num(secondaryTotals.ccHits) || playerCcHits;
  const fortDamage = num(secondaryTotals.fortDamage) || playerFortDamage;

  const enrichedPlayers = players.map((player) => {
    const killsNumber = num(player.kills);
    const deathsNumber = num(player.deaths);

    return {
      ...player,
      kills: killsNumber,
      deaths: deathsNumber,
      kd: kd(killsNumber, deathsNumber),
      damageDealt: num(player.damageDealt),
      damageTaken: num(player.damageTaken),
      ccHits: num(player.ccHits),
      fortDamage: num(player.fortDamage),
    };
  });

  return {
    matches,
    kills,
    deaths,
    kd: ratio,
    damageDealt,
    damageTaken,
    ccHits,
    fortDamage,
    avgKills: matches ? kills / matches : 0,
    avgDeaths: matches ? deaths / matches : 0,
    avgDamage: secondaryAverageMatches ? damageDealt / secondaryAverageMatches : 0,
    avgFortDamage: secondaryAverageMatches ? fortDamage / secondaryAverageMatches : 0,
    topKillers: topBy(enrichedPlayers, 'kills', 6),
    topDamagePlayers: topBy(enrichedPlayers, 'damageDealt', 6),
    enemyTierGroups: buildEnemyGuildTiers(stats),
  };
}

function EmptyState() {
  return (
    <div className="rounded-[32px] border border-slate-800 bg-slate-950/70 p-8 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
        <Database size={30} />
      </div>
      <h3 className="text-2xl font-black text-white">No guild data yet</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
        Save battle logs first, then this Guild tab will generate all-time statistics automatically.
      </p>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, tone = 'blue' }) {
  const tones = {
    blue: 'border-blue-400/20 bg-blue-500/10 text-blue-200 shadow-blue-500/10',
    emerald: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200 shadow-emerald-500/10',
    rose: 'border-rose-400/20 bg-rose-500/10 text-rose-200 shadow-rose-500/10',
    violet: 'border-violet-400/20 bg-violet-500/10 text-violet-200 shadow-violet-500/10',
    amber: 'border-amber-400/20 bg-amber-500/10 text-amber-200 shadow-amber-500/10',
    cyan: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200 shadow-cyan-500/10',
  };

  return (
    <div className={cls('rounded-[26px] border p-4 shadow-2xl', tones[tone])}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
          {sub && <p className="mt-1 text-xs font-bold text-slate-400">{sub}</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Panel({ children, className = '' }) {
  return (
    <section className={cls('rounded-[30px] border border-slate-800 bg-slate-950/70 p-5 shadow-2xl', className)}>
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, sub }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-xl font-black text-white">
          <Icon size={20} className="text-blue-300" />
          {title}
        </h3>
        {sub && <p className="mt-1 text-xs font-bold text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}


function EnemyGuildTierCard({ guild }) {
  return (
    <div className="group min-w-[190px] flex-1 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-xl transition hover:border-blue-400/35 hover:bg-slate-900/90">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-black text-white" title={guild.name}>
          {guild.name}
        </p>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black text-slate-300">
          {decimal(guild.kdNumber)} K/D
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-emerald-400/10 bg-emerald-500/10 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-emerald-300/80">Kills</p>
          <p className="text-sm font-black text-emerald-100">{compact(guild.kills)}</p>
        </div>
        <div className="rounded-xl border border-rose-400/10 bg-rose-500/10 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-rose-300/80">Deaths</p>
          <p className="text-sm font-black text-rose-100">{compact(guild.deaths)}</p>
        </div>
        <div className="rounded-xl border border-blue-400/10 bg-blue-500/10 px-2 py-2">
          <p className="text-[9px] font-black uppercase tracking-wider text-blue-300/80">Matches</p>
          <p className="text-sm font-black text-blue-100">{compact(guild.matches, 0)}</p>
        </div>
      </div>
    </div>
  );
}

function EnemyGuildTierList({ groups }) {
  const hasGuilds = groups.some((group) => group.guilds.length > 0);

  return (
    <Panel>
      <SectionTitle
        icon={Trophy}
        title="Enemy Guild Tier List"
        sub="Based on K/D against each enemy guild"
      />

      {!hasGuilds ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm font-bold text-slate-500">
          No enemy guild data yet.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.tier}
              className={cls(
                'grid gap-3 rounded-[26px] border p-3 shadow-2xl lg:grid-cols-[92px_1fr]',
                group.meta.className,
              )}
            >
              <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:justify-center">
                <div className={cls('flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl font-black', group.meta.badge)}>
                  {group.meta.label}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Tier
                  </p>
                  <p className="text-xs font-bold text-slate-300">{group.meta.range}</p>
                </div>
              </div>

              {group.guilds.length ? (
                <div className="flex flex-wrap gap-3">
                  {group.guilds.map((guild) => (
                    <EnemyGuildTierCard key={guild.name} guild={guild} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[92px] items-center rounded-2xl border border-slate-800 bg-slate-950/45 px-4 text-sm font-bold text-slate-500">
                  No guilds in this tier.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Arsenal({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard icon={Swords} label="Kills" value={compact(data.kills)} sub="All-time" tone="emerald" />
        <MetricCard icon={Skull} label="Deaths" value={compact(data.deaths)} sub="All-time" tone="rose" />
        <MetricCard icon={Gauge} label="K/D" value={decimal(data.kd)} sub="Ratio" tone="blue" />
        <MetricCard icon={Zap} label="Damage" value={compact(data.damageDealt)} sub="Dealt" tone="amber" />
        <MetricCard icon={Crosshair} label="CC" value={compact(data.ccHits)} sub="Hits" tone="cyan" />
        <MetricCard icon={Castle} label="Fort" value={compact(data.fortDamage)} sub="Damage" tone="violet" />
      </div>

      <Panel>
        <SectionTitle icon={Activity} title="Averages" sub="Per saved match" />
        <div className="grid gap-3 md:grid-cols-3">
          <MetricCard icon={Swords} label="Avg Kills" value={compact(data.avgKills)} sub="Per match" tone="emerald" />
          <MetricCard icon={Skull} label="Avg Deaths" value={compact(data.avgDeaths)} sub="Per match" tone="rose" />
          <MetricCard icon={Zap} label="Avg Damage" value={compact(data.avgDamage)} sub="Per match" tone="amber" />
        </div>
      </Panel>

      <EnemyGuildTierList groups={data.enemyTierGroups} />
    </div>
  );
}

export default function Guild({ stats, logs }) {
  const data = useMemo(() => buildGuildData(stats || {}, logs || []), [stats, logs]);

  const hasData = data.kills > 0 || data.deaths > 0 || data.matches > 0;

  return <div>{hasData ? <Arsenal data={data} /> : <EmptyState />}</div>;
}
