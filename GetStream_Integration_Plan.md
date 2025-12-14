# GetStream Chat Integration Plan

## Executive Summary

Replace the current custom PostgreSQL-based chat system with **GetStream Chat SDK** for real-time messaging in the Request Detail page and future messaging features.

**GetStream App ID**: `1460405`

---

## Current Architecture Analysis

### Backend (Python/FastAPI)
**Current Implementation:**
- **Database Models** (`chat_model.py`):
  - `Conversation` - Manages chat threads
  - `ConversationParticipant` - Links users to conversations
  - `Message` - Stores individual messages
- **API Endpoints** (`chat_router.py`):
  - `POST /chat/conversations` - Create/get conversation
  - `GET /chat/conversations` - List user's conversations
  - `GET /chat/conversations/{id}/messages` - Fetch messages
  - `POST /chat/conversations/{id}/messages` - Send message
- **Polling Mechanism**: Frontend polls every 10 seconds for new messages

**Integration Points with Events:**
- `EventParticipant.conversation_id` - Links event invitations to chat
- `EventProposal.conversation_id` - Links proposal discussions to chat
- Auto-creates conversations when invitations are sent

### Frontend (Next.js/React)
**Current Implementation:**
- **Component**: `CommunicationLog.tsx`
  - Displays messages in a chat UI
  - Uses `getConversationMessages()` and `sendDataMessage()`
  - 10-second polling via `setInterval()`
- **Usage**: Request detail page (`/dashboard/requests/[id]`)
- **State Management**: Local React state with `useState`

---

## Proposed GetStream Integration

### Phase 1: Backend Setup (Python)

#### 1.1 Install GetStream SDK
```bash
pip install stream-chat
```

Add to `requirements.txt`:
```
stream-chat>=4.0.0
```

#### 1.2 Environment Configuration
Add to `.env`:
```env
GETSTREAM_API_KEY=<your_api_key>
GETSTREAM_API_SECRET=<your_api_secret>
GETSTREAM_APP_ID=1460405
```

#### 1.3 Create GetStream Service Layer
**New file**: `app/services/stream_service.py`

```python
from stream_chat import StreamChat
from app.config import settings
import uuid

class StreamChatService:
    def __init__(self):
        self.client = StreamChat(
            api_key=settings.GETSTREAM_API_KEY,
            api_secret=settings.GETSTREAM_API_SECRET
        )
    
    def create_user_token(self, user_id: str, exp: int = None):
        """Generate auth token for user"""
        return self.client.create_token(user_id, exp=exp)
    
    def upsert_user(self, user_id: str, name: str, image: str = None):
        """Create or update user in GetStream"""
        user_data = {"id": user_id, "name": name}
        if image:
            user_data["image"] = image
        self.client.upsert_user(user_data)
    
    def create_channel(self, channel_type: str, channel_id: str, 
                      members: list[str], name: str = None):
        """Create a new channel"""
        channel = self.client.channel(channel_type, channel_id)
        channel.create(created_by_id=members[0], data={
            "members": members,
            "name": name
        })
        return channel
    
    def get_or_create_dm(self, user1_id: str, user2_id: str):
        """Get or create 1-on-1 DM channel"""
        members = sorted([user1_id, user2_id])
        channel_id = f"dm_{members[0]}_{members[1]}"
        
        channel = self.client.channel("messaging", channel_id)
        try:
            channel.create(created_by_id=user1_id, data={
                "members": members
            })
        except:  # Channel exists
            pass
        return channel_id

stream_service = StreamChatService()
```

#### 1.4 Update Chat Router
**Modify**: `app/routers/chat_router.py`

