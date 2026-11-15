import { Request, Response } from 'express';
export declare const giveAdvance: (req: Request, res: Response) => Promise<void>;
export declare const makePayment: (req: Request, res: Response) => Promise<void>;
export declare const settleAccount: (req: Request, res: Response) => Promise<void>;
export declare const getSettlementById: (req: Request, res: Response) => Promise<void>;
/**
 * 10-Day (or configured cycle) Billing Sheet Aggregation
 * Aggregates daily milk entries, average FAT/SNF, gross value, advances, and net payable.
 * Generates WhatsApp bill slip text & dynamic chart data.
 */
export declare const getSettlementCycleSheet: (req: Request, res: Response) => Promise<void>;
