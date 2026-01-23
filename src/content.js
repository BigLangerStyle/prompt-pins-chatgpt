// ============================================================================
// CONSTANTS
// ============================================================================

// Debug mode - set to true for development debugging
const DEBUG = false;

// Debug logging helper - only logs when DEBUG is true
function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

// Browser and platform detection
const IS_CHROME = typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && !navigator.userAgent.includes('Firefox');
const IS_MAC = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

// Keyboard shortcuts configuration
const KEYBOARD_SHORTCUTS = {
  firefox: {
    createPin: IS_MAC ? 'Cmd+Alt+P' : 'Ctrl+Alt+P',
    sendImmediately: IS_MAC ? 'Cmd+Alt+S' : 'Ctrl+Alt+S',
    useNextPin: IS_MAC ? 'Cmd+Alt+N' : 'Ctrl+Alt+N'
  },
  chrome: {
    createPin: IS_MAC ? 'Cmd+Shift+K' : 'Ctrl+Shift+K',
    sendImmediately: IS_MAC ? 'Cmd+Shift+L' : 'Ctrl+Shift+L',
    useNextPin: IS_MAC ? 'Cmd+Shift+U' : 'Ctrl+Shift+U'
  }
};

// Get current browser's shortcuts
const SHORTCUTS = IS_CHROME ? KEYBOARD_SHORTCUTS.chrome : KEYBOARD_SHORTCUTS.firefox;

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
  AUTO_SUBMIT_DELAY: 100,              // Delay before auto-submitting input (ms)
  QUEUE_CHECK_INTERVAL: 500,           // How often to check if ChatGPT finished generating (ms)
  CHAT_CHANGE_CHECK: 500,              // How often to check for chat navigation (ms)
  WELCOME_ANIMATION_DELAY: 2500,       // How long to show expanded sidebar in welcome animation (ms)
  PULSE_ANIMATION_DURATION: 2000,      // Duration of toggle button pulse animation (ms)
  LOGIN_CHECK_INTERVAL: 1000,          // How often to check login state (ms)
  HIGHLIGHT_ANIMATION_DURATION: 1500,  // Duration of new pin highlight animation (ms)
  AUTO_COLLAPSE_DELAY: 2000            // Delay before auto-collapsing sidebar after pin creation (ms)
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
let sidebarOpen = true; // Default to open, will be overridden by saved state
let queuedPinIndex = null;
let isWatchingForSubmit = false;
let currentHighlightTimeout = null;
let isAutoExpanded = false; // Track if sidebar was auto-expanded for pin creation
let autoCollapseTimeout = null; // Track timeout for auto-collapse
let hasSeenWelcome = false; // Track if user has seen the welcome animation

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

/**
 * Gets the ChatGPT input textarea element
 * Tries multiple selectors for reliability
 * 
 * @returns {HTMLElement|null} Input element or null if not found
 */
function getChatGPTInput() {
  return document.querySelector(SELECTORS.INPUT)
    || document.querySelector(SELECTORS.INPUT_FALLBACK);
}

/**
 * Gets the ChatGPT send button element
 * Tries multiple selectors for reliability
 * 
 * @returns {HTMLElement|null} Send button or null if not found
 */
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

/**
 * Retrieves the current chat ID from the URL
 * Extracts the ID from ChatGPT's URL pattern: /c/{chat_id}
 * 
 * @returns {string|null} Chat ID or null if not in a chat
 */
