import React, { useEffect, useState } from 'react';
import { Save, Image as ImageIcon, User, Building, Phone } from 'lucide-react';
import api from '../services/api';

export default function SettingsPage({ showNotification }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ownerName: '',
    shopName: '',
    address: '',
    contact: '',
    logoUrl: '',
    nearExpiryDays: 30
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await api.get('/settings');
        const data = res.data || {};
        setForm({
          ownerName: data.ownerName || '',
          shopName: data.shopName || '',
          address: data.address || '',
          contact: data.contact || '',
          logoUrl: data.logoUrl || '/logo.svg',
          nearExpiryDays: typeof data.nearExpiryDays === 'number' ? data.nearExpiryDays : 30
        });
      } catch (err) {
        console.debug('No settings found, using defaults');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      showNotification && showNotification('Settings saved successfully');
      // Immediately notify app to refresh settings-driven UI (e.g., sidebar/invoice headers)
      window.dispatchEvent(new Event('settings-changed'));
    } catch (err) {
      showNotification && showNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const [uploading, setUploading] = useState(false);
  const uploadLogo = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result;
          const resp = await api.post('/settings/logo', { dataUrl });
          const url = resp.data && resp.data.url;
          if (url) {
            setForm(f => ({ ...f, logoUrl: url }));
            showNotification && showNotification('Logo uploaded successfully');
            window.dispatchEvent(new Event('settings-changed'));
          } else {
            showNotification && showNotification('Upload response invalid', 'error');
          }
        } catch (e) {
          showNotification && showNotification('Logo upload failed', 'error');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setUploading(false);
      showNotification && showNotification('Logo upload failed', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Loading settings...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        <p className="text-gray-500">Shop owner profile and business details</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><User className="w-4 h-4" /> Owner Name</label>
                <input
                  value={form.ownerName}
                  onChange={e => setForm({ ...form, ownerName: e.target.value })}
                  placeholder="e.g. Ali Khan"
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Building className="w-4 h-4" /> Shop Name</label>
                <input
                  value={form.shopName}
                  onChange={e => setForm({ ...form, shopName: e.target.value })}
                  placeholder="e.g. PestiShop Pro"
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Address</label>
              <input
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Street, City"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><Phone className="w-4 h-4" /> Contact</label>
                <input
                  value={form.contact}
                  onChange={e => setForm({ ...form, contact: e.target.value })}
                  placeholder="+92 ..."
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Logo URL</label>
                <input
                  value={form.logoUrl}
                  onChange={e => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Near-Expiry Days</label>
                <input
                  type="number"
                  min={1}
                  value={form.nearExpiryDays}
                  onChange={e => setForm({ ...form, nearExpiryDays: e.target.value === '' ? '' : Math.max(1, Number(e.target.value)) })}
                  placeholder="e.g. 30"
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <ImageIcon className="w-6 h-6 text-gray-700" />
            <div>
              <div className="text-sm text-gray-500">Logo Preview</div>
              <div className="text-xs text-gray-400">Upload image or use URL (optional)</div>
            </div>
          </div>
          <div className="border rounded-xl p-4 flex items-center justify-center bg-gray-50">
            <img
              src={form.logoUrl || '/logo.svg'}
              alt="Shop Logo"
              className="max-h-36 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => { e.currentTarget.src = '/logo.svg'; }}
            />
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">Upload Logo Image</label>
            <div className="mt-1 flex items-center gap-3">
              <input type="file" accept="image/*" onChange={e => uploadLogo(e.target.files && e.target.files[0])} />
              {uploading && <span className="text-sm text-gray-500">Uploading...</span>}
            </div>
            <div className="text-xs text-gray-400 mt-1">URL field above is optional; uploaded image will override it.</div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600">Preview Name</div>
            <div className="text-lg font-bold text-gray-800">{form.shopName || 'Your Shop'}</div>
            <div className="text-sm text-gray-500">{form.address || 'Address not set'}</div>
            <div className="text-sm text-gray-500">{form.contact || 'Contact not set'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
