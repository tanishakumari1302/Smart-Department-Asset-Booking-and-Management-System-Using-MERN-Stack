import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, AcademicSettings, calculateDefaultAcademicYear, NavTab, Booking, Asset, StaffMember, buildMergedStaffLists } from '../types';
import { detectPortalFromUrl } from '../utils/portalUtils';
import { SharePortalModal } from './SharePortalModal';

export interface NotificationItem {
  id: string;
  title: string;
  time: string;
  text: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  read: boolean;
  targetTab?: NavTab;
  targetAssetCode?: string;
}

interface HeaderProps {
  currentUser: User | null;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  academicSettings?: AcademicSettings;
  onOpenAcademicSettingsModal?: () => void;
  onOpenAuthModal?: () => void;
  onSignOut: () => void;
  unreadNotificationsCount?: number;
  onToggleMobileNav?: () => void;
  totalAssetsCount?: number;
  previewRole?: string | null;
  onSwitchPreviewRole?: (role: any) => void;
  realUserRole?: string;
  onSwitchUser?: (user: User) => void;
  onSelectNavTab?: (tab: NavTab, assetCode?: string) => void;
  currentTab?: NavTab;
  bookings?: Booking[];
  assets?: Asset[];
  staffDirectory?: StaffMember[];
  showToast?: (text: string, type: 'success' | 'warning' | 'info') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  currentTab,
  onSearchChange,
  searchQuery,
  academicSettings,
  onOpenAcademicSettingsModal,
  onOpenAuthModal,
  onSignOut,
  unreadNotificationsCount: externalUnreadCount,
  onToggleMobileNav,
  totalAssetsCount,
  previewRole,
  onSwitchPreviewRole,
  realUserRole,
  onSwitchUser,
  onSelectNavTab,
  bookings,
  assets,
  staffDirectory = [],
  showToast,
}) => {
  const { admins: liveAdmins, faculty: liveFaculty } = useMemo(
    () => buildMergedStaffLists(staffDirectory),
    [staffDirectory]
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  // Admin Security PIN Gate state
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  // Check if link specifically restricts to Faculty portal only
  const isFacultyOnlyMode = typeof window !== 'undefined' && detectPortalFromUrl() === 'faculty';

  const isFaculty = currentUser?.role === 'faculty';

  // Dynamic notification list
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => [
    {
      id: 'notif-1',
      title: 'Due Today: Projector Screen #2',
      time: '04:30 PM',
      text: 'Return due today by 4:30 PM at Lab 3 Annex. Click to manage active booking.',
      type: 'alert',
      read: false,
      targetTab: 'my-requests-and-bookings',
      targetAssetCode: 'AST-0012',
    },
    {
      id: 'notif-2',
      title: 'Low Stock: Whiteboard Markers (Black)',
      time: '09:30 AM',
      text: 'Only 4 units left in Central Dispense Shelf. Click to inspect inventory catalog.',
      type: 'warning',
      read: false,
      targetTab: 'browse-catalog',
      targetAssetCode: 'AST-0002',
    },
    {
      id: 'notif-3',
      title: 'New Requisition: REQ-2026-091',
      time: '10:00 AM',
      text: 'HDMI Cable (3m 4K) issued for Lecture Hall. Click to view custody & return proof.',
      type: 'info',
      read: false,
      targetTab: 'my-requests-and-bookings',
      targetAssetCode: 'AST-0020',
    },
  ]);

  // Sync real bookings into notifications
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      const pendingBookings = bookings.filter((b) => b.status === 'pending');
      if (pendingBookings.length > 0) {
        setNotifications((prev) => {
          const newItems: NotificationItem[] = [];
          pendingBookings.slice(0, 3).forEach((pb) => {
            const id = 'booking-' + (pb.id || pb._id || pb.reqId);
            if (!prev.some((item) => item.id === id)) {
              newItems.push({
                id,
                title: `Pending Request: ${pb.assetName || pb.assetCode}`,
                time: 'Recent',
                text: `${pb.reqId}: Requisition for ${pb.venue || 'Lecture Hall'} in queue. Click to review.`,
                type: 'info',
                read: false,
                targetTab: isFaculty ? 'my-requests-and-bookings' : 'request-approvals',
                targetAssetCode: pb.assetCode,
              });
            }
          });
          return [...newItems, ...prev];
        });
      }
    }
  }, [bookings, isFaculty]);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (item: NotificationItem) => {
    // Mark this notification as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    // Navigate to target tab
    if (onSelectNavTab && item.targetTab) {
      onSelectNavTab(item.targetTab, item.targetAssetCode);
    }
    setShowNotifications(false);
  };

  const handleDismissNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-white/95 backdrop-blur-md z-40 px-4 lg:px-6 flex items-center justify-between border-b border-[#e5eeff] shadow-sm select-none">
      {/* Left: Department & Search */}
      <div className="flex items-center gap-3 lg:gap-4">
        {onToggleMobileNav && (
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="lg:hidden p-2 rounded-lg text-[#0e1c2f] hover:bg-[#eff4ff] transition-colors"
            aria-label="Toggle navigation"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        )}

        <div
          onClick={isAdmin ? onOpenAcademicSettingsModal : undefined}
          title={isAdmin ? 'Click to configure Academic Year & Term' : undefined}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#eff4ff] text-[#426086] rounded-lg border border-[#cbdbf5]/50 ${
            isAdmin ? 'cursor-pointer hover:bg-[#cbdbf5]/50 transition-colors' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          <span className="text-xs font-semibold uppercase tracking-wider truncate max-w-[320px]">
            {currentUser?.department
              ? `${currentUser.department} • AY ${academicSettings?.shortYear || calculateDefaultAcademicYear().shortYear}`
              : `College Central Lab • AY ${academicSettings?.shortYear || calculateDefaultAcademicYear().shortYear}`}
          </span>
          {isAdmin && (
            <span className="material-symbols-outlined text-[14px] text-[#009299]">tune</span>
          )}
        </div>

        <div className="relative flex items-center w-48 sm:w-64 lg:w-80">
          <span className="material-symbols-outlined absolute left-3 text-[#44474c] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${totalAssetsCount ?? 0} assets, serial, SKU or faculty...`}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#e5eeff]/60 text-[#0b1c30] text-xs placeholder:text-[#44474c] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white transition-all border border-transparent focus:border-[#009299]"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-xs text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
        {/* Direct Portal Switcher Pill: Faculty vs Admin/Office Staff */}
        {onSwitchUser && (
          <div className="hidden sm:flex items-center p-1 bg-[#e5eeff] rounded-xl border border-[#cbdbf5] gap-1 shadow-2xs">
            {/* If user is an Admin (or previewing faculty with realUserRole === 'admin'): Provide direct 0-lock 2-way navigation */}
            {(realUserRole === 'admin' || (currentUser?.role === 'admin' && !previewRole)) ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchPreviewRole) onSwitchPreviewRole(null);
                    onSelectNavTab?.('dashboard');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    !previewRole && currentTab !== 'my-requests-and-bookings' && currentTab !== 'new-request'
                      ? 'bg-[#0e1c2f] text-white shadow-xs'
                      : 'text-[#426086] hover:text-[#0b1c30] hover:bg-white/60'
                  }`}
                  title="Admin Command Center Dashboard & Full Operations"
                >
                  <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                  <span>Admin Command Center</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchPreviewRole) onSwitchPreviewRole('faculty');
                    onSelectNavTab?.('my-requests-and-bookings');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    previewRole === 'faculty' ||
                    currentTab === 'my-requests-and-bookings' ||
                    currentTab === 'new-request' ||
                    currentTab === 'interactive-requisition-desk' ||
                    currentTab === 'my-activity-booking' ||
                    currentTab === 'pending-requests' ||
                    currentTab === 'assigned-assets' ||
                    currentTab === 'consumable-quota'
                      ? 'bg-[#009299] text-white shadow-xs'
                      : 'text-[#426086] hover:text-[#0b1c30] hover:bg-white/60'
                  }`}
                  title="View Full Faculty Portal & Requisition Desk"
                >
                  <span className="material-symbols-outlined text-[16px]">school</span>
                  <span>Faculty Desk View</span>
                  {previewRole === 'faculty' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  )}
                </button>

                {/* Quick selector between Authorized Admins */}
                <select
                  value={currentUser?.id || currentUser?._id}
                  onChange={(e) => {
                    const target = liveAdmins.find((s) => s.id === e.target.value || s._id === e.target.value);
                    if (target) {
                      onSwitchUser({
                        ...target,
                        role: 'admin',
                        approvalStatus: 'approved',
                      });
                    }
                  }}
                  className="h-7 pl-1.5 pr-2 bg-white text-[#0e1c2f] border border-[#cbdbf5] rounded-md text-[11px] font-bold focus:outline-none cursor-pointer shadow-2xs max-w-[170px] truncate ml-1"
                  title="Active Admin Profile"
                >
                  {liveAdmins.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} ({staff.businessRole || staff.designation})
                    </option>
                  ))}
                </select>
              </>
            ) : (
              /* If real user is Faculty Role: Strictly pure faculty desk */
              <>
                <button
                  type="button"
                  onClick={() => onSelectNavTab?.('my-requests-and-bookings')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-[#009299] text-white shadow-xs"
                  title="Faculty Portal Desk"
                >
                  <span className="material-symbols-outlined text-[16px]">school</span>
                  <span>Faculty Portal</span>
                </button>

                {/* Faculty Account Selector */}
                <select
                  value={currentUser?.id || currentUser?._id}
                  onChange={(e) => {
                    const target = liveFaculty.find((f) => (f.id === e.target.value || f._id === e.target.value));
                    if (target) {
                      onSwitchUser({
                        ...target,
                        role: 'faculty',
                        approvalStatus: 'approved',
                      });
                    }
                  }}
                  className="h-7 pl-1.5 pr-2 bg-white text-[#004f55] border border-[#009299]/30 rounded-md text-[11px] font-bold focus:outline-none cursor-pointer shadow-2xs max-w-[150px] truncate"
                  title="Select Faculty Profile"
                >
                  {liveFaculty.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} • {fac.businessRole || fac.designation}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Share Official Department Links */}
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="px-2.5 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#cbdbf5] text-[#004f55] hover:text-[#002022] transition-colors flex items-center gap-1.5 text-xs font-bold shadow-2xs border border-[#cbdbf5]/60 cursor-pointer"
          title="Share Faculty and Admin Links (24/7 Cloud Active)"
        >
          <span className="material-symbols-outlined text-[17px] text-[#009299]">share</span>
          <span className="hidden sm:inline">Share Links</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-[#44474c] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-all cursor-pointer"
            title="Academic Event Notifications"
            aria-label="Academic Event Notifications"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#ba1a1a] text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white rounded-xl shadow-2xl border border-[#cbdbf5] p-3.5 flex flex-col gap-2.5 z-50 animate-in fade-in duration-150">
              {/* Header with Title & Mark All Read */}
              <div className="flex items-center justify-between pb-2.5 border-b border-[#e5eeff]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#009299]">campaign</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0b1c30]">
                    Notifications
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ba1a1a]/10 text-[#ba1a1a] font-bold">
                      {unreadCount} Unread
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                      All Read
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] text-[#009299] hover:text-[#007a80] font-semibold hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Notification Items List */}
              <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-0.5 divide-y divide-[#f1f5f9]">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center text-[#72777f]">
                    <span className="material-symbols-outlined text-[36px] text-emerald-500 mb-1">
                      check_circle
                    </span>
                    <span className="text-xs font-bold text-[#0b1c30]">All Caught Up!</span>
                    <span className="text-[11px] text-[#72777f] mt-0.5">No pending notifications at this moment.</span>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const iconColor =
                      n.type === 'alert'
                        ? 'text-rose-600 bg-rose-50'
                        : n.type === 'warning'
                        ? 'text-amber-600 bg-amber-50'
                        : n.type === 'success'
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-sky-600 bg-sky-50';

                    const iconName =
                      n.type === 'alert'
                        ? 'warning'
                        : n.type === 'warning'
                        ? 'inventory_2'
                        : n.type === 'success'
                        ? 'verified'
                        : 'assignment';

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`pt-2 first:pt-0 p-2.5 rounded-lg transition-all text-left flex items-start gap-2.5 cursor-pointer group ${
                          !n.read
                            ? 'bg-[#eff4ff]/80 hover:bg-[#e4edff] border-l-3 border-[#009299]'
                            : 'bg-white hover:bg-[#f8fafd] opacity-85'
                        }`}
                        title={n.targetTab ? 'Click to navigate and view details' : undefined}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${iconColor}`}>
                          <span className="material-symbols-outlined text-[18px]">{iconName}</span>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs truncate ${!n.read ? 'font-bold text-[#0b1c30]' : 'font-semibold text-[#44474c]'}`}>
                              {n.title}
                            </span>
                            <span className="text-[10px] text-[#72777f] font-mono shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-[#44474c] line-clamp-2 leading-relaxed">{n.text}</p>
                          {n.targetTab && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] text-[#009299] font-bold group-hover:translate-x-0.5 transition-transform">
                              <span>Open & View</span>
                              <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                            </div>
                          )}
                        </div>

                        {/* Dismiss button */}
                        <button
                          type="button"
                          onClick={(e) => handleDismissNotification(e, n.id)}
                          className="shrink-0 p-1 text-[#a0a5ad] hover:text-[#ba1a1a] rounded hover:bg-white/80 transition-colors cursor-pointer"
                          title="Dismiss notification"
                          aria-label="Dismiss notification"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-[#e5eeff] flex items-center justify-between text-xs">
                {notifications.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[#72777f] hover:text-[#ba1a1a] font-medium transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                ) : <span />}
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="px-3 py-1 rounded-md bg-[#eff4ff] hover:bg-[#cbdbf5] text-[#0e1c2f] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            type="button"
            className="flex items-center gap-2.5 pl-2 py-1 pr-2 rounded-lg hover:bg-[#eff4ff] transition-all border border-transparent hover:border-[#cbdbf5]/50 text-left"
            title="User Profile & Sign Out"
          >
            <div className="flex flex-col text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs font-semibold text-[#0b1c30] truncate max-w-[130px]">
                  {currentUser?.name || 'User'}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  currentUser?.role === 'admin'
                    ? 'bg-[#0e1c2f] text-white'
                    : currentUser?.role === 'hod'
                    ? 'bg-[#002022] text-[#009299]'
                    : currentUser?.role === 'tech'
                    ? 'bg-[#dce9ff] text-[#004f55]'
                    : 'bg-[#009299] text-white font-bold'
                }`}>
                  {currentUser?.role || 'Faculty'}
                </span>
              </div>
              <span className="text-[10px] text-[#44474c] truncate max-w-[150px]">
                {currentUser?.department || 'College Member'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#0e1c2f] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm overflow-hidden">
              {currentUser?.avatar && currentUser.avatar.startsWith('http') ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser?.name
                  ? currentUser.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                  : 'U'
              )}
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-[#cbdbf5] p-3 flex flex-col gap-2.5 z-50 animate-in fade-in duration-150">
              <div className="flex flex-col pb-2 border-b border-[#e5eeff]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0b1c30]">{currentUser?.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#0e1c2f] text-white">
                    {currentUser?.role}
                  </span>
                </div>
                <span className="text-[11px] text-[#44474c] font-mono truncate">{currentUser?.email}</span>
                <span className="text-[10px] text-[#009299] font-mono mt-0.5">
                  ID: {currentUser?.facultyId || 'FAC-MEMBER'}
                </span>
              </div>

              <div className="text-[11px] text-[#44474c]">
                <span className="font-semibold text-[#0b1c30]">Department:</span>
                <p className="truncate text-[#0b1c30] mt-0.5">{currentUser?.department || 'Central Academic Hub'}</p>
              </div>

              <div className="text-[11px] text-[#44474c]">
                <span className="font-semibold text-[#0b1c30]">Designation:</span>
                <p className="truncate text-[#0b1c30] mt-0.5">{currentUser?.designation || 'Faculty Member'}</p>
              </div>

              {isAdmin && onOpenAcademicSettingsModal && (
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onOpenAcademicSettingsModal();
                  }}
                  className="w-full h-8 mt-1 rounded-lg bg-[#eff4ff] text-[#426086] hover:bg-[#cbdbf5] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#009299]">edit_calendar</span>
                  <span>Academic Year &amp; Term Settings</span>
                </button>
              )}

              {(realUserRole === 'admin' || isAdmin) && onSwitchPreviewRole && (
                <div className="pt-2 border-t border-[#e5eeff] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#77849c]">
                      Switch Role Perspective
                    </span>
                    {previewRole && (
                      <span className="text-[10px] font-bold text-[#009299]">Preview Active</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchPreviewRole(null);
                        setShowUserMenu(false);
                      }}
                      className={`h-7 px-2 rounded text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        previewRole === null
                          ? 'bg-[#0e1c2f] text-white shadow-xs'
                          : 'bg-[#eff4ff] text-[#426086] hover:bg-[#cbdbf5]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">shield_person</span>
                      <span>Admin View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchPreviewRole('faculty');
                        setShowUserMenu(false);
                      }}
                      className={`h-7 px-2 rounded text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        previewRole === 'faculty'
                          ? 'bg-[#009299] text-white shadow-xs'
                          : 'bg-[#eff4ff] text-[#426086] hover:bg-[#cbdbf5]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">school</span>
                      <span>Faculty View</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Account Switcher (Admin-only for Admin profiles; Faculty only sees Faculty profiles) */}
              {onSwitchUser && (
                <div className="pt-2 border-t border-[#e5eeff] flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#77849c]">
                    Quick Switch Account
                  </span>
                  <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
                    {(realUserRole === 'admin' || isAdmin) && (
                      <>
                        <span className="text-[9px] font-bold uppercase text-[#009299]">Admin &amp; Office Staff</span>
                        {liveAdmins.map((staff) => (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => {
                              onSwitchUser({ ...staff, role: 'admin', approvalStatus: 'approved' });
                              setShowUserMenu(false);
                            }}
                            className={`text-left px-2 py-1 rounded text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                              currentUser?.email === staff.email
                                ? 'bg-[#0e1c2f] text-white font-semibold'
                                : 'hover:bg-[#eff4ff] text-[#0b1c30]'
                            }`}
                          >
                            <span className="truncate">{staff.name}</span>
                            <span className="text-[9px] uppercase font-bold text-teal-400">Admin</span>
                          </button>
                        ))}
                      </>
                    )}

                    <span className="text-[9px] font-bold uppercase text-[#009299] mt-1">Authorized Faculty</span>
                    {liveFaculty.map((fac) => (
                      <button
                        key={fac.id}
                        type="button"
                        onClick={() => {
                          onSwitchUser({ ...fac, role: 'faculty', approvalStatus: 'approved' });
                          setShowUserMenu(false);
                        }}
                        className={`text-left px-2 py-1 rounded text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                          currentUser?.email === fac.email
                            ? 'bg-[#009299] text-white font-semibold'
                            : 'hover:bg-[#eff4ff] text-[#0b1c30]'
                        }`}
                      >
                        <span className="truncate">{fac.name}</span>
                        <span className="text-[9px] text-[#77849c] font-mono">{fac.facultyId}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowUserMenu(false);
                  onSignOut();
                }}
                className="w-full h-8 mt-1 rounded-lg bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Administrator Security Verification Modal (Passcode Protected) */}
      {isAdminPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] w-full max-w-md p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0e1c2f] text-amber-400 flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0b1c30]">Administrator Security Gate</h3>
                  <p className="text-[11px] text-[#426086]">Enter Authorized Staff Passcode</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdminPinModalOpen(false);
                  setAdminPinInput('');
                  setAdminPinError('');
                }}
                className="p-1.5 rounded-lg text-[#77849c] hover:bg-[#eff4ff] hover:text-[#0b1c30] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-amber-700 shrink-0 mt-0.5">verified_user</span>
              <div className="flex flex-col gap-0.5">
                <p className="font-bold">Restricted Campus Operations Area</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  The Admin &amp; Office Staff Command Center gives full control over Central Inventory, Approvals, and Dispatches. Faculty members cannot switch to Admin mode without authorized security clearance.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Valid Passcodes: 2026 or 1234 or admin
                const val = adminPinInput.trim().toLowerCase();
                if (val === '2026' || val === '1234' || val === 'admin') {
                  const staffTarget = liveAdmins[0];
                  if (staffTarget && onSwitchPreviewRole) onSwitchPreviewRole(null);
                  if (staffTarget && onSwitchUser) {
                    onSwitchUser({
                      ...staffTarget,
                      role: 'admin',
                      approvalStatus: 'approved',
                    });
                  }
                  setIsAdminPinModalOpen(false);
                  setAdminPinInput('');
                  setAdminPinError('');
                } else {
                  setAdminPinError('Invalid administrator security passcode. Access denied.');
                }
              }}
              className="flex flex-col gap-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1.5">
                  Admin Passcode (Malay Aggarwal / Arpit Singh)
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#77849c] text-[18px]">
                    pin
                  </span>
                  <input
                    type="password"
                    autoFocus
                    required
                    value={adminPinInput}
                    onChange={(e) => {
                      setAdminPinInput(e.target.value);
                      if (adminPinError) setAdminPinError('');
                    }}
                    placeholder="Enter 4-digit Passcode (Passcode: 2026)"
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#cbdbf5] text-sm text-[#0b1c30] font-mono tracking-widest focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] bg-[#eff4ff]/20"
                  />
                </div>
                {adminPinError && (
                  <p className="text-xs text-[#ba1a1a] font-medium mt-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    <span>{adminPinError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminPinModalOpen(false);
                    setAdminPinInput('');
                    setAdminPinError('');
                  }}
                  className="flex-1 h-10 rounded-lg border border-[#cbdbf5] text-xs font-semibold text-[#426086] hover:bg-[#eff4ff] transition-all cursor-pointer"
                >
                  Cancel (Stay in Faculty Portal)
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-lg bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">lock_open</span>
                  <span>Unlock Admin Portal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Department Links Modal */}
      <SharePortalModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        showToast={showToast}
      />
    </header>
  );
};
