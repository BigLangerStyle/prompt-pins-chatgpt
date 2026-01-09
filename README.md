# Prompt Pins for ChatGPT

A Firefox extension that lets you save questions and prompts for later use without breaking your conversational flow with ChatGPT.

## Features

- **Pin Any Text**: Highlight text in a ChatGPT conversation and right-click to pin it
- **Add Context**: Optionally add a note or comment to each pin
- **Quick Access**: Use the "Next Pin" button to automatically load and submit your next question
- **Drag to Reorder**: Organize your pins by dragging them into your preferred order
- **Persistent Storage**: Pins are saved locally and persist across browser sessions
- **Dark Theme**: Matches ChatGPT's interface with a clean, modern design
- **Auto-Submit**: Automatically submits prompts when you click "Use" or "Next Pin"

## Privacy

**No data collection. Period.**

All pins are stored locally in your browser using Firefox's storage API. Nothing is transmitted to external servers. No analytics, no tracking, no telemetry.

See [PRIVACY.md](PRIVACY.md) for full details.

## Installation

### From Firefox Add-ons

Visit the [Firefox Add-ons page](https://addons.mozilla.org) and search for "Prompt Pins for ChatGPT" to install with one click.

### From Source (for developers)

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension directory

## Usage

1. **Create a Pin**: 
   - Highlight any text in a ChatGPT conversation
   - Right-click and select "Pin prompt"
   - Optionally add a comment
   - Click "Save Pin"

2. **Use a Pin**:
   - Click "Next Pin" to use the first pin in your list
   - Or click "Use" on any specific pin
   - The prompt is automatically submitted to ChatGPT
   - The pin is removed after use

3. **Manage Pins**:
   - Drag pins to reorder them
   - Click the × button to delete a pin
   - Click the − button to collapse the sidebar

## Permissions Explained

- **storage**: Save your pins locally in the browser
- **contextMenus**: Add "Pin prompt" to the right-click menu
- **Access to chat.openai.com and chatgpt.com**: Required to interact with ChatGPT's interface

## Technical Details

- No external dependencies
- No remote code execution
- All code is static and included in the extension
- Uses browser's native APIs only
- Content script only runs on ChatGPT domains

## Screenshots

[Include 2-3 screenshots showing:]
1. Creating a pin with the comment dialog
2. The sidebar with multiple pins
3. The "Use" and "Next Pin" functionality

## Contributing

This is currently a personal project, but suggestions and bug reports are welcome! Contact via the Firefox Add-ons page.

## License

MIT License - see LICENSE file for details

Copyright (c) 2025 Prompt Pins Contributors

## Version History

### 1.0.0 (2025-01-07)
- Initial release
- Pin creation with optional comments
- Drag to reorder
- Auto-submit functionality
- Dark theme matching ChatGPT
