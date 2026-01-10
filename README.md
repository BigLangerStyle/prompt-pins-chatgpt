# Prompt Pins for ChatGPT

A Firefox extension that lets you save questions and prompts for later use without breaking your conversational flow with ChatGPT.

## Features

- **Pin Any Text**: Highlight text in a ChatGPT conversation and right-click to pin it
- **Smart Queue System**: Automatically queues pins if ChatGPT is busy, submits when ready
- **Add Context**: Optionally add a note or comment to each pin
- **Quick Access**: Use the "Next Pin" button to automatically load and submit your next question
- **Drag to Reorder**: Organize your pins by dragging them into your preferred order
- **Clear All Pins**: Remove all pins at once with a confirmation dialog to prevent accidents
- **Persistent Storage**: Pins are saved locally and persist across browser sessions
- **Dark Theme**: Matches ChatGPT's interface with a clean, modern design
- **Auto-Submit**: Automatically submits prompts when you click "Use" or "Next Pin"

## Smart Queue System

If you try to use a pin while ChatGPT is generating a response, the extension intelligently handles this:

1. **Automatic Queuing**: The pin enters a queued state instead of failing
2. **Visual Feedback**: Shows "⏳ Queued - waiting for ChatGPT to finish..." badge
3. **Other Pins Disabled**: All other "Use" buttons become disabled while a pin is queued
4. **Cancel Option**: Click "Cancel" on the queued pin to abort and clear the input
5. **Auto-Submit**: Extension watches for ChatGPT to finish, then auto-submits the queued pin
6. **Auto-Delete**: Queued pin is deleted after successful submission

This ensures you never lose a pin due to timing issues and creates a smooth workflow!

## Privacy

**No data collection. Period.**

All pins are stored locally in your browser using Firefox's storage API. Nothing is transmitted to external servers. No analytics, no tracking, no telemetry.

See [PRIVACY.md](PRIVACY.md) for full details.

## Installation

### From Firefox Add-ons (Recommended)

1. Visit the [Firefox Add-ons page](https://addons.mozilla.org/firefox/addon/prompt-pins-for-chatgpt/)
2. Click "Add to Firefox"
3. Click "Add" when prompted to confirm
4. Visit [ChatGPT](https://chatgpt.com) and start using Prompt Pins!

### From Source (for developers)

If you want to modify the code or contribute:

1. Clone this repository:
   ```bash
   git clone https://github.com/BigLangerStyle/prompt-pins-chatgpt.git
   cd prompt-pins-chatgpt
   ```

2. Load in Firefox:
   - Open Firefox and navigate to `about:debugging`
   - Click "This Firefox" in the left sidebar
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file from the extension directory

## Usage

### Creating a Pin

1. Highlight any text in a ChatGPT conversation
2. Right-click and select **"Pin prompt"**
3. Optionally add a comment for context
4. Click **"Save Pin"** (or press Enter)

### Using Pins

- **Next Pin Button**: Click "Next Pin ->" to use the first pin in your queue
- **Individual Use**: Click "Use" on any specific pin
- If ChatGPT is busy, the pin automatically queues and submits when ready
- Pins are automatically submitted to ChatGPT and removed after use

### Managing Pins

- **Reorder**: Drag and drop pins to organize them
- **Delete**: Click the x button to remove a pin
- **Clear All**: Click "Clear" button to remove all pins (with confirmation)
- **Collapse**: Click the - button to hide the sidebar
- **Cancel Queue**: If a pin is queued, click "Cancel" to abort

## Permissions Explained

- **storage**: Save your pins locally in the browser
- **contextMenus**: Add "Pin prompt" to the right-click menu
- **Access to chat.openai.com and chatgpt.com**: Required to interact with ChatGPT's interface

## Technical Details

- **Language**: Vanilla JavaScript (no frameworks)
- **Size**: ~25KB total
- **Dependencies**: None (uses browser native APIs only)
- **Content script**: Only runs on ChatGPT domains
- **Security**: No external network requests, uses `textContent` (not `innerHTML`)

## Screenshots

### Creating a Pin
Right-click on selected text and choose "Pin prompt" from the context menu:

![Context Menu](screenshots/screenshot-context-menu.png)

### Pin Creation Dialog
Add optional notes or comments to your pin:

![Create Pin Dialog](screenshots/screenshot-create-pin-dialog.png)

### Managing Pins
View and manage all your saved pins in the sidebar:

![Sidebar with Pins](screenshots/screenshot-sidebar-pins.png)

## Contributing

Suggestions and bug reports are welcome!

- **Report a Bug**: [Open an issue](https://github.com/BigLangerStyle/prompt-pins-chatgpt/issues)
- **Suggest a Feature**: [Open an issue](https://github.com/BigLangerStyle/prompt-pins-chatgpt/issues)

## License

MIT License - see [LICENSE](LICENSE) file for details

Copyright (c) 2025 Prompt Pins Contributors

## Version History

### 1.1.0 (In Development)
- **NEW:** Smart Queue System - Automatically queues pins when ChatGPT is busy
- Clear All Pins feature with confirmation dialog

### 1.0.0 (January 7, 2025)
- Initial release
- Pin creation with optional comments
- Drag to reorder functionality
- Auto-submit functionality
- Dark theme matching ChatGPT
- Local storage persistence
