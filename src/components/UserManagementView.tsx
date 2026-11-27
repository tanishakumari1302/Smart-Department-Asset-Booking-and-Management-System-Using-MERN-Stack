import React, { useState, useMemo } from 'react';
import {
  User,
  Booking,
  Department,
  Role,
  StaffMember,
  buildMergedStaffLists,
} from '../types';

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
    designation?: string,
    fallbackUser?: Partial<User>
  ) => Promise<void>;
  onAddStaffMember: (staffData: {
    name: string;
    email: string;
    role: Role;
    department: string;
    designation?: string;
    businessRole?: string;
    phone?: string;
    room?: string;
  }) => Promise<void>;
  onUpdateStaffMember: (
    staffId: string,
    updates: Partial<StaffMember>,
    fallbackData?: Partial<StaffMember>
  ) => Promise<void>;
  onDeleteStaffMember: (staffId: string, staffMeta?: Partial<StaffMember>) => Promise<void>;
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
  onAddDepartment?: (deptData: {
    name: string;
    code: string;
    buildingBlock?: string;
    hodName?: string;
    description?: string;
  }) => Promise<void>;
  onUpdateDepartment?: (deptId: string, updates: Partial<Department>) => Promise<void>;
  onDeleteDepartment?: (deptId: string) => Promise<void>;
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
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onOpenAcademicSettingsModal,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'registered' | 'directory' | 'departments'>('registered');
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
  const [newBusinessRole, setNewBusinessRole] = useState('Academic Faculty');
  const [newPhone, setNewPhone] = useState('');
  const [newRoom, setNewRoom] = useState('');
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
  const [editBusinessRole, setEditBusinessRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Inline confirmation states (zero window.confirm)
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);
  const [confirmRejectUserId, setConfirmRejectUserId] = useState<string | null>(null);
  const [confirmDeleteDeptId, setConfirmDeleteDeptId] = useState<string | null>(null);

  // Department Add/Edit modal state
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptBlock, setDeptBlock] = useState('');
  const [deptHod, setDeptHod] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [savingDept, setSavingDept] = useState(false);

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

  // Live merged roster (honors all edits, additions, role changes, deactivations & deletions)
  const mergedLists = useMemo(() => buildMergedStaffLists(staffDirectory), [staffDirectory]);

  const allSystemUsers = useMemo(() => {
    const dummyPlaceholderEmails = new Set([
      'admin@assethub.edu',
      'faculty@assethub.edu',
      'tech@assethub.edu',
    ]);

    const removedEmails = new Set(
      staffDirectory
        .filter((s) => s.status === 'removed')
        .map((s) => (s.email || '').toLowerCase().trim())
    );

    const list: User[] = [...mergedLists.allActive];
    const seenEmails = new Set(list.map((u) => (u.email || '').toLowerCase().trim()));

    users.forEach((u) => {
      const email = (u.email || '').toLowerCase().trim();
      if (
        email &&
        !dummyPlaceholderEmails.has(email) &&
        !removedEmails.has(email) &&
        !seenEmails.has(email)
      ) {
        list.push(u);
        seenEmails.add(email);
      }
    });

    return list;
  }, [mergedLists.allActive, users, staffDirectory]);

  const effectiveStaffDirectory = useMemo<StaffMember[]>(() => {
    return mergedLists.allDirectory.filter((s: StaffMember) => s.status !== 'removed');
  }, [mergedLists.allDirectory]);

  const pendingUsers = allSystemUsers.filter((u) => u.approvalStatus === 'pending');
  const activeUsers = allSystemUsers.filter((u) => u.approvalStatus !== 'pending');

  const filteredUsers = activeUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.businessRole || '').toLowerCase().includes(q) ||
      (u.designation || '').toLowerCase().includes(q) ||
      (u.facultyId || '').toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q);

    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    const matchesDept = selectedDeptFilter === 'all' || u.department === selectedDeptFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  const filteredStaff = effectiveStaffDirectory.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (s.name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.businessRole || '').toLowerCase().includes(q) ||
      (s.designation || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q);

    const matchesRole = selectedRoleFilter === 'all' || s.role === selectedRoleFilter;
    const matchesDept = selectedDeptFilter === 'all' || s.department === selectedDeptFilter;

    return matchesSearch && matchesRole && matchesDept;
  });

  const filteredDepartments = departments.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.name || '').toLowerCase().includes(q) ||
      (d.code || '').toLowerCase().includes(q) ||
      (d.buildingBlock || d.block || '').toLowerCase().includes(q) ||
      (d.hodName || d.headOfDept || '').toLowerCase().includes(q)
    );
  });

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
        targetUser.department || deptNames[0],
        targetUser.designation,
        targetUser
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
        businessRole: newBusinessRole.trim(),
        phone: newPhone.trim(),
        room: newRoom.trim(),
      });
      if (showToast) {
        showToast(`Added ${newName} with role ${newRole.toUpperCase()} — live on login & directory!`, 'success');
      }
      setNewName('');
      setNewEmail('');
      setNewRole('faculty');
      setNewDesignation('Faculty Member');
      setNewBusinessRole('Academic Faculty');
      setNewPhone('');
      setNewRoom('');
      setSearchQuery('');
      setSelectedRoleFilter('all');
      setSelectedDeptFilter('all');
      setIsAddStaffOpen(false);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to add staff member', 'warning');
    } finally {
      setAddingStaff(false);
    }
  };

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

  const handleRejectPending = async (user: User) => {
    try {
      await onRejectUser(user.id || user._id, 'Administrator rejection');
      setConfirmRejectUserId(null);
      if (showToast) showToast(`Rejected registration for ${user.name}`, 'info');
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Rejection failed', 'warning');
    }
  };

  const handleStartEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditRole(staff.role);
    setEditDept(staff.department || deptNames[0]);
    setEditDesignation(staff.designation || '');
    setEditBusinessRole(staff.businessRole || '');
    setEditPhone(staff.phone || '');
    setEditRoom(staff.room || '');
  };

  const handleStartEditFromUser = (u: User) => {
    const matchingDir = effectiveStaffDirectory.find(
      (s) => s.email.toLowerCase() === (u.email || '').toLowerCase() || s.id === u.id
    );
    handleStartEditStaff(
      matchingDir || {
        _id: u._id || u.id || `staff_${Date.now()}`,
        id: u.id || u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        designation: u.designation,
        businessRole: u.businessRole,
        phone: u.phone,
        room: u.room,
        employeeId: u.facultyId,
        avatar: u.avatar,
        status: 'active',
        registered: true,
      }
    );
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setSavingEdit(true);
    try {
      await onUpdateStaffMember(
        editingStaff.id || editingStaff._id,
        {
          name: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          role: editRole,
          department: editDept || deptNames[0],
          designation: editDesignation.trim(),
          businessRole: editBusinessRole.trim(),
          phone: editPhone.trim(),
          room: editRoom.trim(),
        },
        editingStaff
      );
      if (showToast) showToast(`Saved changes for ${editName.trim()}`, 'success');
      setEditingStaff(null);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to update staff', 'warning');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStaffStatus = async (staff: StaffMember) => {
    const nextStatus = staff.status === 'active' ? 'deactivated' : 'active';
    try {
      await onUpdateStaffMember(staff.id || staff._id, { status: nextStatus }, staff);
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

  const handleDeleteStaff = async (staff: { id?: string; _id?: string; name: string; email: string }) => {
    try {
      await onDeleteStaffMember(staff.id || staff._id || staff.email, staff);
      setConfirmDeleteStaffId(null);
      if (showToast) showToast(`Removed ${staff.name} from directory & login roster`, 'info');
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to remove staff member', 'warning');
    }
  };

  // Department Modal Handlers
  const openAddDeptModal = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setDeptBlock('Main Academic Block');
    setDeptHod('');
    setDeptDesc('');
    setIsDeptModalOpen(true);
  };

  const openEditDeptModal = (d: Department) => {
    setEditingDept(d);
    setDeptName(d.name || '');
    setDeptCode(d.code || '');
    setDeptBlock(d.buildingBlock || d.block || '');
    setDeptHod(d.hodName || d.headOfDept || '');
    setDeptDesc(d.description || '');
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      if (showToast) showToast('Department name and short code are required.', 'warning');
      return;
    }
    setSavingDept(true);
    try {
      const codeUpper = deptCode.trim().toUpperCase();
      if (editingDept && onUpdateDepartment) {
        await onUpdateDepartment(editingDept.id || editingDept._id, {
          name: deptName.trim(),
          code: codeUpper,
          shortName: codeUpper,
          block: deptBlock.trim(),
          buildingBlock: deptBlock.trim(),
          headOfDept: deptHod.trim(),
          hodName: deptHod.trim(),
          description: deptDesc.trim(),
        });
        if (showToast) showToast(`Updated department "${deptName.trim()}"`, 'success');
      } else if (onAddDepartment) {
        await onAddDepartment({
          name: deptName.trim(),
          code: codeUpper,
          buildingBlock: deptBlock.trim(),
          hodName: deptHod.trim(),
          description: deptDesc.trim(),
        });
        if (showToast) showToast(`Added department "${deptName.trim()}"`, 'success');
      }
      setIsDeptModalOpen(false);
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to save department', 'warning');
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDept = async (deptId: string, name: string) => {
    if (!onDeleteDepartment) return;
    try {
      await onDeleteDepartment(deptId);
      setConfirmDeleteDeptId(null);
      if (showToast) showToast(`Deleted department "${name}"`, 'info');
    } catch (err: any) {
      if (showToast) showToast(err.message || 'Failed to delete department', 'warning');
    }
  };

  return (
    <div className="flex flex-col w-full gap-5 text-[#0b1c30]">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs uppercase text-[#009299] font-bold">
              Access Control &amp; Self-Service Directory
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#009299]"></span>
            <span className="text-[11px] uppercase text-[#44474c] font-semibold">
              Faculty, Office Staff &amp; Departments
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b1c30]">
            User Management, Staff &amp; Departments
          </h1>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setNewDept(deptNames[0]);
                setIsAddStaffOpen(true);
              }}
              className="h-9 px-3.5 rounded-lg bg-[#0e1c2f] text-white text-xs font-semibold shadow-sm hover:bg-[#426086] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Add Faculty / Staff</span>
            </button>

            {onAddDepartment && (
              <button
                type="button"
                onClick={openAddDeptModal}
                className="h-9 px-3.5 rounded-lg bg-[#004f55] text-white text-xs font-semibold shadow-sm hover:bg-[#003d42] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">domain_add</span>
                <span>Add Department</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsBulkImportOpen(!isBulkImportOpen)}
              className="h-9 px-3.5 rounded-lg bg-white border border-[#cbdbf5] text-[#426086] text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Bulk Import</span>
            </button>

            {onOpenAcademicSettingsModal && (
              <button
                type="button"
                onClick={onOpenAcademicSettingsModal}
                className="h-9 px-3.5 rounded-lg bg-white border border-[#cbdbf5] text-[#426086] text-xs font-semibold shadow-sm hover:bg-[#eff4ff] transition-all flex items-center gap-1.5 cursor-pointer"
                title="Configure Academic Year & Institutional Term"
              >
                <span className="material-symbols-outlined text-[18px] text-[#009299]">edit_calendar</span>
                <span>Academic Calendar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub Tabs: Registered Accounts | Staff Directory | Departments */}
      <div className="flex items-center flex-wrap gap-2 border-b border-[#e5eeff] pb-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('registered')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'registered'
              ? 'bg-[#0e1c2f] text-white shadow-sm'
              : 'text-[#44474c] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>Active Personnel ({allSystemUsers.length})</span>
          {pendingUsers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold">
              {pendingUsers.length} Pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'directory'
              ? 'bg-[#0e1c2f] text-white shadow-sm'
              : 'text-[#44474c] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">contact_mail</span>
          <span>Master Staff Directory ({effectiveStaffDirectory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('departments')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === 'departments'
              ? 'bg-[#0e1c2f] text-white shadow-sm'
              : 'text-[#44474c] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">apartment</span>
          <span>Departments ({departments.length})</span>
        </button>
      </div>

      {/* PENDING APPROVALS BANNER & TABLE */}
      {isAdmin && pendingUsers.length > 0 && activeSubTab === 'registered' && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700 text-[20px]">pending_actions</span>
              <h2 className="text-sm font-bold text-amber-900">
                Action Required: {pendingUsers.length} Pending User{' '}
                {pendingUsers.length === 1 ? 'Registration' : 'Registrations'}
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-lg border border-amber-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-amber-100/70 text-amber-900 text-[11px] uppercase tracking-wider h-9">
                <tr>
                  <th className="px-3 py-2 font-semibold">User</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Assign Role</th>
                  <th className="px-3 py-2 font-semibold">Assign Department</th>
                  <th className="px-3 py-2 font-semibold text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {pendingUsers.map((pUser) => {
                  const uid = pUser.id || pUser._id;
                  const sel = pendingSelections[uid] || {
                    role: 'faculty',
                    department: pUser.department || deptNames[0],
                  };
                  return (
                    <tr key={uid} className="hover:bg-amber-50/50">
                      <td className="px-3 py-2.5 font-bold text-[#0b1c30]">{pUser.name}</td>
                      <td className="px-3 py-2.5 font-mono text-[#44474c]">{pUser.email}</td>
                      <td className="px-3 py-2.5">
                        <select
                          value={sel.role}
                          onChange={(e) =>
                            setPendingSelections((prev) => ({
                              ...prev,
                              [uid]: { ...sel, role: e.target.value as Role },
                            }))
                          }
                          className="h-8 px-2 rounded border border-[#cbdbf5] text-xs font-semibold bg-white"
                        >
                          <option value="faculty">Faculty</option>
                          <option value="hod">HOD</option>
                          <option value="tech">Tech Officer</option>
                          <option value="admin">Admin / Office Staff</option>
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={sel.department}
                          onChange={(e) =>
                            setPendingSelections((prev) => ({
                              ...prev,
                              [uid]: { ...sel, department: e.target.value },
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
                            type="button"
                            onClick={() => handleApprovePending(pUser)}
                            className="h-7 px-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">check</span>
                            <span>Approve</span>
                          </button>
                          {confirmRejectUserId === uid ? (
                            <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                              <button
                                type="button"
                                onClick={() => handleRejectPending(pUser)}
                                className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRejectUserId(null)}
                                className="px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmRejectUserId(uid)}
                              className="h-7 px-2.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              <span>Reject</span>
                            </button>
                          )}
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
        <div className="bg-white rounded-xl shadow-md border border-[#cbdbf5] p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#009299]">upload_file</span>
              <h2 className="text-sm font-bold text-[#0b1c30]">Bulk Import Staff Members</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(false)}
              className="text-[#44474c] hover:text-[#0b1c30] p-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <p className="text-xs text-[#44474c]">
            Paste rows below: <code className="bg-[#eff4ff] px-1.5 py-0.5 rounded font-mono">Name, email, role, department</code> (one per line). Supported roles: <span className="font-semibold">admin, hod, faculty, tech</span>.
          </p>
          <textarea
            rows={4}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Name, email, role, department\nProf. Ananya Verma, ananya.verma@sunstone.in, faculty, Department of Computer Science & Engineering`}
            className="w-full p-3 rounded-lg border border-[#cbdbf5] text-xs font-mono bg-[#eff4ff]/30 focus:outline-none focus:ring-1 focus:ring-[#009299]"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(false)}
              className="h-8 px-3 rounded-lg border border-[#cbdbf5] text-xs font-semibold text-[#44474c] hover:bg-[#eff4ff] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProcessBulkImport}
              disabled={importing}
              className="h-8 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
            >
              {importing ? 'Processing...' : 'Import All'}
            </button>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#44474c] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === 'departments'
                ? 'Search departments by name, code, block or HOD...'
                : 'Search by name, email, department or designation...'
            }
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#eff4ff]/50 border border-[#cbdbf5] text-xs placeholder:text-[#44474c] focus:outline-none focus:ring-1 focus:ring-[#009299] focus:bg-white text-[#0b1c30]"
          />
        </div>

        {activeSubTab !== 'departments' && (
          <div className="flex items-center flex-wrap gap-2">
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="h-9 px-3 rounded-lg bg-white border border-[#cbdbf5] text-xs font-semibold text-[#0b1c30] shadow-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin / Office Staff</option>
              <option value="hod">HOD / Dept Head</option>
              <option value="faculty">Faculty</option>
              <option value="tech">Tech Staff</option>
            </select>

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
        )}
      </div>

      {/* SUB-TAB 1: ACTIVE PERSONNEL (WITH INLINE EDIT & REMOVE) */}
      {activeSubTab === 'registered' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-10">
                  <th className="px-4 py-2 font-semibold rounded-l-lg">Name</th>
                  <th className="px-4 py-2 font-semibold">Designation</th>
                  <th className="px-4 py-2 font-semibold">Email ID</th>
                  <th className="px-4 py-2 font-semibold">Business Role</th>
                  <th className="px-4 py-2 font-semibold">System Role</th>
                  <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eeff] text-xs">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No personnel found matching your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const uid = u.id || u._id || `user-row-${idx}`;
                    const isTargetSelf = currentUser?.email?.toLowerCase() === u.email?.toLowerCase();
                    const userBookings = bookings.filter(
                      (b) => b.requesterId === u.id || b.requesterEmail?.toLowerCase() === u.email?.toLowerCase()
                    );
                    const isUpdating = updatingUserId === uid;

                    return (
                      <tr key={uid} className="hover:bg-[#eff4ff]/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                u.avatar ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`
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
                                {u.facultyId || uid.substring(0, 10)} • {userBookings.length} Reqs
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#0b1c30]">{u.designation || 'Academic Staff'}</span>
                            <span className="text-[10px] text-[#72777f] truncate max-w-[180px]">{u.department}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-[#004f55] font-semibold">{u.email}</td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#eff4ff] text-[#004f55] text-[11px] font-bold border border-[#cbdbf5]">
                            {u.businessRole || (u.role === 'admin' ? 'Campus Administration' : 'Academic Faculty')}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {isAdmin ? (
                            <select
                              value={u.role}
                              disabled={isUpdating}
                              onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                              className={`h-8 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                u.role === 'admin'
                                  ? 'bg-[#002022] text-[#75f5fd] border-[#009299]'
                                  : u.role === 'hod'
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : u.role === 'tech'
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              <option value="admin">Admin / Office Staff</option>
                              <option value="hod">HOD</option>
                              <option value="faculty">Faculty</option>
                              <option value="tech">Tech Staff</option>
                            </select>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              {u.role}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEditFromUser(u)}
                                className="p-1.5 rounded text-[#426086] hover:bg-[#eff4ff] border border-[#cbdbf5] cursor-pointer"
                                title="Edit Name, Email, Role or Department"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>

                              {!isTargetSelf && (
                                confirmDeleteStaffId === uid ? (
                                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStaff(u)}
                                      className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteStaffId(null)}
                                      className="px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteStaffId(uid)}
                                    className="p-1.5 rounded text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                    title="Remove Person from Portal"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                )
                              )}
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

      {/* SUB-TAB 2: MASTER STAFF DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e5eeff]">
            <div>
              <h2 className="text-sm font-bold text-[#0b1c30]">
                Master Staff Directory (Live Login &amp; Portal Sync)
              </h2>
              <p className="text-xs text-[#44474c]">
                Any Faculty or Admin/Office Staff added, edited, deactivated, or removed here immediately updates the Login screen and access permissions.
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
                  <th className="px-4 py-2 font-semibold rounded-l-lg">Name</th>
                  <th className="px-4 py-2 font-semibold">Designation / Dept</th>
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
                      No staff directory entries found. Click &quot;Add Faculty / Staff&quot; to add new members.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s, idx) => {
                    const sid = s.id || s._id || `staff-${idx}`;
                    const isDeactivated = s.status === 'deactivated';
                    return (
                      <tr
                        key={sid}
                        className={`hover:bg-[#eff4ff]/40 transition-colors ${
                          isDeactivated ? 'opacity-60 bg-gray-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0b1c30]">{s.name}</span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {s.employeeId || sid.substring(0, 10)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#0b1c30]">{s.designation || 'Academic Staff'}</span>
                            <span className="text-[10px] text-[#72777f] truncate max-w-[180px]">{s.department}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#004f55] font-semibold">{s.email}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#eff4ff] text-[#004f55] text-[11px] font-bold border border-[#cbdbf5]">
                            {s.businessRole || (s.role === 'admin' ? 'Campus Administration' : 'Academic Faculty')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              s.role === 'admin'
                                ? 'bg-[#002022] text-[#75f5fd]'
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
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isDeactivated
                                ? 'bg-gray-100 text-gray-600 border border-gray-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isDeactivated ? 'bg-gray-400' : 'bg-emerald-500'}`}></span>
                            {isDeactivated ? 'Deactivated' : 'Active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEditStaff(s)}
                                className="p-1.5 rounded text-[#426086] hover:bg-[#eff4ff] border border-[#cbdbf5] cursor-pointer"
                                title="Edit Staff Details"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStaffStatus(s)}
                                className="p-1.5 rounded text-amber-700 hover:bg-amber-50 border border-amber-200 cursor-pointer"
                                title={isDeactivated ? 'Activate Staff' : 'Deactivate Staff'}
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  {isDeactivated ? 'power_settings_new' : 'block'}
                                </span>
                              </button>

                              {confirmDeleteStaffId === sid ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStaff(s)}
                                    className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    Remove
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteStaffId(null)}
                                    className="px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteStaffId(sid)}
                                  className="p-1.5 rounded text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                  title="Remove Staff Record"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              )}
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

      {/* SUB-TAB 3: DEPARTMENTS MANAGEMENT (ADD / EDIT / DELETE) */}
      {activeSubTab === 'departments' && (
        <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e5eeff]">
            <div>
              <h2 className="text-sm font-bold text-[#0b1c30]">
                College Departments &amp; Academic Clusters
              </h2>
              <p className="text-xs text-[#44474c]">
                Add new departments, rename existing blocks, update HOD/Coordinator names, or remove obsolete departments.
              </p>
            </div>
            {isAdmin && onAddDepartment && (
              <button
                type="button"
                onClick={openAddDeptModal}
                className="h-8 px-3 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>New Department</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#eff4ff] text-[#44474c] text-[11px] uppercase tracking-wider h-10">
                  <th className="px-4 py-2 font-semibold rounded-l-lg">Code</th>
                  <th className="px-4 py-2 font-semibold">Department Name</th>
                  <th className="px-4 py-2 font-semibold">Building / Block</th>
                  <th className="px-4 py-2 font-semibold">HOD / Coordinator</th>
                  <th className="px-4 py-2 font-semibold text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5eeff]">
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No departments match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((d, idx) => {
                    const did = d.id || d._id || `dept-${idx}`;
                    return (
                      <tr key={did} className="hover:bg-[#eff4ff]/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-[#0e1c2f]">
                          <span className="px-2 py-0.5 rounded bg-[#eff4ff] border border-[#cbdbf5]">
                            {d.code || 'DEPT'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#0b1c30]">{d.name}</span>
                            {d.description && (
                              <span className="text-[11px] text-[#72777f] truncate max-w-md">{d.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#44474c]">{d.buildingBlock || d.block || 'Main Campus'}</td>
                        <td className="px-4 py-3 font-semibold text-[#004f55]">{d.hodName || d.headOfDept || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-1.5">
                              {onUpdateDepartment && (
                                <button
                                  type="button"
                                  onClick={() => openEditDeptModal(d)}
                                  className="p-1.5 rounded text-[#426086] hover:bg-[#eff4ff] border border-[#cbdbf5] cursor-pointer"
                                  title="Edit Department"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                              )}
                              {onDeleteDepartment && (
                                confirmDeleteDeptId === did ? (
                                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDept(did, d.name)}
                                      className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteDeptId(null)}
                                      className="px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteDeptId(did)}
                                    className="p-1.5 rounded text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                    title="Delete Department"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </button>
                                )
                              )}
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
                <h3 className="text-base font-bold text-[#0b1c30]">Add Faculty or Office Staff</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNewStaff} className="flex flex-col gap-3 text-xs">
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
                  Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ramesh.kumar@sunstone.in"
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs focus:ring-1 focus:ring-[#009299] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Portal Access Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      const r = e.target.value as Role;
                      setNewRole(r);
                      if (r === 'admin') {
                        setNewBusinessRole('Campus Operations');
                        setNewDesignation('Office Staff / Admin');
                      } else {
                        setNewBusinessRole('Academic Faculty');
                        setNewDesignation('Assistant Professor');
                      }
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs bg-white font-semibold"
                  >
                    <option value="faculty">Faculty Member (Faculty Portal)</option>
                    <option value="admin">Admin / Office Staff (Full Control)</option>
                    <option value="hod">HOD / Dept Head</option>
                    <option value="tech">Tech Staff</option>
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
                    placeholder="e.g. Assistant Professor"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Business Role / Tag
                  </label>
                  <input
                    type="text"
                    value={newBusinessRole}
                    onChange={(e) => setNewBusinessRole(e.target.value)}
                    placeholder="e.g. Tech Faculty / Placement"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Room / Cabin (Optional)
                  </label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="e.g. Faculty Block B, Cabin #06"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5eeff] mt-1">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="h-9 px-3.5 rounded-lg border border-[#cbdbf5] text-xs font-semibold text-[#44474c] hover:bg-[#eff4ff] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStaff}
                  className="h-9 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  {addingStaff ? 'Saving...' : 'Add to Portal & Directory'}
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
                <h3 className="text-base font-bold text-[#0b1c30]">Edit Staff / Faculty Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditStaff} className="flex flex-col gap-3 text-xs">
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
                  className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Portal Access Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs bg-white font-semibold"
                  >
                    <option value="faculty">Faculty Member</option>
                    <option value="admin">Admin / Office Staff</option>
                    <option value="hod">HOD / Dept Head</option>
                    <option value="tech">Tech Staff</option>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Business Role
                  </label>
                  <input
                    type="text"
                    value={editBusinessRole}
                    onChange={(e) => setEditBusinessRole(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Room / Cabin
                  </label>
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5eeff] mt-1">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="h-9 px-3.5 rounded-lg border border-[#cbdbf5] text-xs font-semibold text-[#44474c] hover:bg-[#eff4ff] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="h-9 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DEPARTMENT */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#cbdbf5] max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff] mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#009299]">apartment</span>
                <h3 className="text-base font-bold text-[#0b1c30]">
                  {editingDept ? 'Edit Department' : 'Add New Department'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeptModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={deptName}
                    onChange={(e) => setDeptName(e.target.value)}
                    placeholder="e.g. Department of Data Science"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Short Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={deptCode}
                    onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DS"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    Building / Block
                  </label>
                  <input
                    type="text"
                    value={deptBlock}
                    onChange={(e) => setDeptBlock(e.target.value)}
                    placeholder="e.g. Academic Block A, Floor 2"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                    HOD / Coordinator Name
                  </label>
                  <input
                    type="text"
                    value={deptHod}
                    onChange={(e) => setDeptHod(e.target.value)}
                    placeholder="e.g. Dr. Ramesh Sharma"
                    className="w-full h-9 px-3 rounded-lg border border-[#cbdbf5] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#44474c] uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  placeholder="Brief note about labs, rooms, or scope..."
                  className="w-full p-2.5 rounded-lg border border-[#cbdbf5] text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5eeff] mt-1">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="h-9 px-3.5 rounded-lg border border-[#cbdbf5] text-xs font-semibold text-[#44474c] hover:bg-[#eff4ff] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDept}
                  className="h-9 px-4 rounded-lg bg-[#0e1c2f] hover:bg-[#426086] text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
                >
                  {savingDept ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
