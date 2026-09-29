import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/authRoutes';
import qrRoutes from './routes/qrRoutes';
import customerRoutes from './routes/customerRoutes';
import deliveryRoutes from './routes/deliveryRoutes';
import productRoutes from './routes/productRoutes';
import purchaseRoutes from './routes/purchaseRoutes';
import paymentRoutes from './routes/paymentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import billRoutes from './routes/billRoutes';
import reportRoutes from './routes/reportRoutes';
import settingsRoutes from './routes/settingsRoutes';
import supplierRoutes from './routes/supplierRoutes';
import supplierPaymentRoutes from './routes/supplierPaymentRoutes';
import expenseRoutes from './routes/expenseRoutes';
import exportRoutes from './routes/exportRoutes';
import accountingRoutes from './routes/accountingRoutes';
import customerPortalRoutes from './routes/customerPortalRoutes';

export const createApp = (): Express => {
  const app = express();

  // Security headers & CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logger
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'milk-and-more-backend',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/qr', qrRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/deliveries', deliveryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/purchases', purchaseRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/supplier-payments', supplierPaymentRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/bills', billRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/exports', exportRoutes);
  app.use('/api/accounting', accountingRoutes);
  app.use('/api/customer-portal', customerPortalRoutes);

  // Central error handling
  app.use(errorHandler);

  return app;
};
