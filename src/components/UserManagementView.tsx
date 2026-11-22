import React, { useState, useMemo } from 'react';
import { User, Booking, Department, Role, StaffMember, ADMIN_OFFICE_STAFF, AUTHORIZED_FACULTY_MEMBERS } from '../types';

interface UserManagementViewProps {
  users: User[];
  staffDirectory: StaffMember[];
  departments: Department[];
  bookings: Booking[];
  currentUser: User | null;
  onUpdateUserRoleAndDept: (
    userId: string,
    role: Role,
    department: string,
    designation?: string
  ) => Promise<void>;
  onAddStaffMember: (staffData: {
    name: string;
    email: string;
    role: Role;
    department: string;
    designation?: string;
  }) => Promise<void>;
  onUpdateStaffMember: (staffId: string, updates: Partial<StaffMember>) => Promise<void>;
  onDeleteStaffMember: (staffId: string) => Promise<void>;
  onBulkImportStaff: (
    rawText: string,
    defaultDept: string
  ) => Promise<{ added: number; updated: number; errors: string[] }>;
  onApproveUser: (
    userId: string,
    role: Role,
    department: string,
    designation?: string
  ) => Promise<void>;
  onRejectUser: (userId: string, reason?: string) => Promise<void>;
  onOpenAuthModal?: () => void;
  onOpenAcademicSettingsModal?: () => void;
  showToast?: (text: string, type: 'success' | 'warning' | 'info') => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  staffDirectory,
  departments,
  bookings,
  currentUser,
  onUpdateUserRoleAndDept,
  onAddStaffMember,
  onUpdateStaffMember,
  onDeleteStaffMember,
  onBulkImportStaff,
  onApproveUser,
  onRejectUser,
  onOpenAuthModal,
  onOpenAcademicSettingsModal,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'registered' | 'directory'>('registered');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Add staff modal state
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('faculty');
  const [newDept, setNewDept] = useState('');
  const [newDesignation, setNewDesignation] = useState('Faculty Member');
  const [addingStaff, setAddingStaff] = useState(false);

  // Bulk import state
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [importing, setImporting] = useState(false);

  // Edit staff modal state
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>('faculty');
  const [editDept, setEditDept] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Pending user role selections
  const [pendingSelections, setPendingSelections] = useState<{
    [userId: string]: { role: Role; department: string };
  }>({});

  const isAdmin = currentUser?.role === 'admin';

  const fallbackDepts = [
    'Department of Computer Science & Engineering',
    'Department of Computer Applications',
    'Department of Electronics & Communication',
    'Department of Mechanical Engineering',
    'Department of Management Studies',
    'Central College Lab & Facilities Node',
  ];

  const deptNames = departments.length > 0 ? departments.map((d) => d.name) : fallbackDepts;

  // Institutional roster: Official Sunstone Personnel (2 Admin & 14 Faculty Members)
  const allSystemUsers = useMemo(() => {
    // Known duplicate test personal emails that should not clutter the official institutional directory
    const duplicateTestEmails = new Set([
      'arpitsingh@gmail.com',
      'malayaggarwal@gmail.com',
      'tanishakumari34703@gmail.com',
      'arpit.singh@college.edu',
      'malay.aggarwal@college.edu',
      'admin@assethub.edu',
      'faculty@assethub.edu',
      'tech@assethub.edu',
    ]);

    // Official verified profiles always take precedence with photos and authentic Sunstone IDs (deduplicated)
    const list: User[] = [];
    const existingEmails = new Set<string>();
    const existingNames = new Set<string>();

    [...ADMIN_OFFICE_STAFF, ...AUTHORIZED_FACULTY_MEMBERS].forEach((u) => {
      const email = (u.email || '').toLowerCase().trim();
      const name = (u.name || '').toLowerCase().trim();
      if (!existingEmails.has(email) && !existingNames.has(name)) {
        list.push(u);
        existingEmails.add(email);
        existingNames.add(name);
      }
    });

    // Merge any live users from database that are NOT mock or test duplicates
    users.forEach((u) => {
      const email = (u.email || '').toLowerCase().trim();
      const name = (u.name || '').toLowerCase().trim();
      if (
        !email.endsWith('@college.edu') &&
        !duplicateTestEmails.has(email) &&
        !existingEmails.has(email) &&
        !existingNames.has(name)
      ) {
        list.push(u);
        existingEmails.add(email);
      }
    });

    return list;
  }, [users]);

