import { Request, Response } from 'express';
export declare const createMilkEntry: (req: Request, res: Response) => Promise<void>;
export declare const getMilkCollections: (req: Request, res: Response) => Promise<void>;
export declare const getMilkSummary: (req: Request, res: Response) => Promise<void>;
export declare const createRateChart: (req: Request, res: Response) => Promise<void>;
export declare const getRateCharts: (req: Request, res: Response) => Promise<void>;
