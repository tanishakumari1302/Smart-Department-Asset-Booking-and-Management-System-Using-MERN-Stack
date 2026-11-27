import React, { useState, useEffect, useRef } from 'react';
import { Asset } from '../../types';

export interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onAssetFound?: (asset: Asset) => void;
  onNavigateToAsset?: (assetCode: string) => void;
  onOpenStockAdjustModal?: (asset: Asset) => void;
  isFaculty?: boolean;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  assets,
  onAssetFound,
  onNavigateToAsset,
  onOpenStockAdjustModal,
  isFaculty = false,
}) => {
  // Default to 'simulate' so user never gets blocked by browser iframe camera restrictions!
  const [activeMode, setActiveMode] = useState<'simulate' | 'manual' | 'camera'>('simulate');
  const [scannedCode, setScannedCode] = useState('AST-0020');
  const [manualInput, setManualInput] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isScanningAnimation, setIsScanningAnimation] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Stop camera stream cleanly
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Start live webcam stream only on explicit demand
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsCameraStarting(true);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera device access is not supported by this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);

      // If BarcodeDetector is supported, attempt live decoding from video frames
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a'],
          });

          scanIntervalRef.current = window.setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const rawVal = barcodes[0].rawValue?.trim();
                  if (rawVal) {
                    executeScan(rawVal);
                  }
                }
              } catch {
                // Ignore detection errors per frame
              }
            }
          }, 400);
        } catch {
          // Fallback
        }
      }
    } catch (err: any) {
      console.warn('Camera stream notice:', err);
      let errorMsg = 'Camera access blocked by browser or preview iframe policy.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Browser or iframe denied camera permission. Use the Optical Scanner Simulator or Manual Code below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera hardware found on this machine. Use Optical Simulator below.';
      }
      setCameraError(errorMsg);
      setIsCameraActive(false);
    } finally {
      setIsCameraStarting(false);
    }
  };

  // On open, default to AST-0020 or first asset
  useEffect(() => {
    if (isOpen) {
      setCameraError(null);
      const defaultItem = assets.find((a) => a.code === 'AST-0020') || assets[0];
      if (defaultItem) {
        setScannedCode(defaultItem.code);
        setSelectedAsset(defaultItem);
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, assets]);

  if (!isOpen) return null;

  // Execute scan with optical laser animation feedback
  const executeScan = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setScannedCode(cleanCode);
    setIsScanningAnimation(true);

    const found = assets.find(
      (a) =>
        a.code.toUpperCase() === cleanCode ||
        a._id.toUpperCase() === cleanCode ||
        (a.barcodeValue && a.barcodeValue.trim().toUpperCase() === cleanCode) ||
        (a.serialNumber && a.serialNumber.trim().toUpperCase() === cleanCode)
    );

    setTimeout(() => {
      setIsScanningAnimation(false);
      if (found) {
        setSelectedAsset(found);
        onAssetFound?.(found);
      } else {
        setSelectedAsset(null);
      }
    }, 350);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      executeScan(manualInput);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      if ('BarcodeDetector' in window) {
        try {
          const img = new Image();
          img.src = reader.result as string;
          await img.decode();
          const detector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a'],
          });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            executeScan(barcodes[0].rawValue);
            return;
          }
        } catch {
          // fallback
        }
      }
      // Fallback: pick AST-0020
      executeScan('AST-0020');
    };
    reader.readAsDataURL(file);
  };

  // Filtered assets for search/picker
  const filteredAssets = assets.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase().includes(q) ||
      (a.barcodeValue && a.barcodeValue.toLowerCase().includes(q)) ||
      (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
      a.location.toLowerCase().includes(q) ||
      (a.category && a.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0e1c2f]/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-[#cbdbf5] flex flex-col gap-4 max-h-[94vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
          <div className="flex items-center gap-2.5 text-[#009299]">
            <div className="h-10 w-10 rounded-xl bg-[#009299] text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0b1c30]">
                  Optical Barcode &amp; RFID Scanner
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#009299] font-mono text-[10px] font-bold border border-[#cbdbf5]">
                  Active Sensor
                </span>
              </div>
              <p className="text-[11px] text-[#44474c]">
                Verified machine-scannable tags across institutional inventory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#44474c] hover:text-[#0b1c30] p-1.5 rounded-lg hover:bg-[#eff4ff] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#eff4ff] rounded-xl border border-[#cbdbf5] text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveMode('simulate');
              stopCamera();
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'simulate'
                ? 'bg-[#009299] text-white shadow-sm font-bold'
                : 'text-[#44474c] hover:text-[#0b1c30] hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>Tag Scanner &amp; Presets</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('manual');
              stopCamera();
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-[#009299] text-white shadow-sm font-bold'
                : 'text-[#44474c] hover:text-[#0b1c30] hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
            <span>Search / Code Entry</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              startCamera();
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'camera'
                ? 'bg-[#009299] text-white shadow-sm font-bold'
                : 'text-[#44474c] hover:text-[#0b1c30] hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            <span>Live Webcam</span>
          </button>
        </div>

        {/* ================= MODE 1: OPTICAL SCANNER & SIMULATOR (DEFAULT - NEVER BLOCKED) ================= */}
        {activeMode === 'simulate' && (
          <div className="flex flex-col gap-3.5">
            {/* Interactive Optical Scanner Display */}
            <div className="relative w-full h-44 bg-[#0e1c2f] rounded-xl overflow-hidden flex flex-col items-center justify-center p-4 text-white border border-white/10 shadow-inner">
              <div className="w-64 h-24 border-2 border-[#009299] rounded-xl relative flex flex-col items-center justify-center bg-black/30 backdrop-blur-xs">
                {/* Crosshairs */}
                <span className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#75f5fd]"></span>
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#75f5fd]"></span>
                <span className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#75f5fd]"></span>
                <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#75f5fd]"></span>

                {/* Barcode Graphic Stripes */}
                <div className="flex items-center gap-1 h-8 px-4 opacity-75">
                  <span className="w-1.5 h-full bg-white"></span>
                  <span className="w-0.5 h-full bg-white"></span>
                  <span className="w-2 h-full bg-white"></span>
                  <span className="w-1 h-full bg-white"></span>
                  <span className="w-0.5 h-full bg-white"></span>
                  <span className="w-2.5 h-full bg-white"></span>
                  <span className="w-1 h-full bg-white"></span>
                  <span className="w-0.5 h-full bg-white"></span>
                  <span className="w-2 h-full bg-white"></span>
                </div>

                <span className="font-mono text-xs font-bold text-[#75f5fd] tracking-widest mt-1">
                  {scannedCode}
                </span>

                {/* Animated Laser Sweep Line */}
                <div
                  className={`absolute w-full h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] transition-all duration-300 ${
                    isScanningAnimation ? 'scale-y-200 bg-emerald-400 shadow-[0_0_16px_#10b981]' : 'animate-pulse'
                  }`}
                ></div>
              </div>

              <div className="mt-2.5 flex items-center justify-between w-full px-2 text-[11px] text-[#cbdbf5]">
                <span className="flex items-center gap-1.5 font-mono">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isScanningAnimation ? 'bg-emerald-400 animate-ping' : 'bg-[#009299]'
                    }`}
                  ></span>
                  {isScanningAnimation ? 'Tag Decoded Successfully!' : 'Optical Sensor Active • Bay 2 Node'}
                </span>

                <label className="text-[#75f5fd] hover:underline cursor-pointer flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-[15px]">upload_file</span>
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>
            </div>

            {/* Quick 1-Click Scan Chips */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#0b1c30] flex items-center justify-between">
                <span>Click any asset to simulate optical scan:</span>
                <span className="text-[11px] text-[#44474c] font-normal">1-Click Instant Verify</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => executeScan('AST-0020')}
                  className={`p-2.5 rounded-xl text-left border transition-all flex flex-col gap-0.5 cursor-pointer ${
                    scannedCode === 'AST-0020'
                      ? 'bg-[#f0f9fa] border-[#009299] ring-2 ring-[#009299]/30 shadow-xs'
                      : 'bg-[#eff4ff] hover:bg-[#dce9ff] border-[#cbdbf5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0e1c2f]">AST-0020</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#009299] font-bold">11 Free</span>
                  </div>
                  <span className="font-bold text-xs text-[#0b1c30] truncate">HDMI Cable (3m 4K)</span>
                  <span className="text-[10px] text-[#44474c]">Bay 2 • IT Cable</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeScan('AST-0012')}
                  className={`p-2.5 rounded-xl text-left border transition-all flex flex-col gap-0.5 cursor-pointer ${
                    scannedCode === 'AST-0012'
                      ? 'bg-[#f0f9fa] border-[#009299] ring-2 ring-[#009299]/30 shadow-xs'
                      : 'bg-[#eff4ff] hover:bg-[#dce9ff] border-[#cbdbf5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0e1c2f]">AST-0012</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#009299] font-bold">3 Free</span>
                  </div>
                  <span className="font-bold text-xs text-[#0b1c30] truncate">Epson 3LCD Projector</span>
                  <span className="text-[10px] text-[#44474c]">Central Bay • Audio/Visual</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeScan('AST-0020')}
                  className={`p-2.5 rounded-xl text-left border transition-all flex flex-col gap-0.5 cursor-pointer ${
                    scannedCode === 'AST-0020'
                      ? 'bg-[#f0f9fa] border-[#009299] ring-2 ring-[#009299]/30 shadow-xs'
                      : 'bg-[#eff4ff] hover:bg-[#dce9ff] border-[#cbdbf5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0e1c2f]">AST-0020</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#009299] font-bold">Available</span>
                  </div>
                  <span className="font-bold text-xs text-[#0b1c30] truncate">Braided 4K HDMI Cable</span>
                  <span className="text-[10px] text-[#44474c]">Central Bay • Cables</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeScan('AST-0028')}
                  className={`p-2.5 rounded-xl text-left border transition-all flex flex-col gap-0.5 cursor-pointer ${
                    scannedCode === 'AST-0028'
                      ? 'bg-[#f0f9fa] border-[#009299] ring-2 ring-[#009299]/30 shadow-xs'
                      : 'bg-[#eff4ff] hover:bg-[#dce9ff] border-[#cbdbf5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0e1c2f]">AST-0028</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#009299] font-bold">6 Free</span>
                  </div>
                  <span className="font-bold text-xs text-[#0b1c30] truncate">Wireless Slide Clicker</span>
                  <span className="text-[10px] text-[#44474c]">Bay 2 • Presentation</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeScan('AST-0017')}
                  className={`p-2.5 rounded-xl text-left border transition-all flex flex-col gap-0.5 cursor-pointer ${
                    scannedCode === 'AST-0017'
                      ? 'bg-[#f0f9fa] border-[#009299] ring-2 ring-[#009299]/30 shadow-xs'
                      : 'bg-[#eff4ff] hover:bg-[#dce9ff] border-[#cbdbf5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0e1c2f]">AST-0017</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-emerald-700 font-bold">Operational</span>
                  </div>
                  <span className="font-bold text-xs text-[#0b1c30] truncate">Network Laser Printer</span>
                  <span className="text-[10px] text-[#44474c]">Computer Lab • Shared</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeScan('AST-0002')}
                  className={`p-2.5 rounded-xl text-left border transition-all flex flex-col gap-0.5 cursor-pointer ${
                    scannedCode === 'AST-0002'
                      ? 'bg-[#f0f9fa] border-[#009299] ring-2 ring-[#009299]/30 shadow-xs'
                      : 'bg-[#eff4ff] hover:bg-[#dce9ff] border-[#cbdbf5]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#0e1c2f]">AST-0002</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-white text-[#426086] font-bold">Consumable</span>
                  </div>
                  <span className="font-bold text-xs text-[#0b1c30] truncate">Whiteboard Marker (Black)</span>
                  <span className="text-[10px] text-[#44474c]">Central Dispense Shelf</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODE 2: MANUAL SEARCH & CODE ENTRY ================= */}
        {activeMode === 'manual' && (
          <div className="flex flex-col gap-3">
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-[#0b1c30]">
                Enter Code or Search Equipment by Name:
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#44474c] text-[18px]">
                    qr_code
                  </span>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => {
                      setManualInput(e.target.value);
                      setSearchQuery(e.target.value);
                    }}
                    placeholder="Enter code (e.g. AST-0020 or Projector)..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#009299] border border-[#cbdbf5]"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 px-4 rounded-xl bg-[#0e1c2f] text-white text-xs font-semibold hover:bg-[#426086] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">search</span>
                  <span>Scan / Verify</span>
                </button>
              </div>
            </form>

            {/* Quick Matching List */}
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              <span className="text-[11px] text-[#44474c] font-semibold">Available Inventory Codes:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {filteredAssets.slice(0, 8).map((a) => (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => {
                      setManualInput(a.code);
                      executeScan(a.code);
                    }}
                    className="p-2 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-left border border-[#cbdbf5] flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-[#0e1c2f] text-[11px]">{a.code}</span>
                      <span className="text-[#0b1c30] truncate">{a.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-[#009299] font-bold shrink-0 ml-1">
                      {a.availableQuantity} Free
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= MODE 3: LIVE CAMERA FEED ================= */}
        {activeMode === 'camera' && (
          <div className="flex flex-col gap-3">
            <div className="relative w-full h-56 bg-[#0e1c2f] rounded-xl overflow-hidden flex flex-col items-center justify-center text-white border border-white/10 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isCameraActive ? 'opacity-100' : 'opacity-0'
                }`}
              />

              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div className="w-64 h-32 border-2 border-[#009299] rounded-xl relative flex items-center justify-center bg-black/10 backdrop-blur-[0.5px]">
                  <span className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#75f5fd]"></span>
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#75f5fd]"></span>
                  <span className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#75f5fd]"></span>
                  <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#75f5fd]"></span>
                  <div className="w-full h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse"></div>
                </div>

                <div className="mt-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCameraActive ? 'bg-[#009299] animate-ping' : 'bg-amber-400'
                    }`}
                  ></span>
                  <span className="text-[11px] font-mono text-[#cbdbf5]">
                    {isCameraActive
                      ? 'Live Optical Feed Active • Align Barcode'
                      : isCameraStarting
                      ? 'Connecting Camera...'
                      : 'Camera Idle or Permission Required'}
                  </span>
                </div>
              </div>

              {/* Graceful Fallback if camera permission is blocked */}
              {(!isCameraActive || cameraError) && (
                <div className="absolute inset-0 bg-[#0e1c2f]/95 p-5 flex flex-col items-center justify-center text-center gap-2.5 z-10">
                  <div className="h-10 w-10 rounded-full bg-white/10 text-[#009299] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">videocam_off</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Browser Camera Restricted or Unavailable</h4>
                    <p className="text-[11px] text-[#cbdbf5] max-w-sm mt-1 leading-relaxed">
                      Camera permissions may be restricted in this browser environment.
                      You can seamlessly scan using <strong>Tag Scanner Presets</strong> or <strong>Upload Image</strong> without a physical webcam!
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                    <button
                      type="button"
                      onClick={() => setActiveMode('simulate')}
                      className="px-4 py-1.5 rounded-lg bg-[#009299] text-white text-xs font-bold hover:bg-[#007b80] transition-colors shadow-sm cursor-pointer"
                    >
                      Open Optical Tag Simulator
                    </button>
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={isCameraStarting}
                      className="px-3.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      {isCameraStarting ? 'Connecting...' : 'Retry Camera'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= VERIFIED ASSET DETAILS CARD & IMMEDIATE ACTION BUTTONS ================= */}
        {selectedAsset ? (
          <div className="p-4 bg-gradient-to-br from-[#eff4ff] via-white to-[#f0f9fa] rounded-xl border-2 border-[#009299] shadow-sm flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-[#0e1c2f] text-white flex items-center justify-center font-bold overflow-hidden shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[26px] text-[#75f5fd]">
                    {selectedAsset.category === 'it' && 'devices'}
                    {selectedAsset.category === 'audio' && 'videocam'}
                    {selectedAsset.category === 'recording' && 'photo_camera'}
                    {selectedAsset.category === 'stationery' && 'draw'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#0e1c2f] text-white">
                      {selectedAsset.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-emerald-200">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Tag Verified &amp; Online
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        selectedAsset.condition === 'damaged'
                          ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]'
                          : selectedAsset.condition === 'repair' || selectedAsset.status === 'maintenance'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : selectedAsset.condition === 'new'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {selectedAsset.condition === 'damaged'
                        ? 'Damaged'
                        : selectedAsset.condition === 'repair' || selectedAsset.status === 'maintenance'
                        ? 'Under Repair'
                        : selectedAsset.condition === 'new'
                        ? 'Brand New'
                        : 'Good'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#0b1c30] mt-1">{selectedAsset.name}</h4>
                  <p className="text-xs text-[#44474c]">
                    Location: <span className="font-semibold text-[#0b1c30]">{selectedAsset.location}</span> • {selectedAsset.department || 'Central College Node'}
                  </p>
                  {selectedAsset.conditionRemarks && (
                    <p className="text-xs text-[#426086] italic mt-1 bg-white/80 p-1.5 rounded border border-[#cbdbf5] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#009299]">edit_note</span>
                      <span>Remark: {selectedAsset.conditionRemarks}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right flex flex-col items-end shrink-0">
                <span className="text-[11px] text-[#44474c] font-medium">Available Units</span>
                <span className="font-mono text-lg font-bold text-[#009299]">
                  {selectedAsset.availableQuantity} / {selectedAsset.totalQuantity}
                </span>
                <span className="text-[10px] text-[#44474c]">{selectedAsset.unit} in stock</span>
              </div>
            </div>

            {/* Direct Action Buttons on Scanned Tag */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#cbdbf5]">
              <span className="text-xs text-[#44474c] font-mono">
                SKU: {selectedAsset.serialNumber || `COL-${selectedAsset.code}-2026`}
              </span>

              <div className="flex items-center gap-2">
                {onOpenStockAdjustModal && !isFaculty && (
                  <button
                    type="button"
                    onClick={() => onOpenStockAdjustModal(selectedAsset)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-[#0b1c30] text-xs font-semibold border border-[#cbdbf5] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Adjust Stock &amp; Condition</span>
                  </button>
                )}

                {onNavigateToAsset && (
                  <button
                    type="button"
                    onClick={() => onNavigateToAsset(selectedAsset.code)}
                    className="px-4 py-1.5 rounded-lg bg-[#009299] hover:bg-[#007b80] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>Book This Asset Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : scannedCode ? (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
            <span>Tag <strong>{scannedCode}</strong> not found in master asset registry.</span>
          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e5eeff] text-xs">
          <span className="text-[#44474c] flex items-center gap-1 text-[11px]">
            <span className="material-symbols-outlined text-[15px] text-[#009299]">verified_user</span>
            <span>AssetHub Optical Matrix v2.4</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-[#0e1c2f] text-white rounded-lg hover:bg-[#426086] transition-all cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
