import React from 'react';
import { Newspaper } from 'lucide-react';
import TechNewsTiles from './TechNewsTiles';

// Typy pomocnicze (komentarz tylko informacyjny)
// type Item = { title: string; link: string; pubDate?: string; isoDate?: string; source: string };
// type Payload = { updatedAt: number; items: Item[] };

export default function ItNewsPanel() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/0">
      <div className="px-3 sm:px-4 py-2">
        <div className="flex items-center justify-between text-xs text-white/70">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            <span className="uppercase tracking-wide">Tech News</span>
          </div>
        </div>
        <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-cyan-300/60 to-emerald-300/60" />
      </div>
      <div className="px-2 sm:px-4 pb-3">
        <TechNewsTiles />
      </div>
    </div>
  );
}
