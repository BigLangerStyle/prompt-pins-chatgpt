// ============================================================================
// CONSTANTS
// ============================================================================

const SELECTORS = {
  INPUT: '#prompt-textarea',
  INPUT_FALLBACK: '[contenteditable="true"]',
  SEND_BUTTON: 'button[data-testid="send-button"]',
  SEND_BUTTON_ALT: 'button[aria-label="Send prompt"]',
  SEND_BUTTON_ICON: 'button svg[class*="icon-send"]',
  STOP_BUTTON: 'button[aria-label*="Stop"]',
  STOP_BUTTON_ALT: 'button[aria-label*="stop"]',
  ACTIVE_CHAT: '[aria-current="page"]',
  CHAT_LINKS: 'a[href*="/c/"]',
  STREAMING_INDICATOR: '[data-testid="streaming-indicator"]',
  STREAMING_INDICATOR_ALT: '.streaming-indicator'
};

const TIMINGS = {
  AUTO_SUBMIT_DELAY: 100,
  QUEUE_CHECK_INTERVAL: 500,
  CHAT_CHANGE_CHECK: 500
};

const UI_TEXT = {
  EXPAND_PREFIX: 'Expand on',
  REGARDING_PREFIX: 'Regarding',
  CROSS_CHAT_PREFIX: 'From another conversation',
  EMPTY_STATE: 'No pins yet. Highlight text and right-click to create one.',
  QUEUED_BADGE: '⏳ Queued - waiting for ChatGPT to finish...',
  DELETE_SYMBOL: '×'
};

// ============================================================================
// STATE
// ============================================================================

let pins = [];
let sidebarOpen = true;
let queuedPinIndex = null;
let isWatchingForSubmit = false;

// Cached DOM elements
const cachedElements = {
  sidebar: null,
  pinsList: null,
  nextBtn: null,
  clearBtn: null,
  toggleBtn: null
};

// ============================================================================
// HELPER FUNCTIONS - DOM
// ============================================================================

// Get ChatGPT input element
function getChatGPTInput() {
  return document.querySelector(SELECTORS.INPUT)
    || document.querySelector(SELECTORS.INPUT_FALLBACK);
}

// Get ChatGPT send button
function getSendButton() {
  return document.querySelector(SELECTORS.SEND_BUTTON)
    || document.querySelector(SELECTORS.SEND_BUTTON_ALT)
    || document.querySelector(SELECTORS.SEND_BUTTON_ICON)?.closest('button');
}

// Move cursor to end of contenteditable element
function moveCursorToEnd(element) {
  element.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(element);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Trigger ChatGPT's input events
function triggerInputEvents(element) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// ============================================================================
// HELPER FUNCTIONS - CHAT
// ============================================================================

// Get current chat ID from URL
function getCurrentChatId() {
  const match = window.location.pathname.match(/\/c\/([^\/]+)/);
  return match ? match[1] : null;
}

// Get current chat title from the page
function getCurrentChatTitle() {
  const currentChatId = getCurrentChatId();
  if (!currentChatId) return null;

  // Method 1: Look for the active/selected chat in the sidebar
  const activeLink = document.querySelector(SELECTORS.ACTIVE_CHAT);
  if (activeLink) {
    const chatName = activeLink.textContent.trim();
    if (chatName && chatName.length > 0) {
      return chatName;
    }
  }

  // Method 2: Try to find a link in the sidebar that matches our chat ID
  const chatLinks = document.querySelectorAll(SELECTORS.CHAT_LINKS);
  for (const link of chatLinks) {
    if (link.href.includes(currentChatId)) {
      const chatName = link.textContent.trim();
      if (chatName && chatName.length > 0) {
        return chatName;
      }
    }
  }

  // Method 3: Try document title as fallback
  if (document.title && document.title !== 'ChatGPT') {
    const titleParts = document.title.split(' - ');
    if (titleParts.length > 0 && titleParts[0].trim()) {
      return titleParts[0].trim();
    }
  }

  // Method 4: Fallback - return null if we can't find it
  return null;
}

// Check if ChatGPT is currently generating a response
function isChatGPTGenerating() {
  // Method 1: Look for "Stop generating" button
  const stopButton = document.querySelector(SELECTORS.STOP_BUTTON)
    || document.querySelector(SELECTORS.STOP_BUTTON_ALT)
    || Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.toLowerCase().includes('stop generating')
    );

  if (stopButton) return true;

  // Method 2: Check if send button is disabled
  const sendButton = getSendButton();
  if (sendButton && sendButton.disabled) return true;

  // Method 3: Look for streaming indicator elements
  const streamingIndicator = document.querySelector(SELECTORS.STREAMING_INDICATOR)
    || document.querySelector(SELECTORS.STREAMING_INDICATOR_ALT);

  if (streamingIndicator) return true;

  return false;
}

