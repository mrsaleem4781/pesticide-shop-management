import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Download } from 'lucide-react';
import api from '../services/api';
import DeleteModal from '../components/DeleteModal';
import EditModal from '../components/EditModal';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function SalesPage({ openModal, showNotification }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  useEffect(() => {
    fetchSales();

    const onDataChanged = () => fetchSales();
    window.addEventListener('data-changed', onDataChanged);
    return () => window.removeEventListener('data-changed', onDataChanged);
  }, [page, search]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sales', { params: { page, limit, search } });
      const payload = response.data;
      const salesList = Array.isArray(payload.data) ? payload.data : [];
      const totalCount = payload.total || 0;

      // Backend now populates invoice data directly
      setSales(salesList);
      setTotal(totalCount);
      setLoading(false);
    } catch (error) {
      showNotification('Failed to load sales records', 'error');
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Sales Report", 14, 16);
    
    const tableColumn = ["Date", "Customer", "Product", "Quantity", "Total (Rs)", "Invoice", "Balance (Rs)", "Status"];
    const tableRows = sales.map(sale => [
      sale.date ? new Date(sale.date).toLocaleDateString('en-GB') : '-',
      sale.customer,
      sale.product,
      sale.quantity,
      sale.total?.toLocaleString(),
      sale.invoice ? sale.invoice.invoiceNumber : '-',
      sale.invoice ? (sale.invoice.remainingBalance?.toLocaleString() ?? 0) : '-',
      sale.status
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.save("sales_report.pdf");
  };

  const exportExcel = () => {
    const workSheet = XLSX.utils.json_to_sheet(sales.map(sale => ({
      Date: sale.date ? new Date(sale.date).toLocaleDateString('en-GB') : '-',
      Customer: sale.customer,
      Product: sale.product,
      Quantity: sale.quantity,
      Total: sale.total,
      Invoice: sale.invoice ? sale.invoice.invoiceNumber : '-',
      Balance: sale.invoice ? (sale.invoice.remainingBalance ?? 0) : '-',
      Status: sale.status
    })));
    
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Sales");
    XLSX.writeFile(workBook, "sales_report.xlsx");
  };

  const openDeleteModal = (sale) => {
    setSaleToDelete(sale);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (saleToDelete) {
      try {
        await api.delete(`/sales/${saleToDelete._id || saleToDelete.id}`);
        showNotification('Sale record deleted successfully');
        setDeleteModalOpen(false);
        setSaleToDelete(null);
        fetchSales(); // ✅ NO window.location.reload()
      } catch (error) {
        showNotification('Failed to delete sale record', 'error');
      }
    }
  };

  const openEditModal = (sale) => {
    setItemToEdit(sale);
    setEditModalOpen(true);
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Loading sales records...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sales Records</h2>
        <div className="flex items-center gap-2">
          <input
            placeholder="Search sale or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2"
          />
          <button
            onClick={exportPDF}
            className="bg-red-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-medium"
            title="Export PDF"
          >
            <Download className="w-5 h-5" />
            PDF
          </button>
          <button
            onClick={exportExcel}
            className="bg-green-500 text-white px-4 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-medium"
            title="Export Excel"
          >
            <Download className="w-5 h-5" />
            Excel
          </button>
          <button
            onClick={() => openModal('sale')} // 
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Sale
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Product</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Quantity</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total (Rs)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Invoice</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Balance (Rs)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Payment Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale._id || sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-600">{sale.date ? new Date(sale.date).toLocaleDateString('en-GB') : '-'}</td>
                  <td className="px-6 py-4 text-gray-800 font-medium">{sale.customer}</td>
                  <td className="px-6 py-4 text-gray-800">{sale.product}</td>
                  <td className="px-6 py-4 text-gray-800">{sale.quantity}</td>
                  <td className="px-6 py-4 text-gray-800 font-semibold">{sale.total?.toLocaleString()}</td>

                  {/* Invoice info */}
                  <td className="px-6 py-4 text-blue-600 font-medium">
                    {sale.invoice ? (
                      <a href={`/invoices/${sale.invoice._id || sale.invoice.id || sale.invoice}`} className="hover:underline">{sale.invoice.invoiceNumber || 'N/A'}</a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-gray-800 font-medium">{sale.invoice ? (sale.invoice.remainingBalance?.toLocaleString() ?? 0) : '-'}</td>
                  <td className="px-6 py-4 text-gray-700">{sale.invoice ? sale.invoice.paymentStatus : '-'}</td>

                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {sale.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(sale)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(sale)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {!sale.invoice && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await api.post(`/invoices/from-sale/${sale._id}`);
                              showNotification('Invoice created');
                              // refresh list to show invoice fields
                              fetchSales();
                              // optionally navigate to invoice view
                              window.location.href = `/invoices/${res.data._id}`;
                            } catch (err) {
                              showNotification('Failed to create invoice', 'error');
                            }
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
                          title="Generate Invoice"
                        >
                          Invoice
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">Total: {total}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 border rounded">Prev</button>
          <button disabled={(page * limit) >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded">Next</button>
        </div>
      </div>

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        itemName={`Sale of ${saleToDelete?.product || 'Item'} (Rs ${saleToDelete?.total || 0})`}
      />

      <EditModal
        show={editModalOpen}
        onClose={() => { setEditModalOpen(false); fetchSales(); }}
        modalType="sale"
        itemData={itemToEdit}
        showNotification={showNotification}
      />
    </div>
  );
}