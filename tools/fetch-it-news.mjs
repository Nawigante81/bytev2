import Parser from 'rss-parser';
import fs from 'node:fs/promises';
import path from 'node:path';

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
      'User-Agent': 'Tech-Majster-IT-News-Fetcher/1.0 (+https://www.tech-majster.pl)'
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
    .filter((v) => v.link) // only with link
    .filter((v, i, a) => a.findIndex((x) => x.link === v.link) === i) // dedupe by link
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

async function main() {
  try {
    const items = await gatherNews(40);
    const payload = { updatedAt: Date.now(), items };
    const outPath = path.join(process.cwd(), 'public', 'it-news.json');
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Wrote ${items.length} items to ${outPath}`);
  } catch (err) {
    console.error('Failed to fetch IT news:', err?.message || err);
    process.exitCode = 1;
  }
}

main();
