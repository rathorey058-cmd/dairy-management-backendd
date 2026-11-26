import { Request, Response } from 'express';
/**
 * GET /api/cameras/ai-brain
 * Returns complete permanent AI Brain state: learned objects, auto-discovered regular visitors, routine stats & anomalies
 */
export declare const getAiBrainState: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/cameras/ai-brain/teach-object
 * 1-Click Box Teach from Live Camera or Uploaded Video Footage
 */
export declare const teachAiObject: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/cameras/ai-brain/observe-person
 * Self-Supervised Visitor Clustering + Spoken/Billed Name Voting + Routine Baseline Update
 * Called automatically by BOTH Python Edge AI (live DVR) AND Browser Video Test Mode!
 */
export declare const observeAndLearnPerson: (req: Request, res: Response) => Promise<void>;
/**
 * PATCH /api/cameras/ai-brain/entity/:id
 * Rename or verify an auto-learned person or taught object
 */
export declare const updateAiBrainEntity: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /api/cameras/ai-brain/entity/:id
 */
export declare const deleteAiBrainEntity: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/cameras/ai-brain/export-backup
 * 1-Click Permanent Encrypted/Portable JSON Brain Backup so learned AI data is NEVER lost
 */
export declare const exportAiBrainBackup: (req: Request, res: Response) => Promise<void>;
/**
 * POST /api/cameras/ai-brain/import-backup
 * Restore AI Brain backup on any new machine / tenant cleanly
 */
export declare const importAiBrainBackup: (req: Request, res: Response) => Promise<void>;
