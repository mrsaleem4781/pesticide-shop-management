import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import api from '../services/api';
import DeleteModal from '../components/DeleteModal';
import EditModal from '../components/EditModal';

export default function CustomersPage({ openModal, showNotification }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    fetchCustomers();

    const onDataChanged = () => fetchCustomers();
    window.addEventListener('data-changed', onDataChanged);
    return () => window.removeEventListener('data-changed', onDataChanged);
  }, [page, search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/customers', { params: { page, limit, search } });
      const payload = response.data;
      const list = Array.isArray(payload.data) ? payload.data : [];
      setCustomers(list);
      setTotal(payload.total || 0);
      setLoading(false);
    } catch (error) {
      showNotification('Failed to load customers', 'error');
      setLoading(false);
    }
  };

  // Search / Filters for customers
  const [searchTerm, setSearchTerm] = useState('');
  const [minPurchases, setMinPurchases] = useState('0');

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const matches = (c.name || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q);
      if (!matches) return false;
    }

    const min = Number(minPurchases) || 0;
    if ((c.totalPurchases || 0) < min) return false;

    return true;
  });

  // Delete Functions
  const openDeleteModal = (customer) => {
    setCustomerToDelete(customer);
    setDeleteModalOpen(true);
  };

  // Open modern payment modal
  const recordPayment = (customer) => {
    setPaymentCustomer(customer);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentRef('');
    setPaymentModalOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!paymentCustomer) return;
    const amount = Number(paymentAmount || 0);
    if (!amount || amount <= 0) return showNotification('Enter a valid amount', 'error');
    try {
      await api.post(`/customers/${paymentCustomer._id || paymentCustomer.id}/pay`, { amount, method: paymentMethod, reference: paymentRef });
      showNotification('Payment recorded');
      setPaymentModalOpen(false);
      setPaymentCustomer(null);
      fetchCustomers();
      window.dispatchEvent(new Event('data-changed'));
    } catch (err) {
      console.error('Payment failed', err);
      showNotification('Failed to record payment', 'error');
    }
  };

  const handleDelete = async () => {
    if (customerToDelete) {
      try {
        await api.delete(`/customers/${customerToDelete._id || customerToDelete.id}`);
        showNotification('Customer deleted successfully');
        setDeleteModalOpen(false);
        setCustomerToDelete(null);
        fetchCustomers();
      } catch (error) {
        showNotification('Failed to delete customer', 'error');
      }
    }
  };

  // NEW: Edit Functions
  const openEditModal = (customer) => {
    setItemToEdit(customer);
    setEditModalOpen(true);
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Loading customers...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Customers</h2>
          <p className="text-gray-500">Manage client profiles, balances and payments</p>
        </div>
        <button
          onClick={() => openModal('customer')}
          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              aria-label="Search customers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or address"
              className="w-full border rounded-lg pl-10 pr-3 py-2 focus:outline-none"
            />
          </div>
          <div className="flex gap-3 items-center">
            <input
              aria-label="Minimum purchases"
              type="number"
              min="0"
              value={minPurchases}
              onChange={(e) => setMinPurchases(e.target.value)}
              className="border rounded-lg px-3 py-2 w-32"
              placeholder="Min purchases"
            />
            <button
              onClick={() => { setSearch(''); setMinPurchases('0'); }}
              className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Clear
            </button>
            <div className="text-sm text-gray-500">{total} results</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer._id || customer.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{customer.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1 text-sm">
                    <span className="text-gray-600">{customer.phone}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{customer.address}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(customer)}
                  className="px-3 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openDeleteModal(customer)}
                  className="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-green-50 p-3">
                <div className="text-xs text-gray-500">Total Purchases</div>
                <div className="text-lg font-bold text-green-700">Rs {customer.totalPurchases?.toLocaleString() || 0}</div>
              </div>
              <div className={`rounded-lg p-3 ${Number(customer.remainingBalance || 0) > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <div className="text-xs text-gray-500">Remaining Balance</div>
                <div className={`text-lg font-bold ${Number(customer.remainingBalance || 0) > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                  Rs {customer.remainingBalance?.toLocaleString() || 0}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => recordPayment(customer)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Record Payment
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-500">Total: {total}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50">Prev</button>
          <button disabled={(page * limit) >= total} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* NEW: Dono modals <> fragment mein wrap kiye – no syntax error */}
      <>
        <DeleteModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
          itemName={customerToDelete?.name || 'Customer'}
        />

        <EditModal
  show={editModalOpen}
  onClose={() => { setEditModalOpen(false); fetchCustomers(); }}
  modalType="customer"
  itemData={itemToEdit}
  showNotification={showNotification}
/>

        {/* Payment Modal */}
        {paymentModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Record Payment</h2>
              <p className="text-sm text-gray-600 mb-6">Customer: <span className="font-semibold text-gray-800">{paymentCustomer?.name}</span></p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none bg-white"
                  >
                    <option>Cash</option>
                    <option>Bank Transfer</option>
                    <option>Easypaisa</option>
                    <option>JazzCash</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Reference (optional)</label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={e => setPaymentRef(e.target.value)}
                    placeholder="Txn ID or Note"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-6">
                <button
                  onClick={handleSubmitPayment}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg"
                >
                  Confirm
                </button>
                <button
                  onClick={() => { setPaymentModalOpen(false); setPaymentCustomer(null); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    </div>
  );
}
