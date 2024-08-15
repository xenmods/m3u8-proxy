import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

import indexRouter from './routes/index.ts';
import proxyRouter from './routes/proxy.ts';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600,
}));

app.use(morgan('combined'));

app.use('/', indexRouter);
app.use('/proxy', proxyRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
