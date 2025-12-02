import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import PageTransition from '@/components/PageTransition';
import SectionWrapper from '@/components/SectionWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import Tooltip from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Cpu, HardDrive, Server, Cloud, Shield, Wifi, BarChart } from 'lucide-react';

// helpers
const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
const rnd = (min, max) => Math.round(min + Math.random() * (max - min));
const randFloat = (min, max) => +(min + Math.random() * (max - min)).toFixed(1);
const formatMs = (ms) => {
  let s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const pad = (v) => String(v).padStart(2, '0');
  return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
};
const formatTime = (date = new Date()) => `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
const genIP = () => `192.168.${rnd(0, 3)}.${rnd(2, 254)}`;
const genMAC = () => Array.from({length:6},()=>rnd(0,255).toString(16).padStart(2,'0')).join(':');
const genSeries = (len, base, jitter=5) => Array.from({length:len},()=> clamp(rnd(base-jitter, base+jitter), 1, 99));

const Led = ({ v }) => {
  const color = v < 60 ? 'bg-emerald-400' : v < 80 ? 'bg-yellow-400' : 'bg-rose-500';
  return (
    <div className="relative flex h-3 w-3" aria-hidden>
      <span className={`absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping ${color}`}></span>
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`}></span>
    </div>
  );
};

const Sparkline = ({ data = [], width = 120, height = 36, id = 's', colorStops = ['#22d3ee', '#a78bfa', '#84cc16'] }) => {
  const min = 0, max = 100;
  const len = data.length || 1;
  const stepX = width / Math.max(len - 1, 1);
  const pts = data.map((v,i)=>`${i*stepX},${height - (clamp(v, min, max) / (max-min))*height}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="trend">
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colorStops[0]} />
          <stop offset="50%" stopColor={colorStops[1]} />
          <stop offset="100%" stopColor={colorStops[2]} />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(34,211,238,.18)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
      </defs>
      <g opacity="0.12" stroke="hsl(var(--border))" strokeWidth="1">
        <line x1="0" y1={height*0.25} x2={width} y2={height*0.25} />
        <line x1="0" y1={height*0.5} x2={width} y2={height*0.5} />
        <line x1="0" y1={height*0.75} x2={width} y2={height*0.75} />
      </g>
      <polyline points={`0,${height} ${pts} ${width},${height}`} fill={`url(#${id}-fill)`} stroke="none" />
      <polyline points={pts} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const useKeyShortcuts = (onSlash, onEsc) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault(); onSlash?.();
      } else if (e.key === 'Escape') {
        onEsc?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSlash, onEsc]);
};

