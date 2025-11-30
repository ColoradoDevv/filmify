import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/watch-party';
import { Send } from 'lucide-react';

interface PartyChatProps {
    messages: ChatMessage[];
    currentUser: { id: string };
    onSendMessage: (text: string) => void;
}

export const PartyChat = ({ messages, currentUser, onSendMessage }: PartyChatProps) => {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full w-80 bg-black/40 backdrop-blur-xl border-l border-white/10">
            <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Chat en Vivo
                </h3>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
            >
                {messages.map((msg) => {
                    if (msg.type === 'system') {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 bg-white/5 border border-white/5 px-3 py-1 rounded-full backdrop-blur-sm">
                                    {msg.text}
                                </span>
                            </div>
                        );
                    }

                    const isMe = msg.user_id === currentUser.id;
                    return (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {/* Avatar */}
                            <div className="flex-shrink-0 mt-1">
                                {msg.avatar_url ? (
                                    <img
                                        src={msg.avatar_url}
                                        alt={msg.username}
                                        className="w-8 h-8 rounded-full border border-white/10 object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                                        {msg.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {!isMe && (
                                        <span className="text-xs font-medium text-gray-400">{msg.username}</span>
                                    )}
                                    <span className="text-[10px] text-gray-500">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div
                                    className={`px-4 py-2 text-sm shadow-lg backdrop-blur-sm break-all whitespace-pre-wrap ${isMe
                                        ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-2xl rounded-tr-sm border border-white/10'
                                        : 'bg-white/10 text-gray-100 rounded-2xl rounded-tl-sm border border-white/5'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
                <div className="relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="absolute right-2 top-2 p-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/20 transition-all transform active:scale-95"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
};
