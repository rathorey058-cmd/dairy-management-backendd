import { Request, Response } from 'express';
export declare const createInvoice: (req: Request, res: Response) => Promise<void>;
export declare const receiveCustomerPayment: (req: Request, res: Response) => Promise<void>;
export declare const getCustomers: (req: Request, res: Response) => Promise<void>;
export declare const getProducts: (req: Request, res: Response) => Promise<void>;
export declare const createProduct: (req: Request, res: Response) => Promise<void>;
export declare const updateProduct: (req: Request, res: Response) => Promise<void>;
export declare const getProductByBarcode: (req: Request, res: Response) => Promise<void>;
export declare const getOrders: (req: Request, res: Response) => Promise<void>;
