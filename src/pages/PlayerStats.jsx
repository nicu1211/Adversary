import React, { useMemo, useState } from 'react';
import { AveragePerformanceChart } from '../components/Charts';
import { add, scrollCls } from '../lib/logUtils';


const PLAYER_STATS_GUILD_CSS = `
  .player-stats-guild-style {
    --player-stats-panel-rgb: 59, 130, 246;
  }

  .player-stats-guild-style.player-stats-root-transparent {
    border: 0 !important;
    outline: 0 !important;
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  .player-stats-guild-style.player-stats-root-transparent::before,
  .player-stats-guild-style.player-stats-root-transparent::after {
    content: none !important;
    display: none !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .player-stats-guild-style .player-stats-guild-panel {
    --player-stats-panel-rgb: 59, 130, 246;
    position: relative;
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.60) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--player-stats-panel-rgb), 0.20) 0%,
        rgba(var(--player-stats-panel-rgb), 0.095) 42%,
        rgba(var(--player-stats-panel-rgb), 0.034) 74%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--player-stats-panel-rgb), 0.075) 0%,
        rgba(7, 13, 29, 0.52) 54%,
        rgba(2, 6, 23, 0.66) 100%
      ) !important;
    -webkit-backdrop-filter: blur(8px) saturate(122%);
    backdrop-filter: blur(8px) saturate(122%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      inset 0 -1px 0 rgba(var(--player-stats-panel-rgb), 0.14),
      0 12px 28px rgba(0, 0, 0, 0.24) !important;
    transition: background-image 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .player-stats-guild-style .player-stats-guild-panel:hover {
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--player-stats-panel-rgb), 0.27) 0%,
        rgba(var(--player-stats-panel-rgb), 0.13) 44%,
        rgba(var(--player-stats-panel-rgb), 0.045) 76%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--player-stats-panel-rgb), 0.10) 0%,
        rgba(7, 13, 29, 0.49) 54%,
        rgba(2, 6, 23, 0.63) 100%
      ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      inset 0 -1px 0 rgba(var(--player-stats-panel-rgb), 0.20),
      0 0 20px rgba(var(--player-stats-panel-rgb), 0.22),
      0 16px 34px rgba(0, 0, 0, 0.26) !important;
  }

  .player-stats-guild-style .player-stats-accent-blue { --player-stats-panel-rgb: 59, 130, 246; }
  .player-stats-guild-style .player-stats-accent-cyan { --player-stats-panel-rgb: 6, 182, 212; }
  .player-stats-guild-style .player-stats-accent-violet { --player-stats-panel-rgb: 139, 92, 246; }
  .player-stats-guild-style .player-stats-accent-rose { --player-stats-panel-rgb: 244, 63, 94; }
  .player-stats-guild-style .player-stats-accent-amber { --player-stats-panel-rgb: 245, 158, 11; }

  .player-stats-guild-style .player-stats-summary-card {
    --player-stats-summary-rgb: 59, 130, 246;
    position: relative;
    overflow: hidden;
    min-height: 118px;
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.62) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--player-stats-summary-rgb), 0.18) 0%,
        rgba(var(--player-stats-summary-rgb), 0.09) 42%,
        rgba(var(--player-stats-summary-rgb), 0.035) 74%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--player-stats-summary-rgb), 0.075) 0%,
        rgba(7, 13, 29, 0.52) 54%,
        rgba(2, 6, 23, 0.66) 100%
      ) !important;
    -webkit-backdrop-filter: blur(8px) saturate(122%);
    backdrop-filter: blur(8px) saturate(122%);
    box-shadow:
      inset 0 0 42px rgba(var(--player-stats-summary-rgb), 0.075),
      0 12px 28px rgba(0, 0, 0, 0.24) !important;
    transition: background-color 180ms ease, background-image 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .player-stats-guild-style .player-stats-summary-card::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(110deg, rgba(255,255,255,.035), transparent 36%);
  }

  .player-stats-guild-style .player-stats-summary-card:hover {
    background-color: rgba(2, 6, 23, 0.58) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--player-stats-summary-rgb), 0.25) 0%,
        rgba(var(--player-stats-summary-rgb), 0.13) 44%,
        rgba(var(--player-stats-summary-rgb), 0.05) 76%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--player-stats-summary-rgb), 0.10) 0%,
        rgba(7, 13, 29, 0.48) 54%,
        rgba(2, 6, 23, 0.62) 100%
      ) !important;
    box-shadow:
      inset 0 0 48px rgba(var(--player-stats-summary-rgb), 0.13),
      0 0 20px rgba(var(--player-stats-summary-rgb), 0.30),
      0 0 42px rgba(var(--player-stats-summary-rgb), 0.15),
      0 16px 34px rgba(0, 0, 0, 0.26) !important;
    transform: translateY(-1px);
  }

  .player-stats-guild-style .player-stats-summary-icon {
    background: rgba(var(--player-stats-summary-rgb), 0.10);
    box-shadow:
      inset 0 0 0 1px rgba(var(--player-stats-summary-rgb), 0.18),
      0 0 14px rgba(var(--player-stats-summary-rgb), 0.10);
  }

  .player-stats-guild-style .player-stats-summary-emerald { --player-stats-summary-rgb: 16, 185, 129; }
  .player-stats-guild-style .player-stats-summary-pink { --player-stats-summary-rgb: 236, 72, 153; }
  .player-stats-guild-style .player-stats-summary-blue { --player-stats-summary-rgb: 59, 130, 246; }
  .player-stats-guild-style .player-stats-summary-amber { --player-stats-summary-rgb: 245, 158, 11; }
  .player-stats-guild-style .player-stats-summary-violet { --player-stats-summary-rgb: 139, 92, 246; }

  .player-stats-guild-style .player-stats-performance-shell,
  .player-stats-guild-style .player-stats-performance-shell:hover {
    border: 0 !important;
    outline: 0 !important;
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  .player-stats-guild-style .player-stats-performance-shell > div {
    border-color: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  .player-stats-guild-style .player-stats-guild-panel [class*="border-slate-700"],
  .player-stats-guild-style .player-stats-guild-panel [class*="border-slate-800"] {
    border-color: rgba(var(--player-stats-panel-rgb), 0.10) !important;
  }


  .player-stats-guild-style .player-stats-site-heading {
    --player-stats-heading-rgb: 59, 130, 246;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 52px;
    padding: 11px 14px;
    border-radius: 17px;
    border: 1px solid rgba(var(--player-stats-heading-rgb), 0.14);
    border-left: 3px solid rgba(var(--player-stats-heading-rgb), 0.72);
    background:
      radial-gradient(
        ellipse at 8% 0%,
        rgba(var(--player-stats-heading-rgb), 0.36) 0%,
        rgba(var(--player-stats-heading-rgb), 0.17) 40%,
        rgba(var(--player-stats-heading-rgb), 0.055) 68%,
        transparent 86%
      ),
      linear-gradient(
        110deg,
        rgba(var(--player-stats-heading-rgb), 0.12),
        rgba(2, 6, 23, 0.34) 56%,
        rgba(2, 6, 23, 0.18)
      );
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      inset 0 -1px 0 rgba(var(--player-stats-heading-rgb), 0.09),
      0 8px 22px rgba(0, 0, 0, 0.14);
  }

  .player-stats-guild-style .player-stats-site-heading h3 {
    color: #fff;
    text-shadow: 0 0 18px rgba(var(--player-stats-heading-rgb), 0.20);
  }

  .player-stats-guild-style .player-stats-heading-blue { --player-stats-heading-rgb: 59, 130, 246; }
  .player-stats-guild-style .player-stats-heading-cyan { --player-stats-heading-rgb: 6, 182, 212; }
  .player-stats-guild-style .player-stats-heading-rose { --player-stats-heading-rgb: 244, 63, 94; }

  .player-stats-guild-style .player-stats-table-header {
    border-color: rgba(var(--player-stats-panel-rgb), 0.13) !important;
    background:
      radial-gradient(
        ellipse at 10% 0%,
        rgba(var(--player-stats-panel-rgb), 0.18) 0%,
        rgba(var(--player-stats-panel-rgb), 0.07) 48%,
        transparent 82%
      ),
      rgba(2, 6, 23, 0.72) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      0 8px 18px rgba(0, 0, 0, 0.15);
    -webkit-backdrop-filter: blur(12px) saturate(118%);
    backdrop-filter: blur(12px) saturate(118%);
  }

  .player-stats-guild-style .player-stats-match-row,
  .player-stats-guild-style .player-stats-enemy-row {
    --player-row-rgb: 59, 130, 246;
    border-color: rgba(var(--player-row-rgb), 0.09) !important;
    background-color: rgba(2, 6, 23, 0.38) !important;
    background-image:
      radial-gradient(
        ellipse at 7% 0%,
        rgba(var(--player-row-rgb), 0.13) 0%,
        rgba(var(--player-row-rgb), 0.052) 44%,
        transparent 76%
      ),
      linear-gradient(
        145deg,
        rgba(var(--player-row-rgb), 0.035),
        rgba(2, 6, 23, 0.46) 68%
      ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.028),
      0 6px 16px rgba(0, 0, 0, 0.12) !important;
    transition:
      border-color 160ms ease,
      background-image 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .player-stats-guild-style .player-stats-match-row:hover,
  .player-stats-guild-style .player-stats-enemy-row:hover {
    border-color: rgba(var(--player-row-rgb), 0.18) !important;
    background-image:
      radial-gradient(
        ellipse at 7% 0%,
        rgba(var(--player-row-rgb), 0.21) 0%,
        rgba(var(--player-row-rgb), 0.085) 46%,
        transparent 78%
      ),
      linear-gradient(
        145deg,
        rgba(var(--player-row-rgb), 0.055),
        rgba(2, 6, 23, 0.44) 68%
      ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 0 15px rgba(var(--player-row-rgb), 0.11),
      0 8px 18px rgba(0, 0, 0, 0.15) !important;
    transform: translateY(-1px);
  }

  .player-stats-guild-style .player-stats-enemy-row > div:first-child span,
  .player-stats-guild-style .player-stats-match-row > span:first-child {
    border-color: rgba(var(--player-row-rgb), 0.16) !important;
    background: rgba(var(--player-row-rgb), 0.075) !important;
    color: rgba(226, 232, 240, 0.92) !important;
    box-shadow: inset 0 0 0 1px rgba(var(--player-row-rgb), 0.04);
  }

  .player-stats-guild-style .player-stats-enemy-row > div:nth-child(2) > div {
    border-color: rgba(var(--player-row-rgb), 0.13) !important;
    background: rgba(var(--player-row-rgb), 0.065) !important;
  }

  .player-stats-guild-style .player-stats-targets-shell {
    border-color: rgba(148, 163, 184, 0.07) !important;
    background:
      radial-gradient(circle at 11% 100%, rgba(59, 130, 246, 0.12), transparent 36%),
      radial-gradient(circle at 89% 100%, rgba(244, 63, 94, 0.12), transparent 36%),
      linear-gradient(145deg, rgba(2, 6, 23, 0.35), rgba(2, 6, 23, 0.20)) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.028),
      0 10px 26px rgba(0, 0, 0, 0.16) !important;
  }

  .player-stats-guild-style .player-stats-targets-labels {
    min-height: 36px;
    padding: 0 10px;
    border-radius: 13px;
    background:
      linear-gradient(
        90deg,
        rgba(59, 130, 246, 0.11),
        rgba(2, 6, 23, 0.12) 48%,
        rgba(244, 63, 94, 0.11)
      );
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.045);
  }

  .player-stats-guild-style .player-stats-target-row {
    border-radius: 10px;
    background: linear-gradient(
      90deg,
      rgba(59, 130, 246, 0.025),
      rgba(2, 6, 23, 0.08) 50%,
      rgba(244, 63, 94, 0.025)
    );
    transition: background 150ms ease, box-shadow 150ms ease;
  }

  .player-stats-guild-style .player-stats-target-row:hover {
    background: linear-gradient(
      90deg,
      rgba(59, 130, 246, 0.07),
      rgba(2, 6, 23, 0.10) 50%,
      rgba(244, 63, 94, 0.07)
    );
    box-shadow: 0 0 15px rgba(139, 92, 246, 0.055);
  }

  .player-stats-guild-style .player-stats-empty-state {
    border-color: rgba(var(--player-stats-panel-rgb), 0.09) !important;
    background: rgba(2, 6, 23, 0.30) !important;
  }
`;

