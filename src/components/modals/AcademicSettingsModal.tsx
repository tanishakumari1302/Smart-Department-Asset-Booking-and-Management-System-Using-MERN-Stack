import React, { useState, useEffect } from 'react';
import { AcademicSettings, calculateDefaultAcademicYear } from '../../types';

interface AcademicSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicSettings: AcademicSettings;
  onSaveAcademicSettings: (settings: {
    academicYear: string;
    term: string;
    customOverride: boolean;
  }) => Promise<void>;
  showToast?: (text: string, type: 'success' | 'warning' | 'info') => void;
}

export const AcademicSettingsModal: React.FC<AcademicSettingsModalProps> = ({
  isOpen,
  onClose,
  academicSettings,
  onSaveAcademicSettings,
  showToast,
}) => {
  const [yearVal, setYearVal] = useState(academicSettings.academicYear);
  const [termVal, setTermVal] = useState(academicSettings.term);
  const [isCustom, setIsCustom] = useState(academicSettings.customOverride ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setYearVal(academicSettings.academicYear);
      setTermVal(academicSettings.term);
      setIsCustom(academicSettings.customOverride ?? false);
    }
  }, [isOpen, academicSettings]);

  if (!isOpen) return null;

  const defaultCalculated = calculateDefaultAcademicYear();

  const handleResetToAuto = () => {
    setYearVal(defaultCalculated.academicYear);
    setTermVal(defaultCalculated.term);
    setIsCustom(false);
    if (showToast) {
      showToast(
        `Reset to auto-calculated calendar: AY ${defaultCalculated.academicYear} (${defaultCalculated.term})`,
        'info'
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!yearVal.trim()) {
      if (showToast) showToast('Please enter an academic year.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await onSaveAcademicSettings({
        academicYear: yearVal.trim(),
        term: termVal.trim() || 'Term I',
        customOverride: isCustom,
      });
      if (showToast) {
        showToast(`Academic calendar updated to AY ${yearVal} (${termVal})`, 'success');
      }
      onClose();
    } catch (err: any) {
      if (showToast) {
        showToast(err.message || 'Failed to update academic calendar', 'warning');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-md w-full p-6 animate-in zoom-in-95 duration-150 text-[#0b1c30]">
        <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff] mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#009299]">edit_calendar</span>
            <h3 className="text-base font-bold text-[#0b1c30]">Academic Calendar Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
          <div className="p-3 rounded-lg bg-[#eff4ff] border border-[#cbdbf5] text-[11px] text-[#426086] flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-bold text-[#0e1c2f]">
              <span className="material-symbols-outlined text-[16px] text-[#009299]">info</span>
              <span>Automatic Academic Year Calculation</span>
            </div>
            <p className="leading-relaxed">
              By default, the institutional year starts in June (e.g. October 2026 is <strong>{defaultCalculated.academicYear}</strong>, <strong>AY {defaultCalculated.shortYear}</strong>). You can customize or override it for college term planning.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
              Academic Year (Full &amp; Short) *
            </label>
            <input
              type="text"
              required
              value={yearVal}
              onChange={(e) => {
                setYearVal(e.target.value);
                setIsCustom(true);
              }}
              placeholder="e.g. 2026-27"
              className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs focus:ring-1 focus:ring-[#009299] focus:outline-none font-mono"
            />
            <span className="text-[10px] text-gray-500 mt-1 block">
              Used across login screen, header badge, and reporting documents.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
              Active Institutional Term / Semester *
            </label>
            <div className="flex items-center gap-2 mb-1.5">
              <select
                value={['Term I', 'Term II', 'Summer Term'].includes(termVal) ? termVal : 'custom'}
                onChange={(e) => {
                  if (e.target.value !== 'custom') {
                    setTermVal(e.target.value);
                  }
                  setIsCustom(true);
                }}
                className="w-1/2 h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs bg-white font-semibold"
              >
                <option value="Term I">Term I (Odd Sem)</option>
                <option value="Term II">Term II (Even Sem)</option>
                <option value="Summer Term">Summer Session</option>
                <option value="custom">Custom Label...</option>
              </select>
              <input
                type="text"
                value={termVal}
                onChange={(e) => {
                  setTermVal(e.target.value);
                  setIsCustom(true);
                }}
                placeholder="e.g. Term I"
                className="flex-1 h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs focus:ring-1 focus:ring-[#009299] focus:outline-none"
              />
            </div>
          </div>

          {/* Quick preview */}
          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between text-[11px]">
            <span className="text-gray-500">Live Preview:</span>
            <div className="flex items-center gap-2 font-mono">
              <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#009299] font-bold">
                AY {yearVal}
              </span>
              <span className="text-[#0e1c2f] font-semibold">{termVal}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#e5eeff] mt-1">
            <button
              type="button"
              onClick={handleResetToAuto}
              className="text-[#009299] hover:underline text-[11px] font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
              <span>Auto from Date</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-3 rounded-lg border border-[#cbdbf5] text-xs font-semibold text-[#44474c] hover:bg-[#eff4ff]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-8 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold transition-all disabled:opacity-60 flex items-center gap-1.5"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