// ============================================================================
// HELPER FUNCTIONS - PIN OPERATIONS
// ============================================================================

// Fill ChatGPT input with pin content
function fillInputWithPin(pin) {
  const inputElement = getChatGPTInput();
  if (!inputElement) return false;

  inputElement.innerHTML = '';
  const currentChatId = getCurrentChatId();
  const isFromDifferentChat = pin.chatId && currentChatId && pin.chatId !== currentChatId;

  if (pin.comment) {
    const prefix = isFromDifferentChat ? UI_TEXT.CROSS_CHAT_PREFIX : UI_TEXT.REGARDING_PREFIX;
    const regardingP = document.createElement('p');
    regardingP.textContent = `${prefix}: "${pin.text}"`;
    inputElement.appendChild(regardingP);

    const emptyP = document.createElement('p');
    emptyP.innerHTML = '<br>';
    inputElement.appendChild(emptyP);

    const commentP = document.createElement('p');
    commentP.textContent = pin.comment;
    inputElement.appendChild(commentP);
  } else {
    const prefix = isFromDifferentChat ? UI_TEXT.CROSS_CHAT_PREFIX : UI_TEXT.EXPAND_PREFIX;
    const p = document.createElement('p');
    p.textContent = `${prefix}: "${pin.text}"`;
    inputElement.appendChild(p);
  }

  triggerInputEvents(inputElement);
  moveCursorToEnd(inputElement);
  return true;
}

// Auto-submit the current input to ChatGPT
function autoSubmitInput() {
  setTimeout(() => {
    const sendButton = getSendButton();
    if (sendButton && !sendButton.disabled) {
      sendButton.click();
    }
  }, TIMINGS.AUTO_SUBMIT_DELAY);
}

// Clear the ChatGPT input field
function clearChatGPTInput() {
  const inputElement = getChatGPTInput();
  if (inputElement) {
    inputElement.innerHTML = '';
    triggerInputEvents(inputElement);
  }
}

// ============================================================================
// SIDEBAR CREATION
// ============================================================================

// Create and inject the sidebar
function createSidebar() {
  const sidebar = document.createElement('div');
  sidebar.id = 'prompt-pins-sidebar';

  // Create header
  const header = document.createElement('div');
  header.className = 'pins-header';

  const headerTitle = document.createElement('div');
  headerTitle.className = 'pins-header-title';
  headerTitle.innerHTML = `
    <svg class="pin-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v20M16 6l-4 4-4-4M16 18l-4-4-4 4"/>
    </svg>
    <h3>Prompt Pins</h3>
  `;

  const headerButtons = document.createElement('div');
  headerButtons.className = 'header-buttons';

  const clearAllBtn = document.createElement('button');
  clearAllBtn.id = 'clear-all-pins';
  clearAllBtn.title = 'Clear all pins';
  clearAllBtn.textContent = 'Clear';

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'toggle-pins';
  toggleBtn.title = 'Toggle sidebar';
  toggleBtn.textContent = '-';

  headerButtons.appendChild(clearAllBtn);
  headerButtons.appendChild(toggleBtn);
  header.appendChild(headerTitle);
  header.appendChild(headerButtons);

  // Create next pin button
  const nextBtn = document.createElement('button');
  nextBtn.id = 'next-pin';
  nextBtn.className = 'next-pin-btn';
  nextBtn.textContent = 'Next Pin ->';

  // Create pins list
  const pinsList = document.createElement('div');
  pinsList.id = 'pins-list';
  pinsList.className = 'pins-list';

  // Assemble sidebar
  sidebar.appendChild(header);
  sidebar.appendChild(nextBtn);
  sidebar.appendChild(pinsList);

  document.body.appendChild(sidebar);

  // Cache elements
  cachedElements.sidebar = sidebar;
  cachedElements.pinsList = pinsList;
  cachedElements.nextBtn = nextBtn;
  cachedElements.clearBtn = clearAllBtn;
  cachedElements.toggleBtn = toggleBtn;

  // Attach event listeners
  toggleBtn.addEventListener('click', toggleSidebar);
  clearAllBtn.addEventListener('click', confirmClearAll);
  nextBtn.addEventListener('click', () => {
    if (pins.length > 0) {
      usePin(0, true);
    }
  });

  // Load saved pins
  loadPins();
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  const sidebar = cachedElements.sidebar;
  const toggle = cachedElements.toggleBtn;

  if (sidebarOpen) {
    sidebar.classList.remove('collapsed');
    toggle.textContent = '-';
  } else {
    sidebar.classList.add('collapsed');
    toggle.textContent = '+';
  }
}

