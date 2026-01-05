# Wireframe Mode for FYP Documentation

This guide explains how to use the Wireframe Mode to capture black & white wireframe screenshots of your application for your FYP report.

## Quick Start

### Method 1: Using the Toggle Component (Recommended)

1. **Add the WireframeToggle component to your layout**:

```tsx
// In frontend/app/layout.tsx or any page
import WireframeToggle from '@/components/WireframeToggle';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <WireframeToggle />
      </body>
    </html>
  );
}
```

2. **Run your app normally**:
```bash
npm run dev
```

3. **Click the "WIREFRAME MODE" button** in the bottom-right corner

4. **Take screenshots** of any page you want to document

5. **Click again** to exit wireframe mode

### Method 2: Manual CSS Import

If you want to enable wireframe mode globally without the toggle:

1. **Import the CSS in your global styles**:

```tsx
// In frontend/app/layout.tsx
import '@/styles/wireframe.css';

export default function Layout({ children }) {
  return (
    <html className="wireframe-mode">
      <body>{children}</body>
    </html>
  );
}
```

2. **Remove the class when you're done taking screenshots**

### Method 3: Browser DevTools (No Code Changes)

1. **Open your app** in the browser
2. **Press F12** to open DevTools
3. **Go to Elements tab**
4. **Right-click on `<html>` element**
5. **Select "Edit as HTML"**
6. **Add `class="wireframe-mode"` to the opening tag**
7. **Paste this in the Console**:

```javascript
// Add wireframe CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/styles/wireframe.css';
document.head.appendChild(link);

// Enable wireframe mode
document.documentElement.classList.add('wireframe-mode');
```

## What Wireframe Mode Does

✅ **Converts to Grayscale**: All colors become black, white, and gray  
✅ **Disables Animations**: Removes all CSS animations and transitions  
✅ **Removes Shadows**: Eliminates box-shadows and text-shadows  
✅ **Simplifies Images**: Makes images grayscale with reduced opacity  
✅ **Preserves Layout**: Keeps your actual application structure intact  

## Pages to Screenshot for FYP

Here are the key pages you should capture:

### 1. Public Pages
- [ ] Landing Page
- [ ] Event Discovery/Browse Events
- [ ] Event Detail Page
- [ ] Expert Profile Page
- [ ] Login/Registration Page

### 2. User Dashboard
- [ ] My Events Dashboard
- [ ] My Profile Page
- [ ] Event Registration Form
- [ ] QR Code Display (Participant)

### 3. Organizer Views
- [ ] Create Event Form
- [ ] Event Dashboard (Organizer)
- [ ] Participant Management
- [ ] QR Scanner Interface
- [ ] Review Submission Form

### 4. Admin Panel
- [ ] Admin Dashboard
- [ ] User Management
- [ ] Organization Verification
- [ ] Event Moderation
- [ ] Audit Logs

## Tips for Best Screenshots

### 1. **Use Full-Screen Mode**
- Press F11 in browser for clean screenshots
- Hide browser chrome (address bar, bookmarks)

### 2. **Standard Screen Size**
- Use 1920x1080 or 1440x900 for consistency
- All screenshots should be same size

### 3. **Crop Properly**
- Remove browser UI elements
- Focus on the application content
- Use Windows Snipping Tool or Snagit

### 4. **Add Annotations** (Optional)
- Use PowerPoint or draw.io to add labels
- Highlight important UI elements
- Add numbers/arrows to explain flow

### 5. **File Naming Convention**
```
wireframe_01_landing_page.png
wireframe_02_event_discovery.png
wireframe_03_event_detail.png
wireframe_04_create_event.png
... etc
```

## Keyboard Shortcuts for Screenshots

**Windows:**
- `Win + Shift + S` - Snipping Tool
- `Win + PrtSc` - Full screen capture
- `Alt + PrtSc` - Active window only

**Mac:**
- `Cmd + Shift + 4` - Selection tool
- `Cmd + Shift + 3` - Full screen

## Troubleshooting

### Wireframe mode not applying?
- Check if CSS file exists at `frontend/styles/wireframe.css`
- Make sure class is added to `<html>` element, not `<body>`
- Hard refresh browser (Ctrl+Shift+R)

### Some elements still have color?
- Check if elements have `!important` in inline styles
- May need to add specific CSS overrides

### Images disappeared?
The CSS makes images 70% transparent. If you want them fully visible:
```css
.wireframe-mode img {
  opacity: 1 !important;
}
```

## Removing Wireframe Mode

When you're done taking screenshots:

1. **Remove the import** from your layout
2. **Delete localStorage** value:
```javascript
localStorage.removeItem('wireframe-mode');
```
3. **Remove the class** from HTML element
4. **Comment out** the `<WireframeToggle />` component

## For Your FYP Report

In your report, you can write:

> "Figure X.X shows the wireframe design for [page name]. The layout demonstrates [key features]. This wireframe was generated from the actual implementation to ensure accuracy and consistency between design and development."

This approach shows:
- ✅ You have a working implementation
- ✅ Your wireframes are accurate (not just concepts)
- ✅ Professional documentation methodology
- ✅ Alignment between design and code

---

**Questions?** If wireframe mode causes any layout issues on specific pages, we can adjust the CSS to exclude those elements.
