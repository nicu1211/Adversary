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

function MetricDivider({ tone }) {
  const styles = {
    kills: 'from-transparent via-blue-300/60 to-transparent',
    death: 'from-transparent via-pink-300/60 to-transparent',
    kd: 'from-transparent via-violet-300/60 to-transparent',
    players: 'from-transparent via-emerald-300/60 to-transparent',
  };

  const dot = {
    kills: 'bg-blue-300',
    death: 'bg-pink-300',
    kd: 'bg-violet-300',
    players: 'bg-emerald-300',
  };

  return (
    <div className="mx-auto my-3 flex w-full max-w-[180px] items-center justify-center gap-3">
      <div className={`h-px flex-1 bg-gradient-to-r ${styles[tone]}`} />
      <div className="relative h-3 w-3 rotate-45 rounded-[2px] border border-white/25 bg-white/10">
        <div
          className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-0 rounded-[1px] ${dot[tone]}`}
        />
      </div>
      <div className={`h-px flex-1 bg-gradient-to-r ${styles[tone]}`} />
    </div>
  );
}

function MetricArt({ type }) {
  if (type === 'kills') {
    return (
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <circle
          cx="80"
          cy="80"
          r="48"
          fill="none"
          stroke="rgba(96,165,250,0.16)"
          strokeWidth="2"
        />
        <circle
          cx="80"
          cy="80"
          r="39"
          fill="none"
          stroke="rgba(251,191,36,0.18)"
          strokeWidth="2"
        />

        <path
          d="M44 34 L118 108"
          stroke="#e5e7eb"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path
          d="M116 34 L42 108"
          stroke="#e5e7eb"
          strokeWidth="11"
          strokeLinecap="round"
        />

        <path
          d="M38 30 L53 39 L47 46 Z"
          fill="#d4a24a"
        />
        <path
          d="M122 30 L107 39 L113 46 Z"
          fill="#d4a24a"
        />

        <path
          d="M61 94 L43 121"
          stroke="#b8872f"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M99 94 L117 121"
          stroke="#b8872f"
          strokeWidth="9"
          strokeLinecap="round"
        />

        <path
          d="M45 94 L66 114"
          stroke="#e8c16a"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M115 94 L94 114"
          stroke="#e8c16a"
          strokeWidth="5"
          strokeLinecap="round"
        />

        <path
          d="M80 24 L90 38 L80 50 L70 38 Z"
          fill="#b8872f"
          stroke="#e8c16a"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (type === 'death') {
    return (
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <path
          d="M80 20 L92 36 L112 32 L108 52 L128 60 L108 68 L112 88 L92 84 L80 100 L68 84 L48 88 L52 68 L32 60 L52 52 L48 32 L68 36 Z"
          fill="rgba(212,162,74,0.18)"
          stroke="#b8872f"
          strokeWidth="2.5"
        />

        <circle
          cx="80"
          cy="78"
          r="34"
          fill="#ddd6d3"
          stroke="rgba(244,114,182,0.25)"
          strokeWidth="2"
        />

        <path
          d="M52 74 C52 58 63 48 80 48 C97 48 108 58 108 74 C108 95 94 108 80 108 C66 108 52 95 52 74 Z"
          fill="#ddd6d3"
        />

        <circle cx="67" cy="77" r="8" fill="#09090b" />
        <circle cx="93" cy="77" r="8" fill="#09090b" />

        <path d="M80 84 L73 95 H87 Z" fill="#18181b" />
        <path d="M65 104 H95" stroke="#18181b" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M70 100 V109 M80 100 V111 M90 100 V109" stroke="#18181b" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'kd') {
    return (
      <svg viewBox="0 0 160 160" className="h-full w-full">
        <circle
          cx="80"
          cy="80"
          r="49"
          fill="none"
          stroke="rgba(167,139,250,0.22)"
          strokeWidth="2"
        />
        <circle
          cx="80"
          cy="80"
          r="39"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
        />

        <path
          d="M80 24 L97 63 L136 80 L97 97 L80 136 L63 97 L24 80 L63 63 Z"
          fill="rgba(139,92,246,0.22)"
          stroke="#bfa0ff"
          strokeWidth="2"
        />
        <path
          d="M80 32 L92 68 L128 80 L92 92 L80 128 L68 92 L32 80 L68 68 Z"
          fill="#a78bfa"
          fillOpacity="0.65"
          stroke="#ddd6fe"
          strokeWidth="1.5"
        />
        <circle cx="80" cy="80" r="8" fill="#f5f3ff" opacity="0.95" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 160 160" className="h-full w-full">
      <circle
        cx="80"
        cy="80"
        r="50"
        fill="none"
        stroke="rgba(52,211,153,0.18)"
        strokeWidth="2"
      />

      <path
        d="M44 104 C52 88 65 78 80 78 C95 78 108 88 116 104"
        fill="none"
        stroke="#6f8d66"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M40 98 C49 83 63 72 80 72 C97 72 111 83 120 98"
        fill="none"
        stroke="#6f8d66"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M80 36 L89 48 L85 61 H75 L71 48 Z"
        fill="#b8872f"
        stroke="#e8c16a"
        strokeWidth="1.5"
      />

      <path
        d="M62 66 C65 54 95 54 98 66 V81 C98 100 88 113 80 118 C72 113 62 100 62 81 Z"
        fill="#b8872f"
        stroke="#e8c16a"
        strokeWidth="2"
      />

      <path
        d="M58 118 H102"
        stroke="#b8872f"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Metric({ icon, label, value, sub, className = '' }) {
  const tone = getMetricTone(label, className);

  const styles = {
    kills: {
      card: 'border-blue-400/35 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_40%),linear-gradient(180deg,rgba(2,12,35,0.98),rgba(1,7,24,0.98))]',
      value: 'text-blue-300',
      label: 'text-stone-100',
      sub: 'text-slate-500',
      glow: 'shadow-[inset_0_0_40px_rgba(37,99,235,0.18),0_0_20px_rgba(37,99,235,0.08)]',
    },
    death: {
      card: 'border-pink-400/35 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.08),transparent_40%),linear-gradient(180deg,rgba(26,8,30,0.98),rgba(12,5,20,0.98))]',
      value: 'text-pink-300',
      label: 'text-stone-100',
      sub: 'text-slate-500',
      glow: 'shadow-[inset_0_0_40px_rgba(219,39,119,0.18),0_0_20px_rgba(219,39,119,0.08)]',
    },
    kd: {
      card: 'border-violet-400/35 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.08),transparent_40%),linear-gradient(180deg,rgba(14,11,43,0.98),rgba(8,6,24,0.98))]',
      value: 'text-violet-300',
      label: 'text-stone-100',
      sub: 'text-slate-500',
      glow: 'shadow-[inset_0_0_40px_rgba(124,58,237,0.18),0_0_20px_rgba(124,58,237,0.08)]',
    },
    players: {
      card: 'border-emerald-400/35 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_40%),linear-gradient(180deg,rgba(7,31,28,0.98),rgba(4,19,18,0.98))]',
      value: 'text-emerald-300',
      label: 'text-stone-100',
      sub: 'text-slate-500',
      glow: 'shadow-[inset_0_0_40px_rgba(5,150,105,0.18),0_0_20px_rgba(5,150,105,0.08)]',
    },
  };

  const selected = styles[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border p-6 text-center ${selected.card} ${selected.glow}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_30%)]" />

      <div className="relative mx-auto mb-4 h-[150px] w-[150px]">
        <MetricArt type={tone} />
      </div>

      <p className={`relative font-serif text-[24px] leading-none ${selected.label}`}>
        {label}
      </p>

      <MetricDivider tone={tone} />

      <p
        className={`relative font-serif text-[72px] font-semibold leading-none tracking-tight ${selected.value}`}
      >
        {value}
      </p>

      <p className={`relative mt-4 text-[18px] ${selected.sub}`}>
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
