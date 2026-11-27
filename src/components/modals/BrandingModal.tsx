import React, { useState, useEffect } from 'react';
import { BrandingSettings, DEFAULT_BRANDING } from '../../types';

interface BrandingModalProps {
  isOpen: boolean;
  branding: BrandingSettings;
  onClose: () => void;
  onSaveBranding: (updates: Partial<BrandingSettings>) => Promise<void>;
}

export const BrandingModal: React.FC<BrandingModalProps> = ({
  isOpen,
  branding,
  onClose,
  onSaveBranding,
}) => {
  const [appName, setAppName] = useState(branding.appName || DEFAULT_BRANDING.appName);
  const [badgeText, setBadgeText] = useState(branding.badgeText || DEFAULT_BRANDING.badgeText);
  const [collegeSubtitle, setCollegeSubtitle] = useState(
    branding.collegeSubtitle || DEFAULT_BRANDING.collegeSubtitle
  );
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAppName(branding.appName || DEFAULT_BRANDING.appName);
      setBadgeText(branding.badgeText || DEFAULT_BRANDING.badgeText);
      setCollegeSubtitle(branding.collegeSubtitle || DEFAULT_BRANDING.collegeSubtitle);
      setLogoUrl(branding.logoUrl || '');
      setUploadNotice('');
    }
  }, [isOpen, branding]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Resize uploaded image to a crisp 128x128 PNG so it stores cleanly in Firestore
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadNotice('Please select a PNG, JPG, or SVG image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, size, size);
          const scale = Math.min(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          setLogoUrl(canvas.toDataURL('image/png'));
          setUploadNotice('Logo image ready — click Save Branding to apply everywhere.');
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveBranding({
        appName: appName.trim() || DEFAULT_BRANDING.appName,
        badgeText: badgeText.trim() || DEFAULT_BRANDING.badgeText,
        collegeSubtitle: collegeSubtitle.trim() || DEFAULT_BRANDING.collegeSubtitle,
        logoUrl: logoUrl.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1c2f]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#cbdbf5] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 bg-[#0e1c2f] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#75f5fd]">palette</span>
            <div>
              <h3 className="text-sm font-bold">Edit College Branding &amp; Logo</h3>
              <p className="text-[11px] text-white/75">
                Updates Sidebar, Login Portal, Browser Tab &amp; Gatepasses live
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Live Sidebar Header Preview */}
          <div className="p-3.5 rounded-xl bg-[#0e1c2f] text-white flex items-center gap-3 border border-[#426086]">
            <div className="h-10 w-10 rounded-lg bg-[#009299] flex items-center justify-center font-bold text-white shadow-md overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="College Logo" className="w-full h-full object-contain bg-white p-0.5" />
              ) : (
                <span className="material-symbols-outlined text-[22px]">dns</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-white truncate">
                  {appName || DEFAULT_BRANDING.appName}
                </span>
                {badgeText && (
                  <span className="px-1.5 py-0.5 rounded bg-[#002022] text-[#009299] text-[10px] font-bold uppercase tracking-wider shrink-0">
                    {badgeText}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#77849c] font-semibold tracking-wider uppercase truncate">
                {collegeSubtitle || DEFAULT_BRANDING.collegeSubtitle}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block font-bold text-[#0b1c30] mb-1">College / App Name *</label>
              <input
                type="text"
                required
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="e.g. Sunstone ERP"
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#cbdbf5] text-[#0b1c30] font-semibold focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-[#0b1c30] mb-1">Badge Tag</label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="ERP"
                className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#cbdbf5] text-[#0b1c30] font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#0b1c30] mb-1">College / Department Subtitle</label>
            <input
              type="text"
              value={collegeSubtitle}
              onChange={(e) => setCollegeSubtitle(e.target.value)}
              placeholder="e.g. Sunstone College Asset Mgmt"
              className="w-full h-9 px-3 rounded-lg bg-[#eff4ff] border border-[#cbdbf5] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#f8faff] border border-[#cbdbf5] space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[#0b1c30]">Custom College Logo (Upload or URL)</label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl('')}
                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Remove Logo
                </button>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="block w-full text-[11px] text-[#44474c] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#0e1c2f] file:text-white hover:file:bg-[#426086] cursor-pointer"
            />
            <input
              type="text"
              value={logoUrl.startsWith('data:') ? '' : logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Or paste logo image URL (https://...)"
              className="w-full h-8 px-2.5 rounded-lg bg-white border border-[#cbdbf5] text-[11px] text-[#0b1c30] focus:outline-none focus:ring-1 focus:ring-[#009299]"
            />
            {uploadNotice && (
              <p className="text-[10px] font-semibold text-[#009299]">{uploadNotice}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#e5eeff]">
            <button
              type="button"
              onClick={() => {
                setAppName(DEFAULT_BRANDING.appName);
                setBadgeText(DEFAULT_BRANDING.badgeText);
                setCollegeSubtitle(DEFAULT_BRANDING.collegeSubtitle);
                setLogoUrl('');
              }}
              className="px-2.5 py-1.5 text-[#426086] hover:bg-[#eff4ff] rounded-lg font-semibold cursor-pointer"
            >
              Reset Default
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-[#44474c] hover:bg-[#eff4ff] rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-[#0e1c2f] hover:bg-[#426086] text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>{saving ? 'Saving...' : 'Save Branding'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
