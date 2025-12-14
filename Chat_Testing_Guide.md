# 🧪 GetStream Chat Testing Guide

## ✅ Test Scenario Created Successfully!

The specialized seeder has created a perfect test scenario for you to verify the GetStream chat integration.

---

## 📋 Test Accounts

| Account | Email | Password | Role | Purpose |
|---------|-------|----------|------|---------|
| **Student 1** | `student1@gmail.com` | `123123` | Event Organizer | Creates events, sends invitations |
| **Expert 1** | `expert1@gmail.com` | `123123` | Invited Speaker | Receives invitation, uses chat |

---

## 🎯 Test Event Details

**Event**: "Tech Innovation Summit - Chat Test Event"
- **Organizer**: student1@gmail.com
- **Invited Speaker**: expert1@gmail.com (PENDING status)
- **Conversation**: Already created with 2 initial messages
- **Type**: Hybrid event (online + offline)
- **Date**: Next week (7 days from now)

---

## 🧪 Step-by-Step Testing Guide

### **Test 1: Request Detail Page Chat**

1. **Login as Expert**:
   ```
   Email: expert1@gmail.com
   Password: 123123
   ```

2. **Navigate to Dashboard**:
   - URL: `http://localhost:3001/dashboard`
   - Click on "Invitations" tab (should show 1 pending invitation)

3. **Open  Invitation**:
   - Find: "Tech Innovation Summit - Chat Test Event"
   - Click on the card to open request detail

4. **Test Communication Log** (Right side panel):
   - ✅ Verify: Loading spinner appears briefly
   - ✅ Verify: Chat interface loads successfully
   - ✅ Verify: 2 existing messages appear:
     - From student1: "Hi! Thank you for considering..."
     - From expert1: "Hello! Thank you for the invitation..."
   - ✅ Test: Send a new message (e.g., "Sounds great! I'm happy to participate!")
   - ✅ Verify: Message appears instantly
   - ✅ Verify: Timestamp shows current time

### **Test 2: Messages Page Chat**

5. **Navigate to Messages Page**:
   - URL: `http://localhost:3001/messages`
   - Should see conversation with student1

6. **Verify Same Conversation**:
   - ✅ Click on conversation with student1@gmail.com
   - ✅ Verify: Same message history appears (including the message you just sent!)
   - ✅ Test: Send another message (e.g., "Looking forward to it!")
   - ✅ Verify: Message appears instantly

### **Test 3: Real-Time Sync** (Multi-Window Test)

7. **Open Two Browser Windows**:
   - **Window 1**: Keep on Messages page (`/messages`)
   - **Window 2**: Navigate back to Request Detail page (`/dashboard/requests/{id}`)

8. **Test Real-Time Sync**:
   - ✅ Send message from Window 1 (Messages page)
   - ✅ Verify: Message appears **instantly** in Window 2 (Request Detail)
   - ✅ Send message from Window 2 (Request Detail)
   - ✅ Verify: Message appears **instantly** in Window 1 (Messages page)

### **Test 4: Switch Users** (Optional)

9. **Login as Organizer**:
   - Logout from expert1@gmail.com
   - Login as student1@gmail.com (password: 123123)

10. **View Conversation from Organizer Side**:
    - Go to Dashboard → "Organized" tab → Click the test event
    - Navigate to "People" or "Proposals" tab
    - Find expert1's invitation
    - Click to open invitation detail (if available)
    - OR go directly to `/messages`
    - ✅ Verify: Same conversation appears
    - ✅ Verify: All messages from expert1 are visible
    - ✅ Test: Send a reply
    - ✅ Switch back to expert1 account
    - ✅ Verify: Reply appears in expert1's chat

---

## ✅ Success Criteria

Your GetStream integration is working perfectly if:

- [x] **Request Detail Chat** loads without errors
- [x] **Messages Page Chat** loads without errors
- [x] **Same conversation** appears in both places
- [x] **Message history** is identical in both views
- [x] **Real-time sync** works (< 1 second latency)
- [x] **Sending messages** works from both pages
- [x] **No 422 or 403 errors** in browser console
- [x] **No polling** (WebSocket connection established)
- [x] **Typing indicators** work (if you type, shows in other window)
- [x] **Read receipts** update properly

