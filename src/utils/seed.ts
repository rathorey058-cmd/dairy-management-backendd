import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Farmer } from '../models/Farmer';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { MilkRateChart } from '../models/MilkRateChart';
import { ProductionRecipe } from '../models/ProductionRecipe';

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // 1. Seed Subscription Plans
    let plan = await SubscriptionPlan.findOne({ name: 'Premium' });
    if (!plan) {
      plan = await SubscriptionPlan.create({
        name: 'Premium',
        priceMonthly: 1999,
        priceYearly: 19999,
        maxUsers: 10,
        maxWhatsAppOrders: 1000,
        features: ['All Features', 'WhatsApp AI Orders', 'Smart Yield Forecasting', 'Audit Logs'],
        storageLimitGb: 20
      });
      console.log('Seeded Subscription Plan: Premium');
    }

    // 2. Seed Demo Tenant
    let tenant = await Tenant.findOne({ name: 'Krishna Dairy' });
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'Krishna Dairy',
        ownerName: 'Rahul Sharma',
        mobile: '9876543210',
        email: 'rahul@krishnadairy.com',
        address: '12, Gokul Path, Jaipur, Rajasthan',
        invoicePrefix: 'KD',
        financialYear: '2026-27',
        defaultCurrency: 'INR',
        status: 'Active',
        subscriptionPlan: plan._id,
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year expiry
      });
      console.log('Seeded Tenant: Krishna Dairy');
    }

    // 3. Seed Users
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // SuperAdmin
    let superAdmin = await User.findOne({ email: 'superadmin@dairysmart.com' });
    if (!superAdmin) {
      await User.create({
        tenantId: new Types.ObjectId('000000000000000000000000'), // Global/placeholder
        name: 'SaaS Super Admin',
        email: 'superadmin@dairysmart.com',
        mobile: '9999999999',
        passwordHash,
        role: 'SuperAdmin',
        permissions: ['all'],
        status: 'Active'
      });
      console.log('Seeded SuperAdmin');
    }

    // Owner
    let owner = await User.findOne({ email: 'owner@krishnadairy.com' });
    if (!owner) {
      await User.create({
        tenantId: tenant._id,
        name: 'Rahul Sharma',
        email: 'owner@krishnadairy.com',
        mobile: '9876543210',
        passwordHash,
        role: 'Owner',
        permissions: ['all'],
        status: 'Active'
      });
      console.log('Seeded Tenant Owner: Rahul Sharma');
    }

    // Operator
    let operator = await User.findOne({ email: 'operator@krishnadairy.com' });
    if (!operator) {
      await User.create({
        tenantId: tenant._id,
        name: 'Amit Singh',
        email: 'operator@krishnadairy.com',
        mobile: '8888888888',
        passwordHash,
        role: 'Operator',
        permissions: ['add_milk_entry', 'view_farmers'],
        status: 'Active'
      });
      console.log('Seeded Operator: Amit Singh');
    }

    // 4. Seed Farmers
    const farmerCount = await Farmer.countDocuments({ tenantId: tenant._id });
    if (farmerCount === 0) {
      const villages = ['Gokulpur', 'Jaipura', 'Rampura', 'Kalyanpura'];
      const farmersData = Array.from({ length: 10 }).map((_, idx) => {
        const idNum = idx + 1;
        return {
          tenantId: tenant._id,
          farmerId: `F-${String(idNum).padStart(4, '0')}`,
          name: `Farmer ${idNum}`,
          mobile: `900000000${idx}`,
          village: villages[idx % villages.length],
          openingBalance: 1000 * idx,
          openingAdvance: idx % 3 === 0 ? 5000 : 0,
          joiningDate: new Date(),
          status: 'Active'
        };
      });
      await Farmer.insertMany(farmersData);
      console.log('Seeded 10 Farmers');
    }

    // 5. Seed Customers
    const customerCount = await Customer.countDocuments({ tenantId: tenant._id });
    if (customerCount === 0) {
      const customersData = Array.from({ length: 20 }).map((_, idx) => {
        const idNum = idx + 1;
        return {
          tenantId: tenant._id,
          name: `Customer ${idNum}`,
          mobile: `800000000${idx}`,
          whatsappNumber: `800000000${idx}`,
          address: `${idNum}, Dairy Lane, Jaipur`,
          creditLimit: 15000,
          outstandingBalance: idx % 4 === 0 ? 2500 : 0
        };
      });
      await Customer.insertMany(customersData);
      console.log('Seeded 20 Customers');
    }

    // 6. Seed Products
    const productCount = await Product.countDocuments({ tenantId: tenant._id });
    if (productCount === 0) {
      const productsData = [
        { name: 'Fresh Milk', unit: 'Litre', sellingPrice: 60, costPrice: 45, stockQty: 500, category: 'Milk', barcode: '8901234567890' },
        { name: 'Fresh Paneer', unit: 'KG', sellingPrice: 400, costPrice: 320, stockQty: 50, category: 'Paneer', barcode: '8901234567891' },
        { name: 'Sweet Curd', unit: 'KG', sellingPrice: 120, costPrice: 85, stockQty: 100, category: 'Curd', barcode: '8901234567892' },
        { name: 'Desi Ghee', unit: 'KG', sellingPrice: 700, costPrice: 550, stockQty: 30, category: 'Ghee', barcode: '8901234567893' },
        { name: 'White Butter', unit: 'KG', sellingPrice: 450, costPrice: 350, stockQty: 40, category: 'Butter', barcode: '8901234567894' },
        { name: 'Fresh Cream', unit: 'KG', sellingPrice: 300, costPrice: 220, stockQty: 25, category: 'Cream', barcode: '8901234567895' },
        { name: 'Khoya / Mawa', unit: 'KG', sellingPrice: 350, costPrice: 280, stockQty: 20, category: 'Khoya', barcode: '8901234567896' }
      ].map(p => ({ ...p, tenantId: tenant._id, status: 'Active' }));
      await Product.insertMany(productsData);
      console.log('Seeded Products');
    }

    // 7. Seed Rate Chart
    let rateChart = await MilkRateChart.findOne({ tenantId: tenant._id });
    if (!rateChart) {
      // Standard rate rules
      // Cow: base FAT 3.5, SNF 8.5 -> Rs 40. increment by 0.1 FAT -> +Rs 0.8, SNF -> +Rs 0.4
      const cowRules = [];
      const buffaloRules = [];
      
      for (let f = 35; f <= 50; f++) {
        const fatVal = f / 10;
        cowRules.push({
          fat: fatVal,
          snf: 8.5,
          rate: Math.round((40 + (fatVal - 3.5) * 8) * 10) / 10
        });
      }
      
      for (let f = 60; f <= 90; f++) {
        const fatVal = f / 10;
        buffaloRules.push({
          fat: fatVal,
          snf: 9.0,
          rate: Math.round((55 + (fatVal - 6.0) * 10) * 10) / 10
        });
      }

      await MilkRateChart.create({
        tenantId: tenant._id,
        name: 'Jaipur Standard FAT Pricing',
        effectiveDate: new Date(),
        pricingType: 'FAT_ONLY',
        cowRules,
        buffaloRules,
        mixedRules: []
      });
      console.log('Seeded Rate Chart');
    }

    // 8. Seed Production Recipes
    const products = await Product.find({ tenantId: tenant._id });
    for (const prod of products) {
      if (prod.category === 'Paneer' || prod.category === 'Curd' || prod.category === 'Ghee') {
        let recipe = await ProductionRecipe.findOne({ tenantId: tenant._id, product: prod._id });
        if (!recipe) {
          await ProductionRecipe.create({
            tenantId: tenant._id,
            product: prod._id,
            baselineYieldPercent: prod.category === 'Paneer' ? 18 : prod.category === 'Curd' ? 95 : 6,
            minExpectedYieldPercent: prod.category === 'Paneer' ? 16 : prod.category === 'Curd' ? 90 : 5,
            maxExpectedYieldPercent: prod.category === 'Paneer' ? 22 : prod.category === 'Curd' ? 99 : 8,
            fatRelationship: prod.category === 'Paneer' ? 2.5 : 0,
            snfRelationship: prod.category === 'Paneer' ? 1.5 : 0,
            processingCostPerUnit: prod.category === 'Paneer' ? 15 : prod.category === 'Curd' ? 5 : 40,
            packagingCostPerUnit: prod.category === 'Paneer' ? 5 : prod.category === 'Curd' ? 2 : 10
          });
        }
      }
    }
    console.log('Seeded Production Recipes');
    console.log('Database Seeding Completed Successfully.');
  } catch (error) {
    console.error('Seeding Error:', error);
  }
};
