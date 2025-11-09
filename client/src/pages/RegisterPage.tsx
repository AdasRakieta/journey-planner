import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/authApi';
import { MapPin, User, Lock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid invitation token');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.register(token, formData.username, formData.password);
      // Registration successful - user is automatically logged in
      navigate('/');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg mb-4">
            <MapPin size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Welcome to Journey Planner!</p>
        </div>

        {/* Register Card */}
        <div className="bg-[#161b22] rounded-2xl shadow-xl p-8 border border-[#30363d]">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {!token ? (
            <div className="text-center">
              <p className="text-gray-400 mb-4">
                You need an invitation to create an account.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Choose a username"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Create a password"
                    required
                    minLength={8}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Must be at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Confirm your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transform transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © {new Date().getFullYear()} Journey Planner. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
