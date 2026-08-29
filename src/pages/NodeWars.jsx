import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Castle,
  ChevronDown,
  Crosshair,
  Gauge,
  Hand,
  Search,
  Shield,
  Skull,
  Swords,
  Users,
  Zap,
} from 'lucide-react';

import { Panel } from '../components/UI';
import { buildNodeWarRow, scrollCls } from '../lib/logUtils';


const NODE_WARS_PANEL_CSS = `
  #root .adversary-content .nodewars-page-shell,
  #root .adversary-content .nodewars-page-shell:hover {
    --nw-gold: #f4bf16;
    --nw-gold-bright: #ffd94a;
    --nw-gold-rgb: 244, 191, 22;
    --nw-panel: rgba(5, 7, 8, 0.88);
    --nw-panel-deep: rgba(2, 3, 4, 0.94);
    --nw-line: rgba(244, 191, 22, 0.34);
    --nw-line-strong: rgba(244, 191, 22, 0.68);
    --nw-text-muted: #8d8a78;
    background-color: transparent !important;
    background-image: none !important;
    border-color: transparent !important;
    box-shadow: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    filter: none !important;
  }

  #root .adversary-content .nodewars-page-shell::before,
  #root .adversary-content .nodewars-page-shell::after {
    display: none !important;
  }

  /* Shared black / gold techno panel surface. */
  #root .adversary-content .nodewars-guild-panel {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    background-color: var(--nw-panel) !important;
    background-image:
      radial-gradient(circle at 10% -35%, rgba(var(--nw-gold-rgb), 0.13), transparent 42%),
      radial-gradient(circle at 88% 130%, rgba(var(--nw-gold-rgb), 0.055), transparent 42%),
      linear-gradient(180deg, rgba(15, 14, 9, 0.94), rgba(3, 5, 6, 0.93)) !important;
    border: 1px solid var(--nw-line) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 226, 105, 0.045),
      inset 0 0 26px rgba(var(--nw-gold-rgb), 0.025),
      0 0 0 1px rgba(0, 0, 0, 0.52),
      0 9px 24px rgba(0, 0, 0, 0.28) !important;
    -webkit-backdrop-filter: blur(7px) saturate(112%);
    backdrop-filter: blur(7px) saturate(112%);
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease,
      background-color 180ms ease;
  }

  /* Subtle connected-tech lattice. */
  #root .adversary-content .nodewars-guild-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0.34;
    background-image:
      repeating-linear-gradient(
        60deg,
        transparent 0 23px,
        rgba(var(--nw-gold-rgb), 0.055) 23px 24px,
        transparent 24px 47px
      ),
      repeating-linear-gradient(
        -60deg,
        transparent 0 23px,
        rgba(var(--nw-gold-rgb), 0.045) 23px 24px,
        transparent 24px 47px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0 39px,
        rgba(var(--nw-gold-rgb), 0.03) 39px 40px,
        transparent 40px 79px
      );
    mask-image: linear-gradient(90deg, rgba(0,0,0,.78), rgba(0,0,0,.28) 48%, rgba(0,0,0,.62));
    -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,.78), rgba(0,0,0,.28) 48%, rgba(0,0,0,.62));
  }

  #root .adversary-content .nodewars-guild-panel::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
    border-radius: inherit;
    border: 1px solid transparent;
    background: linear-gradient(
      105deg,
      rgba(255, 225, 89, 0.72) 0%,
      rgba(var(--nw-gold-rgb), 0.34) 16%,
      rgba(var(--nw-gold-rgb), 0.10) 43%,
      rgba(var(--nw-gold-rgb), 0.28) 78%,
      rgba(255, 220, 67, 0.56) 100%
    ) border-box;
    -webkit-mask:
      linear-gradient(#000 0 0) padding-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0.74;
  }

  #root .adversary-content .nodewars-guild-panel:hover {
    border-color: var(--nw-line-strong) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 230, 120, 0.075),
      inset 0 0 34px rgba(var(--nw-gold-rgb), 0.045),
      0 0 18px rgba(var(--nw-gold-rgb), 0.09),
      0 12px 28px rgba(0, 0, 0, 0.32) !important;
  }

  /* Filter / control strip. */
  #root .adversary-content .nodewars-filter-panel {
    background-image:
      radial-gradient(circle at 50% -110%, rgba(var(--nw-gold-rgb), 0.12), transparent 50%),
      linear-gradient(180deg, rgba(9, 10, 9, 0.95), rgba(3, 5, 6, 0.96)) !important;
    border-color: rgba(var(--nw-gold-rgb), 0.45) !important;
  }

  #root .adversary-content .nodewars-dark-control {
    background:
      linear-gradient(180deg, rgba(11, 12, 11, 0.96), rgba(3, 4, 5, 0.98)) !important;
    border: 1px solid rgba(var(--nw-gold-rgb), 0.33) !important;
    color: #eee9d9 !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 230, 126, 0.035),
      0 0 0 1px rgba(0, 0, 0, 0.34) !important;
  }

  #root .adversary-content .nodewars-dark-control:hover,
  #root .adversary-content .nodewars-dark-control:focus {
    background:
      linear-gradient(180deg, rgba(20, 18, 10, 0.98), rgba(4, 5, 5, 0.99)) !important;
    border-color: rgba(var(--nw-gold-rgb), 0.74) !important;
    color: #fff8d7 !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 234, 145, 0.06),
      0 0 12px rgba(var(--nw-gold-rgb), 0.09) !important;
  }

  #root .adversary-content .nodewars-dark-control::placeholder {
    color: #77776f !important;
  }

  #root .adversary-content .nodewars-search-icon {
    color: rgba(245, 197, 39, 0.55) !important;
  }

  #root .adversary-content .nodewars-sort-control {
    min-width: 62px;
    border-radius: 10px !important;
    padding: 8px 12px !important;
    font-size: 10px !important;
    letter-spacing: .04em !important;
  }

  #root .adversary-content .nodewars-sort-control.nodewars-sort-active {
    color: #fff3b8 !important;
    border-color: rgba(var(--nw-gold-rgb), 0.78) !important;
    background:
      linear-gradient(180deg, rgba(58, 42, 5, 0.72), rgba(14, 12, 5, 0.94)) !important;
    box-shadow:
      inset 0 0 14px rgba(var(--nw-gold-rgb), 0.08),
      0 0 11px rgba(var(--nw-gold-rgb), 0.12) !important;
  }

  #root .adversary-content .nodewars-period-menu {
    overflow: hidden;
    background: rgba(3, 4, 4, 0.99) !important;
    border: 1px solid rgba(var(--nw-gold-rgb), 0.54) !important;
    color: #fff !important;
    color-scheme: dark;
    box-shadow:
      0 20px 60px rgba(0,0,0,.72),
      0 0 18px rgba(var(--nw-gold-rgb), .08) !important;
  }

  #root .adversary-content .nodewars-period-menu button {
    background: rgba(2, 3, 3, 0.98) !important;
    color: #eae5d5 !important;
    border-color: rgba(var(--nw-gold-rgb), 0.10) !important;
  }

  #root .adversary-content .nodewars-period-menu button:hover {
    background: rgba(48, 37, 8, 0.72) !important;
    color: #fff3b8 !important;
  }

  #root .adversary-content .nodewars-filter-footer {
    border-top-color: rgba(var(--nw-gold-rgb), 0.14) !important;
  }

  #root .adversary-content .nodewars-filter-chip {
    border: 1px solid rgba(var(--nw-gold-rgb), 0.18) !important;
    background: rgba(3, 4, 4, 0.84) !important;
    color: #9b998e !important;
  }

  #root .adversary-content .nodewars-filter-chip b {
    color: #f5f1e5 !important;
  }

  #root .adversary-content .nodewars-filter-chip-selected b {
    color: #f5c51e !important;
  }

  #root .adversary-content .nodewars-action-button {
    border: 1px solid rgba(var(--nw-gold-rgb), 0.45) !important;
    background:
      linear-gradient(180deg, rgba(18, 16, 8, 0.94), rgba(4, 5, 5, 0.98)) !important;
    color: #e9e3cf !important;
    box-shadow: inset 0 1px 0 rgba(255, 231, 123, .035);
  }

  #root .adversary-content .nodewars-action-button:hover {
    border-color: rgba(var(--nw-gold-rgb), 0.85) !important;
    color: #fff3b8 !important;
    background:
      linear-gradient(180deg, rgba(48, 38, 8, 0.90), rgba(7, 7, 5, 0.99)) !important;
    box-shadow: 0 0 14px rgba(var(--nw-gold-rgb), .10);
  }

  #root .adversary-content .nodewars-action-primary {
    border-color: rgba(var(--nw-gold-rgb), 0.68) !important;
    color: #ffe373 !important;
  }

  /* Summary row = separate gold framed tiles like the reference. */
  #root .adversary-content .nodewars-summary-grid {
    gap: 9px !important;
    overflow: visible !important;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  #root .adversary-content .nodewars-summary-grid::before,
  #root .adversary-content .nodewars-summary-grid::after {
    display: none !important;
  }

  #root .adversary-content .nodewars-summary-stat {
    --nodewars-accent-rgb: 96, 165, 250;
    position: relative;
    isolation: isolate;
    min-height: 80px;
    overflow: hidden;
    border: 1px solid rgba(var(--nw-gold-rgb), 0.31);
    border-radius: 13px;
    background:
      radial-gradient(circle at 18% 0%, rgba(var(--nodewars-accent-rgb), 0.13), transparent 58%),
      linear-gradient(150deg, rgba(13, 14, 13, 0.96), rgba(4, 5, 6, 0.96));
    box-shadow:
      inset 0 0 22px rgba(var(--nodewars-accent-rgb), 0.025),
      inset 0 1px 0 rgba(255,255,255,.025),
      0 8px 20px rgba(0,0,0,.20);
    transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  #root .adversary-content .nodewars-summary-stat::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: .25;
    background:
      repeating-linear-gradient(60deg, transparent 0 20px, rgba(var(--nw-gold-rgb), .045) 20px 21px, transparent 21px 41px),
      repeating-linear-gradient(-60deg, transparent 0 20px, rgba(var(--nw-gold-rgb), .035) 20px 21px, transparent 21px 41px);
  }

  #root .adversary-content .nodewars-summary-stat:hover {
    transform: translateY(-1px);
    border-color: rgba(var(--nw-gold-rgb), 0.58);
    box-shadow:
      inset 0 0 28px rgba(var(--nodewars-accent-rgb), 0.05),
      0 0 14px rgba(var(--nw-gold-rgb), 0.07),
      0 10px 22px rgba(0,0,0,.24);
  }

  /* App.jsx has broad gold-tech direct-child rules. Keep decorative layers out of the grid flow. */
  #root .adversary-content .nodewars-page-shell .nodewars-war-card > .nodewars-card-glow {
    position: absolute !important;
    z-index: -1 !important;
    display: block !important;
  }

  /* War cards. */
  #root .adversary-content .nodewars-war-card {
    overflow: hidden !important;
    border-color: rgba(var(--nw-gold-rgb), 0.46) !important;
    background:
      radial-gradient(circle at 22% -50%, rgba(var(--nw-gold-rgb), 0.08), transparent 44%),
      linear-gradient(180deg, rgba(9, 10, 9, 0.95), rgba(3, 5, 6, 0.96)) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 230, 112, 0.035),
      inset 0 0 30px rgba(var(--nw-gold-rgb), 0.02),
      0 9px 23px rgba(0,0,0,.26) !important;
  }

  #root .adversary-content .nodewars-war-card:hover {
    border-color: rgba(var(--nw-gold-rgb), 0.82) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 233, 132, 0.055),
      inset 0 0 34px rgba(var(--nw-gold-rgb), 0.035),
      0 0 17px rgba(var(--nw-gold-rgb), .08),
      0 11px 26px rgba(0,0,0,.30) !important;
  }

  #root .adversary-content .nodewars-war-card.nodewars-selected {
    border-color: rgba(var(--nw-gold-rgb), 0.92) !important;
    background:
      radial-gradient(circle at 20% -30%, rgba(var(--nw-gold-rgb), 0.13), transparent 48%),
      linear-gradient(180deg, rgba(17, 15, 8, 0.96), rgba(4, 5, 5, 0.98)) !important;
    box-shadow:
      inset 0 0 38px rgba(var(--nw-gold-rgb), 0.045),
      0 0 19px rgba(var(--nw-gold-rgb), .10),
      0 12px 28px rgba(0,0,0,.30) !important;
  }

  #root .adversary-content .nodewars-war-card::before {
    opacity: 0.22;
    background-image:
      repeating-linear-gradient(60deg, transparent 0 24px, rgba(var(--nw-gold-rgb), 0.055) 24px 25px, transparent 25px 49px),
      repeating-linear-gradient(-60deg, transparent 0 24px, rgba(var(--nw-gold-rgb), 0.04) 24px 25px, transparent 25px 49px),
      repeating-linear-gradient(0deg, transparent 0 42px, rgba(var(--nw-gold-rgb), 0.025) 42px 43px, transparent 43px 85px);
  }

  #root .adversary-content .nodewars-war-date {
    position: relative;
    border-right: 1px solid rgba(var(--nw-gold-rgb), 0.16);
    background:
      radial-gradient(circle at 20% 18%, rgba(var(--nw-gold-rgb), 0.12), transparent 55%),
      linear-gradient(145deg, rgba(21, 18, 8, 0.76), rgba(3, 4, 5, 0.32)) !important;
  }

  #root .adversary-content .nodewars-war-date::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, var(--nw-gold-bright) 0 42%, rgba(var(--nw-gold-rgb), .32) 43% 54%, transparent 55%);
    filter: drop-shadow(0 0 7px rgba(var(--nw-gold-rgb), .22));
    opacity: .82;
  }

  #root .adversary-content .nodewars-war-date svg {
    color: #f5c51e !important;
  }

  #root .adversary-content .nodewars-war-card .nodewars-date-icon {
    background: rgba(61, 46, 5, 0.34) !important;
    color: #f5c51e !important;
    border: 1px solid rgba(var(--nw-gold-rgb), 0.26);
    box-shadow: inset 0 0 14px rgba(var(--nw-gold-rgb), .06) !important;
  }

  #root .adversary-content .nodewars-war-card .nodewars-kd-badge {
    border-color: rgba(var(--nw-gold-rgb), 0.48) !important;
    background: rgba(60, 45, 5, 0.38) !important;
    color: #f8cf39 !important;
    box-shadow:
      inset 0 0 12px rgba(var(--nw-gold-rgb), .05),
      0 0 8px rgba(var(--nw-gold-rgb), .04);
  }

  #root .adversary-content .nodewars-enemy-pill {
    border-color: rgba(var(--nw-gold-rgb), 0.24) !important;
    background: rgba(2, 3, 3, 0.82) !important;
  }

  #root .adversary-content .nodewars-enemy-pill:hover {
    border-color: rgba(var(--nw-gold-rgb), 0.52) !important;
  }

  #root .adversary-content .nodewars-metrics-divider {
    background: linear-gradient(90deg, rgba(var(--nw-gold-rgb), .18), rgba(var(--nw-gold-rgb), .07), transparent) !important;
  }

  #root .adversary-content .nodewars-select-toggle {
    border-color: rgba(var(--nw-gold-rgb), .34) !important;
    background: rgba(5, 6, 6, .90) !important;
    box-shadow: inset 0 0 12px rgba(var(--nw-gold-rgb), .035);
  }

  #root .adversary-content .nodewars-selected .nodewars-select-toggle {
    border-color: rgba(var(--nw-gold-rgb), .90) !important;
    background: rgba(57, 43, 5, .66) !important;
    box-shadow: 0 0 12px rgba(var(--nw-gold-rgb), .10);
  }

  #root .adversary-content .nodewars-select-toggle input {
    accent-color: #e7b300 !important;
  }

  /* Typography and separators. */
  #root .adversary-content .nodewars-page-shell .text-slate-500,
  #root .adversary-content .nodewars-page-shell .text-slate-600 {
    color: #858276 !important;
  }

  #root .adversary-content .nodewars-page-shell .border-slate-700\/25 {
    border-color: rgba(var(--nw-gold-rgb), 0.13) !important;
  }

  #root .adversary-content .nodewars-page-shell .bg-slate-700\/25 {
    background-color: rgba(var(--nw-gold-rgb), 0.12) !important;
  }

  #root .adversary-content .nodewars-warning-panel {
    color: #ffe693 !important;
    border-color: rgba(var(--nw-gold-rgb), .52) !important;
  }

  @media (max-width: 1279px) {
    #root .adversary-content .nodewars-summary-grid {
      gap: 8px !important;
    }
  }
`;

