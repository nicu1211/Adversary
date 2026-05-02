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

export function Metric({ icon, label, value, sub, className }) {
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br to-slate-950/40 p-4 sm:p-5 ${className}`}
    >
      <div className="flex gap-4">
        <b className="text-4xl">{icon}</b>

        <div>
          <p className="text-sm text-slate-300">{label}</p>
          <p className="text-3xl font-black">{value}</p>
          <p className="text-sm text-slate-400">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export function Calendar({ month, setMonth, selected, marked, onPick, footer }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="rounded-lg border border-slate-700 px-2 py-1 hover:bg-slate-800"
        >
          ‹
        </button>

        <b className="text-sm">{monthLabel(month)}</b>

        <button
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
            disabled={deleting}
            onClick={onCancel}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
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
