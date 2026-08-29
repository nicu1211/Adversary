import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Castle,
  ChevronDown,
  ChevronRight,
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
import adversaryEmblem from '../assets/adversary-emblem.png?url';
import { buildNodeWarRow, scrollCls } from '../lib/logUtils';


const NODE_WARS_PANEL_CSS = `
  #root .adversary-content .nodewars-page-shell,
  #root .adversary-content .nodewars-page-shell:hover {
    --nw-gold: #f2c216;
    --nw-gold-bright: #ffdc46;
    --nw-gold-rgb: 242, 194, 22;
    --nw-line: rgba(242, 194, 22, .34);
    --nw-line-hot: rgba(255, 218, 62, .78);
    --nw-panel: rgba(3, 5, 6, .82);
    position: relative;
    isolation: isolate;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  #root .adversary-content .nodewars-page-shell::before,
  #root .adversary-content .nodewars-page-shell::after {
    display: none !important;
  }

  #root .adversary-content .nodewars-scene {
    position: relative;
    isolation: isolate;
  }

  /* Large piece of the actual emblem becomes the page's structural core. */
  #root .adversary-content .nodewars-emblem-watermark {
    position: absolute !important;
    z-index: -3 !important;
    left: 50%;
    top: -122px;
    width: min(660px, 58vw);
    height: 520px;
    transform: translateX(-50%);
    background-repeat: no-repeat;
    background-position: center top;
    background-size: contain;
    opacity: .155;
    filter: saturate(1.25) contrast(1.08) drop-shadow(0 0 42px rgba(var(--nw-gold-rgb), .16));
    pointer-events: none;
    -webkit-mask-image: linear-gradient(180deg, #000 0 58%, rgba(0,0,0,.7) 74%, transparent 100%);
    mask-image: linear-gradient(180deg, #000 0 58%, rgba(0,0,0,.7) 74%, transparent 100%);
  }

  #root .adversary-content .nodewars-tech-field {
    position: absolute !important;
    z-index: -4 !important;
    inset: -10px 0 0;
    pointer-events: none;
    opacity: .46;
    background-image:
      linear-gradient(30deg, rgba(var(--nw-gold-rgb), .07) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb), .07) 87.5%),
      linear-gradient(150deg, rgba(var(--nw-gold-rgb), .07) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb), .07) 87.5%),
      linear-gradient(30deg, rgba(var(--nw-gold-rgb), .045) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb), .045) 87.5%),
      linear-gradient(150deg, rgba(var(--nw-gold-rgb), .045) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb), .045) 87.5%);
    background-size: 54px 94px;
    background-position: 0 0, 0 0, 27px 47px, 27px 47px;
    -webkit-mask-image: radial-gradient(ellipse at 54% 18%, #000 0 48%, rgba(0,0,0,.60) 68%, transparent 93%);
    mask-image: radial-gradient(ellipse at 54% 18%, #000 0 48%, rgba(0,0,0,.60) 68%, transparent 93%);
  }

  #root .adversary-content .nodewars-circuit-field {
    position: absolute !important;
    z-index: -2 !important;
    inset: 0;
    pointer-events: none;
    opacity: .26;
    background-image:
      linear-gradient(90deg, transparent 0 8%, rgba(var(--nw-gold-rgb),.24) 8% 8.08%, transparent 8.08% 30%, rgba(var(--nw-gold-rgb),.14) 30% 30.08%, transparent 30.08% 100%),
      linear-gradient(0deg, transparent 0 21%, rgba(var(--nw-gold-rgb),.15) 21% 21.2%, transparent 21.2% 64%, rgba(var(--nw-gold-rgb),.12) 64% 64.2%, transparent 64.2% 100%);
    background-size: 240px 100%, 100% 130px;
    -webkit-mask-image: linear-gradient(90deg, #000 0 17%, transparent 34%, transparent 68%, #000 86% 100%);
    mask-image: linear-gradient(90deg, #000 0 17%, transparent 34%, transparent 68%, #000 86% 100%);
  }

  /* Shared reference-like panel. */
  #root .adversary-content .nodewars-guild-panel {
    position: relative !important;
    isolation: isolate;
    overflow: hidden;
    background:
      radial-gradient(circle at 12% -70%, rgba(var(--nw-gold-rgb), .095), transparent 43%),
      linear-gradient(180deg, rgba(8,9,8,.91), rgba(2,4,5,.90)) !important;
    border: 1px solid rgba(var(--nw-gold-rgb), .40) !important;
    box-shadow:
      inset 0 1px 0 rgba(255,232,125,.035),
      inset 0 0 26px rgba(var(--nw-gold-rgb), .018),
      0 8px 22px rgba(0,0,0,.26) !important;
    backdrop-filter: blur(5px) saturate(112%);
    -webkit-backdrop-filter: blur(5px) saturate(112%);
  }

  #root .adversary-content .nodewars-guild-panel::before {
    content: '';
    position: absolute !important;
    inset: 0;
    z-index: -1 !important;
    pointer-events: none;
    opacity: .18;
    background-image:
      linear-gradient(30deg, rgba(var(--nw-gold-rgb),.10) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb),.10) 87.5%),
      linear-gradient(150deg, rgba(var(--nw-gold-rgb),.10) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb),.10) 87.5%);
    background-size: 42px 73px;
    -webkit-mask-image: linear-gradient(90deg, #000, rgba(0,0,0,.24) 52%, #000);
    mask-image: linear-gradient(90deg, #000, rgba(0,0,0,.24) 52%, #000);
  }

  #root .adversary-content .nodewars-guild-panel::after {
    content: '';
    position: absolute !important;
    inset: 0;
    z-index: 20 !important;
    pointer-events: none;
    border-radius: inherit;
    border: 1px solid transparent;
    background: linear-gradient(102deg, rgba(255,224,76,.72), rgba(var(--nw-gold-rgb),.18) 26%, transparent 50%, rgba(var(--nw-gold-rgb),.15) 77%, rgba(255,221,65,.55)) border-box;
    -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: .55;
  }

  /* One compact control strip, matching the requested reference. */
  #root .adversary-content .nodewars-filter-panel {
    padding: 12px 14px !important;
    border-radius: 14px !important;
    background:
      linear-gradient(90deg, rgba(5,7,7,.92), rgba(2,4,5,.87) 58%, rgba(6,6,4,.91)) !important;
  }

  #root .adversary-content .nodewars-filter-main {
    display: grid;
    grid-template-columns: minmax(270px, 1fr) auto auto;
    align-items: center;
    gap: 12px;
  }

  #root .adversary-content .nodewars-sort-row,
  #root .adversary-content .nodewars-actions-row {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: nowrap;
  }

  #root .adversary-content .nodewars-dark-control,
  #root .adversary-content .nodewars-action-button {
    min-height: 36px;
    background: linear-gradient(180deg, rgba(12,12,9,.96), rgba(2,4,5,.98)) !important;
    border: 1px solid rgba(var(--nw-gold-rgb), .36) !important;
    color: #eee7d3 !important;
    box-shadow: inset 0 1px 0 rgba(255,231,124,.025) !important;
  }

  #root .adversary-content .nodewars-dark-control:hover,
  #root .adversary-content .nodewars-dark-control:focus,
  #root .adversary-content .nodewars-action-button:hover {
    border-color: rgba(var(--nw-gold-rgb), .76) !important;
    color: #fff4b8 !important;
    box-shadow: inset 0 0 12px rgba(var(--nw-gold-rgb),.04), 0 0 11px rgba(var(--nw-gold-rgb),.07) !important;
  }

  #root .adversary-content .nodewars-search-icon {
    color: rgba(255,220,69,.48) !important;
  }

  #root .adversary-content .nodewars-sort-control {
    min-width: 58px;
    padding: 8px 10px !important;
    border-radius: 9px !important;
    font-size: 9px !important;
    letter-spacing: .045em !important;
  }

  #root .adversary-content .nodewars-sort-control.nodewars-sort-active {
    color: #ffdf58 !important;
    border-color: rgba(var(--nw-gold-rgb),.82) !important;
    background: linear-gradient(180deg, rgba(70,53,7,.66), rgba(8,8,5,.96)) !important;
  }

  #root .adversary-content .nodewars-period-button,
  #root .adversary-content .nodewars-action-button {
    white-space: nowrap;
    border-radius: 10px !important;
    padding: 8px 13px !important;
    font-size: 10px !important;
  }

  #root .adversary-content .nodewars-action-primary {
    color: #ffde52 !important;
    border-color: rgba(var(--nw-gold-rgb),.62) !important;
  }

  #root .adversary-content .nodewars-select-all-compact {
    width: 38px;
    padding: 0 !important;
    display: grid;
    place-items: center;
    color: rgba(255,221,74,.74) !important;
  }

  #root .adversary-content .nodewars-period-menu {
    background: rgba(2,3,3,.99) !important;
    border-color: rgba(var(--nw-gold-rgb),.52) !important;
    color: #fff !important;
    box-shadow: 0 20px 60px rgba(0,0,0,.72), 0 0 16px rgba(var(--nw-gold-rgb),.08) !important;
  }

  #root .adversary-content .nodewars-period-menu button {
    background: rgba(2,3,3,.98) !important;
    color: #e9e3d3 !important;
  }

  #root .adversary-content .nodewars-period-menu button:hover {
    background: rgba(55,42,7,.70) !important;
    color: #fff0a4 !important;
  }

  #root .adversary-content .nodewars-warning-panel {
    color: #ffe493 !important;
    border-color: rgba(var(--nw-gold-rgb),.56) !important;
  }

  /* Eight separate semantic stat tiles. */
  #root .adversary-content .nodewars-summary-grid {
    display: grid !important;
    grid-template-columns: repeat(8, minmax(108px,1fr)) !important;
    gap: 8px !important;
    overflow: visible !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  #root .adversary-content .nodewars-summary-grid::before,
  #root .adversary-content .nodewars-summary-grid::after {
    display: none !important;
  }

  #root .adversary-content .nodewars-summary-stat {
    position: relative !important;
    min-height: 78px;
    overflow: hidden;
    border: 1px solid rgba(var(--nw-gold-rgb), .34) !important;
    border-radius: 13px;
    background:
      radial-gradient(circle at 18% 8%, rgba(var(--nodewars-accent-rgb), .135), transparent 52%),
      linear-gradient(145deg, rgba(13,13,11,.91), rgba(2,5,6,.92)) !important;
    box-shadow: inset 0 0 22px rgba(var(--nodewars-accent-rgb),.018), 0 7px 18px rgba(0,0,0,.22) !important;
  }

  #root .adversary-content .nodewars-summary-stat::before {
    content: '';
    position: absolute !important;
    inset: 0;
    z-index: -1 !important;
    pointer-events: none;
    opacity: .16;
    background-image:
      linear-gradient(30deg, rgba(var(--nw-gold-rgb),.10) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb),.10) 87.5%),
      linear-gradient(150deg, rgba(var(--nw-gold-rgb),.10) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb),.10) 87.5%);
    background-size: 34px 59px;
  }

  #root .adversary-content .nodewars-summary-stat::after {
    content: '';
    position: absolute !important;
    left: 13px;
    bottom: 0;
    width: 44px;
    height: 2px;
    background: linear-gradient(90deg, rgba(var(--nodewars-accent-rgb),.95), transparent);
    box-shadow: 0 0 7px rgba(var(--nodewars-accent-rgb),.22);
  }

  #root .adversary-content .nodewars-summary-stat:hover {
    border-color: rgba(var(--nw-gold-rgb), .59) !important;
    transform: translateY(-1px);
  }

  /* War rows borrow the emblem's V cuts and dark metal/gold edge language. */
  #root .adversary-content .nodewars-war-card {
    overflow: hidden !important;
    min-height: 126px;
    border-radius: 13px !important;
    border-color: rgba(var(--nw-gold-rgb), .52) !important;
    background:
      linear-gradient(180deg, rgba(7,8,7,.875), rgba(2,4,5,.91)) !important;
    box-shadow: inset 0 1px 0 rgba(255,229,100,.035), inset 0 0 26px rgba(var(--nw-gold-rgb),.015), 0 8px 21px rgba(0,0,0,.24) !important;
  }

  #root .adversary-content .nodewars-war-card:hover {
    border-color: rgba(var(--nw-gold-rgb), .88) !important;
    box-shadow: inset 0 0 30px rgba(var(--nw-gold-rgb),.028), 0 0 13px rgba(var(--nw-gold-rgb),.07), 0 10px 24px rgba(0,0,0,.28) !important;
  }

  #root .adversary-content .nodewars-war-card.nodewars-selected {
    border-color: rgba(255,218,58,.96) !important;
    box-shadow: inset 0 0 34px rgba(var(--nw-gold-rgb),.038), 0 0 15px rgba(var(--nw-gold-rgb),.10), 0 10px 25px rgba(0,0,0,.28) !important;
  }

  #root .adversary-content .nodewars-war-card::before {
    opacity: .12;
    background-image:
      linear-gradient(30deg, rgba(var(--nw-gold-rgb),.12) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb),.12) 87.5%),
      linear-gradient(150deg, rgba(var(--nw-gold-rgb),.12) 12%, transparent 12.5%, transparent 87%, rgba(var(--nw-gold-rgb),.12) 87.5%);
    background-size: 40px 69px;
  }

  #root .adversary-content .nodewars-card-glow {
    position: absolute !important;
    z-index: -2 !important;
  }

  #root .adversary-content .nodewars-war-card .nodewars-emblem-shard {
    position: absolute !important;
    z-index: 0 !important;
    right: 54px;
    top: -34px;
    width: 170px;
    height: 150px;
    opacity: .055;
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    transform: rotate(-18deg);
    filter: saturate(1.2) contrast(1.1);
    pointer-events: none;
  }

  #root .adversary-content .nodewars-war-date {
    position: relative !important;
    border-right: 1px solid rgba(var(--nw-gold-rgb), .17);
    background:
      radial-gradient(circle at 24% 16%, rgba(var(--nw-gold-rgb),.13), transparent 52%),
      linear-gradient(145deg, rgba(31,25,6,.70), rgba(3,5,5,.34)) !important;
  }

  #root .adversary-content .nodewars-war-date::after {
    content: '';
    position: absolute !important;
    left: 0;
    top: 0;
    width: 19px;
    height: 19px;
    background: linear-gradient(135deg, #ffdd43 0 40%, rgba(var(--nw-gold-rgb),.30) 41% 55%, transparent 56%);
    filter: drop-shadow(0 0 6px rgba(var(--nw-gold-rgb),.20));
  }

  #root .adversary-content .nodewars-date-icon {
    border: 1px solid rgba(var(--nw-gold-rgb),.28) !important;
    background: rgba(66,50,4,.28) !important;
    color: #f5c51e !important;
    box-shadow: inset 0 0 12px rgba(var(--nw-gold-rgb),.05) !important;
  }

  #root .adversary-content .nodewars-kd-badge {
    border-color: rgba(var(--nw-gold-rgb),.48) !important;
    background: rgba(64,47,4,.34) !important;
    color: #ffd847 !important;
  }

  #root .adversary-content .nodewars-enemy-pill {
    min-width: 0 !important;
    height: 27px !important;
    border-color: rgba(var(--nw-gold-rgb),.22) !important;
    background: rgba(1,3,4,.78) !important;
  }

  #root .adversary-content .nodewars-metrics-divider {
    background: linear-gradient(90deg, rgba(var(--nw-gold-rgb),.20), rgba(var(--nw-gold-rgb),.065), transparent) !important;
  }

  #root .adversary-content .nodewars-war-metrics {
    display: grid !important;
    grid-template-columns: repeat(8, minmax(84px,1fr)) !important;
    gap: 8px !important;
  }

  #root .adversary-content .nodewars-open-controls {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 24px;
  }

  #root .adversary-content .nodewars-select-toggle {
    width: 19px !important;
    height: 19px !important;
    min-width: 19px;
    border-radius: 6px !important;
    opacity: .22;
    border-color: rgba(var(--nw-gold-rgb),.35) !important;
    background: rgba(1,3,4,.75) !important;
    transition: opacity .16s ease, border-color .16s ease, box-shadow .16s ease;
  }

  #root .adversary-content .nodewars-war-card:hover .nodewars-select-toggle,
  #root .adversary-content .nodewars-selected .nodewars-select-toggle {
    opacity: .88;
  }

  #root .adversary-content .nodewars-select-toggle input {
    width: 13px !important;
    height: 13px !important;
    accent-color: #e8b900 !important;
  }

  #root .adversary-content .nodewars-open-chevron {
    position: relative;
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 11px;
    color: #ffd93f;
    border: 1px solid rgba(var(--nw-gold-rgb),.56);
    background: linear-gradient(135deg, rgba(73,55,5,.54), rgba(3,5,5,.94));
    box-shadow: inset 0 0 13px rgba(var(--nw-gold-rgb),.045), 0 0 9px rgba(var(--nw-gold-rgb),.055);
  }

  #root .adversary-content .nodewars-open-chevron::before,
  #root .adversary-content .nodewars-open-chevron::after {
    content: '';
    position: absolute;
    width: 9px;
    height: 9px;
    border-color: rgba(255,222,71,.64);
    pointer-events: none;
  }

  #root .adversary-content .nodewars-open-chevron::before {
    left: -1px;
    top: -1px;
    border-left: 1px solid;
    border-top: 1px solid;
  }

  #root .adversary-content .nodewars-open-chevron::after {
    right: -1px;
    bottom: -1px;
    border-right: 1px solid;
    border-bottom: 1px solid;
  }

  #root .adversary-content .nodewars-page-shell .text-slate-500,
  #root .adversary-content .nodewars-page-shell .text-slate-600 {
    color: #837f70 !important;
  }

  @media (max-width: 1500px) {
    #root .adversary-content .nodewars-filter-main {
      grid-template-columns: minmax(240px,1fr) auto;
    }
    #root .adversary-content .nodewars-actions-row {
      grid-column: 1 / -1;
      justify-content: flex-end;
    }
    #root .adversary-content .nodewars-summary-grid {
      grid-template-columns: repeat(4, minmax(120px,1fr)) !important;
    }
  }

  @media (max-width: 1180px) {
    #root .adversary-content .nodewars-sort-row { flex-wrap: wrap; }
    #root .adversary-content .nodewars-war-metrics {
      grid-template-columns: repeat(4, minmax(90px,1fr)) !important;
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
        aria-hidden="true"
        className="nodewars-emblem-shard"
        style={{ backgroundImage: `url("${adversaryEmblem}")` }}
      />

      <div
        className="nodewars-war-date relative flex min-h-[94px] flex-col justify-between overflow-hidden rounded-l-xl p-3"
      >
        <div>
          <div
            className={`nodewars-date-icon mb-2 grid h-7 w-7 place-items-center rounded-lg ${accent.iconBox}`}
          >
            <Swords size={15} />
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

            <div className="nodewars-war-metrics mt-2.5">
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

          <div className="nodewars-open-controls shrink-0">
            <div
              className="nodewars-select-toggle flex shrink-0 items-center justify-center border"
              onClick={(event) => event.stopPropagation()}
              title={checked ? 'Deselect this war' : 'Select this war'}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  event.stopPropagation();
                  onToggle();
                }}
                className="cursor-pointer"
                style={{ accentColor: '#e8b900' }}
              />
            </div>
            <div className="nodewars-open-chevron" aria-hidden="true">
              <ChevronRight size={20} strokeWidth={2.2} />
            </div>
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
    <div className="nodewars-summary-stat flex items-center gap-3 px-3.5 py-3" style={{ '--nodewars-accent-rgb': accentRgb }}>
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

      <div className="nodewars-scene">
        <div
          aria-hidden="true"
          className="nodewars-emblem-watermark"
          style={{ backgroundImage: `url("${adversaryEmblem}")` }}
        />
        <div aria-hidden="true" className="nodewars-tech-field" />
        <div aria-hidden="true" className="nodewars-circuit-field" />

        <div className="relative z-10 space-y-3">
          {/* Compact reference-style filter strip. */}
          <div
            className={`nodewars-guild-panel nodewars-filter-panel relative z-30 border transition-all duration-300 ${
              filtersVisible
                ? 'max-h-[130px] overflow-visible opacity-100 translate-y-0'
                : 'max-h-0 overflow-hidden border-transparent p-0 opacity-0 -translate-y-2'
            }`}
            style={{ '--nodewars-accent-rgb': '242, 194, 22' }}
          >
            <div className="nodewars-filter-main">
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

              <div className="nodewars-sort-row">
                <SortHeader id="time" label="Time" sort={sort} onSort={toggleSort} />
                <SortHeader id="kills" label="Kills" sort={sort} onSort={toggleSort} />
                <SortHeader id="deaths" label="Deaths" sort={sort} onSort={toggleSort} />
                <SortHeader id="kd" label="K/D" sort={sort} onSort={toggleSort} />
                <SortHeader id="damageDealt" label="Damage" sort={sort} onSort={toggleSort} />
                <SortHeader id="damageTaken" label="Taken" sort={sort} onSort={toggleSort} />
                <SortHeader id="ccHits" label="CC" sort={sort} onSort={toggleSort} />
                <SortHeader id="fortDamage" label="Fort" sort={sort} onSort={toggleSort} />
              </div>

              <div className="nodewars-actions-row">
                <button
                  type="button"
                  onClick={selectDisplayedLogs}
                  className="nodewars-action-button nodewars-select-all-compact border font-black transition"
                  title={exactDisplayedSelection ? 'Clear displayed selection' : `Select all ${rows.length} displayed wars`}
                  aria-label={exactDisplayedSelection ? 'Clear displayed selection' : 'Select displayed wars'}
                >
                  <Swords size={15} />
                </button>

                <button
                  type="button"
                  onClick={openSelectedOverview}
                  className="nodewars-action-button nodewars-action-primary border font-black transition"
                >
                  Open Overview
                </button>

                <PeriodSelect
                  value={periodDays}
                  onChange={onPeriodChange}
                  loading={loading}
                />
              </div>
            </div>
          </div>

          {(warning || externalWarning) && (
            <div
              className="nodewars-guild-panel nodewars-warning-panel rounded-xl border px-4 py-3 text-sm font-bold text-amber-200"
              style={{ '--nodewars-accent-rgb': '245, 158, 11' }}
            >
              {warning || externalWarning}
            </div>
          )}

          {/* Eight separate tiles, exactly like the reference row. */}
          <div className="nodewars-summary-grid">
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
              valueClass={Number(totals.kd) >= 1 ? 'text-emerald-400' : 'text-rose-400'}
              barClass={Number(totals.kd) >= 1 ? 'bg-emerald-400' : 'bg-rose-400'}
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
          </div>

          {/* War list. */}
          <div
            onScroll={handleWarsListScroll}
            className={`${filtersVisible ? 'max-h-[calc(100vh-260px)]' : 'max-h-[calc(100vh-190px)]'} space-y-2 overflow-auto px-1 py-1 transition-[max-height] duration-300 ${scrollCls}`}
          >
            {loading && !rows.length ? (
              <div className="nodewars-guild-panel rounded-xl border px-4 py-12 text-center text-sm font-bold text-slate-400">
                Loading node wars...
              </div>
            ) : !rows.length ? (
              <div className="nodewars-guild-panel rounded-xl border px-4 py-12 text-center text-sm font-bold text-slate-400">
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
      </div>
    </Panel>
  );
}