// ============================================================================
// PIN STORAGE
// ============================================================================

// Load pins from storage
async function loadPins() {
  const result = await browser.storage.local.get('pins');
  pins = result.pins || [];
  renderPins();
}

// Save pins to storage
async function savePins() {
  await browser.storage.local.set({ pins });
}

// ============================================================================
// PIN RENDERING
// ============================================================================

// Render the pins list
function renderPins() {
  const list = cachedElements.pinsList;
  const nextBtn = cachedElements.nextBtn;
  const clearAllBtn = cachedElements.clearBtn;

  if (!list) return;

  // Enable/disable next button and clear all button
  if (nextBtn) {
    nextBtn.disabled = pins.length === 0 || queuedPinIndex !== null;
  }

  if (clearAllBtn) {
    clearAllBtn.disabled = pins.length === 0;
  }

  if (pins.length === 0) {
    list.innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.textContent = UI_TEXT.EMPTY_STATE;
    list.appendChild(emptyDiv);
    return;
  }

  // Clear list
  list.innerHTML = '';

  // Get current chat ID for comparison
  const currentChatId = getCurrentChatId();

  // Create pin items
  pins.forEach((pin, index) => {
    const pinItem = document.createElement('div');
    pinItem.className = 'pin-item';
    pinItem.setAttribute('data-index', index);
    pinItem.setAttribute('draggable', 'true');

    // Add queued class if this pin is queued
    const isQueued = queuedPinIndex === index;
    if (isQueued) {
      pinItem.classList.add('queued');
    }

    // Check if pin is from a different chat
    const isFromDifferentChat = pin.chatId && currentChatId && pin.chatId !== currentChatId;
    if (isFromDifferentChat) {
      pinItem.classList.add('cross-chat');
    }

    const pinText = document.createElement('div');
    pinText.className = 'pin-text';
    pinText.textContent = `"${pin.text}"`;
    pinItem.appendChild(pinText);

    if (pin.comment) {
      const pinComment = document.createElement('div');
      pinComment.className = 'pin-comment';
      pinComment.textContent = pin.comment;
      pinItem.appendChild(pinComment);
    }

    // Show cross-chat badge if pin is from another chat
    if (isFromDifferentChat) {
      const crossChatBadge = document.createElement('div');
      crossChatBadge.className = 'cross-chat-badge';
      if (pin.chatTitle) {
        crossChatBadge.textContent = `From: ${pin.chatTitle}`;
      } else {
        crossChatBadge.textContent = 'From another chat';
      }
      pinItem.appendChild(crossChatBadge);
    }

    // Show queued badge if this pin is queued
    if (isQueued) {
      const queuedBadge = document.createElement('div');
      queuedBadge.className = 'queued-badge';
      queuedBadge.textContent = UI_TEXT.QUEUED_BADGE;
      pinItem.appendChild(queuedBadge);
    }

    const pinActions = document.createElement('div');
    pinActions.className = 'pin-actions';

    if (isQueued) {
      // Show cancel button for queued pin
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'cancel-queue-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', cancelQueue);
      pinActions.appendChild(cancelBtn);
    } else {
      // Show normal use/delete buttons
      const useBtn = document.createElement('button');
      useBtn.className = 'use-pin';
      useBtn.setAttribute('data-index', index);
      useBtn.textContent = 'Use';

      // Disable use button if another pin is queued
      if (queuedPinIndex !== null) {
        useBtn.disabled = true;
        useBtn.style.opacity = '0.5';
        useBtn.style.cursor = 'not-allowed';
      }

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-pin';
      deleteBtn.setAttribute('data-index', index);
      deleteBtn.textContent = UI_TEXT.DELETE_SYMBOL;

      useBtn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        usePin(idx, true);
      });

      deleteBtn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.index);
        deletePin(idx);
      });

      pinActions.appendChild(useBtn);
      pinActions.appendChild(deleteBtn);
    }

    pinItem.appendChild(pinActions);

    const pinTimestamp = document.createElement('div');
    pinTimestamp.className = 'pin-timestamp';
    pinTimestamp.textContent = new Date(pin.timestamp).toLocaleString();
    pinItem.appendChild(pinTimestamp);

    list.appendChild(pinItem);
  });

  // Add drag and drop functionality
  list.querySelectorAll('.pin-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

// ============================================================================
// DRAG AND DROP
// ============================================================================

let draggedElement = null;
let draggedIndex = null;

function handleDragStart(e) {
  draggedElement = e.currentTarget;
  draggedIndex = parseInt(e.currentTarget.dataset.index);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragEnter(e) {
  if (e.currentTarget !== draggedElement) {
    e.currentTarget.style.borderTop = '2px solid #10a37f';
  }
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragLeave(e) {
  e.currentTarget.style.borderTop = '';
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.preventDefault();

  e.currentTarget.style.borderTop = '';

  const dropIndex = parseInt(e.currentTarget.dataset.index);

  if (draggedIndex !== null && draggedIndex !== dropIndex) {
    // Reorder the pins array
    const [draggedPin] = pins.splice(draggedIndex, 1);
    pins.splice(dropIndex, 0, draggedPin);

    savePins();
    renderPins();
  }

  return false;
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');

  // Remove all border highlights
  document.querySelectorAll('.pin-item').forEach(item => {
    item.style.borderTop = '';
  });

  draggedElement = null;
  draggedIndex = null;
}

// ============================================================================
// PIN CREATION
// ============================================================================

// Create a new pin
function createPin(text) {
  showCommentInput(text);
}

// Show comment input field
function showCommentInput(selectedText) {
  // Remove any existing comment input
  const existing = document.getElementById('pin-comment-input');
  if (existing) existing.remove();

  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const inputContainer = document.createElement('div');
  inputContainer.id = 'pin-comment-input';
  inputContainer.style.position = 'fixed';
  inputContainer.style.left = `${rect.left}px`;
  inputContainer.style.top = `${rect.bottom + 5}px`;
  inputContainer.style.zIndex = '10000';

  // Truncate selected text for preview
  const previewText = selectedText.length > 50
    ? selectedText.substring(0, 50) + '...'
    : selectedText;

  // Create dialog structure with DOM methods
  const dialog = document.createElement('div');
  dialog.id = 'pin-comment-dialog';
  dialog.className = 'pin-dialog';

  const header = document.createElement('div');
  header.id = 'pin-comment-drag-handle';
  header.className = 'pin-dialog-header';

  const headerIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  headerIcon.setAttribute('width', '16');
  headerIcon.setAttribute('height', '16');
  headerIcon.setAttribute('viewBox', '0 0 24 24');
  headerIcon.setAttribute('fill', 'none');
  headerIcon.setAttribute('stroke', 'currentColor');
  headerIcon.setAttribute('stroke-width', '2');

  const headerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  headerPath.setAttribute('d', 'M12 2v20M16 6l-4 4-4-4M16 18l-4-4-4 4');
  headerIcon.appendChild(headerPath);

  header.appendChild(headerIcon);
  header.appendChild(document.createTextNode(' Create Pin'));

  const body = document.createElement('div');
  body.className = 'pin-dialog-body';

  const preview = document.createElement('div');
  preview.className = 'pin-dialog-preview';
  preview.textContent = `"${previewText}"`;

  const textarea = document.createElement('textarea');
  textarea.id = 'pin-comment-field';
  textarea.className = 'pin-dialog-textarea';
  textarea.placeholder = 'Add a note (optional)';
  textarea.rows = 3;

  const buttons = document.createElement('div');
  buttons.className = 'pin-dialog-buttons';

  const cancelBtn = document.createElement('button');
  cancelBtn.id = 'pin-cancel';
  cancelBtn.className = 'pin-dialog-button pin-dialog-button-cancel';
  cancelBtn.textContent = 'Cancel';

  const saveBtn = document.createElement('button');
  saveBtn.id = 'pin-save';
  saveBtn.className = 'pin-dialog-button pin-dialog-button-save';
  saveBtn.textContent = 'Save Pin';

  buttons.appendChild(cancelBtn);
  buttons.appendChild(saveBtn);

  body.appendChild(preview);
  body.appendChild(textarea);
  body.appendChild(buttons);

  dialog.appendChild(header);
  dialog.appendChild(body);

  inputContainer.appendChild(dialog);

  document.body.appendChild(inputContainer);

  const input = textarea;
  input.focus();

  // Auto-expand textarea as user types
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  });

  // Make the dialog draggable
  const dragHandle = document.getElementById('pin-comment-drag-handle');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  const handleMouseDown = (e) => {
    isDragging = true;
    initialX = e.clientX - inputContainer.offsetLeft;
    initialY = e.clientY - inputContainer.offsetTop;
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      inputContainer.style.left = currentX + 'px';
      inputContainer.style.top = currentY + 'px';
    }
  };

  const handleMouseUp = () => {
    isDragging = false;
  };

  dragHandle.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // Cleanup function
  const cleanup = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Save pin
  document.getElementById('pin-save').addEventListener('click', () => {
    const comment = input.value.trim();

    const chatId = getCurrentChatId();
    const chatTitle = getCurrentChatTitle();

    const newPin = {
      text: selectedText,
      comment: comment || null,
      timestamp: Date.now(),
      chatId: chatId,
      chatTitle: chatTitle
    };

    pins.push(newPin);

    savePins();
    renderPins();
    cleanup();
    inputContainer.remove();
  });

  // Cancel
  document.getElementById('pin-cancel').addEventListener('click', () => {
    cleanup();
    inputContainer.remove();
  });

  // Save on Enter, Cancel on Escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('pin-save').click();
    } else if (e.key === 'Escape') {
      cleanup();
      inputContainer.remove();
    }
  });
}

