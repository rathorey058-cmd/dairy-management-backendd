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
/**
 * Get current tenant's AI pairing quota & usage
 */
export declare const getMyPairingQuota: (req: Request, res: Response) => Promise<void>;
/**
 * SUPER ADMIN: List all tenants and their AI Visual Pairing limits
 */
export declare const getAllTenantsPairingLimits: (req: Request, res: Response) => Promise<void>;
/**
 * SUPER ADMIN: Update a tenant's AI pairing block limits & plan tier
 */
export declare const updateTenantPairingLimitByAdmin: (req: Request, res: Response) => Promise<void>;