function getCurrentChatId() {
  const match = window.location.pathname.match(/\/c\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Retrieves the current chat title from the page
 * Tries multiple methods to find the title:
 * 1. Active/selected chat in sidebar
 * 2. Sidebar link matching current chat ID
 * 3. Document title (fallback)
 * 
 * @returns {string|null} Chat title or null if not found
 */
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

/**
 * Checks if ChatGPT is currently generating a response
 * Uses multiple detection methods:
 * 1. Presence of "Stop generating" button
 * 2. Disabled state of send button
 * 3. Streaming indicator elements
 * 
 * @returns {boolean} True if ChatGPT is generating, false otherwise
 */
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
// HELPER FUNCTIONS - LOGIN STATE DETECTION
// ============================================================================

/**
 * Detects if the user is currently on the ChatGPT login page
 * Uses multiple detection methods for reliability:
 * 1. URL check for chat ID (if present, user is logged in)
 * 2. Presence of chat input element
 * 3. Visible "Log in" button detection
 * 4. Navigation sidebar (only present when logged in)
 * 5. User menu/avatar elements
 * 
 * @returns {boolean} True if on login page, false if logged in
 */
function isLoginPage() {
  // Method 1: Check URL - if we have a chat ID, definitely logged in
  const hasChatId = getCurrentChatId() !== null;
  if (hasChatId) {
    debugLog('Prompt Pins: Has chat ID - user is logged in');
    return false; // Definitely logged in
  }

  // Method 2: Check if there's a chat input (when logged in, input is functional)
  const hasInput = getChatGPTInput() !== null;

  // Method 3: Check if there's a visible "Log in" button
  const buttons = Array.from(document.querySelectorAll('button, a'));
  const hasLoginButton = buttons.some(btn => {
    const text = btn.textContent.toLowerCase().trim();
    return text === 'log in' || text === 'sign in' || text === 'login';
  });

  // Method 4: Check for navigation sidebar (only appears when logged in)
  const hasNavSidebar = document.querySelector('nav[class*="flex"]') !== null ||
                        document.querySelector('aside') !== null;

  // Method 5: Check for user menu/avatar
  const hasUserMenu = document.querySelector('[data-headlessui-state]') !== null ||
                      document.querySelector('button[aria-label*="User"]') !== null ||
                      document.querySelector('[class*="avatar"]') !== null;

  // Logic: Consider it a login page if:
  // - Has explicit "Log in" button AND no chat ID
  // - OR: No navigation sidebar AND no chat ID AND has input (the pre-login homepage)
  const isOnLoginPage = (hasLoginButton && !hasChatId) || (!hasNavSidebar && !hasChatId && hasInput);

  debugLog('Prompt Pins: Login detection -', {
    hasChatId,
    hasInput,
    hasLoginButton,
    hasNavSidebar,
    hasUserMenu,
    isLoginPage: isOnLoginPage
  });

  return isOnLoginPage;
}

// ============================================================================
// WELCOME ANIMATION FOR FIRST-TIME LOGGED-OUT USERS
// ============================================================================

/**
 * Triggers the welcome animation for first-time users on login page
 * Animation sequence:
 * 1. Expand sidebar
 * 2. Wait 2.5 seconds (let user see it)
 * 3. Collapse sidebar
 * 4. Add pulse animation to toggle button (2 seconds)
 * 
 * @returns {Promise<void>}
 */
async function triggerWelcomeAnimation() {
  try {
    const sidebar = cachedElements.sidebar;
    const toggle = cachedElements.toggleBtn;

    if (!sidebar || !toggle) return;

    debugLog('Prompt Pins: Triggering welcome animation');

    // Mark welcome as seen IMMEDIATELY to prevent double-triggering from interval
    hasSeenWelcome = true;
    await saveWelcomeState();

    // 1. Ensure sidebar is expanded
    sidebar.classList.remove('collapsed');
    updateToggleButton(toggle, true);
    sidebarOpen = true;

    // 2. Wait 2.5 seconds
    await new Promise(resolve => setTimeout(resolve, TIMINGS.WELCOME_ANIMATION_DELAY));

    // 3. Collapse the sidebar
    sidebar.classList.add('collapsed');
    updateToggleButton(toggle, false);
    sidebarOpen = false;

    // 4. Add pulse animation to toggle button
    toggle.classList.add('toggle-pulse');

    // 5. Remove pulse animation after it completes (2s for both pulses)
    setTimeout(() => {
      toggle.classList.remove('toggle-pulse');
    }, TIMINGS.PULSE_ANIMATION_DURATION);

    debugLog('Prompt Pins: Welcome animation complete');
  } catch (error) {
    console.error('Prompt Pins: Welcome animation failed:', error);
    // Animation failure is non-critical, continue normally
  }
}


/**
 * Manages automatic sidebar collapse/expand for login page
 * Behavior:
 * - Collapses sidebar when on login page for clean UX
 * - Restores user's preference when logged in
 * - Respects manual user overrides
 * - Triggers welcome animation for first-time logged-out users
 * - Avoids collapsing during pin creation
 * 
 * @returns {void}
 */
function handleLoginStateChange() {
  const isOnLoginPage = isLoginPage();
  const sidebar = cachedElements.sidebar;
  const toggle = cachedElements.toggleBtn;

  if (!sidebar || !toggle) return;

  if (isOnLoginPage) {
    // Check if this is a first-time logged-out user who hasn't seen the welcome animation
    if (!hasSeenWelcome) {
      debugLog('Prompt Pins: First-time logged-out user detected, triggering welcome animation');
      triggerWelcomeAnimation();
      return; // Welcome animation will handle the collapse
    }

    // CRITICAL: Don't auto-collapse if user has a pin creation dialog open
    const hasActiveDialog = document.getElementById('pin-comment-input') !== null;
    const hasInlineFormOpen = document.getElementById('inline-pin-form')?.style.display === 'block';

    if (hasActiveDialog || hasInlineFormOpen) {
      debugLog('Prompt Pins: Pin creation in progress, deferring auto-collapse');
      return; // Don't auto-collapse while user is creating a pin
    }

    // On login page - collapse sidebar if not already collapsed
    // BUT respect if user manually expanded it (manual override)
    if (!sidebar.classList.contains('collapsed') && !manualOverrideOnLogin) {
      debugLog('Prompt Pins: Login page detected, auto-collapsing sidebar');

      // Save user's preference before we change it
      savedPreferenceBeforeLogin = sidebarOpen;

      // Collapse the sidebar (both visually and state)
      sidebar.classList.add('collapsed');
      updateToggleButton(toggle, false);
      sidebarOpen = false; // Update state to match visual
      wasOnLoginPage = true;
    }
  } else {
    // Logged in - restore saved sidebar state or default to expanded for new users
    if (wasOnLoginPage) {
      if (savedPreferenceBeforeLogin !== null) {
        debugLog('Prompt Pins: User logged in, restoring sidebar to saved preference:', savedPreferenceBeforeLogin);

        // Restore user's original preference
        if (savedPreferenceBeforeLogin) {
          sidebar.classList.remove('collapsed');
          updateToggleButton(toggle, true);
          sidebarOpen = true;
        } else {
          // User's preference was collapsed, keep it that way
          sidebar.classList.add('collapsed');
          updateToggleButton(toggle, false);
          sidebarOpen = false;
        }
      } else {
        // New user - default to expanded to show features
        debugLog('Prompt Pins: New user logged in, defaulting to expanded sidebar');
        sidebar.classList.remove('collapsed');
        updateToggleButton(toggle, true);
        sidebarOpen = true;
      }

      // Save the restored or default preference
      saveSidebarState();

      // Reset flags
      wasOnLoginPage = false;
      manualOverrideOnLogin = false;
      savedPreferenceBeforeLogin = null;
    }
  }
}


// Watch for login state changes
let loginStateCheckInterval = null;
let wasOnLoginPage = false; // Track previous login page state
let manualOverrideOnLogin = false; // Track if user manually expanded on login page
let savedPreferenceBeforeLogin = null; // Store user's preference before auto-collapse

function startLoginStateWatcher() {
  // Check immediately
  handleLoginStateChange();

  // Then check periodically
  if (loginStateCheckInterval) {
    clearInterval(loginStateCheckInterval);
  }

  loginStateCheckInterval = setInterval(() => {
    handleLoginStateChange();
  }, TIMINGS.LOGIN_CHECK_INTERVAL); // Check every second
}

function stopLoginStateWatcher() {
  if (loginStateCheckInterval) {
    clearInterval(loginStateCheckInterval);
    loginStateCheckInterval = null;
  }
  wasOnLoginPage = false;
  manualOverrideOnLogin = false;
  savedPreferenceBeforeLogin = null;
}

// HELPER FUNCTIONS - PIN OPERATIONS
// ============================================================================

/**
 * Gets the appropriate prefix for a pin based on its context
 * Handles cross-chat pins with actual chat titles
 * 
 * @param {Object} pin - The pin object
 * @param {boolean} isFromDifferentChat - Whether pin is from a different chat
 * @param {string} defaultPrefix - The prefix to use if not cross-chat (EXPAND_PREFIX or REGARDING_PREFIX)
 * @returns {string} The appropriate prefix text
 */
function getPinPrefix(pin, isFromDifferentChat, defaultPrefix) {
  if (!isFromDifferentChat) {
    return defaultPrefix;
  }
  
  // Cross-chat pin: use actual chat title if available
  return pin.chatTitle 
    ? `From another ChatGPT conversation (${pin.chatTitle})`
    : UI_TEXT.CROSS_CHAT_PREFIX;
}

// Fill ChatGPT input with pin content
function fillInputWithPin(pin) {
  const inputElement = getChatGPTInput();
  if (!inputElement) return false;

  inputElement.innerHTML = '';
  const currentChatId = getCurrentChatId();
  const isFromDifferentChat = pin.chatId && currentChatId && pin.chatId !== currentChatId;

  if (pin.comment) {
    const prefix = getPinPrefix(pin, isFromDifferentChat, UI_TEXT.REGARDING_PREFIX);
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
    // Check if pin was manually created (no "Expand on:" prefix for manual pins)
    const p = document.createElement('p');
    if (pin.isManuallyCreated) {
      // Manual pin: send text as-is
      p.textContent = pin.text;
    } else {
      // Text-based pin: add prefix (with chat title for cross-chat pins)
      const prefix = getPinPrefix(pin, isFromDifferentChat, UI_TEXT.EXPAND_PREFIX);
      p.textContent = `${prefix}: "${pin.text}"`;
    }
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

// Helper to create SVG icon element
function createSVGIcon(className) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '24');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.classList.add(className);
  return svg;
}

// Update toggle button icon and tooltip based on sidebar state
function updateToggleButton(toggleBtn, isOpen) {
  toggleBtn.innerHTML = '';

  if (isOpen) {
    toggleBtn.title = 'Minimize Prompt Pins';
    const icon = createSVGIcon('toggle-icon-minus');
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '5');
    line.setAttribute('y1', '12');
    line.setAttribute('x2', '19');
    line.setAttribute('y2', '12');
    icon.appendChild(line);
    toggleBtn.appendChild(icon);
  } else {
    toggleBtn.title = 'Expand Prompt Pins';
    const icon = createSVGIcon('toggle-icon-pin');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 2v20M16 6l-4 4-4-4M16 18l-4-4-4 4');
    icon.appendChild(path);
    toggleBtn.appendChild(icon);
  }
}

// Create keyboard shortcuts help button with tooltip
function createHelpButton() {
  const helpBtn = document.createElement('button');
  helpBtn.id = 'keyboard-shortcuts-help';
  helpBtn.className = 'keyboard-shortcuts-help-btn';
  helpBtn.textContent = 'ⓘ';
  helpBtn.setAttribute('aria-label', 'View keyboard shortcuts');
  
  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'keyboard-shortcuts-tooltip';
  
  // Create title
  const title = document.createElement('div');
  title.className = 'tooltip-title';
  title.textContent = 'Keyboard Shortcuts';
  tooltip.appendChild(title);
  
  // Create shortcuts container
  const shortcutsContainer = document.createElement('div');
  shortcutsContainer.className = 'tooltip-shortcuts';
  
  // Create shortcut row helper function
  const createShortcutRow = (keyCombo, description) => {
    const row = document.createElement('div');
    row.className = 'tooltip-shortcut';
    
    const keySpan = document.createElement('span');
    keySpan.className = 'shortcut-key';
    keySpan.textContent = keyCombo;
    
    const descSpan = document.createElement('span');
    descSpan.className = 'shortcut-desc';
    descSpan.textContent = description;
    
    row.appendChild(keySpan);
    row.appendChild(descSpan);
    return row;
  };
  
  // Add each shortcut row
  shortcutsContainer.appendChild(createShortcutRow(SHORTCUTS.createPin, 'Create pin / Manual creation'));
  shortcutsContainer.appendChild(createShortcutRow(SHORTCUTS.sendImmediately, 'Send text immediately'));
  shortcutsContainer.appendChild(createShortcutRow(SHORTCUTS.useNextPin, 'Use next pin in queue'));
  
  tooltip.appendChild(shortcutsContainer);
  
  // Create version display
  const version = browser.runtime.getManifest().version;
  const versionDiv = document.createElement('div');
  versionDiv.className = 'tooltip-version';
  versionDiv.textContent = `Version ${version}`;
  tooltip.appendChild(versionDiv);
  
  // Create footer with customization instructions
  const footer = document.createElement('div');
  footer.className = 'tooltip-footer';
  footer.textContent = 'Customize shortcuts in browser settings';
  tooltip.appendChild(footer);
  
  helpBtn.appendChild(tooltip);
  
  // Show/hide tooltip on hover
  helpBtn.addEventListener('mouseenter', () => {
    tooltip.style.display = 'block';
  });
  
  helpBtn.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
  
  return helpBtn;
}

// Create and inject the sidebar
function createSidebar() {
  // Check if sidebar already exists (prevent duplicate creation)
  if (document.getElementById('prompt-pins-sidebar')) {
    debugLog('Prompt Pins: Sidebar already exists, skipping creation');
    return;
  }

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

  const helpBtn = createHelpButton();
  const clearAllBtn = document.createElement('button');
  clearAllBtn.id = 'clear-all-pins';
  clearAllBtn.title = 'Clear all pins';
  clearAllBtn.textContent = 'Clear';

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'toggle-pins';
  updateToggleButton(toggleBtn, true); // Start in expanded state

  headerButtons.appendChild(helpBtn);
  headerButtons.appendChild(clearAllBtn);
  headerButtons.appendChild(toggleBtn);
  header.appendChild(headerTitle);
  header.appendChild(headerButtons);

  // Create next pin button
  const nextBtn = document.createElement('button');
  nextBtn.id = 'next-pin';
  nextBtn.className = 'next-pin-btn';
  nextBtn.textContent = 'Next Pin ->';
  nextBtn.title = `Use next pin in queue (${SHORTCUTS.useNextPin})`;

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

  // Apply saved sidebar state
  if (!sidebarOpen) {
    sidebar.classList.add('collapsed');
    updateToggleButton(toggleBtn, false);
  }

  // Load saved pins
  loadPins();
}

function toggleSidebar() {
  // If user manually toggles during auto-expand, cancel auto-collapse
  if (isAutoExpanded && autoCollapseTimeout) {
    clearTimeout(autoCollapseTimeout);
    autoCollapseTimeout = null;
    isAutoExpanded = false;
    debugLog('Prompt Pins: User manually toggled, canceling auto-collapse');
  }

  sidebarOpen = !sidebarOpen;
  const sidebar = cachedElements.sidebar;
  const toggle = cachedElements.toggleBtn;

  if (sidebarOpen) {
    sidebar.classList.remove('collapsed');
    updateToggleButton(toggle, true);

    // If user manually expands on login page, set override flag
    if (isLoginPage()) {
      manualOverrideOnLogin = true;
      debugLog('Prompt Pins: User manually expanded sidebar on login page');
    }
  } else {
    sidebar.classList.add('collapsed');
    updateToggleButton(toggle, false);

    // If user manually collapses, clear override flag
    manualOverrideOnLogin = false;
  }

  // Save sidebar state to storage
  saveSidebarState();
}

// Auto-expand sidebar temporarily for pin creation
function autoExpandSidebar() {
  const sidebar = cachedElements.sidebar;
  const toggle = cachedElements.toggleBtn;

  if (!sidebar || !toggle) return;

  debugLog('Prompt Pins: Auto-expanding sidebar for pin creation');

  // Visually expand the sidebar (but don't change sidebarOpen state or save)
  sidebar.classList.remove('collapsed');
  updateToggleButton(toggle, true);
  isAutoExpanded = true;
}

// Auto-collapse sidebar back to original state
function autoCollapseSidebar() {
  const sidebar = cachedElements.sidebar;
  const toggle = cachedElements.toggleBtn;

  if (!sidebar || !toggle || !isAutoExpanded) return;

  debugLog('Prompt Pins: Auto-collapsing sidebar back to original state');

  // Collapse the sidebar back (restore visual state without saving)
  sidebar.classList.add('collapsed');
  updateToggleButton(toggle, false);
  isAutoExpanded = false;
  autoCollapseTimeout = null;
}


// ============================================================================
// PIN STORAGE
// ============================================================================

// Load pins from storage
async function loadPins() {
  try {
    const result = await browser.storage.local.get('pins');
    pins = result.pins || [];
    renderPins();
  } catch (error) {
    console.error('Prompt Pins: Failed to load pins from storage:', error);
    // Graceful fallback: start with empty pins array
    pins = [];
    renderPins();
  }
}

// Save pins to storage
async function savePins() {
  try {
    await browser.storage.local.set({ pins });
  } catch (error) {
    console.error('Prompt Pins: Failed to save pins to storage:', error);
    // Note: User's changes are still in memory, just not persisted
  }
}

// ============================================================================
// SIDEBAR STATE STORAGE
// ============================================================================

// Load sidebar state from storage
async function loadSidebarState() {
  try {
    const result = await browser.storage.local.get(['sidebarOpen', 'hasSeenWelcome']);
    // If no saved state exists, default to true (open)
    sidebarOpen = result.sidebarOpen !== undefined ? result.sidebarOpen : true;
    // Check if user has seen the welcome animation
    hasSeenWelcome = result.hasSeenWelcome !== undefined ? result.hasSeenWelcome : false;
  } catch (error) {
    console.error('Prompt Pins: Failed to load sidebar state from storage:', error);
    // Use defaults
    sidebarOpen = true;
    hasSeenWelcome = false;
  }
}

// Save sidebar state to storage
async function saveSidebarState() {
  try {
    await browser.storage.local.set({ sidebarOpen });
  } catch (error) {
    console.error('Prompt Pins: Failed to save sidebar state to storage:', error);
  }
}

// Save welcome animation state to storage
async function saveWelcomeState() {
  try {
    await browser.storage.local.set({ hasSeenWelcome });
  } catch (error) {
    console.error('Prompt Pins: Failed to save welcome state to storage:', error);
  }
}


// ============================================================================
// PIN RENDERING
// ============================================================================

// Helper: Clear any pending animation timeouts
function clearPendingAnimations() {
  if (currentHighlightTimeout !== null) {
    clearTimeout(currentHighlightTimeout);
    currentHighlightTimeout = null;
  }
}

// Helper: Update button states based on pins length and queue status
function updateButtonStates() {
  const nextBtn = cachedElements.nextBtn;
  const clearAllBtn = cachedElements.clearBtn;

  if (nextBtn) {
    nextBtn.disabled = pins.length === 0 || queuedPinIndex !== null;
  }

  if (clearAllBtn) {
    clearAllBtn.disabled = pins.length === 0;
  }
}

// Helper: Render empty state message
function renderEmptyState() {
  const list = cachedElements.pinsList;
  if (!list) return;

  list.innerHTML = '';
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'empty-state';
  emptyDiv.textContent = UI_TEXT.EMPTY_STATE;
  list.appendChild(emptyDiv);
}

/**
 * Creates a single pin item element with all its content and styling
 * Handles two pin types:
 * 1. Text-based pins (from highlights) - shows quoted text + optional comment
 * 2. Manual pins - shows editable plain text
 * 
 * Also adds: cross-chat badges, queued badges, action buttons, timestamp
 * 
 * @param {Object} pin - The pin object from pins array
 * @param {number} index - Index of pin in pins array
 * @param {string|null} currentChatId - Current chat ID for cross-chat detection
 * @returns {HTMLElement} The constructed pin item element
 */
function createPinItem(pin, index, currentChatId) {
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

  // Determine if this pin has a selectedText (quoted text from highlight)
  // vs. manually created plain text
  const hasSelectedText = pin.selectedText && pin.selectedText.trim().length > 0;
  
  if (hasSelectedText) {
    // Pin Type 1: From highlighted text - show quoted text (NOT editable)
    const pinText = document.createElement('div');
    pinText.className = 'pin-text';
    pinText.textContent = `"${pin.text}"`;
    pinItem.appendChild(pinText);

    // Show comment field (EDITABLE)
    if (pin.comment) {
      const pinCommentWrapper = document.createElement('div');
      pinCommentWrapper.className = 'pin-comment-wrapper';
      pinCommentWrapper.setAttribute('data-index', index);
      pinCommentWrapper.setAttribute('data-field', 'comment');
      
      const pinComment = document.createElement('div');
      pinComment.className = 'pin-comment pin-editable-field';
      pinComment.textContent = pin.comment;
      
      const editIcon = document.createElement('span');
      editIcon.className = 'edit-icon';
      editIcon.textContent = '✏️';
      editIcon.title = 'Click to edit';
      
      pinCommentWrapper.appendChild(pinComment);
      pinCommentWrapper.appendChild(editIcon);
      pinItem.appendChild(pinCommentWrapper);
    }
  } else {
    // Pin Type 2: From manual creation - show plain text (EDITABLE, no quotes)
    const pinTextWrapper = document.createElement('div');
    pinTextWrapper.className = 'pin-text-wrapper';
    pinTextWrapper.setAttribute('data-index', index);
    pinTextWrapper.setAttribute('data-field', 'text');
    
    const pinText = document.createElement('div');
    pinText.className = 'pin-text pin-editable-field';
    pinText.textContent = pin.text;
    pinText.style.fontStyle = 'normal'; // Override italic style for manual pins
    pinText.style.borderLeft = 'none'; // Remove quote border
    
    const editIcon = document.createElement('span');
    editIcon.className = 'edit-icon';
    editIcon.textContent = '✏️';
    editIcon.title = 'Click to edit';
    
    pinTextWrapper.appendChild(pinText);
    pinTextWrapper.appendChild(editIcon);
    pinItem.appendChild(pinTextWrapper);
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
    useBtn.title = 'Load and submit this pin';

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
    deleteBtn.title = 'Delete this pin';

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

  return pinItem;
}

// Helper: Attach drag and drop event handlers to all pin items
function attachDragAndDropHandlers() {
  const list = cachedElements.pinsList;
  if (!list) return;

  list.querySelectorAll('.pin-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragenter', handleDragEnter);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('dragleave', handleDragLeave);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

// Helper: Attach inline editing event handlers
function attachEditingHandlers() {
  const list = cachedElements.pinsList;
  if (!list) return;

  list.querySelectorAll('.pin-comment-wrapper, .pin-text-wrapper').forEach(wrapper => {
    const editableField = wrapper.querySelector('.pin-editable-field');
    const editIcon = wrapper.querySelector('.edit-icon');
    
    if (editableField && editIcon) {
      // Click on field or icon to edit
      const startEdit = () => enterEditMode(wrapper);
      editableField.addEventListener('click', startEdit);
      editIcon.addEventListener('click', startEdit);
    }
  });
}

/**
 * Renders the pins list in the sidebar
 * Main rendering function that:
 * - Clears pending animations
 * - Updates button states
 * - Handles empty state display
 * - Creates all pin items efficiently (using DocumentFragment)
 * - Attaches drag/drop and editing handlers
 * - Adds inline creation UI
 * 
 * @returns {void}
 */
function renderPins() {
  // Clear any pending animations
  clearPendingAnimations();

  const list = cachedElements.pinsList;
  if (!list) return;

  // Update button states
  updateButtonStates();

  // Handle empty state
  if (pins.length === 0) {
    renderEmptyState();
    addInlineCreationUI();
    return;
  }

  // Clear list and prepare for rendering
  list.innerHTML = '';
  const currentChatId = getCurrentChatId();
  const fragment = document.createDocumentFragment();

  // Create all pin items
  pins.forEach((pin, index) => {
    const pinItem = createPinItem(pin, index, currentChatId);
    fragment.appendChild(pinItem);
  });

  // Single DOM append for performance
  list.appendChild(fragment);

  // Attach event handlers
  attachDragAndDropHandlers();
  attachEditingHandlers();

  // Add inline creation UI
  addInlineCreationUI();
}

// Helper: Create the "+ New" button element
function createNewPinButton() {
  const newBtn = document.createElement('button');
  newBtn.id = 'inline-new-pin-btn';
  newBtn.className = 'inline-new-pin-btn';
  newBtn.textContent = '+ New';
  newBtn.title = `Create a new pin manually (${SHORTCUTS.createPin} without selection)`;
  return newBtn;
}

// Helper: Create the inline pin creation form
function createInlinePinForm() {
  const formContainer = document.createElement('div');
  formContainer.id = 'inline-pin-form';
  formContainer.className = 'inline-pin-form';
  formContainer.style.display = 'none';

  const textarea = document.createElement('textarea');
  textarea.id = 'inline-pin-textarea';
  textarea.className = 'pin-dialog-textarea';
  textarea.placeholder = 'Enter your pin text...';
  textarea.rows = 3;

  const buttons = document.createElement('div');
  buttons.className = 'pin-dialog-buttons';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'pin-dialog-button pin-dialog-button-cancel';
  cancelBtn.textContent = 'Cancel';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'pin-dialog-button pin-dialog-button-save';
  saveBtn.textContent = 'Save Pin';

  buttons.appendChild(cancelBtn);
  buttons.appendChild(saveBtn);

  formContainer.appendChild(textarea);
  formContainer.appendChild(buttons);

  return { formContainer, textarea, cancelBtn, saveBtn };
}

// Helper: Show the inline form and hide empty state
function showInlineForm(formContainer, textarea) {
  const list = cachedElements.pinsList;
  
  // Hide empty state message if present
  const emptyState = list.querySelector('.empty-state');
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  // Show form
  formContainer.style.display = 'block';
  textarea.value = '';
  textarea.focus();
}

// Helper: Hide the inline form and restore empty state if needed
function hideInlineForm(formContainer) {
  const list = cachedElements.pinsList;
  formContainer.style.display = 'none';

  // Show empty state message if no pins
  if (pins.length === 0) {
    const emptyState = list.querySelector('.empty-state');
    if (emptyState) {
      emptyState.style.display = 'block';
    }
  }
}

// Helper: Save a new pin from the inline form
function saveInlinePin(textarea, hideForm) {
  const text = textarea.value.trim();
  if (!text) {
    hideForm();
    return;
  }

  const chatId = getCurrentChatId();
  const chatTitle = getCurrentChatTitle();

  const newPin = {
    text: text,
    comment: null,
    timestamp: Date.now(),
    chatId: chatId,
    chatTitle: chatTitle,
    isManuallyCreated: true // Flag for manual creation
  };

  pins.push(newPin);
  savePins();
  renderPins();

  // Highlight the newly created pin
  const newPinIndex = pins.length - 1;
  highlightNewPin(newPinIndex);

  // If sidebar was auto-expanded (keyboard shortcut with no text), schedule auto-collapse
  if (isAutoExpanded) {
    // Wait for highlight animation to complete (1.5s) + small buffer
    autoCollapseTimeout = setTimeout(() => {
      autoCollapseSidebar();
    }, TIMINGS.AUTO_COLLAPSE_DELAY); // 2 seconds total: 1.5s animation + 0.5s buffer
  }

  hideForm();
}

// Helper: Setup event handlers for inline form
function setupInlineFormHandlers(newBtn, formContainer, textarea, cancelBtn, saveBtn) {
  const hideForm = () => hideInlineForm(formContainer);

  // Show form when + New button clicked
  newBtn.addEventListener('click', () => showInlineForm(formContainer, textarea));

  // Cancel button
  cancelBtn.addEventListener('click', hideForm);

  // Save button
  saveBtn.addEventListener('click', () => saveInlinePin(textarea, hideForm));

  // Auto-expand textarea as user types
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  });

  // Enter to save (without shift), Escape to cancel
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveBtn.click();
    } else if (e.key === 'Escape') {
      hideForm();
    }
  });
}

