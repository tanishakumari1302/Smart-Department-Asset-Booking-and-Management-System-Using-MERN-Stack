import React from 'react';
import { Asset } from '../types';

interface BarcodesViewProps {
  assets: Asset[];
  onOpenScanner: () => void;
  onPrintAllTags: () => void;
}

export const BarcodesView: React.FC<BarcodesViewProps> = ({
  assets,
  onOpenScanner,
  onPrintAllTags,
}) => {
  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase text-[#009299] font-bold">
              Hardware Tagging Registry
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
            <span className="text-[11px] uppercase text-[#44474c] font-semibold">
              Laser Etch &amp; Barcode Matrix
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
            Asset Barcodes &amp; Tag Compliance
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScanner}
            className="h-9 px-3.5 bg-white text-[#426086] border border-[#cbdbf5] rounded-lg text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
            <span>Launch Scanner</span>
          </button>
          <button
            onClick={onPrintAllTags}
            className="h-9 px-3.5 bg-[#0e1c2f] text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-[#426086] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print All {assets.length} Barcode Tags</span>
          </button>
        </div>
      </div>

      {/* Audit Metric Banner */}
      <div className="p-4 bg-white rounded-xl shadow-sm border border-[#e5eeff] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#eff4ff] text-[#009299] rounded-xl border border-[#cbdbf5]">
            <span className="material-symbols-outlined text-[28px]">verified</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-[#0b1c30]">
                138 of 142 Assets Verified with Machine-Scannable Code
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#009299] font-bold">
                97% Compliant
              </span>
            </div>
            <p className="text-xs text-[#44474c] mt-0.5">
              4 units queued for replacement anodized aluminum barcode labels at Central Bay 2.
            </p>
          </div>
        </div>
      </div>

      {/* Barcode Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <div
            key={asset.code}
            className="bg-white p-4 rounded-xl shadow-sm border border-[#cbdbf5] flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-[#0e1c2f] bg-[#eff4ff] px-2 py-0.5 rounded">
                  {asset.code}
                </span>
                <span className="text-[10px] font-bold text-[#009299] uppercase">Verified</span>
              </div>
              <h4 className="text-xs font-bold text-[#0b1c30] truncate">{asset.name}</h4>
              <p className="text-[11px] text-[#44474c] capitalize">{asset.categoryLabel}</p>
            </div>

            {/* Visual Barcode Graphic */}
            <div className="my-3 p-3 bg-[#f8f9ff] rounded-lg border border-[#e5eeff] flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-0.5 h-8 w-full justify-center">
                <span className="w-1 h-full bg-[#0b1c30]"></span>
                <span className="w-0.5 h-full bg-[#0b1c30]"></span>
                <span className="w-1.5 h-full bg-[#0b1c30]"></span>
                <span className="w-0.5 h-full bg-[#0b1c30]"></span>
                <span className="w-2 h-full bg-[#0b1c30]"></span>
                <span className="w-1 h-full bg-[#0b1c30]"></span>
                <span className="w-0.5 h-full bg-[#0b1c30]"></span>
                <span className="w-1.5 h-full bg-[#0b1c30]"></span>
                <span className="w-1 h-full bg-[#0b1c30]"></span>
                <span className="w-2 h-full bg-[#0b1c30]"></span>
                <span className="w-0.5 h-full bg-[#0b1c30]"></span>
                <span className="w-1 h-full bg-[#0b1c30]"></span>
              </div>
              <span className="font-mono text-[10px] text-[#44474c] font-bold tracking-widest">
                *{asset.code}*
              </span>
            </div>

            <div className="text-[11px] text-[#44474c] flex items-center justify-between">
              <span>Location:</span>
              <span className="font-medium truncate max-w-[130px]">{asset.location || 'Central Bay'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
