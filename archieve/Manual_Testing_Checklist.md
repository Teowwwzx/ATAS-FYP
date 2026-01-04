# 🧪 Manual Testing Checklist - GetStream Chat Integration

## Test Performed: [Date]
**Tester**: _______________  
**Environment**: Development (localhost:3001)

---

## ✅ Test 1: Login as Expert1

### Steps:
1. Navigate to: `http://localhost:3001/login`
2. Enter credentials:
   - Email: `expert1@gmail.com`
   - Password: `123123`
3. Click **Login**

### Expected Result:
- ✅ Successfully logged in
- ✅ Redirected to dashboard

### Actual Result:
□ PASS  
□ FAIL - Error: _______________

---

## ✅ Test 2: View Invitation on Dashboard

### Steps:
1. On Dashboard, click **"Invitations"** tab in the sidebar
2. Locate event: **"Tech Innovation Summit - Chat Test Event"**

### Expected Result:
- ✅ Event card visible with:
  - Title: "Tech Innovation Summit - Chat Test Event"
  - Status badge: "PENDING"
  - Organizer: student1
  - Days remaining badge

### Screenshot Location:
Expected to see:
```
┌────────────────────────────────────────┐
│  📧  Invitations (1)                   │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐ │
│  │ Tech Innovation Summit...         │ │
│  │ ⏰ Pending                        │ │
│  │ 📅 In 7 days                      │ │
│  │ From: student1                    │ │
│  │                                    │ │
│  │ [Accept] [Decline]                │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Actual Result:
□ PASS  
□ FAIL - Issue: _______________

---

## ✅ Test 3: Open Request Detail Page

### Steps:
1. Click on the invitation card
2. View request detail page
3. Observe the **Communication Log** panel on the right side

### Expected Result:
- ✅ URL changes to: `/dashboard/requests/[invitation-id]`
- ✅ Left side shows event details
- ✅ Right side shows "Communication Log" panel
- ✅ Chat interface loads (may take 1-2 seconds)

### Expected Chat UI:
```
┌────────────────────────────────────┐
│ Communication Log        🔒 Private│
├────────────────────────────────────┤
│                                    │
│  [student1 avatar]                 │
│  student1                          │
│  Hi! Thank you for considering...  │
│                           7:48 PM  │
│                                    │
│         [expert1 avatar]           │
│                          expert1   │
│  Hello! Thank you for the invit... │
│  7:50 PM                           │
│                                    │
├────────────────────────────────────┤
│  [Type a message...       ] [Send] │
└────────────────────────────────────┘
```

### Actual Result:
Chat loads: □ YES  □ NO  
Existing messages visible: □ 2 messages  □ Other: ___  
Error messages: □ NONE  □ Error: _______________

---

## ✅ Test 4: Send Message from Request Detail

### Steps:
1. In the Communication Log, type: `"This is a test message from request page!"`
2. Click Send (or press Enter)

### Expected Result:
- ✅ Message appears **instantly** in chat
- ✅ Message bubble appears on right side (your message)
- ✅ Timestamp shows current time
- ✅ Input field clears
- ✅ No loading/error states

### Actual Result:
Message sent: □ PASS  □ FAIL  
Appears instantly: □ YES (< 1sec)  □ SLOW (> 2sec)  
Error: _______________

---

## ✅ Test 5: Navigate to Messages Page

### Steps:
1. Click on **"Messages"** in the top navigation bar
2. OR navigate to: `http://localhost:3001/messages`

### Expected Result:
- ✅ Messages page loads
- ✅ Conversation list on left shows "student1"
- ✅ Preview shows last message
- ✅ Conversation is automatically selected (on desktop)

### Expected UI:
```
┌──────────────┬───────────────────────────┐
│ Messages     │ Chat with student1        │
│              │ 🔒 Private                │
├──────────────┼───────────────────────────┤
│ 🔍 Search... │                           │
├──────────────┤ [student1 avatar]         │
│ ● student1   │ Hi! Thank you for...      │
│ "This is..." │                           │
│ Just now     │ [expert1 avatar]          │
│              │ Hello! Thank you...       │
│ ○ student2   │                           │
│ "See you!"   │ [expert1 avatar]          │
│ 1 day ago    │ This is a test message... │
│              │                           │
│              │ [Type a message...] [📤] │
└──────────────┴───────────────────────────┘
```

### Actual Result:
Page loads: □ PASS  □ FAIL  
Conversation visible: □ YES  □ NO  
Previous messages appear: □ ALL 3  □ Other: ___

---

## ✅ Test 6: Verify Same Conversation in Messages

### Steps:
1. In the Messages page, click on the conversation with "student1" (if not already selected)
2. **CRITICAL**: Look for your test message: "This is a test message from request page!"