// Add inline pin creation UI (+ New button and inline form)
function addInlineCreationUI() {
  const list = cachedElements.pinsList;
  if (!list) return;

  // Remove existing inline UI if present
  const existingBtn = document.getElementById('inline-new-pin-btn');
  const existingForm = document.getElementById('inline-pin-form');
  if (existingBtn) existingBtn.remove();
  if (existingForm) existingForm.remove();

  // Create UI elements
  const newBtn = createNewPinButton();
  const { formContainer, textarea, cancelBtn, saveBtn } = createInlinePinForm();

  // Setup event handlers
  setupInlineFormHandlers(newBtn, formContainer, textarea, cancelBtn, saveBtn);

  // Append to DOM
  const sidebar = cachedElements.sidebar;
  if (sidebar) {
    sidebar.appendChild(newBtn);
  }
  list.appendChild(formContainer);
}

// Highlight a newly created pin with animation
function highlightNewPin(index) {
  const pinsList = cachedElements.pinsList;
  if (!pinsList) return;

  const pinItems = pinsList.querySelectorAll('.pin-item');
  const newPinElement = pinItems[index];

  if (newPinElement) {
    // Add highlight class
    newPinElement.classList.add('newly-created');

    // Check if pin is visible in the viewport
    const listRect = pinsList.getBoundingClientRect();
    const pinRect = newPinElement.getBoundingClientRect();

    // Only scroll if the pin is not fully visible
    const isFullyVisible = (
      pinRect.top >= listRect.top &&
      pinRect.bottom <= listRect.bottom
    );

    if (!isFullyVisible) {
      // Scroll into view smoothly (only when needed)
      newPinElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }

    // Clear any existing timeout
    if (currentHighlightTimeout !== null) {
      clearTimeout(currentHighlightTimeout);
    }

    // Remove class after animation completes
    currentHighlightTimeout = setTimeout(() => {
      // Check if element still exists before removing class
      if (newPinElement && newPinElement.parentNode) {
        newPinElement.classList.remove('newly-created');
      }
      currentHighlightTimeout = null;
    }, TIMINGS.HIGHLIGHT_ANIMATION_DURATION);
  }
}

