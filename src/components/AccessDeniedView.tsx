import React from 'react';
import { User, NavTab, TAB_LABELS, getAllowedRolesForTab } from '../types';

interface AccessDeniedViewProps {
  currentTab: NavTab;
  currentUser: User | null;
  onGoToDashboard: () => void;
  onSelectTab?: (tab: NavTab) => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  currentTab,
  currentUser,
  onGoToDashboard,
  onSelectTab,
}) => {
  const tabTitle = TAB_LABELS[currentTab] || currentTab;
  const allowedRoles = getAllowedRolesForTab(currentTab);

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-4 select-none">
      <div className="bg-white rounded-2xl border border-red-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Warning Accent Bar */}
        <div className="h-2 bg-[#ba1a1a]"></div>

        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          {/* Shield Lock Icon */}
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-[#ba1a1a] shadow-inner mb-4">
            <span className="material-symbols-outlined text-[36px]">gpp_bad</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-[#ba1a1a] text-xs font-bold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
            <span>RBAC Security Policy Violation</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-[#0b1c30] mb-2">
            Access Denied
          </h2>

          <p className="text-sm text-[#44474c] max-w-lg mb-6 leading-relaxed">
            You do not have administrative or departmental permissions to view{' '}
            <strong className="text-[#0b1c30]">"{tabTitle}"</strong>. Access to this section is restricted
            under college access control guidelines.
          </p>

          {/* User Context Details Box */}
          <div className="w-full max-w-md bg-[#f8fafd] rounded-xl border border-[#cbdbf5] p-4 text-xs flex flex-col gap-2.5 mb-6 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
              <span className="text-[#44474c] font-medium">Attempted Section:</span>
              <span className="font-bold text-[#0b1c30] font-mono">{tabTitle}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
              <span className="text-[#44474c] font-medium">Your Role:</span>
              <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#426086] font-bold uppercase tracking-wider text-[11px] border border-[#cbdbf5]">
                {currentUser?.role || 'Guest'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
              <span className="text-[#44474c] font-medium">Department:</span>
              <span className="font-medium text-[#0b1c30] truncate max-w-[220px]">
                {currentUser?.department || 'Unassigned'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#44474c] font-medium">Authorized Roles:</span>
              <span className="font-semibold text-emerald-800 uppercase text-[11px]">
                {allowedRoles.join(', ')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onGoToDashboard}
              className="h-10 px-5 rounded-xl bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">space_dashboard</span>
              <span>Return to Dashboard</span>
            </button>

            {currentUser?.role === 'faculty' && onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('browse-catalog')}
                className="h-10 px-4 rounded-xl bg-[#eff4ff] hover:bg-[#cbdbf5] text-[#426086] text-xs font-bold transition-all flex items-center gap-2 border border-[#cbdbf5]"
              >
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                <span>Browse Catalog</span>
              </button>
            )}

            {currentUser?.role === 'tech' && onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('issue-and-return-desk')}
                className="h-10 px-4 rounded-xl bg-[#eff4ff] hover:bg-[#cbdbf5] text-[#426086] text-xs font-bold transition-all flex items-center gap-2 border border-[#cbdbf5]"
              >
                <span className="material-symbols-outlined text-[18px]">swap_horizontal_circle</span>
                <span>Issue &amp; Return Desk</span>
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#eff4ff]/60 px-6 py-3 border-t border-[#cbdbf5]/50 flex items-center justify-between text-[11px] text-[#44474c]">
          <span>Institutional RBAC Policy v1.2</span>
          <span>Contact Campus Admin if you require role elevation</span>
        </div>
      </div>
    </div>
  );
};
