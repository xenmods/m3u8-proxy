import express from 'express';
import morgan from 'morgan';
import cors from 'cors';

import indexRouter from './routes/index.ts';
import proxyRouter from './routes/fetch.ts';

const app = express();

app.use(express.json());

app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600,
}));
// List of domains you want to allow
// const allowedOrigins = [
//   'https://animerealms.org',
//   'https://www.animerealms.org',
//   'https://literate-parakeet-xgq4www6q6439xgq-3000.app.github.dev'
// ];

// const corsOptions = {
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   maxAge: 3600,
// };

// // Use the new options in your app
// app.use(cors(corsOptions));

app.use(morgan('combined'));

app.use('/', indexRouter);
// had to rename as my host does not support proxy as a route
app.use('/fetch', proxyRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