// ============================================================================
// INLINE EDITING
// ============================================================================

// Enter edit mode for a pin field
function enterEditMode(wrapper) {
  const index = parseInt(wrapper.getAttribute('data-index'));
  const field = wrapper.getAttribute('data-field'); // 'comment' or 'text'
  const pin = pins[index];
  
  if (!pin) return;
  
  // Get current value
  const currentValue = field === 'comment' ? pin.comment : pin.text;
  
  // Get the editable field and icon
  const editableField = wrapper.querySelector('.pin-editable-field');
  const editIcon = wrapper.querySelector('.edit-icon');
  
  if (!editableField) return;
  
  // Fix for Firefox: Disable dragging on parent pin-item to prevent conflicts with textarea interaction
  const pinItem = wrapper.closest('.pin-item');
  if (pinItem) {
    pinItem.setAttribute('draggable', 'false');
  }
  
  // Hide the field and icon
  editableField.style.display = 'none';
  if (editIcon) editIcon.style.display = 'none';
  
  // Create textarea for editing
  const textarea = document.createElement('textarea');
  textarea.className = 'pin-edit-textarea';
  textarea.value = currentValue || '';
  textarea.style.width = '100%';
  textarea.style.minHeight = '60px';
  textarea.style.padding = '8px';
  textarea.style.border = '1px solid #10a37f';
  textarea.style.borderRadius = '4px';
  textarea.style.fontSize = '13px';
  textarea.style.background = '#1a1a1a';
  textarea.style.color = '#e5e7eb';
  textarea.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  textarea.style.resize = 'vertical';
  textarea.style.marginBottom = '8px';
  
  // Prevent drag events from interfering with text selection
  textarea.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.justifyContent = 'flex-end';
  
  // Create Save button
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'pin-edit-save-btn';
  saveBtn.style.padding = '6px 16px';
  saveBtn.style.borderRadius = '4px';
  saveBtn.style.cursor = 'pointer';
  saveBtn.style.fontSize = '13px';
  saveBtn.style.border = 'none';
  saveBtn.style.background = '#10a37f';
  saveBtn.style.color = 'white';
  saveBtn.style.fontWeight = '500';
  
  saveBtn.addEventListener('mouseenter', () => {
    saveBtn.style.background = '#0d8c6a';
  });
  saveBtn.addEventListener('mouseleave', () => {
    saveBtn.style.background = '#10a37f';
  });
  
  // Create Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'pin-edit-cancel-btn';
  cancelBtn.style.padding = '6px 16px';
  cancelBtn.style.borderRadius = '4px';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.style.fontSize = '13px';
  cancelBtn.style.border = '1px solid #3e3e3e';
  cancelBtn.style.background = '#2a2a2a';
  cancelBtn.style.color = '#ececec';
  
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.background = '#3e3e3e';
  });
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.background = '#2a2a2a';
  });
  
  // Add buttons to container
  buttonContainer.appendChild(saveBtn);
  buttonContainer.appendChild(cancelBtn);
  
  // Insert editing UI after the hidden field
  wrapper.insertBefore(textarea, editableField.nextSibling);
  wrapper.insertBefore(buttonContainer, textarea.nextSibling);
  
  // Focus the textarea and select content
  textarea.focus();
  textarea.select();
  
  // Auto-resize textarea
  const autoResize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  textarea.addEventListener('input', autoResize);
  autoResize();
  
  // Save handler
  const save = () => {
    const newValue = textarea.value.trim();
    
    if (!newValue) {
      // Don't allow empty values
      textarea.focus();
      return;
    }
    
    // Update the pin
    if (field === 'comment') {
      pin.comment = newValue;
    } else {
      pin.text = newValue;
    }
    
    // Save and re-render
    savePins();
    renderPins();
    
    // Highlight the updated pin
    highlightNewPin(index);
  };
  
  // Cancel handler
  const cancel = () => {
    // Just re-render to restore original state
    renderPins();
  };
  
  // Event listeners
  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', cancel);
  
  // Keyboard shortcuts
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter alone saves (Shift+Enter for new line)
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
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

