console.log("🚀 ChatGPT Prompt Enhancer: Content script loaded!");
console.log("Current URL:", window.location.href);

// Function to find ChatGPT input element
function findChatGPTInput() {
  // Try multiple selectors for different ChatGPT versions
  const selectors = [
    '#prompt-textarea',
    'textarea[data-id="root"]',
    'textarea[placeholder*="Message"]',
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

// Function to inject the enhance icon
function injectEnhanceIcon() {
  // Remove existing icon
  const existingIcon = document.getElementById("enhance-icon");
  if (existingIcon) {
    existingIcon.remove();
    console.log("🗑️ Removed existing icon");
  }

  // Find input element
  const inputElement = findChatGPTInput();
  if (!inputElement) {
    console.log("❌ Cannot inject icon - no input element found");
    return false;
  }

  console.log("🎯 Input element found, creating icon...");

  // Create the enhance icon
  const icon = document.createElement("button");
  icon.id = "enhance-icon";
  icon.innerHTML = "✨";
  icon.title = "Enhance Prompt";
  
  // Use the same styling approach that worked in the test
  icon.style.cssText = `
    position: fixed !important;
    top: 50% !important;
    right: 20px !important;
    transform: translateY(-50%) !important;
    padding: 12px !important;
    border-radius: 50% !important;
    background: #10a37f !important;
    color: white !important;
    border: none !important;
    cursor: pointer !important;
    font-size: 20px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    transition: all 0.2s ease !important;
    width: 50px !important;
    height: 50px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 999999 !important;
    opacity: 0.9 !important;
  `;

  // Add hover effects
  icon.addEventListener("mouseenter", () => {
    icon.style.background = "#0d8a6f !important";
    icon.style.transform = "translateY(-50%) scale(1.1) !important";
    icon.style.opacity = "1 !important";
  });

  icon.addEventListener("mouseleave", () => {
    icon.style.background = "#10a37f !important";
    icon.style.transform = "translateY(-50%) scale(1) !important";
    icon.style.opacity = "0.9 !important";
  });

  // Handle icon click
  icon.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("✨ Enhance icon clicked!");
    
    const userPrompt = prompt("Enter the idea or rough prompt you'd like to refine:");
    if (userPrompt && userPrompt.trim()) {
      console.log("📝 User prompt:", userPrompt);
      
      // Show loading state
      icon.innerHTML = "⏳";
      icon.style.background = "#666 !important";
      
      chrome.runtime.sendMessage({
        type: "ENHANCE_PROMPT",
        payload: userPrompt.trim()
      }, (response) => {
        // Reset icon
        icon.innerHTML = "✨";
        icon.style.background = "#10a37f !important";
        
        console.log("📨 Received response:", response);
        
        if (chrome.runtime.lastError) {
          console.error("❌ Runtime error:", chrome.runtime.lastError);
          alert("Error communicating with extension background script");
          return;
        }
        
        if (response && response.prompt) {
          // Find the current input element again (might have changed)
          const currentInput = findChatGPTInput();
          
          if (currentInput) {
            // Handle different input types
            if (currentInput.tagName === 'TEXTAREA' || currentInput.tagName === 'INPUT') {
              currentInput.value = response.prompt;
              currentInput.dispatchEvent(new Event("input", { bubbles: true }));
              currentInput.dispatchEvent(new Event("change", { bubbles: true }));
            } else if (currentInput.contentEditable === 'true') {
              currentInput.textContent = response.prompt;
              currentInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
            
            currentInput.focus();
            console.log("✅ Enhanced prompt injected successfully!");
            
            // Show success feedback
            icon.innerHTML = "✅";
            setTimeout(() => {
              icon.innerHTML = "✨";
            }, 2000);
          } else {
            console.error("❌ Could not find input to inject enhanced prompt");
            alert("Could not find input field to insert enhanced prompt");
          }
        } else {
          console.error("❌ Invalid response format:", response);
          alert("Failed to enhance prompt - invalid response");
        }
      });
    }
  });

  // Add to page
  document.body.appendChild(icon);
  console.log("🎉 Enhance icon successfully added to page!");
  
  return true;
}

// Main injection function with retries
function attemptInjection() {
  let attempts = 0;
  const maxAttempts = 10;
  
  const tryInject = () => {
    attempts++;
    console.log(`🔄 Injection attempt ${attempts}/${maxAttempts}`);
    
    if (injectEnhanceIcon()) {
      console.log("🎯 Icon injection successful!");
      return;
    }
    
    if (attempts < maxAttempts) {
      const delay = Math.min(1000 * attempts, 5000); // Progressive delay
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
  
  // Start first attempt after a short delay
  setTimeout(tryInject, 500);
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
    setTimeout(attemptInjection, 1000);
  }
});

// Watch for new elements being added (like when starting a new chat)
const contentObserver = new MutationObserver((mutations) => {
  let shouldRetry = false;
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if new input elements were added
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
  
  // Only retry if we don't already have an icon
  if (shouldRetry && !document.getElementById("enhance-icon")) {
    console.log("🆕 New input elements detected, retrying injection...");
    setTimeout(attemptInjection, 1000);
  }
});

// Start observers
setTimeout(() => {
  navigationObserver.observe(document, { subtree: true, childList: true });
  contentObserver.observe(document.body, { childList: true, subtree: true });
  console.log("👁️ Observers started");
}, 1000);

console.log("🔧 ChatGPT Prompt Enhancer setup complete!");