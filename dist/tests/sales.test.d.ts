interface Customer {
    creditLimit: number;
    outstandingBalance: number;
}
interface InvoiceInput {
    customer?: Customer;
    amount: number;
    paymentMode: 'Cash' | 'UPI' | 'Credit';
}
declare const validateInvoiceLimit: (input: InvoiceInput) => {
    allowed: boolean;
    message?: string;
};
interface GallaReconciliationInput {
    openingCash: number;
    transactions: {
        type: 'CASH_SALE' | 'CUSTOMER_COLLECTION' | 'FARMER_PAYMENT' | 'EXPENSE' | 'OTHER_IN' | 'OTHER_OUT';
        amount: number;
    }[];
}
declare const calculateExpectedGalla: (input: GallaReconciliationInput) => number;
