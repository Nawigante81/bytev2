// Dynamic IT news endpoint for platforms like Vercel (api/ directory)
// Returns the latest aggregated items from several RSS feeds.
// Response shape: { updatedAt: number, items: Array<{ title, link, pubDate?, isoDate?, source }> }

import Parser from 'rss-parser';

const FEEDS = [
  { source: 'Niebezpiecznik', url: 'https://niebezpiecznik.pl/rss' },
  { source: 'Z3S', url: 'https://zaufanatrzeciastrona.pl/feed/' },
  { source: 'Sekurak', url: 'https://sekurak.pl/feed/' },
  { source: 'CERT Polska', url: 'https://cert.pl/feed/' },
  { source: 'CyberDefence24', url: 'https://cyberdefence24.pl/rss' },
];

const parser = new Parser({
  requestOptions: {
    headers: {
      'User-Agent': 'ByteClinic-IT-News-API/1.0 (+https://www.byteclinic.pl)'
    }
  }
});

function toItem(i, source) {
  return {
    title: i.title ?? '(bez tytułu)',
    link: i.link ?? '#',
    pubDate: i.pubDate,
    isoDate: i.isoDate || i.isoDateTime || i.iso_date || undefined,
    source,
  };
}

async function gatherNews(limit = 40) {
  const lists = await Promise.allSettled(
    FEEDS.map(async ({ source, url }) => {
      const feed = await parser.parseURL(url);
      return (feed.items || []).map((i) => toItem(i, source));
    })
  );

  const items = lists
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((v) => v.link)
    .filter((v, i, a) => a.findIndex((x) => x.link === v.link) === i)
    .sort((a, b) => {
      const da = Date.parse(a.isoDate || a.pubDate || '');
      const db = Date.parse(b.isoDate || b.pubDate || '');
      if (isNaN(db) && isNaN(da)) return 0;
      if (isNaN(db)) return -1;
      if (isNaN(da)) return 1;
      return db - da;
    })
    .slice(0, limit);

  return items;
}

export default async function handler(req, res) {
  try {
    const items = await gatherNews(40);
    const payload = { updatedAt: Date.now(), items };

    // Disable caching (browser and CDN) so the client refresh sees fresh data
    res.setHeader('Cache-Control', 'no-store, max-age=0, s-maxage=0');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    res.status(200).end(JSON.stringify(payload));
  } catch (err) {
    // Provide a short-lived error response (also not cached)
    res.setHeader('Cache-Control', 'no-store, max-age=0, s-maxage=0');
    res.status(500).json({ error: 'Failed to fetch IT news', message: err?.message || String(err) });
  }
}
