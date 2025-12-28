'use client';

import React, { useEffect, useState } from 'react';
import {
    Channel,
    MessageInput,
    MessageList,
    Thread,
    Window,
    Chat,
} from 'stream-chat-react';
import { useStreamChat } from '@/hooks/useStreamChat';
import type { Channel as StreamChannel } from 'stream-chat';
import 'stream-chat-react/dist/css/v2/index.css';
import '@/components/dashboard/stream-chat-custom.css';
import { ChatConversation } from '@/services/api.types';

interface StreamChatWindowProps {
    conversation: ChatConversation;
    currentUserId: string;
    onMessageSent?: () => void;
    onBack?: () => void;
}

export function StreamChatWindow({
    conversation,
    currentUserId,
    onMessageSent,
    onBack,
}: StreamChatWindowProps) {
    const { client, loading, error } = useStreamChat(currentUserId);
    const [channel, setChannel] = useState<StreamChannel | null>(null);
    const [channelLoading, setChannelLoading] = useState(true);

    // Get other participant info
    const otherParticipant = conversation.participants.find((p) => p.user_id !== currentUserId);
    const participantName = otherParticipant?.full_name || 'Unknown';
    const participantAvatar = otherParticipant?.avatar_url;

    useEffect(() => {
        if (!client || !conversation.id) {
            setChannelLoading(false);
            return;
        }

        const initChannel = async () => {
            try {
                setChannelLoading(true);

                // Create channel ID - use legacy_ prefix to match request detail page
                const channelId = conversation.id.startsWith('legacy_')
                    ? conversation.id
                    : `legacy_${conversation.id}`;

                console.log('[StreamChatWindow] Initializing channel:', channelId);

                // Get members from conversation participants
                const members = conversation.participants.map(p => p.user_id);

                // Get or create channel
                // We MUST specify members for private messaging channels
                const ch = client.channel('messaging', channelId, {
                    members: members,
                });

                await ch.watch();
                setChannel(ch);
                console.log('[StreamChatWindow] Channel ready:', channelId);

                // Call onMessageSent when new message arrives (for updating unread counts)
                if (onMessageSent) {
                    ch.on('message.new', () => {
                        onMessageSent();
                    });
                }
            } catch (err) {
                console.error('[StreamChatWindow] Channel init error:', err);
            } finally {
                setChannelLoading(false);
            }
        };

        initChannel();

        return () => {
            // Cleanup
            if (channel) {
                channel.stopWatching().catch((e) => console.error('Stop watching error:', e));
            }
        };
    }, [client, conversation.id, onMessageSent]);

    // Loading state
    if (loading || channelLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-zinc-50/30">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-zinc-200 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500 font-medium">Loading chat...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center bg-zinc-50/30 p-8">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h4 className="font-bold text-zinc-900 mb-2">Chat Unavailable</h4>
                    <p className="text-zinc-500 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    // No channel state
    if (!channel) {
        return (
            <div className="flex-1 flex items-center justify-center bg-zinc-50/30 p-8">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h4 className="font-bold text-zinc-900 mb-2">Unable to Load Chat</h4>
                    <p className="text-zinc-500 text-sm">This conversation could not be loaded.</p>
                </div>
            </div>
        );
    }

    // Main chat UI
    return (
        <div className="flex-1 flex flex-col h-full">
            <Chat client={client!} theme="str-chat__theme-light">
                <Channel channel={channel}>
                    <Window>
                        {/* Custom Header */}
                        <div className="p-4 md:p-6 border-b border-zinc-100 bg-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Back button for mobile */}
                                {onBack && (
                                    <button
                                        onClick={onBack}
                                        className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                )}

                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden flex-shrink-0">
                                    {participantAvatar ? (
                                        <img src={participantAvatar} alt={participantName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                                            {participantName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                {/* Name */}
                                <div>
                                    <h3 className="font-bold text-zinc-900">{participantName}</h3>
                                    <p className="text-xs text-zinc-500">Active chat</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                <span className="hidden md:inline-flex px-2 py-1 bg-zinc-100 text-zinc-500 text-xs font-bold rounded-md items-center gap-1">
                                    🔒 Private
                                </span>
                            </div>
                        </div>

                        {/* Messages */}
                        <MessageList />

                        {/* Input */}
                        <MessageInput />
                    </Window>
                    <Thread />
                </Channel>
            </Chat>
        </div>
    );
}
