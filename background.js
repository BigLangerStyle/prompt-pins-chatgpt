// Create context menu item when extension loads
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "pin-prompt",
    title: "Pin prompt",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "pin-prompt") {
    // Send the selected text to the content script
    browser.tabs.sendMessage(tab.id, {
      action: "createPin",
      selectedText: info.selectionText
    }).catch((error) => {
      // Content script may not be loaded or tab may have navigated away
      console.error("Failed to send message to content script:", error);
    });
  }
});

// Handle keyboard shortcuts
browser.commands.onCommand.addListener((command) => {
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (tabs[0]) {
      browser.tabs.sendMessage(tabs[0].id, {
        action: command
      }).catch((error) => {
        console.error("Failed to send command to content script:", error);
      });
    }
  });
});