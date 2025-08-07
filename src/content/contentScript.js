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

// Create loading indicator
function createLoadingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'enhance-loading';
  indicator.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    color: white !important;
    padding: 12px 16px !important;
    border-radius: 8px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    z-index: 999999 !important;
    display: none !important;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
  `;
  
  indicator.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span>Enhancing prompt...</span>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
  document.body.appendChild(indicator);
  return indicator;
}

// Show success message
function showSuccessMessage() {
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
    color: white !important;
    padding: 12px 16px !important;
    border-radius: 8px !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    z-index: 999999 !important;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    transform: translateY(-20px) !important;
    opacity: 0 !important;
    transition: all 0.3s ease !important;
  `;
  
  message.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span>✅</span>
      <span>Prompt enhanced successfully!</span>
    </div>
  `;
  
  document.body.appendChild(message);
  
  // Animate in
  setTimeout(() => {
    message.style.transform = 'translateY(0)';
    message.style.opacity = '1';
  }, 100);
  
  // Remove after 3 seconds
  setTimeout(() => {
    message.style.transform = 'translateY(-20px)';
    message.style.opacity = '0';
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 300);
  }, 3000);
}

// Function to inject the enhance icon near input
function injectEnhanceIcon() {
  // Remove existing elements
  const existingIcon = document.getElementById("enhance-icon");
  const existingLoading = document.getElementById("enhance-loading");
  if (existingIcon) existingIcon.remove();
  if (existingLoading) existingLoading.remove();

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
    background: rgba(55, 65, 81, 0.1) !important;
    border: 1px solid rgba(209, 213, 219, 0.3) !important;
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

  // Create loading indicator
  const loadingIndicator = createLoadingIndicator();

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

  // Handle icon click - Direct enhancement
  icon.addEventListener("click", handleDirectEnhancement);

  function handleDirectEnhancement(e) {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🎯 Icon clicked, starting direct enhancement...");

    // Get current text from input
    const inputField = findChatGPTInput();
    if (!inputField) {
      alert("Could not find input field. Please try again.");
      return;
    }

    const currentText = inputField.tagName === "TEXTAREA" || inputField.tagName === "INPUT" 
      ? inputField.value 
      : inputField.textContent;

    if (!currentText || currentText.trim() === '') {
      // Highlight input field if empty
      inputField.style.borderColor = '#ef4444';
      inputField.focus();
      setTimeout(() => {
        inputField.style.borderColor = '';
      }, 2000);
      return;
    }

    // Show loading indicator
    loadingIndicator.style.display = 'block';
    icon.style.opacity = '0.4';
    icon.style.cursor = 'not-allowed';
    
    console.log("⏳ Loading state activated");
    console.log("📝 Current text:", currentText);

    // Get role and userId from storage and send request
    chrome.storage.local.get(["selectedRole", "userId"], (result) => {
      const role = result.selectedRole || "Developer";
      const userId = result.userId;
      console.log("📤 Sending message with role:", role, "userId:", userId);

      chrome.runtime.sendMessage(
        {
          type: "GENERATE_PROMPT",
          payload: {
            role,
            input: currentText.trim(),
            user_id: userId,
          },
        },
        (response) => {
          console.log("📥 Response received:", response);
          
          // Hide loading indicator
          loadingIndicator.style.display = 'none';
          icon.style.opacity = '0.7';
          icon.style.cursor = 'pointer';

          if (chrome.runtime.lastError) {
            console.error("❌ Runtime error:", chrome.runtime.lastError);
            alert("Extension error: " + chrome.runtime.lastError.message);
            return;
          }

          if (response && response.prompt) {
            const inputField = findChatGPTInput();
            if (inputField) {
              // Clear and set new enhanced prompt
              if (inputField.tagName === "TEXTAREA" || inputField.tagName === "INPUT") {
                inputField.value = response.prompt;
                inputField.dispatchEvent(new Event("input", { bubbles: true }));
              } else if (inputField.contentEditable === "true") {
                inputField.textContent = response.prompt;
                inputField.dispatchEvent(new Event("input", { bubbles: true }));
              }

              inputField.focus();
              
              // Show success feedback
              showSuccessMessage();
              
              // Temporarily change icon to success
              icon.innerHTML = "✅";
              icon.style.background = "rgba(16, 185, 129, 0.1) !important";
              icon.style.borderColor = "rgba(16, 185, 129, 0.3) !important";
              setTimeout(() => {
                icon.innerHTML = "✨";
                icon.style.background = "rgba(55, 65, 81, 0.1) !important";
                icon.style.borderColor = "rgba(209, 213, 219, 0.3) !important";
              }, 2000);
              
              console.log("✅ Prompt enhanced and injected successfully");
            } else {
              alert("Could not inject enhanced prompt: No input field found");
            }
          } else {
            alert("Failed to enhance prompt. Please try again.");
          }
        }
      );
    });
  }

  // Add to container
  inputContainer.appendChild(icon);
  console.log("🎉 Enhance icon successfully added to input area!");
  
  return true;
}

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