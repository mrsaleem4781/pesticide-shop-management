import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // agar error aaye to '../services/api' try kar lena

export default function AddModal({ show, onClose, modalType, showNotification, editMode = false, editData = null }) {
  const [formData, setFormData] = useState({});
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Invoice related state for sale modal
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [discountType, setDiscountType] = useState('none'); // none | percent | fixed
  const [discountValue, setDiscountValue] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);


  const [invoicePreview, setInvoicePreview] = useState({ subtotal: 0, total: 0, remaining: 0 });

  // Payment metadata for invoices
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  // Searchable inputs for large lists
  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  // Edit mode mein data fill kar do
  useEffect(() => {
    if (show) {
      if (editMode && editData) {
        // Normalize expiry date for date input (yyyy-mm-dd)
        const data = { ...editData };
        if (data.expiryDate) data.expiryDate = new Date(data.expiryDate).toISOString().slice(0,10);
        setFormData(data);
      } else {
        setFormData({});
      }
    }
  }, [show, editMode, editData]);

  // Sale ke liye dropdowns load karo
  useEffect(() => {
    if (show && modalType === 'sale') {
      const loadOptions = async () => {
        try {
          const [prodRes, custRes] = await Promise.all([
            api.get('/products'),
            api.get('/customers')
          ]);

          const prodPayload = prodRes.data;
          const productsList = Array.isArray(prodPayload)
            ? prodPayload
            : (prodPayload && Array.isArray(prodPayload.data) ? prodPayload.data : []);

          const custPayload = custRes.data;
          const customersList = Array.isArray(custPayload)
            ? custPayload
            : (custPayload && Array.isArray(custPayload.data) ? custPayload.data : []);

          setProducts(productsList);
          setCustomers(customersList);

          // reset invoice options when opening sale modal (default: generate invoice)
          setGenerateInvoice(true);
          setDiscountType('none');
          setDiscountValue(0);
          setAdvancePaid(0);
          // Default payment method to Cash for simpler UX
          setPaymentMethod('Cash');
          setPaymentReference('');
          setInvoicePreview({ subtotal: 0, total: 0, remaining: 0 });

          // Ensure default customer is Walked-in if none selected
          setFormData(prev => ({ ...prev, customer: prev.customer || 'Walked-in' }));
        } catch (err) {
          console.log('Dropdown load nahi hua');
        }
      };
      loadOptions();
    }
  }, [show, modalType]);

  // Recompute invoice preview when product/quantity/discount/advance change
  useEffect(() => {
    if (modalType !== 'sale') return;
    const selectedProduct = products.find(p => p.name === formData.product);
    const subtotal = selectedProduct && formData.quantity ? (selectedProduct.price * formData.quantity) : 0;
    let total = subtotal;
    if (discountType === 'percent') total = total - (total * (Number(discountValue) / 100));
    else if (discountType === 'fixed') total = total - Number(discountValue || 0);
    total = Math.max(0, total);

    const selectedCustomer = customers.find(c => c.name === formData.customer);
    const customerBalance = selectedCustomer ? Number(selectedCustomer.remainingBalance || 0) : 0;

    const effectiveAdvance = Number(advancePaid || 0);
    // Total due combines previous balance and current invoice total
    const totalDue = Math.max(0, total + customerBalance);
    // Remaining after payment (applies to whole outstanding amount)
    const remaining = Math.max(0, totalDue - effectiveAdvance);

    setInvoicePreview({ subtotal, total, totalDue, remaining, customerBalance, effectiveAdvance });
  }, [formData.product, formData.quantity, discountType, discountValue, advancePaid, products, modalType, customers]);

  // Derived filtered lists for typeahead (limited to top 10 suggestions)
  const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(c => (c.name || '').toLowerCase().includes((customerQuery || (formData.customer || '')).toLowerCase())).slice(0, 10);
  const filteredProducts = (Array.isArray(products) ? products : []).filter(p => (p.name || '').toLowerCase().includes((productQuery || (formData.product || '')).toLowerCase())).slice(0, 10);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      let endpoint = '/';
      let method = 'post';

      if (modalType === 'product') endpoint = 'products';
      if (modalType === 'customer') endpoint = 'customers';
      if (modalType === 'sale') endpoint = 'sales';

      let dataToSend = { ...formData };

      // Basic validation
      if (!['product', 'customer', 'sale'].includes(modalType)) {
        showNotification && showNotification('Invalid form type', 'error');
        setLoading(false);
        return;
      }

      // Normalize numeric fields to numbers (avoid sending empty strings)
      if (modalType === 'product') {
        dataToSend.stock = Number(dataToSend.stock || 0);
        dataToSend.price = Number(dataToSend.price || 0);
        dataToSend.reorderLevel = Number(dataToSend.reorderLevel || 0);
      }

      if (modalType === 'sale') {
        dataToSend.quantity = Number(dataToSend.quantity || 0);
        const selectedProduct = products.find(p => p.name === formData.product);
        if (selectedProduct && dataToSend.quantity) {
          dataToSend.total = Number(selectedProduct.price || 0) * dataToSend.quantity;
        } else {
          dataToSend.total = Number(dataToSend.total || 0);
        }
        dataToSend.date = new Date().toISOString();
        dataToSend.status = 'Completed';

        // If invoice generation requested, pass options to server so it can create atomically
        if (generateInvoice) {
          // UX improvement: if user entered an advance but didn't select a method, default to 'Cash' (simpler flow)
          if (Number(advancePaid || 0) > 0 && !paymentMethod) {
            showNotification && showNotification('No payment method selected — defaulting to Cash', 'info');
            dataToSend.paymentMethod = 'Cash';
          } else {
            dataToSend.paymentMethod = paymentMethod;
          }

          dataToSend.createInvoice = true;
          dataToSend.discountType = discountType;
          dataToSend.discountValue = Number(discountValue || 0);
          dataToSend.advancePaid = Number(advancePaid || 0);
          dataToSend.paymentReference = paymentReference;
        }
      }

      // Normalize expiryDate for product payload (convert yyyy-mm-dd to ISO) or null
      if (modalType === 'product') {
        if (formData.expiryDate) dataToSend.expiryDate = new Date(formData.expiryDate).toISOString();
        else dataToSend.expiryDate = null;
      }

      if (editMode && editData?._id) {
        method = 'put';
        endpoint = `${endpoint}/${editData._id}`;
      }

      if (method === 'post') {
        // Create the resource - if sale + invoice requested, create sale then invoice
        const res = await api.post(endpoint, dataToSend);
        console.debug('[AddModal] Sale create response', res.data);

        if (modalType === 'sale' && generateInvoice) {
          const saleId = res.data._id || res.data.id;
          // Server may have auto-created the invoice and attached invoiceId
          const invoiceId = res.data.invoiceId;
          if (invoiceId) {
            showNotification('Sale and invoice created successfully');
            window.location.href = `/invoices/${invoiceId}`;
            return;
          }

          // If no saleId we can't create invoice automatically
          if (!saleId) {
            console.error('[AddModal] No sale id returned; cannot create invoice');
            showNotification('Sale saved but invoice generation failed (missing sale id)', 'error');
          } else {
            // Fallback: try create invoice explicitly if server did not auto-create
            try {
              const invRes = await api.post(`/invoices/from-sale/${saleId}`, {
                discountType,
                discountValue,
                advancePaid,
                paymentMethod: dataToSend.paymentMethod || '',
                paymentReference
              });
              console.debug('[AddModal] Fallback invoice create response', invRes.data);
              if (invRes && invRes.data && (invRes.data._id || invRes.data.id)) {
                showNotification('Sale and invoice created successfully');
                window.location.href = `/invoices/${invRes.data._id || invRes.data.id}`;
                return;
              }
              showNotification('Sale saved but invoice creation returned unexpected response', 'error');
            } catch (err) {
              console.error('Invoice creation failed', err);
              showNotification('Sale saved but invoice creation failed', 'error');
            }
          }
        }
      } else {
        await api.put(endpoint, dataToSend);
      }

      showNotification(`${modalType} ${editMode ? 'updated' : 'added'} successfully!`);
      onClose();
      // Dispatch a lightweight event so open pages can re-fetch data without full reload
      window.dispatchEvent(new Event('data-changed'));
    } catch (error) {
      console.error('Error:', error.response || error);
      const msg = error && error.response && (error.response.data && (error.response.data.message || error.response.data.error)) ? (error.response.data.message || error.response.data.error) : 'Error saving data';
      showNotification && showNotification(msg, 'error');
      setLoading(false);
    }
  };

  if (!show) return null;

  const modalSizeClass = modalType === 'sale' ? 'max-w-4xl' : 'max-w-2xl';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl p-8 w-full shadow-2xl ${modalSizeClass}`}>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {editMode ? 'Edit' : 'Add New'} {modalType ? (modalType.charAt(0).toUpperCase() + modalType.slice(1)) : ''}
        </h2>
        <div className="space-y-4">

          {modalType === 'product' && (
            <>
              <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Product Name" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="text" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Category" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="number" value={formData.stock ?? ''} onChange={e => setFormData({...formData, stock: e.target.value === '' ? '' : Number(e.target.value)})} placeholder="Stock Quantity" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="number" value={formData.price ?? ''} onChange={e => setFormData({...formData, price: e.target.value === '' ? '' : Number(e.target.value)})} placeholder="Price (Rs)" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="text" value={formData.supplier || ''} onChange={e => setFormData({...formData, supplier: e.target.value})} placeholder="Supplier" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="number" value={formData.reorderLevel ?? ''} onChange={e => setFormData({...formData, reorderLevel: e.target.value === '' ? '' : Number(e.target.value)})} placeholder="Reorder Level" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="date" value={formData.expiryDate || ''} onChange={e => setFormData({...formData, expiryDate: e.target.value})} placeholder="Expiry Date (optional)" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
            </>
          )}

          {modalType === 'customer' && (
            <>
              <input type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Customer Name" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" />
              <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Phone Number" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" />
              <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Address" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" />
            </>
          )}

          {modalType === 'sale' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <div className="text-sm font-medium text-gray-700 mb-1">Customer</div>
                      <input
                        type="text"
                        value={customerQuery || formData.customer || ''}
                        onChange={e => { setCustomerQuery(e.target.value); setShowCustomerSuggestions(true); }}
                        onFocus={() => setShowCustomerSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 150)}
                        placeholder="Search or select customer"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                      />

                      {showCustomerSuggestions && filteredCustomers.length > 0 && (
                        <ul className="absolute left-0 right-0 bg-white border border-gray-200 mt-1 rounded-xl shadow z-50 max-h-56 overflow-auto">
                          {filteredCustomers.map(c => (
                            <li key={c._id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onMouseDown={() => { setFormData({...formData, customer: c.name}); setCustomerQuery(c.name); setShowCustomerSuggestions(false); }}>
                              <div className="font-semibold text-gray-900">{c.name}</div>
                              <div className="text-xs text-gray-500">{c.phone || ''}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-sm font-medium text-gray-700">Customer Balance</div>
                      <div className="mt-1 text-2xl font-bold text-red-600">
                        Rs {(() => {
                          const c = Array.isArray(customers) ? customers.find(x => x.name === formData.customer) : null;
                          return c ? (c.remainingBalance?.toLocaleString() || 0) : 0;
                        })()}
                      </div>
                      {formData.customer && (
                        <div className="mt-2 text-xs text-gray-500">Previous balance displayed — it will not be auto-applied to this invoice.</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <div className="text-sm font-medium text-gray-700 mb-1">Product</div>
                      <input
                        type="text"
                        value={productQuery || formData.product || ''}
                        onChange={e => { setProductQuery(e.target.value); setShowProductSuggestions(true); }}
                        onFocus={() => setShowProductSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowProductSuggestions(false), 150)}
                        placeholder="Search or select product"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                      />

                      {showProductSuggestions && filteredProducts.length > 0 && (
                        <ul className="absolute left-0 right-0 bg-white border border-gray-200 mt-1 rounded-xl shadow z-50 max-h-56 overflow-auto">
                          {filteredProducts.map(p => (
                            <li key={p._id} className="px-3 py-2 hover:bg-gray-50 cursor-pointer" onMouseDown={() => { setFormData({...formData, product: p.name}); setProductQuery(p.name); setShowProductSuggestions(false); }}>
                              <div className="font-semibold text-gray-900">{p.name}</div>
                              <div className="text-xs text-gray-500">Rs {p.price?.toLocaleString()}</div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Quantity</div>
                      <input
                        type="number"
                        value={formData.quantity ?? ''}
                        onChange={e => setFormData({...formData, quantity: e.target.value === '' ? '' : Number(e.target.value)})}
                        placeholder="Quantity"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Invoice options */}
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={generateInvoice} onChange={e => setGenerateInvoice(e.target.checked)} />
                        <span className="text-sm font-medium text-gray-800">Generate invoice</span>
                      </label>
                      <div className="text-sm text-gray-600">Subtotal: Rs {invoicePreview.subtotal?.toLocaleString() || 0}</div>
                    </div>

                    {generateInvoice && (
                      <>
                        {/* Payment fields - always visible */}
                        <div className="mt-4 space-y-3">
                          <div className="text-sm font-semibold text-gray-800">Payment</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input type="number" min="0" value={advancePaid} onChange={e => setAdvancePaid(e.target.value === '' ? 0 : Number(e.target.value))} className="border rounded-xl px-3 py-2 w-full bg-white" placeholder="Paid now (optional)" />
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="border rounded-xl px-3 py-2 w-full bg-white">
                              <option value="">Payment method (optional)</option>
                              <option value="Cash">Cash</option>
                              <option value="Card">Card</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="EasyPaisa">EasyPaisa</option>
                              <option value="JazzCash">JazzCash</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Payment reference (optional)" className="border rounded-xl px-3 py-2 w-full bg-white" />
                        </div>

                        {/* Discount - collapsible */}
                        <details className="mt-4 rounded-xl border border-gray-200 bg-gray-50">
                          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-gray-800">
                            Discount (optional)
                          </summary>
                          <div className="px-4 pb-4 pt-2 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="border rounded-xl px-3 py-2 w-full bg-white">
                                <option value="none">No discount</option>
                                <option value="percent">Discount (%)</option>
                                <option value="fixed">Discount (Rs)</option>
                              </select>
                              <input type="number" min="0" value={discountValue} onChange={e => setDiscountValue(e.target.value === '' ? 0 : Number(e.target.value))} className="border rounded-xl px-3 py-2 w-full bg-white" placeholder="Discount value" />
                            </div>
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="text-sm font-semibold text-gray-800 mb-3">Summary</div>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex justify-between"><span>Subtotal</span><span>Rs {invoicePreview.subtotal?.toLocaleString() || 0}</span></div>
                      <div className="flex justify-between"><span>Invoice Only</span><span className="font-semibold text-gray-900">Rs {invoicePreview.total?.toLocaleString() || 0}</span></div>
                      <div className="flex justify-between"><span>Previous Balance</span><span>Rs {invoicePreview.customerBalance?.toLocaleString() || 0}</span></div>
                      <div className="flex justify-between"><span>Grand Total</span><span>Rs {invoicePreview.totalDue?.toLocaleString() || 0}</span></div>
                      <div className="flex justify-between"><span>Paid Now</span><span>Rs {Number(advancePaid || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Remaining Due</span><span className="font-semibold text-red-700">Rs {invoicePreview.remaining?.toLocaleString() || 0}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : editMode ? 'Update' : 'Save'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}