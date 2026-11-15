import { Request, Response } from 'express';
export declare const ensureSampleBandhis: (tenantId: any) => Promise<void>;
export declare const getBandhis: (req: Request, res: Response) => Promise<void>;
export declare const createBandhi: (req: Request, res: Response) => Promise<void>;
export declare const updateBandhi: (req: Request, res: Response) => Promise<void>;
export declare const getDailyDeliverySheet: (req: Request, res: Response) => Promise<void>;
export declare const saveDailyDeliverySheet: (req: Request, res: Response) => Promise<void>;