Add new endpoints:
```python
@router.get("/token")
async def get_stream_token(current_user: User = Depends(get_current_user)):
    """Generate GetStream auth token for current user"""
    # Ensure user exists in GetStream
    stream_service.upsert_user(
        user_id=str(current_user.id),
        name=current_user.profile.full_name if current_user.profile else current_user.email,
        image=current_user.profile.avatar_url if current_user.profile else None
    )
    
    token = stream_service.create_user_token(str(current_user.id))
    return {
        "token": token,
        "user_id": str(current_user.id),
        "api_key": settings.GETSTREAM_API_KEY,
        "app_id": settings.GETSTREAM_APP_ID
    }

@router.post("/conversations/{conversation_id}/migrate")
async def migrate_conversation_to_stream(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Migrate existing conversation to GetStream"""
    # 1. Check participant access
    _check_participant(conversation_id, current_user.id, db)
    
    # 2. Get conversation and messages
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    messages = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at).all()
    
    # 3. Get all participants
    participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id
    ).all()
    
    member_ids = [str(p.user_id) for p in participants]
    
    # 4. Create GetStream channel
    channel_id = f"legacy_{str(conversation_id)}"
    channel = stream_service.client.channel("messaging", channel_id)
    channel.create(created_by_id=str(current_user.id), data={
        "members": member_ids
    })
    
    # 5. Migrate messages
    for msg in messages:
        if msg.sender_id:
            channel.send_message({
                "text": msg.content,
                "user_id": str(msg.sender_id)
            }, str(msg.sender_id))
    
    return {"stream_channel_id": channel_id, "migrated_messages": len(messages)}
```

#### 1.5 Update Event Router
**Modify**: `app/routers/event_router.py`

When creating conversations for invitations/proposals, also create GetStream channels:

```python
# In create_invitation endpoint (around line 520)
if not participant.conversation_id:
    # ... existing DB conversation creation ...
    
    # Create GetStream channel
    member_ids = [str(organizer_id), str(participant.user_id)]
    stream_channel_id = stream_service.get_or_create_dm(
        str(organizer_id), 
        str(participant.user_id)
    )
    
    # Store mapping in DB (optional: add stream_channel_id column to Conversation table)
```

---

### Phase 2: Frontend Integration (Next.js/React)

#### 2.1 Install GetStream SDK
```bash
npm install stream-chat stream-chat-react
```

#### 2.2 Create Stream Client Hook
**New file**: `hooks/useStreamChat.ts`

```typescript
import { useEffect, useState } from 'react';
import { StreamChat, Channel } from 'stream-chat';
import { getStreamChatToken } from '@/services/api';

export function useStreamChat(userId: string | undefined) {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const initStream = async () => {
      try {
        // Get token from backend
        const { token, api_key, user_id } = await getStreamChatToken();
        
        // Initialize client
        const chatClient = StreamChat.getInstance(api_key);
        
        // Connect user
        await chatClient.connectUser(
          {
            id: user_id,
            name: userId, // Will be enriched by backend
          },
          token
        );
        
        setClient(chatClient);
      } catch (error) {
        console.error('StreamChat init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initStream();

    return () => {
      client?.disconnectUser();
    };
  }, [userId]);

  return { client, loading };
}
```

#### 2.3 Replace CommunicationLog Component
**Update**: `components/dashboard/CommunicationLog.tsx`

```typescript
'use client';

import React from 'react';
import { Channel, ChannelHeader, MessageInput, MessageList, Thread, Window } from 'stream-chat-react';
import { useStreamChat } from '@/hooks/useStreamChat';
import 'stream-chat-react/dist/css/v2/index.css';

interface StreamCommunicationLogProps {
  channelId: string;
  currentUserId?: string;
  organizerName: string;
}

export function StreamCommunicationLog({ 
  channelId, 
  currentUserId,
  organizerName 
}: StreamCommunicationLogProps) {
  const { client, loading } = useStreamChat(currentUserId);
  const [channel, setChannel] = React.useState(null);

  React.useEffect(() => {
    if (!client || !channelId) return;

    const initChannel = async () => {
      const ch = client.channel('messaging', channelId);
      await ch.watch();
      setChannel(ch);
    };

    initChannel();
  }, [client, channelId]);

  if (loading || !client) {
    return <div>Loading chat...</div>;
  }

  if (!channel) {
    return (
      <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col h-[600px] items-center justify-center">
        <p>Start a conversation with {organizerName}</p>
      </div>
    );
  }

  return (
    <div className="stream-chat-wrapper bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden h-[600px]">
      <Channel channel={channel}>
        <Window>
          <ChannelHeader />
          <MessageList />
          <MessageInput />
        </Window>
        <Thread />
      </Channel>
    </div>
  );
}
```

