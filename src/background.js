// Debug mode - set to true for development debugging
const DEBUG = false;

// Debug logging helper - only logs when DEBUG is true
function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

// Create context menu item
function createContextMenu() {
  // Remove any existing menu items to prevent duplicates
  browser.contextMenus.removeAll().then(() => {
    browser.contextMenus.create({
      id: 'pin-prompt',
      title: 'Pin prompt',
      contexts: ['selection']
    }, () => {
      // Check for errors
      if (browser.runtime.lastError) {
        console.error('Prompt Pins: Error creating context menu:', browser.runtime.lastError);
      } else {
        debugLog('Prompt Pins: Context menu created successfully');
      }
    });
  }).catch((error) => {
    console.error('Prompt Pins: Error removing old context menus:', error);
  });
}

// Create context menu when extension is installed or updated
browser.runtime.onInstalled.addListener(() => {
  debugLog('Prompt Pins: Extension installed/updated');
  createContextMenu();
});

// Create context menu when browser starts
browser.runtime.onStartup.addListener(() => {
  debugLog('Prompt Pins: Browser started');
  createContextMenu();
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'pin-prompt') {
    // Send the selected text to the content script
    browser.tabs.sendMessage(tab.id, {
      action: 'createPin',
      selectedText: info.selectionText
    }).catch((error) => {
      // Content script may not be loaded or tab may have navigated away
      console.error('Prompt Pins: Failed to send message to content script:', error);
    });
  }
});

// Handle keyboard shortcuts
browser.commands.onCommand.addListener((command) => {
  debugLog('Prompt Pins: Keyboard command received:', command);
  
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0]) {
      debugLog('Prompt Pins: Sending command to tab:', tabs[0].id);
      browser.tabs.sendMessage(tabs[0].id, {
        action: command
      }).then((response) => {
        debugLog('Prompt Pins: Command response:', response);
      }).catch((error) => {
        console.error('Prompt Pins: Failed to send command to content script:', error);
      });
    } else {
      console.error('Prompt Pins: No active tab found');
    }
  }).catch((error) => {
    console.error('Prompt Pins: Failed to query tabs:', error);
  });
});
