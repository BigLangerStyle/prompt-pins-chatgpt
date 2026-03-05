// Debug mode - set to true for development debugging
const DEBUG = false;

// Debug logging helper - only logs when DEBUG is true
function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

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
