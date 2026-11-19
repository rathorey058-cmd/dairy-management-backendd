import { Request, Response } from 'express';
import { CameraAuditLog } from '../models/CameraAuditLog';
import { AudioTranscript } from '../models/AudioTranscript';
import { MilkSale } from '../models/MilkSale';
import { Order } from '../models/Order';
import { Product } from '../models/Product';

const PRE_MS = 20 * 1000;   // audio/bill can come slightly before the detected arrival
const POST_MS = 150 * 1000; // ... and up to 2.5 min after

type Verdict = 'MATCH' | 'POS_ONLY' | 'AUDIO_NO_BILL' | 'GALLA_NO_BILL' | 'NO_PURCHASE' | 'AMOUNT_DIFF';

/**
 * Visit-by-visit Video + Audio + POS reconciliation for a whole day / shop-hours window.
 * Every customer arrival seen by camera = one visit. Audio, POS bills and galla openings
 * are attached to the visit they belong to (by time), and a verdict is computed.
 */
export const getTriMatchReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
    const { date, startTime = '05:00', endTime = '22:00' } = req.query as any;
    const day = typeof date === 'string' && date ? date : new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0];
    const from = new Date(`${day}T${startTime}:00+05:30`);
    const to = new Date(`${day}T${endTime}:59.999+05:30`);

    const [visitsRaw, audios, milk, orders, galla] = await Promise.all([
      CameraAuditLog.find({ tenantId, eventType: 'FACE_VISIT', timestamp: { $gte: from, $lte: to } })
        .sort({ timestamp: 1 }).select('timestamp visitCountToday'),
      AudioTranscript.find({ tenantId, timestamp: { $gte: from, $lte: to } }).sort({ timestamp: 1 }),
      MilkSale.find({ tenantId, createdAt: { $gte: from, $lte: to } }).sort({ createdAt: 1 }),
      Order.find({ tenantId, createdAt: { $gte: from, $lte: to } }).sort({ createdAt: 1 }),
      CameraAuditLog.find({
        tenantId, eventType: { $in: ['GALLA_ALERT', 'CASH_DRAWER_MISMATCH'] }, timestamp: { $gte: from, $lte: to },
      }).sort({ timestamp: 1 }).select('timestamp eventType'),
    ]);

    // product names for order labels
    const pids = new Set<string>();
    orders.forEach((o: any) => o.items?.forEach((i: any) => i.product && pids.add(i.product.toString())));
    const prods = pids.size ? await Product.find({ _id: { $in: [...pids] } }).select('name') : [];
    const pname: Record<string, string> = {};
    prods.forEach((p: any) => { pname[p._id.toString()] = p.name; });

    const bills = [
      ...milk.map((m: any) => ({
        id: m._id.toString(), at: m.createdAt as Date, amount: Math.round(m.totalAmount || 0), mode: m.paymentMode,
        label: `दूध ${Math.round((m.totalQuantity || 0) * 100) / 100} L`,
      })),
      ...orders.map((o: any) => ({
        id: o._id.toString(), at: o.createdAt as Date, amount: Math.round(o.totalAmount || 0), mode: o.paymentMode,
        label: (o.items || []).slice(0, 3).map((i: any) => `${pname[i.product?.toString()] || 'सामान'} ×${i.quantity}`).join(', ') || 'सामान',
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    const visits = visitsRaw.map((v: any) => ({
      id: v._id.toString(),
      at: v.timestamp as Date,
      people: v.visitCountToday || 1,
      audio: [] as any[],
      bills: [] as any[],
      galla: [] as any[],
    }));

    // attach item to the visit it belongs to
    const attach = (t: number): number => {
      let best = -1;
      for (let i = 0; i < visits.length; i++) {
        const vt = visits[i].at.getTime();
        if (t >= vt - PRE_MS && t <= vt + POST_MS) {
          // prefer latest visit that started at/before the item; else earliest following visit
          if (vt <= t) best = i;
          else if (best === -1) { best = i; break; }
        }
      }
      return best;
    };

    const orphanAudio: any[] = [];
    const orphanBills: any[] = [];
    const audioView = (a: any) => ({ at: a.timestamp, text: a.text, amounts: a.amounts || [], items: a.items || [] });

    audios.forEach((a: any) => {
      const idx = attach(a.timestamp.getTime());
      if (idx >= 0) visits[idx].audio.push(audioView(a));
      else if ((a.amounts?.length || a.items?.length)) orphanAudio.push(audioView(a));
    });
    bills.forEach(b => {
      const idx = attach(b.at.getTime());
      if (idx >= 0) visits[idx].bills.push(b); else orphanBills.push(b);
    });
    galla.forEach((g: any) => {
      const idx = attach(g.timestamp.getTime());
      if (idx >= 0) visits[idx].galla.push({ at: g.timestamp, billed: g.eventType === 'GALLA_ALERT' });
    });

    const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(10, b * 0.1);

    const out = visits.map(v => {
      const posTotal = v.bills.reduce((s: number, b: any) => s + b.amount, 0);
      const heard: number[] = v.audio.flatMap((a: any) => a.amounts);
      const heardAmt = heard.length ? heard[heard.length - 1] : 0;
      const hasBill = v.bills.length > 0;
      const hasAudio = heard.length > 0 || v.audio.some((a: any) => a.items.length > 0);
      const gallaOpen = v.galla.length > 0;

      let verdict: Verdict; let note: string;
      if (hasBill && heard.length && (heard.some(h => near(h, posTotal)))) {
        verdict = 'MATCH'; note = `ऑडियो ₹${heardAmt} और बिल ₹${posTotal} मेल खाते हैं।`;
      } else if (hasBill && heard.length) {
        verdict = 'AMOUNT_DIFF'; note = `ऑडियो में ₹${heardAmt} सुना, बिल ₹${posTotal} कटा — रकम अलग है।`;
      } else if (hasBill) {
        verdict = 'POS_ONLY'; note = `बिल ₹${posTotal} कटा (ऑडियो में रकम साफ़ नहीं सुनी)।`;
      } else if (heard.length || hasAudio) {
        verdict = 'AUDIO_NO_BILL'; note = heard.length ? `ग्राहक ने ₹${heardAmt} की बात की, पर कोई बिल नहीं कटा।` : 'सामान की बात सुनी गई, पर कोई बिल नहीं कटा।';
      } else if (gallaOpen) {
        verdict = 'GALLA_NO_BILL'; note = 'गल्ला खुला, पर न बिल कटा न कोई बात रिकॉर्ड हुई।';
      } else {
        verdict = 'NO_PURCHASE'; note = 'ग्राहक आया, कोई खरीद दिखी नहीं।';
      }
      return {
        id: v.id, time: v.at, people: v.people,
        video: { arrived: true, people: v.people },
        audio: v.audio, pos: { bills: v.bills, total: posTotal }, galla: v.galla,
        heardAmount: heardAmt || null,
        verdict, note,
      };
    });

    const count = (vd: Verdict) => out.filter(v => v.verdict === vd).length;
    const customers = out.reduce((s, v) => s + v.people, 0);
    const posTotalAll = bills.reduce((s, b) => s + b.amount, 0);
    const audioTotal = out.reduce((s, v) => s + (v.heardAmount || 0), 0);

    res.json({
      success: true,
      window: { date: day, startTime, endTime },
      summary: {
        customers,
        visits: out.length,
        posBills: bills.length,
        posTotal: posTotalAll,
        audioHeardTotal: audioTotal,
        audioClips: audios.length,
        matched: count('MATCH'),
        posOnly: count('POS_ONLY'),
        amountDiff: count('AMOUNT_DIFF'),
        audioNoBill: count('AUDIO_NO_BILL'),
        gallaNoBill: count('GALLA_NO_BILL'),
        noPurchase: count('NO_PURCHASE'),
        orphanBills: orphanBills.length,
        orphanAudio: orphanAudio.length,
      },
      visits: out,
      orphanBills,
      orphanAudio,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'मिलान रिपोर्ट नहीं बन सकी।', error: error.message });
  }
};

/** Snapshot of a visit (loaded lazily so the report stays light). */
export const getAuditImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
    const log: any = await CameraAuditLog.findOne({ _id: req.params.id, tenantId }).select('snapshotImage');
    const img: string | undefined = log?.snapshotImage;
    if (!img || !img.startsWith('data:image')) { res.status(404).end(); return; }
    const m = img.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) { res.status(404).end(); return; }
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(Buffer.from(m[2], 'base64'));
  } catch {
    res.status(500).end();
  }
};