---

## 🔍 Debugging Tips

### If Chat Doesn't Load:

**Check Browser Console**:
```javascript
// Look for these logs:
[StreamChat] User connected successfully: <user_id>
[StreamChat] Channel initialized: legacy_<conversation_id>
[StreamChatWindow] Channel ready: legacy_<conversation_id>
```

**Expected Network Requests**:
```
GET /api/v1/chat/stream/token → 200 OK
GET /api/v1/users/me → 200 OK
```

### Common Issues:

| Issue | Cause | Fix |
|-------|-------|-----|
| "Chat Unavailable" | GetStream credentials missing | Check backend `.env` has `GET_STREAM_API_KEY` and `GET_STREAM_SECRET_KEY` |
| "Loading chat..." stuck | Frontend can't reach backend | Verify backend is running on port 8000 |
| "User does not exist" error | Other user not created in GetStream yet | Normal - will be created when they first login |
| Messages not syncing | Different channel IDs | Check console logs for channel ID format |

### View Backend Logs:

The backend should show:
```
INFO:app.services.stream_service:Upserted user: <user_id>
INFO:app.services.stream_service:Generated token for user: <user_id>
INFO: "GET /api/v1/chat/stream/token HTTP/1.1" 200 OK
```

---

## 📸 What You Should See

### Request Detail Page:
```
┌───────────────────────────────────────────┐
│  Request #ABC123                          │
│  Received 2 days ago                      │
├───────────────────────────────────────────┤
│  [Action Required]  [Decline] [Accept]    │
├──────────────────┬────────────────────────┤
│  Event Details   │  Communication Log     │
│  Tech Innovation │  🔒 Private            │
│  Summit...       │                        │
│                  │  [student1]:           │
│  📅 Dec 22       │  "Hi! Thank you..."    │
│  ⏰ 2:00 PM      │                        │
│  📍 Tech Hub     │  [expert1]:            │
│                  │  "Hello! Thank you..." │
│                  │                        │
│                  │  [Type a message...]   │
└──────────────────┴────────────────────────┘
```

### Messages Page:
```
┌──────────────────┬─────────────────────────┐
│  Messages        │                         │
├──────────────────┤  Chat with student1     │
│  🔍 Search...    │  🔒 Private             │
├──────────────────┤─────────────────────────┤
│  ● student1      │  [student1]:            │
│  "Looking fwd"   │  "Hi! Thank you..."     │
│  2 min ago       │                         │
│                  │  [expert1]:             │
│  ○ student2      │  "Hello! Thank you..."  │
│  "See you!"      │                         │
│  1 hour ago      │  [Type a message...]    │
└──────────────────┴─────────────────────────┘
```

---

## 🎉 Next Steps After Successful Testing

Once everything works:

### 1. **Test with More Scenarios**:
   - Accept the invitation → verify chat still works
   - Decline the invitation → verify access control
   - Create more events with invitations

### 2. **Performance Testing**:
   - Send 50+ messages → verify scrolling works
   - Test on mobile viewport → verify responsive design
   - Test on slow network → verify loading states

### 3. **Advanced Features** (Future):
   - File attachments (images, PDFs)
   - Message reactions (👍, ❤️, etc.)
   - Typing indicators UI
   - Message threading
   - Search within conversations

---

## 📚 Reference

- **Backend Seeder**: `backend/app/seeders/chat_test_seeder.py`
- **GetStream Implementation**: `GetStream_Unified_Messaging.md`
- **Checklist Fix**: `Checklist_Issue_Analysis.md`
- **Frontend Chat Component**: `frontend/components/dashboard/StreamCommunicationLog.tsx`
- **Messages Page Component**: `frontend/app/(app)/messages/components/StreamChatWindow.tsx`

---

## 🆘 Need Help?

If you encounter any issues:
1. Check browser console for errors
2. Check backend terminal for GetStream logs
3. Verify GetStream credentials in `.env`
4. Ensure both users exist (run user seeder if needed)
5. Restart frontend dev server (`npm run dev -p 3001`)
6. Clear browser cache and reload

**Remember**: The password for all test accounts is `123123` 🔑

---

Happy testing! 🚀
