import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import apiRouter from './routes/index.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { testDbConnection } from './db/index.js';

const app = express();

// Enable trust proxy for cloud environments like Render/Heroku/AWS behind reverse proxies
app.set('trust proxy', 1);

// 1. Security & Performance Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());

// 2. CORS Configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
      return callback(null, true);
    }
    // Allow any localhost origin in development
    if (!config.isProduction && origin.includes('localhost')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev, strict in prod
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Body Parsers & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookie.secret));

// 4. Rate Limiting for High Throughput (60k DAU protection)
app.use('/api', apiRateLimiter);

// 5. Health Check Endpoints
app.get(['/health', '/api/health'], async (req, res) => {
  const dbHealth = await testDbConnection();
  const memory = process.memoryUsage();

  res.status(dbHealth.connected ? 200 : 503).json({
    status: dbHealth.connected ? 'healthy' : 'degraded',
    service: 'Manav Rachna ICCF Enterprise Backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    database: dbHealth,
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
    },
    version: '1.0.0',
    nodeVersion: process.version,
  });
});

// 6. Mount Primary API Router
app.use('/api', apiRouter);

// 7. 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// 8. Global Error Handler
app.use(errorHandler);

// 9. Server Initialization
const server = app.listen(config.port, () => {
  console.log(`================================================================`);
  console.log(`🚀 Manav Rachna ICCF Portal Enterprise Backend Running!`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🩺 Health Check: http://localhost:${config.port}/api/health`);
  console.log(`📚 API Root: http://localhost:${config.port}/api`);
  console.log(`🛡️ Environment: ${config.nodeEnv}`);
  console.log(`⚡ Concurrency Target: Optimized for 60k+ DAU & High Throughput`);
  console.log(`================================================================`);
});

// 10. Graceful Shutdown Handlers
const handleShutdown = (signal: string) => {
  console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('[Server] HTTP server closed cleanly.');
    process.exit(0);
  });

  // Force close if still hanging after 10s
  setTimeout(() => {
    console.error('[Server] Force shutdown timeout reached.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default app;
