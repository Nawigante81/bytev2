import React, { useEffect, useState, useCallback } from 'react';
import { TrendingUp, Clock, Shield, Zap, Globe, Smartphone, Cpu, Brain, ExternalLink, Star } from 'lucide-react';

const REFRESH_MS = 2 * 60 * 1000;

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'sekundę temu';
  if (diffMin < 60) return diffMin + 'm temu';
  const h = Math.floor(diffMin / 60);
  if (h < 24) return h + 'h temu';
  const days = Math.floor(h / 24);
  return days + 'd temu';
}

function getCategoryIcon(category) {
  const icons = {
    'AI': Brain,
    'Security': Shield,
    'Hardware': Cpu,
    'Mobile': Smartphone,
    'Global': Globe,
    'Tech': Zap
  };
  return icons[category] || Zap;
}

function getPriorityScore(item, source) {
  const now = Date.now();
  const pubTime = new Date(item.isoDate || item.pubDate).getTime();
  const ageHours = (now - pubTime) / (1000 * 60 * 60);
  
  let score = Math.max(0, 100 - ageHours * 2);
  
  const sourceBoost = {
    'Benchmark.pl': 10,
    'Spider\'s Web': 8,
    'PortalTechnologiczny.pl': 6,
    'Antyweb': 5
  };
  score += sourceBoost[source] || 0;
  
  const keywords = ['breaking', 'urgent', 'alert', 'vulnerability', 'launch', 'release'];
  const titleLower = item.title.toLowerCase();
  keywords.forEach(keyword => {
    if (titleLower.includes(keyword)) score += 15;
  });
  
  return Math.round(score);
}

