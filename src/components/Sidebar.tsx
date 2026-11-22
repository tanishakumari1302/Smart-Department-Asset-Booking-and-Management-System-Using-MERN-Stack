import React from 'react';
import { User, ClusterInfo, AcademicSettings, calculateDefaultAcademicYear, NavTab, isTabAllowedForRole, DashboardKPIs } from '../types';

export type { NavTab };

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User | null;
  pendingApprovalsCount: number;
  totalAssetsCount: number;
  cluster: ClusterInfo | null;
  academicSettings?: AcademicSettings;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  realUserRole?: string;
  previewRole?: string | null;
  onSwitchPreviewRole?: (role: any) => void;
  activeBookingsCount?: number;
  pendingRequestsCount?: number;
  assignedAssetsCount?: number;
  kpis?: DashboardKPIs | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  pendingApprovalsCount,
  totalAssetsCount,
  cluster,
  academicSettings,
  isMobileOpen = false,
  onCloseMobile,
  realUserRole,
  previewRole,
  onSwitchPreviewRole,
  activeBookingsCount = 1,
  pendingRequestsCount = 1,
  assignedAssetsCount = 1,
  kpis,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-[#0e1c2f] z-50 flex flex-col justify-between overflow-y-auto shadow-[0_1px_8px_rgba(0,0,0,0.15)] text-white select-none transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between bg-[#0e1c2f] border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#009299] flex items-center justify-center font-bold text-white shadow-md">
                <span className="material-symbols-outlined text-[22px]">dns</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-white font-['Inter']">AssetHub</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#002022] text-[#009299] text-[10px] font-bold uppercase tracking-wider">
                    ERP
                  </span>
                </div>
                <span className="text-[11px] text-[#77849c] font-semibold tracking-wider uppercase">
                  College Asset Mgmt
                </span>
              </div>
            </div>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1 text-[#cbdbf5] hover:text-white"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            )}
          </div>

        {/* Academic Node Context */}
        <div className="px-4 py-2.5">
          <div className="px-3 py-2 bg-white/5 rounded-lg flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#009299] text-[16px]">school</span>
              <span
                className="text-xs text-[#cbdbf5] font-medium truncate max-w-[140px]"
                title={currentUser?.department || 'College Central Node'}
              >
                {currentUser?.department || 'College Central Node'}
              </span>
            </div>
            <span className="text-xs text-[#009299] font-semibold font-mono">
              AY {academicSettings?.shortYear || calculateDefaultAcademicYear().shortYear}
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        {(() => {
          const role = currentUser?.role;

          // Dedicated Faculty Navigation: Browse Catalog + Requested Items + Separate Requisition Desk section
          if (role === 'faculty') {
            return (
              <nav className="flex-1 px-3 py-1 flex flex-col gap-3 text-sm">
                {/* Section 1: Catalog & Faculty Services */}
                <div className="flex flex-col gap-1">
                  <span className="px-3 py-1 text-[11px] uppercase text-[#009299] font-bold tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">school</span>
                    <span>Faculty Services</span>
                  </span>

                  {/* 1. Browse Catalog */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('browse-catalog');
                      onCloseMobile?.();
                    }}
                    className={`flex items-center w-full px-3 py-2.5 rounded-lg font-semibold transition-all text-left cursor-pointer ${
                      currentTab === 'browse-catalog'
                        ? 'bg-[#009299] text-white shadow-sm font-bold'
                        : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-2.5 text-[20px]">inventory_2</span>
                    <span>Browse Catalog</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-white/15 text-white font-mono">
                      {totalAssetsCount || 21}
                    </span>
                  </button>

                  {/* 2. My Activity Booking */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('my-activity-booking');
                      onCloseMobile?.();
                    }}
                    className={`flex items-center w-full px-3 py-2.5 rounded-lg font-semibold transition-all text-left cursor-pointer ${
                      currentTab === 'my-activity-booking'
                        ? 'bg-[#009299] text-white shadow-sm font-bold'
                        : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-2.5 text-[20px]">pending_actions</span>
                    <span>My Activity Booking</span>
                    <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-[#ffdad6]/20 text-rose-300 font-bold border border-rose-400/30">
                      {activeBookingsCount} Active
                    </span>
                  </button>

                  {/* 3. Pending Requests */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('pending-requests');
                      onCloseMobile?.();
                    }}
                    className={`flex items-center w-full px-3 py-2.5 rounded-lg font-semibold transition-all text-left cursor-pointer ${
                      currentTab === 'pending-requests'
                        ? 'bg-[#009299] text-white shadow-sm font-bold'
                        : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-2.5 text-[20px]">hourglass_top</span>
                    <span>Pending Requests</span>
                    <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                      {pendingRequestsCount} Pending
                    </span>
                  </button>

                  {/* 4. Assigned Assets */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('assigned-assets');
                      onCloseMobile?.();
                    }}
                    className={`flex items-center w-full px-3 py-2.5 rounded-lg font-semibold transition-all text-left cursor-pointer ${
                      currentTab === 'assigned-assets'
                        ? 'bg-[#009299] text-white shadow-sm font-bold'
                        : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-2.5 text-[20px]">laptop_mac</span>
                    <span>Assigned Assets</span>
                    <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-blue-400/20 text-blue-200 font-bold border border-blue-400/30">
                      {assignedAssetsCount} Permanent
                    </span>
                  </button>

                  {/* 5. Consumable Quota */}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('consumable-quota');
                      onCloseMobile?.();
                    }}
                    className={`flex items-center w-full px-3 py-2.5 rounded-lg font-semibold transition-all text-left cursor-pointer ${
                      currentTab === 'consumable-quota'
                        ? 'bg-[#009299] text-white shadow-sm font-bold'
                        : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-2.5 text-[20px]">battery_charging_full</span>
                    <span>Consumable Quota</span>
                    <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-bold border border-teal-400/30">
                      85% Rem.
                    </span>
                  </button>
                </div>

                {/* Section 2: SEPARATE SIDE SECTION FOR INTERACTIVE ASSET REQUISITION DESK */}
                <div className="pt-2 border-t border-white/10 flex flex-col gap-1">
                  <span className="px-3 py-1 text-[11px] uppercase text-teal-300 font-bold tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">edit_calendar</span>
                    <span>Requisition &amp; Booking</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('interactive-requisition-desk');
                      onCloseMobile?.();
                    }}
                    className={`flex items-center w-full px-3 py-2.5 rounded-lg font-semibold transition-all text-left cursor-pointer group ${
                      currentTab === 'interactive-requisition-desk' || currentTab === 'new-request'
                        ? 'bg-gradient-to-r from-[#009299] to-[#006e73] text-white shadow-md font-bold border border-teal-300/40'
                        : 'bg-white/5 hover:bg-white/15 text-white border border-white/10'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-2.5 text-[20px] text-teal-300 group-hover:scale-110 transition-transform">
                      add_circle
                    </span>
                    <div className="flex flex-col">
                      <span className="leading-tight font-bold">Interactive Asset Requisition Desk</span>
                      <span className="text-[10px] text-teal-200/80 font-normal">Book Equipment &amp; Labs</span>
                    </div>
                  </button>
                </div>

                {(realUserRole === 'admin' || previewRole !== null) && onSwitchPreviewRole && (
                  <div className="pt-3 mt-1 border-t border-white/10 flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
                      Administrator Access
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchPreviewRole(null);
                        onSelectTab('dashboard');
                      }}
                      className="flex items-center w-full px-3 py-2 rounded-lg bg-linear-to-r from-[#004f55] to-[#0e1c2f] hover:from-[#003d42] hover:to-[#071322] border border-[#009299]/50 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined mr-2 text-[18px] text-[#75f5fd]">admin_panel_settings</span>
                      <span>Return to Admin Portal</span>
                    </button>
                  </div>
                )}
              </nav>
            );
          }

          // Admin & Office Staff Navigation (AssetHub Command Center & Modules)
          const showDashboard = isTabAllowedForRole('dashboard', role);
          const showBrowseCatalog = isTabAllowedForRole('browse-catalog', role);

          const showNewRequest = isTabAllowedForRole('new-request', role);
          const showMyRequests = isTabAllowedForRole('my-requests-and-bookings', role);
          const showApprovals = isTabAllowedForRole('request-approvals', role);
          const showFacultyCustody = isTabAllowedForRole('faculty-custody-stationery', role);
          const showSection2 = showNewRequest || showMyRequests || showApprovals || showFacultyCustody;

          const showInventory = isTabAllowedForRole('asset-inventory-and-stock', role);
          const showIssueReturn = isTabAllowedForRole('issue-and-return-desk', role);
          const showPermAlloc = isTabAllowedForRole('permanent-allocations', role);
          const showSection3 = showInventory || showIssueReturn || showPermAlloc;

          const showBarcodes = isTabAllowedForRole('categories-and-barcodes', role);
          const showUserMgmt = isTabAllowedForRole('user-management', role);
          const showReports = isTabAllowedForRole('reports-and-analytics', role);
          const showAudit = isTabAllowedForRole('audit-log', role);
          const showSection4 = showBarcodes || showUserMgmt || showReports || showAudit;

          return (
            <nav className="flex-1 px-3 py-1 flex flex-col gap-3 text-sm">
              {/* Section 1: Overview */}
              <div className="flex flex-col gap-0.5">
                <span className="px-3 py-1 text-[11px] uppercase text-[#77849c] font-bold tracking-wider">
                  1. Overview
                </span>
                {showDashboard && (
                  <button
                    onClick={() => onSelectTab('dashboard')}
                    className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                      currentTab === 'dashboard'
                        ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                        : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-2.5 text-[20px]">space_dashboard</span>
                    <span>Dashboard</span>
                  </button>
                )}

                {showBrowseCatalog && (
                  <button
                    onClick={() => onSelectTab('browse-catalog')}
                    className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                      currentTab === 'browse-catalog'
                        ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                        : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined mr-2.5 text-[20px]">inventory_2</span>
                    <span>Browse Catalog</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-white/15 text-[#cbdbf5] font-mono">
                      {totalAssetsCount || 21}
                    </span>
                  </button>
                )}
              </div>

              {/* Section 2: Requests & Custody */}
              {showSection2 && (
                <div className="flex flex-col gap-0.5">
                  <span className="px-3 py-1 text-[11px] uppercase text-[#77849c] font-bold tracking-wider">
                    2. Requests &amp; Custody
                  </span>
                  {(showMyRequests || showNewRequest) && (
                    <button
                      onClick={() => onSelectTab('my-requests-and-bookings')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'my-requests-and-bookings' || currentTab === 'new-request'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">school</span>
                      <span>Faculty Requests Desk</span>
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-[#75f5fd] font-bold uppercase">
                        Faculty
                      </span>
                    </button>
                  )}

                  {showApprovals && (
                    <button
                      onClick={() => onSelectTab('request-approvals')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'request-approvals'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">verified_user</span>
                      <span>Request Approvals</span>
                      {pendingApprovalsCount > 0 && (
                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white font-bold">
                          {pendingApprovalsCount}
                        </span>
                      )}
                    </button>
                  )}

                  {showFacultyCustody && (
                    <button
                      onClick={() => onSelectTab('faculty-custody-stationery')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'faculty-custody-stationery'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">assignment_ind</span>
                      <span>Faculty Custody &amp; Stationery</span>
                    </button>
                  )}
                </div>
              )}

              {/* Section 3: Inventory & Dispatch */}
              {showSection3 && (
                <div className="flex flex-col gap-0.5">
                  <span className="px-3 py-1 text-[11px] uppercase text-[#77849c] font-bold tracking-wider">
                    3. Inventory &amp; Dispatch
                  </span>
                  {showInventory && (
                    <button
                      onClick={() => onSelectTab('asset-inventory-and-stock')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'asset-inventory-and-stock'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">category</span>
                      <span>Inventory &amp; Stock</span>
                      <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full bg-white/15 text-[#cbdbf5] font-mono">
                        {totalAssetsCount || 21}
                      </span>
                    </button>
                  )}

                  {showIssueReturn && (
                    <button
                      onClick={() => onSelectTab('issue-and-return-desk')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'issue-and-return-desk'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">swap_horizontal_circle</span>
                      <span>Issue &amp; Return Desk</span>
                    </button>
                  )}

                  {showPermAlloc && (
                    <button
                      onClick={() => onSelectTab('permanent-allocations')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'permanent-allocations'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">domain_add</span>
                      <span>Permanent Allocations</span>
                    </button>
                  )}
                </div>
              )}

              {/* Section 4: Admin & Compliance */}
              {showSection4 && (
                <div className="flex flex-col gap-0.5">
                  <span className="px-3 py-1 text-[11px] uppercase text-[#77849c] font-bold tracking-wider">
                    4. Admin &amp; Compliance
                  </span>
                  {showBarcodes && (
                    <button
                      onClick={() => onSelectTab('categories-and-barcodes')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'categories-and-barcodes'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">qr_code_2</span>
                      <span>Categories &amp; Barcodes</span>
                    </button>
                  )}

                  {showUserMgmt && (
                    <button
                      onClick={() => onSelectTab('user-management')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'user-management'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">groups</span>
                      <span>User Management</span>
                    </button>
                  )}

                  {showReports && (
                    <button
                      onClick={() => onSelectTab('reports-and-analytics')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'reports-and-analytics'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">analytics</span>
                      <span>Reports &amp; Analytics</span>
                    </button>
                  )}

                  {showAudit && (
                    <button
                      onClick={() => onSelectTab('audit-log')}
                      className={`flex items-center w-full px-3 py-2 rounded-lg font-medium transition-all text-left ${
                        currentTab === 'audit-log'
                          ? 'bg-white text-[#0b1c30] font-semibold shadow-sm'
                          : 'text-[#cbdbf5] hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined mr-2.5 text-[20px]">receipt_long</span>
                      <span>Audit Log</span>
                    </button>
                  )}
                </div>
              )}

              {/* LIVE OPERATIONS METRICS (Admin Side Panel Stats) */}
              <div className="flex flex-col gap-1.5 pt-3 mt-3 border-t border-white/10">
                  <div className="flex items-center justify-between px-3">
                    <span className="text-[10px] uppercase text-[#75f5fd] font-bold tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#009299] animate-pulse"></span>
                      Live Operations Metrics
                    </span>
                    <span className="text-[10px] font-mono text-[#cbdbf5]/70 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                      21 Types
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 px-1">
                    {/* 1. Total Units */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('asset-inventory-and-stock');
                        onCloseMobile?.();
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col justify-between border border-white/5 hover:border-teal-400/30 group cursor-pointer"
                      title="View Total Catalog Units"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#cbdbf5] uppercase font-bold tracking-tight">Total Units</span>
                        <span className="material-symbols-outlined text-[14px] text-teal-300">inventory_2</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-white font-mono">{kpis?.totalUnits || 166}</span>
                        <span className="text-[10px] text-[#77849c]">/ 200 Max</span>
                      </div>
                    </button>

                    {/* 2. Bookable Now */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('browse-catalog');
                        onCloseMobile?.();
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col justify-between border border-white/5 hover:border-emerald-400/30 group cursor-pointer"
                      title="Available for Instant Dispatch"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#cbdbf5] uppercase font-bold tracking-tight">Bookable Now</span>
                        <span className="material-symbols-outlined text-[14px] text-emerald-400">event_available</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-emerald-300 font-mono">{kpis?.bookableUnits || 96}</span>
                        <span className="text-[10px] text-emerald-400/70 font-semibold font-mono">Ready</span>
                      </div>
                    </button>

                    {/* 3. Approvals Due */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('request-approvals');
                        onCloseMobile?.();
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col justify-between border border-white/5 hover:border-rose-400/30 group cursor-pointer"
                      title="Requisitions Requiring Review"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#cbdbf5] uppercase font-bold tracking-tight">Approvals Due</span>
                        <span className="material-symbols-outlined text-[14px] text-rose-400">assignment_late</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-rose-300 font-mono">{kpis?.approvalsDue || 3}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold uppercase">Action</span>
                      </div>
                    </button>

                    {/* 4. Active Checkouts */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('issue-and-return-desk');
                        onCloseMobile?.();
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col justify-between border border-white/5 hover:border-sky-400/30 group cursor-pointer"
                      title="Assets Deployed in Labs/Halls"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#cbdbf5] uppercase font-bold tracking-tight">Checkouts</span>
                        <span className="material-symbols-outlined text-[14px] text-sky-400">pending_actions</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-sky-300 font-mono">{kpis?.activeCheckouts || 2}</span>
                        <span className="text-[10px] text-[#77849c]">In Labs</span>
                      </div>
                    </button>

                    {/* 5. Perm. Allocated */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('permanent-allocations');
                        onCloseMobile?.();
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col justify-between border border-white/5 hover:border-purple-400/30 group cursor-pointer"
                      title="Permanent Faculty Workstation Allocations"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#cbdbf5] uppercase font-bold tracking-tight">Perm. Allocated</span>
                        <span className="material-symbols-outlined text-[14px] text-purple-300">domain_verification</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-purple-200 font-mono">{kpis?.permanentAllocated || 2}</span>
                        <span className="text-[10px] text-[#77849c]">Staff Core</span>
                      </div>
                    </button>

                    {/* 6. Low Stock Warning */}
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('asset-inventory-and-stock');
                        onCloseMobile?.();
                      }}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col justify-between border border-white/5 hover:border-amber-400/30 group cursor-pointer"
                      title="Items Under Minimum Safety Threshold"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#cbdbf5] uppercase font-bold tracking-tight">Low Stock</span>
                        <span className="material-symbols-outlined text-[14px] text-amber-400">warning</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-bold text-amber-300 font-mono">{kpis?.lowStockWarnings || 4}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">Reorder</span>
                      </div>
                    </button>
                  </div>
                </div>
            </nav>
          );
        })()}
      </div>

      {/* System Status Node Card */}
      <div className="p-3 mx-3 mb-4 bg-white/5 rounded-xl border border-white/5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#75f5fd] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009299]"></span>
            </span>
            <span className="text-[11px] text-[#cbdbf5] font-semibold uppercase tracking-wider">
              System Online
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#009299] font-medium">v1.2.0</span>
        </div>
        <div className="flex flex-col gap-0.5 font-mono text-[11px] text-[#77849c]">
          <span className="truncate text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Firestore: Connected
          </span>
          <span className="truncate">Project: {cluster?.node || 'wise-reference-m3kqt'}</span>
        </div>
      </div>
    </aside>
    </>
  );
};
