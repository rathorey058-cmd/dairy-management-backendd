import { Request, Response } from 'express';
/**
 * Visit-by-visit Video + Audio + POS reconciliation for a whole day / shop-hours window.
 * Every customer arrival seen by camera = one visit. Audio, POS bills and galla openings
 * are attached to the visit they belong to (by time), and a verdict is computed.
 */
export declare const getTriMatchReport: (req: Request, res: Response) => Promise<void>;
/** Snapshot of a visit (loaded lazily so the report stays light). */
export declare const getAuditImage: (req: Request, res: Response) => Promise<void>;
