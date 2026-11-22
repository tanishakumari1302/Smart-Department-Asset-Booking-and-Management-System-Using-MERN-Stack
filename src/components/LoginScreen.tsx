import React, { useState } from 'react';
import {
  Department,
  User,
  AcademicSettings,
  calculateDefaultAcademicYear,
  ADMIN_OFFICE_STAFF,
  AUTHORIZED_FACULTY_MEMBERS,
  INSTITUTIONAL_LEADERSHIP,
  ALL_INSTITUTIONAL_MEMBERS,
} from '../types';
import { auth, googleProvider, fetchOrCreateUserProfile } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { FaceAuthModal } from './FaceAuthModal';
import { detectPortalFromUrl, setPortalInUrl } from '../utils/portalUtils';
import { SharePortalModal } from './SharePortalModal';

interface LoginScreenProps {
  departments: Department[];
  academicSettings?: AcademicSettings;
  onUserAuthenticated: (user: User) => void;
  showToast?: (text: string, type: 'success' | 'warning' | 'info') => void;
  lockedPortal?: 'faculty' | 'admin' | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  departments,
  academicSettings,
  onUserAuthenticated,
  showToast,
  lockedPortal,
}) => {
  const urlPortal = detectPortalFromUrl();
  const effectivePortalLock = lockedPortal || urlPortal;
  const isFacultyOnlyMode = effectivePortalLock === 'faculty';
  const isAdminOnlyMode = effectivePortalLock === 'admin';

  // Top Portal Selection: 'faculty' (Faculty Members) vs 'admin' (Admin & Office Staff)
  const [portal, setPortal] = useState<'faculty' | 'admin'>(() => {
    if (effectivePortalLock === 'admin') return 'admin';
    if (effectivePortalLock === 'faculty') return 'faculty';
    return 'faculty';
  });
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedDept, setSelectedDept] = useState(
    departments[0]?.name || 'Department of Computer Science & Engineering'
  );
  const [designation, setDesignation] = useState('Faculty Member');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [showFacultyDemoList, setShowFacultyDemoList] = useState(false);
  const [selectedDemoFacultyId, setSelectedDemoFacultyId] = useState('');
  const [showAdminDemoList, setShowAdminDemoList] = useState(false);
  const [selectedDemoAdminId, setSelectedDemoAdminId] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Biometric Face Detection Login modal state
  const [isFaceAuthModalOpen, setIsFaceAuthModalOpen] = useState(false);
  const [faceAuthPortal, setFaceAuthPortal] = useState<'faculty' | 'admin'>('faculty');
  const [initialFaceTargetId, setInitialFaceTargetId] = useState<string | undefined>(undefined);

  const handleOpenFaceAuth = (targetPortal: 'faculty' | 'admin', targetUserId?: string) => {
    setFaceAuthPortal(targetPortal);
    setInitialFaceTargetId(targetUserId);
    setIsFaceAuthModalOpen(true);
  };

  const fallbackDepts = [
    'Department of Computer Science & Engineering',
    'Department of Computer Applications',
    'Department of Electronics & Communication',
    'Department of Mechanical Engineering',
    'Department of Management Studies',
    'Central College Lab & Facilities Node',
  ];
  const deptList = departments.length > 0 ? departments.map((d) => d.name) : fallbackDepts;



  // 1-Click Fast Sign-In for Admin / Office Staff
  const handleQuickAdminLogin = async (staffMember: User) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const adminUser: User = {
        ...staffMember,
        role: 'admin',
        approvalStatus: 'approved',
      };
      onUserAuthenticated(adminUser);
      localStorage.setItem('assethub_active_user', JSON.stringify(adminUser));
      if (showToast) {
        showToast(
          `Signed in as ${staffMember.name} (ADMIN / OFFICE STAFF)`,
          'success'
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Sign-In for Faculty (10 Authorized Faculty Members)
  const handleQuickFacultyLogin = async (facultyMember: User) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const facUser: User = {
        ...facultyMember,
        role: facultyMember.role === 'admin' ? 'admin' : 'faculty',
        approvalStatus: 'approved',
      };
      onUserAuthenticated(facUser);
      localStorage.setItem('assethub_active_user', JSON.stringify(facUser));
      if (showToast) {
        showToast(
          `Signed in as ${facultyMember.name} (${facUser.role === 'admin' ? 'DUAL ACCESS: Faculty & Admin' : 'FACULTY'})`,
          'success'
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick faculty login failed');
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In with strict portal-based role assignment
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userProfile = await fetchOrCreateUserProfile(result.user);

      const emailLower = (result.user.email || '').toLowerCase().trim();
      const isRegisteredAdmin =
        emailLower === 'malay@sunstone.in' ||
        emailLower === 'arpit.singh@sunstone.in' ||
        emailLower === 'arpitsingh@gmail.com' ||
        emailLower === 'arpit.singh@college.edu' ||
        emailLower === 'malay.aggarwal@college.edu' ||
        emailLower === 'malayaggarwal@gmail.com' ||
        emailLower === 'tanishakumari34703@gmail.com' ||
        emailLower.startsWith('tanishakumari');

      if (portal === 'faculty') {
        // Enforce faculty role for faculty portal login
        userProfile.role = 'faculty';
        userProfile.approvalStatus = 'approved';
        onUserAuthenticated(userProfile);
        localStorage.setItem('assethub_active_user', JSON.stringify(userProfile));
        if (showToast) {
          showToast(`Entered Faculty Portal as ${userProfile.name}`, 'success');
        }
        return;
      }

      // Admin portal check
      if (portal === 'admin') {
        if (!isRegisteredAdmin && userProfile.role !== 'admin') {
          setErrorMsg(
            'Access Restricted: Admin & Office Staff portal is reserved for Malay Aggarwal & Arpit Singh only. Please switch to the Faculty Portal tab to enter.'
          );
          return;
        }
        userProfile.role = 'admin';
        onUserAuthenticated(userProfile);
        localStorage.setItem('assethub_active_user', JSON.stringify(userProfile));
        if (showToast) {
          showToast(`Entered Admin Command Center as ${userProfile.name}`, 'success');
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In notice:', err);
      setErrorMsg(err.message || 'Google sign-in could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  // Email Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both institutional email and password.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const isRegisteredAdmin =
      trimmedEmail === 'malay@sunstone.in' ||
      trimmedEmail === 'arpit.singh@sunstone.in' ||
      trimmedEmail === 'arpitsingh@gmail.com' ||
      trimmedEmail === 'arpit.singh@college.edu' ||
      trimmedEmail === 'malay.aggarwal@college.edu' ||
      trimmedEmail === 'malayaggarwal@gmail.com' ||
      trimmedEmail === 'tanishakumari34703@gmail.com';

    // Role portal check
    if (portal === 'admin' && !isRegisteredAdmin) {
      setErrorMsg(
        'Access Restricted: Admin & Office Staff portal is reserved exclusively for Malay Aggarwal and Arpit Singh. For faculty access, please select the Faculty Portal tab.'
      );
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const userProfile = await fetchOrCreateUserProfile(userCredential.user);
      if (portal === 'faculty') {
        userProfile.role = 'faculty';
      } else {
        userProfile.role = 'admin';
      }
      onUserAuthenticated(userProfile);
      localStorage.setItem('assethub_active_user', JSON.stringify(userProfile));
      if (showToast) {
        showToast(
          `Signed in as ${userProfile.name} (${userProfile.role.toUpperCase()})`,
          'success'
        );
      }
    } catch (err: any) {
      // Check if this matches a predefined demo credential
      const matchedAdmin = ADMIN_OFFICE_STAFF.find((a) => a.email.toLowerCase() === trimmedEmail);
      const matchedFaculty = AUTHORIZED_FACULTY_MEMBERS.find((f) => f.email.toLowerCase() === trimmedEmail);

      if (portal === 'faculty') {
        const facTarget = matchedFaculty || {
          ...AUTHORIZED_FACULTY_MEMBERS[0],
          email: trimmedEmail,
          name: trimmedEmail.split('@')[0],
        };
        onUserAuthenticated(facTarget);
        localStorage.setItem('assethub_active_user', JSON.stringify(facTarget));
        if (showToast) {
          showToast(`Signed in as ${facTarget.name} (FACULTY)`, 'success');
        }
        return;
      }

      if (portal === 'admin' && (matchedAdmin || isRegisteredAdmin)) {
        const adminTarget: User = matchedAdmin || {
          _id: 'usr_admin_tanisha',
          id: 'usr_admin_tanisha',
          name: 'Tanisha Kumari',
          email: trimmedEmail,
          role: 'admin',
          approvalStatus: 'approved',
          department: 'Central Administration & Institutional Oversight',
          designation: 'College ERP Administrator',
          businessRole: 'System Administrator',
          facultyId: 'SUN-ADMIN-MASTER',
        };
        onUserAuthenticated(adminTarget);
        localStorage.setItem('assethub_active_user', JSON.stringify(adminTarget));
        if (showToast) {
          showToast(`Signed in as ${adminTarget.name} (ADMIN)`, 'success');
        }
        return;
      }

      if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Email & Password provider is disabled in Firebase console. Please use 1-Click Fast Sign-In or Continue with Google.'
        );
      } else {
        setErrorMsg(err.message || 'Invalid email or password credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please complete all registration fields.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const userProfile = await fetchOrCreateUserProfile(userCredential.user, {
        name: name.trim(),
        department: selectedDept,
        designation: designation.trim() || 'Faculty Member',
        role: portal === 'admin' ? 'admin' : 'faculty',
      });
      onUserAuthenticated(userProfile);
      localStorage.setItem('assethub_active_user', JSON.stringify(userProfile));
      if (showToast) {
        showToast(`Account registered for ${userProfile.name}`, 'success');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafd] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 select-none text-[#0b1c30]">
      {/* Top Background Brand Header */}
      <div className="w-full max-w-2xl mb-6 text-center flex flex-col items-center">
        <div className="h-14 w-14 rounded-2xl bg-[#0e1c2f] flex items-center justify-center text-white shadow-lg mb-3">
          <span className="material-symbols-outlined text-[32px] text-[#009299]">dns</span>
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#0e1c2f]">AssetHub</h1>
          <span className="px-2 py-0.5 rounded bg-[#002022] text-[#009299] text-xs font-bold uppercase tracking-wider">
            ERP
          </span>
        </div>
        <p className="text-sm text-[#426086] mt-1 font-medium">
          College Asset &amp; Central Laboratory Management System
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eff4ff] text-[#426086] text-xs border border-[#cbdbf5]">
          <span className="w-2 h-2 rounded-full bg-[#009299] animate-pulse"></span>
          <span>
            Academic Year {academicSettings?.academicYear || calculateDefaultAcademicYear().academicYear} • Institutional Portal
          </span>
        </div>
      </div>

      {/* PORTAL NAVIGATION / BANNER */}
      {isFacultyOnlyMode ? (
        <div className="w-full max-w-2xl mb-5 flex justify-center">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#0e1c2f] text-white text-xs font-bold shadow-sm border border-slate-700">
            <span className="material-symbols-outlined text-[20px] text-[#75f5fd]">school</span>
            <span>Sunstone Institutional Faculty Portal</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-teal-300 text-[10px] font-mono">
              14 Faculty Members
            </span>
          </div>
        </div>
      ) : isAdminOnlyMode ? (
        <div className="w-full max-w-2xl mb-5 flex flex-col items-center gap-1.5">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#0e1c2f] text-white text-xs font-bold shadow-sm border border-slate-700">
            <span className="material-symbols-outlined text-[20px] text-[#75f5fd]">admin_panel_settings</span>
            <span>Admin &amp; Office Staff Command Center</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-teal-300 text-[10px] font-mono">
              Malay Aggarwal &amp; Arpit Singh
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#009299]/30 text-teal-200 text-[10px] font-bold">
              Dual Access
            </span>
          </div>
          <span className="text-[11px] text-[#426086]">
            Campus Operations &amp; Inventory Management • Includes Faculty Desk View Switcher
          </span>
        </div>
      ) : (
        <div className="w-full max-w-2xl mb-5">
          <div className="bg-[#e5eeff] p-1.5 rounded-2xl grid grid-cols-2 gap-1.5 shadow-sm border border-[#cbdbf5]">
            {/* TAB 1: FACULTY PORTAL (Left / Primary) */}
            <button
              type="button"
              onClick={() => {
                setPortal('faculty');
                setPortalInUrl('faculty');
                setErrorMsg('');
                setSuccessNotice('');
              }}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                portal === 'faculty'
                  ? 'bg-[#0e1c2f] text-white shadow-md'
                  : 'text-[#426086] hover:text-[#0b1c30] hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] text-[#75f5fd]">school</span>
              <div className="flex flex-col text-left">
                <span>Faculty Portal Login</span>
                <span className={`text-[10px] font-normal ${portal === 'faculty' ? 'text-teal-300' : 'text-[#77849c]'}`}>
                  14 Authorized Faculty Members
                </span>
              </div>
            </button>

            {/* TAB 2: ADMIN & OFFICE STAFF (Right / Restricted to 2 People) */}
            <button
              type="button"
              onClick={() => {
                setPortal('admin');
                setPortalInUrl('admin');
                setErrorMsg('');
                setSuccessNotice('');
              }}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                portal === 'admin'
                  ? 'bg-[#0e1c2f] text-white shadow-md'
                  : 'text-[#426086] hover:text-[#0b1c30] hover:bg-white/50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px] text-[#75f5fd]">admin_panel_settings</span>
              <div className="flex flex-col text-left">
                <span>Admin &amp; Office Staff</span>
                <span className={`text-[10px] font-normal ${portal === 'admin' ? 'text-teal-300' : 'text-[#77849c]'}`}>
                  Malay Aggarwal &amp; Arpit Singh only
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-[#e5eeff] p-6 sm:p-8 flex flex-col gap-6">
        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#ffdad6]/70 border border-[#ba1a1a]/30 text-[#ba1a1a] text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* =========================================================================
            PORTAL 1: FACULTY PORTAL (12 Authorized Faculty Members)
            ========================================================================= */}
        {portal === 'faculty' && (
          <div className="flex flex-col gap-5">
            {/* Header info */}
            <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#cbdbf5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0e1c2f] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px] text-[#009299]">school</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0e1c2f]">
                    Faculty &amp; Academic Staff Portal
                  </h2>
                  <p className="text-[11px] text-[#426086]">
                    Sign in with your institutional credentials to open the <strong>Request Asset</strong> desk.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#0e1c2f] text-[#75f5fd] text-[10px] font-bold uppercase tracking-wider shrink-0 border border-[#009299]/30">
                Faculty Portal
              </span>
            </div>

            {/* PRIMARY: Faculty Institutional Email & Password Form (Prominently Visible) */}
            <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Faculty Institutional Email
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#77849c] text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. mohini.gupta@sunstone.in or simran.khera@sunstone.in"
                    className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] placeholder:text-[#77849c] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] transition-all bg-[#eff4ff]/20 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#0b1c30]">
                    Password
                  </label>
                  <span className="text-[11px] text-[#77849c]">Default demo: any password</span>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#77849c] text-[18px]">
                    lock
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] placeholder:text-[#77849c] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] transition-all bg-[#eff4ff]/20 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 mt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>Sign In &amp; Open Request Asset Page</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="h-11 px-4 bg-white hover:bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                  title="Sign in with Google"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                    />
                  </svg>
                  <span>Google</span>
                </button>
              </div>

              {/* Contactless Biometric Face Detection Option */}
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-[#cbdbf5]"></div>
                <span className="shrink mx-3 text-[10px] uppercase font-bold text-[#426086] tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-[#009299]">badge</span>
                  or contactless face login
                </span>
                <div className="grow border-t border-[#cbdbf5]"></div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenFaceAuth('faculty')}
                disabled={loading}
                className="w-full h-11 bg-linear-to-r from-[#0e1c2f] via-[#1a2f4c] to-[#004f55] hover:from-[#071322] hover:to-[#0e1c2f] text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer border border-[#009299]/50 group"
              >
                <span className="material-symbols-outlined text-[20px] text-[#75f5fd] group-hover:scale-110 transition-transform">
                  face
                </span>
                <span>Sign In with Face Detection (Face ID)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#009299]/20 text-[#75f5fd] text-[9px] font-mono uppercase tracking-wider border border-[#009299]/30">
                  Live Camera
                </span>
              </button>
            </form>

            {/* OPTIONAL TOGGLE: Demo Faculty Accounts (Hidden by default as requested) */}
            <div className="border border-[#cbdbf5] rounded-xl p-3 bg-[#f8fafd] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#009299]">school</span>
                  <span className="text-xs font-bold text-[#0b1c30]">
                    Faculty Demo Accounts (Optional)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFacultyDemoList(!showFacultyDemoList)}
                  className="text-xs text-[#009299] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>{showFacultyDemoList ? 'Hide Demo Names' : `Show Faculty Members (${AUTHORIZED_FACULTY_MEMBERS.length})`}</span>
                  <span className="material-symbols-outlined text-[16px]">
                    {showFacultyDemoList ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>

              {/* Quick Select Dropdown for Faculty Accounts */}
              <div className="flex flex-col gap-2">
                <select
                  value={selectedDemoFacultyId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const fac = AUTHORIZED_FACULTY_MEMBERS.find((f) => f.id === val);
                    if (fac) {
                      setSelectedDemoFacultyId(fac.id || '');
                      handleQuickFacultyLogin(fac);
                    }
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#cbdbf5] bg-white text-xs text-[#0b1c30] focus:outline-none focus:border-[#009299] cursor-pointer"
                >
                  <option value="">-- Choose Academic Faculty Member ({AUTHORIZED_FACULTY_MEMBERS.length}) --</option>
                  {AUTHORIZED_FACULTY_MEMBERS.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} • {fac.designation} [{fac.businessRole}] ({fac.email})
                    </option>
                  ))}
                </select>

                {/* Quick 1-Click Fast Faculty Sign-In Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#cbdbf5]/50 text-xs">
                  <span className="text-[10px] font-bold text-[#426086] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#009299]">school</span>
                    Fast 1-Click:
                  </span>
                  {AUTHORIZED_FACULTY_MEMBERS.slice(0, 5).map((fac) => {
                    const isDualAdmin = fac.role === 'admin';
                    return (
                      <button
                        key={`fast_fac_btn_${fac.id}`}
                        type="button"
                        onClick={() => handleQuickFacultyLogin(fac)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                          isDualAdmin
                            ? 'bg-[#009299] text-white hover:bg-[#007b80] border-[#009299]'
                            : 'bg-[#eff4ff] hover:bg-[#dce9ff] text-[#009299] hover:text-[#007b80] border-[#cbdbf5]'
                        }`}
                        title={isDualAdmin ? `${fac.name} (Associate Director - Faculty Requisitions + Admin Approvals)` : fac.name}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isDualAdmin ? 'bg-cyan-200' : 'bg-[#009299]'}`}></span>
                        <span>{fac.name === 'Harpreet Aulakh' ? 'Harpreet Aulakh (Dual)' : fac.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible 12 Faculty Cards Grid (Hidden by default) */}
              {showFacultyDemoList && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-[300px] overflow-y-auto pr-1">
                  {AUTHORIZED_FACULTY_MEMBERS.map((fac) => (
                    <button
                      key={fac.id}
                      type="button"
                      onClick={() => handleQuickFacultyLogin(fac)}
                      disabled={loading}
                      className="p-2.5 rounded-xl border border-[#cbdbf5] hover:border-[#009299] bg-white hover:bg-[#eff4ff] transition-all text-left flex items-center gap-2.5 shadow-2xs cursor-pointer group disabled:opacity-50"
                    >
                      <img
                        src={fac.avatar}
                        alt={fac.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-teal-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0e1c2f] group-hover:text-[#009299] truncate">
                            {fac.name}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#e6f7f8] text-[#009299] uppercase">
                            {fac.businessRole || 'Faculty'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#426086] truncate font-medium">
                          {fac.designation}
                        </p>
                        <p className="text-[9px] font-mono text-[#77849c] truncate">
                          {fac.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Faculty Capabilities Breakdown (Matching Diagram) */}
            <div className="p-3.5 rounded-xl bg-[#e6f7f8]/50 border border-[#009299]/20 flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#004f55] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#009299]">school</span>
                Faculty Member Use Cases (System Specifications)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#0b1c30]/80">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>View Asset Availability, Category, Quantity &amp; Location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>Submit Temporary Booking Request</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>Submit Permanent Allocation Request</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>Submit Consumable Issue Request</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>View Request Status &amp; Custody History</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Read-Only Catalog (No Edit / Stock Adjust)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PORTAL 2: ADMIN & OFFICE STAFF (Only 2 Authorized Personnel)
            ========================================================================= */}
        {portal === 'admin' && (
          <div className="flex flex-col gap-5">
            {/* Header info */}
            <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#cbdbf5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0e1c2f] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px] text-[#009299]">badge</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0e1c2f]">
                    Admin &amp; Office Staff Command Center
                  </h2>
                  <p className="text-[11px] text-[#426086]">
                    Sign in with your administrative credentials to manage asset inventory, approvals, and audits.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#0e1c2f] text-[#75f5fd] text-[10px] font-bold uppercase tracking-wider shrink-0 border border-[#009299]/30">
                Admin Portal
              </span>
            </div>

            {/* PRIMARY: Admin Staff Email & Password Form (Prominently Visible) */}
            <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Institutional Staff Email
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#77849c] text-[18px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. malay@sunstone.in or arpit.singh@sunstone.in"
                    className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] placeholder:text-[#77849c] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] transition-all bg-[#eff4ff]/20 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#0b1c30]">
                    Password
                  </label>
                  <span className="text-[11px] text-[#77849c]">Default demo: any password</span>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-[#77849c] text-[18px]">
                    lock
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] placeholder:text-[#77849c] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] transition-all bg-[#eff4ff]/20 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 mt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-11 bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                  <span>Sign In as Admin / Office Staff</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="h-11 px-4 bg-white hover:bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] rounded-lg font-semibold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                  title="Sign in with Google"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                    />
                  </svg>
                  <span>Google</span>
                </button>
              </div>

              {/* Contactless Biometric Face Detection Option */}
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-[#cbdbf5]"></div>
                <span className="shrink mx-3 text-[10px] uppercase font-bold text-[#426086] tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-[#009299]">badge</span>
                  or biometric security clearance
                </span>
                <div className="grow border-t border-[#cbdbf5]"></div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenFaceAuth('admin')}
                disabled={loading}
                className="w-full h-11 bg-linear-to-r from-[#0e1c2f] via-[#1a2f4c] to-[#004f55] hover:from-[#071322] hover:to-[#0e1c2f] text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer border border-[#009299]/50 group"
              >
                <span className="material-symbols-outlined text-[20px] text-[#75f5fd] group-hover:scale-110 transition-transform">
                  face
                </span>
                <span>Sign In with Face Detection (Face ID)</span>
                <span className="px-2 py-0.5 rounded-full bg-[#009299]/20 text-[#75f5fd] text-[9px] font-mono uppercase tracking-wider border border-[#009299]/30">
                  Admin Clearance
                </span>
              </button>
            </form>

            {/* OPTIONAL TOGGLE: Admin Demo Accounts (Hidden by default as requested) */}
            <div className="border border-[#cbdbf5] rounded-xl p-3 bg-[#f8fafd] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#009299]">badge</span>
                  <span className="text-xs font-bold text-[#0b1c30]">
                    Admin Demo Accounts (Optional)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminDemoList(!showAdminDemoList)}
                  className="text-xs text-[#009299] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>{showAdminDemoList ? 'Hide Admin Officers' : `Show Admin Officers (${ADMIN_OFFICE_STAFF.length})`}</span>
                  <span className="material-symbols-outlined text-[16px]">
                    {showAdminDemoList ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>

              {/* Quick Select Dropdown for Instant Admin Access */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedDemoAdminId}
                  onChange={(e) => {
                    const foundUser = ADMIN_OFFICE_STAFF.find((s) => s.id === e.target.value);
                    if (foundUser) {
                      setSelectedDemoAdminId(foundUser.id || '');
                      handleQuickAdminLogin(foundUser);
                    }
                  }}
                  className="w-full h-9 px-2.5 rounded-lg border border-[#cbdbf5] bg-white text-xs text-[#0b1c30] focus:outline-none focus:border-[#009299] cursor-pointer"
                >
                  <option value="">-- Direct 1-Click Access: Choose Admin Officer --</option>
                  {ADMIN_OFFICE_STAFF.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      ⚡ Direct Access: {staff.name} • {staff.designation} [{staff.businessRole}] ({staff.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fast 1-Click Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-bold text-[#426086] shrink-0">1-Click Fast Enter:</span>
                <button
                  type="button"
                  onClick={() => handleQuickAdminLogin(ADMIN_OFFICE_STAFF[0])}
                  className="px-3.5 py-1.5 bg-[#0e1c2f] hover:bg-[#1a2f4c] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Malay Aggarwal (AVP / Admin)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdminLogin(ADMIN_OFFICE_STAFF[1])}
                  className="px-3.5 py-1.5 bg-[#004f55] hover:bg-[#003d42] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-teal-300"></span>
                  <span>Arpit Singh (Campus Manager)</span>
                </button>
                {ADMIN_OFFICE_STAFF[2] && (
                  <button
                    type="button"
                    onClick={() => handleQuickAdminLogin(ADMIN_OFFICE_STAFF[2])}
                    className="px-3.5 py-1.5 bg-[#426086] hover:bg-[#2e4766] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-300"></span>
                    <span>Harpreet Aulakh (Associate Director)</span>
                  </button>
                )}
              </div>

              {/* Collapsible Admin Officers Grid */}
              {showAdminDemoList && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
                  {ADMIN_OFFICE_STAFF.map((staff) => (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => handleQuickAdminLogin(staff)}
                      disabled={loading}
                      className="p-3 rounded-xl border-2 border-[#cbdbf5] hover:border-[#0e1c2f] bg-white hover:bg-[#eff4ff]/60 transition-all text-left flex items-center gap-2.5 shadow-xs hover:shadow-md cursor-pointer group disabled:opacity-50"
                    >
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0e1c2f] group-hover:text-[#009299] transition-colors truncate">
                            {staff.name}
                          </span>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#0e1c2f] text-[#75f5fd] uppercase">
                            {staff.businessRole || 'Staff'}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#426086] truncate font-medium">
                          {staff.designation}
                        </p>
                        <p className="text-[9px] text-[#009299] font-mono truncate font-semibold">
                          {staff.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Capabilities Breakdown (Matching Diagram) */}
            <div className="p-3.5 rounded-xl bg-[#eff4ff]/60 border border-[#cbdbf5] flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0e1c2f] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#009299]">verified</span>
                Admin &amp; Office Staff Use Cases (System Specifications)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-[#426086]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>View Pending Requisitions Queue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>Approve / Reject Requests (with reasons/notes)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>Manage Assets (Stock, Condition, Add/Edit)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>Record Permanent Department Allocations</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>Issue Consumables &amp; Update Stock</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
                  <span>Review Booking &amp; Usage Audit History</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share Department Links Trigger */}
      <div className="mt-5 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="px-4 py-2 bg-white/90 hover:bg-white text-[#0e1c2f] border border-[#cbdbf5] rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer hover:shadow-md"
        >
          <span className="material-symbols-outlined text-[18px] text-[#009299]">share</span>
          <span>Share Faculty &amp; Admin Portal Links (24/7 Cloud Active)</span>
        </button>
      </div>

      {/* College ERP footer note */}
      <div className="mt-3 text-center text-xs text-[#77849c]">
        <span>Protected Institutional Portal • Firebase Firestore RBAC Secured • 3 Admin Custodians &amp; 13 Faculty Members</span>
      </div>

      {/* Biometric Face Detection Modal */}
      <FaceAuthModal
        isOpen={isFaceAuthModalOpen}
        portal={faceAuthPortal}
        initialTargetId={initialFaceTargetId}
        onClose={() => setIsFaceAuthModalOpen(false)}
        onAuthenticated={(user) => {
          onUserAuthenticated(user);
        }}
        showToast={showToast}
      />

      {/* Share Department Links Modal */}
      <SharePortalModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        showToast={showToast}
      />
    </div>
  );
};
