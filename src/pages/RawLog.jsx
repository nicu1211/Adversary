import React, { useEffect, useMemo, useState } from 'react';
import Tesseract from 'tesseract.js';

import { Calendar, DeletePopup, Panel } from '../components/UI';
import { dateOf, parseLog, today } from '../lib/logUtils';

function formatBytes(bytes) {
  if (!bytes) return '0 KB';

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

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

async function createOcrImageVariants(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });

    const minWidth = 2200;
    const maxWidth = 4200;

    let scale = 1;

    if (image.width < minWidth) {
      scale = minWidth / image.width;
    }

    if (image.width * scale > maxWidth) {
      scale = maxWidth / image.width;
    }

    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    function makeCanvas() {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', {
        willReadFrequently: true,
      });

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, 0, 0, width, height);

      return { canvas, ctx };
    }

    function getGrayStats(data) {
      const values = [];

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        values.push(Math.round(red * 0.299 + green * 0.587 + blue * 0.114));
      }

      values.sort((a, b) => a - b);

      const low = values[Math.floor(values.length * 0.05)] || 0;
      const high = values[Math.floor(values.length * 0.95)] || 255;
      const middle = values[Math.floor(values.length * 0.5)] || 128;

      return {
        low,
        high,
        middle,
        range: Math.max(1, high - low),
      };
    }

    function toDataUrl(mode) {
      const { canvas, ctx } = makeCanvas();

      if (mode === 'original') {
        return canvas.toDataURL('image/png');
      }

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const stats = getGrayStats(data);

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        let gray = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);

        if (mode === 'contrast') {
          gray = ((gray - stats.low) / stats.range) * 255;
          gray = Math.max(0, Math.min(255, gray));
        }

        if (mode === 'binary') {
          gray = ((gray - stats.low) / stats.range) * 255;
          gray = Math.max(0, Math.min(255, gray));
          gray = gray > stats.middle ? 255 : 0;
        }

        if (mode === 'inverted') {
          gray = 255 - gray;
        }

        if (mode === 'soft-inverted') {
          gray = 255 - gray;
          gray = ((gray - stats.low) / stats.range) * 255;
          gray = Math.max(0, Math.min(255, gray));
        }

        data[index] = gray;
        data[index + 1] = gray;
        data[index + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);

      return canvas.toDataURL('image/png');
    }

    return [
      {
        name: 'original',
        image: toDataUrl('original'),
      },
      {
        name: 'contrast',
        image: toDataUrl('contrast'),
      },
      {
        name: 'binary',
        image: toDataUrl('binary'),
      },
      {
        name: 'inverted',
        image: toDataUrl('inverted'),
      },
      {
        name: 'soft-inverted',
        image: toDataUrl('soft-inverted'),
      },
    ];
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
  const [txtFile, setTxtFile] = useState(null);

  const [ocrFile, setOcrFile] = useState(null);
  const [ocrPreview, setOcrPreview] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrBestVariant, setOcrBestVariant] = useState('');

  const parsedEntries = useMemo(() => {
    try {
      return parseLog(raw, name, date, 'preview').length;
    } catch {
      return 0;
    }
  }, [raw, name, date]);

  const ocrParsedEntries = useMemo(() => {
    try {
      return parseLog(ocrText, name, date, 'ocr-preview').length;
    } catch {
      return 0;
    }
  }, [ocrText, name, date]);

  const rawLines = useMemo(() => {
    if (!raw) return 0;

    return raw.split('\n').filter((line) => line.trim()).length;
  }, [raw]);

  const ocrLines = useMemo(() => {
    if (!ocrText) return 0;

    return ocrText.split('\n').filter((line) => line.trim()).length;
  }, [ocrText]);

  useEffect(() => {
    return () => {
      if (ocrPreview) {
        URL.revokeObjectURL(ocrPreview);
      }
    };
  }, [ocrPreview]);

  async function handleTxtUpload(event) {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    const isTxt =
      file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isTxt) {
      alert('Te rog încarcă doar fișiere .txt aici.');
      return;
    }

    try {
      const text = await file.text();

      setTxtFile(file);
      setRaw(text);

      if (!name || name === 'Battle log') {
        setName(file.name.replace(/\.txt$/i, ''));
      }
    } catch (error) {
      console.error(error);
      alert('Nu am putut citi fișierul TXT.');
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) return;

    const lowerName = file.name.toLowerCase();

    const isImage =
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png');

    if (!isImage) {
      setOcrMessage('Te rog încarcă doar imagini .jpg, .jpeg sau .png.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setOcrMessage('Imaginea este prea mare. Încarcă o imagine sub 15 MB.');
      return;
    }

    if (ocrPreview) {
      URL.revokeObjectURL(ocrPreview);
    }

    setOcrFile(file);
    setOcrPreview(URL.createObjectURL(file));
    setOcrText('');
    setOcrMessage('Pregătesc imaginea pentru OCR...');
    setOcrProgress(0);
    setOcrBestVariant('');
    setOcrBusy(true);

    try {
      const imageVariants = await createOcrImageVariants(file);

      setOcrMessage(
        `Citesc textul din imagine... 0/${imageVariants.length} variante analizate`,
      );

      let bestText = '';
      let bestScore = -1;
      let bestVariant = '';

      for (let index = 0; index < imageVariants.length; index += 1) {
        const variant = imageVariants[index];

        setOcrMessage(
          `Citesc textul din imagine... ${index + 1}/${
            imageVariants.length
          } · ${variant.name}`,
        );

        const result = await Tesseract.recognize(variant.image, 'eng', {
          logger: (data) => {
            if (data.status === 'recognizing text') {
              const variantProgress = (index / imageVariants.length) * 100;
              const currentProgress =
                ((data.progress || 0) / imageVariants.length) * 100;

              setOcrProgress(Math.round(variantProgress + currentProgress));
            }
          },
          tessedit_pageseg_mode: '6',
          preserve_interword_spaces: '1',
          tessedit_char_whitelist:
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789[](){}<>:;.,+-_/\\|!?@#$%^&*=\'" ~',
        });

        const candidateText = cleanOcrText(result?.data?.text);

        let candidateParsedEntries = 0;

        try {
          candidateParsedEntries = parseLog(
            candidateText,
            name,
            date,
            `ocr-${variant.name}`,
          ).length;
        } catch {
          candidateParsedEntries = 0;
        }

        const candidateLines = candidateText
          .split('\n')
          .filter((line) => line.trim()).length;

        const candidateLength = candidateText.length;

        const killDeathLikeLines = candidateText
          .split('\n')
          .filter((line) => {
            const lowerLine = line.toLowerCase();

            return (
              lowerLine.includes('kill') ||
              lowerLine.includes('death') ||
              lowerLine.includes('killed') ||
              lowerLine.includes('died') ||
              lowerLine.includes('defeated') ||
              /\d+/.test(lowerLine)
            );
          }).length;

        const score =
          candidateParsedEntries * 10000 +
          killDeathLikeLines * 350 +
          candidateLines * 100 +
          candidateLength;

        if (score > bestScore) {
          bestScore = score;
          bestText = candidateText;
          bestVariant = variant.name;
        }
      }

      setOcrProgress(100);

      const extractedText = bestText;

      if (!extractedText) {
        setOcrMessage(
          'OCR terminat, dar nu am găsit text. Încearcă o imagine mai clară sau decupează doar zona logului.',
        );
        return;
      }

      setOcrText(extractedText);
      setRaw(extractedText);
      setOcrBestVariant(bestVariant);

      if (!name || name === 'Battle log') {
        setName(file.name.replace(/\.(jpg|jpeg|png)$/i, ''));
      }

      setOcrMessage(
        `OCR terminat. Cea mai bună variantă: ${bestVariant}. Verifică textul extras, corectează dacă e nevoie, apoi apasă Save.`,
      );
    } catch (error) {
      console.error(error);
      setOcrMessage(`OCR failed: ${error?.message || 'unknown error'}`);
    } finally {
      setOcrBusy(false);
    }
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
    setOcrBestVariant('');
    setOcrBusy(false);
  }

  function useOcrText() {
    setRaw(ocrText);
    setOcrMessage('Textul OCR a fost pus în Raw Log. Verifică și apasă Save.');
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
              <p className="mb-3 whitespace-pre-line rounded-xl bg-blue-500/10 p-3 text-blue-200">
                {message}
              </p>
            )}

            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <label className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm hover:bg-slate-800">
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleTxtUpload}
                  className="hidden"
                />

                <span className="block font-black text-slate-100">
                  Upload TXT log
                </span>

                <span className="mt-1 block text-xs text-slate-400">
                  Încarcă log normal în format .txt
                </span>

                {txtFile && (
                  <span className="mt-2 block text-xs text-blue-200">
                    {txtFile.name} · {formatBytes(txtFile.size)}
                  </span>
                )}
              </label>

              <label className="cursor-pointer rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-sm hover:bg-blue-500/20">
                <input
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  onChange={handleImageUpload}
                  disabled={ocrBusy}
                  className="hidden"
                />

                <span className="block font-black text-blue-100">
                  Upload JPG/PNG OCR
                </span>

                <span className="mt-1 block text-xs text-slate-400">
                  Încarcă screenshot JPG/PNG, OCR-ul extrage textul
                </span>

                {ocrFile && (
                  <span className="mt-2 block text-xs text-blue-200">
                    {ocrFile.name} · {formatBytes(ocrFile.size)}
                  </span>
                )}
              </label>
            </div>

            <div className="mb-2 flex flex-wrap gap-2 text-xs text-slate-400">
              <span
                className={`rounded-lg px-2 py-1 ${
                  parsedEntries
                    ? 'bg-emerald-500/10 text-emerald-200'
                    : 'bg-slate-900'
                }`}
              >
                Parsed entries: {parsedEntries}
              </span>

              <span className="rounded-lg bg-slate-900 px-2 py-1">
                Lines: {rawLines}
              </span>
            </div>

            <textarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder="Paste your node war log here or upload TXT/JPG/PNG above..."
              className="h-96 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm"
            />
          </Panel>

          {(ocrBusy || ocrMessage || ocrPreview || ocrText) && (
            <Panel>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">OCR Preview</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Verifică textul extras din imagine înainte de Save.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={clearOcr}
                  disabled={ocrBusy}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear OCR
                </button>
              </div>

              {ocrBusy && (
                <div className="mb-3">
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
                <p className="mb-3 whitespace-pre-line rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                  {ocrMessage}
                </p>
              )}

              {ocrPreview && (
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                      Screenshot
                    </p>

                    <img
                      src={ocrPreview}
                      alt="OCR upload preview"
                      className="max-h-80 w-full rounded-2xl border border-slate-800 object-contain"
                    />

                    <div className="mt-3 rounded-xl bg-slate-950 p-3 text-xs text-slate-400">
                      {ocrFile && (
                        <p>
                          <span className="font-bold text-slate-300">
                            File:
                          </span>{' '}
                          {ocrFile.name}
                        </p>
                      )}

                      {ocrFile && (
                        <p>
                          <span className="font-bold text-slate-300">
                            Size:
                          </span>{' '}
                          {formatBytes(ocrFile.size)}
                        </p>
                      )}

                      {ocrBestVariant && (
                        <p>
                          <span className="font-bold text-slate-300">
                            Best OCR:
                          </span>{' '}
                          {ocrBestVariant}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        Text extras
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-lg px-2 py-1 text-xs ${
                            ocrParsedEntries
                              ? 'bg-emerald-500/10 text-emerald-200'
                              : 'bg-amber-500/10 text-amber-200'
                          }`}
                        >
                          Parsed entries: {ocrParsedEntries}
                        </span>

                        <span className="rounded-lg bg-slate-900 px-2 py-1 text-xs text-slate-400">
                          Lines: {ocrLines}
                        </span>
                      </div>
                    </div>

                    <textarea
                      value={ocrText}
                      onChange={(event) => {
                        setOcrText(event.target.value);
                        setRaw(event.target.value);
                      }}
                      placeholder="Textul extras prin OCR apare aici..."
                      className="h-80 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm"
                    />

                    <button
                      type="button"
                      onClick={useOcrText}
                      disabled={!ocrText || ocrBusy}
                      className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Use this OCR text
                    </button>
                  </div>
                </div>
              )}
            </Panel>
          )}
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
