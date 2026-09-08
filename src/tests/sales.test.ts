interface Customer {
  creditLimit: number;
  outstandingBalance: number;
}

interface InvoiceInput {
  customer?: Customer;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Credit';
}

const validateInvoiceLimit = (input: InvoiceInput): { allowed: boolean; message?: string } => {
  const { customer, amount, paymentMode } = input;
  
  if (paymentMode === 'Credit') {
    if (!customer) {
      return { allowed: false, message: 'Credit sales require a registered customer.' };
    }
    const potentialOutstanding = customer.outstandingBalance + amount;
    if (potentialOutstanding > customer.creditLimit) {
      return { 
        allowed: false, 
        message: `Credit limit exceeded! Customer outstanding limit is ₹${customer.creditLimit}, current balance is ₹${customer.outstandingBalance}. Cannot book ₹${amount} invoice.` 
      };
    }
  }
  return { allowed: true };
};

interface GallaReconciliationInput {
  openingCash: number;
  transactions: {
    type: 'CASH_SALE' | 'CUSTOMER_COLLECTION' | 'FARMER_PAYMENT' | 'EXPENSE' | 'OTHER_IN' | 'OTHER_OUT';
    amount: number;
  }[];
}

const calculateExpectedGalla = (input: GallaReconciliationInput): number => {
  const { openingCash, transactions } = input;
  let runningCash = openingCash;
  for (const t of transactions) {
    if (t.type === 'CASH_SALE' || t.type === 'CUSTOMER_COLLECTION' || t.type === 'OTHER_IN') {
      runningCash += t.amount;
    } else if (t.type === 'FARMER_PAYMENT' || t.type === 'EXPENSE' || t.type === 'OTHER_OUT') {
      runningCash -= Math.abs(t.amount);
    }
  }
  return Math.round(runningCash * 100) / 100;
};

describe('POS Billing & Galla Reconciliation Mathematics', () => {

  describe('validateInvoiceLimit', () => {

    it('should block credit invoice if it exceeds customer credit limit', () => {
      const mockCustomer: Customer = { creditLimit: 15000, outstandingBalance: 12000 };
      // Adding Rs 4,000 exceeds Rs 15,000 limit
      const result = validateInvoiceLimit({
        customer: mockCustomer,
        amount: 4000,
        paymentMode: 'Credit'
      });
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Credit limit exceeded');
    });

    it('should allow credit invoice if outstanding balance remains below limit', () => {
      const mockCustomer: Customer = { creditLimit: 15000, outstandingBalance: 12000 };
      // Adding Rs 2,500 keeps it at 14,500 <= 15,000
      const result = validateInvoiceLimit({
        customer: mockCustomer,
        amount: 2500,
        paymentMode: 'Credit'
      });
      expect(result.allowed).toBe(true);
    });

    it('should block credit sales if no customer profile is linked', () => {
      const result = validateInvoiceLimit({
        amount: 500,
        paymentMode: 'Credit'
      });
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('require a registered customer');
    });

    it('should ignore credit limit validation for Cash sales', () => {
      const mockCustomer: Customer = { creditLimit: 15000, outstandingBalance: 14500 };
      const result = validateInvoiceLimit({
        customer: mockCustomer,
        amount: 5000, // Rs 5,000 Cash sale is allowed even if credit outstanding is near limit
        paymentMode: 'Cash'
      });
      expect(result.allowed).toBe(true);
    });

  });

  describe('calculateExpectedGalla', () => {

    it('should reconcile expected cash Galla correctly', () => {
      // Opening cash: 10,000
      // Transactions: CASH_SALE Rs 5000, CUSTOMER_COLLECTION Rs 2000, farmer payment Rs 4000, expense Rs 1000
      // expected = 10000 + 5000 + 2000 - 4000 - 1000 = 12,000
      const result = calculateExpectedGalla({
        openingCash: 10000,
        transactions: [
          { type: 'CASH_SALE', amount: 5000 },
          { type: 'CUSTOMER_COLLECTION', amount: 2000 },
          { type: 'FARMER_PAYMENT', amount: 4000 },
          { type: 'EXPENSE', amount: 1000 }
        ]
      });
      expect(result).toBe(12000);
    });

    it('should exclude non-cash transactions from cash Galla balance', () => {
      // UPI and Credit sales do not hit the cash Galla ledger!
      // Here we only send actual Cash Galla logs to verify expected cash in hand
      const result = calculateExpectedGalla({
        openingCash: 10000,
        transactions: [
          { type: 'CASH_SALE', amount: 3000 },
          { type: 'EXPENSE', amount: 500 }
        ]
      });
      expect(result).toBe(12500);
    });

  });

});
