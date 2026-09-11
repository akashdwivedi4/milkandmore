import { Types, ClientSession } from 'mongoose';
import { AuditLog } from '../models/AuditLog';

export const logAudit = async (
  businessId: string | Types.ObjectId,
  userId: string | Types.ObjectId | undefined,
  userRole: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  details: Record<string, any> = {},
  session?: ClientSession | null
): Promise<void> => {
  try {
    const doc = new AuditLog({
      businessId: new Types.ObjectId(businessId),
      userId: userId ? new Types.ObjectId(userId) : undefined,
      userRole,
      action,
      entity,
      entityId,
      details,
      timestamp: new Date(),
    });

    if (session) {
      await doc.save({ session });
    } else {
      await doc.save();
    }
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
};