#### 2.4 Update API Service
**Modify**: `services/api.ts`

```typescript
// Add new endpoint
export const getStreamChatToken = async () => {
  const response = await api.get<{
    token: string;
    user_id: string;
    api_key: string;
    app_id: string;
  }>('/chat/token');
  return response.data;
};
```

#### 2.5 Update Request Detail Page
**Modify**: `app/(app)/dashboard/requests/[id]/page.tsx`

```typescript
// Replace import
import { StreamCommunicationLog } from '@/components/dashboard/CommunicationLog';

// In JSX (around line 271):
<StreamCommunicationLog
  channelId={request.conversation_id ? `legacy_${request.conversation_id}` : 'pending'}
  organizerName={organizer?.full_name || 'Organizer'}
  currentUserId={currentUser?.id}
/>
```

---

### Phase 3: Migration Strategy

#### 3.1 Dual-Mode Operation (Recommended)
- **Keep existing DB schema** for backward compatibility
- **Create GetStream channels** for all new conversations
- Create migration endpoint to move old conversations to GetStream on-demand

#### 3.2 Channel Naming Convention
```
Type                    Channel ID Format
────────────────────────────────────────────────
Event Invitation       "invitation_{participant_id}"
Event Proposal         "proposal_{proposal_id}"
Direct Message         "dm_{user1}_{user2}"
Legacy (migrated)      "legacy_{conversation_uuid}"
```

#### 3.3 Data Mapping

| PostgreSQL Model | GetStream Equivalent |
|------------------|---------------------|
| `Conversation.id` | `channel.id` |
| `ConversationParticipant` | `channel.members` |
| `Message.content` | `message.text` |
| `Message.sender_id` | `message.user.id` |
| `Message.created_at` | `message.created_at` |
| `last_read_at` | Built-in read state |

---

## Benefits of GetStream Integration

### 1. **Real-Time Performance**
- WebSocket connections eliminate 10-second polling
- Instant message delivery (< 100ms latency)
- Typing indicators and presence

### 2. **Built-In Features**
- Read receipts
- Message reactions
- File attachments
- Message threading
- @mentions and notifications

### 3. **Scalability**
- Handles 1M+ concurrent connections
- Auto-scaling infrastructure
- CDN-backed media delivery

### 4. **Developer Experience**
- Pre-built React components
- Customizable UI themes
- Comprehensive TypeScript support
- Excellent documentation

### 5. **Cost Efficiency**
- Free tier: 25 MAU (Monthly Active Users)
- Reduces server load (no polling)
- Built-in moderation tools

---

## Implementation Timeline

| Phase | Task | Estimated Time |
|-------|------|---------------|
| **1** | Backend SDK installation + service layer | 2 hours |
| **2** | Token generation endpoint | 1 hour |
| **3** | Frontend SDK installation | 30 mins |
| **4** | Replace CommunicationLog component | 3 hours |
| **5** | Custom styling to match design | 2 hours |
| **6** | Migration endpoint for old messages | 2 hours |
| **7** | Testing and bug fixes | 3 hours |
| **Total** | | **~14 hours** |

---

## Questions for User

1. **API Credentials**: Do you already have the GetStream API Key and Secret for App ID 1460405?
2. **Migration**: Should we migrate all existing conversations immediately or on-demand when users access them?
3. **Old Messages**: Do we need to preserve all historical messages in GetStream, or just keep them in the DB for archival?
4. **Custom Styling**: Should we use GetStream's default theme or customize to match your yellow/black design?
5. **Feature Scope**: Do you want to implement advanced features (reactions, threads, typing indicators) in Phase 1 or add them later?

---

## Next Steps

**Immediate Action Required:**
1. Share GetStream API credentials (Key + Secret) for App ID 1460405
2. Confirm migration strategy preference
3. Approve this plan

**If approved, I will start with:**
1. Backend service layer setup
2. Token generation endpoint
3. Frontend hook implementation
4. Replace CommunicationLog component

Would you like me to proceed with the implementation?
