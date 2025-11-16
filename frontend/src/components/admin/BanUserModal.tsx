/**
 * FR5: Ban User Modal
 * Component for banning/unbanning users
 * REQUIREMENT: Ban/unban users
 */

import React, { useState } from 'react';
import { X, UserX, UserCheck, Clock, AlertTriangle } from 'lucide-react';

interface BanUserModalProps {
  isOpen: boolean;
  userId: number;
  userName: string;
  isBanned: boolean;
  onClose: () => void;
  onBan: (reason: string, duration?: number) => Promise<void>;
  onUnban: () => Promise<void>;
}

const BanUserModal: React.FC<BanUserModalProps> = ({
  isOpen,
  userId,
  userName,
  isBanned,
  onClose,
  onBan,
  onUnban
}) => {
  const [reason, setReason] = useState('');
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('permanent');
  const [durationDays, setDurationDays] = useState(7);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleBan = async () => {
    if (!reason.trim()) {
      alert('Please provide a ban reason');
      return;
    }

    setIsProcessing(true);
    try {
      const duration = banType === 'temporary' ? durationDays * 24 * 60 * 60 : undefined; // Convert to seconds
      await onBan(reason, duration);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Failed to ban user:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnban = async () => {
    if (!confirm(`Are you sure you want to unban ${userName}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await onUnban();
      onClose();
    } catch (error) {
      console.error('Failed to unban user:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isBanned ? 'Unban User' : 'Ban User'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              User: <span className="font-semibold text-gray-900">{userName}</span>
            </p>
            <p className="text-sm text-gray-600">
              User ID: <span className="font-semibold text-gray-900">{userId}</span>
            </p>
          </div>

          {isBanned ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">User is currently banned</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Unbanning will restore the user's access to the platform.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUnban}
                disabled={isProcessing}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Unbanning...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Unban User
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ban Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter the reason for banning this user..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ban Type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="banType"
                      value="permanent"
                      checked={banType === 'permanent'}
                      onChange={() => setBanType('permanent')}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Permanent Ban</div>
                      <div className="text-xs text-gray-500">User will be banned indefinitely</div>
                    </div>
                  </label>
                  <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="banType"
                      value="temporary"
                      checked={banType === 'temporary'}
                      onChange={() => setBanType('temporary')}
                      className="mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Temporary Ban</div>
                      <div className="flex items-center mt-1">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={durationDays}
                          onChange={(e) => setDurationDays(parseInt(e.target.value) || 7)}
                          disabled={banType !== 'temporary'}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded mr-2 disabled:bg-gray-100"
                        />
                        <span className="text-xs text-gray-500">days</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Warning</p>
                    <p className="text-xs text-red-700 mt-1">
                      Banning a user will immediately revoke their access to the platform.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBan}
                  disabled={isProcessing || !reason.trim()}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Banning...
                    </>
                  ) : (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      Ban User
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BanUserModal;


