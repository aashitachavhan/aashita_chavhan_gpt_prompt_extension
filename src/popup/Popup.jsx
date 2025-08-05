import { useState } from "react";
import { Send, Copy, Check } from "lucide-react";

export default function Popup() {
  const [role, setRole] = useState("Developer");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = () => {
    if (!input.trim()) return;
    setLoading(true);
    setEnhancedPrompt("");

    // Send to backend API through background.js
    chrome.runtime.sendMessage(
      {
        type: "GENERATE_PROMPT",
        payload: {
          role,
          input,
        },
      },
      (response) => {
        const prompt = response?.prompt || `${role}: ${input}`;
        setEnhancedPrompt(prompt);
        setLoading(false);
      }
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const injectToChatGPT = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (prompt) => {
          const textarea = document.querySelector('textarea[data-id="root"]') ||
                          document.querySelector('textarea[placeholder*="Message"]') ||
                          document.querySelector('textarea');
          if (textarea) {
            textarea.value = prompt;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            textarea.focus();
          }
        },
        args: [enhancedPrompt],
      });
    });
  };

  return (
    <div className="p-4 w-80 bg-white text-black">
      <h2 className="text-lg font-bold mb-4 text-center ">ChatGPT Prompt Enhancer</h2>
      
      <label className="block mb-2 font-bold">Role</label>
      <select
        className="mb-4 p-2 w-full border rounded"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option>Developer</option>
        <option>Designer</option>
        <option>Project Manager</option>
        <option>Writer</option>
        <option>Analyst</option>
        <option>Teacher</option>
      </select>

      <textarea
        className="w-full h-24 p-2 border rounded mb-2"
        placeholder="Write your idea or rough prompt..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        className={`bg-blue-500 text-white px-4 py-2 rounded flex items-center justify-center gap-2 w-full mb-4 ${
          loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"
        }`}
        onClick={handleSubmit}
        disabled={loading}
      >
        <Send size={16} /> {loading ? "Generating..." : "Generate Enhanced Prompt"}
      </button>

      {enhancedPrompt && (
        <div className="border rounded p-3 bg-gray-50">
          <h3 className="font-bold mb-2">Enhanced Prompt:</h3>
          <p className="text-sm mb-3 whitespace-pre-wrap">{enhancedPrompt}</p>
          
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 bg-gray-500 text-white px-3 py-1 rounded text-sm flex items-center justify-center gap-1 hover:bg-gray-600"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            
            <button
              onClick={injectToChatGPT}
              className="flex-1 bg-green-500 text-white px-3 py-1 rounded text-sm flex items-center justify-center gap-1 hover:bg-green-600"
            >
              <Send size={14} />
              Inject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