/* -------------------- SORT HEADER -------------------- */
function SortHeader({ id, label, sort, onSort }) {
  const active = sort.key === id;

  return (
    <button
      type="button"
      onClick={() => onSort(id)}
      className={`nodewars-dark-control nodewars-sort-control rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider transition ${
        active ? 'nodewars-sort-active' : 'text-slate-400 hover:text-white'
      }`}
    >
      {label} {active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}
    </button>
  );
}

/* -------------------- HELPERS -------------------- */
function numberColor(value) {
  const num = Number(value) || 0;

  if (num >= 2) return 'text-emerald-400';
  if (num >= 1) return 'text-lime-400';
  if (num > 0) return 'text-rose-400';

  return 'text-slate-400';
}

function badgeColor(value) {
  const num = Number(value) || 0;

  if (num >= 2) {
    return 'border-emerald-400/20 bg-emerald-500/15 text-emerald-300';
  }

  if (num >= 1) {
    return 'border-lime-400/20 bg-lime-500/15 text-lime-300';
  }

  return 'border-rose-400/20 bg-rose-500/15 text-rose-300';
}

function formatWarDate(date) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return {
      weekday: 'War Day',
      full: String(date || '-'),
    };
  }

  return {
    weekday: parsed.toLocaleDateString('en-GB', {
      weekday: 'long',
    }),
    full: parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  };
}

