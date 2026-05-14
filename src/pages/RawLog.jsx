import React, { useEffect, useMemo, useState } from 'react';
import Tesseract from 'tesseract.js';

import { Calendar, DeletePopup, Panel } from '../components/UI';
import { dateOf, parseLog, today } from '../lib/logUtils';

const OCR_COLUMNS = ['col1', 'col2', 'col3', 'col4', 'col5', 'col6', 'col7'];

const DEFAULT_CROP = {
  top: 8,
  right: 4,
  bottom: 8,
  left: 4,
};

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
    lower.includes('parsed entries') ||
    lower.includes('table rows')
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
    values: normalizeSevenNumbers(numbers),
    complete: numbers.length >= 7,
    raw: cleaned,
  };
}

function extractOcrTableRows(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseOcrTableLine)
    .filter(Boolean);
}

function formatVerifiedRowsAsTable(rows) {
  const cleanRows = rows.filter((row) => row.familyName.trim());

  if (!cleanRows.length) return '';

  const tableRows = [
    ['Family Name', ...OCR_COLUMNS],
    ...cleanRows.map((row) => [
      row.familyName.trim(),
      ...normalizeSevenNumbers(row.values || []),
    ]),
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

function scoreRows(rows, text) {
  const completeRows = rows.filter((row) =>
    row.values.every((value) => String(value || '').trim() !== ''),
  ).length;

  const numericCells = rows.reduce(
    (sum, row) =>
      sum + row.values.filter((value) => String(value || '').trim()).length,
    0,
  );

  return {
    completeRows,
    numericCells,
    score:
      completeRows * 50000 +
      rows.length * 20000 +
      numericCells * 1500 +
      String(text || '').length,
  };
}

function mergeRowsFromCandidates(candidates) {
  const byName = new Map();

  candidates.forEach((candidate) => {
    candidate.rows.forEach((row) => {
      const key = row.familyName.toLowerCase();
      const current = byName.get(key);
      const score =
        row.values.filter((value) => String(value || '').trim()).length * 100 +
        (row.complete ? 1000 : 0);

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

async function loadImageFromFile(file) {
  const imageUrl = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function getCropBox(image, crop) {
  const left = Math.round((image.width * crop.left) / 100);
  const top = Math.round((image.height * crop.top) / 100);
  const right = Math.round(image.width - (image.width * crop.right) / 100);
  const bottom = Math.round(image.height - (image.height * crop.bottom) / 100);

  return {
    x: Math.max(0, Math.min(left, image.width - 1)),
    y: Math.max(0, Math.min(top, image.height - 1)),
    width: Math.max(1, Math.min(right - left, image.width)),
    height: Math.max(1, Math.min(bottom - top, image.height)),
  };
}

async function createCropPreview(file, crop) {
  const image = await loadImageFromFile(file);
  const box = getCropBox(image, crop);

  const canvas = document.createElement('canvas');
  canvas.width = box.width;
  canvas.height = box.height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    image,
    box.x,
    box.y,
    box.width,
    box.height,
    0,
    0,
    box.width,
    box.height,
  );

  return canvas.toDataURL('image/png');
}

async function createOcrImageVariants(file, crop) {
  const image = await loadImageFromFile(file);
  const box = getCropBox(image, crop);

  const minWidth = 4200;
  const maxWidth = 7600;

  let scale = 1;

  if (box.width < minWidth) {
    scale = minWidth / box.width;
  }

  if (box.width * scale > maxWidth) {
    scale = maxWidth / box.width;
  }

  const padding = 180;
  const width = Math.round(box.width * scale);
  const height = Math.round(box.height * scale);

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

    ctx.drawImage(
      image,
      box.x,
      box.y,
      box.width,
      box.height,
      padding,
      padding,
      width,
      height,
    );

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
      name: 'original-crop',
      image: toDataUrl('original'),
    },
    {
      name: 'contrast-crop',
      image: toDataUrl('contrast'),
    },
    {
      name: 'contrast-sharp-crop',
      image: toDataUrl('contrast-sharp'),
    },
    {
      name: 'bright-contrast-sharp-crop',
      image: toDataUrl('bright-contrast-sharp'),
    },
    {
      name: 'dark-contrast-sharp-crop',
      image: toDataUrl('dark-contrast-sharp'),
    },
    {
      name: 'binary-crop',
      image: toDataUrl('contrast-binary'),
    },
    {
      name: 'binary-high-threshold-crop',
      image: toDataUrl('contrast-binary-high-threshold'),
    },
    {
      name: 'invert-crop',
      image: toDataUrl('invert'),
    },
    {
      name: 'invert-contrast-sharp-crop',
      image: toDataUrl('invert-contrast-sharp'),
    },
  ];
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
  const [cropPreview, setCropPreview] = useState('');
  const [crop, setCrop] = useState(DEFAULT_CROP);

  const [ocrText, setOcrText] = useState('');
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrMessage, setOcrMessage] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrBestVariant, setOcrBestVariant] = useState('');
  const [ocrCandidates, setOcrCandidates] = useState([]);
  const [verifiedRows, setVerifiedRows] = useState([]);

  const parsedEntries = useMemo(() => {
    try {
      return parseLog(raw, name, date, 'preview').length;
    } catch {
      return 0;
    }
  }, [raw, name, date]);

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

  useEffect(() => {
    let cancelled = false;

    async function refreshCropPreview() {
      if (!ocrFile) {
        setCropPreview('');
        return;
      }

      try {
        const preview = await createCropPreview(ocrFile, crop);

        if (!cancelled) {
          setCropPreview(preview);
        }
      } catch (error) {
        console.error('Crop preview failed:', error);
      }
    }

    refreshCropPreview();

    return () => {
      cancelled = true;
    };
  }, [ocrFile, crop]);

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
    setCrop(DEFAULT_CROP);
    setOcrText('');
    setOcrRawText('');
    setOcrMessage(
      'Imagine încărcată. Ajustează crop-ul ca să prindă doar tabelul, apoi apasă Run OCR on crop.',
    );
    setOcrProgress(0);
    setOcrBestVariant('');
    setOcrCandidates([]);
    setVerifiedRows([]);

    if (!name || name === 'Battle log') {
      setName(file.name.replace(/\.(jpg|jpeg|png)$/i, ''));
    }
  }

  async function runOcrOnCrop() {
    if (!ocrFile) {
      setOcrMessage('Încarcă mai întâi o imagine JPG/PNG.');
      return;
    }

    setOcrBusy(true);
    setOcrText('');
    setOcrRawText('');
    setOcrProgress(0);
    setOcrBestVariant('');
    setOcrCandidates([]);
    setVerifiedRows([]);
    setOcrMessage('Pregătesc zona decupată pentru OCR...');

    try {
      const imageVariants = await createOcrImageVariants(ocrFile, crop);
      const ocrConfigs = getOcrConfigs();
      const totalRuns = imageVariants.length * ocrConfigs.length;

      let bestRows = [];
      let bestRawText = '';
      let bestScore = -1;
      let bestVariant = '';
      const candidates = [];

      for (
        let variantIndex = 0;
        variantIndex < imageVariants.length;
        variantIndex += 1
      ) {
        const variant = imageVariants[variantIndex];

        for (
          let configIndex = 0;
          configIndex < ocrConfigs.length;
          configIndex += 1
        ) {
          const config = ocrConfigs[configIndex];
          const runIndex = variantIndex * ocrConfigs.length + configIndex;

          setOcrMessage(
            `OCR pe crop... ${runIndex + 1}/${totalRuns} · ${
              variant.name
            } · ${config.name}`,
          );

          const result = await Tesseract.recognize(variant.image, 'eng', {
            logger: (data) => {
              if (data.status === 'recognizing text') {
                const runProgress = (runIndex / totalRuns) * 100;
                const currentProgress =
                  ((data.progress || 0) / totalRuns) * 100;

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

          const rawCandidateText = cleanOcrText(result?.data?.text);
          const rows = extractOcrTableRows(rawCandidateText);
          const rowStats = scoreRows(rows, rawCandidateText);
          const candidateText = formatVerifiedRowsAsTable(rows);

          candidates.push({
            variant: `${variant.name} · ${config.name}`,
            text: candidateText || rawCandidateText,
            rawText: rawCandidateText,
            rows,
            score: rowStats.score,
            lines: rawCandidateText
              .split('\n')
              .filter((line) => line.trim()).length,
            completeRows: rowStats.completeRows,
            numericCells: rowStats.numericCells,
            tableRows: rows.length,
          });

          if (rowStats.score > bestScore) {
            bestScore = rowStats.score;
            bestRows = rows;
            bestRawText = rawCandidateText;
            bestVariant = `${variant.name} · ${config.name}`;
          }
        }
      }

      const sortedCandidates = candidates.sort((a, b) => b.score - a.score);
      const mergedRows = mergeRowsFromCandidates(sortedCandidates);
      const finalRows = mergedRows.length >= bestRows.length ? mergedRows : bestRows;
      const finalTable = formatVerifiedRowsAsTable(finalRows);

      setOcrCandidates(sortedCandidates.slice(0, 8));
      setOcrProgress(100);

      if (!finalRows.length) {
        setOcrMessage(
          'OCR terminat, dar nu am găsit rânduri de tabel. Ajustează crop-ul mai strâns pe tabel și încearcă din nou.',
        );
        setOcrRawText(bestRawText);
        return;
      }

      setVerifiedRows(finalRows);
      setOcrText(finalTable);
      setOcrRawText(bestRawText);
      setRaw(finalTable);
      setOcrBestVariant(
        mergedRows.length >= bestRows.length
          ? `${bestVariant} + merged candidates`
          : bestVariant,
      );

      setOcrMessage(
        'OCR terminat. Verifică tabelul editabil, corectează valorile greșite, apoi apasă Use verified table.',
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
    setCropPreview('');
    setCrop(DEFAULT_CROP);
    setOcrText('');
    setOcrRawText('');
    setOcrMessage('');
    setOcrProgress(0);
    setOcrBestVariant('');
    setOcrCandidates([]);
    setVerifiedRows([]);
    setOcrBusy(false);
  }

  function updateVerifiedRow(rowIndex, field, value) {
    setVerifiedRows((currentRows) =>
      currentRows.map((row, index) => {
        if (index !== rowIndex) return row;

        if (field === 'familyName') {
          return {
            ...row,
            familyName: value,
          };
        }

        const valueIndex = Number(field);
        const nextValues = normalizeSevenNumbers(row.values || []);

        nextValues[valueIndex] = value.replace(/\D/g, '');

        return {
          ...row,
          values: nextValues,
        };
      }),
    );
  }

  function addVerifiedRow() {
    setVerifiedRows((currentRows) => [
      ...currentRows,
      {
        familyName: '',
        values: ['', '', '', '', '', '', ''],
        complete: false,
        raw: '',
      },
    ]);
  }

  function deleteVerifiedRow(rowIndex) {
    setVerifiedRows((currentRows) =>
      currentRows.filter((_, index) => index !== rowIndex),
    );
  }

  function useVerifiedTable() {
    const table = formatVerifiedRowsAsTable(verifiedRows);

    if (!table) {
      setOcrMessage('Nu există rânduri verificate de folosit.');
      return;
    }

    setOcrText(table);
    setRaw(table);
    setOcrMessage(
      'Tabelul verificat a fost pus în Raw Log. Pentru salvare reală în DB ca tabel, facem etapa 2.',
    );
  }

  function useCandidate(candidate) {
    const rows = candidate.rows || [];
    const table = formatVerifiedRowsAsTable(rows);

    setVerifiedRows(rows);
    setOcrText(table || candidate.text);
    setOcrRawText(candidate.rawText || '');
    setRaw(table || candidate.text);
    setOcrBestVariant(candidate.variant);
    setOcrMessage(
      `Ai selectat varianta OCR: ${candidate.variant}. Verifică tabelul editabil.`,
    );
  }

  const verifiedTableText = useMemo(
    () => formatVerifiedRowsAsTable(verifiedRows),
    [verifiedRows],
  );

  const verifiedCompleteRows = useMemo(
    () =>
      verifiedRows.filter((row) =>
        normalizeSevenNumbers(row.values || []).every((value) =>
          String(value || '').trim(),
        ),
      ).length,
    [verifiedRows],
  );

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
                  Upload JPG/PNG table
                </span>

                <span className="mt-1 block text-xs text-slate-400">
                  Încarcă screenshot, decupează tabelul, apoi verifică manual.
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

              {verifiedRows.length > 0 && (
                <span className="rounded-lg bg-blue-500/10 px-2 py-1 text-blue-200">
                  Verified table rows: {verifiedRows.length}
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

          {ocrFile && (
            <Panel>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">
                    Screenshot Table Import
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Ajustează crop-ul ca să rămână doar tabelul. Apoi rulează
                    OCR și verifică manual valorile.
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

              {ocrMessage && (
                <p className="mb-3 whitespace-pre-line rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                  {ocrMessage}
                </p>
              )}

              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Original
                  </p>

                  <img
                    src={ocrPreview}
                    alt="OCR upload preview"
                    className="max-h-80 w-full rounded-2xl border border-slate-800 object-contain"
                  />

                  {cropPreview && (
                    <>
                      <p className="mb-2 mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                        Crop preview
                      </p>

                      <img
                        src={cropPreview}
                        alt="OCR crop preview"
                        className="max-h-80 w-full rounded-2xl border border-blue-500/40 object-contain"
                      />
                    </>
                  )}
                </div>

                <div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      ['top', 'Top'],
                      ['bottom', 'Bottom'],
                      ['left', 'Left'],
                      ['right', 'Right'],
                    ].map(([key, label]) => (
                      <label key={key} className="block">
                        <div className="mb-1 flex justify-between text-xs font-bold text-slate-400">
                          <span>{label}</span>
                          <span>{crop[key]}%</span>
                        </div>

                        <input
                          type="range"
                          min="0"
                          max="45"
                          value={crop[key]}
                          onChange={(event) =>
                            setCrop((currentCrop) => ({
                              ...currentCrop,
                              [key]: Number(event.target.value),
                            }))
                          }
                          disabled={ocrBusy}
                          className="w-full"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCrop(DEFAULT_CROP)}
                      disabled={ocrBusy}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reset crop
                    </button>

                    <button
                      type="button"
                      onClick={runOcrOnCrop}
                      disabled={ocrBusy}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Run OCR on crop
                    </button>
                  </div>

                  {ocrBusy && (
                    <div className="mt-4">
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

                  {ocrBestVariant && (
                    <div className="mt-4 rounded-xl bg-slate-950 p-3 text-xs text-slate-400">
                      <p>
                        <span className="font-bold text-slate-300">
                          Best OCR:
                        </span>{' '}
                        {ocrBestVariant}
                      </p>
                      <p>
                        <span className="font-bold text-slate-300">
                          Rows:
                        </span>{' '}
                        {verifiedRows.length}
                      </p>
                      <p>
                        <span className="font-bold text-slate-300">
                          Complete rows:
                        </span>{' '}
                        {verifiedCompleteRows}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          )}

          {verifiedRows.length > 0 && (
            <Panel>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Verified OCR Table</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Corectează aici valorile greșite. Aceasta este varianta care
                    ajunge în Raw Log când apeși Use verified table.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addVerifiedRow}
                    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900"
                  >
                    Add row
                  </button>

                  <button
                    type="button"
                    onClick={useVerifiedTable}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500"
                  >
                    Use verified table
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="min-w-44 border-b border-slate-800 p-2 text-left">
                        Family Name
                      </th>

                      {OCR_COLUMNS.map((column) => (
                        <th
                          key={column}
                          className="min-w-20 border-b border-slate-800 p-2 text-left"
                        >
                          {column}
                        </th>
                      ))}

                      <th className="border-b border-slate-800 p-2 text-left">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {verifiedRows.map((row, rowIndex) => {
                      const values = normalizeSevenNumbers(row.values || []);
                      const complete = values.every((value) =>
                        String(value || '').trim(),
                      );

                      return (
                        <tr
                          key={`${row.familyName}-${rowIndex}`}
                          className={
                            complete
                              ? 'bg-slate-900/40'
                              : 'bg-amber-500/10'
                          }
                        >
                          <td className="border-b border-slate-800 p-2">
                            <input
                              value={row.familyName}
                              onChange={(event) =>
                                updateVerifiedRow(
                                  rowIndex,
                                  'familyName',
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono"
                            />
                          </td>

                          {values.map((value, valueIndex) => (
                            <td
                              key={`${row.familyName}-${valueIndex}`}
                              className="border-b border-slate-800 p-2"
                            >
                              <input
                                value={value}
                                onChange={(event) =>
                                  updateVerifiedRow(
                                    rowIndex,
                                    String(valueIndex),
                                    event.target.value,
                                  )
                                }
                                className="w-20 rounded-lg border border-slate-700 bg-slate-950 p-2 font-mono"
                                inputMode="numeric"
                              />
                            </td>
                          ))}

                          <td className="border-b border-slate-800 p-2">
                            <button
                              type="button"
                              onClick={() => deleteVerifiedRow(rowIndex)}
                              className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold hover:bg-rose-500"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Table text preview
                </p>

                <textarea
                  value={verifiedTableText}
                  readOnly
                  className="h-56 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm"
                />
              </div>
            </Panel>
          )}

          {ocrCandidates.length > 1 && (
            <Panel>
              <h2 className="mb-4 text-2xl font-black">OCR Variants</h2>

              <div className="grid gap-2">
                {ocrCandidates.map((candidate) => {
                  const active = candidate.variant === ocrBestVariant;

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
                        <span className="font-black">{candidate.variant}</span>

                        <span className="text-slate-400">
                          table {candidate.tableRows || 0} · complete{' '}
                          {candidate.completeRows || 0} · numbers{' '}
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
            </Panel>
          )}

          {ocrRawText && (
            <Panel>
              <h2 className="mb-4 text-2xl font-black">Raw OCR Debug</h2>

              <textarea
                value={ocrRawText}
                onChange={(event) => setOcrRawText(event.target.value)}
                className="h-72 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm"
              />
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
