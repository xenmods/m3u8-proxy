import { Router, type Request, type Response } from 'express';

const router = Router();

let requestCount = 0;

router.use((req, res, next) => {
  requestCount++;
  next();
});


router.get('/', (req: Request, res: Response) => {
  res.json(
  { 
    message: 'NekoProxyV2 is ready🎉',
    endpoints: [
      {
        method: 'GET',
        usage: '/fetch',
        description: 'Fetch a video stream from a URL',
        query: {
          url: 'The URL of the video or image.',
          ref: 'The referrer URL'
        },
        note: "Please use this to fetch m3u8 files and images, it doesn't really work for whole websites."
      },
      {
        method: 'GET',
        usage: '/fetch/segment',
        description: 'Fetch a video segment from a URL',
        query: {
          url: 'The URL of the video segment.'
        }
      },
      {
        method: 'GET',
        usage: '/health',
        description: 'Check the health status of the server'
      },
      {
        method: 'GET',
        usage: '/reqs',
        description: 'Check the total number of requests made to the server(Resets every time the server restarts)'
      }
    ]
   }
  );
});

router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK' });
});

router.get('/reqs', async (req: Request, res: Response) => {
  const count = requestCount;
  if (count >= 1000) {
    const formattedCount = count / 1000;
    return res.json({ requests: `${formattedCount}k` });
  }
  res.json({ requests: count });
});

export default router;
