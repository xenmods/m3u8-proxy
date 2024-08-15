import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { LRUCache } from 'lru-cache'

const router = Router();

const cache = new LRUCache<string, string | Buffer>({
  max: 500,
  ttl: 1000 * 60 * 5, 
  maxSize: 5000,
  sizeCalculation: (value, key) => {
    return 1
  },
});

router.get('/m3u8', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  const cachedContent = cache.get(url);
  if (cachedContent) {
    console.log('Returning cached m3u8 content');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline');
    return res.send(cachedContent);
  }

  try {
    const response = await axios.get(url);
    let m3u8Content = response.data as string;
    
    const baseUrl = `https://${req.get('host')}/fetch/segment?url=`;

    m3u8Content = m3u8Content.replace(/(.*\.ts)/g, (match) => {
      return baseUrl + encodeURIComponent(new URL(match, url).href);
    });

    cache.set(url, m3u8Content);

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline');
    res.send(m3u8Content);
  } catch (error) {
    console.error('Error fetching the m3u8 file:', (error as Error).message);
    res.status(500).json({ error: 'Failed to proxy m3u8 file' });
  }
});

router.get('/segment', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  const cachedSegment = cache.get(url);
  if (cachedSegment) {
    console.log('Returning cached video segment');
    res.setHeader('Content-Type', 'video/MP2T');
    res.setHeader('Content-Disposition', 'inline');
    return res.send(cachedSegment);
  }

  try {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer',
    });

    cache.set(url, response.data);

    res.setHeader('Content-Type', 'video/MP2T');
    res.setHeader('Content-Disposition', 'inline');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching the video segment:', (error as Error).message);
    res.status(500).json({ error: 'Failed to proxy video segment' });
  }
});

export default router;
