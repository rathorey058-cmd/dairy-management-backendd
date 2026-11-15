import { Request, Response } from 'express';
export declare const getFarmers: (req: Request, res: Response) => Promise<void>;
export declare const createFarmer: (req: Request, res: Response) => Promise<void>;
export declare const getFarmerById: (req: Request, res: Response) => Promise<void>;
export declare const updateFarmer: (req: Request, res: Response) => Promise<void>;
export declare const getFarmerLedger: (req: Request, res: Response) => Promise<void>;
export declare const getFarmerMilkHistory: (req: Request, res: Response) => Promise<void>;
