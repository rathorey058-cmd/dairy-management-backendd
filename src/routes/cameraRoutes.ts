import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { recorderHeartbeat, getDailySummary } from '../controllers/dailySummaryController';
import { getTriMatchReport, getAuditImage } from '../controllers/triMatchController';
import { pushLiveTelemetry, getLiveTelemetry } from '../controllers/liveTelemetryController';
import {
  getAiBrainState,
  teachAiObject,
  observeAndLearnPerson,
  updateAiBrainEntity,
  deleteAiBrainEntity,
  exportAiBrainBackup,
  importAiBrainBackup,
} from '../controllers/aiTrainerController';
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

// Public Frame & Live Telemetry Ingestion from Local Shop DVR Bridge / Python Edge AI
router.post('/:id/push-frame', pushCameraFrame);
router.post('/live-telemetry', pushLiveTelemetry);
router.post('/ai-brain/observe-person', observeAndLearnPerson);

router.use(authenticate);

// Live Real-Time Telemetry & Pipeline Health Diagnostics
router.get('/live-telemetry', getLiveTelemetry);

// Permanent Self-Learning AI Brain, Video Trainer & Backup Routes
router.get('/ai-brain', getAiBrainState);
router.post('/ai-brain/teach-object', teachAiObject);
router.patch('/ai-brain/entity/:id', updateAiBrainEntity);
router.delete('/ai-brain/entity/:id', deleteAiBrainEntity);
router.get('/ai-brain/export-backup', exportAiBrainBackup);
router.post('/ai-brain/import-backup', importAiBrainBackup);

// 1. Owner & Staff Face Enrollment & Instructions
router.get('/profiles', getPersonProfiles);
router.post('/profiles', savePersonProfile);
router.delete('/profiles/:id', deletePersonProfile);

// 2. Time-Interval Sales, Footfall & Galla Report
router.get('/reports/time-interval', getTimeIntervalGallaReport);
router.get('/reports/daily-summary', getDailySummary);
router.get('/reports/tri-match', getTriMatchReport);
router.get('/audit-log/:id/image', getAuditImage);
router.post('/recorder-heartbeat', recorderHeartbeat);

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


