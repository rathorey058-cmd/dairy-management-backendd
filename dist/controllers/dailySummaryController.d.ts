import { Request, Response } from 'express';
/** Recorder calls this every ~60s so reports know when it was alive. */
export declare const recorderHeartbeat: (req: Request, res: Response) => Promise<void>;
/**
 * SHORT daily / interval summary:
 *  - 5 headline numbers
 *  - hourly chart (customers vs sales)
 *  - max 3 alerts
 * Customers & galla come ONLY from camera data (never guessed from sales).
 */
export declare const getDailySummary: (req: Request, res: Response) => Promise<void>;