export default function NewsDashboard() {
  const [data, setData] = useState({ updatedAt: 0, sources: {} });
  const [status, setStatus] = useState('idle');
  const [savedItems, setSavedItems] = useState(() => {
    const saved = localStorage.getItem('byteclinic-saved-news');
    return saved ? JSON.parse(saved) : [];
  });
  const [liveTicker, setLiveTicker] = useState([]);
  const [tickerIndex, setTickerIndex] = useState(0);

  async function load() {
    try {
      setStatus('loading');
      const res = await fetch('/api/tech-news', { cache: 'no-store' });
      if (!res.ok) throw new Error('api failed');
      const json = await res.json();
      setData(json);
      setStatus('ok');
    } catch (err) {
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

  useEffect(() => {
    const allItems = [];
    Object.entries(data.sources).forEach(([key, source]) => {
      if (source?.items) {
        source.items.slice(0, 3).forEach(item => {
          allItems.push({
            ...item,
            category: getCategoryForSource(key),
            priority: getPriorityScore(item, source.label)
          });
        });
      }
    });
    
    allItems.sort((a, b) => b.priority - a.priority);
    setLiveTicker(allItems.slice(0, 20));
  }, [data]);

  useEffect(() => {
    if (liveTicker.length > 0) {
      const interval = setInterval(() => {
        setTickerIndex(prev => (prev + 1) % liveTicker.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [liveTicker.length]);

  function getCategoryForSource(sourceKey) {
    const categories = {
      'benchmark': 'Hardware',
      "spidersweb": 'Tech',
      'portaltechnologiczny': 'Global',
      'antyweb': 'Security'
    };
    return categories[sourceKey] || 'Tech';
  }

  const toggleSaved = useCallback((item) => {
    setSavedItems(prev => {
      const isSaved = prev.some(saved => saved.link === item.link);
      const newSaved = isSaved 
        ? prev.filter(saved => saved.link !== item.link)
        : [...prev, item];
      
      localStorage.setItem('byteclinic-saved-news', JSON.stringify(newSaved));
      return newSaved;
    });
  }, []);

  const isSaved = useCallback((item) => {
    return savedItems.some(saved => saved.link === item.link);
  }, [savedItems]);

  const getTrendingNews = () => {
    const allItems = [];
    Object.entries(data.sources).forEach(([key, source]) => {
      if (source?.items) {
        source.items.forEach(item => {
          allItems.push({
            ...item,
            category: getCategoryForSource(key),
            priority: getPriorityScore(item, source.label)
          });
        });
      }
    });
    return allItems
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6);
  };



  const renderNewsCard = (item, showCategory = true) => {
    const IconComponent = getCategoryIcon(item.category);
    const categoryColor = {
      'AI': 'text-purple-400',
      'Security': 'text-red-400',
      'Hardware': 'text-blue-400',
      'Mobile': 'text-green-400',
      'Global': 'text-yellow-400',
      'Tech': 'text-cyan-400'
    }[item.category] || 'text-gray-400';

    return (
      <div className="group cursor-pointer rounded-lg border border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 hover:border-primary/50 transition-all duration-300 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {showCategory && (
              <div className="flex items-center gap-2 mb-2">
                <IconComponent className={`w-4 h-4 ${categoryColor}`} />
                <span className={`text-xs font-medium uppercase tracking-wide ${categoryColor}`}>
                  {item.category}
                </span>
                {item.priority && (
                  <span className="text-xs text-slate-500">
                    Score: {item.priority}
                  </span>
                )}
              </div>
            )}
            <h3 className="font-semibold text-white leading-tight line-clamp-3 group-hover:text-primary transition-colors text-base">
              {item.title}
            </h3>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <span>{item.sourceName || item.source}</span>
                <span>•</span>
                <span>{timeAgo(item.isoDate || item.pubDate)}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSaved(item);
                  }}
                  className={`p-1 rounded transition-colors ${
                    isSaved(item) 
                      ? 'text-yellow-400 hover:text-yellow-300' 
                      : 'text-slate-500 hover:text-yellow-400'
                  }`}
                >
                  <Star className={`w-4 h-4 ${isSaved(item) ? 'fill-current' : ''}`} />
                </button>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (status === 'error') {
    return (
      <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-6 text-center">
        <p className="text-red-400">Nie udało się załadować newsów</p>
        <button 
          onClick={load}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  const trendingNews = getTrendingNews();

  return (
    <div className="space-y-6">


      {/* Live Ticker */}
      <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 border border-slate-700/50 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            LIVE
          </h3>
          <div className="text-sm text-slate-400">
            Ostatnia aktualizacja: {timeAgo(data.updatedAt) || '—'}
          </div>
        </div>
        <div className="overflow-hidden">
          {liveTicker.length > 0 && (
            <div className="animate-pulse">
              <p className="text-white font-medium">
                {liveTicker[tickerIndex]?.title || 'Ładowanie...'}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {liveTicker[tickerIndex]?.source} • {liveTicker[tickerIndex]?.category}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trending News */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            TRENDING
          </h3>
          <span className="text-sm text-slate-400">
            {trendingNews.length} hottest stories
          </span>
        </div>
        <div className="grid gap-4">
          {trendingNews.map((item, index) => (
            <div key={item.link} className="relative">
              {index === 0 && (
                <div className="absolute -top-2 -left-2 z-10">
                  <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    HOT
                  </div>
                </div>
              )}
              {renderNewsCard(item, true)}
            </div>
          ))}
        </div>
      </div>

      {/* Saved Articles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            SAVED
          </h3>
          <span className="text-sm text-slate-400">
            {savedItems.length} articles
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedItems.length > 0 ? (
            savedItems.slice(0, 6).map((item) => (
              <div key={item.link} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                <h4 className="text-sm font-medium text-white line-clamp-2 mb-2">
                  {item.title}
                </h4>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{item.source}</span>
                  <button
                    onClick={() => toggleSaved(item)}
                    className="text-yellow-400 hover:text-yellow-300"
                  >
                    <Star className="w-3 h-3 fill-current" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-slate-400">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Brak zapisanych artykułów</p>
              <p className="text-xs mt-1">Kliknij gwiazdkę przy artykule, aby go zapisać</p>
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={load}
          disabled={status === 'loading'}
          className="px-6 py-3 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {status === 'loading' ? 'Odświeżanie...' : 'Odśwież newsy'}
        </button>
      </div>
    </div>
  );
}