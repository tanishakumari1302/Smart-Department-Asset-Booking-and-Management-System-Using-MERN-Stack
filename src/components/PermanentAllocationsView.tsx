import React, { useState, useMemo, useEffect } from 'react';
import { Asset, Booking } from '../types';

interface PermanentAllocationsViewProps {
  assets: Asset[];
  bookings: Booking[];
  onOpenGatepass: (booking: Booking) => void;
}

type PermDetailModalType = 'units' | 'workstations' | 'audit' | null;

interface PermanentUnitRecord {
  code: string;
  name: string;
  category: string;
  serialNumber: string;
  custodian: string;
  designation: string;
  department: string;
  venue: string;
  grantId: string;
  allocationDate: string;
  status: 'operational' | 'verified' | 'pending-review';
  specs: string;
  isWorkstation?: boolean;
}

export const PermanentAllocationsView: React.FC<PermanentAllocationsViewProps> = ({
  assets,
  bookings,
  onOpenGatepass,
}) => {
  const [activeModal, setActiveModal] = useState<PermDetailModalType>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('all');

  const permBookings = useMemo(() => bookings.filter((b) => b.type === 'permanent'), [bookings]);

  // Dynamic permanent hardware units calculation
  const totalPermanentUnits = useMemo(() => {
    const sum = assets.reduce((acc, a) => acc + (a.permanentQuantity || 0), 0);
    return Math.max(sum, 16);
  }, [assets]);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    if (activeModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal]);

  // Master roster of Permanent Hardware Units across institutional clusters
  const permanentHardwareRoster = useMemo<PermanentUnitRecord[]>(() => {
    const records: PermanentUnitRecord[] = [
      {
        code: 'AST-0036',
        name: 'Samsung 27" Curved FHD Monitor (LS27D388GAWXXL)',
        category: 'Dedicated Display & Workstation',
        serialNumber: '6LLWH8AY905198Z',
        custodian: 'Malay Aggarwal',
        designation: 'Assistant Vice President (Activation Head)',
        department: 'Central Administration & Activation Node',
        venue: 'Main Admin Building, Suite 101 (Malay Sir Office)',
        grantId: 'ADMIN-EXEC-2025-PERM',
        allocationDate: '01 Nov 2025',
        status: 'verified',
        specs: '27" FHD (1920x1080), 100Hz, 1800R Curved VA Panel, DC 14V/2.5A, HDMI BN81-25045A, Permanent 24/7 Office Allocation',
        isWorkstation: false,
      },
      {
        code: 'AST-0014',
        name: 'Dell OptiPlex 7090 Core i7 Workstation (Node 1)',
        category: 'Dedicated IT Workstation',
        serialNumber: 'SN-OPT-7090-01',
        custodian: 'Harpreet Aulakh',
        designation: 'Assistant Professor',
        department: 'Computer Science',
        venue: 'Faculty Block B, Cabin #04',
        grantId: 'RES-GRANT-2025-CORE',
        allocationDate: '15 Aug 2025',
        status: 'verified',
        specs: 'Intel Core i7-13700, 32GB DDR5 RAM, 1TB NVMe SSD, Nvidia RTX 3060 12GB',
        isWorkstation: true,
      },
      {
        code: 'AST-0014-B',
        name: 'Dell OptiPlex 7090 Core i7 Workstation (Node 2)',
        category: 'Dedicated IT Workstation',
        serialNumber: 'SN-OPT-7090-02',
        custodian: 'Dr. Rajesh Nair',
        designation: 'Associate Professor',
        department: 'Electronics & Comm',
        venue: 'VLSI & Embedded Systems Lab 02',
        grantId: 'DST-FIST-2025-VLSI',
        allocationDate: '20 Sep 2025',
        status: 'verified',
        specs: 'Intel Core i7-13700, 32GB DDR5 RAM, 1TB NVMe SSD, Nvidia RTX 3060 12GB',
        isWorkstation: true,
      },
      {
        code: 'AST-0025',
        name: 'Wacom Cintiq Pro 24 4K Creative Display',
        category: 'Design & Graphics Hardware',
        serialNumber: 'SN-WAC-PRO24-88',
        custodian: 'Prof. Mohini Gupta',
        designation: 'Associate Professor & Media Lead',
        department: 'Design & Media',
        venue: 'Digital Design Studio, Cabin #02',
        grantId: 'INST-MEDIA-GRANT-24',
        allocationDate: '05 Oct 2025',
        status: 'verified',
        specs: '4K IPS Screen, Pro Pen 2 with 8192 levels pressure, ExpressKey Remote',
      },
      {
        code: 'AST-0001',
        name: 'Epson PowerLite Laser Projector 5000L',
        category: 'Classroom Infrastructure',
        serialNumber: 'SN-EPS-PL5000-09',
        custodian: 'Dr. Ramesh Sharma',
        designation: 'Professor & HOD CS',
        department: 'Computer Science',
        venue: 'Smart Lecture Hall 101',
        grantId: 'CAMPUS-MODERN-2025',
        allocationDate: '10 Jul 2025',
        status: 'verified',
        specs: '5000 Lumens 3LCD Laser Engine, 1080p, Motorized Ceiling Mount Unit',
      },
      {
        code: 'AST-0030',
        name: 'Logitech Rally Ultra-HD Conference Bar System',
        category: 'Conference Infrastructure',
        serialNumber: 'SN-LOG-RAL-03',
        custodian: 'Malay Aggarwal',
        designation: 'Central Administrative Officer',
        department: 'Leadership & Operations',
        venue: 'Executive Boardroom & Senate Hall',
        grantId: 'CENTRAL-OPS-2025',
        allocationDate: '01 Jun 2025',
        status: 'verified',
        specs: '4K PTZ Camera with 15x HD Zoom, RightSense Auto-Framing, Dual Beamforming Mics',
      },
      {
        code: 'AST-0015',
        name: 'Yamaha MG12XU 12-Channel Professional Audio Mixer',
        category: 'Audio Infrastructure',
        serialNumber: 'SN-YAM-MG12-44',
        custodian: 'Dr. Priya Varma',
        designation: 'Dean Student Affairs',
        department: 'Student Affairs',
        venue: 'Central Auditorium Control Booth',
        grantId: 'CULTURAL-INFRA-2025',
        allocationDate: '12 Aug 2025',
        status: 'verified',
        specs: '12-Channel Mixing Console, D-PRE Preamps, SPX Digital Multi-FX Processor',
      },
      {
        code: 'AST-0022',
        name: 'Portable PA Sound Reinforcement System 250W',
        category: 'Sports & Event Audio',
        serialNumber: 'SN-PA-250W-12',
        custodian: 'Arpit Singh',
        designation: 'Campus Operations Lead',
        department: 'Campus Operations',
        venue: 'Sports Pavilion & Amphitheatre',
        grantId: 'SPORTS-COUNCIL-2025',
        allocationDate: '18 Jul 2025',
        status: 'verified',
        specs: '250W RMS Class-D Amplifier, Dual VHF Handhelds, Integrated 8h Battery',
      },
      {
        code: 'AST-0035',
        name: 'HP LaserJet Enterprise Flow MFP M528 Duplex',
        category: 'Office Automation Hardware',
        serialNumber: 'SN-HP-MFP528-71',
        custodian: 'Sunita Rao',
        designation: 'Senior Registrar Staff',
        department: 'Registrar & Exam Office',
        venue: 'Central Exam Records Room 108',
        grantId: 'EXAM-SECURITY-2025',
        allocationDate: '04 Sep 2025',
        status: 'verified',
        specs: '45 ppm Monochrome, Dual-head Single-pass Scanner, Encrypted Secure Print',
      },
      {
        code: 'AST-0036',
        name: 'Cisco Catalyst 9300 48-Port PoE+ Gigabit Switch',
        category: 'Network Infrastructure',
        serialNumber: 'SN-CSC-9300-48P',
        custodian: 'Campus IT Network Team',
        designation: 'System Administrator',
        department: 'Campus IT & Infrastructure',
        venue: 'Server Room Rack #02, Ground Floor',
        grantId: 'CAMPUS-BACKBONE-2025',
        allocationDate: '28 May 2025',
        status: 'verified',
        specs: '48 Ports PoE+ 740W, 4x 10G SFP+ Uplinks, Cisco StackWise 480Gbps',
      },
      {
        code: 'AST-0037',
        name: 'APC Smart-UPS RT 3000VA On-Line Power Backup',
        category: 'Power & Server Infrastructure',
        serialNumber: 'SN-APC-RT3000-99',
        custodian: 'Campus IT Network Team',
        designation: 'Infrastructure Engineer',
        department: 'Campus IT & Infrastructure',
        venue: 'Server Room Master Power Bay',
        grantId: 'CAMPUS-BACKBONE-2025',
        allocationDate: '28 May 2025',
        status: 'verified',
        specs: '3000VA / 2700W Pure Sine Wave, Double-Conversion On-Line, SNMP Network Card',
      },
      {
        code: 'AST-0038',
        name: 'Smart Interactive Flat Panel 75" 4K UHD Touch',
        category: 'Smart Classroom Hardware',
        serialNumber: 'SN-SMT-IFP75-19',
        custodian: 'Dr. Anand Kumar',
        designation: 'Professor & Academic Dean',
        department: 'Management Studies',
        venue: 'Executive MDP Hall 204',
        grantId: 'MDP-UPGRADE-2025',
        allocationDate: '14 Oct 2025',
        status: 'verified',
        specs: '75" Zero-Bonding 4K Panel, 40-Point Multi-Touch, Android 13 + Windows OPS i5',
      },
      {
        code: 'AST-0039',
        name: 'Carl Zeiss Microscopy High-Res Digital Camera Unit',
        category: 'Laboratory Research Tech',
        serialNumber: 'SN-ZSS-MIC-04',
        custodian: 'Bio-Research Laboratory Head',
        designation: 'Senior Scientist',
        department: 'Biotechnology & Life Sciences',
        venue: 'Advanced Bio-Imaging Lab 301',
        grantId: 'CSIR-BIO-RESEARCH-24',
        allocationDate: '11 Nov 2025',
        status: 'verified',
        specs: '20 MP High-Sensitivity CMOS Sensor, C-Mount Adapter, Axiocam Live Capture',
      },
      {
        code: 'AST-0040',
        name: 'Creality K1 Max High-Speed 3D Printer (300x300mm)',
        category: 'Prototyping & FabLab',
        serialNumber: 'SN-CRL-K1MAX-11',
        custodian: 'Robotics & Maker Club Mentor',
        designation: 'Lab Instructor',
        department: 'Mechanical & Robotics',
        venue: 'Innovation & FabLab Annex',
        grantId: 'AICTE-IDEA-LAB-2025',
        allocationDate: '02 Dec 2025',
        status: 'verified',
        specs: '600mm/s Print Speed, Dual Sensor Camera, Auto Bed Leveling, Dual-Gear Extruder',
      },
      {
        code: 'AST-0041',
        name: 'Tektronix TBS2000B 4-Channel 100MHz Digital Oscilloscope',
        category: 'Electronics Lab Testing',
        serialNumber: 'SN-TEK-TBS2000-33',
        custodian: 'Electronics Lab Superintendent',
        designation: 'Technical Superintendent',
        department: 'Electronics & Comm',
        venue: 'Analog & Signals Lab 102',
        grantId: 'ECE-MODROBS-2025',
        allocationDate: '19 Jan 2026',
        status: 'verified',
        specs: '4 Analog Channels, 100MHz Bandwidth, 2GS/s Sample Rate, 9-inch WVGA Display',
      },
      {
        code: 'AST-0042',
        name: 'Sony BRAVIA 65" 4K Commercial Presentation Display',
        category: 'Administrative Infrastructure',
        serialNumber: 'SN-SNY-BRV65-08',
        custodian: 'Malay Aggarwal',
        designation: 'Central Administrative Officer',
        department: 'Leadership & Operations',
        venue: 'Dean Conference Suite & Visitor Lounge',
        grantId: 'EXECUTIVE-SUITE-25',
        allocationDate: '22 Feb 2026',
        status: 'verified',
        specs: '65" Pro BRAVIA 4K HDR, AirPlay 2, Google Cast, 16/7 Commercial Runtime Rated',
      },
      {
        code: 'AST-0043',
        name: 'Godrej Fireproof Document & Exam Paper Safe (Double Door)',
        category: 'Security & Custody',
        serialNumber: 'SN-GDJ-SAF-02',
        custodian: 'Registrar & Exam Controller',
        designation: 'Chief Controller of Exams',
        department: 'Registrar & Exam Office',
        venue: 'Confidential Exam Vault Room 102A',
        grantId: 'INST-SECURITY-2025',
        allocationDate: '15 Mar 2026',
        status: 'verified',
        specs: '2-Hour Fire Rating at 1000°C, Dual Biometric & Digital Keypad Locking Mechanism',
      },
      {
        code: 'AST-0014-K',
        name: 'Dell OptiPlex 7090 Core i7 Workstation (Guidance Node)',
        category: 'Dedicated IT Workstation',
        serialNumber: 'SN-OPT-7090-KT',
        custodian: 'Ms. Kavita Thakur',
        designation: 'Senior Associate',
        department: 'Training & Skill Development Cell',
        venue: 'Student Guidance Wing, Cabin 304',
        grantId: 'STUDENT-GUIDANCE-2026',
        allocationDate: '01 Sep 2026',
        status: 'verified',
        specs: 'Intel Core i7-13700, 32GB RAM, 1TB NVMe SSD, Dual 27" Dell UltraSharp Displays',
        isWorkstation: true,
      },
      {
        code: 'AST-0014-R',
        name: 'Lenovo ThinkCentre M90a Gen 3 All-in-One Presentation Terminal',
        category: 'Dedicated IT Workstation',
        serialNumber: 'SN-LNV-M90A-RD',
        custodian: 'Ms. Rhythm Dua',
        designation: 'Business Development Manager',
        department: 'Corporate Training & Placement Cell',
        venue: 'Executive Suite 102, Main Admin Block',
        grantId: 'CORP-PARTNER-2026',
        allocationDate: '01 Sep 2026',
        status: 'verified',
        specs: 'Intel Core i7-12700, 32GB DDR5, 1TB SSD, 23.8" FHD IPS, Conference Soundbar',
        isWorkstation: true,
      },
    ];

    return records;
  }, []);

  // Filtered records for the modal
  const modalFilteredRecords = useMemo(() => {
    let list = [...permanentHardwareRoster];

    if (activeModal === 'workstations') {
      list = list.filter((r) => r.isWorkstation);
    }

    if (modalCategoryFilter !== 'all') {
      list = list.filter((r) => r.category.toLowerCase().includes(modalCategoryFilter.toLowerCase()));
    }

    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.custodian.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.venue.toLowerCase().includes(q) ||
          r.grantId.toLowerCase().includes(q) ||
          r.serialNumber.toLowerCase().includes(q) ||
          r.specs.toLowerCase().includes(q)
      );
    }

    return list;
  }, [permanentHardwareRoster, activeModal, modalCategoryFilter, modalSearch]);

  // Main table filter
  const tableFilteredBookings = useMemo(() => {
    if (!tableSearch.trim()) return permBookings;
    const q = tableSearch.toLowerCase().trim();
    return permBookings.filter(
      (b) =>
        b.assetCode?.toLowerCase().includes(q) ||
        b.assetName?.toLowerCase().includes(q) ||
        b.requesterName?.toLowerCase().includes(q) ||
        b.venue?.toLowerCase().includes(q) ||
        b.grantId?.toLowerCase().includes(q)
    );
  }, [permBookings, tableSearch]);

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Title Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs uppercase text-[#009299] font-bold">
            Academic Infrastructure
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
          <span className="text-[11px] uppercase text-[#44474c] font-semibold">
            Dedicated Asset Custody
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
          Departmental Permanent Allocations Ledger
        </h1>
        <p className="text-xs text-[#72777f] mt-0.5">
          Click on any metric card below to inspect granular hardware custody rosters, workstation specs &amp; audit reconciliation.
        </p>
      </div>

      {/* 3 Clickable Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Permanent Hardware Units */}
        <div
          onClick={() => {
            setModalSearch('');
            setModalCategoryFilter('all');
            setActiveModal('units');
          }}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view detailed ledger of all 16 Permanent Hardware Units"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-[#44474c] font-bold tracking-wider">
              Permanent Hardware Units
            </span>
            <div className="flex items-center gap-1 text-[#009299] opacity-70 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold hidden sm:inline">Details</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-[#0b1c30]">
            {totalPermanentUnits} Units
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f1f5f9]">
            <span className="text-[11px] text-[#44474c] truncate">
              Allocated to faculty cabins &amp; lab clusters
            </span>
            <span className="text-[10px] font-bold text-[#009299] bg-[#eff4ff] px-1.5 py-0.5 rounded shrink-0 ml-1">
              Inspect 16 Units
            </span>
          </div>
        </div>

        {/* Card 2: Dedicated PC Workstations */}
        <div
          onClick={() => {
            setModalSearch('');
            setModalCategoryFilter('all');
            setActiveModal('workstations');
          }}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#009299] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view Dedicated PC Workstations hardware specifications & IP allocation"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-[#44474c] font-bold tracking-wider">
              Dedicated PC Workstations
            </span>
            <div className="flex items-center gap-1 text-[#009299] opacity-70 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold hidden sm:inline">Details</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-[#009299]">
            2 Core Workstations
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f1f5f9]">
            <span className="text-[11px] text-[#44474c] truncate">
              Dell OptiPlex Core i7 systems
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 ml-1">
              Core i7 Specs
            </span>
          </div>
        </div>

        {/* Card 3: Audit Reconciliation */}
        <div
          onClick={() => setActiveModal('audit')}
          className="p-4 bg-white rounded-xl shadow-xs border border-[#e5eeff] hover:border-[#426086] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          title="Click to view Physical Audit Reconciliation timetable, tag status & compliance"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-[#44474c] font-bold tracking-wider">
              Audit Reconciliation
            </span>
            <div className="flex items-center gap-1 text-[#426086] opacity-70 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold hidden sm:inline">Details</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                arrow_forward
              </span>
            </div>
          </div>
          <div className="text-2xl font-bold mt-1 text-[#426086]">
            Annual Term II
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f1f5f9]">
            <span className="text-[11px] text-[#44474c] truncate">
              Next scheduled physical audit: May 2026
            </span>
            <span className="text-[10px] font-bold text-[#426086] bg-[#cbdbf5] px-1.5 py-0.5 rounded shrink-0 ml-1">
              Audit Schedule
            </span>
          </div>
        </div>
      </div>

      {/* Permanent Allocations Ledger Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#0b1c30]">
              Permanent Asset Grants &amp; Room Allocations
            </h2>
            <span className="text-xs text-[#72777f]">
              Official grants recorded for academic tenure &amp; lab custody.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-[#72777f]">
                search
              </span>
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search allocations..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#f8fafd] border border-[#cbdbf5] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#009299] w-48 sm:w-60"
              />
            </div>
            <button
              type="button"
              onClick={() => setActiveModal('units')}
              className="px-3 py-1.5 bg-[#0e1c2f] hover:bg-[#426086] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              <span>All 16 Units</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#eff4ff] text-[#426086] text-[11px] uppercase tracking-wider h-10">
                <th className="px-4 py-2 font-semibold rounded-l-lg">SKU / Code</th>
                <th className="px-4 py-2 font-semibold">Asset Description</th>
                <th className="px-4 py-2 font-semibold">Assigned Custodian / Venue</th>
                <th className="px-4 py-2 font-semibold">Grant / Project ID</th>
                <th className="px-4 py-2 font-semibold">Duration</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Slip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5eeff]">
              {tableFilteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    <span className="material-symbols-outlined text-[32px] text-[#cbdbf5] mb-1">
                      inventory_2
                    </span>
                    <p className="font-semibold text-xs text-[#0b1c30]">
                      No active grant requisitions match your filter.
                    </p>
                    <p className="text-[11px] text-[#72777f] mt-0.5">
                      Click "All 16 Units" above to view the complete physical hardware deployment roster.
                    </p>
                  </td>
                </tr>
              ) : (
                tableFilteredBookings.map((b, idx) => (
                  <tr key={b.id || b._id || b.reqId || `perm-${idx}`} className="hover:bg-[#eff4ff]/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#0e1c2f]">{b.assetCode}</td>
                    <td className="px-4 py-3 font-medium text-[#0b1c30]">{b.assetName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-[#0b1c30]">{b.requesterName}</span>
                        <span className="text-[11px] text-[#44474c]">{b.venue || 'Cabin #04'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#426086]">{b.grantId || 'RES-GRANT-2025'}</td>
                    <td className="px-4 py-3 text-[#44474c]">{b.tenancyDuration || 'Full Academic Year'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#009299] font-bold text-[10px] uppercase">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onOpenGatepass(b)}
                        className="px-2.5 py-1 bg-[#eff4ff] text-[#426086] hover:bg-[#dce9ff] rounded text-xs font-semibold border border-[#cbdbf5] cursor-pointer transition-colors"
                      >
                        Grant Voucher
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1 & 2: PERMANENT HARDWARE UNITS & DEDICATED WORKSTATIONS DRILL-DOWN */}
      {/* ========================================================================= */}
      {(activeModal === 'units' || activeModal === 'workstations') && (
        <div
          className="fixed inset-0 z-50 bg-[#0e1c2f]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
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
                    activeModal === 'workstations'
                      ? 'bg-[#009299]/10 text-[#009299]'
                      : 'bg-[#0e1c2f]/10 text-[#0e1c2f]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {activeModal === 'workstations' ? 'computer' : 'devices'}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0b1c30]">
                    {activeModal === 'workstations'
                      ? 'Dedicated PC Workstations & Research Nodes'
                      : 'Permanent Hardware Units (Complete 16 Units Roster)'}
                  </h2>
                  <p className="text-xs text-[#72777f]">
                    {activeModal === 'workstations'
                      ? 'Technical specifications, static IP hostnames, faculty custodians & OS licensing.'
                      : 'Full institutional ledger of physical hardware deployed in permanent custody across campus.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg text-[#72777f] hover:text-[#0b1c30] hover:bg-[#eff4ff] flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Quick Metrics Strip */}
            <div className="px-6 py-3 bg-[#eff4ff]/50 border-b border-[#e5eeff] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-[#0b1c30]">
                  Units in Custody: <strong className="text-[#009299]">{modalFilteredRecords.length} Active</strong>
                </span>
                <span className="text-[#426086]">
                  Tag Verification: <strong>100% Barcoded</strong>
                </span>
                <span className="text-emerald-700">
                  Operational Health: <strong>100% Intact</strong>
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#72777f] bg-white px-2 py-0.5 rounded border border-[#cbdbf5]">
                Audited AY 2026-27
              </span>
            </div>

            {/* Search & Category Filter Toolbar */}
            <div className="p-4 border-b border-[#e5eeff] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#72777f]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search by SKU code, asset name, custodian, cabin, grant, or specs..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#cbdbf5] rounded-lg text-xs font-medium text-[#0b1c30] placeholder-[#72777f] focus:outline-none focus:ring-2 focus:ring-[#009299]/30 focus:border-[#009299]"
                />
              </div>

              {activeModal === 'units' && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {['all', 'workstation', 'audio', 'design', 'network', 'lab'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setModalCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize whitespace-nowrap cursor-pointer transition-all ${
                        modalCategoryFilter === cat
                          ? 'bg-[#0e1c2f] text-white shadow-2xs'
                          : 'bg-[#eff4ff] text-[#426086] hover:bg-[#cbdbf5]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Body: Cards / Table */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3.5">
              {modalFilteredRecords.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center text-[#72777f]">
                  <span className="material-symbols-outlined text-[44px] text-[#cbdbf5] mb-2">
                    search_off
                  </span>
                  <p className="text-sm font-bold text-[#0b1c30]">No permanent units matched your query</p>
                  <p className="text-xs text-[#72777f] mt-0.5">Clear search or choose a different category filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {modalFilteredRecords.map((item) => (
                    <div
                      key={item.code}
                      className="p-4 bg-white rounded-xl border border-[#cbdbf5] hover:border-[#009299] transition-all shadow-2xs flex flex-col justify-between gap-3 text-xs"
                    >
                      <div>
                        {/* Top row: Code & Category Tag */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono font-bold text-[#0e1c2f] bg-[#eff4ff] px-2 py-0.5 rounded text-[11px]">
                            {item.code}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified Deployment
                          </span>
                        </div>

                        {/* Title & Category */}
                        <h3 className="font-bold text-[#0b1c30] text-sm leading-snug">
                          {item.name}
                        </h3>
                        <span className="text-[11px] text-[#009299] font-medium block mt-0.5">
                          {item.category} • S/N: {item.serialNumber}
                        </span>

                        {/* Custodian & Venue Details */}
                        <div className="mt-3 p-2.5 rounded-lg bg-[#f8fafd] border border-[#e5eeff] space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-[#72777f]">Custodian:</span>
                            <span className="font-bold text-[#0b1c30]">{item.custodian}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#72777f]">Department:</span>
                            <span className="font-medium text-[#426086]">{item.department}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#72777f]">Dedicated Location:</span>
                            <span className="font-semibold text-[#0b1c30] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-[#009299]">pin_drop</span>
                              {item.venue}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#72777f]">Grant / Project:</span>
                            <span className="font-mono text-[10px] text-[#426086]">{item.grantId}</span>
                          </div>
                        </div>

                        {/* Tech Specs */}
                        <div className="mt-2.5 text-[11px] text-[#44474c] bg-white p-2 rounded border border-[#f1f5f9]">
                          <span className="font-bold text-[#0b1c30] block text-[10px] uppercase text-[#72777f] mb-0.5">
                            Hardware Specs:
                          </span>
                          <p className="line-clamp-2 leading-relaxed">{item.specs}</p>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-2 border-t border-[#f1f5f9] flex items-center justify-between text-[10px] text-[#72777f]">
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          Permanent Custody Active
                        </span>
                        <span className="font-mono">Allocated: {item.allocationDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#e5eeff] bg-[#f8fafd] flex items-center justify-between">
              <span className="text-xs text-[#72777f]">
                Sunstone Central Infrastructure Ledger • Institutional Hardware Registry
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: AUDIT RECONCILIATION DRILL-DOWN */}
      {/* ========================================================================= */}
      {activeModal === 'audit' && (
        <div
          className="fixed inset-0 z-50 bg-[#0e1c2f]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-left animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e5eeff] flex items-center justify-between bg-gradient-to-r from-[#f8fafd] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#426086]/10 text-[#426086] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">fact_check</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0b1c30]">
                    Institutional Physical Audit Reconciliation (Annual Term II)
                  </h2>
                  <p className="text-xs text-[#72777f]">
                    Bi-annual stocktaking timetable, physical barcode reconciliation, and administrative audit governance.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-lg text-[#72777f] hover:text-[#0b1c30] hover:bg-[#eff4ff] flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Quick Audit Metrics Strip */}
            <div className="px-6 py-3 bg-[#eff4ff]/50 border-b border-[#e5eeff] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-[#0b1c30]">
                  Cycle: <strong className="text-[#426086]">Annual Term II (AY 2026-27)</strong>
                </span>
                <span className="text-emerald-700">
                  Tag Reconciliation: <strong>100% Reconciled (16/16 Units)</strong>
                </span>
                <span className="text-[#009299]">
                  Discrepancy / Variance: <strong>0 Units Missing</strong>
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded">
                Audit Status: Active Compliance
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* Audit Timetable Roadmap */}
              <div>
                <h3 className="font-bold text-sm text-[#0b1c30] mb-3">
                  Physical Audit Execution Roadmap (2026)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] mb-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Phase 1 (Completed)</span>
                    </div>
                    <span className="font-bold text-[#0b1c30] block">Digital Ledger Freeze</span>
                    <span className="text-[11px] text-[#44474c] mt-0.5 block">
                      All permanent grants frozen for mid-term count in Jan 2026.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] mb-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Phase 2 (Completed)</span>
                    </div>
                    <span className="font-bold text-[#0b1c30] block">Custodian Declarations</span>
                    <span className="text-[11px] text-[#44474c] mt-0.5 block">
                      Faculty sign-offs collected for all 16 permanent hardware units.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-300">
                    <div className="flex items-center gap-1.5 text-sky-800 font-bold text-[11px] mb-1">
                      <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                      <span>Phase 3 (Upcoming)</span>
                    </div>
                    <span className="font-bold text-[#0b1c30] block">Physical Walkthrough</span>
                    <span className="text-[11px] text-[#44474c] mt-0.5 block">
                      Scheduled on May 15-20, 2026 by Malay Aggarwal &amp; Arpit Singh.
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex items-center gap-1.5 text-gray-600 font-bold text-[11px] mb-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      <span>Phase 4 (Scheduled)</span>
                    </div>
                    <span className="font-bold text-[#0b1c30] block">Final Certification</span>
                    <span className="text-[11px] text-[#44474c] mt-0.5 block">
                      Final Board certification &amp; ledger archival in June 2026.
                    </span>
                  </div>
                </div>
              </div>

              {/* Departmental Compliance Overview */}
              <div>
                <h3 className="font-bold text-sm text-[#0b1c30] mb-2.5">
                  Departmental Compliance &amp; Tagged Hardware Units
                </h3>
                <div className="overflow-x-auto border border-[#cbdbf5] rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#eff4ff] text-[#426086] font-bold uppercase text-[10px] border-b border-[#cbdbf5]">
                        <th className="py-2.5 px-3">Department Cluster</th>
                        <th className="py-2.5 px-3">Allocated Permanent Assets</th>
                        <th className="py-2.5 px-3">Primary Custodian</th>
                        <th className="py-2.5 px-3">Barcode Tag Status</th>
                        <th className="py-2.5 px-3">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9] bg-white">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#0b1c30]">Computer Science &amp; IT</td>
                        <td className="py-2.5 px-3">4 Units (OptiPlex, Epson Projector, Cisco Switch, APC UPS)</td>
                        <td className="py-2.5 px-3">Dr. Ramesh Sharma / Harpreet Aulakh</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified (4/4)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">0 Variance</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#0b1c30]">Electronics &amp; Communication</td>
                        <td className="py-2.5 px-3">2 Units (Core i7 Node 2, Tektronix Oscilloscope)</td>
                        <td className="py-2.5 px-3">Dr. Rajesh Nair</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified (2/2)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">0 Variance</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#0b1c30]">Design &amp; Media Labs</td>
                        <td className="py-2.5 px-3">2 Units (Wacom Cintiq Pro 24, Creality 3D Printer)</td>
                        <td className="py-2.5 px-3">Prof. Mohini Gupta</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified (2/2)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">0 Variance</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#0b1c30]">Management Studies &amp; MDP</td>
                        <td className="py-2.5 px-3">1 Unit (Smart Interactive Flat Panel 75")</td>
                        <td className="py-2.5 px-3">Dr. Anand Kumar</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified (1/1)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">0 Variance</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#0b1c30]">Student Affairs &amp; Campus Ops</td>
                        <td className="py-2.5 px-3">3 Units (Yamaha Mixer, Portable PA, Sony Bravia 65")</td>
                        <td className="py-2.5 px-3">Dr. Priya Varma / Arpit Singh</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified (3/3)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">0 Variance</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#0b1c30]">Registrar &amp; Exam Office</td>
                        <td className="py-2.5 px-3">2 Units (HP Enterprise MFP, Godrej Fireproof Safe)</td>
                        <td className="py-2.5 px-3">Registrar Office Lead / Sunita Rao</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified (2/2)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">0 Variance</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-[#0b1c30]">Life Sciences &amp; Central Admin</td>
                        <td className="py-2.5 px-3">2 Units (Carl Zeiss Digital Camera, Logitech Rally Bar)</td>
                        <td className="py-2.5 px-3">Malay Aggarwal / Bio Lead</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Verified (2/2)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">0 Variance</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Sign-off Authority Panel */}
              <div className="p-3.5 rounded-xl bg-[#eff4ff]/60 border border-[#cbdbf5] flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#0b1c30] block">Institutional Audit Governance Panel</span>
                  <span className="text-[11px] text-[#44474c]">
                    Lead Audit Officers: Malay Aggarwal (Admin Officer) &amp; Arpit Singh (Campus Operations)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Ledger Certified</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#e5eeff] bg-[#f8fafd] flex items-center justify-between">
              <span className="text-xs text-[#72777f]">
                Physical Verification Protocol • Sunstone AssetHub ERP
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Close Audit Reconciliation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
