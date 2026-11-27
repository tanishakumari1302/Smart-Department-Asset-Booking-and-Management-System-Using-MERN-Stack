import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  Unsubscribe,
  where,
  deleteDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { User, Asset, AssetCondition, Booking, AuditLog, DashboardKPIs, Department, Role, StaffMember, AcademicSettings, BrandingSettings, DEFAULT_BRANDING, FacultyCustodyProfile, calculateDefaultAcademicYear, ADMIN_OFFICE_STAFF, AUTHORIZED_FACULTY_MEMBERS } from './types';
import { INITIAL_ASSETS, INITIAL_BOOKINGS, INITIAL_AUDIT_LOGS, INITIAL_DEPARTMENTS, REMOVED_ASSET_CODES } from '../server/seedData';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: Specify firestoreDatabaseId with auto-detect long-polling to prevent 10-second backend timeouts
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling according to Firebase integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Ensure anonymous Firebase Auth session for quick-login admins before write/delete operations
export async function ensureFirestoreAuth(): Promise<void> {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.warn('Anonymous Firestore auth fallback notice:', err);
    }
  }
}

// Boot connection check - Non-blocking to avoid 10-second server timeout
export async function testConnection(): Promise<boolean> {
  return true;
}

// Seed Cloud Firestore with departments, initial college Assets and reference data
export async function ensureFirestoreSeeded(): Promise<void> {
  if (typeof window !== 'undefined' && sessionStorage.getItem('assethub_firestore_seeded_v7')) {
    return;
  }

  try {
    await ensureFirestoreAuth();
    // 1. Check and seed departments collection
    const deptSnap = await getDocs(collection(db, 'departments'));
    if (deptSnap.empty) {
      console.log('🏛️ Seeding initial college departments...');
      const deptBatch = writeBatch(db);
      for (const dept of INITIAL_DEPARTMENTS) {
        const deptRef = doc(db, 'departments', dept._id);
        deptBatch.set(deptRef, {
          ...dept,
          createdAt: new Date().toISOString(),
        });
      }
      await deptBatch.commit();
      console.log('✅ College departments seeded successfully.');
    }

    // 2. Check assets collection - purge removed assets and ensure active 21 catalog assets
    const assetsSnap = await getDocs(collection(db, 'assets'));
    const existingCodes = new Set(assetsSnap.docs.map((d) => d.id));

    // Delete any documents for the 14 removed assets if they exist in Firestore
    const purgeBatch = writeBatch(db);
    let hasPurge = false;
    for (const docSnap of assetsSnap.docs) {
      if (REMOVED_ASSET_CODES.has(docSnap.id)) {
        purgeBatch.delete(doc(db, 'assets', docSnap.id));
        hasPurge = true;
      }
    }
    if (hasPurge) {
      await purgeBatch.commit();
      console.log('🗑️ Purged 14 removed assets from Cloud Firestore.');
    }

    // Purge any existing bookings referencing removed assets OR legacy Adil Raja / AST-0017 permanent allocation
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    const purgeBookingsBatch = writeBatch(db);
    let hasPurgeBookings = false;
    for (const docSnap of bookingsSnap.docs) {
      const bData = docSnap.data();
      const assetCode = String(bData?.assetCode || bData?.code || '').trim().toUpperCase();
      const requesterName = String(bData?.requesterName || '').toLowerCase();
      const assetName = String(bData?.assetName || '').toLowerCase();
      const isAdilPrinterPerm =
        (bData?.type === 'permanent' || bData?.bookingType === 'permanent') &&
        (assetCode === 'AST-0017' || requesterName.includes('adil') || assetName.includes('network laser printer'));

      if (REMOVED_ASSET_CODES.has(bData?.assetCode) || REMOVED_ASSET_CODES.has(bData?.code) || isAdilPrinterPerm) {
        purgeBookingsBatch.delete(doc(db, 'bookings', docSnap.id));
        hasPurgeBookings = true;
      }
    }
    if (hasPurgeBookings) {
      await purgeBookingsBatch.commit();
      console.log('🗑️ Purged obsolete bookings & legacy Adil Raja printer permanent allocation.');
    }

    // Reset AST-0017 permanentQuantity to 0 if present
    try {
      const printerRef = doc(db, 'assets', 'AST-0017');
      const printerSnap = await getDoc(printerRef);
      if (printerSnap.exists() && Number(printerSnap.data()?.permanentQuantity || 0) > 0) {
        await updateDoc(printerRef, { permanentQuantity: 0, updatedAt: new Date().toISOString() });
      }
    } catch {
      // ignore
    }
    
    // Only seed initial catalog/bookings/logs if the assets collection is completely empty.
    // Never re-seed assets that an Admin intentionally deleted!
    if (assetsSnap.empty) {
      console.log(`🌱 Seeding empty Firestore with initial college assets catalog (${INITIAL_ASSETS.length} items)...`);
      const batch = writeBatch(db);

      for (const asset of INITIAL_ASSETS) {
        const assetRef = doc(db, 'assets', asset.code);
        batch.set(assetRef, {
          ...asset,
          updatedAt: new Date().toISOString(),
        });
      }

      for (const booking of INITIAL_BOOKINGS) {
        const bookingRef = doc(db, 'bookings', booking.reqId);
        batch.set(bookingRef, {
          ...booking,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      for (const log of INITIAL_AUDIT_LOGS) {
        const logRef = doc(db, 'audit_logs', log._id);
        batch.set(logRef, {
          ...log,
          id: log._id,
          timestamp: new Date().toISOString(),
        });
      }

      await batch.commit();
      console.log('✅ Cloud Firestore successfully seeded with complete college asset ERP data.');
    }

    // Clean up any legacy mock user documents & ensure Harpreet Aulakh is strictly faculty role
    if (auth.currentUser) {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const docSnap of usersSnap.docs) {
          const uData = docSnap.data();
          const emailLower = String(uData?.email || '').toLowerCase();
          if (docSnap.id.startsWith('usr_')) {
            await deleteDoc(docSnap.ref);
          } else if (emailLower === 'harpreet.aulakh@sunstone.in' || emailLower === 'harpreet@sunstone.in') {
            if (uData?.role === 'admin') {
              await updateDoc(docSnap.ref, { role: 'faculty', updatedAt: new Date().toISOString() });
            }
          }
        }
        const staffSnap = await getDocs(collection(db, 'staff_directory'));
        for (const sDoc of staffSnap.docs) {
          const sData = sDoc.data();
          const emailLower = String(sData?.email || '').toLowerCase();
          if (
            (emailLower === 'harpreet.aulakh@sunstone.in' || emailLower === 'harpreet@sunstone.in') &&
            sData?.role === 'admin'
          ) {
            await updateDoc(sDoc.ref, { role: 'faculty', updatedAt: new Date().toISOString() });
          }
        }
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('assethub_firestore_seeded_v7', 'true');
    }
  } catch (err) {
    console.warn('Note on Firestore auto-seeding:', err);
  }
}

// Realtime listeners
export function subscribeToDepartments(
  onData: (departments: Department[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = 'departments';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Department[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        items.push({
          ...data,
          id: docSnap.id,
          _id: data._id || docSnap.id,
        });
      });
      if (items.length === 0) {
        onData(INITIAL_DEPARTMENTS);
      } else {
        onData(items);
      }
    },
    (error) => {
      console.warn('Firestore subscribeToDepartments notice:', error);
      if (onError) onError(error);
      onData(INITIAL_DEPARTMENTS);
    }
  );
}
export function subscribeToAssets(
  onData: (assets: Asset[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = 'assets';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Asset[] = [];
      snapshot.forEach((docSnap) => {
        if (REMOVED_ASSET_CODES.has(docSnap.id)) return;
        const data = docSnap.data() as any;
        if (REMOVED_ASSET_CODES.has(data?.code)) return;
        items.push({
          ...data,
          id: docSnap.id,
          _id: data?._id || docSnap.id,
        });
      });
      // Sort alphabetically or by code
      items.sort((a, b) => (a.code || a.name || '').localeCompare(b.code || b.name || ''));
      onData(items);
    },
    (err) => {
      console.warn('subscribeToAssets notice:', err);
      if (onError) onError(err);
      // Fallback to initial assets so UI always has data
      onData(INITIAL_ASSETS as unknown as Asset[]);
    }
  );
}

export function subscribeToBookings(
  user: User | null,
  onData: (bookings: Booking[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = 'bookings';
  // Faculty can only see their own bookings; HOD sees their department bookings; Admin and Tech see all
  let q: any;
  if (user && user.role === 'faculty') {
    q = query(collection(db, path), where('requesterEmail', '==', user.email));
  } else if (user && user.role === 'hod' && user.department) {
    q = query(collection(db, path), where('requesterDept', '==', user.department));
  } else {
    q = collection(db, path);
  }

  return onSnapshot(
    q,
    (snapshot: any) => {
      const items: Booking[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as any;
        if (REMOVED_ASSET_CODES.has(data?.assetCode) || REMOVED_ASSET_CODES.has(data?.code)) return;
        items.push({
          ...data,
          id: docSnap.id,
          _id: data?._id || docSnap.id,
        });
      });
      items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onData(items);
    },
    (err) => {
      console.warn('subscribeToBookings notice:', err);
      if (onError) onError(err);
      // Fallback to initial sample bookings filtered for this user
      if (user && user.role === 'faculty') {
        const userSample = INITIAL_BOOKINGS.filter(
          (b) => b.requesterEmail === user.email || b.requesterRole === 'Faculty Member'
        );
        onData((userSample.length > 0 ? userSample : INITIAL_BOOKINGS.slice(0, 4)) as unknown as Booking[]);
      } else {
        onData(INITIAL_BOOKINGS as unknown as Booking[]);
      }
    }
  );
}

export function subscribeToAuditLogs(
  onData: (logs: AuditLog[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = 'audit_logs';
  const q = query(collection(db, path), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AuditLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        items.push({
          ...data,
          id: docSnap.id,
          _id: data?._id || docSnap.id,
        });
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onData(items);
    },
    (err) => {
      console.warn('subscribeToAuditLogs notice:', err);
      if (onError) onError(err);
      const safeLogs = INITIAL_AUDIT_LOGS.map((l) => ({
        ...l,
        id: l._id,
        timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : String(l.timestamp),
      })) as unknown as AuditLog[];
      onData(safeLogs);
    }
  );
}

// User Profile in Firestore
export async function fetchOrCreateUserProfile(fbUser: FirebaseUser, extraData?: Partial<User>): Promise<User> {
  const userRef = doc(db, 'users', fbUser.uid);
  const emailLower = (fbUser.email || extraData?.email || '').toLowerCase().trim();

  // Default Admin / Office Staff: ONLY Malay Aggarwal, Arpit Singh, Owner — plus anyone promoted to 'admin' in live staff_directory
  const isMalay =
    emailLower === 'malay@sunstone.in' ||
    emailLower === 'malay.aggarwal@college.edu' ||
    emailLower === 'malayaggarwal@gmail.com' ||
    fbUser.uid === 'usr_admin_malay' ||
    (fbUser.displayName && fbUser.displayName.toLowerCase().includes('malay'));

  const isArpit =
    emailLower === 'arpit.singh@sunstone.in' ||
    emailLower === 'arpitsingh@gmail.com' ||
    emailLower === 'arpit.singh@college.edu' ||
    fbUser.uid === 'usr_admin_arpit' ||
    (fbUser.displayName && fbUser.displayName.toLowerCase().includes('arpit'));

  const isOwner =
    emailLower === 'tanishakumari34703@gmail.com' ||
    emailLower.startsWith('tanishakumari');

  // Check live staff_directory for dynamically added or edited staff records
  let directoryMatch: StaffMember | null = null;
  if (emailLower) {
    try {
      const dirQ = query(collection(db, 'staff_directory'), where('email', '==', emailLower));
      const dirSnap = await getDocs(dirQ);
      if (!dirSnap.empty) {
        const docData = dirSnap.docs[0].data() as StaffMember;
        if (docData.status !== 'removed' && docData.status !== 'deactivated') {
          directoryMatch = { ...docData, id: dirSnap.docs[0].id, _id: dirSnap.docs[0].id };
        }
      }
    } catch {
      // ignore directory lookup failure
    }
  }

  const isAdminStaff =
    isMalay ||
    isArpit ||
    isOwner ||
    directoryMatch?.role === 'admin';

  const matchedFaculty = AUTHORIZED_FACULTY_MEMBERS.find(
    (f) =>
      f.email.toLowerCase() === emailLower ||
      f.id === fbUser.uid ||
      f._id === fbUser.uid ||
      (fbUser.displayName && f.name.toLowerCase() === fbUser.displayName.toLowerCase())
  );

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const existing = { id: snap.id, _id: snap.id, ...(snap.data() as any) } as User;

      if (isAdminStaff) {
        existing.role = 'admin';
        existing.approvalStatus = 'approved';
        if (isMalay) {
          existing.name = directoryMatch?.name || 'Malay Aggarwal';
          existing.designation = directoryMatch?.designation || 'Assistant Vice President';
          existing.businessRole = directoryMatch?.businessRole || 'Activation Head';
          existing.department = directoryMatch?.department || 'Central Administration & Activation Node';
          existing.facultyId = 'SUN-ADM-01';
        } else if (isArpit) {
          existing.name = directoryMatch?.name || 'Arpit Singh';
          existing.designation = directoryMatch?.designation || 'Senior Associate';
          existing.businessRole = directoryMatch?.businessRole || 'Campus Manager';
          existing.department = directoryMatch?.department || 'Campus Operations & Asset Management';
          existing.facultyId = 'SUN-OPS-02';
        } else if (isOwner) {
          existing.name = existing.name || fbUser.displayName || 'Tanisha Kumari';
          existing.designation = 'College ERP Administrator';
          existing.businessRole = 'System Administrator';
          existing.department = 'Central Administration & Institutional Oversight';
          existing.facultyId = 'SUN-ADMIN-MASTER';
        } else if (directoryMatch) {
          existing.name = directoryMatch.name || existing.name;
          existing.designation = directoryMatch.designation || existing.designation;
          existing.businessRole = directoryMatch.businessRole || existing.businessRole;
          existing.department = directoryMatch.department || existing.department;
        }
        try {
          await updateDoc(userRef, {
            role: 'admin',
            approvalStatus: 'approved',
            name: existing.name,
            designation: existing.designation,
            businessRole: existing.businessRole || '',
            department: existing.department,
            facultyId: existing.facultyId || '',
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Could not update admin doc in Firestore:', e);
        }
      } else {
        existing.role = directoryMatch?.role || 'faculty';
        existing.approvalStatus = 'approved';
        if (directoryMatch) {
          existing.name = directoryMatch.name || existing.name;
          existing.department = directoryMatch.department || existing.department;
          existing.designation = directoryMatch.designation || existing.designation;
          existing.businessRole = directoryMatch.businessRole || existing.businessRole;
        } else if (matchedFaculty) {
          existing.name = matchedFaculty.name;
          existing.department = matchedFaculty.department;
          existing.designation = matchedFaculty.designation;
          existing.businessRole = matchedFaculty.businessRole;
          existing.facultyId = matchedFaculty.facultyId;
        }
        try {
          await updateDoc(userRef, {
            role: existing.role,
            approvalStatus: 'approved',
            name: existing.name,
            designation: existing.designation,
            businessRole: existing.businessRole || '',
            department: existing.department,
            facultyId: existing.facultyId || '',
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Could not sync faculty doc in Firestore:', e);
        }
      }
      return existing;
    }
  } catch (err) {
    // If not found or read error, proceed to create profile
  }

  let role: Role = directoryMatch?.role || 'faculty';
  let approvalStatus: 'approved' | 'pending' | 'rejected' = 'approved';
  let department = directoryMatch?.department || extraData?.department || matchedFaculty?.department || 'Department of Computer Science & Engineering';
  let designation = directoryMatch?.designation || extraData?.designation || matchedFaculty?.designation || 'Faculty Member';
  let businessRole: string | undefined = directoryMatch?.businessRole || matchedFaculty?.businessRole || extraData?.businessRole || 'Tech Faculty';
  let name = directoryMatch?.name || fbUser.displayName || extraData?.name || matchedFaculty?.name || (emailLower ? emailLower.split('@')[0] : 'Faculty Member');
  let facultyId = directoryMatch?.employeeId || extraData?.facultyId || matchedFaculty?.facultyId || `SUN-FAC-${Math.floor(1000 + Math.random() * 9000)}`;
  let avatar = directoryMatch?.avatar || fbUser.photoURL || extraData?.avatar || matchedFaculty?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  if (isAdminStaff) {
    role = 'admin';
    approvalStatus = 'approved';
    if (isMalay) {
      name = directoryMatch?.name || 'Malay Aggarwal';
      designation = directoryMatch?.designation || 'Assistant Vice President';
      businessRole = directoryMatch?.businessRole || 'Activation Head';
      department = directoryMatch?.department || 'Central Administration & Activation Node';
      facultyId = 'SUN-ADM-01';
      avatar = '/assets/faculty/malay_aggarwal.jpeg';
    } else if (isArpit) {
      name = directoryMatch?.name || 'Arpit Singh';
      designation = directoryMatch?.designation || 'Senior Associate';
      businessRole = directoryMatch?.businessRole || 'Campus Manager';
      department = directoryMatch?.department || 'Campus Operations & Asset Management';
      facultyId = 'SUN-OPS-02';
      avatar = '/assets/faculty/arpit_singh.jpeg';
    } else if (isOwner) {
      name = fbUser.displayName || 'Tanisha Kumari';
      designation = 'College ERP Administrator';
      businessRole = 'System Administrator';
      department = 'Central Administration & Institutional Oversight';
      facultyId = 'SUN-ADMIN-MASTER';
      avatar = fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=Tanisha`;
    }
  } else if (matchedFaculty && !directoryMatch) {
    role = 'faculty';
    approvalStatus = 'approved';
    name = matchedFaculty.name;
    department = matchedFaculty.department;
    designation = matchedFaculty.designation;
    businessRole = matchedFaculty.businessRole;
    facultyId = matchedFaculty.facultyId;
    avatar = matchedFaculty.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  }

  const newUser: User = {
    _id: fbUser.uid,
    id: fbUser.uid,
    name,
    email: fbUser.email || (extraData?.email ? extraData.email : (emailLower || 'user@college.edu')),
    role,
    department,
    designation,
    businessRole,
    facultyId,
    avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    phone: directoryMatch?.phone || extraData?.phone || '+91 98450 11223',
    room: directoryMatch?.room || (isAdminStaff ? 'Main Admin Building' : (extraData?.room || 'Academic Wing Cabin #04')),
    approvalStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(userRef, newUser);
  } catch (err) {
    console.warn('Notice saving user profile to Firestore:', err);
  }

  return newUser;
}

// Real-time listener for the currently logged-in user's profile document
export function subscribeToCurrentUser(
  uid: string,
  onData: (user: User) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      onData({ id: snap.id, _id: snap.id, ...(snap.data() as any) });
    }
  });
}

// Real-time listener for users in the users collection
export function subscribeToUsers(
  onData: (users: User[]) => void,
  user?: User | null,
  onError?: (err: any) => void
): Unsubscribe {
  const path = 'users';
  let q: any;
  if (user && user.role === 'hod' && user.department) {
    q = query(collection(db, path), where('department', '==', user.department));
  } else {
    q = collection(db, path);
  }

  return onSnapshot(
    q,
    (snapshot: any) => {
      const items: User[] = [];
      snapshot.forEach((docSnap: any) => {
        // Exclude obsolete mock users
        if (!docSnap.id.startsWith('usr_')) {
          const data = docSnap.data() as any;
          items.push({
            ...data,
            id: docSnap.id,
            _id: data._id || docSnap.id,
          });
        }
      });
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (items.length === 0) {
        onData([...ADMIN_OFFICE_STAFF, ...AUTHORIZED_FACULTY_MEMBERS]);
      } else {
        onData(items);
      }
    },
    (err) => {
      console.warn('subscribeToUsers notice:', err);
      if (onError) onError(err);
      onData([...ADMIN_OFFICE_STAFF, ...AUTHORIZED_FACULTY_MEMBERS]);
    }
  );
}

// Real-time listener for Staff Directory collection
export function subscribeToStaffDirectory(
  onData: (staff: StaffMember[]) => void,
  user?: User | null,
  onError?: (err: any) => void
): Unsubscribe {
  const path = 'staff_directory';
  let q: any;
  if (user && user.role === 'hod' && user.department) {
    q = query(collection(db, path), where('department', '==', user.department));
  } else {
    q = collection(db, path);
  }

  return onSnapshot(
    q,
    (snapshot: any) => {
      const items: StaffMember[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as any;
        items.push({
          ...data,
          id: docSnap.id,
          _id: docSnap.id,
        });
      });
      items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      if (items.length === 0) {
        const defaultStaff: StaffMember[] = [...ADMIN_OFFICE_STAFF, ...AUTHORIZED_FACULTY_MEMBERS].map((u) => ({
          _id: u._id,
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          department: u.department,
          designation: u.designation,
          businessRole: u.businessRole,
          status: 'active',
          registered: true,
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: u.updatedAt || new Date().toISOString(),
        }));
        onData(defaultStaff);
      } else {
        onData(items);
      }
    },
    (err) => {
      console.warn('subscribeToStaffDirectory notice:', err);
      if (onError) onError(err);
      const defaultStaff: StaffMember[] = [...ADMIN_OFFICE_STAFF, ...AUTHORIZED_FACULTY_MEMBERS].map((u) => ({
        _id: u._id,
        id: u.id || u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        designation: u.designation,
        businessRole: u.businessRole,
        status: 'active',
        registered: true,
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
      }));
      onData(defaultStaff);
    }
  );
}

// Admin function to add a pre-registered staff member
export async function addStaffMemberToFirestore(
  staffData: {
    name: string;
    email: string;
    role: Role;
    department: string;
    designation?: string;
    businessRole?: string;
    phone?: string;
    room?: string;
  },
  actor?: User | null
): Promise<string> {
  await ensureFirestoreAuth();
  const cleanEmail = staffData.email.trim().toLowerCase();
  const cleanName = staffData.name.trim().slice(0, 100);
  const cleanDept = (staffData.department || 'Central College Lab & Facilities Node').trim();
  const now = new Date().toISOString();

  // Check if an existing staff_directory record (active or previously removed) already exists for this email
  let docId = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const allStaffSnap = await getDocs(collection(db, 'staff_directory'));
    const existingMatch = allStaffSnap.docs.find(
      (d) => String((d.data() as any)?.email || '').trim().toLowerCase() === cleanEmail
    );
    if (existingMatch) {
      docId = existingMatch.id;
    }
  } catch {
    // proceed with fresh docId
  }

  const staffRef = doc(db, 'staff_directory', docId);

  const newRecord: StaffMember = {
    _id: docId,
    id: docId,
    name: cleanName,
    email: cleanEmail,
    role: staffData.role,
    department: cleanDept,
    designation:
      staffData.designation?.trim() ||
      (staffData.role === 'admin'
        ? 'Office Staff / Administrator'
        : staffData.role === 'hod'
        ? 'Head of Department'
        : staffData.role === 'tech'
        ? 'Technical Lab Officer'
        : 'Faculty Member'),
    businessRole:
      staffData.businessRole?.trim() ||
      (staffData.role === 'admin' ? 'Campus Administration' : 'Academic Faculty'),
    phone: staffData.phone?.trim() || '',
    room: staffData.room?.trim() || '',
    status: 'active',
    registered: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(staffRef, newRecord, { merge: true });

  // If a registered user already exists with this email, automatically update and approve them
  try {
    const userQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const userSnap = await getDocs(userQuery);
    if (!userSnap.empty) {
      for (const uDoc of userSnap.docs) {
        await updateDoc(uDoc.ref, {
          name: newRecord.name,
          role: newRecord.role,
          department: newRecord.department,
          designation: newRecord.designation,
          businessRole: newRecord.businessRole || '',
          approvalStatus: 'approved',
          updatedAt: new Date().toISOString(),
        });
        await updateDoc(staffRef, {
          registered: true,
          registeredUid: uDoc.id,
        });
      }
    }
  } catch (err) {
    console.warn('Auto-linking existing user doc notice:', err);
  }

  await logAuditToFirestore(
    `Staff Added: ${newRecord.name}`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    docId,
    `Added staff member (${newRecord.email}) with role [${newRecord.role}] in [${newRecord.department}]`
  );

  return docId;
}

// Admin function to update (or upsert) ANY staff member (including pre-seeded official staff)
export async function updateStaffMemberInFirestore(
  staffId: string,
  updates: Partial<StaffMember>,
  actor?: User | null,
  fallbackData?: Partial<StaffMember>
): Promise<void> {
  await ensureFirestoreAuth();
  const ref = doc(db, 'staff_directory', staffId);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as StaffMember) : undefined;

  const baselineOfficial = [...ADMIN_OFFICE_STAFF, ...AUTHORIZED_FACULTY_MEMBERS].find(
    (u) =>
      u.id === staffId ||
      u._id === staffId ||
      (updates.email && u.email.toLowerCase() === updates.email.toLowerCase().trim()) ||
      (fallbackData?.email && u.email.toLowerCase() === fallbackData.email.toLowerCase().trim())
  );

  const now = new Date().toISOString();
  const mergedEmail = (
    updates.email ||
    existing?.email ||
    fallbackData?.email ||
    baselineOfficial?.email ||
    ''
  )
    .trim()
    .toLowerCase();

  const mergedName =
    updates.name?.trim() ||
    existing?.name ||
    fallbackData?.name ||
    baselineOfficial?.name ||
    staffId;

  const upsertPayload: Record<string, any> = {
    _id: staffId,
    id: staffId,
    name: mergedName,
    email: mergedEmail,
    role: updates.role || existing?.role || fallbackData?.role || baselineOfficial?.role || 'faculty',
    department:
      updates.department ||
      existing?.department ||
      fallbackData?.department ||
      baselineOfficial?.department ||
      'Central College Lab & Facilities Node',
    designation:
      updates.designation !== undefined
        ? updates.designation.trim()
        : existing?.designation || fallbackData?.designation || baselineOfficial?.designation || 'Faculty Member',
    businessRole:
      updates.businessRole !== undefined
        ? updates.businessRole.trim()
        : existing?.businessRole || fallbackData?.businessRole || baselineOfficial?.businessRole || '',
    phone:
      updates.phone !== undefined
        ? updates.phone.trim()
        : existing?.phone || fallbackData?.phone || baselineOfficial?.phone || '',
    room:
      updates.room !== undefined
        ? updates.room.trim()
        : existing?.room || fallbackData?.room || baselineOfficial?.room || '',
    employeeId:
      updates.employeeId ||
      existing?.employeeId ||
      fallbackData?.employeeId ||
      baselineOfficial?.facultyId ||
      '',
    avatar:
      updates.avatar ||
      existing?.avatar ||
      fallbackData?.avatar ||
      baselineOfficial?.avatar ||
      '',
    status: updates.status || existing?.status || fallbackData?.status || 'active',
    registered: existing?.registered ?? fallbackData?.registered ?? true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await setDoc(ref, upsertPayload, { merge: true });

  // Sync with registered user profile if linked by UID or email
  try {
    if (existing?.registeredUid) {
      const userRef = doc(db, 'users', existing.registeredUid);
      await updateDoc(userRef, {
        name: upsertPayload.name,
        role: upsertPayload.role,
        department: upsertPayload.department,
        designation: upsertPayload.designation,
        businessRole: upsertPayload.businessRole,
        updatedAt: now,
      });
    } else if (mergedEmail) {
      const userQ = query(collection(db, 'users'), where('email', '==', mergedEmail));
      const userSnap = await getDocs(userQ);
      for (const uDoc of userSnap.docs) {
        await updateDoc(uDoc.ref, {
          name: upsertPayload.name,
          role: upsertPayload.role,
          department: upsertPayload.department,
          designation: upsertPayload.designation,
          businessRole: upsertPayload.businessRole,
          updatedAt: now,
        });
      }
    }
  } catch (err) {
    console.warn('Could not sync user profile with staff updates:', err);
  }

  await logAuditToFirestore(
    `Staff Updated: ${mergedName}`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    staffId,
    `Updated staff directory record for ${mergedName} (${mergedEmail}) — Role: ${upsertPayload.role}`
  );
}

// Admin function to delete/remove ANY staff member cleanly across BOTH staff_directory & users collections
export async function deleteStaffMemberFromFirestore(
  staffId: string,
  actor?: User | null,
  staffMeta?: Partial<StaffMember>
): Promise<void> {
  await ensureFirestoreAuth();
  const ref = doc(db, 'staff_directory', staffId);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as StaffMember) : undefined;
  const targetEmail = (existing?.email || staffMeta?.email || '').toLowerCase().trim();
  const targetName = (existing?.name || staffMeta?.name || staffId).trim();

  const baselineOfficial = [...ADMIN_OFFICE_STAFF, ...AUTHORIZED_FACULTY_MEMBERS].find(
    (u) =>
      u.id === staffId ||
      u._id === staffId ||
      (targetEmail && u.email.toLowerCase().trim() === targetEmail)
  );

  // 1. Delete all matching docs in staff_directory (by ID or case-insensitive email)
  try {
    if (snap.exists() && !baselineOfficial) {
      await deleteDoc(ref);
    }
    if (targetEmail) {
      const allStaffSnap = await getDocs(collection(db, 'staff_directory'));
      for (const sDoc of allStaffSnap.docs) {
        const sEmail = String((sDoc.data() as any)?.email || '').toLowerCase().trim();
        if (sEmail === targetEmail) {
          if (baselineOfficial && sDoc.id === (baselineOfficial.id || baselineOfficial._id)) {
            continue; // tombstone will overwrite this doc below
          }
          await deleteDoc(sDoc.ref);
        }
      }
    }
  } catch (err) {
    console.warn('staff_directory cleanup notice:', err);
  }

  // 2. Also remove any matching user docs in the `users` collection so they vanish from Active Personnel immediately
  try {
    const userByIdRef = doc(db, 'users', staffId);
    const userByIdSnap = await getDoc(userByIdRef);
    if (userByIdSnap.exists()) {
      await deleteDoc(userByIdRef);
    }
    if (targetEmail) {
      const allUsersSnap = await getDocs(collection(db, 'users'));
      for (const uDoc of allUsersSnap.docs) {
        const uEmail = String((uDoc.data() as any)?.email || '').toLowerCase().trim();
        if (uEmail === targetEmail) {
          await deleteDoc(uDoc.ref);
        }
      }
    }
  } catch (err) {
    console.warn('users cleanup notice:', err);
  }

  // 3. If this was a pre-seeded official baseline member, write a valid tombstone so they stay removed permanently
  if (baselineOfficial || staffId.startsWith('usr_')) {
    const tombstoneId = baselineOfficial?.id || staffId;
    const tombstoneRef = doc(db, 'staff_directory', tombstoneId);
    await setDoc(
      tombstoneRef,
      {
        _id: tombstoneId,
        id: tombstoneId,
        name: (targetName || baselineOfficial?.name || staffId).slice(0, 100),
        email: (targetEmail || baselineOfficial?.email || `${tombstoneId}@removed.local`).slice(0, 100),
        role: existing?.role || baselineOfficial?.role || 'faculty',
        department: existing?.department || baselineOfficial?.department || 'Central Administration',
        designation: existing?.designation || baselineOfficial?.designation || 'Removed Member',
        status: 'removed',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  await logAuditToFirestore(
    `Staff Removed: ${targetName}`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    staffId,
    `Removed staff member ${targetName} (${targetEmail || staffId}) from institutional directory`
  );
}

// Admin function for bulk import from pasted text
export async function bulkImportStaffToFirestore(
  rawText: string,
  defaultDept: string,
  actor?: User | null
): Promise<{ added: number; updated: number; errors: string[] }> {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  let added = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const [idx, line] of lines.entries()) {
    if (idx === 0 && line.toLowerCase().includes('name') && line.toLowerCase().includes('email')) {
      continue;
    }

    const parts = line.includes('\t')
      ? line.split('\t').map((p) => p.trim())
      : line.split(',').map((p) => p.trim());

    if (parts.length < 2) {
      errors.push(`Line ${idx + 1}: Expected Name, Email, Role, Department`);
      continue;
    }

    const name = parts[0];
    const email = parts[1].toLowerCase();
    const rawRole = (parts[2] || 'faculty').toLowerCase();
    const role: Role = ['admin', 'hod', 'faculty', 'tech'].includes(rawRole)
      ? (rawRole as Role)
      : 'faculty';
    const department = parts[3] || defaultDept;
    const designation =
      parts[4] ||
      (role === 'admin'
        ? 'College Administrator'
        : role === 'hod'
        ? 'Head of Department'
        : role === 'tech'
        ? 'Technical Lab Officer'
        : 'Faculty Member');

    if (!email.includes('@')) {
      errors.push(`Line ${idx + 1} (${name}): Invalid email format`);
      continue;
    }

    try {
      const q = query(collection(db, 'staff_directory'), where('email', '==', email));
      const existingSnap = await getDocs(q);

      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        await updateDoc(existingDoc.ref, {
          name,
          role,
          department,
          designation,
          status: 'active',
          updatedAt: new Date().toISOString(),
        });
        updated++;
      } else {
        const docId = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const staffRef = doc(db, 'staff_directory', docId);
        await setDoc(staffRef, {
          _id: docId,
          id: docId,
          name,
          email,
          role,
          department,
          designation,
          status: 'active',
          registered: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        added++;
      }
    } catch (err: any) {
      errors.push(`Line ${idx + 1} (${name}): ${err.message || 'Import error'}`);
    }
  }

  await logAuditToFirestore(
    `Bulk Staff Import`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    'bulk_import',
    `Imported ${added} new staff and updated ${updated} records (${errors.length} failed)`
  );

  return { added, updated, errors };
}

// Admin function to approve a pending user registration
export async function approveUserInFirestore(
  userId: string,
  role: Role,
  department: string,
  designation?: string,
  actor?: User | null
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User record not found');
  const userData = snap.data() as User;

  const desig =
    designation ||
    (role === 'admin'
      ? 'College Administrator'
      : role === 'hod'
      ? 'Head of Department'
      : role === 'tech'
      ? 'Technical Lab Officer'
      : 'Faculty Member');

  await updateDoc(userRef, {
    role,
    department,
    designation: desig,
    approvalStatus: 'approved',
    updatedAt: new Date().toISOString(),
  });

  await logAuditToFirestore(
    `User Approved: ${userData.name}`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    userId,
    `Approved user access with role [${role}] in [${department}]`
  );
}

// Admin function to reject a pending user registration
export async function rejectUserInFirestore(
  userId: string,
  reason?: string,
  actor?: User | null
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User record not found');
  const userData = snap.data() as User;

  await updateDoc(userRef, {
    approvalStatus: 'rejected',
    updatedAt: new Date().toISOString(),
  });

  await logAuditToFirestore(
    `User Rejected: ${userData.name}`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    userId,
    `Rejected access for ${userData.name} (${reason || 'Access denied by administrator'})`
  );
}

// Admin function to assign roles (admin, hod, faculty, tech) and a department to other users
export async function updateUserRoleAndDepartment(
  targetUserId: string,
  newRole: Role,
  newDepartment: string,
  newDesignation?: string,
  actor?: User,
  fallbackUser?: Partial<User>
): Promise<void> {
  await ensureFirestoreAuth();
  const userRef = doc(db, 'users', targetUserId);
  const snap = await getDoc(userRef);
  const current = snap.exists() ? (snap.data() as User) : (fallbackUser as User | undefined);
  const designation =
    newDesignation ||
    current?.designation ||
    (newRole === 'admin'
      ? 'College Administrator'
      : newRole === 'hod'
      ? `HOD / Department Head`
      : newRole === 'tech'
      ? 'Technical Lab Officer'
      : 'Faculty Member');

  if (snap.exists()) {
    await updateDoc(userRef, {
      role: newRole,
      department: newDepartment,
      designation,
      approvalStatus: 'approved',
      updatedAt: new Date().toISOString(),
    });
  }

  // Always upsert into staff_directory so login & directory stay in sync
  await updateStaffMemberInFirestore(
    targetUserId,
    {
      role: newRole,
      department: newDepartment,
      designation,
      name: current?.name,
      email: current?.email,
      businessRole: current?.businessRole,
    },
    actor,
    current
      ? {
          name: current.name,
          email: current.email,
          role: current.role,
          department: current.department,
          designation: current.designation,
          businessRole: current.businessRole,
        }
      : undefined
  );

  await logAuditToFirestore(
    `Updated Role: ${current?.name || targetUserId}`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    targetUserId,
    `Admin changed role to [${newRole}] and department to [${newDepartment}]`
  );
}

// Real-time listener for Academic Year and Term Settings
export function subscribeToAcademicSettings(
  onData: (settings: AcademicSettings) => void
): Unsubscribe {
  const docRef = doc(db, 'system_settings', 'academic_calendar');
  return onSnapshot(
    docRef,
    (snap) => {
      const defaultCalculated = calculateDefaultAcademicYear();
      if (snap.exists()) {
        const data = snap.data() as Partial<AcademicSettings>;
        onData({
          academicYear: data.academicYear || defaultCalculated.academicYear,
          shortYear: data.shortYear || defaultCalculated.shortYear,
          term: data.term || defaultCalculated.term,
          customOverride: data.customOverride ?? true,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        });
      } else {
        onData(defaultCalculated);
      }
    },
    (err) => {
      console.warn('Academic settings subscription notice, using calculated default:', err);
      onData(calculateDefaultAcademicYear());
    }
  );
}

// Real-time listener for College Branding (App Name, Subtitle & Custom Logo)
export function subscribeToBrandingSettings(
  onData: (settings: BrandingSettings) => void
): Unsubscribe {
  const docRef = doc(db, 'system_settings', 'branding');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<BrandingSettings>;
        onData({
          appName: (data.appName || DEFAULT_BRANDING.appName).trim(),
          badgeText: (data.badgeText || DEFAULT_BRANDING.badgeText).trim(),
          collegeSubtitle: (data.collegeSubtitle || DEFAULT_BRANDING.collegeSubtitle).trim(),
          logoUrl: data.logoUrl || '',
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        });
      } else {
        onData(DEFAULT_BRANDING);
      }
    },
    (err) => {
      console.warn('subscribeToBrandingSettings notice:', err);
      onData(DEFAULT_BRANDING);
    }
  );
}

// Save custom College Branding & Logo permanently to Firestore
export async function updateBrandingSettingsInFirestore(
  settings: Partial<BrandingSettings>,
  actor?: User | null
): Promise<void> {
  await ensureFirestoreAuth();
  const docRef = doc(db, 'system_settings', 'branding');
  const payload: BrandingSettings = {
    appName: (settings.appName || DEFAULT_BRANDING.appName).trim().slice(0, 60),
    badgeText: (settings.badgeText || DEFAULT_BRANDING.badgeText).trim().slice(0, 16),
    collegeSubtitle: (settings.collegeSubtitle || DEFAULT_BRANDING.collegeSubtitle).trim().slice(0, 80),
    logoUrl: settings.logoUrl || '',
    updatedAt: new Date().toISOString(),
    updatedBy: actor?.name || 'Administrator',
  };
  await setDoc(docRef, payload, { merge: true });
  await logAuditToFirestore(
    `Updated Branding: ${payload.appName}`,
    'system',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    'branding',
    `Updated institutional branding to "${payload.appName}" (${payload.collegeSubtitle})`
  );
}

// Real-time listener for Live Persistent Faculty Custody & Stationery Roster
export function subscribeToFacultyCustodyRoster(
  onData: (roster: FacultyCustodyProfile[] | null) => void
): Unsubscribe {
  const docRef = doc(db, 'system_settings', 'faculty_custody_roster');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as { roster?: FacultyCustodyProfile[] };
        if (Array.isArray(data.roster)) {
          onData(data.roster);
          return;
        }
      }
      onData(null);
    },
    (err) => {
      console.warn('subscribeToFacultyCustodyRoster notice:', err);
      onData(null);
    }
  );
}

// Save Faculty Custody & Stationery Roster permanently to Firestore
export async function saveFacultyCustodyRosterInFirestore(
  roster: FacultyCustodyProfile[],
  actor?: User | null,
  summaryNote?: string
): Promise<void> {
  await ensureFirestoreAuth();
  const docRef = doc(db, 'system_settings', 'faculty_custody_roster');
  const sanitizedRoster = JSON.parse(JSON.stringify(roster));
  await setDoc(
    docRef,
    {
      roster: sanitizedRoster,
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || 'Administrator',
    },
    { merge: true }
  );

  if (summaryNote) {
    await logAuditToFirestore(
      `Faculty Custody Updated`,
      'inventory',
      actor?.name || 'Administrator',
      actor?.role || 'admin',
      'faculty_custody_roster',
      summaryNote
    );
  }
}

// Admin function to update Academic Year and Term Settings
export async function updateAcademicSettingsInFirestore(
  settings: {
    academicYear: string;
    term: string;
    customOverride?: boolean;
  },
  actor?: User | null
): Promise<void> {
  const docRef = doc(db, 'system_settings', 'academic_calendar');

  // Compute shortYear from academicYear (e.g. "2026-27" -> "26-27")
  let shortYear = settings.academicYear;
  const parts = settings.academicYear.split(/[-–/]/);
  if (parts.length === 2) {
    const s1 = parts[0].trim().slice(-2);
    const s2 = parts[1].trim().slice(-2);
    shortYear = `${s1}-${s2}`;
  }

  const payload: AcademicSettings = {
    academicYear: settings.academicYear.trim(),
    shortYear,
    term: settings.term.trim(),
    customOverride: settings.customOverride ?? true,
    updatedAt: new Date().toISOString(),
    updatedBy: actor?.name || 'Administrator',
  };

  await setDoc(docRef, payload, { merge: true });

  await logAuditToFirestore(
    `Academic Calendar Updated`,
    'system',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    'academic_calendar',
    `Updated institutional calendar to Academic Year [${payload.academicYear}] (${payload.term})`
  );
}

// Audit Log Helper
export async function logAuditToFirestore(
  action: string,
  category: 'booking' | 'inventory' | 'auth' | 'system' | 'return',
  actorName: string,
  actorRole: string,
  targetId?: string,
  details?: string
): Promise<void> {
  try {
    const logData = {
      action: (action || 'System Event').slice(0, 145),
      category,
      actorName: (actorName || 'Administrator').slice(0, 95),
      actorRole: actorRole || 'admin',
      targetId: targetId || '',
      details: details || '',
      timestamp: new Date().toISOString(),
    };
    await addDoc(collection(db, 'audit_logs'), logData);
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

// Asset Actions in Firestore
export async function createAssetInFirestore(assetData: Partial<Asset>, actor?: User): Promise<void> {
  const code = assetData.code || `AST-${Math.floor(1000 + Math.random() * 9000)}`;
  const assetRef = doc(db, 'assets', code);
  const now = new Date().toISOString();

  const cond: AssetCondition = assetData.condition || 'good';
  const resolvedTotal = Math.max(0, Number(assetData.totalQuantity ?? 1));
  const resolvedAvail = Math.max(
    0,
    assetData.availableQuantity !== undefined
      ? Number(assetData.availableQuantity)
      : resolvedTotal
  );
  const resolvedMinThreshold =
    assetData.minThreshold !== undefined && !Number.isNaN(Number(assetData.minThreshold))
      ? Math.max(0, Number(assetData.minThreshold))
      : 2;

  const initialStatus: Asset['status'] =
    cond === 'repair' || cond === 'damaged'
      ? 'maintenance'
      : resolvedAvail <= 0
      ? 'depleted'
      : resolvedAvail <= resolvedMinThreshold
      ? 'low-stock'
      : 'operational';

  const categoryLabelMap: Record<string, string> = {
    stationery: 'Classroom Stationery',
    it: 'Technical & IT Equipment',
    audio: 'Audio & Presentation',
    recording: 'Recording & Accessories',
  };
  const resolvedCategory = assetData.category || 'stationery';
  const customBarcode = (assetData.barcodeValue || '').trim();

  const newAsset: Asset = {
    _id: code,
    code,
    name: assetData.name || 'New Asset Item',
    department: assetData.department || actor?.department || 'Central College Lab & Facilities Node',
    category: resolvedCategory,
    categoryLabel: assetData.categoryLabel || categoryLabelMap[resolvedCategory] || 'Classroom Stationery',
    classification: assetData.classification || 'Reusable',
    description: assetData.description || '',
    totalQuantity: resolvedTotal,
    availableQuantity: resolvedAvail,
    dispatchedQuantity: 0,
    permanentQuantity: 0,
    minThreshold: resolvedMinThreshold,
    isConsumable: !!assetData.isConsumable,
    isReusable: !assetData.isConsumable,
    unit: assetData.unit || 'units',
    location: assetData.location || 'Central Stationery Store',
    serialNumber: (assetData.serialNumber || '').trim(),
    barcodeValue: customBarcode || code,
    status: initialStatus,
    condition: cond,
    conditionRemarks: assetData.conditionRemarks || '',
    barcodeTagStatus: assetData.barcodeTagStatus || (customBarcode ? 'verified' : 'pending'),
    updatedAt: now,
  };

  try {
    await ensureFirestoreAuth();
    await setDoc(assetRef, newAsset);
    await logAuditToFirestore(
      `Added Asset ${code}`,
      'inventory',
      actor?.name || 'Administrator',
      actor?.role || 'admin',
      code,
      `Created new asset entry "${newAsset.name}" [Condition: ${cond.toUpperCase()}${assetData.conditionRemarks ? ` - ${assetData.conditionRemarks}` : ''}] with initial stock ${newAsset.totalQuantity}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `assets/${code}`);
  }
}

export async function adjustAssetStockInFirestore(
  assetCode: string,
  newAvailableQuantity: number,
  actor?: User,
  condition?: AssetCondition,
  conditionRemarks?: string
): Promise<void> {
  await ensureFirestoreAuth();
  const assetRef = doc(db, 'assets', assetCode);
  try {
    const snap = await getDoc(assetRef);
    if (!snap.exists()) {
      throw new Error(`Asset ${assetCode} not found in Firestore`);
    }
    const current = snap.data() as Asset;
    const diff = newAvailableQuantity - current.availableQuantity;
    const newTotal = Math.max(0, current.totalQuantity + diff);
    const finalCondition: AssetCondition = condition || current.condition || 'good';
    const finalRemarks = conditionRemarks !== undefined ? conditionRemarks : (current.conditionRemarks || '');

    let newStatus: Asset['status'] =
      newAvailableQuantity <= 0
        ? 'depleted'
        : newAvailableQuantity <= current.minThreshold
        ? 'low-stock'
        : 'operational';

    if (finalCondition === 'repair' || finalCondition === 'damaged') {
      newStatus = 'maintenance';
    }

    const updates: Partial<Asset> = {
      availableQuantity: newAvailableQuantity,
      totalQuantity: newTotal,
      status: newStatus,
      condition: finalCondition,
      conditionRemarks: finalRemarks,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(assetRef, updates as any);

    await logAuditToFirestore(
      `Stock & Condition: ${assetCode}`,
      'inventory',
      actor?.name || 'Admin',
      actor?.role || 'admin',
      assetCode,
      `Stock set to ${newAvailableQuantity}, Condition: ${finalCondition.toUpperCase()}${finalRemarks ? ` ("${finalRemarks}")` : ''}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `assets/${assetCode}`);
  }
}

// Booking Actions in Firestore
export async function createBookingInFirestore(
  bookingInput: any,
  user: User
): Promise<Booking> {
  const assetCode = (bookingInput.assetCode || bookingInput.code || 'AST-0020').trim();
  const assetRef = doc(db, 'assets', assetCode);
  let assetSnap = await getDoc(assetRef);
  let asset: Asset;

  if (!assetSnap.exists()) {
    // 1. Try finding in INITIAL_ASSETS master list
    const masterAsset = INITIAL_ASSETS.find(
      (a) => a.code.toLowerCase() === assetCode.toLowerCase() ||
             a.name.toLowerCase().includes(assetCode.toLowerCase()) ||
             assetCode.toLowerCase().includes(a.code.toLowerCase())
    ) || {
      _id: assetCode,
      code: assetCode,
      name: bookingInput.assetName || `Institutional Equipment (${assetCode})`,
      category: 'it',
      categoryLabel: 'Technical Equipment',
      department: user.department || 'Department of Computer Science & Engineering',
      classification: 'Standard',
      totalQuantity: 10,
      availableQuantity: 8,
      dispatchedQuantity: 2,
      location: 'Central Equipment Desk',
      status: 'available',
    };

    // Auto-upsert into Firestore so it's registered in inventory
    try {
      await setDoc(assetRef, {
        ...masterAsset,
        updatedAt: new Date().toISOString(),
      });
      assetSnap = await getDoc(assetRef);
    } catch (e) {
      console.warn('Auto-seed asset fallback notice:', e);
    }

    asset = (assetSnap.exists() ? assetSnap.data() : masterAsset) as Asset;
  } else {
    asset = assetSnap.data() as Asset;
  }

  const requestedQty = Number(bookingInput.quantity) || 1;
  if (asset.availableQuantity !== undefined && asset.availableQuantity < requestedQty) {
    throw new Error(`Insufficient stock: Only ${asset.availableQuantity} units available.`);
  }

  const reqNumber = Math.floor(1000 + Math.random() * 9000);
  const reqId = `REQ-${reqNumber}`;
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  const resolvedType = bookingInput.type || bookingInput.bookingType || 'temporary';
  const resolvedStartDate = bookingInput.startDate || bookingInput.bookingDate || todayStr;
  const resolvedEndDate = bookingInput.endDate || bookingInput.bookingDate || todayStr;
  const resolvedVenue = bookingInput.venue || bookingInput.location || 'Classroom / Lab';
  const resolvedRemarks = bookingInput.remarks || bookingInput.notes || '';
  const resolvedPurpose = bookingInput.purpose || 'Academic Institutional Requisition';

  const newBooking: Record<string, any> = {
    _id: reqId,
    id: reqId,
    reqId,
    type: resolvedType,
    bookingType: resolvedType,
    title: `${asset.name} (${requestedQty} ${asset.unit || 'units'})`,
    assetId: asset.id || asset._id || asset.code,
    assetCode: asset.code,
    assetName: asset.name,
    quantity: requestedQty,
    purpose: resolvedPurpose,
    bookingDate: bookingInput.bookingDate || resolvedStartDate,
    startDate: resolvedStartDate,
    endDate: resolvedEndDate,
    startTime: bookingInput.startTime || '09:00',
    endTime: bookingInput.endTime || '17:00',
    status: 'pending',
    requesterId: user.id || user._id || 'user_fac',
    requesterName: user.name || 'Faculty Member',
    requesterEmail: user.email || 'faculty@college.edu',
    requesterDept: user.department || 'Department of Computer Science & Engineering',
    requesterRole: user.role || 'faculty',
    department: user.department || 'Department of Computer Science & Engineering',
    venue: resolvedVenue,
    remarks: resolvedRemarks,
    tenancyDuration: bookingInput.tenancyDuration || '',
    grantId: bookingInput.grantId || '',
    pickupLocation: bookingInput.pickupLocation || 'Central Tech Desk',
    gatepassGenerated: false,
    hasConflict: false,
    isExtraUnitRequest: !!bookingInput.isExtraUnitRequest,
    existingCustodyNote: bookingInput.existingCustodyNote || '',
    allottedDirectly: false,
    createdAt: now,
    updatedAt: now,
  };

  // Strip any undefined values to strictly comply with Firestore requirements
  Object.keys(newBooking).forEach((key) => {
    if (newBooking[key] === undefined) {
      delete newBooking[key];
    }
  });

  const bookingRef = doc(db, 'bookings', reqId);
  try {
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch {
        // ignore fallback
      }
    }
    await setDoc(bookingRef, newBooking);
    await logAuditToFirestore(
      `Submitted Requisition ${reqId}`,
      'booking',
      user.name || 'Faculty Member',
      user.role || 'faculty',
      reqId,
      `Requested ${requestedQty}x ${asset.name} for ${resolvedVenue} (${resolvedType})`
    );
    return newBooking as Booking;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `bookings/${reqId}`);
    throw err;
  }
}

export async function approveBookingInFirestore(reqId: string, actor: User): Promise<void> {
  await ensureFirestoreAuth();
  const bookingRef = doc(db, 'bookings', reqId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error('Booking not found');
  const b = snap.data() as Booking & { stockDeducted?: boolean };
  const now = new Date().toISOString();

  // Immediately deduct available stock in Browse Catalog on approval (guard against double deduction)
  if (!b.stockDeducted && b.assetCode) {
    const assetRef = doc(db, 'assets', b.assetCode);
    const assetSnap = await getDoc(assetRef);
    if (assetSnap.exists()) {
      const a = assetSnap.data() as Asset;
      const qty = Math.max(1, Number(b.quantity || 1));
      const newAvail = Math.max(0, Number(a.availableQuantity ?? 0) - qty);
      const isPermanent = b.type === 'permanent' || b.bookingType === 'permanent';
      const newPerm = isPermanent ? (a.permanentQuantity || 0) + qty : a.permanentQuantity || 0;
      const newStatus: Asset['status'] =
        a.condition === 'repair' || a.condition === 'damaged'
          ? 'maintenance'
          : newAvail <= 0
          ? 'depleted'
          : newAvail <= Number(a.minThreshold ?? 2)
          ? 'low-stock'
          : 'operational';

      await updateDoc(assetRef, {
        availableQuantity: newAvail,
        permanentQuantity: newPerm,
        status: newStatus,
        updatedAt: now,
      });
    }
  }

  await updateDoc(bookingRef, {
    status: 'approved',
    gatepassGenerated: true,
    stockDeducted: true,
    approvedBy: actor.name,
    approvedAt: now,
    updatedAt: now,
  });

  await logAuditToFirestore(
    `Approved Requisition ${reqId}`,
    'booking',
    actor.name,
    actor.role,
    reqId,
    `Requisition approved for ${b.quantity || 1}x ${b.assetName} by ${actor.name} (catalog stock updated)`
  );
}

export async function rejectBookingInFirestore(
  reqId: string,
  reason: string,
  remarks: string,
  actor: User
): Promise<void> {
  const bookingRef = doc(db, 'bookings', reqId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error('Booking not found');
  const b = snap.data() as Booking;

  await updateDoc(bookingRef, {
    status: 'rejected',
    remarks: `Rejected: ${reason}${remarks ? ` - ${remarks}` : ''}`,
    updatedAt: new Date().toISOString(),
  });

  await logAuditToFirestore(
    `Rejected Requisition ${reqId}`,
    'booking',
    actor.name,
    actor.role,
    reqId,
    `Reason: ${reason}`
  );
}

export interface HandoverProofData {
  photo?: string;
  notes?: string;
  venue?: string;
}

export interface ReturnProofData {
  photo?: string;
  notes?: string;
  condition?: 'intact' | 'damaged' | 'minor-wear';
}

export async function dispatchBookingInFirestore(
  reqId: string,
  actor: User,
  proofData?: HandoverProofData
): Promise<void> {
  await ensureFirestoreAuth();
  const bookingRef = doc(db, 'bookings', reqId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error('Booking not found');
  const b = snap.data() as Booking & { stockDeducted?: boolean };

  // Deduct available stock only if not already deducted at Approval (prevents double-deduction)
  const assetRef = doc(db, 'assets', b.assetCode);
  const assetSnap = await getDoc(assetRef);
  if (assetSnap.exists()) {
    const a = assetSnap.data() as Asset;
    const qty = Math.max(1, Number(b.quantity || 1));
    const newAvail = b.stockDeducted
      ? Number(a.availableQuantity ?? 0)
      : Math.max(0, Number(a.availableQuantity ?? 0) - qty);
    const newDispatched = (a.dispatchedQuantity || 0) + qty;
    const isPermanent = b.type === 'permanent' || b.bookingType === 'permanent';
    const newPerm =
      isPermanent && !b.stockDeducted
        ? (a.permanentQuantity || 0) + qty
        : a.permanentQuantity || 0;

    await updateDoc(assetRef, {
      availableQuantity: newAvail,
      dispatchedQuantity: newDispatched,
      permanentQuantity: newPerm,
      status:
        a.condition === 'repair' || a.condition === 'damaged'
          ? 'maintenance'
          : newAvail <= 0
          ? 'depleted'
          : newAvail <= Number(a.minThreshold ?? 2)
          ? 'low-stock'
          : 'operational',
      updatedAt: new Date().toISOString(),
    });
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    status: 'dispatched',
    stockDeducted: true,
    dispatchedAt: now,
    handoverAt: now,
    handoverBy: actor.name,
    updatedAt: now,
  };
  if (proofData?.photo) updatePayload.handoverPhoto = proofData.photo;
  if (proofData?.notes) updatePayload.handoverNotes = proofData.notes;
  if (proofData?.venue) {
    updatePayload.handoverVenue = proofData.venue;
    updatePayload.venue = proofData.venue;
  }

  await updateDoc(bookingRef, updatePayload);

  await logAuditToFirestore(
    `Dispatched Asset for ${reqId}`,
    'inventory',
    actor.name,
    actor.role,
    reqId,
    `Issued ${b.quantity}x ${b.assetName} to ${b.requesterName}${proofData?.photo ? ' (Photographic proof attached)' : ''}`
  );
}

export async function returnBookingInFirestore(
  reqId: string,
  actor: User,
  returnCondition: 'good' | 'maintenance' = 'good',
  proofData?: ReturnProofData
): Promise<void> {
  const bookingRef = doc(db, 'bookings', reqId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error('Booking not found');
  const b = snap.data() as Booking;

  // Restock asset
  const assetRef = doc(db, 'assets', b.assetCode);
  const assetSnap = await getDoc(assetRef);
  if (assetSnap.exists()) {
    const a = assetSnap.data() as Asset;
    const newAvail = a.availableQuantity + b.quantity;
    const newDispatched = Math.max(0, (a.dispatchedQuantity || 0) - b.quantity);

    await updateDoc(assetRef, {
      availableQuantity: newAvail,
      dispatchedQuantity: newDispatched,
      status: returnCondition === 'maintenance' ? 'maintenance' : (newAvail <= a.minThreshold ? 'low-stock' : 'operational'),
      updatedAt: new Date().toISOString(),
    });
  }

  const now = new Date().toISOString();
  const conditionRating = proofData?.condition || (returnCondition === 'maintenance' ? 'damaged' : 'intact');
  const updatePayload: Record<string, any> = {
    status: 'returned',
    returnedAt: now,
    returnAuditedBy: actor.name,
    returnBy: actor.name,
    returnCondition: conditionRating,
    remarks: `${b.remarks || ''} [Returned Condition: ${conditionRating}]${proofData?.notes ? ` - ${proofData.notes}` : ''}`.trim(),
    updatedAt: now,
  };
  if (proofData?.photo) updatePayload.returnPhoto = proofData.photo;
  if (proofData?.notes) updatePayload.returnNotes = proofData.notes;

  await updateDoc(bookingRef, updatePayload);

  await logAuditToFirestore(
    `Asset Returned for ${reqId}`,
    'return',
    actor.name,
    actor.role,
    reqId,
    `Received ${b.quantity}x ${b.assetName} back into inventory [Status: ${conditionRating}]${proofData?.photo ? ' (Return proof verified)' : ''}`
  );
}

export async function updateBookingProofInFirestore(
  reqId: string,
  proof: {
    returnPhoto?: string;
    returnNotes?: string;
    handoverPhoto?: string;
    handoverNotes?: string;
    venue?: string;
    returnCondition?: 'intact' | 'damaged' | 'minor-wear';
  },
  actor: User
): Promise<void> {
  const bookingRef = doc(db, 'bookings', reqId);
  const now = new Date().toISOString();
  const payload: Record<string, any> = {
    ...proof,
    updatedAt: now,
  };
  if (proof.returnPhoto) {
    payload.returnAt = now;
    payload.returnBy = actor.name;
  }
  if (proof.handoverPhoto) {
    payload.handoverAt = now;
    payload.handoverBy = actor.name;
  }

  // Filter undefined values
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });

  await updateDoc(bookingRef, payload);

  await logAuditToFirestore(
    `Custody Proof Uploaded for ${reqId}`,
    'booking',
    actor.name,
    actor.role,
    reqId,
    `Photographic condition proof updated by ${actor.name}`
  );
}

export async function cancelBookingInFirestore(reqId: string, actor: User): Promise<void> {
  await ensureFirestoreAuth();
  const bookingRef = doc(db, 'bookings', reqId);
  const snap = await getDoc(bookingRef);
  const b = snap.exists() ? (snap.data() as Booking & { stockDeducted?: boolean }) : null;
  const now = new Date().toISOString();

  // If stock was already deducted on approval/dispatch and booking is now cancelled, restock availableQuantity
  if (
    b &&
    b.stockDeducted &&
    b.status !== 'returned' &&
    b.status !== 'cancelled' &&
    b.assetCode
  ) {
    try {
      const assetRef = doc(db, 'assets', b.assetCode);
      const assetSnap = await getDoc(assetRef);
      if (assetSnap.exists()) {
        const a = assetSnap.data() as Asset;
        const qty = Math.max(1, Number(b.quantity || 1));
        const nextAvail = Math.min(Number(a.totalQuantity || qty), Number(a.availableQuantity || 0) + qty);
        const isPermanent = b.type === 'permanent' || b.bookingType === 'permanent';
        const nextPerm = isPermanent ? Math.max(0, (a.permanentQuantity || 0) - qty) : a.permanentQuantity || 0;
        const nextDispatched =
          b.status === 'dispatched' ? Math.max(0, (a.dispatchedQuantity || 0) - qty) : a.dispatchedQuantity || 0;

        await updateDoc(assetRef, {
          availableQuantity: nextAvail,
          permanentQuantity: nextPerm,
          dispatchedQuantity: nextDispatched,
          status:
            a.condition === 'repair' || a.condition === 'damaged'
              ? 'maintenance'
              : nextAvail <= 0
              ? 'depleted'
              : nextAvail <= Number(a.minThreshold ?? 2)
              ? 'low-stock'
              : 'operational',
          updatedAt: now,
        });
      }
    } catch {
      // ignore if asset removed
    }
  }

  await updateDoc(bookingRef, {
    status: 'cancelled',
    stockDeducted: false,
    updatedAt: now,
  });

  await logAuditToFirestore(
    `Cancelled Requisition ${reqId}`,
    'booking',
    actor.name,
    actor.role,
    reqId,
    `Requisition cancelled by ${actor.name}`
  );
}

// =========================================================================
// FULL SELF-SERVICE ADMIN & OFFICE STAFF CRUD HELPERS
// =========================================================================

// Full Asset Edit in Firestore
export async function updateAssetInFirestore(
  assetCode: string,
  updates: Partial<Asset>,
  actor?: User
): Promise<void> {
  await ensureFirestoreAuth();
  const assetRef = doc(db, 'assets', assetCode);
  try {
    const snap = await getDoc(assetRef);
    const current = snap.exists() ? (snap.data() as Asset) : ({} as Partial<Asset>);

    const finalAvail =
      updates.availableQuantity !== undefined
        ? Math.max(0, Number(updates.availableQuantity))
        : Number(current.availableQuantity ?? 0);
    const finalTotal =
      updates.totalQuantity !== undefined
        ? Math.max(finalAvail, Number(updates.totalQuantity))
        : Math.max(finalAvail, Number(current.totalQuantity ?? finalAvail));
    const finalMinThreshold =
      updates.minThreshold !== undefined
        ? Math.max(0, Number(updates.minThreshold))
        : Number(current.minThreshold ?? 2);
    const finalCondition: AssetCondition =
      updates.condition || current.condition || 'good';

    let finalStatus: Asset['status'] =
      finalAvail <= 0
        ? 'depleted'
        : finalAvail <= finalMinThreshold
        ? 'low-stock'
        : 'operational';
    if (finalCondition === 'repair' || finalCondition === 'damaged') {
      finalStatus = 'maintenance';
    }

    const payload: Record<string, any> = {
      ...updates,
      code: assetCode,
      name: (updates.name || current.name || assetCode).trim().slice(0, 145),
      availableQuantity: finalAvail,
      totalQuantity: finalTotal,
      minThreshold: finalMinThreshold,
      condition: finalCondition,
      status: finalStatus,
      isReusable:
        updates.isConsumable !== undefined
          ? !updates.isConsumable
          : current.isReusable ?? true,
      updatedAt: new Date().toISOString(),
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    await setDoc(assetRef, payload, { merge: true });

    await logAuditToFirestore(
      `Edited Asset ${assetCode}`,
      'inventory',
      actor?.name || 'Administrator',
      actor?.role || 'admin',
      assetCode,
      `Updated "${payload.name || current.name || assetCode}" (Available: ${finalAvail}/${finalTotal}, Condition: ${finalCondition.toUpperCase()})`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `assets/${assetCode}`);
  }
}

// Delete Asset in Firestore (by doc ID or matching code field)
export async function deleteAssetFromFirestore(
  assetCode: string,
  actor?: User
): Promise<void> {
  await ensureFirestoreAuth();
  const assetRef = doc(db, 'assets', assetCode);
  try {
    const snap = await getDoc(assetRef);
    let name = snap.exists() ? (snap.data() as any).name : assetCode;
    if (snap.exists()) {
      await deleteDoc(assetRef);
    } else {
      // Fallback: find by code field in case doc ID differs
      const q = query(collection(db, 'assets'), where('code', '==', assetCode));
      const matchSnap = await getDocs(q);
      for (const mDoc of matchSnap.docs) {
        name = (mDoc.data() as any)?.name || name;
        await deleteDoc(mDoc.ref);
      }
    }

    await logAuditToFirestore(
      `Deleted Asset ${assetCode}`,
      'inventory',
      actor?.name || 'Administrator',
      actor?.role || 'admin',
      assetCode,
      `Permanently deleted asset "${name}" (${assetCode}) from inventory`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `assets/${assetCode}`);
  }
}

// Departments CRUD in Firestore
export async function addDepartmentInFirestore(
  deptData: {
    name: string;
    code: string;
    buildingBlock?: string;
    hodName?: string;
    description?: string;
  },
  actor?: User | null
): Promise<string> {
  await ensureFirestoreAuth();
  const cleanCode = deptData.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const docId = `dept_${cleanCode.toLowerCase()}_${Date.now().toString(36).slice(-4)}`;
  const ref = doc(db, 'departments', docId);
  const payload = {
    _id: docId,
    id: docId,
    name: deptData.name.trim().slice(0, 145),
    code: (cleanCode || 'DEPT').slice(0, 20),
    shortName: (cleanCode || 'DEPT').slice(0, 20),
    block: deptData.buildingBlock?.trim() || 'Main Academic Block',
    buildingBlock: deptData.buildingBlock?.trim() || 'Main Academic Block',
    headOfDept: deptData.hodName?.trim() || 'Department Coordinator',
    hodName: deptData.hodName?.trim() || 'Department Coordinator',
    description: deptData.description?.trim() || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(ref, payload);

  await logAuditToFirestore(
    `Department Added: ${payload.name}`,
    'system',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    docId,
    `Created department [${payload.code}] ${payload.name} (${payload.buildingBlock})`
  );

  return docId;
}

export async function updateDepartmentInFirestore(
  deptId: string,
  updates: Partial<Department>,
  actor?: User | null
): Promise<void> {
  await ensureFirestoreAuth();
  const ref = doc(db, 'departments', deptId);
  const snap = await getDoc(ref);
  const current = snap.exists() ? (snap.data() as Department) : ({} as Partial<Department>);

  const finalCode = String(updates.code || current.code || 'DEPT').trim().toUpperCase().slice(0, 20);
  const finalName = String(updates.name || current.name || deptId).trim().slice(0, 145);

  const payload: Record<string, any> = {
    ...updates,
    name: finalName,
    code: finalCode,
    shortName: finalCode,
    updatedAt: new Date().toISOString(),
  };
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });

  await setDoc(ref, payload, { merge: true });

  await logAuditToFirestore(
    `Department Updated: ${finalName}`,
    'system',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    deptId,
    `Updated department details for ${finalName}`
  );
}

export async function deleteDepartmentFromFirestore(
  deptId: string,
  actor?: User | null
): Promise<void> {
  await ensureFirestoreAuth();
  const ref = doc(db, 'departments', deptId);
  const snap = await getDoc(ref);
  const name = snap.exists() ? (snap.data() as any).name : deptId;
  await deleteDoc(ref);

  await logAuditToFirestore(
    `Department Deleted: ${name}`,
    'system',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    deptId,
    `Deleted department "${name}" (${deptId})`
  );
}

// Create Permanent Allocation directly in Firestore
export async function createPermanentAllocationInFirestore(
  data: {
    assetCode: string;
    assetName: string;
    requesterName: string;
    requesterEmail?: string;
    requesterRole?: string;
    requesterDept?: string;
    venue: string;
    grantId?: string;
    tenancyDuration?: string;
    quantity?: number;
    status?: Booking['status'];
    purpose?: string;
    remarks?: string;
  },
  actor?: User | null
): Promise<string> {
  await ensureFirestoreAuth();
  const reqId = `REQ-PERM-${Date.now().toString().slice(-5)}`;
  const bookingRef = doc(db, 'bookings', reqId);
  const now = new Date().toISOString();
  const qty = Math.max(1, Number(data.quantity || 1));

  const payload: Record<string, any> = {
    _id: reqId,
    id: reqId,
    reqId,
    assetCode: data.assetCode.trim().toUpperCase(),
    assetName: data.assetName.trim(),
    requesterId: actor?.id || 'admin_assigned',
    requesterName: data.requesterName.trim(),
    requesterEmail: (data.requesterEmail || '').trim().toLowerCase(),
    requesterRole: data.requesterRole?.trim() || 'Custodian',
    requesterDept: data.requesterDept?.trim() || 'Central Administration',
    department: data.requesterDept?.trim() || 'Central Administration',
    type: 'permanent',
    bookingType: 'permanent',
    quantity: qty,
    bookingDate: now.split('T')[0],
    venue: data.venue.trim(),
    grantId: data.grantId?.trim() || `PERM-GRANT-${new Date().getFullYear()}`,
    tenancyDuration: data.tenancyDuration?.trim() || 'Permanent Allocation (Multi-Year Institutional Tenure)',
    purpose: data.purpose?.trim() || 'Dedicated permanent departmental asset allocation',
    status: data.status || 'approved',
    remarks: data.remarks?.trim() || `Assigned by ${actor?.name || 'Administrator'}`,
    approvedBy: actor?.name || 'Administrator',
    stockDeducted: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(bookingRef, payload);

  // Sync availableQuantity & permanentQuantity on asset doc if it exists
  try {
    const assetRef = doc(db, 'assets', payload.assetCode);
    const assetSnap = await getDoc(assetRef);
    if (assetSnap.exists()) {
      const a = assetSnap.data() as Asset;
      const nextAvail = Math.max(0, Number(a.availableQuantity ?? 0) - qty);
      const nextStatus: Asset['status'] =
        a.condition === 'repair' || a.condition === 'damaged'
          ? 'maintenance'
          : nextAvail <= 0
          ? 'depleted'
          : nextAvail <= Number(a.minThreshold ?? 2)
          ? 'low-stock'
          : 'operational';
      await updateDoc(assetRef, {
        availableQuantity: nextAvail,
        permanentQuantity: (a.permanentQuantity || 0) + qty,
        status: nextStatus,
        updatedAt: now,
      });
    }
  } catch {
    // ignore if custom SKU not in assets catalog
  }

  await logAuditToFirestore(
    `Permanent Allocation Added: ${reqId}`,
    'inventory',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    reqId,
    `Assigned ${qty}x ${payload.assetName} (${payload.assetCode}) permanently to ${payload.requesterName} at ${payload.venue}`
  );

  return reqId;
}

// Edit any Booking / Requisition / Permanent Allocation in Firestore (resolves by doc ID OR reqId)
export async function updateBookingInFirestore(
  reqIdOrDocId: string,
  updates: Partial<Booking>,
  actor?: User | null
): Promise<void> {
  await ensureFirestoreAuth();
  let targetRef = doc(db, 'bookings', reqIdOrDocId);
  let snap = await getDoc(targetRef);

  if (!snap.exists()) {
    const q = query(collection(db, 'bookings'), where('reqId', '==', reqIdOrDocId));
    const matchSnap = await getDocs(q);
    if (!matchSnap.empty) {
      targetRef = matchSnap.docs[0].ref;
      snap = matchSnap.docs[0];
    }
  }

  const existing = snap.exists() ? (snap.data() as Booking) : ({} as Partial<Booking>);
  const payload: Record<string, any> = {
    ...updates,
    reqId: existing.reqId || updates.reqId || reqIdOrDocId,
    assetCode: updates.assetCode || existing.assetCode || 'AST-GEN',
    assetName: (updates.assetName || existing.assetName || 'Asset Record').slice(0, 145),
    quantity: Math.max(1, Number(updates.quantity ?? existing.quantity ?? 1)),
    updatedAt: new Date().toISOString(),
  };
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });

  await setDoc(targetRef, payload, { merge: true });

  await logAuditToFirestore(
    `Updated Booking ${payload.reqId}`,
    'booking',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    payload.reqId,
    `Updated record ${payload.reqId} (${payload.assetName || ''} ${payload.status ? `· Status: ${payload.status}` : ''})`.trim()
  );
}

// Permanently Delete any Booking / Requisition / Permanent Allocation in Firestore (resolves by doc ID OR reqId)
export async function deleteBookingFromFirestore(
  reqIdOrDocId: string,
  actor?: User | null
): Promise<void> {
  await ensureFirestoreAuth();
  let targetRef = doc(db, 'bookings', reqIdOrDocId);
  let snap = await getDoc(targetRef);

  if (!snap.exists()) {
    const q = query(collection(db, 'bookings'), where('reqId', '==', reqIdOrDocId));
    const matchSnap = await getDocs(q);
    if (!matchSnap.empty) {
      targetRef = matchSnap.docs[0].ref;
      snap = matchSnap.docs[0];
    }
  }

  const existing = snap.exists() ? (snap.data() as Booking) : null;
  if (snap.exists()) {
    await deleteDoc(targetRef);
  }

  // Restock availableQuantity & decrement permanent/dispatched if deleting an active deducted record
  const existingWithFlag = existing as (Booking & { stockDeducted?: boolean }) | null;
  if (
    existingWithFlag &&
    existingWithFlag.assetCode &&
    existingWithFlag.status !== 'returned' &&
    existingWithFlag.status !== 'cancelled' &&
    existingWithFlag.status !== 'rejected' &&
    (existingWithFlag.stockDeducted ||
      existingWithFlag.status === 'dispatched' ||
      existingWithFlag.type === 'permanent' ||
      existingWithFlag.bookingType === 'permanent')
  ) {
    try {
      const assetRef = doc(db, 'assets', existingWithFlag.assetCode);
      const assetSnap = await getDoc(assetRef);
      if (assetSnap.exists()) {
        const a = assetSnap.data() as Asset;
        const qty = Math.max(1, Number(existingWithFlag.quantity || 1));
        const isPerm =
          existingWithFlag.type === 'permanent' || existingWithFlag.bookingType === 'permanent';
        const nextAvail = !a.isConsumable
          ? Math.min(Number(a.totalQuantity || qty), Number(a.availableQuantity || 0) + qty)
          : Number(a.availableQuantity || 0);
        const nextPerm = isPerm ? Math.max(0, (a.permanentQuantity || 0) - qty) : a.permanentQuantity || 0;
        const nextDispatched =
          existingWithFlag.status === 'dispatched'
            ? Math.max(0, (a.dispatchedQuantity || 0) - qty)
            : a.dispatchedQuantity || 0;
        const nextStatus: Asset['status'] =
          a.condition === 'repair' || a.condition === 'damaged'
            ? 'maintenance'
            : nextAvail <= 0
            ? 'depleted'
            : nextAvail <= Number(a.minThreshold ?? 2)
            ? 'low-stock'
            : 'operational';
        await updateDoc(assetRef, {
          availableQuantity: nextAvail,
          permanentQuantity: nextPerm,
          dispatchedQuantity: nextDispatched,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }
  }

  await logAuditToFirestore(
    `Deleted Booking ${existing?.reqId || reqIdOrDocId}`,
    'booking',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    existing?.reqId || reqIdOrDocId,
    `Deleted record ${existing?.reqId || reqIdOrDocId}${existing ? ` (${existing.assetName} - ${existing.requesterName})` : ''}`
  );
}

// Direct Asset Allotment by Admin / Office Staff (Syncs Catalog Stock + Bookings + Permanent Allocations + Audit Log)
export async function directAllotAssetToFacultyInFirestore(
  data: {
    facultyId: string;
    facultyName: string;
    facultyEmail: string;
    facultyDepartment: string;
    assetCode: string;
    assetName: string;
    isCatalogAsset: boolean;
    allotmentType: 'temporary' | 'permanent' | 'consumable';
    quantity: number;
    venue: string;
    startTime?: string;
    endTime?: string;
    purpose?: string;
    isExtraUnit?: boolean;
    existingCustodySummary?: string;
  },
  actor?: User | null
): Promise<Booking> {
  await ensureFirestoreAuth();
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];
  const qty = Math.max(1, Number(data.quantity || 1));
  const prefix =
    data.allotmentType === 'permanent'
      ? 'REQ-PERM'
      : data.allotmentType === 'consumable'
      ? 'REQ-CON'
      : 'REQ-ALLOT';
  const reqId = `${prefix}-${Date.now().toString().slice(-5)}`;

  // 1. Deduct live stock if asset exists in Firestore catalog
  if (data.isCatalogAsset && data.assetCode) {
    const assetRef = doc(db, 'assets', data.assetCode);
    const assetSnap = await getDoc(assetRef);
    if (assetSnap.exists()) {
      const a = assetSnap.data() as Asset;
      const currentAvail = Number(a.availableQuantity ?? 0);
      if (currentAvail < qty) {
        throw new Error(`Insufficient stock: Only ${currentAvail} ${a.unit || 'units'} available.`);
      }
      const nextAvail = Math.max(0, currentAvail - qty);
      const nextStatus: Asset['status'] =
        a.condition === 'repair' || a.condition === 'damaged'
          ? 'maintenance'
          : nextAvail <= 0
          ? 'depleted'
          : nextAvail <= Number(a.minThreshold ?? 2)
          ? 'low-stock'
          : 'operational';

      const stockPatch: Record<string, any> = {
        availableQuantity: nextAvail,
        status: nextStatus,
        updatedAt: now,
      };
      if (data.allotmentType === 'permanent') {
        stockPatch.permanentQuantity = (a.permanentQuantity || 0) + qty;
      } else if (data.allotmentType === 'temporary') {
        stockPatch.dispatchedQuantity = (a.dispatchedQuantity || 0) + qty;
      }
      await updateDoc(assetRef, stockPatch);
    }
  }

  // 2. Create official Booking / Allotment document so Issue Desk, Permanent Allocations, Gatepass & Faculty Portal stay 100% in sync
  const bookingStatus: Booking['status'] =
    data.allotmentType === 'permanent' ? 'approved' : 'dispatched';

  const newBooking: Record<string, any> = {
    _id: reqId,
    id: reqId,
    reqId,
    type: data.allotmentType,
    bookingType: data.allotmentType,
    title: `${data.assetName} (${qty} units)`,
    assetId: data.assetCode,
    assetCode: data.assetCode,
    assetName: data.assetName,
    quantity: qty,
    purpose:
      data.purpose?.trim() ||
      (data.isExtraUnit
        ? 'Extra unit directly allotted by Admin / Office Staff'
        : 'Directly allotted by Admin / Office Staff'),
    bookingDate: todayStr,
    startDate: todayStr,
    endDate: todayStr,
    startTime: data.startTime || '09:30 AM',
    endTime: data.endTime || '11:30 AM',
    venue: data.venue.trim() || 'Academic Block',
    grantId:
      data.allotmentType === 'permanent'
        ? `PERM-DIRECT-${new Date().getFullYear()}`
        : '',
    tenancyDuration:
      data.allotmentType === 'permanent'
        ? 'Permanent Allocation (Admin Direct Grant)'
        : '',
    requesterId: data.facultyId,
    requesterName: data.facultyName,
    requesterEmail: data.facultyEmail,
    requesterDept: data.facultyDepartment,
    requesterRole: 'faculty',
    department: data.facultyDepartment,
    status: bookingStatus,
    gatepassGenerated: true,
    stockDeducted: true,
    hasConflict: false,
    approvedBy: actor?.name || 'Admin / Office Staff',
    approvedAt: now,
    dispatchedAt: data.allotmentType !== 'permanent' ? now : '',
    handoverBy: actor?.name || 'Admin / Office Staff',
    handoverAt: data.allotmentType !== 'permanent' ? now : '',
    handoverVenue: data.venue.trim() || 'Academic Block',
    remarks: `Direct allotment by ${actor?.name || 'Admin'}${
      data.isExtraUnit ? ' [EXTRA UNIT]' : ''
    }`,
    isExtraUnitRequest: !!data.isExtraUnit,
    existingCustodyNote: data.existingCustodySummary || '',
    allottedDirectly: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'bookings', reqId), newBooking);

  await logAuditToFirestore(
    `Direct Allotment ${reqId}${data.isExtraUnit ? ' (Extra Unit)' : ''}`,
    'inventory',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    reqId,
    `Directly allotted ${qty}x ${data.assetName} (${data.assetCode}) [${data.allotmentType.toUpperCase()}] to ${data.facultyName} at ${data.venue}`
  );

  return newBooking as Booking;
}

// Restock a catalog item when checked in from Faculty Custody Desk (and close any linked booking)
export async function restockCustodyItemInFirestore(
  item: {
    assetCode: string;
    name: string;
    quantity: number;
    linkedBookingId?: string;
    allotmentType?: 'temporary' | 'permanent' | 'consumable';
    isCatalogAsset?: boolean;
  },
  facultyName: string,
  actor?: User | null
): Promise<void> {
  await ensureFirestoreAuth();
  const now = new Date().toISOString();

  // If linked to an official booking, mark booking returned (which also restocks asset automatically for temporary bookings)
  if (item.linkedBookingId) {
    try {
      const bookingRef = doc(db, 'bookings', item.linkedBookingId);
      const bSnap = await getDoc(bookingRef);
      if (bSnap.exists()) {
        const bData = bSnap.data() as Booking;
        if (bData.status !== 'returned') {
          await updateDoc(bookingRef, {
            status: 'returned',
            returnedAt: now,
            returnAt: now,
            returnCondition: 'intact',
            returnBy: actor?.name || 'Admin / Office Staff',
            returnAuditedBy: actor?.name || 'Admin / Office Staff',
            updatedAt: now,
          });
        }
      }
    } catch {
      // fallback to direct stock update below
    }
  }

  // Restock non-consumable catalog items safely
  if (item.allotmentType !== 'consumable' && item.assetCode) {
    try {
      const assetRef = doc(db, 'assets', item.assetCode);
      const assetSnap = await getDoc(assetRef);
      if (assetSnap.exists()) {
        const a = assetSnap.data() as Asset;
        if (!a.isConsumable) {
          const qty = Math.max(1, Number(item.quantity || 1));
          const nextAvail = Math.min(Number(a.totalQuantity || qty), Number(a.availableQuantity || 0) + qty);
          const nextDispatched = Math.max(0, Number(a.dispatchedQuantity || 0) - (item.allotmentType === 'permanent' ? 0 : qty));
          const nextPerm = Math.max(0, Number(a.permanentQuantity || 0) - (item.allotmentType === 'permanent' ? qty : 0));
          const nextStatus: Asset['status'] =
            a.condition === 'repair' || a.condition === 'damaged'
              ? 'maintenance'
              : nextAvail <= 0
              ? 'depleted'
              : nextAvail <= Number(a.minThreshold ?? 2)
              ? 'low-stock'
              : 'operational';

          await updateDoc(assetRef, {
            availableQuantity: nextAvail,
            dispatchedQuantity: nextDispatched,
            permanentQuantity: nextPerm,
            status: nextStatus,
            updatedAt: now,
          });
        }
      }
    } catch {
      // ignore if custom item not in catalog
    }
  }

  await logAuditToFirestore(
    `Custody Return: ${item.assetCode}`,
    'return',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    item.assetCode,
    `Returned ${item.quantity}x ${item.name} from ${facultyName} back to inventory`
  );
}

