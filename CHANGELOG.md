# Changelog

All notable changes to Prompt Pins for ChatGPT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.2.0] - 2026-01-18

### Added
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

### Fixed
- **Login Layout Issue** - Sidebar no longer covers the "Log in" button when not logged in
- **Chrome double panel issue** - Fixed bug where two sidebar panels would appear in Chrome
  - Added duplicate prevention check in `createSidebar()` function
  - Created `initializeSidebar()` function to intelligently handle sidebar creation and reconnection
  - Sidebar now properly reconnects when content script is re-injected (page navigation, refresh, service worker restart)
  - Event listeners are reattached automatically when reconnecting to existing sidebar
  - Added console logging for debugging sidebar lifecycle

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
