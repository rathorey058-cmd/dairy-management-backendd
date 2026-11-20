"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const dailySummaryController_1 = require("../controllers/dailySummaryController");
const triMatchController_1 = require("../controllers/triMatchController");
const cameraController_1 = require("../controllers/cameraController");
const shopAiController_1 = require("../controllers/shopAiController");
const shopSurveillanceController_1 = require("../controllers/shopSurveillanceController");
const router = (0, express_1.Router)();
// Public Frame Ingestion from Local Shop DVR Bridge
router.post('/:id/push-frame', cameraController_1.pushCameraFrame);
router.use(authMiddleware_1.authenticate);
// 1. Owner & Staff Face Enrollment & Instructions
router.get('/profiles', shopSurveillanceController_1.getPersonProfiles);
router.post('/profiles', shopSurveillanceController_1.savePersonProfile);
router.delete('/profiles/:id', shopSurveillanceController_1.deletePersonProfile);
// 2. Time-Interval Sales, Footfall & Galla Report
router.get('/reports/time-interval', shopSurveillanceController_1.getTimeIntervalGallaReport);
router.get('/reports/daily-summary', dailySummaryController_1.getDailySummary);
router.get('/reports/tri-match', triMatchController_1.getTriMatchReport);
router.get('/audit-log/:id/image', triMatchController_1.getAuditImage);
router.post('/recorder-heartbeat', dailySummaryController_1.recorderHeartbeat);
// 3. Fridge / Refrigerator Inventory & Night Alerts
router.get('/fridge/status', shopSurveillanceController_1.getFridgeStatus);
router.post('/fridge/audit', shopSurveillanceController_1.auditFridgeAccess);
// 4. In-App DVR Playback (From HDD)
router.get('/playback/search', shopSurveillanceController_1.searchDvrPlayback);
router.get('/playback/timeline', shopSurveillanceController_1.getPlaybackTimeline);
// Shop Intelligence, CCTV/Video Upload, Voice Recognition & Live Audits
router.post('/shop-ai/upload-analyze', shopAiController_1.analyzeMediaUpload);
router.post('/shop-ai/live-audit', shopAiController_1.auditLiveStreamSnapshot);
router.get('/shop-ai/reports', shopAiController_1.getShopAiReports);
router.post('/shop-ai/generate-daily-report', shopAiController_1.generateDailyAiReport);
router.get('/shop-ai/reports/:id', shopAiController_1.getShopAiReportById);
router.delete('/shop-ai/reports/:id', shopAiController_1.deleteShopAiReport);
// Camera Device Configs
router.get('/', cameraController_1.getCameras);
router.post('/', cameraController_1.saveCamera);
router.delete('/:id', cameraController_1.deleteCamera);
router.post('/test-connection', cameraController_1.testCameraConnection);
router.get('/:id/live-snapshot', cameraController_1.getLiveCameraSnapshot);
// AI Vision OCR & Dual Verification
router.post('/capture-ocr', cameraController_1.captureAndAnalyzeOCR);
router.post('/verify-dual-audit', cameraController_1.verifyDualAudit);
// Kirana & Shelf Inventory
router.post('/scan-shelf', cameraController_1.scanShelfInventory);
router.get('/shelf-blocks', cameraController_1.getShelfBlocks);
router.post('/shelf-blocks', cameraController_1.saveShelfBlock);
router.delete('/shelf-blocks/:id', cameraController_1.deleteShelfBlock);
// Face Recognition & Footfall
router.post('/detect-person', cameraController_1.detectPersonAndVisits);
// AI Audit Trail & Metrics
router.get('/audit-logs', cameraController_1.getAuditLogs);
// Ultra-Crisp Actionable Incidents & Edge Rule Engine
router.get('/incidents', cameraController_1.getUltraCrispIncidents);
router.patch('/incidents/:id/status', cameraController_1.updateIncidentStatus);
router.post('/evaluate-edge-rules', cameraController_1.evaluateEdgeRules);
// DPDP Act 2023 Compliance & Retention Routes
router.get('/dpdp/status', cameraController_1.getDpdpComplianceStatus);
router.post('/dpdp/purge', cameraController_1.purgeExpiredData);
// Smart Visual Pairing Blocks & Asset Tagging Routes
router.get('/pairing-blocks', cameraController_1.getVisualPairingBlocks);
router.post('/pairing-blocks', cameraController_1.saveVisualPairingBlock);
router.delete('/pairing-blocks/:id', cameraController_1.deleteVisualPairingBlock);
router.post('/pairing-blocks/:id/record-pick', cameraController_1.recordShelfPickEvent);
router.post('/pairing-blocks/:id/record-gate', cameraController_1.recordGateMovement);
router.get('/pairing-blocks/reusable-summary', cameraController_1.getReusableCansSummary);
// Instant Token Resolver
router.get('/resolve-token', cameraController_1.resolveFarmerToken);
exports.default = router;
