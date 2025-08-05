chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_PROMPT") {
    const { role, input } = message.payload;
    
    console.log("Sending request to backend:", { role, input });

    // Send to your separate backend API
    fetch("http://127.0.0.1:8000/generate-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role, input }),
    })
      .then((res) => {
        console.log("Backend response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Backend response data:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("Backend API Error:", err);
        console.error("Make sure backend is running on http://127.0.0.1:8000");
        // Fallback to simple role prefix
        sendResponse({ prompt: `${role}: ${input}` });
      });

    return true; // IMPORTANT: keeps message channel open
  }

  if (message.type === "ENHANCE_PROMPT") {
    const { payload: userInput } = message;
    
    console.log("Sending enhance request to backend:", { userInput });
    
    // Send to your separate backend API for enhancement
    fetch("http://127.0.0.1:8000/enhance-prompt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: userInput }),
    })
      .then((res) => {
        console.log("Backend response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Backend response data:", data);
        sendResponse(data);
      })
      .catch((err) => {
        console.error("Backend API Error:", err);
        console.error("Make sure backend is running on http://127.0.0.1:8000");
        // Fallback to original input
        sendResponse({ prompt: userInput });
      });

    return true; // IMPORTANT: keeps message channel open
  }
});
