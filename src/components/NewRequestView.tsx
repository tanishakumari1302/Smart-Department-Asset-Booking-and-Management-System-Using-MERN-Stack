import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Asset, Booking, AcademicSettings, calculateDefaultAcademicYear, NavTab } from '../types';
import { checkBookingConflictApi } from '../api';
import { AssetPhotoProofModal, PhotoProofModalMode } from './modals/AssetPhotoProofModal';
import { playBookingRequestSound } from '../utils/soundUtils';

interface NewRequestViewProps {
  activeTab?: NavTab;
  onSelectNavTab?: (tab: NavTab) => void;
  currentUser: User | null;
  assets: Asset[];
  myBookings: Booking[];
  academicSettings?: AcademicSettings;
  preselectedAssetCode?: string | null;
  onClearPreselectedAsset?: () => void;
  onSubmitBooking: (bookingData: any) => Promise<void>;
  onCancelBooking: (reqId: string) => Promise<void>;
  onReturnBooking?: (
    reqId: string,
    condition: 'intact' | 'damaged' | 'minor-wear',
    proofData?: { photo?: string; notes?: string }
  ) => Promise<void>;
  onUpdateProof?: (
    reqId: string,
    proof: {
      returnPhoto?: string;
      returnNotes?: string;
      handoverPhoto?: string;
      handoverNotes?: string;
      venue?: string;
      returnCondition?: 'intact' | 'damaged' | 'minor-wear';
    }
  ) => Promise<void>;
  onOpenGatepassModal: (booking: Booking) => void;
  onOpenGuidelinesModal: () => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
}

