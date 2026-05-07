import React, { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  CalendarDays,
  Crown,
  Flame,
  Medal,
  Search,
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
  if (valueNumber >= 1_000_000) return `${(valueNumber / 1_000_000).toFixed(1)}M`;
  if (valueNumber >= 1_000) return `${(valueNumber / 1_000).toFixed(1)}K`;
  return nf.format(valueNumber);
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
  const warsByPlayer = {};

  events.forEach((event) => {
    const id = String(event.id || event.date || 'war');
    if (event.killer) {
      warsByPlayer[event.killer] ||= new Set();
      warsByPlayer[event.killer].add(id);
    }
    if (event.victim) {
      warsByPlayer[event.victim] ||= new Set();
      warsByPlayer[event.victim].add(id);
    }
  });

  const rows = (safe.players || [])
    .map((player) => {
      const kills = num(player.kills);
      const deaths = num(player.deaths);
      const ratio = kd(kills, deaths);
      const streak = num(safe.st?.[player.name]);
      const feed = num(safe.fd?.[player.name]);
      const wars = warsByPlayer[player.name]?.size || 0;
      const score = Math.max(0, Math.round(kills * 3 + ratio * 420 + streak * 90 + feed * 120 + wars * 60 - deaths * 0.7));
      let title = 'Guild Veteran';
      if (kills >= 1000) title = 'Top Fragger';
      if (ratio >= 4) title = 'Best K/D';
      if (streak >= 15) title = 'Clutch King';
      if (feed >= 7) title = 'Killfeed Master';
      if (wars >= 8) title = 'Siege Veteran';

      return { ...player, kills, deaths, kd: ratio, streak, feed, wars, score, title };
    })
    .sort((a, b) => b.score - a.score || b.kills - a.kills || a.name.localeCompare(b.name));

  const totalWars = new Set(events.map((event) => String(event.id || event.date))).size;
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
      else acc[month].kills += 1;
      acc[month].wars.add(String(event.id || event.date));
      return acc;
    }, {}),
  )
    .map((item) => ({ ...item, wars: item.wars.size }))
    .sort((a, b) => b.month.localeCompare(a.month));

  return {
    rows,
    achievements,
    months,
    totals: {
      kills: num(safe.kills) || rows.reduce((sum, row) => sum + row.kills, 0),
      deaths: num(safe.deaths) || rows.reduce((sum, row) => sum + row.deaths, 0),
      kd: num(safe.kd) || kd(num(safe.kills), num(safe.deaths)),
      players: rows.length,
      wars: totalWars,
      score: rows.reduce((sum, row) => sum + row.score, 0),
    },
  };
}

const toneClasses = {
  amber: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-400/20 bg-rose-500/10 text-rose-300',
  emerald: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  orange: 'border-orange-400/20 bg-orange-500/10 text-orange-300',
  cyan: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-300',
  blue: 'border-blue-400/20 bg-blue-500/10 text-blue-300',
  violet: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
  slate: 'border-slate-800 bg-slate-950/70 text-slate-300',
};

