import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  LogOut, 
  User, 
  Lock, 
  Mail, 
  Shield, 
  Trash2, 
  UserPlus, 
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  ArrowLeft
} from 'lucide-react';
import { userAPI, adminAPI } from '../services/authApi';
import type { User as UserType, Invitation } from '../types/auth';

const SettingsPage: React.FC = () => {
  const { user, logout, updateUser, refreshUser } = useAuth();
  
  // User Profile State
  const [username, setUsername] = useState(user?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Admin Panel State
  const [users, setUsers] = useState<UserType[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  // Refresh user data from database on mount
  useEffect(() => {
    refreshUser();
  }, []);

  // Update username when user changes
  useEffect(() => {
    if (user?.username) {
      setUsername(user.username);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  const loadAdminData = async () => {
    setAdminLoading(true);
    try {
      const [usersResponse, invitationsResponse] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getPendingInvitations()
      ]);
      setUsers(usersResponse.data.users);
      setInvitations(invitationsResponse.data.invitations);
    } catch (error: any) {
      setAdminError('Failed to load admin data');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      const response = await userAPI.updateProfile(username);
      updateUser(response.data.user);
      setProfileSuccess('Profile updated successfully!');
    } catch (error: any) {
      setProfileError(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    setPasswordLoading(true);

    try {
      await userAPI.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setAdminSuccess('');
    setInviteLoading(true);

    try {
      await adminAPI.inviteUser(inviteEmail);
      setAdminSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      await loadAdminData();
    } catch (error: any) {
      setAdminError(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      await adminAPI.deleteUser(userId);
      setAdminSuccess(`User "${username}" deleted successfully`);
      await loadAdminData();
    } catch (error: any) {
      setAdminError(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleChangeRole = async (userId: number, username: string, newRole: 'admin' | 'user') => {
    if (!confirm(`Change ${username}'s role to ${newRole}?`)) return;

    try {
      await adminAPI.changeUserRole(userId, newRole);
      setAdminSuccess(`User "${username}" role changed to ${newRole}`);
      await loadAdminData();
    } catch (error: any) {
      setAdminError(error.response?.data?.error || 'Failed to change user role');
    }
  };

  const handleCancelInvitation = async (invitationId: number, email: string) => {
    if (!confirm(`Cancel invitation for ${email}?`)) return;

    try {
      await adminAPI.cancelInvitation(invitationId);
      setAdminSuccess(`Invitation for ${email} cancelled`);
      await loadAdminData();
    } catch (error: any) {
      setAdminError(error.response?.data?.error || 'Failed to cancel invitation');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0d1117] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Settings size={32} className="text-blue-500" />
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="gh-btn-secondary"
            >
              <ArrowLeft size={20} />
              Back to Home
            </Link>
            <button
              onClick={logout}
              className="gh-btn-danger"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Profile Section */}
          <div className="space-y-6">
            {/* Account Information */}
            <div className="bg-[#161b22] rounded-xl shadow-sm p-6 border border-[#30363d]">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <User size={24} className="text-blue-500" />
                Account Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                  <User size={20} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-400">Username</div>
                    <div className="font-medium text-white">{user.username}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                  <Mail size={20} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-400">Email</div>
                    <div className="font-medium text-white">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                  <Shield size={20} className="text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-400">Role</div>
                    <div className="font-medium text-white capitalize">{user.role}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Update Username */}
            <div className="bg-[#161b22] rounded-xl shadow-sm p-6 border border-[#30363d]">
              <h2 className="text-xl font-semibold text-white mb-4">Update Username</h2>
              
              {profileError && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{profileError}</p>
                </div>
              )}
              
              {profileSuccess && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg flex items-start gap-2">
                  <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-300">{profileSuccess}</p>
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                    New Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Enter new username"
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
                <button
                  type="submit"
                  disabled={profileLoading || username === user.username}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Update Username
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-[#161b22] rounded-xl shadow-sm p-6 border border-[#30363d]">
              <h2 className="text-xl font-semibold text-white mb-4">Change Password</h2>
              
              {passwordError && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{passwordError}</p>
                </div>
              )}
              
              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg flex items-start gap-2">
                  <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-300">{passwordSuccess}</p>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Lock size={20} />
                      Change Password
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Admin Panel (only visible for admins) */}
          {user.role === 'admin' && (
            <div className="space-y-6">
              {/* Admin Header */}
              <div className="bg-[#161b22] rounded-xl shadow-sm p-6 border border-[#30363d]">
                <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <Shield size={24} className="text-yellow-500" />
                  Admin Panel
                </h2>
                <p className="text-gray-400 text-sm">Manage users and invitations</p>
              </div>

              {adminError && (
                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{adminError}</p>
                </div>
              )}
              
              {adminSuccess && (
                <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg flex items-start gap-2">
                  <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-300">{adminSuccess}</p>
                </div>
              )}

              {/* Invite User */}
              <div className="bg-[#161b22] rounded-xl shadow-sm p-6 border border-[#30363d]">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UserPlus size={20} className="text-green-500" />
                  Invite New User
                </h3>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div>
                    <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={20} />
                        Send Invitation
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="bg-[#161b22] rounded-xl shadow-sm p-6 border border-[#30363d]">
                  <h3 className="text-lg font-semibold text-white mb-4">Pending Invitations</h3>
                  <div className="space-y-2">
                    {invitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg border border-[#30363d]"
                      >
                        <div>
                          <div className="text-white font-medium">{invitation.email}</div>
                          <div className="text-xs text-gray-400">
                            Expires: {invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(invitation.id!, invitation.email)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg"
                          title="Cancel invitation"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Users List */}
              <div className="bg-[#161b22] rounded-xl shadow-sm p-6 border border-[#30363d]">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Users ({users.length})
                </h3>
                {adminLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-4 bg-[#0d1117] rounded-lg border border-[#30363d]"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{u.username}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              u.role === 'admin' 
                                ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-800' 
                                : 'bg-blue-900/20 text-blue-400 border border-blue-800'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">{u.email}</div>
                        </div>
                        {u.id !== user.id && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleChangeRole(
                                u.id!,
                                u.username,
                                u.role === 'admin' ? 'user' : 'admin'
                              )}
                              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg"
                            >
                              {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id!, u.username)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg"
                              title="Delete user"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
