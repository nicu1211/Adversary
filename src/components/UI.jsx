import React from 'react';
import {
  monthDays,
  monthLabel,
  scrollCls,
  shiftMonth,
} from '../lib/logUtils';

export function Panel({ children, cls = '' }) {
  return (
    <section
      className={`rounded-3xl border border-slate-700 bg-slate-950/70 p-3 shadow-2xl sm:p-5 ${cls}`}
    >
      {children}
    </section>
  );
}

function getMetricTone(label = '', className = '') {
  const text = `${label} ${className}`.toLowerCase();

  if (text.includes('death') || text.includes('pink')) return 'death';
  if (text.includes('k/d') || text.includes('ratio') || text.includes('violet')) return 'kd';
  if (text.includes('player') || text.includes('emerald')) return 'players';

  return 'kills';
}

function MetricIcon({ type }) {
  if (type === 'kills') {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <linearGradient id="killsBlade" x1="0" x2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="45%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
          <linearGradient id="goldTrim" x1="0" x2="1">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="45%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        <circle
          cx="60"
          cy="60"
          r="43"
          fill="none"
          stroke="#60a5fa"
          strokeOpacity="0.18"
          strokeWidth="2"
        />

        <path
          d="M25 25 L96 96"
          stroke="url(#killsBlade)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M95 25 L24 96"
          stroke="url(#killsBlade)"
          strokeWidth="8"
          strokeLinecap="round"
        />

        <path
          d="M20 20 L31 27 L27 31 Z"
          fill="url(#goldTrim)"
        />
        <path
          d="M100 20 L89 27 L93 31 Z"
          fill="url(#goldTrim)"
        />

        <path
          d="M37 77 L25 95"
          stroke="url(#goldTrim)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M83 77 L95 95"
          stroke="url(#goldTrim)"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <path
          d="M28 78 L42 92"
          stroke="#fde68a"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M92 78 L78 92"
          stroke="#fde68a"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <circle cx="60" cy="60" r="6" fill="#fef3c7" />
        <circle cx="60" cy="60" r="3" fill="#60a5fa" />
      </svg>
    );
  }

  if (type === 'death') {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <linearGradient id="deathGold" x1="0" x2="1">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="45%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
          <linearGradient id="bone" x1="0" x2="1">
            <stop offset="0%" stopColor="#d6d3d1" />
            <stop offset="50%" stopColor="#fafaf9" />
            <stop offset="100%" stopColor="#a8a29e" />
          </linearGradient>
        </defs>

        <path
          d="M60 10 L72 29 L96 24 L88 48 L108 60 L88 72 L96 96 L72 91 L60 110 L48 91 L24 96 L32 72 L12 60 L32 48 L24 24 L48 29 Z"
          fill="none"
          stroke="url(#deathGold)"
          strokeWidth="3"
          opacity="0.9"
        />

        <circle
          cx="60"
          cy="57"
          r="31"
          fill="url(#bone)"
          stroke="#f9a8d4"
          strokeOpacity="0.4"
          strokeWidth="2"
        />

        <path
          d="M36 53 C36 42 44 34 60 34 C76 34 84 42 84 53 C84 72 73 82 60 82 C47 82 36 72 36 53 Z"
          fill="url(#bone)"
        />

        <circle cx="49" cy="57" r="8" fill="#09090b" />
        <circle cx="71" cy="57" r="8" fill="#09090b" />

        <path
          d="M60 62 L54 72 H66 Z"
          fill="#18181b"
        />

        <path
          d="M48 82 H72"
          stroke="#18181b"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M52 78 V87 M60 78 V89 M68 78 V87"
          stroke="#18181b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'kd') {
    return (
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <defs>
          <linearGradient id="crystal" x1="0" x2="1">
            <stop offset="0%" stopColor="#f5f3ff" />
            <stop offset="45%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          <linearGradient id="kdGold" x1="0" x2="1">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="50%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        <circle
          cx="60"
          cy="60"
          r="43"
          fill="none"
          stroke="#a78bfa"
          strokeOpacity="0.22"
          strokeWidth="2"
        />

        <path
          d="M60 10 L77 60 L60 110 L43 60 Z"
          fill="url(#crystal)"
          stroke="url(#kdGold)"
          strokeWidth="3"
        />

        <path
          d="M60 10 L60 110"
          stroke="#ede9fe"
          strokeOpacity="0.7"
          strokeWidth="2"
        />

        <path
          d="M16 60 L60 43 L104 60 L60 77 Z"
          fill="#7c3aed"
          fillOpacity="0.35"
          stroke="url(#kdGold)"
          strokeWidth="2"
        />

        <circle cx="60" cy="60" r="9" fill="#f5f3ff" opacity="0.95" />
        <circle cx="60" cy="60" r="4" fill="#8b5cf6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full">
      <defs>
        <linearGradient id="playerGold" x1="0" x2="1">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="45%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <linearGradient id="playerTeal" x1="0" x2="1">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>

      <circle
        cx="60"
        cy="60"
        r="43"
        fill="none"
        stroke="#34d399"
        strokeOpacity="0.18"
        strokeWidth="2"
      />

      <path
        d="M60 15 L72 28 L67 44 H53 L48 28 Z"
        fill="url(#playerGold)"
      />

      <path
        d="M45 45 C48 35 72 35 75 45 V58 C75 74 66 85 60 89 C54 85 45 74 45 58 Z"
        fill="url(#playerGold)"
        stroke="#fef3c7"
        strokeOpacity="0.45"
        strokeWidth="2"
      />

      <path
        d="M35 91 C41 76 50 67 60 67 C70 67 79 76 85 91 Z"
        fill="url(#playerTeal)"
        stroke="url(#playerGold)"
        strokeWidth="3"
      />

      <path
        d="M31 96 H89"
        stroke="url(#playerGold)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      <path
        d="M43 104 H77"
        stroke="#34d399"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function Metric({ icon, label, value, sub, className = '' }) {
  const tone = getMetricTone(label, className);

  const styles = {
    kills: {
      card: 'border-blue-400/35 bg-blue-950/20 shadow-[inset_0_0_45px_rgba(37,99,235,0.16),0_0_22px_rgba(37,99,235,0.12)]',
      value: 'text-blue-300 drop-shadow-[0_0_18px_rgba(96,165,250,0.55)]',
      label: 'text-blue-50',
      sub: 'text-slate-400',
      divider: 'from-transparent via-blue-300/60 to-transparent',
      glow: 'bg-blue-400/20',
    },
    death: {
      card: 'border-pink-400/35 bg-pink-950/20 shadow-[inset_0_0_45px_rgba(219,39,119,0.16),0_0_22px_rgba(219,39,119,0.12)]',
      value: 'text-pink-300 drop-shadow-[0_0_18px_rgba(244,114,182,0.55)]',
      label: 'text-pink-50',
      sub: 'text-slate-400',
      divider: 'from-transparent via-pink-300/60 to-transparent',
      glow: 'bg-pink-400/20',
    },
    kd: {
      card: 'border-violet-400/35 bg-violet-950/20 shadow-[inset_0_0_45px_rgba(124,58,237,0.16),0_0_22px_rgba(124,58,237,0.12)]',
      value: 'text-violet-300 drop-shadow-[0_0_18px_rgba(167,139,250,0.55)]',
      label: 'text-violet-50',
      sub: 'text-slate-400',
      divider: 'from-transparent via-violet-300/60 to-transparent',
      glow: 'bg-violet-400/20',
    },
    players: {
      card: 'border-emerald-400/35 bg-emerald-950/20 shadow-[inset_0_0_45px_rgba(5,150,105,0.16),0_0_22px_rgba(5,150,105,0.12)]',
      value: 'text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.55)]',
      label: 'text-emerald-50',
      sub: 'text-slate-400',
      divider: 'from-transparent via-emerald-300/60 to-transparent',
      glow: 'bg-emerald-400/20',
    },
  };

  const selected = styles[tone];

  return (
    <div
      className={`relative min-h-[250px] overflow-hidden rounded-3xl border p-5 text-center transition hover:-translate-y-0.5 hover:brightness-110 ${selected.card}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%)]" />

      <div
        className={`pointer-events-none absolute left-1/2 top-20 h-24 w-24 -translate-x-1/2 rounded-full blur-3xl ${selected.glow}`}
      />

      <div className="relative mx-auto mb-4 h-28 w-28">
        <MetricIcon type={tone} />
      </div>

      <p className={`relative font-serif text-xl font-semibold ${selected.label}`}>
        {label}
      </p>

      <div
        className={`relative mx-auto my-2 h-px w-24 bg-gradient-to-r ${selected.divider}`}
      />

      <p className={`relative font-serif text-6xl font-black leading-none ${selected.value}`}>
        {value}
      </p>

      <p className={`relative mt-3 text-base ${selected.sub}`}>
        {sub}
      </p>
    </div>
  );
}

export function Calendar({ month, setMonth, selected, marked, onPick, footer }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="rounded-lg border border-slate-700 px-2 py-1 hover:bg-slate-800"
        >
          ‹
        </button>

        <b className="text-sm">{monthLabel(month)}</b>

        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="rounded-lg border border-slate-700 px-2 py-1 hover:bg-slate-800"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-500">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthDays(month).map((day) => (
          <button
            key={day.iso}
            type="button"
            onClick={() => onPick(day.iso)}
            className={`relative h-8 rounded-lg text-xs font-black transition ${
              selected === day.iso
                ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                : marked.has(day.iso)
                  ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/35'
                  : day.currentMonth
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-900'
            }`}
          >
            {day.day}

            {marked.has(day.iso) && (
              <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-300" />
            )}
          </button>
        ))}
      </div>

      {footer}
    </div>
  );
}

export function Popup({ title, close, children, maxWidth = 'max-w-5xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className={`max-h-[86vh] w-full ${maxWidth} overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
          <h3 className="text-2xl font-black">{title}</h3>

          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className={`max-h-[70vh] overflow-auto p-4 ${scrollCls}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function DeletePopup({
  target,
  deleting,
  message,
  onCancel,
  onDelete,
}) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <h3 className="text-xl font-black text-rose-300">Delete log?</h3>

        <p className="mt-2 text-sm text-slate-300">
          This action permanently deletes the selected log from the database.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <p className="font-bold">{target.name}</p>
          <p className="text-xs text-slate-500">
            {target.date}
            {target.localOnly ? ' · local only' : ''}
          </p>
        </div>

        {message && (
          <p className="mt-3 rounded-xl bg-blue-500/10 p-3 text-sm text-blue-200">
            {message}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="rounded-xl bg-rose-600 px-4 py-3 font-black hover:bg-rose-500 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
