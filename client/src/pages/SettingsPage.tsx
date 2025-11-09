import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings, LogOut } from 'lucide-react';

// Simple placeholder - full Settings page will be added next
const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Settings size={32} className="text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-gray-600">Username:</span>
              <span className="ml-2 font-medium">{user.username}</span>
            </div>
            <div>
              <span className="text-gray-600">Email:</span>
              <span className="ml-2 font-medium">{user.email}</span>
            </div>
            <div>
              <span className="text-gray-600">Role:</span>
              <span className="ml-2 font-medium capitalize">{user.role}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
        >
          <LogOut size={20} />
          Logout
        </button>

        <p className="text-sm text-gray-600 mt-4">
          Full settings page with profile editing, password change, and admin panel coming soon!
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
