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
  phone?: string;
  room?: string;
  avatar?: string;
  status: 'active' | 'deactivated' | 'removed';
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
  buildingBlock?: string;
  headOfDept?: string;
  hodName?: string;
  description?: string;
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
  barcodeValue?: string;
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
  isExtraUnitRequest?: boolean;
  existingCustodyNote?: string;
  allottedDirectly?: boolean;
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

export interface BrandingSettings {
  appName: string;
  badgeText: string;
  collegeSubtitle: string;
  logoUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_BRANDING: BrandingSettings = {
  appName: 'AssetHub',
  badgeText: 'ERP',
  collegeSubtitle: 'College Asset Mgmt',
  logoUrl: '',
};

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
  linkedBookingId?: string;
  allotmentType?: BookingType;
  isExtraUnit?: boolean;
  isCatalogAsset?: boolean;
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

// Authorized Admin / Office Staff members with full administrative privileges (ONLY Malay Aggarwal & Arpit Singh by default)
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
];

// Authorized Academic Faculty Members (Full Faculty Portal access only)
export const AUTHORIZED_FACULTY_MEMBERS: User[] = [
  {
    _id: 'usr_fac_harpreet_a',
    id: 'usr_fac_harpreet_a',
    name: 'Harpreet Aulakh',
    email: 'harpreet.aulakh@sunstone.in',
    role: 'faculty',
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
  AUTHORIZED_FACULTY_MEMBERS[0], // Harpreet Aulakh (Associate Director - Faculty Portal)
  ADMIN_OFFICE_STAFF[0], // Malay Aggarwal (Assistant Vice President - Admin Portal)
];

/**
 * Merges the official baseline staff roster with live Firestore staff_directory overrides.
 * Supports adding new faculty/admin, editing existing official members, role changes, and removals.
 */
export function buildMergedStaffLists(staffDirectory: StaffMember[] = []): {
  admins: User[];
  faculty: User[];
  allActive: User[];
  allDirectory: StaffMember[];
} {
  const dummyPlaceholderEmails = new Set([
    'admin@assethub.edu',
    'faculty@assethub.edu',
    'tech@assethub.edu',
  ]);

  const byEmail = new Map<string, StaffMember>();
  const byId = new Map<string, StaffMember>();

  // 1. Seed with official defaults
  [...ADMIN_OFFICE_STAFF, ...AUTHORIZED_FACULTY_MEMBERS].forEach((u) => {
    const emailKey = (u.email || '').toLowerCase().trim();
    const rec: StaffMember = {
      _id: u._id,
      id: u.id || u._id,
      employeeId: u.facultyId,
      facultyId: u.facultyId,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      designation: u.designation,
      businessRole: u.businessRole,
      phone: u.phone,
      room: u.room,
      avatar: u.avatar,
      status: 'active',
      registered: true,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };
    byEmail.set(emailKey, rec);
    byId.set(rec._id, rec);
  });

  // 2. Apply live Firestore overrides (oldest first so newest add/edit always wins)
  const orderedLive = [...(staffDirectory || [])].sort((a, b) => {
    const ta = a.updatedAt || a.createdAt || '';
    const tb = b.updatedAt || b.createdAt || '';
    return ta.localeCompare(tb);
  });

  orderedLive.forEach((live) => {
    const emailKey = (live.email || '').toLowerCase().trim();
    if (!emailKey || dummyPlaceholderEmails.has(emailKey)) {
      return;
    }

    const existing = byId.get(live.id || live._id) || byEmail.get(emailKey);
    const merged: StaffMember = {
      ...(existing || {}),
      ...live,
      id: live.id || live._id || existing?.id || `staff_${emailKey}`,
      _id: live._id || live.id || existing?._id || `staff_${emailKey}`,
      avatar: live.avatar || existing?.avatar,
      facultyId: live.facultyId || live.employeeId || existing?.facultyId,
      employeeId: live.employeeId || live.facultyId || existing?.employeeId,
      businessRole: live.businessRole || existing?.businessRole,
      phone: live.phone || existing?.phone,
      room: live.room || existing?.room,
    };

    // If email changed on an existing official record, clear old email key
    if (existing && existing.email.toLowerCase().trim() !== emailKey) {
      byEmail.delete(existing.email.toLowerCase().trim());
    }

    // Ensure Harpreet Aulakh is strictly faculty unless explicitly overridden via a new live edit
    if (emailKey === 'harpreet.aulakh@sunstone.in' && !live.updatedAt) {
      merged.role = 'faculty';
    }

    byEmail.set(emailKey, merged);
    byId.set(merged._id, merged);
  });

  // 3. Build lists excluding permanently removed records
  const allDirectory = Array.from(byEmail.values()).filter((s) => s.status !== 'removed');

  const toUser = (s: StaffMember): User => ({
    _id: s._id,
    id: s.id || s._id,
    name: s.name,
    email: s.email,
    role: s.role,
    department: s.department,
    designation: s.designation || (s.role === 'admin' ? 'Office Administrator' : 'Faculty Member'),
    businessRole: s.businessRole || (s.role === 'admin' ? 'Admin / Office Staff' : 'Academic Faculty'),
    facultyId: s.facultyId || s.employeeId || `SUN-${(s.id || s._id).slice(-4).toUpperCase()}`,
    avatar: s.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.name)}`,
    phone: s.phone || '+91 98100 00000',
    room: s.room || (s.role === 'admin' ? 'Central Admin Office' : 'Faculty Wing'),
    approvalStatus: 'approved',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });

  const activeMembers = allDirectory.filter((s) => s.status !== 'deactivated').map(toUser);
  const admins = activeMembers.filter((u) => u.role === 'admin');
  const faculty = activeMembers.filter((u) => u.role !== 'admin');

  return {
    admins: admins.length > 0 ? admins : [...ADMIN_OFFICE_STAFF],
    faculty: faculty.length > 0 ? faculty : [...AUTHORIZED_FACULTY_MEMBERS],
    allActive: activeMembers,
    allDirectory,
  };
}

