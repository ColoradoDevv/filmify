'use client';

import { useEffect, useState } from 'react';
import { getUsers, banUser, updateUserRole, impersonateUser, deleteUser } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Shield, ShieldAlert, ShieldCheck, UserCog, UserX, Eye, Terminal, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import SecurityModal from '@/components/admin/SecurityModal';

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

    // Security Modal State
    const [securityModal, setSecurityModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        variant: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
        loading?: boolean;
    }>({
        isOpen: false,
        title: '',
        description: '',
        variant: 'danger',
        onConfirm: () => { },
        loading: false
    });

    const router = useRouter();

    useEffect(() => {
        loadUsers();
    }, [page, search]);

    const loadUsers = async () => {
        setLoading(true);
        const { data, count } = await getUsers(page, 12, search);
        setUsers(data);
        setTotalUsers(count);
        setLoading(false);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadUsers();
    };

    const handleBan = (userId: string, currentStatus: boolean) => {
        setSecurityModal({
            isOpen: true,
            title: currentStatus ? 'REVOKE BAN' : 'EXECUTE BAN PROTOCOL',
            description: currentStatus
                ? 'This will restore full access for this operative. Are you sure?'
                : 'This will permanently disable this operative\'s access to the platform. Proceed?',
            variant: currentStatus ? 'info' : 'danger',
            onConfirm: async () => {
                setSecurityModal(prev => ({ ...prev, loading: true }));
                const result = await banUser(userId);
                if (result.success) {
                    loadUsers();
                    setSecurityModal(prev => ({ ...prev, isOpen: false }));
                } else {
                    alert('Protocol Failed: ' + result.error);
                    setSecurityModal(prev => ({ ...prev, loading: false, isOpen: false }));
                }
            }
        });
    };

    const handleDelete = (userId: string) => {
        setSecurityModal({
            isOpen: true,
            title: 'PERMANENT DELETION',
            description: 'CRITICAL WARNING: This action will permanently delete this user account and all associated data. This action CANNOT be undone.',
            variant: 'danger',
            onConfirm: async () => {
                setSecurityModal(prev => ({ ...prev, loading: true }));
                const result = await deleteUser(userId);
                if (result.success) {
                    loadUsers();
                    setSecurityModal(prev => ({ ...prev, isOpen: false }));
                } else {
                    alert('Deletion Failed: ' + result.error);
                    setSecurityModal(prev => ({ ...prev, loading: false, isOpen: false }));
                }
            }
        });
    };

    const handleImpersonate = (userId: string) => {
        setSecurityModal({
            isOpen: true,
            title: 'INITIATE GHOST PROTOCOL',
            description: 'You are about to sign in as this user. You will see exactly what they see. Proceed?',
            variant: 'warning',
            onConfirm: async () => {
                setSecurityModal(prev => ({ ...prev, loading: true }));
                const result = await impersonateUser(userId);
                if (result.success && result.url) {
                    window.open(result.url, '_blank');
                    setSecurityModal(prev => ({ ...prev, isOpen: false }));
                } else {
                    alert('Ghost Protocol Failed: ' + result.error);
                    setSecurityModal(prev => ({ ...prev, loading: false, isOpen: false }));
                }
            }
        });
    };

    const openRoleModal = (user: any) => {
        setSelectedUser(user);
        setNewRole(user.role === 'admin' || user.role === 'super_admin' ? 'admin' : 'user');
        setRoleModalOpen(true);
    };

    const handleUpdateRole = async () => {
        if (!selectedUser) return;

        const result = await updateUserRole(selectedUser.id, newRole);
        if (result.success) {
            setRoleModalOpen(false);
            loadUsers();
        } else {
            alert('Clearance Update Failed: ' + result.error);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <SecurityModal
                isOpen={securityModal.isOpen}
                onClose={() => setSecurityModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={securityModal.onConfirm}
                title={securityModal.title}
                description={securityModal.description}
                variant={securityModal.variant}
                loading={securityModal.loading}
            />
            {/* Role Change Modal */}
            <Modal
                isOpen={roleModalOpen}
                onClose={() => setRoleModalOpen(false)}
                title="Adjust Operative Clearance"
                description="Select the new clearance level for this operative."
            >
                {selectedUser && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Operative: {selectedUser.email}</p>
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                            className="w-full p-2 border border-gray-700 rounded-md bg-gray-800 text-white"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>
                                CANCEL
                            </Button>
                            <Button onClick={handleUpdateRole}>
                                CONFIRM
                            </Button>
                        </div>
                    </div>
                )}
            
            </Modal>

            <h1 className="text-3xl font-bold text-white">OPERATIVE ROSTER</h1>

            <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                    type="text"
                    placeholder="Search operatives by email or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-grow bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                />
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    <Search className="h-5 w-5 mr-2" /> SEARCH
                </Button>
                <Button variant="outline" onClick={() => { setSearch(""); setPage(1); loadUsers(); }} className="border-white/10 text-slate-400 hover:bg-white/5">
                    <RefreshCw className="h-5 w-5" />
                </Button>
            </form>

            {loading ? (
                <div className="text-center text-gray-400">Loading operative data...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user) => (
                        <div key={user.id} className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-white truncate">{user.email}</h2>
                                    <Badge className={`ml-2 ${user.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                                        {user.role.toUpperCase()}
                                    </Badge>
                                </div>
                                <p className="text-gray-400 text-sm mb-2">ID: {user.id}</p>
                                <p className="text-gray-400 text-sm mb-2">Status: {user.isBanned ? <span className="text-red-500">BANNED</span> : <span className="text-green-500">ACTIVE</span>}</p>
                                <p className="text-gray-400 text-sm mb-4">Last Login: {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openRoleModal(user)}
                                    className="border-white/10 text-slate-400 hover:bg-white/5 flex-grow"
                                >
                                    <UserCog className="h-4 w-4 mr-2" /> ADJUST CLEARANCE
                                </Button>
                                <Button
                                    variant={user.isBanned ? "default" : "destructive"}
                                    size="sm"
                                    onClick={() => handleBan(user.id, user.isBanned)}
                                    className="flex-grow"
                                >
                                    {user.isBanned ? <ShieldCheck className="h-4 w-4 mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
                                    {user.isBanned ? 'UNBAN' : 'BAN'}
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleImpersonate(user.id)}
                                    className="flex-grow"
                                >
                                    <Eye className="h-4 w-4 mr-2" /> IMPERSONATE
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(user.id)}
                                    className="text-red-500 hover:bg-red-900/20 flex-grow"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" /> DELETE
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            <div className="flex justify-center gap-4 mt-8">
                <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="border-white/10 text-slate-400 hover:bg-white/5"
                >
                    PREVIOUS
                </Button>
                <span className="flex items-center font-mono text-slate-500">PAGE {page}</span>
                <Button
                    variant="outline"
                    disabled={users.length < 12}
                    onClick={() => setPage(p => p + 1)}
                    className="border-white/10 text-slate-400 hover:bg-white/5"
                >
                    NEXT
                </Button>
            </div>
        </div>
    );
}
