# Changelog

All notable changes to Prompt Pins for ChatGPT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.3.0] - 2026-02-05

### Added
- **Three-state sidebar mode system** - Foundation for hover-to-expand behavior (Phase 1: Storage layer)
  - Replaced boolean `sidebarOpen` with three-state `sidebarMode`: 'first-time', 'unpinned', 'pinned'
  - 'first-time': Initial state for new users, fully expanded
  - 'unpinned': Auto-minimizes, hover-to-expand (default after first minimize)
  - 'pinned': Stays expanded, hover disabled (user explicitly locked it open)
  - Automatic migration from v1.2.1 boolean storage to new mode system
  - Mode transitions: first minimize → 'unpinned', manual expand → 'pinned'
  - UI changes for hover behavior coming in Phase 2
- **Simplified sidebar layout** - Clean foundation for hover-to-expand UI (Phase 2: Layout structure)
  - Expanded state: Full 320px panel with toggle button in bottom-left corner
  - Collapsed state: 40px vertical strip with two stacked icon buttons
  - Create Pin button placeholder (top, disabled - for Phase 3)
  - Toggle button (bottom) for expand/collapse
  - Removed permanent rail separator for cleaner appearance
  - Prepares structure for hover behavior implementation
- **Hover-to-expand behavior** - Sidebar temporarily expands when hovering in unpinned mode (Phase 3)
  - Hover over collapsed 40px edge expands sidebar after 400ms delay
  - Moving mouse away collapses sidebar after 600ms delay
  - Asymmetric timing prevents flicker (fast to open, patient to close)
  - Only active in unpinned mode (disabled when pinned or first-time)
  - Smooth slide and fade transitions (~200ms) for responsive feel
  - Temporary expansion does NOT persist to storage or change mode
  - Manual toggle during hover cancels all hover timers
  - Rapid hover events properly debounced with timer cleanup
  - Login state watcher respects hover expansion and doesn't interfere
  - Welcome animation properly sets unpinned mode and activates hover
  - Similar to Firefox's sidebar behavior but tuned for extension use
