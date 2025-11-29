import { useState, useRef, useEffect } from 'react';
import { ChatMessage, PartyMember } from '@/types/watch-party';
import { Send, User } from 'lucide-react';

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
        <div className="flex flex-col h-full bg-black/20 backdrop-blur-md border-l border-white/10 w-80">
            <div className="p-4 border-b border-white/10">
                <h3 className="font-bold text-white">Chat en Vivo</h3>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20"
            >
                {messages.map((msg) => {
                    const isMe = msg.user_id === currentUser.id;
                    return (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                {!isMe && (
                                    <span className="text-xs text-gray-400">{msg.username}</span>
                                )}
                            </div>
                            <div
                                className={`px-3 py-2 rounded-lg max-w-[85%] text-sm ${isMe
                                        ? 'bg-purple-600 text-white rounded-tr-none'
                                        : 'bg-white/10 text-gray-200 rounded-tl-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="absolute right-1 top-1 p-1.5 bg-purple-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </form>
        </div>
    );
};
