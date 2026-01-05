import React from 'react';
import { Link } from 'react-router-dom';

export default function LowStockAlert({ lowStockProducts }) {
  if (!lowStockProducts || lowStockProducts.length === 0) return null;

  return (
    <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-xl mb-8">
      <h3 className="text-lg font-bold text-orange-800 mb-2">Low Stock Alert!</h3>
      <p className="text-orange-700">
        {lowStockProducts.length} products are running low on stock. Please reorder soon.
      </p>
      <div className="mt-3">
        <Link to="/alerts?tab=low-stock" className="inline-block px-4 py-2 bg-orange-600 text-white rounded">View details</Link>
      </div>
    </div>
  );
}