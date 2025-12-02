import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Cpu, MemoryStick, HardDrive, ThermometerSun } from 'lucide-react';
import { cn } from '@/lib/utils';

// Small SVG sparkline like in htop
const Sparkline = ({ data = [], width = 160, height = 40, id = 'spark', strokeWidth = 2 }) => {
  const min = 0;
  const max = 100;
  const len = data.length || 1;
  const stepX = width / Math.max(len - 1, 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - (Math.min(Math.max(v, min), max) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="sparkline trend">
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#84cc16" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.20)" />
          <stop offset="100%" stopColor="rgba(34, 211, 238, 0.00)" />
        </linearGradient>
      </defs>
      {/* subtle grid */}
      <g opacity="0.15" stroke="hsl(var(--border))" strokeWidth="1">
        <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} />
        <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} />
        <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} />
      </g>
      {/* area */}
      <polyline
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#${id}-fill)`}
        stroke="none"
      />
      {/* line */}
      <polyline
        points={points}
        fill="none"
        stroke={`url(#${id}-stroke)`}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

const StatTile = ({ icon: Icon, label, value, series, id }) => {
  return (
    <div className="rounded-lg border border-primary/20 bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm uppercase tracking-wide" style={{ fontFamily: 'JetBrains Mono, IBM Plex Mono, VT323, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \'Liberation Mono\', \'Courier New\', monospace' }}>
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{label}</span>
        </div>
        <div className="text-xl font-bold" style={{ fontFamily: 'JetBrains Mono, IBM Plex Mono, VT323, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \'Liberation Mono\', \'Courier New\', monospace' }}>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-lime-300 drop-shadow-[0_0_6px_rgba(168,85,247,0.35)]">{value}%</span>
        </div>
      </div>
      <Sparkline data={series} id={id} />
    </div>
  );
};

function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

function formatUptime(ms) {
  let s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400); s -= days * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const pad = (v) => String(v).padStart(2, '0');
  return `${days}d ${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatTime(date = new Date()) {
  const pad = (v) => String(v).padStart(2, '0');
  const h = pad(date.getHours());
  const m = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${h}:${m}:${s}`;
}

