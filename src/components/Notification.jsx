import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function Notification({ notification }) {
  if (!notification) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3`}>
      {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      {notification.message}
    </div>
  );
}