function PlayerSelect({ players, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = players.find((player) => samePlayerName(player.name, value));

  const list = players.filter((player) =>
    `${player.name} ${player.family || ''}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="relative mb-4 w-full max-w-2xl lg:flex-1">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
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

        <span
          className={`${open ? 'rotate-180 ' : ''}ml-3 shrink-0 text-slate-400 transition`}
        >
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
              <p className="px-3 py-4 text-sm text-slate-500">
                No players found.
              </p>
            ) : (
              <>
                <button
                  type="button"
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
                    type="button"
                    key={player.name}
                    onClick={() => {
                      onChange(player.name);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`mb-1 flex w-full rounded-xl px-3 py-2 text-left text-sm ${
                      samePlayerName(value, player.name)
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


const PLAYER_COMPARE_THEMES = [
  {
    id: 'cyan',
    dot: 'bg-cyan-300',
    border: 'border-cyan-400/30',
    text: 'text-cyan-200',
    soft: 'from-cyan-500/18 via-blue-500/6 to-slate-950/22',
    stroke: '#22d3ee',
    glow: 'rgba(34,211,238,.58)',
    fillStart: 'rgba(34,211,238,.36)',
    fillEnd: 'rgba(37,99,235,.055)',
  },
  {
    id: 'violet',
    dot: 'bg-violet-300',
    border: 'border-violet-400/30',
    text: 'text-violet-200',
    soft: 'from-violet-500/18 via-fuchsia-500/6 to-slate-950/22',
    stroke: '#a78bfa',
    glow: 'rgba(167,139,250,.60)',
    fillStart: 'rgba(167,139,250,.38)',
    fillEnd: 'rgba(126,34,206,.055)',
  },
  {
    id: 'amber',
    dot: 'bg-amber-300',
    border: 'border-amber-400/30',
    text: 'text-amber-200',
    soft: 'from-amber-500/18 via-orange-500/6 to-slate-950/22',
    stroke: '#fbbf24',
    glow: 'rgba(251,191,36,.58)',
    fillStart: 'rgba(251,191,36,.36)',
    fillEnd: 'rgba(245,158,11,.055)',
  },
];

function ComparePlayersSelect({ players, values, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedPlayers = values
    .map((name) =>
      players.find((player) => samePlayerName(player.name, name)),
    )
    .filter(Boolean);

  const list = players.filter((player) =>
    `${player.name} ${player.family || ''}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  const atLimit = values.length >= 3;

  function isSelected(name) {
    return values.some((value) => samePlayerName(value, name));
  }

  function togglePlayer(name) {
    if (isSelected(name)) {
      onChange(
        values.filter((value) => !samePlayerName(value, name)),
      );
      return;
    }

    if (atLimit) return;

    onChange([...values, name]);
  }

  return (
    <div className="relative mb-4 w-full max-w-xl lg:w-[390px] lg:shrink-0">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="flex w-full items-center justify-between rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-left shadow-lg backdrop-blur-xl transition hover:border-violet-300/50 hover:bg-violet-500/15"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Compare players
            </p>

            <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-black text-violet-200">
              {values.length}/3
            </span>
          </div>

          <p className="truncate text-sm font-black">
            {selectedPlayers.length
              ? selectedPlayers.map((player) => player.name).join(' · ')
              : 'Select up to 3 members'}
          </p>
        </div>

        <span
          className={`${open ? 'rotate-180 ' : ''}ml-3 shrink-0 text-slate-400 transition`}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-violet-400/20 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl">
          {selectedPlayers.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
              {selectedPlayers.map((player, index) => {
                const theme =
                  PLAYER_COMPARE_THEMES[index] ||
                  PLAYER_COMPARE_THEMES[0];

                return (
                  <button
                    type="button"
                    key={player.name}
                    onClick={() => togglePlayer(player.name)}
                    className={`inline-flex min-w-0 items-center gap-1.5 rounded-lg border ${theme.border} bg-slate-900/80 px-2 py-1 text-[11px] font-black ${theme.text}`}
                    title={`Remove ${player.name}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`}
                    />
                    <span className="max-w-[120px] truncate">
                      {player.name}
                    </span>
                    <span className="text-slate-500">×</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onChange([])}
                className="ml-auto rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
              >
                Clear
              </button>
            </div>
          )}

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Search members..."
            className="mb-2 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-violet-400"
          />

          <div className={`max-h-72 overflow-y-auto pr-1 ${scrollCls}`}>
            {!list.length ? (
              <p className="px-3 py-4 text-sm text-slate-500">
                No members found.
              </p>
            ) : (
              list.map((player) => {
                const selected = isSelected(player.name);
                const disabled = !selected && atLimit;

                return (
                  <button
                    type="button"
                    key={player.name}
                    disabled={disabled}
                    onClick={() => togglePlayer(player.name)}
                    className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                      selected
                        ? 'bg-violet-500/25 text-violet-100'
                        : disabled
                          ? 'cursor-not-allowed text-slate-700'
                          : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-black ${
                        selected
                          ? 'border-violet-300 bg-violet-400/20 text-violet-100'
                          : 'border-slate-700 bg-slate-900 text-transparent'
                      }`}
                    >
                      ✓
                    </span>

                    <span className="min-w-0 flex-1 truncate font-bold">
                      {player.name}
                    </span>

                    {selected && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-violet-300">
                        Selected
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-white/10 px-1 pt-2">
            <p className="text-[10px] font-bold text-slate-500">
              {atLimit
                ? 'Maximum 3 members selected'
                : `Choose ${3 - values.length} more`}
            </p>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setQuery('');
              }}
              className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200 transition hover:bg-violet-500/20"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function comparisonDateTimestamp(value) {
  const text = String(value || '').trim();

  if (!text) return NaN;

  const dateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateMatch) {
    const [, year, month, day] = dateMatch;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      12,
      0,
      0,
      0,
    ).getTime();
  }

  const timestamp = Date.parse(text);

  return Number.isFinite(timestamp) ? timestamp : NaN;
}

function comparisonDateIsInRange(value, daysAgo) {
  const days = Math.max(0, Number(daysAgo) || 0);

  if (!days) return true;

  const timestamp = comparisonDateTimestamp(value);

  if (!Number.isFinite(timestamp)) return false;

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  start.setHours(0, 0, 0, 0);

  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function comparisonMetricSum(matches, key) {
  return matches
    .filter((match) => getMatchMetricExists(match, key))
    .reduce(
      (sum, match) =>
        sum + Number(getMatchMetricValue(match, key) || 0),
      0,
    );
}

function comparisonMetricMax(matches, key) {
  const values = matches
    .filter((match) => getMatchMetricExists(match, key))
    .map((match) => Number(getMatchMetricValue(match, key)) || 0);

  return values.length ? Math.max(...values) : 0;
}

function comparisonMetricAverage(matches, key, getValue = null) {
  const values = matches
    .filter((match) => getMatchMetricExists(match, key))
    .map((match) =>
      Number(
        getValue
          ? getValue(match)
          : getMatchMetricValue(match, key),
      ),
    )
    .filter((value) => Number.isFinite(value));

  if (!values.length) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function radarPoint(cx, cy, radius, index, count) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;

  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function radarPolygonPoints(cx, cy, radius, count, scale = 1) {
  return Array.from({ length: count }, (_, index) => {
    const point = radarPoint(cx, cy, radius * scale, index, count);

    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }).join(' ');
}

function PlayerComparisonPanel({
  players,
  benchmarks,
  daysAgo,
  onDaysAgoChange,
  mode,
  onModeChange,
}) {
  const metrics = [
    {
      key: 'kills',
      label: 'Kills',
      icon: '⚔',
      format: (value) => formatCompactNumber(value),
    },
    {
      key: 'wars',
      label: 'Wars',
      icon: '⚑',
      format: (value) => formatCompactNumber(value),
    },
    {
      key: 'kd',
      label: 'K/D',
      icon: '◎',
      format: (value) => Number(value || 0).toFixed(2),
    },
    {
      key: 'killstreak',
      label: 'Killstreak',
      icon: 'ϟ',
      format: (value) => formatCompactNumber(value),
    },
    {
      key: 'killfeed',
      label: 'Killfeed',
      icon: '🔥',
      format: (value) => formatCompactNumber(value),
    },
    {
      key: 'damageDealt',
      label: 'DMG Dealt',
      icon: '✦',
      format: (value) => formatCompactNumber(value),
    },
    {
      key: 'ccHits',
      label: 'CC Hits',
      icon: '⛓',
      format: (value) => formatCompactNumber(value),
    },
    {
      key: 'damageToFort',
      label: 'Fort DMG',
      icon: '♜',
      format: (value) => formatCompactNumber(value),
    },
  ];
  const [hoveredMetricKey, setHoveredMetricKey] = useState('');

  if (!players.length) return null;

  const cx = 390;
  const cy = 330;
  const radius = 190;
  const metricCount = metrics.length;
  const activeMetric =
    metrics.find((metric) => metric.key === hoveredMetricKey) || null;

  const metricScales = Object.fromEntries(
    metrics.map((metric) => {
      const fallbackValues = players.map(
        (player) => Number(player[metric.key]) || 0,
      );
      const fallbackMaximum = Math.max(1, ...fallbackValues);
      const source = benchmarks?.[metric.key];

      return [
        metric.key,
        {
          average: Number(source?.average) || 0,
          maximum:
            Number(source?.maximum) > 0
              ? Number(source.maximum)
              : fallbackMaximum,
          players: Number(source?.players) || 0,
        },
      ];
    }),
  );

  function normalizedScore(player, metric) {
    const value = Math.max(
      0,
      Number(player[metric.key]) || 0,
    );
    const maximum =
      Number(metricScales[metric.key]?.maximum) || 1;

    return Math.max(
      0,
      Math.min(100, (value / maximum) * 100),
    );
  }

  const guildAveragePoints = metrics.map(
    (metric, index) => {
      const scale = metricScales[metric.key];
      const maximum = Number(scale?.maximum) || 1;
      const average = Math.max(
        0,
        Number(scale?.average) || 0,
      );
      const score = Math.max(
        0,
        Math.min(100, (average / maximum) * 100),
      );
      const point = radarPoint(
        cx,
        cy,
        radius * (score / 100),
        index,
        metricCount,
      );

      return {
        ...point,
        metric,
        value: average,
      };
    },
  );

  const playerSeries = players.map((player, playerIndex) => {
    const theme =
      PLAYER_COMPARE_THEMES[playerIndex] ||
      PLAYER_COMPARE_THEMES[0];
    const points = metrics.map((metric, index) => {
      const score = normalizedScore(player, metric);
      const point = radarPoint(
        cx,
        cy,
        radius * (score / 100),
        index,
        metricCount,
      );

      return {
        ...point,
        metric,
        value: player[metric.key],
        score,
      };
    });

    return {
      player,
      theme,
      points,
      polygon: points
        .map(
          (point) =>
            `${point.x.toFixed(2)},${point.y.toFixed(2)}`,
        )
        .join(' '),
    };
  });

  const metricLeaders = Object.fromEntries(
    metrics.map((metric) => {
      const highest = Math.max(
        ...players.map(
          (player) => Number(player[metric.key]) || 0,
        ),
      );

      return [
        metric.key,
        players
          .filter(
            (player) =>
              (Number(player[metric.key]) || 0) === highest,
          )
          .map((player) => player.name),
      ];
    }),
  );

  const hasData = metrics.some((metric) =>
    players.some((player) => Number(player[metric.key]) > 0),
  );

  return (
    <div className="adversary-panel player-comparison-panel player-stats-guild-panel player-stats-accent-violet relative mb-5 overflow-hidden rounded-[32px] border border-white/[0.12] bg-[linear-gradient(145deg,rgba(15,23,42,.20),rgba(2,6,23,.12)_48%,rgba(15,23,42,.18))] shadow-[0_34px_110px_rgba(0,0,0,.28)] backdrop-blur-[2px]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/55 to-transparent" />
        <div className="absolute -left-28 -top-24 h-[360px] w-[360px] rounded-full bg-violet-600/[0.06] blur-[100px]" />
        <div className="absolute right-[12%] -top-32 h-[340px] w-[340px] rounded-full bg-blue-500/[0.05] blur-[110px]" />
        <div className="absolute -bottom-40 right-[-60px] h-[420px] w-[420px] rounded-full bg-fuchsia-600/[0.045] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(96,165,250,.065),transparent_46%)]" />
        <div className="absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_88%)] bg-[linear-gradient(rgba(148,163,184,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.035)_1px,transparent_1px)] bg-[size:38px_38px]" />
      </div>

      <div className="relative flex flex-col gap-3 border-b border-white/[0.07] bg-white/[0.018] px-4 py-4 backdrop-blur-2xl xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-500/20 to-blue-500/10 shadow-[0_0_30px_rgba(139,92,246,.16)]">
            <div className="absolute inset-1 rounded-xl border border-white/[0.07]" />
            <div className="h-[17px] w-[17px] rotate-45 border-2 border-violet-200/90 shadow-[0_0_14px_rgba(196,181,253,.55)]" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-white">
                Player Comparison
              </h3>

              <span className="rounded-full border border-violet-300/25 bg-violet-500/12 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-violet-200 shadow-[0_0_18px_rgba(139,92,246,.09)]">
                Glass Radar
              </span>
            </div>

            <p className="mt-0.5 text-xs font-bold text-slate-500">
              {daysAgo === 0
                ? 'All-time statistics'
                : `Last ${daysAgo} days`}
              {' · '}
              {mode === 'average'
                ? 'Average per war'
                : 'Totals and best records'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              Days Ago
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={daysAgo}
              onChange={(event) =>
                onDaysAgoChange(
                  Math.max(
                    0,
                    Math.floor(Number(event.target.value) || 0),
                  ),
                )
              }
              className="h-10 w-[100px] rounded-xl border border-white/[0.09] bg-slate-950/55 px-3 text-sm font-black text-slate-100 shadow-inner outline-none backdrop-blur-xl transition focus:border-violet-300/45 focus:bg-violet-500/[0.06] focus:shadow-[0_0_24px_rgba(139,92,246,.13)]"
              title="Use 0 for all time"
            />
          </label>

          <div>
            <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
              View
            </span>

            <div className="flex h-10 rounded-xl border border-white/[0.09] bg-slate-950/55 p-1 shadow-inner backdrop-blur-xl">
              {[
                ['total', 'Total'],
                ['average', 'Average'],
              ].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => onModeChange(id)}
                  className={`relative overflow-hidden rounded-lg px-3.5 text-[10px] font-black uppercase tracking-[0.12em] transition ${
                    mode === id
                      ? 'border border-violet-300/25 bg-gradient-to-r from-violet-600/35 to-blue-500/20 text-violet-100 shadow-[0_0_22px_rgba(139,92,246,.16)]'
                      : 'border border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-slate-200'
                  }`}
                >
                  {mode === id && (
                    <span className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-300/90 to-transparent" />
                  )}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative grid h-[calc(100dvh-250px)] min-h-[560px] items-stretch gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_600px]">
        <div className="relative h-full min-h-0 overflow-hidden rounded-[28px] border border-white/[0.10] bg-[linear-gradient(145deg,rgba(15,23,42,.18),rgba(2,6,23,.10))] shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_24px_70px_rgba(0,0,0,.20)] backdrop-blur-[2px]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[7%] top-[12%] h-52 w-52 rounded-full bg-violet-600/[0.065] blur-[90px]" />
            <div className="absolute right-[8%] top-[20%] h-48 w-48 rounded-full bg-blue-500/[0.055] blur-[90px]" />
            <div className="absolute bottom-[4%] left-[38%] h-52 w-52 rounded-full bg-fuchsia-500/[0.045] blur-[100px]" />
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(30,64,175,.12),transparent_48%)]" />
          </div>

          <div className="pointer-events-none absolute inset-x-5 top-4 z-10 flex items-center justify-between gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-slate-950/40 px-3 py-2 text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 shadow-[0_10px_30px_rgba(0,0,0,.2)] backdrop-blur-2xl">
              Hover a metric to highlight
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-white/[0.08] bg-slate-950/38 px-4 py-2.5 shadow-[0_12px_34px_rgba(0,0,0,.22)] backdrop-blur-2xl">
              {players.map((player, index) => {
                const theme =
                  PLAYER_COMPARE_THEMES[index] ||
                  PLAYER_COMPARE_THEMES[0];

                return (
                  <div
                    key={`${player.name}-legend`}
                    className="flex min-w-0 items-center gap-1.5"
                  >
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.dot}`}
                      style={{
                        boxShadow: `0 0 13px ${theme.stroke}`,
                      }}
                    />
                    <span
                      className={`max-w-[150px] truncate text-[13px] font-black ${theme.text}`}
                      title={player.name}
                    >
                      {player.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {!hasData ? (
            <div className="relative flex h-full min-h-0 items-center justify-center px-6 text-center">
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] px-8 py-7 backdrop-blur-xl">
                <p className="text-sm font-black text-slate-300">
                  No comparison data in this period.
                </p>
                <p className="mt-1 text-xs font-bold text-slate-600">
                  Increase Days Ago or use 0 for all time.
                </p>
              </div>
            </div>
          ) : (
            <svg
              viewBox="0 0 780 660"
              className="relative h-full w-full"
              role="img"
              aria-label="Glass radar chart comparing selected players"
              onMouseLeave={() => setHoveredMetricKey('')}
            >
              <defs>
                <radialGradient id="glassRadarBackdrop">
                  <stop offset="0%" stopColor="rgba(96,165,250,.12)" />
                  <stop offset="48%" stopColor="rgba(139,92,246,.055)" />
                  <stop offset="100%" stopColor="rgba(2,6,23,0)" />
                </radialGradient>

                <linearGradient
                  id="glassRadarGrid"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor="rgba(196,181,253,.42)" />
                  <stop offset="48%" stopColor="rgba(96,165,250,.20)" />
                  <stop offset="100%" stopColor="rgba(148,163,184,.08)" />
                </linearGradient>

                <linearGradient
                  id="glassRadarAxis"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="rgba(196,181,253,.48)" />
                  <stop offset="54%" stopColor="rgba(96,165,250,.18)" />
                  <stop offset="100%" stopColor="rgba(71,85,105,.06)" />
                </linearGradient>

                <linearGradient
                  id="glassMetricPill"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor="rgba(139,92,246,.22)" />
                  <stop offset="54%" stopColor="rgba(30,41,59,.82)" />
                  <stop offset="100%" stopColor="rgba(2,6,23,.86)" />
                </linearGradient>

                <filter
                  id="glassRadarPointGlow"
                  x="-120%"
                  y="-120%"
                  width="340%"
                  height="340%"
                >
                  <feGaussianBlur stdDeviation="4.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {playerSeries.map(({ theme }) => (
                  <linearGradient
                    key={`${theme.id}-gradient`}
                    id={`compareGradient-${theme.id}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={theme.fillStart} />
                    <stop offset="58%" stopColor={theme.fillStart} />
                    <stop offset="100%" stopColor={theme.fillEnd} />
                  </linearGradient>
                ))}

                {playerSeries.map(({ theme }) => (
                  <radialGradient
                    key={`${theme.id}-point-gradient`}
                    id={`comparePoint-${theme.id}`}
                  >
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="32%" stopColor={theme.stroke} />
                    <stop offset="100%" stopColor={theme.stroke} />
                  </radialGradient>
                ))}
              </defs>

              <circle
                cx={cx}
                cy={cy}
                r={radius + 110}
                fill="url(#glassRadarBackdrop)"
              />

              <circle
                cx={cx}
                cy={cy}
                r={radius + 46}
                fill="none"
                stroke="rgba(139,92,246,.055)"
                strokeWidth="34"
              />

              {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
                <polygon
                  key={scale}
                  points={radarPolygonPoints(
                    cx,
                    cy,
                    radius,
                    metricCount,
                    scale,
                  )}
                  fill={
                    scale === 1
                      ? 'rgba(15,23,42,.20)'
                      : 'rgba(255,255,255,.006)'
                  }
                  stroke="url(#glassRadarGrid)"
                  strokeOpacity={0.20 + scale * 0.31}
                  strokeWidth={scale === 1 ? 1.6 : 1}
                />
              ))}

              <circle
                cx={cx}
                cy={cy}
                r="5"
                fill="rgba(221,214,254,.92)"
                filter="url(#glassRadarPointGlow)"
              />

              {metrics.map((metric, index) => {
                const active = hoveredMetricKey === metric.key;
                const axisEnd = radarPoint(
                  cx,
                  cy,
                  radius,
                  index,
                  metricCount,
                );
                const labelPoint = radarPoint(
                  cx,
                  cy,
                  radius + 58,
                  index,
                  metricCount,
                );
                const anchor =
                  Math.abs(labelPoint.x - cx) < 18
                    ? 'middle'
                    : labelPoint.x > cx
                      ? 'start'
                      : 'end';
                const pillWidth = 122;
                const pillX =
                  anchor === 'middle'
                    ? labelPoint.x - pillWidth / 2
                    : anchor === 'start'
                      ? labelPoint.x - 10
                      : labelPoint.x - pillWidth + 10;

                return (
                  <g
                    key={metric.key}
                    onMouseEnter={() =>
                      setHoveredMetricKey(metric.key)
                    }
                    onClick={() =>
                      setHoveredMetricKey((current) =>
                        current === metric.key ? '' : metric.key,
                      )
                    }
                    className="cursor-pointer"
                  >
                    <line
                      x1={cx}
                      y1={cy}
                      x2={axisEnd.x}
                      y2={axisEnd.y}
                      stroke={
                        active
                          ? 'rgba(196,181,253,.95)'
                          : 'url(#glassRadarAxis)'
                      }
                      strokeWidth={active ? 2.2 : 1}
                      style={{
                        filter: active
                          ? 'drop-shadow(0 0 7px rgba(167,139,250,.78))'
                          : 'none',
                      }}
                    />

                    <line
                      x1={cx}
                      y1={cy}
                      x2={labelPoint.x}
                      y2={labelPoint.y}
                      stroke="transparent"
                      strokeWidth="38"
                    />

                    <rect
                      x={pillX}
                      y={labelPoint.y - 17}
                      width={pillWidth}
                      height="34"
                      rx="12"
                      fill="url(#glassMetricPill)"
                      fillOpacity={active ? 1 : 0.72}
                      stroke={
                        active
                          ? 'rgba(196,181,253,.72)'
                          : 'rgba(148,163,184,.16)'
                      }
                      strokeWidth="1"
                      style={{
                        filter: active
                          ? 'drop-shadow(0 0 11px rgba(139,92,246,.28))'
                          : 'drop-shadow(0 7px 14px rgba(0,0,0,.18))',
                      }}
                    />

                    <text
                      x={
                        anchor === 'middle'
                          ? labelPoint.x
                          : anchor === 'start'
                            ? labelPoint.x + 4
                            : labelPoint.x - 4
                      }
                      y={labelPoint.y}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fill={
                        active
                          ? 'rgba(237,233,254,.98)'
                          : 'rgba(203,213,225,.84)'
                      }
                      fontSize="11.5"
                      fontWeight="900"
                      letterSpacing=".55"
                    >
                      {`${metric.icon}  ${metric.label}`}
                    </text>
                  </g>
                );
              })}

              <polygon
                points={guildAveragePoints
                  .map(
                    (point) =>
                      `${point.x.toFixed(2)},${point.y.toFixed(2)}`,
                  )
                  .join(' ')}
                fill="rgba(148,163,184,.018)"
                stroke="rgba(203,213,225,.58)"
                strokeWidth="1.7"
                strokeDasharray="7 7"
                strokeLinejoin="round"
              >
                <title>Guild average</title>
              </polygon>

              {guildAveragePoints.map((point) => (
                <circle
                  key={`guild-average-${point.metric.key}`}
                  cx={point.x}
                  cy={point.y}
                  r={
                    hoveredMetricKey === point.metric.key
                      ? 5
                      : 3
                  }
                  fill="rgba(226,232,240,.84)"
                  stroke="rgba(15,23,42,.96)"
                  strokeWidth="1.5"
                  onMouseEnter={() =>
                    setHoveredMetricKey(point.metric.key)
                  }
                  className="cursor-pointer"
                >
                  <title>
                    {`Guild Average · ${point.metric.label}: ${point.metric.format(point.value)}`}
                  </title>
                </circle>
              ))}

              {playerSeries.map(
                ({ player, theme, points, polygon }) => (
                  <g key={player.name}>
                    <polygon
                      points={polygon}
                      fill="none"
                      stroke={theme.stroke}
                      strokeWidth="10"
                      strokeOpacity=".08"
                      strokeLinejoin="round"
                      style={{
                        filter: `drop-shadow(0 0 16px ${theme.glow})`,
                      }}
                    />

                    <polygon
                      points={polygon}
                      fill={`url(#compareGradient-${theme.id})`}
                      stroke={theme.stroke}
                      strokeWidth="2.6"
                      strokeLinejoin="round"
                      style={{
                        filter: `drop-shadow(0 0 7px ${theme.glow})`,
                      }}
                    >
                      <title>{player.name}</title>
                    </polygon>

                    {points.map((point) => {
                      const active =
                        hoveredMetricKey === point.metric.key;

                      return (
                        <g
                          key={`${player.name}-${point.metric.key}`}
                          onMouseEnter={() =>
                            setHoveredMetricKey(
                              point.metric.key,
                            )
                          }
                          onClick={() =>
                            setHoveredMetricKey(
                              point.metric.key,
                            )
                          }
                          className="cursor-pointer"
                        >
                          {active && (
                            <circle
                              cx={point.x}
                              cy={point.y}
                              r="11"
                              fill={theme.stroke}
                              fillOpacity=".12"
                              stroke={theme.stroke}
                              strokeOpacity=".24"
                            />
                          )}

                          <circle
                            cx={point.x}
                            cy={point.y}
                            r={active ? 6.4 : 4.8}
                            fill={`url(#comparePoint-${theme.id})`}
                            stroke="rgba(2,6,23,.92)"
                            strokeWidth="2"
                            filter={
                              active
                                ? 'url(#glassRadarPointGlow)'
                                : undefined
                            }
                          >
                            <title>
                              {`${player.name} · ${point.metric.label}: ${point.metric.format(point.value)}`}
                            </title>
                          </circle>
                        </g>
                      );
                    })}
                  </g>
                ),
              )}
            </svg>
          )}

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-2xl border border-white/[0.08] bg-slate-950/42 px-3 py-2 text-center text-[9px] font-bold text-slate-500 shadow-[0_12px_34px_rgba(0,0,0,.20)] backdrop-blur-2xl">
            Stable guild-wide scale · dashed polygon is the guild average
          </div>
        </div>

        <div className="h-full min-h-0">
          <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-white/[0.08] bg-slate-950/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.045),0_18px_50px_rgba(0,0,0,.22)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-blue-500/8 blur-3xl" />

            <div className="relative mb-1 block">
              <div className="min-w-0">
                <p className="text-[12px] font-black uppercase tracking-[0.12em] text-slate-200">
                  Comparison
                </p>
              </div>

            </div>

            <div className="relative grid min-h-0 flex-1 grid-cols-2 grid-rows-4 gap-1.5">
              {metrics.map((metric) => {
                const active = hoveredMetricKey === metric.key;

                return (
                  <button
                    type="button"
                    key={`${metric.key}-comparison-row`}
                    onMouseEnter={() =>
                      setHoveredMetricKey(metric.key)
                    }
                    onMouseLeave={() =>
                      setHoveredMetricKey('')
                    }
                    onClick={() =>
                      setHoveredMetricKey((current) =>
                        current === metric.key ? '' : metric.key,
                      )
                    }
                    className={`flex min-h-0 flex-col justify-center rounded-2xl border px-3 py-2 text-left transition ${
                      active
                        ? 'border-violet-300/25 bg-violet-500/[0.075] shadow-[0_0_18px_rgba(139,92,246,.07)]'
                        : 'border-white/[0.045] bg-slate-950/18 hover:border-white/[0.08] hover:bg-white/[0.025]'
                    }`}
                  >
                    <div className="mb-1.5 space-y-1">
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[12px] ${
                            active
                              ? 'border-violet-300/25 bg-violet-500/12 text-violet-200'
                              : 'border-white/[0.06] bg-slate-950/34 text-slate-500'
                          }`}
                        >
                          {metric.icon}
                        </span>

                        <span className="whitespace-normal break-words text-[12px] font-black uppercase leading-[1.05] tracking-[0.04em] text-white">
                          {metric.label}
                        </span>
                      </div>

                      <div className="flex min-h-[26px] w-full items-center justify-between gap-3 rounded-lg border border-white/[0.075] bg-slate-950/50 px-2.5 py-0.5 text-[11px] font-black text-slate-300">
                        <span>Guild average</span>

                        <b className="text-[11px] font-black text-slate-100">
                          {metric.format(
                            metricScales[metric.key]?.average,
                          )}
                        </b>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {players.map((player, index) => {
                        const theme =
                          PLAYER_COMPARE_THEMES[index] ||
                          PLAYER_COMPARE_THEMES[0];
                        const width = Math.max(
                          3,
                          normalizedScore(player, metric),
                        );
                        const isLeader =
                          metricLeaders[metric.key]?.some(
                            (name) =>
                              samePlayerName(name, player.name),
                          );

                        return (
                          <div
                            key={`${metric.key}-${player.name}-stacked`}
                            className="relative h-[24px] overflow-hidden rounded-lg border border-white/[0.07] bg-slate-950/72 shadow-inner"
                            title={`${player.name}: ${metric.format(
                              player[metric.key],
                            )}`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 rounded-lg transition-all duration-300"
                              style={{
                                width: `${width}%`,
                                minWidth: width > 0 ? '4px' : '0',
                                background: `linear-gradient(90deg, ${theme.stroke}30, ${theme.stroke}d9)`,
                                boxShadow: active
                                  ? `0 0 12px ${theme.glow}`
                                  : `0 0 7px ${theme.stroke}24`,
                              }}
                            />

                            <div className="absolute inset-0 flex items-center justify-between gap-2 px-2.5">
                              <div className="flex min-w-0 items-center gap-1">
                                <span
                                  className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`}
                                  style={{
                                    boxShadow: `0 0 7px ${theme.stroke}`,
                                  }}
                                />

                                <span
                                  className="truncate text-[11px] font-black text-slate-50 drop-shadow-[0_1px_2px_rgba(0,0,0,.95)]"
                                  title={player.name}
                                >
                                  {player.name}
                                </span>
                              </div>

                              <span
                                className={`shrink-0 text-[11px] font-black ${theme.text} drop-shadow-[0_1px_2px_rgba(0,0,0,.95)]`}
                              >
                                {isLeader && (
                                  <span className="mr-0.5 text-amber-300">
                                    ♛
                                  </span>
                                )}
                                {metric.format(
                                  player[metric.key],
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="relative mt-2 text-center text-[11px] font-bold text-slate-600">
              0 Days Ago shows all available history
            </p>
          </div>
        </div>
      </div>


    </div>
  );
}

function shortenMiddle(name, maxLength = 12) {
  const text = String(name || '');

  if (text.length <= maxLength) return text;

  const left = Math.ceil((maxLength - 1) / 2);
  const right = Math.floor((maxLength - 1) / 2);

  return `${text.slice(0, left)}…${text.slice(text.length - right)}`;
}

function TargetName({ name, side }) {
  return (
    <span
      title={name}
      className={`block max-w-full overflow-hidden whitespace-nowrap text-[clamp(10px,1.05vw,14px)] font-black leading-none text-white ${
        side === 'left' ? 'text-right' : 'text-left'
      }`}
      style={{
        textShadow:
          side === 'left'
            ? '0 0 5px rgba(59,130,246,.45), 0 1px 2px rgba(0,0,0,.7)'
            : '0 0 5px rgba(244,63,94,.45), 0 1px 2px rgba(0,0,0,.7)',
      }}
    >
      {shortenMiddle(name, 12)}
    </span>
  );
}

function TargetsAndNemesisPanel({ favouriteTargets, nemesisTargets }) {
  const favouriteRows = useMemo(() => {
    return [...favouriteTargets]
      .map((item) => ({
        name: item.name,
        kills: Number(item.kills) || 0,
      }))
      .filter((item) => item.kills > 0)
      .sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [favouriteTargets]);

  const nemesisRows = useMemo(() => {
    return [...nemesisTargets]
      .map((item) => ({
        name: item.name,
        kills: Number(item.kills) || 0,
      }))
      .filter((item) => item.kills > 0)
      .sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [nemesisTargets]);

  const rows = Array.from({ length: 10 }, (_, index) => ({
    favourite: favouriteRows[index] || null,
    nemesis: nemesisRows[index] || null,
  }));

  const max = Math.max(
    1,
    ...favouriteRows.map((item) => item.kills),
    ...nemesisRows.map((item) => item.kills),
  );

  const hasData = favouriteRows.length || nemesisRows.length;

  const blueShade = 'from-blue-500/80 via-sky-500/75 to-cyan-400/70';
  const redShade = 'from-rose-500/80 via-red-500/75 to-pink-400/70';

  return (
    <div className="player-stats-guild-panel player-stats-accent-rose player-stats-targets-panel h-full rounded-[28px] border border-slate-700/70 bg-slate-950/14 p-4 shadow-[0_24px_80px_rgba(0,0,0,.22)] backdrop-blur-[2px]">
      <div className="flex h-full flex-col">
        <div className="player-stats-site-heading player-stats-heading-rose mb-4">
          <h3 className="text-2xl font-black">Targets & Nemesis</h3>
        </div>

        <div className="player-stats-targets-shell relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/16 p-4 shadow-[0_24px_80px_rgba(0,0,0,.32)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="absolute inset-x-4 bottom-0 h-32 bg-gradient-to-t from-violet-500/8 via-sky-500/8 to-transparent blur-3xl" />
          </div>

          <div className="player-stats-targets-labels relative mb-4 grid grid-cols-[1fr_1px_1fr] items-center text-xs font-black uppercase tracking-[0.18em]">
            <div className="pr-4 text-right text-blue-300">
              Favourite Targets
            </div>

            <div className="h-5 bg-slate-500/80" />

            <div className="pl-4 text-left text-pink-300">Nemesis</div>
          </div>

          {!hasData ? (
            <p className="player-stats-empty-state relative rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-6 text-center text-sm text-slate-500">
              No target data yet.
            </p>
          ) : (
            <div className="relative flex h-[calc(100%-36px)] flex-col justify-between gap-2">
              {rows.map((row, index) => {
                const favouriteWidth = row.favourite
                  ? Math.round((row.favourite.kills / max) * 100)
                  : 0;

                const nemesisWidth = row.nemesis
                  ? Math.round((row.nemesis.kills / max) * 100)
                  : 0;

                const finalFavouriteWidth = row.favourite
                  ? Math.max(18, favouriteWidth)
                  : 0;

                const finalNemesisWidth = row.nemesis
                  ? Math.max(18, nemesisWidth)
                  : 0;

                return (
                  <div
                    key={`${row.favourite?.name || 'empty'}-${row.nemesis?.name || 'empty'}-${index}`}
                    className="player-stats-target-row min-h-0"
                  >
                    <div className="grid h-[36px] grid-cols-[1fr_1px_1fr] items-center">
                      <div className="relative flex h-full items-center justify-end pr-1">
                        {row.favourite && (
                          <>
                            <span className="mr-1 min-w-[32px] shrink-0 text-right text-sm font-black text-slate-100">
                              {row.favourite.kills}
                            </span>

                            <div className="relative h-full w-full overflow-hidden rounded-l-md">
                              <div
                                className={`absolute right-0 top-0 h-full rounded-l-md bg-gradient-to-l ${blueShade} shadow-[0_0_14px_rgba(59,130,246,.18)]`}
                                style={{
                                  width: `${finalFavouriteWidth}%`,
                                }}
                              />

                              <div
                                className="absolute inset-y-0 right-0 flex min-w-0 items-center justify-end px-2"
                                style={{
                                  width: `${finalFavouriteWidth}%`,
                                }}
                              >
                                <TargetName
                                  name={row.favourite.name}
                                  side="left"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="h-full bg-slate-500/90" />

                      <div className="relative flex h-full items-center justify-start pl-1">
                        {row.nemesis && (
                          <>
                            <div className="relative h-full w-full overflow-hidden rounded-r-md">
                              <div
                                className={`absolute left-0 top-0 h-full rounded-r-md bg-gradient-to-r ${redShade} shadow-[0_0_14px_rgba(244,63,94,.18)]`}
                                style={{
                                  width: `${finalNemesisWidth}%`,
                                }}
                              />

                              <div
                                className="absolute inset-y-0 left-0 flex min-w-0 items-center px-2"
                                style={{
                                  width: `${finalNemesisWidth}%`,
                                }}
                              >
                                <TargetName
                                  name={row.nemesis.name}
                                  side="right"
                                />
                              </div>
                            </div>

                            <span className="ml-1 min-w-[32px] shrink-0 text-left text-sm font-black text-slate-100">
                              {row.nemesis.kills}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortButton({ id, label, sort, setSort, align = 'left' }) {
  const active = sort.key === id;

  function toggle() {
    if (sort.key === id) {
      setSort({
        key: id,
        dir: sort.dir === 'desc' ? 'asc' : 'desc',
      });
      return;
    }

    setSort({
      key: id,
      dir: id === 'guild' ? 'asc' : 'desc',
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-full text-[11px] font-black uppercase tracking-[0.16em] transition hover:text-blue-300 ${
        active ? 'text-blue-300' : 'text-slate-400'
      } ${align === 'center' ? 'text-center' : 'text-left'}`}
    >
      {label} {active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}
    </button>
  );
}

function EnemyGuildTable({ rows }) {
  const [sort, setSort] = useState({
    key: 'avgRatio',
    dir: 'desc',
  });

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let av = a[sort.key];
      let bv = b[sort.key];

      if (sort.key === 'guild') {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
      }

      if (typeof av === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }

      av = Number(av) || 0;
      bv = Number(bv) || 0;

      if (av === bv) {
        return a.name.localeCompare(b.name);
      }

      return sort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [rows, sort]);

  return (
    <div className="player-stats-guild-panel player-stats-accent-cyan player-stats-enemy-panel rounded-[28px] border border-slate-700/70 bg-slate-950/14 p-4 shadow-[0_24px_80px_rgba(0,0,0,.22)] backdrop-blur-[2px]">
      <div className="player-stats-site-heading player-stats-heading-cyan mb-4">
        <h3 className="text-2xl font-black">Enemy Guilds</h3>
      </div>

      {!sortedRows.length ? (
        <p className="text-slate-500">No enemy guild interactions found.</p>
      ) : (
        <div className={`max-h-[520px] overflow-y-auto pr-2 ${scrollCls}`}>
          <div className="space-y-2">
            <div className="player-stats-table-header sticky top-0 z-10 grid grid-cols-[minmax(150px,1.45fr)_72px_54px_54px_142px] gap-2 rounded-2xl border border-slate-800 bg-slate-950/34 px-3 py-2.5 backdrop-blur-[2px]">
              <SortButton
                id="guild"
                label="Guild"
                sort={sort}
                setSort={setSort}
              />

              <SortButton
                id="wars"
                label="Wars"
                sort={sort}
                setSort={setSort}
                align="center"
              />

              <SortButton
                id="kills"
                label="K"
                sort={sort}
                setSort={setSort}
                align="center"
              />

              <SortButton
                id="deaths"
                label="D"
                sort={sort}
                setSort={setSort}
                align="center"
              />

              <SortButton
                id="avgRatio"
                label="Average K / D"
                sort={sort}
                setSort={setSort}
                align="center"
              />
            </div>

            {sortedRows.map((guild, index) => {
              const positive = guild.avgKills >= guild.avgDeaths;

              return (
                <div
                  key={guild.name}
                  className="player-stats-enemy-row grid grid-cols-[minmax(150px,1.45fr)_72px_54px_54px_142px] items-center gap-2 rounded-2xl border border-slate-800/90 bg-gradient-to-r from-slate-950/95 via-slate-900/70 to-slate-950/95 px-3 py-2.5 shadow-[0_8px_22px_rgba(0,0,0,.20)] transition hover:border-slate-700 hover:shadow-[0_10px_26px_rgba(0,0,0,.30)]"
                  style={{ '--player-row-rgb': positive ? '16, 185, 129' : '244, 63, 94' }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[11px] font-black text-slate-300">
                        {index + 1}
                      </span>

                      <p className="truncate text-sm font-black text-slate-100">
                        {guild.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="inline-flex min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs font-black text-slate-100">
                      {guild.wars}
                    </div>
                  </div>

                  <div className="text-center text-sm font-black text-cyan-300">
                    {guild.kills}
                  </div>

                  <div className="text-center text-sm font-black text-pink-300">
                    {guild.deaths}
                  </div>

                  <div className="text-center">
                    <div
                      className={`inline-flex min-w-[112px] items-center justify-center rounded-xl border px-2.5 py-1.5 text-xs font-black shadow-inner ${
                        positive
                          ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                          : 'border-rose-400/25 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      <span className="text-cyan-300">
                        {guild.avgKills.toFixed(2)}
                      </span>
                      <span className="mx-1.5 text-slate-500">/</span>
                      <span className="text-pink-300">
                        {guild.avgDeaths.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function normalizePlayerName(value) {
  const key = String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();

  if (key === 'mrsracoon' || key === 'mrsraccoon') {
    return 'mrsraccoon';
  }

  return key;
}

function samePlayerName(left, right) {
  const a = normalizePlayerName(left);
  const b = normalizePlayerName(right);

  return Boolean(a && b && a === b);
}

function getPlayerKeyFromObject(object, playerName) {
  if (!object) return null;

  if (Object.prototype.hasOwnProperty.call(object, playerName)) {
    return playerName;
  }

  const target = normalizePlayerName(playerName);

  if (!target) return null;

  return Object.keys(object).find((key) => normalizePlayerName(key) === target) || null;
}

function getPlayerObjectValue(object, playerName, fallback = 0) {
  const key = getPlayerKeyFromObject(object, playerName);

  return key == null ? fallback : object[key];
}

function getGuildPlayerFromEvent(event) {
  return event?.guildPlayer || (event?.type === 'kill' ? event?.killer : event?.victim) || '';
}

function getEnemyPlayerFromEvent(event) {
  return event?.enemyPlayer || (event?.type === 'kill' ? event?.victim : event?.killer) || '';
}

function getWarEventsSorted(events) {
  return [...events].sort((a, b) => {
    if (Number(a.sec) !== Number(b.sec)) {
      return Number(a.sec) - Number(b.sec);
    }

    return Number(a.i || 0) - Number(b.i || 0);
  });
}

function getBestKillstreakForWar(events, playerName) {
  const sorted = getWarEventsSorted(events);

  let current = 0;
  let best = 0;

  sorted.forEach((event) => {
    const guildPlayer = getGuildPlayerFromEvent(event);

    if (event.type === 'kill' && samePlayerName(guildPlayer, playerName)) {
      current += 1;
      best = Math.max(best, current);
    }

    if (event.type === 'death' && samePlayerName(guildPlayer, playerName)) {
      current = 0;
    }
  });

  return best;
}

function getBestKillfeedForWar(events, playerName, seconds = 10) {
  const kills = events
    .filter(
      (event) => event.type === 'kill' && samePlayerName(getGuildPlayerFromEvent(event), playerName),
    )
    .sort((a, b) => Number(a.sec) - Number(b.sec));

  let left = 0;
  let best = 0;

  for (let right = 0; right < kills.length; right += 1) {
    while (kills[right].sec - kills[left].sec > seconds) {
      left += 1;
    }

    best = Math.max(best, right - left + 1);
  }

  return best;
}

function averageRankEventKey(event) {
  return [
    String(Number(event?.sec) || 0).padStart(8, '0'),
    String(Number(event?.i) || 0).padStart(8, '0'),
  ].join(' ');
}

function averageRankFallbackKey(index = 0) {
  return `99999999 ${String(index).padStart(8, '0')}`;
}

function buildUniqueAverageRank(
  rows,
  metric,
  desc = true,
  chronologyFields = [],
) {
  const eligibleRows = rows.filter((row) => row?.__has?.[metric]);

  return Object.fromEntries(
    [...eligibleRows]
      .sort((a, b) => {
        const av = Number(a[metric]) || 0;
        const bv = Number(b[metric]) || 0;

        if (av !== bv) {
          return desc ? bv - av : av - bv;
        }

        for (const field of chronologyFields) {
          const aKey = String(a?.[field] || '');
          const bKey = String(b?.[field] || '');

          if (aKey !== bKey) {
            return (aKey || a.fallbackKey).localeCompare(
              bKey || b.fallbackKey,
            );
          }
        }

        return (
          String(a.fallbackKey).localeCompare(
            String(b.fallbackKey),
          ) ||
          String(a.name).localeCompare(String(b.name))
        );
      })
      .map((row, index) => [row.playerKey, index + 1]),
  );
}

function buildCombatAverageRankRows(warEvents) {
  const sortedEvents = getWarEventsSorted(warEvents || []).filter(
    (event) =>
      event?.hasTimestamp !== false &&
      event?.source !== 'summary' &&
      (event?.type === 'kill' || event?.type === 'death'),
  );
  const playersByKey = {};
  const currentStreak = {};
  const killEventsByPlayer = {};

  function ensurePlayer(rawName, fallbackIndex = 0) {
    const playerKey = normalizePlayerName(rawName);

    if (!playerKey) return null;

    playersByKey[playerKey] ||= {
      playerKey,
      name: String(rawName || '').trim() || playerKey,
      kills: 0,
      deaths: 0,
      kd: 0,
      killstreak: 0,
      killfeed: 0,
      firstKey: '',
      lastKey: '',
      finalKillKey: '',
      finalDeathKey: '',
      streakKey: '',
      feedKey: '',
      fallbackKey: averageRankFallbackKey(fallbackIndex),
      __has: {
        kills: true,
        deaths: true,
        kd: true,
        killstreak: true,
        // Combat Logs provide Killstreak, not KillFeed.
        killfeed: false,
        damageDealt: false,
        damageTaken: false,
        ccHits: false,
        damageToFort: false,
      },
    };

    return playersByKey[playerKey];
  }

  sortedEvents.forEach((event, index) => {
    const rawName = getGuildPlayerFromEvent(event);
    const player = ensurePlayer(rawName, index);

    if (!player) return;

    const eventKey = averageRankEventKey(event);

    player.firstKey ||= eventKey;
    player.lastKey = eventKey;

    if (event.type === 'kill') {
      player.kills += 1;
      player.finalKillKey = eventKey;

      currentStreak[player.playerKey] =
        (currentStreak[player.playerKey] || 0) + 1;

      if (currentStreak[player.playerKey] > player.killstreak) {
        player.killstreak = currentStreak[player.playerKey];
        player.streakKey = eventKey;
      }

      killEventsByPlayer[player.playerKey] ||= [];
      killEventsByPlayer[player.playerKey].push({
        sec: Number(event?.sec) || 0,
        key: eventKey,
      });
    }

    if (event.type === 'death') {
      player.deaths += 1;
      player.finalDeathKey = eventKey;
      currentStreak[player.playerKey] = 0;
    }
  });

  Object.values(playersByKey).forEach((player) => {
    player.kd = player.deaths
      ? Number((player.kills / player.deaths).toFixed(2))
      : Number(player.kills.toFixed(2));

    // KillFeed is a Stats Log column only. Never derive it from Combat Log
    // timestamps, otherwise wars without a KillFeed column get random values.
    player.killfeed = 0;
    player.feedKey = '';
  });

  return playersByKey;
}

function buildSecondaryAverageRankRows(rowsForWar, warPresence) {
  const playersByKey = {};

  (rowsForWar || []).forEach((row, index) => {
    const rawName = row?.player || row?.name;
    const playerKey = normalizePlayerName(rawName);

    if (!playerKey) return;

    const player =
      playersByKey[playerKey] ||
      {
        playerKey,
        name: String(rawName || '').trim() || playerKey,
        kills: 0,
        deaths: 0,
        kd: 0,
        killstreak: 0,
        killfeed: 0,
        damageDealt: 0,
        damageTaken: 0,
        ccHits: 0,
        damageToFort: 0,
        fallbackKey: averageRankFallbackKey(index),
        __has: {
          kills: false,
          deaths: false,
          kd: false,
          killstreak: false,
          killfeed: false,
          damageDealt: false,
          damageTaken: false,
          ccHits: false,
          damageToFort: false,
        },
      };

    const metrics = getSecondaryMatchStats(row);
    const hasKills = getSecondaryMetricExists(
      row,
      'kills',
      warPresence,
    );
    const hasDeaths = getSecondaryMetricExists(
      row,
      'deaths',
      warPresence,
    );
    const hasKillstreak = getSecondaryMetricExists(
      row,
      'killstreak',
      warPresence,
    );
    const hasKillfeed = getSecondaryMetricExists(
      row,
      'killfeed',
      warPresence,
    );
    const hasDamageDealt = getSecondaryMetricExists(
      row,
      'damageDealt',
      warPresence,
    );
    const hasDamageTaken = getSecondaryMetricExists(
      row,
      'damageTaken',
      warPresence,
    );
    const hasCcHits = getSecondaryMetricExists(
      row,
      'ccHits',
      warPresence,
    );
    const hasDamageToFort = getSecondaryMetricExists(
      row,
      'damageToFort',
      warPresence,
    );

    if (hasKills) {
      player.kills = Number(metrics.kills) || 0;
      player.__has.kills = true;
    }

    if (hasDeaths) {
      player.deaths = Number(metrics.deaths) || 0;
      player.__has.deaths = true;
    }

    player.__has.kd =
      player.__has.kills && player.__has.deaths;

    if (player.__has.kd) {
      player.kd = player.deaths
        ? Number((player.kills / player.deaths).toFixed(2))
        : Number(player.kills.toFixed(2));
    }

    if (hasKillstreak) {
      player.killstreak = Number(metrics.killstreak) || 0;
      player.__has.killstreak = true;
    }

    if (hasKillfeed) {
      player.killfeed = Number(metrics.killfeed) || 0;
      player.__has.killfeed = true;
    }

    if (hasDamageDealt) {
      player.damageDealt = Number(metrics.damageDealt) || 0;
      player.__has.damageDealt = true;
    }

    if (hasDamageTaken) {
      player.damageTaken = Number(metrics.damageTaken) || 0;
      player.__has.damageTaken = true;
    }

    if (hasCcHits) {
      player.ccHits = Number(metrics.ccHits) || 0;
      player.__has.ccHits = true;
    }

    if (hasDamageToFort) {
      player.damageToFort =
        Number(metrics.damageToFort) || 0;
      player.__has.damageToFort = true;
    }

    playersByKey[playerKey] = player;
  });

  return playersByKey;
}

function mergeAverageRankWarRows(
  combatPlayers,
  secondaryPlayers,
  warIndex,
) {
  const playerKeys = new Set([
    ...Object.keys(combatPlayers || {}),
    ...Object.keys(secondaryPlayers || {}),
  ]);

  return [...playerKeys].map((playerKey, index) => {
    const combat = combatPlayers?.[playerKey];
    const secondary = secondaryPlayers?.[playerKey];
    const hasCombat = Boolean(combat);
    const fallbackKey =
      combat?.firstKey ||
      secondary?.fallbackKey ||
      averageRankFallbackKey(warIndex * 1000 + index);

    return {
      playerKey,
      name: combat?.name || secondary?.name || playerKey,
      kills: hasCombat
        ? combat.kills
        : secondary?.kills || 0,
      deaths: hasCombat
        ? combat.deaths
        : secondary?.deaths || 0,
      kd: hasCombat ? combat.kd : secondary?.kd || 0,
      killstreak: hasCombat ? combat.killstreak : 0,
      // KillFeed comes only from the Stats Log row.
      killfeed: secondary?.killfeed || 0,
      damageDealt: secondary?.damageDealt || 0,
      damageTaken: secondary?.damageTaken || 0,
      ccHits: secondary?.ccHits || 0,
      damageToFort: secondary?.damageToFort || 0,
      firstKey: combat?.firstKey || '',
      lastKey: combat?.lastKey || '',
      finalKillKey: combat?.finalKillKey || '',
      finalDeathKey: combat?.finalDeathKey || '',
      streakKey: combat?.streakKey || '',
      feedKey: combat?.feedKey || '',
      fallbackKey,
      __has: {
        kills:
          hasCombat || Boolean(secondary?.__has?.kills),
        deaths:
          hasCombat || Boolean(secondary?.__has?.deaths),
        kd:
          hasCombat || Boolean(secondary?.__has?.kd),
        killstreak: hasCombat,
        killfeed: Boolean(secondary?.__has?.killfeed),
        damageDealt: Boolean(
          secondary?.__has?.damageDealt,
        ),
        damageTaken: Boolean(
          secondary?.__has?.damageTaken,
        ),
        ccHits: Boolean(secondary?.__has?.ccHits),
        damageToFort: Boolean(
          secondary?.__has?.damageToFort,
        ),
      },
    };
  });
}

function buildBestOverallAverageRankTable(stats) {
  const events = stats?.ev || [];
  const secondaryRows = stats?.secondary?.rows || [];
  const combatWarMap = {};
  const secondaryWarMap = {};

  events.forEach((event, index) => {
    const warId = String(
      event?.id ||
        event?.war ||
        event?.date ||
        `combat-${index}`,
    );

    combatWarMap[warId] ||= [];
    combatWarMap[warId].push(event);
  });

  secondaryRows.forEach((row, index) => {
    const warId = secondaryWarId(row, index);

    secondaryWarMap[warId] ||= [];
    secondaryWarMap[warId].push(row);
  });

  const secondaryPresence =
    getSecondaryWarMetricPresence(secondaryRows);
  const result = {};
  const warIds = [
    ...new Set([
      ...Object.keys(combatWarMap),
      ...Object.keys(secondaryWarMap),
    ]),
  ];

  function ensurePlayer(row) {
    result[row.playerKey] ||= {
      name: row.name,
      wars: new Set(),
      metricTotals: {
        kills: 0,
        deaths: 0,
        kd: 0,
        killstreak: 0,
        killfeed: 0,
        damageDealt: 0,
        damageTaken: 0,
        ccHits: 0,
        damageToFort: 0,
      },
      metricMatches: {
        kills: 0,
        deaths: 0,
        kd: 0,
        killstreak: 0,
        killfeed: 0,
        damageDealt: 0,
        damageTaken: 0,
        ccHits: 0,
        damageToFort: 0,
      },
    };

    return result[row.playerKey];
  }

  const metricSettings = {
    kills: {
      desc: true,
      chronology: ['finalKillKey', 'firstKey'],
    },
    deaths: {
      desc: false,
      chronology: ['finalDeathKey', 'firstKey'],
    },
    kd: {
      desc: true,
      chronology: ['lastKey', 'firstKey'],
    },
    killstreak: {
      desc: true,
      chronology: ['streakKey', 'firstKey'],
    },
    killfeed: {
      desc: true,
      chronology: ['feedKey', 'firstKey'],
    },
    damageDealt: {
      desc: true,
      chronology: ['firstKey', 'lastKey'],
    },
    damageTaken: {
      desc: false,
      chronology: ['firstKey', 'lastKey'],
    },
    ccHits: {
      desc: true,
      chronology: ['firstKey', 'lastKey'],
    },
    damageToFort: {
      desc: true,
      chronology: ['firstKey', 'lastKey'],
    },
  };

  warIds.forEach((warId, warIndex) => {
    const combatPlayers = buildCombatAverageRankRows(
      combatWarMap[warId] || [],
    );
    const secondaryPlayers = buildSecondaryAverageRankRows(
      secondaryWarMap[warId] || [],
      secondaryPresence[warId] || {},
    );
    const rows = mergeAverageRankWarRows(
      combatPlayers,
      secondaryPlayers,
      warIndex,
    );

    if (!rows.length) return;

    const ranks = Object.fromEntries(
      Object.entries(metricSettings).map(
        ([metric, setting]) => [
          metric,
          buildUniqueAverageRank(
            rows,
            metric,
            setting.desc,
            setting.chronology,
          ),
        ],
      ),
    );

    rows.forEach((row) => {
      const entry = ensurePlayer(row);
      let hasAnyRank = false;

      Object.keys(metricSettings).forEach((metric) => {
        const rank = ranks[metric]?.[row.playerKey];

        if (!Number.isFinite(Number(rank))) return;

        hasAnyRank = true;
        entry.metricTotals[metric] += Number(rank);
        entry.metricMatches[metric] += 1;
      });

      if (hasAnyRank) {
        entry.wars.add(warId);
      }
    });
  });

  return Object.fromEntries(
    Object.entries(result).map(([playerKey, data]) => {
      const ranks = Object.fromEntries(
        Object.keys(data.metricTotals).map((metric) => [
          metric,
          data.metricMatches[metric]
            ? data.metricTotals[metric] /
              data.metricMatches[metric]
            : null,
        ]),
      );
      const availableColumnRanks = Object.values(ranks).filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          Number.isFinite(Number(value)),
      );
      const average = availableColumnRanks.length
        ? availableColumnRanks.reduce(
            (sum, value) => sum + Number(value),
            0,
          ) / availableColumnRanks.length
        : null;

      return [
        playerKey,
        {
          name: data.name,
          wars: data.wars.size,
          ranks,
          average,
          formatted:
            average == null ? '0.00' : average.toFixed(2),
        },
      ];
    }),
  );
}

function getOurPlayerRowsForWar(warEvents) {
  const kills = {};
  const deaths = {};
  const names = new Set();

  warEvents.forEach((event) => {
    const guildPlayer = getGuildPlayerFromEvent(event);

    if (!guildPlayer) return;

    if (event.type === 'kill') {
      names.add(guildPlayer);
      add(kills, guildPlayer);
    }

    if (event.type === 'death') {
      names.add(guildPlayer);
      add(deaths, guildPlayer);
    }
  });

  return [...names].map((name) => {
    const k = kills[name] || 0;
    const d = deaths[name] || 0;

    return {
      name,
      kills: k,
      deaths: d,
      kdNumber: d
        ? Number((k / d).toFixed(2))
        : Number(k.toFixed(2)),
      streak: getBestKillstreakForWar(warEvents, name),
      feed: null,
    };
  });
}

function secondaryWarId(row, index = 0) {
  return String(
    row?.id ||
      row?.date ||
      row?.war ||
      `secondary-${index}`,
  );
}

function PremiumStatList({ title, items, accent = 'emerald' }) {
  const isFeed = accent === 'amber';
  const max = Math.max(1, ...items.map((item) => Number(item.value) || 0));

  const theme = isFeed
    ? {
        title: 'Killfeed Overview',
        valueColor: 'text-amber-300',
        border: 'border-amber-300/20',
        bar: 'from-amber-300 via-orange-400 to-yellow-200',
        bg: 'from-amber-500/10 via-slate-950/75 to-slate-950',
        glow: 'shadow-[0_0_20px_rgba(245,158,11,.18)]',
        dot: 'bg-amber-300',
      }
    : {
        title: 'Killstreak Overview',
        valueColor: 'text-cyan-300',
        border: 'border-cyan-300/20',
        bar: 'from-cyan-300 via-sky-400 to-blue-500',
        bg: 'from-cyan-500/10 via-slate-950/75 to-slate-950',
        glow: 'shadow-[0_0_20px_rgba(34,211,238,.18)]',
        dot: 'bg-cyan-300',
      };

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border ${theme.border} bg-gradient-to-br ${theme.bg} p-4 shadow-[0_24px_80px_rgba(0,0,0,.42)] backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mb-3 flex items-center gap-3 border-b border-white/10 pb-3">
        <div
          className={`rounded-xl border ${theme.border} bg-slate-950/22 px-2.5 py-1 text-[11px] font-black ${theme.valueColor}`}
        >
          Top {items.length}
        </div>

        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">
          {theme.title}
        </h3>
      </div>

      {!items.length ? (
        <p className="relative rounded-2xl border border-slate-800 bg-slate-950/18 px-4 py-5 text-sm text-slate-500">
          No data yet.
        </p>
      ) : (
        <div className="relative space-y-1.5">
          {items.map((item, index) => {
            const value = Number(item.value) || 0;
            const width = Math.max(7, Math.round((value / max) * 100));

            return (
              <div
                key={`${title}-${item.id}-${index}`}
                className="group grid grid-cols-[54px_1fr_34px] items-center gap-3 border-b border-white/8 py-2.5 last:border-b-0"
              >
                <div className="text-3xl font-light tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,.16)]">
                  {value}
                </div>

                <div className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-100">
                      {item.date}
                    </p>

                    <div className="text-[11px] font-black text-slate-500">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="relative h-3 overflow-hidden rounded-md border border-white/10 bg-slate-950/26 shadow-inner">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[length:18px_100%] opacity-20" />

                    <div
                      className={`relative h-full rounded-md bg-gradient-to-r ${theme.bar} ${theme.glow} transition-all duration-500`}
                      style={{ width: `${width}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-20" />
                      <div className="absolute right-0 top-0 h-full w-8 bg-white/35 blur-md" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <div
                    className={`h-2 w-2 rounded-full ${theme.dot} shadow-[0_0_16px_currentColor]`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative mt-3 flex items-center border-t border-white/10 pt-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${theme.dot} shadow-[0_0_18px_currentColor]`}
          />
          <span>Player performance record</span>
        </div>
      </div>
    </div>
  );
}

function StreakFeedPanel({ streakItems, feedItems }) {
  return (
    <div className="rounded-[28px] border border-slate-700/70 bg-slate-950/14 p-4 shadow-[0_24px_80px_rgba(0,0,0,.22)] backdrop-blur-[2px]">
      <div className="grid gap-4 xl:grid-cols-2">
        <PremiumStatList
          title="Killstreak"
          items={streakItems}
          accent="emerald"
        />

        <PremiumStatList
          title="Killfeed"
          items={feedItems}
          accent="amber"
        />
      </div>
    </div>
  );
}

// ─── MatchHistoryList ─────────────────────────────────────────────────────────

const MATCH_HISTORY_COLORS = {
  kills: '#93c5fd',
  deaths: '#f9a8d4',
  kdPositive: '#6ee7b7',
  kdNegative: '#fda4af',
  killstreak: '#f8fafc',
  killfeed: '#fb923c',
  damageDealt: '#67e8f9',
  damageTaken: '#fda4af',
  ccHits: '#c4b5fd',
  damageToFort: '#fde047',
};


const SECONDARY_MATCH_METRIC_KEYS = {
  kills: ['kills', 'Kills'],
  deaths: ['deaths', 'Deaths'],
  killstreak: [
    'killStreak',
    'killstreak',
    'streak',
    'Killstreak',
    'KillStreak',
  ],
  killfeed: [
    'killFeed',
    'killfeed',
    'feed',
    'KillFeed',
    'Killfeed',
  ],
  damageDealt: [
    'damageDealt',
    'damage_dealt',
    'damageDone',
    'damage',
    'Damage Dealt',
    'DamageDealt',
  ],
  damageTaken: [
    'damageTaken',
    'damage_taken',
    'Damage Taken',
    'DamageTaken',
  ],
  ccHits: ['ccHits', 'cc_hits', 'cc', 'CC Hits', 'CCHits'],
  damageToFort: [
    'damageToFort',
    'damage_to_fort',
    'fortDamage',
    'damageFort',
    'Damage to Fort',
    'DamageToFort',
  ],
};

const SECONDARY_CORE_METRICS = new Set(['kills', 'deaths']);
const SECONDARY_DETAIL_METRICS = [
  'killstreak',
  'killfeed',
  'damageDealt',
  'damageTaken',
  'ccHits',
  'damageToFort',
];

function findRawKey(row, keys) {
  return keys.find(
    (key) => row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '',
  );
}

function normalizeLogText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getRowRawText(row) {
  if (!row) return '';

  return [
    row.raw,
    row.rawLine,
    row.original,
    row.originalLine,
    row.source,
    row.sourceLine,
    row.text,
    row.line,
    row.input,
    row.entry,
    row.content,
    row.note,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .join(' ');
}


function getStructuredPresenceText(value, depth = 0) {
  if (value === undefined || value === null || depth > 3) return '';

  if (Array.isArray(value)) {
    return value.map((item) => getStructuredPresenceText(item, depth + 1)).join(' ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${key} ${getStructuredPresenceText(item, depth + 1)}`)
      .join(' ');
  }

  return String(value);
}

function hasMetricNameInStructuredFields(row, keys) {
  if (!row) return false;

  const containers = [
    row.headers,
    row.header,
    row.columns,
    row.columnNames,
    row.fieldNames,
    row.fields,
    row.providedFields,
    row.availableFields,
    row.schema,
    row.metrics,
  ];

  const structuredText = normalizeLogText(
    containers
      .map((value) => getStructuredPresenceText(value))
      .filter(Boolean)
      .join(' '),
  );

  if (!structuredText) return false;

  return keys.some((key) => {
    const alias = normalizeLogText(key);
    const spacedAlias = normalizeLogText(
      String(key)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' '),
    );

    return Boolean(
      (alias && structuredText.includes(alias)) ||
        (spacedAlias && structuredText.includes(spacedAlias)),
    );
  });
}

function rowHasOwnMetricKey(row, keys) {
  return Boolean(row && keys.some((key) => Object.prototype.hasOwnProperty.call(row, key)));
}

function getRowMetricNumber(row, metric, fallback = NaN) {
  const keys = SECONDARY_MATCH_METRIC_KEYS[metric] || [metric];
  const key = findRawKey(row, keys);

  if (!key) return fallback;

  return parseNumericValue(row[key], fallback);
}

function getSecondaryWarMetricPresence(rows) {
  const output = {};

  (rows || []).forEach((row, index) => {
    const warId = secondaryWarId(row, index);

    output[warId] ||= {
      __detailed: false,
    };

    Object.entries(SECONDARY_MATCH_METRIC_KEYS).forEach(([metric, keys]) => {
      const key = findRawKey(row, keys);
      const number = key ? parseNumericValue(row[key], NaN) : NaN;
      const presenceFlag = getPresenceFlag(row, keys);
      const explicitPresence =
        presenceFlag === true ||
        hasMetricNameInRawText(row, keys) ||
        hasMetricNameInStructuredFields(row, keys);
      const nonZeroValue = Number.isFinite(number) && number !== 0;

      if (explicitPresence || nonZeroValue) {
        output[warId][metric] = true;
      }

      if (SECONDARY_DETAIL_METRICS.includes(metric) && (explicitPresence || nonZeroValue)) {
        output[warId].__detailed = true;
      }
    });
  });

  // Legacy saved rows may not contain per-column availability flags. For those
  // rows only, infer that an explicit numeric 0 belongs to the detailed table.
  // Current parser rows include has_* flags, and an explicit false must remain
  // missing rather than being converted into a real zero.
  (rows || []).forEach((row, index) => {
    const warId = secondaryWarId(row, index);
    const presence = output[warId];

    if (!presence?.__detailed) return;

    SECONDARY_DETAIL_METRICS.forEach((metric) => {
      const keys = SECONDARY_MATCH_METRIC_KEYS[metric] || [metric];
      const number = getRowMetricNumber(row, metric, NaN);
      const presenceFlag = getPresenceFlag(row, keys);

      // The parser always includes numeric properties with a 0 fallback, even
      // when that column did not exist in the original Stats Log. An explicit
      // false availability flag must therefore win over the generated 0.
      if (presenceFlag === false) return;

      if (
        Number.isFinite(number) &&
        (presenceFlag === true || rowHasOwnMetricKey(row, keys))
      ) {
        presence[metric] = true;
      }
    });
  });

  return output;
}

function getSecondaryMetricExists(row, metric, warPresence = {}) {
  const keys = SECONDARY_MATCH_METRIC_KEYS[metric] || [metric];
  const presenceFlag = getPresenceFlag(row, keys);

  // Trust the parser's per-column availability flags. In particular, false
  // means the property is only a generated 0 placeholder and must display as
  // an em dash instead of a real zero in Match History.
  if (presenceFlag !== undefined) {
    if (!presenceFlag) return false;

    return Number.isFinite(getRowMetricNumber(row, metric, NaN));
  }

  if (hasRawValue(row, keys)) return true;

  const number = getRowMetricNumber(row, metric, NaN);

  if (!Number.isFinite(number)) return false;

  if (SECONDARY_CORE_METRICS.has(metric) && rowHasOwnMetricKey(row, keys)) {
    return true;
  }

  if (number !== 0) return true;

  if (warPresence?.[metric]) return true;

  if (
    SECONDARY_DETAIL_METRICS.includes(metric) &&
    warPresence?.__detailed &&
    rowHasOwnMetricKey(row, keys)
  ) {
    return true;
  }

  return false;
}

function getPresenceFlag(row, keys) {
  if (!row) return undefined;

  const suffixes = [
    'HasValue',
    'hasValue',
    'Exists',
    'exists',
    'Present',
    'present',
    'Provided',
    'provided',
    'Added',
    'added',
  ];

  for (const key of keys) {
    const keyText = String(key);
    const compact = keyText.replace(/[^a-zA-Z0-9]/g, '');
    const camel = compact.charAt(0).toLowerCase() + compact.slice(1);
    const pascal = compact.charAt(0).toUpperCase() + compact.slice(1);
    const snake = keyText
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    const candidates = [
      `has_${snake}`,
      `${snake}_exists`,
      `${snake}_present`,
      `${snake}_provided`,
      `${snake}_added`,
      ...suffixes.flatMap((suffix) => [`${camel}${suffix}`, `${pascal}${suffix}`]),
    ];

    const found = candidates.find((candidate) =>
      Object.prototype.hasOwnProperty.call(row, candidate),
    );

    if (found) return Boolean(row[found]);
  }

  return undefined;
}

function hasMetricNameInRawText(row, keys) {
  const rawText = normalizeLogText(getRowRawText(row));

  if (!rawText) return false;

  return keys.some((key) => {
    const alias = normalizeLogText(key);
    const spacedAlias = normalizeLogText(
      String(key)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' '),
    );

    return Boolean(
      (alias && rawText.includes(alias)) ||
        (spacedAlias && rawText.includes(spacedAlias)),
    );
  });
}

function hasRawValue(row, keys) {
  const key = findRawKey(row, keys);

  if (!key) return false;

  const number = parseNumericValue(row[key], NaN);

  if (!Number.isFinite(number)) return false;

  const presenceFlag = getPresenceFlag(row, keys);

  if (presenceFlag !== undefined) return presenceFlag;

  // Non-zero values prove that the metric was actually added in the log.
  if (number !== 0) return true;

  // A plain 0 is often generated automatically for missing secondary-log columns.
  // Count it only when the original/raw row also contains the metric name, which
  // means that the 0 was explicitly written in the log for that column.
  return hasMetricNameInRawText(row, keys);
}

function parseNumericValue(value, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  let text = String(value).trim().toLowerCase();

  if (!text) return fallback;

  let multiplier = 1;

  if (text.endsWith('k')) {
    multiplier = 1000;
    text = text.slice(0, -1);
  } else if (text.endsWith('m')) {
    multiplier = 1000000;
    text = text.slice(0, -1);
  } else if (text.endsWith('b')) {
    multiplier = 1000000000;
    text = text.slice(0, -1);
  }

  text = text.replace(/[^0-9.,-]/g, '');

  if (!text || text === '-' || text === '.' || text === ',') {
    return fallback;
  }

  const commaCount = (text.match(/,/g) || []).length;
  const dotCount = (text.match(/\./g) || []).length;

  if (commaCount && dotCount) {
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');

    if (lastComma > lastDot) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (commaCount) {
    if (commaCount > 1) {
      text = text.replace(/,/g, '');
    } else {
      const [left, right = ''] = text.split(',');
      text = right.length === 3 && left.replace('-', '').length <= 3
        ? `${left}${right}`
        : `${left}.${right}`;
    }
  } else if (dotCount > 1) {
    text = text.replace(/\./g, '');
  } else if (dotCount === 1) {
    const [left, right = ''] = text.split('.');
    text = right.length === 3 && left.replace('-', '').length <= 3
      ? `${left}${right}`
      : text;
  }

  const number = Number(text);

  return Number.isFinite(number) ? number * multiplier : fallback;
}

function readNumber(row, keys, fallback = 0) {
  const key = findRawKey(row, keys);

  if (!key) return fallback;

  return parseNumericValue(row[key], fallback);
}

function trimCompactZeros(value) {
  return String(value)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function formatCompactNumber(value, decimals = 2) {
  const number = Number(value) || 0;

  if (!Number.isFinite(number)) return '0';

  const abs = Math.abs(number);
  const sign = number < 0 ? '-' : '';

  if (abs >= 1000000000) {
    return `${sign}${trimCompactZeros((abs / 1000000000).toFixed(1))}b`;
  }

  if (abs >= 1000000) {
    return `${sign}${trimCompactZeros((abs / 1000000).toFixed(1))}m`;
  }

  if (abs >= 1000) {
    return `${sign}${trimCompactZeros((abs / 1000).toFixed(1))}k`;
  }

  if (Number.isInteger(number)) return String(number);

  return trimCompactZeros(number.toFixed(decimals));
}

function formatMatchNumber(value) {
  return formatCompactNumber(value, 2);
}

function formatNullableMatchNumber(value) {
  return value === null ? null : formatMatchNumber(value);
}

function formatKdNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '0.00';

  return number.toFixed(2);
}

function formatNullableKdNumber(value) {
  return value === null ? null : formatKdNumber(value);
}

function getMatchMetricValue(match, key) {
  return parseNumericValue(match?.[key], 0);
}

function getMatchKdValue(match) {
  const kills = getMatchMetricValue(match, 'kills');
  const deaths = getMatchMetricValue(match, 'deaths');

  return deaths ? kills / deaths : kills;
}

function getMatchMetricExists(match, key) {
  if (!match) return false;

  if (key === 'kd') {
    return getMatchMetricExists(match, 'kills') && getMatchMetricExists(match, 'deaths');
  }

  if (match.__has && Object.prototype.hasOwnProperty.call(match.__has, key)) {
    return Boolean(match.__has[key]);
  }

  const value = match[key];

  if (value === undefined || value === null || value === '') return false;

  return Number.isFinite(parseNumericValue(value, NaN));
}

function getMatchSortValue(match, key) {
  if (key === 'date') return String(match?.date || '');
  if (key === 'kd') return getMatchKdValue(match);

  return getMatchMetricValue(match, key);
}

function getAverageFromExistingMatches(matches, key, getValue) {
  const values = matches
    .filter((match) => getMatchMetricExists(match, key))
    .map((match) => Number(getValue(match)))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMatchCell(match, key) {
  if (!getMatchMetricExists(match, key)) return '—';

  return formatMatchNumber(getMatchMetricValue(match, key));
}

function formatMatchKdCell(match) {
  if (!getMatchMetricExists(match, 'kd')) return '—';

  return formatKdNumber(getMatchKdValue(match));
}

function buildMatchHistoryAverages(matches) {
  return {
    kills: getAverageFromExistingMatches(matches, 'kills', (match) =>
      getMatchMetricValue(match, 'kills'),
    ),
    deaths: getAverageFromExistingMatches(matches, 'deaths', (match) =>
      getMatchMetricValue(match, 'deaths'),
    ),
    kd: getAverageFromExistingMatches(matches, 'kd', getMatchKdValue),
    killstreak: getAverageFromExistingMatches(matches, 'killstreak', (match) =>
      getMatchMetricValue(match, 'killstreak'),
    ),
    killfeed: getAverageFromExistingMatches(matches, 'killfeed', (match) =>
      getMatchMetricValue(match, 'killfeed'),
    ),
    damageDealt: getAverageFromExistingMatches(matches, 'damageDealt', (match) =>
      getMatchMetricValue(match, 'damageDealt'),
    ),
    damageTaken: getAverageFromExistingMatches(matches, 'damageTaken', (match) =>
      getMatchMetricValue(match, 'damageTaken'),
    ),
    ccHits: getAverageFromExistingMatches(matches, 'ccHits', (match) =>
      getMatchMetricValue(match, 'ccHits'),
    ),
    damageToFort: getAverageFromExistingMatches(matches, 'damageToFort', (match) =>
      getMatchMetricValue(match, 'damageToFort'),
    ),
  };
}

function getSecondaryMatchStats(row) {
  return {
    kills: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.kills),
    deaths: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.deaths),
    killstreak: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.killstreak),
    killfeed: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.killfeed),
    damageDealt: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.damageDealt),
    damageTaken: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.damageTaken),
    ccHits: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.ccHits),
    damageToFort: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.damageToFort),
  };
}

function MatchHistoryHeaderCell({
  children,
  color,
  average = null,
  sortKey = '',
  sort,
  onSort,
  align = 'center',
}) {
  const active = sortKey && sort?.key === sortKey;
  const arrow = active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕';
  const justify = align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <button
      type="button"
      onClick={() => sortKey && onSort?.(sortKey)}
      className={`flex min-w-0 w-full flex-col ${justify} rounded-xl px-0.5 py-1 transition hover:bg-white/5`}
    >
      {average !== null && (
        <p
          className="mb-1 text-sm font-black leading-none tracking-tight"
          style={{ color }}
        >
          <span className="mr-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            Avg
          </span>
          {average}
        </p>
      )}

      <p
        className="text-[10px] font-black uppercase leading-tight tracking-[0.1em]"
        style={{ color }}
      >
        {children} <span className={active ? 'text-blue-300' : 'text-slate-600'}>{arrow}</span>
      </p>
    </button>
  );
}

function MatchHistoryMetricIcon({ type, color }) {
  const commonProps = {
    width: 16,
    height: 16,
    viewBox: '-10 -10 20 20',
    className: 'shrink-0',
    style: {
      filter: `drop-shadow(0 0 5px ${color})`,
    },
    'aria-hidden': true,
  };

  const darkStroke = 'rgba(2,6,23,0.96)';

  if (type === 'kills') {
    return (
      <svg {...commonProps}>
        <path
          d="M -7.5 6.8 L -5.3 8.2 L 7.5 -5.9 L 5.9 -7.5 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <path
          d="M -7.8 -6.4 L -6.4 -7.8 L 7.8 6.4 L 6.4 7.8 Z"
          fill={color}
          opacity="0.75"
          stroke={darkStroke}
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        <path
          d="M -4.6 4.1 L -7.2 7.2 M 4.6 4.1 L 7.2 7.2"
          stroke={darkStroke}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'deaths') {
    return (
      <svg {...commonProps}>
        <g transform="scale(0.86)">
          <path
            d="M 0 -8.6
               C -5.2 -8.6 -8.2 -5.3 -8.2 -1.1
               C -8.2 2.2 -6.3 4.2 -3.8 5.1
               L -3.8 7.5
               L -2.1 7.5
               L -2.1 5.9
               L -0.7 5.9
               L -0.7 7.5
               L 0.7 7.5
               L 0.7 5.9
               L 2.1 5.9
               L 2.1 7.5
               L 3.8 7.5
               L 3.8 5.1
               C 6.3 4.2 8.2 2.2 8.2 -1.1
               C 8.2 -5.3 5.2 -8.6 0 -8.6 Z"
            fill={color}
            stroke={darkStroke}
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <circle cx="-3" cy="-1.8" r="1.75" fill={darkStroke} />
          <circle cx="3" cy="-1.8" r="1.75" fill={darkStroke} />
          <path d="M 0 0.3 L -1.35 3 L 1.35 3 Z" fill={darkStroke} />
        </g>
      </svg>
    );
  }

  if (type === 'kd') {
    return (
      <svg {...commonProps}>
        <circle
          cx="0"
          cy="0"
          r="7.2"
          fill="rgba(2,6,23,0.88)"
          stroke={color}
          strokeWidth="2"
        />
        <circle cx="0" cy="0" r="3.7" fill={color} stroke={darkStroke} strokeWidth="1" />
        <path
          d="M 0 -9 L 0 -5.8 M 0 5.8 L 0 9 M -9 0 L -5.8 0 M 5.8 0 L 9 0"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'killstreak') {
    return (
      <svg {...commonProps}>
        <path
          d="M 1 -8.4 L -6.8 1.4 L -1.4 1.4 L -3.1 8.4 L 6.9 -2.6 L 1.3 -2.6 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'killfeed') {
    return (
      <svg {...commonProps}>
        <g transform="scale(0.86)">
          <path
            d="M 0 8.4
               C -4.5 8.4 -7.4 5.3 -7.4 1.7
               C -7.4 -1.3 -5.7 -3.1 -3.8 -4.6
               C -3.5 -1.7 -1.7 -0.9 -1.2 -3.9
               C -0.8 -6.1 -1.4 -7.8 1.1 -9.1
               C 0.6 -5.4 4.6 -4.1 5.8 -1.2
               C 7.1 1.9 5.7 8.4 0 8.4 Z"
            fill={color}
            stroke={darkStroke}
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="M 0.3 6.9
               C -2.1 6.9 -3.8 5.2 -3.8 2.9
               C -3.8 1.2 -2.8 0.1 -1.5 -1.1
               C -1.2 1.2 0.8 1.4 1.1 -1.6
               C 2.8 0.1 3.9 1.9 3.6 4
               C 3.3 5.8 2.1 6.9 0.3 6.9 Z"
            fill={darkStroke}
            opacity="0.9"
          />
        </g>
      </svg>
    );
  }

  if (type === 'damageDealt') {
    return (
      <svg {...commonProps}>
        <g transform="translate(0.1 0.15) scale(0.94)">
          <path
            d="M -9.1 7.5
               C -9.1 4.2 -8.4 1.7 -7.1 -0.1
               L -5.8 -1.9
               C -5 -3 -3.9 -3.8 -2.6 -4.4
               L 1.6 -6.4
               C 3.8 -7.5 5.9 -7.7 7.7 -7.1
               L 9 -6.6
               C 9.8 -6.3 10.2 -5.3 9.8 -4.5
               L 8.9 -2.9
               C 8.5 -2.2 7.8 -1.8 7 -1.8
               L 5.7 -1.8
               C 4.2 -1.8 3 -1.3 2.1 -0.4
               L 0.3 1.4
               L -1 2.7
               C -1.7 3.4 -1.6 4.7 -0.7 5.3
               L 0.1 5.9
               C 0.9 6.5 1.9 6.8 2.9 6.7
               L 4 6.5
               C 5.8 6.3 7.4 6.8 8.8 7.9
               L 10 8.9
               C 10.5 9.3 10.6 10.1 10.2 10.6
               L 8.9 12.2
               C 8.4 12.7 7.6 12.8 7.1 12.3
               L 5.4 10.8
               C 4.1 9.6 2.4 9 0.6 9
               L -1.5 9
               C -4.4 9 -6.8 8.6 -9.1 7.5 Z"
            fill={color}
            stroke={darkStroke}
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
          <path
            d="M -2.4 1.1
               C -1.3 -0.7 0.1 -1.9 2 -2.6
               C 3.6 -3.1 5.4 -3 7 -2.5"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="0.95"
            strokeLinecap="round"
          />
        </g>
      </svg>
    );
  }

  if (type === 'wars') {
    return (
      <svg {...commonProps}>
        <path
          d="M -6.9 8.4 L -6.9 -8.1"
          fill="none"
          stroke={darkStroke}
          strokeWidth="1.45"
          strokeLinecap="round"
        />
        <path
          d="M -5.9 -7.2
             L 5.8 -6.1
             L 3.2 -2.2
             L 5.4 2.4
             L -5.9 1.1 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <path
          d="M -3.6 -4.4 L 1.8 -3.9"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'averageRank') {
    return (
      <svg {...commonProps}>
        <path
          d="M -7.2 -4.8 L -4 -4.8 L -1.8 0.8 L 0 -4.8 L 1.8 0.8 L 4 -4.8 L 7.2 -4.8 L 5.2 3.2 L -5.2 3.2 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <path
          d="M -4.9 3.2 H 4.9 V 6.1 H -4.9 Z"
          fill={color}
          opacity="0.92"
          stroke={darkStroke}
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        <circle cx="0" cy="-1" r="1.35" fill={darkStroke} />
      </svg>
    );
  }

  if (type === 'damageTaken') {
    return (
      <svg {...commonProps}>
        <path
          d="M 0 -8.4 L 7.1 -5.8 L 6.1 1.7 C 5.5 5.4 3.3 7.4 0 8.6 C -3.3 7.4 -5.5 5.4 -6.1 1.7 L -7.1 -5.8 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 0 -5.9 L 0 5.7"
          stroke={darkStroke}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    );
  }

  if (type === 'ccHits') {
    return (
      <svg {...commonProps}>
        <g transform="rotate(-18)">
          <path
            d="M -7 2.8
               C -7 0.5 -5.4 -1.1 -3.1 -1.1
               L -0.8 -1.1
               C 0.8 -1.1 2 0.1 2 1.7
               C 2 3.4 0.8 4.6 -0.8 4.6
               L -2 4.6"
            fill="none"
            stroke={color}
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 7 -2.8
               C 7 -0.5 5.4 1.1 3.1 1.1
               L 0.8 1.1
               C -0.8 1.1 -2 -0.1 -2 -1.7
               C -2 -3.4 -0.8 -4.6 0.8 -4.6
               L 2 -4.6"
            fill="none"
            stroke={color}
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -0.7 -0.8 L 0.7 0.8 M -0.7 0.8 L 0.7 -0.8"
            stroke={darkStroke}
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            d="M -1.7 -2 L -2.7 -3.1 M 1.7 2 L 2.7 3.1"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      </svg>
    );
  }

  if (type === 'damageToFort') {
    return (
      <svg {...commonProps}>
        <path
          d="M -7.6 -5.2 L -5.2 -5.2 L -5.2 -7.5 L -2.8 -7.5 L -2.8 -5.2 L -1.2 -5.2 L -1.2 -7.5 L 1.2 -7.5 L 1.2 -5.2 L 2.8 -5.2 L 2.8 -7.5 L 5.2 -7.5 L 5.2 -5.2 L 7.6 -5.2 L 7.6 7.5 L 4.7 7.5 L 4.7 3.6 C 4.7 1 2.6 -1.2 0 -1.2 C -2.6 -1.2 -4.7 1 -4.7 3.6 L -4.7 7.5 L -7.6 7.5 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M -1.6 7.5 L -1.6 3.8 C -1.6 2.8 -0.9 2.1 0 2.1 C 0.9 2.1 1.6 2.8 1.6 3.8 L 1.6 7.5"
          fill={darkStroke}
          opacity="0.85"
        />
      </svg>
    );
  }

  return null;
}

function SummaryHeaderIcon({ type, color }) {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center scale-[1.65]">
      <MatchHistoryMetricIcon type={type} color={color} />
    </span>
  );
}

function PlayerStatsSummaryCard({
  icon,
  label,
  value,
  sub,
  tone,
  valueClass,
}) {
  return (
    <div
      className={`player-stats-summary-card player-stats-summary-${tone} rounded-[22px] p-4`}
    >
      <div className="relative z-10 flex h-full items-center gap-3">
        <div className="player-stats-summary-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.11em] text-white/80">
            {label}
          </p>
          <p className={`mt-1 truncate text-3xl font-black leading-none ${valueClass}`}>
            {value}
          </p>
          {sub ? (
            <p className="mt-1.5 truncate text-xs font-bold text-slate-300/80">
              {sub}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MatchHistoryValue({ children, color, prefix = null, icon = null }) {
  return (
    <p
      className="flex min-w-0 items-center justify-center gap-1 text-center text-sm font-black"
      style={{ color }}
    >
      {icon && <MatchHistoryMetricIcon type={icon} color={color} />}
      {prefix && !icon && <span className="shrink-0 text-xs leading-none">{prefix}</span>}
      <span className="min-w-0 truncate">{children}</span>
    </p>
  );
}

function MatchHistoryList({ matches, onOpenMatchOverview }) {
  const [sort, setSort] = useState({
    key: 'date',
    dir: 'desc',
  });

  const safeMatches = matches || [];
  const averages = buildMatchHistoryAverages(safeMatches);

  const sortedMatches = useMemo(() => {
    return [...safeMatches].sort((a, b) => {
      const metricSort = sort.key !== 'date';
      const aExists = !metricSort || getMatchMetricExists(a, sort.key);
      const bExists = !metricSort || getMatchMetricExists(b, sort.key);

      if (aExists !== bExists) {
        return aExists ? -1 : 1;
      }

      const av = getMatchSortValue(a, sort.key);
      const bv = getMatchSortValue(b, sort.key);

      let result;

      if (typeof av === 'string' || typeof bv === 'string') {
        result = String(av).localeCompare(String(bv));
      } else if (av === bv) {
        result = String(b.date || '').localeCompare(String(a.date || ''));
      } else {
        result = av - bv;
      }

      if (!result) {
        result = String(a.warId || '').localeCompare(String(b.warId || ''));
      }

      return sort.dir === 'asc' ? result : -result;
    });
  }, [safeMatches, sort]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      dir: current.key === key && current.dir === 'desc' ? 'asc' : 'desc',
    }));
  }

  if (!safeMatches.length) return null;

  const gridCols =
    'grid-cols-[38px_minmax(190px,1.65fr)_minmax(82px,.72fr)_minmax(82px,.72fr)_minmax(88px,.76fr)_minmax(112px,.95fr)_minmax(104px,.9fr)_minmax(126px,1.06fr)_minmax(126px,1.06fr)_minmax(96px,.82fr)_minmax(132px,1.1fr)]';

  return (
    <div className="player-stats-guild-panel player-stats-accent-blue player-stats-match-panel rounded-[28px] border border-slate-700/70 bg-slate-950/14 p-4 shadow-[0_24px_80px_rgba(0,0,0,.22)] backdrop-blur-[2px]">
      <div className="player-stats-site-heading player-stats-heading-blue mb-4">
        <div>
          <h3 className="text-2xl font-black">Match History</h3>
          <p className="mt-0.5 text-xs font-bold text-slate-400">
            All matches for this player · {safeMatches.length} total
          </p>
        </div>
      </div>

      <div className={`max-h-[420px] overflow-x-auto overflow-y-auto pr-2 ${scrollCls}`}>
        <div className="w-full min-w-[1240px] space-y-2">
          {/* Header */}
          <div
            className={`player-stats-table-header sticky top-0 z-10 grid ${gridCols} gap-3 rounded-2xl border border-slate-800 bg-slate-950/34 px-3 py-2.5 backdrop-blur-[2px]`}
          >
            <div />
            <MatchHistoryHeaderCell
              color="#94a3b8"
              sortKey="date"
              sort={sort}
              onSort={toggleSort}
              align="left"
            >
              Date
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.kills}
              average={formatNullableMatchNumber(averages.kills)}
              sortKey="kills"
              sort={sort}
              onSort={toggleSort}
            >
              Kills
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.deaths}
              average={formatNullableMatchNumber(averages.deaths)}
              sortKey="deaths"
              sort={sort}
              onSort={toggleSort}
            >
              Deaths
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.kdPositive}
              average={formatNullableKdNumber(averages.kd)}
              sortKey="kd"
              sort={sort}
              onSort={toggleSort}
            >
              K/D
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.killstreak}
              average={formatNullableMatchNumber(averages.killstreak)}
              sortKey="killstreak"
              sort={sort}
              onSort={toggleSort}
            >
              Killstreak
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.killfeed}
              average={formatNullableMatchNumber(averages.killfeed)}
              sortKey="killfeed"
              sort={sort}
              onSort={toggleSort}
            >
              KillFeed
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.damageDealt}
              average={formatNullableMatchNumber(averages.damageDealt)}
              sortKey="damageDealt"
              sort={sort}
              onSort={toggleSort}
            >
              Damage Dealt
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.damageTaken}
              average={formatNullableMatchNumber(averages.damageTaken)}
              sortKey="damageTaken"
              sort={sort}
              onSort={toggleSort}
            >
              Damage Taken
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.ccHits}
              average={formatNullableMatchNumber(averages.ccHits)}
              sortKey="ccHits"
              sort={sort}
              onSort={toggleSort}
            >
              CC Hits
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.damageToFort}
              average={formatNullableMatchNumber(averages.damageToFort)}
              sortKey="damageToFort"
              sort={sort}
              onSort={toggleSort}
            >
              Damage to Fort
            </MatchHistoryHeaderCell>
          </div>

          {/* Rows */}
          {sortedMatches.map((match, index) => {
            const matchKills = getMatchMetricValue(match, 'kills');
            const matchDeaths = getMatchMetricValue(match, 'deaths');
            const positive = matchKills >= matchDeaths;
            const kdValue = formatMatchKdCell(match);

            return (
              <button
                type="button"
                key={`${match.warId}-${match.date}-${index}`}
                onClick={() => onOpenMatchOverview?.(match)}
                className={`player-stats-match-row grid ${gridCols} w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-800/90 bg-gradient-to-r from-slate-950/95 via-slate-900/70 to-slate-950/95 px-3 py-2.5 text-left shadow-[0_4px_14px_rgba(0,0,0,.18)] transition hover:border-slate-700`}
                style={{ '--player-row-rgb': positive ? '59, 130, 246' : '244, 63, 94' }}
                title="Open this match in Overview"
              >
                {/* Index */}
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[10px] font-black text-slate-400">
                  {index + 1}
                </span>

                {/* Date / war name */}
                <p className="truncate text-sm font-black text-slate-100">
                  {match.date || '—'}
                </p>

                {/* Kills */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.kills} icon="kills">
                  {formatMatchCell(match, 'kills')}
                </MatchHistoryValue>

                {/* Deaths */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.deaths} icon="deaths">
                  {formatMatchCell(match, 'deaths')}
                </MatchHistoryValue>

                {/* K/D */}
                <MatchHistoryValue
                  color={
                    positive
                      ? MATCH_HISTORY_COLORS.kdPositive
                      : MATCH_HISTORY_COLORS.kdNegative
                  }
                  icon="kd"
                >
                  {kdValue}
                </MatchHistoryValue>

                {/* Killstreak */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.killstreak} icon="killstreak">
                  {formatMatchCell(match, 'killstreak')}
                </MatchHistoryValue>

                {/* KillFeed */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.killfeed} icon="killfeed">
                  {formatMatchCell(match, 'killfeed')}
                </MatchHistoryValue>

                {/* Damage Dealt */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.damageDealt} icon="damageDealt">
                  {formatMatchCell(match, 'damageDealt')}
                </MatchHistoryValue>

                {/* Damage Taken */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.damageTaken} icon="damageTaken">
                  {formatMatchCell(match, 'damageTaken')}
                </MatchHistoryValue>

                {/* CC Hits */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.ccHits} icon="ccHits">
                  {formatMatchCell(match, 'ccHits')}
                </MatchHistoryValue>

                {/* Damage to Fort */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.damageToFort} icon="damageToFort">
                  {formatMatchCell(match, 'damageToFort')}
                </MatchHistoryValue>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PlayerStats({ stats, onOpenMatchOverview }) {
  const [player, setPlayer] = useState('');
  const [comparedPlayerNames, setComparedPlayerNames] = useState([]);
  const [compareDaysAgo, setCompareDaysAgo] = useState(30);
  const [compareMode, setCompareMode] = useState('average');

  const sortedPlayers = useMemo(
    () =>
      [...(stats?.players || [])].sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || '')),
      ),
    [stats?.players],
  );

  const averageRankTable = useMemo(
    () => (player ? buildBestOverallAverageRankTable(stats) : {}),
    [player, stats],
  );

  const comparisonEnabled = comparedPlayerNames.length > 0;

  const comparisonPopulation = useMemo(() => {
    if (!comparisonEnabled) return [];

    const days = Math.max(
      0,
      Math.floor(Number(compareDaysAgo) || 0),
    );
    let rangeStart = -Infinity;
    let rangeEnd = Infinity;

    if (days > 0) {
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const start = new Date(end);
      start.setDate(start.getDate() - Math.max(0, days - 1));
      start.setHours(0, 0, 0, 0);

      rangeStart = start.getTime();
      rangeEnd = end.getTime();
    }

    function isInComparisonRange(value) {
      if (!days) return true;

      const timestamp = comparisonDateTimestamp(value);

      return (
        Number.isFinite(timestamp) &&
        timestamp >= rangeStart &&
        timestamp <= rangeEnd
      );
    }

    const events = (stats?.ev || []).filter((event) =>
      isInComparisonRange(event?.date),
    );
    const secondaryRows = (stats?.secondary?.rows || []).filter(
      (row) =>
        isInComparisonRange(row?.date || row?.war),
    );
    const secondaryPresence =
      getSecondaryWarMetricPresence(secondaryRows);
    const eventsByWar = new Map();
    const matchesByPlayer = new Map();

    function ensurePlayerMatches(playerName) {
      const playerKey = normalizePlayerName(playerName);

      if (!playerKey) return null;

      if (!matchesByPlayer.has(playerKey)) {
        matchesByPlayer.set(playerKey, new Map());
      }

      return {
        playerKey,
        matches: matchesByPlayer.get(playerKey),
      };
    }

    function ensureComparisonMatch(
      playerName,
      warId,
      date = '',
    ) {
      const playerEntry = ensurePlayerMatches(playerName);

      if (!playerEntry) return null;

      if (!playerEntry.matches.has(warId)) {
        playerEntry.matches.set(warId, {
          warId,
          date: date || warId,
          kills: 0,
          deaths: 0,
          killstreak: 0,
          killfeed: 0,
          damageDealt: 0,
          damageTaken: 0,
          ccHits: 0,
          damageToFort: 0,
          __has: {
            kills: false,
            deaths: false,
            killstreak: false,
            killfeed: false,
            damageDealt: false,
            damageTaken: false,
            ccHits: false,
            damageToFort: false,
          },
        });
      }

      const match = playerEntry.matches.get(warId);

      if (!match.date && date) {
        match.date = date;
      }

      return match;
    }

    events.forEach((event, index) => {
      const warId = String(
        event?.id ||
          event?.war ||
          event?.date ||
          `combat-${index}`,
      );

      if (!eventsByWar.has(warId)) {
        eventsByWar.set(warId, []);
      }

      eventsByWar.get(warId).push(event);
    });

    // Build every combat player's per-war values in one pass per war.
    eventsByWar.forEach((warEvents, warId) => {
      const sortedEvents = getWarEventsSorted(warEvents);
      const playerNames = new Map();
      const kills = new Map();
      const deaths = new Map();
      const currentStreak = new Map();
      const bestStreak = new Map();
      // Combat Logs are used for Killstreak only; KillFeed is read from Stats Logs.

      sortedEvents.forEach((event) => {
        const playerName = getGuildPlayerFromEvent(event);
        const playerKey = normalizePlayerName(playerName);

        if (!playerKey) return;

        if (!playerNames.has(playerKey)) {
          playerNames.set(playerKey, playerName);
        }

        if (event.type === 'kill') {
          kills.set(playerKey, (kills.get(playerKey) || 0) + 1);

          const current =
            (currentStreak.get(playerKey) || 0) + 1;

          currentStreak.set(playerKey, current);
          bestStreak.set(
            playerKey,
            Math.max(bestStreak.get(playerKey) || 0, current),
          );

        }

        if (event.type === 'death') {
          deaths.set(
            playerKey,
            (deaths.get(playerKey) || 0) + 1,
          );
          currentStreak.set(playerKey, 0);
        }
      });

      playerNames.forEach((playerName, playerKey) => {
        const match = ensureComparisonMatch(
          playerName,
          warId,
          warEvents[0]?.date || warId,
        );

        if (!match) return;

        match.kills = kills.get(playerKey) || 0;
        match.deaths = deaths.get(playerKey) || 0;
        match.killstreak = bestStreak.get(playerKey) || 0;
        match.__has.kills = true;
        match.__has.deaths = true;
        match.__has.killstreak = true;
        // KillFeed remains unavailable until a Stats Log row explicitly provides it.
        match.__has.killfeed = false;
      });
    });

    // Merge detailed secondary rows once, instead of re-scanning them for every
    // guild member.
    secondaryRows.forEach((row, index) => {
      const playerName = row?.player || row?.name;

      if (!playerName) return;

      const warId = secondaryWarId(row, index);
      const match = ensureComparisonMatch(
        playerName,
        warId,
        row?.date || row?.war || warId,
      );

      if (!match) return;

      const rowStats = getSecondaryMatchStats(row);
      const warPresence = secondaryPresence[warId] || {};
      const hasKills = getSecondaryMetricExists(
        row,
        'kills',
        warPresence,
      );
      const hasDeaths = getSecondaryMetricExists(
        row,
        'deaths',
        warPresence,
      );
      const hasKillstreak = getSecondaryMetricExists(
        row,
        'killstreak',
        warPresence,
      );
      const hasKillfeed = getSecondaryMetricExists(
        row,
        'killfeed',
        warPresence,
      );
      const hasDamageDealt = getSecondaryMetricExists(
        row,
        'damageDealt',
        warPresence,
      );
      const hasDamageTaken = getSecondaryMetricExists(
        row,
        'damageTaken',
        warPresence,
      );
      const hasCcHits = getSecondaryMetricExists(
        row,
        'ccHits',
        warPresence,
      );
      const hasDamageToFort = getSecondaryMetricExists(
        row,
        'damageToFort',
        warPresence,
      );

      if (hasKills) {
        match.kills = Number(rowStats.kills) || 0;
        match.__has.kills = true;
      }

      if (hasDeaths) {
        match.deaths = Number(rowStats.deaths) || 0;
        match.__has.deaths = true;
      }

      if (hasKillstreak) {
        match.killstreak = Number(rowStats.killstreak) || 0;
        match.__has.killstreak = true;
      }

      if (hasKillfeed) {
        match.killfeed = Number(rowStats.killfeed) || 0;
        match.__has.killfeed = true;
      }

      if (hasDamageDealt) {
        match.damageDealt =
          Number(rowStats.damageDealt) || 0;
        match.__has.damageDealt = true;
      }

      if (hasDamageTaken) {
        match.damageTaken =
          Number(rowStats.damageTaken) || 0;
        match.__has.damageTaken = true;
      }

      if (hasCcHits) {
        match.ccHits = Number(rowStats.ccHits) || 0;
        match.__has.ccHits = true;
      }

      if (hasDamageToFort) {
        match.damageToFort =
          Number(rowStats.damageToFort) || 0;
        match.__has.damageToFort = true;
      }
    });

    return sortedPlayers.map((playerRow) => {
      const playerKey = normalizePlayerName(playerRow.name);
      const matches = [
        ...(matchesByPlayer.get(playerKey)?.values() || []),
      ];
      const totalKills = comparisonMetricSum(
        matches,
        'kills',
      );
      const totalDeaths = comparisonMetricSum(
        matches,
        'deaths',
      );
      const totalKd = totalDeaths
        ? totalKills / totalDeaths
        : totalKills;

      const values =
        compareMode === 'average'
          ? {
              kills: comparisonMetricAverage(
                matches,
                'kills',
              ),
              deaths: comparisonMetricAverage(
                matches,
                'deaths',
              ),
              kd: comparisonMetricAverage(
                matches,
                'kd',
                getMatchKdValue,
              ),
              killstreak: comparisonMetricAverage(
                matches,
                'killstreak',
              ),
              killfeed: comparisonMetricAverage(
                matches,
                'killfeed',
              ),
              damageDealt: comparisonMetricAverage(
                matches,
                'damageDealt',
              ),
              damageTaken: comparisonMetricAverage(
                matches,
                'damageTaken',
              ),
              ccHits: comparisonMetricAverage(
                matches,
                'ccHits',
              ),
              damageToFort: comparisonMetricAverage(
                matches,
                'damageToFort',
              ),
            }
          : {
              kills: totalKills,
              deaths: totalDeaths,
              kd: totalKd,
              killstreak: comparisonMetricMax(
                matches,
                'killstreak',
              ),
              killfeed: comparisonMetricMax(
                matches,
                'killfeed',
              ),
              damageDealt: comparisonMetricSum(
                matches,
                'damageDealt',
              ),
              damageTaken: comparisonMetricSum(
                matches,
                'damageTaken',
              ),
              ccHits: comparisonMetricSum(
                matches,
                'ccHits',
              ),
              damageToFort: comparisonMetricSum(
                matches,
                'damageToFort',
              ),
            };

      return {
        name: playerRow.name,
        wars: matches.length,
        ...values,
      };
    });
  }, [
    comparisonEnabled,
    compareDaysAgo,
    compareMode,
    stats?.ev,
    stats?.secondary?.rows,
    sortedPlayers,
  ]);

  const comparedPlayers = useMemo(
    () =>
      comparedPlayerNames
        .map((playerName) =>
          comparisonPopulation.find((player) =>
            samePlayerName(player.name, playerName),
          ),
        )
        .filter(Boolean),
    [comparedPlayerNames, comparisonPopulation],
  );

  const comparisonBenchmarks = useMemo(() => {
    const activePlayers = comparisonPopulation.filter(
      (player) => Number(player.wars) > 0,
    );
    const metricKeys = [
      'kills',
      'wars',
      'kd',
      'killstreak',
      'killfeed',
      'damageDealt',
      'ccHits',
      'damageToFort',
    ];

    return Object.fromEntries(
      metricKeys.map((metric) => {
        const values = activePlayers
          .map((player) => Number(player[metric]) || 0)
          .filter((value) => Number.isFinite(value) && value >= 0);
        const average = values.length
          ? values.reduce((sum, value) => sum + value, 0) /
            values.length
          : 0;
        const maximum = values.length
          ? Math.max(...values)
          : 0;

        return [
          metric,
          {
            average,
            maximum: maximum > 0 ? maximum : 1,
            players: values.length,
          },
        ];
      }),
    );
  }, [comparisonPopulation]);

  const selectedStats = useMemo(() => {
    if (!player) return null;

    const victims = {};
    const killedBy = {};
    const days = {};
    const enemyGuilds = {};
    const involvedWarIds = new Set();
    const eventWarIdsForPlayer = new Set();
    const warMap = {};

    stats.ev.forEach((event) => {
      warMap[String(event.id)] ||= [];
      warMap[String(event.id)].push(event);

      const guildPlayer = getGuildPlayerFromEvent(event);
      const enemyPlayer = getEnemyPlayerFromEvent(event);
      const involved = samePlayerName(guildPlayer, player);

      if (!involved) return;

      involvedWarIds.add(String(event.id));
      eventWarIdsForPlayer.add(String(event.id));

      if (!days[event.date]) {
        days[event.date] = {
          time: event.date,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };
      }

      days[event.date].wars.add(String(event.id));

      if (!enemyGuilds[event.guild]) {
        enemyGuilds[event.guild] = {
          name: event.guild,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };
      }

      enemyGuilds[event.guild].wars.add(String(event.id));

      if (event.type === 'kill') {
        add(victims, enemyPlayer);
        days[event.date].kills += 1;
        enemyGuilds[event.guild].kills += 1;
      }

      if (event.type === 'death') {
        add(killedBy, enemyPlayer);
        days[event.date].deaths += 1;
        enemyGuilds[event.guild].deaths += 1;
      }
    });


    const secondaryRows = stats.secondary?.rows || [];
    const secondaryWarPresence = getSecondaryWarMetricPresence(secondaryRows);
    const secondaryRowsForPlayer = secondaryRows.filter((row) => samePlayerName(row.player, player));

    secondaryRowsForPlayer.forEach((row, index) => {
      const warId = secondaryWarId(row, index);

      if (eventWarIdsForPlayer.has(warId)) return;

      const dayKey = row.date || row.war || warId;
      involvedWarIds.add(warId);

      if (!days[dayKey]) {
        days[dayKey] = {
          time: dayKey,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };
      }

      days[dayKey].wars.add(warId);
      days[dayKey].kills += Number(row.kills) || 0;
      days[dayKey].deaths += Number(row.deaths) || 0;
    });

    const playerRow =
      stats.players.find((item) => samePlayerName(item.name, player)) || {
        kills: 0,
        deaths: 0,
        kd: '0.00',
      };

    const orderedDays = Object.values(days).sort((a, b) =>
      a.time.localeCompare(b.time),
    );

    const averageLine = orderedDays.map((day) => {
      const fights = Math.max(1, day.wars.size);
      const avgKills = Number((day.kills / fights).toFixed(2));
      const avgDeaths = Number((day.deaths / fights).toFixed(2));

      return {
        time: day.time,
        kills: day.kills,
        deaths: day.deaths,
        avgKills,
        avgDeaths,
        avgKd: Number((avgDeaths ? avgKills / avgDeaths : avgKills).toFixed(2)),
      };
    });

    // ── Build per-match list from warMap + secondary rows ─────────────────────
    const matchMap = {};

    Object.entries(warMap).forEach(([warId, events]) => {
      const playerEvents = events.filter(
        (event) => samePlayerName(getGuildPlayerFromEvent(event), player),
      );

      if (!playerEvents.length) return;

      const kills = playerEvents.filter((event) => event.type === 'kill').length;
      const deaths = playerEvents.filter((event) => event.type === 'death').length;
      const date = events[0]?.date || warId;

      matchMap[warId] = {
        warId,
        date,
        kills,
        deaths,
        killstreak: getBestKillstreakForWar(events, player),
        // Combat Logs do not contain KillFeed.
        killfeed: 0,
        damageDealt: 0,
        damageTaken: 0,
        ccHits: 0,
        damageToFort: 0,
        __has: {
          kills: true,
          deaths: true,
          killstreak: true,
          killfeed: false,
          damageDealt: false,
          damageTaken: false,
          ccHits: false,
          damageToFort: false,
        },
      };
    });

    secondaryRowsForPlayer.forEach((row, index) => {
      const warId = secondaryWarId(row, index);
      const statsFromRow = getSecondaryMatchStats(row);
      const existing = matchMap[warId];
      const existingHas = existing?.__has || {};
      const date = row.date || row.war || existing?.date || warId;

      const warPresence = secondaryWarPresence[warId] || {};
      const hasKills = getSecondaryMetricExists(row, 'kills', warPresence);
      const hasDeaths = getSecondaryMetricExists(row, 'deaths', warPresence);
      const hasKillstreak = getSecondaryMetricExists(row, 'killstreak', warPresence);
      const hasKillfeed = getSecondaryMetricExists(row, 'killfeed', warPresence);
      const hasDamageDealt = getSecondaryMetricExists(row, 'damageDealt', warPresence);
      const hasDamageTaken = getSecondaryMetricExists(row, 'damageTaken', warPresence);
      const hasCcHits = getSecondaryMetricExists(row, 'ccHits', warPresence);
      const hasDamageToFort = getSecondaryMetricExists(row, 'damageToFort', warPresence);

      matchMap[warId] = {
        warId,
        date,
        kills: hasKills ? statsFromRow.kills : existing?.kills || 0,
        deaths: hasDeaths ? statsFromRow.deaths : existing?.deaths || 0,
        killstreak: hasKillstreak
          ? statsFromRow.killstreak
          : existing?.killstreak || 0,
        killfeed: hasKillfeed ? statsFromRow.killfeed : existing?.killfeed || 0,
        damageDealt: hasDamageDealt
          ? statsFromRow.damageDealt
          : existing?.damageDealt || 0,
        damageTaken: hasDamageTaken
          ? statsFromRow.damageTaken
          : existing?.damageTaken || 0,
        ccHits: hasCcHits ? statsFromRow.ccHits : existing?.ccHits || 0,
        damageToFort: hasDamageToFort
          ? statsFromRow.damageToFort
          : existing?.damageToFort || 0,
        __has: {
          kills: hasKills || Boolean(existingHas.kills),
          deaths: hasDeaths || Boolean(existingHas.deaths),
          killstreak:
            hasKillstreak || Boolean(existingHas.killstreak),
          killfeed: hasKillfeed || Boolean(existingHas.killfeed),
          damageDealt: hasDamageDealt || Boolean(existingHas.damageDealt),
          damageTaken: hasDamageTaken || Boolean(existingHas.damageTaken),
          ccHits: hasCcHits || Boolean(existingHas.ccHits),
          damageToFort: hasDamageToFort || Boolean(existingHas.damageToFort),
        },
      };
    });

    const matchList = Object.values(matchMap).sort((a, b) =>
      String(b.date).localeCompare(String(a.date)),
    );

    const enemyGuildRows = Object.values(enemyGuilds)
      .map((guild) => {
        const wars = Math.max(1, guild.wars.size);
        const avgKills = Number((guild.kills / wars).toFixed(2));
        const avgDeaths = Number((guild.deaths / wars).toFixed(2));
        const avgRatio = Number(
          (avgDeaths ? avgKills / avgDeaths : avgKills).toFixed(2),
        );

        return {
          ...guild,
          wars,
          avgKills,
          avgDeaths,
          avgRatio,
        };
      })
      .sort(
        (a, b) =>
          b.avgRatio - a.avgRatio ||
          b.avgKills - a.avgKills ||
          a.avgDeaths - b.avgDeaths ||
          a.name.localeCompare(b.name),
      );

    const streakItems = Object.entries(warMap)
      .map(([warId, events]) => {
        const rows = getOurPlayerRowsForWar(events);

        if (!rows.some((row) => samePlayerName(row.name, player))) {
          return null;
        }

        return {
          id: warId,
          date: events[0]?.date || '-',
          war: events[0]?.war || 'Battle log',
          value: getBestKillstreakForWar(events, player),
        };
      })
      .filter((item) => item && item.value > 0)
      .sort(
        (a, b) =>
          b.value - a.value ||
          String(a.date).localeCompare(String(b.date)) ||
          String(a.war).localeCompare(String(b.war)),
      )
      .slice(0, 10);

    const feedItems = matchList
      .filter(
        (match) =>
          getMatchMetricExists(match, 'killfeed') &&
          Number(match.killfeed) > 0,
      )
      .map((match) => ({
        id: match.warId,
        date: match.date || '-',
        war: 'Battle log',
        value: Number(match.killfeed) || 0,
      }))
      .sort(
        (a, b) =>
          b.value - a.value ||
          String(a.date).localeCompare(String(b.date)) ||
          String(a.war).localeCompare(String(b.war)),
      )
      .slice(0, 10);

    return {
      ...playerRow,
      victims,
      killedBy,
      averageLine,
      matchList,
      enemyGuildRows,
      wars: involvedWarIds.size,
      averageRank:
        averageRankTable[normalizePlayerName(player)]?.formatted ||
        '0.00',
      streakItems,
      feedItems,
    };
  }, [player, stats, averageRankTable]);

  return (
    <div className="player-stats-page player-stats-guild-style player-stats-root-transparent p-4">
      <style>{PLAYER_STATS_GUILD_CSS}</style>
      <h2 className="mb-4 text-2xl font-black">Player Stats</h2>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <PlayerSelect
          players={sortedPlayers}
          value={player}
          onChange={setPlayer}
        />

        <ComparePlayersSelect
          players={sortedPlayers}
          values={comparedPlayerNames}
          onChange={setComparedPlayerNames}
        />
      </div>

      <PlayerComparisonPanel
        players={comparedPlayers}
        benchmarks={comparisonBenchmarks}
        daysAgo={compareDaysAgo}
        onDaysAgoChange={setCompareDaysAgo}
        mode={compareMode}
        onModeChange={setCompareMode}
      />

      {selectedStats && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <PlayerStatsSummaryCard
              icon={<SummaryHeaderIcon type="kills" color="#6ee7b7" />}
              label="Kills"
              value={selectedStats.kills}
              sub={player}
              tone="emerald"
              valueClass="text-emerald-200"
            />

            <PlayerStatsSummaryCard
              icon={<SummaryHeaderIcon type="deaths" color="#f9a8d4" />}
              label="Deaths"
              value={selectedStats.deaths}
              sub="Total deaths"
              tone="pink"
              valueClass="text-pink-200"
            />

            <PlayerStatsSummaryCard
              icon={<SummaryHeaderIcon type="kd" color="#93c5fd" />}
              label="K/D"
              value={selectedStats.kd}
              sub="Overall ratio"
              tone="blue"
              valueClass="text-blue-200"
            />

            <PlayerStatsSummaryCard
              icon={<SummaryHeaderIcon type="wars" color="#fcd34d" />}
              label="Wars"
              value={selectedStats.wars}
              sub="Wars participated"
              tone="amber"
              valueClass="text-amber-200"
            />

            <PlayerStatsSummaryCard
              icon={<SummaryHeaderIcon type="averageRank" color="#c4b5fd" />}
              label="Average Rank"
              value={selectedStats.averageRank || '0.00'}
              sub=""
              tone="violet"
              valueClass="text-violet-200"
            />
          </div>

          <div className="player-stats-performance-no-summary player-stats-performance-shell mt-4 rounded-[28px] p-0">
            <style>
              {`.player-stats-performance-no-summary [class*="xl:justify-between"] > div:last-child {
                display: none !important;
              }`}
            </style>
            <AveragePerformanceChart
              data={selectedStats.averageLine}
              title="Performance"
            />
          </div>

          <div className="mt-4 player-stats-section-shell">
            <MatchHistoryList
              matches={selectedStats.matchList}
              onOpenMatchOverview={onOpenMatchOverview}
            />
          </div>

          <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[1.15fr_1fr]">
            <EnemyGuildTable rows={selectedStats.enemyGuildRows} />

            <TargetsAndNemesisPanel
              favouriteTargets={Object.entries(selectedStats.victims)
                .map(([name, kills]) => ({ name, kills }))
                .sort((a, b) => b.kills - a.kills)}
              nemesisTargets={Object.entries(selectedStats.killedBy)
                .map(([name, kills]) => ({ name, kills }))
                .sort((a, b) => b.kills - a.kills)}
            />
          </div>

        </>
      )}
    </div>
  );
}
