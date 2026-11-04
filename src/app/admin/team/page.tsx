'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { RoleBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { AdminRole } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit2,
  Check,
  Mail,
  Key,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lock,
  Sparkles,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { getCachedData, setCachedData } from '@/lib/client-cache';

interface TeamMember {
  user_id: string;
  email: string;
  role: AdminRole;
  created_at: string;
  last_sign_in_at?: string;
}

export default function TeamManagementPage() {
  const { role, user, canEdit } = useAdmin();
  const isOwner = role === 'owner';

  const cachedTeam = getCachedData<TeamMember[]>('admin_team');

  const [members, setMembers] = useState<TeamMember[]>(() => cachedTeam || []);
  const [loading, setLoading] = useState(() => !cachedTeam);
  const [error, setError] = useState<string | null>(null);

  // Search & Role Filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('editor');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Role Edit Modal
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState<AdminRole>('editor');
  const [updating, setUpdating] = useState(false);

  // Reset Password Modal
  const [resetMember, setResetMember] = useState<TeamMember | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Delete Confirm Modal
  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchTeam = async () => {
    try {
      if (!cachedTeam) setLoading(true);
      const res = await fetch('/api/v1/admin/team');
      const data = await res.json();
      if (res.ok && data.members) {
        setMembers(data.members);
        setCachedData('admin_team', data.members);
      } else {
        setError(data.error || 'Failed to load team members');
      }
    } catch {
      setError('Network error loading team roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || inviting) return;

    setInviting(true);
    setInviteSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          password: invitePassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInviteEmail('');
        setInvitePassword('');
        setInviteSuccessMsg(data.message);
        fetchTeam();
        setTimeout(() => {
          setInviteModalOpen(false);
          setInviteSuccessMsg(null);
        }, 1200);
      } else {
        alert(data.error || 'Failed to add team member');
      }
    } catch {
      alert('Network error adding team member');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editMember || updating) return;

    setUpdating(true);
    try {
      const res = await fetch('/api/v1/admin/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: editMember.user_id,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEditMember(null);
        fetchTeam();
      } else {
        alert(data.error || 'Failed to update role');
      }
    } catch {
      alert('Network error updating role');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteMember || deleting) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/team?user_id=${deleteMember.user_id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteMember(null);
        fetchTeam();
      } else {
        alert(data.error || 'Failed to revoke access');
      }
    } catch {
      alert('Network error revoking access');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch = !search || m.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, search, roleFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#00215C] tracking-tight">
            Team & Permissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage user roles and team member access.
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#00215C] hover:bg-[#255CC1] text-white text-xs sm:text-sm font-bold shadow-xs transition min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* 2. Team Member Roster & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#255CC1]" />
            <span className="font-bold text-sm text-slate-900">Team Roster</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
              {filteredMembers.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search member..."
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#255CC1] w-40 sm:w-48"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owners</option>
              <option value="editor">Editors</option>
              <option value="viewer">Viewers</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading team members...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-500">{error}</div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            No matching team members found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Member Email</th>
                  <th className="px-5 py-3.5">Assigned Role</th>
                  <th className="px-5 py-3.5">Added Date</th>
                  <th className="px-5 py-3.5">Last Active</th>
                  {isOwner && <th className="px-5 py-3.5 text-right">Action Features</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => {
                  const isCurrent = user?.id === member.user_id;

                  return (
                    <tr key={member.user_id} className="hover:bg-slate-50/60 transition">
                      {/* Email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-[#00215C] font-black text-xs flex items-center justify-center flex-shrink-0">
                            {member.email ? member.email.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{member.email}</span>
                              {isCurrent && (
                                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {member.user_id.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-3.5">
                        <RoleBadge role={member.role} />
                      </td>

                      {/* Added Date */}
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(member.created_at)}
                      </td>

                      {/* Last Active */}
                      <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                        {member.last_sign_in_at ? formatDate(member.last_sign_in_at) : 'Never'}
                      </td>

                      {/* Action Features */}
                      {isOwner && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Change Role Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditMember(member);
                                setNewRole(member.role);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                              title="Modify Role"
                            >
                              <Edit2 className="w-3 h-3 text-[#255CC1]" />
                              <span>Role</span>
                            </button>

                            {/* Revoke Member Button */}
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => setDeleteMember(member)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Revoke Access"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setInviteModalOpen(false)}
          title="Add New Team Member"
          description="Grant administrative or marketing access to TerraTern's lead portal."
        >
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Member Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="advisor@terratern.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-[#255CC1]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Assign Role *
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:bg-white"
              >
                <option value="editor">Editor (Can build pages, create links & export CRM)</option>
                <option value="viewer">Viewer (Read-only access to analytics & leads)</option>
                <option value="owner">Owner (Full administrative governance)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Initial Password (Optional)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Leave empty to auto-generate temporary password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-[#255CC1]"
                />
              </div>
            </div>

            {inviteSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{inviteSuccessMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviting || !inviteEmail}
                className="px-4 py-2 bg-[#00215C] hover:bg-[#255CC1] text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {inviting ? 'Adding Member...' : 'Confirm & Add'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Role Modal */}
      {editMember && (
        <Modal
          isOpen={true}
          onClose={() => setEditMember(null)}
          title="Modify Member Role"
          description={`Update permissions for ${editMember.email}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                New Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="owner">Owner (Full administrative rights)</option>
                <option value="editor">Editor (Can build & publish pages, export leads)</option>
                <option value="viewer">Viewer (Read-only analytics & applicant data)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditMember(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                disabled={updating}
                className="px-4 py-2 bg-[#00215C] hover:bg-[#255CC1] text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {updating ? 'Updating...' : 'Save Role'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Revoke Member Modal */}
      {deleteMember && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteMember(null)}
          title="Revoke Team Access?"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to revoke administrative access for{' '}
              <strong>{deleteMember.email}</strong>? They will no longer be able to log in to the portal.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteMember(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {deleting ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
