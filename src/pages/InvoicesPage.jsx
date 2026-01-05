import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function InvoicesPage({ showNotification }) {
  const [invoices, setInvoices] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvoices();
  }, [page, search]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices', { params: { page, limit, search } });
      setInvoices(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      showNotification && showNotification('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Invoices Overview</h2>
        <div className="flex items-center gap-2">
          <input placeholder="Search invoice or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded px-3 py-2" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading invoices...</div>
      ) : (
        <div className="bg-white shadow rounded-lg p-4">
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No invoices yet</div>
          ) : (
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Invoice</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Total (Rs)</th>
                  <th className="py-2">Paid (Rs)</th>
                  <th className="py-2">Balance (Rs)</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id} className="border-b hover:bg-gray-50">
                    <td className="py-3">{inv.invoiceNumber}</td>
                    <td className="py-3">{inv.customer}</td>
                    <td className="py-3">{new Date(inv.date).toLocaleString()}</td>
                    <td className="py-3">Rs {inv.total?.toLocaleString()}</td>
                    <td className="py-3">Rs {inv.advancePaid?.toLocaleString()}</td>
                    <td className="py-3">Rs {inv.remainingBalance?.toLocaleString()}</td>
                    <td className="py-3">{inv.paymentStatus}</td>
                    <td className="py-3">
                      <button onClick={() => navigate(`/invoices/${inv._id}`)} className="px-3 py-1 rounded bg-gray-100">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">Total: {total}</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 border rounded">Prev</button>
              <button disabled={(page * limit) >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}