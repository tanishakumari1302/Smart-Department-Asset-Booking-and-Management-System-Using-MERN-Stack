import React, { useState } from 'react';
import { getSharedPortalUrl } from '../utils/portalUtils';

interface SharePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (text: string, type: 'success' | 'warning' | 'info') => void;
}

export const SharePortalModal: React.FC<SharePortalModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [copiedType, setCopiedType] = useState<'faculty' | 'admin' | 'whatsapp' | null>(null);

  if (!isOpen) return null;

  const facultyUrl = getSharedPortalUrl('faculty');
  const adminUrl = getSharedPortalUrl('admin');

  const copyToClipboard = async (text: string, type: 'faculty' | 'admin' | 'whatsapp') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
      showToast?.(
        type === 'faculty'
          ? 'Faculty Portal link copied! Share this with teachers.'
          : type === 'admin'
          ? 'Admin Portal link copied!'
          : 'WhatsApp message copied to clipboard!',
        'success'
      );
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const whatsappMessage = `*Sunstone AssetHub - College Asset Requisition Portal*\n\nDear Faculty Members,\nPlease use this link to book classroom equipment, laptops, lab items, and stationery:\n🔗 ${facultyUrl}\n\n• Permanent 24/7 Access\n• 1-Click Faculty Requisitions\n• Instant Stock Availability`;

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4.5 bg-[#0e1c2f] text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#009299] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px] text-white">share</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Share Official Department Links
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  24/7 Cloud Active
                </span>
              </h3>
              <p className="text-xs text-[#cbdbf5]/80 mt-0.5">
                Share these permanent links with teachers and administrators
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Cloud Status Banner */}
        <div className="px-6 py-2.5 bg-[#eff4ff] border-b border-[#cbdbf5] flex items-center gap-2 text-xs text-[#0e1c2f]">
          <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check_circle</span>
          <span className="text-[12px] font-medium leading-relaxed">
            <strong>24/7 Cloud Active:</strong> These official links run on Institutional Cloud. Faculty and staff can access them anytime on their phones &amp; PCs.
          </span>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-5 max-h-[75vh] overflow-y-auto">
          {/* Card 1: Faculty Portal Link */}
          <div className="p-4 rounded-xl bg-white border-2 border-[#009299]/30 hover:border-[#009299] transition-all shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#009299]/10 text-[#009299] flex items-center justify-center font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px]">school</span>
                </span>
                <div>
                  <span className="text-xs font-bold text-[#0e1c2f] uppercase tracking-wide">
                    Faculty Requisition Portal Link
                  </span>
                  <span className="text-[10px] block text-[#426086]">
                    For professors, teachers &amp; staff to request assets &amp; stationery
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#009299]/15 text-[#004f55]">
                Teachers Only
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#f8f9ff] border border-[#cbdbf5]">
              <span className="text-[11px] font-mono text-[#0e1c2f] select-all truncate flex-1">
                {facultyUrl}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(facultyUrl, 'faculty')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                  copiedType === 'faculty'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#009299] hover:bg-[#007a80] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedType === 'faculty' ? 'check' : 'content_copy'}
                </span>
                <span>{copiedType === 'faculty' ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Card 2: Admin Command Center Link */}
          <div className="p-4 rounded-xl bg-white border border-[#cbdbf5] hover:border-[#0e1c2f] transition-all shadow-xs flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#0e1c2f]/10 text-[#0e1c2f] flex items-center justify-center font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                </span>
                <div>
                  <span className="text-xs font-bold text-[#0e1c2f] uppercase tracking-wide">
                    Admin Command Center Link
                  </span>
                  <span className="text-[10px] block text-[#426086]">
                    For Malay Aggarwal, Arpit Singh, Harpreet Aulakh &amp; College Custodians
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0e1c2f]/10 text-[#0e1c2f]">
                Admin Staff
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-[#f8f9ff] border border-[#cbdbf5]">
              <span className="text-[11px] font-mono text-[#0e1c2f] select-all truncate flex-1">
                {adminUrl}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(adminUrl, 'admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                  copiedType === 'admin'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedType === 'admin' ? 'check' : 'content_copy'}
                </span>
                <span>{copiedType === 'admin' ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* WhatsApp Direct Share */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                <span className="material-symbols-outlined text-[20px]">chat</span>
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  Quick Forward on WhatsApp
                </span>
                <span className="text-[11px] text-emerald-700">
                  Pre-formats invitation message with Faculty Portal link
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => copyToClipboard(whatsappMessage, 'whatsapp')}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {copiedType === 'whatsapp' ? 'Message Copied!' : 'Copy Text'}
              </button>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Open WhatsApp</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#f8f9ff] border-t border-[#cbdbf5] flex items-center justify-between text-xs text-[#77849c]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Production Container Ready</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-[#eff4ff] text-[#0e1c2f] border border-[#cbdbf5] rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
