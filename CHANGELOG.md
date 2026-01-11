# Changelog

All notable changes to Prompt Pins for ChatGPT will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Collapsed sidebar toggle button now properly centered and visible
- Character encoding issues with special symbols (× and ⏳)
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

[1.1.0]: https://github.com/BigLangerStyle/prompt-pins-chatgpt/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/BigLangerStyle/prompt-pins-chatgpt/releases/tag/v1.0.0
