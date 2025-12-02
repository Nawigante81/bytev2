// Tech news grouped endpoint: Verge, TechCrunch, Ars Technica, Tom's Hardware
import Parser from 'rss-parser';

// Polish tech sources: Benchmark.pl, Spider's Web, Komputer Świat (PCLab legacy), Antyweb
// For robustness, provide multiple candidate RSS URLs per source.
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
      'User-Agent': 'ByteClinic-Tech-News-API/1.0 (+https://www.byteclinic.pl)'
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
      const feed = await parser.parseURL(url);
      return feed;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('No RSS URLs succeeded');
}

export default async function handler(req, res) {
  try {
    const results = await Promise.allSettled(
      FEEDS.map(async (f) => {
        const feed = await parseFirstAvailable(f.urls);
        const items = (feed.items || []).map((i) => toItem(i, f.label));
        return { key: f.key, label: f.label, items };
      })
    );

    const grouped = {};
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const { key, label, items } = r.value;
        // sort desc by date and take top 10 per source
        const sorted = items
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
        grouped[key] = { label, items: sorted };
      }
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0, s-maxage=0');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).end(JSON.stringify({ updatedAt: Date.now(), sources: grouped }));
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store, max-age=0, s-maxage=0');
    res.status(500).json({ error: 'Failed to fetch tech news', message: err?.message || String(err) });
  }
}
