import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';

interface DecodedToken {
  id: string;
  tenantId: string;
  role: string;
  permissions: string[];
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET || 'dairy-smart-ai-super-secret-key';
    
    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, jwtSecret) as DecodedToken;
    } catch (err) {
      res.status(401).json({ message: 'Invalid or expired token.' });
      return;
    }

    // Fetch tenant to check status
    const tenant = await Tenant.findById(decoded.tenantId);
    if (!tenant) {
      res.status(403).json({ message: 'Tenant not found.' });
      return;
    }

    if (tenant.status === 'Suspended') {
      res.status(403).json({ message: 'Your business account is suspended. Please contact support.' });
      return;
    }

    // Check subscription expiry
    if (new Date() > new Date(tenant.subscriptionExpiresAt)) {
      // Allow only Owner to access, maybe to upgrade, but block others. Or block all.
      // Let's block all but return subscription expired message.
      if (decoded.role !== 'SuperAdmin') {
        res.status(403).json({ message: 'Subscription expired. Please renew to continue.', subscriptionExpired: true });
        return;
      }
    }

    // Fetch user to confirm active status
    const user = await User.findById(decoded.id);
    if (!user || user.status === 'Inactive') {
      res.status(403).json({ message: 'User account is deactivated.' });
      return;
    }

    // Set tenant and user details in request
    req.tenantId = new Types.ObjectId(decoded.tenantId);
    req.user = {
      id: decoded.id,
      tenantId: req.tenantId,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    res.status(500).json({ message: 'Internal server authentication error.' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (req.user.role === 'SuperAdmin') {
      return next(); // SuperAdmin can bypass any check
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
      return;
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (req.user.role === 'SuperAdmin' || req.user.role === 'Owner') {
      return next(); // Owner and SuperAdmin have all permissions
    }

    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({ message: `Access denied. Requires permission: ${permission}` });
      return;
    }

    next();
  };
};
