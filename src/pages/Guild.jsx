import React, { useMemo } from 'react';
import {
  Activity,
  Castle,
  Crosshair,
  Database,
  Gauge,
  Skull,
  Swords,
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
    </div>
  );
}

export default function Guild({ stats, logs }) {
  const data = useMemo(() => buildGuildData(stats || {}, logs || []), [stats, logs]);

  const hasData = data.kills > 0 || data.deaths > 0 || data.matches > 0;

  return <div>{hasData ? <Arsenal data={data} /> : <EmptyState />}</div>;
}
