import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import connectDB from './Config/db.js';
import CommonRoutes from './common.routes.js';

const app = express();

app.use(
  cors({
    credentials: true,
    origin: true,
  })
);

connectDB();

app.use(
  express.json({
    limit: '50mb',
    type: ['application/json'],
  })
);

app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cache-Control', 'no-cache');
  res.header('Connection', 'keep-alive');
  next();
});

app.use(morgan('tiny'));

app.get('/', (req, res) => {
  return res.end('TwinsDay Restaurant API Working');
});

app.use('/api/v1', CommonRoutes);

export default app;
