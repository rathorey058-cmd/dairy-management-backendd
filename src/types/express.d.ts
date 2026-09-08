import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      tenantId?: Types.ObjectId;
      user?: {
        id: string;
        tenantId: Types.ObjectId;
        role: string;
        permissions: string[];
      };
    }
  }
}
