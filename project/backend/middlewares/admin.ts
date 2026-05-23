import type { NextFunction, Request, Response } from 'express';
import { requireAuth, type JwtUserContext } from './auth.js';

export type AdminRole = JwtUserContext['role'];

const hasAnyRole = (user: JwtUserContext, roles: AdminRole[]): boolean => {
  return roles.includes(user.role);
};

export const requireAdmin = (roles: AdminRole[] = ['admin']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      const user = req.auth?.user;
      if (!user) {
        return res.status(401).json({ data: null, error: { message: 'Unauthorized' } });
      }

      if (!hasAnyRole(user, roles)) {
        return res.status(403).json({ data: null, error: { message: 'Forbidden (admin access required)' } });
      }

      return next();
    });
  };
};
