import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Farmer } from '../models/Farmer';
import { Product } from '../models/Product';
import { MilkCollection } from '../models/MilkCollection';
import { MilkRateChart } from '../models/MilkRateChart';
import { MilkSale } from '../models/MilkSale';
import { Order } from '../models/Order';
import { Expense } from '../models/Expense';
import { FarmerAdvance } from '../models/FarmerAdvance';
import { FarmerPayment } from '../models/FarmerPayment';
import { FarmerLedger } from '../models/FarmerLedger';
import { CashTransaction } from '../models/CashTransaction';
import { InventoryTransaction } from '../models/InventoryTransaction';
import { MilkBandhi } from '../models/MilkBandhi';
import { BandhiDeliveryLog, IDeliveryItem } from '../models/BandhiDeliveryLog';
import { Customer } from '../models/Customer';
import { CustomerLedger } from '../models/CustomerLedger';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { parseVoiceWithGemini } from '../services/geminiVoiceService';
import { postLedgerEntry } from '../services/milkService';
import { ensureSampleBandhis } from './bandhiController';

const enrichVoiceResult = async (
  result: any,
  originalText: string,
  tenantId: any,
  farmers: any[],
  products: any[],
  rateCharts: any[]
) => {
  if (!result || !result.actionType) return result;

  // 1. MILK_ENTRY Post-processing & Accurate Rate Calculation
  if (result.actionType === 'MILK_ENTRY') {
    const rawData = result.data || {};
    
    // Find matching farmer
    let matchedFarmer: any = null;
    const searchNameOrCode = (rawData.farmerName || rawData.farmerId || '').toString().toLowerCase().trim();
    
    // Try exact ID match first
    matchedFarmer = farmers.find(f => String(f._id) === rawData.farmerId || f.farmerId === rawData.farmerId);
    
    // Try Name / Substring / Code Digits match (e.g. "A1", "Farmer 1", "F-0001", "Umrao Singh")
    if (!matchedFarmer && searchNameOrCode) {
      const codeDigits = searchNameOrCode.replace(/\D/g, '');
      matchedFarmer = farmers.find(f => {
        const fn = f.name.toLowerCase();
        const fid = f.farmerId.toLowerCase();
        if (fid === searchNameOrCode || fn.includes(searchNameOrCode) || searchNameOrCode.includes(fn)) return true;
        if (codeDigits) {
          const fDigits = fid.replace(/\D/g, '');
          if (fDigits && parseInt(fDigits, 10) === parseInt(codeDigits, 10)) return true;
        }
        return false;
      });
    }
    
    // If still not matched, try searching text for any farmer name or farmer ID digits from DB
    if (!matchedFarmer) {
      const lowerText = originalText.toLowerCase();
      const textDigitsMatch = lowerText.match(/(?:farmer|code|kisan|किसान|कोड|a|f)?\s*(\d+)/i);
      const textDigits = textDigitsMatch ? textDigitsMatch[1] : null;

      for (const f of farmers) {
        if (lowerText.includes(f.name.toLowerCase()) || lowerText.includes(f.farmerId.toLowerCase())) {
          matchedFarmer = f;
          break;
        }
        if (textDigits) {
          const fDigits = f.farmerId.replace(/\D/g, '');
          if (fDigits && parseInt(fDigits, 10) === parseInt(textDigits, 10)) {
            matchedFarmer = f;
            break;
          }
        }
      }
    }

    let farmerDisplayName = matchedFarmer 
      ? `${matchedFarmer.name} (${matchedFarmer.farmerId})` 
      : (rawData.farmerName || (rawData.farmerId && !rawData.farmerId.startsWith('F-') ? rawData.farmerId : 'Umrao Singh'));
    let farmerName = matchedFarmer ? matchedFarmer.name : (rawData.farmerName || (rawData.farmerId && !rawData.farmerId.startsWith('F-') ? rawData.farmerId : 'Umrao Singh'));
    let farmerCode = matchedFarmer ? matchedFarmer.farmerId : (rawData.farmerCode || '');
    let farmerId = matchedFarmer ? matchedFarmer._id : undefined;

    let quantity = parseFloat(rawData.quantity) || 10.0;
    let fat = parseFloat(rawData.fat) || 5.0;
    if (fat >= 30 && fat <= 120) {
      fat = Math.round((fat / 10) * 10) / 10;
    }

    let milkType = rawData.milkType || 'Buffalo';
    const lowerText = originalText.toLowerCase();
    if (lowerText.includes('cow') || lowerText.includes('गाय') || lowerText.includes('gay')) {
      milkType = 'Cow';
    } else if (lowerText.includes('buffalo') || lowerText.includes('भैंस') || lowerText.includes('bhains')) {
      milkType = 'Buffalo';
    } else if (lowerText.includes('mix') || lowerText.includes('मिक्स')) {
      milkType = 'Mixed';
    }

    // Rate Calculation from Farmer Fat Rate or Rate Chart
    let calculatedRate = 42.0;
    if (matchedFarmer && matchedFarmer.fatRate && matchedFarmer.fatRate > 0) {
      calculatedRate = Math.round(fat * matchedFarmer.fatRate * 100) / 100;
    } else if (rateCharts.length > 0) {
      const chart = rateCharts[0];
      const rules = milkType === 'Cow' ? chart.cowRules : milkType === 'Mixed' ? chart.mixedRules : chart.buffaloRules;
      const matchedRule = rules.find((r: any) => Math.abs(r.fat - fat) < 0.1);
      if (matchedRule) {
        calculatedRate = matchedRule.rate;
      } else if (rules.length > 0) {
        const sorted = [...rules].sort((a, b) => a.fat - b.fat);
        const closest = sorted.reduce((prev, curr) => Math.abs(curr.fat - fat) < Math.abs(prev.fat - fat) ? curr : prev, sorted[0]);
        if (closest && closest.rate) {
          const ratePerFat = closest.rate / closest.fat;
          calculatedRate = Math.round(fat * (ratePerFat || 8.0) * 100) / 100;
        } else {
          calculatedRate = Math.round(fat * 8.0 * 100) / 100;
        }
      } else {
        calculatedRate = Math.round(fat * 8.0 * 100) / 100;
      }
    } else {
      calculatedRate = Math.round(fat * 8.0 * 100) / 100;
    }

    if (calculatedRate <= 0) calculatedRate = Math.round(fat * 8.0 * 100) / 100;
    const totalAmount = Math.round(quantity * calculatedRate * 100) / 100;

    result.data = {
      farmerId,
      farmerName,
      farmerCode,
      quantity,
      fat,
      snf: rawData.snf || (milkType === 'Cow' ? 8.5 : 9.0),
      rate: calculatedRate,
      totalAmount,
      shift: rawData.shift || (new Date().getHours() < 14 ? 'Morning' : 'Evening'),
      milkType,
      date: new Date().toISOString().split('T')[0],
      notes: rawData.notes || `Voice Entry: "${originalText}"`
    };

    result.previewTitle = `Milk Entry (दूध संकलन): ${farmerName} (${quantity}L, ${fat}% FAT)`;
    result.previewDetails = {
      'किसान (Farmer)': farmerDisplayName,
      'दूध मात्रा (Qty)': `${quantity} Litres`,
      'फैट (FAT)': `${fat}%`,
      'प्रकार (Type)': milkType === 'Cow' ? 'गाय (Cow)' : milkType === 'Buffalo' ? 'भैंस (Buffalo)' : 'मिक्स (Mixed)',
      'शिफ्ट (Shift)': result.data.shift === 'Evening' ? 'शाम (Evening)' : 'सुबह (Morning)',
      'भाव / दर (Rate)': `₹${calculatedRate}/L`,
      'कुल राशि (Total Amount)': `₹${totalAmount.toLocaleString('en-IN')}`
    };
    result.audioResponse = `${farmerName} का ${quantity} लीटर दूध ${fat} फैट के हिसाब से ₹${calculatedRate} के भाव से कुल ₹${totalAmount} दर्ज करने के लिए कन्फर्म करें।`;
  }

  // 2. PRODUCT_SALE Post-processing
  else if (result.actionType === 'PRODUCT_SALE') {
    const rawData = result.data || {};
    let matchedProduct = products.find(p => String(p._id) === rawData.productId);
    if (!matchedProduct && rawData.productName) {
      const pName = rawData.productName.toLowerCase();
      matchedProduct = products.find(p => p.name.toLowerCase().includes(pName) || pName.includes(p.name.toLowerCase()) || p.category.toLowerCase().includes(pName));
    }

    const prodName = matchedProduct ? matchedProduct.name : (rawData.productName || 'Product');
    const sellPrice = matchedProduct ? matchedProduct.sellingPrice : (parseFloat(rawData.rate) || 100);
    const qty = parseFloat(rawData.quantity) || 1;
    const totalAmt = Math.round(qty * sellPrice * 100) / 100;
    const unit = matchedProduct ? matchedProduct.unit : (rawData.unit || 'KG');

    result.data = {
      productId: matchedProduct?._id,
      productName: prodName,
      quantity: qty,
      unit,
      rate: sellPrice,
      totalAmount: totalAmt,
      notes: `Voice Sale: "${originalText}"`
    };

    result.previewTitle = `Counter Sale (बिक्री): ${prodName}`;
    result.previewDetails = {
      'Product (सामान)': prodName,
      'Quantity (मात्रा)': `${qty} ${unit}`,
      'Rate (दर)': `₹${sellPrice}/${unit}`,
      'Total Amount (कुल राशि)': `₹${totalAmt.toLocaleString('en-IN')}`
    };
    result.audioResponse = `${prodName} की ${qty} ${unit} बिक्री ₹${totalAmt} में दर्ज करने के लिए कन्फर्म करें।`;
  }

  // 3. REGISTER_FARMER Post-processing
  else if (result.actionType === 'REGISTER_FARMER') {
    if (!result.data.farmerId || result.data.farmerId.includes('0000')) {
      const totalFarmers = await Farmer.countDocuments({ tenantId });
      result.data.farmerId = `F-${String(totalFarmers + 1).padStart(4, '0')}`;
    }
  }

  // 4. DELETE_MILK_ENTRY Post-processing (दूध एंट्री डिलीट करना)
  else if (result.actionType === 'DELETE_MILK_ENTRY') {
    const rawData = result.data || {};
    let matchedFarmer: any = null;

    if (rawData.farmerId) {
      matchedFarmer = farmers.find(
        (f) => String(f._id) === String(rawData.farmerId) || f.farmerId === rawData.farmerId
      );
    }

    if (!matchedFarmer) {
      const searchName = (rawData.farmerName || originalText).toLowerCase();
      matchedFarmer = farmers.find((f) => {
        const fn = f.name.toLowerCase();
        return searchName.includes(fn) || fn.split(' ').some((part: string) => part.length > 2 && searchName.includes(part));
      });
    }

    if (matchedFarmer) {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      const queryFilter: any = {
        tenantId,
        farmer: matchedFarmer._id,
        date: { $gte: startOfDay, $lte: endOfDay }
      };

      let existingEntry = await MilkCollection.findOne(queryFilter).sort({ createdAt: -1 });
      if (!existingEntry) {
        existingEntry = await MilkCollection.findOne({ tenantId, farmer: matchedFarmer._id }).sort({ date: -1, createdAt: -1 });
      }

      if (existingEntry) {
        result.data = {
          collectionId: String(existingEntry._id),
          farmerId: String(matchedFarmer._id),
          farmerName: matchedFarmer.name,
          farmerCode: matchedFarmer.farmerId,
          quantity: existingEntry.quantity,
          fat: existingEntry.fat,
          rate: existingEntry.rate,
          totalAmount: existingEntry.amount,
          shift: existingEntry.shift,
          milkType: existingEntry.milkType,
          date: existingEntry.date.toISOString().split('T')[0]
        };

        result.previewTitle = `दूध एंट्री हटाएं (Delete Milk Entry): ${matchedFarmer.name}`;
        result.previewDetails = {
          'किसान (Farmer)': `${matchedFarmer.name} (${matchedFarmer.farmerId})`,
          'दूध मात्रा (Qty)': `${existingEntry.quantity} Litres`,
          'फैट (FAT)': `${existingEntry.fat}%`,
          'भाव (Rate)': `₹${existingEntry.rate}/L`,
          'कुल राशि (Amount)': `₹${existingEntry.amount}`,
          'शिफ्ट (Shift)': existingEntry.shift === 'Morning' ? 'सुबह (Morning)' : 'शाम (Evening)'
        };
        result.audioResponse = `${matchedFarmer.name} की ${existingEntry.quantity} लीटर दूध की एंट्री (₹${existingEntry.amount}) हटाने के लिए पुष्टि करें।`;
      } else {
        result.data = {
          farmerId: String(matchedFarmer._id),
          farmerName: matchedFarmer.name,
          farmerCode: matchedFarmer.farmerId
        };
        result.previewTitle = `दूध एंट्री हटाएं: ${matchedFarmer.name}`;
        result.previewDetails = {
          'किसान (Farmer)': `${matchedFarmer.name} (${matchedFarmer.farmerId})`,
          'स्थिति (Status)': 'कोई दूध एंट्री नहीं मिली'
        };
        result.audioResponse = `${matchedFarmer.name} की आज की कोई दूध एंट्री नहीं मिली।`;
      }
    }
  }

  // 5. AI_QUERY Post-processing (Real-time live database summaries with dynamic dates & flexible colloquial understanding)
  else if (result.actionType === 'AI_QUERY') {
    const lowerText = originalText.toLowerCase();
    const rawData = result.data || {};

    // Dynamic Date Range Calculation (आज, कल, परसों, पिछले 7 दिन, इस महीने आदि)
    let start = new Date();
    let end = new Date();
    let dateLabel = 'आज (Today)';

    if (rawData.startDate && rawData.endDate) {
      start = new Date(rawData.startDate);
      end = new Date(rawData.endDate);
      dateLabel = rawData.startDate === rawData.endDate ? rawData.startDate : `${rawData.startDate} से ${rawData.endDate}`;
    } else if (lowerText.includes('kal') || lowerText.includes('कल') || lowerText.includes('yesterday') || lowerText.includes('beete kal')) {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      dateLabel = 'कल (Yesterday)';
    } else if (lowerText.includes('parson') || lowerText.includes('परसों')) {
      start.setDate(start.getDate() - 2);
      end.setDate(end.getDate() - 2);
      dateLabel = 'परसों (2 Days Ago)';
    } else if (lowerText.includes('7 din') || lowerText.includes('7 days') || lowerText.includes('hafte') || lowerText.includes('हफ्ते') || lowerText.includes('सप्ताह')) {
      start.setDate(start.getDate() - 7);
      dateLabel = 'पिछले 7 दिन (Last 7 Days)';
    } else if (lowerText.includes('15 din') || lowerText.includes('15 days') || lowerText.includes('पंद्रह')) {
      start.setDate(start.getDate() - 15);
      dateLabel = 'पिछले 15 दिन (Last 15 Days)';
    } else if (lowerText.includes('is mahine') || lowerText.includes('this month') || lowerText.includes('महीने')) {
      start = new Date(start.getFullYear(), start.getMonth(), 1);
      dateLabel = 'इस महीने (This Month)';
    } else if (lowerText.includes('pichle mahine') || lowerText.includes('last month')) {
      start = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      end = new Date(end.getFullYear(), end.getMonth(), 0);
      dateLabel = 'पिछले महीने (Last Month)';
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Check if query is solely about Milk
    const isMilkOnly =
      (rawData.queryType === 'MILK' ||
        lowerText.includes('doodh') ||
        lowerText.includes('milk') ||
        lowerText.includes('दूध') ||
        lowerText.includes('लीटर') ||
        lowerText.includes('आवक') ||
        (lowerText.includes('kitna') && (lowerText.includes('aaya') || lowerText.includes('आया')))) &&
      !lowerText.includes('galla') &&
      !lowerText.includes('गल्ला') &&
      !lowerText.includes('गला') &&
      !lowerText.includes('cash') &&
      !lowerText.includes('नकद') &&
      !lowerText.includes('kya hua') &&
      !lowerText.includes('kya kya hua');

    if (isMilkOnly) {
      const collections = await MilkCollection.find({
        tenantId,
        date: { $gte: start, $lte: end }
      });

      const totalQty = collections.reduce((acc, c) => acc + (c.quantity || 0), 0);
      const totalAmt = collections.reduce((acc, c) => acc + (c.amount || 0), 0);
      const weightedFatSum = collections.reduce((acc, c) => acc + (c.quantity || 0) * (c.fat || 0), 0);
      const avgFat = totalQty > 0 ? (weightedFatSum / totalQty).toFixed(1) : '0.0';
      const count = collections.length;

      result.previewTitle = `📊 ${dateLabel} का दूध संकलन`;
      result.previewDetails = {
        'अवधि (Period)': dateLabel,
        'कुल दूध (Total Milk)': `${totalQty.toFixed(1)} Litres`,
        'औसत फैट (Avg FAT)': `${avgFat}%`,
        'कुल मूल्य (Total Cost)': `₹${Math.round(totalAmt).toLocaleString('en-IN')}`,
        'पर्चियां (Total Entries)': `${count} किसानों से`
      };
      result.path = `/milk?startDate=${startStr}&endDate=${endStr}`;
      result.audioResponse = `${dateLabel} कुल ${totalQty.toFixed(1)} लीटर दूध का संकलन हुआ है, जिसकी कुल राशि ₹${Math.round(totalAmt)} है।`;
    } else {
      // Galla & Overall Day Summary (गल्ला, हिसाब, क्या बैठा, क्या हुआ)
      const [transactions, collections] = await Promise.all([
        CashTransaction.find({
          tenantId,
          date: { $gte: start, $lte: end }
        }),
        MilkCollection.find({
          tenantId,
          date: { $gte: start, $lte: end }
        })
      ]);

      const totalIn = transactions.filter((t) => t.amount > 0).reduce((a, b) => a + b.amount, 0);
      const totalOut = transactions.filter((t) => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
      const netCash = totalIn - totalOut;

      const totalMilkQty = collections.reduce((acc, c) => acc + (c.quantity || 0), 0);
      const totalMilkCost = collections.reduce((acc, c) => acc + (c.amount || 0), 0);

      result.previewTitle = `💰 ${dateLabel} का गल्ला हिसाब`;
      result.previewDetails = {
        'अवधि (Period)': dateLabel,
        'कुल आमदनी (Cash In)': `₹${totalIn.toLocaleString('en-IN')}`,
        'कुल ख़र्च (Cash Out)': `₹${totalOut.toLocaleString('en-IN')}`,
        'शुद्ध नकद (Net Cash)': `₹${netCash.toLocaleString('en-IN')}`,
        'दूध संकलन (Milk)': `${totalMilkQty.toFixed(1)}L (₹${Math.round(totalMilkCost).toLocaleString('en-IN')})`
      };
      result.path = `/galla?startDate=${startStr}&endDate=${endStr}`;
      result.audioResponse = `${dateLabel} गल्ले में कुल आमदनी ₹${totalIn} और ख़र्च ₹${totalOut} हुआ है। गल्ले में शुद्ध नकद ₹${netCash} बैठा है।`;
    }
  }

  // 6. MILK_BANDHI_UPDATE (दैनिक दूध बांधी व नागा वितरण)
  else if (result.actionType === 'MILK_BANDHI_UPDATE') {
    await ensureSampleBandhis(tenantId);
    const rawData = result.data || {};
    const shift = rawData.shift || (new Date().getHours() < 14 ? 'Morning' : 'Evening');
    const skippedNos: number[] = Array.isArray(rawData.skippedBandhiNos)
      ? rawData.skippedBandhiNos.map((n: any) => Number(n)).filter((n: any) => !isNaN(n))
      : [];

    const activeBandhis = await MilkBandhi.find({
      tenantId,
      status: 'Active',
      $or: [{ shift }, { shift: 'Both' }]
    }).sort({ bandhiNo: 1 });

    const deliveredBandhis = activeBandhis.filter(b => !skippedNos.includes(b.bandhiNo));
    const skippedBandhis = activeBandhis.filter(b => skippedNos.includes(b.bandhiNo));

    const totalLitres = Math.round(deliveredBandhis.reduce((sum, b) => sum + b.dailyQuantity, 0) * 100) / 100;
    const totalEstAmount = Math.round(deliveredBandhis.reduce((sum, b) => sum + (b.dailyQuantity * b.rate), 0) * 100) / 100;

    result.data = {
      ...rawData,
      shift,
      date: rawData.date || new Date().toISOString().split('T')[0],
      skippedBandhiNos: skippedNos,
      deliveredCount: deliveredBandhis.length,
      skippedCount: skippedBandhis.length,
      totalLitres,
      totalEstAmount,
      markAllOthersDelivered: rawData.markAllOthersDelivered !== false
    };

    result.path = '/bandhi';
    result.previewTitle = `दूध बांधी वितरण (${shift === 'Morning' ? 'सुबह' : 'शाम'} शिफ्ट)`;
    result.previewDetails = {
      'नागा बांधी (Skipped)': skippedNos.length > 0 ? `बांधी नं. ${skippedNos.join(', ')} (${skippedBandhis.length} घर)` : 'कोई नागा नहीं (0)',
      'वितरित बांधी (Delivered)': `${deliveredBandhis.length} घर`,
      'कुल दूध (Total Milk)': `${totalLitres} Litres`,
      'अनुमानित राशि (Total Amt)': `₹${totalEstAmount.toLocaleString('en-IN')}`,
      'असर (Stock Impact)': `कच्चा दूध स्टॉक से ${totalLitres}L घटेगा व ग्राहक खाता डेबिट होगा`
    };

    if (skippedNos.length > 0) {
      result.audioResponse = `बांधी नंबर ${skippedNos.join(', ')} की नागा दर्ज करके बाकी ${deliveredBandhis.length} घरों में ${totalLitres} लीटर दूध वितरण कन्फर्म करने के लिए पुष्टि करें।`;
    } else {
      result.audioResponse = `सभी ${deliveredBandhis.length} घरों में कुल ${totalLitres} लीटर दूध वितरण कन्फर्म करने के लिए पुष्टि करें।`;
    }
  }

  // 7. COLLECT_DUE_PAYMENT (उधारी जमा करना)
  else if (result.actionType === 'COLLECT_DUE_PAYMENT') {
    const rawData = result.data || {};
    let matchedCustomer = null;

    if (rawData.customerId) {
      matchedCustomer = await Customer.findOne({ _id: rawData.customerId, tenantId });
    }

    if (!matchedCustomer && rawData.bandhiNo) {
      const b = await MilkBandhi.findOne({ tenantId, bandhiNo: Number(rawData.bandhiNo) });
      if (b && b.customer) {
        matchedCustomer = await Customer.findOne({ _id: b.customer, tenantId });
      }
    }

    if (!matchedCustomer && rawData.customerName) {
      const searchName = rawData.customerName.toLowerCase().trim();
      matchedCustomer = await Customer.findOne({
        tenantId,
        $or: [
          { name: new RegExp(searchName, 'i') },
          { mobile: new RegExp(searchName, 'i') }
        ]
      });
    }

    const custName = matchedCustomer ? matchedCustomer.name : (rawData.customerName || 'Customer');
    const paymentAmt = parseFloat(rawData.amount) || 500;
    const currentOutstanding = matchedCustomer ? matchedCustomer.outstandingBalance : 0;
    const remainingBalance = Math.round(Math.max(0, currentOutstanding - paymentAmt) * 100) / 100;

    result.data = {
      customerId: matchedCustomer?._id,
      customerName: custName,
      bandhiNo: rawData.bandhiNo,
      amount: paymentAmt,
      paymentMode: rawData.paymentMode || 'Cash',
      currentOutstanding,
      remainingBalance,
      notes: rawData.notes || `Voice Udhar Collection: "${originalText}"`
    };

    result.path = '/udhari';
    result.previewTitle = `उधारी भुगतान जमा: ${custName}`;
    result.previewDetails = {
      'ग्राहक (Customer)': custName,
      'जमा राशि (Amount)': `₹${paymentAmt.toLocaleString('en-IN')}`,
      'वर्तमान बकाया (Current Due)': `₹${currentOutstanding.toLocaleString('en-IN')}`,
      'जमा के बाद शेष (New Due)': `₹${remainingBalance.toLocaleString('en-IN')}`,
      'माध्यम (Payment Mode)': rawData.paymentMode || 'Cash (Galla)'
    };
    result.audioResponse = `${custName} के खाते में ₹${paymentAmt} उधारी जमा करने के लिए कन्फर्म करें।`;
  }

  // 8. DUE_PAYMENTS_QUERY (उधारी की जानकारी / किस-किस का बकाया है)
  else if (result.actionType === 'DUE_PAYMENTS_QUERY') {
    const debtors = await Customer.find({ tenantId, outstandingBalance: { $gt: 0 } }).sort({ outstandingBalance: -1 });
    const totalDue = Math.round(debtors.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0) * 100) / 100;
    const totalDebtors = debtors.length;
    const top3 = debtors.slice(0, 3).map(c => `${c.name}: ₹${c.outstandingBalance}`).join(', ');

    result.path = '/udhari';
    result.previewTitle = `📊 बाजार उधारी खाता सारांश`;
    result.previewDetails = {
      'कुल बाजार उधारी (Total Due)': `₹${totalDue.toLocaleString('en-IN')}`,
      'बकाया ग्राहक संख्या': `${totalDebtors} ग्राहक`,
      'शीर्ष बकाया': top3 || 'कोई बकाया नहीं',
      'एक्शन': 'उधारी रजिस्टर खोला जा रहा है'
    };
    result.audioResponse = `वर्तमान में कुल ${totalDebtors} ग्राहकों पर ₹${totalDue} रुपये की उधारी बकाया है। उधारी पेज खोला जा रहा है।`;
  }

  // 9. NAVIGATE Path Normalization
  else if (result.actionType === 'NAVIGATE') {
    if (result.path) {
      if (result.path.startsWith('/milk-collection')) {
        result.path = result.path.replace('/milk-collection', '/milk');
      } else if (result.path.startsWith('/close-day')) {
        result.path = result.path.replace('/close-day', '/closeday');
      }
    }
  }

  return result;
};

export const parseVoiceCommand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { transcript } = req.body;
    const tenantId = (req as any).tenantId;

    if (!transcript || typeof transcript !== 'string') {
      res.status(400).json({ message: 'Transcript text is required.' });
      return;
    }

    const text = transcript.trim().toLowerCase();
    const originalText = transcript.trim();

    // Fetch master records
    const [farmers, products, rateCharts, tenant] = await Promise.all([
      Farmer.find({ tenantId, status: 'Active' }),
      Product.find({ tenantId, status: 'Active' }),
      MilkRateChart.find({ tenantId }),
      Tenant.findById(tenantId)
    ]);

    // =========================================================================
    // 0. GOOGLE GEMINI AI ENGINE (First Priority when configured)
    // =========================================================================
    const geminiResult = await parseVoiceWithGemini(originalText, {
      farmers: farmers.map(f => ({
        _id: String(f._id),
        farmerId: f.farmerId,
        name: f.name,
        mobile: f.mobile,
        village: f.village,
        fatRate: f.fatRate
      })),
      products: products.map(p => ({
        _id: String(p._id),
        name: p.name,
        category: p.category,
        sellingPrice: p.sellingPrice,
        unit: p.unit
      })),
      rateCharts,
      todayStr: new Date().toISOString().split('T')[0],
      tenantName: tenant?.name,
      customApiKey: tenant?.geminiApiKey
    });

    if (geminiResult && geminiResult.actionType && geminiResult.actionType !== 'UNKNOWN') {
      // Enrich Gemini Result with Database Farmer / Pricing / Rate Calculations
      const enrichedResult = await enrichVoiceResult(geminiResult, originalText, tenantId, farmers, products, rateCharts);
      res.json(enrichedResult);
      return;
    }

    // =========================================================================
    // 0.5 DELETE MILK ENTRY (दूध एंट्री डिलीट)
    // =========================================================================
    const isDeleteEntry = text.includes('delete') || text.includes('hata do') || text.includes('cancel') ||
                          text.includes('हटा') || text.includes('डिलीट') || text.includes('कैंसिल');
    if (isDeleteEntry) {
      const deleteResult = {
        actionType: 'DELETE_MILK_ENTRY',
        data: {
          farmerName: originalText
        },
        transcript: originalText,
        isAIPowered: false
      };
      const enrichedDelete = await enrichVoiceResult(deleteResult, originalText, tenantId, farmers, products, rateCharts);
      res.json(enrichedDelete);
      return;
    }

    // =========================================================================
    // 1. REGISTER NEW FARMER (नया किसान पंजीकरण)
    // =========================================================================
    // Triggers: "naya farmer jodo", "new farmer", "kisan register karo", "add farmer"
    const isNewFarmer = text.includes('naya farmer') || text.includes('new farmer') || 
                        text.includes('kisan register') || text.includes('farmer register') ||
                        text.includes('naya kisan') || text.includes('add farmer') ||
                        text.includes('kisan jodo') || text.includes('किसान जोड़ो') ||
                        text.includes('नया किसान') || text.includes('किसान रजिस्टर') ||
                        text.includes('नया फार्मर');

    if (isNewFarmer) {
      // Extract Farmer Name
      let extractedName = 'New Farmer';
      const nameMatch = text.match(/(?:naam|name|नाम)\s*([a-zA-Z\u0900-\u097F\s]+?)(?:mobile|phone|gaon|village|मोबाइल|गांव|$)/i) ||
                        text.match(/(?:farmer|kisan|किसान|फार्मर)\s*([a-zA-Z\u0900-\u097F\s]+?)(?:mobile|phone|gaon|village|मोबाइल|गांव|ko|को|$)/i);
      if (nameMatch && nameMatch[1].trim()) {
        const cleaned = nameMatch[1].replace(/(?:jodo|add|register|karo|banao|naya|new|नया|जोड़ो|बनाओ)/gi, '').trim();
        if (cleaned.length > 1) {
          extractedName = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
      }

      // Extract Mobile Number (10 digits)
      let extractedMobile = '';
      const mobileMatch = text.match(/\b([6-9]\d{9})\b/) || text.match(/(?:mobile|phone|नंबर|मोबाइल)\s*(\d+)/i);
      if (mobileMatch) {
        extractedMobile = mobileMatch[1];
      } else {
        extractedMobile = '98' + Math.floor(10000000 + Math.random() * 90000000);
      }

      // Extract Village / Gaon
      let extractedVillage = 'Village';
      const villageMatch = text.match(/(?:gaon|village|gram|शहर|गांव|ग्राम)\s*([a-zA-Z\u0900-\u097F\s]+?)(?:mobile|phone|advance|opening|$)/i);
      if (villageMatch && villageMatch[1].trim()) {
        extractedVillage = villageMatch[1].trim();
      }

      // Generate next farmerId
      const totalFarmers = await Farmer.countDocuments({ tenantId: req.tenantId });
      const nextId = `F-${String(totalFarmers + 1).padStart(4, '0')}`;

      res.json({
        actionType: 'REGISTER_FARMER',
        previewTitle: `Register New Farmer (नया किसान पंजीकरण): ${extractedName}`,
        data: {
          farmerId: nextId,
          name: extractedName,
          mobile: extractedMobile,
          village: extractedVillage,
          status: 'Active',
          notes: `Voice Registered: "${originalText}"`
        },
        previewDetails: {
          'Farmer Name (किसान का नाम)': extractedName,
          'Farmer Code (कोड)': nextId,
          'Mobile (मोबाइल)': extractedMobile,
          'Village (गांव)': extractedVillage,
          'Status': 'Active (सक्रिय)'
        },
        audioResponse: `नया किसान ${extractedName} कोड ${nextId} के साथ रजिस्टर करने के लिए कन्फर्म करें।`,
        transcript: originalText
      });
      return;
    }

    // =========================================================================
    // 2. CREATE NEW PRODUCT / MENU ITEM (नया सामान/प्रोडक्ट जोड़ना)
    // =========================================================================
    // Triggers: "naya product", "new item", "add product", "naya menu item"
    const isNewProduct = text.includes('naya product') || text.includes('new product') ||
                         text.includes('add product') || text.includes('item add') ||
                         text.includes('naya item') || text.includes('नया सामान') ||
                         text.includes('नया प्रोडक्ट') || text.includes('आइटम जोड़ो');

    if (isNewProduct) {
      let prodName = 'New Item';
      const nameMatch = text.match(/(?:product|item|सामान|आइटम)\s*([a-zA-Z\u0900-\u097F\s]+?)(?:rate|price|selling|rupaye|rs|रुपये|$)/i);
      if (nameMatch && nameMatch[1].trim()) {
        prodName = nameMatch[1].replace(/(?:jodo|add|dalo|karo|banao|naya|new)/gi, '').trim();
      }

      const priceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:rupaye|rs|rupees|रुपये|रुपए|rate|price)/i) || text.match(/(\d+(?:\.\d+)?)/);
      const sellPrice = priceMatch ? parseFloat(priceMatch[1]) : 100;

      let category = 'Other';
      let unit = 'KG';
      const lowerProd = prodName.toLowerCase();
      if (lowerProd.includes('ghee') || lowerProd.includes('घी')) { category = 'Ghee'; unit = 'KG'; }
      else if (lowerProd.includes('paneer') || lowerProd.includes('पनीर')) { category = 'Paneer'; unit = 'KG'; }
      else if (lowerProd.includes('dahi') || lowerProd.includes('curd') || lowerProd.includes('दही')) { category = 'Curd'; unit = 'KG'; }
      else if (lowerProd.includes('lassi') || lowerProd.includes('milk') || lowerProd.includes('दूध') || lowerProd.includes('लस्सी')) { category = 'Milk'; unit = 'Litre'; }
      else if (lowerProd.includes('butter') || lowerProd.includes('makkhan') || lowerProd.includes('मक्खन')) { category = 'Butter'; unit = 'KG'; }
      else if (lowerProd.includes('cream') || lowerProd.includes('malai') || lowerProd.includes('मलाई')) { category = 'Cream'; unit = 'KG'; }

      res.json({
        actionType: 'CREATE_PRODUCT',
        previewTitle: `Add New Product (नया सामान जोड़ें): ${prodName}`,
        data: {
          name: prodName,
          category,
          unit,
          sellingPrice: sellPrice,
          costPrice: Math.round(sellPrice * 0.75),
          stockQty: 10
        },
        previewDetails: {
          'Product Name (सामान)': prodName,
          'Category (श्रेणी)': category,
          'Selling Price (सेलिंग रेट)': `₹${sellPrice}/${unit}`,
          'Unit (इकाई)': unit
        },
        audioResponse: `${prodName} को ₹${sellPrice} प्रति ${unit} रेट पर मेनू में जोड़ने के लिए कन्फर्म करें।`,
        transcript: originalText
      });
      return;
    }

    // =========================================================================
    // 3. DIRECT BULK MILK SALE (थोक व सीधी दूध बिक्री)
    // =========================================================================
    // Triggers: "super doodh 10 litre sell", "direct sale", "regular doodh bika"
    if (text.includes('super doodh') || text.includes('super milk') || text.includes('regular doodh') || text.includes('direct milk') || text.includes('direct sale') || text.includes('सीधी दूध बिक्री') || text.includes('थोक दूध')) {
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:litre|ltr|l|लीटर)/i) || text.match(/(\d+(?:\.\d+)?)/);
      const milkQty = qtyMatch ? parseFloat(qtyMatch[1]) : 10;

      let rate = 60;
      let milkTypeCategory = 'regularMilk';
      if (text.includes('super') || text.includes('सुपर')) {
        rate = 68;
        milkTypeCategory = 'superMilk';
      } else if (text.includes('cow') || text.includes('गाय')) {
        rate = 55;
        milkTypeCategory = 'cowMilk';
      }

      const totalAmt = Math.round(milkQty * rate * 100) / 100;

      res.json({
        actionType: 'DIRECT_MILK_SALE',
        previewTitle: `Direct Bulk Milk Sale (सीधी दूध बिक्री): ${milkQty}L`,
        data: {
          [milkTypeCategory]: { quantity: milkQty, rate, amount: totalAmt },
          totalQuantity: milkQty,
          totalAmount: totalAmt,
          shift: text.includes('evening') || text.includes('शाम') ? 'Evening' : 'Morning',
          paymentMode: 'Cash',
          notes: `Voice Direct Sale: "${originalText}"`
        },
        previewDetails: {
          'Type (प्रकार)': milkTypeCategory === 'superMilk' ? 'Super Milk (6+ FAT)' : 'Regular Milk (5+ FAT)',
          'Quantity (मात्रा)': `${milkQty} Litres`,
          'Rate (भाव)': `₹${rate}/L`,
          'Total Amount (कुल राशि)': `₹${totalAmt.toLocaleString('en-IN')}`,
          'Payment Mode': 'Cash (Galla)'
        },
        audioResponse: `${milkQty} लीटर दूध ₹${rate} के भाव से कुल ₹${totalAmt} में सीधी बिक्री दर्ज करने के लिए कन्फर्म करें।`,
        transcript: originalText
      });
      return;
    }

    // =========================================================================
    // 4. FARMER PAYMENT / SETTLEMENT (किसान भुगतान / हिसाब)
    // =========================================================================
    if ((text.includes('payment') || text.includes('भुगतान') || text.includes('hisaab diya') || text.includes('paise diye')) && !text.includes('advance')) {
      let matchedFarmer = null;
      for (const f of farmers) {
        if (text.includes(f.name.toLowerCase()) || text.includes(`code ${f.farmerId}`) || text.includes(`farmer ${f.farmerId}`)) {
          matchedFarmer = f;
          break;
        }
      }

      if (!matchedFarmer && farmers.length > 0) {
        const codeMatch = text.match(/(?:farmer|code|kisan|किसान|कोड)\s*(\d+)/i) || text.match(/(\d+)\s*(?:ko|को)/i);
        if (codeMatch) {
          const codeStr = codeMatch[1];
          matchedFarmer = farmers.find(f => f.farmerId.includes(codeStr) || f.farmerId === `F-${codeStr.padStart(4, '0')}`);
        }
      }

      const amtMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:rupaye|rs|rupees|रुपये|रुपए)/i) || text.match(/(\d+(?:\.\d+)?)/);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : 0;

      if (matchedFarmer && amount > 0) {
        res.json({
          actionType: 'FARMER_PAYMENT',
          previewTitle: `Farmer Payment (किसान भुगतान): ${matchedFarmer.name}`,
          data: {
            farmerId: matchedFarmer._id,
            farmerName: matchedFarmer.name,
            farmerCode: matchedFarmer.farmerId,
            amount,
            paymentMode: 'Cash',
            notes: `Voice Payment: "${originalText}"`
          },
          previewDetails: {
            'Farmer (किसान)': `${matchedFarmer.name} (${matchedFarmer.farmerId})`,
            'Payment Amount (भुगतान राशि)': `₹${amount.toLocaleString('en-IN')}`,
            'Action': 'Deduct from Galla & Update Farmer Balance'
          },
          audioResponse: `${matchedFarmer.name} को ₹${amount} रुपये भुगतान दर्ज करने के लिए कन्फर्म करें।`,
          transcript: originalText
        });
        return;
      }
    }

    // =========================================================================
    // 5. FARMER ADVANCE / UDHAR (किसान अग्रिम)
    // =========================================================================
    if (text.includes('advance') || text.includes('एडवांस') || text.includes('udhar') || text.includes('उधार')) {
      let matchedFarmer = null;
      for (const f of farmers) {
        if (text.includes(f.name.toLowerCase()) || text.includes(`code ${f.farmerId}`) || text.includes(`farmer ${f.farmerId}`) || text.includes(`किसान ${f.farmerId}`)) {
          matchedFarmer = f;
          break;
        }
      }

      if (!matchedFarmer && farmers.length > 0) {
        const codeMatch = text.match(/(?:farmer|code|kisan|किसान|कोड)\s*(\d+)/i) || text.match(/(\d+)\s*(?:ko|को)/i);
        if (codeMatch) {
          const codeStr = codeMatch[1];
          matchedFarmer = farmers.find(f => f.farmerId.includes(codeStr) || f.farmerId === `F-${codeStr.padStart(4, '0')}`);
        }
      }

      const amtMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:rupaye|rs|rupees|रुपये|रुपए)/i) || text.match(/(?:advance|एडवांस)\s*(\d+(?:\.\d+)?)/i);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : 0;

      if (matchedFarmer && amount > 0) {
        res.json({
          actionType: 'FARMER_ADVANCE',
          previewTitle: `Farmer Advance (किसान अग्रिम): ${matchedFarmer.name}`,
          data: {
            farmerId: matchedFarmer._id,
            farmerName: matchedFarmer.name,
            farmerCode: matchedFarmer.farmerId,
            amount,
            notes: `Voice Advance: "${originalText}"`
          },
          previewDetails: {
            'Farmer (किसान)': `${matchedFarmer.name} (${matchedFarmer.farmerId})`,
            'Advance Amount (अग्रिम राशि)': `₹${amount.toLocaleString('en-IN')}`,
            'Action': 'Deduct from Galla & Add to Farmer Ledger'
          },
          audioResponse: `${matchedFarmer.name} को ₹${amount} रुपये अग्रिम दर्ज करने के लिए कन्फर्म करें।`,
          transcript: originalText
        });
        return;
      }
    }

    // =========================================================================
    // 6. RECORD EXPENSE (दुकान का ख़र्च)
    // =========================================================================
    if (text.includes('kharch') || text.includes('kharcha') || text.includes('खर्च') || text.includes('expense')) {
      const amtMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:rupaye|rs|rupees|रुपये|रुपए|ka|का)/i) || text.match(/(\d+(?:\.\d+)?)/);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : 0;

      let title = 'General Expense';
      if (text.includes('chai') || text.includes('चाय') || text.includes('tea')) title = 'Chai / Tea';
      else if (text.includes('diesel') || text.includes('डीजल')) title = 'Diesel / Fuel';
      else if (text.includes('nasta') || text.includes('नाश्ता')) title = 'Snacks / Refreshment';
      else if (text.includes('bijli') || text.includes('बिजली')) title = 'Electricity';

      if (amount > 0) {
        res.json({
          actionType: 'EXPENSE',
          previewTitle: `Record Expense (ख़र्च): ${title}`,
          data: {
            title,
            amount,
            category: 'Miscellaneous',
            notes: `Voice Expense: "${originalText}"`
          },
          previewDetails: {
            'Expense Item (मद)': title,
            'Amount (राशि)': `₹${amount.toLocaleString('en-IN')}`,
            'Payment Mode': 'Cash (Galla)'
          },
          audioResponse: `${title} का ₹${amount} रुपये ख़र्च गल्ला में दर्ज करने के लिए कन्फर्म करें।`,
          transcript: originalText
        });
        return;
      }
    }

    // =========================================================================
    // 7. COUNTER PRODUCT SALE (दुकान पर घी, पनीर, दही की बिक्री)
    // =========================================================================
    let isProductSale = false;
    let matchedProduct = null;
    let saleQty = 0;

    for (const p of products) {
      if (text.includes(p.name.toLowerCase()) || text.includes(p.category.toLowerCase())) {
        matchedProduct = p;
        isProductSale = true;
        break;
      }
    }

    if (isProductSale && matchedProduct && !text.includes('fat') && !text.includes('फैट')) {
      const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kilo|kg|litre|ltr|l|packet|pkt|किलो|लीटर|पैकेट)?/i);
      saleQty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
      const totalAmt = Math.round(matchedProduct.sellingPrice * saleQty * 100) / 100;

      res.json({
        actionType: 'PRODUCT_SALE',
        previewTitle: `Counter Sale (बिक्री): ${matchedProduct.name}`,
        data: {
          productId: matchedProduct._id,
          productName: matchedProduct.name,
          quantity: saleQty,
          unit: matchedProduct.unit,
          rate: matchedProduct.sellingPrice,
          totalAmount: totalAmt,
          notes: `Voice Sale: "${originalText}"`
        },
        previewDetails: {
          'Product (सामान)': matchedProduct.name,
          'Quantity (मात्रा)': `${saleQty} ${matchedProduct.unit}`,
          'Rate (दर)': `₹${matchedProduct.sellingPrice}/${matchedProduct.unit}`,
          'Total Amount (कुल राशि)': `₹${totalAmt.toLocaleString('en-IN')}`
        },
        audioResponse: `${matchedProduct.name} की ${saleQty} ${matchedProduct.unit} बिक्री ₹${totalAmt} में दर्ज करने के लिए कन्फर्म करें।`,
        transcript: originalText
      });
      return;
    }

    // =========================================================================
    // 8. DATE & TIME AWARENESS (कल, आज, परसों, 7 दिन, 15 दिन, महीना, तारीख पहचान)
    // =========================================================================
    const today = new Date();
    let startDate = new Date(today);
    let endDate = new Date(today);
    let dateLabel = 'आज (Today)';
    let isPastDate = false;

    // Check 7 Days / Weekly range (7 din, last 7, pichle 7 din, hafte bhar)
    if (
      text.includes('7 din') || text.includes('7 days') || text.includes('last 7') || text.includes('pichle 7') ||
      text.includes('सात दिन') || text.includes('हफ्ता') || text.includes('hafta') || text.includes('hafte') || text.includes('week')
    ) {
      startDate.setDate(today.getDate() - 6);
      dateLabel = 'पिछले 7 दिन (Last 7 Days)';
      isPastDate = true;
    }
    // Check 15 Days range
    else if (
      text.includes('15 din') || text.includes('15 days') || text.includes('last 15') || text.includes('pichle 15') ||
      text.includes('पंद्रह दिन') || text.includes('fortnight')
    ) {
      startDate.setDate(today.getDate() - 14);
      dateLabel = 'पिछले 15 दिन (Last 15 Days)';
      isPastDate = true;
    }
    // Check 30 Days / Monthly range
    else if (
      text.includes('30 din') || text.includes('30 days') || text.includes('is mahine') || text.includes('this month') ||
      text.includes('इस महीने') || text.includes('mahine bhar') || text.includes('महीना')
    ) {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      dateLabel = 'इस महीने (This Month)';
      isPastDate = true;
    }
    else if (text.includes('pichle mahine') || text.includes('last month') || text.includes('पिछले महीने')) {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      dateLabel = 'पिछले महीने (Last Month)';
      isPastDate = true;
    }
    // Single Day: Kal / Yesterday
    else if (text.includes('kal') || text.includes('कल') || text.includes('yesterday') || text.includes('beete kal')) {
      startDate.setDate(today.getDate() - 1);
      endDate.setDate(today.getDate() - 1);
      dateLabel = 'कल (Yesterday)';
      isPastDate = true;
    }
    // Single Day: Parson
    else if (text.includes('parson') || text.includes('परसों')) {
      startDate.setDate(today.getDate() - 2);
      endDate.setDate(today.getDate() - 2);
      dateLabel = 'परसों (Day Before Yesterday)';
      isPastDate = true;
    }
    // Specific Date: e.g. "12 tarikh" or "tarikh 5"
    else if (text.includes('tarikh') || text.includes('तारीख') || text.includes('date')) {
      const dayMatch = text.match(/(\d{1,2})\s*(?:tarikh|tareekh|तारीख|ता)/i) || text.match(/(?:tarikh|तारीख)\s*(\d{1,2})/i);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (day >= 1 && day <= 31) {
          startDate = new Date(today.getFullYear(), today.getMonth(), day);
          endDate = new Date(today.getFullYear(), today.getMonth(), day);
          dateLabel = `${day} तारीख`;
          isPastDate = startDate < today;
        }
      }
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const startOfRange = new Date(startDateStr);
    startOfRange.setHours(0, 0, 0, 0);
    const endOfRange = new Date(endDateStr);
    endOfRange.setHours(23, 59, 59, 999);

    // =========================================================================
    // 9. FULL-APP VOICE NAVIGATION & STATUS QUERIES (सभी ऑप्शन्स की वॉयस सिफारिशें)
    // =========================================================================
    
    // 9A. Dashboard / Home / Hata do / Band karo
    if (
      text.includes('hata do') || text.includes('hatao') || text.includes('हटा दो') || text.includes('हटाओ') ||
      text.includes('band karo') || text.includes('बंद करो') || text.includes('close') ||
      text.includes('dashboard') || text.includes('डैशबोर्ड') || text.includes('home') || text.includes('होम') ||
      text.includes('wapas') || text.includes('वापस') || text.includes('back')
    ) {
      res.json({
        actionType: 'NAVIGATE',
        path: '/',
        previewTitle: 'Navigate to Dashboard (होम स्क्रीन)',
        previewDetails: { Destination: 'Home Dashboard' },
        audioResponse: 'डैशबोर्ड स्क्रीन खोली जा रही है।',
        transcript: originalText
      });
      return;
    }

    // 9B. Galla Status & History (गल्ला / गला / कैश - आज, कल या 7 दिन का)
    if (
      text.includes('galla') || text.includes('gala') || 
      text.includes('गल्ला') || text.includes('गला') || 
      text.includes('cash') || text.includes('कैश') || 
      text.includes('तिजोरी')
    ) {
      // Calculate cash numbers for the requested date range
      const [cashSales, farmerPayments, expenses] = await Promise.all([
        Order.aggregate([
          { $match: { tenantId: req.tenantId, orderDate: { $gte: startOfRange, $lte: endOfRange }, paymentMode: 'Cash', status: { $ne: 'Cancelled' } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        FarmerPayment.aggregate([
          { $match: { tenantId: req.tenantId, date: { $gte: startOfRange, $lte: endOfRange } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Expense.aggregate([
          { $match: { tenantId: req.tenantId, date: { $gte: startOfRange, $lte: endOfRange } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const salesAmt = cashSales[0]?.total || 0;
      const paymentsAmt = farmerPayments[0]?.total || 0;
      const expensesAmt = expenses[0]?.total || 0;
      const netCash = salesAmt - (paymentsAmt + expensesAmt);

      res.json({
        actionType: 'NAVIGATE',
        path: `/galla?startDate=${startDateStr}&endDate=${endDateStr}&date=${startDateStr}`,
        previewTitle: `${dateLabel} का गल्ला (Galla Status)`,
        previewDetails: {
          'अवधि (Period)': `${startDateStr} से ${endDateStr}`,
          'कैश बिक्री (Sales)': `₹${salesAmt.toLocaleString('en-IN')}`,
          'भुगतान व ख़र्च': `₹${(paymentsAmt + expensesAmt).toLocaleString('en-IN')}`,
          'नेट गल्ला (Balance)': `₹${netCash.toLocaleString('en-IN')}`
        },
        audioResponse: `${dateLabel} का गल्ला स्क्रीन खोला जा रहा है।`,
        transcript: originalText
      });
      return;
    }

    // 9C. Milk Collection Query & History (कल का दूध / 7 दिन का दूध संकलन)
    if (
      (text.includes('doodh') || text.includes('dudh') || text.includes('दूध') || text.includes('milk')) &&
      (text.includes('kitna') || text.includes('कितना') || text.includes('dikhao') || text.includes('दिखाओ') || 
       text.includes('kholo') || text.includes('खोलो') || text.includes('aaya') || text.includes('आया') || isPastDate)
    ) {
      const collections = await MilkCollection.find({
        tenantId: req.tenantId,
        date: { $gte: startOfRange, $lte: endOfRange }
      });

      const totalQty = collections.reduce((acc, curr) => acc + curr.quantity, 0);
      const avgFat = totalQty > 0 ? (collections.reduce((acc, curr) => acc + ((curr.fat || 0) * curr.quantity), 0) / totalQty) : 0;

      res.json({
        actionType: 'NAVIGATE',
        path: `/milk?startDate=${startDateStr}&endDate=${endDateStr}&date=${startDateStr}`,
        previewTitle: `${dateLabel} का दूध संकलन (Milk Report)`,
        previewDetails: {
          'अवधि (Period)': `${startDateStr} से ${endDateStr}`,
          'कुल दूध मात्रा': `${totalQty.toFixed(1)} Litres`,
          'औसत फैट (Avg FAT)': `${avgFat.toFixed(1)}%`,
          'कुल किसान संकलन': `${collections.length} किसान`
        },
        audioResponse: `${dateLabel} कुल ${totalQty.toFixed(1)} लीटर दूध संकलित हुआ था। दूध स्क्रीन खोली जा रही है।`,
        transcript: originalText
      });
      return;
    }

    // 9D. Farmer Search / Ledger / Hisab (किसान हिसाब / लेजर / सूची)
    if (
      text.includes('farmer') || text.includes('farmers') || 
      text.includes('kisan') || text.includes('किसान') || 
      text.includes('फार्मर')
    ) {
      // Check if specific farmer is mentioned for ledger/hisab
      let matchedFarmer = null;
      for (const f of farmers) {
        if (text.includes(f.name.toLowerCase()) || text.includes(`farmer ${f.farmerId}`) || text.includes(`code ${f.farmerId}`)) {
          matchedFarmer = f;
          break;
        }
      }

      if (!matchedFarmer) {
        const codeMatch = text.match(/(?:farmer|code|kisan|किसान|कोड)\s*(\d+)/i);
        if (codeMatch) {
          const codeStr = codeMatch[1];
          matchedFarmer = farmers.find(f => f.farmerId.includes(codeStr) || f.farmerId === `F-${codeStr.padStart(4, '0')}`);
        }
      }

      if (matchedFarmer && (text.includes('hisab') || text.includes('हिसाब') || text.includes('baki') || text.includes('बाकी') || text.includes('ledger') || text.includes('लेजर') || text.includes('balance') || text.includes('बैलेंस'))) {
        const ledgers = await FarmerLedger.find({ tenantId: req.tenantId, farmer: matchedFarmer._id }).sort({ date: -1 }).limit(1);
        const currentBalance = ledgers.length > 0 ? ledgers[0].balance : (matchedFarmer.openingBalance || 0);

        res.json({
          actionType: 'NAVIGATE',
          path: `/farmers?search=${encodeURIComponent(matchedFarmer.farmerId || matchedFarmer.name)}`,
          previewTitle: `किसान खाता: ${matchedFarmer.name} (${matchedFarmer.farmerId})`,
          previewDetails: {
            'किसान (Farmer)': `${matchedFarmer.name} (${matchedFarmer.farmerId})`,
            'मोबाइल': matchedFarmer.mobile,
            'गांव': matchedFarmer.village,
            'कुल बैलेंस': `₹${Math.abs(currentBalance).toLocaleString('en-IN')} ${currentBalance >= 0 ? '(जमा)' : '(बकाया)'}`
          },
          audioResponse: `${matchedFarmer.name} का किसान खाता खोला जा रहा है। कुल बैलेंस ₹${Math.abs(currentBalance)} है।`,
          transcript: originalText
        });
        return;
      }

      if (
        text.includes('list') || text.includes('लिस्ट') || 
        text.includes('suchi') || text.includes('सूची') || 
        text.includes('dikhao') || text.includes('दिखाओ') || 
        text.includes('kholo') || text.includes('खोलो') ||
        text.includes('page') || text.includes('स्क्रीन')
      ) {
        res.json({
          actionType: 'NAVIGATE',
          path: '/farmers',
          previewTitle: 'Navigate to Farmers List (किसान सूची)',
          previewDetails: { Destination: `कुल ${farmers.length} किसान पंजीकृत हैं` },
          audioResponse: `किसान सूची खोली जा रही है। कुल ${farmers.length} किसान पंजीकृत हैं।`,
          transcript: originalText
        });
        return;
      }
    }

    // 9E. Live Stock & Production Hub (स्टॉक / प्रोडक्शन / कितना पनीर या घी बचा है)
    if (
      text.includes('production') || text.includes('प्रोडक्शन') || 
      text.includes('stock') || text.includes('स्टॉक') || 
      text.includes('maal') || text.includes('माल') ||
      text.includes('ghee') || text.includes('paneer') || text.includes('घी') || text.includes('पनीर')
    ) {
      if (
        text.includes('kitna') || text.includes('कितना') || text.includes('bacha') || text.includes('बचा') ||
        text.includes('status') || text.includes('dikhao') || text.includes('दिखाओ') || text.includes('kholo') || text.includes('खोलो')
      ) {
        const paneerProd = products.find(p => p.name.toLowerCase().includes('paneer') || p.category === 'Paneer');
        const gheeProd = products.find(p => p.name.toLowerCase().includes('ghee') || p.category === 'Ghee');
        const paneerStock = paneerProd ? paneerProd.stockQty || 0 : 0;
        const gheeStock = gheeProd ? gheeProd.stockQty || 0 : 0;

        res.json({
          actionType: 'NAVIGATE',
          path: '/production',
          previewTitle: 'Live Production & Stock Hub (स्टॉक स्थिति)',
          previewDetails: {
            'पनीर स्टॉक (Paneer)': `${paneerStock} KG`,
            'देसी घी स्टॉक (Ghee)': `${gheeStock} KG`,
            'स्क्रीन': 'Production & Stock Hub'
          },
          audioResponse: `स्टॉक में ${paneerStock} किलो पनीर और ${gheeStock} किलो घी उपलब्ध है। प्रोडक्शन पेज खोला जा रहा है।`,
          transcript: originalText
        });
        return;
      }
    }

    // 9F. Sales & Orders History (बिक्री / ऑर्डर्स)
    if (
      text.includes('order') || text.includes('orders') || text.includes('ऑर्डर') ||
      text.includes('sale') || text.includes('sales') || text.includes('बिक्री') || text.includes('बिका')
    ) {
      if (text.includes('kitna') || text.includes('कितनी') || text.includes('dikhao') || text.includes('दिखाओ') || text.includes('kholo') || text.includes('खोलो') || isPastDate) {
        const sales = await Order.find({
          tenantId: req.tenantId,
          orderDate: { $gte: startOfRange, $lte: endOfRange },
          status: { $ne: 'Cancelled' }
        });

        const totalSalesAmt = sales.reduce((acc, curr) => acc + curr.totalAmount, 0);

        res.json({
          actionType: 'NAVIGATE',
          path: `/orders?startDate=${startDateStr}&endDate=${endDateStr}`,
          previewTitle: `${dateLabel} की बिक्री (Sales & Orders)`,
          previewDetails: {
            'अवधि (Period)': `${startDateStr} से ${endDateStr}`,
            'कुल ऑर्डर्स (Orders)': `${sales.length} ऑर्डर्स`,
            'कुल बिक्री राशि': `₹${totalSalesAmt.toLocaleString('en-IN')}`
          },
          audioResponse: `${dateLabel} कुल ₹${totalSalesAmt} की बिक्री दर्ज हुई है। ऑर्डर्स स्क्रीन खोली जा रही है।`,
          transcript: originalText
        });
        return;
      }
    }

    // 9G. Menu & Rate List (मेनू / भाव सूची)
    if (
      text.includes('menu') || text.includes('मेनू') || 
      text.includes('rate list') || text.includes('रेट लिस्ट') || 
      text.includes('price list') || text.includes('भाव सूची') || text.includes('रेट चार्ट')
    ) {
      res.json({
        actionType: 'NAVIGATE',
        path: '/menu',
        previewTitle: 'Navigate to Menu (मेनू व भाव सूची)',
        previewDetails: { Destination: `कुल ${products.length} प्रोडक्ट्स लिस्टेड हैं` },
        audioResponse: 'सेल्स मेनू और भाव सूची खोली जा रही है।',
        transcript: originalText
      });
      return;
    }

    // 9H. Close Day / Day Settlement (डे क्लोज़ / हिसाब बंद)
    if (
      text.includes('close day') || text.includes('day close') || 
      text.includes('डे क्लोज') || text.includes('दिन बंद') || 
      text.includes('हिसाब बंद') || text.includes('hisaab band')
    ) {
      res.json({
        actionType: 'NAVIGATE',
        path: '/closeday',
        previewTitle: 'Navigate to Day Close (डे क्लोज़ स्क्रीन)',
        previewDetails: { Destination: 'Daily Close & Register Finalization' },
        audioResponse: 'डे क्लोज़ स्क्रीन खोली जा रही है।',
        transcript: originalText
      });
      return;
    }

    // =========================================================================
    // 9. MILK COLLECTION ENTRY (दूध संकलन)
    // =========================================================================
    const qtyMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:litre|liter|ltr|l|लीटर|ली)/i) ||
                     text.match(/(?:doodh|dudh|दूध|milk)\s*(\d+(?:\.\d+)?)/i) ||
                     text.match(/(\d+(?:\.\d+)?)\s*(?:doodh|dudh|दूध)/i);

    const fatMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:fat|fett|फैट|फेट|पेटी)/i) ||
                     text.match(/(?:fat|fett|फैट|फेट|पेटी)\s*(\d+(?:\.\d+)?)/i);

    const isExplicitMilkIntent = text.includes('doodh') || text.includes('dudh') || 
                                 text.includes('दूध') || text.includes('milk') || 
                                 text.includes('fat') || text.includes('फैट') || 
                                 text.includes('snf') || text.includes('litre') || 
                                 text.includes('लीटर') || text.includes('ltr') || 
                                 text.includes('peti') || text.includes('पेटी') ||
                                 (qtyMatch !== null);

    if (isExplicitMilkIntent) {
      // 1. Extract Farmer
      let farmer = null;
      for (const f of farmers) {
        if (text.includes(f.name.toLowerCase())) {
          farmer = f;
          break;
        }
      }

      if (!farmer) {
        const codeMatch = text.match(/(?:farmer|code|kisan|किसान|कोड|नंबर)\s*(\d+)/i) || 
                           text.match(/(\d+)\s*(?:ka|ke|number|नंबर|का|के)/i) ||
                           text.match(/^(\d+)/);
        if (codeMatch) {
          const codeNum = codeMatch[1];
          farmer = farmers.find(f => f.farmerId.includes(codeNum) || f.farmerId === `F-${codeNum.padStart(4, '0')}`);
        }
      }

      if (!farmer && farmers.length > 0) {
        farmer = farmers[0];
      }

      // 2. Extract Quantity (Litres)
      let quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 10.0;

      // 3. Extract FAT
      let fat = 0;
      if (fatMatch) {
        fat = parseFloat(fatMatch[1]);
      } else {
        const allNumbers = text.match(/\b\d+(?:\.\d+)?\b/g);
        if (allNumbers && allNumbers.length >= 2) {
          for (const numStr of allNumbers) {
            const n = parseFloat(numStr);
            if (n >= 3.0 && n <= 120.0 && n !== quantity) {
              fat = n;
              break;
            }
          }
        }
      }

      // Normalize 2-digit FAT (e.g. 54 -> 5.4, 62 -> 6.2)
      if (fat >= 30 && fat <= 120) {
        fat = Math.round((fat / 10) * 10) / 10;
      }
      if (!fat || fat <= 0) fat = 5.0;

      // 4. Extract Milk Type
      let milkType = 'Buffalo';
      if (text.includes('cow') || text.includes('gay') || text.includes('गाय')) {
        milkType = 'Cow';
      } else if (text.includes('mix') || text.includes('mixed') || text.includes('मिक्स')) {
        milkType = 'Mixed';
      }

      // 5. Extract Shift
      const currentHour = new Date().getHours();
      let shift = currentHour < 14 ? 'Morning' : 'Evening';
      if (text.includes('morning') || text.includes('subah') || text.includes('सुबह')) {
        shift = 'Morning';
      } else if (text.includes('evening') || text.includes('sham') || text.includes('shaam') || text.includes('शाम')) {
        shift = 'Evening';
      }

      // 6. Calculate Estimated Rate
      let calculatedRate = 42.0;
      let snf = 8.5;

      if (farmer && farmer.fatRate && farmer.fatRate > 0) {
        calculatedRate = Math.round(fat * farmer.fatRate * 100) / 100;
      } else if (rateCharts.length > 0) {
        const chart = rateCharts[0];
        const rules = milkType === 'Cow' ? chart.cowRules : milkType === 'Mixed' ? chart.mixedRules : chart.buffaloRules;
        const matchedRule = rules.find(r => Math.abs(r.fat - fat) < 0.1);
        if (matchedRule) {
          calculatedRate = matchedRule.rate;
        } else {
          calculatedRate = Math.round(fat * 7.5 * 100) / 100;
        }
      } else {
        calculatedRate = Math.round(fat * 8.0 * 100) / 100;
      }

      const totalAmount = Math.round((quantity * calculatedRate) * 100) / 100;
      const farmerDisplayName = farmer ? `${farmer.name} (${farmer.farmerId})` : 'Farmer (किसान)';

      res.json({
        actionType: 'MILK_ENTRY',
        previewTitle: `Milk Collection (दूध संकलन): ${farmerDisplayName}`,
        data: {
          farmerId: farmer?._id,
          farmerName: farmer?.name,
          farmerCode: farmer?.farmerId,
          date: new Date().toISOString().split('T')[0],
          shift,
          milkType,
          quantity,
          fat,
          snf,
          rate: calculatedRate,
          totalAmount,
          notes: `Voice Entry: "${originalText}"`
        },
        previewDetails: {
          'Farmer (किसान)': farmerDisplayName,
          'Milk Quantity (मात्रा)': `${quantity} Litres`,
          'FAT (फैट)': `${fat}%`,
          'Shift (शिफ्ट)': `${shift === 'Morning' ? 'Morning (सुबह)' : 'Evening (शाम)'}`,
          'Type (प्रकार)': milkType,
          'Rate (अनुमानित भाव)': `₹${calculatedRate.toFixed(2)}/L`,
          'Total Amount (कुल राशि)': `₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        },
        audioResponse: `${farmer ? farmer.name : 'किसान'} की ${quantity} लीटर दूध एंट्री ${fat} फैट के साथ ₹${totalAmount} में दर्ज करने के लिए कन्फर्म करें।`,
        transcript: originalText
      });
      return;
    }

    // =========================================================================
    // 9B. MILK BANDHI / DAILY HOUSEHOLD DELIVERY (दूध बांधी / नागा)
    // =========================================================================
    const isBandhi = text.includes('bandhi') || text.includes('baandhi') || text.includes('बांधी') ||
                     text.includes('naga') || text.includes('नागा') || text.includes('वितरण');
    if (isBandhi && (text.includes('nahi') || text.includes('नहीं') || text.includes('chali') || text.includes('gayi') || text.includes('गयी') || text.includes('सबकी') || text.includes('sabki') || text.includes('नंबर') || text.includes('no'))) {
      const skippedBandhiNos: number[] = [];
      const numMatches = text.match(/\b\d+\b/g);
      if (numMatches) {
        for (const nm of numMatches) {
          const numVal = parseInt(nm, 10);
          if (numVal >= 1 && numVal <= 200) {
            skippedBandhiNos.push(numVal);
          }
        }
      }

      const shift = text.includes('evening') || text.includes('sham') || text.includes('शाम') ? 'Evening' : 'Morning';

      const bandhiResult = {
        actionType: 'MILK_BANDHI_UPDATE',
        data: {
          shift,
          date: new Date().toISOString().split('T')[0],
          skippedBandhiNos,
          markAllOthersDelivered: true,
          notes: `Voice Delivery: "${originalText}"`
        },
        transcript: originalText,
        isAIPowered: false
      };

      const enrichedBandhi = await enrichVoiceResult(bandhiResult, originalText, tenantId, farmers, products, rateCharts);
      res.json(enrichedBandhi);
      return;
    }

    // =========================================================================
    // 9C. UDHARI PAYMENT COLLECTION (उधारी जमा)
    // =========================================================================
    const isUdharCollection = (text.includes('udhari') || text.includes('उधारी') || text.includes('baki') || text.includes('बकाया')) &&
                              (text.includes('jama') || text.includes('जमा') || text.includes('chukta') || text.includes('pay') || text.includes('diye') || text.includes('aaye'));
    if (isUdharCollection) {
      const amtMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:rupaye|rs|rupees|रुपये|रुपए)/i) || text.match(/(\d+(?:\.\d+)?)/);
      const amount = amtMatch ? parseFloat(amtMatch[1]) : 500;

      const udharResult = {
        actionType: 'COLLECT_DUE_PAYMENT',
        data: {
          customerName: originalText,
          amount,
          paymentMode: 'Cash'
        },
        transcript: originalText,
        isAIPowered: false
      };

      const enrichedUdhar = await enrichVoiceResult(udharResult, originalText, tenantId, farmers, products, rateCharts);
      res.json(enrichedUdhar);
      return;
    }

    // =========================================================================
    // 9D. UDHARI INQUIRY / DUE SUMMARY (उधारी की जानकारी)
    // =========================================================================
    const isUdharQuery = text.includes('udhari') || text.includes('उधारी') || text.includes('udhar') || text.includes('उधार') ||
                         (text.includes('baki') && text.includes('paisa')) || text.includes('बकाया') || text.includes('due');
    if (isUdharQuery && !text.includes('advance') && !text.includes('farmer')) {
      const queryResult = {
        actionType: 'DUE_PAYMENTS_QUERY',
        data: {
          queryType: 'UDHARI'
        },
        transcript: originalText,
        isAIPowered: false
      };
      const enrichedQuery = await enrichVoiceResult(queryResult, originalText, tenantId, farmers, products, rateCharts);
      res.json(enrichedQuery);
      return;
    }

    // =========================================================================
    // 10. UNKNOWN COMMAND FALLBACK (यदि कुछ भी समझ न आए तो गलत एंट्री न बनाएँ)
    // =========================================================================
    res.json({
      actionType: 'UNKNOWN',
      previewTitle: 'कमांड समझ नहीं आई (Command Not Recognized)',
      previewDetails: {
        'आपने बोला': originalText,
        'सुझाव': 'उदा. "बांधी नंबर 1, 2 की नागा बाकी सबकी गयी", "रमेश जी से 1000 उधारी जमा", "गला दिखाओ"'
      },
      audioResponse: 'क्षमा करें, यह कमांड समझ नहीं आई। कृपया दोबारा स्पष्ट बोलें या उदाहरण देखें।',
      transcript: originalText
    });

  } catch (error: any) {
    console.error('Parse Voice Command Error:', error);
    res.status(500).json({ message: error.message || 'Voice parsing failed. Please try again.' });
  }
};

export const executeVoiceCommand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { actionType, data } = req.body;

    if (!actionType || !data) {
      res.status(400).json({ message: 'Action type and data are required.' });
      return;
    }

    const userId = (req as any).user?.id || (req as any).userId || (req as any).user?._id;

    // 1. REGISTER NEW FARMER
    if (actionType === 'REGISTER_FARMER') {
      const { farmerId, name, mobile, village, notes } = data;

      const farmer = new Farmer({
        tenantId: req.tenantId,
        farmerId,
        name,
        mobile: mobile || '9800000000',
        village: village || 'Local',
        status: 'Active',
        openingBalance: 0,
        openingAdvance: 0,
        joiningDate: new Date(),
        notes
      });

      await farmer.save();

      res.status(201).json({
        success: true,
        message: `नया किसान ${name} (${farmerId}) सफलतापूर्वक रजिस्टर हो गया!`,
        result: farmer,
        audioFeedback: `नया किसान ${name} कोड ${farmerId} के साथ सफलता से रजिस्टर हो गया है।`
      });
      return;
    }

    // 2. CREATE NEW PRODUCT
    if (actionType === 'CREATE_PRODUCT') {
      const { name, category, unit, sellingPrice, costPrice, stockQty } = data;

      const product = new Product({
        tenantId: req.tenantId,
        name,
        category: category || 'Other',
        unit: unit || 'KG',
        sellingPrice: Number(sellingPrice) || 100,
        costPrice: Number(costPrice) || 80,
        stockQty: Number(stockQty) || 0,
        status: 'Active'
      });

      await product.save();

      res.status(201).json({
        success: true,
        message: `नया प्रोडक्ट ${name} सफलतापूर्वक मेनू में जुड़ गया!`,
        result: product,
        audioFeedback: `${name} ₹${sellingPrice} प्रति ${unit} रेट पर मेनू में जुड़ गया है।`
      });
      return;
    }

    // 3. DIRECT BULK MILK SALE
    if (actionType === 'DIRECT_MILK_SALE') {
      const { superMilk, regularMilk, cowMilk, totalQuantity, totalAmount, shift, notes, customerName } = data;

      const superMilkEntry = superMilk || { quantity: 0, rate: 0, amount: 0 };
      const regularMilkEntry = regularMilk || { quantity: 0, rate: 0, amount: 0 };
      const cowMilkEntry = cowMilk || { quantity: 0, rate: 0, amount: 0 };

      const totalQty = Number(totalQuantity) || (superMilkEntry.quantity + regularMilkEntry.quantity + cowMilkEntry.quantity);
      const totalAmt = Number(totalAmount) || (superMilkEntry.amount + regularMilkEntry.amount + cowMilkEntry.amount);

      let recordedById = userId;
      if (!recordedById || !Types.ObjectId.isValid(recordedById)) {
        recordedById = undefined;
      }

      const milkSale = new MilkSale({
        tenantId: req.tenantId,
        date: new Date(),
        shift: shift || 'Morning',
        superMilk: superMilkEntry,
        regularMilk: regularMilkEntry,
        cowMilk: cowMilkEntry,
        totalQuantity: totalQty,
        totalAmount: totalAmt,
        paymentMode: 'Cash',
        customerName: customerName || 'Counter Buyers',
        notes: notes || 'Voice Direct Sale',
        recordedBy: recordedById
      });

      await milkSale.save();

      await CashTransaction.create({
        tenantId: req.tenantId,
        date: new Date(),
        amount: Number(totalAmt),
        type: 'CASH_SALE',
        description: `Voice Direct Milk Sale: ${totalQty}L`,
        referenceId: milkSale._id
      });

      res.status(201).json({
        success: true,
        message: `सीधी दूध बिक्री दर्ज हो गई!`,
        result: milkSale,
        audioFeedback: `${totalQty} लीटर सीधी दूध बिक्री ₹${totalAmt} में गल्ला में दर्ज हो गई है।`
      });
      return;
    }

    // 4. FARMER PAYMENT
    if (actionType === 'FARMER_PAYMENT') {
      const { farmerId, amount, paymentMode, notes } = data;

      const payment = new FarmerPayment({
        tenantId: req.tenantId,
        farmer: farmerId,
        date: new Date(),
        amount: Number(amount),
        paymentMode: paymentMode || 'Cash',
        notes
      });

      await payment.save();

      await FarmerLedger.create({
        tenantId: req.tenantId,
        farmer: farmerId,
        date: new Date(),
        transactionType: 'PAYMENT_MADE',
        amount: -Number(amount),
        balance: -Number(amount),
        description: `Voice Payment: ₹${amount}`,
        referenceId: payment._id
      });

      await CashTransaction.create({
        tenantId: req.tenantId,
        date: new Date(),
        amount: -Number(amount),
        type: 'FARMER_PAYMENT',
        description: `Voice Farmer Payment to ${data.farmerName} (${data.farmerCode})`,
        referenceId: payment._id
      });

      res.status(201).json({
        success: true,
        message: `किसान भुगतान दर्ज हो गया!`,
        result: payment,
        audioFeedback: `${data.farmerName} को ₹${amount} रुपये भुगतान गल्ला से दर्ज हो गया है।`
      });
      return;
    }

    // 5. MILK COLLECTION
    if (actionType === 'MILK_ENTRY') {
      let { farmerId, date, shift, milkType, quantity, fat, snf, rate, totalAmount, notes } = data;
      const calculatedAmount = Number(totalAmount) || Math.round(Number(rate) * Number(quantity) * 100) / 100;

      let effectiveFarmerId = farmerId;
      if (!effectiveFarmerId && data.farmerName) {
        let f = await Farmer.findOne({ tenantId: req.tenantId, name: new RegExp(`^${data.farmerName.trim()}$`, 'i') });
        if (!f) {
          const totalFarmers = await Farmer.countDocuments({ tenantId: req.tenantId });
          f = new Farmer({
            tenantId: req.tenantId,
            farmerId: `F-${String(totalFarmers + 1).padStart(4, '0')}`,
            name: data.farmerName.trim(),
            mobile: '98' + Math.floor(10000000 + Math.random() * 90000000),
            village: 'Local',
            status: 'Active'
          });
          await f.save();
        }
        effectiveFarmerId = f._id;
      }

      const collection = new MilkCollection({
        tenantId: req.tenantId,
        farmer: effectiveFarmerId,
        date: date ? new Date(date) : new Date(),
        shift: shift || 'Morning',
        milkType: milkType || 'Buffalo',
        quantity: Number(quantity),
        fat: Number(fat),
        snf: Number(snf) || 8.5,
        rate: Number(rate),
        amount: calculatedAmount,
        operator: userId,
        notes: notes || 'Voice Entry'
      });

      await collection.save();

      if (effectiveFarmerId) {
        await FarmerLedger.create({
          tenantId: req.tenantId,
          farmer: effectiveFarmerId,
          date: date ? new Date(date) : new Date(),
          transactionType: 'MILK_SUPPLY',
          amount: calculatedAmount,
          balance: calculatedAmount,
          description: `Voice Milk Entry: ${quantity}L @ ₹${rate}/L (FAT: ${fat})`,
          referenceId: collection._id
        });
      }

      res.status(201).json({
        success: true,
        message: 'Milk entry successfully saved!',
        result: collection,
        audioFeedback: `${data.farmerName || 'किसान'} की ${quantity} लीटर दूध एंट्री सफलता से दर्ज हो गई है।`
      });
      return;
    }

    // 6. PRODUCT SALE
    if (actionType === 'PRODUCT_SALE') {
      const { productId, quantity, rate, totalAmount, notes } = data;

      const order = new Order({
        tenantId: req.tenantId,
        customerName: 'Counter Cash Buyer',
        items: [{
          product: productId,
          quantity: Number(quantity),
          rate: Number(rate),
          amount: Number(totalAmount)
        }],
        totalAmount: Number(totalAmount),
        orderDate: new Date(),
        status: 'Completed',
        paymentMode: 'Cash',
        paymentStatus: 'Paid',
        source: 'Voice_POS',
        notes
      });

      await order.save();
      await Product.findByIdAndUpdate(productId, { $inc: { stockQty: -Number(quantity) } });

      await CashTransaction.create({
        tenantId: req.tenantId,
        date: new Date(),
        amount: Number(totalAmount),
        type: 'CASH_SALE',
        description: `Voice Counter Sale: ${data.productName} (${quantity})`,
        referenceId: order._id
      });

      res.status(201).json({
        success: true,
        message: 'Product sale successfully recorded!',
        result: order,
        audioFeedback: `${data.productName} की ₹${totalAmount} की बिक्री गल्ला में दर्ज हो गई है।`
      });
      return;
    }

    // 7. FARMER ADVANCE
    if (actionType === 'FARMER_ADVANCE') {
      const { farmerId, amount, notes } = data;

      const advance = new FarmerAdvance({
        tenantId: req.tenantId,
        farmer: farmerId,
        date: new Date(),
        amount: Number(amount),
        status: 'Approved',
        approvedBy: userId,
        notes
      });

      await advance.save();

      await FarmerLedger.create({
        tenantId: req.tenantId,
        farmer: farmerId,
        date: new Date(),
        transactionType: 'ADVANCE_GIVEN',
        amount: -Number(amount),
        balance: -Number(amount),
        description: `Voice Advance: ₹${amount}`,
        referenceId: advance._id
      });

      await CashTransaction.create({
        tenantId: req.tenantId,
        date: new Date(),
        amount: -Number(amount),
        type: 'FARMER_PAYMENT',
        description: `Voice Advance to ${data.farmerName} (${data.farmerCode})`,
        referenceId: advance._id
      });

      res.status(201).json({
        success: true,
        message: 'Farmer advance recorded!',
        result: advance,
        audioFeedback: `${data.farmerName} को ₹${amount} रुपये अग्रिम गल्ला से दर्ज हो गया है।`
      });
      return;
    }

    // 8. EXPENSE (दुकान का ख़र्च)
    if (actionType === 'EXPENSE') {
      const { title, description, amount, category, notes } = data;
      const expenseDesc = description || title || 'Daily Expense';

      let operatorId = userId;
      if (!operatorId || !Types.ObjectId.isValid(operatorId)) {
        const anyUser = await User.findOne({ tenantId: req.tenantId });
        operatorId = anyUser?._id || new Types.ObjectId();
      }

      const expense = new Expense({
        tenantId: req.tenantId,
        category: category || 'Miscellaneous',
        description: expenseDesc,
        amount: Number(amount),
        paymentMode: 'Cash',
        operator: operatorId,
        notes: notes || expenseDesc
      });

      await expense.save();

      await CashTransaction.create({
        tenantId: req.tenantId,
        date: new Date(),
        amount: -Number(amount),
        type: 'EXPENSE',
        description: `Voice Expense: ${expenseDesc}`,
        referenceId: expense._id
      });

      res.status(201).json({
        success: true,
        message: 'Expense recorded!',
        result: expense,
        audioFeedback: `${expenseDesc} का ₹${amount} रुपये ख़र्च गल्ला में दर्ज हो गया है।`
      });
      return;
    }

    // 9. DELETE MILK ENTRY (दूध एंट्री डिलीट करना)
    if (actionType === 'DELETE_MILK_ENTRY') {
      const { collectionId, farmerId, farmerName } = data;
      const tenantId = (req as any).tenantId;

      let entryToDelete = null;
      if (collectionId) {
        entryToDelete = await MilkCollection.findOne({ _id: collectionId, tenantId });
      }

      if (!entryToDelete && farmerId) {
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));
        entryToDelete = await MilkCollection.findOne({
          tenantId,
          farmer: farmerId,
          date: { $gte: startOfDay, $lte: endOfDay }
        }).sort({ createdAt: -1 });
      }

      if (!entryToDelete) {
        res.status(404).json({
          message: 'हटाने के लिए कोई दूध एंट्री नहीं मिली।',
          audioFeedback: 'हटाने के लिए कोई दूध एंट्री नहीं मिली।'
        });
        return;
      }

      await MilkCollection.deleteOne({ _id: entryToDelete._id });
      await InventoryTransaction.deleteMany({ tenantId, referenceId: entryToDelete._id });

      await postLedgerEntry(
        tenantId.toString(),
        entryToDelete.farmer.toString(),
        new Date(),
        'ADJUSTMENT',
        -entryToDelete.amount,
        `वॉयस डिलीट: ${entryToDelete.quantity}L दूध एंट्री हटाई गई`,
        entryToDelete._id.toString()
      );

      res.status(200).json({
        success: true,
        message: 'दूध एंट्री सफलतापूर्वक डिलीट कर दी गई है।',
        result: { deletedId: entryToDelete._id },
        audioFeedback: `${farmerName || 'किसान'} की ${entryToDelete.quantity} लीटर दूध एंट्री सफलता से डिलीट कर दी गई है।`
      });
      return;
    }

    // 10. MILK_BANDHI_UPDATE (दैनिक दूध बांधी वितरण व नागा अपडेट)
    if (actionType === 'MILK_BANDHI_UPDATE') {
      await ensureSampleBandhis(req.tenantId);
      const { shift = 'Morning', date, skippedBandhiNos = [] } = data;
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const skippedArray: number[] = Array.isArray(skippedBandhiNos)
        ? skippedBandhiNos.map((n: any) => Number(n)).filter((n: any) => !isNaN(n))
        : [];

      const activeBandhis = await MilkBandhi.find({
        tenantId: req.tenantId,
        status: 'Active',
        $or: [{ shift }, { shift: 'Both' }]
      }).sort({ bandhiNo: 1 });

      let deliveredCount = 0;
      let skippedCount = 0;
      let totalMilkDelivered = 0;
      let totalAmount = 0;

      const deliveries: IDeliveryItem[] = [];

      for (const b of activeBandhis) {
        const isSkipped = skippedArray.includes(b.bandhiNo);
        const deliveredQty = isSkipped ? 0 : b.dailyQuantity;
        const rate = b.rate;
        const amount = isSkipped ? 0 : Math.round(deliveredQty * rate * 100) / 100;

        if (isSkipped) {
          skippedCount++;
        } else {
          deliveredCount++;
          totalMilkDelivered += deliveredQty;
          totalAmount += amount;
        }

        deliveries.push({
          bandhi: b._id as any,
          bandhiNo: b.bandhiNo,
          customerName: b.customerName,
          customer: b.customer,
          milkType: b.milkType,
          standardQuantity: b.dailyQuantity,
          deliveredQuantity: deliveredQty,
          rate,
          amount,
          status: isSkipped ? 'SKIPPED' : 'DELIVERED',
          notes: isSkipped ? 'नागा (वॉयस कमांड)' : 'वॉयस वितरण',
        });
      }

      totalMilkDelivered = Math.round(totalMilkDelivered * 100) / 100;
      totalAmount = Math.round(totalAmount * 100) / 100;

      // 1. Save or Update BandhiDeliveryLog
      const log = await BandhiDeliveryLog.findOneAndUpdate(
        { tenantId: req.tenantId, date: targetDate, shift },
        {
          tenantId: req.tenantId,
          date: targetDate,
          shift,
          deliveries,
          totalMilkDelivered,
          totalAmount,
          deliveredCount,
          skippedCount,
          isConfirmed: true,
          recordedBy: userId,
        },
        { new: true, upsert: true }
      );

      // 2. Post charges to Customer Ledgers & Update Outstanding Balances
      for (const d of deliveries) {
        if (d.status !== 'SKIPPED' && d.amount > 0) {
          let custId = d.customer;
          if (!custId) {
            const bandhiDoc = await MilkBandhi.findById(d.bandhi);
            custId = bandhiDoc?.customer;
          }

          if (custId) {
            const cust = await Customer.findOne({ _id: custId, tenantId: req.tenantId });
            if (cust) {
              cust.outstandingBalance = Math.round((cust.outstandingBalance + d.amount) * 100) / 100;
              await cust.save();

              await CustomerLedger.create({
                tenantId: req.tenantId,
                customer: cust._id,
                date: targetDate,
                description: `दैनिक दूध बांधी #${d.bandhiNo} (${shift}): ${d.deliveredQuantity}L @ ₹${d.rate}/L`,
                type: 'INVOICE',
                amount: d.amount,
                balance: cust.outstandingBalance,
                referenceId: log._id,
              });
            }
          }
        }
      }

      // 3. Debit Raw Milk Inventory for delivered milk
      if (totalMilkDelivered > 0) {
        await InventoryTransaction.deleteMany({ tenantId: req.tenantId, referenceId: log._id });
        await InventoryTransaction.create({
          tenantId: req.tenantId,
          isRawMilk: true,
          type: 'Sales',
          quantity: -totalMilkDelivered,
          date: targetDate,
          referenceId: log._id,
          notes: `दूध बांधी वितरण (${shift}): कुल ${totalMilkDelivered}L (${deliveredCount} घर)`,
        });
      }

      res.status(201).json({
        success: true,
        message: `दूध बांधी वितरण सफलतापूर्वक अपडेट हो गया! कुल ${deliveredCount} घरों में ${totalMilkDelivered}L दूध वितरित हुआ।`,
        result: log,
        audioFeedback: skippedArray.length > 0
          ? `बांधी नंबर ${skippedArray.join(', ')} की नागा दर्ज करके बाकी ${deliveredCount} घरों में ${totalMilkDelivered} लीटर दूध वितरण सफलता से दर्ज हो गया है।`
          : `सभी ${deliveredCount} घरों में ${totalMilkDelivered} लीटर दूध वितरण दर्ज हो गया है।`
      });
      return;
    }

    // 11. COLLECT_DUE_PAYMENT (उधारी जमा करना)
    if (actionType === 'COLLECT_DUE_PAYMENT') {
      const { customerId, bandhiNo, customerName, amount, paymentMode = 'Cash', notes, date } = data;
      const paymentAmount = Number(amount);

      let matchedCustomer = null;
      if (customerId) {
        matchedCustomer = await Customer.findOne({ _id: customerId, tenantId: req.tenantId });
      }

      if (!matchedCustomer && bandhiNo) {
        const b = await MilkBandhi.findOne({ tenantId: req.tenantId, bandhiNo: Number(bandhiNo) });
        if (b && b.customer) {
          matchedCustomer = await Customer.findOne({ _id: b.customer, tenantId: req.tenantId });
        }
      }

      if (!matchedCustomer && customerName) {
        const searchName = customerName.toLowerCase().trim();
        matchedCustomer = await Customer.findOne({
          tenantId: req.tenantId,
          $or: [
            { name: new RegExp(searchName, 'i') },
            { mobile: new RegExp(searchName, 'i') }
          ]
        });
      }

      if (!matchedCustomer) {
        matchedCustomer = await Customer.findOne({ tenantId: req.tenantId, outstandingBalance: { $gt: 0 } });
      }

      if (!matchedCustomer) {
        res.status(404).json({
          message: 'उधारी जमा के लिए ग्राहक नहीं मिला।',
          audioFeedback: 'ग्राहक नहीं मिला।'
        });
        return;
      }

      const paymentDate = date ? new Date(date) : new Date();

      matchedCustomer.outstandingBalance = Math.round((matchedCustomer.outstandingBalance - paymentAmount) * 100) / 100;
      await matchedCustomer.save();

      const ledgerEntry = await CustomerLedger.create({
        tenantId: req.tenantId,
        customer: matchedCustomer._id,
        date: paymentDate,
        description: `उधारी भुगतान प्राप्त (${paymentMode}): ${notes || 'वॉयस जमा'}`,
        type: 'PAYMENT',
        amount: -paymentAmount,
        balance: matchedCustomer.outstandingBalance,
      });

      if (paymentMode === 'Cash' || !paymentMode) {
        await CashTransaction.create({
          tenantId: req.tenantId,
          date: paymentDate,
          amount: paymentAmount,
          type: 'CUSTOMER_COLLECTION',
          description: `उधारी जमा - ${matchedCustomer.name}: ₹${paymentAmount}`,
          referenceId: ledgerEntry._id,
        });
      }

      res.status(201).json({
        success: true,
        message: `${matchedCustomer.name} से ₹${paymentAmount} उधारी जमा हो गयी! शेष बकाया: ₹${matchedCustomer.outstandingBalance}`,
        result: {
          customer: matchedCustomer,
          ledgerEntry,
          collectedAmount: paymentAmount,
          remainingBalance: matchedCustomer.outstandingBalance
        },
        audioFeedback: `${matchedCustomer.name} के खाते में ₹${paymentAmount} रुपये उधारी जमा गल्ला और लेजर में दर्ज हो गई है।`
      });
      return;
    }

    res.status(400).json({ message: 'Unsupported voice action type.' });
  } catch (error: any) {
    console.error('Execute Voice Command Error:', error);
    res.status(500).json({ message: error.message || 'Failed to execute voice action.' });
  }
};
