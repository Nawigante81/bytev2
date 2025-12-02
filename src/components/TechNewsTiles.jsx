import React, { useEffect, useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

// 4 vertical tiles, each lists latest ~10-12 items from a source
// Data shape from /api/tech-news: { updatedAt, sources: { key: { label, items: [{title, link, pubDate, isoDate, source}] } } }

const REFRESH_MS = 5 * 60 * 1000;

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 60) return diffMin + 'm';
  const h = Math.floor(diffMin / 60);
  if (h < 24) return h + 'h';
  const days = Math.floor(h / 24);
  return days + 'd';
}

export default function TechNewsTiles() {
  const [data, setData] = useState({ updatedAt: 0, sources: {} });
  const [status, setStatus] = useState('idle');
  const [expandedSources, setExpandedSources] = useState([]);

  async function load() {
    try {
      setStatus('loading');
      const res = await fetch('/api/tech-news', { cache: 'no-store' });
      if (!res.ok) throw new Error('api failed');
      const json = await res.json();
      setData(json);
      setStatus('ok');
    } catch (err) {
      // Fallback to static file if serverless API isn't available
      try {
        const res2 = await fetch(`/tech-news.json?t=${Date.now()}`, { cache: 'no-store' });
        const json2 = await res2.json();
        setData(json2);
        setStatus('ok');
      } catch {
        setStatus('error');
      }
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  const sourcesOrder = ['benchmark', "spidersweb", 'portaltechnologiczny', 'antyweb'];

  const toggleExpanded = (key) => {
    setExpandedSources(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key) 
        : [...prev, key]
    );
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {sourcesOrder.map((k) => {
        const src = data.sources[k];
        const isExpanded = expandedSources.includes(k);
        const displayItems = isExpanded ? src?.items || [] : (src?.items || []).slice(0, Math.ceil((src?.items?.length || 0) / 2));
        return (
          <div key={k} className="flex flex-col rounded-xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-sm">
            <div className="px-3 py-2 flex items-center justify-between border-b border-white/10">
              <h3 className="text-xs font-semibold tracking-wide uppercase text-primary truncate">{src?.label || k}</h3>
              {src?.items?.length ? (
                <span className="text-[10px] text-white/50">{displayItems.length} / {src?.items?.length || 0}</span>
              ) : null}
            </div>
            <div className="flex-1 overflow-auto custom-scroll px-2 py-1">
              {src?.items?.length ? (
                <ul className="space-y-1.5">
                  {displayItems.map((item) => (
                    <li key={item.link} className="group">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg px-2 py-1.5 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <div className="text-[11px] font-medium text-white/90 leading-tight line-clamp-3 group-hover:underline underline-offset-2">{item.title}</div>
                        <div className="mt-0.5 flex items-center justify-between text-[10px] text-white/50">
                          <span>{timeAgo(item.isoDate || item.pubDate)}</span>
                          <ExternalLink className="h-3 w-3 opacity-40" />
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-[11px] text-white/50 py-2 px-2">{status === 'loading' ? 'Ładowanie…' : 'Brak danych.'}</div>
              )}
            </div>
            <div className="px-2 py-1.5 border-t border-white/10 text-[10px] text-white/40 flex items-center justify-between">
              <span>{status === 'error' ? 'Błąd' : timeAgo(data.updatedAt) || '—'}</span>
              <div className="flex items-center gap-1">
                {src?.items?.length && src.items.length > Math.ceil(src.items.length / 2) && (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(k)}
                    className="rounded px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-[10px] flex items-center gap-1"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? 'Zwiń' : 'Rozwiń'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={load}
                  className="rounded px-1.5 py-0.5 bg-white/5 hover:bg-white/10 text-[10px]"
                >Odśwież</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
