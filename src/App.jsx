import React, { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Bar,
  Line as ChartLine,
  Legend,
} from 'recharts';

const NL = String.fromCharCode(10);
const API = '';
const TK = 'bdo_admin_token';
const HIDDEN_LEGACY_DATES = new Set(['2026-04-19', '2026-04-26']);

function adminToken() {
  let t = localStorage.getItem(TK);

  if (!t) {
    t = prompt('Admin token for saving/deleting logs:') || '';
    if (t) localStorage.setItem(TK, t);
  }

  return t;
}

async function apiGet(path) {
  const r = await fetch(API + path);

  if (!r.ok) throw new Error(await r.text());

  return r.json();
}

async function apiWrite(path, method, body) {
  const r = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-admin-token': adminToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (r.status === 401) {
    localStorage.removeItem(TK);
    throw new Error('Invalid admin token');
  }

  const text = await r.text();

  if (!r.ok) {
    throw new Error(text || `Request failed: ${r.status}`);
  }

  return text ? JSON.parse(text) : { ok: true };
}

async function apiDeleteLog(log) {
  const src = log._src || {};

  const payload = {
    id:
      log.apiId ||
      log.id ||
      src.id ||
      src._id ||
      src.log_id ||
      src.key ||
      src.objectKey ||
      src.filename ||
      src.fileName ||
      src.path ||
      src.slug,
    date: log.date,
    name: log.name,
    hash: log.hash,
  };

  const tryReq = async (path, method, body) => {
    try {
      return await apiWrite(path, method, body);
    } catch (error) {
      return { __err: error };
    }
  };

  const id = payload.id ? encodeURIComponent(String(payload.id)) : '';

  const attempts = [
    id && [`/api/logs/${id}`, 'DELETE'],
    ['/api/logs', 'DELETE', payload],
    ['/api/logs/delete', 'POST', payload],
    ['/api/logs', 'POST', { ...payload, action: 'delete', _method: 'DELETE' }],
  ].filter(Boolean);

  let last = null;

  for (const attempt of attempts) {
    const result = await tryReq(attempt[0], attempt[1], attempt[2]);

    if (!result.__err) {
      return result;
    }

    last = result.__err;
  }

  throw new Error(
    `Delete endpoint not found or not implemented. Last error: ${String(
      last?.message || last || '',
    )}`,
  );
}

const ach = [
  ['100 Kills', 100, 'k'],
  ['500 Kills', 500, 'k'],
  ['1000 Kills', 1000, 'k'],
  ['K/D 2+', 2, 'kd'],
  ['K/D 5+', 5, 'kd'],
  ['5 Killstreak', 5, 's'],
  ['10 Killstreak', 10, 's'],
  ['5 KillFeed', 5, 'f'],
];

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;

const mon = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const today = () => iso(new Date());

