import { Request, Response } from 'express';
/**
 * Get tenant configuration, pricing, settlement cycle, and onboarding status
 */
export declare const getTenantSettings: (req: Request, res: Response) => Promise<void>;
/**
 * Update tenant profile, pricing, settlement cycle, or hardware config
 */
export declare const updateTenantSettings: (req: Request, res: Response) => Promise<void>;
/**
 * Mark onboarding wizard as completed
 */
export declare const completeOnboarding: (req: Request, res: Response) => Promise<void>;
