import React, { useState, useEffect, useMemo } from 'react';
import {
  Asset,
  Booking,
  AuditLog,
  DashboardKPIs,
  ClusterInfo,
  AssetCategory,
  AcademicSettings,
  calculateDefaultAcademicYear,
  User,
} from '../types';
import { GuidelinesModal } from './modals/GuidelinesModal';

interface DashboardViewProps {
  currentUser?: User | null;
  kpis: DashboardKPIs | null;
  cluster: ClusterInfo | null;
  academicSettings?: AcademicSettings;
  assets: Asset[];
  bookings: Booking[];
  auditLogs: AuditLog[];
  onApprove: (reqId: string, isStockIssue?: boolean) => void;
  onOpenRejectModal: (booking: Booking) => void;
  onOpenStockAdjustModal: (asset: Asset) => void;
  onOpenNewAssetModal: () => void;
  onOpenScannerModal: () => void;
  onOpenFloorplanModal: () => void;
  onOpenGatepass?: (booking: Booking) => void;
  onCancelBooking?: (reqId: string) => void;
  onExportCsv: () => void;
  onPrintSlip: () => void;
  onSelectNavTab: (tab: any, assetCode?: string) => void;
  searchFilter: string;
  isCatalogOnly?: boolean;
  isInventoryOnly?: boolean;
}

