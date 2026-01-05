import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { TrendingUp, Package, ShoppingCart, Users, Menu, X, Settings, LogOut } from 'lucide-react';

export default function Sidebar({ sidebarOpen, setSidebarOpen, menuItems, onLogout }) {
  const location = useLocation();

  const [lowCount, setLowCount] = useState(0);
  const [expiryCount, setExpiryCount] = useState(0);
  const [nearExpiryDays, setNearExpiryDays] = useState(30);
  const [shopName, setShopName] = useState('PestiShop Pro');
  const [logoUrl, setLogoUrl] = useState('/logo.svg');
  const navRef = useRef(null);
  const handleKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = navRef.current ? Array.from(navRef.current.querySelectorAll('a[data-sidebar-item="1"]')) : [];
    if (!links.length) return;
    let idx = links.indexOf(document.activeElement);
    if (idx === -1) idx = 0;
    if (e.key === 'ArrowDown') idx = Math.min(idx + 1, links.length - 1);
    else idx = Math.max(idx - 1, 0);
    e.preventDefault();
    links[idx].focus();
  };

  useEffect(() => {
    let mounted = true;

    const fetchCount = async () => {
      try {
        const res = await api.get('/alerts/low-stock', { params: { page: 1, limit: 1 } });
        if (mounted) setLowCount(res.data?.total || 0);
      } catch (err) {
        // ignore silently
      }
    };

    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        const s = res.data || {};
        if (mounted) {
          setShopName(s.shopName || 'PestiShop Pro');
          setLogoUrl(s.logoUrl || '/logo.svg');
          const d = typeof s.nearExpiryDays === 'number' ? s.nearExpiryDays : 30;
          setNearExpiryDays(Math.max(1, d));
          try {
            const er = await api.get('/alerts/near-expiry', { params: { page: 1, limit: 1, days: Math.max(1, d) } });
            setExpiryCount(er.data?.total || 0);
          } catch (_) {}
        }
      } catch (err) {
        // ignore silently
      }
    };

    fetchCount();
    fetchSettings();

    // refresh every minute
    const id = setInterval(fetchCount, 60 * 1000);
    const id2 = setInterval(fetchSettings, 60 * 1000);

    // Also listen for immediate updates when data changes elsewhere
    const onDataChanged = () => fetchCount();
    const onSettingsChanged = () => fetchSettings();
    window.addEventListener('data-changed', onDataChanged);
    window.addEventListener('settings-changed', onSettingsChanged);

    return () => { mounted = false; clearInterval(id); clearInterval(id2); window.removeEventListener('data-changed', onDataChanged); window.removeEventListener('settings-changed', onSettingsChanged); };
  }, []);

  // Icon mapping – support passing icon component or a string name
  const getIcon = (icon) => {
    if (typeof icon === 'function') return React.createElement(icon, { className: 'w-5 h-5' });

    switch (icon) {
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5" />;
      case 'Package':
        return <Package className="w-5 h-5" />;
      case 'ShoppingCart':
        return <ShoppingCart className="w-5 h-5" />;
      case 'Users':
        return <Users className="w-5 h-5" />;
      case 'Settings':
        return <Settings className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className={`fixed left-0 top-0 h-full bg-gradient-to-b from-gray-900 to-gray-800 text-white transition-all duration-300 z-40 transform ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt={shopName} className="w-8 h-8 rounded" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = '/logo.svg'; }} />
              <h1 className="text-xl font-bold">{shopName}</h1>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="space-y-2" ref={navRef} tabIndex={0} onKeyDown={handleKeyDown}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                title={!sidebarOpen ? item.label : undefined}
                data-sidebar-item="1"
                onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
                className={`group relative w-full flex ${sidebarOpen ? 'items-center gap-3 px-4 py-3' : 'justify-center px-3 py-3'} rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  sidebarOpen && isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg'
                    : 'hover:bg-gray-700'
                } ${!sidebarOpen && isActive ? 'text-blue-300 ring-2 ring-blue-400' : ''}`}
              >
                {sidebarOpen && isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r"></span>}
                {getIcon(item.icon)}
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
                {!sidebarOpen && (
                  <span className="pointer-events-none absolute left-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">
                    {item.label}
                  </span>
                )}

                {/* Alerts badge */}
                {item.path === '/alerts' && (lowCount > 0 || expiryCount > 0) && (
                  sidebarOpen ? (
                    <div className="ml-auto flex items-center gap-2">
                      {lowCount > 0 && (
                        <span className="bg-orange-600 text-white text-xs font-semibold px-2 py-1 rounded-full">Low {lowCount}</span>
                      )}
                      {expiryCount > 0 && (
                        <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">Exp {expiryCount}</span>
                      )}
                    </div>
                  ) : (
                    <span className="ml-auto flex items-center gap-1">
                      {lowCount > 0 && <span className="w-3 h-3 rounded-full bg-orange-600" />}
                      {expiryCount > 0 && <span className="w-3 h-3 rounded-full bg-red-600" />}
                    </span>
                  )
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6">
          <button
            onClick={() => onLogout && onLogout()}
            className={`w-full flex ${sidebarOpen ? 'items-center gap-3 px-4 py-3' : 'justify-center px-3 py-3'} rounded-xl transition-all hover:bg-gray-700 text-red-400`}
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );
}
