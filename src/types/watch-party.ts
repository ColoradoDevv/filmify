export type PartyStatus = 'waiting' | 'counting' | 'playing' | 'finished';

export interface Party {
    id: string;
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    host_id: string;
    status: PartyStatus;
    created_at: string;
    ended_at?: string;
    name: string;
    is_private: boolean;
    password?: string;
    room_code: string;
    party_members?: { count: number }[];
}

export interface PartyMember {
    user_id: string;
    username: string;
    avatar_url: string | null;
    is_host: boolean;
    is_ready: boolean;
    online_at: string;
}

export interface ChatMessage {
    id: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    text: string;
    timestamp: string;
    type?: 'user' | 'system';
}

export interface PartyState {
    party: Party | null;
    members: PartyMember[];
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
}
