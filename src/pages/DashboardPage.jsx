import React, { useState, useEffect } from 'react';
import { Package, DollarSign, Users, AlertCircle, TrendingUp, ShoppingBag, ArrowRight, Plus } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../services/api';

export default function DashboardPage({ openModal }) {
  const [stats, setStats] = useState({
    productsCount: 0,
    totalRevenue: 0,
    customersCount: 0,
    lowStockCount: 0,
    salesChartData: [],
    recentSales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/stats');
      if (res && res.data) {
        setStats({
          productsCount: Number(res.data.totalProducts || 0),
          totalRevenue: Number(res.data.totalRevenue || 0),
          customersCount: Number(res.data.totalCustomers || 0),
          lowStockCount: Number(res.data.lowStockProducts || 0),
          nearExpiryCount: Number(res.data.nearExpiryCount || 0),
          salesChartData: res.data.salesChartData || [],
          recentSales: res.data.recentSales || []
        });
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back, here's what's happening today.</p>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Total Revenue" 
          value={`Rs ${stats.totalRevenue.toLocaleString()}`} 
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          color="bg-green-100"
          bg="bg-green-50"
          hoverBg="hover:bg-green-100"
          borderColor="border-green-200"
          trend="+12% from last month"
          trendUp={true}
        />
        <StatCard 
          title="Total Products" 
          value={stats.productsCount} 
          icon={<Package className="w-5 h-5 text-blue-600" />}
          color="bg-blue-100"
          bg="bg-blue-50"
          hoverBg="hover:bg-blue-100"
          borderColor="border-blue-200"
          trend="In Stock"
        />
        <StatCard 
          title="Total Customers" 
          value={stats.customersCount} 
          icon={<Users className="w-5 h-5 text-purple-600" />}
          color="bg-purple-100"
          bg="bg-purple-50"
          hoverBg="hover:bg-purple-100"
          borderColor="border-purple-200"
          trend="Active Clients"
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={stats.lowStockCount} 
          icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
          color="bg-orange-100"
          bg="bg-orange-50"
          hoverBg="hover:bg-orange-100"
          borderColor="border-orange-200"
          trend="Requires Attention"
          alert={stats.lowStockCount > 0}
        />
        <StatCard 
          title="Near-Expiry Alerts" 
          value={stats.nearExpiryCount} 
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          color="bg-red-100"
          bg="bg-red-50"
          hoverBg="hover:bg-red-100"
          borderColor="border-red-200"
          trend="Expiring Soon"
          alert={stats.nearExpiryCount > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              Sales Overview (Last 7 Days)
            </h3>
            {openModal && (
              <button
                onClick={() => openModal('sale')}
                className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-2xl hover:from-green-700 hover:to-green-600 transition-all ring-2 ring-green-300 shadow-lg shadow-green-300/40 hover:shadow-green-400/50 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
              >
                <Plus className="w-5 h-5" />
                New Sale
              </button>
            )}
          </div>
          <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" aspect={2} minWidth={0}>
              <AreaChart data={stats.salesChartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 12}}
                  tickFormatter={(value) => `Rs ${value/1000}k`}
                />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value) => [`Rs ${value.toLocaleString()}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-gray-500" />
              Recent Sales
            </h3>
            <a href="/sales" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </a>
          </div>
          
          <div className="space-y-4">
            {stats.recentSales.length > 0 ? (
              stats.recentSales.map((sale) => (
                <div key={sale._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
                      {sale.customer.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{sale.customer}</p>
                      <p className="text-xs text-gray-500">{sale.product} • Qty: {sale.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">Rs {sale.total.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{new Date(sale.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">No recent sales found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, bg, hoverBg, borderColor, trend, trendUp, alert }) {
  return (
    <div className={`${bg || 'bg-white'} ${hoverBg || ''} border ${borderColor || 'border-gray-200'} p-4 rounded-xl shadow-sm transition-colors duration-300 hover:shadow-md cursor-pointer min-w-[180px]`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-gray-600 text-xs font-medium mb-1">{title}</p>
          <h3 className="text-xl font-bold text-gray-800">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-[11px]">
          <span className={`font-medium ${alert ? 'text-orange-700' : (trendUp ? 'text-green-700' : 'text-gray-600')}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}
