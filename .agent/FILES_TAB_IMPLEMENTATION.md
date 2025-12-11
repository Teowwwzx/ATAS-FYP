# Files Tab with Checklist Linking - Implementation Plan

## Overview
Transform "Proposals" tab into "Files" tab with checklist integration.

## Changes Made Today

### 1. Tab Renaming
- **Before**: "Proposals" 
- **After**: "Files & Documents"
- Update tab label in `DashboardTabs.tsx`

### 2. File Categories
Use existing proposal system but enhance UI with categories:
- 📄 **Proposals** (Speaker materials, sponsor decks)
- ✉️ **Email Templates** (Confirmation, appreciation)
- 🏆 **Certificates** (Participation certificates)
- 📎 **Other Documents**

Categories stored in proposal `description` field as prefix: `[category] actual description`

### 3. Checklist Integration

#### Frontend Linking (No Backend Changes)
- Add `linked_checklist_items` display in Files tab
- Add `linked_files` display in Checklist tab
- Link via matching title keywords OR manual selection

#### Linking Logic
```typescript
// Auto-link by keyword matching
if (checklist.title.includes('confirmation email') && 
    file.title.includes('confirmation')) {
    // Show link
}

// Manual link stored in localStorage temporarily
{
    fileId: '123',
    checklistIds: ['item-1', 'item-2']
}
```

### 4. UI Enhancements

#### Files Tab
- Show category icons and badges
- Display "Linked to Checklist: [item title]"
- Click to jump to checklist item

#### Checklist Tab  
- Show linked files next to task
- "📎 Has linked file" indicator
- Click to view file

## File Structure

```
Files Tab (renamed from Proposals)
├── All Files (default view)
├── Speaker Template
└── Sponsor Template

Checklist Tab
├── Tasks with file links shown
└── Quick access to linked files
```

## Technical Implementation

### Step 1: Rename Tab
File: `DashboardTabs.tsx`
- Change "Proposals" → "Files"

### Step 2: Add Category System
File: `DashboardTabProposals.tsx` (will rename to `DashboardTabFiles.tsx`)
- Add category filter buttons
- Add category icons to file cards
- Store category in description as `[CATEGORY] description`

### Step 3: Add Simple Linking
- Add link button to each file
- Modal to select checklist items
- Display linked items

### Step 4: Update Checklist Display
File: `DashboardTabChecklist.tsx`
- Show linked files indicator
- Click to view file

## Benefits
- ✅ No backend changes needed
- ✅ Fast implementation
- ✅ Clear organization
- ✅ Better UX for committee

## Future Enhancements (Later)
- Backend `category` field
- Backend `linked_checklist_item_id` field
- Automatic suggestions based on phase
- Template library
