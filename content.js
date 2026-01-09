// State
let pins = [];
let sidebarOpen = true;

// Create and inject the sidebar
function createSidebar() {
  const sidebar = document.createElement('div');
  sidebar.id = 'prompt-pins-sidebar';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'pins-header';
  
  const headerTitle = document.createElement('div');
  headerTitle.className = 'pins-header-title';
  
  const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgIcon.setAttribute('class', 'pin-icon');
  svgIcon.setAttribute('width', '20');
  svgIcon.setAttribute('height', '20');
  svgIcon.setAttribute('viewBox', '0 0 24 24');
  svgIcon.setAttribute('fill', 'none');
  svgIcon.setAttribute('stroke', 'currentColor');
  svgIcon.setAttribute('stroke-width', '2');
  
  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M12 2v20');
  svgIcon.appendChild(path1);
  
  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path2.setAttribute('d', 'M16 6l-4 4-4-4');
  svgIcon.appendChild(path2);
  
  const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path3.setAttribute('d', 'M16 18l-4-4-4 4');
  svgIcon.appendChild(path3);
  
  const h3 = document.createElement('h3');
  h3.textContent = 'Prompt Pins';
  
  headerTitle.appendChild(svgIcon);
  headerTitle.appendChild(h3);
  
  const headerButtons = document.createElement('div');
  headerButtons.className = 'header-buttons';
  
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'toggle-pins';
  toggleBtn.title = 'Toggle sidebar';
  toggleBtn.textContent = '−';
  
  headerButtons.appendChild(toggleBtn);
  header.appendChild(headerTitle);
  header.appendChild(headerButtons);
  
  // Create next pin button
  const nextBtn = document.createElement('button');
  nextBtn.id = 'next-pin';
  nextBtn.className = 'next-pin-btn';
  nextBtn.textContent = 'Next Pin →';
  
  // Create pins list
  const pinsList = document.createElement('div');
  pinsList.id = 'pins-list';
  pinsList.className = 'pins-list';
  
  // Assemble sidebar
  sidebar.appendChild(header);
  sidebar.appendChild(nextBtn);
  sidebar.appendChild(pinsList);
  
  document.body.appendChild(sidebar);
  
  // Attach event listeners
  toggleBtn.addEventListener('click', toggleSidebar);
  
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
  const sidebar = document.getElementById('prompt-pins-sidebar');
  const toggle = document.getElementById('toggle-pins');
  
  if (!sidebar || !toggle) {
    console.error("Sidebar or toggle button not found");
    return;
  }
  
  if (sidebarOpen) {
    sidebar.classList.remove('collapsed');
    toggle.textContent = '−';
  } else {
    sidebar.classList.add('collapsed');
    toggle.textContent = '+';
  }
}

// Load pins from storage
async function loadPins() {
  try {
    const result = await browser.storage.local.get('pins');
    pins = result.pins || [];
    renderPins();
  } catch (error) {
    console.error("Failed to load pins:", error);
    pins = [];
    renderPins();
  }
}

// Save pins to storage
async function savePins() {
  try {
    await browser.storage.local.set({ pins });
  } catch (error) {
    console.error("Failed to save pins:", error);
  }
}

// Render the pins list
function renderPins() {
  const list = document.getElementById('pins-list');
  const nextBtn = document.getElementById('next-pin');
  
  if (!list) return;
  
  // Enable/disable next button
  if (nextBtn) {
    nextBtn.disabled = pins.length === 0;
  }
  
  if (pins.length === 0) {
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-state';
    emptyDiv.textContent = 'No pins yet. Highlight text and right-click to create one.';
    list.appendChild(emptyDiv);
    return;
  }
  
  // Clear list
  while (list.firstChild) {
    list.removeChild(list.firstChild);
  }
  
  // Create pin items
  pins.forEach((pin, index) => {
    const pinItem = document.createElement('div');
    pinItem.className = 'pin-item';
    pinItem.setAttribute('data-index', index);
    pinItem.setAttribute('draggable', 'true');
    
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
    
    const pinActions = document.createElement('div');
    pinActions.className = 'pin-actions';
    
    const useBtn = document.createElement('button');
    useBtn.className = 'use-pin';
    useBtn.setAttribute('data-index', index);
    useBtn.textContent = 'Use';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-pin';
    deleteBtn.setAttribute('data-index', index);
    deleteBtn.textContent = '×';
    
    pinActions.appendChild(useBtn);
    pinActions.appendChild(deleteBtn);
    pinItem.appendChild(pinActions);
    
    const pinTimestamp = document.createElement('div');
    pinTimestamp.className = 'pin-timestamp';
    pinTimestamp.textContent = new Date(pin.timestamp).toLocaleString();
    pinItem.appendChild(pinTimestamp);
    
    list.appendChild(pinItem);
  });
  
  // Add event listeners
  list.querySelectorAll('.use-pin').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      usePin(index, true);
    });
  });
  
  list.querySelectorAll('.delete-pin').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      deletePin(index);
    });
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

