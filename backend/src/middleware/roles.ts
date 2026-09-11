import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';

export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized. Please log in.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "You don't have permission to perform this action.",
      });
      return;
    }

    next();
  };
};

export const requireOwner = requireRoles(['OWNER']);
export const requireOwnerOrAdmin = requireRoles(['OWNER', 'ADMIN']);
export const requireAnyStaff = requireRoles(['OWNER', 'ADMIN', 'STAFF', 'MILKMAN']);
