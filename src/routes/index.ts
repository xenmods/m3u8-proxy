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
    message: 'Portal for the realms.',
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
