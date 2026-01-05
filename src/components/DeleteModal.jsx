import React from 'react';
import { Trash2, X, AlertCircle } from 'lucide-react';

export default function DeleteModal({ isOpen, onClose, onConfirm, itemName = 'item' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Delete Confirmation</h3>
            <p className="text-gray-600">This action cannot be undone</p>
          </div>
        </div>

        <p className="text-center text-gray-700 mb-8">
          Are you sure you want to permanently delete <span className="font-bold text-red-600">"{itemName}"</span>?
        </p>

        <div className="flex gap-4">
          <button
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Yes, Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-2xl font-semibold hover:bg-gray-300 transition-all flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}