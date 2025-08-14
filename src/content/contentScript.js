function findChatGPTInput() {
  const selectors = [
    '#prompt-textarea',
    'textarea[data-id="root"]',
    'textarea[placeholder*="Send a message"]',
    'div[contenteditable="true"]'
  ];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log("✅ Input field found with selector:", selector);
      return element;
    }
  }
  console.log("❌ No input field found");
  return null;
}

function createEnhanceIcon() {
  // Outer wrapper mimicking mic button's span
  const wrapper = document.createElement('span');
  wrapper.className = 'my-extension-icon-wrapper';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';

  const icon = document.createElement('span');
  icon.id = 'my-enhance-icon';
  icon.innerHTML = '✨';
  icon.style.cssText = `
    width: 2rem;
    height: 2rem;
    border-radius: 0.375rem;
    background: linear-gradient(to right, #3B82F6, #7C3AED);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;
    font-size: 1rem;
    transition: all 0.2s ease-in-out;
    margin-right: 0.5rem; /* Spacing to align with mic icon */
  `;
  icon.title = 'Enhance Prompt with Context';
  icon.addEventListener('mouseover', () => {
    icon.style.background = 'linear-gradient(to right, #2563EB, #6D28D9)';
  });
  icon.addEventListener('mouseout', () => {
    icon.style.background = 'linear-gradient(to right, #3B82F6, #7C3AED)';
  });
  icon.addEventListener('click', handleDirectEnhancement);

  wrapper.appendChild(icon);
  return wrapper;
}

function showEnhancingMessage() {
  const enhancingMessage = document.createElement('div');
  enhancingMessage.textContent = 'Enhancing Prompt...';
  enhancingMessage.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: linear-gradient(to right, #3B82F6, #7C3AED);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease-in-out;
  `;
  document.body.appendChild(enhancingMessage);
  return enhancingMessage;
}

function showSuccessMessage() {
  const successMessage = document.createElement('div');
  successMessage.textContent = 'Prompt enhanced!';
  successMessage.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: linear-gradient(to right, #3B82F6, #7C3AED);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 1000;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease-in-out;
  `;
  document.body.appendChild(successMessage);
  setTimeout(() => successMessage.remove(), 3000);
}

function handleDirectEnhancement(e) {
  e.preventDefault();
  e.stopPropagation();
  console.log("🎯 Icon clicked, starting direct enhancement...");

  const inputField = findChatGPTInput();
  if (!inputField) {
    alert("Could not find input field. Please try again.");
    return;
  }

  const currentText = inputField.tagName === "TEXTAREA" || inputField.tagName === "INPUT"
    ? inputField.value
    : inputField.textContent;

  if (!currentText || currentText.trim() === '') {
    inputField.style.borderColor = '#ef4444';
    inputField.focus();
    setTimeout(() => inputField.style.borderColor = '', 2000);
    return;
  }

  const enhancingMessage = showEnhancingMessage();
  icon.querySelector('#my-enhance-icon').style.opacity = '0.7';
  icon.querySelector('#my-enhance-icon').style.cursor = 'not-allowed';
  console.log("📝 Current text:", currentText);

  chrome.storage.local.get(["selectedRole", "customRole", "persona", "selectedContextId", "token"], (result) => {
    const role = result.selectedRole || "Developer";
    const customRole = result.customRole || null;
    const persona = result.persona || null;
    const contextId = result.selectedContextId;
    const token = result.token;
    console.log("📤 Sending message with:", { role, customRole, persona, contextId, token });

    chrome.runtime.sendMessage(
      {
        type: "GENERATE_PROMPT",
        payload: { role, custom_role: customRole, persona, input: currentText.trim(), context_id: contextId, token },
      },
      (response) => {
        console.log("📥 Response received:", response);
        enhancingMessage.remove();
        icon.querySelector('#my-enhance-icon').style.opacity = '1';
        icon.querySelector('#my-enhance-icon').style.cursor = 'pointer';

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
            showSuccessMessage();
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

let icon = null;

function setupEnhanceButton() {
  const container = document.querySelector('[data-testid="composer-trailing-actions"]');
  if (!container) {
    console.log("❌ Mic button container not found, retrying...");
    setTimeout(setupEnhanceButton, 1000);
    return;
  }

  if (icon && document.body.contains(icon)) {
    console.log("🔄 Icon already exists, skipping setup");
    return;
  }

  icon = createEnhanceIcon();

  // Insert before mic button
  if (container.firstChild) {
    container.insertBefore(icon, container.firstChild);
  } else {
    container.appendChild(icon);
  }

  console.log("✅ Enhance button added to the left of mic button with matching spacing");
}

const observer = new MutationObserver(() => {
  setupEnhanceButton();
});
observer.observe(document.body, { childList: true, subtree: true });

setupEnhanceButton();