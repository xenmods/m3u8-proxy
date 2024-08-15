import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { load } from 'cheerio';
import path from 'path';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const response = await axios.get(url, {
      responseType: 'text',
    });

    if (response.headers['content-type']?.includes('text/html')) {
      const $ = load(response.data);

      $('a[href], link[href], img[src], script[src]').each((_, element) => {
        const attr = $(element).is('img') || $(element).is('script') ? 'src' : 'href';
        const value = $(element).attr(attr);
        if (value && value.startsWith('/')) {
          $(element).attr(attr, new URL(value, url).toString());
        }
      });

      res.send($.html());
    } else {
      // For non-HTML content, forward it as-is
      res.set(response.headers);
      res.send(response.data);
    }
  } catch (error) {
    console.error('Error fetching the file:', (error as Error).message);
    res.status(500).json({ error: 'Failed to proxy file' });
  }
});


router.get('/m3u8', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const response = await axios.get(url);
    let m3u8Content = response.data as string;

    const baseUrl = `https://${req.get('host')}/proxy/segment?url=`;

    m3u8Content = m3u8Content.replace(/(.*\.ts)/g, (match) => {
      return baseUrl + encodeURIComponent(new URL(match, url).href);
    });

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

  // Check if the URL ends with .m3u8
  if (!url.endsWith('.m3u8')) {
    return res.status(400).json({ error: 'Only .m3u8 files are supported' });
  }

  try {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer',
    });

    // Set appropriate Content-Type for m3u8
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching the m3u8 file:', (error as Error).message);
    res.status(500).json({ error: 'Failed to proxy m3u8 file' });
  }
});

export default router;
