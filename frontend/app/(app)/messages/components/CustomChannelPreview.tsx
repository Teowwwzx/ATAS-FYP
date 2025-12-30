import React from 'react';
import { ChannelPreviewUIComponentProps, useChatContext } from 'stream-chat-react';
import { format } from 'date-fns';

export const CustomChannelPreview = (props: ChannelPreviewUIComponentProps) => {
    const { channel, active, displayImage, displayTitle, unread, latestMessage } = props;
    const { client } = useChatContext();
    const { setActiveChannel } = props;

    // Debug logging
    // React.useEffect(() => {
    //     console.log('[CustomChannelPreview]', {
    //         id: channel.id,
    //         displayTitle,
    //         memberCount: Object.keys(channel.state.members).length,
    //         members: channel.state.members,
    //         latestMessage,
    //         unread
    //     });
    // }, [channel, displayTitle, latestMessage, unread]);

    const isSelected = active;

    // Resolve Title
    let title = displayTitle || 'Unknown User';
    // If the title matches the current user's name, try to improve it
    if (client.user?.name && title === client.user.name) {
        const members = Object.values(channel.state.members);
        const otherMember = members.find(m => m.user_id !== client.userID);
        if (otherMember?.user?.name) {
            title = otherMember.user.name;
        } else {
            title = `${title} (You)`;
        }
    }
    
    // Resolve Message & Date (Fallback to channel state if latestMessage prop is missing)
    let messageText = 'No messages yet';
    let messageTime = latestMessage?.created_at;

    if (latestMessage?.text) {
        messageText = latestMessage.text;
    } else if (channel.state.messages.length > 0) {
        const lastMsg = channel.state.messages[channel.state.messages.length - 1];
        if (lastMsg.text) {
            messageText = lastMsg.text;
            messageTime = lastMsg.created_at;
        }
    }

    // Format date
    let date = '';
    if (messageTime) {
        date = format(new Date(messageTime), 'MMM d');
    }

    // Handle click
    const handleClick = () => {
        setActiveChannel(channel);
        if (props.onSelect) {
            props.onSelect(); // Trigger parent handler if needed
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 transition-colors border-b border-zinc-50 ${isSelected ? 'bg-zinc-50 border-r-4 border-r-amber-400' : ''}`}
        >
            <div className="relative">
                <img 
                    src={displayImage || `https://placehold.co/200x200/png?text=${encodeURIComponent(displayTitle || 'User')}`} 
                    alt={displayTitle || 'User'} 
                    className="w-12 h-12 rounded-full object-cover border border-zinc-200" 
                />
                {unread > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                        {unread}
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h4 className={`font-bold text-sm truncate ${unread > 0 ? 'text-zinc-900' : 'text-zinc-700'}`}>
                        {title}
                    </h4>
                    {date && (
                        <span className="text-xs text-zinc-400 whitespace-nowrap ml-2">
                            {date}
                        </span>
                    )}
                </div>
                <p className={`text-xs truncate ${unread > 0 ? 'text-zinc-900 font-semibold' : 'text-zinc-500'}`}>
                    {messageText}
                </p>
            </div>
        </div>
    );
};