import { useEffect, useRef, useState } from 'react';

interface NotificationData {
    id: string;
    recipient_id: string;
    actor_id: string;
    type: string;
    content: string;
    link_url?: string | null;
    is_read: boolean;
    created_at: string;
    updated_at?: string | null;
}

export function useNotificationStream() {
    const [isConnected, setIsConnected] = useState(false);
    const [latestNotification, setLatestNotification] = useState<NotificationData | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        // Simple cookie check without libraries
        const getAccessToken = () => {
            if (typeof document === 'undefined') return null;
            const match = document.cookie.match(new RegExp('(^| )access_token=([^;]+)'));
            return match ? match[2] : null;
        };

        const token = getAccessToken();

        if (!token) {
            console.log('No access token, skipping SSE connection');
            return;
        }

        // Create EventSource connection
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/notifications/stream`;

        // EventSource doesn't support custom headers directly, so we append token as query param
        // OR we can use a different approach - fetch with ReadableStream
        // For simplicity, let's use a workaround with a custom EventSource polyfill or use fetch

        // Using native EventSource with token in URL (not recommended for production, but works for MVP)
        // Better approach: use fetch with ReadableStream, but EventSource is simpler

        const connectSSE = () => {
            try {
                // Note: EventSource doesn't support Authorization header
                // We'll need to use cookies or implement a custom fetch-based SSE client
                // For now, relying on cookie-based auth which FastAPI should support

                const es = new EventSource(url, { withCredentials: true });

                es.onopen = () => {
                    console.log('SSE connection established');
                    setIsConnected(true);
                };

                es.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === 'connected') {
                            console.log('SSE stream confirmed:', data.message);
                        } else {
                            // It's a real notification
                            console.log('Received notification via SSE:', data);
                            setLatestNotification(data);
                        }
                    } catch (err) {
                        console.error('Failed to parse SSE message:', err);
                    }
                };

                es.onerror = (error) => {
                    console.error('SSE error:', error);
                    setIsConnected(false);
                    es.close();

                    // Retry connection after 5 seconds
                    setTimeout(() => {
                        console.log('Attempting to reconnect SSE...');
                        connectSSE();
                    }, 5000);
                };

                eventSourceRef.current = es;
            } catch (err) {
                console.error('Failed to create EventSource:', err);
            }
        };

        connectSSE();

        // Cleanup on unmount
        return () => {
            if (eventSourceRef.current) {
                console.log('Closing SSE connection');
                eventSourceRef.current.close();
            }
        };
    }, []); // Only run once on mount

    return {
        isConnected,
        latestNotification,
    };
}
