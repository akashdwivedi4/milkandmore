import mongoose from 'mongoose';
import { env } from './env';

let isConnected = false;
let transactionsSupported: boolean | null = null;

export const connectDatabase = async (customUri?: string): Promise<typeof mongoose> => {
  const uri = customUri || env.MONGODB_URI;

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    mongoose.set('strictQuery', true);

    const connection = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    transactionsSupported = null; // reset to re-probe
    if (env.NODE_ENV !== 'test') {
      console.log(`✅ MongoDB connected successfully to: ${mongoose.connection.host}/${mongoose.connection.name}`);
    }

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      transactionsSupported = null;
      if (env.NODE_ENV !== 'test') {
        console.warn('⚠️ MongoDB disconnected.');
      }
    });

    return connection;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    transactionsSupported = null;
    if (env.NODE_ENV !== 'test') {
      console.log('🔌 MongoDB disconnected successfully.');
    }
  }
};

/**
 * Checks if the current MongoDB connection supports multi-document transactions (e.g. replica set).
 */
export const checkTransactionsSupported = async (): Promise<boolean> => {
  if (transactionsSupported !== null) {
    return transactionsSupported;
  }

  try {
    const db = mongoose.connection.db;
    if (!db) {
      return false;
    }
    const res = await db.admin().command({ hello: 1 });
    transactionsSupported = Boolean(res?.setName || res?.msg === 'isdbgrid');
  } catch {
    transactionsSupported = false;
  }

  return transactionsSupported ?? false;
};

/**
 * Execute a callback within a Mongoose transaction if supported by the MongoDB deployment (replica set),
 * or directly execute without session if running on standalone MongoDB.
 */
export const runInTransaction = async <T>(fn: (session: mongoose.ClientSession | null) => Promise<T>): Promise<T> => {
  const isSupported = await checkTransactionsSupported();

  if (!isSupported) {
    return await fn(null);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err: any) {
    try {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
    } catch {}
    throw err;
  } finally {
    await session.endSession();
  }
};
