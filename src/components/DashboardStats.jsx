import React from 'react';
import { Package, DollarSign, Users, AlertCircle } from 'lucide-react';

export default function DashboardStats({ products, totalRevenue, customers, lowStockProducts }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-white/20 p-3 rounded-xl"><Package className="w-6 h-6" /></div>
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Total</span>
        </div>
        <h3 className="text-3xl font-bold mb-2">{products.length}</h3>
        <p className="text-blue-100 text-sm">Products in Stock</p>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-white/20 p-3 rounded-xl"><DollarSign className="w-6 h-6" /></div>
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Monthly</span>
        </div>
        <h3 className="text-3xl font-bold mb-2">Rs {totalRevenue.toLocaleString()}</h3>
        <p className="text-green-100 text-sm">Total Revenue</p>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-white/20 p-3 rounded-xl"><Users className="w-6 h-6" /></div>
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Active</span>
        </div>
        <h3 className="text-3xl font-bold mb-2">{customers.length}</h3>
        <p className="text-purple-100 text-sm">Total Customers</p>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="bg-white/20 p-3 rounded-xl"><AlertCircle className="w-6 h-6" /></div>
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Alert</span>
        </div>
        <h3 className="text-3xl font-bold mb-2">{typeof lowStockProducts === 'number' ? lowStockProducts : (lowStockProducts || []).length}</h3>
        <p className="text-orange-100 text-sm">Low Stock Items</p>
      </div>
    </div>
  );
}