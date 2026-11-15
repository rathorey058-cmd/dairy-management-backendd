import { Request, Response } from 'express';
export declare const closeDay: (req: Request, res: Response) => Promise<void>;
export declare const getClosingStatus: (req: Request, res: Response) => Promise<void>;
export declare const getDailyClosingHistory: (req: Request, res: Response) => Promise<void>;
export declare const generateDailyExcel: (req: Request, res: Response) => Promise<void>;
