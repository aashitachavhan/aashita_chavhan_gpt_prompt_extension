console.log("ChatGPT Prompt Enhancer: Content script loaded!");

// Simple function to inject the enhance icon
function injectEnhanceIcon() {
  // Remove existing icon if it exists
  const existingIcon = document.getElementById("enhance-icon");
  if (existingIcon) {
    existingIcon.remove();
  }

  // Find the ChatGPT textarea
  const textarea = document.querySelector('textarea[data-id="root"]') ||
                  document.querySelector('textarea[placeholder*="Message"]') ||
                  document.querySelector('textarea[placeholder*="Send a message"]') ||
                  document.querySelector('textarea');

  if (!textarea) {
    console.log("ChatGPT textarea not found");
    return false;
  }

  // Create the enhance icon
  const icon = document.createElement("button");
  icon.id = "enhance-icon";
  icon.innerHTML = "✨";
  icon.title = "Enhance Prompt";
  icon.style.cssText = `
    position: absolute;
    z-index: 10000;
    right: 70px;
    bottom: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    background: #10a37f;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 16px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    transition: all 0.2s ease;
  `;

  // Add hover effects
  icon.addEventListener("mouseenter", () => {
    icon.style.background = "#0d8a6f";
    icon.style.transform = "scale(1.05)";
  });

  icon.addEventListener("mouseleave", () => {
    icon.style.background = "#10a37f";
    icon.style.transform = "scale(1)";
  });

  // Handle icon click
  icon.addEventListener("click", () => {
    const userPrompt = prompt("Enter the idea or rough prompt you'd like to refine:");
    if (userPrompt) {
      console.log("Sending enhance request:", userPrompt);
      
      chrome.runtime.sendMessage({
        type: "ENHANCE_PROMPT",
        payload: userPrompt
      }, (response) => {
        console.log("Received response:", response);
        if (response && response.prompt) {
          // Find the current textarea
          const currentTextarea = document.querySelector('textarea[data-id="root"]') ||
                                document.querySelector('textarea[placeholder*="Message"]') ||
                                document.querySelector('textarea');
          
          if (currentTextarea) {
            currentTextarea.value = response.prompt;
            currentTextarea.dispatchEvent(new Event("input", { bubbles: true }));
            currentTextarea.focus();
            console.log("Enhanced prompt injected!");
          }
        }
      });
    }
  });

  // Find the textarea's parent and position the icon
  let parent = textarea.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    if (style.position === 'relative' || style.position === 'absolute') {
      break;
    }
    parent = parent.parentElement;
  }

  if (!parent) {
    parent = textarea.parentElement;
  }

  parent.style.position = "relative";
  parent.appendChild(icon);

  console.log("✨ Enhance icon injected successfully!");
  return true;
}

// Function to retry injection
function retryInjection() {
  let attempts = 0;
  const maxAttempts = 10;

  const tryInject = () => {
    attempts++;
    console.log(`Attempt ${attempts} to inject icon...`);
    
    if (injectEnhanceIcon()) {
      console.log("Icon injection successful!");
      return;
    }
    
    if (attempts < maxAttempts) {
      setTimeout(tryInject, 1000);
    } else {
      console.log("Failed to inject icon after", maxAttempts, "attempts");
    }
  };

  tryInject();
}

// Initial injection attempt
retryInjection();

// Also try injection when the page loads
window.addEventListener("load", () => {
  setTimeout(retryInjection, 1000);
});

// Try injection when URL changes (for SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log("URL changed, retrying injection...");
    setTimeout(retryInjection, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Listen for dynamic content changes
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // Check if any new textareas were added
      const hasNewTextarea = Array.from(mutation.addedNodes).some(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return node.querySelector('textarea') || node.tagName === 'TEXTAREA';
        }
        return false;
      });
      
      if (hasNewTextarea && !document.getElementById("enhance-icon")) {
        console.log("New textarea detected, injecting icon...");
        setTimeout(retryInjection, 500);
      }
    }
  }
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
} else {
  observer.observe(document.body, { childList: true, subtree: true });
}

console.log("ChatGPT Prompt Enhancer: Content script setup complete!");