/**
 * Creates a new pin from selected text or manual input
 * If text is empty, opens the manual creation form
 * If text is provided, shows the comment input dialog
 * Handles auto-expand/collapse of sidebar for better UX
 * 
 * @param {string} text - Selected text to create pin from, or empty for manual creation
 * @returns {void}
 */
function createPin(text) {
  const isManualCreation = !text || text.trim() === '';

  if (isManualCreation) {
    // Manual creation: expand sidebar if needed, trigger inline form
    if (!sidebarOpen) {
      // Clear any existing auto-collapse timeout
      if (autoCollapseTimeout) {
        clearTimeout(autoCollapseTimeout);
        autoCollapseTimeout = null;
      }

      // Auto-expand sidebar (sets isAutoExpanded flag)
      autoExpandSidebar();
    }

    // Trigger the inline form
    const inlineBtn = document.getElementById('inline-new-pin-btn');
    if (inlineBtn) {
      inlineBtn.click();
    }
    return; // EXIT EARLY
  }

  // Text-based creation: ORIGINAL WORKING CODE (don't change!)
  // Check if sidebar is currently collapsed
  const wasSidebarCollapsed = !sidebarOpen;

  // If collapsed, auto-expand it temporarily
  if (wasSidebarCollapsed) {
    // Clear any existing auto-collapse timeout
    if (autoCollapseTimeout) {
      clearTimeout(autoCollapseTimeout);
      autoCollapseTimeout = null;
    }

    autoExpandSidebar();
  }

  showCommentInput(text, wasSidebarCollapsed);
}

