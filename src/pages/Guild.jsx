import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Castle,
  Crown,
  Crosshair,
  Database,
  Flame,
  Gauge,
  Medal,
  Radio,
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
  const valueNumber = num(value);
  return valueNumber.toFixed(digits);
}

function percent(value) {
  return `${Math.round(Math.max(0, Math.min(100, num(value))))}%`;
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

function topBy(rows, key, limit = 5) {
  return [...(rows || [])]
    .filter((row) => num(row?.[key]) > 0)
    .sort((a, b) => num(b[key]) - num(a[key]) || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);
}

function buildGuildData(stats, logs) {
  const players = Array.isArray(stats?.players) ? stats.players : [];
  const guilds = Array.isArray(stats?.guilds) ? stats.guilds : [];
  const matches = uniqueLogCount(logs, stats);

  const kills = num(stats?.kills);
  const deaths = num(stats?.deaths);
  const ratio = kd(kills, deaths);
  const totalFights = kills + deaths;
  const winPressure = totalFights ? (kills / totalFights) * 100 : 0;

  const secondaryTotals = stats?.secondary?.totals || {};
  const playerDamageDealt = players.reduce((sum, player) => sum + num(player.damageDealt), 0);
  const playerDamageTaken = players.reduce((sum, player) => sum + num(player.damageTaken), 0);
  const playerCcHits = players.reduce((sum, player) => sum + num(player.ccHits), 0);
  const playerFortDamage = players.reduce((sum, player) => sum + num(player.fortDamage), 0);

  const damageDealt = num(secondaryTotals.damageDealt) || playerDamageDealt;
  const damageTaken = num(secondaryTotals.damageTaken) || playerDamageTaken;
  const ccHits = num(secondaryTotals.ccHits) || playerCcHits;
  const fortDamage = num(secondaryTotals.fortDamage) || playerFortDamage;

  const streakMap = stats?.st || {};
  const feedMap = stats?.fd || {};

  const enrichedPlayers = players.map((player) => {
    const killsNumber = num(player.kills);
    const deathsNumber = num(player.deaths);

    return {
      ...player,
      kills: killsNumber,
      deaths: deathsNumber,
      kd: kd(killsNumber, deathsNumber),
      streak: Math.max(num(player.killStreak), num(streakMap[player.name])),
      feed: num(feedMap[player.name]),
      damageDealt: num(player.damageDealt),
      damageTaken: num(player.damageTaken),
      ccHits: num(player.ccHits),
      fortDamage: num(player.fortDamage),
      score: Math.round(
        killsNumber * 6 +
          kd(killsNumber, deathsNumber) * 90 +
          Math.max(num(player.killStreak), num(streakMap[player.name])) * 35 +
          num(feedMap[player.name]) * 45 +
          num(player.damageDealt) / 2_000_000 +
          num(player.fortDamage) / 1_000_000 +
          num(player.ccHits) * 8 -
          deathsNumber * 3,
      ),
    };
  });

  const enemies = guilds
    .map((guild) => {
      const guildKills = num(guild.kills);
      const guildDeaths = num(guild.deaths);
      const interactions = guildKills + guildDeaths;

      return {
        ...guild,
        kills: guildKills,
        deaths: guildDeaths,
        kd: kd(guildKills, guildDeaths),
        interactions,
      };
    })
    .sort((a, b) => b.interactions - a.interactions || a.name.localeCompare(b.name));

  const topKiller = topBy(enrichedPlayers, 'kills', 1)[0];
  const topDamage = topBy(enrichedPlayers, 'damageDealt', 1)[0];
  const topFort = topBy(enrichedPlayers, 'fortDamage', 1)[0];
  const topCc = topBy(enrichedPlayers, 'ccHits', 1)[0];
  const topStreak = topBy(enrichedPlayers, 'streak', 1)[0];
  const topFeed = topBy(enrichedPlayers, 'feed', 1)[0];
  const bestKd = [...enrichedPlayers]
    .filter((player) => player.kills >= 5)
    .sort((a, b) => b.kd - a.kd || b.kills - a.kills)[0];

  const totalScore = Math.max(
    0,
    Math.round(kills * 7 + ratio * 800 + damageDealt / 1_000_000 + fortDamage / 700_000 + ccHits * 12 - deaths * 2),
  );

  return {
    matches,
    kills,
    deaths,
    kd: ratio,
    totalFights,
    winPressure,
    players: enrichedPlayers,
    enemies,
    activePlayers: enrichedPlayers.length,
    enemyGuilds: enemies.length,
    damageDealt,
    damageTaken,
    ccHits,
    fortDamage,
    totalScore,
    avgKills: matches ? kills / matches : 0,
    avgDeaths: matches ? deaths / matches : 0,
    avgDamage: matches ? damageDealt / matches : 0,
    avgFortDamage: matches ? fortDamage / matches : 0,
    damagePerKill: kills ? damageDealt / kills : 0,
    takenPerDeath: deaths ? damageTaken / deaths : 0,
    topKiller,
    bestKd,
    topDamage,
    topFort,
    topCc,
    topStreak,
    topFeed,
    topPlayers: [...enrichedPlayers].sort((a, b) => b.score - a.score || b.kills - a.kills).slice(0, 8),
    topKillers: topBy(enrichedPlayers, 'kills', 6),
    topDamagePlayers: topBy(enrichedPlayers, 'damageDealt', 6),
    topEnemies: enemies.slice(0, 8),
  };
}

function VersionPicker({ value, onChange }) {
  const versions = [
    ['command', 'V1 Command'],
    ['warroom', 'V2 War Room'],
    ['arsenal', 'V3 Arsenal'],
    ['matrix', 'V4 Matrix'],
    ['compact', 'V5 Compact'],
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {versions.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cls(
            'rounded-xl border px-3 py-2 text-xs font-black transition',
            value === id
              ? 'border-blue-300/60 bg-blue-500/20 text-blue-100 shadow-[0_0_26px_rgba(59,130,246,.18)]'
              : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-100',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PageHeader({ version, setVersion }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-4 rounded-[30px] border border-slate-800 bg-slate-950/70 p-5 shadow-2xl sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.32em] text-blue-300">Guild</p>
        <h2 className="text-3xl font-black text-white sm:text-4xl">Total Guild Statistics</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          All-time overview calculated from saved battle logs, players, enemy guilds and secondary manual stats.
        </p>
      </div>

      <VersionPicker value={version} onChange={setVersion} />
    </div>
  );
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

function MetricCard({ icon: Icon, label, value, sub, tone = 'blue', large = false }) {
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
          <p className={cls('mt-2 font-black text-white', large ? 'text-5xl' : 'text-3xl')}>{value}</p>
          {sub && <p className="mt-1 text-xs font-bold text-slate-400">{sub}</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
          <Icon size={large ? 30 : 22} />
        </div>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, max, right, tone = 'blue' }) {
  const width = max ? Math.max(5, Math.min(100, (num(value) / max) * 100)) : 0;
  const colors = {
    blue: 'from-blue-500 to-cyan-300',
    emerald: 'from-emerald-500 to-lime-300',
    rose: 'from-rose-500 to-pink-300',
    violet: 'from-violet-500 to-fuchsia-300',
    amber: 'from-amber-500 to-yellow-300',
  };

  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs font-black">
        <span className="truncate text-slate-200">{label}</span>
        <span className="shrink-0 text-slate-400">{right ?? compact(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800/80">
        <div className={cls('h-2 rounded-full bg-gradient-to-r', colors[tone])} style={{ width: `${width}%` }} />
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

function SpotlightPlayer({ title, player, value, icon: Icon, tone = 'blue' }) {
  const iconTone = {
    blue: 'text-blue-300',
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
    violet: 'text-violet-300',
    amber: 'text-amber-300',
    cyan: 'text-cyan-300',
  }[tone] || 'text-blue-300';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
        <Icon size={18} className={iconTone} />
      </div>
      <p className="truncate text-lg font-black text-white">{player?.name || '-'}</p>
      <p className="mt-1 text-2xl font-black text-blue-200">{value}</p>
    </div>
  );
}

function CommandCenter({ data }) {
  const maxEnemy = Math.max(1, ...data.topEnemies.map((enemy) => enemy.interactions));
  const maxPlayer = Math.max(1, ...data.topPlayers.map((player) => player.score));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Swords} label="Total Kills" value={compact(data.kills)} sub={`${compact(data.avgKills)} avg / match`} tone="emerald" large />
        <MetricCard icon={Skull} label="Total Deaths" value={compact(data.deaths)} sub={`${compact(data.avgDeaths)} avg / match`} tone="rose" large />
        <MetricCard icon={Gauge} label="Guild K/D" value={decimal(data.kd)} sub={`${percent(data.winPressure)} kill pressure`} tone="blue" large />
        <MetricCard icon={Trophy} label="Guild Score" value={compact(data.totalScore)} sub={`${data.matches} saved matches`} tone="violet" large />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Panel>
          <SectionTitle icon={Crown} title="Command Center" sub="Best performers by all-time contribution" />
          <div className="grid gap-4 md:grid-cols-3">
            <SpotlightPlayer title="Top Fragger" player={data.topKiller} value={compact(data.topKiller?.kills)} icon={Swords} tone="emerald" />
            <SpotlightPlayer title="Best K/D" player={data.bestKd} value={decimal(data.bestKd?.kd)} icon={Target} tone="blue" />
            <SpotlightPlayer title="Top Damage" player={data.topDamage} value={compact(data.topDamage?.damageDealt)} icon={Zap} tone="amber" />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Top Guild Members</p>
              {data.topPlayers.slice(0, 6).map((player, index) => (
                <ProgressRow
                  key={player.name}
                  label={`${index + 1}. ${player.name}`}
                  value={player.score}
                  max={maxPlayer}
                  right={compact(player.score)}
                  tone="blue"
                />
              ))}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Enemy Pressure</p>
              {data.topEnemies.slice(0, 6).map((enemy) => (
                <ProgressRow
                  key={enemy.name}
                  label={enemy.name}
                  value={enemy.interactions}
                  max={maxEnemy}
                  right={`${compact(enemy.kills)}/${compact(enemy.deaths)}`}
                  tone="rose"
                />
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={BarChart3} title="Secondary Stats" sub="From secondary manual logs" />
          <div className="grid gap-3">
            <MetricCard icon={Zap} label="Damage Dealt" value={compact(data.damageDealt)} sub={`${compact(data.damagePerKill)} per kill`} tone="amber" />
            <MetricCard icon={Shield} label="Damage Taken" value={compact(data.damageTaken)} sub={`${compact(data.takenPerDeath)} per death`} tone="violet" />
            <MetricCard icon={Crosshair} label="CC Hits" value={compact(data.ccHits)} sub="Total crowd control hits" tone="cyan" />
            <MetricCard icon={Castle} label="Fort Damage" value={compact(data.fortDamage)} sub={`${compact(data.avgFortDamage)} avg / match`} tone="emerald" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function RingStat({ label, value, sub, percentValue, icon: Icon }) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-950/80 p-5 text-center shadow-2xl">
      <div
        className="mx-auto mb-4 flex h-32 w-32 items-center justify-center rounded-full p-2"
        style={{
          background: `conic-gradient(rgba(59,130,246,.9) ${percent(percentValue)}, rgba(30,41,59,.9) 0)`,
        }}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full border border-slate-800 bg-slate-950">
          <Icon size={34} className="text-blue-200" />
        </div>
      </div>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">{sub}</p>
    </div>
  );
}

function WarRoom({ data }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <Panel className="overflow-hidden">
        <div className="relative">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-300">War Room</p>
            <h3 className="mt-2 text-5xl font-black text-white">{decimal(data.kd)}</h3>
            <p className="mt-2 text-sm font-bold text-slate-400">All-time guild K/D ratio</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <RingStat label="Kill Pressure" value={percent(data.winPressure)} sub={`${compact(data.kills)} eliminations`} percentValue={data.winPressure} icon={Swords} />
              <RingStat label="Roster Depth" value={data.activePlayers} sub="Tracked players" percentValue={Math.min(100, data.activePlayers * 4)} icon={Users} />
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={Database} label="Matches" value={data.matches} sub="Saved wars" tone="blue" />
          <MetricCard icon={Users} label="Players" value={data.activePlayers} sub="In guild stats" tone="violet" />
          <MetricCard icon={Shield} label="Enemies" value={data.enemyGuilds} sub="Enemy guilds" tone="rose" />
          <MetricCard icon={Sparkles} label="Score" value={compact(data.totalScore)} sub="Guild rating" tone="amber" />
        </div>

        <Panel>
          <SectionTitle icon={Medal} title="Guild Leaders" sub="Best values by category" />
          <div className="grid gap-3 md:grid-cols-2">
            <SpotlightPlayer title="Kills" player={data.topKiller} value={compact(data.topKiller?.kills)} icon={Swords} tone="emerald" />
            <SpotlightPlayer title="Killfeed" player={data.topFeed} value={compact(data.topFeed?.feed)} icon={Flame} tone="amber" />
            <SpotlightPlayer title="CC Hits" player={data.topCc} value={compact(data.topCc?.ccHits)} icon={Crosshair} tone="cyan" />
            <SpotlightPlayer title="Fort Damage" player={data.topFort} value={compact(data.topFort?.fortDamage)} icon={Castle} tone="violet" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Arsenal({ data }) {
  const maxKills = Math.max(1, ...data.topKillers.map((player) => player.kills));
  const maxDamage = Math.max(1, ...data.topDamagePlayers.map((player) => player.damageDealt));

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

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <SectionTitle icon={Radio} title="Arsenal Output" sub="Kills and damage leaders" />
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Kill Leaders</p>
              {data.topKillers.map((player, index) => (
                <ProgressRow key={player.name} label={`${index + 1}. ${player.name}`} value={player.kills} max={maxKills} right={compact(player.kills)} tone="emerald" />
              ))}
            </div>

            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Damage Leaders</p>
              {data.topDamagePlayers.map((player, index) => (
                <ProgressRow key={player.name} label={`${index + 1}. ${player.name}`} value={player.damageDealt} max={maxDamage} right={compact(player.damageDealt)} tone="amber" />
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={Activity} title="Averages" sub="Per saved match" />
          <div className="space-y-3">
            <MetricCard icon={Swords} label="Avg Kills" value={compact(data.avgKills)} sub="Per match" tone="emerald" />
            <MetricCard icon={Skull} label="Avg Deaths" value={compact(data.avgDeaths)} sub="Per match" tone="rose" />
            <MetricCard icon={Zap} label="Avg Damage" value={compact(data.avgDamage)} sub="Per match" tone="amber" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MatrixRow({ label, value, detail, icon: Icon }) {
  return (
    <div className="grid grid-cols-[42px_1fr_auto] items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">{label}</p>
        <p className="text-xs font-bold text-slate-500">{detail}</p>
      </div>
      <p className="text-right text-xl font-black text-slate-100">{value}</p>
    </div>
  );
}

function Matrix({ data }) {
  const matrix = [
    ['Matches', data.matches, 'Total saved wars', Database],
    ['Players', data.activePlayers, 'Tracked members', Users],
    ['Enemy Guilds', data.enemyGuilds, 'Guilds interacted with', Shield],
    ['Kills', compact(data.kills), 'Total eliminations', Swords],
    ['Deaths', compact(data.deaths), 'Total deaths', Skull],
    ['K/D', decimal(data.kd), 'Kill/death ratio', Gauge],
    ['Damage Dealt', compact(data.damageDealt), 'Secondary manual logs', Zap],
    ['Damage Taken', compact(data.damageTaken), 'Secondary manual logs', Shield],
    ['CC Hits', compact(data.ccHits), 'Secondary manual logs', Crosshair],
    ['Fort Damage', compact(data.fortDamage), 'Total damage to fort', Castle],
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <Panel>
        <SectionTitle icon={BarChart3} title="Tactical Matrix" sub="Every total in one clean command table" />
        <div className="grid gap-3 md:grid-cols-2">
          {matrix.map(([label, value, detail, Icon]) => (
            <MatrixRow key={label} label={label} value={value} detail={detail} icon={Icon} />
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle icon={Trophy} title="Top 8 Scoreboard" sub="Combined guild contribution score" />
        <div className="space-y-3">
          {data.topPlayers.map((player, index) => (
            <div key={player.name} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/45 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-sm font-black text-blue-200">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{player.name}</p>
                <p className="text-xs font-bold text-slate-500">{compact(player.kills)} K / {compact(player.deaths)} D / {decimal(player.kd)} K/D</p>
              </div>
              <b className="text-right text-blue-200">{compact(player.score)}</b>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Compact({ data }) {
  const cards = [
    [Swords, 'Kills', compact(data.kills), 'emerald'],
    [Skull, 'Deaths', compact(data.deaths), 'rose'],
    [Gauge, 'K/D', decimal(data.kd), 'blue'],
    [Database, 'Matches', data.matches, 'violet'],
    [Users, 'Players', data.activePlayers, 'cyan'],
    [Shield, 'Enemy Guilds', data.enemyGuilds, 'rose'],
    [Zap, 'Damage Dealt', compact(data.damageDealt), 'amber'],
    [Shield, 'Damage Taken', compact(data.damageTaken), 'violet'],
    [Crosshair, 'CC Hits', compact(data.ccHits), 'cyan'],
    [Castle, 'Fort Damage', compact(data.fortDamage), 'emerald'],
  ];

  return (
    <div className="space-y-5">
      <Panel className="bg-gradient-to-br from-blue-950/40 via-slate-950 to-violet-950/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-300">Compact Guild Console</p>
            <h3 className="mt-2 text-4xl font-black text-white">{compact(data.totalScore)} Score</h3>
            <p className="mt-2 text-sm font-bold text-slate-400">{data.matches} matches · {data.activePlayers} players · {data.enemyGuilds} enemy guilds</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-center">
              <p className="text-xs font-black text-slate-400">AVG KILLS</p>
              <p className="text-2xl font-black text-white">{compact(data.avgKills)}</p>
            </div>
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-center">
              <p className="text-xs font-black text-slate-400">AVG DEATHS</p>
              <p className="text-2xl font-black text-white">{compact(data.avgDeaths)}</p>
            </div>
            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-center">
              <p className="text-xs font-black text-slate-400">PRESSURE</p>
              <p className="text-2xl font-black text-white">{percent(data.winPressure)}</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([Icon, label, value, tone]) => (
          <MetricCard key={label} icon={Icon} label={label} value={value} tone={tone} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel>
          <SectionTitle icon={Medal} title="Best Players" sub="Compact top players" />
          <div className="grid gap-3 sm:grid-cols-2">
            {data.topPlayers.slice(0, 6).map((player, index) => (
              <div key={player.name} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="text-xs font-black text-slate-500">#{index + 1}</p>
                <p className="truncate text-base font-black text-white">{player.name}</p>
                <p className="text-xs font-bold text-slate-400">{compact(player.score)} score · {compact(player.kills)} kills</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle icon={Shield} title="Enemy Guilds" sub="Most interactions" />
          <div className="grid gap-3 sm:grid-cols-2">
            {data.topEnemies.slice(0, 6).map((enemy) => (
              <div key={enemy.name} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
                <p className="truncate text-base font-black text-white">{enemy.name}</p>
                <p className="text-xs font-bold text-slate-400">{compact(enemy.interactions)} interactions · {decimal(enemy.kd)} K/D</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default function Guild({ stats, logs }) {
  const [version, setVersion] = useState('command');
  const data = useMemo(() => buildGuildData(stats || {}, logs || []), [stats, logs]);

  const hasData = data.kills > 0 || data.deaths > 0 || data.activePlayers > 0 || data.matches > 0;

  return (
    <div>
      <PageHeader version={version} setVersion={setVersion} />

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {version === 'command' && <CommandCenter data={data} />}
          {version === 'warroom' && <WarRoom data={data} />}
          {version === 'arsenal' && <Arsenal data={data} />}
          {version === 'matrix' && <Matrix data={data} />}
          {version === 'compact' && <Compact data={data} />}
        </>
      )}
    </div>
  );
}