const mLabel = (m) => {
  const [a, b] = m.split('-').map(Number);

  return new Date(a, b - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const shiftM = (m, n) => {
  const [a, b] = m.split('-').map(Number);

  return mon(new Date(a, b - 1 + n, 1));
};

const mDays = (m) => {
  const [a, b] = m.split('-').map(Number);
  const first = new Date(a, b - 1, 1);
  const start = new Date(a, b - 1, 1 - first.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    return {
      iso: iso(d),
      day: d.getDate(),
      cur: d.getMonth() === b - 1,
    };
  });
};

const add = (o, k, n = 1) => {
  if (!k) return;
  o[k] = (o[k] || 0) + n;
};

const sec = (t) => {
  const p = String(t || '00:00:00')
    .split(':')
    .map(Number);

  return (p[0] || 0) * 3600 + (p[1] || 0) * 60 + (p[2] || 0);
};

const tm = (s) =>
  `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(
    Math.floor(s / 60) % 60,
  ).padStart(2, '0')}`;

const clean = (s) =>
  String(s || '')
    .split(NL)
    .map((x) => x.trim())
    .filter(Boolean)
    .join(NL);

const hash = (s) => {
  let h = 0;
  const t = clean(s);

  for (const c of t) {
    h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  }

  return String(h);
};

const dateOf = (x) =>
  x.date || x.warDate || x.war_date || x.createdAt?.slice?.(0, 10) || today();

const scrollCls =
  '[scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb:hover]:bg-slate-600';

function normalizeLog(x) {
  const apiId =
    x.id ??
    x._id ??
    x.log_id ??
    x.key ??
    x.objectKey ??
    x.filename ??
    x.fileName ??
    x.path ??
    x.slug;

  return {
    id: String(apiId ?? Date.now() + Math.random()),
    apiId,
    _src: x,
    name: x.name ?? x.title ?? x.date ?? x.warDate ?? 'Battle log',
    date: x.date ?? x.warDate ?? x.war_date ?? x.createdAt?.slice?.(0, 10) ?? today(),
    raw: x.raw ?? x.rawLog ?? x.raw_log ?? x.log ?? x.content ?? '',
    hash: x.hash,
    created: x.created ?? x.createdAt ?? x.created_at,
  };
}

function normalizeLogs(data) {
  const arr = Array.isArray(data)
    ? data
    : Array.isArray(data?.logs)
      ? data.logs
      : Array.isArray(data?.data)
        ? data.data
        : [];

  return arr
    .map(normalizeLog)
    .filter((x) => x.raw)
    .filter((x) => !(HIDDEN_LEGACY_DATES.has(dateOf(x)) && (x.name === dateOf(x) || !x.apiId)));
}

function normalizeMembers(data) {
  return Array.isArray(data) ? data : data?.members || data?.data || [];
}

function parse(raw, name, date, id) {
  return clean(raw)
    .split(NL)
    .map((line, i) => {
      const c = line.indexOf(']');
      const ps = line.lastIndexOf('(');
      const pe = line.lastIndexOf(')');

      if (c < 0 || ps < 0 || pe < 0) return null;

      const time = line.slice(1, c);
      const info = line.slice(c + 2, ps).trim();
      const f = line.slice(ps + 1, pe).split(',');

      if (f.length < 2) return null;

      if (info.includes(' has killed ')) {
        const [a, r] = info.split(' has killed ');
        const [v, g] = r.split(' from ');

        return (
          g && {
            i,
            type: 'kill',
            time,
            sec: sec(time),
            killer: a,
            victim: v,
            guild: g,
            kf: f[0],
            vf: f[1],
            war: name,
            date,
            id,
          }
        );
      }

      if (info.includes(' died to ')) {
        const [v, r] = info.split(' died to ');
        const [k, g] = r.split(' from ');

        return (
          g && {
            i,
            type: 'death',
            time,
            sec: sec(time),
            killer: k,
            victim: v,
            guild: g,
            kf: f[1],
            vf: f[0],
            war: name,
            date,
            id,
          }
        );
      }

      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.sec - b.sec || a.i - b.i);
}

function streaks(e) {
  const cur = {};
  const best = {};

  e.forEach((x) => {
    if (x.type === 'kill') {
      cur[x.killer] = (cur[x.killer] || 0) + 1;
      best[x.killer] = Math.max(best[x.killer] || 0, cur[x.killer]);
    } else {
      cur[x.victim] = 0;
    }
  });

  return best;
}

function feed(e, w = 10, details = false) {
  const by = {};

  e.filter((x) => x.type === 'kill').forEach((x) => {
    const k = `${x.killer}@@${x.id}`;
    (by[k] ||= []).push(x);
  });

  const out = details ? [] : {};

  for (const [k, a] of Object.entries(by)) {
    a.sort((x, y) => x.sec - y.sec);

    const n = k.split('@@')[0];
    let l = 0;
    let bs = 0;
    let be = 0;

    for (let r = 0; r < a.length; r += 1) {
      while (a[r].sec - a[l].sec > w) l += 1;

      if (r - l > be - bs) {
        bs = l;
        be = r;
      }
    }

    const list = a.slice(bs, be + 1);

    if (details) {
      if (list.length > 1) {
        out.push({
          name: n,
          count: list.length,
          start: list[0].time,
          end: list.at(-1).time,
          war: list[0].war,
          date: list[0].date,
          id: list[0].id,
          victims: list.map((x) => x.victim),
        });
      }
    } else {
      out[n] = Math.max(out[n] || 0, list.length);
    }
  }

  return details ? out.sort((a, b) => b.count - a.count || a.date.localeCompare(b.date)) : out;
}

function stats(items) {
  const ev = items
    .flatMap((x) => parse(x.raw, x.name, x.date, x.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.sec - b.sec);

  if (!ev.length) {
    return {
      ev: [],
      players: [],
      guilds: [],
      line: [],
      kills: 0,
      deaths: 0,
      kd: '0.00',
      st: {},
      fd: {},
    };
  }

  const pk = {};
  const pd = {};
  const fam = {};
  const gk = {};
  const gd = {};
  const mins = {};

  ev.forEach((x) => {
    if (x.type === 'kill') add(pk, x.killer);
    if (x.type === 'death') add(pd, x.victim);

    add(gk, x.guild, x.type === 'kill' ? 1 : 0);
    add(gd, x.guild, x.type === 'death' ? 1 : 0);

    fam[x.killer] = x.kf;
    fam[x.victim] = x.vf;

    const m = tm(Math.floor(x.sec / 60) * 60);

    mins[m] ||= {
      time: m,
      kills: 0,
      deaths: 0,
    };

    mins[m][x.type === 'kill' ? 'kills' : 'deaths'] += 1;
  });

  const first = Math.min(...ev.map((x) => x.sec));
  const last = Math.max(...ev.map((x) => x.sec));
  const line = [];

  for (let t = Math.floor(first / 60) * 60; t <= Math.floor(last / 60) * 60; t += 60) {
    line.push(mins[tm(t)] || { time: tm(t), kills: 0, deaths: 0 });
  }

  const players = [...new Set([...Object.keys(pk), ...Object.keys(pd)])]
    .map((n) => {
      const k = pk[n] || 0;
      const d = pd[n] || 0;

      return {
        name: n,
        family: fam[n] || '-',
        kills: k,
        deaths: d,
        kd: d ? (k / d).toFixed(2) : k.toFixed(2),
      };
    })
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);

  const guilds = [...new Set([...Object.keys(gk), ...Object.keys(gd)])].map((n) => {
    const k = gk[n] || 0;
    const d = gd[n] || 0;

    return {
      name: n,
      kills: k,
      deaths: d,
      kd: d ? (k / d).toFixed(2) : k.toFixed(2),
    };
  });

  const k = ev.filter((x) => x.type === 'kill').length;
  const d = ev.filter((x) => x.type === 'death').length;

  return {
    ev,
    players,
    guilds,
    line,
    kills: k,
    deaths: d,
    kd: d ? (k / d).toFixed(2) : k.toFixed(2),
    st: streaks(ev),
    fd: feed(ev),
  };
}

const Panel = ({ children, cls = '' }) => (
  <section
    className={`rounded-3xl border border-slate-700 bg-slate-950/70 p-3 shadow-2xl sm:p-5 ${cls}`}
  >
    {children}
  </section>
);

const Metric = ({ i, l, v, s, c }) => (
  <div className={`rounded-2xl border bg-gradient-to-br to-slate-950/40 p-4 sm:p-5 ${c}`}>
    <div className="flex gap-4">
      <b className="text-4xl">{i}</b>
      <div>
        <p className="text-sm text-slate-300">{l}</p>
        <p className="text-3xl font-black">{v}</p>
        <p className="text-sm text-slate-400">{s}</p>
      </div>
    </div>
  </div>
);

function Cal({ m, setM, selected, marked, onPick, footer }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setM(shiftM(m, -1))}
          className="rounded-lg border border-slate-700 px-2 py-1 hover:bg-slate-800"
        >
          ‹
        </button>

        <b className="text-sm">{mLabel(m)}</b>

        <button
          type="button"
          onClick={() => setM(shiftM(m, 1))}
          className="rounded-lg border border-slate-700 px-2 py-1 hover:bg-slate-800"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-500">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((x) => (
          <span key={x}>{x}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {mDays(m).map((d) => (
          <button
            key={d.iso}
            type="button"
            onClick={() => onPick(d.iso)}
            className={`relative h-8 rounded-lg text-xs font-black transition ${
              selected === d.iso
                ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                : marked.has(d.iso)
                  ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/35'
                  : d.cur
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-900'
            }`}
          >
            {d.day}
            {marked.has(d.iso) && (
              <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-300" />
            )}
          </button>
        ))}
      </div>

      {footer}
    </div>
  );
}