// Show comment input field
function showCommentInput(selectedText, wasSidebarCollapsed = false) {
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
      selectedText: selectedText, // Store original selected text for editing logic
      comment: comment || null,
      timestamp: Date.now(),
      chatId: chatId,
      chatTitle: chatTitle
    };

    pins.push(newPin);

    savePins();
    renderPins();

    // Highlight the newly created pin
    const newPinIndex = pins.length - 1;
    highlightNewPin(newPinIndex);

    // If sidebar was auto-expanded, schedule auto-collapse after animation
    if (wasSidebarCollapsed && isAutoExpanded) {
      // Wait for highlight animation to complete (1.5s) + small buffer
      autoCollapseTimeout = setTimeout(() => {
        autoCollapseSidebar();
      }, TIMINGS.AUTO_COLLAPSE_DELAY); // 2 seconds total: 1.5s animation + 0.5s buffer
    }

    cleanup();
    inputContainer.remove();
  });

  // Cancel
  document.getElementById('pin-cancel').addEventListener('click', () => {
    // If sidebar was auto-expanded, collapse it back
    if (wasSidebarCollapsed && isAutoExpanded) {
      autoCollapseSidebar();
    }
    cleanup();
    inputContainer.remove();
  });

  // Save on Enter, Cancel on Escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('pin-save').click();
    } else if (e.key === 'Escape') {
      // If sidebar was auto-expanded, collapse it back
      if (wasSidebarCollapsed && isAutoExpanded) {
        autoCollapseSidebar();
      }
      cleanup();
      inputContainer.remove();
    }
  });
}

