import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const techNewsPath = path.join(process.cwd(), 'public', 'tech-news.json');
    const itNewsPath = path.join(process.cwd(), 'public', 'it-news.json');
    
    const [techData, itData] = await Promise.all([
      fs.readFile(techNewsPath, 'utf8').then(JSON.parse),
      fs.readFile(itNewsPath, 'utf8').then(JSON.parse)
    ]);
    
    const now = Date.now();
    const techAge = Math.floor((now - techData.updatedAt) / 1000 / 60);
    const itAge = Math.floor((now - itData.updatedAt) / 1000 / 60);
    
    const maxAge = 120; // 2 hours
    const status = (techAge < maxAge && itAge < maxAge) ? 'healthy' : 'stale';
    
    return res.status(status === 'healthy' ? 200 : 500).json({
      status,
      tech_news: {
        age_minutes: techAge,
        updated_at: new Date(techData.updatedAt).toISOString(),
        is_fresh: techAge < maxAge
      },
      it_news: {
        age_minutes: itAge,
        updated_at: new Date(itData.updatedAt).toISOString(),
        is_fresh: itAge < maxAge
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
