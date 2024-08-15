import express from 'express';
import axios from 'axios';
import morgan from 'morgan';
import cors from 'cors';

const app = express();

app.use(cors(
  {
    origin: ['http://localhost:4000', 'https://node-player.5yg3y1.easypanel.host/', 'https://nekoplayer.xyz/'],
    methods: ['GET', 'POST'],
  }
));

app.use(morgan('combined'));

app.get('/', (req, res) => {
    res.json({ message: 'NekoProxy is ready ' });
});

app.get('/proxy/m3u8', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  try {
    const response = await axios.get(url);
    let m3u8Content = response.data;

    const baseUrl = `${req.protocol}://${req.get('host')}/proxy/segment?url=`;

    m3u8Content = m3u8Content.replace(/(.*\.ts)/g, (match) => {
      return baseUrl + encodeURIComponent(new URL(match, url).href);
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline');
    res.send(m3u8Content);
  } catch (error) {
    if (error.response) {
      console.error(`Error fetching the m3u8 file: Status ${error.response.status}`);
    } else if (error.request) {
      console.error('Error fetching the m3u8 file: No response received');
    } else {
      console.error('Error fetching the m3u8 file:', error.message);
    }
    res.status(500).json({ error: 'Failed to proxy m3u8 file' });
  }
});

app.get('/proxy/segment', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { url } = req.query;

  if (!url) {
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
    res.send(response.data);
  } catch (error) {
    if (error.response) {
      console.error(`Error fetching the video segment: Status ${error.response.status}`);
    } else if (error.request) {
      console.error('Error fetching the video segment: No response received');
    } else {
      console.error('Error fetching the video segment:', error.message);
    }
    res.status(500).json({ error: 'Failed to proxy video segment' });
  }
});

// Handle CORS Anywhere requests
app.use('/cors-anywhere/', (req, res) => {
    corsProxyServer.emit('request', req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