// ============================================================================
// PIN OPERATIONS
// ============================================================================

// Use a pin (fill the ChatGPT input)
function usePin(index, shouldDelete = false) {
  if (index < 0 || index >= pins.length) {
    console.error('Invalid pin index:', index);
    return;
  }

  const pin = pins[index];

  // If another pin is already queued, don't allow using this pin
  if (queuedPinIndex !== null && queuedPinIndex !== index) {
    return; // Silently ignore - button should already be disabled
  }

  // Check if ChatGPT is actively generating a response
  const isGenerating = isChatGPTGenerating();

  // If ChatGPT is generating, queue this pin instead
  if (isGenerating) {
    queuePin(index);
    return;
  }

  // Fill input with pin content
  if (fillInputWithPin(pin)) {
    autoSubmitInput();

    // Delete the pin if requested
    if (shouldDelete) {
      deletePin(index);
    }
  }
}

// Queue a pin for later submission
function queuePin(index) {
  if (index < 0 || index >= pins.length) {
    console.error('Invalid pin index:', index);
    return;
  }

  queuedPinIndex = index;
  const pin = pins[index];

  // Fill the input field
  fillInputWithPin(pin);

  // Update UI to show queued state
  renderPins();

  // Start watching for ChatGPT to finish
  watchForChatGPTReady();
}