  // Master Staff Directory: Pre-populate and merge with official 16 Sunstone personnel
  const effectiveStaffDirectory = useMemo<StaffMember[]>(() => {
    const duplicateTestEmails = new Set([
      'arpitsingh@gmail.com',
      'malayaggarwal@gmail.com',
      'tanishakumari34703@gmail.com',
      'arpit.singh@college.edu',
      'malay.aggarwal@college.edu',
      'admin@assethub.edu',
      'faculty@assethub.edu',
      'tech@assethub.edu',
    ]);

    const officialRoster: StaffMember[] = [];
    const seenStaffEmails = new Set<string>();

    [...ADMIN_OFFICE_STAFF, ...AUTHORIZED_FACULTY_MEMBERS].forEach((staff) => {
      const email = (staff.email || '').toLowerCase().trim();
      if (!seenStaffEmails.has(email)) {
        seenStaffEmails.add(email);
        officialRoster.push({
          id: staff.id,
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          designation: staff.designation,
          businessRole: staff.businessRole,
          department: staff.department,
          role: staff.role,
          employeeId: staff.facultyId,
          status: 'active' as const,
          registered: true,
          createdAt: staff.createdAt,
        });
      }
    });

    if (!staffDirectory || staffDirectory.length === 0) {
      return officialRoster;
    }

    const validLive = staffDirectory.filter(
      (s) =>
        !s.email?.endsWith('@college.edu') &&
        !duplicateTestEmails.has((s.email || '').toLowerCase().trim())
    );
    const liveEmails = new Set(validLive.map((s) => s.email.toLowerCase()));

    const combined: StaffMember[] = [...validLive];
    officialRoster.forEach((off) => {
      if (!liveEmails.has(off.email.toLowerCase())) {
        combined.push(off);
      }
    });

    return combined;
  }, [staffDirectory]);

  // Split users into pending and approved
  const pendingUsers = allSystemUsers.filter((u) => u.approvalStatus === 'pending');
  const activeUsers = allSystemUsers.filter((u) => u.approvalStatus !== 'pending');

