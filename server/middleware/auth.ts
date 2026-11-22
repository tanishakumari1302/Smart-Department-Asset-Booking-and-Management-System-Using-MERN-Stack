import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { findUserById } from '../services/dataService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'assethub_jwt_secret_academic_erp_2026_secure_key';

export interface AuthRequest extends Request {
  user?: any;
}

export function generateToken(user: any): string {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      facultyId: user.facultyId,
      department: user.department,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User belonging to token no longer exists' });
    }
    req.user = user;
    next();
  } catch (err: any) {
    return res.status(403).json({ message: 'Invalid or expired token', error: err.message });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Action requires one of [${allowedRoles.join(', ')}] roles`,
      });
    }
    next();
  };
}
