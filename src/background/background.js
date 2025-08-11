console.log("🚀 ChatGPT Prompt Enhancer: Background script loaded");

// Initialize default role and userId when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed, setting defaults");
  const userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  chrome.storage.local.set({ 
    selectedRole: "Developer",
    userId: userId
  }, () => {
    console.log("Default role set to Developer, userId set to", userId);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Message received:", message.type);

  if (message.type === "SAVE_CONTEXT") {
    const { role, context, user_id } = message.payload;

    console.log("🎯 Saving context for user:", user_id, { role, context });

    fetch("http://127.0.0.1:8000/save-context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, context, user_id }),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Context saved:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("❌ Backend API Error:", err);
        console.error("🔧 Make sure backend is running on http://127.0.0.1:8000");
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  if (message.type === "GET_CONTEXTS") {
    const { user_id } = message.payload;

    console.log("🎯 Fetching contexts for user:", user_id);

    fetch(`http://127.0.0.1:8000/get-contexts/${user_id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Contexts retrieved:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("❌ Backend API Error:", err);
        sendResponse({ success: false, contexts: [] });
      });

    return true;
  }

  if (message.type === "GENERATE_PROMPT") {
    const { role, input, user_id, context_id } = message.payload;

    console.log("🎯 Generating prompt with:", { role, input, user_id, context_id });

    fetch("http://127.0.0.1:8000/generate-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, input, user_id, context_id }),
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
        sendResponse({ prompt: `${role}: ${input}` });
      });

    return true;
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
        sendResponse({ prompt: userInput });
      });

    return true;
  }
});