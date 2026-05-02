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
  const [warning, setWarning] = useState('');

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
              kd: ourKills
                ? (ourDeaths / ourKills).toFixed(2)
                : ourDeaths.toFixed(2),
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
      .filter((row) => {
        const cleanQuery = query.trim().toLowerCase();

        if (!cleanQuery) return true;

        return row.topEnemies.some((guild) =>
          guild.name.toLowerCase().includes(cleanQuery),
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, query]);

  const visibleIds = rows.map((row) => String(row.id));

  const selectedRealWars = selectedWars.filter(
    (id) => id !== 'all' && id !== 'current',
  );

  const allDisplayedLogsSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedRealWars.includes(id));

  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedRealWars.includes(id),
  ).length;

  function openWar(row) {
    setWarning('');
    setSelectedDays([row.date]);
    setSelectedWars([String(row.id)]);
    setPage('overview');
  }

  function toggleWar(event, row) {
    event.stopPropagation();

    const id = String(row.id);

    setWarning('');
    setSelectedDays(['all']);

    setSelectedWars(
      event.target.checked
        ? [...new Set([...selectedRealWars, id])]
        : selectedRealWars.filter((x) => x !== id),
    );
  }

  function selectDisplayedLogs() {
    setWarning('');

    if (!visibleIds.length) {
      setSelectedDays(['all']);
      setSelectedWars([]);
      setWarning('No saved node wars found for this search.');
      return;
    }

    if (allDisplayedLogsSelected) {
      setSelectedDays(['all']);
      setSelectedWars([]);
      return;
    }

    setSelectedDays(['all']);
    setSelectedWars(visibleIds);
  }

  function openSelectedOverview() {
    if (selectedRealWars.length === 0) {
      setWarning('No node war selected. Select at least one war first.');
      return;
    }

    setWarning('');
    setSelectedDays(['all']);
    setPage('overview');
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black">Node Wars</h2>

          <p className="text-sm text-slate-400">
            Saved match history · select multiple node wars for analysis in
            Overview
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={selectDisplayedLogs}
            className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200 hover:bg-blue-500/20"
          >
            {allDisplayedLogsSelected
              ? 'Clear selection'
              : 'Select displayed logs'}
          </button>

          <button
            type="button"
            onClick={openSelectedOverview}
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20"
          >
            Open overview
          </button>

          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setWarning('');
            }}
            placeholder="Search enemies..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:bg-slate-900 sm:w-72"
          />
        </div>
      </div>

      {warning && (
        <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
          {warning}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
          Displayed logs:{' '}
          <b className="text-slate-100">{rows.length}</b>
        </span>

        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
          Selected displayed:{' '}
          <b className="text-blue-300">{selectedVisibleCount}</b>
        </span>

        {query.trim() && (
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
            Filter active: {query.trim()}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className="max-h-[720px] overflow-auto [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb:hover]:bg-slate-600">
          <table className="w-full min-w-[1180px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="w-[170px] py-4 pl-4 text-left">Time ↕</th>
                <th className="w-[170px] py-4 text-left">Alliance</th>
                <th className="py-4 text-left">Top 5 enemies</th>
                <th className="w-[110px] py-4 text-center">Players ↕</th>
                <th className="w-[100px] py-4 text-center">Kills ↕</th>
                <th className="w-[110px] py-4 text-center">Deaths ↕</th>
                <th className="w-[90px] py-4 text-center">KD ↕</th>
                <th className="w-[90px] py-4 pr-4 text-center">Select</th>
              </tr>
            </thead>

            <tbody>
              {!rows.length ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No saved node wars found for this search.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = String(row.id);
                  const checked = selectedRealWars.includes(id);

                  return (
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
                          <b
                            className={
                              Number(row.kd) >= 1
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }
                          >
                            {row.kd}
                          </b>
                        </span>
                      </td>

                      <td className="py-4">
                        <div className="flex max-w-[620px] flex-nowrap gap-1.5 overflow-hidden whitespace-nowrap">
                          {row.topEnemies.map((guild) => (
                            <span
                              key={guild.name}
                              className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold"
                            >
                              {guild.name}{' '}
                              <b
                                className={
                                  Number(guild.kd) >= 1
                                    ? 'text-emerald-300'
                                    : 'text-rose-300'
                                }
                              >
                                {guild.kd}
                              </b>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 text-center font-black">
                        {row.players}
                      </td>

                      <td className="py-4 text-center font-black text-blue-300">
                        {row.kills}
                      </td>

                      <td className="py-4 text-center font-black text-pink-300">
                        {row.deaths}
                      </td>

                      <td
                        className={`py-4 text-center font-black ${
                          Number(row.kd) >= 1
                            ? 'text-emerald-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {row.kd}
                      </td>

                      <td className="py-4 pr-4 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => toggleWar(event, row)}
                          className="h-5 w-5 cursor-pointer accent-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