  // Filtered registered users
  const filteredUsers = activeUsers.filter((u) => {
    const matchesSearch =
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.businessRole || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.facultyId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    const matchesDept = selectedDeptFilter === 'all' || u.department === selectedDeptFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  // Filtered staff directory
  const filteredStaff = effectiveStaffDirectory.filter((s) => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.businessRole || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.designation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRoleFilter === 'all' || s.role === selectedRoleFilter;
    const matchesDept = selectedDeptFilter === 'all' || s.department === selectedDeptFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  // Handle Role Change
  const handleRoleChange = async (targetUser: User, newRoleVal: Role) => {
    if (!isAdmin) {
      if (showToast) showToast('Only administrators can change user roles.', 'warning');
      return;
    }
    setUpdatingUserId(targetUser.id || targetUser._id);
    try {
      await onUpdateUserRoleAndDept(
        targetUser.id || targetUser._id,
        newRoleVal,
        targetUser.department || deptNames[0]
      );
      if (showToast) {
        showToast(
          `Updated role for ${targetUser.name} to ${newRoleVal.toUpperCase()}`,
          'success'
        );
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to update user role', 'warning');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Handle Dept Change
  const handleDeptChange = async (targetUser: User, newDeptVal: string) => {
    if (!isAdmin) {
      if (showToast) showToast('Only administrators can reassign departments.', 'warning');
      return;
    }
    setUpdatingUserId(targetUser.id || targetUser._id);
    try {
      await onUpdateUserRoleAndDept(
        targetUser.id || targetUser._id,
        targetUser.role,
        newDeptVal
      );
      if (showToast) {
        showToast(`Reassigned ${targetUser.name} to ${newDeptVal}`, 'success');
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to update user department', 'warning');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Add single staff
  const handleSaveNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      if (showToast) showToast('Please enter both name and email.', 'warning');
      return;
    }
    setAddingStaff(true);
    try {
      await onAddStaffMember({
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        department: newDept || deptNames[0],
        designation: newDesignation.trim(),
      });
      if (showToast) {
        showToast(`Added ${newName} to staff directory with role ${newRole.toUpperCase()}`, 'success');
      }
      setNewName('');
      setNewEmail('');
      setNewRole('faculty');
      setNewDesignation('Faculty Member');
      setIsAddStaffOpen(false);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to add staff member', 'warning');
    } finally {
      setAddingStaff(false);
    }
  };

  // Bulk import
  const handleProcessBulkImport = async () => {
    if (!bulkText.trim()) {
      if (showToast) showToast('Please paste rows into the bulk import box.', 'warning');
      return;
    }
    setImporting(true);
    try {
      const res = await onBulkImportStaff(bulkText, deptNames[0]);
      if (showToast) {
        showToast(
          `Imported ${res.added} new staff, updated ${res.updated} records. ${
            res.errors.length ? `(${res.errors.length} failed)` : ''
          }`,
          res.errors.length ? 'warning' : 'success'
        );
      }
      setBulkText('');
      setIsBulkImportOpen(false);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Bulk import failed', 'warning');
    } finally {
      setImporting(false);
    }
  };

  // Approve pending user
  const handleApprovePending = async (user: User) => {
    const sel = pendingSelections[user.id || user._id] || {
      role: 'faculty',
      department: user.department || deptNames[0],
    };
    try {
      await onApproveUser(user.id || user._id, sel.role, sel.department);
      if (showToast) {
        showToast(`Approved access for ${user.name} as ${sel.role.toUpperCase()}`, 'success');
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Approval failed', 'warning');
    }
  };

  // Reject pending user
  const handleRejectPending = async (user: User) => {
    if (!confirm(`Are you sure you want to reject registration for ${user.name}?`)) return;
    try {
      await onRejectUser(user.id || user._id, 'Administrator rejection');
      if (showToast) showToast(`Rejected registration for ${user.name}`, 'info');
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Rejection failed', 'warning');
    }
  };

  // Open edit staff modal
  const handleStartEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditRole(staff.role);
    setEditDept(staff.department);
    setEditDesignation(staff.designation || '');
  };

  // Save edit staff
  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSavingEdit(true);
    try {
      await onUpdateStaffMember(editingStaff.id || editingStaff._id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        department: editDept || deptNames[0],
        designation: editDesignation.trim(),
      });
      if (showToast) showToast(`Updated staff record for ${editName}`, 'success');
      setEditingStaff(null);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to update staff', 'warning');
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle staff active/deactivated
  const handleToggleStaffStatus = async (staff: StaffMember) => {
    const nextStatus = staff.status === 'active' ? 'deactivated' : 'active';
    try {
      await onUpdateStaffMember(staff.id || staff._id, { status: nextStatus });
      if (showToast) {
        showToast(
          `${staff.name} is now ${nextStatus === 'active' ? 'Active' : 'Deactivated'}`,
          'info'
        );
      }
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to update status', 'warning');
    }
  };

  // Delete staff
  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!confirm(`Permanently remove ${staff.name} from the pre-registered staff directory?`)) {
      return;
    }
    try {
      await onDeleteStaffMember(staff.id || staff._id);
      if (showToast) showToast(`Removed ${staff.name} from directory`, 'info');
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to delete staff', 'warning');
    }
  };

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase text-[#009299] font-bold">
              Access Control &amp; RBAC
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
            <span className="text-[11px] uppercase text-[#44474c] font-semibold">
              College Staff Directory &amp; Roles
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
            User Management &amp; Staff Directory
          </h1>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => {
                setNewDept(deptNames[0]);
                setIsAddStaffOpen(true);
              }}
              className="h-9 px-3.5 rounded-lg bg-[#0e1c2f] text-white text-xs font-semibold shadow-sm hover:bg-[#426086] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Add Staff Member</span>
            </button>

            <button
              onClick={() => setIsBulkImportOpen(!isBulkImportOpen)}
              className="h-9 px-3.5 rounded-lg bg-white border border-[#cbdbf5] text-[#426086] text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Bulk Import Staff</span>
            </button>

            {onOpenAcademicSettingsModal && (
              <button
                type="button"
                onClick={onOpenAcademicSettingsModal}
                className="h-9 px-3.5 rounded-lg bg-white border border-[#cbdbf5] text-[#426086] text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5"
                title="Configure Academic Year & Institutional Term"
              >
                <span className="material-symbols-outlined text-[18px] text-[#009299]">edit_calendar</span>
                <span>Academic Calendar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub Tabs: Registered Accounts vs Pre-Registered Directory */}
      <div className="flex items-center gap-2 border-b border-[#e5eeff] pb-1">
        <button
          onClick={() => setActiveSubTab('registered')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'registered'
              ? 'bg-[#0e1c2f] text-white shadow-sm'
              : 'text-[#44474c] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>Registered Accounts ({allSystemUsers.length})</span>
          {pendingUsers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold">
              {pendingUsers.length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === 'directory'
              ? 'bg-[#0e1c2f] text-white shadow-sm'
              : 'text-[#44474c] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">contact_mail</span>
          <span>Pre-Registered Directory ({effectiveStaffDirectory.length})</span>
        </button>
      </div>

      {/* PENDING APPROVALS BANNER & TABLE (when admin is viewing) */}
      {isAdmin && pendingUsers.length > 0 && activeSubTab === 'registered' && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm flex flex-col gap-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700 text-[20px]">
                pending_actions
              </span>
              <h2 className="text-sm font-bold text-amber-900">
                Action Required: {pendingUsers.length} Pending User{' '}
                {pendingUsers.length === 1 ? 'Registration' : 'Registrations'}
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-amber-800">
              Users not in pre-registered staff directory await role assignment
            </span>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg border border-amber-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-100/70 text-amber-900 text-[11px] uppercase tracking-wider h-9">
                <tr>
                  <th className="px-3 py-2 font-semibold">User</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Requested Dept</th>
                  <th className="px-3 py-2 font-semibold">Assign Role</th>
                  <th className="px-3 py-2 font-semibold">Assign Department</th>
                  <th className="px-3 py-2 font-semibold text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {pendingUsers.map((pUser) => {
                  const sel = pendingSelections[pUser.id || pUser._id] || {
                    role: 'faculty',
                    department: pUser.department || deptNames[0],
                  };
                  return (
                    <tr key={pUser.id || pUser._id} className="hover:bg-amber-50/50">
                      <td className="px-3 py-2.5 font-bold text-[#0b1c30] flex items-center gap-2">
                        <img
                          src={pUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(pUser.name)}`}
                          alt=""
                          className="w-7 h-7 rounded-full bg-[#eff4ff]"
                        />
                        <span>{pUser.name}</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[#44474c]">{pUser.email}</td>
                      <td className="px-3 py-2.5 text-[#44474c]">{pUser.department}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={sel.role}
                          onChange={(e) =>
                            setPendingSelections((prev) => ({
                              ...prev,
                              [pUser.id || pUser._id]: {
                                ...sel,
                                role: e.target.value as Role,
                              },
                            }))
                          }
                          className="h-8 px-2 rounded border border-[#cbdbf5] text-xs font-semibold bg-white"
                        >
                          <option value="faculty">Faculty</option>
                          <option value="hod">HOD</option>
                          <option value="tech">Tech Officer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={sel.department}
                          onChange={(e) =>
                            setPendingSelections((prev) => ({
                              ...prev,
                              [pUser.id || pUser._id]: {
                                ...sel,
                                department: e.target.value,
                              },
                            }))
                          }
                          className="h-8 px-2 rounded border border-[#cbdbf5] text-xs font-semibold bg-white max-w-[200px] truncate"
                        >
                          {deptNames.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprovePending(pUser)}
                            className="h-7 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectPending(pUser)}
                            className="h-7 px-2.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BULK IMPORT COLLAPSIBLE CARD */}
      {isBulkImportOpen && (
        <div className="bg-white rounded-xl shadow-md border border-[#cbdbf5] p-5 flex flex-col gap-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#009299]">upload_file</span>
              <h2 className="text-sm font-bold text-[#0b1c30]">
                Bulk Import Pre-Registered Staff Members
              </h2>
            </div>
            <button
              onClick={() => setIsBulkImportOpen(false)}
              className="text-[#44474c] hover:text-[#0b1c30] p-1"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <p className="text-xs text-[#44474c]">
            Paste multiple staff rows below. Format: <code className="bg-[#eff4ff] px-1.5 py-0.5 rounded text-[#0e1c2f] font-mono">Name, email, role, department</code> (one per line). Supported roles: <span className="font-semibold">admin, hod, faculty, tech</span>.
          </p>

          <textarea
            rows={5}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Name, email, role, department
Dr. Alan Turing, alan.turing@college.edu, hod, Department of Computer Science & Engineering
Prof. Grace Hopper, grace.hopper@college.edu, faculty, Department of Computer Applications
S. Tech Lead, labtech.eng@college.edu, tech, Central College Lab & Facilities Node`}
            className="w-full p-3 rounded-lg border border-[#cbdbf5] text-xs font-mono bg-[#eff4ff]/30 focus:outline-none focus:ring-1 focus:ring-[#009299] text-[#0b1c30]"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[#44474c]">
              When any of these users signs in with Google or Email, their role &amp; department will be assigned automatically.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(false)}
                className="h-8 px-3 rounded-lg border border-[#cbdbf5] text-xs font-semibold text-[#44474c] hover:bg-[#eff4ff]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessBulkImport}
                disabled={importing}
                className="h-8 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold transition-all disabled:opacity-60 flex items-center gap-1.5"
              >
                {importing ? 'Processing...' : 'Process & Import All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR FOR BOTH TABS */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#44474c] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, department or designation..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#eff4ff]/50 border border-[#cbdbf5] text-xs placeholder:text-[#44474c] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white transition-all text-[#0b1c30]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-xs font-semibold text-[#0b1c30] shadow-sm"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="hod">HOD / Dept Head</option>
            <option value="faculty">Faculty</option>
            <option value="tech">Tech Staff</option>
          </select>

          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-xs font-semibold text-[#0b1c30] shadow-sm max-w-[220px] truncate"
          >
            <option value="all">All Departments</option>
            {deptNames.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SUB-TAB 1: REGISTERED ACCOUNTS */}
      {activeSubTab === 'registered' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-10">
                  <th className="px-4 py-2 font-semibold rounded-l-lg">Faculty Name</th>
                  <th className="px-4 py-2 font-semibold">Designation / Incharge</th>
                  <th className="px-4 py-2 font-semibold">Email ID</th>
                  <th className="px-4 py-2 font-semibold">Business Role</th>
                  <th className="px-4 py-2 font-semibold">System Role</th>
                  <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Status &amp; Requisitions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eeff] text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No registered users found matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const isTargetAdmin = u.role === 'admin';
                    const isTargetSelf = currentUser?.id === u.id || currentUser?._id === u._id;
                    const userBookings = bookings.filter(
                      (b) => b.requesterId === u.id || b.requesterEmail === u.email
                    );
                    const isUpdating = updatingUserId === (u.id || u._id);

                    return (
                      <tr
                        key={u.id || u._id || `user-row-${idx}`}
                        className="hover:bg-[#eff4ff]/40 transition-colors"
                      >
                        {/* Faculty Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                u.avatar ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  u.name
                                )}`
                              }
                              alt={u.name}
                              className="w-9 h-9 rounded-full bg-[#eff4ff] border border-[#cbdbf5] object-cover shrink-0"
                            />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#0b1c30]">{u.name}</span>
                                {isTargetSelf && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#009299]/10 text-[#009299] text-[10px] font-bold">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-gray-400">
                                ID: {u.facultyId || u.id?.substring(0, 8)}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Designation / Incharge */}
                        <td className="px-4 py-3">
                          <span className="font-semibold text-[#0b1c30]">
                            {u.designation || 'Academic Staff'}
                          </span>
                        </td>

                        {/* Email Id */}
                        <td className="px-4 py-3 font-mono text-[#004f55] font-semibold">{u.email}</td>

                        {/* Business Role */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#eff4ff] text-[#004f55] text-[11px] font-bold border border-[#cbdbf5]">
                            {u.businessRole || (u.role === 'admin' ? 'Campus Administration' : 'Management & Tech Faculty')}
                          </span>
                        </td>

                        {/* System Role */}
                        <td className="px-4 py-3">
                          {isAdmin ? (
                            <select
                              value={u.role}
                              disabled={isUpdating}
                              onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                              className={`h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all ${
                                u.role === 'admin'
                                  ? 'bg-[#002022] text-[#75f5fd] border-[#009299]'
                                  : u.role === 'hod'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : u.role === 'tech'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <option value="admin">Admin</option>
                              <option value="hod">HOD</option>
                              <option value="faculty">Faculty</option>
                              <option value="tech">Tech Staff</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-[#002022] text-[#009299]'
                                  : u.role === 'hod'
                                  ? 'bg-purple-100 text-purple-800'
                                  : u.role === 'tech'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          )}
                        </td>

                        {/* Status & Requisitions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                            <span className="text-[11px] font-mono text-[#44474c]">
                              {userBookings.length} {userBookings.length === 1 ? 'Req' : 'Reqs'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRE-REGISTERED STAFF DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e5eeff]">
            <div>
              <h2 className="text-sm font-bold text-[#0b1c30]">
                Master Staff Directory &amp; Auto-Role Matching
              </h2>
              <p className="text-xs text-[#44474c]">
                When faculty or staff sign in, their email is matched against this roster to automatically grant designated roles.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#426086] text-xs font-bold font-mono">
              {effectiveStaffDirectory.length} Roster Entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-10">
                  <th className="px-4 py-2 font-semibold rounded-l-lg">Faculty Name</th>
                  <th className="px-4 py-2 font-semibold">Designation / Incharge</th>
                  <th className="px-4 py-2 font-semibold">Email ID</th>
                  <th className="px-4 py-2 font-semibold">Business Role</th>
                  <th className="px-4 py-2 font-semibold">System Role</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eeff] text-xs">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No staff directory entries found. Click "+ Add Staff Member" or "Bulk Import Staff" to add faculty.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s, idx) => {
                    const isDeactivated = s.status === 'deactivated';
                    return (
                      <tr
                        key={s.id || s._id || `staff-${idx}`}
                        className={`hover:bg-[#eff4ff]/40 transition-colors ${
                          isDeactivated ? 'opacity-60 bg-gray-50' : ''
                        }`}
                      >
                        {/* Faculty Name */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0b1c30]">{s.name}</span>
                            <span className="text-[10px] font-mono text-gray-400">
                              ID: {s.employeeId || s.id?.substring(0, 8)}
                            </span>
                          </div>
                        </td>

                        {/* Designation / Incharge */}
                        <td className="px-4 py-3 font-semibold text-[#0b1c30]">
                          {s.designation || 'Academic Staff'}
                        </td>

                        {/* Email Id */}
                        <td className="px-4 py-3 font-mono text-[#004f55] font-semibold">{s.email}</td>

                        {/* Business Role */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#eff4ff] text-[#004f55] text-[11px] font-bold border border-[#cbdbf5]">
                            {s.businessRole || (s.role === 'admin' ? 'Campus Administration' : 'Management & Tech Faculty')}
                          </span>
                        </td>

                        {/* System Role */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              s.role === 'admin'
                                ? 'bg-[#002022] text-[#009299]'
                                : s.role === 'hod'
                                ? 'bg-purple-100 text-purple-800'
                                : s.role === 'tech'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {s.role}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isDeactivated
                                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDeactivated ? 'bg-gray-400' : 'bg-emerald-500'
                              }`}
                            ></span>
                            {isDeactivated ? 'Deactivated' : 'Active'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditStaff(s)}
                                className="p-1 rounded text-[#426086] hover:bg-[#eff4ff]"
                                title="Edit Staff Details"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>

                              <button
                                onClick={() => handleToggleStaffStatus(s)}
                                className="p-1 rounded text-amber-700 hover:bg-amber-50"
                                title={isDeactivated ? 'Activate Staff' : 'Deactivate Staff'}
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {isDeactivated ? 'power_settings_new' : 'block'}
                                </span>
                              </button>

                              <button
                                onClick={() => handleDeleteStaff(s)}
                                className="p-1 rounded text-rose-600 hover:bg-rose-50"
                                title="Remove Staff Record"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD SINGLE STAFF */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff] mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#009299]">person_add</span>
                <h3 className="text-base font-bold text-[#0b1c30]">Add Staff Member</h3>
              </div>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewStaff} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs focus:ring-1 focus:ring-[#009299] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                  College Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ramesh.kumar@college.edu"
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs focus:ring-1 focus:ring-[#009299] focus:outline-none"
                />
                <span className="text-[10px] text-gray-500 mt-0.5 block">
                  Must match the Google or Email address the user will sign in with.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs bg-white font-semibold"
                  >
                    <option value="faculty">Faculty Member</option>
                    <option value="hod">HOD / Dept Head</option>
                    <option value="tech">Tech Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    placeholder="e.g. Associate Professor"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                  Department *
                </label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs bg-white font-semibold"
                >
                  {deptNames.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5eeff] mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="h-8 px-3 rounded-lg border border-[#cbdbf5] text-xs font-semibold text-[#44474c] hover:bg-[#eff4ff]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStaff}
                  className="h-8 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  {addingStaff ? 'Saving...' : 'Add to Directory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STAFF */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff] mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#009299]">edit</span>
                <h3 className="text-base font-bold text-[#0b1c30]">Edit Staff Directory Entry</h3>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs bg-white font-semibold"
                  >
                    <option value="faculty">Faculty Member</option>
                    <option value="hod">HOD / Dept Head</option>
                    <option value="tech">Tech Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                  Department
                </label>
                <select
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs bg-white font-semibold"
                >
                  {deptNames.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5eeff] mt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="h-8 px-3 rounded-lg border border-[#cbdbf5] text-xs font-semibold text-[#44474c] hover:bg-[#eff4ff]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="h-8 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold transition-all disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
