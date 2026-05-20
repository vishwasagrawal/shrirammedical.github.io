import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { swaggerSpec } from './config/swagger';
import { logger } from './config/logger';

// Routes
import authRoutes from './routes/auth.routes';
import medicineRoutes from './routes/medicine.routes';
import categoryRoutes from './routes/category.routes';
import supplierRoutes from './routes/supplier.routes';
import customerRoutes from './routes/customer.routes';
import invoiceRoutes from './routes/invoice.routes';
import purchaseRoutes from './routes/purchase.routes';
import inventoryRoutes from './routes/inventory.routes';
import reportRoutes from './routes/report.routes';
import dashboardRoutes from './routes/dashboard.routes';
import settingsRoutes from './routes/settings.routes';
import auditRoutes from './routes/audit.routes';

const app: Application = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',');
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP logger
app.use(morgan('combined', {
  stream: { write: (message) => logger.http(message.trim()) },
}));

// Custom request logger
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MedStore API Docs',
}));

// Health check
app.get('/health', (_, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// API Routes v1
const API_V1 = '/api/v1';
app.use(`${API_V1}/auth`, authRoutes);
app.use(`${API_V1}/medicines`, medicineRoutes);
app.use(`${API_V1}/categories`, categoryRoutes);
app.use(`${API_V1}/suppliers`, supplierRoutes);
app.use(`${API_V1}/customers`, customerRoutes);
app.use(`${API_V1}/invoices`, invoiceRoutes);
app.use(`${API_V1}/purchases`, purchaseRoutes);
app.use(`${API_V1}/inventory`, inventoryRoutes);
app.use(`${API_V1}/reports`, reportRoutes);
app.use(`${API_V1}/dashboard`, dashboardRoutes);
app.use(`${API_V1}/settings`, settingsRoutes);
app.use(`${API_V1}/audit-logs`, auditRoutes);

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

export default app;