function Best({ players, members, st, fd, ev }) {
  const [q, setQ] = useState('');

  const by = Object.fromEntries(players.map((p) => [p.name, p]));
  const names = [...new Set([...(members || []).map((m) => m.name), ...players.map((p) => p.name)])];

  const rows = names.map((name) => {
    const p = by[name] || {
      name,
      kills: 0,
      deaths: 0,
      kd: '0.00',
    };

    return {
      ...p,
      kdN: +p.kd,
      streak: st[name] || 0,
      feed: fd[name] || 0,
    };
  });

  const reach = {};
  const run = {};

  [...(ev || [])]
    .sort((a, b) => a.date.localeCompare(b.date) || a.sec - b.sec || a.i - b.i)
    .filter((e) => e.type === 'kill')
    .forEach((e) => {
      run[e.killer] = (run[e.killer] || 0) + 1;

      const final = by[e.killer]?.kills || 0;

      if (final && run[e.killer] === final) {
        reach[e.killer] = `${e.date} ${String(e.sec).padStart(5, '0')} ${String(e.i).padStart(
          5,
          '0',
        )}`;
      }
    });

  const rankKills = () =>
    Object.fromEntries(
      [...rows]
        .sort(
          (a, b) =>
            b.kills - a.kills ||
            (reach[a.name] || '9999').localeCompare(reach[b.name] || '9999'),
        )
        .map((p, i) => [p.name, i + 1]),
    );

  const rank = (k, desc = true) => {
    const sorted = [...rows].sort((a, b) => (desc ? b[k] - a[k] : a[k] - b[k]));
    const out = {};
    let last;
    let rankNo = 0;

    sorted.forEach((p, i) => {
      const v = Number(p[k]) || 0;

      if (i === 0 || v !== last) {
        rankNo = i + 1;
      }

      out[p.name] = rankNo;
      last = v;
    });

    return out;
  };

  const r = {
    kills: rankKills(),
    deaths: rank('deaths', false),
    kd: rank('kdN'),
    streak: rank('streak'),
    feed: rank('feed'),
  };

  const final = rows
    .map((p) => ({
      ...p,
      avg: (r.kills[p.name] + r.deaths[p.name] + r.kd[p.name] + r.streak[p.name] + r.feed[p.name]) / 5,
    }))
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.avg - b.avg);

  return (
    <Panel cls="h-full">
      <h3 className="text-xl font-black">♛ Best Overall</h3>
      <p className="mb-3 text-xs text-slate-400">Average rank across whole guild</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search player..."
        className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-400"
      />

      {!final.length ? (
        <p className="text-slate-500">No players.</p>
      ) : (
        <div className={`max-h-[500px] space-y-1.5 overflow-y-auto pr-1 ${scrollCls}`}>
          {final.map((p, i) => (
            <div
              key={p.name}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-2 hover:bg-slate-900"
            >
              <div className="mb-1.5 flex justify-between gap-2">
                <b className="truncate">
                  <span className="mr-2 text-slate-500">{i + 1}</span>
                  {p.name}
                </b>

                <span className="rounded-md border border-blue-400/20 bg-blue-500/5 px-2 py-1 text-sm font-black text-blue-300">
                  <small className="mr-1 text-[9px] uppercase text-blue-200/80">Avg</small>
                  {p.avg.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1 text-center text-xs">
                {[
                  ['Kills', r.kills[p.name], 'text-blue-300'],
                  ['Deaths', r.deaths[p.name], 'text-pink-300'],
                  ['K/D', r.kd[p.name], 'text-emerald-300'],
                  ['Streak', r.streak[p.name], 'text-slate-200'],
                  ['Feed', r.feed[p.name], 'text-orange-300'],
                ].map((x) => (
                  <div key={x[0]} className="rounded-md bg-slate-950/70 p-1">
                    <p className="text-slate-500">{x[0]}</p>
                    <b className={x[2]}>#{x[1]}</b>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Overview({ players, st, fd, ev }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(['kills', 'desc']);
  const [sel, setSel] = useState(null);

  const [key, dir] = sort;

  const rows = players
    .map((p) => ({
      ...p,
      streak: st[p.name] || 0,
      feed: fd[p.name] || 0,
    }))
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const av = key === 'name' ? a.name.toLowerCase() : +a[key];
      const bv = key === 'name' ? b.name.toLowerCase() : +b[key];

      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;

      return 0;
    });

  const flip = (k) => {
    setSort(key === k ? [k, dir === 'desc' ? 'asc' : 'desc'] : [k, k === 'name' ? 'asc' : 'desc']);
  };

  const H = ({ id, children, cls = '' }) => (
    <th className={`py-3 ${cls}`}>
      <button
        type="button"
        onClick={() => flip(id)}
        className={key === id ? 'font-black text-blue-300' : 'font-black hover:text-blue-300'}
      >
        {children} {key === id ? (dir === 'desc' ? '↓' : '↑') : '↕'}
      </button>
    </th>
  );

  const hist = sel
    ? ev
        .filter((e) => e.killer === sel.name || e.victim === sel.name)
        .sort((a, b) => a.date.localeCompare(b.date) || a.sec - b.sec)
    : [];

  const kills = hist.filter((e) => e.killer === sel?.name).length;
  const deaths = hist.filter((e) => e.victim === sel?.name).length;
  const kd = deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2);
  const vict = {};
  const nem = {};

  hist.forEach((e) => {
    if (e.killer === sel?.name) add(vict, e.victim);
    if (e.victim === sel?.name) add(nem, e.killer);
  });

  const fav = Object.entries(vict).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  const bad = Object.entries(nem).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

  return (
    <Panel cls="h-full">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black">♙ Player Overview</h3>
          <p className="text-xs text-slate-400">Click a player name to view kill history</p>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search family name"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-400 md:w-64"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className={`max-h-[500px] overflow-y-auto pr-1 ${scrollCls}`}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <H id="name" cls="pl-4 text-left">
                  Family
                </H>
                <H id="kills" cls="text-right">
                  Kills
                </H>
                <H id="deaths" cls="text-right">
                  Deaths
                </H>
                <H id="kd" cls="text-right">
                  K/D
                </H>
                <H id="streak" cls="text-right">
                  Killstreak
                </H>
                <H id="feed" cls="pr-4 text-right">
                  KillFeed
                </H>
              </tr>
            </thead>

            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.name}
                  className="border-t border-slate-800 bg-slate-950/30 hover:bg-slate-900/50"
                >
                  <td className="py-3 pl-4">
                    <button
                      type="button"
                      onClick={() => setSel(p)}
                      className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 font-bold text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/20"
                    >
                      {p.name}
                    </button>
                  </td>

                  <td className="py-3 text-right font-black text-blue-300">⚔ {p.kills}</td>
                  <td className="py-3 text-right font-black text-pink-300">☠ {p.deaths}</td>
                  <td className="py-3 text-right font-black text-emerald-300">✺ {p.kd}</td>
                  <td className="py-3 text-right font-black">{p.streak}</td>
                  <td className="py-3 pr-4 text-right font-black text-orange-300">🔥 {p.feed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <h3 className="text-2xl font-black">{sel.name} highlights & history</h3>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                    Kills <b className="text-blue-300">{kills}</b>
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                    Deaths <b className="text-pink-300">{deaths}</b>
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                    KD <b className="text-emerald-300">{kd}</b>
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                    Killstreak <b>{st[sel.name] || 0}</b>
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                    Killfeed <b className="text-orange-300">{fd[sel.name] || 0}</b>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSel(null)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Favorite victim</p>
                  <p className="mt-1 font-black">{fav[0]}</p>
                  <p className="text-sm font-bold text-blue-300">{fav[1]} kills</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">Nemesis</p>
                  <p className="mt-1 font-black">{bad[0]}</p>
                  <p className="text-sm font-bold text-pink-300">{bad[1]} deaths</p>
                </div>
              </div>

              <div className={`max-h-[48vh] overflow-auto rounded-2xl border border-slate-800 ${scrollCls}`}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="py-3 pl-4 text-left">Time</th>
                      <th className="py-3 text-left">Type</th>
                      <th className="py-3 text-left">Opponent</th>
                      <th className="py-3 pr-4 text-left">Guild / War</th>
                    </tr>
                  </thead>

                  <tbody>
                    {hist.map((e, i) => (
                      <tr key={i} className="border-t border-slate-800 bg-slate-950/30">
                        <td className="py-3 pl-4 font-black">{e.time}</td>

                        <td className="py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              e.killer === sel.name
                                ? 'bg-blue-500/15 text-blue-300'
                                : 'bg-pink-500/15 text-pink-300'
                            }`}
                          >
                            {e.killer === sel.name ? 'KILL' : 'DEATH'}
                          </span>
                        </td>

                        <td className="py-3 font-bold">{e.killer === sel.name ? e.victim : e.killer}</td>
                        <td className="py-3 pr-4 text-slate-400">
                          {e.guild} / {e.war}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function RankList({ title, items, valueKey }) {
  const rows = items.slice(0, 5);
  const max = Math.max(1, ...rows.map((x) => Number(x[valueKey]) || 0));

  return (
    <Panel>
      <h3 className="mb-4 text-xl font-black">{title}</h3>

      {!rows.length ? (
        <p className="text-slate-500">No data yet.</p>
      ) : (
        rows.map((x, i) => {
          const v = Number(x[valueKey]) || 0;

          return (
            <div key={x.name} className="mb-4 grid grid-cols-[34px_1fr_55px] items-center gap-3 text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 font-black">
                {i + 1}
              </span>

              <div className="min-w-0">
                <p className="mb-2 truncate font-bold">{x.name}</p>

                <div className="h-2.5 rounded-full bg-slate-800">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300"
                    style={{
                      width: `${Math.max(6, Math.round((v / max) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <b className="text-right">{v}</b>
            </div>
          );
        })
      )}
    </Panel>
  );
}

function NodeWars({ logs, setPage, setSelDays, setSelWars, selWars }) {
  const [q, setQ] = useState('');
  const [warn, setWarn] = useState('');

  const rows = logs
    .map((x) => {
      const s = stats([{ ...x, date: dateOf(x) }]);

      const top = [...s.guilds]
        .map((g) => {
          const ourKills = g.kills;
          const ourDeaths = g.deaths;
          const total = ourKills + ourDeaths;
          const kd = ourKills ? (ourDeaths / ourKills).toFixed(2) : ourDeaths.toFixed(2);

          return {
            name: g.name,
            kills: ourDeaths,
            deaths: ourKills,
            total,
            kd,
          };
        })
        .sort((a, b) => b.total - a.total || b.kills - a.kills)
        .slice(0, 5);

      return {
        ...x,
        date: dateOf(x),
        players: s.players.length,
        kills: s.kills,
        deaths: s.deaths,
        kd: s.kd,
        top,
      };
    })
    .filter((r) => {
      const query = q.trim().toLowerCase();

      if (!query) return true;

      return r.top.some((g) => g.name.toLowerCase().includes(query));
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const visibleIds = rows.map((row) => String(row.id));
  const selectedVisibleCount = visibleIds.filter((id) => selWars.includes(id)).length;

  function selectDisplayedLogs() {
    if (!visibleIds.length) {
      setWarn('Nu există meciuri afișate pentru filtrul curent.');
      return;
    }

    setWarn('');
    setSelDays(['all']);
    setSelWars(visibleIds);
  }

  function clearSelection() {
    setWarn('');
    setSelDays(['current']);
    setSelWars(['current']);
  }

  function openOverview() {
    const selectedIds = selWars.filter((id) => id !== 'all' && id !== 'current');

    if (!selectedIds.length) {
      setWarn('Nu este selectat niciun war.');
      return;
    }

    setWarn('');
    setSelDays(['all']);
    setPage('overview');
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black">Node Wars</h2>
          <p className="text-sm text-slate-400">
            Saved match history · select multiple node wars for analysis in Overview
          </p>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <button
            type="button"
            onClick={selectDisplayedLogs}
            className="rounded-xl border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200 transition hover:bg-blue-500/20"
          >
            Select displayed logs
          </button>

          <button
            type="button"
            onClick={openOverview}
            className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-200 transition hover:bg-emerald-500/20"
          >
            Open overview
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-black text-slate-300 transition hover:bg-slate-800"
          >
            Clear
          </button>

          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setWarn('');
            }}
            placeholder="Search enemies..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:bg-slate-900 md:w-72"
          />
        </div>
      </div>

      {warn && (
        <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
          {warn}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
          Displayed logs: <b className="text-slate-100">{rows.length}</b>
        </span>

        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
          Selected displayed: <b className="text-blue-300">{selectedVisibleCount}</b>
        </span>

        {q.trim() && (
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
            Filter active: {q.trim()}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <div className={`max-h-[720px] overflow-auto ${scrollCls}`}>
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-4 pl-4 text-left">Time ↕</th>
                <th className="py-4 text-left">Alliance</th>
                <th className="py-4 text-left">Top 5 enemies</th>
                <th className="py-4 text-center">Players ↕</th>
                <th className="py-4 text-center">Kills ↕</th>
                <th className="py-4 text-center">Deaths ↕</th>
                <th className="py-4 text-center">KD ↕</th>
                <th className="py-4 pr-4 text-center">Select</th>
              </tr>
            </thead>

            <tbody>
              {!rows.length ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No saved node wars found for this search.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const id = String(r.id);
                  const checked = selWars.includes(id);

                  return (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setWarn('');
                        setSelDays([r.date]);
                        setSelWars([id]);
                        setPage('overview');
                      }}
                      className="cursor-pointer border-t border-slate-800 bg-slate-950/30 transition hover:bg-slate-900/60"
                    >
                      <td className="py-4 pl-4 font-black text-slate-200">
                        {new Date(r.date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-4">
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold">
                          Adversary{' '}
                          <b className={+r.kd >= 1 ? 'text-emerald-300' : 'text-rose-300'}>
                            {r.kd}
                          </b>
                        </span>
                      </td>

                      <td className="py-4">
                        <div className="flex max-w-[460px] flex-wrap gap-1.5">
                          {r.top.map((g) => (
                            <span
                              key={g.name}
                              className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold"
                            >
                              {g.name}{' '}
                              <b className={+g.kd >= 1 ? 'text-emerald-300' : 'text-rose-300'}>
                                {g.kd}
                              </b>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 text-center font-black">{r.players}</td>
                      <td className="py-4 text-center font-black text-blue-300">{r.kills}</td>
                      <td className="py-4 text-center font-black text-pink-300">{r.deaths}</td>

                      <td
                        className={`py-4 text-center font-black ${
                          +r.kd >= 1 ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {r.kd}
                      </td>

                      <td className="py-4 pr-4 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const cleanSelection = selWars.filter(
                              (x) => x !== 'all' && x !== 'current',
                            );

                            setWarn('');
                            setSelDays(['all']);

                            if (e.target.checked) {
                              setSelWars([...new Set([...cleanSelection, id])]);
                            } else {
                              setSelWars(cleanSelection.filter((x) => x !== id));
                            }
                          }}
                          className="h-5 w-5 cursor-pointer accent-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

function TopGuilds({ guilds, ev }) {
  const [sel, setSel] = useState(null);

  const rows = [...guilds]
    .map((g) => {
      const k = g.deaths;
      const d = g.kills;

      return {
        ...g,
        kills: k,
        deaths: d,
        kd: d ? (k / d).toFixed(2) : k.toFixed(2),
      };
    })
    .sort((a, b) => b.kills - a.kills)
    .slice(0, 8);

  const log = sel ? ev.filter((e) => e.guild === sel.name) : [];

  return (
    <Panel>
      <h3 className="text-xl font-black">🛡 Top Guilds</h3>
      <p className="mb-4 text-xs text-slate-400">Click a guild name to view the kill log</p>

      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-slate-400">
          <tr>
            <th className="text-left">Guild</th>
            <th>Kills</th>
            <th>Deaths</th>
            <th>K/D</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((g, i) => (
            <tr key={g.name} className="border-t border-slate-800">
              <td className="py-3">
                <button type="button" onClick={() => setSel(g)} className="font-bold hover:text-blue-300">
                  {i + 1}. {g.name}
                </button>
              </td>

              <td className="text-center font-black text-blue-300">{g.kills}</td>
              <td className="text-center font-black text-pink-300">{g.deaths}</td>
              <td className="text-center font-black text-emerald-300">{g.kd}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[82vh] w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-950">
            <div className="flex justify-between border-b border-slate-800 p-5">
              <div>
                <h3 className="text-2xl font-black">{sel.name} Kill Log</h3>
                <p className="text-sm text-slate-400">{log.length} events</p>
              </div>

              <button
                type="button"
                onClick={() => setSel(null)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2"
              >
                Close
              </button>
            </div>

            <div className={`max-h-[64vh] space-y-2 overflow-auto p-4 ${scrollCls}`}>
              {log.map((e, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[82px_1fr_105px] gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm"
                >
                  <div>
                    <b>{e.time}</b>
                    <p className="text-[10px] text-slate-500">{e.date}</p>
                  </div>

                  <p className="truncate">
                    <b className={e.type === 'kill' ? 'text-blue-300' : 'text-pink-300'}>
                      {e.type === 'kill' ? e.killer : e.victim}
                    </b>{' '}
                    {e.type === 'kill' ? 'killed' : 'died to'}{' '}
                    <b>{e.type === 'kill' ? e.victim : e.killer}</b>
                  </p>

                  <span className={e.type === 'kill' ? 'text-blue-300' : 'text-pink-300'}>
                    {e.type === 'kill' ? 'OUR KILL' : 'OUR DEATH'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Line({ data, title }) {
  return (
    <Panel>
      <h2 className="text-2xl font-black">{title}</h2>

      <div className="h-[260px] sm:h-[300px]">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,.14)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-35} textAnchor="end" height={55} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 14,
                color: '#fff',
              }}
            />
            <Area type="monotone" dataKey="kills" stroke="#60a5fa" fill="#60a5fa55" />
            <Area type="monotone" dataKey="deaths" stroke="#f9a8d4" fill="#fb718555" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function AvgPerformance({ data }) {
  return (
    <Panel>
      <div className="mb-3">
        <h2 className="text-2xl font-black">Average Performance</h2>
        <p className="text-sm text-slate-400">Average kills, deaths and K/D per selected node war day</p>
      </div>

      <div className="h-[280px] sm:h-[320px]">
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,.14)" />
            <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-35} textAnchor="end" height={55} />
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 14,
                color: '#fff',
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="avgKills" name="Avg Kills" radius={[8, 8, 0, 0]} fill="#60a5fa" />
            <Bar yAxisId="left" dataKey="avgDeaths" name="Avg Deaths" radius={[8, 8, 0, 0]} fill="#f472b6" />
            <ChartLine
              yAxisId="right"
              type="monotone"
              dataKey="avgKd"
              name="Avg K/D"
              stroke="#34d399"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function PlayerSelect({ players, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const sel = players.find((p) => p.name === value);
  const list = players.filter((p) => `${p.name} ${p.family || ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="relative mb-4 max-w-xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left shadow-lg backdrop-blur-xl transition hover:border-blue-300/50 hover:bg-white/10"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected player</p>
          <p className="truncate text-sm font-black">{sel ? sel.name : 'Select player'}</p>
        </div>

        <span className={`${open ? 'rotate-180 ' : ''}ml-3 shrink-0 text-slate-400 transition`}>⌄</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-xl">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
            placeholder="Search player..."
            className="mb-2 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />

          <div className={`max-h-64 overflow-y-auto pr-1 ${scrollCls}`}>
            {!list.length ? (
              <p className="px-3 py-4 text-sm text-slate-500">No players found.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                    setQ('');
                  }}
                  className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${
                    !value ? 'bg-blue-500/20 text-blue-100' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Select player
                </button>

                {list.map((p) => (
                  <button
                    type="button"
                    key={p.name}
                    onClick={() => {
                      onChange(p.name);
                      setOpen(false);
                      setQ('');
                    }}
                    className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${
                      value === p.name ? 'bg-blue-500/25 text-blue-100' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="min-w-0 truncate font-bold">{p.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('nodewars');
  const [raw, setRaw] = useState('');
  const [name, setName] = useState('Battle log');
  const [date, setDate] = useState(today());
  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [selDays, setSelDays] = useState(['current']);
  const [selWars, setSelWars] = useState(['current']);
  const [player, setPlayer] = useState('');
  const [msg, setMsg] = useState('');
  const [rOpen, setROpen] = useState(false);
  const [rawM, setRawM] = useState(mon(new Date()));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiGet('/api/logs')
      .then((d) => setLogs(normalizeLogs(d)))
      .catch((error) => {
        setLogs([]);
        setMsg(`Database load failed: ${String(error.message || error)}`);
      });

    apiGet('/api/members')
      .then((d) => setMembers(normalizeMembers(d)))
      .catch(() => setMembers([]));
  }, []);

  const current = selDays.includes('current');
  const all = selDays.includes('all');

  const active = useMemo(() => {
    if (current) {
      return [
        {
          id: 'current',
          name,
          date,
          raw,
        },
      ];
    }

    const base = all ? logs : logs.filter((x) => selDays.includes(dateOf(x)));

    return base
      .filter((x) => selWars.includes('all') || selWars.includes(String(x.id)))
      .map((x) => ({
        ...x,
        date: dateOf(x),
      }));
  }, [current, all, logs, selDays, selWars, name, date, raw]);

  const S = useMemo(() => stats(active), [active]);
  const label = current ? 'Current log' : all ? 'Selected saved wars' : selDays[0] || 'No day';
  const marked = new Set([...new Set(logs.map(dateOf))]);
  const st = S.st;
  const fd = S.fd;
  const killFeeds = feed(S.ev, 10, true);

  async function saveLog() {
    if (!parse(raw, name, date, 'x').length) {
      setMsg('Invalid log');
      return;
    }

    const h = hash(raw);
    const dup = logs.find((x) => x.hash === h || clean(x.raw) === clean(raw));

    if (dup) {
      setSelDays([dateOf(dup)]);
      setSelWars([String(dup.id)]);
      setMsg('Duplicate log detected');
      return;
    }

    try {
      const item = normalizeLog(await apiWrite('/api/logs', 'POST', { name, date, raw, hash: h }));
      const next = [item, ...logs];

      setLogs(next);
      setSelDays([item.date]);
      setSelWars([String(item.id)]);
      setMsg('Log saved to database');
    } catch (error) {
      setMsg(`Database save failed: ${String(error.message || error)}`);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setMsg('');

    try {
      await apiDeleteLog(deleteTarget);

      const id = String(deleteTarget.id);
      const next = logs.filter((x) => String(x.id) !== id);

      setLogs(next);
      setSelWars((old) => old.filter((x) => x !== id));
      setDeleteTarget(null);
      setMsg('Log deleted from database');
    } catch (error) {
      setMsg(`Delete failed: ${String(error.message || error)}`);
    } finally {
      setDeleting(false);
    }
  }

  const pStats = useMemo(() => {
    if (!player) return null;

    const v = {};
    const kb = {};
    const days = {};

    S.ev.forEach((e) => {
      if (e.killer === player || e.victim === player) {
        days[e.date] ||= {
          time: e.date,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };

        days[e.date].wars.add(e.id);
      }

      if (e.killer === player) {
        add(v, e.victim);
        days[e.date].kills += 1;
      }

      if (e.victim === player) {
        add(kb, e.killer);
        days[e.date].deaths += 1;
      }
    });

    const p = S.players.find((x) => x.name === player) || {
      kills: 0,
      deaths: 0,
      kd: '0.00',
    };

    const ordered = Object.values(days).sort((a, b) => a.time.localeCompare(b.time));

    const line = ordered.map((d) => ({
      time: d.time,
      kills: d.kills,
      deaths: d.deaths,
    }));

    const avgLine = ordered.map((d) => {
      const fights = Math.max(1, d.wars.size);
      const avgKills = +(d.kills / fights).toFixed(2);
      const avgDeaths = +(d.deaths / fights).toFixed(2);

      return {
        time: d.time,
        avgKills,
        avgDeaths,
        avgKd: +(avgDeaths ? avgKills / avgDeaths : avgKills).toFixed(2),
      };
    });

    return {
      ...p,
      v,
      kb,
      line,
      avgLine,
      ach: ach.map((a) => {
        const val =
          a[2] === 'k'
            ? p.kills
            : a[2] === 'kd'
              ? Number(p.kd)
              : a[2] === 's'
                ? st[player] || 0
                : a[2] === 'f'
                  ? fd[player] || 0
                  : 0;

        return {
          title: a[0],
          goal: a[1],
          val,
          done: val >= a[1],
        };
      }),
    };
  }, [player, S, st, fd]);

  const menu = [
    ['nodewars', 'Node Wars'],
    ['players', 'Player Stats'],
    ['raw', 'Raw Log'],
  ];

  const isActive = (x) => (x === 'nodewars' && (page === 'nodewars' || page === 'overview')) || page === x;

  return (
    <main className="min-h-screen bg-[#050b16] text-slate-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,.18),transparent_35%)]" />

      <div className="relative flex flex-col gap-4 p-3 sm:p-4 xl:flex-row xl:gap-5">
        <div className="sticky top-0 z-40 rounded-2xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl backdrop-blur xl:hidden">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-black">☾ Battle Analytics</h1>
            <span className="text-xs text-slate-400">Menu</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {menu.map((x) => (
              <button
                key={x[0]}
                type="button"
                onClick={() => setPage(x[0])}
                className={`rounded-xl px-3 py-2 text-center text-xs font-black ${
                  isActive(x[0])
                    ? 'border border-blue-400 bg-blue-500/20 text-white'
                    : 'border border-slate-700 bg-slate-900 text-slate-300'
                }`}
              >
                {x[1]}
              </button>
            ))}
          </div>
        </div>

        <aside className="hidden w-64 shrink-0 rounded-3xl border border-slate-700 bg-slate-950/70 p-4 xl:block">
          <h1 className="mb-6 text-center text-xl font-black">☾ Battle Analytics</h1>

          {menu.map((x) => (
            <button
              key={x[0]}
              type="button"
              onClick={() => setPage(x[0])}
              className={`mb-2 w-full rounded-xl px-4 py-3 text-left font-bold ${
                isActive(x[0]) ? 'border border-blue-400 bg-blue-500/20' : 'hover:bg-slate-900'
              }`}
            >
              {x[1]}
            </button>
          ))}
        </aside>

        <section className="min-w-0 flex-1 space-y-4 pb-20 xl:pb-0">
          {page === 'nodewars' && (
            <>
              <div className="flex gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 p-2">
                <button
                  type="button"
                  onClick={() => setPage('nodewars')}
                  className="rounded-xl border border-blue-400 bg-blue-500/20 px-4 py-2 text-sm font-bold text-white"
                >
                  Node Wars
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selDays.includes('current')) {
                      setSelDays(['all']);
                      setSelWars(['all']);
                    }
                    setPage('overview');
                  }}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900"
                >
                  Overview
                </button>
              </div>

              <NodeWars
                logs={logs}
                setPage={setPage}
                setSelDays={setSelDays}
                setSelWars={setSelWars}
                selWars={selWars}
              />
            </>
          )}

          {page === 'overview' && (
            <>
              <div className="flex gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 p-2">
                <button
                  type="button"
                  onClick={() => setPage('nodewars')}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-900"
                >
                  Node Wars
                </button>

                <button
                  type="button"
                  onClick={() => setPage('overview')}
                  className="rounded-xl border border-blue-400 bg-blue-500/20 px-4 py-2 text-sm font-bold text-white"
                >
                  Overview
                </button>
              </div>

              <header className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5">
                <div className="mb-4">
                  <h2 className="text-2xl font-black">Battle Analytics</h2>
                  <p className="text-slate-400">{label}</p>
                </div>

                {msg && <p className="mb-3 rounded-xl bg-blue-500/10 p-3 text-blue-200">{msg}</p>}

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric i="⚔" l="Total Kills" v={S.kills} s="Eliminations" c="border-blue-400/25 from-blue-500/20 text-blue-300" />
                  <Metric i="☠" l="Total Deaths" v={S.deaths} s="Deaths" c="border-pink-400/25 from-pink-500/20 text-pink-300" />
                  <Metric i="✦" l="K/D" v={S.kd} s="Ratio" c="border-violet-400/25 from-violet-500/20 text-violet-300" />
                  <Metric i="♟" l="Players" v={S.players.length} s="Active" c="border-emerald-400/25 from-emerald-500/20 text-emerald-300" />
                </div>
              </header>

              <Line data={S.line} title="▧ Global Kill/Death Timeline" />

              <section className="grid gap-4 xl:grid-cols-[420px_1fr]">
                <Best players={S.players} members={members} st={st} fd={fd} ev={S.ev} />
                <Overview players={S.players} st={st} fd={fd} ev={S.ev} />
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <TopGuilds guilds={S.guilds} ev={S.ev} />

                <Panel>
                  <h3 className="mb-4 text-xl font-black">🔥 Kill Feed</h3>

                  {killFeeds.slice(0, 5).map((k, i) => (
                    <div key={i} className="mb-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                      <div className="flex justify-between">
                        <b>
                          {i + 1}. {k.name}
                        </b>
                        <b className="text-orange-300">🔥 {k.count}</b>
                      </div>

                      <p className="text-xs text-slate-400">
                        {k.start}-{k.end} · {k.war}
                      </p>
                      <p className="truncate text-xs text-slate-500">{k.victims.join(', ')}</p>
                    </div>
                  ))}
                </Panel>
              </section>
            </>
          )}

          {page === 'players' && (
            <Panel>
              <h2 className="mb-4 text-2xl font-black">Player Stats</h2>

              <PlayerSelect players={S.players} value={player} onChange={setPlayer} />

              {pStats && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Metric i="⚔" l="Kills" v={pStats.kills} s={player} c="border-blue-400/25 from-blue-500/20 text-blue-300" />
                    <Metric i="☠" l="Deaths" v={pStats.deaths} s="Deaths" c="border-pink-400/25 from-pink-500/20 text-pink-300" />
                    <Metric i="✦" l="K/D" v={pStats.kd} s="Ratio" c="border-violet-400/25 from-violet-500/20 text-violet-300" />
                  </div>

                  <Line data={pStats.line} title="Player Daily Kill/Death Timeline" />
                  <AvgPerformance data={pStats.avgLine} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <RankList
                      title="Favourite Targets"
                      items={Object.entries(pStats.v)
                        .map(([targetName, kills]) => ({ name: targetName, kills }))
                        .sort((a, b) => b.kills - a.kills)}
                      valueKey="kills"
                    />

                    <RankList
                      title="Killed By"
                      items={Object.entries(pStats.kb)
                        .map(([targetName, kills]) => ({ name: targetName, kills }))
                        .sort((a, b) => b.kills - a.kills)}
                      valueKey="kills"
                    />
                  </div>

                  <Panel>
                    <h3 className="mb-4 text-xl font-black">✦ Achievements</h3>

                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      {pStats.ach.map((a) => (
                        <div
                          key={a.title}
                          className={`rounded-xl border p-3 ${
                            a.done ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/40'
                          }`}
                        >
                          <p className="font-bold">
                            {a.done ? '✅' : '🔒'} {a.title}
                          </p>

                          <div className="mt-2 h-2 rounded-full bg-slate-800">
                            <div
                              className={`${a.done ? 'bg-emerald-400' : 'bg-blue-500'} h-2 rounded-full`}
                              style={{
                                width: `${Math.min(100, (a.val / a.goal) * 100)}%`,
                              }}
                            />
                          </div>

                          <p className="mt-1 text-xs text-slate-500">
                            {Number(a.val).toFixed(a.goal <= 10 ? 2 : 0)} / {a.goal}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </>
              )}
            </Panel>
          )}

          {page === 'raw' && (
            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
              <Panel>
                <h2 className="mb-4 text-2xl font-black">Raw Log</h2>

                <div className="mb-3 grid gap-3 md:grid-cols-[1fr_190px_100px]">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 p-3"
                  />

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setROpen(!rOpen)}
                      className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-left hover:bg-blue-500/20"
                    >
                      <span className="block text-xs font-bold text-blue-200">War date</span>
                      <span className="font-black">{date}</span>
                    </button>

                    {rOpen && (
                      <div className="absolute left-0 right-0 z-40 mt-2">
                        <Cal
                          m={rawM}
                          setM={setRawM}
                          selected={date}
                          marked={marked}
                          onPick={(d) => {
                            setDate(d);
                            setROpen(false);
                          }}
                          footer={
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setDate(today());
                                  setROpen(false);
                                }}
                                className="rounded-xl border border-slate-700 px-2 py-2 text-xs font-bold"
                              >
                                Today
                              </button>

                              <button
                                type="button"
                                onClick={() => setROpen(false)}
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

                  <button type="button" onClick={saveLog} className="rounded-xl bg-blue-600 font-bold">
                    Save
                  </button>
                </div>

                {msg && <p className="mb-3 rounded-xl bg-blue-500/10 p-3 text-blue-200">{msg}</p>}

                <textarea
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  className="h-96 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm"
                />
              </Panel>

              <Panel>
                <h2 className="mb-4 text-2xl font-black">History</h2>

                {!logs.length ? (
                  <p className="text-sm text-slate-500">No logs loaded from database.</p>
                ) : (
                  logs.map((x) => (
                    <div key={x.id} className="mb-3 rounded-xl bg-slate-900 p-3">
                      <b>{x.name}</b>
                      <p className="text-xs text-slate-500">{dateOf(x)}</p>

                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(x)}
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
          )}

          {deleteTarget && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
                <h3 className="text-xl font-black text-rose-300">Delete log?</h3>

                <p className="mt-2 text-sm text-slate-300">
                  This action permanently deletes the selected log from the database.
                </p>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-3">
                  <p className="font-bold">{deleteTarget.name}</p>
                  <p className="text-xs text-slate-500">{dateOf(deleteTarget)}</p>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-bold hover:bg-slate-800 disabled:opacity-60"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-500 disabled:opacity-60"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
