'use client';

import { useEffect, useState } from 'react';
import { getRooms, terminateRoom, broadcastRoomMessage, getRoomUsers, kickUserFromRoom, warnUser, banUser } from '../actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Users, Clock, AlertTriangle, MessageSquare, Radio, Signal, Wifi, UserX, ShieldBan, AlertOctagon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import Modal from '@/components/ui/Modal';
import SecurityModal from '@/components/admin/SecurityModal';

export default function LiveOpsPage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Broadcast Modal State
    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [sending, setSending] = useState(false);

    // User Management Modal State
    const [usersModalOpen, setUsersModalOpen] = useState(false);
    const [roomUsers, setRoomUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUserRoomId, setSelectedUserRoomId] = useState<string | null>(null);

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
    const supabase = createClient();

    useEffect(() => {
        loadRooms();

        // Realtime subscription for rooms
        const channel = supabase
            .channel('live-ops-rooms')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'parties' },
                () => {
                    loadRooms(); // Re-fetch on any change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadRooms = async () => {
        setLoading(true);
        const data = await getRooms();
        setRooms(data);
        setLoading(false);
    };

    const handleTerminate = (roomId: string) => {
        setSecurityModal({
            isOpen: true,
            title: 'TERMINATE SECTOR',
            description: 'This will immediately disconnect all operatives and shut down the watch party. This action cannot be undone.',
            variant: 'danger',
            onConfirm: async () => {
                setSecurityModal(prev => ({ ...prev, loading: true }));
                const result = await terminateRoom(roomId);
                if (result.success) {
                    loadRooms();
                    router.refresh();
                    setSecurityModal(prev => ({ ...prev, isOpen: false }));
                } else {
                    alert('Error executing termination protocol: ' + result.error);
                    setSecurityModal(prev => ({ ...prev, loading: false, isOpen: false }));
                }
            }
        });
    };

    const openBroadcastModal = (roomId: string) => {
        setSelectedRoom(roomId);
        setBroadcastMessage("");
        setMessageModalOpen(true);
    };

    const handleBroadcast = async () => {
        if (!selectedRoom || !broadcastMessage.trim()) return;

        setSending(true);
        const result = await broadcastRoomMessage(selectedRoom, broadcastMessage);
        setSending(false);

        if (result.success) {
            setMessageModalOpen(false);
            // alert("Transmission Sent Successfully"); // Removed for cleaner UX
        } else {
            alert("Transmission Failed: " + result.error);
        }
    };

    const openUsersModal = async (roomId: string) => {
        setSelectedUserRoomId(roomId);
        setUsersModalOpen(true);
        setLoadingUsers(true);
        const users = await getRoomUsers(roomId);
        setRoomUsers(users);
        setLoadingUsers(false);
    };

    const handleKick = (userId: string) => {
        if (!selectedUserRoomId) return;

        setSecurityModal({
            isOpen: true,
            title: 'KICK OPERATIVE',
            description: 'Forcefully remove this user from the current session. They may rejoin if the room is public.',
            variant: 'warning',
            onConfirm: async () => {
                setSecurityModal(prev => ({ ...prev, loading: true }));
                const result = await kickUserFromRoom(selectedUserRoomId, userId);
                if (result.success) {
                    const users = await getRoomUsers(selectedUserRoomId);
                    setRoomUsers(users);
                    setSecurityModal(prev => ({ ...prev, isOpen: false }));
                } else {
                    alert('Failed to kick user: ' + result.error);
                    setSecurityModal(prev => ({ ...prev, loading: false, isOpen: false }));
                }
            }
        });
    };

    const handleBan = (userId: string) => {
        setSecurityModal({
            isOpen: true,
            title: 'EXECUTE BAN PROTOCOL',
            description: 'Permanently ban this user from the entire platform. This will also remove them from the current session.',
            variant: 'danger',
            onConfirm: async () => {
                setSecurityModal(prev => ({ ...prev, loading: true }));
                const result = await banUser(userId);
                if (result.success) {
                    if (selectedUserRoomId) {
                        const users = await getRoomUsers(selectedUserRoomId);
                        setRoomUsers(users);
                    }
                    setSecurityModal(prev => ({ ...prev, isOpen: false }));
                } else {
                    alert('Failed to ban user: ' + result.error);
                    setSecurityModal(prev => ({ ...prev, loading: false, isOpen: false }));
                }
            }
        });
    };

    const handleWarn = async (userId: string) => {
        const message = prompt("Enter warning message:"); // Keeping prompt for input, but could replace with modal if needed
        if (!message || !selectedUserRoomId) return;

        const result = await warnUser(selectedUserRoomId, userId, message);
        if (result.success) {
            // alert('Warning sent.'); // Silent success
        } else {
            alert('Failed to send warning: ' + result.error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-emerald-500/50 font-mono text-sm animate-pulse">ESTABLISHING UPLINK...</p>
                </div>
            </div>
        );
    }

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

            {/* Broadcast Modal */}
            <Modal isOpen={messageModalOpen} onClose={() => setMessageModalOpen(false)} title="SECURE TRANSMISSION">
                <div className="space-y-4">
                    <div className="bg-black/50 border border-emerald-500/20 p-4 rounded-lg">
                        <p className="text-xs text-emerald-500 font-mono mb-2">TARGET SECTOR: {selectedRoom}</p>
                        <Input
                            value={broadcastMessage}
                            onChange={(e) => setBroadcastMessage(e.target.value)}
                            placeholder="Enter system alert message..."
                            className="bg-black border-emerald-500/30 text-emerald-400 placeholder:text-emerald-500/20 font-mono"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setMessageModalOpen(false)}
                            className="text-slate-500 hover:text-slate-300"
                        >
                            CANCEL
                        </Button>
                        <Button
                            onClick={handleBroadcast}
                            disabled={sending}
                            className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30"
                        >
                            {sending ? "TRANSMITTING..." : "SEND ALERT"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Users Management Modal */}
            <Modal isOpen={usersModalOpen} onClose={() => setUsersModalOpen(false)} title="ACTIVE OPERATIVES">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {loadingUsers ? (
                        <div className="text-center py-8 text-slate-500 animate-pulse">Scanning user signatures...</div>
                    ) : roomUsers.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">No operatives found in this sector.</div>
                    ) : (
                        <div className="space-y-2">
                            {roomUsers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-lg hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                                            {member.profiles?.avatar_url ? (
                                                <img src={member.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                                                    {member.profiles?.full_name?.substring(0, 2).toUpperCase() || "??"}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-200">{member.profiles?.full_name || "Unknown Agent"}</p>
                                            <p className="text-xs text-slate-500 font-mono">{member.profiles?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleWarn(member.user_id)}
                                            className="h-8 w-8 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                                            title="Warn User"
                                        >
                                            <AlertOctagon size={16} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleKick(member.user_id)}
                                            className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                            title="Kick User"
                                        >
                                            <UserX size={16} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleBan(member.user_id)}
                                            className="h-8 w-8 text-red-600 hover:bg-red-900/20 hover:text-red-500"
                                            title="Ban User"
                                        >
                                            <ShieldBan size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            <div className="flex items-end justify-between border-b border-white/5 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Live Operations</h2>
                    <p className="text-slate-500 mt-1 font-mono text-sm">Active Session Monitoring & Control</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-full">
                        <Wifi className="w-4 h-4 text-emerald-500 animate-pulse" />
                        <span className="text-xs font-mono text-emerald-500">NETWORK STABLE</span>
                    </div>
                    <Button onClick={loadRooms} variant="outline" className="border-white/10 text-slate-400 hover:bg-white/5 hover:text-white">
                        REFRESH FEED
                    </Button>
                </div>
            </div>

            {rooms.length === 0 ? (
                <div className="bg-black/40 border border-white/5 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                        <Signal className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-300 mb-2">No Active Signals</h3>
                    <p className="text-slate-500 max-w-md">
                        All sectors are currently quiet. No active watch parties detected on the network.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms.map((room) => (
                        <div key={room.id} className="group bg-black/40 border border-white/5 rounded-xl overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
                            {/* Header / Preview */}
                            <div className="relative h-40 bg-slate-900/50 group-hover:bg-slate-900/80 transition-colors">
                                {room.poster_path ? (
                                    <>
                                        <img
                                            src={`https://image.tmdb.org/t/p/w500${room.poster_path}`}
                                            alt={room.title}
                                            className="w-full h-full object-cover opacity-40 group-hover:opacity-20 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                                        <Play size={40} />
                                    </div>
                                )}

                                <div className="absolute top-3 right-3 flex gap-2">
                                    <Badge className={`font-mono text-[10px] uppercase tracking-wider border-0 ${room.status === 'playing' ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' :
                                            room.status === 'waiting' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {room.status}
                                    </Badge>
                                </div>

                                <div className="absolute bottom-3 left-4 right-4">
                                    <h3 className="text-lg font-bold text-white truncate leading-tight mb-1">{room.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                                        HOST: {room.name}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 border-b border-white/5 divide-x divide-white/5 bg-white/[0.02]">
                                <div className="p-3 flex flex-col items-center justify-center gap-1">
                                    <Users className="w-4 h-4 text-blue-400" />
                                    <span className="text-xs font-mono text-slate-400">{room.party_members?.length || 0} AGENTS</span>
                                </div>
                                <div className="p-3 flex flex-col items-center justify-center gap-1">
                                    <Clock className="w-4 h-4 text-amber-400" />
                                    <span className="text-xs font-mono text-slate-400">{new Date(room.created_at).toLocaleTimeString()}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openUsersModal(room.id)}
                                    className="col-span-2 border-white/10 text-slate-400 hover:bg-white/5 hover:text-white font-mono text-xs"
                                >
                                    <Users className="w-3 h-3 mr-2" />
                                    MANAGE OPERATIVES
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openBroadcastModal(room.id)}
                                    className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 font-mono text-xs"
                                >
                                    <Radio className="w-3 h-3 mr-2" />
                                    BROADCAST
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleTerminate(room.id)}
                                    className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 font-mono text-xs"
                                >
                                    <AlertTriangle className="w-3 h-3 mr-2" />
                                    TERMINATE
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
