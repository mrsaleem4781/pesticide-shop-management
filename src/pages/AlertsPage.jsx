import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { Edit } from 'lucide-react';

export default function AlertsPage({ openModal, showNotification }) {
  const [tab, setTab] = useState('low-stock');

  // low stock
  const [lowItems, setLowItems] = useState([]);
  const [lowPage, setLowPage] = useState(1);
  const [lowLimit] = useState(20);
  const [lowTotal, setLowTotal] = useState(0);
  const [loadingLow, setLoadingLow] = useState(false);

  // near expiry
  const [expiryItems, setExpiryItems] = useState([]);
  const [expiryPage, setExpiryPage] = useState(1);
  const [expiryLimit] = useState(20);
  const [expiryTotal, setExpiryTotal] = useState(0);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [nearExpiryDays, setNearExpiryDays] = useState(30);

  useEffect(() => {
    fetchLowStock();
    fetchExpiry();

    const onDataChanged = () => { fetchLowStock(1); fetchExpiry(1); };
    window.addEventListener('data-changed', onDataChanged);
    return () => window.removeEventListener('data-changed', onDataChanged);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        const s = res.data || {};
        const d = typeof s.nearExpiryDays === 'number' ? s.nearExpiryDays : 30;
        setNearExpiryDays(Math.max(1, d));
      } catch (_) {}
    };
    fetchSettings();
    const onSettingsChanged = () => fetchSettings();
    window.addEventListener('settings-changed', onSettingsChanged);
    return () => window.removeEventListener('settings-changed', onSettingsChanged);
  }, []);

  useEffect(() => {
    // If URL contains ?tab=near-expiry, switch tab
    const params = new URLSearchParams(window.location.search);
    const qtab = params.get('tab');
    if (qtab === 'near-expiry') setTab('near-expiry');
  }, []);

  const fetchLowStock = async (page = lowPage) => {
    try {
      setLoadingLow(true);
      const res = await api.get('/alerts/low-stock', { params: { page, limit: lowLimit } });
      setLowItems(res.data.data || []);
      setLowPage(res.data.page || page);
      setLowTotal(res.data.total || (res.data.data || []).length);
    } catch (err) {
      showNotification && showNotification('Failed to load low stock items', 'error');
    } finally {
      setLoadingLow(false);
    }
  };

  const fetchExpiry = async (page = expiryPage) => {
    try {
      setLoadingExpiry(true);
      const res = await api.get('/alerts/near-expiry', { params: { page, limit: expiryLimit, days: nearExpiryDays } });
      setExpiryItems(res.data.data || []);
      setExpiryPage(res.data.page || page);
      setExpiryTotal(res.data.total || (res.data.data || []).length);
    } catch (err) {
      showNotification && showNotification('Failed to load near-expiry items', 'error');
    } finally {
      setLoadingExpiry(false);
    }
  };

  const openEdit = (product) => {
    // open the AddModal in edit mode (App's openModal supports isEdit + data)
    if (openModal) openModal('product', true, product);
  };

  const renderProductRow = (p) => (
    <div key={p._id || p.id} className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
      <div>
        <div className="font-semibold text-gray-800">{p.name}</div>
        <div className="text-sm text-gray-500">{p.category} • {p.supplier}</div>
        {p.batchRef && <div className="text-sm text-gray-400">Batch: {p.batchRef}</div>}
        {p.invoiceRef && <div className="text-sm text-gray-400">Invoice: {p.invoiceRef}</div>}
      </div>
      <div className="text-right">
        <div className="text-sm text-gray-500">Remaining</div>
        <div className="font-bold text-lg">{p.remainingQuantity ?? p.stock}</div>
        {p.expiryDate && <div className="text-xs text-red-600">Exp: {new Date(p.expiryDate).toLocaleDateString()}</div>}
        <div className="mt-2 flex justify-end gap-2">
          <button onClick={() => openEdit(p)} className="px-3 py-1 rounded bg-blue-50 text-blue-600 flex items-center gap-2">
            <Edit className="w-4 h-4" /> Edit
          </button>
          <Link to={`/products`} className="px-3 py-1 rounded bg-gray-100 text-gray-700">View</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Alerts & Notifications</h2>
        <p className="text-gray-600">Manage low stock and expiring products.</p>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('low-stock')} className={`px-4 py-2 rounded ${tab === 'low-stock' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Low Stock</button>
        <button onClick={() => setTab('near-expiry')} className={`px-4 py-2 rounded ${tab === 'near-expiry' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Near Expiry</button>
      </div>

      {tab === 'low-stock' && (
        <div>
          <h3 className="text-lg font-bold mb-4">Low Stock Products</h3>
          {loadingLow ? <div>Loading...</div> : (
            <div className="grid gap-4">
              {lowItems.map(renderProductRow)}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">{lowTotal} total</div>
            <div className="flex gap-2">
              <button disabled={lowPage <=1} onClick={() => { const np = lowPage-1; setLowPage(np); fetchLowStock(np); }} className="px-3 py-1 bg-gray-100 rounded">Previous</button>
              <button disabled={lowPage*lowLimit >= lowTotal} onClick={() => { const np = lowPage+1; setLowPage(np); fetchLowStock(np); }} className="px-3 py-1 bg-gray-100 rounded">Next</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'near-expiry' && (
        <div>
          <h3 className="text-lg font-bold mb-4">Near-Expiry Products</h3>
          {loadingExpiry ? <div>Loading...</div> : (
            <div className="grid gap-4">
              {expiryItems.map(renderProductRow)}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">{expiryTotal} total</div>
            <div className="flex gap-2">
              <button disabled={expiryPage <=1} onClick={() => { const np = expiryPage-1; setExpiryPage(np); fetchExpiry(np); }} className="px-3 py-1 bg-gray-100 rounded">Previous</button>
              <button disabled={expiryPage*expiryLimit >= expiryTotal} onClick={() => { const np = expiryPage+1; setExpiryPage(np); fetchExpiry(np); }} className="px-3 py-1 bg-gray-100 rounded">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
