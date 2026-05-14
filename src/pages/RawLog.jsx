import React, { useEffect, useMemo, useState } from 'react';
import Tesseract from 'tesseract.js';

import { Calendar, DeletePopup, Panel } from '../components/UI';
import { dateOf, parseLog, today } from '../lib/logUtils';

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function cleanOcrText(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[|]/g, 'I')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function preprocessImage(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const maxWidth = 2200;
    const scale = Math.min(1, maxWidth / image.width);
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];

      let gray = red * 0.299 + green * 0.587 + blue * 0.114;

      gray = gray > 155 ? 255 : gray < 95 ? 0 : gray * 1.25;

      data[index] = gray;
      data[index + 1] = gray;
      data[index + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

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
  const [ocrFile, setOcrFile] = useState(null);
  const [ocrPreview, setOcrPreview] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const detectedLines = useMemo(() => {
    if (!ocrText) return 0;
    return ocrText.split('\n').filter((line) => line.trim()).length;
  }, [ocrText]);

  const detectedEntries = useMemo(() => {
    if (!ocrText) return 0;
    try {
      return parseLog(ocrText, name, date, 'ocr-preview').length;
    } catch {
      return 0;
    }
  }, [ocrText, name, date]);

  useEffect(() => {
    return () => {
      if (ocrPreview) {
        URL.revokeObjectURL(ocrPreview);
      }
    };
  }, [ocrPreview]);

  async function handleOcrUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const isJpeg =
      file.type === 'image/jpeg' ||
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg');

    if (!isJpeg) {
      setOcrMessage('Only JPG/JPEG screenshots are accepted.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setOcrMessage('Image is too large. Please upload a JPEG under 10 MB.');
      return;
    }

    if (ocrPreview) {
      URL.revokeObjectURL(ocrPreview);
    }

    setOcrFile(file);
    setOcrPreview(URL.createObjectURL(file));
    setOcrText('');
    setOcrMessage('Preparing image for OCR...');
    setOcrProgress(0);
    setOcrBusy(true);

    try {
      const processedImage = await preprocessImage(file);

      setOcrMessage('Reading screenshot text...');

      const result = await Tesseract.recognize(processedImage, 'eng', {
        logger: (data) => {
          if (data.status === 'recognizing text') {
            setOcrProgress(Math.round((data.progress || 0) * 100));
          }
        },
      });

      const extracted = cleanOcrText(result?.data?.text);

      if (!extracted) {
        setOcrMessage(
          'OCR finished, but no text was detected. Try a clearer screenshot.',
        );
        return;
      }

      setOcrText(extracted);
      setRaw(extracted);
      setOcrMessage(
        'OCR completed. Check the extracted text below, then press Save.',
      );
    } catch (error) {
      console.error('OCR failed:', error);
      setOcrMessage(
        `OCR failed: ${error?.message || error || 'unknown error'}`,
      );
    } finally {
      setOcrBusy(false);
    }
  }

  function applyOcrText() {
    setRaw(ocrText);
    setOcrMessage('OCR text copied to the raw log field. Press Save to upload.');
  }

  function clearOcr() {
    if (ocrPreview) {
      URL.revokeObjectURL(ocrPreview);
    }

    setOcrFile(null);
    setOcrPreview('');
    setOcrText('');
    setOcrMessage('');
    setOcrProgress(0);
    setOcrBusy(false);
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
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
                            type="button"
                            onClick={() => {
                              setDate(today());
                              setCalendarOpen(false);
                            }}
                            className="rounded-xl border border-slate-700 px-2 py-2 text-xs font-bold"
                          >
                            Today
                          </button>

                          <button
                            type="button"
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
                type="button"
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
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-black">JPEG OCR Upload</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Upload a JPG/JPEG screenshot. The extracted text will be shown
                  for confirmation before saving.
                </p>
              </div>

              {ocrFile && (
                <button
                  type="button"
                  onClick={clearOcr}
                  disabled={ocrBusy}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>

            <label className="block cursor-pointer rounded-2xl border border-dashed border-blue-400/40 bg-blue-500/10 p-5 text-center hover:bg-blue-500/15">
              <input
                type="file"
                accept="image/jpeg,.jpg,.jpeg"
                onChange={handleOcrUpload}
                disabled={ocrBusy}
                className="hidden"
              />

              <span className="block text-lg font-black text-blue-100">
                {ocrBusy ? 'Reading screenshot...' : 'Upload JPEG screenshot'}
              </span>

              <span className="mt-1 block text-sm text-slate-400">
                Recommended: clear screenshot, high contrast, not cropped too
                aggressively.
              </span>
            </label>

            {ocrFile && (
              <div className="mt-3 rounded-xl bg-slate-950 p-3 text-sm text-slate-400">
                <b className="text-slate-200">{ocrFile.name}</b>
                <span> · {formatBytes(ocrFile.size)}</span>
              </div>
            )}

            {ocrBusy && (
              <div className="mt-3">
                <div className="mb-2 flex justify-between text-xs font-bold text-slate-400">
                  <span>OCR progress</span>
                  <span>{ocrProgress}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}

            {ocrMessage && (
              <p className="mt-3 rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                {ocrMessage}
              </p>
            )}

            {ocrPreview && (
              <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Screenshot preview
                  </p>
                  <img
                    src={ocrPreview}
                    alt="OCR upload preview"
                    className="max-h-80 w-full rounded-2xl border border-slate-800 object-contain"
                  />
                </div>

                <div>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Extracted text
                    </p>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-lg bg-slate-900 px-2 py-1">
                        Lines: {detectedLines}
                      </span>
                      <span
                        className={`rounded-lg px-2 py-1 ${
                          detectedEntries
                            ? 'bg-emerald-500/10 text-emerald-200'
                            : 'bg-amber-500/10 text-amber-200'
                        }`}
                      >
                        Parsed entries: {detectedEntries}
                      </span>
                    </div>
                  </div>

                  <textarea
                    value={ocrText}
                    onChange={(event) => setOcrText(event.target.value)}
                    placeholder="OCR result will appear here..."
                    className="h-80 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm"
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applyOcrText}
                      disabled={!ocrText || ocrBusy}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Use extracted text
                    </button>

                    <button
                      type="button"
                      onClick={() => setOcrText(raw)}
                      disabled={!raw || ocrBusy}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Copy current raw text here
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Panel>
        </div>

        <Panel>
          <h2 className="mb-4 text-2xl font-black">History</h2>

          {!logs.length ? (
            <p className="text-sm text-slate-500">No saved logs yet.</p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb:hover]:bg-slate-600">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="mb-3 rounded-xl bg-slate-900 p-3 last:mb-0"
                >
                  <b>{log.name}</b>

                  <p className="text-xs text-slate-500">
                    {dateOf(log)}
                    {log.localOnly ? ' · local only' : ''}
                  </p>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(log)}
                      className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold hover:bg-rose-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
