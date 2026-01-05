import React, { useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Notification from './components/Notification';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import CustomersPage from './pages/CustomersPage';
import AlertsPage from './pages/AlertsPage';
import InvoiceView from './pages/InvoiceView';
import InvoicesPage from './pages/InvoicesPage';
import SettingsPage from './pages/SettingsPage';
import AddModal from './components/Modal/AddModal';

import { TrendingUp, Package, ShoppingCart, Users, Menu, X, Settings } from 'lucide-react';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import api, { API_URL } from './services/api';
const AUTH_SESSION_KEY = 'AUTH_SESSION_ACTIVE';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: TrendingUp },
  { path: '/products', label: 'Products', icon: Package },
  { path: '/sales', label: 'Sales', icon: ShoppingCart },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/invoices', label: 'Invoices', icon: Package },
  { path: '/alerts', label: 'Alerts', icon: Menu },
  { path: '/settings', label: 'Settings', icon: Settings },
];

function Layout({ children, sidebarOpen, setSidebarOpen, isAuthenticated, onLogout }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {isAuthenticated && <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} menuItems={menuItems} currentPath={location.pathname} onLogout={onLogout} />}
      {isAuthenticated && sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-30" onClick={() => setSidebarOpen(false)}></div>}
      <div className={`transition-all duration-300 ml-0 ${isAuthenticated ? (sidebarOpen ? 'md:ml-64' : 'md:ml-20') : ''}`}>
        <div className="md:hidden sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen(s => !s)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              {isAuthenticated && (sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />)}
            </button>
            <div className="text-sm text-gray-600">
              {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </div>
          </div>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [notification, setNotification] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const didCheck = useRef(false);

  // YE 2 LINES ADD KARO – EDIT KE LIYE
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);

  const openModal = (type, isEdit = false, data = null, notification = null) => {
  setModalType(type);
  setEditMode(isEdit);
  setEditData(data);
  if (notification) setNotification(notification); // optional
  setShowAddModal(true);
};

  const closeModal = () => {
    setShowAddModal(false);
    setModalType('');
    setEditMode(false);  // reset
    setEditData(null);   // reset
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  React.useEffect(() => {
    const check = async () => {
      try {
        await (await import('./services/api')).default.get('/auth/me');
        // If authenticated but this tab has no session marker, enforce logout-on-new-tab
        const hasSession = sessionStorage.getItem(AUTH_SESSION_KEY) === '1';
        if (!hasSession) {
          try { await (await import('./services/api')).default.post('/auth/logout'); } catch (_) {}
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (_) {
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };
    if (!didCheck.current) {
      didCheck.current = true;
      const path = window.location.pathname;
      if (path === '/signin' || path === '/signup') {
        setIsAuthenticated(false);
        setAuthChecked(true);
      } else {
        check();
      }
    }
  }, []);

  React.useEffect(() => {
    const onDataChanged = async () => {
      try {
        await (await import('./services/api')).default.get('/auth/me');
        setIsAuthenticated(true);
      } catch (_) {
        setIsAuthenticated(false);
      }
    };
    window.addEventListener('data-changed', onDataChanged);
    return () => window.removeEventListener('data-changed', onDataChanged);
  }, []);

  React.useEffect(() => {
    if (authChecked && !isAuthenticated) {
      if (window.location.pathname !== '/signin' && window.location.pathname !== '/signup') {
        window.history.replaceState(null, '', '/signin');
      }
    }
  }, [authChecked, isAuthenticated]);

  // Remove forced logout on refresh; rely on sessionStorage marker to detect tab close

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    setIsAuthenticated(false);
    setSidebarOpen(false);
    try { sessionStorage.removeItem(AUTH_SESSION_KEY); } catch (_) {}
    window.location.assign('/signin');
  };

  return (
    <Router>
      <Notification notification={notification} />
      <Layout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isAuthenticated={isAuthenticated} onLogout={logout}>
        {authChecked ? (
          <Routes>
            {isAuthenticated ? (
              <>
                <Route path="/" element={<DashboardPage openModal={openModal} showNotification={showNotification} />} />
                <Route path="/products" element={<ProductsPage openModal={openModal} showNotification={showNotification} />} />
                <Route path="/sales" element={<SalesPage openModal={openModal} showNotification={showNotification} />} />
                <Route path="/customers" element={<CustomersPage openModal={openModal} showNotification={showNotification} />} />
                <Route path="/invoices" element={<InvoicesPage showNotification={showNotification} />} />
                <Route path="/invoices/:id" element={<InvoiceView showNotification={showNotification} />} />
                <Route path="/alerts" element={<AlertsPage openModal={openModal} showNotification={showNotification} />} />
                <Route path="/settings" element={<SettingsPage showNotification={showNotification} />} />
                <Route path="*" element={<DashboardPage />} />
              </>
            ) : (
              <>
                <Route path="/" element={<SignIn />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="*" element={<SignIn />} />
              </>
            )}
          </Routes>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
        )}
      </Layout>
     <AddModal
        show={showAddModal}
        onClose={closeModal}
        modalType={modalType}
        editMode={editMode}
        editData={editData}
        showNotification={showNotification}  // <-- YE ADD KIYA
      />
    </Router>
  );
}