// ============================================================================
// PIN OPERATIONS
// ============================================================================

/**
 * Uses a pin by filling ChatGPT input and submitting
 * If ChatGPT is currently generating, queues the pin instead
 * Optionally deletes the pin after use
 * 
 * @param {number} index - Index of pin in pins array
 * @param {boolean} [shouldDelete=false] - Whether to delete pin after use
 * @returns {void}
 */
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

/**
 * Watches for ChatGPT to finish generating so queued pin can be submitted
 * Polls every 500ms until ChatGPT is ready or queue is cancelled
 * Automatically submits the queued pin when ChatGPT becomes available
 * 
 * @returns {void}
 */
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
  debugLog("Prompt Pins: Message received in content script:", message);

  if (message.action === 'createPin') {
    // Context menu: create pin from selected text
    createPin(message.selectedText);
    return Promise.resolve({success: true});
  } else if (message.action === 'create-pin') {
    // Keyboard shortcut: Ctrl+Shift+K - create pin from current selection
    debugLog('Prompt Pins: Create pin shortcut triggered');
    const selectedText = getSelectedText();
    if (selectedText) {
      debugLog('Prompt Pins: Text selected, creating pin with context');
      createPin(selectedText);
    } else {
      debugLog('Prompt Pins: No text selected, opening manual creation form');
      createPin(''); // Empty string triggers manual creation
    }
    return Promise.resolve({success: true});
  } else if (message.action === 'send-immediately') {
    // Keyboard shortcut: Ctrl+Shift+L - send selected text immediately
    debugLog('Prompt Pins: Send immediately shortcut triggered');
    sendImmediately();
    return Promise.resolve({success: true});
  } else if (message.action === 'use-next-pin') {
    // Keyboard shortcut: Ctrl+Shift+U - use next pin
    debugLog('Prompt Pins: Use next pin shortcut triggered');
    if (pins.length > 0) {
      usePin(0, true);
    } else {
      debugLog('Prompt Pins: No pins available');
    }
    return Promise.resolve({success: true});
  }
});

