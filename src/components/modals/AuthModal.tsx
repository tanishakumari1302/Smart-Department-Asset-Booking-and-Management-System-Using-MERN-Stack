import React, { useState } from 'react';
import { User, Department } from '../../types';
import { auth, googleProvider, fetchOrCreateUserProfile } from '../../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  departments?: Department[];
  onUserAuthenticated?: (user: User) => void;
  showToast?: (text: string, type: 'success' | 'warning' | 'info') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  departments = [],
  onUserAuthenticated,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDept, setRegDept] = useState(
    departments[0]?.name || 'Department of Computer Science & Engineering'
  );
  const [regDesignation, setRegDesignation] = useState('Assistant Professor');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!isOpen) return null;

  const fallbackDepts = [
    'Department of Computer Science & Engineering',
    'Department of Computer Applications',
    'Department of Electronics & Communication',
    'Department of Mechanical Engineering',
    'Department of Management Studies',
    'Central College Lab & Facilities Node',
  ];

  const deptList = departments.length > 0 ? departments.map((d) => d.name) : fallbackDepts;

  const handleFirebaseLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userProfile = await fetchOrCreateUserProfile(userCredential.user);
      if (onUserAuthenticated) onUserAuthenticated(userProfile);
      setInfoMsg('Successfully signed in with Firebase Authentication!');
      if (showToast) showToast(`Signed in as ${userProfile.name} (${userProfile.role.toUpperCase()})`, 'success');
      setTimeout(() => onClose(), 600);
    } catch (firebaseErr: any) {
      if (firebaseErr.code === 'auth/operation-not-allowed' || firebaseErr.message?.includes('operation-not-allowed')) {
        setErrorMsg('Email/Password provider is not yet enabled in the Firebase Console. Please click "Continue with Google" for instant sign-in, or enable Email/Password under Firebase Console > Authentication > Sign-in method.');
      } else {
        let msg = firebaseErr.message || 'Login failed';
        if (
          firebaseErr.code === 'auth/user-not-found' ||
          firebaseErr.code === 'auth/wrong-password' ||
          firebaseErr.code === 'auth/invalid-credential'
        ) {
          msg = 'Invalid email or password. Please verify credentials or register a new account.';
        }
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFirebaseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPassword);
      const userProfile = await fetchOrCreateUserProfile(userCredential.user, {
        name: regName.trim(),
        department: regDept,
        designation: regDesignation.trim() || 'Faculty Member',
      });
      if (onUserAuthenticated) onUserAuthenticated(userProfile);
      setInfoMsg('Account enrolled in Firebase Authentication & Firestore!');
      if (showToast) showToast(`Enrolled account for ${userProfile.name} (${userProfile.role.toUpperCase()})`, 'success');
      setTimeout(() => onClose(), 600);
    } catch (firebaseErr: any) {
      if (firebaseErr.code === 'auth/operation-not-allowed' || firebaseErr.message?.includes('operation-not-allowed')) {
        setErrorMsg('Email/Password provider is currently disabled in your Firebase Console. Please click "Continue with Google" to enroll your institutional account, or enable Email/Password under Firebase Console > Authentication > Sign-in method.');
      } else {
        let msg = firebaseErr.message || 'Registration failed';
        if (firebaseErr.code === 'auth/email-already-in-use') {
          msg = 'This email is already registered. Please sign in instead.';
        } else if (firebaseErr.code === 'auth/weak-password') {
          msg = 'Password should be at least 6 characters.';
        }
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const userProfile = await fetchOrCreateUserProfile(result.user);
      if (onUserAuthenticated) onUserAuthenticated(userProfile);
      setInfoMsg('Signed in with Google Firebase Auth!');
      if (showToast) showToast(`Signed in as ${userProfile.name} (${userProfile.role.toUpperCase()})`, 'success');
      setTimeout(() => onClose(), 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setInfoMsg('Signed out of Firebase');
      if (showToast) showToast('Signed out of Firebase', 'info');
      setTimeout(() => onClose(), 500);
    } catch (err: any) {
      console.warn(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0e1c2f]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] w-full max-w-lg overflow-hidden flex flex-col text-[#0b1c30]">
        {/* Header */}
        <div className="bg-[#0e1c2f] px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#009299] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white">
                  Institutional Identity &amp; Auth
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] text-[#009299] font-mono">
                  Cloud RBAC
                </span>
              </div>
              <p className="text-[11px] text-[#cbdbf5]/70">
                Google Sign-In &amp; Institutional Credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#cbdbf5] hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Current User Session Bar */}
        {currentUser && (
          <div className="bg-[#eff4ff] px-6 py-2.5 border-b border-[#cbdbf5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-[#0b1c30]">
                Active Session: <strong>{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold text-[#ba1a1a] hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">logout</span>
              Sign Out
            </button>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-[#e5eeff] px-6 bg-[#eff4ff]/40">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'login'
                ? 'border-[#009299] text-[#009299]'
                : 'border-transparent text-[#44474c] hover:text-[#0b1c30]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'register'
                ? 'border-[#009299] text-[#009299]'
                : 'border-transparent text-[#44474c] hover:text-[#0b1c30]'
            }`}
          >
            Enroll New Member
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-[#ffdad6]/70 border border-[#ba1a1a]/30 text-[#ba1a1a] text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0">check_circle</span>
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-10 px-4 bg-white hover:bg-[#eff4ff]/60 border border-[#cbdbf5] text-[#0b1c30] rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-60 cursor-pointer mb-4"
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
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[#e5eeff]"></div>
            <span className="text-[10px] text-[#77849c] uppercase tracking-wider font-semibold">
              or with email &amp; password
            </span>
            <div className="flex-1 h-px bg-[#e5eeff]"></div>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleFirebaseLogin} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@college.edu"
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] bg-[#eff4ff]/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] bg-[#eff4ff]/20 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 mt-1 bg-[#0e1c2f] hover:bg-[#426086] text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">login</span>
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleFirebaseRegister} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Prof. Ramesh K."
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] bg-[#eff4ff]/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] bg-[#eff4ff]/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Department
                </label>
                <select
                  value={regDept}
                  onChange={(e) => setRegDept(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] bg-[#eff4ff]/20 focus:bg-white"
                >
                  {deptList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  value={regDesignation}
                  onChange={(e) => setRegDesignation(e.target.value)}
                  placeholder="e.g. Assistant Professor"
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] bg-[#eff4ff]/20 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0b1c30] mb-1">
                  Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs text-[#0b1c30] focus:outline-none focus:border-[#009299] focus:ring-1 focus:ring-[#009299] bg-[#eff4ff]/20 focus:bg-white"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-[#eff4ff] text-[11px] text-[#426086]">
                <strong>Governance Rule:</strong> The first user who signs up becomes admin. New
                users receive the faculty role by default. Admins can update roles from User
                Management.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-9 mt-1 bg-[#009299] hover:bg-[#007b80] text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">how_to_reg</span>
                    <span>Enroll Member</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