function Avatar({ name, size = 'md' }) {
  const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-lg' };
  return (
    <div className={cls('grid shrink-0 place-items-center rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 via-slate-950 to-blue-950 font-black text-blue-200 shadow-lg', sizes[size])}>
      {initials(name)}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = 'blue' }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/75 p-4 shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-black text-slate-100">{value}</div>
          {sub && <div className="mt-1 text-xs font-bold text-slate-500">{sub}</div>}
        </div>
        <div className={cls('grid h-10 w-10 place-items-center rounded-xl border', toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300">
        <Icon className="h-4 w-4 text-blue-300" />
        {title}
      </h3>
      {action && <button className="text-xs font-black text-blue-300 hover:text-blue-200">{action} →</button>}
    </div>
  );
}

function LegendRow({ row, rank }) {
  return (
    <div className="group grid grid-cols-[42px_1.3fr_.8fr_.55fr_.55fr_.55fr] items-center gap-3 border-b border-slate-900 px-4 py-3 last:border-b-0 hover:bg-slate-900/70">
      <div className={cls('text-lg font-black', rank === 1 ? 'text-amber-300' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-orange-300' : 'text-slate-500')}>#{rank}</div>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={row.name} size="sm" />
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

function Leaderboard({ rows, limit = 8 }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70 shadow-2xl">
      <div className="grid grid-cols-[42px_1.3fr_.8fr_.55fr_.55fr_.55fr] gap-3 border-b border-slate-800 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500">
        <div>#</div>
        <div>Player</div>
        <div>Title</div>
        <div className="text-right">Score</div>
        <div className="text-right">K/D</div>
        <div className="text-right">Kills</div>
      </div>
      {rows.slice(0, limit).map((row, index) => <LegendRow key={row.name} row={row} rank={index + 1} />)}
    </div>
  );
}

function AchievementCard({ item }) {
  const Icon = item.icon;
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4 shadow-xl transition hover:border-blue-400/30 hover:bg-slate-900/80">
      <div className="flex items-start justify-between gap-3">
        <div className={cls('grid h-11 w-11 place-items-center rounded-xl border', toneClasses[item.tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <Sparkles className="h-4 w-4 text-slate-600" />
      </div>
      <div className="mt-4 text-sm font-black text-white">{item.title}</div>
      <div className="mt-1 text-xs font-bold text-slate-500">{item.sub}</div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
        <Avatar name={item.player?.name} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-slate-100">{item.player?.name || '-'}</div>
          <div className="text-xs font-bold text-slate-500">{item.player?.title || 'Legend'}</div>
        </div>
        <div className="text-lg font-black text-blue-200">{item.value}</div>
      </div>
    </div>
  );
}

function TopLegendCard({ row, rank, wide = false }) {
  return (
    <div className={cls('relative overflow-hidden rounded-3xl border p-4 shadow-xl transition hover:-translate-y-0.5', rank === 1 ? 'border-blue-400/35 bg-blue-500/10 shadow-blue-500/10' : 'border-slate-800 bg-slate-950/70', wide && 'md:col-span-2')}>
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <div className={cls('grid h-12 w-12 place-items-center rounded-2xl border text-xl font-black', rank === 1 ? 'border-blue-300/30 bg-blue-500/15 text-blue-200' : 'border-slate-700 bg-slate-900 text-slate-300')}>
          {rank}
        </div>
        <Avatar name={row.name} size="lg" />
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

function HeaderControls({ active, setActive }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-400/25 bg-blue-500/10 text-blue-200 shadow-[0_0_30px_rgba(59,130,246,.12)]">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">Hall of Fame</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">8 variante în stilul Match History: dark, carduri, top players și achievements.</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }, (_, index) => index + 1).map((id) => (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cls(
              'rounded-xl border px-3 py-2 text-xs font-black transition',
              active === id
                ? 'border-blue-400 bg-blue-500/20 text-blue-100 shadow-[0_0_24px_rgba(59,130,246,.16)]'
                : 'border-slate-800 bg-slate-950/80 text-slate-500 hover:border-slate-700 hover:text-slate-300',
            )}
          >
            V{id}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8 text-center shadow-2xl">
      <Trophy className="mx-auto mb-3 h-10 w-10 text-slate-600" />
      <h3 className="text-xl font-black text-white">No Hall of Fame data yet.</h3>
      <p className="mt-2 text-sm font-semibold text-slate-500">Selectează un log, o zi sau All Logs ca să fie calculate statisticile.</p>
    </div>
  );
}

function Variant1({ data }) {
  const leader = data.rows[0];
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Legends" value={data.totals.players} sub="players recorded" tone="blue" />
        <StatCard icon={Swords} label="Total Kills" value={shortNum(data.totals.kills)} sub="all selected logs" tone="rose" />
        <StatCard icon={Target} label="Guild K/D" value={data.totals.kd.toFixed(2)} sub="kills / deaths" tone="emerald" />
        <StatCard icon={CalendarDays} label="Wars" value={data.totals.wars} sub="recorded wars" tone="violet" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-blue-950/40 p-6 shadow-2xl">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
            <Avatar name={leader.name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-300"><Crown className="h-4 w-4" /> Featured Legend</div>
              <div className="truncate text-4xl font-black text-white">{leader.name}</div>
              <div className="mt-1 text-lg font-bold text-blue-300">{leader.title}</div>
              <p className="mt-3 max-w-2xl text-sm font-semibold text-slate-400">Playerul cu cel mai mare scor calculat din killuri, K/D, streak, killfeed și participare la war-uri.</p>
            </div>
          </div>
          <div className="relative mt-6 grid gap-3 sm:grid-cols-4">
            <StatCard icon={Trophy} label="Score" value={nf.format(leader.score)} tone="blue" />
            <StatCard icon={Swords} label="Kills" value={nf.format(leader.kills)} tone="rose" />
            <StatCard icon={Skull} label="Deaths" value={nf.format(leader.deaths)} tone="slate" />
            <StatCard icon={Target} label="K/D" value={leader.kd.toFixed(2)} tone="emerald" />
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
          <SectionTitle icon={Crown} title="Top 5 Legends" action="View ranking" />
          <div className="space-y-3">{data.rows.slice(0, 5).map((row, index) => <TopLegendCard key={row.name} row={row} rank={index + 1} />)}</div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">{data.achievements.map((item) => <AchievementCard key={item.title} item={item} />)}</div>
    </div>
  );
}

function Variant2({ data }) {
  const podium = [data.rows[1], data.rows[0], data.rows[2]].filter(Boolean);
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
        <SectionTitle icon={Medal} title="Top 3 Podium" action="All time" />
        <div className="grid items-end gap-4 lg:grid-cols-3">
          {podium.map((row) => {
            const rank = data.rows.findIndex((item) => item.name === row.name) + 1;
            return <TopLegendCard key={row.name} row={row} rank={rank} wide={rank === 1} />;
          })}
        </div>
      </div>
      <Leaderboard rows={data.rows} limit={8} />
    </div>
  );
}

function Variant3({ data }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_.72fr]">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
        <SectionTitle icon={Award} title="Achievement Wall" action="View all" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.achievements.map((item) => <AchievementCard key={item.title} item={item} />)}</div>
      </div>
      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
          <SectionTitle icon={BarChart3} title="Guild Records" />
          <div className="space-y-3">
            <StatCard icon={Trophy} label="Prestige" value={shortNum(data.totals.score)} tone="blue" />
            <StatCard icon={Swords} label="Top Kill Count" value={nf.format(data.achievements[1].player?.kills || 0)} tone="rose" />
            <StatCard icon={Flame} label="Longest Streak" value={nf.format(data.achievements[3].player?.streak || 0)} tone="orange" />
          </div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
          <SectionTitle icon={Crown} title="Mini Leaderboard" />
          <div className="space-y-3">{data.rows.slice(0, 4).map((row, index) => <TopLegendCard key={row.name} row={row} rank={index + 1} />)}</div>
        </div>
      </div>
    </div>
  );
}

function Variant4({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard icon={Crown} label="Total Legends" value={data.totals.players} sub="+ calculated" tone="amber" />
        <StatCard icon={Medal} label="Hall Score" value={shortNum(data.totals.score)} sub="guild total" tone="blue" />
        <StatCard icon={Swords} label="Record Kills" value={nf.format(data.rows[0]?.kills || 0)} sub={data.rows[0]?.name} tone="rose" />
        <StatCard icon={Target} label="Best K/D" value={data.achievements[2].value} sub={data.achievements[2].player?.name} tone="emerald" />
        <StatCard icon={Shield} label="Wars" value={data.totals.wars} sub="selected logs" tone="violet" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_.42fr]">
        <div>
          <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input disabled placeholder="Search players..." className="w-full bg-transparent text-sm font-bold text-slate-400 outline-none placeholder:text-slate-600" />
          </div>
          <Leaderboard rows={data.rows} limit={10} />
        </div>
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
            <SectionTitle icon={Users} title="Latest Inducted" action="View all" />
            <div className="space-y-3">{data.rows.slice(0, 5).map((row) => <TopLegendCard key={row.name} row={row} rank={data.rows.indexOf(row) + 1} />)}</div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
            <SectionTitle icon={Activity} title="Badge Summary" />
            <div className="space-y-3">{data.achievements.slice(0, 5).map((item) => <div key={item.title} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm"><span className="font-bold text-slate-300">{item.title}</span><span className="font-black text-blue-300">{item.player?.name}</span></div>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Variant5({ data }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[.75fr_1.25fr]">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
        <SectionTitle icon={CalendarDays} title="Legacy Timeline" action="Archive" />
        <div className="space-y-4">
          {data.months.slice(0, 6).map((month, index) => (
            <div key={month.month} className="relative rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-white">Season {month.month}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{month.wars} wars recorded</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-sm font-black text-blue-200">{index + 1}</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-slate-900/80 p-2"><span className="text-slate-500">Kills</span><div className="font-black text-slate-100">{month.kills}</div></div>
                <div className="rounded-xl bg-slate-900/80 p-2"><span className="text-slate-500">Deaths</span><div className="font-black text-slate-100">{month.deaths}</div></div>
                <div className="rounded-xl bg-slate-900/80 p-2"><span className="text-slate-500">K/D</span><div className="font-black text-slate-100">{kd(month.kills, month.deaths).toFixed(2)}</div></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-5"><Variant1 data={data} /></div>
    </div>
  );
}

function Variant6({ data }) {
  const leader = data.rows[0];
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-blue-400/25 bg-blue-500/10 text-3xl font-black text-blue-200 shadow-[0_0_30px_rgba(59,130,246,.12)]">{initials(leader.name)}</div>
        <div className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-blue-300">Minimal Hall Card</div>
        <div className="mt-2 text-5xl font-black text-white">{leader.name}</div>
        <div className="mt-2 text-lg font-bold text-slate-400">{leader.title}</div>
        <div className="mx-auto mt-6 grid max-w-5xl gap-3 md:grid-cols-5">
          <StatCard icon={Trophy} label="Score" value={nf.format(leader.score)} tone="blue" />
          <StatCard icon={Swords} label="Kills" value={nf.format(leader.kills)} tone="rose" />
          <StatCard icon={Skull} label="Deaths" value={nf.format(leader.deaths)} tone="slate" />
          <StatCard icon={Target} label="K/D" value={leader.kd.toFixed(2)} tone="emerald" />
          <StatCard icon={Flame} label="Streak" value={leader.streak} tone="orange" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{data.rows.slice(1, 6).map((row, index) => <TopLegendCard key={row.name} row={row} rank={index + 2} />)}</div>
    </div>
  );
}

function Variant7({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {data.achievements.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-4 text-center shadow-2xl">
              <div className={cls('mx-auto grid h-14 w-14 place-items-center rounded-2xl border', toneClasses[item.tone])}>
                <Icon className="h-7 w-7" />
              </div>
              <div className="mt-3 text-sm font-black text-white">{item.title}</div>
              <div className="mt-2 text-xl font-black text-blue-200">{item.value}</div>
              <div className="mt-1 text-xs font-bold text-slate-500">{item.player?.name}</div>
            </div>
          );
        })}
      </div>
      <Leaderboard rows={data.rows} limit={10} />
    </div>
  );
}

function Variant8({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[.7fr_1fr_.75fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
          <SectionTitle icon={Crown} title="Top Legends" />
          <div className="space-y-3">{data.rows.slice(0, 5).map((row, index) => <TopLegendCard key={row.name} row={row} rank={index + 1} />)}</div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
          <SectionTitle icon={Award} title="Hall Achievements" action="View all" />
          <div className="grid gap-3 sm:grid-cols-2">{data.achievements.map((item) => <AchievementCard key={item.title} item={item} />)}</div>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5 shadow-2xl">
          <SectionTitle icon={BarChart3} title="Personal Records" />
          <div className="space-y-3">
            <StatCard icon={Trophy} label="Best Score" value={shortNum(data.rows[0]?.score)} sub={data.rows[0]?.name} tone="blue" />
            <StatCard icon={Swords} label="Most Kills" value={nf.format(data.achievements[1].player?.kills || 0)} sub={data.achievements[1].player?.name} tone="rose" />
            <StatCard icon={Target} label="Best K/D" value={data.achievements[2].value} sub={data.achievements[2].player?.name} tone="emerald" />
            <StatCard icon={Shield} label="Most Wars" value={data.achievements[5].value} sub={data.achievements[5].player?.name} tone="violet" />
          </div>
        </div>
      </div>
      <Leaderboard rows={data.rows} limit={7} />
    </div>
  );
}

const variants = {
  1: { name: 'Featured Legend', component: Variant1 },
  2: { name: 'Podium + Table', component: Variant2 },
  3: { name: 'Achievement Wall', component: Variant3 },
  4: { name: 'Data Leaderboard', component: Variant4 },
  5: { name: 'Legacy Timeline', component: Variant5 },
  6: { name: 'Minimal Prestige', component: Variant6 },
  7: { name: 'Trophy Room', component: Variant7 },
  8: { name: 'Command Center', component: Variant8 },
};

function PreviewAll({ data }) {
  return (
    <div className="min-h-screen bg-[#050b16] p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
          <h1 className="text-4xl font-black text-white">Hall of Fame — 8 Match History Style Variants</h1>
          <p className="mt-2 text-sm font-semibold text-slate-400">Preview mode: toate variantele sunt randate cu date demo, în același stil dark/card-based ca pagina Node Wars.</p>
        </div>
        {Object.entries(variants).map(([key, item]) => {
          const Component = item.component;
          return (
            <section key={key} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/25 bg-blue-500/10 text-sm font-black text-blue-100">V{key}</div>
                <h2 className="text-2xl font-black text-white">{item.name}</h2>
              </div>
              <Component data={data} />
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default function HallOfFame({ stats, allTimeStats } = {}) {
  const previewMode = !stats && !allTimeStats;
  const [active, setActive] = useState(1);
  const data = useMemo(() => buildHallData(allTimeStats?.players?.length ? allTimeStats : stats), [stats, allTimeStats]);
  const ActiveVariant = variants[active]?.component || Variant1;

  if (!data.rows.length) return <EmptyState />;
  if (previewMode) return <PreviewAll data={buildHallData(demoStats)} />;

  return (
    <div className="space-y-5">
      <HeaderControls active={active} setActive={setActive} />
      <ActiveVariant data={data} />
    </div>
  );
}
