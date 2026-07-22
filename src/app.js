'use strict';

const { env } = require('./config/env');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const logger = require('./config/logger');
const responseFormatter = require('./middleware/response.middleware');
const notFoundHandler = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/errorHandler.middleware');
const v1Routes = require('./routes');
const webhookRoute = require('./routes/webhook.route');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cookieParser());

const ALLOWED_ORIGINS = (env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin not allowed — ${origin}`));
    },
    credentials: true,
  }),
);

app.use(
  morgan('combined', {
    stream: {
      write: (line) => logger.http(line.trim()),
    },
  }),
);
app.use('/', webhookRoute);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(responseFormatter);

const basePath = `/api/${env.API_VERSION}`;
app.use(basePath, v1Routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
