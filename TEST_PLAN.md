# Chat-Aware Pins - Test Plan

## Test Environment Setup
- Firefox with Prompt Pins extension loaded
- Multiple ChatGPT conversations open in different projects
- Browser console open (F12) to check for errors

---

## 1. Basic Pin Creation & Chat Title Capture

### Test 1.1: Create pin in named chat
**Steps:**
1. Navigate to a chat with a name (e.g., "Plan My Day")
2. Highlight some text
3. Right-click → "Pin prompt" OR press Ctrl+Alt+P
4. Add optional comment
5. Click "Save Pin"

**Expected Result:**
- Pin appears in sidebar
- No error in console
- Pin is NOT grayed out (same chat)
- No "From: ..." badge visible

**Debug Check (Console):**
- `[Prompt Pins] Chat Title:` should show the actual chat name

### Test 1.2: Create pin in unnamed/new chat
**Steps:**
1. Click "New chat"
2. Send a message to start the conversation
3. Create a pin from the response

**Expected Result:**
- Pin saves successfully
- May not have a chat title yet (that's OK)
- Should fallback gracefully

---

## 2. Cross-Chat Display & Styling

### Test 2.1: View pins from different chat
**Steps:**
1. Create pin in Chat A ("Plan My Day")
2. Navigate to Chat B ("Today's top news")
3. Observe the sidebar

**Expected Result:**
- Pin from Chat A is grayed out (60% opacity)
- Shows badge: "From: Plan My Day"
- Pin is still draggable

### Test 2.2: Multiple cross-chat pins
**Steps:**
1. Create pin in Chat A
2. Create pin in Chat B
3. Create pin in Chat C
4. Navigate to Chat D (or new chat)

**Expected Result:**
- All three pins are grayed out
- Each shows its source chat name
- Visual distinction is clear

### Test 2.3: Mix of same-chat and cross-chat pins
**Steps:**
1. In Chat A, create Pin 1
2. Navigate to Chat B, create Pin 2
3. Navigate back to Chat A, create Pin 3

**Expected Result:**
- In Chat A: Pin 1 and Pin 3 are normal, Pin 2 is grayed with "From: Chat B"
- In Chat B: Pin 2 is normal, Pin 1 and Pin 3 are grayed with "From: Chat A"

---

## 3. Automatic UI Updates (URL Change Detection)

### Test 3.1: Switching between chats updates styling
**Steps:**
1. Create pins in Chat A and Chat B
2. While in Chat A, observe pins
3. Click Chat B in sidebar
4. Wait 1 second (for polling to detect change)

**Expected Result:**
- Pins re-render automatically
- Styling updates without any manual action
- No need to create/delete a pin to trigger refresh

### Test 3.2: Rapid chat switching
**Steps:**
1. Create pins in Chats A, B, and C
2. Rapidly click between all three chats

**Expected Result:**
- Pins update styling smoothly
- No lag or flashing
- No console errors

---

## 4. Using Cross-Chat Pins

### Test 4.1: Use cross-chat pin with comment
**Steps:**
1. Create pin in Chat A with comment "Test comment"
2. Navigate to Chat B
3. Click "Use" on the cross-chat pin

**Expected Result:**
- Input fills with:
  ```
  From another conversation: "original text"
  
  Test comment
  ```
- Pin submits automatically
- Pin is deleted after submission

### Test 4.2: Use cross-chat pin without comment
**Steps:**
1. Create pin in Chat A WITHOUT comment
2. Navigate to Chat B
3. Click "Use" on the cross-chat pin

**Expected Result:**
- Input fills with: `From another conversation: "original text"`
- Uses "From another conversation:" NOT "Expand on:"
- Pin submits and deletes

### Test 4.3: Use same-chat pin (verify no regression)
**Steps:**
1. Create pin in Chat A
2. Stay in Chat A
3. Click "Use"

**Expected Result:**
- Still uses "Regarding:" (with comment) or "Expand on:" (without)
- Does NOT say "From another conversation"
- Works exactly like v1.1.0

---

## 5. Queue System with Cross-Chat Pins

### Test 5.1: Queue a cross-chat pin
**Steps:**
1. Create pin in Chat A
2. Navigate to Chat B
3. Ask ChatGPT a question (wait for response to start generating)
4. While generating, click "Use" on cross-chat pin

**Expected Result:**
- Pin enters queued state
- Shows "⏳ Queued - waiting..." badge
- Uses "From another conversation:" prefix when it fills input
- Auto-submits when ChatGPT finishes
- Pin is deleted after submission

### Test 5.2: Cancel queued cross-chat pin
**Steps:**
1. Queue a cross-chat pin (as above)
2. Click "Cancel" button

**Expected Result:**
- Queue clears
- Input box empties
- Pin remains in sidebar (not deleted)
- Pin returns to normal grayed-out state

---

## 6. Keyboard Shortcuts with Cross-Chat

### Test 6.1: Ctrl+Alt+N with cross-chat pin
**Steps:**
1. Create pin in Chat A
2. Navigate to Chat B
3. Press Ctrl+Alt+N

**Expected Result:**
- First pin (from Chat A) is used
- Uses "From another conversation:" prefix
- Auto-submits and deletes

### Test 6.2: Ctrl+Alt+P in different chats
**Steps:**
1. In Chat A, select text and press Ctrl+Alt+P
2. Save pin
3. Navigate to Chat B, select text and press Ctrl+Alt+P
4. Save pin

**Expected Result:**
- Both pins save with their respective chat IDs and titles
- Each shows as cross-chat when viewed from the other chat

---

## 7. Drag & Drop with Cross-Chat Pins

### Test 7.1: Reorder mix of same-chat and cross-chat pins
**Steps:**
1. Create pins in multiple chats
2. View from one chat (some grayed, some normal)
3. Drag a cross-chat pin above a same-chat pin

**Expected Result:**
- Drag works normally
- Visual styling (grayed/normal) persists after reorder
- Order is saved

### Test 7.2: Drag while hovering over cross-chat pin
**Steps:**
1. Drag a pin over a grayed-out cross-chat pin

**Expected Result:**
- Hover effects still work
- Drop target indicator shows
- No visual glitches

---

## 8. Backward Compatibility

### Test 8.1: Old pins without chatId
**Steps:**
1. If you have pins from v1.0.0 or v1.1.0 (before chat-aware):
   - View them in the sidebar
   - Try using them
2. OR manually edit storage to remove chatId:
   - Open browser console
   - Run: `browser.storage.local.get('pins').then(r => console.log(r))`
   - Manually remove chatId from a pin
   - Reload extension

**Expected Result:**
- Old pins appear normal (not grayed)
- No "From: ..." badge
- Using them works with normal "Regarding:"/"Expand on:" prefix
- No console errors

---

## 9. Edge Cases & Error Handling

### Test 9.1: Pin created on homepage (no chat ID)
**Steps:**
1. Navigate to chatgpt.com (not in a specific chat)
2. Try to create a pin (if possible)

**Expected Result:**
- Pin saves with chatId: null
- No console errors
- Pin behaves normally

### Test 9.2: Chat ID changes (unlikely but possible)
**Steps:**
1. Create pin in Chat A
2. Manually modify URL to different chat ID
3. Observe pin

**Expected Result:**
- Pin shows as cross-chat (grayed)
- Handles gracefully

### Test 9.3: Very long chat titles
**Steps:**
1. Rename a chat to something very long (50+ characters)
2. Create pin in that chat
3. View from another chat

**Expected Result:**
- Badge text might truncate or wrap
- No layout breaking
- Still readable

### Test 9.4: Special characters in chat title
**Steps:**
1. Rename chat to include: `"quotes"`, `<html>`, `&ampersands;`
2. Create pin
3. View badge from another chat

**Expected Result:**
- Title displays correctly (no XSS, no broken HTML)
- Uses textContent (safe from injection)

---

## 10. Clear All with Cross-Chat Pins

### Test 10.1: Clear all pins from multiple chats
**Steps:**
1. Create pins in Chat A, B, and C
2. From any chat, click "Clear" button
3. Confirm deletion

**Expected Result:**
- All pins deleted regardless of source chat
- Confirmation dialog shows correct count
- Storage clears completely

---

## 11. Performance & Polling

### Test 11.1: Leave extension running for extended period
**Steps:**
1. Create pins in multiple chats
2. Leave ChatGPT open for 30+ minutes
3. Switch between chats occasionally

**Expected Result:**
- URL polling (500ms) doesn't cause performance issues
- Pins update correctly after long idle periods
- No memory leaks

### Test 11.2: Many pins (stress test)
**Steps:**
1. Create 20+ pins across different chats
2. Switch between chats

**Expected Result:**
- Rendering is still fast
- Styling updates quickly
- No noticeable lag

---

## 12. Console Error Checks

### Test 12.1: No JavaScript errors during normal use
**Steps:**
1. Perform all above tests
2. Monitor console throughout

**Expected Result:**
- No red error messages
- Only informational `[Prompt Pins]` logs (if debug enabled)
- No warnings about undefined chatId or chatTitle

---

## Test Results Template

```
Test ID: [e.g., 2.1]
Test Name: [e.g., View pins from different chat]
Date: 
Tester: 
Result: [ ] PASS  [ ] FAIL  [ ] SKIP
Notes: 

If FAIL, describe issue:


Console Errors (if any):

```

---

## Known Limitations (Not Bugs)

These are expected behaviors, not test failures:

1. **Chat title changes not reflected** - If you rename a chat after creating a pin, the pin still shows the old name. This is by design (chatTitle captured at pin creation time).

2. **Project names instead of chat names** - In some cases, especially if ChatGPT's DOM changes, we might capture the project name. This is acceptable fallback behavior.

3. **Null chat titles** - Pins created on homepage or before chat is named may have null chatTitle. They show "From another chat" badge. This is correct.

4. **500ms delay** - There's a brief delay (up to 500ms) when switching chats before pins update. This is the polling interval and is expected.

---

## Reporting Issues

If you find a bug:
1. Note the exact steps to reproduce
2. Copy any console errors
3. Note browser version and OS
4. Check if it happens in a fresh profile/private window
5. Report on GitHub issues

---

**Test Plan Version:** 1.0  
**Feature:** Chat-Aware Pins  
**Target Version:** 1.2.0  
**Last Updated:** January 10, 2026
