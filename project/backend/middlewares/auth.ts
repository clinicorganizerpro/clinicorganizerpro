import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type JwtUserContext = {
  id: string;
  email: string;
  role: 'admin' | 'doctor' | 'staff';
  clinicId?: string;
};

export type JwtAuthResult = {
  user: JwtUserContext;
  accessToken: string;
};

const getAccessTokenSecret = (): string => {
  return process.env.ACCESS_TOKEN_SECRET ?? process.env.JWT_SECRET ?? 'dev_access_secret_change_me';
};

const parseBearer = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = String(header).split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtAuthResult;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = parseBearer(req);
  if (!token) {
    return res.status(401).json({ data: null, error: { message: 'Missing Authorization: Bearer token' } });
  }

  try {
    const decoded = jwt.verify(token, getAccessTokenSecret()) as jwt.JwtPayload & {
      sub?: string;
      email?: string;
      role?: string;
      clinicId?: string;
    };

    const user: JwtUserContext = {
      id: String(decoded.sub ?? ''),
      email: String(decoded.email ?? ''),
      role: (decoded.role as JwtUserContext['role']) ?? 'staff',
      clinicId: decoded.clinicId ? String(decoded.clinicId) : undefined,
    };

    if (!user.id || !user.email) {
      return res.status(401).json({ data: null, error: { message: 'Invalid token payload' } });
    }

    req.auth = { user, accessToken: token };
    return next();
  } catch {
    return res.status(401).json({ data: null, error: { message: 'Invalid or expired access token' } });
  }
};
