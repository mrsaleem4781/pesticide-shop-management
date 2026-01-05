import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import DeleteModal from '../components/DeleteModal';
import EditModal from '../components/EditModal';

export default function ProductsPage({ openModal, showNotification }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  useEffect(() => {
    fetchProducts();

    const onDataChanged = () => fetchProducts();
    window.addEventListener('data-changed', onDataChanged);
    return () => window.removeEventListener('data-changed', onDataChanged);
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      const payload = response.data;
      // support old array response or new paginated response { data, page, limit, total }
      const list = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.data) ? payload.data : []);
      setProducts(list);
      setLoading(false);
    } catch (error) {
      showNotification('Failed to load products', 'error');
      setLoading(false);
    }
  }; 

  // Search / Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('all'); // all | in | low

  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category || 'Uncategorized')));
    return ['All', ...cats];
  }, [products]);

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const matches = (p.name || '').toLowerCase().includes(q) || (p.supplier || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (selectedCategory !== 'All' && (p.category !== selectedCategory)) return false;

    if (stockFilter === 'in' && p.stock <= p.reorderLevel) return false;
    if (stockFilter === 'low' && p.stock > p.reorderLevel) return false;

    return true;
  });

  // Delete Functions
  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (productToDelete) {
      try {
        await api.delete(`/products/${productToDelete._id || productToDelete.id}`);
        showNotification('Product deleted successfully');
        setDeleteModalOpen(false);
        setProductToDelete(null);
        fetchProducts(); // refresh list
      } catch (error) {
        showNotification('Failed to delete product', 'error');
      }
    }
  };

  // Edit Functions (open local edit modal)
  const openEditModal = (item) => {
    setItemToEdit(item);
    setEditModalOpen(true);
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Loading products...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Products Inventory</h2>
        <button
          onClick={() => openModal('product')}
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all flex items-center gap-2 font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex gap-2 w-full md:w-1/2">
          <input
            aria-label="Search products"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products by name, supplier or category..."
            className="w-full border rounded-lg px-4 py-2 focus:outline-none"
          />
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setStockFilter('all'); }}
            className="px-3 py-2 bg-gray-100 rounded-lg"
          >
            Clear
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <select aria-label="Filter by category" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="border rounded-lg px-3 py-2">
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select aria-label="Filter by stock" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="all">All stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
          </select>

          <div className="text-sm text-gray-500">{filteredProducts.length} results</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Product Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Expiry Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Stock</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Price (Rs)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Supplier</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product._id || product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-800 font-medium">{product.name}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${product.stock <= product.reorderLevel ? 'text-red-600' : 'text-green-600'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-800 font-medium">{product.price?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600">{product.supplier}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(product)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dono modals <> mein wrapped – no syntax error */}
      <>
        <DeleteModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
          itemName={productToDelete?.name || 'Product'}
        />

        <EditModal
  show={editModalOpen}
  onClose={() => { setEditModalOpen(false); fetchProducts(); }}
  modalType="product"
  itemData={itemToEdit}
  showNotification={showNotification}
/>
      </>
    </div>
  );
}