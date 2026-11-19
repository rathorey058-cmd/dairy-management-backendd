import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import {
  getCameras,
  saveCamera,
  deleteCamera,
  testCameraConnection,
  captureAndAnalyzeOCR,
  verifyDualAudit,
  scanShelfInventory,
  detectPersonAndVisits,
  getAuditLogs,
  getShelfBlocks,
  saveShelfBlock,
  deleteShelfBlock,
  resolveFarmerToken,
  getLiveCameraSnapshot,
  getUltraCrispIncidents,
  updateIncidentStatus,
  evaluateEdgeRules,
  getDpdpComplianceStatus,
  purgeExpiredData,
  pushCameraFrame,
  getVisualPairingBlocks,
  saveVisualPairingBlock,
  deleteVisualPairingBlock,
  recordShelfPickEvent,
  recordGateMovement,
  getReusableCansSummary
} from '../controllers/cameraController';

import {
  analyzeMediaUpload,
  auditLiveStreamSnapshot,
  getShopAiReports,
  getShopAiReportById,
  deleteShopAiReport,
  generateDailyAiReport
} from '../controllers/shopAiController';

import {
  getPersonProfiles,
  savePersonProfile,
  deletePersonProfile,
  getTimeIntervalGallaReport,
  getFridgeStatus,
  auditFridgeAccess,
  searchDvrPlayback,
  getPlaybackTimeline
} from '../controllers/shopSurveillanceController';

const router = Router();

// Public Frame Ingestion from Local Shop DVR Bridge
router.post('/:id/push-frame', pushCameraFrame);

router.use(authenticate);

// 1. Owner & Staff Face Enrollment & Instructions
router.get('/profiles', getPersonProfiles);
router.post('/profiles', savePersonProfile);
router.delete('/profiles/:id', deletePersonProfile);

// 2. Time-Interval Sales, Footfall & Galla Report
router.get('/reports/time-interval', getTimeIntervalGallaReport);

// 3. Fridge / Refrigerator Inventory & Night Alerts
router.get('/fridge/status', getFridgeStatus);
router.post('/fridge/audit', auditFridgeAccess);

// 4. In-App DVR Playback (From HDD)
router.get('/playback/search', searchDvrPlayback);
router.get('/playback/timeline', getPlaybackTimeline);

// Shop Intelligence, CCTV/Video Upload, Voice Recognition & Live Audits
router.post('/shop-ai/upload-analyze', analyzeMediaUpload);
router.post('/shop-ai/live-audit', auditLiveStreamSnapshot);
router.get('/shop-ai/reports', getShopAiReports);
router.post('/shop-ai/generate-daily-report', generateDailyAiReport);
router.get('/shop-ai/reports/:id', getShopAiReportById);
router.delete('/shop-ai/reports/:id', deleteShopAiReport);

// Camera Device Configs
router.get('/', getCameras);
router.post('/', saveCamera);
router.delete('/:id', deleteCamera);
router.post('/test-connection', testCameraConnection);
router.get('/:id/live-snapshot', getLiveCameraSnapshot);

// AI Vision OCR & Dual Verification
router.post('/capture-ocr', captureAndAnalyzeOCR);
router.post('/verify-dual-audit', verifyDualAudit);

// Kirana & Shelf Inventory
router.post('/scan-shelf', scanShelfInventory);
router.get('/shelf-blocks', getShelfBlocks);
router.post('/shelf-blocks', saveShelfBlock);
router.delete('/shelf-blocks/:id', deleteShelfBlock);

// Face Recognition & Footfall
router.post('/detect-person', detectPersonAndVisits);

// AI Audit Trail & Metrics
router.get('/audit-logs', getAuditLogs);

// Ultra-Crisp Actionable Incidents & Edge Rule Engine
router.get('/incidents', getUltraCrispIncidents);
router.patch('/incidents/:id/status', updateIncidentStatus);
router.post('/evaluate-edge-rules', evaluateEdgeRules);

// DPDP Act 2023 Compliance & Retention Routes
router.get('/dpdp/status', getDpdpComplianceStatus);
router.post('/dpdp/purge', purgeExpiredData);

// Smart Visual Pairing Blocks & Asset Tagging Routes
router.get('/pairing-blocks', getVisualPairingBlocks);
router.post('/pairing-blocks', saveVisualPairingBlock);
router.delete('/pairing-blocks/:id', deleteVisualPairingBlock);
router.post('/pairing-blocks/:id/record-pick', recordShelfPickEvent);
router.post('/pairing-blocks/:id/record-gate', recordGateMovement);
router.get('/pairing-blocks/reusable-summary', getReusableCansSummary);

// Instant Token Resolver
router.get('/resolve-token', resolveFarmerToken);

export default router;