### Expected Result:
- ✅ Chat shows **SAME 3 messages** as Request Detail page:
  1. student1: "Hi! Thank you for considering..."
  2. expert1: "Hello! Thank you for the invitation..."
  3. expert1: "This is a test message from request page!" ← **YOUR MESSAGE**

This proves both pages use the **SAME GetStream channel**!

### Actual Result:
Same messages: □ YES - UNIFIED ✅  □ NO - SEPARATE ❌  
Message count: ___ messages  
Test message visible: □ YES  □ NO

**Status**: □ UNIFIED CORRECTLY  □ NEEDS FIX

---

## ✅ Test 7: Send Message from Messages Page

### Steps:
1. In Messages page, type: `"Testing from Messages page!"`
2. Send the message

### Expected Result:
- ✅ Message appears instantly
- ✅ Conversation list updates (shows "Just now")

### Actual Result:
□ PASS  □ FAIL  
Speed: □ Instant (< 1sec)  □ Delayed

---

## ✅ Test 8: Real-Time Sync (CRITICAL TEST)

### Steps:
1. **Keep Messages page open** in current tab
2. **Open NEW tab**: Navigate to the request detail page again
   - URL: `http://localhost:3001/dashboard` → Invitations → Click event
3. **Position windows side-by-side**:
   - **Window A (Left)**: Messages page
   - **Window B (Right)**: Request Detail page

### Testing Sync:
**Test A → B:**
1. In Window A (Messages), send: "Message from A"
2. **Watch Window B** (Request Detail)

**Expected**: Message appears in Window B within 1 second ⚡

**Test B → A:**
1. In Window B (Request Detail), send: "Message from B"
2. **Watch Window A** (Messages)

**Expected**: Message appears in Window A within 1 second ⚡

### Actual Result:
A → B sync: □ INSTANT (< 1sec)  □ SLOW (> 2sec)  □ FAILED  
B → A sync: □ INSTANT (< 1sec)  □ SLOW (> 2sec)  □ FAILED

**Overall Sync Status**: □ WORKING ✅  □ BROKEN ❌

---

## ✅ Test 9: Browser Console Check

### Steps:
1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Look for GetStream logs

### Expected Logs (should see):
```
[StreamChat] User connected successfully: <user-id>
[StreamChat] Channel initialized: legacy_<conversation-id>
[StreamChatWindow] Channel ready: legacy_<conversation-id>
```

### Expected Network Requests:
```
✅ GET /api/v1/chat/stream/token → 200 OK
✅ GET /api/v1/users/me → 200 OK
```

### Errors to Check For:
- ❌ 422 Unprocessable Entity → Should NOT appear
- ❌ 403 Forbidden (on chat endpoints) → Should NOT appear
- ❌ "Chat Unavailable" message → Should NOT appear
- ❌ WebSocket connection failed → Should NOT appear

### Actual Result:
Console errors: □ NONE ✅  □ ERRORS (list below):  
_______________________________________________

Network status: □ ALL 200 OK ✅  □ ERRORS ❌

---

## 📊 Final Results Summary

### Core Functionality:
| Feature | Status | Notes |
|---------|--------|-------|
| Login as expert1 | □ PASS □ FAIL | |
| View invitation | □ PASS □ FAIL | |
| Chat loads on Request page | □ PASS □ FAIL | |
| Send message from Request page | □ PASS □ FAIL | |
| Chat loads on Messages page | □ PASS □ FAIL | |
| **Unified conversation** | □ PASS □ FAIL | ⭐ CRITICAL |
| Send message from Messages page | □ PASS □ FAIL | |
| **Real-time sync A→B** | □ PASS □ FAIL | ⭐ CRITICAL |
| **Real-time sync B→A** | □ PASS □ FAIL | ⭐ CRITICAL |
| No console errors | □ PASS □ FAIL | |

### Performance:
- Message delivery latency: ___ seconds
- Page load time: ___ seconds
- Chat initialization time: ___ seconds

### Overall Test Result:
□ **ALL TESTS PASSED** ✅ - GetStream integration working perfectly!  
□ **PARTIAL** - Some issues found (see notes)  
□ **FAILED** ❌ - Major issues (see notes)

---

## 🐛 Issues Found

| Issue # | Description | Severity | Screenshot/Logs |
|---------|-------------|----------|-----------------|
| 1. | | □ High □ Medium □ Low | |
| 2. | | □ High □ Medium □ Low | |
| 3. | | □ High □ Medium □ Low | |

---

## 📝 Notes

Additional observations:
_____________________________________________
_____________________________________________
_____________________________________________

---

## ✅ Sign-off

Tested by: _______________  
Date: _______________  
Time: _______________  

**Conclusion**:
_____________________________________________
_____________________________________________