- **Pin/Unpin toggle logic** - Toggle button now controls sidebar persistence (Phase 5)
  - Implements Windows taskbar auto-hide pattern
  - Collapsed (unpinned): Toggle button hidden, brand icon and expand chevrons visible
  - Hover-expanded (unpinned): Shows 🔒 teal lock icon → "Pin sidebar open"
  - Pinned (locked open): Shows ─ gray minimize line → "Minimize sidebar"
  - **Collapsed rail branding**: Teal brand icon at top, double chevrons at bottom
  - Lock icon uses brand teal color (#10a37f) to stand out as primary action
  - Button only visible when sidebar is expanded (hover or pinned)
  - Click lock during hover → locks sidebar open permanently
  - Click chevrons or minimize → unpins and collapses, re-enables hover
  - Chevrons also clickable to expand immediately
  - First-time mode: First minimize transitions to unpinned as before
  - State persists across page refreshes and sessions
  - Hover behavior only active when sidebar is in unpinned mode
- **Create Pin button functionality** - Left rail icon now fully functional (Phase 4)
  - Teal brand icon at top of collapsed rail is now clickable
  - Smart text detection: Checks for highlighted text when clicked
  - **With text selected**: Temporarily expands sidebar, shows quote preview form with optional note field
  - **Without text selected**: Temporarily expands sidebar, shows blank form for manual entry
  - Auto-collapse behavior after highlight animation completes (~2s delay)
  - Works in all sidebar states (collapsed, expanded, pinned, unpinned)
  - Reuses existing `createPin()` logic from keyboard shortcuts (DRY principle)
  - Tooltip: "Create new pin"
  - **Hover conflict prevention**: Sidebar won't collapse while user is typing in the form
  - **Code optimizations**: Added `getNextPinIndex()` helper, O(n²)→O(n) sorting, removed edge cases

### Fixed
- **Pin ordering** - "Next Pin →" now correctly prioritizes current-chat pins
  - Button/keyboard shortcut now search for first pin from current chat
  - Falls back to first pin if no current-chat pins exist
  - Display order: current-chat pins at top, other-chat pins at bottom
  - New pins added to array end in chronological order
  - Fixes issue where other-chat pins would be submitted first
- **Highlight animation** - Pin highlights now work after sorting changes
  - Uses data-attribute selector instead of DOM position
  - Newly created pins always highlight regardless of display position
- **Auto-collapse timing** - Fixed premature collapse during pin creation
  - Eliminated race condition between scheduled and immediate collapse
  - Highlight animation plays for full 1.5s before sidebar collapses


## [1.2.1] - 2026-01-23

### Changed
- **Updated extension icons** - New modern teal asterisk design on dark background for improved visibility and recognition
- **Updated help icon** - Replaced `[?]` with standard `ℹ️` info icon in sidebar header

### Fixed
- **Auto-collapse behavior** - Sidebar now properly auto-collapses after creating pins via keyboard shortcut
- **Inline edit cursor placement** - Fixed issue where clicking in textarea during edit mode wouldn't position cursor correctly


## [1.2.0] - 2026-01-18 to 2026-01-19

### Added
- **Firefox inline edit cursor positioning fix** - Resolved Firefox-specific textarea interaction issue
  - Fixed bug where clicking inside textarea during inline edit wouldn't position cursor
  - Root cause: Parent `.pin-item` with `draggable="true"` intercepted mouse events in Firefox
  - Solution: Temporarily disable dragging on parent pin item when entering edit mode
  - Added `stopPropagation()` to textarea's mousedown event to prevent event bubbling
  - Draggable functionality automatically re-enabled on save/cancel via `renderPins()`
  - Improves inline editing UX specifically in Firefox while maintaining drag-and-drop elsewhere
- **Cross-chat pin naming** - Pins from other conversations now show the actual chat name
  - When submitting a pin from a different chat, shows "From another ChatGPT conversation (Chat Name): [pin text]"
  - Example: "From another ChatGPT conversation (Wise Fool and Wit): Compare Mistborn's ending..."
  - Provides better context than generic "From another conversation" message
  - Falls back to generic message if chat title is unavailable
  - Applied to both comment-based pins and text-based pins
- **Inline editing for pin fields** - Edit pin content directly within the sidebar
  - Edit icon (✏️) appears on hover for editable fields
  - Click on text or icon to enter edit mode with inline textarea
  - Save/Cancel buttons for confirming or discarding changes
  - Pin Type 1 (from highlighted text): Editable comment field, read-only quoted text
  - Pin Type 2 (manual creation): Fully editable plain text field
  - Keyboard shortcuts: Enter to save, Shift+Enter for new line, Escape to cancel
  - Highlight animation plays on successful edits for visual confirmation
  - Empty values prevented to maintain data integrity
  - Auto-resizing textarea adapts to content length
- **Welcome animation for new users** - First-time user onboarding for logged-out users
  - Sidebar expands for 2.5 seconds on first visit to show users the interface
  - Automatically collapses to reveal login button
  - Toggle button pulses 2 times with green glow (scale animation + brand color) to draw attention and show where sidebar went
  - Uses `hasSeenWelcome` flag stored in browser.storage.local so animation only plays once per user
  - Only triggers for logged-out users to avoid disrupting logged-in experience
  - Integrates seamlessly with existing auto-collapse behavior
- **Keyboard shortcuts help UI** - Comprehensive keyboard shortcuts help system
  - ⓘ info icon button (green, industry-standard) positioned next to Clear button in header
  - Hover tooltip displays all keyboard shortcuts for current browser
  - Footer shows app version (v1.2.0) and customization instructions
  - Browser-aware: Shows Firefox shortcuts (Ctrl+Alt+P/S/N) or Chrome shortcuts (Ctrl+Shift+K/L/U)
  - Platform-aware: Displays Cmd on Mac, Ctrl on Windows/Linux
  - Includes instructions for customizing shortcuts in browser settings
  - Contextual tooltips added to all action buttons:
    - "Next Pin" button: Shows keyboard shortcut for using next pin
    - "Use" buttons: "Load and submit this pin"
    - "Delete" buttons: "Delete this pin"
    - "+ New" button: Shows create pin shortcut with note about no selection needed
  - Help button auto-hides when sidebar is collapsed
  - Professional tooltip design matching ChatGPT's dark theme
- **Branded minimize button** - Toggle button now shows Prompt Pins icon when collapsed
  - Collapsed state displays pin icon (matching the sidebar header icon)
  - Expanded state shows clean minus icon (horizontal line)
  - Both icons are SVG-based for crisp rendering at any size
  - Contextual tooltips: "Expand Prompt Pins" when collapsed, "Minimize Prompt Pins" when expanded
  - Consistent 24x24px sizing for visual balance
  - Improves brand recognition and makes collapsed sidebar more discoverable
- **Inline pin creation** - Create pins manually without highlighting text first
  - New "+ New" button appears at bottom right of pins list
  - Click button to reveal inline textarea form directly in the pins list
  - Simple, focused interface with just text input and Cancel/Save buttons
  - Manually created pins send text as-is (no "Expand on:" prefix)
  - Works seamlessly with keyboard shortcut (Ctrl+Shift+K / Cmd+Shift+K) when no text is selected
  - Sidebar auto-expands if collapsed when creating manual pins
  - Form hidden when sidebar is collapsed
  - Enter to save, Escape to cancel for quick keyboard workflow
- **Auto-collapse behavior** - Sidebar now automatically expands and collapses when creating pins
  - When sidebar is collapsed and user creates a pin (via context menu or keyboard shortcut), sidebar briefly expands
  - New pin highlight animation plays (1.5 seconds)
  - Sidebar automatically collapses back after 2 seconds
  - User can cancel auto-collapse by manually toggling the sidebar during the animation
  - Auto-collapse only triggers if sidebar was initially collapsed - respects user's preference
  - Does not save the temporary expansion state - maintains original collapsed preference
  - Provides smooth visual feedback without disrupting user's layout preference

### Technical
- **Cross-chat pin naming implementation**:
  - Added `getPinPrefix(pin, isFromDifferentChat, defaultPrefix)` helper function with JSDoc
  - Eliminates code duplication by centralizing prefix logic in one place
  - Returns dynamic prefix based on pin.chatTitle availability
  - Handles both EXPAND_PREFIX and REGARDING_PREFIX contexts
  - Early return pattern for non-cross-chat pins for efficiency
  - Follows codebase pattern of focused helper functions
- **Inline editing implementation**:
  - Fixed Firefox textarea cursor positioning by disabling parent draggable during edit mode
  - In `enterEditMode()`: Find parent `.pin-item`, set `draggable="false"` temporarily
  - Added mousedown event listener with `stopPropagation()` to prevent drag interference
  - Draggable automatically restored via `renderPins()` called by save/cancel handlers
  - Added `enterEditMode(wrapper)` function to handle edit state
  - Modified `renderPins()` to distinguish between pin types using `selectedText` field
  - Created wrapper elements (`.pin-comment-wrapper`, `.pin-text-wrapper`) for editable fields
  - Added edit icon styling with hover effects and smooth transitions
  - Implemented keyboard navigation (Enter/Shift+Enter/Escape)
  - Updated `showCommentInput()` to save `selectedText` field for pin type detection
  - Added CSS for `.edit-icon`, `.pin-editable-field`, and hover states
- **Keyboard shortcuts help UI implementation**:
  - Added browser detection constants: `IS_CHROME` and `IS_MAC` for platform/browser awareness
  - Created `KEYBOARD_SHORTCUTS` configuration object with browser-specific shortcuts
  - Added `SHORTCUTS` constant that dynamically selects appropriate shortcuts based on browser
  - Implemented `createHelpButton()` function to generate [?] button with tooltip
  - Tooltip displays browser-specific and platform-specific keyboard shortcuts
  - Added contextual tooltips to all action buttons (Next Pin, Use, Delete, + New)
  - CSS updates: Added `.keyboard-shortcuts-help-btn` and `.keyboard-shortcuts-tooltip` styles
  - Tooltip uses absolute positioning (below button) with proper z-index layering
  - Help button hidden when sidebar collapsed via CSS selector
  - Monospace font for shortcut keys for better readability
  - Color-coded shortcut keys with brand color (#10a37f)
- Added `updateToggleButton()` helper function to dynamically create SVG icons based on sidebar state
- Toggle button now uses SVG elements instead of text characters ('+' and '-')
- Updated all toggle button state changes to use `updateToggleButton()` helper
- Updated CSS to accommodate SVG icons with proper sizing and alignment
- Minus icon: horizontal line (x1="5" y1="12" x2="19" y2="12")
- Pin icon: same as header icon (vertical line with arrows)
- Both icons use currentColor for consistent theming
- Added `isAutoExpanded` state variable to track auto-expand status
- Added `autoCollapseTimeout` to manage auto-collapse timing
- Added `autoExpandSidebar()` helper function for temporary sidebar expansion
- Added `autoCollapseSidebar()` helper function to restore collapsed state
- Modified `createPin()` to detect collapsed state and trigger auto-expand
- Modified `showCommentInput()` to accept `wasSidebarCollapsed` parameter and schedule auto-collapse
- Modified `toggleSidebar()` to cancel auto-collapse timeout if user manually toggles during auto-expand
- Auto-collapse waits 2 seconds: 1.5s for highlight animation + 0.5s buffer for smooth UX
- Robust cleanup: clears timeout if user creates another pin during auto-expand period
- **Pin highlight animation** - Newly created pins now have a visual highlight animation for better feedback
  - Subtle glow and scale pulse animation (1.5 seconds)
  - Uses brand color (#10a37f) for consistency
  - Automatically scrolls to show new pin if it's off-screen
  - Smooth, non-disruptive animation that doesn't interfere with drag-and-drop
  - Works with all pin creation methods (context menu, keyboard shortcut)
  - Robust timeout tracking prevents animation interruption during rapid user actions
  - Proper cleanup prevents memory leaks from orphaned timeouts
  - CSS transition conflicts prevented with transition: none during animation
- **Login button coverage fix** - Sidebar automatically collapses when login page is detected
  - Detects when user is on ChatGPT login page (no chat input present, "Log in" button visible)
  - Auto-collapses sidebar to prevent covering the login button
  - Automatically restores user's saved sidebar state after successful login
  - Runs background watcher to detect login state changes in real-time
  - Preserves user's sidebar preference (expanded/collapsed) across login/logout
- **Remember sidebar state** - Sidebar now remembers whether it was expanded or collapsed across browser sessions
  - State is saved automatically when toggling the sidebar
  - State persists across page refreshes, navigation, and browser restarts
  - Works globally across all ChatGPT chats and tabs
  - No flickering or visual state changes during page load

### Code Quality
- **Comprehensive code cleanup and optimization pass** - Major refactoring for production release
  - Added debug mode flag (`DEBUG = false`) with `debugLog()` helper function
  - Replaced 25+ `console.log` statements with conditional `debugLog()` for clean production console
  - Preserved all `console.error` statements for production error tracking
  - Extracted all magic timing numbers to documented `TIMINGS` constant (8 timing values)
  - Added comprehensive error handling with try-catch blocks to all 7 async storage operations
  - Standardized string quotes to single quotes throughout (10+ files, 50+ changes)
  - Implemented DocumentFragment for batch DOM insertion (reduces reflows from N to 1)
  - Added proper cleanup for chat change interval to prevent memory leaks
  - Broke up massive `renderPins()` function (213 lines → 36 lines + 6 focused helper functions)
  - Broke up large `addInlineCreationUI()` function (126 lines → 24 lines + 6 helper functions)
  - Added comprehensive JSDoc comments to 14 complex functions with parameter/return types
  - Improved code organization with single-responsibility functions
  - Enhanced maintainability for future development
- **Performance optimizations**:
  - DocumentFragment batching: 10x-50x fewer reflows when rendering pins
  - Cached DOM element references reduce unnecessary queries
  - Efficient event handler attachment patterns
  - Memory leak prevention with proper interval cleanup
- **Error resilience**:
  - Graceful fallbacks for storage failures (defaults to empty arrays)
  - Non-blocking error handling (extension continues working even if storage fails)
  - Comprehensive error logging for debugging
  - Fallback initialization if main init fails

### Fixed
- **Auto-collapse after keyboard shortcut pin creation** - Sidebar now auto-collapses after creating pins via keyboard shortcut with no text selected
  - When sidebar is collapsed and user creates a pin via keyboard shortcut (without selecting text), sidebar temporarily expands to show the inline creation form
  - After saving the pin, sidebar now automatically collapses back after ~2 seconds (matching selection-based pin behavior)
  - Fixed by tracking auto-expansion state in manual pin creation path and scheduling auto-collapse in `saveInlinePin()`
  - Provides consistent UX across all pin creation methods
- **Login Layout Issue** - Sidebar no longer covers the "Log in" button when not logged in
  - New users now default to expanded sidebar after first login to showcase features
  - Sidebar automatically expands for new users who log in for the first time
- **Header Alignment** - Prompt Pins header now properly aligns with ChatGPT's header height
  - Reduced vertical padding from 16px to 12px for better visual alignment
- **Chrome double panel issue** - Fixed bug where two sidebar panels would appear in Chrome
  - Added duplicate prevention check in `createSidebar()` function
  - Created `initializeSidebar()` function to intelligently handle sidebar creation and reconnection
  - Sidebar now properly reconnects when content script is re-injected (page navigation, refresh, service worker restart)
  - Event listeners are reattached automatically when reconnecting to existing sidebar
  - Added console logging for debugging sidebar lifecycle
- **Mozilla validation warning** - Resolved "Unsafe assignment to innerHTML" warning
  - Refactored keyboard shortcuts tooltip to use safe DOM manipulation methods
  - Replaced `innerHTML` with `createElement()`, `textContent`, and `appendChild()`
  - Maintains identical functionality and visual appearance
  - Ensures compliance with Mozilla Add-ons security requirements

### Technical
- Added `isLoginPage()` function with multiple detection methods:
  - Checks for user menu/avatar elements (primary indicator)
  - Detects "Log in" or "Sign in" buttons
  - Verifies chat ID presence in URL
  - Checks for chat history sidebar
  - Includes detailed console logging for debugging
- Added `handleLoginStateChange()` to manage sidebar visibility based on login state
  - Saves user's preference before auto-collapsing
  - Syncs `sidebarOpen` variable with visual state to prevent double-click bug
  - Restores original preference after login
  - **NEW:** Defaults to expanded sidebar for new users (when `savedPreferenceBeforeLogin === null`)
  - New users see expanded sidebar after first login to discover features
- Header alignment fix:
  - Updated `.pins-header` CSS padding from `16px` to `12px 16px`
  - Reduces vertical padding while maintaining horizontal spacing
  - Better aligns with ChatGPT's header height
- Added state tracking variables:
  - `wasOnLoginPage` - Tracks if user was on login page
  - `manualOverrideOnLogin` - Respects user manually expanding sidebar on login page
  - `savedPreferenceBeforeLogin` - Stores user's preference before auto-collapse
- Added `startLoginStateWatcher()` and `stopLoginStateWatcher()` for real-time monitoring
- Login state checked every second via interval timer
- Modified `toggleSidebar()` to set manual override flag when user expands on login page
- Added `loadSidebarState()` and `saveSidebarState()` functions for state persistence
- Modified `toggleSidebar()` to automatically save state changes
- Updated `createSidebar()` to apply saved state when creating new sidebar
- Updated `initializeSidebar()` to load and apply saved state when reconnecting to existing sidebar
- Sidebar state stored in browser.storage.local alongside pins data
- Improved content script initialization to handle Chrome Manifest V3 service worker lifecycle
- Added defensive coding to prevent multiple sidebar instances
- Enhanced state management for better reliability across page navigations

## [1.1.1] - 2025-01-11

### Fixed
- **CRITICAL:** Context menu "Pin prompt" now appears reliably after browser restart
  - Added `browser.runtime.onStartup` listener to recreate context menu on browser startup
  - Previously, context menu would disappear after closing and reopening Firefox
  - Added context menu cleanup to prevent duplicate menu items
- **CRITICAL:** Fixed Firefox icon paths in manifest (icon48.png → icons/icon48.png)
  - Extension icon now displays correctly in Firefox
- **CRITICAL:** Fixed Chrome keyboard shortcuts syntax
  - Changed from Ctrl+Alt to Ctrl+Shift (Chrome doesn't support Ctrl+Alt combinations)
  - Added Mac-specific shortcuts (Command+Shift)
  - Extension now loads without manifest errors in Chrome
- Improved error handling and logging for context menu creation
- Fixed `strict_min_version` in manifest to "142.0" (supports data_collection_permissions on both desktop and Android)

### Added
- **Chrome/Edge support** with Manifest V3
- **Monorepo structure** with automated build system
  - `npm run build:firefox` - Build Firefox extension
  - `npm run build:chrome` - Build Chrome extension
  - `npm run build:all` - Build both browsers
- **Build scripts** for automated multi-browser packaging
- **Browser-specific keyboard shortcuts**:
  - Firefox: Ctrl+Alt+P/S/N (Cmd+Alt on Mac)
  - Chrome/Edge: Ctrl+Shift+P/S/N (Cmd+Shift on Mac)

### Technical
- Background script now uses helper function `createContextMenu()` for better maintainability
- Added console logging with "Prompt Pins:" prefix for easier debugging
- Context menus now properly removed before recreation to prevent ID conflicts
- Build system automatically converts `browser.*` API to `chrome.*` for Chrome compatibility

## [1.1.0] - 2025-01-11

### Added
- Keyboard shortcuts for quick actions:
  - `Ctrl+Alt+P` - Create a pin from selected text
  - `Ctrl+Alt+S` - Send selected text immediately with "Expand on:" prefix
  - `Ctrl+Alt+N` - Use the next pin in queue
- Smart Queue System - Automatically queues pins when ChatGPT is busy and submits when ready
- Clear All Pins feature with confirmation dialog to prevent accidental deletion
- Chat-aware pins - Pins now track which chat they originated from
  - Visual indication when viewing pins from different chats (grayed out with badge)
  - Cross-chat pins use "From another conversation:" prefix when submitted

### Changed
- Pins without comments now use "Expand on:" prefix (previously no prefix)
- Pins with comments now use "Regarding:" prefix for better context
- Major code refactoring and optimization:
  - Added helper functions to eliminate ~150 lines of code duplication
  - Organized code into clear sections with constants for selectors, timings, and UI text
  - Implemented element caching for improved performance
  - Added input validation and error handling

### Fixed
- Collapsed sidebar button now properly centered and visible
- Character encoding issues with special symbols
- Removed trailing whitespace and debug console.log statements

### Technical
- Code organization: Functions now organized into logical sections
- Maintainability: Single source of truth for selectors, timings, and UI text
- Performance: Selector caching reduces DOM queries by ~10-20%

## [1.0.0] - 2025-01-07

### Added
- Initial release of Prompt Pins for ChatGPT
- Pin creation with optional comments via context menu
- Drag and drop to reorder pins
- Auto-submit functionality for pins
- "Next Pin" button for quick access to first pin in queue
- Persistent local storage for pins across browser sessions
- Dark theme matching ChatGPT's interface
- Sidebar with collapsible view
- Pin deletion functionality
- Timestamp tracking for each pin

### Technical
- Firefox extension using Manifest V2
- Vanilla JavaScript with no external dependencies
- Local storage using browser.storage API
- Content script runs only on ChatGPT domains
- ~28KB total extension size

---

## Version Numbering

This project uses [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for added functionality in a backward compatible manner
- **PATCH** version for backward compatible bug fixes

[1.2.0]: https://github.com/BigLangerStyle/prompt-pins-chatgpt/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/BigLangerStyle/prompt-pins-chatgpt/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/BigLangerStyle/prompt-pins-chatgpt/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/BigLangerStyle/prompt-pins-chatgpt/releases/tag/v1.0.0