function formatWarTime(row) {
  const source =
    row.createdAt ||
    row.created_at ||
    row.created ||
    row.time ||
    row.timestamp ||
    row.date ||
    '';

  if (!source) return '';

  const parsed = new Date(source);

  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function compactNumber(value, digits = 1) {
  const number = Number(value) || 0;
  const abs = Math.abs(number);

  function format(divisor, suffix) {
    const compact = number / divisor;
    const decimals = Math.abs(compact) >= 10 || Number.isInteger(compact) ? 0 : digits;

    return `${compact.toFixed(decimals).replace(/\.0$/, '')}${suffix}`;
  }

  if (abs >= 1_000_000_000_000) return format(1_000_000_000_000, 'T');
  if (abs >= 1_000_000_000) return format(1_000_000_000, 'B');
  if (abs >= 1_000_000) return format(1_000_000, 'M');
  if (abs >= 1_000) return format(1_000, 'K');

  return number.toLocaleString('en-US');
}

function accentByIndex(index) {
  const accents = [
    {
      rgb: '139, 92, 246',
      date: 'from-violet-950/95 via-violet-900/35 to-slate-950',
      iconBox: 'bg-violet-500/15 text-violet-300 shadow-violet-500/20',
      topLine: 'from-violet-500/0 via-violet-400/40 to-violet-500/0',
      glow: 'bg-violet-500/20',
      hoverShadow: 'hover:shadow-[0_0_34px_rgba(139,92,246,0.20)]',
    },
    {
      rgb: '59, 130, 246',
      date: 'from-blue-950/95 via-blue-900/35 to-slate-950',
      iconBox: 'bg-blue-500/15 text-blue-300 shadow-blue-500/20',
      topLine: 'from-blue-500/0 via-blue-400/40 to-blue-500/0',
      glow: 'bg-blue-500/20',
      hoverShadow: 'hover:shadow-[0_0_34px_rgba(59,130,246,0.20)]',
    },
    {
      rgb: '6, 182, 212',
      date: 'from-cyan-950/95 via-cyan-900/35 to-slate-950',
      iconBox: 'bg-cyan-500/15 text-cyan-300 shadow-cyan-500/20',
      topLine: 'from-cyan-500/0 via-cyan-400/40 to-cyan-500/0',
      glow: 'bg-cyan-500/20',
      hoverShadow: 'hover:shadow-[0_0_34px_rgba(6,182,212,0.20)]',
    },
  ];

  return accents[index % accents.length];
}

function getRowTime(row) {
  const parsed = new Date(row.date).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getDaysAgoFromLatest(rowDate, latestTime) {
  const parsed = new Date(rowDate).getTime();

  if (!latestTime || Number.isNaN(parsed)) return 0;

  const diff = latestTime - parsed;
  return diff / (1000 * 60 * 60 * 24);
}

/* -------------------- PERIOD SELECT -------------------- */
function PeriodSelect({ value, onChange, loading = false }) {
  const [open, setOpen] = useState(false);

  const options = [
    { value: 30, label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const selected =
    options.find((option) => option.value === value) || options[0];

  return (
    <div className="relative z-50">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((current) => !current)}
        className="nodewars-dark-control nodewars-period-button flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black text-white transition disabled:cursor-wait disabled:opacity-60"
      >
        <CalendarDays size={15} />
        {loading ? 'Loading...' : selected.label}
        <ChevronDown
          size={14}
          className={open ? 'rotate-180 transition' : 'transition'}
        />
      </button>

      {open && (
        <div className="nodewars-period-menu absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border shadow-[0_20px_70px_rgba(0,0,0,0.65)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full px-4 py-3 text-left text-xs font-black transition ${
                value === option.value
                  ? 'bg-white/14 text-white'
                  : 'bg-black text-white hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- ENEMY SEARCH -------------------- */
function EnemySearch({ value, onChange, suggestions, onPick }) {
  const [open, setOpen] = useState(false);

  const showSuggestions = open && value.trim() && suggestions.length > 0;

  return (
    <div className="relative">
      <div className="nodewars-search-icon pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-600">
        <Search size={16} />
      </div>

      <input
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        placeholder="Search enemies..."
        className="nodewars-dark-control w-full rounded-xl border py-3 pl-11 pr-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-500 focus:shadow-[0_0_20px_rgba(139,92,246,.16)]"
      />

      {showSuggestions && (
        <div className="nodewars-period-menu absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-auto rounded-xl border shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
          {suggestions.map((enemy) => (
            <button
              key={enemy}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onPick(enemy);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 border-b border-white/5 bg-black px-4 py-3 text-left text-sm font-black text-white transition last:border-b-0 hover:bg-white/10"
            >
              <span className="truncate">{enemy}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-600">
                Enemy
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- ENEMY PILL -------------------- */
function EnemyPill({ enemy }) {
  return (
    <div className="nodewars-dark-control nodewars-enemy-pill flex h-7 min-w-[92px] max-w-[155px] items-center justify-between gap-2 rounded-xl border px-3">
      <span
        title={enemy.name}
        className="truncate text-[12px] font-black text-slate-100"
      >
        {enemy.name}
      </span>

      <span className={`text-[12px] font-black ${numberColor(enemy.kd)}`}>
        {enemy.kd}
      </span>
    </div>
  );
}

/* -------------------- METRIC -------------------- */
function WarMetric({ icon, label, value, valueClass = 'text-slate-100' }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/30 shadow-[inset_0_0_16px_rgba(255,255,255,.025)]">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </div>

        <div className={`text-lg font-black leading-tight ${valueClass}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* -------------------- WAR CARD -------------------- */
function WarCard({ row, index, checked, onOpen, onToggle }) {
  const accent = accentByIndex(index);
  const date = formatWarDate(row.date);
  const time = formatWarTime(row);
  const kdNumber = Number(row.kd) || 0;

  return (
    <div
      onClick={onOpen}
      className={`nodewars-guild-panel nodewars-war-card group relative grid cursor-pointer overflow-visible rounded-xl border transition duration-200 ${
        checked
          ? 'nodewars-selected'
          : 'hover:-translate-y-[1px]'
      } lg:grid-cols-[118px_1fr]`}
      style={{ '--nodewars-accent-rgb': accent.rgb }}
    >
      <div
        className={`nodewars-card-glow pointer-events-none absolute -inset-[2px] -z-10 rounded-xl ${accent.glow} opacity-0 blur-xl transition duration-200 group-hover:opacity-30`}
      />

      <div
        className="nodewars-war-date relative flex min-h-[94px] flex-col justify-between overflow-hidden rounded-l-xl p-3"
      >
        <div>
          <div
            className={`nodewars-date-icon mb-2 grid h-7 w-7 place-items-center rounded-lg ${accent.iconBox}`}
          >
            <CalendarDays size={15} />
          </div>

          <div
            title={date.weekday}
            className="max-w-[92px] truncate text-[12px] font-black leading-tight text-white"
          >
            {date.weekday},
          </div>

          <div className="mt-0.5 text-[14px] font-black leading-tight text-white">
            {date.full}
          </div>
        </div>

        {time && (
          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full border border-slate-500" />
            {time}
          </div>
        )}
      </div>

      <div className="relative min-w-0 overflow-hidden rounded-r-xl bg-transparent p-3">
        <div
          className={`pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r ${accent.topLine} opacity-70`}
        />

        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="grid min-w-0 gap-3 xl:grid-cols-[150px_1fr]">
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Kills/Deaths Ratio
                </div>

                <span
                  className={`nodewars-kd-badge inline-flex rounded-full border px-3 py-1 text-sm font-black ${badgeColor(
                    row.kd,
                  )}`}
                >
                  {row.kd}
                </span>
              </div>

              <div className="min-w-0">
                <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Top 5 Enemies
                </div>

                <div className="flex min-w-0 flex-wrap gap-1.5 xl:flex-nowrap xl:overflow-hidden">
                  {row.topEnemies.length ? (
                    row.topEnemies.map((enemy) => (
                      <EnemyPill key={enemy.name} enemy={enemy} />
                    ))
                  ) : (
                    <div className="text-xs font-bold text-slate-600">
                      No enemies detected
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="nodewars-metrics-divider mt-2.5 h-px bg-slate-700/25" />

            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
              <WarMetric
                label="Players"
                value={row.players}
                icon={<Users size={17} className="text-indigo-300" />}
              />

              <WarMetric
                label="Kills"
                value={row.kills}
                valueClass="text-emerald-400"
                icon={<Swords size={17} className="text-emerald-300" />}
              />

              <WarMetric
                label="Deaths"
                value={row.deaths}
                valueClass="text-rose-400"
                icon={<Skull size={17} className="text-rose-300" />}
              />

              <WarMetric
                label="K/D"
                value={row.kd}
                valueClass={kdNumber >= 1 ? 'text-emerald-400' : 'text-rose-400'}
                icon={<Crosshair size={17} className="text-lime-300" />}
              />

              <WarMetric
                label="Damage"
                value={compactNumber(row.damageDealt)}
                valueClass="text-amber-300"
                icon={<Zap size={17} className="text-amber-300" />}
              />

              <WarMetric
                label="Taken"
                value={compactNumber(row.damageTaken)}
                valueClass="text-pink-300"
                icon={<Shield size={17} className="text-pink-300" />}
              />

              <WarMetric
                label="CC Hits"
                value={compactNumber(row.ccHits)}
                valueClass="text-cyan-300"
                icon={<Hand size={17} className="text-cyan-300" />}
              />

              <WarMetric
                label="Fort"
                value={compactNumber(row.fortDamage)}
                valueClass="text-violet-300"
                icon={<Castle size={17} className="text-violet-300" />}
              />
            </div>
          </div>

          <div
            className={`nodewars-select-toggle mt-[28px] flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${
              checked
                ? 'border-white/80 bg-white/10 shadow-[0_0_18px_rgba(255,255,255,0.18)]'
                : 'border-slate-800 bg-slate-950/70 group-hover:border-slate-700'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                event.stopPropagation();
                onToggle();
              }}
              className="h-[18px] w-[18px] cursor-pointer"
              style={{ accentColor: '#ffffff' }}
              title={checked ? 'Deselect this war' : 'Select this war'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- SUMMARY CARD -------------------- */
function SummaryStat({
  icon,
  label,
  value,
  valueClass = 'text-slate-100',
  barClass = 'bg-slate-100',
  accentRgb = '96, 165, 250',
}) {
  return (
    <div className="nodewars-summary-stat flex items-center gap-3 px-4 py-3" style={{ '--nodewars-accent-rgb': accentRgb }}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/30 shadow-[inset_0_0_18px_rgba(255,255,255,.025)]">
        {icon}
      </div>

      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </div>

        <div className={`text-xl font-black leading-tight ${valueClass}`}>
          {value}
        </div>

        <div className={`mt-1 h-[2px] w-10 rounded-full ${barClass}`} />
      </div>
    </div>
  );
}

function KillsDeathsTrend({ rows }) {
  const orderedRows = [...rows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const killsValues = orderedRows.map((row) => Number(row.kills) || 0);
  const deathsValues = orderedRows.map((row) => Number(row.deaths) || 0);

  const safeKills = killsValues.length ? killsValues : [0];
  const safeDeaths = deathsValues.length ? deathsValues : [0];

  const max = Math.max(...safeKills, ...safeDeaths, 1);
  const width = 220;
  const top = 8;
  const bottom = 42;
  const height = bottom - top;

  function buildPoints(values) {
    return values
      .map((value, index) => {
        const x =
          values.length === 1
            ? width / 2
            : (index / (values.length - 1)) * width;

        const y = bottom - ((Number(value) || 0) / max) * height;

        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  const killsPoints = buildPoints(safeKills);
  const deathsPoints = buildPoints(safeDeaths);

  return (
    <div className="nodewars-summary-stat flex min-w-[260px] flex-1 items-center gap-4 px-4 py-3" style={{ '--nodewars-accent-rgb': '6, 182, 212' }}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-500/10">
        <Activity size={20} className="text-cyan-300" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
          Kills / Deaths Trend
        </div>

        <svg viewBox={`0 0 ${width} 52`} className="h-[44px] w-full overflow-visible">
          <line
            x1="0"
            y1={bottom}
            x2={width}
            y2={bottom}
            stroke="rgb(51 65 85)"
            strokeWidth="1"
            strokeDasharray="3 4"
            opacity="0.55"
          />

          <polyline
            points={killsPoints}
            fill="none"
            stroke="rgb(52 211 153)"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <polyline
            points={deathsPoints}
            fill="none"
            stroke="rgb(251 113 133)"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

/* -------------------- MAIN -------------------- */
export default function NodeWars({
  logs,
  loading = false,
  periodDays = 30,
  onPeriodChange = () => {},
  setPage,
  setSelectedDays,
  setSelectedWars,
  selectedWars,
  externalWarning = '',
  clearExternalWarning = () => {},
}) {
  const [query, setQuery] = useState('');
  const [warning, setWarning] = useState('');
  const [sort, setSort] = useState({
    key: 'time',
    dir: 'desc',
  });
  const [filtersVisible, setFiltersVisible] = useState(true);
  const lastListScrollTop = useRef(0);

  function handleWarsListScroll(event) {
    const nextTop = event.currentTarget.scrollTop;
    const delta = nextTop - lastListScrollTop.current;

    if (nextTop <= 8) {
      setFiltersVisible(true);
    } else if (delta > 14) {
      setFiltersVisible(false);
    } else if (delta < -14) {
      setFiltersVisible(true);
    }

    lastListScrollTop.current = nextTop;
  }

  function clearWarnings() {
    setWarning('');
    clearExternalWarning();
  }

  function toggleSort(key) {
    setSort((current) => {
      if (current.key === key) {
        return {
          key,
          dir: current.dir === 'desc' ? 'asc' : 'desc',
        };
      }

      return {
        key,
        dir: 'desc',
      };
    });
  }

  const allRows = useMemo(() => {
    return logs.map(buildNodeWarRow);
  }, [logs]);

  const latestWarTime = useMemo(() => {
    const times = allRows
      .map(getRowTime)
      .filter((time) => time && !Number.isNaN(time));

    return times.length ? Math.max(...times) : 0;
  }, [allRows]);

  const enemySuggestions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return [];

    const names = new Map();

    allRows.forEach((row) => {
      row.allEnemyNames.forEach((name) => {
        const lower = name.toLowerCase();

        if (lower.includes(cleanQuery)) {
          names.set(lower, name);
        }
      });
    });

    return [...names.values()]
      .sort((a, b) => {
        const al = a.toLowerCase();
        const bl = b.toLowerCase();

        const aStarts = al.startsWith(cleanQuery);
        const bStarts = bl.startsWith(cleanQuery);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.localeCompare(b);
      })
      .slice(0, 10);
  }, [allRows, query]);

  const rows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    const filtered = allRows
      .filter((row) => {
        if (periodDays === 'all') return true;

        const daysAgo = getDaysAgoFromLatest(row.date, latestWarTime);

        return daysAgo >= 0 && daysAgo < Number(periodDays);
      })
      .filter((row) => {
        if (!cleanQuery) return true;

        return row.allEnemyNames.some((name) =>
          name.toLowerCase().includes(cleanQuery),
        );
      });

    return filtered.sort((a, b) => {
      let av = 0;
      let bv = 0;

      if (sort.key === 'time') {
        av = getRowTime(a);
        bv = getRowTime(b);
      }

      if (sort.key === 'kills') {
        av = Number(a.kills) || 0;
        bv = Number(b.kills) || 0;
      }

      if (sort.key === 'deaths') {
        av = Number(a.deaths) || 0;
        bv = Number(b.deaths) || 0;
      }

      if (sort.key === 'kd') {
        av = Number(a.kdNumber) || 0;
        bv = Number(b.kdNumber) || 0;
      }

      if (sort.key === 'damageDealt') {
        av = Number(a.damageDealt) || 0;
        bv = Number(b.damageDealt) || 0;
      }

      if (sort.key === 'damageTaken') {
        av = Number(a.damageTaken) || 0;
        bv = Number(b.damageTaken) || 0;
      }

      if (sort.key === 'ccHits') {
        av = Number(a.ccHits) || 0;
        bv = Number(b.ccHits) || 0;
      }

      if (sort.key === 'fortDamage') {
        av = Number(a.fortDamage) || 0;
        bv = Number(b.fortDamage) || 0;
      }

      if (av === bv) {
        return String(b.date).localeCompare(String(a.date));
      }

      return sort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [allRows, latestWarTime, periodDays, query, sort]);

  const visibleIds = rows.map((row) => String(row.id));

  const allSavedLogsSelected = selectedWars.includes('all');

  const selectedRealWars = selectedWars.filter(
    (id) => id !== 'all' && id !== 'current',
  );

  const hasAnySelection = allSavedLogsSelected || selectedRealWars.length > 0;

  const selectedVisibleCount = allSavedLogsSelected
    ? visibleIds.length
    : visibleIds.filter((id) => selectedRealWars.includes(id)).length;

  const exactDisplayedSelection =
    !allSavedLogsSelected &&
    visibleIds.length > 0 &&
    selectedRealWars.length === visibleIds.length &&
    visibleIds.every((id) => selectedRealWars.includes(id));

  const totals = useMemo(() => {
    const kills = rows.reduce((sum, row) => sum + row.kills, 0);
    const deaths = rows.reduce((sum, row) => sum + row.deaths, 0);
    const damageDealt = rows.reduce(
      (sum, row) => sum + (Number(row.damageDealt) || 0),
      0,
    );
    const damageTaken = rows.reduce(
      (sum, row) => sum + (Number(row.damageTaken) || 0),
      0,
    );
    const ccHits = rows.reduce((sum, row) => sum + (Number(row.ccHits) || 0), 0);
    const fortDamage = rows.reduce(
      (sum, row) => sum + (Number(row.fortDamage) || 0),
      0,
    );

    return {
      matches: rows.length,
      kills,
      deaths,
      kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
      damageDealt,
      damageTaken,
      ccHits,
      fortDamage,
    };
  }, [rows]);

  function openWar(row) {
    clearWarnings();
    setSelectedDays([row.date]);
    setSelectedWars([String(row.id)]);
    setPage('overview');
  }

  function toggleWar(row) {
    const id = String(row.id);

    clearWarnings();
    setSelectedDays(['all']);

    setSelectedWars((previous) => {
      const cleanPrevious = previous.filter(
        (item) => item !== 'all' && item !== 'current',
      );

      return cleanPrevious.includes(id)
        ? cleanPrevious.filter((item) => item !== id)
        : [...new Set([...cleanPrevious, id])];
    });
  }

  function selectDisplayedLogs() {
    clearWarnings();

    if (!visibleIds.length) {
      setSelectedDays(['all']);
      setSelectedWars([]);
      setWarning('No saved node wars found for this search.');
      return;
    }

    setSelectedDays(['all']);

    if (exactDisplayedSelection) {
      setSelectedWars([]);
      return;
    }

    // Select only the wars currently visible after applying the
    // period filter, enemy search, and any other active filters.
    setSelectedWars([...new Set(visibleIds)]);
  }

  function openSelectedOverview() {
    if (!allSavedLogsSelected && selectedRealWars.length === 0) {
      clearExternalWarning();
      setWarning('No node war selected. Select at least one war first.');
      return;
    }

    clearWarnings();
    setSelectedDays(['all']);
    setPage('overview');
  }

  return (
    <Panel cls="nodewars-page-shell border-0 bg-transparent p-0 shadow-none">
      <style>{NODE_WARS_PANEL_CSS}</style>
      <div className="space-y-3">
        {/* FILTER PANEL */}
        <div
          className={`nodewars-guild-panel nodewars-filter-panel relative z-30 rounded-xl border transition-all duration-300 ${
            filtersVisible
              ? 'max-h-[240px] overflow-visible p-4 opacity-100 translate-y-0'
              : 'max-h-0 overflow-hidden border-transparent p-0 opacity-0 -translate-y-2'
          }`}
          style={{ '--nodewars-accent-rgb': '139, 92, 246' }}
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
            <EnemySearch
              value={query}
              suggestions={enemySuggestions}
              onChange={(value) => {
                setQuery(value);
                clearWarnings();
              }}
              onPick={(enemy) => {
                setQuery(enemy);
                clearWarnings();
              }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <SortHeader
                id="time"
                label="Time"
                sort={sort}
                onSort={toggleSort}
              />
              <SortHeader
                id="kills"
                label="Kills"
                sort={sort}
                onSort={toggleSort}
              />
              <SortHeader
                id="deaths"
                label="Deaths"
                sort={sort}
                onSort={toggleSort}
              />
              <SortHeader id="kd" label="K/D" sort={sort} onSort={toggleSort} />
              <SortHeader
                id="damageDealt"
                label="Damage"
                sort={sort}
                onSort={toggleSort}
              />
              <SortHeader
                id="damageTaken"
                label="Taken"
                sort={sort}
                onSort={toggleSort}
              />
              <SortHeader id="ccHits" label="CC" sort={sort} onSort={toggleSort} />
              <SortHeader id="fortDamage" label="Fort" sort={sort} onSort={toggleSort} />
            </div>
          </div>

          <div className="nodewars-filter-footer mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/25 pt-4">
            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-400">
              <span className="nodewars-filter-chip rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
                Displayed: <b className="text-white">{rows.length}</b>
              </span>

              <span className="nodewars-filter-chip nodewars-filter-chip-selected rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
                Selected:{' '}
                <b className="text-violet-300">{selectedVisibleCount}</b>
              </span>

              {query.trim() && (
                <span className="nodewars-filter-chip rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                  Search: {query.trim()}
                </span>
              )}

              {loading && (
                <span className="nodewars-filter-chip rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-blue-200">
                  Loading database...
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectDisplayedLogs}
                className="nodewars-action-button rounded-xl border px-4 py-2 text-xs font-black transition"
              >
                {exactDisplayedSelection ? 'Clear selection' : 'Select displayed'}
              </button>

              <button
                type="button"
                onClick={openSelectedOverview}
                className="nodewars-action-button nodewars-action-primary rounded-xl border px-4 py-2 text-xs font-black transition"
              >
                Open overview
              </button>

              <PeriodSelect
                value={periodDays}
                onChange={onPeriodChange}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* WARNING */}
        {(warning || externalWarning) && (
          <div className="nodewars-guild-panel nodewars-warning-panel rounded-xl border px-4 py-3 text-sm font-bold text-amber-200" style={{ '--nodewars-accent-rgb': '245, 158, 11' }}>
            {warning || externalWarning}
          </div>
        )}

        {/* SUMMARY */}
        <div className="nodewars-guild-panel nodewars-summary-grid grid overflow-hidden rounded-xl border md:grid-cols-2 xl:grid-cols-[repeat(8,minmax(112px,1fr))_minmax(220px,1.25fr)]" style={{ '--nodewars-accent-rgb': '59, 130, 246' }}>
          <SummaryStat
            label="Total Matches"
            value={totals.matches}
            valueClass="text-violet-400"
            barClass="bg-violet-400"
            icon={<Swords size={20} className="text-violet-300" />}
            accentRgb="139, 92, 246"
          />

          <SummaryStat
            label="Total Kills"
            value={totals.kills.toLocaleString('en-US')}
            valueClass="text-emerald-400"
            barClass="bg-emerald-400"
            icon={<Crosshair size={20} className="text-emerald-300" />}
            accentRgb="16, 185, 129"
          />

          <SummaryStat
            label="Total Deaths"
            value={totals.deaths.toLocaleString('en-US')}
            valueClass="text-rose-400"
            barClass="bg-rose-400"
            icon={<Skull size={20} className="text-rose-300" />}
            accentRgb="244, 63, 94"
          />

          <SummaryStat
            label="Overall K/D"
            value={totals.kd}
            valueClass={
              Number(totals.kd) >= 1 ? 'text-emerald-400' : 'text-rose-400'
            }
            barClass={
              Number(totals.kd) >= 1 ? 'bg-emerald-400' : 'bg-rose-400'
            }
            icon={<Gauge size={20} className="text-cyan-300" />}
            accentRgb="6, 182, 212"
          />

          <SummaryStat
            label="Damage"
            value={compactNumber(totals.damageDealt)}
            valueClass="text-amber-300"
            barClass="bg-amber-300"
            icon={<Zap size={20} className="text-amber-300" />}
            accentRgb="245, 158, 11"
          />

          <SummaryStat
            label="Damage Taken"
            value={compactNumber(totals.damageTaken)}
            valueClass="text-pink-300"
            barClass="bg-pink-300"
            icon={<Shield size={20} className="text-pink-300" />}
            accentRgb="236, 72, 153"
          />

          <SummaryStat
            label="CC Hits"
            value={compactNumber(totals.ccHits)}
            valueClass="text-cyan-300"
            barClass="bg-cyan-300"
            icon={<Hand size={20} className="text-cyan-300" />}
            accentRgb="6, 182, 212"
          />

          <SummaryStat
            label="Fort Damage"
            value={compactNumber(totals.fortDamage)}
            valueClass="text-violet-300"
            barClass="bg-violet-300"
            icon={<Castle size={20} className="text-violet-300" />}
            accentRgb="139, 92, 246"
          />

          <KillsDeathsTrend rows={rows} />
        </div>

        {/* LIST */}
        <div
          onScroll={handleWarsListScroll}
          className={`${filtersVisible ? 'max-h-[calc(100vh-330px)]' : 'max-h-[calc(100vh-210px)]'} space-y-2 overflow-auto px-1 py-1 transition-[max-height] duration-300 ${scrollCls}`}
        >
          {loading && !rows.length ? (
            <div className="nodewars-guild-panel rounded-xl border px-4 py-12 text-center text-sm font-bold text-slate-400" style={{ '--nodewars-accent-rgb': '59, 130, 246' }}>
              Loading node wars...
            </div>
          ) : !rows.length ? (
            <div className="nodewars-guild-panel rounded-xl border px-4 py-12 text-center text-sm font-bold text-slate-400" style={{ '--nodewars-accent-rgb': '59, 130, 246' }}>
              No saved node wars found for this filter.
            </div>
          ) : (
            rows.map((row, index) => {
              const id = String(row.id);
              const checked = allSavedLogsSelected || selectedRealWars.includes(id);

              return (
                <WarCard
                  key={row.id}
                  row={row}
                  index={index}
                  checked={checked}
                  onOpen={() => openWar(row)}
                  onToggle={() => toggleWar(row)}
                />
              );
            })
          )}
        </div>
      </div>
    </Panel>
  );
}
