import React, { useMemo, useState } from 'react';
import { Panel } from '../components/UI';
import { calculateStats, dateOf } from '../lib/logUtils';

export default function NodeWars({
  logs,
  setPage,
  setSelectedDays,
  setSelectedWars,
  selectedWars,
}) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    return logs
      .map((log) => {
        const stats = calculateStats([{ ...log, date: dateOf(log) }]);

        const topEnemies = [...stats.guilds]
          .map((guild) => {
            const ourKills = guild.kills;
            const ourDeaths = guild.deaths;
            const totalInteractions = ourKills + ourDeaths;

            return {
              name: guild.name,
              kills: ourDeaths,
              deaths: ourKills,
              total: totalInteractions,
              kd: ourKills ? (ourDeaths / ourKills).toFixed(2) : ourDeaths.toFixed(2),
            };
          })
          .sort((a, b) => b.total - a.total || b.kills - a.kills)
          .slice(0, 5);

        return {
          ...log,
          date: dateOf(log),
          players: stats.players.length,
          kills: stats.kills,
          deaths: stats.deaths,
          kd: stats.kd,
          topEnemies,
        };
      })
      .filter(
        (row) =>
          !query.trim() ||
          row.topEnemies.some((guild) =>
            guild.name.toLowerCase().includes(query.toLowerCase()),
          ),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, query]);

  function openWar(row) {
    setSelectedDays([row.date]);
    setSelectedWars([String(row.id)]);
    setPage('overview');
  }

  function toggleWar(event, row) {
    event.stopPropagation();

    const id = String(row.id);

    setSelectedDays(['all']);
    setSelectedWars(
      event.target.checked
        ? [...selectedWars.filter((x) => x !== 'all' && x !== 'current'), id]
        : selectedWars.filter((x) => x !== id),
    );
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">Node Wars</h2>
          <p className="text-sm text-slate-400">
            Saved match history · select multiple node wars for analysis in Overview
          </p>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search enemies..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:bg-slate-900 md:w-72"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className="max-h-[720px] overflow-auto [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb:hover]:bg-slate-600">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-4 pl-4 text-left">Time ↕</th>
                <th className="py-4 text-left">Alliance</th>
                <th className="py-4 text-left">Top 5 enemies</th>
                <th className="py-4 text-center">Players ↕</th>
                <th className="py-4 text-center">Kills ↕</th>
                <th className="py-4 text-center">Deaths ↕</th>
                <th className="py-4 text-center">KD ↕</th>
                <th className="py-4 pr-4 text-center">Select</th>
              </tr>
            </thead>

            <tbody>
              {!rows.length ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No saved node wars yet. Add logs from Raw Log.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => openWar(row)}
                    className="cursor-pointer border-t border-slate-800 bg-slate-950/30 transition hover:bg-slate-900/60"
                  >
                    <td className="py-4 pl-4 font-black text-slate-200">
                      {new Date(row.date).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-4">
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold">
                        Adversary{' '}
                        <b className={Number(row.kd) >= 1 ? 'text-emerald-300' : 'text-rose-300'}>
                          {row.kd}
                        </b>
                      </span>
                    </td>

                    <td className="py-4">
                      <div className="flex max-w-[460px] flex-wrap gap-1.5">
                        {row.topEnemies.map((guild) => (
                          <span
                            key={guild.name}
                            className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold"
                          >
                            {guild.name}{' '}
                            <b
                              className={
                                Number(guild.kd) >= 1 ? 'text-emerald-300' : 'text-rose-300'
                              }
                            >
                              {guild.kd}
                            </b>
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 text-center font-black">{row.players}</td>
                    <td className="py-4 text-center font-black text-blue-300">{row.kills}</td>
                    <td className="py-4 text-center font-black text-pink-300">{row.deaths}</td>

                    <td
                      className={`py-4 text-center font-black ${
                        Number(row.kd) >= 1 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {row.kd}
                    </td>

                    <td className="py-4 pr-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedWars.includes(String(row.id))}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => toggleWar(event, row)}
                        className="h-5 w-5 cursor-pointer accent-blue-500"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
