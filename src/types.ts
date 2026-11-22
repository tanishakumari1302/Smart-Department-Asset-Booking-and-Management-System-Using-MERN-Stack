export type Role = 'admin' | 'hod' | 'faculty' | 'tech';

export type UserApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation: string;
  businessRole?: string;
  facultyId: string;
  avatar?: string;
  phone?: string;
  room?: string;
  approvalStatus?: UserApprovalStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffMember {
  _id: string;
  id?: string;
  employeeId?: string;
  facultyId?: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation: string;
  businessRole?: string;
  status: 'active' | 'deactivated';
  registered?: boolean;
  registeredUid?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  _id: string;
  id?: string;
  code: string;
  name: string;
  shortName: string;
  block?: string;
  headOfDept?: string;
  facultyCount?: number;
  assetCount?: number;
  createdAt?: string;
}

export type AssetCategory = 'stationery' | 'it' | 'audio' | 'recording';
export type AssetCondition = 'new' | 'good' | 'repair' | 'damaged';

export interface Asset {
  _id: string;
  id?: string;
  code: string;
  name: string;
  department?: string;
  category: AssetCategory;
  categoryLabel: string;
  classification: string;
  description: string;
  totalQuantity: number;
  availableQuantity: number;
  dispatchedQuantity: number;
  permanentQuantity: number;
  minThreshold: number;
  isConsumable: boolean;
  isReusable: boolean;
  unit: string;
  location: string;
  serialNumber?: string;
  specs?: string;
  status: 'operational' | 'low-stock' | 'maintenance' | 'dispatched' | 'depleted';
  barcodeTagStatus: 'verified' | 'pending-retag' | 'unassigned' | 'pending' | 'unlabeled';
  condition?: AssetCondition;
  conditionRemarks?: string;
  imageUrl?: string;
  image?: string;
  updatedAt?: string;
}

export type BookingType = 'temporary' | 'permanent' | 'consumable';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'dispatched' | 'returned' | 'cancelled';

