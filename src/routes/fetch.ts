import { Router, type Request, type Response } from 'express';
import axios from 'axios';

const router = Router();

router.get('/image', (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  axios({
    method: 'get',
    url,
    responseType: 'stream',
  })
    .then((response) => {
      res.setHeader('Content-Type', response.headers['content-type']);
      res.setHeader('Content-Disposition', 'inline');
      response.data.pipe(res);
    })
    .catch((error) => {
      console.error('Error fetching the image:', (error as Error).message);
      res.status(500).json({ error: 'Failed to proxy image' });
    });
});

router.get('/m3u8', async (req: Request, res: Response) => {
  const { url, ref } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'Referer': ref as string || '',
      },
    });

    let m3u8Content = response.data as string;
    
    // if you try to use localhost, You will not have a good time
    const baseUrl = `https://${req.get('host')}/fetch/segment?url=`;

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

  try {
    const response = await axios({
      method: 'get',
      url,
      responseType: 'arraybuffer',
    });

    res.setHeader('Content-Type', 'video/MP2T');
    res.setHeader('Content-Disposition', 'inline');
    // send keep-alive header cuz mpv was complaining about it
    res.setHeader('Connection', 'Keep-Alive');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching the video segment:', (error as Error).message);
    res.status(500).json({ error: 'Failed to proxy video segment' });
  }
});

export default router;
