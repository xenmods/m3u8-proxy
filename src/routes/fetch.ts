import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import https from 'https';
import supported_types from '../config/supported_types.json';

// rewriting this code was an absolute pain, I'll probably do it again later aa.

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { url, ref } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
      headers: ref ? { Referer: ref as string } : {},
    });

    const contentType = response.headers['content-type'];

    if (!supported_types.includes(contentType)) {
      return res.status(415).json({ error: 'Unsupported media type' });
    }

    if (contentType.includes('application/vnd.apple.mpegurl')) {
      let m3u8Content = '';

      response.data.on('data', (chunk: Buffer) => {
        m3u8Content += chunk.toString();
      });

      response.data.on('end', () => {
        const baseUrl = `https://${req.get('host')}/fetch/segment?url=`;
        m3u8Content = m3u8Content.replace(/(.*\.ts)/g, (match) => {
          return baseUrl + encodeURIComponent(new URL(match, url).href);
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Connection', 'Keep-Alive');
        res.send(m3u8Content);
      });

      return;
    }

    response.data.pipe(res);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');

  } catch (error) {
    console.error('Error fetching the content:', (error as Error).message);
    res.status(500).json({ error: 'Failed to proxy content' });
  }
});

router.get('/segment', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer',
      headers: {
        'Connection': 'keep-alive'
      },
      // keep-alive is required for video segments
      httpsAgent: new https.Agent({ keepAlive: true })
    });

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Connection', 'Keep-Alive');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching the video segment:', (error as Error).message);
    res.status(500).json({ error: 'Failed to proxy video segment' });
  }
});

export default router;