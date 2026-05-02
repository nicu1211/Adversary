import React from 'react';
import { Calendar, DeletePopup, Panel } from '../components/UI';
import { dateOf, today } from '../lib/logUtils';

export default function RawLog({
  raw,
  setRaw,
  name,
  setName,
  date,
  setDate,
  logs,
  message,
  saveLog,
  rawMonth,
  setRawMonth,
  calendarOpen,
  setCalendarOpen,
  markedDates,
  deleteTarget,
  setDeleteTarget,
  deleting,
  deleteLog,
}) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel>
          <h2 className="mb-4 text-2xl font-black">Raw Log</h2>

          <div className="mb-3 grid gap-3 md:grid-cols-[1fr_190px_100px]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Battle log name"
              className="rounded-xl border border-slate-700 bg-slate-900 p-3"
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-left hover:bg-blue-500/20"
              >
                <span className="block text-xs font-bold text-blue-200">
                  War date
                </span>
                <span className="font-black">{date}</span>
              </button>

              {calendarOpen && (
                <div className="absolute left-0 right-0 z-40 mt-2">
                  <Calendar
                    month={rawMonth}
                    setMonth={setRawMonth}
                    selected={date}
                    marked={markedDates}
                    onPick={(pickedDate) => {
                      setDate(pickedDate);
                      setCalendarOpen(false);
                    }}
                    footer={
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setDate(today());
                            setCalendarOpen(false);
                          }}
                          className="rounded-xl border border-slate-700 px-2 py-2 text-xs font-bold"
                        >
                          Today
                        </button>

                        <button
                          onClick={() => setCalendarOpen(false)}
                          className="rounded-xl border border-slate-700 px-2 py-2 text-xs font-bold"
                        >
                          Close
                        </button>
                      </div>
                    }
                  />
                </div>
              )}
            </div>

            <button
              onClick={saveLog}
              className="rounded-xl bg-blue-600 font-bold hover:bg-blue-500"
            >
              Save
            </button>
          </div>

          {message && (
            <p className="mb-3 rounded-xl bg-blue-500/10 p-3 text-blue-200">
              {message}
            </p>
          )}

          <textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="Paste your node war log here..."
            className="h-96 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm"
          />
        </Panel>

        <Panel>
          <h2 className="mb-4 text-2xl font-black">History</h2>

          {!logs.length ? (
            <p className="text-sm text-slate-500">No saved logs yet.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="mb-3 rounded-xl bg-slate-900 p-3"
              >
                <b>{log.name}</b>

                <p className="text-xs text-slate-500">
                  {dateOf(log)}
                  {log.localOnly ? ' · local only' : ''}
                </p>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setDeleteTarget(log)}
                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold hover:bg-rose-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>

      <DeletePopup
        target={deleteTarget}
        deleting={deleting}
        message={message}
        onCancel={() => setDeleteTarget(null)}
        onDelete={deleteLog}
      />
    </>
  );
}
