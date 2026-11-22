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
import { User, Asset, AssetCondition, Booking, AuditLog, DashboardKPIs, Department, Role, StaffMember, AcademicSettings, calculateDefaultAcademicYear, ADMIN_OFFICE_STAFF, AUTHORIZED_FACULTY_MEMBERS } from './types';
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

// Boot connection check - Non-blocking to avoid 10-second server timeout
export async function testConnection(): Promise<boolean> {
  return true;
}

// Seed Cloud Firestore with departments, initial 35 college Assets and reference data
export async function ensureFirestoreSeeded(): Promise<void> {
  if (typeof window !== 'undefined' && sessionStorage.getItem('assethub_firestore_seeded_v5')) {
    return;
  }

  try {
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

    // Purge any existing bookings referencing removed assets
    const bookingsSnap = await getDocs(collection(db, 'bookings'));
    const purgeBookingsBatch = writeBatch(db);
    let hasPurgeBookings = false;
    for (const docSnap of bookingsSnap.docs) {
      const bData = docSnap.data();
      if (REMOVED_ASSET_CODES.has(bData?.assetCode) || REMOVED_ASSET_CODES.has(bData?.code)) {
        purgeBookingsBatch.delete(doc(db, 'bookings', docSnap.id));
        hasPurgeBookings = true;
      }
    }
    if (hasPurgeBookings) {
      await purgeBookingsBatch.commit();
      console.log('🗑️ Purged bookings referencing removed assets.');
    }
    
    if (assetsSnap.empty || assetsSnap.docs.length < INITIAL_ASSETS.length || !existingCodes.has('AST-0036')) {
      console.log(`🌱 Ensuring Firestore has complete college assets catalog (${INITIAL_ASSETS.length} items)...`);
      const batch = writeBatch(db);

      // 1. Seed Missing Assets
      for (const asset of INITIAL_ASSETS) {
        if (!existingCodes.has(asset.code)) {
          const assetRef = doc(db, 'assets', asset.code);
          batch.set(assetRef, {
            ...asset,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 2. Seed Bookings if empty
      if (assetsSnap.empty) {
        for (const booking of INITIAL_BOOKINGS) {
          const bookingRef = doc(db, 'bookings', booking.reqId);
          batch.set(bookingRef, {
            ...booking,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Seed Audit Logs
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

    // Clean up any legacy mock user documents if authenticated
    if (auth.currentUser) {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const docSnap of usersSnap.docs) {
          if (docSnap.id.startsWith('usr_')) {
            await deleteDoc(docSnap.ref);
          }
        }
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('assethub_firestore_seeded_v5', 'true');
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

  // Strict role check: ONLY Malay Aggarwal & Arpit Singh are Admin / Office Staff!
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

  const isHarpreet =
    emailLower === 'harpreet.aulakh@sunstone.in' ||
    emailLower === 'harpreet@sunstone.in' ||
    emailLower.includes('harpreet.aulakh') ||
    fbUser.uid === 'usr_fac_harpreet_a' ||
    (fbUser.displayName && fbUser.displayName.toLowerCase().includes('harpreet aulakh'));

  const isOwner =
    emailLower === 'tanishakumari34703@gmail.com' ||
    emailLower.startsWith('tanishakumari');

  // Admin & Office Staff access check (Malay, Arpit, Harpreet Aulakh, Owner)
  const isAdminStaff = isMalay || isArpit || isHarpreet || isOwner;

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
      
      // If user is Admin Staff, ensure Admin / Office Staff role
      if (isAdminStaff) {
        existing.role = 'admin';
        existing.approvalStatus = 'approved';
        if (isMalay) {
          existing.name = 'Malay Aggarwal';
          existing.designation = 'Assistant Vice President';
          existing.businessRole = 'Activation Head';
          existing.department = 'Central Administration & Activation Node';
          existing.facultyId = 'SUN-ADM-01';
        } else if (isArpit) {
          existing.name = 'Arpit Singh';
          existing.designation = 'Senior Associate';
          existing.businessRole = 'Campus Manager';
          existing.department = 'Campus Operations & Asset Management';
          existing.facultyId = 'SUN-OPS-02';
        } else if (isHarpreet) {
          existing.name = 'Harpreet Aulakh';
          existing.designation = 'Associate Director';
          existing.businessRole = 'Director & Placement Head';
          existing.department = 'Corporate Training & Placement Cell';
          existing.facultyId = 'SUN-CORP-01';
          existing.avatar = '/assets/faculty/harpreet_aulakh.jpeg';
        } else if (isOwner) {
          existing.name = existing.name || fbUser.displayName || 'Tanisha Kumari';
          existing.designation = 'College ERP Administrator';
          existing.businessRole = 'System Administrator';
          existing.department = 'Central Administration & Institutional Oversight';
          existing.facultyId = 'SUN-ADMIN-MASTER';
        }
        try {
          await updateDoc(userRef, {
            role: 'admin',
            approvalStatus: 'approved',
            name: existing.name,
            designation: existing.designation,
            businessRole: existing.businessRole || '',
            department: existing.department,
            facultyId: existing.facultyId,
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Could not update admin doc in Firestore:', e);
        }
      } else {
        // All other users (including faculty and current login) MUST have faculty-side access!
        existing.role = 'faculty';
        existing.approvalStatus = 'approved';
        if (matchedFaculty) {
          existing.name = matchedFaculty.name;
          existing.department = matchedFaculty.department;
          existing.designation = matchedFaculty.designation;
          existing.businessRole = matchedFaculty.businessRole;
          existing.facultyId = matchedFaculty.facultyId;
        }
        try {
          await updateDoc(userRef, {
            role: 'faculty',
            approvalStatus: 'approved',
            name: existing.name,
            designation: existing.designation,
            businessRole: existing.businessRole || '',
            department: existing.department,
            facultyId: existing.facultyId,
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

  let role: Role = 'faculty';
  let approvalStatus: 'approved' | 'pending' | 'rejected' = 'approved';
  let department = extraData?.department || matchedFaculty?.department || 'Department of Computer Science & Engineering';
  let designation = extraData?.designation || matchedFaculty?.designation || 'Faculty Member';
  let businessRole: string | undefined = matchedFaculty?.businessRole || extraData?.businessRole || 'Tech Faculty';
  let name = fbUser.displayName || extraData?.name || matchedFaculty?.name || (emailLower ? emailLower.split('@')[0] : 'Faculty Member');
  let facultyId = extraData?.facultyId || matchedFaculty?.facultyId || `SUN-FAC-${Math.floor(1000 + Math.random() * 9000)}`;
  let avatar = fbUser.photoURL || extraData?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  if (isAdminStaff) {
    role = 'admin';
    approvalStatus = 'approved';
    if (isMalay) {
      name = 'Malay Aggarwal';
      designation = 'Assistant Vice President';
      businessRole = 'Activation Head';
      department = 'Central Administration & Activation Node';
      facultyId = 'SUN-ADM-01';
      avatar = '/assets/faculty/malay_aggarwal.jpeg';
    } else if (isArpit) {
      name = 'Arpit Singh';
      designation = 'Senior Associate';
      businessRole = 'Campus Manager';
      department = 'Campus Operations & Asset Management';
      facultyId = 'SUN-OPS-02';
      avatar = '/assets/faculty/arpit_singh.jpeg';
    } else if (isHarpreet) {
      name = 'Harpreet Aulakh';
      designation = 'Associate Director';
      businessRole = 'Director & Placement Head';
      department = 'Corporate Training & Placement Cell';
      facultyId = 'SUN-CORP-01';
      avatar = '/assets/faculty/harpreet_aulakh.jpeg';
    } else if (isOwner) {
      name = fbUser.displayName || 'Tanisha Kumari';
      designation = 'College ERP Administrator';
      businessRole = 'System Administrator';
      department = 'Central Administration & Institutional Oversight';
      facultyId = 'SUN-ADMIN-MASTER';
      avatar = fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=Tanisha`;
    }
  } else if (matchedFaculty) {
    role = 'faculty';
    approvalStatus = 'approved';
    name = matchedFaculty.name;
    department = matchedFaculty.department;
    designation = matchedFaculty.designation;
    businessRole = matchedFaculty.businessRole;
    facultyId = matchedFaculty.facultyId;
    avatar = matchedFaculty.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  } else {
    // Standard user gets faculty role
    role = 'faculty';
    approvalStatus = 'approved';
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
    phone: extraData?.phone || '+91 98450 11223',
    room: isAdminStaff ? 'Main Admin Building' : (extraData?.room || 'Academic Wing Cabin #04'),
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
  },
  actor?: User | null
): Promise<string> {
  const cleanEmail = staffData.email.trim().toLowerCase();
  const docId = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const staffRef = doc(db, 'staff_directory', docId);

  const newRecord: StaffMember = {
    _id: docId,
    id: docId,
    name: staffData.name.trim(),
    email: cleanEmail,
    role: staffData.role,
    department: staffData.department,
    designation:
      staffData.designation?.trim() ||
      (staffData.role === 'admin'
        ? 'College Administrator'
        : staffData.role === 'hod'
        ? 'Head of Department'
        : staffData.role === 'tech'
        ? 'Technical Lab Officer'
        : 'Faculty Member'),
    status: 'active',
    registered: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(staffRef, newRecord);

  // If a registered user already exists with this email, automatically update and approve them
  try {
    const userQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const userSnap = await getDocs(userQuery);
    if (!userSnap.empty) {
      for (const uDoc of userSnap.docs) {
        await updateDoc(uDoc.ref, {
          role: newRecord.role,
          department: newRecord.department,
          designation: newRecord.designation,
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
    `Added pre-registered staff member (${newRecord.email}) with role [${newRecord.role}] in [${newRecord.department}]`
  );

  return docId;
}

// Admin function to update a pre-registered staff member
export async function updateStaffMemberInFirestore(
  staffId: string,
  updates: Partial<StaffMember>,
  actor?: User | null
): Promise<void> {
  const ref = doc(db, 'staff_directory', staffId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Staff record not found in directory');
  const current = snap.data() as StaffMember;

  const cleanUpdates: any = {
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  if (updates.email) {
    cleanUpdates.email = updates.email.trim().toLowerCase();
  }

  await updateDoc(ref, cleanUpdates);

  // Sync with registered user profile if linked
  if (current.registeredUid && (updates.role || updates.department || updates.designation)) {
    try {
      const userRef = doc(db, 'users', current.registeredUid);
      const userUpdates: any = {};
      if (updates.role) userUpdates.role = updates.role;
      if (updates.department) userUpdates.department = updates.department;
      if (updates.designation) userUpdates.designation = updates.designation;
      userUpdates.updatedAt = new Date().toISOString();
      await updateDoc(userRef, userUpdates);
    } catch (err) {
      console.warn('Could not sync user profile with staff updates:', err);
    }
  }

  await logAuditToFirestore(
    `Staff Updated: ${current.name}`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    staffId,
    `Updated staff directory record for ${current.name} (${current.email})`
  );
}

// Admin function to delete a pre-registered staff member
export async function deleteStaffMemberFromFirestore(
  staffId: string,
  actor?: User | null
): Promise<void> {
  const ref = doc(db, 'staff_directory', staffId);
  const snap = await getDoc(ref);
  const name = snap.exists() ? (snap.data() as any).name : staffId;
  await deleteDoc(ref);

  await logAuditToFirestore(
    `Staff Removed: ${name}`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    staffId,
    `Deleted staff directory record ${staffId}`
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
  actor?: User
): Promise<void> {
  const userRef = doc(db, 'users', targetUserId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error('User not found in Firestore');
  }
  const current = snap.data() as User;
  const designation =
    newDesignation ||
    (newRole === 'admin'
      ? 'College Administrator'
      : newRole === 'hod'
      ? `HOD / Department Head`
      : newRole === 'tech'
      ? 'Technical Lab Officer'
      : 'Faculty Member');

  await updateDoc(userRef, {
    role: newRole,
    department: newDepartment,
    designation,
    approvalStatus: 'approved',
    updatedAt: new Date().toISOString(),
  });

  await logAuditToFirestore(
    `Updated Role: ${current.name}`,
    'auth',
    actor?.name || 'Administrator',
    actor?.role || 'admin',
    targetUserId,
    `Admin changed role from [${current.role}] to [${newRole}] and department to [${newDepartment}]`
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
      action,
      category,
      actorName,
      actorRole,
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
  const initialStatus =
    cond === 'repair' || cond === 'damaged'
      ? 'maintenance'
      : Number(assetData.availableQuantity || assetData.totalQuantity) <= 0
      ? 'depleted'
      : 'operational';

  const newAsset: Asset = {
    _id: code,
    code,
    name: assetData.name || 'New Asset Item',
    department: assetData.department || actor?.department || 'Central College Lab & Facilities Node',
    category: assetData.category || 'stationery',
    categoryLabel: assetData.categoryLabel || 'Classroom Stationery',
    classification: assetData.classification || 'Reusable',
    description: assetData.description || '',
    totalQuantity: Number(assetData.totalQuantity) || 1,
    availableQuantity: Number(assetData.availableQuantity) || Number(assetData.totalQuantity) || 1,
    dispatchedQuantity: 0,
    permanentQuantity: 0,
    minThreshold: Number(assetData.minThreshold) || 2,
    isConsumable: !!assetData.isConsumable,
    isReusable: !assetData.isConsumable,
    unit: assetData.unit || 'units',
    location: assetData.location || 'Central Stationery Store',
    status: initialStatus,
    condition: cond,
    conditionRemarks: assetData.conditionRemarks || '',
    barcodeTagStatus: 'verified',
    updatedAt: now,
  };

  try {
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
  const bookingRef = doc(db, 'bookings', reqId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error('Booking not found');
  const b = snap.data() as Booking;

  await updateDoc(bookingRef, {
    status: 'approved',
    gatepassGenerated: true,
    updatedAt: new Date().toISOString(),
  });

  await logAuditToFirestore(
    `Approved Requisition ${reqId}`,
    'booking',
    actor.name,
    actor.role,
    reqId,
    `Requisition approved for ${b.assetName} by HOD/Admin`
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
  const bookingRef = doc(db, 'bookings', reqId);
  const snap = await getDoc(bookingRef);
  if (!snap.exists()) throw new Error('Booking not found');
  const b = snap.data() as Booking;

  // Deduct available stock & increase dispatched / permanent
  const assetRef = doc(db, 'assets', b.assetCode);
  const assetSnap = await getDoc(assetRef);
  if (assetSnap.exists()) {
    const a = assetSnap.data() as Asset;
    const newAvail = Math.max(0, a.availableQuantity - b.quantity);
    const newDispatched = (a.dispatchedQuantity || 0) + b.quantity;
    const isPermanent = b.type === 'permanent' || b.bookingType === 'permanent';
    const newPerm = isPermanent ? (a.permanentQuantity || 0) + b.quantity : a.permanentQuantity;

    await updateDoc(assetRef, {
      availableQuantity: newAvail,
      dispatchedQuantity: newDispatched,
      permanentQuantity: newPerm,
      status: newAvail <= 0 ? 'depleted' : newAvail <= a.minThreshold ? 'low-stock' : 'operational',
      updatedAt: new Date().toISOString(),
    });
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    status: 'dispatched',
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
  const bookingRef = doc(db, 'bookings', reqId);
  await updateDoc(bookingRef, {
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  });

  await logAuditToFirestore(
    `Cancelled Requisition ${reqId}`,
    'booking',
    actor.name,
    actor.role,
    reqId,
    `Requisition cancelled by requester`
  );
}