const ResourceUsage = () => {
  const randomInit = useMemo(() => ({
    cpu: Math.floor(15 + Math.random() * 30), // 15-45
    ram: Math.floor(35 + Math.random() * 35), // 35-70
    disk: Math.floor(55 + Math.random() * 35), // 55-90
  }), []);

  const [cpu, setCpu] = useState(randomInit.cpu);
  const [ram, setRam] = useState(randomInit.ram);
  const [disk, setDisk] = useState(randomInit.disk);

  const [cpuSeries, setCpuSeries] = useState(() => Array.from({ length: 32 }, () => randomInit.cpu));
  const [ramSeries, setRamSeries] = useState(() => Array.from({ length: 32 }, () => randomInit.ram));
  const [diskSeries, setDiskSeries] = useState(() => Array.from({ length: 32 }, () => randomInit.disk));

  const bootTimeRef = useRef(Date.now() - (Math.floor(Math.random() * 6) + 2) * 24 * 3600 * 1000 - Math.floor(Math.random() * 6) * 3600 * 1000);
  const [nowMs, setNowMs] = useState(Date.now());

  const [dots, setDots] = useState(0);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => { clearInterval(t); clearInterval(tick); };
  }, []);

  useEffect(() => {
    const step = () => {
      const randStep = (maxStep) => (Math.random() * maxStep * 2 - maxStep);
      setCpu((prev) => clamp(Math.round(prev + randStep(6)), 10, 95));
      setRam((prev) => clamp(Math.round(prev + randStep(4)), 20, 95));
      setDisk((prev) => clamp(Math.round(prev + randStep(3)), 30, 98));
    };

    const id = setInterval(step, 2500 + Math.floor(Math.random() * 500));
    return () => clearInterval(id);
  }, []);

  // keep sparkline arrays in sync with values
  useEffect(() => setCpuSeries((a) => [...a.slice(-31), cpu]), [cpu]);
  useEffect(() => setRamSeries((a) => [...a.slice(-31), ram]), [ram]);
  useEffect(() => setDiskSeries((a) => [...a.slice(-31), disk]), [disk]);

  // append a small tty-like log entry when values change
  useEffect(() => {
    const localMax = Math.max(cpu, ram, disk);
    const localStatus = localMax < 70 ? 'OK' : localMax < 85 ? 'MED' : 'HIGH';
    const entry = { time: formatTime(), cpu, ram, disk, status: localStatus };
    setLogs((prev) => [...prev.slice(-7), entry]); // keep last 8 lines
  }, [cpu, ram, disk]);

  const cpuTemp = useMemo(() => clamp(Math.round(40 + cpu * 0.8 + (Math.random() * 4 - 2)), 35, 96), [cpu]);
  const gpuTemp = useMemo(() => clamp(Math.round(38 + (cpu * 0.4 + disk * 0.2) + (Math.random() * 5 - 2)), 35, 92), [cpu, disk]);

  const maxLoad = Math.max(cpu, ram, disk);
  const status = maxLoad < 70 ? 'ok' : maxLoad < 85 ? 'med' : 'high';
  const ledClass = status === 'ok' ? 'bg-emerald-400' : status === 'med' ? 'bg-yellow-400' : 'bg-rose-500';

  const dotsStr = '.'.repeat(dots);

  return (
    <div className="relative rounded-xl p-[1px] bg-gradient-to-r from-cyan-500/40 via-fuchsia-500/40 to-lime-400/40">
      <div className="rounded-xl bg-card/80 backdrop-blur-md p-5">
        {/* Header / status line */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping', ledClass)}></span>
              <span className={cn('relative inline-flex rounded-full h-3 w-3', ledClass)}></span>
            </div>
            <h3 className="text-xl md:text-2xl uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, IBM Plex Mono, VT323, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace', textShadow: '0 0 8px rgba(34,211,238,0.35)' }}>
              LIVE SYSTEM RESOURCES
            </h3>
          </div>
          <div className="text-sm text-muted-foreground" aria-live="polite" style={{ fontFamily: 'JetBrains Mono, IBM Plex Mono, VT323, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace' }}>
            › fetching{dotsStr}
          </div>
        </div>

        {/* Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatTile icon={Cpu} label="CPU Load" value={cpu} series={cpuSeries} id="cpu" />
          <StatTile icon={MemoryStick} label="RAM Usage" value={ram} series={ramSeries} id="ram" />
          <StatTile icon={HardDrive} label="Disk I/O" value={disk} series={diskSeries} id="disk" />
        </div>

        {/* Footer / telemetry */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm" style={{ fontFamily: 'JetBrains Mono, IBM Plex Mono, VT323, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace' }}>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground uppercase tracking-wide"><ThermometerSun className="h-4 w-4 text-fuchsia-300" /> › CPU Temp</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-lime-300">{cpuTemp}°C</span>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-muted-foreground uppercase tracking-wide"><ThermometerSun className="h-4 w-4 text-cyan-300" /> › GPU Temp</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-lime-300 via-cyan-300 to-fuchsia-300">{gpuTemp}°C</span>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3 flex items-center justify-between">
            <span className="text-muted-foreground uppercase tracking-wide">› System Uptime</span>
            <span className="text-foreground/90">{formatUptime(nowMs - bootTimeRef.current)}</span>
          </div>
        </div>

        {/* TTY-like log tail */}
        <div className="mt-4 rounded-lg border border-border/60 bg-background/50 p-3 font-mono text-xs" aria-live="polite">
          <div className="space-y-1">
            {logs.map((row, idx) => (
              <div key={idx} className="flex items-baseline gap-2">
                <span aria-hidden className="text-foreground/80">›</span>
                <span className="text-muted-foreground">[{row.time}]</span>
                <span>cpu={row.cpu}% ram={row.ram}% disk={row.disk}%</span>
                <span className={row.status === 'OK' ? 'text-emerald-400' : row.status === 'MED' ? 'text-yellow-400' : 'text-rose-400'}>status={row.status}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResourceUsage;