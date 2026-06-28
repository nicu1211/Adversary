import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Bubble, getElementAtEvent } from 'react-chartjs-2';
import { Panel, Metric, Popup } from '../components/UI';
import { KillDeathChart } from '../components/Charts';
import {
  add,
  scrollCls,
  calculateKillFeed,
  calculateStreaks,
  calculateStats,
} from '../lib/logUtils';

ChartJS.register(LinearScale, PointElement, ChartTooltip, Legend);


const OVERVIEW_GUILD_PANEL_CSS = `
  .overview-guild-page {
    --overview-glass-dark: rgba(2, 6, 23, 0.60);
  }

  .overview-guild-page .overview-guild-panel {
    --overview-panel-accent-rgb: 59, 130, 246;
    position: relative;
    border-color: transparent !important;
    background-color: var(--overview-glass-dark) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--overview-panel-accent-rgb), 0.22) 0%,
        rgba(var(--overview-panel-accent-rgb), 0.105) 42%,
        rgba(var(--overview-panel-accent-rgb), 0.038) 74%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--overview-panel-accent-rgb), 0.085) 0%,
        rgba(7, 13, 29, 0.52) 54%,
        rgba(2, 6, 23, 0.66) 100%
      ) !important;
    -webkit-backdrop-filter: blur(8px) saturate(118%);
    backdrop-filter: blur(8px) saturate(118%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      inset 0 -1px 0 rgba(var(--overview-panel-accent-rgb), 0.14),
      0 14px 34px rgba(0, 0, 0, 0.24) !important;
    transition:
      background-image 180ms ease,
      box-shadow 180ms ease,
      filter 180ms ease,
      transform 180ms ease;
  }

  .overview-guild-page .overview-guild-panel:hover {
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--overview-panel-accent-rgb), 0.30) 0%,
        rgba(var(--overview-panel-accent-rgb), 0.145) 44%,
        rgba(var(--overview-panel-accent-rgb), 0.052) 76%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--overview-panel-accent-rgb), 0.11) 0%,
        rgba(7, 13, 29, 0.49) 54%,
        rgba(2, 6, 23, 0.63) 100%
      ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      inset 0 -1px 0 rgba(var(--overview-panel-accent-rgb), 0.20),
      0 0 22px rgba(var(--overview-panel-accent-rgb), 0.20),
      0 16px 36px rgba(0, 0, 0, 0.26) !important;
  }

  .overview-guild-page .overview-accent-amber {
    --overview-panel-accent-rgb: 245, 158, 11;
  }

  .overview-guild-page .overview-accent-blue {
    --overview-panel-accent-rgb: 59, 130, 246;
  }

  .overview-guild-page .overview-accent-violet {
    --overview-panel-accent-rgb: 139, 92, 246;
  }

  .overview-guild-page .overview-accent-cyan {
    --overview-panel-accent-rgb: 6, 182, 212;
  }

  .overview-guild-page .overview-accent-rose {
    --overview-panel-accent-rgb: 244, 63, 94;
  }

  .overview-guild-page .overview-accent-orange {
    --overview-panel-accent-rgb: 249, 115, 22;
  }

  .overview-guild-page .overview-summary-panel > div:last-child > div,
  .overview-guild-page .overview-summary-panel [class*="rounded"][class*="border"] {
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.58) !important;
    -webkit-backdrop-filter: blur(6px) saturate(116%);
    backdrop-filter: blur(6px) saturate(116%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.04),
      0 10px 24px rgba(0, 0, 0, 0.18);
  }

  .overview-guild-page .overview-chart-shell {
    overflow: visible;
    border-radius: 24px;
  }

  .overview-guild-page .overview-chart-shell > :is(div, section, article) {
    border-color: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
  }

  .overview-guild-page .overview-panel-transparent,
  .overview-guild-page .overview-panel-transparent:hover {
    border-color: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
  }

  .overview-guild-page .overview-summary-panel .overview-metric-card {
    --overview-metric-rgb: 59, 130, 246;
    border-color: transparent !important;
    background-color: rgba(var(--overview-metric-rgb), 0.17) !important;
    background-image:
      radial-gradient(
        ellipse at 16% 2%,
        rgba(var(--overview-metric-rgb), 0.62) 0%,
        rgba(var(--overview-metric-rgb), 0.34) 40%,
        rgba(var(--overview-metric-rgb), 0.18) 70%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--overview-metric-rgb), 0.34) 0%,
        rgba(var(--overview-metric-rgb), 0.20) 48%,
        rgba(2, 6, 23, 0.58) 100%
      ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.075),
      inset 0 -1px 0 rgba(var(--overview-metric-rgb), 0.28),
      0 0 18px rgba(var(--overview-metric-rgb), 0.14),
      0 10px 24px rgba(0, 0, 0, 0.20) !important;
    -webkit-backdrop-filter: blur(7px) saturate(132%);
    backdrop-filter: blur(7px) saturate(132%);
    transition: background-image 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  }

  .overview-guild-page .overview-summary-panel .overview-metric-card:hover {
    background-color: rgba(var(--overview-metric-rgb), 0.21) !important;
    background-image:
      radial-gradient(
        ellipse at 16% 2%,
        rgba(var(--overview-metric-rgb), 0.72) 0%,
        rgba(var(--overview-metric-rgb), 0.42) 42%,
        rgba(var(--overview-metric-rgb), 0.22) 72%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--overview-metric-rgb), 0.40) 0%,
        rgba(var(--overview-metric-rgb), 0.24) 50%,
        rgba(2, 6, 23, 0.54) 100%
      ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.10),
      inset 0 -1px 0 rgba(var(--overview-metric-rgb), 0.34),
      0 0 24px rgba(var(--overview-metric-rgb), 0.24),
      0 12px 26px rgba(0, 0, 0, 0.23) !important;
    transform: translateY(-1px);
  }

  .overview-guild-page .overview-metric-blue { --overview-metric-rgb: 59, 130, 246; }
  .overview-guild-page .overview-metric-red { --overview-metric-rgb: 244, 63, 94; }
  .overview-guild-page .overview-metric-emerald { --overview-metric-rgb: 34, 197, 94; }
  .overview-guild-page .overview-metric-purple { --overview-metric-rgb: 168, 85, 247; }
  .overview-guild-page .overview-metric-sky { --overview-metric-rgb: 56, 189, 248; }
  .overview-guild-page .overview-metric-orange { --overview-metric-rgb: 249, 115, 22; }
  .overview-guild-page .overview-metric-yellow { --overview-metric-rgb: 250, 204, 21; }
  .overview-guild-page .overview-metric-brown { --overview-metric-rgb: 180, 83, 9; }

  .overview-guild-page .overview-battle-metric {
    --overview-battle-rgb: 59, 130, 246;
    position: relative;
    min-width: 0;
    min-height: 136px;
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid rgba(var(--overview-battle-rgb), 0.18) !important;
    background:
      radial-gradient(
        ellipse at 18% 0%,
        rgba(var(--overview-battle-rgb), 0.34) 0%,
        rgba(var(--overview-battle-rgb), 0.16) 40%,
        rgba(var(--overview-battle-rgb), 0.055) 70%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--overview-battle-rgb), 0.15) 0%,
        rgba(var(--overview-battle-rgb), 0.075) 48%,
        rgba(2, 6, 23, 0.72) 100%
      ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.055),
      inset 0 -1px 0 rgba(var(--overview-battle-rgb), 0.16),
      0 0 16px rgba(var(--overview-battle-rgb), 0.09),
      0 12px 26px rgba(0, 0, 0, 0.22) !important;
    -webkit-backdrop-filter: blur(8px) saturate(122%);
    backdrop-filter: blur(8px) saturate(122%);
    transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
  }

  .overview-guild-page .overview-battle-metric:hover {
    background:
      radial-gradient(
        ellipse at 18% 0%,
        rgba(var(--overview-battle-rgb), 0.43) 0%,
        rgba(var(--overview-battle-rgb), 0.21) 42%,
        rgba(var(--overview-battle-rgb), 0.075) 72%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--overview-battle-rgb), 0.19) 0%,
        rgba(var(--overview-battle-rgb), 0.095) 50%,
        rgba(2, 6, 23, 0.69) 100%
      ) !important;
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.075),
      inset 0 -1px 0 rgba(var(--overview-battle-rgb), 0.21),
      0 0 21px rgba(var(--overview-battle-rgb), 0.15),
      0 14px 30px rgba(0, 0, 0, 0.25) !important;
  }

  /* Same metric palette used by Player Overview. */
  .overview-guild-page .overview-battle-blue { --overview-battle-rgb: 59, 130, 246; }
  .overview-guild-page .overview-battle-pink { --overview-battle-rgb: 236, 72, 153; }
  .overview-guild-page .overview-battle-red { --overview-battle-rgb: 244, 63, 94; }
  .overview-guild-page .overview-battle-emerald { --overview-battle-rgb: 16, 185, 129; }
  .overview-guild-page .overview-battle-violet { --overview-battle-rgb: 139, 92, 246; }
  .overview-guild-page .overview-battle-cyan { --overview-battle-rgb: 6, 182, 212; }
  .overview-guild-page .overview-battle-rose { --overview-battle-rgb: 244, 63, 94; }
  .overview-guild-page .overview-battle-amber { --overview-battle-rgb: 245, 158, 11; }

  .overview-guild-page .overview-kill-feed-panel {
    overflow: visible !important;
    padding-top: 10px !important;
  }

  .overview-guild-page .overview-kill-feed-panel > div {
    min-height: 0;
    overflow: visible !important;
  }

  .overview-guild-page .overview-kill-feed-panel .overview-section-header {
    z-index: 3;
    display: flex;
    min-height: 52px;
    flex: 0 0 auto;
    align-items: center;
    overflow: visible !important;
    padding-top: 11px !important;
    padding-bottom: 11px !important;
  }

  .overview-guild-page .overview-kill-feed-panel .overview-section-header h3 {
    display: block;
    overflow: visible !important;
    line-height: 1.25 !important;
    white-space: nowrap;
  }

  .overview-guild-page .overview-kill-feed-panel .overview-player-name-chip {
    display: inline-flex;
    min-height: 24px;
    max-width: calc(100% - 54px);
    align-items: center;
    overflow: hidden;
    line-height: 1.2 !important;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .overview-guild-page .overview-average-rank-row,
  .overview-guild-page .overview-kill-feed-row {
    --overview-name-rgb: 59, 130, 246;
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.42) !important;
    background-image:
      radial-gradient(
        ellipse at 7% 0%,
        rgba(var(--overview-name-rgb), 0.18) 0%,
        rgba(var(--overview-name-rgb), 0.075) 44%,
        transparent 76%
      ),
      linear-gradient(145deg, rgba(var(--overview-name-rgb), 0.045), rgba(2, 6, 23, 0.48) 68%) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      0 8px 20px rgba(0, 0, 0, 0.14);
    transition: background-image 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .overview-guild-page .overview-average-rank-row:hover,
  .overview-guild-page .overview-kill-feed-row:hover {
    background-image:
      radial-gradient(
        ellipse at 7% 0%,
        rgba(var(--overview-name-rgb), 0.25) 0%,
        rgba(var(--overview-name-rgb), 0.11) 46%,
        transparent 78%
      ),
      linear-gradient(145deg, rgba(var(--overview-name-rgb), 0.065), rgba(2, 6, 23, 0.46) 68%) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 16px rgba(var(--overview-name-rgb), 0.14),
      0 9px 22px rgba(0, 0, 0, 0.16);
    transform: translateY(-1px);
  }

  .overview-guild-page .overview-player-name-chip {
    color: rgb(var(--overview-name-rgb));
    background: rgba(var(--overview-name-rgb), 0.12);
    box-shadow: inset 0 0 0 1px rgba(var(--overview-name-rgb), 0.22);
  }

  .overview-guild-page .overview-average-rank-row > div:last-child > div {
    background-color: rgba(var(--overview-name-rgb), 0.055) !important;
    box-shadow: inset 0 0 0 1px rgba(var(--overview-name-rgb), 0.075);
  }

  .overview-guild-page .overview-soft-surface {
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.44) !important;
    background-image: linear-gradient(
      145deg,
      rgba(var(--overview-panel-accent-rgb), 0.055),
      rgba(2, 6, 23, 0.52) 68%
    ) !important;
    -webkit-backdrop-filter: blur(5px);
    backdrop-filter: blur(5px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      0 8px 20px rgba(0, 0, 0, 0.16);
  }

  .overview-guild-page .overview-section-header {
    --overview-header-rgb: 59, 130, 246;
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    padding: 12px 15px;
    color: #ffffff !important;
    border: 1px solid rgba(var(--overview-header-rgb), 0.24) !important;
    border-left: 4px solid rgba(var(--overview-header-rgb), 0.92) !important;
    background:
      radial-gradient(
        ellipse at 9% 0%,
        rgba(var(--overview-header-rgb), 0.78) 0%,
        rgba(var(--overview-header-rgb), 0.40) 34%,
        rgba(var(--overview-header-rgb), 0.18) 62%,
        transparent 82%
      ),
      linear-gradient(
        105deg,
        rgba(var(--overview-header-rgb), 0.34) 0%,
        rgba(var(--overview-header-rgb), 0.18) 42%,
        rgba(2, 6, 23, 0.68) 78%,
        rgba(2, 6, 23, 0.52) 100%
      ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.09),
      inset 0 -1px 0 rgba(var(--overview-header-rgb), 0.28),
      0 0 20px rgba(var(--overview-header-rgb), 0.13),
      0 8px 22px rgba(0, 0, 0, 0.16) !important;
  }

  .overview-guild-page .overview-section-header h2,
  .overview-guild-page .overview-section-header h3 {
    color: #ffffff !important;
    text-shadow: 0 0 18px rgba(var(--overview-header-rgb), 0.28);
  }

  .overview-guild-page .overview-header-amber { --overview-header-rgb: 245, 158, 11; }
  .overview-guild-page .overview-header-blue { --overview-header-rgb: 59, 130, 246; }
  .overview-guild-page .overview-header-violet { --overview-header-rgb: 139, 92, 246; }
  .overview-guild-page .overview-header-cyan { --overview-header-rgb: 6, 182, 212; }
  .overview-guild-page .overview-header-rose { --overview-header-rgb: 244, 63, 94; }
  .overview-guild-page .overview-header-orange { --overview-header-rgb: 249, 115, 22; }

  .overview-guild-page .overview-chart-shell :is(h1, h2, h3) {
    display: inline-flex;
    align-items: center;
    min-height: 42px;
    margin: 0 0 12px !important;
    padding: 9px 15px;
    border-radius: 16px;
    color: #ffffff !important;
    border: 1px solid rgba(59, 130, 246, 0.30) !important;
    border-left: 4px solid rgba(59, 130, 246, 0.95) !important;
    background:
      radial-gradient(ellipse at 10% 0%, rgba(59, 130, 246, 0.78), rgba(59, 130, 246, 0.34) 38%, rgba(59, 130, 246, 0.12) 66%, transparent 84%),
      linear-gradient(105deg, rgba(59, 130, 246, 0.32), rgba(59, 130, 246, 0.16) 46%, rgba(2, 6, 23, 0.66) 82%) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.09),
      inset 0 -1px 0 rgba(59, 130, 246, 0.26),
      0 0 18px rgba(59, 130, 246, 0.13) !important;
  }

  .overview-player-performance-overlay {
    position: fixed !important;
    inset: 0 !important;
    z-index: 12000 !important;
    display: flex !important;
    align-items: flex-start !important;
    justify-content: center !important;
    min-width: 100vw !important;
    min-height: 100vh !important;
    padding: clamp(18px, 3.2vh, 34px) clamp(8px, 1.4vw, 20px) 18px !important;
    background: rgba(2, 6, 23, 0.48) !important;
    overscroll-behavior: contain;
    touch-action: pan-y;
    -webkit-backdrop-filter: blur(14px) saturate(112%) !important;
    backdrop-filter: blur(14px) saturate(112%) !important;
    will-change: backdrop-filter;
  }

  .overview-player-performance-dialog {
    --overview-popup-rgb: 59, 130, 246;
    position: relative !important;
    inset: auto !important;
    width: min(97vw, 1520px) !important;
    max-width: 1520px !important;
    height: 94vh !important;
    max-height: 94vh !important;
    margin: 0 auto !important;
    transform: translateY(-1.4vh) !important;
    color: #ffffff !important;
    border-color: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
  }

  .overview-player-performance-dialog > div:first-of-type {
    display: none !important;
  }

  .overview-player-performance-dialog > div:nth-of-type(2) {
    border-radius: 24px !important;
    border: 0 !important;
    background:
      radial-gradient(
        ellipse at 12% 0%,
        rgba(59, 130, 246, 0.26) 0%,
        rgba(59, 130, 246, 0.12) 42%,
        transparent 76%
      ),
      linear-gradient(
        110deg,
        rgba(8, 20, 45, 0.94),
        rgba(2, 6, 23, 0.93) 54%,
        rgba(34, 16, 60, 0.90)
      ) !important;
    -webkit-backdrop-filter: blur(16px) saturate(120%);
    backdrop-filter: blur(16px) saturate(120%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      inset 0 -1px 0 rgba(59, 130, 246, 0.18),
      0 0 24px rgba(59, 130, 246, 0.14),
      0 22px 64px rgba(0, 0, 0, 0.52) !important;
  }

  .overview-player-performance-dialog > div:last-child {
    background: transparent !important;
    padding-top: 17px !important;
    padding-left: 10px !important;
    padding-right: 10px !important;
  }

  .overview-player-performance-dialog > div:nth-of-type(2) {
    min-height: 72px !important;
    padding: 15px 21px !important;
  }

  .overview-player-performance-dialog > div:nth-of-type(2) h3 {
    font-size: 1.28rem !important;
  }

  .overview-player-performance-dialog > div:nth-of-type(2) button {
    width: 40px !important;
    height: 40px !important;
  }

  .overview-player-performance-dialog [class*="text-black"],
  .overview-player-performance-dialog [class*="text-slate-950"],
  .overview-player-performance-dialog [class*="text-gray-950"],
  .overview-player-performance-dialog [class*="text-zinc-950"],
  .overview-player-performance-dialog [class*="text-neutral-950"] {
    color: #ffffff !important;
  }

  .overview-player-performance-dialog .overview-popup-shell {
    border-color: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
  }

  .overview-player-performance-dialog .overview-popup-card,
  .overview-player-performance-dialog .overview-popup-section {
    --overview-popup-card-rgb: 59, 130, 246;
    border-color: transparent !important;
    background-color: rgba(2, 6, 23, 0.24) !important;
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--overview-popup-card-rgb), 0.15) 0%,
        rgba(var(--overview-popup-card-rgb), 0.065) 42%,
        rgba(var(--overview-popup-card-rgb), 0.020) 74%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--overview-popup-card-rgb), 0.050) 0%,
        rgba(7, 13, 29, 0.24) 54%,
        rgba(2, 6, 23, 0.32) 100%
      ) !important;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.045),
      inset 0 -1px 0 rgba(var(--overview-popup-card-rgb), 0.10),
      0 8px 20px rgba(0, 0, 0, 0.18) !important;
    transition:
      background-image 180ms ease,
      box-shadow 180ms ease,
      filter 180ms ease,
      transform 180ms ease;
  }

  .overview-player-performance-dialog .overview-popup-card:hover,
  .overview-player-performance-dialog .overview-popup-section:hover {
    background-image:
      radial-gradient(
        ellipse at 14% 0%,
        rgba(var(--overview-popup-card-rgb), 0.23) 0%,
        rgba(var(--overview-popup-card-rgb), 0.105) 44%,
        rgba(var(--overview-popup-card-rgb), 0.035) 76%,
        transparent 100%
      ),
      linear-gradient(
        145deg,
        rgba(var(--overview-popup-card-rgb), 0.080) 0%,
        rgba(7, 13, 29, 0.32) 54%,
        rgba(2, 6, 23, 0.43) 100%
      ) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      inset 0 -1px 0 rgba(var(--overview-popup-card-rgb), 0.14),
      0 0 16px rgba(var(--overview-popup-card-rgb), 0.16),
      0 9px 22px rgba(0, 0, 0, 0.20) !important;
    transform: translateY(-1px);
  }

  .overview-player-performance-dialog .overview-popup-card {
    min-height: 53px !important;
    padding: 7px 9px !important;
    border-radius: 12px !important;
  }

  .overview-player-performance-dialog .overview-popup-card p {
    margin-top: 0 !important;
    margin-bottom: 1px !important;
    line-height: 1.05 !important;
  }

  .overview-player-performance-dialog .overview-popup-card p[class*="text-lg"] {
    font-size: 0.88rem !important;
  }

  .overview-player-performance-dialog .overview-popup-card p[class*="text-sm"] {
    font-size: 0.76rem !important;
  }

  .overview-player-performance-dialog .overview-popup-card span[class*="text-\[9px\]"] {
    font-size: 0.53rem !important;
  }

  .overview-player-performance-dialog .overview-popup-section {
    margin-bottom: 9px !important;
    border-radius: 14px !important;
  }

  .overview-player-performance-dialog .overview-popup-section > div:first-child {
    padding: 8px 10px !important;
    background: rgba(2, 6, 23, 0.18) !important;
  }

  .overview-player-performance-dialog .overview-popup-section th {
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  .overview-player-performance-dialog .overview-popup-section td {
    padding-top: 8px !important;
    padding-bottom: 8px !important;
  }

  .overview-player-performance-dialog .overview-popup-card-blue,
  .overview-player-performance-dialog .overview-popup-accent-blue {
    --overview-popup-card-rgb: 59, 130, 246;
  }

  .overview-player-performance-dialog .overview-popup-card-pink {
    --overview-popup-card-rgb: 236, 72, 153;
  }

  .overview-player-performance-dialog .overview-popup-card-red {
    --overview-popup-card-rgb: 239, 68, 68;
  }

  .overview-player-performance-dialog .overview-popup-card-rose,
  .overview-player-performance-dialog .overview-popup-accent-rose {
    --overview-popup-card-rgb: 244, 63, 94;
  }

  .overview-player-performance-dialog .overview-popup-card-emerald {
    --overview-popup-card-rgb: 34, 197, 94;
  }

  .overview-player-performance-dialog .overview-popup-card-slate {
    --overview-popup-card-rgb: 148, 163, 184;
  }

  .overview-player-performance-dialog .overview-popup-card-orange {
    --overview-popup-card-rgb: 249, 115, 22;
  }

  .overview-player-performance-dialog .overview-popup-card-cyan,
  .overview-player-performance-dialog .overview-popup-accent-cyan {
    --overview-popup-card-rgb: 6, 182, 212;
  }

  .overview-player-performance-dialog .overview-popup-card-violet,
  .overview-player-performance-dialog .overview-popup-accent-violet {
    --overview-popup-card-rgb: 139, 92, 246;
  }

  .overview-player-performance-dialog .overview-popup-card-amber {
    --overview-popup-card-rgb: 245, 158, 11;
  }

  .overview-player-performance-dialog thead {
    color: #ffffff !important;
    background: rgba(2, 6, 23, 0.92) !important;
  }

  .overview-enemy-guild-tooltip {
    --enemy-tooltip-rgb: 59, 130, 246;
    position: fixed;
    z-index: 15000;
    width: 292px;
    pointer-events: none;
    overflow: hidden;
    border-radius: 18px;
    color: #f8fafc;
    border: 1px solid rgba(var(--enemy-tooltip-rgb), 0.28);
    background:
      radial-gradient(ellipse at 12% 0%, rgba(var(--enemy-tooltip-rgb), 0.34), rgba(var(--enemy-tooltip-rgb), 0.13) 42%, transparent 74%),
      linear-gradient(145deg, rgba(7, 13, 29, 0.96), rgba(2, 6, 23, 0.97));
    -webkit-backdrop-filter: blur(16px) saturate(125%);
    backdrop-filter: blur(16px) saturate(125%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.07),
      inset 0 -1px 0 rgba(var(--enemy-tooltip-rgb), 0.16),
      0 0 24px rgba(var(--enemy-tooltip-rgb), 0.16),
      0 22px 60px rgba(0, 0, 0, 0.52);
    opacity: 0;
    transform: translateY(5px) scale(0.985);
    transition: opacity 120ms ease, transform 120ms ease;
  }

  .overview-enemy-guild-tooltip[data-visible="true"] {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .overview-enemy-guild-tooltip__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px 10px;
    background: linear-gradient(100deg, rgba(var(--enemy-tooltip-rgb), 0.22), rgba(2, 6, 23, 0.24));
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .overview-enemy-guild-tooltip__name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    line-height: 1.1;
    font-weight: 900;
    color: #ffffff;
  }

  .overview-enemy-guild-tooltip__badge {
    flex: 0 0 auto;
    border-radius: 9px;
    padding: 4px 7px;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgb(var(--enemy-tooltip-rgb));
    background: rgba(var(--enemy-tooltip-rgb), 0.13);
    box-shadow: inset 0 0 0 1px rgba(var(--enemy-tooltip-rgb), 0.24);
  }

  .overview-enemy-guild-tooltip__section-label {
    padding: 10px 13px 0;
    font-size: 8px;
    line-height: 1;
    font-weight: 900;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #64748b;
  }

  .overview-enemy-guild-tooltip__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
    padding: 7px 12px 10px;
  }

  .overview-enemy-guild-tooltip__grid--averages {
    padding-top: 7px;
    padding-bottom: 12px;
  }

  .overview-enemy-guild-tooltip__stat {
    min-width: 0;
    border-radius: 11px;
    padding: 8px 7px;
    text-align: center;
    background:
      radial-gradient(
        ellipse at 20% 0%,
        rgba(var(--enemy-tooltip-rgb), 0.14),
        rgba(var(--enemy-tooltip-rgb), 0.055) 56%,
        transparent 82%
      ),
      rgba(2, 6, 23, 0.42);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.035),
      inset 0 0 0 1px rgba(var(--enemy-tooltip-rgb), 0.09);
  }

  .overview-enemy-guild-tooltip__grid--averages .overview-enemy-guild-tooltip__stat {
    background:
      radial-gradient(
        ellipse at 20% 0%,
        rgba(var(--enemy-tooltip-rgb), 0.10),
        rgba(var(--enemy-tooltip-rgb), 0.035) 58%,
        transparent 84%
      ),
      rgba(2, 6, 23, 0.32);
  }

  .overview-enemy-guild-tooltip__label {
    display: block;
    margin-bottom: 3px;
    font-size: 8px;
    line-height: 1;
    font-weight: 900;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #64748b;
  }

  .overview-enemy-guild-tooltip__value {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    line-height: 1.1;
    font-weight: 900;
    color: #f8fafc;
  }

  .overview-enemy-guild-tooltip__value--kills { color: #67e8f9; }
  .overview-enemy-guild-tooltip__value--deaths { color: #fda4af; }
  .overview-enemy-guild-tooltip__value--kd { color: rgb(var(--enemy-tooltip-rgb)); }

  .overview-enemy-guild-tooltip__value--average {
    color: #e2e8f0;
  }

  .overview-enemy-guild-tooltip__value--average-kills {
    color: #a5f3fc;
  }

  .overview-enemy-guild-tooltip__value--average-deaths {
    color: #fecdd3;
  }

  @media (max-width: 640px) {
    .overview-player-performance-dialog {
      width: 95vw !important;
      max-width: 95vw !important;
      height: auto !important;
      max-height: 91vh !important;
      border-radius: 20px !important;
      transform: translateY(-0.5vh) !important;
    }
  }
`;

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

