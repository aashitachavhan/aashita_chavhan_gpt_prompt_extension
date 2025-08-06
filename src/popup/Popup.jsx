import { useState, useEffect } from "react";
import { Send, Copy, Check } from "lucide-react";

export default function Popup() {
  const [role, setRole] = useState("Developer");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  // Load role from storage on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get("selectedRole", (result) => {
        if (result.selectedRole) {
          setRole(result.selectedRole);
        }
      });
    }
  }, []);

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ selectedRole: newRole });
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    setLoading(true);
    setEnhancedPrompt("");

    if (typeof chrome !== 'undefined' && chrome.runtime) {
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
    } else {
      // Fallback for testing
      setEnhancedPrompt(`${role}: ${input}`);
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(enhancedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const injectToChatGPT = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (prompt) => {
            const textarea =
              document.querySelector('textarea[data-id="root"]') ||
              document.querySelector('textarea[placeholder*="Message"]') ||
              document.querySelector("textarea");
            if (textarea) {
              textarea.value = prompt;
              textarea.dispatchEvent(new Event("input", { bubbles: true }));
              textarea.focus();
            }
          },
          args: [enhancedPrompt],
        });
      });
    }
  };

  return (
    <div className="min-w-80 max-w-96 bg-white shadow-2xl rounded-lg border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <h2 className="text-lg font-bold text-center">
          ✨ ChatGPT Prompt Enhancer
        </h2>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Role Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Role
          </label>
          <select
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white text-gray-800"
            value={role}
            onChange={handleRoleChange}
          >
            <option value="Developer">👨‍💻 Developer</option>
            <option value="Designer">🎨 Designer</option>
            <option value="Project Manager">📊 Project Manager</option>
            <option value="Writer">✍️ Writer</option>
            <option value="Analyst">📈 Analyst</option>
            <option value="Teacher">👩‍🏫 Teacher</option>
            <option value="Marketing Expert">📢 Marketing Expert</option>
            <option value="Data Scientist">📊 Data Scientist</option>
          </select>
        </div>

        {/* Input Area */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Your Prompt Idea
          </label>
          <textarea
            className="w-full h-24 p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none text-gray-800 placeholder-gray-400"
            placeholder="Write your idea or rough prompt..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>

        {/* Generate Button */}
        <button
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
            loading || !input.trim()
              ? "bg-gray-400 cursor-not-allowed" 
              : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 shadow-lg"
          }`}
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
        >
          <Send size={18} />
          {loading ? "Generating..." : "Generate Enhanced Prompt"}
        </button>

        {/* Enhanced Prompt Result */}
        {enhancedPrompt && (
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-green-500">✅</span>
              Enhanced Prompt:
            </h3>
            <div className="bg-white p-3 rounded-md border border-gray-200 mb-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {enhancedPrompt}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied!" : "Copy"}
              </button>

              <button
                onClick={injectToChatGPT}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Inject to ChatGPT
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Role will be saved automatically
          </p>
        </div>
      </div>
    </div>
  );
}