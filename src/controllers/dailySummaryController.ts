import { Request, Response } from 'express';
import { CameraAuditLog } from '../models/CameraAuditLog';
import { MilkSale } from '../models/MilkSale';
import { Order } from '../models/Order';
import { RecorderHeartbeat } from '../models/RecorderHeartbeat';

const IST_MS = 5.5 * 3600 * 1000;

/** Recorder calls this every ~60s so reports know when it was alive. */
export const recorderHeartbeat = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
    const minute = Math.floor(Date.now() / 60000);
    await RecorderHeartbeat.updateOne(
      { tenantId, minute },
      { $setOnInsert: { tenantId, minute, at: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * SHORT daily / interval summary:
 *  - 5 headline numbers
 *  - hourly chart (customers vs sales)
 *  - max 3 alerts
 * Customers & galla come ONLY from camera data (never guessed from sales).
 */
export const getDailySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
    const { date, startTime = '00:00', endTime = '23:59' } = req.query as any;
    const day = typeof date === 'string' && date ? date : new Date(Date.now() + IST_MS).toISOString().split('T')[0];
    const from = new Date(`${day}T${startTime}:00+05:30`);
    const to = new Date(`${day}T${endTime}:59.999+05:30`);
    const windowMinutes = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000));

    const [milkSales, orders, logs, beats] = await Promise.all([
      MilkSale.find({ tenantId, createdAt: { $gte: from, $lte: to } }).select('totalAmount paymentMode createdAt'),
      Order.find({ tenantId, createdAt: { $gte: from, $lte: to } }).select('totalAmount paymentMode createdAt'),
      CameraAuditLog.find({ tenantId, timestamp: { $gte: from, $lte: to } }).select('eventType timestamp visitCountToday notes'),
      RecorderHeartbeat.countDocuments({
        tenantId,
        minute: { $gte: Math.floor(from.getTime() / 60000), $lte: Math.floor(to.getTime() / 60000) },
      }),
    ]);

    const bills = [
      ...milkSales.map((s: any) => ({ amt: s.totalAmount || 0, mode: s.paymentMode, at: s.createdAt as Date })),
      ...orders.map((o: any) => ({ amt: o.totalAmount || 0, mode: o.paymentMode, at: o.createdAt as Date })),
    ];
    const totalSales = bills.reduce((a, b) => a + b.amt, 0);
    const cashSales = bills.filter(b => b.mode === 'Cash').reduce((a, b) => a + b.amt, 0);

    const visits = logs.filter(l => l.eventType === 'FACE_VISIT');
    const customers = visits.reduce((a, l) => a + (l.visitCountToday || 1), 0);
    const gallaOpenings = logs.filter(l => l.eventType === 'GALLA_ALERT' || l.eventType === 'CASH_DRAWER_MISMATCH').length;
    const unbilledGalla = logs.filter(l => l.eventType === 'CASH_DRAWER_MISMATCH').length;
    const loudEvents = logs.filter(l => l.eventType === 'MULTI_MIC_ALERT').length;

    // Hourly chart (IST)
    const hourOf = (d: Date) => new Date(d.getTime() + IST_MS).getUTCHours();
    const hourly: Record<number, { hour: number; customers: number; sales: number }> = {};
    const bucket = (h: number) => (hourly[h] ||= { hour: h, customers: 0, sales: 0 });
    visits.forEach(l => { bucket(hourOf(l.timestamp)).customers += l.visitCountToday || 1; });
    bills.forEach(b => { bucket(hourOf(b.at)).sales += b.amt; });

    const coveragePct = Math.min(100, Math.round((beats / windowMinutes) * 100));
    const recorderOk = coveragePct >= 80;

    // Max 3 alerts, most important first
    const alerts: { level: 'red' | 'amber' | 'info'; text: string }[] = [];
    if (!recorderOk) {
      alerts.push({
        level: 'amber',
        text: beats === 0
          ? 'इस समय AI रिकॉर्डर बंद था — ग्राहक/गल्ला का डेटा उपलब्ध नहीं है।'
          : `AI रिकॉर्डर सिर्फ़ ${coveragePct}% समय चालू था — ग्राहक संख्या कम दिख सकती है।`,
      });
    }
    if (unbilledGalla > 0) {
      alerts.push({ level: 'red', text: `गल्ला ${unbilledGalla} बार बिना बिल खुला।` });
    }
    if (recorderOk && customers >= 5 && bills.length < customers * 0.5) {
      alerts.push({ level: 'amber', text: `${customers} ग्राहक आए, सिर्फ़ ${bills.length} बिल कटे — जाँच लें।` });
    }
    if (loudEvents > 0) {
      alerts.push({ level: 'amber', text: `${loudEvents} बार ऊँची आवाज़/बहस रिकॉर्ड हुई।` });
    }

    res.json({
      success: true,
      window: { date: day, startTime, endTime },
      recorder: { ok: recorderOk, coveragePct, minutesAlive: beats, windowMinutes },
      headline: {
        customers: recorderOk || customers > 0 ? customers : null, // null = unknown, not 0
        bills: bills.length,
        sales: Math.round(totalSales),
        cash: Math.round(cashSales),
        gallaOpenings: recorderOk || gallaOpenings > 0 ? gallaOpenings : null,
      },
      hourly: Object.values(hourly).sort((a, b) => a.hour - b.hour),
      alerts: alerts.slice(0, 3),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'रिपोर्ट नहीं बन सकी।', error: error.message });
  }
};