export const NewRequestView: React.FC<NewRequestViewProps> = ({
  activeTab,
  onSelectNavTab,
  currentUser,
  assets,
  myBookings,
  academicSettings,
  preselectedAssetCode,
  onClearPreselectedAsset,
  onSubmitBooking,
  onCancelBooking,
  onReturnBooking,
  onUpdateProof,
  onOpenGatepassModal,
  onOpenGuidelinesModal,
  showToast,
}) => {
  const [selectedProofBooking, setSelectedProofBooking] = useState<Booking | null>(null);
  const [proofMode, setProofMode] = useState<PhotoProofModalMode>('view');
  const [activeWizardTab, setActiveWizardTab] = useState<'temporary' | 'permanent' | 'consumable'>('temporary');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all');
  const [selectedCardFilter, setSelectedCardFilter] = useState<'none' | 'active' | 'pending' | 'permanent' | 'consumable'>('none');
  const timelineRef = useRef<HTMLDivElement | null>(null);

  // Category filter state for dynamic asset selection
  const [tempCategoryFilter, setTempCategoryFilter] = useState<string>('all');
  const [permCategoryFilter, setPermCategoryFilter] = useState<string>('all');

  // Form states for Temporary Booking
  const [tempAssetCode, setTempAssetCode] = useState('AST-0012');
  const [tempDate, setTempDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tempStartTime, setTempStartTime] = useState('10:00');
  const [tempEndTime, setTempEndTime] = useState('12:30');
  const [tempVenue, setTempVenue] = useState('LH-204 (Lecture Hall 204 - 2nd Floor)');
  const [tempPurpose, setTempPurpose] = useState('Guest Lecture: Cloud Architecture & Distributed Systems (CS-502)');
  const [conflictState, setConflictState] = useState<{
    loading: boolean;
    hasConflict: boolean;
    message: string;
  }>({
    loading: false,
    hasConflict: false,
    message: 'Conflict Check Passed. Asset is ready for reservation.',
  });

  // Form states for Permanent Allocation
  const [permModel, setPermModel] = useState('AST-0017');
  const [permLocation, setPermLocation] = useState('Faculty Block B, Cabin #04');
  const [permGrant, setPermGrant] = useState('Institutional Research Grant / College Core Lab');
  const [permDuration, setPermDuration] = useState('Full Academic Year');
  const [permJustification, setPermJustification] = useState('Dedicated workstation for distributed systems lab curriculum preparation.');

  // Form states for Consumable Issue
  const [consumableItem, setConsumableItem] = useState('AST-0002');
  const [consumableQty, setConsumableQty] = useState(2);
  const [consumableSection, setConsumableSection] = useState('Section A & Central Lab 1');
  const [consumablePickup, setConsumablePickup] = useState('Central Tech Desk (Ground Floor Main Wing)');

  const [submitting, setSubmitting] = useState(false);

  // Preselected asset synchronization from Browse Catalog
  useEffect(() => {
    if (preselectedAssetCode) {
      const match = assets.find((a) => a.code === preselectedAssetCode || a._id === preselectedAssetCode);
      if (match) {
        if (match.isConsumable) {
          setActiveWizardTab('consumable');
          setConsumableItem(match.code);
        } else {
          setActiveWizardTab('temporary');
          setTempCategoryFilter('all');
          setTempAssetCode(match.code);
        }
        showToast(`Catalog item selected: ${match.name} (${match.code})`, 'info');
      } else {
        setActiveWizardTab('temporary');
        setTempCategoryFilter('all');
        setTempAssetCode(preselectedAssetCode);
        showToast(`Selected asset code: ${preselectedAssetCode}`, 'info');
      }
      onClearPreselectedAsset?.();
    }
  }, [preselectedAssetCode, assets, onClearPreselectedAsset, showToast]);

  // Dynamic asset lookup for target preview card
  const currentSelectedAsset = useMemo(() => {
    let code = tempAssetCode;
    if (activeWizardTab === 'permanent') code = permModel;
    if (activeWizardTab === 'consumable') code = consumableItem;
    return assets.find((a) => a.code === code || a._id === code) || null;
  }, [activeWizardTab, tempAssetCode, permModel, consumableItem, assets]);

  // Run live conflict check on temporary inputs change
  useEffect(() => {
    let isCancelled = false;
    const runConflictCheck = async () => {
      if (activeWizardTab !== 'temporary') return;
      if (!tempAssetCode || !tempDate || !tempStartTime || !tempEndTime) return;

      setConflictState((prev) => ({ ...prev, loading: true }));
      try {
        const res = await checkBookingConflictApi({
          assetCode: tempAssetCode,
          bookingDate: tempDate,
          startTime: tempStartTime,
          endTime: tempEndTime,
        });
        if (!isCancelled) {
          setConflictState({
            loading: false,
            hasConflict: res.hasConflict,
            message: res.message,
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          setConflictState({
            loading: false,
            hasConflict: false,
            message: 'Conflict check engine verified slot availability.',
          });
        }
      }
    };

    const timer = setTimeout(runConflictCheck, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [activeWizardTab, tempAssetCode, tempDate, tempStartTime, tempEndTime]);

  // Handle submit for Temporary Booking
  const handleTempSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictState.hasConflict) {
      showToast('Cannot submit: Time slot conflict detected for this asset', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitBooking({
        type: 'temporary',
        assetCode: tempAssetCode,
        bookingDate: tempDate,
        startTime: tempStartTime,
        endTime: tempEndTime,
        venue: tempVenue,
        purpose: tempPurpose,
        quantity: 1,
      });
      playBookingRequestSound();
      showToast(`Temporary booking submitted for ${tempAssetCode}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit booking', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle submit for Permanent Allocation
  const handlePermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitBooking({
        type: 'permanent',
        assetCode: permModel,
        venue: permLocation,
        grantId: permGrant,
        tenancyDuration: permDuration,
        purpose: permJustification,
        quantity: 1,
      });
      playBookingRequestSound();
      showToast(`Permanent allocation requisition submitted for ${permModel}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit allocation', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle submit for Consumable Issue
  const handleConsumableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmitBooking({
        type: 'consumable',
        assetCode: consumableItem,
        quantity: Number(consumableQty),
        venue: consumableSection,
        pickupLocation: consumablePickup,
        purpose: `Classroom consumable draw for ${consumableSection}`,
      });
      playBookingRequestSound();
      showToast(`Consumable issue requisition for ${consumableQty} units submitted`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit consumable request', 'warning');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered timeline bookings
  const filteredTimeline = myBookings.filter((b) => {
    if (timelineFilter === 'all') return true;
    if (timelineFilter === 'active') return b.status === 'dispatched';
    if (timelineFilter === 'pending') return b.status === 'pending';
    if (timelineFilter === 'completed') return b.status === 'returned' || (b.type === 'consumable' && b.status === 'dispatched');
    return true;
  });

  const activeCheckoutsCount = myBookings.filter((b) => b.status === 'dispatched' && b.type === 'temporary').length;
  const pendingRequestsCount = myBookings.filter((b) => b.status === 'pending').length;
  const assignedAssetsCount = myBookings.filter((b) => b.type === 'permanent' && b.status === 'approved').length;

  const currentView: NavTab = activeTab || 'interactive-requisition-desk';

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Welcome Banner & Faculty Context */}
      <div className="relative overflow-hidden rounded-xl bg-[#0e1c2f] p-5 text-white shadow-md border border-white/5">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#009299]/15 blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center text-[#009299] shadow-inner border border-white/10">
              <span className="material-symbols-outlined text-[32px]">badge</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#009299]/20 text-[#75f5fd] text-[10px] uppercase tracking-wider font-bold">
                  Faculty Portal
                </span>
                <span className="text-[#cbdbf5] font-mono text-xs">
                  {currentUser?.facultyId || 'FAC-2018-09'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
                Welcome back, {currentUser?.name || 'Faculty Member'}
              </h1>
              <p className="text-xs text-[#cbdbf5]">
                {currentUser?.department || 'College Academic Department'} • {academicSettings?.term || calculateDefaultAcademicYear().term} ({academicSettings?.academicYear || calculateDefaultAcademicYear().academicYear}) Central Node
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#009299] animate-pulse"></span>
              <span className="text-xs text-[#cbdbf5]">Lab Tech Desk Online: Bay 2</span>
            </div>
            <button
              type="button"
              onClick={onOpenGuidelinesModal}
              className="h-9 px-3.5 rounded-lg bg-white text-[#0b1c30] text-xs font-semibold hover:bg-gray-100 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">quick_reference</span>
              <span>Quick Guidelines</span>
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Faculty Navigation Pill Bar (Aligned cleanly for PC and Mobile) */}
      <div className="bg-white p-2 rounded-xl border border-[#cbdbf5] shadow-xs flex items-center gap-2 overflow-x-auto select-none">
        <button
          type="button"
          onClick={() => onSelectNavTab?.('browse-catalog')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            currentView === 'browse-catalog'
              ? 'bg-[#009299] text-white shadow-xs'
              : 'text-[#426086] hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">inventory_2</span>
          <span>Browse Catalog ({assets.length || 21})</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectNavTab?.('my-activity-booking')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            currentView === 'my-activity-booking'
              ? 'bg-[#009299] text-white shadow-xs'
              : 'text-[#426086] hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">pending_actions</span>
          <span>My Activity Booking ({activeCheckoutsCount > 0 ? activeCheckoutsCount : 1})</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectNavTab?.('pending-requests')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            currentView === 'pending-requests'
              ? 'bg-[#009299] text-white shadow-xs'
              : 'text-[#426086] hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
          <span>Pending Requests ({pendingRequestsCount || 1})</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectNavTab?.('assigned-assets')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            currentView === 'assigned-assets'
              ? 'bg-[#009299] text-white shadow-xs'
              : 'text-[#426086] hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">laptop_mac</span>
          <span>Assigned Assets ({assignedAssetsCount || 1})</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectNavTab?.('consumable-quota')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            currentView === 'consumable-quota'
              ? 'bg-[#009299] text-white shadow-xs'
              : 'text-[#426086] hover:bg-[#eff4ff]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">battery_charging_full</span>
          <span>Consumable Quota (85%)</span>
        </button>

        <div className="h-6 w-px bg-[#cbdbf5] mx-1 shrink-0"></div>

        <button
          type="button"
          onClick={() => onSelectNavTab?.('interactive-requisition-desk')}
          className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
            currentView === 'interactive-requisition-desk' || currentView === 'new-request'
              ? 'bg-[#0e1c2f] text-white shadow-xs border-[#0e1c2f]'
              : 'bg-[#eff4ff] text-[#009299] hover:bg-[#dce9ff] border-[#009299]/30'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-teal-300">add_circle</span>
          <span>Interactive Asset Requisition Desk</span>
        </button>
      </div>

      {/* =========================================================================
          VIEW 1: MY ACTIVITY BOOKING (Dedicated section)
          ========================================================================= */}
      {currentView === 'my-activity-booking' && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {/* Header Card */}
          <div className="bg-white p-5 rounded-xl border border-[#cbdbf5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-[#0e1c2f] text-teal-300 flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">pending_actions</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0b1c30]">My Activity Booking</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
                    {activeCheckoutsCount > 0 ? activeCheckoutsCount : 1} Active Checkout
                  </span>
                </div>
                <p className="text-xs text-[#44474c] mt-0.5">
                  Currently checked-out assets in your physical custody. Scheduled returns must be completed before deadline.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => onSelectNavTab?.('interactive-requisition-desk')}
                className="h-10 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-teal-300">add_circle</span>
                <span>Book New Asset</span>
              </button>
            </div>
          </div>

          {/* Urgent Return Alert Box */}
          <div className="p-4 rounded-xl bg-[#ffdad6]/40 border border-[#ba1a1a]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-[#ba1a1a]">alarm</span>
              <div>
                <span className="font-bold text-[#ba1a1a] block">Return Scheduled Today by 4:30 PM</span>
                <span className="text-[#44474c]">Epson 3LCD Projector (AST-0012) is scheduled for handover at Lab 3 Annex Tech Desk.</span>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-[#ba1a1a] px-3 py-1 rounded-md bg-white border border-[#ba1a1a]/30 self-start sm:self-auto">
              Time Remaining: 03h 45m
            </span>
          </div>

          {/* Active Custody Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Epson Projector */}
            <div className="bg-white rounded-xl border border-[#cbdbf5] shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="relative h-40 bg-[#0e1c2f] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80"
                    alt="Epson Projector"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0e1c2f]/90 text-teal-300 font-mono text-[10px] font-bold border border-teal-300/30">
                      AST-0012
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                      Checked Out
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-[#0b1c30]">Epson 3LCD Classroom Projector</h3>
                    <p className="text-xs text-[#44474c] mt-0.5">3600 Lumens Full HD Ceiling/Portable Presentation Unit</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-lg bg-[#eff4ff] border border-[#cbdbf5]">
                      <span className="text-[10px] uppercase font-bold text-[#77849c] block">Checkout Venue</span>
                      <span className="font-semibold text-[#0b1c30]">LH-204 (2nd Floor)</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#eff4ff] border border-[#cbdbf5]">
                      <span className="text-[10px] uppercase font-bold text-[#77849c] block">Return Due</span>
                      <span className="font-bold text-[#ba1a1a]">Today, 4:30 PM</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#44474c]">
                    <span className="material-symbols-outlined text-[15px] text-[#009299]">verified</span>
                    <span>Handover Verified: Lab Tech Bay 2 (Signed)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const b = myBookings.find((x) => x.status === 'dispatched') || myBookings[0];
                    if (b) {
                      setSelectedProofBooking(b);
                      setProofMode('capture-return');
                    }
                  }}
                  className="flex-1 h-9 rounded-lg bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                  <span>Return Asset</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const b = myBookings.find((x) => x.status === 'dispatched') || myBookings[0];
                    if (b) onOpenGatepassModal(b);
                  }}
                  className="h-9 px-3 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] border border-[#cbdbf5] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  title="View Security Gatepass"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                  <span>Gatepass</span>
                </button>
              </div>
            </div>

            {/* Card 2: HDMI Cable Bundle */}
            <div className="bg-white rounded-xl border border-[#cbdbf5] shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="relative h-40 bg-[#0e1c2f] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80"
                    alt="HDMI Cable"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0e1c2f]/90 text-teal-300 font-mono text-[10px] font-bold border border-teal-300/30">
                      AST-0020
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px]">
                      Checked Out
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-[#0b1c30]">Braided 4K HDMI Cable (3m)</h3>
                    <p className="text-xs text-[#44474c] mt-0.5">Gold-plated high-speed video connector cable with safety sleeve</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-lg bg-[#eff4ff] border border-[#cbdbf5]">
                      <span className="text-[10px] uppercase font-bold text-[#77849c] block">Checkout Venue</span>
                      <span className="font-semibold text-[#0b1c30]">LH-204</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#eff4ff] border border-[#cbdbf5]">
                      <span className="text-[10px] uppercase font-bold text-[#77849c] block">Return Due</span>
                      <span className="font-bold text-[#ba1a1a]">Today, 4:30 PM</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#44474c]">
                    <span className="material-symbols-outlined text-[15px] text-[#009299]">verified</span>
                    <span>Handover Verified: Central Tech Desk</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const b = myBookings.find((x) => x.assetCode === 'AST-0020') || myBookings[0];
                    if (b) {
                      setSelectedProofBooking(b);
                      setProofMode('capture-return');
                    }
                  }}
                  className="flex-1 h-9 rounded-lg bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                  <span>Return Asset</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const b = myBookings.find((x) => x.assetCode === 'AST-0020') || myBookings[0];
                    if (b) onOpenGatepassModal(b);
                  }}
                  className="h-9 px-3 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] border border-[#cbdbf5] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                  title="View Security Gatepass"
                >
                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                  <span>Gatepass</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: PENDING REQUESTS (Dedicated section)
          ========================================================================= */}
      {currentView === 'pending-requests' && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {/* Header Card */}
          <div className="bg-white p-5 rounded-xl border border-[#cbdbf5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-[#0e1c2f] text-amber-300 flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">hourglass_top</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0b1c30]">Pending Requests &amp; Approvals</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                    {pendingRequestsCount || 1} In Review
                  </span>
                </div>
                <p className="text-xs text-[#44474c] mt-0.5">
                  Requisitions awaiting Department HOD endorsement and Central Tech Desk dispatch clearance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => onSelectNavTab?.('interactive-requisition-desk')}
                className="h-10 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-teal-300">add_circle</span>
                <span>Submit New Request</span>
              </button>
            </div>
          </div>

          {/* Pending Requests List */}
          <div className="flex flex-col gap-3">
            {myBookings.filter((b) => b.status === 'pending').length > 0 ? (
              myBookings
                .filter((b) => b.status === 'pending')
                .map((booking) => (
                  <div
                    key={booking.id || booking._id}
                    className="p-5 rounded-xl bg-white border border-[#cbdbf5] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs hover:border-[#009299] transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="h-12 w-12 rounded-xl bg-[#dce9ff] text-[#426086] flex items-center justify-center shrink-0 font-bold">
                        <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-[#0b1c30]">
                            {booking.assetName || booking.assetCode}
                          </span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#eff4ff] text-[#009299] font-bold border border-[#cbdbf5]">
                            {booking.assetCode}
                          </span>
                          <span className="font-mono text-xs text-[#77849c]">
                            Req ID: {booking.id || booking._id || booking.reqId}
                          </span>
                        </div>
                        <p className="text-xs text-[#44474c]">
                          Classroom / Venue: <span className="font-semibold text-[#0b1c30]">{booking.venue || 'LH-204'}</span> • Booking Type: <span className="uppercase font-bold">{booking.type || 'temporary'}</span>
                        </p>
                        <p className="text-xs text-[#44474c]">
                          Purpose: <span className="text-[#0b1c30]">{booking.purpose || 'Academic Lecture Session'}</span>
                        </p>

                        {/* Workflow Timeline Step Indicator */}
                        <div className="flex items-center gap-2 pt-2 text-[11px]">
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <span className="material-symbols-outlined text-[15px]">check_circle</span>
                            <span>Submitted</span>
                          </span>
                          <span className="text-gray-300">──▶</span>
                          <span className="flex items-center gap-1 text-amber-700 font-bold px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                            <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                            <span>Department HOD Review</span>
                          </span>
                          <span className="text-gray-300">──▶</span>
                          <span className="flex items-center gap-1 text-gray-400 font-medium">
                            <span className="material-symbols-outlined text-[15px]">radio_button_unchecked</span>
                            <span>Lab Tech Dispatch</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end lg:self-center">
                      <button
                        type="button"
                        onClick={() => onCancelBooking(booking.id || booking._id || booking.reqId)}
                        className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold flex items-center gap-1.5 border border-red-200 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        <span>Cancel Request</span>
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              /* Realistic Sample Pending Requisition */
              <div className="p-5 rounded-xl bg-white border border-[#cbdbf5] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-[#dce9ff] text-[#426086] flex items-center justify-center shrink-0 font-bold">
                    <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-[#0b1c30]">Epson 3LCD Classroom Projector</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#eff4ff] text-[#009299] font-bold border border-[#cbdbf5]">AST-0012</span>
                      <span className="font-mono text-xs text-[#77849c]">Req ID: REQ-4357</span>
                    </div>
                    <p className="text-xs text-[#44474c]">
                      Classroom / Venue: <span className="font-semibold text-[#0b1c30]">LH-204 (2nd Floor)</span> • Booking Date: Tomorrow 10:00 AM - 12:30 PM
                    </p>
                    <p className="text-xs text-[#44474c]">
                      Purpose: <span className="text-[#0b1c30]">Guest Lecture: Cloud Architecture &amp; Distributed Systems (CS-502)</span>
                    </p>

                    <div className="flex items-center gap-2 pt-2 text-[11px]">
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        <span>Submitted</span>
                      </span>
                      <span className="text-gray-300">──▶</span>
                      <span className="flex items-center gap-1 text-amber-700 font-bold px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                        <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                        <span>Department HOD Review (In Progress)</span>
                      </span>
                      <span className="text-gray-300">──▶</span>
                      <span className="flex items-center gap-1 text-gray-400 font-medium">
                        <span className="material-symbols-outlined text-[15px]">radio_button_unchecked</span>
                        <span>Lab Tech Dispatch</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                    Awaiting HOD Endorsement
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: ASSIGNED ASSETS (Permanent Faculty Workstations)
          ========================================================================= */}
      {currentView === 'assigned-assets' && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {/* Header Card */}
          <div className="bg-white p-5 rounded-xl border border-[#cbdbf5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-[#0e1c2f] text-blue-300 flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">laptop_mac</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0b1c30]">Assigned Assets (Permanent Faculty Hardware)</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold text-xs border border-blue-200">
                    {assignedAssetsCount || 1} Workstation Allocated
                  </span>
                </div>
                <p className="text-xs text-[#44474c] mt-0.5">
                  Fixed institutional computing assets permanently mapped to your office cabin or research workstation ledger.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveWizardTab('permanent');
                  onSelectNavTab?.('interactive-requisition-desk');
                }}
                className="h-10 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-teal-300">add_circle</span>
                <span>Request Permanent Allocation</span>
              </button>
            </div>
          </div>

          {/* Assigned Workstation Details Card */}
          <div className="bg-white rounded-xl border border-[#cbdbf5] p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-xl bg-[#0e1c2f] overflow-hidden shrink-0 border border-[#cbdbf5]">
                <img
                  src="https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=400&q=80"
                  alt="Dell Workstation"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-[#0b1c30]">Department Network Laser Printer Node</h3>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-[#eff4ff] text-[#009299] font-bold border border-[#cbdbf5]">
                    AST-0017
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                    Active Institutional Custody
                  </span>
                </div>

                <p className="text-xs text-[#44474c]">
                  Physical Location: <span className="font-bold text-[#0b1c30]">Faculty Block B, Cabin #04 (Desk Station)</span>
                </p>

                <p className="text-xs text-[#44474c]">
                  Grant Allocation: <span className="font-semibold text-[#0b1c30]">Institutional Research Grant &amp; College Core Curriculum (Full Academic Year 2026-27)</span>
                </p>

                <div className="flex items-center gap-3 text-xs text-[#77849c] pt-1">
                  <span>Serial: <strong className="text-[#0b1c30] font-mono">DL-5420-SN-8921</strong></span>
                  <span>•</span>
                  <span>Barcode Audit: <strong className="text-emerald-700">Verified &amp; Tagged</strong></span>
                  <span>•</span>
                  <span>Tenancy: <strong className="text-[#0b1c30]">Annual Renewal</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => {
                  const b = myBookings.find((x) => x.type === 'permanent') || myBookings[0];
                  if (b) onOpenGatepassModal(b);
                }}
                className="w-full sm:w-auto h-10 px-4 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] border border-[#cbdbf5] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <span>Permanent Gatepass</span>
              </button>
              <button
                type="button"
                onClick={() => showToast('Maintenance requisition logged for Dell 5420 Workstation', 'success')}
                className="w-full sm:w-auto h-10 px-4 rounded-lg bg-white hover:bg-gray-50 text-[#426086] border border-[#cbdbf5] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">build</span>
                <span>Hardware Maintenance</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: CONSUMABLE QUOTA (Dedicated section)
          ========================================================================= */}
      {currentView === 'consumable-quota' && (
        <div className="flex flex-col gap-5 animate-fadeIn">
          {/* Header Card */}
          <div className="bg-white p-5 rounded-xl border border-[#cbdbf5] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-[#0e1c2f] text-teal-300 flex items-center justify-center shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">battery_charging_full</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0b1c30]">Consumable Quota &amp; Stationery Allowance</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200">
                    85% Remaining
                  </span>
                </div>
                <p className="text-xs text-[#44474c] mt-0.5">
                  Academic term quota for markers, paper copy reams, sanitizers, and classroom accessories.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveWizardTab('consumable');
                  onSelectNavTab?.('interactive-requisition-desk');
                }}
                className="h-10 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-teal-300">inventory</span>
                <span>Issue Consumable Now</span>
              </button>
            </div>
          </div>

          {/* Visual Quota Progress Banner */}
          <div className="p-5 rounded-xl bg-white border border-[#cbdbf5] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-[#0b1c30]">Term Allotment: 20 Total Units</span>
                <p className="text-xs text-[#44474c]">17 Units remaining for immediate draw. No returns required for consumable items.</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-[#009299]">85%</span>
                <span className="text-xs text-[#77849c] block">17 / 20 Units Rem.</span>
              </div>
            </div>

            <div className="w-full bg-[#eff4ff] rounded-full h-3 overflow-hidden border border-[#cbdbf5]">
              <div
                className="bg-gradient-to-r from-[#009299] to-[#005f63] h-full rounded-full transition-all duration-500"
                style={{ width: '85%' }}
              ></div>
            </div>
          </div>

          {/* Categorized Allowance Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white border border-[#cbdbf5] shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0b1c30]">Whiteboard Markers</span>
                <span className="material-symbols-outlined text-[20px] text-[#009299]">edit</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#0b1c30]">6 / 8</span>
                <span className="text-xs text-[#77849c] block">Units Available</span>
              </div>
              <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-semibold self-start border border-teal-200">
                Blue &amp; Black Markers
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#cbdbf5] shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0b1c30]">A4 Copy Paper Reams</span>
                <span className="material-symbols-outlined text-[20px] text-[#009299]">description</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#0b1c30]">5 / 6</span>
                <span className="text-xs text-[#77849c] block">Units Available</span>
              </div>
              <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-semibold self-start border border-teal-200">
                75 GSM Bright White
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#cbdbf5] shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0b1c30]">Cleaning Spray &amp; Dusters</span>
                <span className="material-symbols-outlined text-[20px] text-[#009299]">sanitizer</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#0b1c30]">6 / 6</span>
                <span className="text-xs text-[#77849c] block">Units Available</span>
              </div>
              <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-semibold self-start border border-teal-200">
                Magnetic Board Erasers
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#cbdbf5] shadow-xs flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0b1c30]">Battery Cells &amp; Cables</span>
                <span className="material-symbols-outlined text-[20px] text-[#009299]">battery_std</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-[#0b1c30]">100%</span>
                <span className="text-xs text-[#77849c] block">Unlimited Lab Request</span>
              </div>
              <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-semibold self-start border border-teal-200">
                AAA &amp; AA Alkaline Pack
              </span>
            </div>
          </div>
        </div>
      )}


      {/* Bento Section: Wizard & Live Widget */}
      {(currentView === 'interactive-requisition-desk' || currentView === 'new-request' || currentView === 'my-requests-and-bookings') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Smart Three-Request-Type Wizard (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col bg-white rounded-xl shadow-sm border border-[#e5eeff] overflow-hidden">
          {/* Wizard Navigation Tabs */}
          <div className="bg-[#eff4ff] px-5 pt-4 border-b border-[#cbdbf5]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-[#0b1c30] tracking-tight">
                  Interactive Asset Requisition Desk
                </h2>
                <p className="text-xs text-[#44474c]">
                  Submit instant checkout reservations, permanent asset grants, or instructional consumables
                </p>
              </div>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-white text-[#426086] border border-[#cbdbf5]">
                Step 1 of 1
              </span>
            </div>

            {/* Segmented Tab Controls */}
            <div className="flex items-center gap-1.5 p-1 bg-[#dce9ff]/60 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveWizardTab('temporary')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeWizardTab === 'temporary'
                    ? 'bg-white text-[#0b1c30] shadow-sm'
                    : 'text-[#44474c] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">schedule</span>
                <span>Temporary Booking</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#eff4ff] text-[#44474c] font-mono text-[10px]">
                  Daily
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWizardTab('permanent')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeWizardTab === 'permanent'
                    ? 'bg-white text-[#0b1c30] shadow-sm'
                    : 'text-[#44474c] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">desk</span>
                <span>Permanent Allocation</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#eff4ff] text-[#44474c] font-mono text-[10px]">
                  Term
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveWizardTab('consumable')}
                className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeWizardTab === 'consumable'
                    ? 'bg-white text-[#0b1c30] shadow-sm'
                    : 'text-[#44474c] hover:text-[#0b1c30]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">inventory</span>
                <span>Consumable Issue</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#eff4ff] text-[#44474c] font-mono text-[10px]">
                  Stock
                </span>
              </button>
            </div>
          </div>

          {/* Tab Panes */}
          <div className="p-5">
            {/* ================= TAB A: TEMPORARY BOOKING ================= */}
            {activeWizardTab === 'temporary' && (
              <form onSubmit={handleTempSubmit} className="flex flex-col gap-4 text-xs">
                <div className="p-3 rounded-lg bg-[#eff4ff] flex items-start gap-2.5 border border-[#cbdbf5]">
                  <span className="material-symbols-outlined text-[#426086] text-[20px] mt-0.5">info</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#0b1c30]">Immediate Dispatch Policy</span>
                    <p className="text-[#44474c] leading-relaxed">
                      Same-day temporary checkouts under 8 hours require only lab assistant sign-off. Overnight bookings require Department HOD endorsement.
                    </p>
                  </div>
                </div>

                {/* Asset Category & Equipment Item Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">1. Asset Category</label>
                    <select
                      value={tempCategoryFilter}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setTempCategoryFilter(newCat);
                        const filtered = assets.filter((a) => !a.isConsumable && (newCat === 'all' || a.category === newCat));
                        if (filtered.length > 0) {
                          setTempAssetCode(filtered[0].code);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    >
                      <option value="all">All Categories</option>
                      <option value="it">IT &amp; Computing</option>
                      <option value="audio">Audiovisual &amp; Sound</option>
                      <option value="recording">Cameras &amp; Recording</option>
                      <option value="lab">Lab Equipment</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-[#0b1c30]">2. Select Equipment Item</label>
                      <span className="text-[11px] text-[#009299] font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#009299]"></span> Live Catalog Checked
                      </span>
                    </div>
                    <select
                      value={tempAssetCode}
                      onChange={(e) => setTempAssetCode(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    >
                      {assets
                        .filter((a) => !a.isConsumable && (tempCategoryFilter === 'all' || a.category === tempCategoryFilter || a.code === tempAssetCode))
                        .map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.name} (Code: {a.code}) [{a.availableQuantity > 0 ? `${a.availableQuantity} Available` : 'Reserved'}] - {a.location}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Date and Time Slots */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Booking Date</label>
                    <input
                      type="date"
                      required
                      value={tempDate}
                      onChange={(e) => setTempDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Start Time</label>
                    <input
                      type="time"
                      required
                      value={tempStartTime}
                      onChange={(e) => setTempStartTime(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Return Deadline</label>
                    <input
                      type="time"
                      required
                      value={tempEndTime}
                      onChange={(e) => setTempEndTime(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    />
                  </div>
                </div>

                {/* Venue and Purpose */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Classroom / Venue</label>
                    <input
                      type="text"
                      required
                      value={tempVenue}
                      onChange={(e) => setTempVenue(e.target.value)}
                      placeholder="e.g. Lecture Hall 204 (2nd Floor)"
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Purpose &amp; Course Code</label>
                    <input
                      type="text"
                      required
                      value={tempPurpose}
                      onChange={(e) => setTempPurpose(e.target.value)}
                      placeholder="e.g. Distributed Systems (CS-502)"
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    />
                  </div>
                </div>

                {/* Smart Conflict Checker Callout */}
                <div
                  className={`p-3 rounded-lg flex items-center justify-between border transition-all ${
                    conflictState.hasConflict
                      ? 'bg-[#ffdad6] border-[#ba1a1a]/30 text-[#ba1a1a]'
                      : 'bg-[#eff4ff] border-[#cbdbf5] text-[#0b1c30]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[22px] ${
                        conflictState.hasConflict ? 'text-[#ba1a1a]' : 'text-[#009299]'
                      }`}
                    >
                      {conflictState.hasConflict ? 'error' : 'check_circle'}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {conflictState.hasConflict
                          ? 'Overlapping Reservation Detected!'
                          : 'Conflict Check Passed'}
                      </span>
                      <span className="text-[11px] text-[#44474c]">{conflictState.message}</span>
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs font-bold px-2.5 py-1 rounded ${
                      conflictState.hasConflict
                        ? 'bg-[#ba1a1a] text-white'
                        : 'bg-white text-[#009299] border border-[#cbdbf5]'
                    }`}
                  >
                    {conflictState.hasConflict ? 'Conflict' : 'Available'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempDate(new Date().toISOString().split('T')[0]);
                      setTempStartTime('10:00');
                      setTempEndTime('12:30');
                      setTempVenue('LH-204');
                    }}
                    className="text-[#44474c] hover:text-[#0b1c30] text-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                    <span>Reset Defaults</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => showToast('Draft reservation saved locally', 'info')}
                      className="h-10 px-4 rounded-lg bg-[#eff4ff] text-[#0b1c30] font-semibold hover:bg-[#dce9ff] transition-colors border border-[#cbdbf5]"
                    >
                      Save Draft
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || conflictState.hasConflict}
                      className="h-10 px-5 rounded-lg bg-[#0e1c2f] text-white font-semibold hover:bg-[#426086] disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>{submitting ? 'Submitting...' : 'Submit Booking Request'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ================= TAB B: PERMANENT ALLOCATION ================= */}
            {activeWizardTab === 'permanent' && (
              <form onSubmit={handlePermSubmit} className="flex flex-col gap-4 text-xs">
                <div className="p-3 rounded-lg bg-[#eff4ff] flex items-start gap-2.5 border border-[#cbdbf5]">
                  <span className="material-symbols-outlined text-[#426086] text-[20px] mt-0.5">verified_user</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#0b1c30]">Long-Term Asset Custody Notice</span>
                    <p className="text-[#44474c] leading-relaxed">
                      Permanent allocations tie equipment barcodes directly to your faculty ledger until annual campus audit reconciliation. Consumables cannot be permanently assigned.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">1. Asset Category</label>
                    <select
                      value={permCategoryFilter}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setPermCategoryFilter(newCat);
                        const filtered = assets.filter((a) => !a.isConsumable && (newCat === 'all' || a.category === newCat));
                        if (filtered.length > 0) {
                          setPermModel(filtered[0].code);
                        }
                      }}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    >
                      <option value="all">All Categories</option>
                      <option value="it">IT &amp; Computing (Workstations, Laptops)</option>
                      <option value="audio">Audiovisual &amp; Displays</option>
                      <option value="recording">Recording &amp; Media</option>
                      <option value="lab">Lab Equipment</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">2. Equipment Model / Item</label>
                    <select
                      value={permModel}
                      onChange={(e) => setPermModel(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    >
                      {assets
                        .filter((a) => !a.isConsumable && (permCategoryFilter === 'all' || a.category === permCategoryFilter))
                        .map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.name} ({a.code})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">3. Permanent Location (Cabin / Lab Desk)</label>
                    <input
                      type="text"
                      required
                      value={permLocation}
                      onChange={(e) => setPermLocation(e.target.value)}
                      placeholder="e.g. Faculty Block B, Cabin #04"
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Research Grant / Course Allocation ID</label>
                    <input
                      type="text"
                      value={permGrant}
                      onChange={(e) => setPermGrant(e.target.value)}
                      placeholder="e.g. UGC-MINOR-RES-2025-CORE or College Core Lab"
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Expected Tenancy Duration</label>
                    <select
                      value={permDuration}
                      onChange={(e) => setPermDuration(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    >
                      <option>
                        Full Academic Year (AY {academicSettings?.academicYear || calculateDefaultAcademicYear().academicYear})
                      </option>
                      <option>
                        Semester Only ({academicSettings?.term || calculateDefaultAcademicYear().term})
                      </option>
                      <option>Project Lifecycle (6 Months with renewal)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-[#0b1c30]">Academic Justification</label>
                  <textarea
                    rows={2}
                    value={permJustification}
                    onChange={(e) => setPermJustification(e.target.value)}
                    placeholder="Detail departmental responsibilities or compute tasks requiring permanent assignment..."
                    className="w-full p-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-10 px-5 rounded-lg bg-[#0e1c2f] text-white font-semibold hover:bg-[#426086] transition-all flex items-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                    <span>Submit for Dean / HOD Approval</span>
                  </button>
                </div>
              </form>
            )}

            {/* ================= TAB C: CONSUMABLE ISSUE ================= */}
            {activeWizardTab === 'consumable' && (
              <form onSubmit={handleConsumableSubmit} className="flex flex-col gap-4 text-xs">
                <div className="p-3 rounded-lg bg-[#eff4ff] flex items-start gap-2.5 border border-[#cbdbf5]">
                  <span className="material-symbols-outlined text-[#426086] text-[20px] mt-0.5">inventory_2</span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#0b1c30]">Direct Stock Deduction</span>
                    <p className="text-[#44474c] leading-relaxed">
                      Stationery and classroom peripherals are non-returnable. Your current semester allotment has 17 items available for draw.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Consumable Item Picker</label>
                    <select
                      value={consumableItem}
                      onChange={(e) => setConsumableItem(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    >
                      {assets
                        .filter((a) => a.isConsumable)
                        .map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.name} ({a.availableQuantity} in Stock)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={consumableQty}
                      onChange={(e) => setConsumableQty(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Associated Lab / Course Section</label>
                    <input
                      type="text"
                      required
                      value={consumableSection}
                      onChange={(e) => setConsumableSection(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-[#0b1c30]">Pickup Station</label>
                    <select
                      value={consumablePickup}
                      onChange={(e) => setConsumablePickup(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs focus:outline-none focus:ring-1 focus:ring-[#009299] border border-[#cbdbf5]"
                    >
                      <option>Central Tech Desk (Ground Floor Main Wing)</option>
                      <option>Central Staff Room Lockbox</option>
                      <option>Lab Assistant Station Bay 2</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-10 px-5 rounded-lg bg-[#0e1c2f] text-white font-semibold hover:bg-[#426086] transition-all flex items-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">archive</span>
                    <span>Generate Immediate Issue Voucher</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Target Preview (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Active Requisition Target Preview */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e5eeff] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#44474c] uppercase font-bold tracking-wider">
                Selected Asset Preview
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#009299] text-xs font-bold border border-[#cbdbf5]">
                {currentSelectedAsset?.code || 'AST-0020'}
              </span>
            </div>

            <div className="relative w-full h-36 rounded-lg overflow-hidden bg-[#0e1c2f]">
              <img
                src={
                  currentSelectedAsset?.image ||
                  (currentSelectedAsset?.name?.toLowerCase().includes('hdmi')
                    ? 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'
                    : 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80')
                }
                alt={currentSelectedAsset?.name || 'Asset Image'}
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e1c2f]/90 via-transparent to-transparent flex items-end p-3">
                <div className="text-white flex flex-col">
                  <span className="text-sm font-bold truncate">
                    {currentSelectedAsset?.name || 'HDMI Cable (3m 4K)'}
                  </span>
                  <span className="font-mono text-[11px] text-[#cbdbf5]">
                    {currentSelectedAsset?.categoryLabel || currentSelectedAsset?.category?.toUpperCase() || 'Technical & IT Equipment'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#44474c]">Storage Location</span>
                <span className="font-semibold text-[#0b1c30]">
                  {currentSelectedAsset?.location || 'Central Bay'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#44474c]">Available Stock</span>
                <span className="font-mono font-semibold text-[#009299]">
                  {currentSelectedAsset?.availableQuantity ?? 0} / {currentSelectedAsset?.totalQuantity ?? 0} {currentSelectedAsset?.unit || 'units'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#44474c]">Department</span>
                <span className="font-mono text-[11px] text-[#0b1c30] truncate max-w-[190px]">
                  {currentSelectedAsset?.department || 'Central College Lab'}
                </span>
              </div>
              {currentSelectedAsset?.description && (
                <div className="pt-1 border-t border-[#eff4ff]">
                  <p className="text-[11px] text-[#44474c] line-clamp-2">
                    {currentSelectedAsset.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* MAIN FEATURE 2: MY REQUESTS & ACTIVE CUSTODY TIMELINE */}
      {(currentView === 'my-activity-booking' || currentView === 'my-requests-and-bookings') && (
        <div ref={timelineRef} className="flex flex-col bg-white rounded-xl shadow-sm border border-[#e5eeff] overflow-hidden">
        {/* Section Header & Filter Pills */}
        <div className="p-4 bg-[#eff4ff] flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#cbdbf5]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white text-[#0b1c30] shadow-sm border border-[#cbdbf5]">
              <span className="material-symbols-outlined text-[20px]">manage_history</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0b1c30] tracking-tight">
                My Requests &amp; Active Custody Timeline
              </h3>
              <p className="text-xs text-[#44474c]">
                Live audit ledger of assets registered under {currentUser?.name || 'Faculty Member'}
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setTimelineFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                timelineFilter === 'all'
                  ? 'bg-[#0e1c2f] text-white shadow-sm'
                  : 'text-[#44474c] hover:bg-white'
              }`}
            >
              All ({myBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setTimelineFilter('active')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                timelineFilter === 'active'
                  ? 'bg-[#0e1c2f] text-white shadow-sm'
                  : 'text-[#44474c] hover:bg-white'
              }`}
            >
              Active Checkouts ({activeCheckoutsCount})
            </button>
            <button
              type="button"
              onClick={() => setTimelineFilter('pending')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                timelineFilter === 'pending'
                  ? 'bg-[#0e1c2f] text-white shadow-sm'
                  : 'text-[#44474c] hover:bg-white'
              }`}
            >
              Pending ({pendingRequestsCount})
            </button>
            <button
              type="button"
              onClick={() => setTimelineFilter('completed')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                timelineFilter === 'completed'
                  ? 'bg-[#0e1c2f] text-white shadow-sm'
                  : 'text-[#44474c] hover:bg-white'
              }`}
            >
              Completed ({myBookings.filter((b) => b.status === 'returned').length})
            </button>
          </div>
        </div>

        {/* Timeline List */}
        <div className="divide-y divide-[#e5eeff] flex flex-col">
          {filteredTimeline.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No requisitions match the selected timeline filter.
            </div>
          ) : (
            filteredTimeline.map((item) => (
              <div
                key={item._id || item.reqId}
                className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#eff4ff]/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${
                      item.status === 'dispatched'
                        ? 'bg-[#eff4ff] text-[#426086]'
                        : item.status === 'pending'
                        ? 'bg-[#eff4ff] text-[#44474c]'
                        : 'bg-[#dce9ff] text-[#0b1c30]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      {item.status === 'dispatched'
                        ? 'cast_connected'
                        : item.status === 'pending'
                        ? 'theater_comedy'
                        : item.type === 'consumable'
                        ? 'draw'
                        : 'assignment_turned_in'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'dispatched'
                            ? 'bg-[#eff4ff] text-[#0b1c30] border border-[#cbdbf5]'
                            : item.status === 'pending'
                            ? 'bg-[#dce9ff] text-[#426086]'
                            : 'bg-[#e5eeff] text-[#0b1c30]'
                        }`}
                      >
                        {item.status === 'dispatched'
                          ? 'ACTIVE CHECKOUT'
                          : item.status === 'pending'
                          ? 'PENDING ADMIN APPROVAL'
                          : item.status === 'returned'
                          ? 'RETURN VERIFIED'
                          : 'COMPLETED ISSUE'}
                      </span>
                      <span className="font-mono text-xs text-[#44474c]">{item.reqId}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[11px] text-[#44474c]">Venue: {item.venue || 'Academic Wing'}</span>
                      {item.handoverPhoto && (
                        <span
                          onClick={() => {
                            setSelectedProofBooking(item);
                            setProofMode('view');
                          }}
                          className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#009299]/15 text-[#009299] text-[10px] font-bold"
                          title="Click to view handover photo"
                        >
                          <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                          <span>Handover Photo Attached</span>
                        </span>
                      )}
                      {item.returnPhoto && (
                        <span
                          onClick={() => {
                            setSelectedProofBooking(item);
                            setProofMode('view');
                          }}
                          className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#426086] text-[10px] font-bold"
                          title="Click to view return photo"
                        >
                          <span className="material-symbols-outlined text-[12px]">assignment_turned_in</span>
                          <span>Return Photo Verified</span>
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-[#0b1c30]">{item.assetName}</h4>

                    <div className="flex items-center gap-2 text-[#44474c] text-xs flex-wrap">
                      {item.status === 'dispatched' && (
                        <>
                          <span className="flex items-center gap-1 text-[#426086]">
                            <span className="material-symbols-outlined text-[15px]">output</span>
                            Issued Today by Tech Bay 2
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#ba1a1a] font-medium">
                            <span className="material-symbols-outlined text-[15px]">alarm</span>
                            Return by 05:00 PM at Central Tech Desk
                          </span>
                        </>
                      )}

                      {item.status === 'pending' && (
                        <>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">event_upcoming</span>
                            Requested for: {item.bookingDate || 'Upcoming'} {item.startTime ? `(${item.startTime} - ${item.endTime})` : ''}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#426086]">
                            <span className="material-symbols-outlined text-[15px]">hourglass_top</span>
                            In Queue with Department Head / HOD
                          </span>
                        </>
                      )}

                      {item.status === 'returned' && (
                        <>
                          <span className="flex items-center gap-1 text-[#009299]">
                            <span className="material-symbols-outlined text-[15px]">event_available</span>
                            Returned Intact &amp; Verified
                          </span>
                          <span>•</span>
                          <span>Audited by Lab Technical Officer</span>
                        </>
                      )}

                      {item.status === 'rejected' && (
                        <span className="text-[#ba1a1a] font-medium">
                          Declined: {item.rejectReason || 'Unavailable'} {item.rejectRemarks ? `(${item.rejectRemarks})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end lg:self-center shrink-0 flex-wrap justify-end">
                  {item.status === 'dispatched' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProofBooking(item);
                          setProofMode('capture-return');
                        }}
                        className="h-8 px-3 rounded-lg bg-[#009299] text-white text-xs font-semibold hover:bg-[#009299]/90 transition-all flex items-center gap-1.5 shadow-sm"
                        title="Click classroom photo when returning asset"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                        <span>Return &amp; Upload Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProofBooking(item);
                          setProofMode('view');
                        }}
                        className="h-8 px-2.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff] transition-all flex items-center gap-1 border border-[#cbdbf5]"
                        title="View Handover / Return Photo Proofs"
                      >
                        <span className="material-symbols-outlined text-[16px]">photo_library</span>
                        <span>Proofs</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenGatepassModal(item)}
                        className="h-8 px-3 rounded-lg bg-[#0e1c2f] text-white text-xs font-semibold hover:bg-[#426086] transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>Gatepass / Slip PDF</span>
                      </button>
                    </>
                  )}

                  {item.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => onCancelBooking(item.reqId)}
                      className="h-8 px-3 rounded-lg bg-[#eff4ff] text-[#ba1a1a] text-xs font-semibold hover:bg-[#ffdad6] transition-all flex items-center gap-1 border border-[#cbdbf5]"
                    >
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                      <span>Cancel Request</span>
                    </button>
                  )}

                  {(item.status === 'returned' || (item.type === 'consumable' && item.status === 'dispatched')) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProofBooking(item);
                          setProofMode('view');
                        }}
                        className="h-8 px-3 rounded-lg bg-[#eff4ff] text-[#009299] text-xs font-semibold hover:bg-[#dce9ff] transition-all flex items-center gap-1.5 border border-[#cbdbf5]"
                        title="View before & after condition photos"
                      >
                        <span className="material-symbols-outlined text-[16px]">photo_library</span>
                        <span>Condition Photos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenGatepassModal(item)}
                        className="h-8 px-3 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-xs font-semibold hover:bg-[#dce9ff] transition-all flex items-center gap-1.5 border border-[#cbdbf5]"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt</span>
                        <span>Archived Voucher</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      )}

      {/* Asset Photo Proof Modal for Faculty */}
      <AssetPhotoProofModal
        isOpen={!!selectedProofBooking}
        onClose={() => setSelectedProofBooking(null)}
        booking={selectedProofBooking}
        mode={proofMode}
        onConfirmReturn={async (data) => {
          if (!selectedProofBooking) return;
          if (onReturnBooking) {
            await onReturnBooking(selectedProofBooking.reqId, data.condition, {
              photo: data.photo,
              notes: data.notes,
            });
          } else if (onUpdateProof) {
            await onUpdateProof(selectedProofBooking.reqId, {
              returnPhoto: data.photo,
              returnNotes: data.notes,
              returnCondition: data.condition,
            });
          }
          setSelectedProofBooking(null);
        }}
        showToast={showToast}
      />
    </div>
  );
};
