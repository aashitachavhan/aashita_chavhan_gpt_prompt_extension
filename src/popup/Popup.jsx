import { useState, useEffect } from "react";
import { Save, Check } from "lucide-react";

export default function Popup() {
  const [role, setRole] = useState("Developer");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState(null);

  // Load role, context, and userId from storage on mount
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(["selectedRole", "userContext", "userId"], (result) => {
        if (result.selectedRole) {
          setRole(result.selectedRole);
        }
        if (result.userContext) {
          setContext(result.userContext);
        }
        if (result.userId) {
          setUserId(result.userId);
        } else {
          // Generate a new userId if none exists
          const newUserId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          chrome.storage.local.set({ userId: newUserId }, () => {
            setUserId(newUserId);
          });
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

  const handleSaveContext = async () => {
    if (!context.trim()) {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.borderColor = '#ef4444';
        setTimeout(() => {
          textarea.style.borderColor = '';
        }, 2000);
      }
      return;
    }

    setLoading(true);
    setSaved(false);

    try {
      // Save to local storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ userContext: context });
      }

      // Send to backend to save in MongoDB
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage(
          {
            type: "SAVE_CONTEXT",
            payload: {
              role,
              context: context.trim(),
              user_id: userId,
            },
          },
          (response) => {
            setLoading(false);
            if (response && response.success) {
              setSaved(true);
              setTimeout(() => setSaved(false), 3000);
            } else {
              console.error('Failed to save context:', response?.error);
              // Show success since it's saved locally
              setSaved(true);
              setTimeout(() => setSaved(false), 3000);
            }
          }
        );
      } else {
        // Fallback for testing
        setLoading(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Error saving context:', err);
      setLoading(false);
      setSaved(true); // Show success for local save
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="min-w-80 max-w-96 bg-white shadow-2xl rounded-lg border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <h2 className="text-lg font-bold text-center">
          ✨ ChatGPT Context Manager
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

        {/* Context Input Area */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Project Context
          </label>
          <textarea
            className="w-full h-32 p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none text-gray-800 placeholder-gray-400"
            placeholder="Describe your project context here... 
Example: I'm building a React e-commerce app with Node.js backend, using MongoDB for database. The app needs user authentication, product catalog, shopping cart, and payment integration with Stripe."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            This context will be used to enhance all your prompts on ChatGPT
          </p>
        </div>

        {/* Save Context Button */}
        <button
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
            loading || !context.trim()
              ? "bg-gray-400 cursor-not-allowed" 
              : saved
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 shadow-lg"
          }`}
          onClick={handleSaveContext}
          disabled={loading || !context.trim()}
        >
          {saved ? (
            <>
              <Check size={18} />
              Context Saved Successfully!
            </>
          ) : (
            <>
              <Save size={18} />
              {loading ? "Saving Context..." : "Save Context"}
            </>
          )}
        </button>

        {/* Status Message */}
        {context.trim() && (
          <div className="border-2 border-blue-200 rounded-lg p-3 bg-blue-50">
            <div className="flex items-center gap-2 text-blue-800">
              <span className="text-blue-500">💡</span>
              <span className="font-semibold text-sm">Context Preview:</span>
            </div>
            <p className="text-xs text-blue-700 mt-1 line-clamp-3">
              {context.substring(0, 150)}{context.length > 150 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="border-2 border-green-200 rounded-lg p-3 bg-green-50">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <span className="text-green-500">🚀</span>
            <span className="font-semibold text-sm">How it works:</span>
          </div>
          <ul className="text-xs text-green-700 space-y-1">
            <li>1. Save your project context above</li>
            <li>2. Go to ChatGPT and type any prompt</li>
            <li>3. Click the ✨ icon next to the input</li>
            <li>4. Your prompt will be enhanced with saved context!</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Context and role will be saved automatically
          </p>
        </div>
      </div>
    </div>
  );
}