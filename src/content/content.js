// Content script for GPT Prompt Enhancer
console.log("Content script loaded - GPT Prompt Enhancer");

class PromptEnhancer {
  constructor() {
    this.icon = null;
    this.isIconVisible = false;
    this.init();
  }

  init() {
    // Wait for ChatGPT to load
    this.waitForChatGPT();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'enhancePrompt') {
        this.handlePromptEnhancement(request.prompt, request.role, request.apiKey);
      }
    });
  }

  waitForChatGPT() {
    const checkInterval = setInterval(() => {
      const textarea = this.findChatGPTextarea();
      if (textarea) {
        clearInterval(checkInterval);
        this.setupIcon(textarea);
        this.observeTextareaChanges();
      }
    }, 1000);
  }

  findChatGPTextarea() {
    // Look for ChatGPT's main textarea
    const selectors = [
      'textarea[data-id="root"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Send a message"]',
      'textarea[data-testid="send-button"]',
      'textarea'
    ];

    for (const selector of selectors) {
      const textarea = document.querySelector(selector);
      if (textarea && textarea.offsetParent !== null) {
        return textarea;
      }
    }
    return null;
  }

  setupIcon(textarea) {
    // Create floating icon
    this.icon = document.createElement('div');
    this.icon.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        transition: all 0.3s ease;
        opacity: 0;
        transform: scale(0.8);
      " id="prompt-enhancer-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
    `;

    document.body.appendChild(this.icon);

    // Add hover effects
    const iconElement = this.icon.querySelector('#prompt-enhancer-icon');
    iconElement.addEventListener('mouseenter', () => {
      iconElement.style.transform = 'scale(1.1)';
      iconElement.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
    });

    iconElement.addEventListener('mouseleave', () => {
      iconElement.style.transform = 'scale(1)';
      iconElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });

    // Show icon with animation
    setTimeout(() => {
      iconElement.style.opacity = '1';
      iconElement.style.transform = 'scale(1)';
    }, 500);

    // Add click handler
    iconElement.addEventListener('click', () => {
      this.showPromptDialog();
    });
  }

  showPromptDialog() {
    // Create modal dialog
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      " id="prompt-enhancer-modal">
        <div style="
          background: white;
          border-radius: 12px;
          padding: 24px;
          width: 400px;
          max-width: 90vw;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">Enhance Your Prompt</h3>
            <button id="close-modal" style="
              background: none;
              border: none;
              font-size: 20px;
              cursor: pointer;
              color: #6b7280;
              padding: 4px;
            ">&times;</button>
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #374151;">Your Prompt:</label>
            <textarea id="prompt-input" style="
              width: 100%;
              min-height: 100px;
              padding: 12px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              font-family: inherit;
              resize: vertical;
            " placeholder="Enter your prompt here..."></textarea>
          </div>
          
          <div style="display: flex; gap: 12px;">
            <button id="enhance-prompt" style="
              flex: 1;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              padding: 12px;
              border-radius: 6px;
              font-weight: 500;
              cursor: pointer;
            ">Enhance Prompt</button>
            <button id="cancel-enhance" style="
              flex: 1;
              background: #f3f4f6;
              color: #374151;
              border: 1px solid #d1d5db;
              padding: 12px;
              border-radius: 6px;
              font-weight: 500;
              cursor: pointer;
            ">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector('#close-modal');
    const cancelBtn = modal.querySelector('#cancel-enhance');
    const enhanceBtn = modal.querySelector('#enhance-prompt');
    const promptInput = modal.querySelector('#prompt-input');

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    enhanceBtn.addEventListener('click', () => {
      const prompt = promptInput.value.trim();
      if (prompt) {
        this.handlePromptEnhancement(prompt);
        closeModal();
      }
    });

    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  async handlePromptEnhancement(prompt, role = 'general', apiKey = null) {
    try {
      // Get settings from storage if not provided
      if (!apiKey) {
        const settings = await chrome.storage.sync.get(['apiKey', 'selectedRole']);
        apiKey = settings.apiKey;
        role = settings.selectedRole || role;
      }

      if (!apiKey) {
        this.showNotification('Please add your Gemini API key in extension settings', 'error');
        return;
      }

      // Show loading state
      this.showNotification('Enhancing your prompt...', 'info');

      // Call Gemini API (we'll implement this in the next step)
      const enhancedPrompt = await this.callGeminiAPI(prompt, role, apiKey);

      if (enhancedPrompt) {
        // Insert enhanced prompt into ChatGPT textarea
        this.insertEnhancedPrompt(enhancedPrompt);
        this.showNotification('Prompt enhanced successfully!', 'success');
      }

    } catch (error) {
      console.error('Error enhancing prompt:', error);
      this.showNotification('Failed to enhance prompt. Please try again.', 'error');
    }
  }

  async callGeminiAPI(prompt, role, apiKey) {
    // This will be implemented in the next step
    // For now, return a mock enhanced prompt
    const rolePrompts = {
      designer: `As a UI/UX designer, please help me with: ${prompt}. Consider user experience, visual design principles, and modern design trends.`,
      developer: `As a software developer, please help me with: ${prompt}. Consider best practices, code quality, and technical implementation.`,
      writer: `As a professional writer, please help me with: ${prompt}. Consider clarity, engagement, and effective communication.`,
      marketer: `As a marketing professional, please help me with: ${prompt}. Consider target audience, messaging, and conversion optimization.`,
      researcher: `As a research analyst, please help me with: ${prompt}. Consider methodology, data analysis, and evidence-based insights.`,
      general: `Please help me with: ${prompt}. Provide a comprehensive and well-structured response.`
    };

    return rolePrompts[role] || rolePrompts.general;
  }

  insertEnhancedPrompt(enhancedPrompt) {
    const textarea = this.findChatGPTextarea();
    if (textarea) {
      textarea.value = enhancedPrompt;
      textarea.focus();
      
      // Trigger input event to update ChatGPT's UI
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6'
    };

    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-weight: 500;
        z-index: 10002;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      ">
        ${message}
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }

  observeTextareaChanges() {
    // Monitor for textarea changes to ensure icon stays visible
    const observer = new MutationObserver(() => {
      const textarea = this.findChatGPTextarea();
      if (textarea && this.icon && !this.icon.parentNode) {
        document.body.appendChild(this.icon);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize the prompt enhancer
new PromptEnhancer();
