console.log("🚀 ChatGPT Prompt Enhancer: Content script loaded!");
console.log("Current URL:", window.location.href);

// Function to find ChatGPT input element
function findChatGPTInput() {
  const selectors = [
    '#prompt-textarea',
    'textarea[data-id="root"]',
    'textarea[placeholder*="System: Message"]',
    'textarea[placeholder*="Send a message"]',
    'div[contenteditable="true"]',
    'textarea',
    'input[type="text"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`✅ Found input with selector: ${selector}`, element);
      return element;
    }
  }

  console.log("❌ No input element found");
  return null;
}

// Create in-page popup for prompt enhancement
function createInPagePopup() {
  const popup = document.createElement('div');
  popup.id = 'enhance-popup';
  popup.style.cssText = `
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    background: white !important;
    border-radius: 12px !important;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
    border: 1px solid #e5e7eb !important;
    z-index: 999999 !important;
    padding: 0 !important;
    min-width: 400px !important;
    max-width: 500px !important;
    display: none !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  `;

  popup.innerHTML = `
    <div style="background: linear-gradient(135deg, #667eea 50%); color: white; padding: 16px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 600;">✨ Enhance Your Prompt</h3>
      <button id="close-popup" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">×</button>
    </div>
    <div style="padding: 20px;">
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Current Role</label>
        <div id="current-role" style="background: #f3f4f6; padding: 8px 12px; border-radius: 6px; font-size: 14px; color: #1f2937; border: 1px solid #d1d5db;">Loading...</div>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em;">Your Prompt</label>
        <textarea id="prompt-input" placeholder="Enter your prompt idea..." style="width: 100%; height: 80px; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 14px; resize: none; font-family: inherit; box-sizing: border-box;" maxlength="500"></textarea>
        <div style="text-align: right; font-size: 11px; color: #6b7280; margin-top: 4px;">
          <span id="char-count">0</span>/500
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="enhance-btn" style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s ease;">
          🚀 Enhance Prompt
        </button>
        <button id="cancel-btn" style="background: #6b7280; color: white; border: none; padding: 12px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s ease;">
          Cancel
        </button>
      </div>
      <div id="loading-state" style="display: none; text-align: center; margin-top: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #cbd5e1; border-top: 2px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></div>
        <span style="color: #64748b; font-size: 14px;">Enhancing your prompt...</span>
      </div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      #enhance-btn:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3) !important;
      }
      #cancel-btn:hover {
        background: #4b5563 !important;
      }
      #close-popup:hover {
        background: rgba(255,255,255,0.3) !important;
      }
    </style>
  `;

  document.body.appendChild(popup);
  return popup;
}

