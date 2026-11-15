import { Request, Response } from 'express';
export declare const seedDatabaseHandler: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const getMe: (req: Request, res: Response) => Promise<void>;
export declare const updateTenantGeminiKey: (req: Request, res: Response) => Promise<void>;
