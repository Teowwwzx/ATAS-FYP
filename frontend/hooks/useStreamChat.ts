'use client';

import { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import { getStreamChatToken } from '@/services/api';

/**
 * Custom hook to initialize and manage GetStream Chat client
 * Handles user authentication and connection lifecycle
 */
export function useStreamChat(userId: string | undefined) {
    const [client, setClient] = useState<StreamChat | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        let chatClient: StreamChat | null = null;

        const initStream = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get token from backend
                const { token, api_key, user_id } = await getStreamChatToken();

                // Initialize client (singleton pattern)
                chatClient = StreamChat.getInstance(api_key);

                // Check if already connected
                if (chatClient.userID === user_id) {
                    console.log('[StreamChat] Already connected');
                    setClient(chatClient);
                    setLoading(false);
                    return;
                }

                // Connect user
                await chatClient.connectUser(
                    {
                        id: user_id,
                    },
                    token
                );

                console.log('[StreamChat] User connected successfully:', user_id);
                setClient(chatClient);
            } catch (err) {
                console.error('[StreamChat] Init error:', err);
                setError(err instanceof Error ? err.message : 'Failed to initialize chat');
            } finally {
                setLoading(false);
            }
        };

        initStream();

        // Cleanup on unmount
        return () => {
            if (chatClient && chatClient.userID) {
                chatClient.disconnectUser()
                    .then(() => console.log('[StreamChat] User disconnected'))
                    .catch(e => console.error('[StreamChat] Disconnect error:', e));
            }
        };
    }, [userId]);

    return { client, loading, error };
}
