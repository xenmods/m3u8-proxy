import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import path from 'path';

const router = Router();

// Existing /m3u8 route for backward compatibility
router.get('/m3u8', async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const response = await axios.get(url);
    let m3u8Content = response.data as string;

    const baseUrl = `http://${req.get('host')}/proxy/segment?url=`;

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

// Updated /segment route for video segments
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

    const fileExtension = path.extname(url).toLowerCase();

    // Set appropriate Content-Type based on file extension
    switch (fileExtension) {
      case '.mp4':
        res.setHeader('Content-Type', 'video/mp4');
        break;
      case '.mkv':
        res.setHeader('Content-Type', 'video/x-matroska');
        break;
      case '.webm':
        res.setHeader('Content-Type', 'video/webm');
        break;
      case '.ts':
        res.setHeader('Content-Type', 'video/MP2T');
        break;
      default:
        res.setHeader('Content-Type', 'application/octet-stream');
    }

    res.setHeader('Content-Disposition', 'inline');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching the video segment:', (error as Error).message);
    res.status(500).json({ error: 'Failed to proxy video segment' });
  }
});

// New /video route to handle various video formats
router.get('/video', async (req: Request, res: Response) => {
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

    const fileExtension = path.extname(url).toLowerCase();

    // Set appropriate Content-Type based on file extension
    switch (fileExtension) {
      case '.mp4':
        res.setHeader('Content-Type', 'video/mp4');
        break;
      case '.mkv':
        res.setHeader('Content-Type', 'video/x-matroska');
        break;
      case '.webm':
        res.setHeader('Content-Type', 'video/webm');
        break;
      case '.ts':
        res.setHeader('Content-Type', 'video/MP2T');
        break;
      case '.m3u8':
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        break;
      default:
        return res.status(415).json({ error: 'Unsupported media type' });
    }

    res.setHeader('Content-Disposition', 'inline');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching the video file:', (error as Error).message);
    res.status(500).json({ error: 'Failed to proxy video file' });
  }
});

export default router;