export interface Booking {
  _id: string;
  id?: string;
  reqId: string;
  type: BookingType;
  bookingType?: BookingType;
  title?: string;
  assetId?: string;
  assetCode: string;
  assetName: string;
  assetCategory?: string;
  requesterId?: string;
  requesterName: string;
  requesterRole?: string;
  requesterDept?: string;
  department?: string;
  requesterEmail: string;
  venue?: string;
  purpose?: string;
  bookingDate?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  grantId?: string;
  tenancyDuration?: string;
  quantity: number;
  pickupLocation?: string;
  status: BookingStatus;
  hasConflict?: boolean;
  conflictDetails?: string;
  rejectReason?: string;
  rejectRemarks?: string;
  remarks?: string;
  gatepassGenerated?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  dispatchedAt?: string;
  returnedAt?: string;
  returnCondition?: 'intact' | 'damaged' | 'minor-wear';
  returnAuditedBy?: string;
  handoverPhoto?: string;
  handoverNotes?: string;
  handoverAt?: string;
  handoverBy?: string;
  handoverVenue?: string;
  returnPhoto?: string;
  returnNotes?: string;
  returnAt?: string;
  returnBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLog {
  _id: string;
  id?: string;
  action: string;
  category: 'booking' | 'inventory' | 'auth' | 'system' | 'return';
  actorName: string;
  actorRole: string;
  targetCode?: string;
  targetId?: string;
  description: string;
  details?: string;
  timestamp: string;
  status: 'success' | 'warning' | 'alert';
}

export interface DashboardKPIs {
  totalUnits: number;
  catalogTypesCount: number;
  capacityMax: number;
  capacityPercentage: number;
  bookableUnits: number;
  bookablePercentage: number;
  approvalsDue: number;
  activeCheckouts: number;
  permanentAllocated: number;
  lowStockWarnings: number;
  barcodeAuditCompletion: {
    completed: number;
    total: number;
    percentage: number;
  };
  venueDeployments: Array<{
    venue: string;
    units: number;
    description: string;
  }>;
}

export interface ClusterInfo {
  node: string;
  name: string;
  term: string;
  atlasConnected: boolean;
  dbName: string;
  latencyMs: number;
}

export interface AcademicSettings {
  academicYear: string; // e.g. "2026-27"
  shortYear: string;    // e.g. "26-27"
  term: string;         // e.g. "Term I"
  customOverride?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export function calculateDefaultAcademicYear(date = new Date()): AcademicSettings {
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth(); // 0-indexed: 0=Jan, 5=June, 9=Oct

  // The academic year starts in June (month index >= 5).
  // October 2026 -> 2026-27
  // March 2027   -> 2026-27
  let startYear: number;
  let endYear: number;
  let term: string;

  if (currentMonth >= 5) {
    startYear = currentYear;
    endYear = currentYear + 1;
    term = currentMonth >= 11 ? 'Term II' : 'Term I';
  } else {
    startYear = currentYear - 1;
    endYear = currentYear;
    term = 'Term II';
  }

  const shortStart = String(startYear).slice(-2);
  const shortEnd = String(endYear).slice(-2);

  return {
    academicYear: `${startYear}-${shortEnd}`,
    shortYear: `${shortStart}-${shortEnd}`,
    term: term,
    customOverride: false,
  };
}

export type NavTab =
  | 'dashboard'
  | 'new-request'
  | 'my-requests-and-bookings'
  | 'browse-catalog'
  | 'interactive-requisition-desk'
  | 'my-activity-booking'
  | 'pending-requests'
  | 'assigned-assets'
  | 'consumable-quota'
  | 'request-approvals'
  | 'faculty-custody-stationery'
  | 'asset-inventory-and-stock'
  | 'issue-and-return-desk'
  | 'permanent-allocations'
  | 'categories-and-barcodes'
  | 'user-management'
  | 'reports-and-analytics'
  | 'audit-log';

export const TAB_LABELS: Record<NavTab, string> = {
  'dashboard': 'Dashboard',
  'browse-catalog': 'Browse Catalog',
  'new-request': 'Interactive Asset Requisition Desk',
  'my-requests-and-bookings': 'Faculty Services Overview',
  'interactive-requisition-desk': 'Interactive Asset Requisition Desk',
  'my-activity-booking': 'My Activity Booking',
  'pending-requests': 'Pending Requests',
  'assigned-assets': 'Assigned Assets',
  'consumable-quota': 'Consumable Quota',
  'request-approvals': 'Request Approvals',
  'faculty-custody-stationery': 'Faculty Custody & Stationery',
  'asset-inventory-and-stock': 'Inventory & Stock',
  'issue-and-return-desk': 'Issue & Return Desk',
  'permanent-allocations': 'Permanent Allocations',
  'categories-and-barcodes': 'Categories & Barcodes',
  'user-management': 'User Management',
  'reports-and-analytics': 'Reports & Analytics',
  'audit-log': 'Audit Log',
};

export type MarkerColor = 'black' | 'blue' | 'red' | 'green';

export interface FacultyCustodyItem {
  id: string;
  assetCode: string;
  name: string;
  category: 'stationery' | 'it' | 'audio' | 'recording';
  markerColor?: MarkerColor;
  quantity: number;
  assignedVenue: string;
  sessionStartTime: string;
  sessionEndTime: string;
  status: 'in-use' | 'returned';
}

export interface FacultyCustodyProfile {
  facultyId: string;
  facultyName: string;
  department: string;
  cabin: string;
  email: string;
  avatar?: string;
  currentVenue: string;
  currentSession: string;
  items: FacultyCustodyItem[];
}

export interface StockNotificationRequest {
  id: string;
  assetCode: string;
  assetName: string;
  requesterEmail: string;
  requesterName: string;
  requestedAt: string;
  targetVenue?: string;
  notified: boolean;
  notifiedAt?: string;
}

export function isTabAllowedForRole(tab: NavTab, role?: Role): boolean {
  if (!role) return false;
  if (role === 'admin' || role === 'hod') {
    return true;
  }
  if (role === 'faculty') {
    return (
      tab === 'new-request' ||
      tab === 'my-requests-and-bookings' ||
      tab === 'browse-catalog' ||
      tab === 'interactive-requisition-desk' ||
      tab === 'my-activity-booking' ||
      tab === 'pending-requests' ||
      tab === 'assigned-assets' ||
      tab === 'consumable-quota'
    );
  }
  if (role === 'tech') {
    return (
      tab === 'dashboard' ||
      tab === 'asset-inventory-and-stock' ||
      tab === 'issue-and-return-desk'
    );
  }
  return false;
}

export function getAllowedRolesForTab(tab: NavTab): Role[] {
  switch (tab) {
    case 'dashboard':
      return ['admin', 'hod', 'tech'];
    case 'browse-catalog':
    case 'new-request':
    case 'my-requests-and-bookings':
    case 'interactive-requisition-desk':
    case 'my-activity-booking':
    case 'pending-requests':
    case 'assigned-assets':
    case 'consumable-quota':
      return ['admin', 'hod', 'faculty'];
    case 'asset-inventory-and-stock':
    case 'issue-and-return-desk':
      return ['admin', 'hod', 'tech'];
    case 'request-approvals':
    case 'faculty-custody-stationery':
    case 'permanent-allocations':
    case 'categories-and-barcodes':
    case 'user-management':
    case 'reports-and-analytics':
    case 'audit-log':
      return ['admin', 'hod'];
    default:
      return ['admin'];
  }
}

// Authorized Admin / Office Staff members with full administrative privileges
export const ADMIN_OFFICE_STAFF: User[] = [
  {
    _id: 'usr_admin_malay',
    id: 'usr_admin_malay',
    name: 'Malay Aggarwal',
    email: 'malay@sunstone.in',
    role: 'admin',
    department: 'Central Administration & Activation Node',
    designation: 'Assistant Vice President',
    businessRole: 'Activation Head',
    facultyId: 'SUN-ADM-01',
    avatar: '/assets/faculty/malay_aggarwal.jpeg',
    phone: '+91 98100 11001',
    room: 'Main Admin Building, Suite 101',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_admin_arpit',
    id: 'usr_admin_arpit',
    name: 'Arpit Singh',
    email: 'arpit.singh@sunstone.in',
    role: 'admin',
    department: 'Campus Operations & Asset Management',
    designation: 'Senior Associate',
    businessRole: 'Campus Manager',
    facultyId: 'SUN-OPS-02',
    avatar: '/assets/faculty/arpit_singh.jpeg',
    phone: '+91 98100 22002',
    room: 'Campus Operations Desk, Bay 1',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_harpreet_a',
    id: 'usr_fac_harpreet_a',
    name: 'Harpreet Aulakh',
    email: 'harpreet.aulakh@sunstone.in',
    role: 'admin',
    department: 'Corporate Training & Placement Cell',
    designation: 'Associate Director',
    businessRole: 'Director & Placement Head',
    facultyId: 'SUN-CORP-01',
    avatar: '/assets/faculty/harpreet_aulakh.jpeg',
    phone: '+91 98102 22004',
    room: 'Placement & Corporate Wing, Room 101',
    approvalStatus: 'approved',
  },
];

// Authorized Academic Faculty Members (Faculty-side access & Dual Role)
export const AUTHORIZED_FACULTY_MEMBERS: User[] = [
  {
    _id: 'usr_fac_harpreet_a',
    id: 'usr_fac_harpreet_a',
    name: 'Harpreet Aulakh',
    email: 'harpreet.aulakh@sunstone.in',
    role: 'admin',
    department: 'Corporate Training & Placement Cell',
    designation: 'Associate Director',
    businessRole: 'Director & Placement Head',
    facultyId: 'SUN-CORP-01',
    avatar: '/assets/faculty/harpreet_aulakh.jpeg',
    phone: '+91 98102 22004',
    room: 'Placement & Corporate Wing, Room 101',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_gaganjit',
    id: 'usr_fac_gaganjit',
    name: 'Gaganjit Kaur',
    email: 'gaganjit.kaur@sunstone.in',
    role: 'faculty',
    department: 'Department of Management Studies',
    designation: 'Deputy Professor',
    businessRole: 'Management Faculty',
    facultyId: 'SUN-MGT-02',
    avatar: '/assets/faculty/gaganjit_kaur.jpeg',
    phone: '+91 98106 66012',
    room: 'Management Block, Cabin 201',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_priyanka',
    id: 'usr_fac_priyanka',
    name: 'Priyanka Dhiman',
    email: 'priyanka.dhiman@sunstone.in',
    role: 'faculty',
    department: 'Department of Management Studies',
    designation: 'Associate Professor',
    businessRole: 'Management Faculty & Engagement Coordinator',
    facultyId: 'SUN-MGT-03',
    avatar: '/assets/faculty/priyanka_dhiman.jpeg',
    phone: '+91 98105 55009',
    room: 'Management Block, Cabin 202',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_surbhi',
    id: 'usr_fac_surbhi',
    name: 'Surbhi Sharma',
    email: 'surbhi.sharma@sunstone.in',
    role: 'faculty',
    department: 'Department of Management Studies',
    designation: 'Associate Professor',
    businessRole: 'Management Faculty',
    facultyId: 'SUN-MGT-04',
    avatar: '/assets/faculty/surbhi_sharma.jpeg',
    phone: '+91 98104 44007',
    room: 'Management Block, Cabin 203',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_archana',
    id: 'usr_fac_archana',
    name: 'Archana Salaria',
    email: 'archana.salaria@sunstone.in',
    role: 'faculty',
    department: 'Department of Computer Science & Engineering',
    designation: 'Associate Professor',
    businessRole: 'Tech Faculty',
    facultyId: 'SUN-TECH-05',
    avatar: '/assets/faculty/archana_salaria.jpeg',
    phone: '+91 98101 11002',
    room: 'Tech Academic Block A, Cabin 301',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_bhawana',
    id: 'usr_fac_bhawana',
    name: 'Bhawana Saini',
    email: 'bhawana.saini@sunstone.in',
    role: 'faculty',
    department: 'Department of Computer Science & Engineering',
    designation: 'Associate Professor',
    businessRole: 'Tech Faculty',
    facultyId: 'SUN-TECH-06',
    avatar: '/assets/faculty/bhawana_saini.jpeg',
    phone: '+91 98105 55010',
    room: 'Tech Academic Block A, Cabin 302',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_harpreet_k',
    id: 'usr_fac_harpreet_k',
    name: 'Harpreet Kaur',
    email: 'harpreet.kaur@sunstone.in',
    role: 'faculty',
    department: 'Corporate Training & Placement Cell',
    designation: 'Assistant Manager',
    businessRole: 'Corporate Trainer',
    facultyId: 'SUN-CORP-07',
    avatar: '/assets/faculty/harpreet_kaur.jpeg',
    phone: '+91 98106 66011',
    room: 'Corporate Training Studio 1',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_jahanvi',
    id: 'usr_fac_jahanvi',
    name: 'Jahanvi Garg',
    email: 'jahanvi.garg@sunstone.in',
    role: 'faculty',
    department: 'Training & Skill Development Cell',
    designation: 'Assistant Manager',
    businessRole: 'Aptitude Trainer',
    facultyId: 'SUN-TRAIN-08',
    avatar: '/assets/faculty/jahanvi_garg.jpeg',
    phone: '+91 98102 22003',
    room: 'Aptitude Lab Wing, Cabin 104',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_adil',
    id: 'usr_fac_adil',
    name: 'Adil Raja',
    email: 'adil.raja@sunstone.in',
    role: 'faculty',
    department: 'Department of Computer Science & Engineering',
    designation: 'Assistant Professor',
    businessRole: 'Tech Faculty',
    facultyId: 'SUN-TECH-09',
    avatar: '/assets/faculty/adil_raja.jpeg',
    phone: '+91 98104 44008',
    room: 'Tech Academic Block A, Cabin 204',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_simran',
    id: 'usr_fac_simran',
    name: 'Simran Khera',
    email: 'simran.khera@sunstone.in',
    role: 'faculty',
    department: 'Department of Electronics & Communication',
    designation: 'Assistant Professor',
    businessRole: 'Tech Faculty',
    facultyId: 'SUN-TECH-10',
    avatar: '/assets/faculty/simran_khera.jpeg',
    phone: '+91 98103 33006',
    room: 'VLSI Wing Block C, Cabin 302',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_harsh',
    id: 'usr_fac_harsh',
    name: 'Harsh Katariya',
    email: 'harsh.katariya@sunstone.in',
    role: 'faculty',
    department: 'Department of Electronics & Communication',
    designation: 'Assistant Professor',
    businessRole: 'Tech Faculty',
    facultyId: 'SUN-TECH-11',
    avatar: '/assets/faculty/harsh_katariya.jpeg',
    phone: '+91 98103 33005',
    room: 'VLSI Wing Block C, Cabin 301',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_mohini',
    id: 'usr_fac_mohini',
    name: 'Mohini Gupta',
    email: 'mohini.gupta@sunstone.in',
    role: 'faculty',
    department: 'Department of Computer Science & Engineering',
    designation: 'Assistant Professor',
    businessRole: 'Tech Faculty',
    facultyId: 'SUN-TECH-12',
    avatar: '/assets/faculty/mohini_gupta.jpeg',
    phone: '+91 98101 11001',
    room: 'Tech Academic Block A, Cabin 201',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_kavita',
    id: 'usr_fac_kavita',
    name: 'Ms. Kavita Thakur',
    email: 'kavita.thakur@sunstone.in',
    role: 'faculty',
    department: 'Training & Skill Development Cell',
    designation: 'Senior Associate',
    businessRole: 'Student Guidance & Academic Counseling',
    facultyId: 'SUN-TRAIN-13',
    avatar: '/assets/faculty/kavita_thakur.jpeg',
    phone: '+91 98107 77013',
    room: 'Student Guidance Wing, Cabin 304',
    approvalStatus: 'approved',
  },
  {
    _id: 'usr_fac_rhythm',
    id: 'usr_fac_rhythm',
    name: 'Ms. Rhythm Dua',
    email: 'rhythm.dua@sunstone.in',
    role: 'faculty',
    department: 'Corporate Training & Placement Cell',
    designation: 'Business Development Manager',
    businessRole: 'Industry Relations & Corporate Partnerships',
    facultyId: 'SUN-CORP-14',
    avatar: '/assets/faculty/rhythm_dua.jpeg',
    phone: '+91 98108 88014',
    room: 'Executive Suite 102, Main Admin Block',
    approvalStatus: 'approved',
  },
];

// All Institutional Personnel (Admin & Faculty)
export const ALL_INSTITUTIONAL_MEMBERS: User[] = [
  ...ADMIN_OFFICE_STAFF,
  ...AUTHORIZED_FACULTY_MEMBERS,
];

// Institutional Leadership & Directors (Associate Director Harpreet Aulakh & AVP Malay Aggarwal)
export const INSTITUTIONAL_LEADERSHIP: User[] = [
  ADMIN_OFFICE_STAFF[2], // Harpreet Aulakh (Associate Director & Admin Officer)
  ADMIN_OFFICE_STAFF[0], // Malay Aggarwal (Assistant Vice President)
];