const Lab = () => {
  // loading state + search
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(null);
  const [query, setQuery] = useState('');

  // systems demo data
  const baseSystems = useMemo(() => ([
    { id: 'vm-101', name: 'web-core', type: 'VM', os: 'Debian', ip: genIP() },
    { id: 'vm-102', name: 'db-primary', type: 'VM', os: 'Ubuntu', ip: genIP() },
    { id: 'ct-201', name: 'pihole', type: 'LXC', os: 'Debian', ip: genIP() },
    { id: 'ct-202', name: 'nextcloud', type: 'LXC', os: 'Debian', ip: genIP() },
    { id: 'host-1', name: 'proxmox-host', type: 'HOST', os: 'Proxmox', ip: genIP() },
    { id: 'vm-103', name: 'media-node', type: 'VM', os: 'Ubuntu', ip: genIP() },
  ]), []);

  const [systems, setSystems] = useState(() => baseSystems.map(s => ({
    ...s,
    cpu: rnd(8, 38), ram: rnd(20, 62), disk: rnd(30, 78),
    uptimeMs: Date.now() - rnd(2, 12)*24*3600*1000 - rnd(0, 23)*3600*1000,
    cpuSeries: genSeries(60, rnd(25, 45), 8),
    ramSeries: genSeries(60, rnd(35, 55), 6),
    diskSeries: genSeries(60, rnd(40, 70), 5),
  })));

  // services demo
  const [services, setServices] = useState(() => ([
    { name: 'MediaServer', port: 8096, proto: 'http', stack: 'LXC', active: true, desc: 'Transkodowanie i streaming multimediów (np. Jellyfin).' },
    { name: 'DNS Sinkhole', port: 53, proto: 'udp', stack: 'LXC', active: true, desc: 'Pi-hole: blokowanie reklam i trackerów.' },
    { name: 'Backup', port: 22, proto: 'ssh', stack: 'HOST', active: true, desc: 'Rsync pull/push + kopie migawkowe.' },
    { name: 'Nextcloud', port: 443, proto: 'https', stack: 'VM', active: true, desc: 'Prywatna chmura plików i kalendarza.' },
    { name: 'Syncthing', port: 8384, proto: 'http', stack: 'VM', active: true, desc: 'P2P synchronizacja katalogów.' },
    { name: 'Grafana', port: 3000, proto: 'http', stack: 'LXC', active: true, desc: 'Wizualizacja metryk i alerty.' },
    { name: 'Prometheus', port: 9090, proto: 'http', stack: 'LXC', active: true, desc: 'Zbieranie metryk time-series.' },
    { name: 'WireGuard', port: 51820, proto: 'udp', stack: 'HOST', active: false, desc: 'VPN site-to-site i zdalny dostęp.' },
    { name: 'Docker Registry', port: 5000, proto: 'http', stack: 'VM', active: false, desc: 'Prywatny rejestr obrazów.' },
    { name: 'MQTT Broker', port: 1883, proto: 'tcp', stack: 'LXC', active: true, desc: 'Integracje IoT i telemetryka.' },
  ]));

  // network demo
  const [netHosts, setNetHosts] = useState(() => Array.from({length:12}).map((_,i)=>({
    host: `node-${i+1}`, ip: genIP(), mac: genMAC(),
    latency: randFloat(3, 60),
    rx: randFloat(0.2, 12.3), tx: randFloat(0.1, 8.7),
    latSeries: genSeries(30, rnd(15, 45), 15),
  })));

  // IoT demo
  const [iot, setIot] = useState(() => ([
    { id: 'esp32-1', name: 'ESP32-Weather', last: 'T: 22.4°C / H: 43%', battery: 86, rssi: -58, online: true, lastPing: formatTime() },
    { id: 'esp32-2', name: 'Garage-Sensor', last: 'Door: closed', battery: 71, rssi: -65, online: true, lastPing: formatTime() },
    { id: 'esp32-3', name: 'Garden-Moisture', last: 'Moist: 37%', battery: 62, rssi: -72, online: false, lastPing: formatTime() },
    { id: 'esp32-4', name: 'Temp-Office', last: 'T: 24.1°C', battery: 53, rssi: -67, online: true, lastPing: formatTime() },
    { id: 'esp32-5', name: 'AirQ', last: 'PM2.5: 12', battery: 48, rssi: -70, online: true, lastPing: formatTime() },
    { id: 'esp32-6', name: 'Power-Meter', last: 'Load: 236W', battery: 92, rssi: -54, online: true, lastPing: formatTime() },
  ]));

  // backups demo
  const [backup, setBackup] = useState(() => ({
    freeSpace: rnd(38, 72),
    snapshots: rnd(12, 38),
    lastStatus: ['OK','OK','OK','WARN','OK','OK','FAIL'][rnd(0,6)],
  }));

  // quick-glance metrics
  const [glance, setGlance] = useState(() => ({
    uptime: 99.9,
    cpu: rnd(12, 35),
    ram: rnd(30, 60),
    disk: rnd(45, 75),
  }));

  // filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [osFilter, setOsFilter] = useState('ALL');
  const [servicesOnlyActive, setServicesOnlyActive] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // keyboard shortcuts
  useKeyShortcuts(() => searchRef.current?.focus(), () => setModalOpen(false));

  // loading skeleton
  useEffect(() => {
    const t = setTimeout(()=> setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // pseudo-live updates
  useEffect(() => {
    const int1 = setInterval(() => {
      setGlance((g)=>({
        ...g,
        cpu: clamp(g.cpu + rnd(-3,3), 5, 95),
        ram: clamp(g.ram + rnd(-3,3), 5, 95),
        disk: clamp(g.disk + rnd(-2,2), 5, 98),
      }));
      setSystems((arr)=> arr.map(s=> ({
        ...s,
        cpu: clamp(s.cpu + rnd(-4,4), 3, 98),
        ram: clamp(s.ram + rnd(-3,3), 3, 98),
        disk: clamp(s.disk + rnd(-2,2), 3, 98),
        cpuSeries: [...s.cpuSeries.slice(-59), clamp(s.cpu + rnd(-3,3), 1, 99)],
        ramSeries: [...s.ramSeries.slice(-59), clamp(s.ram + rnd(-2,2), 1, 99)],
        diskSeries: [...s.diskSeries.slice(-59), clamp(s.disk + rnd(-2,2), 1, 99)],
      })));
      setNetHosts((arr)=> arr.map(h=> ({
        ...h,
        latency: clamp(h.latency + randFloat(-8, 8), 1, 350),
        rx: Math.max(0, +(h.rx + randFloat(-1.2, 1.8)).toFixed(1)),
        tx: Math.max(0, +(h.tx + randFloat(-1.1, 1.5)).toFixed(1)),
        latSeries: [...h.latSeries.slice(-29), clamp(h.latency, 1, 350)],
      })));
      setIot((arr)=> arr.map(d => ({
        ...d,
        online: Math.random() > 0.02 ? d.online : !d.online,
        battery: clamp(d.battery + rnd(-1, 1), 10, 100),
        rssi: clamp(d.rssi + rnd(-3, 3), -90, -40),
        lastPing: formatTime(),
      })));
      setBackup((b)=> ({
        ...b,
        freeSpace: clamp(b.freeSpace + rnd(-2,2), 10, 95),
        snapshots: clamp(b.snapshots + rnd(-1,1), 5, 99),
        lastStatus: b.lastStatus === 'FAIL' && Math.random() > 0.7 ? 'OK' : (Math.random()>.9 ? 'WARN' : b.lastStatus)
      }));
    }, 2600);
    return () => clearInterval(int1);
  }, []);

  const filteredSystems = systems.filter(s => (typeFilter==='ALL' || s.type===typeFilter) && (osFilter==='ALL' || s.os===osFilter) && (s.name.toLowerCase().includes(query.toLowerCase()) || s.ip.includes(query)));
  const filteredServices = services.filter(s => (!servicesOnlyActive || s.active) && (s.name.toLowerCase().includes(query.toLowerCase())));
  const filteredNet = netHosts.filter(h => (h.host.toLowerCase().includes(query.toLowerCase()) || h.ip.includes(query)));
  const filteredIot = iot.filter(d => d.name.toLowerCase().includes(query.toLowerCase()));

  const tileVariants = { hidden: {opacity:0, y: 20}, show: {opacity:1, y:0} };

  const HeaderTitle = () => (
    <div className="flex items-center gap-3">
      <h1 className="text-2xl md:text-3xl uppercase tracking-widest font-mono" style={{ textShadow: '0 0 8px rgba(34,211,238,0.35)' }}>
        <span>&lt;LAB CONTROL CENTER&gt;</span> <span className="opacity-80 animate-pulse">▮</span>
      </h1>
    </div>
  );

  const openDetails = (sys) => { setSelected(sys); setModalOpen(true); };

  return (
    <PageTransition>
      <Helmet>
        <title>Lab — Przeglądaj | ByteClinic</title>
        <meta name="description" content="Interaktywny Lab Dashboard — centrum dowodzenia Home-Labu: systemy, usługi, sieć, IoT, kopie zapasowe." />
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {"@type":"ListItem","position":1,"name":"Lab","item":"/lab"},
              {"@type":"ListItem","position":2,"name":"Przeglądaj","item":"/lab"}
            ]
          }
        `}</script>
      </Helmet>

      <SectionWrapper instant>
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <HeaderTitle />
            {/* Quick Action Bar */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none md:w-80">
                <Input ref={searchRef} value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Szukaj (/)" aria-label="Szukaj w Lab" className="bg-background/60 backdrop-blur-sm border-primary/20" />
              </div>
              <Button variant="outline" className="bg-card/50 border-primary/20" onClick={()=>{ setTypeFilter('ALL'); setOsFilter('ALL'); setServicesOnlyActive(false); setQuery(''); }}>
                Reset
              </Button>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtry">
              <Button variant={typeFilter==='VM'?'default':'outline'} size="sm" onClick={()=>setTypeFilter(typeFilter==='VM'?'ALL':'VM')} className="hover:scale-[1.03] transition">
                VM
              </Button>
              <Button variant={typeFilter==='LXC'?'default':'outline'} size="sm" onClick={()=>setTypeFilter(typeFilter==='LXC'?'ALL':'LXC')} className="hover:scale-[1.03] transition">
                LXC
              </Button>
              <Button variant={typeFilter==='HOST'?'default':'outline'} size="sm" onClick={()=>setTypeFilter(typeFilter==='HOST'?'ALL':'HOST')} className="hover:scale-[1.03] transition">
                Hosty
              </Button>
              <Select value={osFilter} onValueChange={setOsFilter}>
                <SelectTrigger className="w-[160px] bg-card/60 border-primary/20"><SelectValue placeholder="System" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">System: Wszystkie</SelectItem>
                  <SelectItem value="Debian">Debian</SelectItem>
                  <SelectItem value="Ubuntu">Ubuntu</SelectItem>
                  <SelectItem value="Kali">Kali</SelectItem>
                  <SelectItem value="Proxmox">Proxmox</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 ml-2">
                <Checkbox id="onlyActive" checked={servicesOnlyActive} onCheckedChange={(v)=>setServicesOnlyActive(Boolean(v))} />
                <label htmlFor="onlyActive" className="text-sm text-muted-foreground">Tylko aktywne usługi</label>
              </div>
            </div>
          </div>

          {/* Quick glance tiles */}
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="grid grid-flow-col auto-cols-[85%] sm:auto-cols-[45%] md:auto-cols-[minmax(0,1fr)] md:grid-cols-4 gap-4 snap-x md:snap-none snap-mandatory">
              {[{label:'Uptime', value:`${glance.uptime.toFixed(1)}%`, icon: BarChart, v: 40 }, {label:'CPU Load', value:`${glance.cpu}%`, icon: Cpu, v: glance.cpu}, {label:'RAM Usage', value:`${glance.ram}%`, icon: Server, v: glance.ram}, {label:'Disk Usage', value:`${glance.disk}%`, icon: HardDrive, v: glance.disk}].map((t, idx)=> (
                <motion.div key={t.label} variants={tileVariants} initial="hidden" animate="show" transition={{ duration: 0.2, delay: idx*0.05 }} className="snap-start">
                  <Card className="bg-card/60 border-primary/20 backdrop-blur-sm hover:border-primary/40 transition will-change-transform">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <t.icon className="w-8 h-8 text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" aria-hidden />
                      </div>
                      <div className="flex-1">
                        <p className="uppercase text-xs tracking-widest text-muted-foreground font-mono">{t.label}</p>
                        <p className="text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-lime-300">{t.value}</p>
                      </div>
                      <Led v={t.v} />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Systems */}
          <section aria-labelledby="systems-heading" id="systems">
            <div className="flex items-center justify-between mb-3">
              <h2 id="systems-heading" className="font-mono uppercase tracking-widest text-sm text-muted-foreground">Systemy (VM/LXC/Host)</h2>
              <span className="text-xs text-muted-foreground">{filteredSystems.length} z {systems.length}</span>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({length:6}).map((_,i)=> <Skeleton key={i} className="h-28 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredSystems.map((s)=> (
                  <motion.button key={s.id} onClick={()=>openDetails(s)} className="text-left" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                    <Card role="group" className="bg-card/60 border-primary/20 backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-primary" aria-hidden />
                            <span className="font-mono">{s.name}</span>
                          </div>
                          <Badge variant="outline" className="bg-background/60">{s.type}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{s.os} • {s.ip}</span>
                          <span className="font-mono">Uptime {formatMs(Date.now()-s.uptimeMs)}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded bg-background/40 p-2 border border-border/60"><span className="text-muted-foreground">CPU</span><div className="font-mono">{s.cpu}%</div></div>
                          <div className="rounded bg-background/40 p-2 border border-border/60"><span className="text-muted-foreground">RAM</span><div className="font-mono">{s.ram}%</div></div>
                          <div className="rounded bg-background/40 p-2 border border-border/60"><span className="text-muted-foreground">Disk</span><div className="font-mono">{s.disk}%</div></div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.button>
                ))}
              </div>
            )}
          </section>

          {/* Services */}
          <section aria-labelledby="services-heading" id="services">
            <div className="flex items-center justify-between mb-3">
              <h2 id="services-heading" className="font-mono uppercase tracking-widest text-sm text-muted-foreground">Usługi</h2>
              <span className="text-xs text-muted-foreground">{filteredServices.length} z {services.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredServices.map((svc, i)=> (
                <Card key={svc.name} className="bg-card/60 border-primary/20 backdrop-blur-sm">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Cloud className="h-5 w-5 text-secondary" aria-hidden />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{svc.name}</span>
                          <Badge variant="outline" className={svc.active ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border-rose-500/30'} aria-label={svc.active ? 'status: aktywna' : 'status: zatrzymana'}>
                            {svc.active ? 'active' : 'stopped'}
                          </Badge>
                          <Tooltip content={<span className="font-mono">Protokół i port usługi</span>}>
                            <Badge variant="outline" className="bg-background/60 cursor-help">{svc.proto}/{svc.port}</Badge>
                          </Tooltip>
                          <Tooltip content={<span className="font-mono">Warstwa uruchomieniowa: {svc.stack}</span>}>
                            <Badge variant="outline" className="bg-background/60 cursor-help">{svc.stack}</Badge>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground truncate" title={svc.desc}>{svc.desc}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0">Szczegóły</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Network */}
          <section aria-labelledby="network-heading" id="network">
            <div className="flex items-center justify-between mb-3">
              <h2 id="network-heading" className="font-mono uppercase tracking-widest text-sm text-muted-foreground">Sieć</h2>
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span>Public IP: 83.12.{rnd(0,255)}.{rnd(0,255)}</span>
                <span>Gateway: 192.168.0.1</span>
                <span>DNS: 1.1.1.1 / 9.9.9.9</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Host</th>
                    <th className="py-2 pr-4">IP / MAC</th>
                    <th className="py-2 pr-4">Latency (ms)</th>
                    <th className="py-2 pr-4">rx (MiB/s)</th>
                    <th className="py-2 pr-4">tx (MiB/s)</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNet.map(h => {
                    const alert = h.latency > 100;
                    return (
                      <tr key={h.host} className="border-t border-border/60">
                        <td className="py-2 pr-4 font-mono">{h.host}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{h.ip} • {h.mac}</td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono w-12 inline-block">{h.latency.toFixed(0)}</span>
                            <Sparkline data={h.latSeries} width={100} height={28} id={`lat-${h.host}`} />
                          </div>
                        </td>
                        <td className="py-2 pr-4 font-mono">{h.rx.toFixed(1)}</td>
                        <td className="py-2 pr-4 font-mono">{h.tx.toFixed(1)}</td>
                        <td className="py-2 pr-4">{alert ? <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">Alert</Badge> : <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">OK</Badge>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* IoT */}
          <section aria-labelledby="iot-heading" id="iot">
            <div className="flex items-center justify-between mb-3">
              <h2 id="iot-heading" className="font-mono uppercase tracking-widest text-sm text-muted-foreground">IoT</h2>
              <span className="text-xs text-muted-foreground">{filteredIot.length} z {iot.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filteredIot.map(d => (
                <Card key={d.id} className="bg-card/60 border-primary/20 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wifi className={d.online ? 'h-4 w-4 text-emerald-300' : 'h-4 w-4 text-rose-300'} aria-hidden />
                        <span className="font-mono">{d.name}</span>
                      </div>
                      <Badge variant="outline" className="bg-background/60">{d.online ? 'online' : 'offline'}</Badge>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">{d.last}</div>
                    <div className="mt-2 grid grid-cols-3 text-xs text-center gap-2">
                      <div className="rounded bg-background/40 p-2 border border-border/60">Batt<div className="font-mono">{d.battery}%</div></div>
                      <div className="rounded bg-background/40 p-2 border border-border/60">RSSI<div className="font-mono">{d.rssi} dBm</div></div>
                      <div className="rounded bg-background/40 p-2 border border-border/60">Ping<div className="font-mono">{d.lastPing}</div></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Resources & backups */}
          <section aria-labelledby="backup-heading" id="backup">
            <div className="flex items-center justify-between mb-3">
              <h2 id="backup-heading" className="font-mono uppercase tracking-widest text-sm text-muted-foreground">Zasoby i kopie</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
                <CardHeader><CardTitle className="text-sm font-mono uppercase text-muted-foreground">Wolna przestrzeń</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-mono bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-lime-300">{backup.freeSpace}%</div>
                    <Sparkline data={genSeries(30, backup.freeSpace, 6)} width={140} height={36} id="free" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
                <CardHeader><CardTitle className="text-sm font-mono uppercase text-muted-foreground">Snapshoty</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-mono">{backup.snapshots}</div>
                    <Sparkline data={genSeries(30, backup.snapshots, 3)} width={140} height={36} id="snap" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/60 border-primary/20 backdrop-blur-sm">
                <CardHeader><CardTitle className="text-sm font-mono uppercase text-muted-foreground">Ostatni backup</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge className={backup.lastStatus==='OK' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : backup.lastStatus==='WARN' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}>
                      {backup.lastStatus}
                    </Badge>
                    <Button variant="outline" size="sm" className="hover:scale-[1.03]" onClick={()=>setScheduleOpen(true)}>Zobacz harmonogram</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </SectionWrapper>

      {/* System details modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card/90 backdrop-blur-md border-primary/20 max-w-[min(100vw-2rem,900px)]">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{selected.name}</DialogTitle>
                <DialogDescription className="text-muted-foreground">{selected.type} • {selected.os} • {selected.ip}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-background/40 border-border/60">
                  <CardHeader><CardTitle className="text-xs text-muted-foreground uppercase">CPU (last 60s)</CardTitle></CardHeader>
                  <CardContent className="overflow-hidden"><div className="w-full"><Sparkline data={selected.cpuSeries} width={260} height={60} id="mcpu" /></div></CardContent>
                </Card>
                <Card className="bg-background/40 border-border/60">
                  <CardHeader><CardTitle className="text-xs text-muted-foreground uppercase">RAM (last 60s)</CardTitle></CardHeader>
                  <CardContent className="overflow-hidden"><div className="w-full"><Sparkline data={selected.ramSeries} width={260} height={60} id="mram" /></div></CardContent>
                </Card>
                <Card className="bg-background/40 border-border/60">
                  <CardHeader><CardTitle className="text-xs text-muted-foreground uppercase">Disk (last 60s)</CardTitle></CardHeader>
                  <CardContent className="overflow-hidden"><div className="w-full"><Sparkline data={selected.diskSeries} width={260} height={60} id="mdisk" /></div></CardContent>
                </Card>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={()=>setModalOpen(false)}>Zamknij (Esc)</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="bg-card/90 backdrop-blur-md border-primary/20 max-w-[min(100vw-2rem,760px)]">
          <DialogHeader>
            <DialogTitle className="font-mono">Harmonogram kopii</DialogTitle>
            <DialogDescription className="text-muted-foreground">Ostatnie i planowane zdarzenia backupu</DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Typ</th>
                  <th className="py-2 pr-4">Cel</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: '2025-10-26 02:00', type: 'pełna', target: 'NAS-01', status: 'OK' },
                  { date: '2025-10-27 02:00', type: 'inkrementalna', target: 'NAS-01', status: 'OK' },
                  { date: '2025-10-28 02:00', type: 'inkrementalna', target: 'NAS-01', status: 'WARN' },
                  { date: '2025-10-29 02:00', type: 'pełna', target: 'NAS-02', status: 'FAIL' },
                  { date: '2025-10-30 02:00', type: 'planowana', target: 'NAS-02', status: 'PENDING' },
                ].map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="py-2 pr-4 font-mono">{r.date}</td>
                    <td className="py-2 pr-4">{r.type}</td>
                    <td className="py-2 pr-4">{r.target}</td>
                    <td className="py-2 pr-4">
                      {r.status === 'OK' && <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">OK</Badge>}
                      {r.status === 'WARN' && <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">WARN</Badge>}
                      {r.status === 'FAIL' && <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30">FAIL</Badge>}
                      {r.status === 'PENDING' && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">PENDING</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=>setScheduleOpen(false)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default Lab;
