console.log("🚀 ChatGPT Prompt Enhancer: Background script loaded");

// Initialize default role when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed, setting default role");
  chrome.storage.local.set({ selectedRole: "Developer" }, () => {
    console.log("Default role set to Developer");
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Message received:", message.type);

  if (message.type === "GENERATE_PROMPT") {
    const { role, input } = message.payload;

    console.log("🎯 Generating prompt with:", { role, input });

    // Send to your backend API
    fetch("http://127.0.0.1:8000/generate-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, input }),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Backend response data:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("❌ Backend API Error:", err);
        console.error("🔧 Make sure backend is running on http://127.0.0.1:8000");

        // Simple fallback - just combine role and input like before
        sendResponse({ prompt: `${role}: ${input}` });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === "ENHANCE_PROMPT") {
    const { payload: userInput } = message;

    console.log("🔧 Enhancing prompt:", userInput);

    fetch("http://127.0.0.1:8000/enhance-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: userInput }),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Enhanced prompt:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("❌ Enhancement API Error:", err);
        sendResponse({ prompt: userInput }); // fallback
      });

    return true; // Keep message channel open for async response
  }
});
