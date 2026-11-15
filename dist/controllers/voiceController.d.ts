import { Request, Response } from 'express';
export declare const parseVoiceCommand: (req: Request, res: Response) => Promise<void>;
export declare const executeVoiceCommand: (req: Request, res: Response) => Promise<void>;
