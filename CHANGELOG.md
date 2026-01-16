# Changelog

All notable changes to Prompt Pins for ChatGPT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-16

### Fixed
- **Chrome double panel issue** - Fixed bug where two sidebar panels would appear in Chrome
  - Added duplicate prevention check in `createSidebar()` function
  - Created `initializeSidebar()` function to intelligently handle sidebar creation and reconnection
  - Sidebar now properly reconnects when content script is re-injected (page navigation, refresh, service worker restart)
  - Event listeners are reattached automatically when reconnecting to existing sidebar
  - Added console logging for debugging sidebar lifecycle

### Technical
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
