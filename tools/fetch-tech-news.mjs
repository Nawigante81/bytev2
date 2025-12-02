import Parser from 'rss-parser';
import fs from 'node:fs/promises';
import path from 'node:path';

const FEEDS = [
  {
    key: 'benchmark',
    label: 'Benchmark.pl',
    urls: [
      'https://www.benchmark.pl/rss',
      'https://www.benchmark.pl/rss/aktualnosci.xml',
      'https://www.benchmark.pl/rss/aktualnosci-pliki.xml',
    ],
  },
  {
    key: 'spidersweb',
    label: "Spider's Web",
    urls: [
      'https://spidersweb.pl/feed',
      'https://spidersweb.pl/rss',
    ],
  },
  {
    key: 'portaltechnologiczny',
    label: 'PortalTechnologiczny.pl',
    urls: [
      'https://portaltechnologiczny.pl/feed',
      'https://portaltechnologiczny.pl/rss',
      'https://portaltechnologiczny.pl/rss.xml',
    ],
  },
  {
    key: 'antyweb',
    label: 'Antyweb',
    urls: [
      'https://antyweb.pl/feed',
      'https://antyweb.pl/rss',
    ],
  },
];

const parser = new Parser({
  requestOptions: {
    headers: {
      'User-Agent': 'Tech-Majster-Tech-News-Fetcher/1.0 (+https://www.tech-majster.pl)'
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

async function parseFirstAvailable(urls) {
  let lastError;
  for (const url of urls) {
    try {
      console.log(`Trying ${url}...`);
      const feed = await parser.parseURL(url);
      console.log(`Success: ${url}`);
      return feed;
    } catch (e) {
      console.log(`Failed: ${url} - ${e.message}`);
      lastError = e;
    }
  }
  throw lastError || new Error('No RSS URLs succeeded');
}

async function main() {
  try {
    const lists = await Promise.allSettled(
      FEEDS.map(async (f) => {
        const feed = await parseFirstAvailable(f.urls);
        const items = (feed.items || []).map((i) => toItem(i, f.label))
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
          .slice(0, 12);
        return { key: f.key, label: f.label, items };
      })
    );

    const grouped = {};
    for (const r of lists) {
      if (r.status === 'fulfilled') {
        grouped[r.value.key] = { label: r.value.label, items: r.value.items };
      }
    }

    const payload = { updatedAt: Date.now(), sources: grouped };
    const outPath = path.join(process.cwd(), 'public', 'tech-news.json');
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`Wrote tech news to ${outPath}`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to fetch tech news:', err?.message || err);
    process.exit(1);
  }
}

main();
