import { useState, useEffect } from "react";
import { Save, Check, LogOut } from "lucide-react";

export default function Popup() {
  const [role, setRole] = useState("Developer");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [contexts, setContexts] = useState([]);
  const [selectedContextId, setSelectedContextId] = useState(null);
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(["selectedRole", "userContext", "token", "selectedContextId"], (result) => {
        if (result.selectedRole) setRole(result.selectedRole);
        if (result.userContext) setContext(result.userContext);
        if (result.token) {
          setToken(result.token);
          fetchContexts(result.token);
        }
        if (result.selectedContextId) setSelectedContextId(result.selectedContextId);
      });
    }
  }, []);

  const fetchContexts = (authToken) => {
    chrome.runtime.sendMessage(
      { type: "GET_CONTEXTS", payload: { token: authToken } },
      (response) => {
        if (response && response.contexts) {
          setContexts(response.contexts);
        } else {
          console.error("Failed to fetch contexts:", response?.error);
        }
      }
    );
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    chrome.storage.local.set({ selectedRole: newRole });
  };

  const handleContextSelect = (e) => {
    const contextId = e.target.value;
    setSelectedContextId(contextId);
    chrome.storage.local.set({ selectedContextId: contextId });
    const selectedContext = contexts.find(ctx => ctx.context_id === contextId);
    if (selectedContext) {
      setContext(selectedContext.context);
      chrome.storage.local.set({ userContext: selectedContext.context });
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      const endpoint = isLogin ? "/login" : "/register";
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Authentication failed");

      let authToken = data.access_token;
      if (!isLogin) {
        // After registration, automatically log in
        const loginResponse = await fetch("http://127.0.0.1:8000/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) throw new Error(loginData.detail || "Automatic login failed");
        authToken = loginData.access_token;
      }

      chrome.storage.local.set({ token: authToken }, () => {
        setToken(authToken);
        fetchContexts(authToken);
        setEmail("");
        setPassword("");
        setIsLogin(true); // Reset to login view for next time
      });
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    chrome.storage.local.remove(["token", "selectedRole", "userContext", "selectedContextId"], () => {
      setToken(null);
      setRole("Developer");
      setContext("");
      setContexts([]);
      setSelectedContextId(null);
    });
  };

  const handleSaveContext = async () => {
    if (!context.trim()) {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.borderColor = '#ef4444';
        setTimeout(() => textarea.style.borderColor = '', 2000);
      }
      return;
    }
    setLoading(true);
    setSaved(false);
    try {
      chrome.storage.local.set({ userContext: context });
      chrome.runtime.sendMessage(
        {
          type: "SAVE_CONTEXT",
          payload: { role, context: context.trim(), token },
        },
        (response) => {
          setLoading(false);
          if (response && response.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            fetchContexts(token);
          } else {
            console.error('Failed to save context:', response?.error);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
          }
        }
      );
    } catch (err) {
      console.error('Error saving context:', err);
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (!token) {
    return (
      <div className="min-w-80 max-w-96 bg-white shadow-2xl rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-bold text-center mb-4">{isLogin ? "Login" : "Register"}</h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border-2 border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border-2 border-gray-300 rounded-lg"
              required
            />
          </div>
          {authError && <p className="text-red-500 text-xs">{authError}</p>}
          <button
            type="submit"
            className={`w-full py-2 rounded-lg font-semibold text-white ${loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"}`}
            disabled={loading}
          >
            {loading ? "Processing..." : isLogin ? "Login" : "Register"}
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <span
              className="text-blue-500 cursor-pointer"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Register" : "Login"}
            </span>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-w-80 max-w-96 bg-white shadow-2xl rounded-lg border border-gray-200">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <h2 className="text-lg font-bold">✨ ChatGPT Context Manager</h2>
        <button onClick={handleLogout} className="text-white hover:text-gray-200" title="Logout">
          <LogOut size={18} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Role</label>
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
        {contexts.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Previous Context</label>
            <select
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white text-gray-800"
              value={selectedContextId || ''}
              onChange={handleContextSelect}
            >
              <option value="">Select a previous context</option>
              {contexts.map((ctx) => (
                <option key={ctx.context_id} value={ctx.context_id}>
                  {ctx.context.substring(0, 50)}... ({new Date(ctx.created_at).toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Project Context</label>
          <textarea
            className="w-full h-32 p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none text-gray-800 placeholder-gray-400"
            placeholder="Describe your project context here..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">This context will be used to enhance all your prompts on ChatGPT</p>
        </div>
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
        <div className="border-2 border-green-200 rounded-lg p-3 bg-green-50">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <span className="text-green-500">🚀</span>
            <span className="font-semibold text-sm">How it works:</span>
          </div>
          <ul className="text-xs text-green-700 space-y-1">
            <li>1. Save your project context above or select a previous context</li>
            <li>2. Go to ChatGPT and type any prompt</li>
            <li>3. Click the ✨ icon next to the input</li>
            <li>4. Your prompt will be enhanced with the selected context!</li>
          </ul>
        </div>
        <div className="text-center pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">Context and role will be saved automatically</p>
        </div>
      </div>
    </div>
  );
}