// Cancel the queued pin
function cancelQueue() {
  queuedPinIndex = null;
  isWatchingForSubmit = false;

  // Clear the input field
  clearChatGPTInput();

  renderPins();
}

// Watch for ChatGPT to finish processing so we can submit the queued pin
function watchForChatGPTReady() {
  if (isWatchingForSubmit) return; // Already watching

  isWatchingForSubmit = true;

  const checkInterval = setInterval(() => {
    // If queue was cancelled, stop watching
    if (queuedPinIndex === null) {
      clearInterval(checkInterval);
      isWatchingForSubmit = false;
      return;
    }

    // Check if ChatGPT has finished generating
    if (!isChatGPTGenerating()) {
      // ChatGPT is ready! Submit the queued pin
      clearInterval(checkInterval);
      isWatchingForSubmit = false;
      submitQueuedPin();
    }
  }, TIMINGS.QUEUE_CHECK_INTERVAL);
}

// Submit the queued pin
function submitQueuedPin() {
  if (queuedPinIndex === null) return;

  const sendButton = getSendButton();

  if (sendButton && !sendButton.disabled) {
    sendButton.click();

    // Delete the pin after submission
    const indexToDelete = queuedPinIndex;
    queuedPinIndex = null;
    deletePin(indexToDelete);
  }
}

