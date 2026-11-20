import { Request, Response } from 'express';
export declare const getPersonProfiles: (req: Request, res: Response) => Promise<void>;
export declare const savePersonProfile: (req: Request, res: Response) => Promise<void>;
export declare const deletePersonProfile: (req: Request, res: Response) => Promise<void>;
export declare const getTimeIntervalGallaReport: (req: Request, res: Response) => Promise<void>;
export declare const getFridgeStatus: (req: Request, res: Response) => Promise<void>;
export declare const auditFridgeAccess: (req: Request, res: Response) => Promise<void>;
export declare const searchDvrPlayback: (req: Request, res: Response) => Promise<void>;
export declare const getPlaybackTimeline: (req: Request, res: Response) => Promise<void>;
