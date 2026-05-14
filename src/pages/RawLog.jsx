import React, { useEffect, useMemo, useState } from 'react';
import Tesseract from 'tesseract.js';

import { Calendar, DeletePopup, Panel } from '../components/UI';
import { dateOf, parseLog, today } from '../lib/logUtils';

const OCR_COLUMNS = ['col1', 'col2', 'col3', 'col4', 'col5', 'col6', 'col7'];

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
    .replace(/\u00a0/g, ' ')
    .replace(/[¦]/g, '|')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeOcrNumberToken(token) {
  const fixed = String(token || '')
    .replace(/[OoQD]/g, '0')
    .replace(/[Il|!]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8')
    .replace(/[Zz]/g, '2')
    .replace(/[Gg]/g, '6')
    .replace(/[Tt]/g, '7');

  return fixed.replace(/\D/g, '');
}

function isLikelyNumberToken(token) {
  return Boolean(normalizeOcrNumberToken(token));
}

function isBadHeaderLine(line) {
  const lower = String(line || '').toLowerCase();

  return (
    lower.includes('family name') ||
    lower.includes('view results') ||
    lower.includes('node war') ||
    lower.includes('occupation') ||
    lower.includes('failed') ||
    lower.includes('serendia') ||
    lower.includes('screenshot') ||
    lower.includes('ocr progress') ||
    lower.includes('upload') ||
    lower.includes('battle log') ||
    lower.includes('text extras') ||
    lower.includes('parsed entries')
  );
}

function normalizeFamilyName(name) {
  return String(name || '')
    .replace(/[^A-Za-z0-9_ -]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSevenNumbers(numbers) {
  const clean = numbers.map(String).filter((item) => item !== '');

  if (clean.length >= 7) {
    return [...clean.slice(0, 6), clean.slice(6).join('')].slice(0, 7);
  }

  return [...clean, ...Array.from({ length: 7 - clean.length }, () => '')];
}

function parseOcrTableLine(line) {
  const cleaned = String(line || '')
    .replace(/[|]/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[~`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || isBadHeaderLine(cleaned)) return null;

  const tokens = cleaned.split(' ');
  const firstNumberIndex = tokens.findIndex(isLikelyNumberToken);

  if (firstNumberIndex <= 0) return null;

  const familyName = normalizeFamilyName(
    tokens.slice(0, firstNumberIndex).join(' '),
  );

  if (!familyName || familyName.length < 2) return null;

  const rawNumberTokens = tokens.slice(firstNumberIndex);
  const numbers = rawNumberTokens
    .map(normalizeOcrNumberToken)
    .filter(Boolean);

  if (numbers.length < 2) return null;

  return {
    familyName,
    numbers: normalizeSevenNumbers(numbers),
    complete: numbers.length >= 7,
    raw: cleaned,
  };
}

function formatOcrRowsAsResultTable(rows) {
  if (!rows.length) return '';

  const tableRows = [
    ['Family Name', ...OCR_COLUMNS],
    ...rows.map((row) => [row.familyName, ...row.numbers]),
  ];

  const widths = tableRows[0].map((_, columnIndex) =>
    Math.max(
      ...tableRows.map((row) => String(row[columnIndex] || '').length),
    ),
  );

  return tableRows
    .map((row) =>
      row
        .map((cell, columnIndex) =>
          String(cell || '').padEnd(widths[columnIndex]),
        )
        .join(' | ')
        .trimEnd(),
    )
    .join('\n');
}

function extractOcrTableRows(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map(parseOcrTableLine).filter(Boolean);
}

function formatOcrAsResultTable(text) {
  return formatOcrRowsAsResultTable(extractOcrTableRows(text));
}

function countOcrTableRows(text) {
  return extractOcrTableRows(text).length;
}

function scoreOcrText(text) {
  const rows = extractOcrTableRows(text);
  const completeRows = rows.filter((row) => row.complete).length;
  const incompleteRows = rows.length - completeRows;
  const numericCells = rows.reduce(
    (sum, row) => sum + row.numbers.filter(Boolean).length,
    0,
  );

  return {
    rows,
    completeRows,
    incompleteRows,
    numericCells,
    score:
      completeRows * 35000 +
      rows.length * 15000 +
      numericCells * 1200 +
      String(text || '').length,
  };
}

function rowScore(row) {
  return (
    row.numbers.filter(Boolean).length * 100 +
    (row.complete ? 1200 : 0) +
    row.familyName.length
  );
}

function mergeRowsFromCandidates(candidates) {
  const byName = new Map();

  candidates.forEach((candidate) => {
    candidate.rows.forEach((row) => {
      const key = row.familyName.toLowerCase();
      const current = byName.get(key);
      const score = rowScore(row);

      if (!current || score > current.score) {
        byName.set(key, {
          score,
          row,
        });
      }
    });
  });

  return [...byName.values()].map((item) => item.row);
}

function wordsToLines(words) {
  if (!Array.isArray(words) || !words.length) return '';

  const goodWords = words
    .map((word) => {
      const text = String(word?.text || '').trim();

      if (!text) return null;

      const bbox = word?.bbox || {};
      const x0 = Number(bbox.x0 ?? bbox.left ?? 0);
      const x1 = Number(bbox.x1 ?? bbox.right ?? x0);
      const y0 = Number(bbox.y0 ?? bbox.top ?? 0);
      const y1 = Number(bbox.y1 ?? bbox.bottom ?? y0);
      const confidence = Number(word?.confidence ?? 0);

      if (confidence < 15) return null;

      return {
        text,
        x0,
        x1,
        y0,
        y1,
        midY: (y0 + y1) / 2,
        height: Math.max(1, y1 - y0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.midY - b.midY || a.x0 - b.x0);

  if (!goodWords.length) return '';

  const medianHeight = [...goodWords]
    .map((word) => word.height)
    .sort((a, b) => a - b)[Math.floor(goodWords.length / 2)] || 18;

  const rowTolerance = Math.max(10, medianHeight * 0.75);
  const rows = [];

  goodWords.forEach((word) => {
    let targetRow = null;

    for (const row of rows) {
      if (Math.abs(row.midY - word.midY) <= rowTolerance) {
        targetRow = row;
        break;
      }
    }

    if (!targetRow) {
      targetRow = {
        midY: word.midY,
        words: [],
      };
      rows.push(targetRow);
    }

    targetRow.words.push(word);
    targetRow.midY =
      targetRow.words.reduce((sum, item) => sum + item.midY, 0) /
      targetRow.words.length;
  });

  return rows
    .sort((a, b) => a.midY - b.midY)
    .map((row) =>
      row.words
        .sort((a, b) => a.x0 - b.x0)
        .map((word) => word.text)
        .join(' '),
    )
    .join('\n');
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

    const minWidth = 4800;
    const maxWidth = 8200;

    let scale = 1;

    if (image.width < minWidth) {
      scale = minWidth / image.width;
    }

    if (image.width * scale > maxWidth) {
      scale = maxWidth / image.width;
    }

    const padding = 220;
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);

    function makeCanvas() {
      const canvas = document.createElement('canvas');

      canvas.width = width + padding * 2;
      canvas.height = height + padding * 2;

      const ctx = canvas.getContext('2d', {
        willReadFrequently: true,
      });

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, padding, padding, width, height);

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

      const low = values[Math.floor(values.length * 0.02)] || 0;
      const high = values[Math.floor(values.length * 0.98)] || 255;
      const mid = values[Math.floor(values.length * 0.5)] || 128;

      return {
        low,
        high,
        mid,
        range: Math.max(1, high - low),
      };
    }

    function sharpen(data, canvasWidth, canvasHeight, amount = 1) {
      const copy = new Uint8ClampedArray(data);

      const kernel = [
        0,
        -amount,
        0,
        -amount,
        1 + 4 * amount,
        -amount,
        0,
        -amount,
        0,
      ];

      for (let y = 1; y < canvasHeight - 1; y += 1) {
        for (let x = 1; x < canvasWidth - 1; x += 1) {
          for (let channel = 0; channel < 3; channel += 1) {
            let value = 0;
            let kernelIndex = 0;

            for (let ky = -1; ky <= 1; ky += 1) {
              for (let kx = -1; kx <= 1; kx += 1) {
                const pixelIndex =
                  ((y + ky) * canvasWidth + (x + kx)) * 4 + channel;

                value += copy[pixelIndex] * kernel[kernelIndex];
                kernelIndex += 1;
              }
            }

            const targetIndex = (y * canvasWidth + x) * 4 + channel;
            data[targetIndex] = Math.max(0, Math.min(255, value));
          }
        }
      }
    }

    function toDataUrl(mode) {
      const { canvas, ctx } = makeCanvas();

      if (mode === 'original') {
        return canvas.toDataURL('image/png');
      }

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const stats = getGrayStats(data);

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        let gray = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);

        if (mode.includes('contrast')) {
          gray = ((gray - stats.low) / stats.range) * 255;
          gray = Math.max(0, Math.min(255, gray));
        }

        if (mode.includes('bright')) {
          gray = Math.min(255, gray * 1.35 + 25);
        }

        if (mode.includes('dark')) {
          gray = Math.max(0, gray * 0.78 - 18);
        }

        if (mode.includes('binary')) {
          const threshold = mode.includes('high-threshold')
            ? stats.mid + 22
            : stats.mid;

          gray = gray > threshold ? 255 : 0;
        }

        if (mode.includes('invert')) {
          gray = 255 - gray;
        }

        data[index] = gray;
        data[index + 1] = gray;
        data[index + 2] = gray;
      }

      if (mode.includes('sharp')) {
        sharpen(data, canvas.width, canvas.height, 0.75);
      }

      ctx.putImageData(imageData, 0, 0);

      return canvas.toDataURL('image/png');
    }

    return [
      {
        name: 'original-large',
        image: toDataUrl('original'),
      },
      {
        name: 'contrast-large',
        image: toDataUrl('contrast'),
      },
      {
        name: 'contrast-sharp',
        image: toDataUrl('contrast-sharp'),
      },
      {
        name: 'bright-contrast-sharp',
        image: toDataUrl('bright-contrast-sharp'),
      },
      {
        name: 'dark-contrast-sharp',
        image: toDataUrl('dark-contrast-sharp'),
      },
      {
        name: 'binary',
        image: toDataUrl('contrast-binary'),
      },
      {
        name: 'binary-high-threshold',
        image: toDataUrl('contrast-binary-high-threshold'),
      },
      {
        name: 'invert',
        image: toDataUrl('invert'),
      },
      {
        name: 'invert-contrast-sharp',
        image: toDataUrl('invert-contrast-sharp'),
      },
    ];
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function getOcrConfigs() {
  return [
    {
      name: 'block',
      options: {
        tessedit_pageseg_mode: '6',
      },
    },
    {
      name: 'sparse',
      options: {
        tessedit_pageseg_mode: '11',
      },
    },
    {
      name: 'auto',
      options: {
        tessedit_pageseg_mode: '3',
      },
    },
  ];
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
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrBestVariant, setOcrBestVariant] = useState('');
  const [ocrCandidates, setOcrCandidates] = useState([]);

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

  const ocrTableRows = useMemo(() => countOcrTableRows(ocrText), [ocrText]);

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

    if (file.size > 18 * 1024 * 1024) {
      setOcrMessage('Imaginea este prea mare. Încarcă o imagine sub 18 MB.');
      return;
    }

    if (ocrPreview) {
      URL.revokeObjectURL(ocrPreview);
    }

    setOcrFile(file);
    setOcrPreview(URL.createObjectURL(file));
    setOcrText('');
    setOcrRawText('');
    setOcrMessage('Pregătesc imaginea pentru OCR...');
    setOcrProgress(0);
    setOcrBestVariant('');
    setOcrCandidates([]);
    setOcrBusy(true);

    try {
      const imageVariants = await createOcrImageVariants(file);
      const ocrConfigs = getOcrConfigs();
      const totalRuns = imageVariants.length * ocrConfigs.length;

      setOcrMessage(
        `Citesc textul din imagine... 0/${totalRuns} variante analizate`,
      );

      let bestText = '';
      let bestRawText = '';
      let bestScore = -1;
      let bestVariant = '';
      const candidates = [];

      for (let variantIndex = 0; variantIndex < imageVariants.length; variantIndex += 1) {
        const variant = imageVariants[variantIndex];

        for (let configIndex = 0; configIndex < ocrConfigs.length; configIndex += 1) {
          const config = ocrConfigs[configIndex];
          const runIndex = variantIndex * ocrConfigs.length + configIndex;

          setOcrMessage(
            `Citesc textul din imagine... ${runIndex + 1}/${totalRuns} · ${variant.name} · ${config.name}`,
          );

          const result = await Tesseract.recognize(variant.image, 'eng', {
            logger: (data) => {
              if (data.status === 'recognizing text') {
                const runProgress = (runIndex / totalRuns) * 100;
                const currentProgress = ((data.progress || 0) / totalRuns) * 100;

                setOcrProgress(Math.round(runProgress + currentProgress));
              }
            },
            ...config.options,
            tessedit_ocr_engine_mode: '1',
            preserve_interword_spaces: '1',
            user_defined_dpi: '300',
            classify_bln_numeric_mode: '1',
            textord_heavy_nr: '1',
            tessedit_char_whitelist:
              'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789[](){}<>:;.,+-_/\\|!?@#$%^&*=\'" ~',
          });

          const rawTextFromLines = cleanOcrText(result?.data?.text);
          const rawTextFromWords = cleanOcrText(wordsToLines(result?.data?.words));
          const combinedRawText = cleanOcrText(
            [rawTextFromLines, rawTextFromWords].filter(Boolean).join('\n'),
          );

          const candidateScore = scoreOcrText(combinedRawText);
          const tableCandidateText = formatOcrRowsAsResultTable(
            candidateScore.rows,
          );
          const candidateText = tableCandidateText || combinedRawText;

          let candidateParsedEntries = 0;

          try {
            candidateParsedEntries = parseLog(
              candidateText,
              name,
              date,
              `ocr-${variant.name}-${config.name}`,
            ).length;
          } catch {
            candidateParsedEntries = 0;
          }

          const candidateLines = candidateText
            .split('\n')
            .filter((line) => line.trim()).length;

          const candidateScoreValue =
            candidateScore.score + candidateParsedEntries * 10000;

          candidates.push({
            variant: `${variant.name} · ${config.name}`,
            text: candidateText,
            rawText: combinedRawText,
            rows: candidateScore.rows,
            score: candidateScoreValue,
            parsedEntries: candidateParsedEntries,
            lines: candidateLines,
            completeRows: candidateScore.completeRows,
            incompleteRows: candidateScore.incompleteRows,
            numericCells: candidateScore.numericCells,
            tableRows: candidateScore.rows.length,
          });

          if (candidateScoreValue > bestScore) {
            bestScore = candidateScoreValue;
            bestText = candidateText;
            bestRawText = combinedRawText;
            bestVariant = `${variant.name} · ${config.name}`;
          }
        }
      }

      const mergedRows = mergeRowsFromCandidates(candidates);
      const mergedTable = formatOcrRowsAsResultTable(mergedRows);

      if (mergedTable && mergedRows.length >= countOcrTableRows(bestText)) {
        bestText = mergedTable;
        bestVariant = `${bestVariant} + merged rows`;
      }

      const sortedCandidates = candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setOcrCandidates(sortedCandidates);
      setOcrProgress(100);

      if (!bestText) {
        setOcrMessage(
          'OCR terminat, dar nu am găsit text. Încearcă o imagine mai clară sau decupează doar zona tabelului.',
        );
        return;
      }

      setOcrText(bestText);
      setOcrRawText(bestRawText);
      setRaw(bestText);
      setOcrBestVariant(bestVariant);

      if (!name || name === 'Battle log') {
        setName(file.name.replace(/\.(jpg|jpeg|png)$/i, ''));
      }

      setOcrMessage(
        `OCR terminat. Cea mai bună variantă: ${bestVariant}. Am folosit și reconstrucție pe rânduri după poziția cuvintelor. Verifică tabelul înainte de Save.`,
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
    setOcrRawText('');
    setOcrMessage('');
    setOcrProgress(0);
    setOcrBestVariant('');
    setOcrCandidates([]);
    setOcrBusy(false);
  }

  function useOcrText() {
    setRaw(ocrText);
    setOcrMessage('Textul OCR a fost pus în Raw Log. Verifică și apasă Save.');
  }

  function useCandidate(candidate) {
    const formatted = formatOcrRowsAsResultTable(candidate.rows || []);
    const text = formatted || candidate.text;

    setOcrText(text);
    setOcrRawText(candidate.rawText || '');
    setRaw(text);
    setOcrBestVariant(candidate.variant);
    setOcrMessage(
      `Ai selectat varianta OCR: ${candidate.variant}. Verifică tabelul și apasă Save.`,
    );
  }

  function reformatCurrentOcrText() {
    const formatted = formatOcrAsResultTable(ocrRawText || ocrText);

    if (!formatted) {
      setOcrMessage(
        'Nu am putut reformata textul OCR ca tabel. Verifică imaginea sau editează manual textul extras.',
      );
      return;
    }

    setOcrText(formatted);
    setRaw(formatted);
    setOcrMessage('Textul OCR a fost reformatat ca tabel.');
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
                  OCR high accuracy: text + word position rows.
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

              {ocrTableRows > 0 && (
                <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-blue-200">
                  OCR table rows: {ocrTableRows}
                </span>
              )}
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
                    Format rezultat: Family Name | col1 | col2 | col3 | col4 |
                    col5 | col6 | col7.
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

                      {ocrTableRows > 0 && (
                        <p>
                          <span className="font-bold text-slate-300">
                            Table rows:
                          </span>{' '}
                          {ocrTableRows}
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

                        <span
                          className={`rounded-lg px-2 py-1 text-xs ${
                            ocrTableRows
                              ? 'bg-blue-500/10 text-blue-200'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          Table rows: {ocrTableRows}
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

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={useOcrText}
                        disabled={!ocrText || ocrBusy}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Use this OCR text
                      </button>

                      <button
                        type="button"
                        onClick={reformatCurrentOcrText}
                        disabled={!ocrText || ocrBusy}
                        className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-100 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reformat as table
                      </button>
                    </div>

                    {ocrCandidates.length > 1 && (
                      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-3">
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                          OCR variants
                        </p>

                        <div className="grid gap-2">
                          {ocrCandidates.map((candidate) => {
                            const active =
                              candidate.variant === ocrBestVariant &&
                              candidate.text === ocrText;

                            return (
                              <button
                                key={candidate.variant}
                                type="button"
                                onClick={() => useCandidate(candidate)}
                                className={`rounded-xl border p-3 text-left text-xs hover:bg-slate-900 ${
                                  active
                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-100'
                                    : 'border-slate-800 bg-slate-900/60 text-slate-300'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-black">
                                    {candidate.variant}
                                  </span>

                                  <span className="text-slate-400">
                                    table {candidate.tableRows || 0} · complete{' '}
                                    {candidate.completeRows || 0} · incomplete{' '}
                                    {candidate.incompleteRows || 0} · numbers{' '}
                                    {candidate.numericCells || 0}
                                  </span>
                                </div>

                                <pre className="mt-2 max-h-20 overflow-hidden whitespace-pre-wrap font-mono text-[11px] text-slate-400">
                                  {candidate.text.slice(0, 260)}
                                </pre>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