// Show confirmation dialog before clearing all pins
function confirmClearAll() {
  if (pins.length === 0) {
    return; // Nothing to clear
  }

  // Create confirmation dialog
  const overlay = document.createElement('div');
  overlay.id = 'clear-all-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.background = 'rgba(0, 0, 0, 0.7)';
  overlay.style.zIndex = '10001';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  const dialog = document.createElement('div');
  dialog.className = 'clear-all-dialog';

  const title = document.createElement('h3');
  title.textContent = 'Clear All Pins?';
  title.style.margin = '0 0 12px 0';
  title.style.fontSize = '18px';
  title.style.color = '#ececec';

  const message = document.createElement('p');
  message.textContent = `Are you sure you want to delete all ${pins.length} pin${
    pins.length === 1 ? '' : 's'
  }? This action cannot be undone.`;
  message.style.margin = '0 0 20px 0';
  message.style.fontSize = '14px';
  message.style.color = '#d1d5db';
  message.style.lineHeight = '1.5';

  const buttons = document.createElement('div');
  buttons.style.display = 'flex';
  buttons.style.gap = '8px';
  buttons.style.justifyContent = 'flex-end';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'clear-all-cancel';
  cancelBtn.textContent = 'Cancel';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'clear-all-confirm';
  confirmBtn.textContent = 'Clear All';

  buttons.appendChild(cancelBtn);
  buttons.appendChild(confirmBtn);

  dialog.appendChild(title);
  dialog.appendChild(message);
  dialog.appendChild(buttons);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Event handlers
  const closeDialog = () => {
    overlay.remove();
  };

  cancelBtn.addEventListener('click', closeDialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDialog();
    }
  });

  confirmBtn.addEventListener('click', () => {
    clearAllPins();
    closeDialog();
  });

  // Escape key to cancel
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Clear all pins
function clearAllPins() {
  pins = [];
  savePins();
  renderPins();
}

// Helper function to get current text selection
function getSelectedText() {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}

// Send selected text immediately (bypass pin creation)
function sendImmediately() {
  const selectedText = getSelectedText();

  if (!selectedText) {
    return; // No text selected
  }

  // Find ChatGPT input
  const inputElement = getChatGPTInput();

  if (inputElement) {
    // Clear the input
    inputElement.innerHTML = '';

    // Add the text with "Expand on:" prefix
    const p = document.createElement('p');
    p.textContent = `${UI_TEXT.EXPAND_PREFIX}: "${selectedText}"`;
    inputElement.appendChild(p);

    // Trigger input events
    triggerInputEvents(inputElement);
    moveCursorToEnd(inputElement);

    // Auto-submit
    autoSubmitInput();
  }
}

// Delete a pin
function deletePin(index) {
  if (index < 0 || index >= pins.length) {
    console.error('Invalid pin index:', index);
    return;
  }

  pins.splice(index, 1);
  savePins();
  renderPins();
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

// Listen for messages from background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'createPin') {
    // Context menu: create pin from selected text
    createPin(message.selectedText);
    return Promise.resolve({success: true});
  } else if (message.action === 'create-pin') {
    // Keyboard shortcut: Ctrl+Alt+P - create pin from current selection
    const selectedText = getSelectedText();
    if (selectedText) {
      createPin(selectedText);
    }
    return Promise.resolve({success: true});
  } else if (message.action === 'send-immediately') {
    // Keyboard shortcut: Ctrl+Alt+S - send selected text immediately
    sendImmediately();
    return Promise.resolve({success: true});
  } else if (message.action === 'use-next-pin') {
    // Keyboard shortcut: Ctrl+Alt+N - use next pin
    if (pins.length > 0) {
      usePin(0, true);
    }
    return Promise.resolve({success: true});
  }
});

// ============================================================================
// CHAT CHANGE DETECTION
// ============================================================================

// Watch for URL changes (when user switches chats)
let lastChatId = getCurrentChatId();

function checkForChatChange() {
  const currentChatId = getCurrentChatId();
  if (currentChatId !== lastChatId) {
    lastChatId = currentChatId;
    // Re-render pins to update cross-chat styling
    renderPins();
  }
}

// Check for chat changes periodically
setInterval(checkForChatChange, TIMINGS.CHAT_CHANGE_CHECK);

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createSidebar);
} else {
  createSidebar();
}
