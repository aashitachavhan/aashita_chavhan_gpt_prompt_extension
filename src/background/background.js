console.log("🚀 ChatGPT Prompt Enhancer: Background script loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed, setting default role");
  chrome.storage.local.set({ selectedRole: "Developer" }, () => {
    console.log("Default role set to Developer");
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Message received:", message.type);

  const addAuthHeader = (headers, token) => ({
    ...headers,
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  if (message.type === "SAVE_CONTEXT") {
    const { role, context, token } = message.payload;
    console.log("🎯 Saving context");

    fetch("http://127.0.0.1:8000/save-context", {
      method: "POST",
      headers: addAuthHeader({}, token),
      body: JSON.stringify({ role, context }),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("✅ Context saved:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("❌ Backend API Error:", err);
        sendResponse({ success: false, error: err.message });
      });

    return true;
  }

  if (message.type === "GET_CONTEXTS") {
    const { token } = message.payload;
    console.log("🎯 Fetching contexts");

    fetch("http://127.0.0.1:8000/get-contexts", {
      method: "GET",
      headers: addAuthHeader({}, token),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
    const { role, input, context_id, token } = message.payload;
    console.log("🎯 Generating prompt with:", { role, input, context_id });

    fetch("http://127.0.0.1:8000/generate-prompt", {
      method: "POST",
      headers: addAuthHeader({}, token),
      body: JSON.stringify({ role, input, context_id }),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("✅ Backend response data:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("❌ Backend API Error:", err);
        sendResponse({ prompt: `${role}: ${input}` });
      });

    return true;
  }

  if (message.type === "ENHANCE_PROMPT") {
    const { payload: userInput, token } = message.payload;
    console.log("🔧 Enhancing prompt:", userInput);

    fetch("http://127.0.0.1:8000/enhance-prompt", {
      method: "POST",
      headers: addAuthHeader({}, token),
      body: JSON.stringify({ prompt: userInput }),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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