// ============================================================================
// CHAT CHANGE DETECTION
// ============================================================================

// Watch for URL changes (when user switches chats)
let lastChatId = getCurrentChatId();
let chatChangeInterval = null;

function checkForChatChange() {
  const currentChatId = getCurrentChatId();
  if (currentChatId !== lastChatId) {
    lastChatId = currentChatId;
    // Re-render pins to update cross-chat styling
    renderPins();
  }
}

// Start watching for chat changes
function startChatChangeWatcher() {
  // Clear any existing interval first
  if (chatChangeInterval) {
    clearInterval(chatChangeInterval);
  }
  chatChangeInterval = setInterval(checkForChatChange, TIMINGS.CHAT_CHANGE_CHECK);
}

// Stop watching for chat changes (cleanup)
function stopChatChangeWatcher() {
  if (chatChangeInterval) {
    clearInterval(chatChangeInterval);
    chatChangeInterval = null;
  }
}

// Start watching for chat changes on load
startChatChangeWatcher();

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize or reconnect to existing sidebar
async function initializeSidebar() {
  try {
    // Load saved sidebar state first
    await loadSidebarState();

    // Check if sidebar already exists
    const existingSidebar = document.getElementById('prompt-pins-sidebar');

    if (existingSidebar) {
      debugLog('Prompt Pins: Reconnecting to existing sidebar');

      // Reconnect to cached elements
      cachedElements.sidebar = existingSidebar;
      cachedElements.pinsList = document.getElementById('pins-list');
      cachedElements.nextBtn = document.getElementById('next-pin');
      cachedElements.clearBtn = document.getElementById('clear-all-pins');
      cachedElements.toggleBtn = document.getElementById('toggle-pins');

      // Apply saved sidebar state to existing sidebar
      if (!sidebarOpen) {
        existingSidebar.classList.add('collapsed');
        if (cachedElements.toggleBtn) {
          updateToggleButton(cachedElements.toggleBtn, false);
        }
      } else {
        existingSidebar.classList.remove('collapsed');
        if (cachedElements.toggleBtn) {
          updateToggleButton(cachedElements.toggleBtn, true);
        }
      }

      // Reattach event listeners (in case they were lost)
      if (cachedElements.toggleBtn) {
        cachedElements.toggleBtn.addEventListener('click', toggleSidebar);
      }
      if (cachedElements.clearBtn) {
        cachedElements.clearBtn.addEventListener('click', confirmClearAll);
      }
      if (cachedElements.nextBtn) {
        cachedElements.nextBtn.addEventListener('click', () => {
          if (pins.length > 0) {
            usePin(0, true);
          }
        });
      }

      // Load and render pins
      await loadPins();
    } else {
      // Create new sidebar
      createSidebar();
    }

    // Start login state watcher
    startLoginStateWatcher();
  } catch (error) {
    console.error('Prompt Pins: Failed to initialize sidebar:', error);
    // Try to create sidebar anyway as fallback
    try {
      createSidebar();
      startLoginStateWatcher();
    } catch (fallbackError) {
      console.error('Prompt Pins: Critical initialization failure:', fallbackError);
    }
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
  initializeSidebar();
}
