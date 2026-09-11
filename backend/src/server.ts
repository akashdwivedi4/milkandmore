import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      console.log(`🥛 Milk & More Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      console.log(`🔗 API Base: http://localhost:${env.PORT}/api`);
    });

    // Graceful shutdown
    const handleShutdown = async (signal: string) => {
      console.log(`${signal} signal received: closing HTTP server and database connection`);
      server.close(async () => {
        await disconnectDatabase();
        console.log('HTTP server and MongoDB connection closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err) {
    console.error('❌ Failed to bootstrap Milk & More server:', err);
    process.exit(1);
  }
};

startServer();