let draggedElement = null;
let draggedIndex = null;

function handleDragStart(e) {
  draggedElement = e.currentTarget;
  draggedIndex = parseInt(e.currentTarget.dataset.index);
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  // Note: We use index-based reordering, so we don't need to transfer HTML
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

// Create a new pin
function createPin(text) {
  showCommentInput(text);
}

// Show comment input field
function showCommentInput(selectedText) {
  if (!selectedText || typeof selectedText !== 'string' || selectedText.trim().length === 0) {
    console.error("Invalid selectedText:", selectedText);
    return;
  }
  
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
    
    pins.push({
      text: selectedText,
      comment: comment || null,
      timestamp: Date.now()
    });
    
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

// Use a pin (fill the ChatGPT input)
function usePin(index, shouldDelete = false) {
  if (index < 0 || index >= pins.length) {
    console.error("Invalid pin index:", index);
    return;
  }
  
  const pin = pins[index];
  if (!pin) {
    console.error("Pin not found at index:", index);
    return;
  }
  
  // ChatGPT uses a contenteditable div, not a textarea
  let inputElement = document.querySelector('#prompt-textarea');
  
  if (!inputElement) {
    inputElement = document.querySelector('[contenteditable="true"]');
  }
  
  if (inputElement) {
    
    // Clear the input
    while (inputElement.firstChild) {
      inputElement.removeChild(inputElement.firstChild);
    }
    
    if (pin.comment) {
      // Create paragraphs with an empty one in between
      const regardingP = document.createElement('p');
      regardingP.textContent = `Regarding: "${pin.text}"`;
      inputElement.appendChild(regardingP);
      
      // Add empty paragraph for spacing
      const emptyP = document.createElement('p');
      emptyP.appendChild(document.createElement('br'));
      inputElement.appendChild(emptyP);
      
      const commentP = document.createElement('p');
      commentP.textContent = pin.comment;
      inputElement.appendChild(commentP);
    } else {
      // Just the text
      const p = document.createElement('p');
      p.textContent = pin.text;
      inputElement.appendChild(p);
    }
    
    // Trigger input events
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Focus the element
    inputElement.focus();
    
    // Move cursor to end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(inputElement);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Auto-submit after brief delay
    setTimeout(() => {
      const sendButton = document.querySelector('button[data-testid="send-button"]') 
        || document.querySelector('button[aria-label="Send prompt"]')
        || document.querySelector('button svg[class*="icon-send"]')?.closest('button');
      
      if (sendButton && !sendButton.disabled) {
        sendButton.click();
      }
    }, 100);
    
    // Delete the pin if requested
    if (shouldDelete) {
      deletePin(index);
    }
  }
}

// Delete a pin
function deletePin(index) {
  if (index < 0 || index >= pins.length) {
    console.error("Invalid pin index for deletion:", index);
    return;
  }
  pins.splice(index, 1);
  savePins();
  renderPins();
}

// Listen for messages from background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'createPin') {
    if (!message.selectedText || typeof message.selectedText !== 'string') {
      console.error("Invalid selectedText in message:", message);
      return Promise.resolve({success: false, error: "Invalid selectedText"});
    }
    createPin(message.selectedText);
    return Promise.resolve({success: true});
  }
  return Promise.resolve({success: false, error: "Unknown action"});
});

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createSidebar);
} else {
  createSidebar();
}