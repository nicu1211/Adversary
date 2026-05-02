import React, { useMemo, useState } from 'react';
import { Panel } from '../components/UI';
import { calculateStats, dateOf, scrollCls } from '../lib/logUtils';

export default function NodeWars({
  logs,
  setPage,
  setSelDays,
  setSelWars,
  selWars,
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
            const total = ourKills + ourDeaths;

            const kd = ourKills
              ? (ourDeaths / ourKills).toFixed(2)
              : ourDeaths.toFixed(2);

            return {
              name: guild.name,
              kills: ourDeaths,
              deaths: ourKills,
              total,
              kd,
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

  const selectedVisibleCount = visibleIds.filter((id) =>
    selWars.includes(id),
  ).length;

  function selectDisplayedLogs() {
    if (!visibleIds.length) {
      setWarning('Nu există meciuri afișate pentru filtrul curent.');
      return;
    }

    setWarning('');
    setSelDays(['all']);
    setSelWars(visibleIds);
  }

  function clearSelection() {
    setWarning('');
    setSelDays(['current']);
    setSelWars(['current']);
  }

  function openSelectedOverview() {
    const selectedIds = selWars.filter(
      (id) => id !== 'all' && id !== 'current',
    );

    if (!selectedIds.length) {
      setWarning('Nu este selectat niciun war.');
      return;
    }

    setWarning('');
    setSelDays(['all']);
    setPage('overview');
  }

  function openSingleWar(row) {
    setWarning('');
    setSelDays([row.date]);
    setSelWars([String(row.id)]);
    setPage('overview');
  }

  function toggleWar(event, row) {
    event.stopPropagation();

    const id = String(row.id);

    const cleanSelection = selWars.filter(
      (x) => x !== 'all' && x !== 'current',
    );

    setWarning('');
    setSelDays(['all']);

    if (event.target.checked) {
      setSelWars([...new Set([...cleanSelection, id])]);
    } else {
      setSelWars(cleanSelection.filter((x) => x !== id));
    }
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

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <button
            type="button"
            onClick={selectDisplayedLogs}
            className="rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200 transition hover:bg-blue-500/20"
          >
            Select displayed logs
          </button>

          <button
            type="button"
            onClick={openSelectedOverview}
            className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-200 transition hover:bg-emerald-500/20"
          >
            Open overview
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-slate-800"
          >
            Clear
          </button>

          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setWarning('');
            }}
            placeholder="Search enemies..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:bg-slate-900 md:w-72"
          />
        </div>
      </div>

      {warning && (
        <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
          {warning}
        </p>
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
        <div className={`max-h-[720px] overflow-auto ${scrollCls}`}>
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
                  const checked = selWars.includes(id);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => openSingleWar(row)}
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
                        <div className="flex max-w-[620px] flex-wrap gap-1.5">
                          {row.topEnemies.map((guild) => (
                            <span
                              key={guild.name}
                              className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold"
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
