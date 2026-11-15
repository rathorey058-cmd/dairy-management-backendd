import { Request, Response } from 'express';
export declare const getDueCustomers: (req: Request, res: Response) => Promise<void>;
export declare const getCustomerLedgerStatement: (req: Request, res: Response) => Promise<void>;
export declare const collectDuePayment: (req: Request, res: Response) => Promise<void>;