type DashboardKpiModalType =
  | 'total-units'
  | 'bookable-now'
  | 'approvals-due'
  | 'active-checkouts'
  | 'perm-allocated'
  | 'low-stock'
  | null;

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  kpis,
  cluster,
  academicSettings,
  assets,
  bookings,
  auditLogs,
  onApprove,
  onOpenRejectModal,
  onOpenStockAdjustModal,
  onOpenNewAssetModal,
  onOpenScannerModal,
  onOpenFloorplanModal,
  onOpenGatepass,
  onCancelBooking,
  onExportCsv,
  onPrintSlip,
  onSelectNavTab,
  searchFilter,
  isCatalogOnly = false,
  isInventoryOnly = false,
}) => {
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [localSearch, setLocalSearch] = useState('');
  const [facultyActiveTab, setFacultyActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [isWikiModalOpen, setIsWikiModalOpen] = useState(false);

  // KPI Modal State
  const [activeKpiModal, setActiveKpiModal] = useState<DashboardKpiModalType>(null);
  const [kpiModalSearch, setKpiModalSearch] = useState('');
  const [kpiModalCategoryFilter, setKpiModalCategoryFilter] = useState('all');

  // Escape key handler for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveKpiModal(null);
    };
    if (activeKpiModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeKpiModal]);

  const isFaculty = currentUser?.role === 'faculty';
  const isHOD = currentUser?.role === 'hod';
  const isAdmin = currentUser?.role === 'admin';
  const isTech = currentUser?.role === 'tech';

  // Faculty specific booking filtering: strictly user's own requisitions and bookings (no admin data)
  const facultyEmail = (currentUser?.email || '').toLowerCase().trim();
  const myFacultyBookings = bookings.filter((b) => {
    if (b.requesterId && currentUser?.id && b.requesterId === currentUser.id) return true;
    if (b.requesterEmail && facultyEmail && b.requesterEmail.toLowerCase() === facultyEmail) return true;
    if (b.requesterName && currentUser?.name && b.requesterName.toLowerCase() === currentUser.name.toLowerCase()) return true;
    return false;
  });

  const myPendingRequests = myFacultyBookings.filter((b) => b.status === 'pending');
  const myActiveBookings = myFacultyBookings.filter((b) => b.status === 'dispatched');
  const myBookingHistory = myFacultyBookings.filter((b) =>
    ['returned', 'cancelled', 'rejected'].includes(b.status) || (b.type === 'consumable' && b.status === 'dispatched')
  );

  // Combined search term
  const effectiveSearch = (searchFilter || localSearch).toLowerCase().trim();

  // Filtered Assets for Catalog / Section 2
  const filteredAssets = assets.filter((asset) => {
    const matchesCategory =
      selectedCategoryTab === 'all' || asset.category === selectedCategoryTab;

    let matchesStock = true;
    if (stockStatusFilter === 'in-stock') {
      matchesStock = asset.availableQuantity > 0;
    } else if (stockStatusFilter === 'low-stock') {
      matchesStock = asset.status === 'low-stock' || asset.availableQuantity <= asset.minThreshold;
    } else if (stockStatusFilter === 'maintenance' || stockStatusFilter === 'condition-repair') {
      matchesStock = asset.status === 'maintenance' || asset.condition === 'repair';
    } else if (stockStatusFilter === 'condition-new') {
      matchesStock = asset.condition === 'new';
    } else if (stockStatusFilter === 'condition-good') {
      matchesStock = asset.condition === 'good' || (!asset.condition && asset.status === 'operational');
    } else if (stockStatusFilter === 'condition-damaged') {
      matchesStock = asset.condition === 'damaged';
    }

    const matchesSearch =
      !effectiveSearch ||
      asset.name.toLowerCase().includes(effectiveSearch) ||
      asset.code.toLowerCase().includes(effectiveSearch) ||
      (asset.description && asset.description.toLowerCase().includes(effectiveSearch)) ||
      (asset.classification && asset.classification.toLowerCase().includes(effectiveSearch)) ||
      (asset.conditionRemarks && asset.conditionRemarks.toLowerCase().includes(effectiveSearch));

    return matchesCategory && matchesStock && matchesSearch;
  });

  // Category counts
  const countStationery = assets.filter((a) => a.category === 'stationery').length;
  const countIT = assets.filter((a) => a.category === 'it').length;
  const countAudio = assets.filter((a) => a.category === 'audio').length;
  const countRecording = assets.filter((a) => a.category === 'recording').length;

  // Pending bookings for Queue (for Admin / HOD / Tech)
  const pendingQueue = bookings.filter((b) => b.status === 'pending');

  // =========================================================================
  // VIEW 1: FACULTY DASHBOARD (Only own requests, active bookings, history)
  // Total Units, Approvals Due, Add New Asset, Export Stock CSV, and Pending Approval Queue are HIDDEN
  // =========================================================================
  if (isFaculty && !isCatalogOnly) {
    return (
      <div className="flex flex-col w-full text-[#0b1c30]">
        {/* Faculty Header Area */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs uppercase tracking-wider text-[#009299] font-semibold">
                Faculty Node // {currentUser?.department || 'COLLEGE CENTRAL'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
              <span className="text-[11px] uppercase text-[#44474c] font-semibold">
                AY {academicSettings?.academicYear || calculateDefaultAcademicYear().academicYear} •{' '}
                {academicSettings?.term || calculateDefaultAcademicYear().term}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
              Faculty Asset Custody &amp; Requisitions Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-[#004f55] bg-[#e6f7f8] px-3 py-1 rounded-lg border border-[#009299]/30 flex items-center gap-2 shadow-2xs">
                <span className="material-symbols-outlined text-[16px] text-[#009299]">school</span>
                <span>Logged in as: <strong>{currentUser?.name || 'Prof. Mohini Gupta'}</strong> • {currentUser?.designation || 'Assistant Professor'} ({currentUser?.facultyId || 'FAC-01'})</span>
              </span>
            </div>
          </div>

          {/* Right Controls - Faculty: No Add New Asset, No Export Stock CSV */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center bg-[#eff4ff] px-3 py-1.5 rounded-lg border border-[#cbdbf5]">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#75f5fd] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009299]"></span>
              </span>
              <span className="font-mono text-xs font-semibold text-[#0b1c30]">
                Institutional Cloud: Synced ({cluster?.latencyMs || 12}ms)
              </span>
            </div>

            <button
              onClick={onOpenScannerModal}
              className="h-9 px-3.5 bg-white text-[#426086] border border-[#cbdbf5] rounded-lg text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
              <span>Scan Tag</span>
            </button>

            <button
              onClick={() => onSelectNavTab('browse-catalog')}
              className="h-9 px-3.5 bg-white text-[#426086] border border-[#cbdbf5] rounded-lg text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              <span>Browse Catalog</span>
            </button>

            <button
              onClick={() => onSelectNavTab('new-request')}
              className="h-9 px-3.5 bg-[#0e1c2f] hover:bg-[#426086] text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>New Requisition</span>
            </button>
          </div>
        </div>

        {/* Real-time Faculty KPI Stream: Hide Total Units & Approvals Due */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Stat 1: My Pending Requests */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
                My Pending Requests
              </span>
              <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#426086] flex items-center">
                <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#0b1c30]">
                {myPendingRequests.length}
              </span>
              <span className="text-[11px] text-[#44474c] block mt-0.5">
                Requisitions awaiting HOD &amp; Admin verification
              </span>
            </div>
            <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between">
              <span className="text-[11px] text-[#426086] font-medium">Requisition Status</span>
              <span className="font-mono text-xs text-[#009299] font-bold">
                {myPendingRequests.length > 0 ? `${myPendingRequests.length} In Review` : 'All Approved'}
              </span>
            </div>
          </div>

          {/* Stat 2: My Active Bookings */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
                My Active Bookings
              </span>
              <span className="p-1.5 rounded-lg bg-[#d3e4fe] text-[#3b5a7f] flex items-center">
                <span className="material-symbols-outlined text-[18px]">outbox</span>
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#0b1c30]">
                {myActiveBookings.length}
              </span>
              <span className="text-[11px] text-[#44474c] block mt-0.5">
                Assets currently checked out in your custody
              </span>
            </div>
            <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between">
              <span className="text-[11px] text-[#426086] font-medium">Custody Status</span>
              <span className="font-mono text-xs text-[#0b1c30] font-bold">
                {myActiveBookings.length > 0 ? 'Active Deployment' : 'No Items Checked Out'}
              </span>
            </div>
          </div>

          {/* Stat 3: My Booking History */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
                My Booking History
              </span>
              <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#426086] flex items-center">
                <span className="material-symbols-outlined text-[18px]">history</span>
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#0b1c30]">
                {myBookingHistory.length}
              </span>
              <span className="text-[11px] text-[#44474c] block mt-0.5">
                Returned, verified and completed requisitions
              </span>
            </div>
            <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between">
              <span className="text-[11px] text-[#44474c] font-medium">Total Lifetime</span>
              <span className="font-mono text-xs text-[#426086] font-bold">
                {myFacultyBookings.length} Total
              </span>
            </div>
          </div>
        </div>

        {/* Main Section: Faculty Pending Requests, Active Bookings & History */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-6">
          {/* Left Column: Requisitions Desk (8 Cols) */}
          <div className="xl:col-span-8 flex flex-col bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#e5eeff]">
              <div>
                <h2 className="text-base font-bold text-[#0b1c30]">My Requisitions &amp; Custody Desk</h2>
                <span className="text-[11px] text-[#44474c]">
                  Track your pending approval requests, active equipment custody and booking records
                </span>
              </div>

              {/* Sub-tabs for Faculty */}
              <div className="flex items-center gap-1.5 bg-[#eff4ff] p-1 rounded-lg border border-[#cbdbf5]">
                <button
                  type="button"
                  onClick={() => setFacultyActiveTab('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    facultyActiveTab === 'pending'
                      ? 'bg-white text-[#0b1c30] shadow-xs'
                      : 'text-[#44474c] hover:text-[#0b1c30]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                  <span>Pending ({myPendingRequests.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFacultyActiveTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    facultyActiveTab === 'active'
                      ? 'bg-white text-[#0b1c30] shadow-xs'
                      : 'text-[#44474c] hover:text-[#0b1c30]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">outbox</span>
                  <span>Active ({myActiveBookings.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFacultyActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    facultyActiveTab === 'history'
                      ? 'bg-white text-[#0b1c30] shadow-xs'
                      : 'text-[#44474c] hover:text-[#0b1c30]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  <span>History ({myBookingHistory.length})</span>
                </button>
              </div>
            </div>

            {/* Table: Pending Requests */}
            {facultyActiveTab === 'pending' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-9">
                      <th className="px-4 py-2 font-semibold rounded-l-lg">Req ID</th>
                      <th className="px-4 py-2 font-semibold">Item &amp; Type</th>
                      <th className="px-4 py-2 font-semibold">Schedule / Timing</th>
                      <th className="px-4 py-2 font-semibold">Classroom / Venue</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff] text-xs">
                    {myPendingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-500">
                          <span className="material-symbols-outlined text-[32px] text-gray-300 block mb-1">
                            check_circle
                          </span>
                          <span>You have no pending requisitions awaiting approval.</span>
                        </td>
                      </tr>
                    ) : (
                      myPendingRequests.map((b) => (
                        <tr key={b.id || b._id || b.reqId} className="hover:bg-[#eff4ff]/40 transition-colors">
                          <td className="px-4 py-3 align-middle font-mono font-bold text-[#0e1c2f]">
                            {b.reqId}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="font-semibold text-[#0b1c30] block">{b.assetName}</span>
                            <span className="font-mono text-[10px] text-[#44474c]">{b.assetCode}</span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="text-[#0b1c30] block font-medium">
                              {b.bookingDate || 'Upcoming'}
                            </span>
                            <span className="font-mono text-[10px] text-[#44474c]">
                              {b.startTime ? `${b.startTime} - ${b.endTime}` : b.tenancyDuration || 'Session Slot'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-[#44474c]">
                            {b.venue || 'Classroom / Lab'}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                              <span>Under Review</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            {onCancelBooking && (
                              <button
                                type="button"
                                onClick={() => onCancelBooking(b.reqId)}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-semibold transition-all border border-rose-200"
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table: Active Bookings */}
            {facultyActiveTab === 'active' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-9">
                      <th className="px-4 py-2 font-semibold rounded-l-lg">Req ID</th>
                      <th className="px-4 py-2 font-semibold">Item &amp; Type</th>
                      <th className="px-4 py-2 font-semibold">Custody Date / Slot</th>
                      <th className="px-4 py-2 font-semibold">Classroom / Venue</th>
                      <th className="px-4 py-2 font-semibold">Status</th>
                      <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff] text-xs">
                    {myActiveBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-500">
                          <span className="material-symbols-outlined text-[32px] text-gray-300 block mb-1">
                            outbox
                          </span>
                          <span>No items currently dispatched to your custody.</span>
                        </td>
                      </tr>
                    ) : (
                      myActiveBookings.map((b) => (
                        <tr key={b.id || b._id || b.reqId} className="hover:bg-[#eff4ff]/40 transition-colors">
                          <td className="px-4 py-3 align-middle font-mono font-bold text-[#0e1c2f]">
                            {b.reqId}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="font-semibold text-[#0b1c30] block">{b.assetName}</span>
                            <span className="font-mono text-[10px] text-[#44474c]">{b.assetCode}</span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="text-[#0b1c30] block font-medium">
                              {b.bookingDate || 'Active'}
                            </span>
                            <span className="font-mono text-[10px] text-[#44474c]">
                              {b.startTime ? `${b.startTime} - ${b.endTime}` : 'In Possession'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-[#44474c]">
                            {b.venue || 'Classroom / Lab'}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              <span>In Custody</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            {onOpenGatepass && (
                              <button
                                type="button"
                                onClick={() => onOpenGatepass(b)}
                                className="px-2.5 py-1 bg-[#eff4ff] text-[#426086] hover:bg-[#cbdbf5] rounded text-xs font-semibold transition-all border border-[#cbdbf5] flex items-center gap-1 ml-auto"
                              >
                                <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                                <span>Gatepass</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table: Booking History */}
            {facultyActiveTab === 'history' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-9">
                      <th className="px-4 py-2 font-semibold rounded-l-lg">Req ID</th>
                      <th className="px-4 py-2 font-semibold">Item &amp; Type</th>
                      <th className="px-4 py-2 font-semibold">Booking Slot</th>
                      <th className="px-4 py-2 font-semibold">Classroom / Venue</th>
                      <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Final Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff] text-xs">
                    {myBookingHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-500">
                          <span className="material-symbols-outlined text-[32px] text-gray-300 block mb-1">
                            history
                          </span>
                          <span>No past completed or returned bookings recorded.</span>
                        </td>
                      </tr>
                    ) : (
                      myBookingHistory.map((b) => (
                        <tr key={b.id || b._id || b.reqId} className="hover:bg-[#eff4ff]/40 transition-colors">
                          <td className="px-4 py-3 align-middle font-mono font-bold text-[#0e1c2f]">
                            {b.reqId}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="font-semibold text-[#0b1c30] block">{b.assetName}</span>
                            <span className="font-mono text-[10px] text-[#44474c]">{b.assetCode}</span>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className="text-[#0b1c30] block font-medium">
                              {b.bookingDate || 'Completed'}
                            </span>
                            <span className="font-mono text-[10px] text-[#44474c]">
                              {b.startTime ? `${b.startTime} - ${b.endTime}` : b.tenancyDuration || 'Slot'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-[#44474c]">
                            {b.venue || 'Classroom / Lab'}
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                b.status === 'returned' || (b.type === 'consumable' && b.status === 'dispatched')
                                  ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                  : b.status === 'rejected'
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}
                            >
                              {b.status === 'returned'
                                ? 'Returned & Closed'
                                : b.type === 'consumable' && b.status === 'dispatched'
                                ? 'Consumed'
                                : b.status === 'rejected'
                                ? 'Rejected'
                                : 'Cancelled'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Column: Faculty Institutional SOP Wiki & Shortcuts (4 Cols) */}
          <div className="xl:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#e5eeff]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#009299]">menu_book</span>
                    <h3 className="text-sm font-bold text-[#0b1c30]">Institutional SOP Wiki</h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#eff4ff] text-[#009299] font-bold border border-[#cbdbf5]">
                    INST-SOP-V2.4
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 text-xs text-[#44474c]">
                  <div className="p-2.5 bg-[#eff4ff]/40 rounded-lg border border-[#cbdbf5] flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-[#009299] text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                      1.0
                    </span>
                    <div>
                      <span className="font-bold text-[#0b1c30] block">Requisition Windows</span>
                      <span className="text-[11px] text-[#44474c] leading-relaxed">
                        Same-day (&lt;8h) checkouts dispatched immediately upon Lab Assistant verification. Overnight requires HOD endorsement.
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#eff4ff]/40 rounded-lg border border-[#cbdbf5] flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-[#426086] text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                      2.0
                    </span>
                    <div>
                      <span className="font-bold text-[#0b1c30] block">Concurrency &amp; Lock Protection</span>
                      <span className="text-[11px] text-[#44474c] leading-relaxed">
                        Time windows are locked against overlaps. University examinations take priority over routine bookings.
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#eff4ff]/40 rounded-lg border border-[#cbdbf5] flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-amber-600 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                      3.0
                    </span>
                    <div>
                      <span className="font-bold text-[#0b1c30] block">Consumable Stock Quotas</span>
                      <span className="text-[11px] text-[#44474c] leading-relaxed">
                        Whiteboard markers and paper reams are non-returnable and deducted directly from departmental semester quotas.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#e5eeff] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsWikiModalOpen(true)}
                  className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-emerald-200 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">policy</span>
                  <span>View Full Requisition SOP Wiki</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectNavTab('new-request')}
                  className="w-full py-2.5 bg-[#0e1c2f] hover:bg-[#426086] text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>Submit New Requisition</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectNavTab('browse-catalog')}
                  className="w-full py-2 bg-white hover:bg-[#eff4ff] text-[#426086] rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-[#cbdbf5] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  <span>Browse All {assets.length || 21} Catalog Items</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: COMMAND CENTER DASHBOARD (For Admin, HOD, and Tech)
  // Or Catalog Only View (For Browse Catalog tab)
  // =========================================================================
  return (
    <div className="flex flex-col w-full text-[#0b1c30]">
      {/* Command Center Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase tracking-wider text-[#009299] font-semibold">
              {isHOD
                ? `Node // ${currentUser?.department?.toUpperCase() || 'COLLEGE'} DEPT LABS`
                : cluster?.name || 'Node // COLLEGE-CENTRAL-CLUSTER'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
            <span className="text-[11px] uppercase text-[#44474c] font-semibold">
              {cluster?.term ||
                `AY ${academicSettings?.academicYear || calculateDefaultAcademicYear().academicYear} • ${academicSettings?.term || calculateDefaultAcademicYear().term}`}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
            {isCatalogOnly
              ? 'Institutional Asset Catalog & Specifications'
              : isInventoryOnly
              ? 'College Inventory & Stock Ledger'
              : isHOD
              ? `Academic Inventory & Dispatch (${currentUser?.department})`
              : 'Academic Inventory & Dispatch Command Center'}
          </h1>
          {!isCatalogOnly && !isInventoryOnly && !isHOD && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-semibold text-[#0e1c2f] bg-[#eff4ff] px-3 py-1 rounded-lg border border-[#cbdbf5] flex items-center gap-2 shadow-2xs">
                <span className="material-symbols-outlined text-[16px] text-[#009299]">admin_panel_settings</span>
                <span>Active Admin / Office Staff: <strong>{currentUser?.name || 'Malay Aggarwal'}</strong> • {currentUser?.designation || 'Central Administrator'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center bg-[#eff4ff] px-3 py-1.5 rounded-lg border border-[#cbdbf5]">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#75f5fd] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#009299]"></span>
            </span>
            <span className="font-mono text-xs font-semibold text-[#0b1c30]">
              Institutional Cloud: Synced ({cluster?.latencyMs || 12}ms)
            </span>
          </div>

          <button
            onClick={onOpenScannerModal}
            className="h-9 px-3.5 bg-white text-[#426086] border border-[#cbdbf5] rounded-lg text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
            <span>Scan Tag</span>
          </button>

          {!isFaculty && (
            <button
              onClick={onExportCsv}
              className="h-9 px-3.5 bg-white text-[#426086] border border-[#cbdbf5] rounded-lg text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Export Stock CSV</span>
            </button>
          )}

          {(isAdmin || isHOD) && (
            <button
              onClick={onOpenNewAssetModal}
              className="h-9 px-3.5 bg-[#0e1c2f] text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-[#426086] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add New Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Operational KPI Stream permanently displayed on the Left Side Panel without duplication */}
      {false && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 mb-6">
          {/* Stat 1: Total Units */}
          <div
            onClick={() => {
              setKpiModalSearch('');
              setKpiModalCategoryFilter('all');
              setActiveKpiModal('total-units');
            }}
            className="bg-white p-4 rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to view full inventory catalog breakdown & units"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
                Total Units
              </span>
              <div className="flex items-center gap-1">
                <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#426086] flex items-center">
                  <span className="material-symbols-outlined text-[18px]">layers</span>
                </span>
                <span className="material-symbols-outlined text-[15px] text-[#72777f] opacity-50 group-hover:opacity-100 group-hover:text-[#009299] group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#0b1c30]">
                {kpis?.totalUnits || 166}
              </span>
              <span className="text-[11px] text-[#44474c] block mt-0.5">
                Across {assets.length || 21} asset catalog types
              </span>
            </div>
            <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between">
              <span className="text-[11px] text-[#426086] font-medium">Cap: {kpis?.capacityMax || 200} max</span>
              <span className="font-mono text-xs text-[#0b1c30] font-bold">
                {kpis?.capacityPercentage || 83}%
              </span>
            </div>
          </div>

          {/* Stat 2: Bookable Now */}
          <div
            onClick={() => {
              setKpiModalSearch('');
              setKpiModalCategoryFilter('all');
              setActiveKpiModal('bookable-now');
            }}
            className="bg-white p-4 rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to view assets currently bookable and ready for dispatch"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
                Bookable Now
              </span>
              <div className="flex items-center gap-1">
                <span className="p-1.5 rounded-lg bg-[#d3e4fe] text-[#3b5a7f] flex items-center">
                  <span className="material-symbols-outlined text-[18px]">event_available</span>
                </span>
                <span className="material-symbols-outlined text-[15px] text-[#72777f] opacity-50 group-hover:opacity-100 group-hover:text-[#009299] group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#0b1c30]">
                  {kpis?.bookableUnits ?? 98}
                </span>
                <span className="text-xs text-[#009299] font-bold">
                  ({kpis?.bookablePercentage ?? 72}%)
                </span>
              </div>
              <span className="text-[11px] text-[#44474c] block mt-0.5">
                Ready for instant dispatch
              </span>
            </div>
            <div className="mt-3 w-full bg-[#dce9ff] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#009299] h-full rounded-full"
                style={{ width: `${kpis?.bookablePercentage ?? 72}%` }}
              ></div>
            </div>
          </div>

          {/* Stat 3: Approvals Due */}
          <div
            onClick={() => {
              setKpiModalSearch('');
              setActiveKpiModal('approvals-due');
            }}
            className="bg-white p-4 rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#ba1a1a] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to view and process pending approval requests"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
                Approvals Due
              </span>
              <div className="flex items-center gap-1">
                <span className="p-1.5 rounded-lg bg-[#ffdad6] text-[#ba1a1a] flex items-center">
                  <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                </span>
                <span className="material-symbols-outlined text-[15px] text-[#ba1a1a] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#0b1c30]">
                  {kpis?.approvalsDue ?? pendingQueue.length}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold">
                  Action req
                </span>
              </div>
              <span className="text-[11px] text-[#44474c] block mt-0.5">
                {isHOD ? `${currentUser?.department} Requisitions` : '3 Temp · 2 Perm · 1 Consumable'}
              </span>
            </div>
            <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between">
              <span className="text-[11px] text-[#ba1a1a] font-semibold">Priority: Active</span>
              <span className="material-symbols-outlined text-[#ba1a1a] text-[16px]">priority_high</span>
            </div>
          </div>

          {/* Stat 4: Active Checkouts */}
          <div
            onClick={() => {
              setKpiModalSearch('');
              setActiveKpiModal('active-checkouts');
            }}
            className="bg-white p-4 rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#426086] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to inspect items currently dispatched and in faculty custody"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
                Active Checkouts
              </span>
              <div className="flex items-center gap-1">
                <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#426086] flex items-center">
                  <span className="material-symbols-outlined text-[18px]">outbox</span>
                </span>
                <span className="material-symbols-outlined text-[15px] text-[#72777f] opacity-50 group-hover:opacity-100 group-hover:text-[#426086] group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#0b1c30]">
                {kpis?.activeCheckouts || 24}
              </span>
              <span className="text-[11px] text-[#44474c] block mt-0.5">
                Labs &amp; Seminar Halls
              </span>
            </div>
            <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between">
              <span className="text-[11px] text-[#426086] font-medium">Departmental Deployments</span>
              <span className="font-mono text-xs text-[#426086] font-bold">75%</span>
            </div>
          </div>

          {/* Stat 5: Perm. Allocated */}
          <div
            onClick={() => {
              setKpiModalSearch('');
              setKpiModalCategoryFilter('all');
              setActiveKpiModal('perm-allocated');
            }}
            className="bg-white p-4 rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to view hardware permanently allocated to cabins & labs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
                Perm. Allocated
              </span>
              <div className="flex items-center gap-1">
                <span className="p-1.5 rounded-lg bg-[#eff4ff] text-[#426086] flex items-center">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </span>
                <span className="material-symbols-outlined text-[15px] text-[#72777f] opacity-50 group-hover:opacity-100 group-hover:text-[#009299] group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#0b1c30]">
                {kpis?.permanentAllocated || 16}
              </span>
              <span className="text-[11px] text-[#44474c] block mt-0.5">
                Faculty desks &amp; dedicated labs
              </span>
            </div>
            <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between">
              <span className="text-[11px] text-[#44474c] font-medium">College Staff Core</span>
              <span className="material-symbols-outlined text-[#426086] text-[16px]">domain</span>
            </div>
          </div>

          {/* Stat 6: Low Stock Warning */}
          <div
            onClick={() => {
              setKpiModalSearch('');
              setActiveKpiModal('low-stock');
            }}
            className="bg-white p-4 rounded-xl shadow-xs border border-[#e5eeff] hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            title="Click to view and adjust low-stock items"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase text-[#44474c] font-bold tracking-wider">
                Low Stock Warning
              </span>
              <div className="flex items-center gap-1">
                <span className="p-1.5 rounded-lg bg-[#d3e4fe] text-[#0b1c30] flex items-center">
                  <span className="material-symbols-outlined text-[18px]">warning</span>
                </span>
                <span className="material-symbols-outlined text-[15px] text-amber-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#0b1c30]">
                  {kpis?.lowStockWarnings ?? 3}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#d3e4fe] text-[#0b1c30] text-[10px] font-semibold">
                  Consumables
                </span>
              </div>
              <span className="text-[11px] text-[#44474c] block mt-0.5">
                Markers, Paper Reams, HDMI
              </span>
            </div>
            <div className="mt-3 pt-2 bg-[#eff4ff]/60 rounded-lg px-2.5 py-1 flex items-center justify-between">
              <span className="text-[11px] text-[#ba1a1a] font-semibold">Reorder Suggested</span>
              <span className="material-symbols-outlined text-[#ba1a1a] text-[16px]">
                shopping_cart_checkout
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Pending Approvals Queue & Activity Stream (Admin, HOD, Tech) */}
      {!isCatalogOnly && !isInventoryOnly && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-6">
          {/* Left Column: Pending Approval Queue (8 Cols) */}
          <div className="xl:col-span-8 flex flex-col bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#426086]">
                  <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0b1c30]">
                    {isHOD ? `${currentUser?.department} Pending Approvals` : 'Pending Approval Queue'}
                  </h2>
                  <span className="text-[11px] text-[#44474c]">
                    {isHOD
                      ? `Requisitions submitted by ${currentUser?.department} faculty awaiting endorsement`
                      : 'Immediate faculty and laboratory reservation requisitions'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#d3e4fe] text-[#0b1c30] font-semibold">
                {pendingQueue.length} items require review
              </span>
            </div>

            {/* Approvals Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-9">
                    <th className="px-4 py-2 font-semibold rounded-l-lg">Req ID</th>
                    <th className="px-4 py-2 font-semibold">Item &amp; Type</th>
                    <th className="px-4 py-2 font-semibold">Requester</th>
                    <th className="px-4 py-2 font-semibold">Destination / Slot</th>
                    <th className="px-4 py-2 font-semibold">Schedule Status</th>
                    <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5eeff] text-xs">
                  {pendingQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No pending approvals in queue. All requisitions reviewed!
                      </td>
                    </tr>
                  ) : (
                    pendingQueue.slice(0, 5).map((b, bIdx) => (
                      <tr key={b.id || b._id || b.reqId || `pending-queue-${bIdx}`} className="hover:bg-[#eff4ff]/40 transition-colors">
                        <td className="px-4 py-3 align-middle">
                          <span className="font-mono text-xs font-bold text-[#0e1c2f] block">
                            {b.reqId}
                          </span>
                          <span className="text-[10px] text-[#44474c] capitalize">
                            {b.type} Checkout
                          </span>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-[#0b1c30]">{b.assetName}</span>
                            <span className="font-mono text-[10px] text-[#44474c]">{b.assetCode}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#dce9ff] text-[#426086] flex items-center justify-center font-bold text-[10px]">
                              {(b.requesterName || 'Staff')
                                .split(' ')
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join('')}
                            </div>
                            <div>
                              <span className="text-xs font-medium text-[#0b1c30] block">
                                {b.requesterName}
                              </span>
                              <span className="text-[10px] text-[#44474c]">{b.requesterRole || 'Faculty'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <span className="text-xs font-medium text-[#0b1c30] block">
                            {b.venue || 'Lecture Hall'}
                          </span>
                          <span className="font-mono text-[10px] text-[#44474c]">
                            {b.bookingDate || 'Today'} {b.startTime ? `${b.startTime} - ${b.endTime}` : ''}
                          </span>
                        </td>

                        <td className="px-4 py-3 align-middle">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              b.type === 'consumable'
                                ? 'bg-[#eff4ff] text-[#426086]'
                                : 'bg-[#d3e4fe] text-[#0b1c30]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {b.type === 'consumable' ? 'inventory_2' : 'check_circle'}
                            </span>
                            {b.type === 'consumable' ? 'Stock Adequate' : 'No Conflict'}
                          </span>
                        </td>

                        <td className="px-4 py-3 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {b.type === 'consumable' ? (
                              <button
                                onClick={() => onApprove(b.reqId, true)}
                                className="h-7 px-2.5 bg-[#dce9ff] text-[#0b1c30] hover:bg-[#426086] hover:text-white rounded text-[11px] font-semibold transition-all flex items-center gap-1 shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[15px]">output</span>
                                <span>Issue Stock</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onApprove(b.reqId, false)}
                                className="h-7 px-2.5 bg-[#0e1c2f] text-white hover:bg-[#426086] rounded text-[11px] font-semibold transition-all flex items-center gap-1 shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[15px]">thumb_up</span>
                                <span>Approve</span>
                              </button>
                            )}
                            <button
                              onClick={() => onOpenRejectModal(b)}
                              className="h-7 px-2 text-[#ba1a1a] hover:bg-[#ffdad6] rounded text-[11px] font-semibold transition-all flex items-center"
                              title="Reject Request"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e5eeff] flex items-center justify-between text-[#44474c] text-xs">
              <span>
                Showing {Math.min(pendingQueue.length, 5)} priority requests out of {pendingQueue.length} pending
              </span>
              <button
                onClick={() => onSelectNavTab('request-approvals')}
                className="text-[#426086] font-semibold hover:underline flex items-center gap-1"
              >
                <span>View all approval tickets</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Audit Activity Feed (4 Cols) */}
          <div className="xl:col-span-4 flex flex-col bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#009299]">receipt_long</span>
                <h3 className="text-sm font-bold text-[#0b1c30]">Recent Dispatch Log</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                AUDIT LIVE
              </span>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-1">
              {auditLogs.slice(0, 5).map((log, lIdx) => (
                <div
                  key={log.id || log._id || `dash-audit-${lIdx}`}
                  className="p-3 bg-[#eff4ff]/40 rounded-lg border border-[#e5eeff] flex items-start gap-2.5 text-xs hover:bg-[#eff4ff] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#426086] mt-0.5 shrink-0">
                    {log.category === 'booking'
                      ? 'event_available'
                      : log.category === 'inventory'
                      ? 'inventory_2'
                      : log.category === 'auth'
                      ? 'badge'
                      : 'history'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#0b1c30] truncate">
                        {log.action}
                      </span>
                      <span className="font-mono text-[10px] text-[#44474c]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#44474c] truncate">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {log.targetCode && (
                        <>
                          <span className="font-mono text-[10px] text-[#426086] font-semibold">
                            {log.targetCode}
                          </span>
                          <span className="text-gray-300">·</span>
                        </>
                      )}
                      <span className="text-[10px] text-[#44474c] font-medium">
                        {log.actorName} ({log.actorRole})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-2 bg-[#eff4ff] rounded-lg p-3 flex items-center justify-between border border-[#cbdbf5]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#009299] text-[18px]">sync_alt</span>
                <span className="text-xs font-semibold text-[#0b1c30]">Audit Trail Synchronized</span>
              </div>
              <span className="font-mono text-xs text-[#009299] font-bold">Live</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Master Inventory & Unit Matrix (Rendered on dedicated Inventory & Stock or Catalog page) */}
      {(isInventoryOnly || isCatalogOnly) ? (
        <div className="flex flex-col bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5 mb-6">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#0b1c30]">Catalog Inventory &amp; Unit Matrix</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#dce9ff] text-[#426086] font-mono text-xs font-bold">
                {effectiveSearch || selectedCategoryTab !== 'all' || stockStatusFilter !== 'all'
                  ? `${filteredAssets.length} of ${assets.length} Asset Types`
                  : `${assets.length} Asset Types`}
              </span>
            </div>
            <span className="text-xs text-[#44474c]">
              Complete catalog categorized across Classroom, Technical IT, Audio, and Recording accessories
            </span>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#44474c] text-[18px]">
                search
              </span>
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search asset name, code, SKU..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs placeholder:text-[#44474c] focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
              />
            </div>

            {/* Stock & Condition Status Filter */}
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
            >
              <option value="all">Condition: All Items</option>
              <option value="in-stock">Available Units (&gt;0)</option>
              <option value="condition-new">🟢 Brand New Units</option>
              <option value="condition-good">🔵 Operational / Good</option>
              <option value="condition-repair">🟡 Under Repair / Maintenance</option>
              <option value="condition-damaged">🔴 Damaged / Defective</option>
              <option value="low-stock">⚠️ Low Stock Alerts</option>
            </select>

            {/* View Switcher: List view is default */}
            <div className="flex items-center bg-[#eff4ff] p-1 rounded-lg border border-[#cbdbf5]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white shadow-sm text-[#0e1c2f] font-bold'
                    : 'text-[#44474c] hover:text-[#0b1c30]'
                }`}
                title="List View (Default)"
              >
                <span className="material-symbols-outlined text-[18px]">table_rows</span>
                <span className="text-[11px] font-semibold">List View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-[#0e1c2f] font-bold'
                    : 'text-[#44474c] hover:text-[#0b1c30]'
                }`}
                title="Box / Grid View"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                <span className="text-[11px] font-semibold">Box View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
          <button
            onClick={() => setSelectedCategoryTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategoryTab === 'all'
                ? 'bg-[#0e1c2f] text-white shadow-sm'
                : 'bg-[#eff4ff] text-[#44474c] hover:text-[#0b1c30]'
            }`}
          >
            <span>All Catalog</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">
              {assets.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategoryTab('stationery')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategoryTab === 'stationery'
                ? 'bg-[#0e1c2f] text-white shadow-sm'
                : 'bg-[#eff4ff] text-[#44474c] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">edit_note</span>
            <span>Classroom Stationery</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#dce9ff] text-[#426086] text-[10px]">
              {countStationery}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategoryTab('it')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategoryTab === 'it'
                ? 'bg-[#0e1c2f] text-white shadow-sm'
                : 'bg-[#eff4ff] text-[#44474c] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">devices</span>
            <span>Technical &amp; IT Equipment</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#dce9ff] text-[#426086] text-[10px]">
              {countIT}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategoryTab('audio')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategoryTab === 'audio'
                ? 'bg-[#0e1c2f] text-white shadow-sm'
                : 'bg-[#eff4ff] text-[#44474c] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">volume_up</span>
            <span>Audio &amp; Projection</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#dce9ff] text-[#426086] text-[10px]">
              {countAudio}
            </span>
          </button>

          <button
            onClick={() => setSelectedCategoryTab('recording')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategoryTab === 'recording'
                ? 'bg-[#0e1c2f] text-white shadow-sm'
                : 'bg-[#eff4ff] text-[#44474c] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">videocam</span>
            <span>Lecture Capture</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#dce9ff] text-[#426086] text-[10px]">
              {countRecording}
            </span>
          </button>
        </div>

        {/* View Mode: Grid View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {filteredAssets.map((asset, aIdx) => {
              const isLow =
                asset.status === 'low-stock' || asset.availableQuantity <= asset.minThreshold;
              return (
                <div
                  key={asset.code || asset.id || asset._id || `asset-grid-${aIdx}`}
                  className="p-3.5 rounded-xl border border-[#e5eeff] bg-white hover:border-[#cbdbf5] hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] font-bold text-[#0e1c2f]">
                        {asset.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                            asset.condition === 'damaged'
                              ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]'
                              : asset.condition === 'repair' || asset.status === 'maintenance'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : asset.condition === 'new'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                          title={asset.conditionRemarks ? `Remark: ${asset.conditionRemarks}` : undefined}
                        >
                          <span className="w-1 h-1 rounded-full bg-current"></span>
                          {asset.condition === 'damaged'
                            ? 'Damaged'
                            : asset.condition === 'repair' || asset.status === 'maintenance'
                            ? 'Repair'
                            : asset.condition === 'new'
                            ? 'New'
                            : 'Good'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isLow
                              ? 'bg-[#ffdad6] text-[#ba1a1a]'
                              : 'bg-[#eff4ff] text-[#426086]'
                          }`}
                        >
                          {asset.classification || 'Standard'}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-xs text-[#0b1c30] line-clamp-1">{asset.name}</h4>
                    <p className="text-[11px] text-[#44474c] line-clamp-2 mt-1">
                      {asset.description || 'College central inventory unit'}
                    </p>

                    {asset.conditionRemarks && (
                      <div className="mt-2 px-2 py-1 rounded bg-[#eff4ff]/80 border border-[#cbdbf5] text-[10px] text-[#426086] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-[#009299] shrink-0">edit_note</span>
                        <span className="truncate italic">{asset.conditionRemarks}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#e5eeff]">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-[#44474c] text-[11px]">Availability:</span>
                      <span className="font-mono font-bold text-[#0b1c30]">
                        {asset.availableQuantity} / {asset.totalQuantity} {asset.unit || 'units'}
                      </span>
                    </div>

                    {isFaculty ? (
                      <button
                        onClick={() => onSelectNavTab('my-requests-and-bookings', asset.code)}
                        className="w-full py-1.5 bg-[#0e1c2f] hover:bg-[#426086] text-white rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">add_circle</span>
                        <span>Book This Asset</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenStockAdjustModal(asset)}
                        className="w-full py-1.5 bg-[#eff4ff] hover:bg-[#cbdbf5] text-[#426086] rounded text-xs font-semibold transition-all flex items-center justify-center gap-1 border border-[#cbdbf5] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        <span>Edit / Delete Asset</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode: Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-10">
                  <th className="px-4 py-2 font-semibold rounded-l-lg">SKU / Code</th>
                  <th className="px-4 py-2 font-semibold">Item Name</th>
                  <th className="px-4 py-2 font-semibold">Category Group</th>
                  <th className="px-4 py-2 font-semibold">Condition &amp; Remarks</th>
                  <th className="px-4 py-2 font-semibold">Classification</th>
                  <th className="px-4 py-2 font-semibold">Available / Total</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eeff] text-xs">
                {filteredAssets.map((asset, aIdx) => {
                  const isLow =
                    asset.status === 'low-stock' || asset.availableQuantity <= asset.minThreshold;
                  return (
                    <tr key={asset.code || asset.id || asset._id || `asset-row-${aIdx}`} className="hover:bg-[#eff4ff]/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-[#0e1c2f]">{asset.code}</td>
                      <td className="px-4 py-2.5 font-medium text-[#0b1c30]">
                        <div>{asset.name}</div>
                        {asset.department && (
                          <div className="text-[10px] text-[#426086] font-normal truncate max-w-[200px]">{asset.department}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[#44474c] capitalize">{asset.categoryLabel || asset.category}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              asset.condition === 'damaged'
                                ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]'
                                : asset.condition === 'repair' || asset.status === 'maintenance'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : asset.condition === 'new'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {asset.condition === 'damaged'
                              ? 'Damaged'
                              : asset.condition === 'repair' || asset.status === 'maintenance'
                              ? 'Under Repair'
                              : asset.condition === 'new'
                              ? 'Brand New'
                              : 'Operational / Good'}
                          </span>
                          {asset.conditionRemarks ? (
                            <span
                              className="text-[10px] text-[#44474c] italic max-w-[200px] truncate flex items-center gap-1"
                              title={asset.conditionRemarks}
                            >
                              <span className="material-symbols-outlined text-[12px] text-[#009299]">edit_note</span>
                              <span>{asset.conditionRemarks}</span>
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLow ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#eff4ff] text-[#426086]'
                          }`}
                        >
                          {asset.classification || 'Standard'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono">
                        <span className={isLow ? 'text-[#ba1a1a] font-bold' : 'text-[#0b1c30]'}>
                          {asset.availableQuantity} / {asset.totalQuantity} {asset.unit || 'units'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] ${
                            isLow ? 'text-[#ba1a1a] font-bold' : 'text-[#009299] font-medium'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isLow ? 'bg-[#ba1a1a]' : 'bg-[#009299]'
                            }`}
                          ></span>
                          {isLow ? 'Low Stock' : 'Operational'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isFaculty ? (
                          <button
                            onClick={() => onSelectNavTab('my-requests-and-bookings', asset.code)}
                            className="px-2.5 py-1 bg-[#0e1c2f] text-white hover:bg-[#426086] rounded text-xs font-semibold transition-all shadow-xs cursor-pointer"
                          >
                            Book
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenStockAdjustModal(asset)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#eff4ff] text-[#426086] hover:bg-[#dce9ff] rounded text-xs font-semibold transition-all border border-[#cbdbf5] cursor-pointer"
                            title="Edit asset details, stock, condition, or delete asset"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            <span>Edit / Delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredAssets.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[48px] text-gray-400 mb-2">
              search_off
            </span>
            <h4 className="text-sm font-bold text-[#0b1c30]">No assets match your search</h4>
            <p className="text-xs text-[#44474c] mt-1">
              Try modifying your filter or clear the search field.
            </p>
            <button
              onClick={() => {
                setLocalSearch('');
                setSelectedCategoryTab('all');
                setStockStatusFilter('all');
              }}
              className="mt-3 px-4 py-1.5 bg-[#0e1c2f] text-white rounded-lg text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
      ) : (
        /* Executive Dashboard Inventory Health & SOP Wiki Summary */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
          {/* Left Column: Category Stock & Low Stock Health (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#009299]">
                    <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0b1c30]">Inventory Categories &amp; Stock Health</h3>
                    <span className="text-xs text-[#44474c]">Executive summary of 21 institutional asset types</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectNavTab('asset-inventory-and-stock')}
                  className="px-3 py-1.5 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span>Open Full Stock Ledger</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              {/* Category Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-[#426086] uppercase">Classroom Stationery</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-lg font-bold text-[#0b1c30] font-mono">
                      {assets.filter((a) => a.category === 'stationery').length}
                    </span>
                    <span className="text-[11px] text-[#44474c]">Types</span>
                  </div>
                  <span className="text-[10px] text-teal-700 font-semibold mt-1">Markers, Chalks, Paper</span>
                </div>

                <div className="p-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-[#426086] uppercase">Technical &amp; IT</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-lg font-bold text-[#0b1c30] font-mono">
                      {assets.filter((a) => a.category === 'it').length}
                    </span>
                    <span className="text-[11px] text-[#44474c]">Types</span>
                  </div>
                  <span className="text-[10px] text-blue-700 font-semibold mt-1">Projectors, Printers, Cables</span>
                </div>

                <div className="p-3 rounded-lg bg-[#eff4ff]/60 border border-[#cbdbf5] flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-[#426086] uppercase">Audio &amp; Presentation</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-lg font-bold text-[#0b1c30] font-mono">
                      {assets.filter((a) => a.category === 'audio').length}
                    </span>
                    <span className="text-[11px] text-[#44474c]">Types</span>
                  </div>
                  <span className="text-[10px] text-purple-700 font-semibold mt-1">Mics, PA Speakers, Clickers</span>
                </div>
              </div>

              {/* Low Stock Warning Alert Banner */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-700 text-[22px] mt-0.5 shrink-0">
                  warning
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">
                      Safety Threshold Alerts ({assets.filter((a) => (a.availableQuantity || 0) <= (a.minThreshold || 0)).length} Items Under Quota)
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-200/60 text-amber-900">
                      Action Required
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {assets
                      .filter((a) => (a.availableQuantity || 0) <= (a.minThreshold || 0))
                      .slice(0, 4)
                      .map((a) => (
                        <span
                          key={a.code}
                          className="px-2.5 py-1 rounded-md bg-white text-amber-900 text-[11px] font-medium border border-amber-200 flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="font-mono font-bold">{a.code}</span>
                          <span>{a.name}</span>
                          <span className="text-amber-900 font-bold font-mono">({a.availableQuantity} left)</span>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Formal Institutional SOP Policy Wiki Card (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#e5eeff]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#426086]">
                    <span className="material-symbols-outlined text-[20px]">menu_book</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b1c30]">Institutional SOP Wiki</h3>
                    <span className="text-[11px] text-[#44474c]">Document ID: INST-SOP-2026/V2.4</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Council Approved
                </span>
              </div>

              {/* Numbered SOP Clauses */}
              <div className="flex flex-col gap-2.5 text-xs text-[#44474c]">
                <div className="p-2.5 rounded-lg border border-[#e5eeff] bg-[#eff4ff]/30 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-[#009299] text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    1.0
                  </span>
                  <div>
                    <span className="font-bold text-[#0b1c30] block">Requisition Windows</span>
                    <span className="text-[11px] text-[#44474c] leading-relaxed">
                      Same-day (&lt;8h) dispatched immediately. Overnight &amp; multi-day requires HOD endorsement 24h prior.
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-[#e5eeff] bg-[#eff4ff]/30 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-[#426086] text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    2.0
                  </span>
                  <div>
                    <span className="font-bold text-[#0b1c30] block">Concurrency &amp; Conflict Locks</span>
                    <span className="text-[11px] text-[#44474c] leading-relaxed">
                      Time-slots are locked against overlaps. University exams supersede routine class reservations.
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-[#e5eeff] bg-[#eff4ff]/30 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    3.0
                  </span>
                  <div>
                    <span className="font-bold text-[#0b1c30] block">Custody &amp; Gatepass Transit</span>
                    <span className="text-[11px] text-[#44474c] leading-relaxed">
                      Physical barcode check-in and transit gatepasses are required across all academic blocks.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#e5eeff] flex items-center justify-between">
              <span className="text-[10px] text-[#77849c] font-mono">Facilities Council Policy</span>
              <button
                type="button"
                onClick={() => setIsWikiModalOpen(true)}
                className="text-xs font-bold text-[#009299] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Read Full SOP Wiki</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Visual Audit & Facility Breakdown (For Admin/HOD/Tech only) */}
      {!isCatalogOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          {/* Lab Allocation Split Donut Chart Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#426086]">
                    <span className="material-symbols-outlined text-[20px]">pie_chart</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b1c30]">Equipment Deployment</h3>
                    <span className="text-[11px] text-[#44474c]">Active units distribution</span>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#426086] font-semibold">College Facilities</span>
              </div>

              {/* Inline SVG Donut Chart */}
              <div className="flex items-center justify-center py-4">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-40 h-40 -rotate-90" viewBox="0 0 36 36">
                    <circle
                      className="text-[#dce9ff]"
                      cx="18"
                      cy="18"
                      fill="transparent"
                      r="15.91549430918954"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <circle
                      className="text-[#009299]"
                      cx="18"
                      cy="18"
                      fill="transparent"
                      r="15.91549430918954"
                      stroke="currentColor"
                      strokeDasharray="72 28"
                      strokeDashoffset="0"
                      strokeWidth="3.8"
                    />
                    <circle
                      className="text-[#426086]"
                      cx="18"
                      cy="18"
                      fill="transparent"
                      r="15.91549430918954"
                      stroke="currentColor"
                      strokeDasharray="17 83"
                      strokeDashoffset="-72"
                      strokeWidth="3.8"
                    />
                    <circle
                      className="text-[#0e1c2f]"
                      cx="18"
                      cy="18"
                      fill="transparent"
                      r="15.91549430918954"
                      stroke="currentColor"
                      strokeDasharray="11 89"
                      strokeDashoffset="-89"
                      strokeWidth="3.8"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-bold text-[#0b1c30]">
                      {kpis?.capacityPercentage || 88}%
                    </span>
                    <span className="text-[10px] text-[#44474c] uppercase font-bold tracking-wider">
                      Utilized
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#e5eeff] text-center">
                <div className="flex flex-col">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#009299]"></span>
                    <span className="text-[10px] text-[#44474c] font-semibold">Avail</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#0b1c30]">
                    {kpis?.bookableUnits || 98}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#426086]"></span>
                    <span className="text-[10px] text-[#44474c] font-semibold">Checked</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#0b1c30]">
                    {kpis?.activeCheckouts || 24}
                  </span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#0e1c2f]"></span>
                    <span className="text-[10px] text-[#44474c] font-semibold">Perm</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#0b1c30]">
                    {kpis?.permanentAllocated || 16}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[#e5eeff]">
              <button
                onClick={onOpenFloorplanModal}
                className="w-full py-2 bg-[#eff4ff] hover:bg-[#cbdbf5] text-[#426086] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-[#cbdbf5]"
              >
                <span className="material-symbols-outlined text-[18px]">map</span>
                <span>Open Interactive Facility Floorplan</span>
              </button>
            </div>
          </div>

          {/* Dedicated Venues Breakdown Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#426086]">
                    <span className="material-symbols-outlined text-[20px]">apartment</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b1c30]">Target Venue Allocation</h3>
                    <span className="text-[11px] text-[#44474c]">Current custody deployments</span>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#009299] font-bold">4 Venues</span>
              </div>

              <div className="flex flex-col gap-3">
                {(kpis?.venueDeployments || [
                  { venue: 'Software Dev Lab 1 (Bay 3)', units: 42, description: 'Workstations & HDMI cabling' },
                  { venue: 'Seminar Hall B', units: 18, description: 'Audio & Wireless projection' },
                  { venue: 'Academic Classroom 204', units: 24, description: 'Dry-erase markers & remotes' },
                  { venue: 'Faculty Cabin #04', units: 6, description: 'Permanent teaching aids' },
                ]).map((venue, vIdx) => (
                  <div
                    key={`venue-dep-${vIdx}`}
                    className="p-3 bg-[#eff4ff]/50 rounded-lg border border-[#cbdbf5]/50 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#0b1c30] block">{venue.venue}</span>
                      <span className="text-[11px] text-[#44474c]">{venue.description}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs font-bold text-[#009299] block">
                        {venue.units} units
                      </span>
                      <span className="text-[10px] text-gray-400">Deployed</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[#e5eeff]">
              <button
                onClick={() => onSelectNavTab('permanent-allocations')}
                className="w-full py-2 bg-white hover:bg-[#eff4ff] text-[#426086] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-[#cbdbf5]"
              >
                <span className="material-symbols-outlined text-[18px]">domain_add</span>
                <span>Manage Permanent Allocations</span>
              </button>
            </div>
          </div>

          {/* Barcode Audit & Compliance Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#426086]">
                    <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b1c30]">Audit &amp; Compliance</h3>
                    <span className="text-[11px] text-[#44474c]">Semester Barcode Verification</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  98% VERIFIED
                </span>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="p-3 bg-[#eff4ff]/60 rounded-lg border border-[#cbdbf5]/40">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-[#0b1c30]">Catalog Barcodes Tagged</span>
                    <span className="font-mono text-xs text-[#009299] font-bold">
                      {kpis?.barcodeAuditCompletion?.completed || 33} / {kpis?.barcodeAuditCompletion?.total || 35}
                    </span>
                  </div>
                  <div className="w-full bg-[#dce9ff] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#009299] h-full rounded-full"
                      style={{ width: `${kpis?.barcodeAuditCompletion?.percentage || 97}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-[#44474c] block mt-1.5">
                    Laser-etched QR and Code 128 standards applied
                  </span>
                </div>

                <div className="p-3 bg-[#eff4ff]/60 rounded-lg border border-[#cbdbf5]/40">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-[#0b1c30]">
                      Consumable Threshold Buffer
                    </span>
                    <span className="font-mono text-xs text-[#ba1a1a] font-bold">Warning Level</span>
                  </div>
                  <div className="w-full bg-[#dce9ff] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#ba1a1a] h-full rounded-full" style={{ width: '35%' }}></div>
                  </div>
                  <span className="text-[10px] text-[#44474c] block mt-1.5">
                    Stationery threshold buffer verified by campus administration
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-2">
              <button
                onClick={onPrintSlip}
                className="w-full py-2 bg-[#0e1c2f] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#426086] transition-all shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Print Lab Audit Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KPI DETAIL DRILL-DOWN MODAL (All 6 Blocks Clickable) */}
      {/* ========================================================================= */}
      {activeKpiModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0e1c2f]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setActiveKpiModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e5eeff] flex items-center justify-between bg-gradient-to-r from-[#f8fafd] to-white">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activeKpiModal === 'total-units'
                      ? 'bg-[#009299]/10 text-[#009299]'
                      : activeKpiModal === 'bookable-now'
                      ? 'bg-sky-50 text-sky-700'
                      : activeKpiModal === 'approvals-due'
                      ? 'bg-rose-50 text-[#ba1a1a]'
                      : activeKpiModal === 'active-checkouts'
                      ? 'bg-[#426086]/10 text-[#426086]'
                      : activeKpiModal === 'perm-allocated'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {activeKpiModal === 'total-units' && 'layers'}
                    {activeKpiModal === 'bookable-now' && 'event_available'}
                    {activeKpiModal === 'approvals-due' && 'pending_actions'}
                    {activeKpiModal === 'active-checkouts' && 'outbox'}
                    {activeKpiModal === 'perm-allocated' && 'verified'}
                    {activeKpiModal === 'low-stock' && 'warning'}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0b1c30]">
                    {activeKpiModal === 'total-units' && 'Total Inventory Units & Catalog Roster'}
                    {activeKpiModal === 'bookable-now' && 'Bookable Equipment (Ready for Dispatch)'}
                    {activeKpiModal === 'approvals-due' && 'Pending Approvals Queue (Action Required)'}
                    {activeKpiModal === 'active-checkouts' && 'Active Checkouts & Faculty Custody'}
                    {activeKpiModal === 'perm-allocated' && 'Permanently Allocated Institutional Hardware'}
                    {activeKpiModal === 'low-stock' && 'Low Stock Warnings & Reorder Recommendations'}
                  </h2>
                  <p className="text-xs text-[#72777f]">
                    {activeKpiModal === 'total-units' && `Complete live inventory of all ${assets.length} catalog items across college facilities.`}
                    {activeKpiModal === 'bookable-now' && 'Equipment currently in stock and immediately available for lecture or event booking.'}
                    {activeKpiModal === 'approvals-due' && 'Requisitions submitted by faculty awaiting administrative verification.'}
                    {activeKpiModal === 'active-checkouts' && 'Hardware and presentation aids currently checked out to faculty members.'}
                    {activeKpiModal === 'perm-allocated' && 'High-value hardware units deployed in dedicated faculty cabins and specialized labs.'}
                    {activeKpiModal === 'low-stock' && 'Items that have breached safe operational thresholds and need restocking.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                className="w-8 h-8 rounded-lg text-[#72777f] hover:text-[#0b1c30] hover:bg-[#eff4ff] flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Quick Metrics Strip */}
            <div className="px-6 py-2.5 bg-[#eff4ff]/50 border-b border-[#e5eeff] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                {activeKpiModal === 'total-units' && (
                  <>
                    <span className="font-semibold text-[#0b1c30]">Total Units: <strong>{kpis?.totalUnits || 290}</strong></span>
                    <span className="text-[#009299]">Catalog SKUs: <strong>{assets.length}</strong></span>
                    <span className="text-[#426086]">Capacity: <strong>{kpis?.capacityPercentage || 90.6}%</strong></span>
                  </>
                )}
                {activeKpiModal === 'bookable-now' && (
                  <>
                    <span className="font-semibold text-[#0b1c30]">Bookable Units: <strong className="text-[#009299]">{kpis?.bookableUnits || 98}</strong></span>
                    <span className="text-[#426086]">Instant Dispatch Ratio: <strong>{kpis?.bookablePercentage || 72}%</strong></span>
                  </>
                )}
                {activeKpiModal === 'approvals-due' && (
                  <>
                    <span className="font-semibold text-[#ba1a1a]">Requisitions in Review: <strong>{pendingQueue.length}</strong></span>
                    <span className="text-[#426086]">Urgent Actions: <strong>{pendingQueue.filter(p => p.type !== 'consumable').length} Requisitions</strong></span>
                  </>
                )}
                {activeKpiModal === 'active-checkouts' && (
                  <>
                    <span className="font-semibold text-[#0b1c30]">Currently in Custody: <strong className="text-[#426086]">{bookings.filter(b => b.status === 'dispatched').length} items</strong></span>
                    <span className="text-emerald-700">Deployments: <strong>All verified with Gatepass</strong></span>
                  </>
                )}
                {activeKpiModal === 'perm-allocated' && (
                  <>
                    <span className="font-semibold text-[#0b1c30]">Permanent Units: <strong className="text-indigo-700">{kpis?.permanentAllocated || 16}</strong></span>
                    <span className="text-[#426086]">Custodians: <strong>Faculty Cabins &amp; Lab Clusters</strong></span>
                  </>
                )}
                {activeKpiModal === 'low-stock' && (
                  <>
                    <span className="font-semibold text-[#ba1a1a]">Threshold Breached: <strong>{assets.filter(a => (a.availableQuantity || 0) <= (a.minThreshold || 0)).length} SKUs</strong></span>
                    <span className="text-amber-700">Restock Urgency: <strong>High</strong></span>
                  </>
                )}
              </div>
              <span className="text-[11px] font-mono text-[#72777f]">
                Institutional Ledger • AY {academicSettings?.academicYear || '2026-27'}
              </span>
            </div>

            {/* Search and Filters Toolbar */}
            <div className="p-4 border-b border-[#e5eeff] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#72777f]">
                  search
                </span>
                <input
                  type="text"
                  placeholder={
                    activeKpiModal === 'approvals-due' || activeKpiModal === 'active-checkouts'
                      ? 'Search by Req ID, asset, requester name, department, or venue...'
                      : 'Search by SKU code, asset name, category, or location...'
                  }
                  value={kpiModalSearch}
                  onChange={(e) => setKpiModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#cbdbf5] rounded-lg text-xs font-medium text-[#0b1c30] placeholder-[#72777f] focus:outline-none focus:ring-2 focus:ring-[#009299]/30 focus:border-[#009299]"
                />
              </div>

              {(activeKpiModal === 'total-units' || activeKpiModal === 'bookable-now') && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {['all', 'stationery', 'it', 'audio', 'recording'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setKpiModalCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize whitespace-nowrap cursor-pointer transition-all ${
                        kpiModalCategoryFilter === cat
                          ? 'bg-[#0e1c2f] text-white shadow-2xs'
                          : 'bg-[#eff4ff] text-[#426086] hover:bg-[#cbdbf5]'
                      }`}
                    >
                      {cat === 'all' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3.5">
              {/* 1. TOTAL UNITS or 2. BOOKABLE NOW */}
              {(activeKpiModal === 'total-units' || activeKpiModal === 'bookable-now') && (
                <div>
                  {(() => {
                    const list = assets.filter((a) => {
                      if (activeKpiModal === 'bookable-now') {
                        if (a.isConsumable || (a.availableQuantity || 0) <= 0) return false;
                      }
                      if (kpiModalCategoryFilter !== 'all' && a.category !== kpiModalCategoryFilter) return false;
                      if (!kpiModalSearch.trim()) return true;
                      const q = kpiModalSearch.toLowerCase().trim();
                      return (
                        a.code.toLowerCase().includes(q) ||
                        a.name.toLowerCase().includes(q) ||
                        a.category.toLowerCase().includes(q) ||
                        (a.location && a.location.toLowerCase().includes(q))
                      );
                    });

                    if (list.length === 0) {
                      return (
                        <div className="py-12 text-center flex flex-col items-center justify-center text-[#72777f]">
                          <span className="material-symbols-outlined text-[44px] text-[#cbdbf5] mb-2">
                            inventory_2
                          </span>
                          <p className="text-sm font-bold text-[#0b1c30]">No assets found</p>
                          <p className="text-xs text-[#72777f] mt-0.5">Try a different search term or category filter.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto border border-[#e5eeff] rounded-xl shadow-2xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#eff4ff]/80 text-[#426086] font-bold uppercase tracking-wider text-[10px] border-b border-[#cbdbf5]">
                              <th className="py-2.5 px-3">SKU / Code</th>
                              <th className="py-2.5 px-3">Asset Description</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3 text-right">Available</th>
                              <th className="py-2.5 px-3 text-right">Total</th>
                              <th className="py-2.5 px-3">Location</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              {activeKpiModal === 'bookable-now' && (
                                <th className="py-2.5 px-3 text-right">Action</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f1f5f9] bg-white">
                            {list.map((asset) => (
                              <tr key={asset.code} className="hover:bg-[#f8fafd] transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[#0e1c2f]">{asset.code}</td>
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-[#0b1c30] block">{asset.name}</span>
                                  <span className="text-[10px] text-[#72777f]">{asset.classification || 'Educational Equipment'}</span>
                                </td>
                                <td className="py-2.5 px-3 capitalize text-[#426086] font-medium">{asset.category}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#009299]">
                                  {asset.availableQuantity} {asset.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-[#0b1c30]">
                                  {asset.totalQuantity} {asset.unit}
                                </td>
                                <td className="py-2.5 px-3 text-[#44474c]">{asset.location || 'Central Dispense'}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      asset.availableQuantity <= asset.minThreshold
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}
                                  >
                                    {asset.status || 'operational'}
                                  </span>
                                </td>
                                {activeKpiModal === 'bookable-now' && (
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveKpiModal(null);
                                        onSelectNavTab('new-request', asset.code);
                                      }}
                                      className="px-2.5 py-1 bg-[#009299] text-white hover:bg-[#007a80] rounded text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                    >
                                      Quick Book
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 3. APPROVALS DUE */}
              {activeKpiModal === 'approvals-due' && (
                <div>
                  {(() => {
                    const list = pendingQueue.filter((b) => {
                      if (!kpiModalSearch.trim()) return true;
                      const q = kpiModalSearch.toLowerCase().trim();
                      return (
                        b.reqId?.toLowerCase().includes(q) ||
                        b.assetName?.toLowerCase().includes(q) ||
                        b.assetCode?.toLowerCase().includes(q) ||
                        b.requesterName?.toLowerCase().includes(q) ||
                        b.department?.toLowerCase().includes(q) ||
                        b.venue?.toLowerCase().includes(q)
                      );
                    });

                    if (list.length === 0) {
                      return (
                        <div className="py-12 text-center flex flex-col items-center justify-center text-[#72777f]">
                          <span className="material-symbols-outlined text-[44px] text-emerald-500 mb-2">
                            check_circle
                          </span>
                          <p className="text-sm font-bold text-[#0b1c30]">All Caught Up!</p>
                          <p className="text-xs text-[#72777f] mt-0.5">There are no pending requisitions awaiting approval.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {list.map((booking) => (
                          <div
                            key={booking.id || booking._id || booking.reqId}
                            className="p-4 bg-white rounded-xl border border-[#cbdbf5] hover:border-[#ba1a1a] transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#ba1a1a] bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-100">
                                  {booking.reqId}
                                </span>
                                <span className="font-bold text-[#0b1c30] text-sm">{booking.assetName}</span>
                                <span className="font-mono text-[10px] text-[#72777f]">({booking.assetCode})</span>
                              </div>
                              <p className="text-[#44474c] text-[11px]">
                                Requester: <strong className="text-[#0b1c30]">{booking.requesterName}</strong> ({booking.department || 'Faculty'}) • Venue: <strong>{booking.venue || 'Lecture Hall'}</strong>
                              </p>
                              <p className="text-[10px] text-[#72777f]">
                                Schedule: {booking.bookingDate || booking.startDate || 'Scheduled'} {booking.startTime ? `(${booking.startTime} - ${booking.endTime})` : ''} • Qty: <strong>{booking.quantity || 1}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onApprove(booking.reqId, booking.type === 'consumable');
                                  setActiveKpiModal(null);
                                }}
                                className="px-3 py-1.5 bg-[#009299] hover:bg-[#007a80] text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">check</span>
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveKpiModal(null);
                                  onOpenRejectModal(booking);
                                }}
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all border border-rose-200 cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 4. ACTIVE CHECKOUTS */}
              {activeKpiModal === 'active-checkouts' && (
                <div>
                  {(() => {
                    const list = bookings
                      .filter((b) => b.status === 'dispatched')
                      .filter((b) => {
                        if (!kpiModalSearch.trim()) return true;
                        const q = kpiModalSearch.toLowerCase().trim();
                        return (
                          b.reqId?.toLowerCase().includes(q) ||
                          b.assetName?.toLowerCase().includes(q) ||
                          b.assetCode?.toLowerCase().includes(q) ||
                          b.requesterName?.toLowerCase().includes(q) ||
                          b.venue?.toLowerCase().includes(q)
                        );
                      });

                    if (list.length === 0) {
                      return (
                        <div className="py-12 text-center flex flex-col items-center justify-center text-[#72777f]">
                          <span className="material-symbols-outlined text-[44px] text-[#cbdbf5] mb-2">
                            inventory
                          </span>
                          <p className="text-sm font-bold text-[#0b1c30]">No Active Checkouts</p>
                          <p className="text-xs text-[#72777f] mt-0.5">All loaned equipment has been returned to storage shelves.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {list.map((booking) => (
                          <div
                            key={booking.id || booking._id || booking.reqId}
                            className="p-4 bg-white rounded-xl border border-[#cbdbf5] hover:border-[#426086] transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-[#426086] bg-[#eff4ff] px-2 py-0.5 rounded text-[11px]">
                                  {booking.reqId}
                                </span>
                                <span className="font-bold text-[#0b1c30] text-sm">{booking.assetName}</span>
                                <span className="font-mono text-[10px] text-[#72777f]">({booking.assetCode})</span>
                              </div>
                              <p className="text-[11px] text-[#44474c]">
                                Custodian: <strong className="text-[#0b1c30]">{booking.requesterName}</strong> • Deployed At: <strong>{booking.venue || 'Seminar Hall'}</strong>
                              </p>
                              <span className="text-[10px] text-[#009299] font-medium flex items-center gap-1 mt-1">
                                <span className="material-symbols-outlined text-[13px]">schedule</span>
                                Issued: {booking.bookingDate || 'Active Session'} {booking.startTime ? `(${booking.startTime} - ${booking.endTime})` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {onOpenGatepass && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveKpiModal(null);
                                    onOpenGatepass(booking);
                                  }}
                                  className="px-3 py-1.5 bg-[#eff4ff] text-[#426086] hover:bg-[#cbdbf5] rounded-lg text-xs font-semibold border border-[#cbdbf5] transition-colors cursor-pointer"
                                >
                                  Gatepass Voucher
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveKpiModal(null);
                                  onSelectNavTab('issue-and-return-desk');
                                }}
                                className="px-3 py-1.5 bg-[#0e1c2f] text-white hover:bg-[#426086] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Return Desk
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 5. PERM ALLOCATED */}
              {activeKpiModal === 'perm-allocated' && (
                <div>
                  {(() => {
                    const list = assets
                      .filter((a) => (a.permanentQuantity || 0) > 0)
                      .filter((a) => {
                        if (!kpiModalSearch.trim()) return true;
                        const q = kpiModalSearch.toLowerCase().trim();
                        return (
                          a.code.toLowerCase().includes(q) ||
                          a.name.toLowerCase().includes(q) ||
                          (a.location && a.location.toLowerCase().includes(q))
                        );
                      });

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-[#eff4ff] border border-[#cbdbf5]">
                          <div>
                            <span className="font-bold text-[#0b1c30] text-xs block">Permanent Allocations Ledger</span>
                            <span className="text-[11px] text-[#44474c]">Dedicated hardware allocated to faculty cabins, research nodes, and conference suites.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveKpiModal(null);
                              onSelectNavTab('permanent-allocations');
                            }}
                            className="px-3 py-1.5 bg-[#0e1c2f] text-white hover:bg-[#426086] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Open Full Ledger
                          </button>
                        </div>

                        <div className="overflow-x-auto border border-[#e5eeff] rounded-xl shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#eff4ff]/80 text-[#426086] font-bold uppercase tracking-wider text-[10px] border-b border-[#cbdbf5]">
                                <th className="py-2.5 px-3">SKU / Code</th>
                                <th className="py-2.5 px-3">Asset Description</th>
                                <th className="py-2.5 px-3">Dedicated Location</th>
                                <th className="py-2.5 px-3 text-right">Perm. Qty</th>
                                <th className="py-2.5 px-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f1f5f9] bg-white">
                              {list.map((asset) => (
                                <tr key={asset.code} className="hover:bg-[#f8fafd]">
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#0e1c2f]">{asset.code}</td>
                                  <td className="py-2.5 px-3 font-medium text-[#0b1c30]">{asset.name}</td>
                                  <td className="py-2.5 px-3 text-[#44474c]">{asset.location || 'Faculty Cabins'}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                                    {asset.permanentQuantity} {asset.unit}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      Permanent Custody
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 6. LOW STOCK WARNING */}
              {activeKpiModal === 'low-stock' && (
                <div>
                  {(() => {
                    const list = assets
                      .filter((a) => (a.availableQuantity || 0) <= (a.minThreshold || 0))
                      .filter((a) => {
                        if (!kpiModalSearch.trim()) return true;
                        const q = kpiModalSearch.toLowerCase().trim();
                        return (
                          a.code.toLowerCase().includes(q) ||
                          a.name.toLowerCase().includes(q) ||
                          a.category.toLowerCase().includes(q)
                        );
                      });

                    if (list.length === 0) {
                      return (
                        <div className="py-12 text-center flex flex-col items-center justify-center text-[#72777f]">
                          <span className="material-symbols-outlined text-[44px] text-emerald-500 mb-2">
                            verified
                          </span>
                          <p className="text-sm font-bold text-[#0b1c30]">Stock Levels Healthy</p>
                          <p className="text-xs text-[#72777f] mt-0.5">All consumable and hardware assets are above minimum thresholds.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {list.map((asset) => {
                          const pct = Math.min(
                            100,
                            Math.round(((asset.availableQuantity || 0) / Math.max(asset.totalQuantity || 1, 1)) * 100)
                          );
                          return (
                            <div
                              key={asset.code}
                              className="p-4 bg-white rounded-xl border border-rose-200 hover:border-[#ba1a1a] transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#ba1a1a] bg-rose-50 px-2 py-0.5 rounded text-[11px] border border-rose-200">
                                    {asset.code}
                                  </span>
                                  <span className="font-bold text-[#0b1c30] text-sm">{asset.name}</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#ba1a1a] text-white">
                                    LOW STOCK
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-28 bg-[#cbdbf5] h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-[#ba1a1a] h-full rounded-full" style={{ width: `${pct}%` }}></div>
                                  </div>
                                  <span className="font-mono text-xs font-bold text-[#ba1a1a]">
                                    {asset.availableQuantity} / {asset.totalQuantity} {asset.unit}
                                  </span>
                                  <span className="text-[11px] text-[#72777f]">
                                    (Min Threshold: {asset.minThreshold} {asset.unit})
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveKpiModal(null);
                                  onOpenStockAdjustModal(asset);
                                }}
                                className="px-3.5 py-1.5 bg-[#0e1c2f] hover:bg-[#426086] text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer shrink-0"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                                <span>Edit / Delete</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#e5eeff] bg-[#f8fafd] flex items-center justify-between">
              <span className="text-xs text-[#72777f]">
                Sunstone Central Operations • AssetHub Realtime ERP
              </span>
              <button
                type="button"
                onClick={() => setActiveKpiModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Institutional SOP Wiki Modal */}
      <GuidelinesModal
        isOpen={isWikiModalOpen}
        onClose={() => setIsWikiModalOpen(false)}
      />
    </div>
  );
};
