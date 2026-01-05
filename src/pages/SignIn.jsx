import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Bug, Leaf } from 'lucide-react';

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/login', { email, password });
      try { sessionStorage.setItem('AUTH_SESSION_ACTIVE', '1'); } catch (_) {}
      navigate('/');
      window.dispatchEvent(new Event('data-changed'));
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const AuthBackground = () => {
    const items = Array.from({ length: 20 }).map((_, i) => {
      const top = Math.random() * 90 + '%';
      const left = Math.random() * 90 + '%';
      const size = 16 + Math.random() * 28;
      const duration = 6 + Math.random() * 6;
      const delay = Math.random() * 5;
      const opacity = 0.12 + Math.random() * 0.1;
      const hue = 110 + Math.round(Math.random() * 40);
      const Icon = Math.random() < 0.5 ? Bug : Leaf;
      return { top, left, size, duration, delay, opacity, hue, Icon, key: i };
    });
    return (
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <style>{`@keyframes bugFloat{0%{transform:translate(0,0) rotate(0deg)}50%{transform:translate(12px,-16px) rotate(10deg)}100%{transform:translate(0,0) rotate(0deg)}}`}</style>
        {items.map(b => (
          <div
            key={b.key}
            style={{ position: 'absolute', top: b.top, left: b.left, animation: `bugFloat ${b.duration}s ease-in-out ${b.delay}s infinite`, opacity: b.opacity, color: `hsl(${b.hue} 70% 28%)` }}
          >
            <b.Icon style={{ width: b.size, height: b.size }} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-gray-100">
      <AuthBackground />
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="PestiShop Pro" className="w-12 h-12 mx-auto" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = '/favicon.ico'; }} />
          <h1 className="mt-2 text-xl font-bold text-gray-800">Sign In</h1>
          <p className="text-sm text-gray-500">Access your dashboard</p>
        </div>
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="mt-4 text-sm text-center text-gray-600">
          Don’t have an account? <Link to="/signup" className="text-green-700 font-medium">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