// Function to inject the enhance icon near input
function injectEnhanceIcon() {
  // Remove existing elements
  const existingIcon = document.getElementById("enhance-icon");
  const existingPopup = document.getElementById("enhance-popup");
  if (existingIcon) existingIcon.remove();
  if (existingPopup) existingPopup.remove();

  const inputElement = findChatGPTInput();
  if (!inputElement) {
    console.log("❌ Cannot inject icon - no input element found");
    return false;
  }

  // Find the input container to position icon relative to it
  const inputContainer = inputElement.closest('form') || 
                        inputElement.closest('div[data-testid]') || 
                        inputElement.closest('.relative') ||
                        inputElement.parentElement;

  if (!inputContainer) {
    console.log("❌ Cannot find input container");
    return false;
  }

  console.log("🎯 Input container found, creating icon...");

  // Create the enhance icon
  const icon = document.createElement("button");
  icon.id = "enhance-icon";
  icon.innerHTML = "✨";
  icon.title = "Enhance Prompt with AI";
  
  // Position icon inside the input area
  icon.style.cssText = `
    position: absolute !important;
    right: 92px !important;
    top: 74% !important;
    transform: translateY(-50%) !important;
    padding: 8px !important;
    border-radius: 6px !important;
    
    color: #374151 !important;
    
    cursor: pointer !important;
    font-size: 14px !important;
    transition: all 0.2s ease !important;
    width: 32px !important;
    height: 32px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 10 !important;
    opacity: 0.7 !important;
  `;

  // Make sure the container is positioned relative
  if (getComputedStyle(inputContainer).position === 'static') {
    inputContainer.style.position = 'relative';
  }

  // Add hover effects
  icon.addEventListener("mouseenter", () => {
    icon.style.background = "rgba(59, 130, 246, 0.1) !important";
    icon.style.borderColor = "rgba(59, 130, 246, 0.3) !important";
    icon.style.opacity = "1 !important";
    icon.style.transform = "translateY(-50%) scale(1.1) !important";
  });

  icon.addEventListener("mouseleave", () => {
    icon.style.background = "rgba(55, 65, 81, 0.1) !important";
    icon.style.borderColor = "rgba(209, 213, 219, 0.3) !important";
    icon.style.opacity = "0.7 !important";
    icon.style.transform = "translateY(-50%) scale(1) !important";
  });

  // Create popup
  const popup = createInPagePopup();

  // Handle icon click
  icon.addEventListener("click", handleIconClick);

  function handleIconClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🎯 Icon clicked, showing popup...");

    // Show popup
    popup.style.display = 'block';

    // Load and display current role
    chrome.storage.local.get("selectedRole", (result) => {
      const currentRole = result.selectedRole || "Developer";
      const roleDisplay = document.getElementById('current-role');
      if (roleDisplay) {
        roleDisplay.textContent = `👤 ${currentRole}`;
        console.log("✅ Role loaded:", currentRole);
      }
    });

    // Copy ChatGPT input to popup textarea
    const promptInput = document.getElementById('prompt-input');
    if (promptInput && inputElement) {
      const chatGptText = inputElement.tagName === "TEXTAREA" || inputElement.tagName === "INPUT" 
        ? inputElement.value 
        : inputElement.textContent;
      promptInput.value = chatGptText || '';
      const charCountEl = document.getElementById('char-count');
      if (charCountEl) {
        charCountEl.textContent = promptInput.value.length;
      }
      console.log("📋 Copied ChatGPT input to popup:", chatGptText);
    }

    setupPopupEventListeners(popup, icon);
    
    // Focus on input after a short delay
    setTimeout(() => {
      if (promptInput) {
        promptInput.focus();
      }
    }, 150);
  }

  function setupPopupEventListeners(popup, icon) {
    const promptInput = document.getElementById('prompt-input');
    const charCount = document.getElementById('char-count');
    const enhanceBtn = document.getElementById('enhance-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const closeBtn = document.getElementById('close-popup');
    const loadingState = document.getElementById('loading-state');

    // Remove existing listeners to prevent duplicates
    const newPromptInput = promptInput.cloneNode(true);
    const newEnhanceBtn = enhanceBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    const newCloseBtn = closeBtn.cloneNode(true);
    
    promptInput.parentNode.replaceChild(newPromptInput, promptInput);
    enhanceBtn.parentNode.replaceChild(newEnhanceBtn, enhanceBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    // Character counter
    newPromptInput.addEventListener('input', () => {
      const charCountEl = document.getElementById('char-count');
      if (charCountEl) {
        charCountEl.textContent = newPromptInput.value.length;
      }
    });

    // Close popup function
    const closePopup = () => {
      console.log("🚪 Closing popup...");
      popup.style.display = 'none';
      newPromptInput.value = '';
      const charCountEl = document.getElementById('char-count');
      if (charCountEl) charCountEl.textContent = '0';
      if (loadingState) loadingState.style.display = 'none';
    };

    newCancelBtn.addEventListener('click', closePopup);
    newCloseBtn.addEventListener('click', closePopup);

    // Enhance button click
    newEnhanceBtn.addEventListener('click', () => {
      const userPrompt = newPromptInput.value.trim();
      console.log("🚀 Enhance clicked with prompt:", userPrompt);
      
      if (!userPrompt) {
        newPromptInput.focus();
        newPromptInput.style.borderColor = '#ef4444';
        setTimeout(() => {
          newPromptInput.style.borderColor = '#d1d5db';
        }, 2000);
        return;
      }

      // Show loading state
      if (loadingState) {
        loadingState.style.display = 'block';
      }
      newEnhanceBtn.disabled = true;
      newEnhanceBtn.style.opacity = '0.6';
      console.log("⏳ Loading state activated");

      // Get role from storage and send request
      chrome.storage.local.get("selectedRole", (result) => {
        const role = result.selectedRole || "Developer";
        console.log("📤 Sending message with role:", role);

        chrome.runtime.sendMessage(
          {
            type: "GENERATE_PROMPT",
            payload: {
              role,
              input: userPrompt,
            },
          },
          (response) => {
            console.log("📥 Response received:", response);
            
            if (loadingState) loadingState.style.display = 'none';
            newEnhanceBtn.disabled = false;
            newEnhanceBtn.style.opacity = '1';

            if (chrome.runtime.lastError) {
              console.error("❌ Runtime error:", chrome.runtime.lastError);
              alert("Extension error: " + chrome.runtime.lastError.message);
              return;
            }

            if (response && response.prompt) {
              const inputField = findChatGPTInput();
              if (inputField) {
                if (inputField.tagName === "TEXTAREA" || inputField.tagName === "INPUT") {
                  inputField.value = response.prompt;
                  inputField.dispatchEvent(new Event("input", { bubbles: true }));
                } else if (inputField.contentEditable === "true") {
                  inputField.textContent = response.prompt;
                  inputField.dispatchEvent(new Event("input", { bubbles: true }));
                }

                inputField.focus();
                closePopup();
                
                // // Show success feedback
                // icon.innerHTML = "✅";
                // icon.style.background = "rgba(16, 185, 129, 0.1)";
                // icon.style.borderColor = "rgba(16, 185, 129, 0.3)";
                // setTimeout(() => {
                //   icon.innerHTML = "✨";
                //   icon.style.background = "rgba(55, 65, 81, 0.1)";
                //   icon.style.borderColor = "rgba(209, 213, 219, 0.3)";
                // }, 3000);
                
                console.log("✅ Prompt injected successfully");
              } else {
                alert("Could not inject prompt: No input field found");
              }
            } else {
              alert("Failed to enhance prompt. Please try again.");
            }
          }
        );
      });
    });
  }

  // Add to container
  inputContainer.appendChild(icon);
  console.log("🎉 Enhance icon successfully added to input area!");
  
  return true;
}

// Close popup when clicking outside
document.addEventListener('click', (e) => {
  const popup = document.getElementById('enhance-popup');
  const icon = document.getElementById('enhance-icon');
  
  if (popup && popup.style.display === 'block' && 
      !popup.contains(e.target) && 
      e.target !== icon) {
    console.log("🚪 Closing popup (clicked outside)");
    popup.style.display = 'none';
  }
});

// Main injection function with retries
function attemptInjection() {
  let attempts = 0;
  const maxAttempts = 15;
  
  const tryInject = () => {
    attempts++;
    console.log(`🔄 Injection attempt ${attempts}/${maxAttempts}`);
    
    if (injectEnhanceIcon()) {
      console.log("🎯 Icon injection successful!");
      return;
    }
    
    if (attempts < maxAttempts) {
      const delay = Math.min(1000 * Math.min(attempts, 3), 3000);
      console.log(`⏱️ Retrying in ${delay}ms...`);
      setTimeout(tryInject, delay);
    } else {
      console.log("❌ Failed to inject icon after all attempts");
      console.log("🔍 Debug info:");
      console.log("- Textareas found:", document.querySelectorAll('textarea').length);
      console.log("- Contenteditable elements:", document.querySelectorAll('[contenteditable="true"]').length);
      console.log("- All input elements:", document.querySelectorAll('input').length);
    }
  };
  
  setTimeout(tryInject, 1000);
}

// Initialize when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attemptInjection);
} else {
  attemptInjection();
}

// Handle navigation changes (ChatGPT is a SPA)
let currentUrl = location.href;
const navigationObserver = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log("🔄 Navigation detected:", currentUrl);
    setTimeout(attemptInjection, 2000);
  }
});

// Watch for new elements being added
const contentObserver = new MutationObserver((mutations) => {
  let shouldRetry = false;
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches && (
            node.matches('textarea') ||
            node.matches('[contenteditable="true"]') ||
            node.matches('input') ||
            node.querySelector('textarea') ||
            node.querySelector('[contenteditable="true"]') ||
            node.querySelector('input')
          )) {
            shouldRetry = true;
            break;
          }
        }
      }
      if (shouldRetry) break;
    }
  }
  
  if (shouldRetry && !document.getElementById("enhance-icon")) {
    console.log("🆕 New input elements detected, retrying injection...");
    setTimeout(attemptInjection, 1500);
  }
});

// Start observers
setTimeout(() => {
  navigationObserver.observe(document, { subtree: true, childList: true });
  contentObserver.observe(document.body, { childList: true, subtree: true });
  console.log("👁️ Observers started");
}, 1000);

console.log("🔧 ChatGPT Prompt Enhancer setup complete!");