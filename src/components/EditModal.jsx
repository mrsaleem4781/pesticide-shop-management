import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function EditModal({ show, onClose, modalType, itemData, showNotification }) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Jab modal khule, form ko existing data se fill kar do
  useEffect(() => {
    if (show && itemData) {
      const data = { ...itemData };
      if (data.expiryDate) data.expiryDate = new Date(data.expiryDate).toISOString().slice(0,10);
      setFormData(data);
    }
  }, [show, itemData]);

  // Sale ke liye dropdowns load karo
  useEffect(() => {
    if (show && modalType === 'sale') {
      const loadOptions = async () => {
        try {
          const [prodRes, custRes] = await Promise.all([
            api.get('/products'),
            api.get('/customers')
          ]);
          setProducts(prodRes.data);
          setCustomers(custRes.data);
        } catch (err) {
          console.log('Dropdown load nahi hua');
        }
      };
      loadOptions();
    }
  }, [show, modalType]);

  // Calculate total when product or quantity changes
  useEffect(() => {
    if (modalType === 'sale' && formData.product && formData.quantity && products.length > 0) {
      const selectedProduct = products.find(p => p.name === formData.product);
      if (selectedProduct) {
        const newTotal = selectedProduct.price * formData.quantity;
        // Only update if total has changed
        if (formData.total !== newTotal) {
          setFormData(prev => ({
            ...prev,
            total: newTotal
          }));
        }
      }
    }
  }, [formData.product, formData.quantity, modalType, products]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (modalType === 'product') endpoint = `/products/${itemData._id || itemData.id}`;
      if (modalType === 'customer') endpoint = `/customers/${itemData._id || itemData.id}`;
      if (modalType === 'sale') endpoint = `/sales/${itemData._id || itemData.id}`;

      if (!endpoint) {
        showNotification('Invalid modal type', 'error');
        setLoading(false);
        return;
      }

      // If editing a product and stock changed, adjust remainingQuantity to keep consistency
      const payload = { ...formData };
      if (modalType === 'product' && itemData) {
        const oldStock = Number(itemData.stock || 0);
        const newStock = Number(formData.stock || 0);
        const oldRemaining = (typeof itemData.remainingQuantity === 'number') ? itemData.remainingQuantity : oldStock;
        const delta = newStock - oldStock;
        // Apply delta to remainingQuantity so previous sales are respected
        payload.remainingQuantity = Math.max(0, (oldRemaining || 0) + delta);
      }

      await api.put(endpoint, payload);  // PUT for update
      showNotification(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} updated successfully!`);
      onClose();
      // notify other parts of the app to re-fetch updated data
      window.dispatchEvent(new Event('data-changed'));
    } catch (error) {
      showNotification('Error updating data', 'error');
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Edit {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
        </h2>

        <div className="space-y-4">
          {/* Product Edit Form */}
          {modalType === 'product' && (
            <>
              <input type="text" value={formData.name || ''} placeholder="Product Name" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="text" value={formData.category || ''} placeholder="Category" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setFormData({...formData, category: e.target.value})} />
              <input type="number" value={formData.stock || ''} placeholder="Stock Quantity" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
              <input type="number" value={formData.price || ''} placeholder="Price (Rs)" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
              <input type="text" value={formData.supplier || ''} placeholder="Supplier" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setFormData({...formData, supplier: e.target.value})} />
              <input type="number" value={formData.reorderLevel || ''} placeholder="Reorder Level" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setFormData({...formData, reorderLevel: Number(e.target.value)})} />
              <input type="date" value={formData.expiryDate || ''} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
            </>
          )}

          {/* Customer Edit Form */}
          {modalType === 'customer' && (
            <>
              <input type="text" value={formData.name || ''} placeholder="Customer Name" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="tel" value={formData.phone || ''} placeholder="Phone Number" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" onChange={e => setFormData({...formData, phone: e.target.value})} />
              <input type="text" value={formData.address || ''} placeholder="Address" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none" onChange={e => setFormData({...formData, address: e.target.value})} />
            </>
          )}

          {/* Sale Edit Form */}
          {modalType === 'sale' && (
            <>
              <select value={formData.customer || ''} onChange={e => setFormData({...formData, customer: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">Select Customer</option>
                {customers.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={formData.product || ''} onChange={e => setFormData({...formData, product: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">Select Product</option>
                {products.map(p => <option key={p._id} value={p.name}>{p.name}</option>)}
              </select>
              <input type="number" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} placeholder="Quantity" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" />
              <input type="date" value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" />
              <select value={formData.status || 'Completed'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none">
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
              {formData.total && (
                <div className="px-4 py-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Total: </span>
                  <span className="font-semibold text-gray-800">Rs {formData.total.toLocaleString()}</span>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg"
            >
              {loading ? 'Updating...' : 'Update'}
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