function MetricGlyph({ type, color }) {
  const commonProps = {
    width: '1em',
    height: '1em',
    viewBox: '-10 -10 20 20',
    style: {
      display: 'inline-block',
      verticalAlign: '-0.12em',
      filter: `drop-shadow(0 0 0.22em ${color})`,
    },
    'aria-hidden': true,
  };

  const darkStroke = 'rgba(2,6,23,0.96)';

  if (type === 'kills') {
    return (
      <svg {...commonProps}>
        <path
          d="M -7.5 6.8 L -5.3 8.2 L 7.5 -5.9 L 5.9 -7.5 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <path
          d="M -7.8 -6.4 L -6.4 -7.8 L 7.8 6.4 L 6.4 7.8 Z"
          fill={color}
          opacity="0.75"
          stroke={darkStroke}
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        <path
          d="M -4.6 4.1 L -7.2 7.2 M 4.6 4.1 L 7.2 7.2"
          stroke={darkStroke}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'deaths') {
    return (
      <svg {...commonProps}>
        <g transform="scale(0.86)">
          <path
            d="M 0 -8.6
               C -5.2 -8.6 -8.2 -5.3 -8.2 -1.1
               C -8.2 2.2 -6.3 4.2 -3.8 5.1
               L -3.8 7.5
               L -2.1 7.5
               L -2.1 5.9
               L -0.7 5.9
               L -0.7 7.5
               L 0.7 7.5
               L 0.7 5.9
               L 2.1 5.9
               L 2.1 7.5
               L 3.8 7.5
               L 3.8 5.1
               C 6.3 4.2 8.2 2.2 8.2 -1.1
               C 8.2 -5.3 5.2 -8.6 0 -8.6 Z"
            fill={color}
            stroke={darkStroke}
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <circle cx="-3" cy="-1.8" r="1.75" fill={darkStroke} />
          <circle cx="3" cy="-1.8" r="1.75" fill={darkStroke} />
          <path d="M 0 0.3 L -1.35 3 L 1.35 3 Z" fill={darkStroke} />
        </g>
      </svg>
    );
  }

  if (type === 'kd') {
    return (
      <svg {...commonProps}>
        <circle
          cx="0"
          cy="0"
          r="7.2"
          fill="rgba(2,6,23,0.88)"
          stroke={color}
          strokeWidth="2"
        />
        <circle cx="0" cy="0" r="3.7" fill={color} stroke={darkStroke} strokeWidth="1" />
        <path
          d="M 0 -9 L 0 -5.8 M 0 5.8 L 0 9 M -9 0 L -5.8 0 M 5.8 0 L 9 0"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'players') {
    return (
      <svg {...commonProps}>
        <circle cx="-2.8" cy="-2.2" r="2.2" fill={color} stroke={darkStroke} strokeWidth="1" />
        <circle cx="3.3" cy="-1.2" r="1.9" fill={color} opacity="0.92" stroke={darkStroke} strokeWidth="1" />
        <path
          d="M -6.4 7.2 C -6.4 4.4 -4.3 2.2 -1.7 2.2 H 0.2 C 2.9 2.2 5 4.4 5 7.2"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M 0.6 6.7 C 0.9 5 2.3 3.6 4 3.6 H 5.5 C 7 3.6 8.2 4.8 8.4 6.3"
          fill={color}
          opacity="0.9"
          stroke={darkStroke}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'damageDealt') {
    return (
      <svg {...commonProps}>
        <g transform="translate(0.1 0.15) scale(0.94)">
          <path
            d="M -9.1 7.5
               C -9.1 4.2 -8.4 1.7 -7.1 -0.1
               L -5.8 -1.9
               C -5 -3 -3.9 -3.8 -2.6 -4.4
               L 1.6 -6.4
               C 3.8 -7.5 5.9 -7.7 7.7 -7.1
               L 9 -6.6
               C 9.8 -6.3 10.2 -5.3 9.8 -4.5
               L 8.9 -2.9
               C 8.5 -2.2 7.8 -1.8 7 -1.8
               L 5.7 -1.8
               C 4.2 -1.8 3 -1.3 2.1 -0.4
               L 0.3 1.4
               L -1 2.7
               C -1.7 3.4 -1.6 4.7 -0.7 5.3
               L 0.1 5.9
               C 0.9 6.5 1.9 6.8 2.9 6.7
               L 4 6.5
               C 5.8 6.3 7.4 6.8 8.8 7.9
               L 10 8.9
               C 10.5 9.3 10.6 10.1 10.2 10.6
               L 8.9 12.2
               C 8.4 12.7 7.6 12.8 7.1 12.3
               L 5.4 10.8
               C 4.1 9.6 2.4 9 0.6 9
               L -1.5 9
               C -4.4 9 -6.8 8.6 -9.1 7.5 Z"
            fill={color}
            stroke={darkStroke}
            strokeWidth="1.05"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  }

  if (type === 'damageTaken') {
    return (
      <svg {...commonProps}>
        <path
          d="M 0 -8.4 L 7.1 -5.8 L 6.1 1.7 C 5.5 5.4 3.3 7.4 0 8.6 C -3.3 7.4 -5.5 5.4 -6.1 1.7 L -7.1 -5.8 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 0 -5.9 L 0 5.7"
          stroke={darkStroke}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    );
  }

  if (type === 'ccHits') {
    return (
      <svg {...commonProps}>
        <g transform="rotate(-18)">
          <path
            d="M -7 2.8 C -7 0.5 -5.4 -1.1 -3.1 -1.1 L -0.8 -1.1 C 0.8 -1.1 2 0.1 2 1.7 C 2 3.4 0.8 4.6 -0.8 4.6 L -2 4.6"
            fill="none"
            stroke={color}
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 7 -2.8 C 7 -0.5 5.4 1.1 3.1 1.1 L 0.8 1.1 C -0.8 1.1 -2 -0.1 -2 -1.7 C -2 -3.4 -0.8 -4.6 0.8 -4.6 L 2 -4.6"
            fill="none"
            stroke={color}
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M -0.7 -0.8 L 0.7 0.8 M -0.7 0.8 L 0.7 -0.8" stroke={darkStroke} strokeWidth="1.35" strokeLinecap="round" />
          <path d="M -1.7 -2 L -2.7 -3.1 M 1.7 2 L 2.7 3.1" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (type === 'damageToFort') {
    return (
      <svg {...commonProps}>
        <path
          d="M -7.6 -5.2 L -5.2 -5.2 L -5.2 -7.5 L -2.8 -7.5 L -2.8 -5.2 L -1.2 -5.2 L -1.2 -7.5 L 1.2 -7.5 L 1.2 -5.2 L 2.8 -5.2 L 2.8 -7.5 L 5.2 -7.5 L 5.2 -5.2 L 7.6 -5.2 L 7.6 7.5 L 4.7 7.5 L 4.7 3.6 C 4.7 1 2.6 -1.2 0 -1.2 C -2.6 -1.2 -4.7 1 -4.7 3.6 L -4.7 7.5 L -7.6 7.5 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M -1.6 7.5 L -1.6 3.8 C -1.6 2.8 -0.9 2.1 0 2.1 C 0.9 2.1 1.6 2.8 1.6 3.8 L 1.6 7.5"
          fill={darkStroke}
          opacity="0.85"
        />
      </svg>
    );
  }

  return null;
}

function BattleMetricCard({
  icon,
  label,
  value,
  sub,
  tone = 'blue',
  valueClass = 'text-white',
}) {
  return (
    <div className={`overview-battle-metric overview-battle-${tone} flex items-center gap-3 px-4 py-4`}>
      <div className="grid h-12 w-12 shrink-0 place-items-center text-[2rem]">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-tight text-slate-200">
          {label}
        </p>
        <p className={`mt-1 text-[1.75rem] font-black leading-none ${valueClass}`}>
          {value}
        </p>
        <p className="mt-1 text-[12px] font-medium text-slate-400">
          {sub}
        </p>
      </div>
    </div>
  );
}

function RankList({ title, items, valueKey }) {
  const rows = items.slice(0, 5);
  const max = Math.max(1, ...rows.map((x) => Number(x[valueKey]) || 0));

  return (
    <Panel cls="overview-guild-panel overview-accent-blue">
      <h3 className="mb-4 text-xl font-black">{title}</h3>

      {!rows.length ? (
        <p className="text-slate-500">No data yet.</p>
      ) : (
        rows.map((item, index) => {
          const value = Number(item[valueKey]) || 0;

          return (
            <div
              key={item.name}
              className="mb-4 grid grid-cols-[34px_1fr_55px] items-center gap-3 text-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 font-black">
                {index + 1}
              </span>

              <div className="min-w-0">
                <p className="mb-2 truncate font-bold">{item.name}</p>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300"
                    style={{
                      width: `${Math.max(6, Math.round((value / max) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <b className="text-right">{value}</b>
            </div>
          );
        })
      )}
    </Panel>
  );
}

function timeToSecondsValue(time) {
  const raw = String(time || '').trim();

  if (!raw) return 0;

  const parts = raw.split(':').map((part) => Number(part) || 0);

  if (parts.length === 1) return parts[0];

  if (parts.length === 2) {
    return parts[0] * 3600 + parts[1] * 60;
  }

  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function looksLikeDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

function cleanGuild(value) {
  const text = String(value || '').trim();

  if (!text || looksLikeDate(text)) return '';

  return text;
}

function normalizePlayerName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
}

function samePlayerName(left, right) {
  const a = normalizePlayerName(left);
  const b = normalizePlayerName(right);

  return Boolean(a && b && a === b);
}

function getPlayerKeyFromObject(object, playerName) {
  if (!object) return null;

  if (Object.prototype.hasOwnProperty.call(object, playerName)) {
    return playerName;
  }

  const target = normalizePlayerName(playerName);

  if (!target) return null;

  return Object.keys(object).find((key) => normalizePlayerName(key) === target) || null;
}

function getPlayerObjectValue(object, playerName, fallback = 0) {
  const key = getPlayerKeyFromObject(object, playerName);

  return key == null ? fallback : object[key];
}

function majorityGuildFromEvents(events = []) {
  const guildCounts = {};

  [...(events || [])].forEach((event) => {
    const guild = cleanGuild(event.guild);

    if (!guild) return;

    guildCounts[guild] = (guildCounts[guild] || 0) + 1;
  });

  return (
    Object.entries(guildCounts).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];

      return a[0].localeCompare(b[0]);
    })[0]?.[0] || ''
  );
}

function majorityGuildForKillFeed(feed, events = []) {
  const startSec = timeToSecondsValue(feed.start);
  const endSec = timeToSecondsValue(feed.end);
  const victims = new Set(feed.victims || []);
  const guildCounts = {};

  [...(events || [])]
    .filter((event) => {
      if (event.type !== 'kill') return false;
      if (!samePlayerName(event.killer, feed.name)) return false;

      const eventSec = timeToSecondsValue(event.time);
      const insideWindow =
        eventSec >= Math.min(startSec, endSec) &&
        eventSec <= Math.max(startSec, endSec);

      const victimMatches = !victims.size || victims.has(event.victim);

      return insideWindow && victimMatches;
    })
    .forEach((event) => {
      const guild = cleanGuild(event.guild);

      if (!guild) return;

      guildCounts[guild] = (guildCounts[guild] || 0) + 1;
    });

  const majorityGuild = Object.entries(guildCounts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];

    return a[0].localeCompare(b[0]);
  })[0]?.[0];

  return majorityGuild || cleanGuild(feed.guild) || cleanGuild(feed.war) || '-';
}

function AverageRank({
  players,
  members,
  streaks,
  feeds,
  events,
  selectedLogs,
}) {
  const [query, setQuery] = useState('');

  function eventTimeKey(event) {
    return [
      event?.date || '9999-99-99',
      String(
        Number(event?.sec) || timeToSecondsValue(event?.time),
      ).padStart(8, '0'),
      String(Number(event?.i) || 0).padStart(8, '0'),
    ].join(' ');
  }

  function feedTimeKey(feed) {
    return [
      feed?.date || '9999-99-99',
      String(timeToSecondsValue(feed?.start)).padStart(8, '0'),
      String(feed?.id || ''),
      normalizePlayerName(feed?.name),
    ].join(' ');
  }

  function statsHasTimeline(oneStats) {
    if (oneStats?.hasTimeline) return true;

    return (oneStats?.ev || []).some(
      (event) =>
        event?.hasTimestamp !== false &&
        event?.source !== 'summary' &&
        event?.time != null,
    );
  }

  function guildPlayerFromEvent(event) {
    return (
      event?.guildPlayer ||
      (event?.type === 'kill' ? event?.killer : event?.victim) ||
      ''
    );
  }

  function hasOwnMetric(source, aliases) {
    return Boolean(
      source &&
        aliases.some(
          (alias) =>
            Object.prototype.hasOwnProperty.call(source, alias) &&
            source[alias] !== undefined &&
            source[alias] !== null &&
            source[alias] !== '',
        ),
    );
  }

  function readMetric(source, aliases, fallback = 0) {
    if (!source) return fallback;

    const alias = aliases.find(
      (key) =>
        Object.prototype.hasOwnProperty.call(source, key) &&
        source[key] !== undefined &&
        source[key] !== null &&
        source[key] !== '',
    );

    return alias == null ? fallback : Number(source[alias]) || 0;
  }

  const metricAliases = {
    feed: ['killFeed', 'feed', 'killStreak'],
    damageDealt: [
      'damageDealt',
      'damage_dealt',
      'damage dealt',
      'damageDone',
      'damage',
    ],
    damageTaken: [
      'damageTaken',
      'damage_taken',
      'damage taken',
      'Damage Taken',
    ],
    ccHits: [
      'ccHits',
      'cc_hits',
      'cc hits',
      'CC Hits',
      'cc',
      'CC',
    ],
    fortDamage: [
      'fortDamage',
      'damageToFort',
      'damage_to_fort',
      'damage to fort',
      'Fort Damage',
    ],
  };

  function getOriginalLogRaw(log) {
    return String(
      log?.raw ??
        log?.rawLog ??
        log?.raw_log ??
        log?.log ??
        log?.content ??
        log?._src?.raw ??
        log?._src?.rawLog ??
        log?._src?.raw_log ??
        log?._src?.log ??
        log?._src?.content ??
        '',
    );
  }

  function splitPresenceColumns(line) {
    const value = String(line || '').trim();

    if (!value) return [];

    const separated = [
      value.split(/\t+/),
      value.split(/\s*\|\s*/),
      value.split(/\s*;\s*/),
    ]
      .filter((parts) => parts.length > 1)
      .map((parts) =>
        parts.map((part) => part.trim()).filter(Boolean),
      )
      .sort((a, b) => b.length - a.length)[0];

    if (separated?.length > 1) return separated;

    const multiSpace = value
      .split(/\s{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (multiSpace.length > 1) return multiSpace;

    return value
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function isPresenceNumber(value) {
    const raw = String(value || '').trim();

    if (!raw || !/\d/.test(raw)) return false;

    const withoutSuffix = raw
      .replace(/[kKmMbBtT]\s*$/g, '')
      .trim();

    if (/[A-Za-z]/.test(withoutSuffix)) return false;

    const cleaned = raw
      .replace(/[^\d\s.,+\-kKmMbBtT]/g, '')
      .trim();

    return /^[-+]?\d[\d\s.,]*(?:[kKmMbBtT])?$/.test(cleaned);
  }

  function expandPresenceNumberColumns(columns) {
    return columns.flatMap((column) => {
      const raw = String(column || '').trim();
      const parts = raw.split(/\s+/).filter(Boolean);

      if (parts.length > 1 && parts.every(isPresenceNumber)) {
        return parts;
      }

      return [column];
    });
  }

  function parsePresenceNumber(value) {
    const raw = String(value || '')
      .trim()
      .replace(/[kKmMbBtT]\s*$/g, '')
      .replace(/\s+/g, '');

    if (!raw) return NaN;

    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    let normalized = raw;

    if (lastComma >= 0 && lastDot >= 0) {
      normalized =
        lastComma > lastDot
          ? raw.replace(/\./g, '').replace(',', '.')
          : raw.replace(/,/g, '');
    } else if (lastComma >= 0) {
      normalized = raw.replace(',', '.');
    }

    const number = Number(
      normalized.replace(/[^\d.+-]/g, ''),
    );

    return Number.isFinite(number) ? number : NaN;
  }

  function structuredMetricText(value, depth = 0) {
    if (value == null || depth > 3) return '';

    if (Array.isArray(value)) {
      return value
        .map((item) => structuredMetricText(item, depth + 1))
        .join(' ');
    }

    if (typeof value === 'object') {
      return Object.entries(value)
        .map(
          ([key, item]) =>
            `${key} ${structuredMetricText(item, depth + 1)}`,
        )
        .join(' ');
    }

    return String(value);
  }

  function detectBestOverallColumns(log, oneStats) {
    const presence = {
      kills: false,
      deaths: false,
      kd: false,
      feed: false,
      damageDealt: false,
      damageTaken: false,
      ccHits: false,
      fortDamage: false,
    };

    const raw = getOriginalLogRaw(log);
    const startMarker =
      '===== ADVERSARY_SECONDARY_LOG_START =====';
    const endMarker =
      '===== ADVERSARY_SECONDARY_LOG_END =====';

    let secondaryRaw = '';

    if (raw.includes(startMarker) && raw.includes(endMarker)) {
      secondaryRaw =
        raw.split(startMarker)[1]?.split(endMarker)[0] || '';
    }

    const normalizedSecondary = String(secondaryRaw || '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ');

    const explicitHeader = {
      feed: /\bkill\s*feed\b|\bkillfeed\b/.test(
        normalizedSecondary,
      ),
      damageDealt:
        /\bdamage\s*dealt\b|\bdmg\s*dealt\b/.test(
          normalizedSecondary,
        ),
      damageTaken:
        /\bdamage\s*taken\b|\bdmg\s*taken\b/.test(
          normalizedSecondary,
        ),
      ccHits:
        /\bcc\s*hits?\b|\bcrowd\s*control\b/.test(
          normalizedSecondary,
        ),
      fortDamage:
        /\bdamage\s*(?:to|on)\s*fort\b|\bfort\s*damage\b|\bdmg\s*to\s*fort\b/.test(
          normalizedSecondary,
        ),
    };

    const hasRecognizedDetailHeader = Object.values(
      explicitHeader,
    ).some(Boolean);

    let foundRawStatsRow = false;

    String(secondaryRaw || '')
      .split(/\r?\n/)
      .forEach((line) => {
        let columns = splitPresenceColumns(line);
        columns = expandPresenceNumberColumns(columns);

        const firstNumberIndex = columns.findIndex(
          isPresenceNumber,
        );

        if (firstNumberIndex < 0) return;

        const numericColumns = columns
          .slice(firstNumberIndex)
          .filter(isPresenceNumber);

        if (numericColumns.length < 2) return;

        foundRawStatsRow = true;
        presence.kills = true;
        presence.deaths = true;
        presence.kd = true;

        // When the table has named headers, those headers are authoritative.
        // This prevents old two-column or three-column tables from inheriting
        // auto-generated zeroes for columns that were never present.
        if (hasRecognizedDetailHeader) {
          Object.entries(explicitHeader).forEach(
            ([metric, exists]) => {
              if (exists) presence[metric] = true;
            },
          );
          return;
        }

        const thirdRaw = String(numericColumns[2] || '');
        const thirdNumber = parsePresenceNumber(thirdRaw);
        const looksLikeFullTableWithKd =
          numericColumns.length >= 9 &&
          /[.,]/.test(thirdRaw) &&
          Number.isFinite(thirdNumber) &&
          thirdNumber >= 0 &&
          thirdNumber <= 50;

        if (looksLikeFullTableWithKd) {
          if (numericColumns.length >= 5) presence.feed = true;
          if (numericColumns.length >= 6) {
            presence.damageDealt = true;
          }
          if (numericColumns.length >= 7) {
            presence.damageTaken = true;
          }
          if (numericColumns.length >= 8) presence.ccHits = true;
          if (numericColumns.length >= 9) {
            presence.fortDamage = true;
          }
        } else {
          if (numericColumns.length >= 3) presence.feed = true;
          if (numericColumns.length >= 4) {
            presence.damageDealt = true;
          }
          if (numericColumns.length >= 5) {
            presence.damageTaken = true;
          }
          if (numericColumns.length >= 6) presence.ccHits = true;
          if (numericColumns.length >= 9) {
            presence.fortDamage = true;
          }
        }
      });

    if (foundRawStatsRow) {
      return presence;
    }

    // Summary-only logs do not retain the original table layout. In that
    // case, count a detail column only when there is positive evidence:
    // a non-zero value, an explicit presence flag, or structured column
    // metadata. Merely owning an auto-filled property with value 0 is not
    // considered evidence that the old column existed.
    const sourceSummary =
      log?.summary ||
      log?.stats ||
      log?.analytics ||
      log?._src?.summary ||
      log?._src?.stats ||
      log?._src?.analytics ||
      {};
    const summarySecondary =
      sourceSummary?.secondary ||
      sourceSummary?.secondaryStats ||
      {};
    const summaryPlayers = Array.isArray(sourceSummary?.players)
      ? sourceSummary.players
      : [];
    const summaryRows = Array.isArray(summarySecondary?.rows)
      ? summarySecondary.rows
      : [];
    const evidenceRows = [...summaryRows, ...summaryPlayers];
    const structuredText = structuredMetricText([
      summarySecondary?.headers,
      summarySecondary?.header,
      summarySecondary?.columns,
      summarySecondary?.columnNames,
      summarySecondary?.fields,
      summarySecondary?.availableFields,
      summarySecondary?.schema,
      summarySecondary?.metrics,
    ])
      .toLowerCase()
      .replace(/[_-]+/g, ' ');

    function hasExplicitPresenceFlag(row, aliases) {
      return aliases.some((alias) => {
        const compact = String(alias).replace(
          /[^a-zA-Z0-9]/g,
          '',
        );
        const camel =
          compact.charAt(0).toLowerCase() + compact.slice(1);
        const snake = String(alias)
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/[^a-zA-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .toLowerCase();
        const candidates = [
          `has_${snake}`,
          `${snake}_exists`,
          `${snake}_present`,
          `${snake}_provided`,
          `${camel}HasValue`,
          `${camel}Exists`,
          `${camel}Present`,
          `${camel}Provided`,
        ];

        return candidates.some(
          (key) =>
            Object.prototype.hasOwnProperty.call(row || {}, key) &&
            Boolean(row[key]),
        );
      });
    }

    function hasSummaryMetric(metric, headerPatterns) {
      const aliases = metricAliases[metric];

      if (headerPatterns.some((pattern) => pattern.test(structuredText))) {
        return true;
      }

      if (
        evidenceRows.some(
          (row) =>
            hasExplicitPresenceFlag(row, aliases) ||
            aliases.some(
              (alias) =>
                Object.prototype.hasOwnProperty.call(
                  row || {},
                  alias,
                ) &&
                Number(row[alias]) !== 0,
            ),
        )
      ) {
        return true;
      }

      const totals = summarySecondary?.totals || {};

      return aliases.some(
        (alias) =>
          Object.prototype.hasOwnProperty.call(totals, alias) &&
          Number(totals[alias]) !== 0,
      );
    }

    const hasCoreSummary =
      summaryPlayers.length > 0 ||
      summaryRows.length > 0 ||
      (oneStats?.players || []).length > 0 ||
      (oneStats?.ev || []).length > 0;

    presence.kills = hasCoreSummary;
    presence.deaths = hasCoreSummary;
    presence.kd = hasCoreSummary;
    presence.feed = hasSummaryMetric('feed', [
      /\bkill\s*feed\b/,
      /\bkillfeed\b/,
    ]);
    presence.damageDealt = hasSummaryMetric(
      'damageDealt',
      [/\bdamage\s*dealt\b/, /\bdmg\s*dealt\b/],
    );
    presence.damageTaken = hasSummaryMetric(
      'damageTaken',
      [/\bdamage\s*taken\b/, /\bdmg\s*taken\b/],
    );
    presence.ccHits = hasSummaryMetric('ccHits', [
      /\bcc\s*hits?\b/,
      /\bcrowd\s*control\b/,
    ]);
    presence.fortDamage = hasSummaryMetric(
      'fortDamage',
      [
        /\bdamage\s*(?:to|on)\s*fort\b/,
        /\bfort\s*damage\b/,
        /\bdmg\s*to\s*fort\b/,
      ],
    );

    return presence;
  }

  function buildRowsFromStats(oneStats, logColumns) {
    const hasTimeline = statsHasTimeline(oneStats);
    const timelineStreaks = hasTimeline
      ? calculateStreaks(oneStats?.ev || [])
      : {};

    const playerByKey = new Map();
    const secondaryByKey = new Map();
    const displayNameByKey = new Map();
    const combatPlayerKeys = new Set();
    const orderedKeys = [];

    function registerName(value) {
      const name = String(value || '').trim();
      const key = normalizePlayerName(name);

      if (!key) return '';

      if (!displayNameByKey.has(key)) {
        displayNameByKey.set(key, name);
        orderedKeys.push(key);
      }

      return key;
    }

    (oneStats?.players || []).forEach((player) => {
      const key = registerName(player?.name);

      if (key) playerByKey.set(key, player);
    });

    const secondaryRows = Array.isArray(oneStats?.secondary?.rows)
      ? oneStats.secondary.rows
      : [];

    secondaryRows.forEach((row) => {
      const key = registerName(row?.player || row?.name);

      if (!key) return;

      const current = secondaryByKey.get(key);

      // A normal Stats Log has one row per player. If duplicate rows exist,
      // retain the row with the largest K+D total instead of double-counting.
      if (
        !current ||
        (Number(row?.kills) || 0) + (Number(row?.deaths) || 0) >
          (Number(current?.kills) || 0) +
            (Number(current?.deaths) || 0)
      ) {
        secondaryByKey.set(key, row);
      }
    });

    (oneStats?.ev || []).forEach((event) => {
      if (event?.type !== 'kill' && event?.type !== 'death') return;

      const key = registerName(guildPlayerFromEvent(event));

      if (key) combatPlayerKeys.add(key);
    });

    return orderedKeys.map((key) => {
      const combatPlayer = playerByKey.get(key) || {};
      const secondaryRow = secondaryByKey.get(key) || null;
      const name =
        combatPlayer?.name ||
        secondaryRow?.player ||
        secondaryRow?.name ||
        displayNameByKey.get(key) ||
        key;
      const hasCombatEvents = combatPlayerKeys.has(key);

      const kills =
        hasTimeline && hasCombatEvents
          ? Number(combatPlayer?.kills) || 0
          : secondaryRow
            ? Number(secondaryRow?.kills) || 0
            : Number(combatPlayer?.kills) || 0;

      const deaths =
        hasTimeline && hasCombatEvents
          ? Number(combatPlayer?.deaths) || 0
          : secondaryRow
            ? Number(secondaryRow?.deaths) || 0
            : Number(combatPlayer?.deaths) || 0;

      const kdNumber = deaths
        ? Number((kills / deaths).toFixed(2))
        : Number(kills.toFixed(2));

      // Best Overall Feed is sourced only from a Stats Log column.
      // Combat Log timestamps never create or replace this value.
      const savedFeedSource = secondaryRow || combatPlayer;

      const feed = logColumns?.feed
        ? readMetric(
            savedFeedSource,
            metricAliases.feed,
            getPlayerObjectValue(oneStats?.fd, name, 0),
          )
        : 0;

      const readOptionalMetric = (metric) => {
        if (!logColumns?.[metric]) return 0;

        const aliases = metricAliases[metric];

        if (secondaryRow) {
          return readMetric(secondaryRow, aliases, 0);
        }

        return readMetric(combatPlayer, aliases, 0);
      };

      const optionalMetricExists = (metric) =>
        Boolean(logColumns?.[metric]);

      return {
        ...combatPlayer,
        name,
        playerKey: key,
        kills,
        deaths,
        kdNumber,
        streak:
          hasTimeline && hasCombatEvents
            ? Number(getPlayerObjectValue(timelineStreaks, name, 0)) || 0
            : null,
        feed,
        damageDealt: readOptionalMetric('damageDealt'),
        damageTaken: readOptionalMetric('damageTaken'),
        ccHits: readOptionalMetric('ccHits'),
        fortDamage: readOptionalMetric('fortDamage'),
        available: {
          kills:
            Boolean(logColumns?.kills) ||
            (hasTimeline && hasCombatEvents),
          deaths:
            Boolean(logColumns?.deaths) ||
            (hasTimeline && hasCombatEvents),
          kd:
            Boolean(logColumns?.kd) ||
            (hasTimeline && hasCombatEvents),
          streak: hasTimeline && hasCombatEvents,
          // A Feed rank exists only when the Stats Log physically
          // contains the Kill Feed column.
          feed: Boolean(logColumns?.feed),
          damageDealt: optionalMetricExists('damageDealt'),
          damageTaken: optionalMetricExists('damageTaken'),
          ccHits: optionalMetricExists('ccHits'),
          fortDamage: optionalMetricExists('fortDamage'),
        },
      };
    });
  }

  function rankRows(rows, key, desc = true, chronology = {}) {
    return Object.fromEntries(
      [...rows]
        .map((player, originalIndex) => ({
          ...player,
          originalIndex,
        }))
        .sort((a, b) => {
          const av = Number(a[key]) || 0;
          const bv = Number(b[key]) || 0;

          if (av !== bv) {
            return desc ? bv - av : av - bv;
          }

          const aTime =
            chronology[a.playerKey] ||
            chronology[a.name] ||
            `9999-99-99 99999999 ${String(a.originalIndex).padStart(
              8,
              '0',
            )}`;
          const bTime =
            chronology[b.playerKey] ||
            chronology[b.name] ||
            `9999-99-99 99999999 ${String(b.originalIndex).padStart(
              8,
              '0',
            )}`;

          return (
            String(aTime).localeCompare(String(bTime)) ||
            a.originalIndex - b.originalIndex ||
            a.name.localeCompare(b.name)
          );
        })
        .map((player, index) => [player.playerKey, index + 1]),
    );
  }

  function buildCombatChronology(oneStats, rows) {
    const rowByKey = new Map(
      rows.map((player) => [player.playerKey, player]),
    );
    const firstAppearance = {};
    const lastActivity = {};
    const finalKill = {};
    const finalDeath = {};

    [...(oneStats?.ev || [])]
      .filter(
        (event) =>
          event?.hasTimestamp !== false &&
          event?.source !== 'summary' &&
          (event?.type === 'kill' || event?.type === 'death'),
      )
      .sort(
        (a, b) =>
          eventTimeKey(a).localeCompare(eventTimeKey(b)) ||
          Number(a?.i || 0) - Number(b?.i || 0),
      )
      .forEach((event) => {
        const playerKey = normalizePlayerName(
          guildPlayerFromEvent(event),
        );

        if (!playerKey || !rowByKey.has(playerKey)) return;

        const key = eventTimeKey(event);

        firstAppearance[playerKey] ||= key;
        lastActivity[playerKey] = key;

        if (event.type === 'kill') {
          finalKill[playerKey] = key;
        }

        if (event.type === 'death') {
          finalDeath[playerKey] = key;
        }
      });

    return {
      firstAppearance,
      lastActivity,
      finalKill,
      finalDeath,
    };
  }

  function chronologyWithFallback(rows, primary, fallback) {
    return Object.fromEntries(
      rows.map((player, index) => [
        player.playerKey,
        primary[player.playerKey] ||
          fallback[player.playerKey] ||
          `9999-99-99 99999999 ${String(index).padStart(8, '0')}`,
      ]),
    );
  }

  function rankKillsForStats(oneStats, rows, chronology) {
    if (!statsHasTimeline(oneStats)) {
      return rankRows(rows, 'kills', true);
    }

    return rankRows(
      rows,
      'kills',
      true,
      chronologyWithFallback(
        rows,
        chronology.finalKill,
        chronology.firstAppearance,
      ),
    );
  }

  function rankDeathsForStats(oneStats, rows, chronology) {
    if (!statsHasTimeline(oneStats)) {
      return rankRows(rows, 'deaths', false);
    }

    return rankRows(
      rows,
      'deaths',
      false,
      chronologyWithFallback(
        rows,
        chronology.finalDeath,
        chronology.firstAppearance,
      ),
    );
  }

  function rankKdForStats(oneStats, rows, chronology) {
    if (!statsHasTimeline(oneStats)) {
      return rankRows(rows, 'kdNumber', true);
    }

    return rankRows(
      rows,
      'kdNumber',
      true,
      chronologyWithFallback(
        rows,
        chronology.lastActivity,
        chronology.firstAppearance,
      ),
    );
  }

  function rankStreakForStats(oneStats, rows) {
    const streakRows = rows.filter(
      (player) => player.available.streak,
    );

    if (!streakRows.length) return {};

    const current = {};
    const best = {};
    const firstBestKey = {};
    const validKeys = new Set(
      streakRows.map((player) => player.playerKey),
    );

    [...(oneStats?.ev || [])]
      .filter(
        (event) =>
          event?.hasTimestamp !== false &&
          event?.source !== 'summary' &&
          (event?.type === 'kill' || event?.type === 'death'),
      )
      .sort(
        (a, b) =>
          eventTimeKey(a).localeCompare(eventTimeKey(b)) ||
          Number(a?.i || 0) - Number(b?.i || 0),
      )
      .forEach((event) => {
        const playerKey = normalizePlayerName(
          guildPlayerFromEvent(event),
        );

        if (!playerKey || !validKeys.has(playerKey)) return;

        if (event.type === 'death') {
          current[playerKey] = 0;
          return;
        }

        current[playerKey] = (current[playerKey] || 0) + 1;

        if (current[playerKey] > (best[playerKey] || 0)) {
          best[playerKey] = current[playerKey];
          firstBestKey[playerKey] = eventTimeKey(event);
        }
      });

    return rankRows(
      streakRows,
      'streak',
      true,
      chronologyWithFallback(streakRows, firstBestKey, {}),
    );
  }

  function rankFeedForStats(oneStats, rows) {
    const feedRows = rows.filter(
      (player) => player.available.feed,
    );

    if (!feedRows.length) return {};

    // Rank only the Kill Feed numbers saved in the Stats Log.
    // Combat Log events are intentionally excluded, including
    // chronological tie-breaking.
    return rankRows(feedRows, 'feed', true);
  }

  function rankOptionalMetric(
    rows,
    key,
    desc,
    combatChronology,
  ) {
    const metricRows = rows.filter(
      (player) => player.available[key],
    );

    if (!metricRows.length) return {};

    return rankRows(
      metricRows,
      key,
      desc,
      chronologyWithFallback(
        metricRows,
        combatChronology.firstAppearance,
        combatChronology.lastActivity,
      ),
    );
  }

  const byPlayerKey = useMemo(
    () =>
      Object.fromEntries(
        (players || []).map((player) => [
          normalizePlayerName(player?.name),
          player,
        ]),
      ),
    [players],
  );

  const {
    averageRanks,
    overallCombatChronology,
  } = useMemo(() => {
    const result = {};
    const chronology = {};

    [...(events || [])]
      .filter(
        (event) =>
          event?.hasTimestamp !== false &&
          event?.source !== 'summary' &&
          (event?.type === 'kill' || event?.type === 'death'),
      )
      .sort(
        (a, b) =>
          eventTimeKey(a).localeCompare(eventTimeKey(b)) ||
          Number(a?.i || 0) - Number(b?.i || 0),
      )
      .forEach((event) => {
        const playerKey = normalizePlayerName(
          guildPlayerFromEvent(event),
        );

        if (playerKey && !chronology[playerKey]) {
          chronology[playerKey] = eventTimeKey(event);
        }
      });

    function ensurePlayer(player) {
      const playerKey = player.playerKey;

      if (!result[playerKey]) {
        result[playerKey] = {
          displayName: player.name,
          matches: 0,
          warAverageTotal: 0,
          metricTotals: {
            kills: 0,
            deaths: 0,
            kd: 0,
            streak: 0,
            feed: 0,
            damageDealt: 0,
            damageTaken: 0,
            ccHits: 0,
            fortDamage: 0,
          },
          metricMatches: {
            kills: 0,
            deaths: 0,
            kd: 0,
            streak: 0,
            feed: 0,
            damageDealt: 0,
            damageTaken: 0,
            ccHits: 0,
            fortDamage: 0,
          },
        };
      }

      return result[playerKey];
    }

    (selectedLogs || []).forEach((log) => {
      const oneStats = calculateStats([log]);
      const logColumns = detectBestOverallColumns(log, oneStats);
      const rows = buildRowsFromStats(oneStats, logColumns);

      if (!rows.length) return;

      const combatChronology = buildCombatChronology(
        oneStats,
        rows,
      );

      const ranks = {
        kills: rankKillsForStats(
          oneStats,
          rows,
          combatChronology,
        ),
        deaths: rankDeathsForStats(
          oneStats,
          rows,
          combatChronology,
        ),
        kd: rankKdForStats(oneStats, rows, combatChronology),
        streak: rankStreakForStats(oneStats, rows),
        feed: rankFeedForStats(oneStats, rows),
        damageDealt: rankOptionalMetric(
          rows,
          'damageDealt',
          true,
          combatChronology,
        ),
        damageTaken: rankOptionalMetric(
          rows,
          'damageTaken',
          false,
          combatChronology,
        ),
        ccHits: rankOptionalMetric(
          rows,
          'ccHits',
          true,
          combatChronology,
        ),
        fortDamage: rankOptionalMetric(
          rows,
          'fortDamage',
          true,
          combatChronology,
        ),
      };

      rows.forEach((player) => {
        const entry = ensurePlayer(player);
        const warRanks = [];

        Object.entries(ranks).forEach(([metric, rankMap]) => {
          const rank = Number(rankMap[player.playerKey]);

          // Never count a missing lookup as rank zero. A metric contributes
          // only when this player was eligible for that metric in this war.
          if (!Number.isFinite(rank) || rank <= 0) return;

          entry.metricTotals[metric] += rank;
          entry.metricMatches[metric] += 1;
          warRanks.push(rank);
        });

        if (!warRanks.length) return;

        // Each war has equal weight, regardless of whether it contains only
        // Combat Log metrics or the complete Stats Log metric set.
        entry.matches += 1;
        entry.warAverageTotal +=
          warRanks.reduce((sum, rank) => sum + rank, 0) /
          warRanks.length;
      });
    });

    const calculatedRanks = Object.fromEntries(
      Object.entries(result).map(([playerKey, data]) => {
        const ranks = Object.fromEntries(
          Object.keys(data.metricTotals).map((metric) => [
            metric,
            data.metricMatches[metric]
              ? data.metricTotals[metric] /
                data.metricMatches[metric]
              : null,
          ]),
        );

        const availableColumnRanks = Object.values(ranks).filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            Number.isFinite(Number(value)),
        );

        return [
          playerKey,
          {
            displayName: data.displayName,
            matches: data.matches,
            ranks,
            average: availableColumnRanks.length
              ? availableColumnRanks.reduce(
                  (sum, value) => sum + Number(value),
                  0,
                ) / availableColumnRanks.length
              : 9999,
          },
        ];
      }),
    );

    return {
      averageRanks: calculatedRanks,
      overallCombatChronology: chronology,
    };
  }, [events, selectedLogs]);

  const names = useMemo(() => {
    const namesByKey = new Map();

    function addName(value) {
      const name = String(value || '').trim();
      const key = normalizePlayerName(name);

      if (key && !namesByKey.has(key)) {
        namesByKey.set(key, name);
      }
    }

    (members || []).forEach((member) => addName(member?.name));
    (players || []).forEach((player) => addName(player?.name));

    Object.values(averageRanks).forEach((data) =>
      addName(data?.displayName),
    );

    return [...namesByKey.entries()].map(([playerKey, name]) => ({
      playerKey,
      name,
    }));
  }, [members, players, averageRanks]);

  const rows = names.map(({ playerKey, name }) => {
    const player = byPlayerKey[playerKey] || {
      name,
      kills: 0,
      deaths: 0,
      kd: '0.00',
    };
    const rankData = averageRanks[playerKey];

    return {
      ...player,
      name,
      kdNumber: Number(player?.kd) || 0,
      streak:
        rankData?.ranks?.streak == null
          ? null
          : Number(getPlayerObjectValue(streaks, name, 0)) || 0,
      feed:
        rankData?.ranks?.feed == null
          ? null
          : Number(getPlayerObjectValue(feeds, name, 0)) || 0,
      average: rankData?.average ?? 9999,
      matches: rankData?.matches ?? 0,
      averageRankKills: rankData?.ranks?.kills ?? null,
      averageRankDeaths: rankData?.ranks?.deaths ?? null,
      averageRankKd: rankData?.ranks?.kd ?? null,
      averageRankStreak: rankData?.ranks?.streak ?? null,
      averageRankFeed: rankData?.ranks?.feed ?? null,
      averageRankDamageDealt:
        rankData?.ranks?.damageDealt ?? null,
      averageRankDamageTaken:
        rankData?.ranks?.damageTaken ?? null,
      averageRankCcHits: rankData?.ranks?.ccHits ?? null,
      averageRankFortDamage:
        rankData?.ranks?.fortDamage ?? null,
      chronologyKey:
        overallCombatChronology[playerKey] ||
        '9999-99-99 99999999',
    };
  });

  const final = rows
    .filter((player) =>
      normalizePlayerName(player.name).includes(
        normalizePlayerName(query),
      ),
    )
    .sort(
      (a, b) =>
        a.average - b.average ||
        a.chronologyKey.localeCompare(b.chronologyKey) ||
        a.name.localeCompare(b.name),
    );

  function formatAverageRank(value) {
    return value == null ? '-' : Number(value).toFixed(2);
  }

  return (
    <Panel cls="overview-guild-panel overview-panel-transparent overview-accent-violet h-[680px]">
      <div className="flex h-full flex-col">
        <div className="overview-section-header overview-header-violet mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black">♛ Average Rank</h3>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search player..."
            className="rounded-xl border border-slate-700/70 bg-slate-950/72 px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400 md:w-64"
          />
        </div>

        {!final.length ? (
          <p className="text-slate-500">No players.</p>
        ) : (
          <div
            className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 ${scrollCls}`}
          >
            {final.map((player, index) => (
              <div
                key={player.name}
                className="overview-average-rank-row rounded-xl border p-2.5"
                style={{
                  '--overview-name-rgb': [
                    '96, 165, 250',
                    '52, 211, 153',
                    '167, 139, 250',
                    '34, 211, 238',
                    '251, 146, 60',
                    '244, 114, 182',
                  ][index % 6],
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-xs font-black text-slate-600">
                      {index + 1}
                    </span>
                    <span className="overview-player-name-chip min-w-0 truncate rounded-full px-2.5 py-1 text-xs font-black">
                      {player.name}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-slate-500">
                      {player.matches} wars
                    </span>
                  </div>

                  <span className="rounded-md border border-blue-400/20 bg-blue-500/5 px-2 py-1 text-sm font-black text-blue-300">
                    <small className="mr-1 text-[9px] uppercase text-blue-200/80">
                      Avg
                    </small>

                    {player.average === 9999
                      ? '-'
                      : player.average.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-center text-xs sm:grid-cols-5 xl:grid-cols-9">
                  {[
                    [
                      'Kills',
                      formatAverageRank(player.averageRankKills),
                      'text-blue-300',
                    ],
                    [
                      'Deaths',
                      formatAverageRank(player.averageRankDeaths),
                      'text-pink-300',
                    ],
                    [
                      'K/D',
                      formatAverageRank(player.averageRankKd),
                      'text-emerald-300',
                    ],
                    [
                      'Streak',
                      formatAverageRank(player.averageRankStreak),
                      'text-slate-200',
                    ],
                    [
                      'Feed',
                      formatAverageRank(player.averageRankFeed),
                      'text-orange-300',
                    ],
                    [
                      'Dmg',
                      formatAverageRank(
                        player.averageRankDamageDealt,
                      ),
                      'text-cyan-300',
                    ],
                    [
                      'Taken',
                      formatAverageRank(
                        player.averageRankDamageTaken,
                      ),
                      'text-rose-300',
                    ],
                    [
                      'CC',
                      formatAverageRank(player.averageRankCcHits),
                      'text-violet-300',
                    ],
                    [
                      'Fort',
                      formatAverageRank(
                        player.averageRankFortDamage,
                      ),
                      'text-amber-300',
                    ],
                  ].map((item) => (
                    <div
                      key={item[0]}
                      className="rounded-md bg-slate-950/70 p-1"
                    >
                      <p className="text-slate-500">{item[0]}</p>
                      <b className={item[2]}>
                        {item[1] === '-'
                          ? '-'
                          : `#${item[1]}`}
                      </b>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}


function formatPlayerComparisonValue(value, type = 'number') {
  const number = Number(value);

  if (!Number.isFinite(number)) return '—';

  if (type === 'kd') return number.toFixed(2);
  if (type === 'average') {
    return Math.abs(number) >= 1000
      ? compactNumber(number)
      : number.toFixed(1).replace(/\.0$/, '');
  }

  return compactNumber(number);
}

function PlayerAverageComparisonCard({
  label,
  current,
  average,
  averageMatches = 0,
  lowerIsBetter = false,
  type = 'number',
  tone = 'blue',
}) {
  const currentNumber = Number(current);
  const averageNumber = Number(average);
  const hasCurrent = Number.isFinite(currentNumber);
  const hasAverage = Number.isFinite(averageNumber);
  const difference =
    hasCurrent && hasAverage
      ? currentNumber - averageNumber
      : 0;
  const direction =
    difference > 0 ? 'up' : difference < 0 ? 'down' : 'same';
  const beneficial =
    direction === 'same'
      ? null
      : lowerIsBetter
        ? direction === 'down'
        : direction === 'up';
  const percentage =
    hasCurrent && hasAverage
      ? averageNumber === 0
        ? currentNumber === 0
          ? 0
          : 100
        : Math.abs((difference / averageNumber) * 100)
      : null;

  const themes = {
    blue: {
      border: 'border-blue-400/20',
      bg: 'from-blue-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-blue-300',
    },
    pink: {
      border: 'border-pink-400/20',
      bg: 'from-pink-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-pink-300',
    },
    red: {
      border: 'border-red-400/20',
      bg: 'from-red-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-red-400',
    },
    emerald: {
      border: 'border-emerald-400/20',
      bg: 'from-emerald-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-emerald-300',
    },
    slate: {
      border: 'border-slate-500/25',
      bg: 'from-slate-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-slate-100',
    },
    orange: {
      border: 'border-orange-400/20',
      bg: 'from-orange-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-orange-300',
    },
    cyan: {
      border: 'border-cyan-400/20',
      bg: 'from-cyan-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-cyan-300',
    },
    rose: {
      border: 'border-rose-400/20',
      bg: 'from-rose-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-rose-300',
    },
    violet: {
      border: 'border-violet-400/20',
      bg: 'from-violet-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-violet-300',
    },
    amber: {
      border: 'border-amber-400/20',
      bg: 'from-amber-500/10 via-slate-950/70 to-slate-950/85',
      value: 'text-amber-300',
    },
  };

  const theme = themes[tone] || themes.blue;
  const changeClass =
    beneficial === true
      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
      : beneficial === false
        ? 'border-rose-400/20 bg-rose-500/10 text-rose-300'
        : 'border-slate-700 bg-slate-900/70 text-slate-400';
  const arrow =
    direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';

  return (
    <div
      className={`overview-popup-card overview-popup-card-${tone} relative overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.bg} p-3 shadow-[0_12px_30px_rgba(0,0,0,.18)]`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-[9px] font-black uppercase tracking-[0.13em] text-slate-500">
          {label}
        </p>

        <span
          className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[9px] font-black ${changeClass}`}
        >
          {percentage == null
            ? '—'
            : `${arrow} ${percentage.toFixed(1)}%`}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={`text-lg font-black leading-none ${theme.value}`}>
            {hasCurrent
              ? formatPlayerComparisonValue(currentNumber, type)
              : '—'}
          </p>
          <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
            This war
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm font-black leading-none text-slate-300">
            {hasAverage
              ? formatPlayerComparisonValue(averageNumber, type)
              : '—'}
          </p>
          <p className="mt-1 text-[8px] font-black uppercase tracking-[0.12em] text-slate-600">
            Average · {averageMatches}{' '}
            {averageMatches === 1 ? 'war' : 'wars'}
          </p>
        </div>
      </div>
    </div>
  );
}


function PlayerPerformanceModal({
  title,
  subtitle,
  close,
  children,
}) {
  const scrollAreaRef = useRef(null);

  function handleOverlayWheel(event) {
    const scrollArea = scrollAreaRef.current;

    if (!scrollArea || scrollArea.contains(event.target)) return;

    scrollArea.scrollTop += event.deltaY;
    event.preventDefault();
  }

  return (
    <div
      className="overview-player-performance-overlay fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/42 p-3 sm:p-5"
      onWheelCapture={handleOverlayWheel}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="overview-player-performance-dialog relative flex h-[94vh] max-h-[94vh] w-[min(97vw,1520px)] flex-col overflow-hidden rounded-[25px] border border-transparent bg-transparent shadow-none"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/45 to-transparent" />
          <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.018)_1px,transparent_1px)] bg-[size:38px_38px]" />
        </div>

        <div className="relative flex items-center justify-between gap-4 border-b border-white/8 bg-[linear-gradient(110deg,rgba(59,130,246,.17),rgba(15,23,42,.76)_42%,rgba(139,92,246,.10))] px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 shadow-[0_0_24px_rgba(59,130,246,.12)]">
              <div className="h-4 w-4 rotate-45 border-2 border-blue-300/85" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black text-white sm:text-xl">
                  {title}
                </h3>

                <span className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-violet-200">
                  War Performance
                </span>
              </div>

              <p className="truncate text-[11px] font-bold text-slate-500">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/80 text-lg font-black text-slate-400 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
            aria-label="Close player performance"
          >
            ×
          </button>
        </div>

        <div
          ref={scrollAreaRef}
          className={`relative min-h-0 flex-1 overflow-y-auto bg-transparent px-1 pb-1 pt-3 text-white sm:px-2 sm:pb-2 sm:pt-4 ${scrollCls}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function PlayerOverview({ players, streaks, feeds, events, lifetimeLogs, loadLifetimeLogs }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(['kills', 'desc']);
  const [selected, setSelected] = useState(null);
  const [lifetimeLoading, setLifetimeLoading] = useState(false);

  const [key, direction] = sort;

  async function openPlayerDetails(player) {
    setSelected(player);

    if (
      Array.isArray(lifetimeLogs) &&
      lifetimeLogs.length > 0
    ) {
      return;
    }

    if (typeof loadLifetimeLogs !== 'function') return;

    try {
      setLifetimeLoading(true);
      await loadLifetimeLogs();
    } finally {
      setLifetimeLoading(false);
    }
  }

  function formatNumber(value) {
    const number = Number(value) || 0;
    const abs = Math.abs(number);

    const formatCompact = (divisor, suffix) => {
      const compact = number / divisor;
      const decimals = Math.abs(compact) >= 10 || Number.isInteger(compact) ? 0 : 1;

      return `${compact.toFixed(decimals).replace(/\.0$/, '')}${suffix}`;
    };

    if (abs >= 1_000_000_000_000) return formatCompact(1_000_000_000_000, 'T');
    if (abs >= 1_000_000_000) return formatCompact(1_000_000_000, 'B');
    if (abs >= 1_000_000) return formatCompact(1_000_000, 'M');
    if (abs >= 1_000) return formatCompact(1_000, 'K');

    return new Intl.NumberFormat('en-US').format(number);
  }

  const rows = players
    .map((player) => ({
      ...player,
      streak: streaks[player.name] || 0,
      feed: feeds[player.name] || 0,
      damageDealt: Number(player.damageDealt) || 0,
      damageTaken: Number(player.damageTaken) || 0,
      ccHits: Number(player.ccHits) || 0,
      fortDamage: Number(player.fortDamage) || 0,
    }))
    .filter((player) => normalizePlayerName(player.name).includes(normalizePlayerName(query)))
    .sort((a, b) => {
      const av = key === 'name' ? a.name.toLowerCase() : Number(a[key]);
      const bv = key === 'name' ? b.name.toLowerCase() : Number(b[key]);

      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const progressMax = {
    kills: Math.max(1, ...rows.map((player) => Number(player.kills) || 0)),
    deaths: Math.max(1, ...rows.map((player) => Number(player.deaths) || 0)),
    kd: Math.max(1, ...rows.map((player) => Number(player.kd) || 0)),
    streak: Math.max(1, ...rows.map((player) => Number(player.streak) || 0)),
    feed: Math.max(1, ...rows.map((player) => Number(player.feed) || 0)),
    damageDealt: Math.max(1, ...rows.map((player) => Number(player.damageDealt) || 0)),
    damageTaken: Math.max(1, ...rows.map((player) => Number(player.damageTaken) || 0)),
    ccHits: Math.max(1, ...rows.map((player) => Number(player.ccHits) || 0)),
    fortDamage: Math.max(1, ...rows.map((player) => Number(player.fortDamage) || 0)),
  };

  const progressThemes = {
    kills: 'from-blue-500 to-cyan-300',
    deaths: 'from-pink-500 to-rose-300',
    kd: 'from-emerald-500 to-lime-300',
    streak: 'from-slate-200 to-white',
    feed: 'from-orange-500 to-amber-300',
    damageDealt: 'from-cyan-500 to-sky-300',
    damageTaken: 'from-rose-500 to-pink-300',
    ccHits: 'from-violet-500 to-fuchsia-300',
    fortDamage: 'from-amber-500 to-yellow-300',
  };

  function ProgressValue({ id, value, children, className = '' }) {
    const numeric = Number(value) || 0;
    const width = numeric <= 0
      ? 0
      : Math.max(3, Math.min(100, Math.round((numeric / (progressMax[id] || 1)) * 100)));

    return (
      <div className={`mx-auto flex w-full min-w-0 flex-col items-center ${className}`}>
        <span className="whitespace-nowrap text-center leading-none">{children}</span>

        <span className="mt-1.5 block h-[2px] w-[58%] overflow-hidden rounded-full bg-slate-800/55">
          <span
            className={`relative block h-full rounded-full bg-gradient-to-r ${progressThemes[id] || 'from-slate-500 to-slate-300'} opacity-90`}
            style={{ width: `${width}%`, boxShadow: '0 0 6px rgba(255,255,255,0.08)' }}
          >
            <span className="absolute right-0 top-1/2 h-[4px] w-[4px] -translate-y-1/2 rounded-full bg-white/55 blur-[0.5px]" />
          </span>
        </span>
      </div>
    );
  }

  function flip(nextKey) {
    setSort(
      key === nextKey
        ? [nextKey, direction === 'desc' ? 'asc' : 'desc']
        : [nextKey, nextKey === 'name' ? 'asc' : 'desc'],
    );
  }

  function Header({ id, children, className = '' }) {
    return (
      <th className={`py-2 ${className}`}>
        <button
          onClick={() => flip(id)}
          className={
            key === id
              ? 'w-full font-black text-blue-300'
              : 'w-full font-black hover:text-blue-300'
          }
        >
          {children} {key === id ? (direction === 'desc' ? '↓' : '↑') : '↕'}
        </button>
      </th>
    );
  }

  const history = useMemo(() => {
    if (!selected) return [];

    return [...(events || [])]
      .filter(
        (event) =>
          samePlayerName(event.killer, selected.name) ||
          samePlayerName(event.victim, selected.name),
      )
      .sort(
        (a, b) =>
          String(a.date || '').localeCompare(
            String(b.date || ''),
          ) ||
          Number(a.sec || 0) - Number(b.sec || 0),
      );
  }, [events, selected]);

  const kills = history.filter(
    (event) => samePlayerName(event.killer, selected?.name),
  ).length;

  const deaths = history.filter(
    (event) => samePlayerName(event.victim, selected?.name),
  ).length;

  const kdNumber = deaths ? kills / deaths : kills;
  const kd = kdNumber.toFixed(2);

  const {
    favourite,
    worst,
    guildBreakdown,
  } = useMemo(() => {
    const victims = {};
    const nemesis = {};
    const guilds = {};

    history.forEach((event) => {
      const isKill = samePlayerName(
        event.killer,
        selected?.name,
      );
      const isDeath = samePlayerName(
        event.victim,
        selected?.name,
      );

      if (isKill) add(victims, event.victim);
      if (isDeath) add(nemesis, event.killer);

      const guild =
        cleanGuild(event.guild) ||
        cleanGuild(event.war);

      if (!guild || (!isKill && !isDeath)) return;

      guilds[guild] ||= {
        name: guild,
        kills: 0,
        deaths: 0,
        wars: new Set(),
      };

      if (isKill) guilds[guild].kills += 1;
      if (isDeath) guilds[guild].deaths += 1;

      guilds[guild].wars.add(
        String(event.war || event.date || guild),
      );
    });

    const favouriteVictim =
      Object.entries(victims).sort(
        (a, b) =>
          b[1] - a[1] ||
          String(a[0]).localeCompare(String(b[0])),
      )[0] || ['-', 0];

    const worstNemesis =
      Object.entries(nemesis).sort(
        (a, b) =>
          b[1] - a[1] ||
          String(a[0]).localeCompare(String(b[0])),
      )[0] || ['-', 0];

    const guildRows = Object.values(guilds)
      .map((guild) => ({
        ...guild,
        wars: guild.wars.size,
        kd: guild.deaths
          ? guild.kills / guild.deaths
          : guild.kills,
      }))
      .sort(
        (a, b) =>
          b.kills + b.deaths - (a.kills + a.deaths) ||
          b.kills - a.kills ||
          a.name.localeCompare(b.name),
      );

    return {
      favourite: favouriteVictim,
      worst: worstNemesis,
      guildBreakdown: guildRows,
    };
  }, [history, selected]);

  const selectedLifetimeAverageStats = useMemo(() => {
    if (!selected) return null;

    const logs = Array.isArray(lifetimeLogs)
      ? lifetimeLogs.filter(Boolean)
      : [];

    if (!logs.length) return null;

    const totals = {
      kills: 0,
      deaths: 0,
      kd: 0,
      streak: 0,
      feed: 0,
      damageDealt: 0,
      damageTaken: 0,
      ccHits: 0,
      fortDamage: 0,
    };
    const counts = {
      kills: 0,
      deaths: 0,
      kd: 0,
      streak: 0,
      feed: 0,
      damageDealt: 0,
      damageTaken: 0,
      ccHits: 0,
      fortDamage: 0,
    };
    let participatedWars = 0;

    const metricAliases = {
      kills: ['kills', 'Kills'],
      deaths: ['deaths', 'Deaths'],
      feed: [
        'killFeed',
        'killfeed',
        'feed',
        'KillFeed',
        'Killfeed',
      ],
      damageDealt: [
        'damageDealt',
        'damage_dealt',
        'damage dealt',
        'damageDone',
        'damage',
        'Damage Dealt',
        'DamageDealt',
      ],
      damageTaken: [
        'damageTaken',
        'damage_taken',
        'damage taken',
        'Damage Taken',
        'DamageTaken',
      ],
      ccHits: [
        'ccHits',
        'cc_hits',
        'cc hits',
        'CC Hits',
        'CCHits',
        'cc',
        'CC',
      ],
      fortDamage: [
        'fortDamage',
        'damageToFort',
        'damage_to_fort',
        'damage to fort',
        'Fort Damage',
        'Damage to Fort',
        'DamageToFort',
      ],
    };

    function getLifetimeLogRaw(log) {
      return String(
        log?.raw ??
          log?.rawLog ??
          log?.raw_log ??
          log?.log ??
          log?.content ??
          log?._src?.raw ??
          log?._src?.rawLog ??
          log?._src?.raw_log ??
          log?._src?.log ??
          log?._src?.content ??
          '',
      );
    }

    function normalizePresenceText(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function structuredPresenceText(value, depth = 0) {
      if (value == null || depth > 3) return '';

      if (Array.isArray(value)) {
        return value
          .map((item) =>
            structuredPresenceText(item, depth + 1),
          )
          .join(' ');
      }

      if (typeof value === 'object') {
        return Object.entries(value)
          .map(
            ([key, item]) =>
              `${key} ${structuredPresenceText(
                item,
                depth + 1,
              )}`,
          )
          .join(' ');
      }

      return String(value);
    }

    function splitPresenceColumns(line) {
      const value = String(line || '').trim();

      if (!value) return [];

      const separated = [
        value.split(/\t+/),
        value.split(/\s*\|\s*/),
        value.split(/\s*;\s*/),
      ]
        .filter((parts) => parts.length > 1)
        .map((parts) =>
          parts.map((part) => part.trim()).filter(Boolean),
        )
        .sort((a, b) => b.length - a.length)[0];

      if (separated?.length > 1) return separated;

      const multiSpace = value
        .split(/\s{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (multiSpace.length > 1) return multiSpace;

      return value
        .split(/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);
    }

    function isPresenceNumber(value) {
      const raw = String(value || '').trim();

      if (!raw || !/\d/.test(raw)) return false;

      const withoutSuffix = raw
        .replace(/[kKmMbBtT]\s*$/g, '')
        .trim();

      if (/[A-Za-z]/.test(withoutSuffix)) return false;

      const cleaned = raw
        .replace(/[^\d\s.,+\-kKmMbBtT]/g, '')
        .trim();

      return /^[-+]?\d[\d\s.,]*(?:[kKmMbBtT])?$/.test(
        cleaned,
      );
    }

    function expandPresenceNumberColumns(columns) {
      return columns.flatMap((column) => {
        const raw = String(column || '').trim();
        const parts = raw.split(/\s+/).filter(Boolean);

        if (
          parts.length > 1 &&
          parts.every(isPresenceNumber)
        ) {
          return parts;
        }

        return [column];
      });
    }

    function parsePresenceNumber(value) {
      const raw = String(value || '')
        .trim()
        .replace(/[kKmMbBtT]\s*$/g, '')
        .replace(/\s+/g, '');

      if (!raw) return NaN;

      const lastComma = raw.lastIndexOf(',');
      const lastDot = raw.lastIndexOf('.');
      let normalized = raw;

      if (lastComma >= 0 && lastDot >= 0) {
        normalized =
          lastComma > lastDot
            ? raw.replace(/\./g, '').replace(',', '.')
            : raw.replace(/,/g, '');
      } else if (lastComma >= 0) {
        normalized = raw.replace(',', '.');
      }

      const number = Number(
        normalized.replace(/[^\d.+-]/g, ''),
      );

      return Number.isFinite(number) ? number : NaN;
    }

    function hasExplicitPresenceFlag(source, aliases) {
      if (!source) return false;

      return aliases.some((alias) => {
        const compact = String(alias).replace(
          /[^a-zA-Z0-9]/g,
          '',
        );
        const camel =
          compact.charAt(0).toLowerCase() +
          compact.slice(1);
        const snake = String(alias)
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/[^a-zA-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .toLowerCase();
        const candidates = [
          `has_${snake}`,
          `${snake}_exists`,
          `${snake}_present`,
          `${snake}_provided`,
          `${snake}_added`,
          `${camel}HasValue`,
          `${camel}Exists`,
          `${camel}Present`,
          `${camel}Provided`,
          `${camel}Added`,
        ];

        return candidates.some(
          (key) =>
            Object.prototype.hasOwnProperty.call(
              source,
              key,
            ) && Boolean(source[key]),
        );
      });
    }

    function sourceHasNonZeroMetric(source, aliases) {
      if (!source) return false;

      return aliases.some((alias) => {
        if (
          !Object.prototype.hasOwnProperty.call(
            source,
            alias,
          )
        ) {
          return false;
        }

        const value = Number(source[alias]);

        return Number.isFinite(value) && value !== 0;
      });
    }

    function detectLifetimeColumns(log, oneStats) {
      const presence = {
        kills: false,
        deaths: false,
        kd: false,
        feed: false,
        damageDealt: false,
        damageTaken: false,
        ccHits: false,
        fortDamage: false,
      };

      const raw = getLifetimeLogRaw(log);
      const startMarker =
        '===== ADVERSARY_SECONDARY_LOG_START =====';
      const endMarker =
        '===== ADVERSARY_SECONDARY_LOG_END =====';
      let secondaryRaw = '';

      if (
        raw.includes(startMarker) &&
        raw.includes(endMarker)
      ) {
        secondaryRaw =
          raw.split(startMarker)[1]?.split(endMarker)[0] ||
          '';
      }

      const normalizedSecondary =
        normalizePresenceText(secondaryRaw);
      const explicitHeader = {
        feed: /\bkill feed\b|\bkillfeed\b/.test(
          normalizedSecondary,
        ),
        damageDealt:
          /\bdamage dealt\b|\bdmg dealt\b/.test(
            normalizedSecondary,
          ),
        damageTaken:
          /\bdamage taken\b|\bdmg taken\b/.test(
            normalizedSecondary,
          ),
        ccHits:
          /\bcc hits?\b|\bcrowd control\b/.test(
            normalizedSecondary,
          ),
        fortDamage:
          /\bdamage (?:to|on) fort\b|\bfort damage\b|\bdmg to fort\b/.test(
            normalizedSecondary,
          ),
      };
      const hasRecognizedDetailHeader = Object.values(
        explicitHeader,
      ).some(Boolean);
      let foundRawStatsRow = false;

      String(secondaryRaw || '')
        .split(/\r?\n/)
        .forEach((line) => {
          let columns = splitPresenceColumns(line);

          columns = expandPresenceNumberColumns(columns);

          const firstNumberIndex = columns.findIndex(
            isPresenceNumber,
          );

          if (firstNumberIndex < 0) return;

          const numericColumns = columns
            .slice(firstNumberIndex)
            .filter(isPresenceNumber);

          if (numericColumns.length < 2) return;

          foundRawStatsRow = true;
          presence.kills = true;
          presence.deaths = true;
          presence.kd = true;

          if (hasRecognizedDetailHeader) {
            Object.entries(explicitHeader).forEach(
              ([metric, exists]) => {
                if (exists) presence[metric] = true;
              },
            );
            return;
          }

          const thirdRaw = String(numericColumns[2] || '');
          const thirdNumber =
            parsePresenceNumber(thirdRaw);
          const looksLikeFullTableWithKd =
            numericColumns.length >= 9 &&
            /[.,]/.test(thirdRaw) &&
            Number.isFinite(thirdNumber) &&
            thirdNumber >= 0 &&
            thirdNumber <= 50;

          if (looksLikeFullTableWithKd) {
            if (numericColumns.length >= 5) {
              presence.feed = true;
            }
            if (numericColumns.length >= 6) {
              presence.damageDealt = true;
            }
            if (numericColumns.length >= 7) {
              presence.damageTaken = true;
            }
            if (numericColumns.length >= 8) {
              presence.ccHits = true;
            }
            if (numericColumns.length >= 9) {
              presence.fortDamage = true;
            }
          } else {
            if (numericColumns.length >= 3) {
              presence.feed = true;
            }
            if (numericColumns.length >= 4) {
              presence.damageDealt = true;
            }
            if (numericColumns.length >= 5) {
              presence.damageTaken = true;
            }
            if (numericColumns.length >= 6) {
              presence.ccHits = true;
            }
            if (numericColumns.length >= 9) {
              presence.fortDamage = true;
            }
          }
        });

      if (foundRawStatsRow) return presence;

      const sourceSummary =
        log?.summary ||
        log?.stats ||
        log?.analytics ||
        log?._src?.summary ||
        log?._src?.stats ||
        log?._src?.analytics ||
        {};
      const summarySecondary =
        sourceSummary?.secondary ||
        sourceSummary?.secondaryStats ||
        {};
      const evidenceRows = [
        ...(Array.isArray(summarySecondary?.rows)
          ? summarySecondary.rows
          : []),
        ...(Array.isArray(sourceSummary?.players)
          ? sourceSummary.players
          : []),
        ...(oneStats?.secondary?.rows || []),
        ...(oneStats?.players || []),
      ];
      const structuredText = normalizePresenceText(
        structuredPresenceText([
          summarySecondary?.headers,
          summarySecondary?.header,
          summarySecondary?.columns,
          summarySecondary?.columnNames,
          summarySecondary?.fields,
          summarySecondary?.availableFields,
          summarySecondary?.schema,
          summarySecondary?.metrics,
          oneStats?.secondary?.headers,
          oneStats?.secondary?.header,
          oneStats?.secondary?.columns,
          oneStats?.secondary?.columnNames,
          oneStats?.secondary?.fields,
          oneStats?.secondary?.availableFields,
          oneStats?.secondary?.schema,
          oneStats?.secondary?.metrics,
        ]),
      );

      function structuredHasAlias(aliases) {
        return aliases.some((alias) => {
          const normalized = normalizePresenceText(alias);

          return Boolean(
            normalized &&
              structuredText.includes(normalized),
          );
        });
      }

      function hasSummaryMetric(metric) {
        const aliases = metricAliases[metric];

        return (
          structuredHasAlias(aliases) ||
          evidenceRows.some(
            (row) =>
              hasExplicitPresenceFlag(row, aliases) ||
              sourceHasNonZeroMetric(row, aliases),
          )
        );
      }

      const hasCoreSummaryRows =
        evidenceRows.length > 0;

      presence.kills = hasCoreSummaryRows;
      presence.deaths = hasCoreSummaryRows;
      presence.kd =
        presence.kills && presence.deaths;
      presence.feed = hasSummaryMetric('feed');
      presence.damageDealt =
        hasSummaryMetric('damageDealt');
      presence.damageTaken =
        hasSummaryMetric('damageTaken');
      presence.ccHits = hasSummaryMetric('ccHits');
      presence.fortDamage =
        hasSummaryMetric('fortDamage');

      return presence;
    }

    function readMetricValue(
      sources,
      aliases,
      fallback = 0,
    ) {
      for (const source of sources) {
        if (!source) continue;

        const key = aliases.find(
          (alias) =>
            Object.prototype.hasOwnProperty.call(
              source,
              alias,
            ) &&
            source[alias] !== undefined &&
            source[alias] !== null &&
            source[alias] !== '',
        );

        if (key) {
          const value = Number(source[key]);

          return Number.isFinite(value) ? value : fallback;
        }
      }

      return fallback;
    }

    function addAverageMetric(
      metric,
      value,
      exists = true,
    ) {
      const number = Number(value);

      if (!exists || !Number.isFinite(number)) return;

      totals[metric] += number;
      counts[metric] += 1;
    }

    logs.forEach((log) => {
      const oneStats = calculateStats([log]);
      const playerRow = (oneStats?.players || []).find(
        (player) =>
          samePlayerName(player?.name, selected.name),
      );
      const secondaryRow = (
        oneStats?.secondary?.rows || []
      ).find((row) =>
        samePlayerName(
          row?.player || row?.name,
          selected.name,
        ),
      );
      const playerEvents = (oneStats?.ev || []).filter(
        (event) =>
          samePlayerName(event?.killer, selected.name) ||
          samePlayerName(event?.victim, selected.name),
      );
      const participated =
        Boolean(playerRow) ||
        Boolean(secondaryRow) ||
        playerEvents.length > 0;

      if (!participated) return;

      participatedWars += 1;

      const columns = detectLifetimeColumns(
        log,
        oneStats,
      );
      const combatEvents = playerEvents.filter(
        (event) =>
          event?.type === 'kill' ||
          event?.type === 'death',
      );
      const hasCombatData = combatEvents.length > 0;
      const hasCombatTimeline = combatEvents.some(
        (event) =>
          event?.hasTimestamp !== false &&
          event?.source !== 'summary' &&
          event?.time != null,
      );
      const eventKills = combatEvents.filter(
        (event) =>
          event?.type === 'kill' &&
          samePlayerName(event?.killer, selected.name),
      ).length;
      const eventDeaths = combatEvents.filter(
        (event) =>
          event?.type === 'death' &&
          samePlayerName(event?.victim, selected.name),
      ).length;

      const killsExist =
        hasCombatData || columns.kills;
      const deathsExist =
        hasCombatData || columns.deaths;
      const warKills = columns.kills
        ? readMetricValue(
            [secondaryRow, playerRow],
            metricAliases.kills,
            eventKills,
          )
        : eventKills;
      const warDeaths = columns.deaths
        ? readMetricValue(
            [secondaryRow, playerRow],
            metricAliases.deaths,
            eventDeaths,
          )
        : eventDeaths;

      addAverageMetric(
        'kills',
        warKills,
        killsExist,
      );
      addAverageMetric(
        'deaths',
        warDeaths,
        deathsExist,
      );

      if (killsExist && deathsExist) {
        addAverageMetric(
          'kd',
          warDeaths ? warKills / warDeaths : warKills,
          true,
        );
      }

      const streakKey = getPlayerKeyFromObject(
        oneStats?.st,
        selected.name,
      );
      const streakValue = Number(
        getPlayerObjectValue(
          oneStats?.st,
          selected.name,
          0,
        ),
      );

      addAverageMetric(
        'streak',
        streakValue,
        hasCombatTimeline ||
          (streakKey != null && streakValue !== 0),
      );

      const feedKey = getPlayerKeyFromObject(
        oneStats?.fd,
        selected.name,
      );
      const feedFromObjects = Number(
        getPlayerObjectValue(
          oneStats?.fd,
          selected.name,
          0,
        ),
      );
      const feedFromRows = readMetricValue(
        [secondaryRow, playerRow],
        metricAliases.feed,
        feedFromObjects,
      );
      const feedExists =
        hasCombatTimeline ||
        columns.feed ||
        (feedKey != null && feedFromObjects !== 0);

      addAverageMetric(
        'feed',
        columns.feed ? feedFromRows : feedFromObjects,
        feedExists,
      );

      const damageDealtValue = readMetricValue(
        [secondaryRow, playerRow],
        metricAliases.damageDealt,
        0,
      );
      const damageTakenValue = readMetricValue(
        [secondaryRow, playerRow],
        metricAliases.damageTaken,
        0,
      );
      const ccHitsValue = readMetricValue(
        [secondaryRow, playerRow],
        metricAliases.ccHits,
        0,
      );
      const fortDamageValue = readMetricValue(
        [secondaryRow, playerRow],
        metricAliases.fortDamage,
        0,
      );

      addAverageMetric(
        'damageDealt',
        damageDealtValue,
        columns.damageDealt,
      );
      addAverageMetric(
        'damageTaken',
        damageTakenValue,
        columns.damageTaken,
      );
      addAverageMetric(
        'ccHits',
        ccHitsValue,
        columns.ccHits,
      );
      addAverageMetric(
        'fortDamage',
        fortDamageValue,
        columns.fortDamage,
      );
    });

    if (!participatedWars) return null;

    return {
      wars: participatedWars,
      metricWars: {
        ...counts,
      },
      kills: counts.kills
        ? totals.kills / counts.kills
        : null,
      deaths: counts.deaths
        ? totals.deaths / counts.deaths
        : null,
      kd: counts.kd
        ? totals.kd / counts.kd
        : null,
      streak: counts.streak
        ? totals.streak / counts.streak
        : null,
      feed: counts.feed
        ? totals.feed / counts.feed
        : null,
      damageDealt: counts.damageDealt
        ? totals.damageDealt / counts.damageDealt
        : null,
      damageTaken: counts.damageTaken
        ? totals.damageTaken / counts.damageTaken
        : null,
      ccHits: counts.ccHits
        ? totals.ccHits / counts.ccHits
        : null,
      fortDamage: counts.fortDamage
        ? totals.fortDamage / counts.fortDamage
        : null,
    };
  }, [selected, lifetimeLogs]);
  return (
    <Panel cls="overview-guild-panel overview-panel-transparent overview-accent-cyan h-[680px]">
      <div className="flex h-full flex-col">
        <div className="overview-section-header overview-header-cyan mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black">♙ Player Overview</h3>
            <p className="text-xs text-slate-400">
              CLICK A PLAYER TO SEE WAR PERFORMANCE
            </p>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search family name"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-400 md:w-64"
          />
        </div>

        <div className="overview-soft-surface min-h-0 flex-1 overflow-hidden rounded-2xl border border-transparent">
          <div className={`h-full overflow-y-auto pr-1 ${scrollCls}`}>
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <Header id="name" className="pl-4 text-left">
                    Family
                  </Header>
                  <Header id="kills" className="text-center">
                    Kills
                  </Header>
                  <Header id="deaths" className="text-center">
                    Deaths
                  </Header>
                  <Header id="kd" className="text-center">
                    K/D
                  </Header>
                  <Header id="streak" className="text-center">
                    Killstreak
                  </Header>
                  <Header id="feed" className="text-center">
                    KillFeed
                  </Header>
                  <Header id="damageDealt" className="text-center">
                    DMG Dealt
                  </Header>
                  <Header id="damageTaken" className="text-center">
                    DMG Taken
                  </Header>
                  <Header id="ccHits" className="text-center">
                    CC Hits
                  </Header>
                  <Header id="fortDamage" className="text-center">
                    DMG to Fort
                  </Header>
                </tr>
              </thead>

              <tbody>
                {rows.map((player) => (
                  <tr
                    key={player.name}
                    className="border-t border-slate-800 bg-slate-950/30 hover:bg-slate-900/50"
                  >
                    <td className="py-2 pl-3">
                      <button
                        onClick={() => openPlayerDetails(player)}
                        className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 font-bold text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/20"
                      >
                        {player.name}
                      </button>
                    </td>

                    <td className="py-2 text-center font-black text-blue-300">
                      <ProgressValue id="kills" value={player.kills}>
                        <MetricGlyph type="kills" color="#60a5fa" /> {formatNumber(player.kills)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-pink-300">
                      <ProgressValue id="deaths" value={player.deaths}>
                        <MetricGlyph type="deaths" color="#dc2626" /> {formatNumber(player.deaths)}
                      </ProgressValue>
                    </td>

                    <td
                      className={`py-2 text-center font-black ${
                        Number(player.kd) < 1 ? 'text-red-400' : 'text-emerald-300'
                      }`}
                    >
                      <ProgressValue id="kd" value={player.kd}>
                        <MetricGlyph type="kd" color={Number(player.kd) < 1 ? "#ef4444" : "#22c55e"} /> {player.kd}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black">
                      <ProgressValue id="streak" value={player.streak}>
                        {formatNumber(player.streak)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-orange-300">
                      <ProgressValue id="feed" value={player.feed}>
                        🔥 {formatNumber(player.feed)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-cyan-300">
                      <ProgressValue id="damageDealt" value={player.damageDealt}>
                        {formatNumber(player.damageDealt)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-rose-300">
                      <ProgressValue id="damageTaken" value={player.damageTaken}>
                        {formatNumber(player.damageTaken)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-violet-300">
                      <ProgressValue id="ccHits" value={player.ccHits}>
                        {formatNumber(player.ccHits)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-amber-300">
                      <ProgressValue id="fortDamage" value={player.fortDamage}>
                        {formatNumber(player.fortDamage)}
                      </ProgressValue>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected &&
          typeof document !== 'undefined' &&
          createPortal(
          <PlayerPerformanceModal
            title={selected.name}
            subtitle="Selected war compared with full lifetime per-war averages"
            close={() => setSelected(null)}
          >
            <div className="overview-popup-shell relative overflow-visible rounded-[24px] border border-transparent bg-transparent p-0 sm:p-1">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/25 to-transparent" />
            <div className="mb-2">
              <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">
                    War vs Lifetime Average
                  </p>
                  <p className="text-[11px] font-bold text-slate-500">
                    {lifetimeLoading
                      ? 'Loading full lifetime history…'
                      : `${
                          selectedLifetimeAverageStats?.wars || 0
                        } lifetime wars · each stat uses only wars where that data exists`}
                  </p>
                </div>

                <p className="text-[9px] font-bold text-slate-600">
                  Green = better · Red = worse
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <PlayerAverageComparisonCard
                  label="Kills"
                  current={kills}
                  average={selectedLifetimeAverageStats?.kills}
                  averageMatches={
                    selectedLifetimeAverageStats?.metricWars?.kills || 0
                  }
                  type="average"
                  tone="blue"
                />

                <PlayerAverageComparisonCard
                  label="Deaths"
                  current={deaths}
                  average={selectedLifetimeAverageStats?.deaths}
                  averageMatches={
                    selectedLifetimeAverageStats?.metricWars?.deaths || 0
                  }
                  lowerIsBetter
                  type="average"
                  tone="pink"
                />

                <PlayerAverageComparisonCard
                  label="K/D"
                  current={kdNumber}
                  average={selectedLifetimeAverageStats?.kd}
                  averageMatches={
                    selectedLifetimeAverageStats?.metricWars?.kd || 0
                  }
                  type="kd"
                  tone={kdNumber < 1 ? 'red' : 'emerald'}
                />

                <PlayerAverageComparisonCard
                  label="Killstreak"
                  current={streaks[selected.name] || 0}
                  average={selectedLifetimeAverageStats?.streak}
                  averageMatches={
                    selectedLifetimeAverageStats?.metricWars?.streak || 0
                  }
                  type="average"
                  tone="slate"
                />

                <PlayerAverageComparisonCard
                  label="Killfeed"
                  current={feeds[selected.name] || 0}
                  average={selectedLifetimeAverageStats?.feed}
                  averageMatches={
                    selectedLifetimeAverageStats?.metricWars?.feed || 0
                  }
                  type="average"
                  tone="orange"
                />

                <PlayerAverageComparisonCard
                  label="DMG Dealt"
                  current={selected.damageDealt}
                  average={selectedLifetimeAverageStats?.damageDealt}
                  averageMatches={
                    selectedLifetimeAverageStats?.metricWars?.damageDealt || 0
                  }
                  type="average"
                  tone="cyan"
                />

                <PlayerAverageComparisonCard
                  label="DMG Taken"
                  current={selected.damageTaken}
                  average={selectedLifetimeAverageStats?.damageTaken}
                  averageMatches={
                    selectedLifetimeAverageStats?.metricWars?.damageTaken || 0
                  }
                  lowerIsBetter
                  type="average"
                  tone="rose"
                />

                <PlayerAverageComparisonCard
                  label="CC Hits"
                  current={selected.ccHits}
                  average={selectedLifetimeAverageStats?.ccHits}
                  averageMatches={
                    selectedLifetimeAverageStats?.metricWars?.ccHits || 0
                  }
                  type="average"
                  tone="violet"
                />

                <PlayerAverageComparisonCard
                  label="DMG to Fort"
                  current={selected.fortDamage}
                  average={selectedLifetimeAverageStats?.fortDamage}
                  averageMatches={
                    selectedLifetimeAverageStats?.metricWars?.fortDamage || 0
                  }
                  type="average"
                  tone="amber"
                />
              </div>
            </div>

            <div className="mb-2 grid gap-1.5 md:grid-cols-2">
              <div className="overview-popup-card overview-popup-card-blue relative overflow-hidden rounded-xl border border-transparent p-2">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Favorite victim
                </p>
                <p className="mt-1 font-black">{favourite[0]}</p>
                <p className="text-sm font-bold text-blue-300">
                  {favourite[1]} kills
                </p>
              </div>

              <div className="overview-popup-card overview-popup-card-rose relative overflow-hidden rounded-xl border border-transparent p-2">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Nemesis
                </p>
                <p className="mt-1 font-black">{worst[0]}</p>
                <p className="text-sm font-bold text-pink-300">
                  {worst[1]} deaths
                </p>
              </div>
            </div>

            <div className="overview-popup-section overview-popup-accent-violet mb-2 overflow-hidden rounded-xl border border-transparent">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 bg-slate-950/20 px-3 py-2.5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">
                    Guild Matchups
                  </p>
                  <p className="text-[10px] font-bold text-slate-600">
                    Every enemy guild this player fought
                  </p>
                </div>

                <span className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] font-black text-slate-400">
                  {guildBreakdown.length} guilds
                </span>
              </div>

              {!guildBreakdown.length ? (
                <p className="px-4 py-5 text-sm text-slate-500">
                  No guild matchup data found.
                </p>
              ) : (
                <div className={`max-h-[190px] overflow-y-auto ${scrollCls}`}>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-950/95 text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3 text-left">Guild</th>
                        <th className="px-4 py-3 text-center">Wars</th>
                        <th className="px-4 py-3 text-center">Kills</th>
                        <th className="px-4 py-3 text-center">Deaths</th>
                        <th className="px-5 py-3 text-center">K/D</th>
                      </tr>
                    </thead>

                    <tbody>
                      {guildBreakdown.map((guild) => (
                        <tr
                          key={guild.name}
                          className="border-t border-slate-800/80 bg-slate-950/25 transition hover:bg-slate-900/55"
                        >
                          <td className="max-w-[240px] truncate px-5 py-3.5 font-black text-slate-100">
                            {guild.name}
                          </td>

                          <td className="px-4 py-3.5 text-center font-black text-slate-300">
                            {guild.wars}
                          </td>

                          <td className="px-4 py-3.5 text-center font-black text-blue-300">
                            {guild.kills}
                          </td>

                          <td className="px-4 py-3.5 text-center font-black text-pink-300">
                            {guild.deaths}
                          </td>

                          <td
                            className={`px-5 py-3.5 text-center font-black ${
                              guild.kd >= 1
                                ? 'text-emerald-300'
                                : 'text-rose-300'
                            }`}
                          >
                            {guild.kd.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div
              className={`overview-popup-section overview-popup-accent-cyan max-h-[28vh] overflow-auto rounded-2xl border border-transparent ${scrollCls}`}
            >
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-3.5 pl-5 text-left">Time</th>
                    <th className="px-3 py-3.5 text-left">Type</th>
                    <th className="px-3 py-3.5 text-left">Opponent</th>
                    <th className="py-3.5 pr-5 text-left">Guild / War</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((event, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-800 bg-slate-950/30"
                    >
                      <td className="py-4 pl-5 font-black">{event.time}</td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            samePlayerName(event.killer, selected.name)
                              ? 'bg-blue-500/15 text-blue-300'
                              : 'bg-pink-500/15 text-pink-300'
                          }`}
                        >
                          {samePlayerName(event.killer, selected.name) ? 'KILL' : 'DEATH'}
                        </span>
                      </td>

                      <td className="px-3 py-4 font-bold text-white">
                        {samePlayerName(event.killer, selected.name)
                          ? event.victim
                          : event.killer}
                      </td>

                      <td className="py-4 pr-5 text-slate-300">
                        {event.guild} / {event.war}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </PlayerPerformanceModal>,
          document.body,
        )}
      </div>
    </Panel>
  );
}

function EnemyGuilds({ guilds, events }) {
  const chartRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [guildListOpen, setGuildListOpen] = useState(false);
  const [guildSearch, setGuildSearch] = useState('');
  const [chartGuildFilter, setChartGuildFilter] = useState('');

  function calculateGuildKd(kills, deaths) {
    const safeKills = Number(kills) || 0;
    const safeDeaths = Number(deaths) || 0;

    if (safeDeaths > 0) return safeKills / safeDeaths;
    return safeKills > 0 ? safeKills : 0;
  }

  const guildMatchStats = useMemo(() => {
    const matchesByGuild = {};

    [...(events || [])].forEach((event) => {
      const guildName = cleanGuild(event.guild);
      const guildKey = normalizePlayerName(guildName);

      if (!guildName || !guildKey) return;

      const matchKey = String(
        event.matchId ||
          event.match_id ||
          event.logId ||
          event.log_id ||
          event.sourceLogId ||
          event.source_log_id ||
          [event.date, event.war].filter(Boolean).join('|') ||
          event.date ||
          event.war ||
          'selected-war',
      );

      matchesByGuild[guildKey] ||= {
        name: guildName,
        matches: new Map(),
      };

      const guildEntry = matchesByGuild[guildKey];

      if (!guildEntry.matches.has(matchKey)) {
        guildEntry.matches.set(matchKey, {
          eventKills: 0,
          eventDeaths: 0,
        });
      }

      const match = guildEntry.matches.get(matchKey);

      // Keep the raw event direction here. The rows calculation below aligns
      // it with the Enemy Guild totals, whose kills/deaths are stored from the
      // opposite perspective by calculateStats.
      if (event.type === 'kill') match.eventKills += 1;
      if (event.type === 'death') match.eventDeaths += 1;
    });

    return matchesByGuild;
  }, [events]);

  function formatAverageValue(value) {
    const number = Number(value) || 0;

    if (number >= 100) {
      return Math.round(number).toLocaleString('en-US');
    }

    return number.toFixed(1).replace(/\.0$/, '');
  }

  function formatGuildKd(value) {
    return (Number(value) || 0).toFixed(2);
  }

  const rows = useMemo(
    () =>
      [...(guilds || [])]
        .map((guild) => {
          const guildKey = normalizePlayerName(guild.name);
          const selectedMatchEntry = guildMatchStats[guildKey];
          const rawMatches = selectedMatchEntry
            ? [...selectedMatchEntry.matches.values()].filter(
                (match) =>
                  Number(match.eventKills) > 0 ||
                  Number(match.eventDeaths) > 0,
              )
            : [];

          // calculateStats stores an enemy guild's kills as our deaths and its
          // deaths as our kills. The bubble graph and popup display OUR result
          // versus that guild, so these are intentionally reversed here.
          const fallbackKills = Number(guild.deaths) || 0;
          const fallbackDeaths = Number(guild.kills) || 0;

          let orientedMatches = rawMatches.map((match) => ({
            kills: Number(match.eventKills) || 0,
            deaths: Number(match.eventDeaths) || 0,
          }));

          if (orientedMatches.length) {
            const directKills = orientedMatches.reduce(
              (sum, match) => sum + match.kills,
              0,
            );
            const directDeaths = orientedMatches.reduce(
              (sum, match) => sum + match.deaths,
              0,
            );
            const directError =
              Math.abs(directKills - fallbackKills) +
              Math.abs(directDeaths - fallbackDeaths);
            const reversedError =
              Math.abs(directDeaths - fallbackKills) +
              Math.abs(directKills - fallbackDeaths);

            // Align the raw event direction with the trusted aggregate totals.
            // This prevents kills/deaths being inverted when event sources use
            // the enemy perspective.
            if (reversedError < directError) {
              orientedMatches = orientedMatches.map((match) => ({
                kills: match.deaths,
                deaths: match.kills,
              }));
            }
          }

          const selectedMatches = orientedMatches.length;
          const selectedKills = orientedMatches.reduce(
            (sum, match) => sum + match.kills,
            0,
          );
          const selectedDeaths = orientedMatches.reduce(
            (sum, match) => sum + match.deaths,
            0,
          );
          const kills = selectedMatches ? selectedKills : fallbackKills;
          const deaths = selectedMatches ? selectedDeaths : fallbackDeaths;
          const totalInteractions = kills + deaths;
          const kdNumber = calculateGuildKd(kills, deaths);
          const totalMatches = Math.max(
            1,
            selectedMatches ||
              Number(guild.matches) ||
              Number(guild.wars) ||
              Number(guild.totalMatches) ||
              0,
          );
          const averageKills = totalMatches ? kills / totalMatches : 0;
          const averageDeaths = totalMatches ? deaths / totalMatches : 0;

          // Average K/D means the arithmetic mean of each selected war's K/D,
          // which is distinct from the combined total K/D shown in row one.
          const averageKd = selectedMatches
            ? orientedMatches.reduce(
                (sum, match) =>
                  sum + calculateGuildKd(match.kills, match.deaths),
                0,
              ) / selectedMatches
            : kdNumber;

          return {
            ...guild,
            kills,
            deaths,
            totalInteractions,
            totalMatches,
            averageKills,
            averageDeaths,
            averageKd,
            kdNumber,
            kd: kdNumber.toFixed(2),
          };
        })
        .filter((guild) => guild.totalInteractions > 30)
        .sort(
          (a, b) =>
            b.kdNumber - a.kdNumber ||
            b.totalInteractions - a.totalInteractions ||
            a.name.localeCompare(b.name),
        ),
    [guilds, guildMatchStats],
  );

  const guildListRows = useMemo(() => {
    const query = guildSearch.trim().toLowerCase();

    return [...rows]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((guild) => !query || guild.name.toLowerCase().includes(query));
  }, [rows, guildSearch]);

  const chartRows = useMemo(() => {
    const firstRows = rows.slice(0, 32);

    if (!chartGuildFilter) return firstRows;

    const selectedGuild = rows.find((guild) => guild.name === chartGuildFilter);

    if (!selectedGuild || firstRows.some((guild) => guild.name === chartGuildFilter)) {
      return firstRows;
    }

    return [...firstRows.slice(0, 31), selectedGuild];
  }, [rows, chartGuildFilter]);

  const chartMeta = useMemo(() => {
    if (!chartRows.length) {
      return {
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
        maxV: 1,
      };
    }

    const killsValues = chartRows.map((guild) => guild.kills);
    const deathsValues = chartRows.map((guild) => guild.deaths);
    const kdValues = chartRows.map((guild) => guild.kdNumber);

    const minKills = Math.min(...killsValues);
    const maxKills = Math.max(...killsValues);
    const minDeaths = Math.min(...deathsValues);
    const maxDeaths = Math.max(...deathsValues);

    const xRange = Math.max(1, maxKills - minKills);
    const yRange = Math.max(1, maxDeaths - minDeaths);

    return {
      minX: Math.max(0, Math.floor(minKills - xRange * 0.08)),
      maxX: Math.ceil(maxKills + xRange * 0.08),
      minY: Math.max(0, Math.floor(minDeaths - yRange * 0.08)),
      maxY: Math.ceil(maxDeaths + yRange * 0.08),
      maxV: Math.max(1, ...kdValues),
    };
  }, [chartRows]);

  function kdColorChannels(kd) {
    if (kd > 1.5) {
      return [59, 130, 246];
    }

    if (kd >= 1.3) {
      return [34, 197, 94];
    }

    if (kd >= 1.1) {
      return [250, 204, 21];
    }

    if (kd >= 1) {
      return [249, 115, 22];
    }

    return [239, 68, 68];
  }

  function isHighlightedGuild(context) {
    const guild = context.raw?.guild;

    return chartGuildFilter && guild?.name === chartGuildFilter;
  }

  function colorize(opaque, context) {
    const value = context.raw || {};
    const guild = value.guild || {};
    const kd = Number(guild.kdNumber) || 0;
    const [r, g, b] = kdColorChannels(kd);

    if (chartGuildFilter && guild.name === chartGuildFilter) {
      return opaque ? 'rgba(250,204,21,1)' : `rgba(${r},${g},${b},0.92)`;
    }

    if (chartGuildFilter) {
      return opaque ? `rgba(${r},${g},${b},0.34)` : `rgba(${r},${g},${b},0.16)`;
    }

    const a = opaque ? 1 : 0.45 + 0.35 * Math.min(1, value.v / 1000);

    return `rgba(${r},${g},${b},${a})`;
  }

  function escapeTooltipText(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderEnemyGuildTooltip({ chart, tooltip }) {
    let tooltipElement = document.querySelector('.overview-enemy-guild-tooltip');

    if (!tooltipElement) {
      tooltipElement = document.createElement('div');
      tooltipElement.className = 'overview-enemy-guild-tooltip';
      tooltipElement.setAttribute('role', 'tooltip');
      document.body.appendChild(tooltipElement);
    }

    if (!tooltip || tooltip.opacity === 0) {
      tooltipElement.dataset.visible = 'false';
      return;
    }

    const guild = tooltip.dataPoints?.[0]?.raw?.guild;

    if (!guild) {
      tooltipElement.dataset.visible = 'false';
      return;
    }

    const [r, g, b] = kdColorChannels(Number(guild.kdNumber) || 0);
    const showAverages = Number(guild.totalMatches) > 1;
    const averagesMarkup = showAverages
      ? `
        <div class="overview-enemy-guild-tooltip__section-label">Average per selected war</div>
        <div class="overview-enemy-guild-tooltip__grid overview-enemy-guild-tooltip__grid--averages">
          <div class="overview-enemy-guild-tooltip__stat">
            <span class="overview-enemy-guild-tooltip__label">Avg Kills</span>
            <span class="overview-enemy-guild-tooltip__value overview-enemy-guild-tooltip__value--average-kills">${escapeTooltipText(formatAverageValue(guild.averageKills))}</span>
          </div>
          <div class="overview-enemy-guild-tooltip__stat">
            <span class="overview-enemy-guild-tooltip__label">Avg Deaths</span>
            <span class="overview-enemy-guild-tooltip__value overview-enemy-guild-tooltip__value--average-deaths">${escapeTooltipText(formatAverageValue(guild.averageDeaths))}</span>
          </div>
          <div class="overview-enemy-guild-tooltip__stat">
            <span class="overview-enemy-guild-tooltip__label">Avg K/D</span>
            <span class="overview-enemy-guild-tooltip__value overview-enemy-guild-tooltip__value--average overview-enemy-guild-tooltip__value--kd">${escapeTooltipText(formatGuildKd(guild.averageKd))}</span>
          </div>
        </div>
      `
      : '';

    tooltipElement.style.setProperty('--enemy-tooltip-rgb', `${r}, ${g}, ${b}`);
    tooltipElement.innerHTML = `
      <div class="overview-enemy-guild-tooltip__header">
        <div class="overview-enemy-guild-tooltip__name">${escapeTooltipText(guild.name || '-')}</div>
        <div class="overview-enemy-guild-tooltip__badge">${escapeTooltipText(guild.totalMatches)} ${Number(guild.totalMatches) === 1 ? 'War' : 'Wars'}</div>
      </div>

      <div class="overview-enemy-guild-tooltip__section-label">Selected wars totals</div>
      <div class="overview-enemy-guild-tooltip__grid">
        <div class="overview-enemy-guild-tooltip__stat">
          <span class="overview-enemy-guild-tooltip__label">Kills</span>
          <span class="overview-enemy-guild-tooltip__value overview-enemy-guild-tooltip__value--kills">${escapeTooltipText(guild.kills)}</span>
        </div>
        <div class="overview-enemy-guild-tooltip__stat">
          <span class="overview-enemy-guild-tooltip__label">Deaths</span>
          <span class="overview-enemy-guild-tooltip__value overview-enemy-guild-tooltip__value--deaths">${escapeTooltipText(guild.deaths)}</span>
        </div>
        <div class="overview-enemy-guild-tooltip__stat">
          <span class="overview-enemy-guild-tooltip__label">K/D</span>
          <span class="overview-enemy-guild-tooltip__value overview-enemy-guild-tooltip__value--kd">${escapeTooltipText(formatGuildKd(guild.kdNumber))}</span>
        </div>
      </div>

      ${averagesMarkup}
    `;

    tooltipElement.dataset.visible = 'true';

    const canvasRect = chart.canvas.getBoundingClientRect();
    const tooltipWidth = tooltipElement.offsetWidth || 292;
    const tooltipHeight = tooltipElement.offsetHeight || 190;
    const gap = 16;
    let left = canvasRect.left + tooltip.caretX + gap;
    let top = canvasRect.top + tooltip.caretY - tooltipHeight / 2;

    if (left + tooltipWidth > window.innerWidth - 10) {
      left = canvasRect.left + tooltip.caretX - tooltipWidth - gap;
    }

    left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));

    tooltipElement.style.left = `${Math.round(left)}px`;
    tooltipElement.style.top = `${Math.round(top)}px`;
  }

  const bubbleData = useMemo(
    () => ({
      datasets: [
        {
          label: 'Enemy Guilds',
          data: chartRows.map((guild) => ({
            x: guild.kills,
            y: guild.deaths,
            v: Math.max(1, (guild.kdNumber / chartMeta.maxV) * 1000),
            guild,
          })),
        },
      ],
    }),
    [chartRows, chartMeta],
  );

  const bubbleOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 450,
      },
      layout: {
        padding: 8,
      },
      plugins: {
        legend: false,
        tooltip: {
          enabled: false,
          external: renderEnemyGuildTooltip,
        },
      },
      scales: {
        x: {
          min: chartMeta.minX,
          max: chartMeta.maxX,
          title: {
            display: true,
            text: 'Kills',
            color: 'rgba(255,255,255,0.55)',
            font: {
              weight: 800,
              size: 11,
            },
          },
          grid: {
            color: 'rgba(255,255,255,0.055)',
            borderColor: 'rgba(255,255,255,0.18)',
            tickColor: 'rgba(255,255,255,0.12)',
          },
          ticks: {
            color: 'rgba(255,255,255,0.34)',
            font: {
              size: 10,
            },
          },
        },
        y: {
          min: chartMeta.minY,
          max: chartMeta.maxY,
          title: {
            display: true,
            text: 'Deaths',
            color: 'rgba(255,255,255,0.55)',
            font: {
              weight: 800,
              size: 11,
            },
          },
          grid: {
            color: 'rgba(255,255,255,0.07)',
            borderColor: 'rgba(255,255,255,0.18)',
            tickColor: 'rgba(255,255,255,0.12)',
          },
          ticks: {
            color: 'rgba(255,255,255,0.34)',
            font: {
              size: 10,
            },
          },
        },
      },
      elements: {
        point: {
          backgroundColor: colorize.bind(null, false),
          borderColor: colorize.bind(null, true),
          borderWidth(context) {
            return isHighlightedGuild(context) ? 4 : 1;
          },
          hoverBackgroundColor(context) {
            return colorize(false, context);
          },
          hoverBorderColor(context) {
            return colorize(true, context);
          },
          hoverBorderWidth(context) {
            return isHighlightedGuild(context)
              ? 6
              : Math.max(2, Math.round(8 * context.raw.v / 1000));
          },
          radius(context) {
            const size = Math.min(context.chart.width, context.chart.height);
            const base = Math.abs(context.raw.v) / 1000;
            const radius = Math.max(6, (size / 16) * base);

            return isHighlightedGuild(context) ? radius + 7 : radius;
          },
        },
      },
    }),
    [chartMeta, chartGuildFilter],
  );

  const log = selected
    ? events.filter((event) => event.guild === selected.name)
    : [];

  function handleBubbleClick(event) {
    if (!chartRef.current) return;

    const elements = getElementAtEvent(chartRef.current, event);
    const first = elements?.[0];

    if (!first) return;

    const guild = chartRows[first.index];

    if (guild) setSelected(guild);
  }

  function handleBubbleHover(event, elements) {
    const canvas = event?.native?.target;

    if (!canvas) return;

    canvas.style.cursor = elements?.length ? 'pointer' : 'default';
  }

  function clearGuildFilter() {
    setChartGuildFilter('');
    setSelected(null);
  }

  return (
    <Panel cls="overview-guild-panel overview-accent-rose h-[520px]">
      <div className="flex h-full flex-col">
        <div className="overview-section-header overview-header-rose mb-4 flex items-start justify-between gap-3">
          <h3 className="text-xl font-black">🛡 Enemy Guilds</h3>

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {chartGuildFilter && (
              <button
                type="button"
                onClick={clearGuildFilter}
                className="flex max-w-[220px] items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-100 transition hover:border-amber-300/70 hover:bg-amber-500/25"
                title="Clear selected guild"
              >
                <span className="text-amber-300">×</span>
                <span className="truncate">{chartGuildFilter}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setGuildSearch('');
                setGuildListOpen(true);
              }}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300 transition hover:border-blue-400/60 hover:bg-slate-800 hover:text-blue-100"
              title="Show enemy guilds"
            >
              {rows.length} guilds
            </button>
          </div>
        </div>

        {!chartRows.length ? (
          <p className="text-slate-500">No guild data yet.</p>
        ) : (
          <div className="overview-soft-surface relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-transparent bg-white/[0.035] backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(239,68,68,0.045)_0%,rgba(255,255,255,0.018)_46%,rgba(255,255,255,0.018)_54%,rgba(34,197,94,0.045)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_center,rgba(239,68,68,0.05),transparent_42%),radial-gradient(circle_at_right_center,rgba(34,197,94,0.05),transparent_42%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.008))]" />
            <Bubble
              ref={chartRef}
              data={bubbleData}
              options={bubbleOptions}
              onClick={handleBubbleClick}
              onHover={handleBubbleHover}
            />
          </div>
        )}

        {guildListOpen && (
          <Popup title="Enemy Guilds" close={() => setGuildListOpen(false)}>
            {!rows.length ? (
              <p className="text-slate-500">No guild data yet.</p>
            ) : (
              <div
                className={`max-h-[60vh] space-y-2 overflow-y-auto pr-2 ${scrollCls}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    clearGuildFilter();
                    setGuildListOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    !chartGuildFilter
                      ? 'border-blue-400/40 bg-blue-500/15 text-blue-100'
                      : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-blue-400/40 hover:bg-slate-800/90 hover:text-blue-100'
                  }`}
                >
                  <span className="font-black">All guilds</span>
                  <span className="text-xs font-bold text-slate-400">
                    {rows.length} guilds
                  </span>
                </button>

                <div className="sticky top-0 z-10 rounded-2xl border border-slate-800 bg-slate-950/95 p-2 backdrop-blur-xl">
                  <input
                    value={guildSearch}
                    onChange={(event) => setGuildSearch(event.target.value)}
                    autoFocus
                    placeholder="Search guild..."
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                  />

                  {guildSearch.trim() && (
                    <p className="mt-2 px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {guildListRows.length} suggestions
                    </p>
                  )}
                </div>

                {!guildListRows.length ? (
                  <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-5 text-sm font-bold text-slate-500">
                    No guild found.
                  </p>
                ) : (
                  guildListRows.map((guild) => (
                    <button
                      key={guild.name}
                      type="button"
                      onClick={() => {
                        setChartGuildFilter(guild.name);
                        setGuildListOpen(false);
                        setSelected(null);
                      }}
                      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        chartGuildFilter === guild.name
                          ? 'border-amber-400/45 bg-amber-500/15 text-amber-100'
                          : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-blue-400/40 hover:bg-slate-800/90 hover:text-blue-100'
                      }`}
                    >
                      <span className="min-w-0 truncate font-black">
                        {guild.name}
                      </span>

                      <span className="grid grid-cols-2 gap-x-3 gap-y-1 text-right text-[10px] font-black uppercase tracking-wide text-slate-400 sm:grid-cols-4">
                        <span>Matches {guild.totalMatches}</span>
                        <span>Avg K {formatAverageValue(guild.averageKills)}</span>
                        <span>Avg D {formatAverageValue(guild.averageDeaths)}</span>
                        <span>Avg K/D {formatGuildKd(guild.averageKd)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </Popup>
        )}

        {selected && (
          <Popup
            title={`${selected.name} Kill Log`}
            close={() => setSelected(null)}
          >
            {!log.length ? (
              <p className="text-slate-500">No kill log found for this guild.</p>
            ) : (
              <div
                className={`max-h-[60vh] space-y-2 overflow-y-auto pr-2 ${scrollCls}`}
              >
                {log.map((event, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[82px_1fr_105px] gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm"
                  >
                    <div>
                      <b>{event.time}</b>
                      <p className="text-[10px] text-slate-500">{event.date}</p>
                    </div>

                    <p className="truncate">
                      <b
                        className={
                          event.type === 'kill'
                            ? 'text-blue-300'
                            : 'text-pink-300'
                        }
                      >
                        {event.type === 'kill' ? event.killer : event.victim}
                      </b>{' '}
                      {event.type === 'kill' ? 'killed' : 'died to'}{' '}
                      <b>
                        {event.type === 'kill' ? event.victim : event.killer}
                      </b>
                    </p>

                    <span
                      className={
                        event.type === 'kill'
                          ? 'text-blue-300'
                          : 'text-pink-300'
                      }
                    >
                      {event.type === 'kill' ? 'OUR KILL' : 'OUR DEATH'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Popup>
        )}
      </div>
    </Panel>
  );
}

const DISPLAY_KILL_FEED_WINDOW_SECONDS = 10;

function buildKillFeedPanelRows(selectedLogs, fallbackEvents) {
  const records = [];

  (selectedLogs || []).forEach((log, logIndex) => {
    const oneStats = calculateStats([log]);

    const fallbackDate = String(
      log?.date ||
        log?.warDate ||
        log?.war_date ||
        log?.createdAt ||
        log?.created_at ||
        '',
    ).slice(0, 10);

    const fallbackWar = String(
      log?.name ||
        log?.title ||
        fallbackDate ||
        'Battle log',
    );

    calculateKillFeed(
      oneStats?.ev || [],
      DISPLAY_KILL_FEED_WINDOW_SECONDS,
      true,
    ).forEach(
      (feed, feedIndex) => {
        records.push({
          ...feed,
          source: 'combat',
          sourceOrder: logIndex,
          rowOrder: feedIndex,
          war: feed.war || fallbackWar,
          date: String(feed.date || fallbackDate || '').slice(0, 10),
        });
      },
    );
  });

  if (records.length) return records;

  return calculateKillFeed(
    fallbackEvents || [],
    DISPLAY_KILL_FEED_WINDOW_SECONDS,
    true,
  ).map(
    (feed, index) => ({
      ...feed,
      source: 'combat',
      sourceOrder: index,
      rowOrder: index,
    }),
  );
}

function KillFeedPanel({ killFeeds, events }) {
  const rows = [...(killFeeds || [])]
    .sort(
      (a, b) =>
        (Number(b.count) || 0) - (Number(a.count) || 0) ||
        String(a.date || '9999-99-99').localeCompare(
          String(b.date || '9999-99-99'),
        ) ||
        timeToSecondsValue(a.start) - timeToSecondsValue(b.start) ||
        (Number(a.sourceOrder) || 0) - (Number(b.sourceOrder) || 0) ||
        (Number(a.rowOrder) || 0) - (Number(b.rowOrder) || 0) ||
        String(a.name || '').localeCompare(String(b.name || '')),
    )
    .slice(0, 5);

  return (
    <Panel cls="overview-guild-panel overview-panel-transparent overview-accent-orange overview-kill-feed-panel h-[520px] overflow-visible">
      <div className="flex h-full flex-col">
        <div className="overview-section-header overview-header-orange mb-4">
          <h3 className="text-xl font-black">🔥 Kill Feed</h3>
        </div>

        {!rows.length ? (
          <p className="text-slate-500">No kill feeds yet.</p>
        ) : (
          <div className="grid min-h-0 flex-1 grid-rows-5 gap-1.5 overflow-hidden">
            {rows.map((feed, index) => {
              const guild = majorityGuildForKillFeed(feed, events);
              const detail = `${feed.date ? `${feed.date} · ` : ''}${
                feed.start || '-'
              }-${feed.end || '-'}`;

              return (
                <div
                  key={`${feed.source || 'feed'}-${feed.date || ''}-${feed.name || ''}-${feed.sourceOrder || 0}-${feed.rowOrder || index}`}
                  className="overview-kill-feed-row min-h-0 rounded-xl border px-3 py-2"
                  style={{
                    '--overview-name-rgb': [
                      '249, 115, 22',
                      '168, 85, 247',
                      '6, 182, 212',
                      '244, 63, 94',
                      '234, 179, 8',
                    ][index % 5],
                  }}
                >
                  <div className="mb-0.5 flex items-center justify-between gap-2">
                    <b className="overview-player-name-chip min-w-0 truncate rounded-full px-2.5 py-0.5 text-[13px]">
                      {index + 1}. {feed.name}
                    </b>

                    <b className="shrink-0 text-sm text-orange-300">
                      🔥 {Number(feed.count) || 0}
                    </b>
                  </div>

                  <p className="truncate text-[11px] text-slate-400">
                    {detail}
                  </p>

                  <p className="truncate text-[11px] font-bold text-slate-300">
                    {guild}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}

export default function OverviewPage({
  stats,
  label,
  members,
  selectedLogs,
  lifetimeLogs = [],
  loadLifetimeLogs,
}) {
  const timelineKillFeeds = calculateKillFeed(
    stats.ev,
    DISPLAY_KILL_FEED_WINDOW_SECONDS,
    true,
  );
  const panelKillFeeds = useMemo(
    () => buildKillFeedPanelRows(selectedLogs, stats.ev),
    [selectedLogs, stats.ev],
  );
  const showTimelineMarkers = (selectedLogs || []).length === 1;

  function eventSortValue(event) {
    return [
      String(event?.date || ''),
      String(timeToSecondsValue(event?.time)).padStart(8, '0'),
      String(Number(event?.i) || 0).padStart(6, '0'),
    ].join(' ');
  }

  function buildConsecutiveFlowMarkers(events) {
    const markers = [];
    let currentType = null;
    let run = [];
    let markerAddedForRun = false;

    const timelineEvents = [...(events || [])]
      .filter((event) => event.type === 'kill' || event.type === 'death')
      .sort((a, b) => eventSortValue(a).localeCompare(eventSortValue(b)));

    timelineEvents.forEach((event) => {
      const nextType = event.type;

      if (nextType !== currentType) {
        currentType = nextType;
        run = [event];
        markerAddedForRun = false;
      } else {
        run.push(event);
      }

      if (run.length >= 10 && !markerAddedForRun) {
        const windowEvents = run.slice(-10);
        const startEvent = windowEvents[0];
        const endEvent = windowEvents[windowEvents.length - 1];

        const startSec = timeToSecondsValue(startEvent.time);
        const endSec = timeToSecondsValue(endEvent.time);
        const isInsideKillFeedWindow =
          endSec - startSec <= DISPLAY_KILL_FEED_WINDOW_SECONDS;

        if (!isInsideKillFeedWindow) return;

        const markerType = currentType === 'kill' ? 'bluefeed' : 'redfeed';
        const feedLabel = currentType === 'kill' ? 'Bluefeed' : 'Redfeed';
        const markerTime = startEvent.time;
        const guild =
          majorityGuildFromEvents(windowEvents) ||
          cleanGuild(startEvent.guild) ||
          cleanGuild(endEvent.guild) ||
          '-';

        markers.push({
          id: `${markerType}-${markerTime}-${guild}-${markers.length}`,
          markerType,
          feedLabel,
          time: markerTime,
          seconds: timeToSecondsValue(markerTime),
          guild,
        });

        markerAddedForRun = true;
      }
    });

    return markers;
  }

  const topKillFeedMarkers = showTimelineMarkers
    ? timelineKillFeeds.slice(0, 5).map((feed, index) => {
        const markerTime = feed.start;
        const markerSeconds = timeToSecondsValue(markerTime);
        const guild = majorityGuildForKillFeed(feed, stats.ev || []);

        return {
          id: `${feed.name || 'killfeed'}-${markerTime || index}-${guild}-${index}`,
          markerType: 'killfeed',
          time: markerTime,
          seconds: markerSeconds,
          guild,
          player: feed.name || '-',
          count: Number(feed.count) || 0,
          victims: feed.victims || [],
        };
      })
    : [];

  const flowMarkers = showTimelineMarkers
    ? buildConsecutiveFlowMarkers(stats.ev || [])
    : [];

  const playerSecondaryTotals = (stats.players || []).reduce(
    (totals, player) => ({
      damageDealt:
        totals.damageDealt + (Number(player.damageDealt) || 0),
      damageTaken:
        totals.damageTaken + (Number(player.damageTaken) || 0),
      ccHits: totals.ccHits + (Number(player.ccHits) || 0),
      fortDamage: totals.fortDamage + (Number(player.fortDamage) || 0),
    }),
    { damageDealt: 0, damageTaken: 0, ccHits: 0, fortDamage: 0 },
  );

  const secondaryTotals = stats.secondary?.totals || {};
  const damageDealt =
    Number(secondaryTotals.damageDealt) || playerSecondaryTotals.damageDealt || 0;
  const damageTaken =
    Number(secondaryTotals.damageTaken) || playerSecondaryTotals.damageTaken || 0;
  const ccHits = Number(secondaryTotals.ccHits) || playerSecondaryTotals.ccHits || 0;
  const fortDamage =
    Number(secondaryTotals.fortDamage) || playerSecondaryTotals.fortDamage || 0;

  return (
    <div className="overview-guild-page space-y-4">
      <style>{OVERVIEW_GUILD_PANEL_CSS}</style>
      <header className="overview-guild-panel overview-panel-transparent overview-accent-amber overview-summary-panel rounded-3xl border border-transparent p-5">
        <div className="overview-section-header overview-header-amber mb-4">
          <h2 className="text-2xl font-black">Battle Analytics</h2>
          <p className="text-slate-400">{label}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <BattleMetricCard
            icon={<MetricGlyph type="kills" color="#60a5fa" />}
            label="Total Kills"
            value={stats.kills}
            sub="Eliminations"
            tone="blue"
            valueClass="text-blue-300"
          />

          <BattleMetricCard
            icon={<MetricGlyph type="deaths" color="#ef4444" />}
            label="Total Deaths"
            value={stats.deaths}
            sub="Deaths"
            tone="pink"
            valueClass="text-pink-300"
          />

          <BattleMetricCard
            icon={<MetricGlyph type="kd" color={Number(stats.kd) < 1 ? "#ef4444" : "#22c55e"} />}
            label="K/D"
            value={stats.kd}
            sub="Ratio"
            tone={Number(stats.kd) < 1 ? 'red' : 'emerald'}
            valueClass={Number(stats.kd) < 1 ? 'text-red-400' : 'text-emerald-300'}
          />

          <BattleMetricCard
            icon={<MetricGlyph type="players" color="#a855f7" />}
            label="Players"
            value={stats.players.length}
            sub="Active"
            tone="violet"
            valueClass="text-purple-300"
          />

          <BattleMetricCard
            icon={<MetricGlyph type="damageDealt" color="#38bdf8" />}
            label="Damage"
            value={compactNumber(damageDealt)}
            sub="Dealt"
            tone="cyan"
            valueClass="text-cyan-300"
          />

          <BattleMetricCard
            icon={<MetricGlyph type="damageTaken" color="#fb7185" />}
            label="Damage Taken"
            value={compactNumber(damageTaken)}
            sub="Taken"
            tone="rose"
            valueClass="text-rose-300"
          />

          <BattleMetricCard
            icon={<MetricGlyph type="ccHits" color="#a855f7" />}
            label="CC Hits"
            value={compactNumber(ccHits)}
            sub="Control"
            tone="violet"
            valueClass="text-violet-300"
          />

          <BattleMetricCard
            icon={<MetricGlyph type="damageToFort" color="#f59e0b" />}
            label="Fort Damage"
            value={compactNumber(fortDamage)}
            sub="Structure"
            tone="amber"
            valueClass="text-amber-300"
          />
        </div>
      </header>

      <div className="overview-guild-panel overview-panel-transparent overview-accent-blue overview-chart-shell">
        <KillDeathChart
          data={stats.line}
          title="▧ Global Kill/Death Timeline"
          killFeedMarkers={[...topKillFeedMarkers, ...flowMarkers]}
        />
      </div>

      <section className="grid items-stretch gap-4 xl:grid-cols-[520px_minmax(0,1fr)]">
        <AverageRank
          players={stats.players}
          members={members}
          streaks={stats.st}
          feeds={stats.fd}
          events={stats.ev}
          selectedLogs={selectedLogs}
        />

        <PlayerOverview
          players={stats.players}
          streaks={stats.st}
          feeds={stats.fd}
          events={stats.ev}
          lifetimeLogs={lifetimeLogs}
          loadLifetimeLogs={loadLifetimeLogs}
        />
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <EnemyGuilds guilds={stats.guilds} events={stats.ev} />

        <KillFeedPanel killFeeds={panelKillFeeds} events={stats.ev} />
      </section>
    </div>
  );
}
