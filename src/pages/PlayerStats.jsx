import React, { useMemo, useState } from 'react';
import { Panel, Metric } from '../components/UI';
import { KillDeathChart, AveragePerformanceChart } from '../components/Charts';
import { achievements, add, scrollCls } from '../lib/logUtils';

function PlayerSelect({ players, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = players.find((player) => player.name === value);

  const list = players.filter((player) =>
    `${player.name} ${player.family || ''}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative mb-4 max-w-xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left shadow-lg backdrop-blur-xl transition hover:border-blue-300/50 hover:bg-white/10"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Selected player
          </p>
          <p className="truncate text-sm font-black">
            {selected ? selected.name : 'Select player'}
          </p>
        </div>

        <span className={`${open ? 'rotate-180 ' : ''}ml-3 shrink-0 text-slate-400 transition`}>
          ⌄
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-xl">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Search player..."
            className="mb-2 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />

          <div className={`max-h-64 overflow-y-auto pr-1 ${scrollCls}`}>
            {!list.length ? (
              <p className="px-3 py-4 text-sm text-slate-500">No players found.</p>
            ) : (
              <>
                <button
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${
                    !value
                      ? 'bg-blue-500/20 text-blue-100'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Select player
                </button>

                {list.map((player) => (
                  <button
                    key={player.name}
                    onClick={() => {
                      onChange(player.name);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`mb-1 flex w-full rounded-xl px-3 py-2 text-left text-sm ${
                      value === player.name
                        ? 'bg-blue-500/25 text-blue-100'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate font-bold">{player.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RankList({ title, items, valueKey }) {
  const rows = items.slice(0, 5);
  const max = Math.max(1, ...rows.map((item) => Number(item[valueKey]) || 0));

  return (
    <Panel>
      <h3 className="mb-4 text-xl font-black">{title}</h3>

      {!rows.length ? (
        <p className="text-slate-500">No data yet.</p>
      ) : (
        rows.map((item, index) => {
          const value = Number(item[valueKey]) || 0;

          return (
            <div
              key={item.name}
              className="mb-4 grid grid-cols-[34px_1fr_55px] items-center gap-3 text-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 font-black">
                {index + 1}
              </span>

              <div className="min-w-0">
                <p className="mb-2 truncate font-bold">{item.name}</p>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300"
                    style={{
                      width: `${Math.max(6, Math.round((value / max) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <b className="text-right">{value}</b>
            </div>
          );
        })
      )}
    </Panel>
  );
}

export default function PlayerStats({ stats }) {
  const [player, setPlayer] = useState('');

  const selectedStats = useMemo(() => {
    if (!player) return null;

    const victims = {};
    const killedBy = {};
    const days = {};

    stats.ev.forEach((event) => {
      if (event.killer === player || event.victim === player) {
        days[event.date] ||= {
          time: event.date,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };

        days[event.date].wars.add(event.id);
      }

      if (event.killer === player) {
        add(victims, event.victim);
        days[event.date].kills += 1;
      }

      if (event.victim === player) {
        add(killedBy, event.killer);
        days[event.date].deaths += 1;
      }
    });

    const playerRow =
      stats.players.find((item) => item.name === player) || {
        kills: 0,
        deaths: 0,
        kd: '0.00',
      };

    const orderedDays = Object.values(days).sort((a, b) =>
      a.time.localeCompare(b.time),
    );

    const dailyLine = orderedDays.map((day) => ({
      time: day.time,
      kills: day.kills,
      deaths: day.deaths,
    }));

    const averageLine = orderedDays.map((day) => {
      const fights = Math.max(1, day.wars.size);
      const avgKills = Number((day.kills / fights).toFixed(2));
      const avgDeaths = Number((day.deaths / fights).toFixed(2));

      return {
        time: day.time,
        avgKills,
        avgDeaths,
        avgKd: Number((avgDeaths ? avgKills / avgDeaths : avgKills).toFixed(2)),
      };
    });

    const achievementRows = achievements.map((achievement) => {
      const value =
        achievement[2] === 'k'
          ? playerRow.kills
          : achievement[2] === 'kd'
            ? Number(playerRow.kd)
            : achievement[2] === 's'
              ? stats.st[player] || 0
              : achievement[2] === 'f'
                ? stats.fd[player] || 0
                : 0;

      return {
        title: achievement[0],
        goal: achievement[1],
        value,
        done: value >= achievement[1],
      };
    });

    return {
      ...playerRow,
      victims,
      killedBy,
      dailyLine,
      averageLine,
      achievements: achievementRows,
    };
  }, [player, stats]);

  return (
    <Panel>
      <h2 className="mb-4 text-2xl font-black">Player Stats</h2>

      <PlayerSelect
        players={stats.players}
        value={player}
        onChange={setPlayer}
      />

      {selectedStats && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric
              icon="⚔"
              label="Kills"
              value={selectedStats.kills}
              sub={player}
              className="border-blue-400/25 from-blue-500/20 text-blue-300"
            />

            <Metric
              icon="☠"
              label="Deaths"
              value={selectedStats.deaths}
              sub="Deaths"
              className="border-pink-400/25 from-pink-500/20 text-pink-300"
            />

            <Metric
              icon="✦"
              label="K/D"
              value={selectedStats.kd}
              sub="Ratio"
              className="border-violet-400/25 from-violet-500/20 text-violet-300"
            />
          </div>

          <KillDeathChart
            data={selectedStats.dailyLine}
            title="Player Daily Kill/Death Timeline"
          />

          <AveragePerformanceChart data={selectedStats.averageLine} />

          <div className="grid gap-4 md:grid-cols-2">
            <RankList
              title="Favourite Targets"
              items={Object.entries(selectedStats.victims)
                .map(([name, kills]) => ({ name, kills }))
                .sort((a, b) => b.kills - a.kills)}
              valueKey="kills"
            />

            <RankList
              title="Killed By"
              items={Object.entries(selectedStats.killedBy)
                .map(([name, kills]) => ({ name, kills }))
                .sort((a, b) => b.kills - a.kills)}
              valueKey="kills"
            />
          </div>

          <Panel>
            <h3 className="mb-4 text-xl font-black">✦ Achievements</h3>

            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {selectedStats.achievements.map((achievement) => (
                <div
                  key={achievement.title}
                  className={`rounded-xl border p-3 ${
                    achievement.done
                      ? 'border-emerald-400 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-950/40'
                  }`}
                >
                  <p className="font-bold">
                    {achievement.done ? '✅' : '🔒'} {achievement.title}
                  </p>

                  <div className="mt-2 h-2 rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${
                        achievement.done ? 'bg-emerald-400' : 'bg-blue-500'
                      }`}
                      style={{
                        width:
                          Math.min(
                            100,
                            (achievement.value / achievement.goal) * 100,
                          ) + '%',
                      }}
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {Number(achievement.value).toFixed(
                      achievement.goal <= 10 ? 2 : 0,
                    )}{' '}
                    / {achievement.goal}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </Panel>
  );
}
