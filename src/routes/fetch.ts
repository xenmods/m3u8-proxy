import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import https from 'https';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { url, ref } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  console.log(`[PROXY] Getting URL: ${url} with ref: ${ref}`)

  // if vtt file, return it directly
  if (url.endsWith('.vtt')) {
    try {
      const response = await axios({
        method: 'get',
        url,
        responseType: 'arraybuffer',
        headers: ref ? { Referer: ref as string } : {},
      });

      res.setHeader('Content-Type', 'text/vtt');
      res.setHeader('Content-Disposition', 'inline');
      res.send(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          message: error.message,
          response: error.response?.data,
          headers: error.config?.headers ?? {},
        });
      }
      res.status(500).json({ error: 'Failed to proxy content' });
    }
    return;
  }

  try {
    const headResponse = await axios.head(url, {
      headers: ref ? { Referer: ref as string } : {},
    });
    const contentType = headResponse.headers['content-type'];

    const responseType =
      contentType?.startsWith('image/') || contentType?.includes('arraybuffer')
        ? 'arraybuffer'
        : contentType?.includes('json')
        ? 'json'
        : 'text';

    const response = await axios({
      method: 'get',
      url,
      responseType: responseType,
      headers: ref ? { Referer: ref as string } : {},
    });

    // if text/plain or application/json, return as json
    if (responseType === 'json') {
      res.json(response.data);
      return;
    }

    if (contentType.includes('application/vnd.apple.mpegurl')) {
      let m3u8Content = response.data.toString('utf-8'); 

      /// i forgor 😭
      const baseFetchUrl = `https://${req.get('host')}/fetch?url=`;
      const baseSegmentUrl = `https://${req.get('host')}/fetch/segment?url=`;

      m3u8Content = m3u8Content.replace(/([^\s]+\.ts)/g, (match: string) => {
        const absoluteUrl = new URL(match, url).href;
        return `${baseSegmentUrl}${encodeURIComponent(absoluteUrl)}`;
      });

      m3u8Content = m3u8Content.replace(/([^\s]+\.m3u8)/g, (match: string) => {
        const absoluteUrl = new URL(match, url).href;
        return `${baseFetchUrl}${encodeURIComponent(absoluteUrl)}`;
      });

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Connection', 'Keep-Alive');
      res.send(m3u8Content);
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');

    // pass through the content
    res.send(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        response: error.response?.data,
        headers: error.config?.headers ?? {},
      });
    }
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
        'Connection': 'keep-alive',
      },
      httpsAgent: new https.Agent({ keepAlive: true }),
    });

    const contentType = response.headers['content-type'] || 'video/MP2T'; 
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Connection', 'Keep-Alive');
    res.send(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        message: error.message,
        response: error.response?.data,
        headers: error.config?.headers ?? {},
      });
    }
    res.status(500).json({ error: 'Failed to proxy video segment' });
  }
});

export default router;
