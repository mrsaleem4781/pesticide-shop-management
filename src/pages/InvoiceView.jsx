import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { normalizeAssetUrl } from '../services/api';

// Dynamic company info from settings
const DEFAULT_COMPANY = {
  shopName: 'PestiShop Pro',
  address: '',
  contact: '',
  logoUrl: '/logo.svg'
};

function formatCurrency(amount, currency = 'PKR') {
  if (amount === undefined || amount === null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function InvoiceView({ showNotification }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const [customerInfo, setCustomerInfo] = useState(null);
  const [company, setCompany] = useState(DEFAULT_COMPANY);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await api.get(`/invoices/${id}`);
        console.log('Full API response:', res); // Debug full response
        console.log('Response data:', res.data); // Debug data only
        console.log('Response status:', res.status); // Debug status
        console.log('Response keys:', Object.keys(res.data || {})); // Debug object keys
        console.log('Response data type:', typeof res.data); // Debug data type
        console.log('Response data JSON:', JSON.stringify(res.data, null, 2)); // Debug JSON structure
        
        // Force state update with a small delay to ensure proper rendering
        setTimeout(() => {
          setInvoice(res.data);
          console.log('Invoice state set to:', res.data); // Debug state setting
        }, 100);
      } catch (err) {
        console.error('API Error:', err); // Debug error
        showNotification && showNotification('Failed to load invoice', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  // Load company settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const sres = await api.get('/settings');
        const s = sres.data || {};
        setCompany({
          shopName: s.shopName || DEFAULT_COMPANY.shopName,
          address: s.address || DEFAULT_COMPANY.address,
          contact: s.contact || DEFAULT_COMPANY.contact,
          logoUrl: normalizeAssetUrl(s.logoUrl || DEFAULT_COMPANY.logoUrl)
        });
      } catch (err) {
        // keep defaults
      }
    };
    loadSettings();
  }, []);

  // Fetch customer details if available (to show phone/address)
  useEffect(() => {
    const loadCustomer = async () => {
      if (!invoice || !invoice.customer) return;
      try {
        const res = await api.get('/customers');
        const customers = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.data) ? res.data.data : []);
        const c = customers.find(x => x.name === invoice.customer);
        if (c) setCustomerInfo(c);
      } catch (err) {
        // ignore - not critical
        console.debug('Could not fetch customer details for invoice view', err);
      }
    };
    loadCustomer();
  }, [invoice]);

  if (loading) return <div className="text-center py-10">Loading invoice...</div>;
  if (!invoice) return <div className="text-center py-10">Invoice not found</div>;

  const handlePrint = () => {
    window.print();
  };

  // Summary calculations (group taxes by label/rate)
  const currency = invoice.currency || 'PKR';
  const computedSubtotal = invoice.subtotal ?? (Array.isArray(invoice.items) ? invoice.items.reduce((s, it) => s + (it.total ?? (it.price * it.quantity || 0)), 0) : 0);
  const taxMap = {};
  (invoice.items || []).forEach((it) => {
    const lineAmount = it.total ?? (it.price * it.quantity || 0);
    let taxAmount = 0;
    let taxLabel = null;
    if (it.taxAmount !== undefined) {
      taxAmount = it.taxAmount;
      taxLabel = it.taxLabel || (typeof it.tax === 'number' ? `ST(${it.tax}%)` : 'Tax');
    } else if (it.taxRate !== undefined) {
      taxAmount = lineAmount * (it.taxRate || 0) / 100;
      taxLabel = it.taxLabel || `ST(${it.taxRate}%)`;
    } else if (it.tax !== undefined && typeof it.tax === 'number') {
      taxAmount = lineAmount * it.tax / 100;
      taxLabel = it.taxLabel || `ST(${it.tax}%)`;
    }
    if (taxAmount) taxMap[taxLabel || 'Tax'] = (taxMap[taxLabel || 'Tax'] || 0) + taxAmount;
  });
  const taxSummary = Object.entries(taxMap).map(([label, amount]) => ({ label, amount }));
  const taxesTotal = taxSummary.reduce((s, t) => s + t.amount, 0);
  const totalFromInvoice = invoice.total ?? (computedSubtotal - (invoice.discountValue || 0) + taxesTotal);

  const paidAmount = Number(invoice.advancePaid || 0);
  const amountDue = Number(
    invoice.remainingBalance ?? Math.max(0, Number(totalFromInvoice || 0) - paidAmount)
  );

  return (
    <div className="invoice-printable bg-white rounded-2xl p-8 shadow">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-start gap-4">
          <img src={company.logoUrl} alt={company.shopName} className="w-40 h-auto rounded" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = '/logo.svg'; }} />
          <div>
            <h3 className="text-xl font-semibold">{company.shopName}</h3>
            <div className="text-sm text-gray-600">{company.address}</div>
            <div className="text-sm text-gray-600">{company.contact ? `Phone: ${company.contact}` : ''}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-500">{new Date(invoice.date).toLocaleString()}</div>
          <h2 className="text-2xl font-bold mt-1">Invoice {invoice.invoiceNumber || 'N/A'}</h2>
          <div className="hidden">DEV — print styles applied</div>

          <div className="mt-3">
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded no-print">Print / Save PDF</button>
            <button onClick={() => navigate(-1)} className="ml-2 px-4 py-2 bg-gray-100 rounded no-print">Back</button>
          </div>

          {/* Quick payment action */}
          {invoice.remainingBalance > 0 && (
            <div className="mt-3 flex items-center justify-end gap-2 no-print">
              <input type="number" min="0" step="0.01" placeholder="Amount" className="px-3 py-2 border rounded" value={invoice._payAmount || ''} onChange={(e) => setInvoice({...invoice, _payAmount: e.target.value})} />
              <button onClick={async () => {
                const amt = Number(invoice._payAmount || 0);
                if (!amt || amt <= 0) { showNotification && showNotification('Enter a valid amount', 'error'); return; }
                try {
                  const res = await api.post(`/invoices/${invoice._id}/pay`, { amount: amt });
                  setInvoice(res.data);
                  showNotification && showNotification('Payment recorded');
                  window.dispatchEvent(new Event('data-changed'));
                } catch (err) {
                  console.error('Payment failed', err);
                  showNotification && showNotification('Payment failed', 'error');
                }
              }} className="px-3 py-2 bg-green-600 text-white rounded">Record Payment</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h4 className="font-semibold">Bill To</h4>
          <div className="text-sm font-semibold">{invoice.customer}</div>
          {customerInfo?.phone && <div className="text-sm">Phone: {customerInfo.phone}</div>}
          {customerInfo?.address && <div className="text-sm">Address: {customerInfo.address}</div>}
        </div>

        <div className="text-right">
          {/* Actions are available at the top (print / record payment) */}
        </div>
      </div>

      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="text-left bg-gray-50">
            <th className="px-4 py-2 text-sm font-semibold border border-gray-200">Product</th>
            <th className="px-4 py-2 text-sm font-semibold border border-gray-200 text-center">Qty</th>
            <th className="px-4 py-2 text-sm font-semibold border border-gray-200 text-right">Price</th>
            <th className="px-4 py-2 text-sm font-semibold border border-gray-200 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, idx) => (
            <tr key={idx}>
              <td className="px-4 py-3 border border-gray-200">{it.product}</td>
              <td className="px-4 py-3 border border-gray-200 text-center">{it.quantity}</td>
              <td className="px-4 py-3 border border-gray-200 text-right">{formatCurrency(it.price, invoice.currency || 'PKR')}</td>
              <td className="px-4 py-3 border border-gray-200 text-right">{formatCurrency(it.total, invoice.currency || 'PKR')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-96 border border-gray-200 rounded-xl p-4 bg-gray-50">
          <div className="text-center font-semibold mb-2">Invoice Summary</div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200"><td className="py-1">Subtotal</td><td className="py-1 text-right">{formatCurrency(computedSubtotal, currency)}</td></tr>
              {invoice.discountValue ? (<tr className="border-b border-gray-200"><td className="py-1">Discount ({invoice.discountType || 'fixed'})</td><td className="py-1 text-right">-{formatCurrency(invoice.discountValue, currency)}</td></tr>) : null}
              {taxSummary.map(t => (
                <tr key={t.label} className="border-b border-gray-200"><td className="py-1">{t.label}</td><td className="py-1 text-right">{formatCurrency(t.amount, currency)}</td></tr>
              ))}
              <tr className="border-b border-gray-200 font-semibold"><td className="py-2">Total</td><td className="py-2 text-right">{formatCurrency(totalFromInvoice, currency)}</td></tr>
              <tr className="border-b border-gray-200"><td className="py-1">Paid</td><td className="py-1 text-right">{formatCurrency(paidAmount, currency)}</td></tr>
              <tr className="font-semibold text-base"><td className="py-2">Amount Due (Payable)</td><td className="py-2 text-right text-red-700">{formatCurrency(amountDue, currency)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-left">
        <h4 className="font-semibold">Payment</h4>
        <div className="text-sm">Paid: {formatCurrency(paidAmount, currency)}</div>
        <div className="text-sm">Amount Due (Payable): {formatCurrency(amountDue, currency)}</div>
        <div className="text-sm mt-2">Status: <strong>{invoice.paymentStatus || 'N/A'}</strong></div>
        {invoice.paymentMethod && (
          <div className="text-sm">Payment Method: {invoice.paymentMethod}</div>
        )}
        {invoice.paymentReference && (
          <div className="text-sm">Payment Reference: {invoice.paymentReference}</div>
        )}

        {Array.isArray(invoice.paymentHistory) && invoice.paymentHistory.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-semibold">Payment History</div>
            {invoice.paymentHistory.map((p, i) => (
              <div key={i} className="text-sm">{new Date(p.date).toLocaleString()} — {formatCurrency(p.amount, currency)} {p.method ? ` — ${p.method}` : ''} {p.reference ? ` (${p.reference})` : ''}</div>
            ))}
          </div>
        )}

        <div className="mt-3">
          <h4 className="font-semibold">Customer Account</h4>
          <div className="text-sm">Previous Balance: {invoice.previousCustomerBalance !== undefined && invoice.previousCustomerBalance !== null ? formatCurrency(invoice.previousCustomerBalance, currency) : '-'}</div>
          <div className="text-sm">New Balance After Invoice: {invoice.newCustomerBalance !== undefined && invoice.newCustomerBalance !== null ? formatCurrency(invoice.newCustomerBalance, currency) : '-'}</div>
        </div>

        <div className="mt-6 text-sm text-gray-600 italic">This is a computerized generated invoice. No signature required.</div>
      </div>
    </div>
  );
}
