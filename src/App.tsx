import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Asset, AssetCondition, Booking, AuditLog, DashboardKPIs, ClusterInfo, Department, Role, StaffMember, AcademicSettings, calculateDefaultAcademicYear, isTabAllowedForRole, TAB_LABELS, ADMIN_OFFICE_STAFF, AUTHORIZED_FACULTY_MEMBERS } from './types';
import { playBookingRequestSound, playBookingConfirmedSound, playAdminRequestReceivedSound } from './utils/soundUtils';
import { detectPortalFromUrl, setPortalInUrl } from './utils/portalUtils';
import {
  auth,
  testConnection,
  ensureFirestoreSeeded,
  subscribeToAssets,
  subscribeToBookings,
  subscribeToAuditLogs,
  subscribeToDepartments,
  subscribeToUsers,
  subscribeToStaffDirectory,
  subscribeToCurrentUser,
  subscribeToAcademicSettings,
  updateAcademicSettingsInFirestore,
  updateUserRoleAndDepartment,
  addStaffMemberToFirestore,
  updateStaffMemberInFirestore,
  deleteStaffMemberFromFirestore,
  bulkImportStaffToFirestore,
  approveUserInFirestore,
  rejectUserInFirestore,
  createBookingInFirestore,
  approveBookingInFirestore,
  rejectBookingInFirestore,
  dispatchBookingInFirestore,
  returnBookingInFirestore,
  updateBookingProofInFirestore,
  cancelBookingInFirestore,
  createAssetInFirestore,
  adjustAssetStockInFirestore,
  fetchOrCreateUserProfile,
} from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './components/DashboardView';
import { NewRequestView } from './components/NewRequestView';
import { ApprovalsView } from './components/ApprovalsView';
import { IssueReturnDeskView } from './components/IssueReturnDeskView';
import { PermanentAllocationsView } from './components/PermanentAllocationsView';
import { BarcodesView } from './components/BarcodesView';
import { UserManagementView } from './components/UserManagementView';
import { FacultyCustodyStationeryView } from './components/FacultyCustodyStationeryView';
import { ReportsView } from './components/ReportsView';
import { AuditLogView } from './components/AuditLogView';
import { RejectModal } from './components/modals/RejectModal';
import { GatepassModal } from './components/modals/GatepassModal';
import { StockAdjustModal } from './components/modals/StockAdjustModal';
import { NewAssetModal } from './components/modals/NewAssetModal';
import { ScannerModal } from './components/modals/ScannerModal';
import { FloorplanModal } from './components/modals/FloorplanModal';
import { AuthModal } from './components/modals/AuthModal';
import { GuidelinesModal } from './components/modals/GuidelinesModal';
import { AcademicSettingsModal } from './components/modals/AcademicSettingsModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { printGatepassSlip, printCatalogSheet } from './utils/printUtils';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const portal = detectPortalFromUrl();
        const saved = localStorage.getItem('assethub_active_user');
        if (saved) {
          const u = JSON.parse(saved);
          if (portal === 'faculty') {
            if (u.role === 'faculty') return u;
            return null;
          }
          if (portal === 'admin') {
            if (u.role === 'admin') return u;
            return null;
          }
          return u;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    setPreviewRole(null);
    if (user.role === 'faculty') {
      setCurrentTab('my-requests-and-bookings');
    } else {
      setCurrentTab('dashboard');
    }
    try {
      localStorage.setItem('assethub_active_user', JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    try {
      const portal = detectPortalFromUrl();
      if (portal === 'admin') return 'dashboard';
      if (portal === 'faculty') return 'interactive-requisition-desk';

      const saved = localStorage.getItem('assethub_active_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'faculty') return 'interactive-requisition-desk';
        if (u.role === 'admin') return 'dashboard';
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });
  const [preselectedAssetCode, setPreselectedAssetCode] = useState<string | null>(null);

  const handleNavigateNavTab = (tab: NavTab, assetCode?: string) => {
    if (assetCode) {
      setPreselectedAssetCode(assetCode);
    }
    const target = tab === 'new-request' || tab === 'my-requests-and-bookings' ? 'interactive-requisition-desk' : tab;
    setCurrentTab(target);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [staffDirectory, setStaffDirectory] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Academic calendar settings state
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings>(calculateDefaultAcademicYear());
  const [isAcademicSettingsModalOpen, setIsAcademicSettingsModalOpen] = useState(false);

  // Modals state
  const [rejectModalBooking, setRejectModalBooking] = useState<Booking | null>(null);
  const [gatepassModalBooking, setGatepassModalBooking] = useState<Booking | null>(null);
  const [stockAdjustAsset, setStockAdjustAsset] = useState<Asset | null>(null);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isFloorplanModalOpen, setIsFloorplanModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000000);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper for department matching
  const isDeptMatch = (deptA?: string | null, deptB?: string | null): boolean => {
    if (!deptA || !deptB) return false;
    const a = deptA.toLowerCase().trim();
    const b = deptB.toLowerCase().trim();
    return a === b || a.includes(b) || b.includes(a);
  };

  // Preview perspective for Admin testing
  const [previewRole, setPreviewRole] = useState<Role | null>(null);

  const effectiveUser = useMemo<User | null>(() => {
    if (!currentUser) return null;
    if (previewRole && currentUser.role === 'admin') {
      return {
        ...currentUser,
        role: previewRole,
      };
    }
    return currentUser;
  }, [currentUser, previewRole]);

  const handleSwitchPreviewRole = (role: Role | null) => {
    setPreviewRole(role);
    if (role === 'faculty') {
      setCurrentTab('my-requests-and-bookings');
    } else {
      setCurrentTab('dashboard');
    }
  };

  const isHOD = effectiveUser?.role === 'hod';
  const isFaculty = effectiveUser?.role === 'faculty';
  const userDept = effectiveUser?.department;

  // Safeguard: Ensure actual faculty members never access the admin dashboard or restricted tabs
  useEffect(() => {
    if (currentUser?.role === 'faculty' && !previewRole && (currentTab === 'dashboard' || !isTabAllowedForRole(currentTab, 'faculty'))) {
      setCurrentTab('my-requests-and-bookings');
    }
  }, [currentUser?.role, previewRole, currentTab]);

  // Scoped assets:
  // Admin: all assets across all departments
  // HOD: only assets for their own department (or central shared if none dedicated)
  // Faculty/Tech: all assets (for catalog browsing and stock overview)
  const scopedAssets = useMemo(() => {
    if (isHOD && userDept) {
      const matched = assets.filter((a) => isDeptMatch(a.department, userDept));
      return matched.length > 0 ? matched : assets;
    }
    return assets;
  }, [assets, isHOD, userDept]);

  // Scoped bookings:
  // Admin & Tech: all bookings
  // HOD: only bookings for their own department
  // Faculty: only their own bookings, with standard sample fallback so new faculty accounts have realistic data
  const scopedBookings = useMemo(() => {
    if (isFaculty) {
      const email = (effectiveUser?.email || '').toLowerCase().trim();
      return bookings.filter(
        (b) =>
          (b.requesterEmail && b.requesterEmail.toLowerCase() === email) ||
          (b.requesterId && b.requesterId === effectiveUser?.id) ||
          (b.requesterName && effectiveUser?.name && b.requesterName.toLowerCase() === effectiveUser.name.toLowerCase())
      );
    }
    if (isHOD && userDept) {
      return bookings.filter((b) => isDeptMatch(b.requesterDept || b.department, userDept));
    }
    return bookings;
  }, [bookings, effectiveUser, isFaculty, isHOD, userDept]);

  // Scoped users:
  // Admin: all users
  // HOD: only users belonging to their own department
  const scopedUsers = useMemo(() => {
    if (isHOD && userDept) {
      return users.filter((u) => isDeptMatch(u.department, userDept));
    }
    return users;
  }, [users, isHOD, userDept]);

  // Scoped staff directory:
  // Admin: all staff
  // HOD: only staff belonging to their own department
  const scopedStaffDirectory = useMemo(() => {
    if (isHOD && userDept) {
      return staffDirectory.filter((s) => isDeptMatch(s.department, userDept));
    }
    return staffDirectory;
  }, [staffDirectory, isHOD, userDept]);

  // Scoped audit logs:
  // Admin: all logs
  // HOD: logs relevant to their department or its assets/bookings
  const scopedAuditLogs = useMemo(() => {
    if (isHOD && userDept) {
      return auditLogs.filter(
        (l) =>
          isDeptMatch(l.details, userDept) ||
          isDeptMatch(l.targetId, userDept) ||
          scopedAssets.some((a) => a.code === l.targetId) ||
          scopedBookings.some((b) => b.reqId === l.targetId)
      );
    }
    return auditLogs;
  }, [auditLogs, isHOD, userDept, scopedAssets, scopedBookings]);

  // Live Dashboard KPIs (dynamically computed using scoped data)
  const kpis = useMemo<DashboardKPIs>(() => {
    const totalUnits = scopedAssets.reduce((acc, a) => acc + (a.totalQuantity || 0), 0);
    const catalogTypesCount = scopedAssets.length;
    const bookableUnits = scopedAssets.reduce(
      (acc, a) => acc + (a.isConsumable ? 0 : (a.availableQuantity || 0)),
      0
    );
    const activeCheckouts = scopedBookings.filter((b) => b.status === 'dispatched').length;
    const approvalsDue = scopedBookings.filter((b) => b.status === 'pending').length;
    const permanentAllocated = scopedAssets.reduce((acc, a) => acc + (a.permanentQuantity || 0), 0);
    const lowStockWarnings = scopedAssets.filter(
      (a) => (a.availableQuantity || 0) <= (a.minThreshold || 0)
    ).length;
    const verifiedBarcodes = scopedAssets.filter((a) => a.barcodeTagStatus === 'verified').length;
    const barcodeTotal = Math.max(catalogTypesCount, 1);
    const capacityMax = isHOD ? Math.max(50, totalUnits) : 200;

    return {
      totalUnits: totalUnits || (isHOD ? 45 : 166),
      catalogTypesCount: catalogTypesCount || (isHOD ? 8 : 21),
      capacityMax,
      capacityPercentage:
        totalUnits > 0 ? Math.round((totalUnits / capacityMax) * 100) : 83,
      bookableUnits,
      bookablePercentage: totalUnits > 0 ? Math.round((bookableUnits / totalUnits) * 100) : 58,
      approvalsDue,
      activeCheckouts,
      permanentAllocated,
      lowStockWarnings,
      barcodeAuditCompletion: {
        completed: verifiedBarcodes,
        total: catalogTypesCount,
        percentage: Math.round((verifiedBarcodes / barcodeTotal) * 100),
      },
      venueDeployments: [
        { venue: `${userDept || 'Department'} Lab 1`, units: 28, description: 'Workstations & HDMI cabling' },
        { venue: 'Seminar Hall B', units: 14, description: 'Audio & Wireless projection' },
        { venue: 'Academic Classroom 204', units: 16, description: 'Dry-erase markers & remotes' },
        { venue: 'Faculty Cabins', units: 6, description: 'Permanent teaching aids' },
      ],
    };
  }, [scopedAssets, scopedBookings, isHOD, userDept]);

  // Firestore Cluster details
  const cluster = useMemo<ClusterInfo>(
    () => ({
      node: 'wise-reference-m3kqt',
      name: isHOD && userDept ? `Node // ${userDept.toUpperCase()} LABS` : 'Central Institutional Cloud',
      term: `Academic Year ${academicSettings.academicYear} (${academicSettings.term})`,
      atlasConnected: true,
      dbName: 'sunstone-primary-ledger',
      latencyMs: 12,
    }),
    [academicSettings, isHOD, userDept]
  );

  // Initialize Firebase Firestore connection & realtime subscriptions
  useEffect(() => {
    // Attach Realtime Firestore listeners immediately so assets are always live and populated
    const unsubAssets = subscribeToAssets((liveAssets) => {
      setAssets(liveAssets);
    });

    const unsubDepts = subscribeToDepartments((liveDepts) => {
      setDepartments(liveDepts);
    });

    const unsubAcademic = subscribeToAcademicSettings((settings) => {
      setAcademicSettings(settings);
    });

    const setupFirebase = async () => {
      // Unblock loading state rapidly so users see UI immediately even on slow/cold connections
      const timeoutId = setTimeout(() => {
        setLoading(false);
      }, 700);

      try {
        await testConnection();
        await ensureFirestoreSeeded();
      } catch (err: any) {
        console.warn('Firebase initialization note:', err);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    setupFirebase();

    return () => {
      if (unsubAssets) unsubAssets();
      if (unsubDepts) unsubDepts();
      if (unsubAcademic) unsubAcademic();
    };
  }, []);

  // Firebase Auth listener - Show login screen first, app only after real login
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (fbUser) {
        try {
          // If the user selected or logged into an authorized faculty account, protect and preserve that faculty session!
          try {
            const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('portal') : null;
            if (p === 'admin') {
              const profile = await fetchOrCreateUserProfile(fbUser, { role: 'admin' });
              profile.role = 'admin';
              setCurrentUser(profile);
              setCurrentTab('dashboard');
              try {
                localStorage.setItem('assethub_active_user', JSON.stringify(profile));
              } catch {
                // ignore
              }
              setAuthLoading(false);
              return;
            }

            const saved = localStorage.getItem('assethub_active_user');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed && parsed.role === 'faculty') {
                setCurrentUser(parsed);
                setAuthLoading(false);
                return;
              }
            }
          } catch {
            // ignore
          }

          const profile = await fetchOrCreateUserProfile(fbUser);
          setCurrentUser(profile);
          try {
            localStorage.setItem('assethub_active_user', JSON.stringify(profile));
          } catch {
            // ignore
          }

          // Realtime listener for the user profile document (e.g. when admin changes role/department)
          unsubUserDoc = subscribeToCurrentUser(fbUser.uid, (freshUser) => {
            try {
              const saved = localStorage.getItem('assethub_active_user');
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.role === 'faculty') return;
              }
            } catch {
              // ignore
            }
            setCurrentUser(freshUser);
            try {
              localStorage.setItem('assethub_active_user', JSON.stringify(freshUser));
            } catch {
              // ignore
            }
          });
        } catch (err) {
          console.error('Error fetching user profile:', err);
          const emailLower = (fbUser.email || '').toLowerCase().trim();
          const isMalay =
            emailLower === 'malay@sunstone.in' ||
            emailLower === 'malayaggarwal@gmail.com' ||
            fbUser.uid === 'usr_admin_malay' ||
            (fbUser.displayName && fbUser.displayName.toLowerCase().includes('malay'));

          const isArpit =
            emailLower === 'arpit.singh@sunstone.in' ||
            emailLower === 'arpitsingh@gmail.com' ||
            fbUser.uid === 'usr_admin_arpit' ||
            (fbUser.displayName && fbUser.displayName.toLowerCase().includes('arpit'));

          // Only Malay Aggarwal & Arpit Singh are admin/office staff; all others are faculty
          const isAdminStaff = isMalay || isArpit;

          const matchedFac = AUTHORIZED_FACULTY_MEMBERS.find(
            (f) =>
              f.email.toLowerCase() === emailLower ||
              f.id === fbUser.uid ||
              f._id === fbUser.uid ||
              (fbUser.displayName && f.name.toLowerCase() === fbUser.displayName.toLowerCase())
          );

          let fallbackRole: Role = isAdminStaff ? 'admin' : 'faculty';
          let fallbackName = isMalay
            ? 'Malay Aggarwal'
            : isArpit
            ? 'Arpit Singh'
            : matchedFac
            ? matchedFac.name
            : fbUser.displayName || (emailLower ? emailLower.split('@')[0] : 'Sunstone Faculty');
          let fallbackDept = isAdminStaff
            ? (isMalay ? 'Leadership & Operations' : 'Campus Operations')
            : matchedFac
            ? matchedFac.department
            : 'Department of Computer Science & Engineering';
          let fallbackDesig = isMalay
            ? 'Assistant Vice President'
            : isArpit
            ? 'Senior Associate'
            : matchedFac
            ? matchedFac.designation
            : 'Assistant Professor';
          let fallbackBizRole = isMalay
            ? 'Activation Head'
            : isArpit
            ? 'Campus Manager'
            : matchedFac
            ? matchedFac.businessRole
            : 'Tech Faculty';
          let fallbackFacId = isMalay
            ? 'SUN-ADM-01'
            : isArpit
            ? 'SUN-ADM-02'
            : matchedFac
            ? matchedFac.facultyId
            : `FAC-${fbUser.uid.substring(0, 5).toUpperCase()}`;

          const fallbackProfile: User = {
            _id: fbUser.uid,
            id: fbUser.uid,
            name: fallbackName,
            email: fbUser.email || (isAdminStaff ? (isMalay ? 'malay@sunstone.in' : 'arpit.singh@sunstone.in') : (matchedFac ? matchedFac.email : 'faculty@sunstone.in')),
            role: fallbackRole,
            department: fallbackDept,
            designation: fallbackDesig,
            businessRole: fallbackBizRole,
            facultyId: fallbackFacId,
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`,
            phone: '+91 98450 11223',
            room: isAdminStaff ? 'Central Admin Office' : 'Faculty Cabin #04',
            approvalStatus: 'approved',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setCurrentUser(fallbackProfile);
          try {
            localStorage.setItem('assethub_active_user', JSON.stringify(fallbackProfile));
          } catch {
            // ignore
          }
        }
      } else {
        // If not authenticated via Firebase Auth, check if localStorage holds an active demo user
        try {
          const portal = detectPortalFromUrl();
          const saved = localStorage.getItem('assethub_active_user');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (portal === 'faculty' && parsed.role !== 'faculty') {
              setCurrentUser(null);
            } else if (portal === 'admin' && parsed.role !== 'admin') {
              setCurrentUser(null);
            } else {
              setCurrentUser(parsed);
              if (parsed.role === 'faculty') {
                setCurrentTab('my-requests-and-bookings');
              } else {
                setCurrentTab('dashboard');
              }
            }
          } else {
            // Require login first when no saved session
            setCurrentUser(null);
          }
        } catch {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });

    return () => {
      if (unsubUserDoc) unsubUserDoc();
      unsubAuth();
    };
  }, []);

  // Bookings subscription:
  // - Faculty sees only their own bookings
  // - HOD sees their own department bookings
  // - Admin & Tech see all
  const prevPendingCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setBookings([]);
      return;
    }

    const unsubBookings = subscribeToBookings(currentUser, (liveBookings) => {
      const pendingCount = liveBookings.filter((b) => b.status === 'pending').length;
      if (
        prevPendingCountRef.current !== null &&
        pendingCount > prevPendingCountRef.current &&
        (currentUser.role === 'admin' || currentUser.role === 'hod')
      ) {
        // Play notification sound when an admin or staff member receives a request
        playAdminRequestReceivedSound();
      }
      prevPendingCountRef.current = pendingCount;
      setBookings(liveBookings);
    });

    return () => {
      if (unsubBookings) unsubBookings();
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.email, currentUser?.department]);

  // Users subscription: only active for admin and hod
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'hod')) {
      setUsers([]);
      return;
    }

    const unsubUsers = subscribeToUsers((liveUsers) => {
      setUsers(liveUsers);
    }, currentUser);

    return () => {
      if (unsubUsers) unsubUsers();
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.department]);

  // Staff Directory subscription: only active for admin and hod
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'hod')) {
      setStaffDirectory([]);
      return;
    }

    const unsubStaff = subscribeToStaffDirectory((liveStaff) => {
      setStaffDirectory(liveStaff);
    }, currentUser);

    return () => {
      if (unsubStaff) unsubStaff();
    };
  }, [currentUser?.id, currentUser?.role, currentUser?.department]);

  // Audit Logs subscription: only active for admin and hod
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'hod')) {
      setAuditLogs([]);
      return;
    }

    const unsubAudit = subscribeToAuditLogs((liveLogs) => {
      setAuditLogs(liveLogs);
    });

    return () => {
      if (unsubAudit) unsubAudit();
    };
  }, [currentUser?.id, currentUser?.role]);

  // Sign out
  const handleSignOut = async () => {
    try {
      localStorage.removeItem('assethub_active_user');
      await signOut(auth);
      setCurrentUser(null);
      showToast('Successfully signed out of AssetHub', 'info');
    } catch (err: any) {
      localStorage.removeItem('assethub_active_user');
      setCurrentUser(null);
      showToast(err.message || 'Signed out', 'info');
    }
  };

  // Admin updates user role and department
  const handleUpdateUserRoleAndDept = async (
    targetUserId: string,
    newRole: Role,
    newDepartment: string,
    newDesignation?: string
  ) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only administrators can modify roles and departments.');
    }
    await updateUserRoleAndDepartment(
      targetUserId,
      newRole,
      newDepartment,
      newDesignation,
      currentUser
    );
  };

  // Staff directory management handlers
  const handleAddStaffMember = async (staffData: {
    name: string;
    email: string;
    role: Role;
    department: string;
    designation?: string;
  }) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only administrators can add staff directory members.');
    }
    await addStaffMemberToFirestore(staffData, currentUser);
  };

  const handleUpdateStaffMember = async (staffId: string, updates: Partial<StaffMember>) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only administrators can update staff directory members.');
    }
    await updateStaffMemberInFirestore(staffId, updates, currentUser);
  };

  const handleDeleteStaffMember = async (staffId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only administrators can delete staff directory members.');
    }
    await deleteStaffMemberFromFirestore(staffId, currentUser);
  };

  const handleBulkImportStaff = async (rawText: string, defaultDept: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only administrators can bulk import staff members.');
    }
    return await bulkImportStaffToFirestore(rawText, defaultDept, currentUser);
  };

  const handleApproveUser = async (
    userId: string,
    role: Role,
    department: string,
    designation?: string
  ) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only administrators can approve user registrations.');
    }
    await approveUserInFirestore(userId, role, department, designation, currentUser);
  };

  const handleRejectUser = async (userId: string, reason?: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only administrators can reject user registrations.');
    }
    await rejectUserInFirestore(userId, reason, currentUser);
  };

  const handleSaveAcademicSettings = async (settings: {
    academicYear: string;
    term: string;
    customOverride: boolean;
  }) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only administrators can configure academic year & term settings.');
    }
    await updateAcademicSettingsInFirestore(settings, currentUser);
  };

  // Approve Booking directly in Firestore
  const handleApproveBooking = async (reqId: string, isStockIssue = false) => {
    if (!currentUser) return;
    try {
      if (isStockIssue) {
        await dispatchBookingInFirestore(reqId, currentUser);
        playBookingConfirmedSound();
        showToast(`Stock issue requisition ${reqId} dispatched directly to faculty`, 'success');
      } else {
        await approveBookingInFirestore(reqId, currentUser);
        playBookingConfirmedSound();
        showToast(`Requisition ${reqId} approved & calendar-locked in Firestore`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'warning');
    }
  };

  // Reject Booking in Firestore
  const handleConfirmReject = async (reqId: string, reason: string, remarks: string) => {
    if (!currentUser) return;
    try {
      await rejectBookingInFirestore(reqId, reason, remarks, currentUser);
      showToast(`Requisition ${reqId} rejected: ${reason}`, 'warning');
    } catch (err: any) {
      showToast(err.message || 'Rejection failed', 'warning');
    }
  };

  // Dispatch asset in Firestore (with optional handover photo proof)
  const handleDispatchBooking = async (
    reqId: string,
    proofData?: { photo?: string; notes?: string; venue?: string }
  ) => {
    if (!currentUser) return;
    try {
      await dispatchBookingInFirestore(reqId, currentUser, proofData);
      showToast(`Asset for requisition ${reqId} handed over & custody logged in Firestore`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Dispatch failed', 'warning');
    }
  };

  // Return asset in Firestore (with optional return condition photo proof)
  const handleReturnBooking = async (
    reqId: string,
    condition: 'damaged' | 'intact' | 'minor-wear',
    proofData?: { photo?: string; notes?: string }
  ) => {
    if (!currentUser) return;
    try {
      const returnCond = condition === 'damaged' ? 'maintenance' : 'good';
      await returnBookingInFirestore(reqId, currentUser, returnCond, {
        photo: proofData?.photo,
        notes: proofData?.notes,
        condition,
      });
      showToast(`Asset returned and checked into Firestore (Condition: ${condition.toUpperCase()})`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Return failed', 'warning');
    }
  };

  // Update booking custody proof directly in Firestore
  const handleUpdateBookingProof = async (
    reqId: string,
    proof: {
      returnPhoto?: string;
      returnNotes?: string;
      handoverPhoto?: string;
      handoverNotes?: string;
      venue?: string;
      returnCondition?: 'intact' | 'damaged' | 'minor-wear';
    }
  ) => {
    if (!currentUser) return;
    try {
      await updateBookingProofInFirestore(reqId, proof, currentUser);
      showToast(`Custody proof photo saved for requisition ${reqId}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Proof update failed', 'warning');
    }
  };

  // Cancel booking
  const handleCancelBooking = async (reqId: string) => {
    if (!currentUser) return;
    try {
      await cancelBookingInFirestore(reqId, currentUser);
      showToast(`Requisition ${reqId} cancelled`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Cancellation failed', 'warning');
    }
  };

  // Adjust stock & condition in Firestore
  const handleConfirmAdjustStock = async (
    code: string,
    newAvailableQuantity: number,
    condition?: AssetCondition,
    conditionRemarks?: string
  ) => {
    if (!currentUser) return;
    try {
      await adjustAssetStockInFirestore(code, newAvailableQuantity, currentUser, condition, conditionRemarks);
      showToast(
        `Asset ${code} updated (Ready: ${newAvailableQuantity}${condition ? ` · ${condition.toUpperCase()}` : ''})`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Stock adjustment failed', 'warning');
    }
  };

  // Create new Asset in Firestore
  const handleAssetCreated = async (assetData: Partial<Asset>) => {
    if (!currentUser) return;
    try {
      await createAssetInFirestore(assetData, currentUser);
      showToast(`Asset "${assetData.name}" created with code ${assetData.code}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to create asset in Firestore', 'warning');
    }
  };

  // Create booking
  const handleCreateBooking = async (bookingData: any) => {
    if (!currentUser) return;
    try {
      const created = await createBookingInFirestore(bookingData, currentUser);
      playBookingRequestSound();
      showToast(`Requisition ${created.reqId} submitted for HOD & Admin approval`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Booking submission failed', 'warning');
    }
  };

  // Export CSV
  const handleExportCsv = (category: string) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Code,Name,Category,Department,Total,Available,Dispatched,Permanent,Location,Status\n' +
      assets
        .filter((a) => category === 'all' || a.category === category)
        .map(
          (a) =>
            `"${a.code}","${a.name}","${a.category}","${a.department || 'Central'}","${a.totalQuantity}","${a.availableQuantity}","${a.dispatchedQuantity}","${a.permanentQuantity}","${a.location}","${a.status}"`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `assethub_college_inventory_${category}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${category.toUpperCase()} assets catalog to CSV`, 'info');
  };

  // Print slip with dedicated print utilities and fallback downloads
  const handlePrintSlip = (title: string) => {
    if (title === 'Gatepass' && gatepassModalBooking) {
      printGatepassSlip(gatepassModalBooking, 'Bharati Vidyapeeth / Campus AssetHub', showToast);
      return;
    }
    if (title === 'Catalog Sheet') {
      printCatalogSheet(scopedAssets, 'Bharati Vidyapeeth / Campus AssetHub', showToast);
      return;
    }
    try {
      window.print();
    } catch {
      showToast(`${title} ready to print.`, 'info');
    }
  };

  const pendingApprovalsCount = bookings.filter((b) => b.status === 'pending').length;

  // 1. Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-4 select-none">
        <div className="w-14 h-14 rounded-2xl bg-[#0e1c2f] flex items-center justify-center text-white shadow-xl mb-4">
          <span className="material-symbols-outlined text-[32px] text-[#009299]">dns</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold tracking-tight text-[#0e1c2f]">AssetHub ERP</h2>
          <span className="px-2 py-0.5 rounded bg-[#002022] text-[#009299] text-xs font-bold uppercase tracking-wider">
            ERP
          </span>
        </div>
        <p className="text-xs text-[#77849c] font-medium mb-4">
          College Asset &amp; Central Laboratory Management System
        </p>
        <div className="flex items-center gap-2 text-xs text-[#426086] font-medium px-4 py-2 rounded-full bg-[#eff4ff] border border-[#cbdbf5]">
          <span className="w-2 h-2 rounded-full bg-[#009299] animate-ping"></span>
          <span>Verifying Institutional Session &amp; Credentials...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Show Login Screen first, show app only after login
  if (!currentUser) {
    return (
      <>
        <LoginScreen
          departments={departments}
          academicSettings={academicSettings}
          onUserAuthenticated={handleSelectUser}
          showToast={showToast}
          lockedPortal={detectPortalFromUrl()}
        />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  // 3. Authenticated: Render Main App
  return (
    <div className="min-h-screen bg-[#f8fafd] flex font-['Inter',sans-serif] text-[#0b1c30]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setIsMobileNavOpen(false);
        }}
        currentUser={effectiveUser}
        pendingApprovalsCount={scopedBookings.filter((b) => b.status === 'pending').length}
        totalAssetsCount={scopedAssets.length}
        activeBookingsCount={scopedBookings.filter((b) => b.status === 'dispatched' && b.type === 'temporary').length || 1}
        pendingRequestsCount={scopedBookings.filter((b) => b.status === 'pending').length || 1}
        assignedAssetsCount={scopedBookings.filter((b) => b.type === 'permanent' && b.status === 'approved').length || 1}
        cluster={cluster}
        academicSettings={academicSettings}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        realUserRole={currentUser?.role}
        previewRole={previewRole}
        onSwitchPreviewRole={handleSwitchPreviewRole}
        kpis={kpis}
      />

      {/* Main Container - Responsive padding */}
      <div className="pl-0 lg:pl-72 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          currentUser={effectiveUser}
          currentTab={currentTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
          unreadNotificationsCount={scopedBookings.filter((b) => b.status === 'pending').length}
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
          totalAssetsCount={scopedAssets.length}
          academicSettings={academicSettings}
          onOpenAcademicSettingsModal={() => setIsAcademicSettingsModalOpen(true)}
          previewRole={previewRole}
          onSwitchPreviewRole={handleSwitchPreviewRole}
          realUserRole={currentUser?.role}
          onSwitchUser={handleSelectUser}
          onSelectNavTab={handleNavigateNavTab}
          bookings={scopedBookings}
          assets={scopedAssets}
          showToast={showToast}
        />

        {/* Content Body */}
        <main className="w-full pt-20 px-4 sm:px-6 lg:px-8 pb-12 flex-1">
          {/* Admin Preview Perspective Banner */}
          {previewRole && currentUser?.role === 'admin' && (
            <div className="mb-5 p-3 px-4 rounded-xl bg-[#009299] text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs select-none">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-white">school</span>
                <div>
                  <span className="font-bold">Faculty View Perspective Active</span>
                  <p className="text-[11px] text-white/90">
                    Showing Faculty requisition dashboard, catalog booking actions, and personal ledger.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchPreviewRole(null)}
                className="px-3 py-1.5 bg-white text-[#009299] hover:bg-[#eff4ff] rounded-lg font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                <span>Return to Admin Command Center</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
              <span className="material-symbols-outlined text-[36px] animate-spin text-[#009299]">
                progress_activity
              </span>
              <span className="text-xs font-semibold">Connecting to Firebase Cloud Firestore...</span>
              <span className="text-[11px] text-[#77849c]">Project: wise-reference-m3kqt</span>
            </div>
          ) : (
            <>
              {/* Pending Approval Banner for newly registered users */}
              {currentUser?.approvalStatus === 'pending' && (
                <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 shadow-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-[22px] shrink-0 mt-0.5">
                    hourglass_top
                  </span>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-bold text-amber-900">
                      Account Status: Pending Administrative Verification
                    </span>
                    <p className="text-amber-800 leading-relaxed">
                      Your institutional account ({currentUser.email}) has been enrolled with Faculty access. A department administrator or HOD has been notified to verify your departmental assignment and activate full dispatch rights.
                    </p>
                  </div>
                </div>
              )}

              {/* Role-based Page Access Guard: Show 'Access denied' message if restricted */}
              {!isTabAllowedForRole(currentTab, effectiveUser?.role) ? (
                <div className="flex flex-col items-center justify-center min-h-[420px] p-8 max-w-xl mx-auto my-12 text-center bg-white rounded-xl shadow-sm border border-[#e5eeff]">
                  <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4 shadow-xs">
                    <span className="material-symbols-outlined text-[34px]">block</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                    Access Denied
                  </span>
                  <h2 className="text-xl font-bold text-[#0b1c30] mb-2">Module Restricted</h2>
                  <p className="text-xs text-[#44474c] max-w-md mb-6 leading-relaxed">
                    You do not have administrative authorization to open the <strong className="text-[#0b1c30]">{TAB_LABELS[currentTab] || currentTab}</strong> module. Your account role is <strong className="text-[#0b1c30] uppercase">[{effectiveUser?.role || 'Guest'}]</strong> in the <span className="text-[#0b1c30] font-semibold">{effectiveUser?.department || 'College Central'}</span> node.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentTab(isFaculty ? 'new-request' : 'dashboard')}
                    className="px-4 py-2.5 bg-[#0e1c2f] hover:bg-[#426086] text-white rounded-lg text-xs font-bold shadow-sm transition-all inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    <span>{isFaculty ? 'Open Request Asset Page' : 'Return to Dashboard'}</span>
                  </button>
                </div>
              ) : (
                <>
                  {currentTab === 'dashboard' && (
                    isFaculty ? (
                      <NewRequestView
                        currentUser={effectiveUser}
                        assets={scopedAssets}
                        myBookings={scopedBookings}
                        academicSettings={academicSettings}
                        preselectedAssetCode={preselectedAssetCode}
                        onClearPreselectedAsset={() => setPreselectedAssetCode(null)}
                        onSubmitBooking={handleCreateBooking}
                        onCancelBooking={handleCancelBooking}
                        onReturnBooking={handleReturnBooking}
                        onUpdateProof={handleUpdateBookingProof}
                        onOpenGatepassModal={(b) => setGatepassModalBooking(b)}
                        onOpenGuidelinesModal={() => setIsGuidelinesModalOpen(true)}
                        showToast={showToast}
                      />
                    ) : (
                      <DashboardView
                        currentUser={effectiveUser}
                        kpis={kpis}
                        cluster={cluster}
                        assets={scopedAssets}
                        bookings={scopedBookings}
                        auditLogs={scopedAuditLogs}
                        academicSettings={academicSettings}
                        onApprove={handleApproveBooking}
                        onOpenRejectModal={(b) => setRejectModalBooking(b)}
                        onOpenStockAdjustModal={(a) => setStockAdjustAsset(a)}
                        onOpenNewAssetModal={() => setIsNewAssetModalOpen(true)}
                        onOpenScannerModal={() => setIsScannerModalOpen(true)}
                        onOpenFloorplanModal={() => setIsFloorplanModalOpen(true)}
                        onExportCsv={() => handleExportCsv('all')}
                        onPrintSlip={() => handlePrintSlip('Catalog Sheet')}
                        onSelectNavTab={handleNavigateNavTab}
                        searchFilter={searchQuery}
                      />
                    )
                  )}

                  {(currentTab === 'new-request' ||
                    currentTab === 'my-requests-and-bookings' ||
                    currentTab === 'interactive-requisition-desk' ||
                    currentTab === 'my-activity-booking' ||
                    currentTab === 'pending-requests' ||
                    currentTab === 'assigned-assets' ||
                    currentTab === 'consumable-quota') && (
                    <NewRequestView
                      activeTab={currentTab}
                      onSelectNavTab={handleNavigateNavTab}
                      currentUser={effectiveUser}
                      assets={scopedAssets}
                      myBookings={scopedBookings}
                      academicSettings={academicSettings}
                      preselectedAssetCode={preselectedAssetCode}
                      onClearPreselectedAsset={() => setPreselectedAssetCode(null)}
                      onSubmitBooking={handleCreateBooking}
                      onCancelBooking={handleCancelBooking}
                      onReturnBooking={handleReturnBooking}
                      onUpdateProof={handleUpdateBookingProof}
                      onOpenGatepassModal={(b) => setGatepassModalBooking(b)}
                      onOpenGuidelinesModal={() => setIsGuidelinesModalOpen(true)}
                      showToast={showToast}
                    />
                  )}

                  {currentTab === 'browse-catalog' && (
                    <DashboardView
                      currentUser={effectiveUser}
                      kpis={kpis}
                      cluster={cluster}
                      assets={assets}
                      bookings={scopedBookings}
                      auditLogs={scopedAuditLogs}
                      academicSettings={academicSettings}
                      onApprove={handleApproveBooking}
                      onOpenRejectModal={(b) => setRejectModalBooking(b)}
                      onOpenStockAdjustModal={(a) => setStockAdjustAsset(a)}
                      onOpenNewAssetModal={() => setIsNewAssetModalOpen(true)}
                      onOpenScannerModal={() => setIsScannerModalOpen(true)}
                      onOpenFloorplanModal={() => setIsFloorplanModalOpen(true)}
                      onExportCsv={() => handleExportCsv('all')}
                      onPrintSlip={() => handlePrintSlip('Catalog Sheet')}
                      onSelectNavTab={handleNavigateNavTab}
                      searchFilter={searchQuery}
                      isCatalogOnly={true}
                    />
                  )}

                  {currentTab === 'request-approvals' && (
                    <ApprovalsView
                      bookings={scopedBookings}
                      onApprove={handleApproveBooking}
                      onOpenRejectModal={(b) => setRejectModalBooking(b)}
                      onOpenGatepass={(b) => setGatepassModalBooking(b)}
                    />
                  )}

                  {currentTab === 'faculty-custody-stationery' && (
                    <FacultyCustodyStationeryView
                      currentUser={effectiveUser}
                      assets={scopedAssets}
                      bookings={scopedBookings}
                      academicSettings={academicSettings}
                      onOpenGatepass={(b) => setGatepassModalBooking(b)}
                      showToast={showToast}
                      onSelectNavTab={handleNavigateNavTab}
                    />
                  )}

                  {currentTab === 'asset-inventory-and-stock' && (
                    <DashboardView
                      currentUser={effectiveUser}
                      kpis={kpis}
                      cluster={cluster}
                      assets={scopedAssets}
                      bookings={scopedBookings}
                      auditLogs={scopedAuditLogs}
                      academicSettings={academicSettings}
                      onApprove={handleApproveBooking}
                      onOpenRejectModal={(b) => setRejectModalBooking(b)}
                      onOpenStockAdjustModal={(a) => setStockAdjustAsset(a)}
                      onOpenNewAssetModal={() => setIsNewAssetModalOpen(true)}
                      onOpenScannerModal={() => setIsScannerModalOpen(true)}
                      onOpenFloorplanModal={() => setIsFloorplanModalOpen(true)}
                      onExportCsv={() => handleExportCsv('all')}
                      onPrintSlip={() => handlePrintSlip('Catalog Sheet')}
                      onSelectNavTab={setCurrentTab}
                      searchFilter={searchQuery}
                      isInventoryOnly={true}
                    />
                  )}

                  {currentTab === 'issue-and-return-desk' && (
                    <IssueReturnDeskView
                      bookings={scopedBookings}
                      onDispatch={handleDispatchBooking}
                      onReturn={handleReturnBooking}
                      onOpenGatepass={(b) => setGatepassModalBooking(b)}
                      showToast={showToast}
                    />
                  )}

                  {currentTab === 'permanent-allocations' && (
                    <PermanentAllocationsView
                      bookings={scopedBookings}
                      assets={scopedAssets}
                      onOpenGatepass={(b) => setGatepassModalBooking(b)}
                    />
                  )}

                  {currentTab === 'categories-and-barcodes' && (
                    <BarcodesView
                      assets={scopedAssets}
                      onOpenScanner={() => setIsScannerModalOpen(true)}
                      onPrintAllTags={() => handlePrintSlip('Barcode Tags')}
                    />
                  )}

                  {currentTab === 'user-management' && (
                    <UserManagementView
                      users={scopedUsers}
                      staffDirectory={scopedStaffDirectory}
                      departments={departments}
                      bookings={scopedBookings}
                      currentUser={currentUser}
                      onUpdateUserRoleAndDept={handleUpdateUserRoleAndDept}
                      onAddStaffMember={handleAddStaffMember}
                      onUpdateStaffMember={handleUpdateStaffMember}
                      onDeleteStaffMember={handleDeleteStaffMember}
                      onBulkImportStaff={handleBulkImportStaff}
                      onApproveUser={handleApproveUser}
                      onRejectUser={handleRejectUser}
                      onOpenAuthModal={() => setIsAuthModalOpen(true)}
                      onOpenAcademicSettingsModal={() => setIsAcademicSettingsModalOpen(true)}
                      showToast={showToast}
                    />
                  )}

                  {currentTab === 'reports-and-analytics' && (
                    <ReportsView
                      assets={scopedAssets}
                      bookings={scopedBookings}
                      academicSettings={academicSettings}
                      onExportCsv={() => handleExportCsv('all')}
                    />
                  )}

                  {currentTab === 'audit-log' && <AuditLogView auditLogs={scopedAuditLogs} />}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODALS */}
      <RejectModal
        isOpen={!!rejectModalBooking}
        booking={rejectModalBooking}
        onClose={() => setRejectModalBooking(null)}
        onConfirmReject={handleConfirmReject}
      />

      <GatepassModal
        isOpen={!!gatepassModalBooking}
        booking={gatepassModalBooking}
        onClose={() => setGatepassModalBooking(null)}
        onPrint={() => handlePrintSlip('Gatepass')}
        showToast={showToast}
      />

      <StockAdjustModal
        isOpen={!!stockAdjustAsset}
        asset={stockAdjustAsset}
        onClose={() => setStockAdjustAsset(null)}
        onConfirmAdjust={handleConfirmAdjustStock}
      />

      <NewAssetModal
        isOpen={isNewAssetModalOpen}
        onClose={() => setIsNewAssetModalOpen(false)}
        onAssetCreated={handleAssetCreated}
      />

      <ScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        assets={assets}
        isFaculty={isFaculty}
        onAssetFound={(found) => {
          showToast(`Asset tag scanned: ${found.code} (${found.name})`, 'success');
        }}
        onNavigateToAsset={(assetCode) => {
          setIsScannerModalOpen(false);
          handleNavigateNavTab('my-requests-and-bookings', assetCode);
        }}
        onOpenStockAdjustModal={(asset) => {
          setIsScannerModalOpen(false);
          setStockAdjustAsset(asset);
        }}
      />

      <FloorplanModal
        isOpen={isFloorplanModalOpen}
        onClose={() => setIsFloorplanModalOpen(false)}
      />

      <GuidelinesModal
        isOpen={isGuidelinesModalOpen}
        onClose={() => setIsGuidelinesModalOpen(false)}
      />

      <AcademicSettingsModal
        isOpen={isAcademicSettingsModalOpen}
        onClose={() => setIsAcademicSettingsModalOpen(false)}
        academicSettings={academicSettings}
        onSaveAcademicSettings={handleSaveAcademicSettings}
        showToast={showToast}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        departments={departments}
        onUserAuthenticated={(u) => {
          setCurrentUser(u);
          showToast(`Active session: ${u.name} (${u.role.toUpperCase()})`, 'success');
        }}
        showToast={showToast}
      />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
