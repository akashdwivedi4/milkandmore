import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  status: 'pending' | 'completed';
  statusCode?: number;
  body?: any;
  timestamp: number;
}

const idempotencyStore = new Map<string, CacheEntry>();
const TTL_MS = 60 * 1000; // 60 seconds TTL

// Periodic cleanup
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore.entries()) {
    if (now - entry.timestamp > TTL_MS) {
      idempotencyStore.delete(key);
    }
  }
}, 30000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  // Only apply to POST / PATCH / PUT / DELETE mutations with a key
  if (!idempotencyKey || req.method === 'GET') {
    return next();
  }

  const existing = idempotencyStore.get(idempotencyKey);

  if (existing) {
    if (existing.status === 'pending') {
      res.status(409).json({
        success: false,
        error: 'A request with this idempotency key is already in progress. Please wait.',
      });
      return;
    }

    // Already completed - return cached response
    res.status(existing.statusCode || 200).json(existing.body);
    return;
  }

  // Mark as pending
  idempotencyStore.set(idempotencyKey, {
    status: 'pending',
    timestamp: Date.now(),
  });

  // Intercept response to cache upon completion
  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    idempotencyStore.set(idempotencyKey, {
      status: 'completed',
      statusCode: res.statusCode,
      body,
      timestamp: Date.now(),
    });
    return originalJson(body);
  }) as any;

  next();
};
