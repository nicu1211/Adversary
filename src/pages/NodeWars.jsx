function NodeWars({ logs, setPage, setSelDays, setSelWars, selWars }) {
  const [q, setQ] = useState('');
  const [warn, setWarn] = useState('');

  const rows = logs
    .map((x) => {
      const s = stats([{ ...x, date: dateOf(x) }]);

      const top = [...s.guilds]
        .map((g) => {
          const ourKills = g.kills;
          const ourDeaths = g.deaths;
          const total = ourKills + ourDeaths;
          const kd = ourKills
            ? (ourDeaths / ourKills).toFixed(2)
            : ourDeaths.toFixed(2);

          return {
            name: g.name,
            kills: ourDeaths,
            deaths: ourKills,
            total,
            kd,
          };
        })
        .sort((a, b) => b.total - a.total || b.kills - a.kills)
        .slice(0, 5);

      return {
        ...x,
        date: dateOf(x),
        players: s.players.length,
        kills: s.kills,
        deaths: s.deaths,
        kd: s.kd,
        top,
      };
    })
    .filter((r) => {
      const query = q.trim().toLowerCase();

      if (!query) return true;

      return r.top.some((g) => g.name.toLowerCase().includes(query));
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const visibleIds = rows.map((row) => String(row.id));

  const selectedVisibleCount = visibleIds.filter((id) =>
    selWars.includes(id),
  ).length;

  function selectDisplayedLogs() {
    if (!visibleIds.length) {
      setWarn('Nu există meciuri afișate pentru filtrul curent.');
      return;
    }

    setWarn('');
    setSelDays(['all']);
    setSelWars(visibleIds);
  }

  function clearSelection() {
    setWarn('');
    setSelDays(['current']);
    setSelWars(['current']);
  }

  function openOverview() {
    const selectedIds = selWars.filter(
      (id) => id !== 'all' && id !== 'current',
    );

    if (!selectedIds.length) {
      setWarn('Nu este selectat niciun war.');
      return;
    }

    setWarn('');
    setSelDays(['all']);
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
            onClick={openOverview}
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
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setWarn('');
            }}
            placeholder="Search enemies..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:bg-slate-900 md:w-72"
          />
        </div>
      </div>

      {warn && (
        <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
          {warn}
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

        {q.trim() && (
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
            Filter active: {q.trim()}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className={`max-h-[720px] overflow-auto ${scrollCls}`}>
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
                  <td
                    colSpan="8"
                    className="py-8 text-center text-slate-500"
                  >
                    No saved node wars found for this search.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const id = String(r.id);
                  const checked = selWars.includes(id);

                  return (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setWarn('');
                        setSelDays([r.date]);
                        setSelWars([id]);
                        setPage('overview');
                      }}
                      className="cursor-pointer border-t border-slate-800 bg-slate-950/30 transition hover:bg-slate-900/60"
                    >
                      <td className="py-4 pl-4 font-black text-slate-200">
                        {new Date(r.date).toLocaleDateString('en-GB', {
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
                              +r.kd >= 1
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }
                          >
                            {r.kd}
                          </b>
                        </span>
                      </td>

                      <td className="py-4">
                        <div className="flex max-w-[460px] flex-wrap gap-1.5">
                          {r.top.map((g) => (
                            <span
                              key={g.name}
                              className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold"
                            >
                              {g.name}{' '}
                              <b
                                className={
                                  +g.kd >= 1
                                    ? 'text-emerald-300'
                                    : 'text-rose-300'
                                }
                              >
                                {g.kd}
                              </b>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 text-center font-black">
                        {r.players}
                      </td>

                      <td className="py-4 text-center font-black text-blue-300">
                        {r.kills}
                      </td>

                      <td className="py-4 text-center font-black text-pink-300">
                        {r.deaths}
                      </td>

                      <td
                        className={
                          (+r.kd >= 1
                            ? 'text-emerald-300'
                            : 'text-rose-300') +
                          ' py-4 text-center font-black'
                        }
                      >
                        {r.kd}
                      </td>

                      <td className="py-4 pr-4 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const cleanSelection = selWars.filter(
                              (x) => x !== 'all' && x !== 'current',
                            );

                            setWarn('');
                            setSelDays(['all']);

                            if (e.target.checked) {
                              setSelWars([...new Set([...cleanSelection, id])]);
                            } else {
                              setSelWars(
                                cleanSelection.filter((x) => x !== id),
                              );
                            }
                          }}
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
