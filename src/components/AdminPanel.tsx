import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Cpu,
  Save,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  DollarSign,
  Zap,
  Box,
  Award,
  AlertTriangle,
  Send,
  BarChart3,
  Gift,
  RefreshCw,
  Search,
  Check,
  TrendingUp,
  Sliders,
  Wallet,
  Tv,
  Lock,
  LogOut,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  LayoutGrid,
  Calendar,
  Copy,
  Percent,
  ShieldCheck,
  Database
} from 'lucide-react';
import {
  AdminConfig,
  WithdrawalRequest,
  User,
  EcosystemTask,
  AdminAnalytics,
  AdminUserListItem,
  AdminStatsResponse
} from '../types.js';
import { api } from '../services/api.js';
import { haptic } from '../services/haptic.js';
import { ADMIN_TELEGRAM_ID, isAuthorizedAdmin } from '../utils/adminAuth.js';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  config: AdminConfig;
  onConfigUpdated: (newConfig: AdminConfig) => void;
  user?: User | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdated,
  user,
}) => {
  const isAuthorizedTelegram = isAuthorizedAdmin(user?.telegramId);
  const [adminSecretKey] = useState(api.getAdminKey() || 'Sujonborsha');
  const [isAuthenticated, setIsAuthenticated] = useState(!!api.getAdminToken());
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<
    'dashboard' | 'analytics' | 'users' | 'adNetwork' | 'balance' | 'referrals' | 'mining' | 'storage' | 'tasks' | 'contest' | 'withdrawals' | 'antiCheat' | 'botSupport'
  >('dashboard');

  const [editableConfig, setEditableConfig] = useState<AdminConfig>(JSON.parse(JSON.stringify(config)));
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [statsData, setStatsData] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // User Management State
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit] = useState(10);
  const [paginatedUsers, setPaginatedUsers] = useState<AdminUserListItem[]>([]);
  const [usersPagination, setUsersPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<AdminUserListItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // MongoDB Atlas status
  const [mongoStatus, setMongoStatus] = useState<{
    isConnected: boolean;
    status: 'connected' | 'connecting' | 'whitelist_required' | 'disconnected';
    error: string | null;
    cluster: string;
    containerIp: string | null;
    activeUri: string;
    database?: string;
  } | null>(null);
  const [mongoTesting, setMongoTesting] = useState(false);
  const [mongoFeedback, setMongoFeedback] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState(false);

  const formatDateDDMMYYYY = (isoString?: string): string => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'N/A';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'N/A';
    }
  };

  const handleCopyText = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      haptic.success();
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  useEffect(() => {
    const el = document.getElementById('admin-content-scroll');
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeAdminTab]);

  const fetchUsersList = async (search = usersSearchQuery, page = usersPage) => {
    if (!isAuthorizedTelegram) return;
    try {
      setIsUsersLoading(true);
      const res = await api.getAdminUsers({ q: search, page, limit: usersLimit });
      if (res.success) {
        setPaginatedUsers(res.users || []);
        setUsersPagination(res.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      }
    } catch (err: any) {
      console.error('Failed to fetch admin users:', err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'telegram' | 'youtube' | 'x' | 'announcement'>('telegram');
  const [newTaskReward, setNewTaskReward] = useState('5');
  const [newTaskUrl, setNewTaskUrl] = useState('https://t.me/PopCornUSA_BOT');
  const [newTaskClaimDelaySeconds, setNewTaskClaimDelaySeconds] = useState('0');

  // Edit task state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskCategory, setEditTaskCategory] = useState<'telegram' | 'youtube' | 'x' | 'announcement'>('telegram');
  const [editTaskReward, setEditTaskReward] = useState('5');
  const [editTaskUrl, setEditTaskUrl] = useState('');
  const [editTaskClaimDelaySeconds, setEditTaskClaimDelaySeconds] = useState('0');

  // Balance Management State
  const [selectedUserSearch, setSelectedUserSearch] = useState('');
  const [selectedTargetUser, setSelectedTargetUser] = useState<User | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceMode, setBalanceMode] = useState<'bonus' | 'deduct'>('bonus');
  const [balanceReason, setBalanceReason] = useState('');
  const [balanceSuccess, setBalanceSuccess] = useState<string | null>(null);

  // Broadcast Bonus State
  const [broadcastAmount, setBroadcastAmount] = useState('');
  const [broadcastReason, setBroadcastReason] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  // Withdrawal Filter & Action State
  const [withdrawalFilter, setWithdrawalFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'REJECTED'>('ALL');
  const [withdrawalTxHash, setWithdrawalTxHash] = useState<{ [id: string]: string }>({});

  // Mining Levels Config State
  const [savingLevelId, setSavingLevelId] = useState<number | null>(null);
  const [levelSaveFeedback, setLevelSaveFeedback] = useState<Record<number, string>>({});
  const [adminMiningFilter, setAdminMiningFilter] = useState<'all' | '1-10' | '11-20' | '21-30' | '31-40' | '41-50'>('all');
  const [adminMiningSearch, setAdminMiningSearch] = useState('');
  const [isResettingMiningLevels, setIsResettingMiningLevels] = useState(false);
  const [miningBulkSuccess, setMiningBulkSuccess] = useState(false);

  useEffect(() => {
    setEditableConfig(JSON.parse(JSON.stringify(config)));
  }, [config]);

  const loadAdminData = async () => {
    if (!isAuthorizedTelegram) return;
    try {
      setLoading(true);
      setActionError(null);
      const [overviewData, statsRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminStats().catch(() => null)
      ]);
      setWithdrawals(overviewData.withdrawals || []);
      setUsersList(overviewData.users || []);
      if (overviewData.analytics) {
        setAnalytics(overviewData.analytics);
      }
      if (statsRes) {
        setStatsData(statsRes);
      }
      await fetchUsersList(usersSearchQuery, usersPage);
      api.adminGetMongoStatus().then(res => {
        if (res && res.success) setMongoStatus(res);
      }).catch(() => {});
    } catch (err: any) {
      if (err.message?.includes('Unauthorized') || err.message?.includes('expired') || err.message?.includes('token')) {
        api.clearAdminToken();
        setIsAuthenticated(false);
      }
      setActionError(err.message || 'Failed to authenticate admin');
    } finally {
      setLoading(false);
    }
  };

  const handleTestMongo = async () => {
    try {
      setMongoTesting(true);
      setMongoFeedback(null);
      const res = await api.adminReconnectMongo();
      if (res.connected) {
        haptic.success();
        setMongoFeedback('Connected successfully to MongoDB Atlas cluster!');
      } else {
        haptic.error();
        setMongoFeedback(res.message || 'Could not connect. Ensure IP 0.0.0.0/0 is whitelisted in Atlas Network Access.');
      }
      const updated = await api.adminGetMongoStatus();
      if (updated && updated.success) setMongoStatus(updated);
    } catch (err: any) {
      haptic.error();
      setMongoFeedback(err.message || 'Connection test failed');
    } finally {
      setMongoTesting(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthorizedTelegram && isAuthenticated) {
      loadAdminData();
    }
  }, [isOpen, isAuthorizedTelegram, isAuthenticated]);

  useEffect(() => {
    if (isOpen && isAuthorizedTelegram && isAuthenticated) {
      const timer = setTimeout(() => {
        fetchUsersList(usersSearchQuery, usersPage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [usersSearchQuery, usersPage, isOpen, isAuthorizedTelegram, isAuthenticated]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAuthLoading(true);
      setAuthError(null);
      const res = await api.adminLogin(passwordInput, ADMIN_TELEGRAM_ID);
      if (res.success && res.token) {
        setIsAuthenticated(true);
        setPasswordInput('');
        haptic.success();
      } else {
        haptic.error();
        setAuthError(res.error || 'Invalid Admin Secret Key. Access denied.');
      }
    } catch (err: any) {
      haptic.error();
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    api.clearAdminToken();
    setIsAuthenticated(false);
    haptic.impact('medium');
  };

  if (!isOpen) return null;

  if (!isAuthorizedTelegram) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
        <div className="w-full max-w-md bg-[#121824] border border-[#252D3D] rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-white font-display uppercase tracking-wider">
            403 ACCESS DENIED
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            You do not have permission to access the administrative dashboard.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#1A2234] hover:bg-[#252D3D] text-white font-bold text-xs rounded-xl font-display uppercase tracking-wider transition-colors"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
        <div className="w-full max-w-md bg-[#0F1420] border-2 border-[#FFE600]/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#FFE600]/15 border border-[#FFE600]/30 flex items-center justify-center mx-auto text-[#FFE600]">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white font-display uppercase tracking-wider">
              Admin Security Gateway
            </h2>
            <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Authorized Telegram Identity Verified</span>
            </div>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Enter the Admin Secret Key to authorize administrative access and issue a short-lived JWT token:
          </p>
          {authError && (
            <div className="p-2.5 bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-xs font-semibold">
              {authError}
            </div>
          )}
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter Admin Secret / Password"
              className="w-full px-4 py-3 bg-[#0B0E14] border border-[#252D3D] focus:border-[#FFE600] rounded-xl text-xs text-white outline-none font-mono tracking-widest text-center"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 bg-[#1A2234] text-gray-400 font-bold text-xs rounded-xl hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={authLoading || !passwordInput}
                className="py-2.5 bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-extrabold text-xs rounded-xl uppercase tracking-wider font-display transition-all"
              >
                {authLoading ? 'Authenticating...' : 'Unlock Terminal'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      setActionError(null);
      haptic.impact('heavy');
      const updated = await api.updateAdminConfig(editableConfig);
      onConfigUpdated(updated);
      haptic.success();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      haptic.error();
      setActionError(err.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSingleMiningLevel = async (levelNumber: number) => {
    try {
      const tier = editableConfig.minerTiers.find((t) => t.level === levelNumber);
      if (!tier) return;
      setSavingLevelId(levelNumber);
      setLevelSaveFeedback((prev) => ({ ...prev, [levelNumber]: 'Saving...' }));
      haptic.impact('heavy');
      const updated = await api.adminUpdateMiningLevel(adminSecretKey, levelNumber, {
        speedPerHour: tier.speedPerHour,
        pricePOP: tier.pricePOP,
        name: tier.name,
      });
      setEditableConfig((prev) => {
        const next = [...prev.minerTiers];
        const idx = next.findIndex((t) => t.level === levelNumber);
        if (idx >= 0) next[idx] = updated;
        return { ...prev, minerTiers: next };
      });
      haptic.success();
      setLevelSaveFeedback((prev) => ({ ...prev, [levelNumber]: 'Saved to MongoDB!' }));
      setTimeout(() => {
        setLevelSaveFeedback((prev) => {
          const c = { ...prev };
          delete c[levelNumber];
          return c;
        });
      }, 3000);
    } catch (err: any) {
      haptic.error();
      setLevelSaveFeedback((prev) => ({ ...prev, [levelNumber]: `Error: ${err.message || 'Failed'}` }));
    } finally {
      setSavingLevelId(null);
    }
  };

  const handleBulkSaveMiningLevels = async () => {
    try {
      setLoading(true);
      haptic.impact('heavy');
      const saved = await api.adminBulkUpdateMiningLevels(adminSecretKey, editableConfig.minerTiers);
      setEditableConfig((prev) => ({ ...prev, minerTiers: saved }));
      setMiningBulkSuccess(true);
      haptic.success();
      setTimeout(() => setMiningBulkSuccess(false), 3000);
    } catch (err: any) {
      haptic.error();
      setActionError(err.message || 'Bulk save of mining levels failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetMiningLevelsToDefaults = async () => {
    if (!window.confirm('Reset all 50 levels to defaults?')) return;
    try {
      setIsResettingMiningLevels(true);
      haptic.impact('heavy');
      const resetLevels = await api.adminResetMiningLevels(adminSecretKey);
      setEditableConfig((prev) => ({ ...prev, minerTiers: resetLevels }));
      haptic.success();
      setMiningBulkSuccess(true);
      setTimeout(() => setMiningBulkSuccess(false), 3000);
    } catch (err: any) {
      haptic.error();
      setActionError(err.message || 'Reset failed');
    } finally {
      setIsResettingMiningLevels(false);
    }
  };

  const handleProcessWithdrawal = async (
    withdrawalId: string,
    action: 'approve' | 'reject' | 'paid' | 'completed'
  ) => {
    try {
      setLoading(true);
      haptic.impact('medium');
      const status = action === 'reject' ? 'REJECTED' : 'PAID';
      const txHash = withdrawalTxHash[withdrawalId] || undefined;
      await api.adminProcessWithdrawal(adminSecretKey, {
        withdrawalId,
        status,
        txHash,
        adminNote: `Processed by admin via command center (${action})`,
      });
      haptic.success();
      await loadAdminData();
    } catch (err: any) {
      haptic.error();
      setActionError(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserFlag = async (userId: string, currentFlagged: boolean) => {
    try {
      setLoading(true);
      haptic.impact('medium');
      await api.toggleUserFlag(userId, !currentFlagged, currentFlagged ? undefined : 'Flagged manually via Admin Command Center');
      haptic.success();
      await loadAdminData();
    } catch (err: any) {
      haptic.error();
      setActionError(err.message || 'Flag toggle failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySingleBalance = async () => {
    if (!selectedTargetUser) {
      setActionError('Please select a target user first.');
      return;
    }
    const num = parseFloat(balanceAmount);
    if (!num || isNaN(num) || num <= 0) {
      setActionError('Please enter a valid non-zero POP amount.');
      return;
    }
    if (!balanceReason.trim()) {
      setActionError('Mandatory: Please provide a Reason/Note for this balance change.');
      return;
    }
    try {
      setLoading(true);
      setActionError(null);
      haptic.impact('heavy');
      const delta = balanceMode === 'bonus' ? num : -num;
      await api.adminAdjustBalance(adminSecretKey, {
        targetId: selectedTargetUser.id,
        amountPOP: delta,
        reasonNote: balanceReason.trim(),
        isBonusNotification: balanceMode === 'bonus',
      });
      haptic.success();
      setBalanceSuccess(
        `Successfully ${balanceMode === 'bonus' ? 'credited' : 'deducted'} ${num} POP to @${selectedTargetUser.username || selectedTargetUser.telegramId}! Telegram notification dispatched.`
      );
      setBalanceAmount('');
      setBalanceReason('');
      setTimeout(() => setBalanceSuccess(null), 4000);
      await loadAdminData();
    } catch (err: any) {
      haptic.error();
      setActionError(err.message || 'Failed to adjust balance');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcastBonus = async () => {
    const num = parseFloat(broadcastAmount);
    if (!num || isNaN(num) || num <= 0) {
      setActionError('Please enter a valid broadcast POP amount per user.');
      return;
    }
    if (!broadcastReason.trim()) {
      setActionError('Mandatory: Please provide a Reason/Note for broadcasting this bonus.');
      return;
    }
    if (!window.confirm(`Are you sure you want to broadcast +${num} POP to ALL registered users?`)) {
      return;
    }
    try {
      setLoading(true);
      setActionError(null);
      haptic.impact('heavy');
      const res = await api.adminBroadcastBonus(adminSecretKey, {
        amountPOP: num,
        reasonNote: broadcastReason.trim(),
      });
      haptic.success();
      setBroadcastSuccess(`Broadcast success! Credited ${num} POP to ${res.count} users.`);
      setBroadcastAmount('');
      setBroadcastReason('');
      setTimeout(() => setBroadcastSuccess(null), 4000);
      await loadAdminData();
    } catch (err: any) {
      haptic.error();
      setActionError(err.message || 'Failed to broadcast bonus');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle) return;
    const delaySecs = Math.max(0, parseInt(newTaskClaimDelaySeconds || '0', 10) || 0);
    const newTask: EcosystemTask = {
      id: `task_${Date.now()}`,
      title: newTaskTitle,
      category: newTaskCategory,
      rewardPOP: parseFloat(newTaskReward) || 5,
      url: newTaskUrl,
      claimDelaySeconds: delaySecs,
      claimDelayMinutes: Math.ceil(delaySecs / 60),
      completed: false,
    };
    const updatedConfig = {
      ...editableConfig,
      tasks: [...(editableConfig.tasks || []), newTask],
    };
    setEditableConfig(updatedConfig);
    setNewTaskTitle('');
    setNewTaskClaimDelaySeconds('0');
    try {
      const saved = await api.updateAdminConfig(updatedConfig);
      onConfigUpdated(saved);
      haptic.success();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error('Failed to auto-sync new task:', err);
    }
  };

  const handleStartEditTask = (task: EcosystemTask) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskCategory(task.category);
    setEditTaskReward(String(task.rewardPOP));
    setEditTaskUrl(task.url);
    const existingSecs = typeof task.claimDelaySeconds === 'number'
      ? task.claimDelaySeconds
      : (typeof task.claimDelayMinutes === 'number' ? task.claimDelayMinutes * 60 : 0);
    setEditTaskClaimDelaySeconds(String(existingSecs));
  };

  const handleSaveEditedTask = async (taskId: string) => {
    const delaySecs = Math.max(0, parseInt(editTaskClaimDelaySeconds || '0', 10) || 0);
    const updatedTasks = (editableConfig.tasks || []).map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        title: editTaskTitle,
        category: editTaskCategory,
        rewardPOP: parseFloat(editTaskReward) || t.rewardPOP,
        url: editTaskUrl,
        claimDelaySeconds: delaySecs,
        claimDelayMinutes: Math.ceil(delaySecs / 60),
      };
    });
    const updatedConfig = {
      ...editableConfig,
      tasks: updatedTasks,
    };
    setEditableConfig(updatedConfig);
    setEditingTaskId(null);
    try {
      const saved = await api.updateAdminConfig(updatedConfig);
      onConfigUpdated(saved);
      haptic.success();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error('Failed to auto-sync edited task:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    const updatedConfig = {
      ...editableConfig,
      tasks: (editableConfig.tasks || []).filter((t: EcosystemTask) => t.id !== id),
    };
    setEditableConfig(updatedConfig);
    try {
      const saved = await api.updateAdminConfig(updatedConfig);
      onConfigUpdated(saved);
      haptic.impact('medium');
    } catch (err: any) {
      console.error('Failed to auto-sync task deletion:', err);
    }
  };

  const filteredUsers = usersList.filter(u =>
    u.username?.toLowerCase().includes(selectedUserSearch.toLowerCase()) ||
    u.telegramId.includes(selectedUserSearch) ||
    u.firstName?.toLowerCase().includes(selectedUserSearch.toLowerCase())
  );

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'PENDING');
  const filteredWithdrawals = withdrawals.filter(w => {
    if (withdrawalFilter === 'ALL') return true;
    return w.status === withdrawalFilter;
  });

  const adminNavItems = [
    {
      id: 'analytics',
      title: 'Analytics & KPIs',
      shortTitle: 'Analytics',
      description: 'Live protocol KPIs, active miners & token velocity',
      badge: `${statsData?.totalUsers ?? usersList.length} Users`,
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: <BarChart3 className="w-6 h-6 text-blue-400" />,
      cardGradient: 'from-blue-950/40 via-[#121824] to-[#0E131F] border-blue-500/30 hover:border-blue-400',
    },
    {
      id: 'users',
      title: 'User Management',
      shortTitle: 'Users',
      description: 'Inspect accounts, flags, balances & TON addresses',
      badge: `${usersList.length} Accounts`,
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: <Users className="w-6 h-6 text-emerald-400" />,
      cardGradient: 'from-emerald-950/40 via-[#121824] to-[#0E131F] border-emerald-500/30 hover:border-emerald-400',
    },
    {
      id: 'withdrawals',
      title: 'Withdrawal Requests',
      shortTitle: 'Withdrawals',
      description: 'Review requests, verify TON hashes & process payouts',
      badge: pendingWithdrawals.length > 0 ? `${pendingWithdrawals.length} Pending` : '0 Pending',
      badgeClass: pendingWithdrawals.length > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse' : 'bg-gray-800/40 text-gray-400 border-gray-700/40',
      icon: <Clock className="w-6 h-6 text-amber-400" />,
      cardGradient: pendingWithdrawals.length > 0
        ? 'from-amber-950/50 via-[#121824] to-[#0E131F] border-amber-500/50 hover:border-amber-400 shadow-amber-500/5'
        : 'from-amber-950/30 via-[#121824] to-[#0E131F] border-amber-500/30 hover:border-amber-400',
    },
    {
      id: 'balance',
      title: 'Balance & Broadcasting',
      shortTitle: 'Balance & Bonus',
      description: 'Manual token balance adjustments & broadcast bonuses',
      badge: 'Live Credit',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: <Gift className="w-6 h-6 text-purple-400" />,
      cardGradient: 'from-purple-950/40 via-[#121824] to-[#0E131F] border-purple-500/30 hover:border-purple-400',
    },
    {
      id: 'tasks',
      title: 'Tasks & Quests',
      shortTitle: 'Tasks',
      description: 'Ecosystem partner tasks, rewards & link verification',
      badge: `${editableConfig.tasks?.length || 0} Tasks`,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: <Award className="w-6 h-6 text-rose-400" />,
      cardGradient: 'from-rose-950/40 via-[#121824] to-[#0E131F] border-rose-500/30 hover:border-rose-400',
    },
    {
      id: 'botSupport',
      title: 'System Settings',
      shortTitle: 'System Settings',
      description: 'Min/max limits, POP price, fee % & support desk',
      badge: `${editableConfig.withdrawalFeePercent}% Fee`,
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: <Sliders className="w-6 h-6 text-cyan-400" />,
      cardGradient: 'from-cyan-950/40 via-[#121824] to-[#0E131F] border-cyan-500/30 hover:border-cyan-400',
    },
    {
      id: 'adNetwork',
      title: 'Ad Monetization',
      shortTitle: 'Ad Network',
      description: 'Switch between Adsgram & Monetag in real time',
      badge: (editableConfig.adProvider || 'adsgram').toUpperCase(),
      badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      icon: <Tv className="w-6 h-6 text-sky-400" />,
      cardGradient: 'from-sky-950/40 via-[#121824] to-[#0E131F] border-sky-500/30 hover:border-sky-400',
    },
    {
      id: 'mining',
      title: 'Mining Levels Config',
      shortTitle: 'Mining Levels (50 Lvl)',
      description: 'Dynamic mining speed rates (POP/h), upgrade costs & MongoDB sync',
      badge: `${editableConfig.minerTiers?.length || 50} Levels`,
      badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      cardGradient: 'from-yellow-950/40 via-[#121824] to-[#0E131F] border-yellow-500/30 hover:border-yellow-400',
    },
    {
      id: 'storage',
      title: 'Storage Matrix',
      shortTitle: 'Storage Tiers',
      description: 'Storage capacity volumes, max offline hours & tier costs',
      badge: `${editableConfig.storageTiers?.length || 0} Tiers`,
      badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      icon: <Box className="w-6 h-6 text-teal-400" />,
      cardGradient: 'from-teal-950/40 via-[#121824] to-[#0E131F] border-teal-500/30 hover:border-teal-400',
    },
    {
      id: 'contest',
      title: 'Weekly Contest',
      shortTitle: 'Contest & Prizes',
      description: 'Leaderboard threshold & USDT prizes for top miners',
      badge: `$${((editableConfig.weeklyPrizesUsdt?.first || 1) + (editableConfig.weeklyPrizesUsdt?.second || 0.6) + (editableConfig.weeklyPrizesUsdt?.third || 0.3)).toFixed(2)} USDT`,
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: <DollarSign className="w-6 h-6 text-emerald-400" />,
      cardGradient: 'from-emerald-950/40 via-[#121824] to-[#0E131F] border-emerald-500/30 hover:border-emerald-400',
    },
    {
      id: 'referrals',
      title: 'Referral Engine',
      shortTitle: 'Referrals',
      description: 'Direct invitation bonuses & squad passive commissions',
      badge: `${editableConfig.referralCommissionPercent}% Squad`,
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      icon: <TrendingUp className="w-6 h-6 text-indigo-400" />,
      cardGradient: 'from-indigo-950/40 via-[#121824] to-[#0E131F] border-indigo-500/30 hover:border-indigo-400',
    },
    {
      id: 'antiCheat',
      title: 'Anti-Cheat & Security',
      shortTitle: 'Anti-Cheat',
      description: 'Duplicate IP detection, device fingerprinting & bot bans',
      badge: `${usersList.filter(u => u.isFlagged).length} Flagged`,
      badgeClass: usersList.filter(u => u.isFlagged).length > 0 ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-gray-800/40 text-gray-400 border-gray-700/40',
      icon: <ShieldAlert className="w-6 h-6 text-red-400" />,
      cardGradient: 'from-red-950/40 via-[#121824] to-[#0E131F] border-red-500/30 hover:border-red-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-[#0F1420] border-2 border-[#252D3D] rounded-3xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Admin Header */}
        <div className="p-4 bg-gradient-to-r from-red-950/40 via-[#121824] to-[#0F1420] border-b border-[#1E2638] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white uppercase font-display tracking-wider">
                  POP Admin Command Center
                </h2>
                <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded uppercase">LIVE</span>
              </div>
              <span className="text-[11px] text-gray-400">Real-time analytics, balance management & dynamic configuration</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                haptic.selection();
                setActiveAdminTab('dashboard');
              }}
              title="Return to Main Dashboard Grid"
              className={`p-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all ${
                activeAdminTab === 'dashboard'
                  ? 'bg-[#FFE600] text-black border-[#FFE600] font-bold shadow-md shadow-amber-500/20'
                  : 'bg-[#1A2234] hover:bg-[#252D3D] text-gray-300 border-[#252D3D]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={loadAdminData}
              disabled={loading}
              title="Refresh Data"
              className="p-1.5 bg-[#1A2234] hover:bg-[#252D3D] text-gray-300 rounded-xl border border-[#252D3D]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={loading}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-md transition-all font-display uppercase"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccess ? 'Saved!' : 'Save Config'}</span>
            </button>
            <button
              onClick={handleAdminLogout}
              title="Lock Admin Terminal"
              className="p-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl flex items-center gap-1 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Global Alerts */}
        {actionError && (
          <div className="m-3 p-2.5 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        {balanceSuccess && (
          <div className="m-3 p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{balanceSuccess}</span>
          </div>
        )}
        {broadcastSuccess && (
          <div className="m-3 p-2.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs flex items-center gap-2">
            <Send className="w-4 h-4 shrink-0" />
            <span>{broadcastSuccess}</span>
          </div>
        )}

        {/* Section Navigation Header */}
        {activeAdminTab !== 'dashboard' && (
          <div className="flex items-center justify-between px-3 py-2 bg-[#0B0E14] border-b border-[#1E2638] text-xs gap-2">
            <button
              onClick={() => {
                haptic.impact('light');
                setActiveAdminTab('dashboard');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A2234] hover:bg-[#252D3D] text-white font-bold border border-[#2A344A] transition-all active:scale-[0.97] shadow-sm shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FFE600]" />
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {adminNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    haptic.selection();
                    setActiveAdminTab(item.id as any);
                  }}
                  className={`px-2.5 py-1 rounded-xl whitespace-nowrap text-[11px] font-semibold transition-all shrink-0 ${
                    activeAdminTab === item.id
                      ? 'bg-red-600/20 text-red-400 border border-red-500/40 font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-[#121824]'
                  }`}
                >
                  {item.shortTitle}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div id="admin-content-scroll" className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* TAB 0: MAIN DASHBOARD 2-COLUMN NAVIGATION GRID */}
          {activeAdminTab === 'dashboard' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#0B0E14] border border-[#1E2638] flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Miners</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-black font-mono-digits text-white">{statsData?.totalUsers ?? usersList.length}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Active</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#0B0E14] border border-[#1E2638] flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Withdrawals</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-black font-mono-digits text-amber-400">{pendingWithdrawals.length}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Pending</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#0B0E14] border border-[#1E2638] flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mined POP</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-black font-mono-digits text-[#FFE600] truncate">
                      {statsData?.totalMined ? Math.floor(statsData.totalMined).toLocaleString() : '0'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono-digits">POP</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-[#0B0E14] border border-[#1E2638] flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ad Network</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-base font-black text-sky-400 uppercase">
                      {editableConfig.adProvider || 'Adsgram'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">Live</span>
                  </div>
                </div>
              </div>

              {/* 2-COLUMN NAVIGATION GRID */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {adminNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      haptic.impact('medium');
                      setActiveAdminTab(item.id as any);
                    }}
                    className={`group relative text-left p-3.5 sm:p-4 rounded-2xl border bg-gradient-to-b ${item.cardGradient} transition-all duration-200 active:scale-[0.97] hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between min-h-[140px] sm:min-h-[155px] cursor-pointer`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors shrink-0">
                        {item.icon}
                      </div>
                      <span className={`text-[10px] font-mono-digits font-bold px-2 py-0.5 rounded-full border shrink-0 ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white group-hover:text-[#FFE600] transition-colors leading-snug flex items-center justify-between">
                        <span>{item.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-[#FFE600] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 1: ANALYTICS */}
          {activeAdminTab === 'analytics' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Protocol KPI & Live Metrics</h3>
                  <span className="text-[11px] text-gray-400">Real-time metrics computed directly from database documents</span>
                </div>
                <button
                  onClick={loadAdminData}
                  className="px-2.5 py-1 rounded-lg bg-[#121824] border border-[#252D3D] text-[10px] text-gray-300 flex items-center gap-1 hover:text-white"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#121824] border border-[#252D3D] rounded-2xl">
                  <div className="flex items-center justify-between text-gray-400 text-[10px] mb-1">
                    <span className="font-bold uppercase">Total Users</span>
                    <Users className="w-3.5 h-3.5 text-[#00E5FF]" />
                  </div>
                  <div className="text-xl font-black text-white font-mono-digits">
                    {statsData?.totalUsers ?? analytics?.totalUsers ?? usersList.length}
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5 font-semibold">
                    <TrendingUp className="w-2.5 h-2.5" /> Live accounts
                  </div>
                </div>

                <div className="p-3 bg-[#121824] border border-[#FFE600]/30 bg-gradient-to-br from-[#FFE600]/5 to-transparent rounded-2xl">
                  <div className="flex items-center justify-between text-gray-400 text-[10px] mb-1">
                    <span className="font-bold uppercase text-[#FFE600]">Active Miners</span>
                    <Zap className="w-3.5 h-3.5 text-[#FFE600]" />
                  </div>
                  <div className="text-xl font-black text-[#FFE600] font-mono-digits">
                    {statsData?.activeMiners ?? analytics?.activeMiners ?? 0}
                  </div>
                  <div className="text-[10px] text-amber-300/80 mt-0.5 font-medium truncate">
                    Wallet + Channel + Mining
                  </div>
                </div>

                <div className="p-3 bg-[#121824] border border-[#252D3D] rounded-2xl">
                  <div className="flex items-center justify-between text-gray-400 text-[10px] mb-1">
                    <span className="font-bold uppercase">Lifetime Mined</span>
                    <Award className="w-3.5 h-3.5 text-[#FFE600]" />
                  </div>
                  <div className="text-xl font-black text-[#FFE600] font-mono-digits">
                    {(statsData?.totalMined ?? analytics?.totalMinedPOP ?? 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono-digits mt-0.5">
                    POP produced
                  </div>
                </div>

                <div className="p-3 bg-[#121824] border border-[#252D3D] rounded-2xl">
                  <div className="flex items-center justify-between text-gray-400 text-[10px] mb-1">
                    <span className="font-bold uppercase">Withdrawals</span>
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <div className="text-xl font-black text-red-400 font-mono-digits">
                    {statsData?.totalWithdrawals ?? withdrawals.length}
                  </div>
                  <div className="text-[10px] text-red-300 font-mono-digits mt-0.5">
                    {analytics?.totalPendingWithdrawalsCount ?? pendingWithdrawals.length} Pending
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS */}
          {activeAdminTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121824] border border-[#252D3D] p-3.5 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">User Directory & Management</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-[#00E5FF] font-semibold border border-cyan-500/30 font-mono-digits">
                      {usersPagination.total} Registered
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    Real-time search by Name, Telegram Username, or Telegram ID.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchUsersList(usersSearchQuery, usersPage)}
                    disabled={isUsersLoading}
                    className="px-3 py-1.5 rounded-xl bg-[#0B0E14] border border-[#252D3D] text-[11px] text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUsersLoading ? 'animate-spin text-[#00E5FF]' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={usersSearchQuery}
                  onChange={(e) => {
                    setUsersSearchQuery(e.target.value);
                    setUsersPage(1);
                  }}
                  placeholder="Search by Name, Telegram Username, or Telegram ID in real-time..."
                  className="w-full bg-[#0B0E14] border border-[#252D3D] focus:border-[#00E5FF] rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {paginatedUsers.map((u) => {
                  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Miner';
                  return (
                    <div
                      key={u.id || u.telegramId}
                      onClick={() => {
                        haptic.selection();
                        setSelectedUserProfile(u);
                      }}
                      className="p-3 bg-[#121824] hover:bg-[#161F2E] border border-[#252D3D] rounded-xl flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00E5FF]/20 to-blue-600/30 border border-[#00E5FF]/30 flex items-center justify-center font-bold text-white text-xs">
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{fullName}</div>
                          <div className="text-[10px] text-gray-400 font-mono">@{u.username || 'unknown'} • ID: {u.telegramId}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-[#FFE600] font-mono-digits">{u.balancePOP.toFixed(2)} POP</div>
                        <span className="text-[10px] text-gray-400">{u.tonWalletAddress ? 'Wallet Connected' : 'No Wallet'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: AD NETWORK */}
          {activeAdminTab === 'adNetwork' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Dynamic Ad Network</h3>
                <span className="text-[11px] text-gray-400">Switch providers and set block IDs in real-time</span>
              </div>
              <div className="p-4 bg-[#121824] border border-[#252D3D] rounded-2xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setEditableConfig({ ...editableConfig, adProvider: 'adsgram' });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      editableConfig.adProvider === 'adsgram'
                        ? 'bg-gradient-to-br from-cyan-950/40 to-[#121824] border-[#00E5FF] text-white shadow-lg'
                        : 'bg-[#0B0E14] border-[#252D3D] text-gray-400'
                    }`}
                  >
                    <span className="text-sm font-black text-white block">Adsgram</span>
                    <span className="text-[10px] text-gray-400">Official Telegram Mini App ads</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      setEditableConfig({ ...editableConfig, adProvider: 'monetag' });
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      editableConfig.adProvider === 'monetag'
                        ? 'bg-gradient-to-br from-amber-950/40 to-[#121824] border-[#FFE600] text-white shadow-lg'
                        : 'bg-[#0B0E14] border-[#252D3D] text-gray-400'
                    }`}
                  >
                    <span className="text-sm font-black text-white block">Monetag</span>
                    <span className="text-[10px] text-gray-400">Monetag publisher scripts</span>
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-white uppercase block mb-1">
                    Ad Provider Secret / Block ID
                  </label>
                  <input
                    type="text"
                    value={editableConfig.adProviderSecret || ''}
                    onChange={(e) => setEditableConfig({
                      ...editableConfig,
                      adProviderSecret: e.target.value.trim()
                    })}
                    placeholder="e.g. 12345"
                    className="w-full bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BALANCE & BONUS */}
          {activeAdminTab === 'balance' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">User Balance & Bonus Management</h3>
                <span className="text-[11px] text-gray-400">Credit or deduct POP with mandatory audit notes</span>
              </div>
              <div className="p-4 bg-[#121824] border border-[#252D3D] rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-[#FFE600] uppercase">Single User Adjustment</h4>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search username or telegram ID..."
                    value={selectedUserSearch}
                    onChange={(e) => setSelectedUserSearch(e.target.value)}
                    className="w-full bg-[#0B0E14] border border-[#252D3D] rounded-xl pl-3 pr-3 py-2 text-xs text-white"
                  />
                  {selectedUserSearch && (
                    <div className="mt-1.5 max-h-32 overflow-y-auto bg-[#0B0E14] border border-[#252D3D] rounded-xl divide-y divide-[#1E2638]">
                      {filteredUsers.slice(0, 5).map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            setSelectedTargetUser(u);
                            setSelectedUserSearch('');
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-[#1E2638] flex items-center justify-between"
                        >
                          <span className="font-bold text-white">@{u.username || 'unknown'} ({u.telegramId})</span>
                          <span className="text-gray-400 font-mono-digits">{u.balancePOP.toFixed(2)} POP</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTargetUser && (
                  <div className="p-2.5 bg-[#1A2234] border border-[#00E5FF]/40 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-[#00E5FF]">Target: @{selectedTargetUser.username || selectedTargetUser.telegramId}</span>
                    <button onClick={() => setSelectedTargetUser(null)} className="text-[10px] text-red-400 hover:underline">Change</button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid grid-cols-2 gap-1 bg-[#0B0E14] p-1 rounded-xl border border-[#252D3D]">
                    <button
                      type="button"
                      onClick={() => setBalanceMode('bonus')}
                      className={`py-1 rounded-lg text-xs font-bold ${balanceMode === 'bonus' ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}
                    >
                      + Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceMode('deduct')}
                      className={`py-1 rounded-lg text-xs font-bold ${balanceMode === 'deduct' ? 'bg-red-600 text-white' : 'text-gray-400'}`}
                    >
                      - Deduct
                    </button>
                  </div>
                  <input
                    type="number"
                    placeholder="Amount (POP)"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    className="bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-2 text-xs text-white font-mono-digits"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Reason / Audit Note (Mandatory)"
                  value={balanceReason}
                  onChange={(e) => setBalanceReason(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-2 text-xs text-white"
                />

                <button
                  onClick={handleApplySingleBalance}
                  disabled={loading || !selectedTargetUser || !balanceAmount || !balanceReason}
                  className="w-full py-2.5 bg-[#FFE600] text-black font-extrabold text-xs rounded-xl uppercase font-display disabled:opacity-50"
                >
                  Apply Balance Adjustment
                </button>
              </div>

              {/* Broadcast Bonus */}
              <div className="p-4 bg-[#121824] border border-[#252D3D] rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-[#00E5FF] uppercase">Broadcast Bonus to ALL Users</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Amount POP per user"
                    value={broadcastAmount}
                    onChange={(e) => setBroadcastAmount(e.target.value)}
                    className="bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-2 text-xs text-white font-mono-digits"
                  />
                  <input
                    type="text"
                    placeholder="Reason Note"
                    value={broadcastReason}
                    onChange={(e) => setBroadcastReason(e.target.value)}
                    className="bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <button
                  onClick={handleBroadcastBonus}
                  disabled={loading || !broadcastAmount || !broadcastReason}
                  className="w-full py-2.5 bg-[#00E5FF] text-black font-extrabold text-xs rounded-xl uppercase font-display disabled:opacity-50"
                >
                  Broadcast Bonus
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: WITHDRAWALS */}
          {activeAdminTab === 'withdrawals' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Withdrawal Requests</h3>
                  <span className="text-[11px] text-gray-400">Review pending withdrawals and process payouts</span>
                </div>
                <div className="flex gap-1 bg-[#0B0E14] p-1 rounded-xl border border-[#252D3D] text-[10px]">
                  {(['ALL', 'PENDING', 'PAID', 'REJECTED'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setWithdrawalFilter(status)}
                      className={`px-2 py-0.5 rounded-lg font-bold ${withdrawalFilter === status ? 'bg-[#1E2638] text-white' : 'text-gray-400'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredWithdrawals.map((wd) => (
                  <div key={wd.id} className="p-3.5 bg-[#121824] border border-[#252D3D] rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white">@{wd.username || wd.telegramId}</div>
                        <span className="text-[10px] text-gray-400">{formatDateDDMMYYYY(wd.createdAt)}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        wd.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                        wd.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                        'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {wd.status}
                      </span>
                    </div>

                    <div className="p-2 bg-[#0B0E14] rounded-xl text-xs flex justify-between font-mono-digits">
                      <span>Request: {wd.amountPOP} POP</span>
                      <span className="text-emerald-400 font-bold">Net: {wd.netAmountPOP} POP</span>
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono break-all">
                      Wallet: {wd.tonAddress}
                    </div>

                    {wd.status === 'PENDING' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleProcessWithdrawal(wd.id, 'reject')}
                          className="flex-1 py-1.5 bg-red-600/20 text-red-400 rounded-xl font-bold"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleProcessWithdrawal(wd.id, 'paid')}
                          className="flex-1 py-1.5 bg-emerald-600 text-white rounded-xl font-bold"
                        >
                          Mark Paid
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: MINING LEVELS */}
          {activeAdminTab === 'mining' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-white uppercase font-display">Mining Levels Config (50 Levels)</h3>
                  <span className="text-[11px] text-gray-400">Configure speed and cost for each tier</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkSaveMiningLevels}
                    className="px-3 py-1.5 bg-[#FFE600] text-black font-extrabold text-xs rounded-xl"
                  >
                    Save All 50
                  </button>
                  <button
                    onClick={handleResetMiningLevelsToDefaults}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-bold"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {editableConfig.minerTiers.slice(0, 10).map((miner, index) => (
                  <div key={miner.level} className="p-3 bg-[#121824] border border-[#252D3D] rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white">Level {miner.level}: {miner.name}</span>
                      <div className="text-[10px] text-gray-400 font-mono">{miner.speedPerHour} POP/h • {miner.pricePOP} POP</div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        step="0.01"
                        value={miner.speedPerHour}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const updated = [...editableConfig.minerTiers];
                          updated[index] = { ...updated[index], speedPerHour: Number(val.toFixed(2)) };
                          setEditableConfig({ ...editableConfig, minerTiers: updated });
                        }}
                        className="w-20 bg-[#0B0E14] border border-[#252D3D] rounded-lg px-2 py-1 text-white font-mono text-xs"
                      />
                      <button
                        onClick={() => handleSaveSingleMiningLevel(miner.level)}
                        className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: TASKS */}
          {activeAdminTab === 'tasks' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Missions & Quests</h3>
              <div className="p-3 bg-[#121824] border border-[#252D3D] rounded-2xl space-y-2">
                <input
                  type="text"
                  placeholder="Task Title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-1.5 text-xs text-white"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Reward POP"
                    value={newTaskReward}
                    onChange={(e) => setNewTaskReward(e.target.value)}
                    className="w-24 bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="URL"
                    value={newTaskUrl}
                    onChange={(e) => setNewTaskUrl(e.target.value)}
                    className="flex-1 bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <button onClick={handleAddTask} className="w-full py-2 bg-[#00E5FF] text-black font-bold rounded-xl text-xs">
                  Add Mission
                </button>
              </div>

              <div className="space-y-2">
                {editableConfig.tasks?.map(t => (
                  <div key={t.id} className="p-3 bg-[#121824] border border-[#252D3D] rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white">{t.title}</div>
                      <span className="text-[10px] text-[#FFE600] font-mono">+{t.rewardPOP} POP</span>
                    </div>
                    <button onClick={() => handleDeleteTask(t.id)} className="text-red-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: REFERRALS */}
          {activeAdminTab === 'referrals' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Referral & Commission Rates</h3>
              <div className="p-4 bg-[#121824] border border-[#252D3D] rounded-2xl space-y-3">
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Squad Mining Commission (%)</label>
                  <input
                    type="number"
                    value={editableConfig.referralCommissionPercent}
                    onChange={(e) => setEditableConfig({
                      ...editableConfig,
                      referralCommissionPercent: parseFloat(e.target.value) || 10,
                      squadCommissionRate: parseFloat(e.target.value) || 10,
                    })}
                    className="w-full bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-300 block mb-1">Instant Qualified Referral Bonus (POP)</label>
                  <input
                    type="number"
                    value={editableConfig.instantReferralBonusPOP}
                    onChange={(e) => setEditableConfig({
                      ...editableConfig,
                      instantReferralBonusPOP: parseFloat(e.target.value) || 100,
                      referral_bonus: parseFloat(e.target.value) || 100,
                      referralBonusAmount: parseFloat(e.target.value) || 100,
                    })}
                    className="w-full bg-[#0B0E14] border border-[#252D3D] rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
