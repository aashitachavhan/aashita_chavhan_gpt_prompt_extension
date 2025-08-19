console.log("🚀 ChatGPT Prompt Enhancer: Background script loaded");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed, setting default role");
  chrome.storage.local.set({ selectedRole: "Developer" }, () => {
    console.log("Default role set to Developer");
  });
});

const handleAuthError = (error, sendResponse) => {
  if (error.message.includes("401") || error.message.includes("token") || error.message.includes("expired")) {
    // Clear invalid token
    chrome.storage.local.remove(["token"], () => {
      console.log("🗑️ Cleared invalid token from storage");
    });
    sendResponse({ success: false, error: "Authentication expired. Please login again.", authError: true });
  } else {
    sendResponse({ success: false, error: error.message });
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("📨 Message received:", message.type);

  const addAuthHeader = (headers, token) => ({
    ...headers,
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  if (message.type === "VERIFY_TOKEN") {
    const { token } = message.payload;
    console.log("🎯 Verifying token");

    fetch("http://127.0.0.1:8000/verify-token", {
      method: "GET",
      headers: addAuthHeader({}, token),
    })
      .then((res) => {
        console.log("📡 Token verification response status:", res.status);
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Token expired or invalid");
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Token verified:", data);
        sendResponse({ valid: true, user: data.user });
      })
      .catch((err) => {
        console.error("❌ Token verification failed:", err);
        handleAuthError(err, sendResponse);
      });

    return true;
  }

  if (message.type === "SAVE_CONTEXT") {
    const { role, custom_role, persona, context, name, context_id, token } = message.payload;
    console.log("🎯 Saving context");

    fetch("http://127.0.0.1:8000/save-context", {
      method: "POST",
      headers: addAuthHeader({}, token),
      body: JSON.stringify({ role, custom_role, persona, context, name, context_id }),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Authentication expired");
          }
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
        handleAuthError(err, sendResponse);
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
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Authentication expired");
          }
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
        handleAuthError(err, sendResponse);
      });

    return true;
  }

  if (message.type === "DELETE_CONTEXT") {
    const { context_id, token } = message.payload;
    console.log("🎯 Deleting context:", context_id);

    fetch(`http://127.0.0.1:8000/delete-context/${context_id}`, {
      method: "DELETE",
      headers: addAuthHeader({}, token),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Authentication expired");
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("✅ Context deleted:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("❌ Backend API Error:", err);
        handleAuthError(err, sendResponse);
      });

    return true;
  }

  if (message.type === "GENERATE_PROMPT") {
    const { role, custom_role, persona, input, context_id, token } = message.payload;
    console.log("🎯 Generating prompt with:", { role, custom_role, persona, input, context_id });

    fetch("http://127.0.0.1:8000/generate-prompt", {
      method: "POST",
      headers: addAuthHeader({}, token),
      body: JSON.stringify({ role, custom_role, persona, input, context_id }),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Authentication expired");
          }
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
        // For prompt generation, provide fallback instead of auth error
        if (err.message.includes("401") || err.message.includes("token")) {
          handleAuthError(err, sendResponse);
        } else {
          sendResponse({ prompt: `${role}${custom_role ? `: ${custom_role}` : ""}: ${input}` });
        }
      });

    return true;
  }

  if (message.type === "ENHANCE_PROMPT") {
    const { prompt, token } = message;
    console.log("🔧 Enhancing prompt:", prompt);

    fetch("http://127.0.0.1:8000/enhance-prompt", {
      method: "POST",
      headers: addAuthHeader({}, token),
      body: JSON.stringify({ prompt }),
    })
      .then((res) => {
        console.log("📡 Backend response status:", res.status);
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Authentication expired");
          }
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
        if (err.message.includes("401") || err.message.includes("token")) {
          handleAuthError(err, sendResponse);
        } else {
          sendResponse({ prompt });
        }
      });

    return true;
  }
});