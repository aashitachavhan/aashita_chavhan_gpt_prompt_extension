import { useState, useEffect } from "react";
import { Save, Check, LogOut } from "lucide-react";

export default function Popup() {
  const [role, setRole] = useState("Developer");
  const [customRole, setCustomRole] = useState("");
  const [persona, setPersona] = useState("");
  const [context, setContext] = useState("");
  const [contextName, setContextName] = useState("");
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
      chrome.storage.local.get(["selectedRole", "customRole", "persona", "userContext", "contextName", "token", "selectedContextId"], (result) => {
        if (result.selectedRole) setRole(result.selectedRole);
        if (result.customRole) setCustomRole(result.customRole);
        if (result.persona) setPersona(result.persona);
        if (result.userContext) setContext(result.userContext);
        if (result.contextName) setContextName(result.contextName);
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
        if (response && response.success && response.contexts) {
          setContexts(response.contexts);
          if (response.contexts.length > 0 && !selectedContextId) {
            const latestContext = response.contexts[0];
            setSelectedContextId(latestContext.context_id);
            setRole(latestContext.role);
            setCustomRole(latestContext.custom_role || "");
            setPersona(latestContext.persona || "");
            setContext(latestContext.context || "");
            setContextName(latestContext.name || "");
            chrome.storage.local.set({
              selectedRole: latestContext.role,
              customRole: latestContext.custom_role || "",
              persona: latestContext.persona || "",
              userContext: latestContext.context || "",
              contextName: latestContext.name || "",
              selectedContextId: latestContext.context_id,
            });
          }
        } else {
          console.error("Failed to fetch contexts:", response?.error);
          setContexts([]);
        }
      }
    );
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setRole(newRole);
    chrome.storage.local.set({ selectedRole: newRole });
    if (newRole !== "Custom") {
      setCustomRole("");
      setPersona("");
      chrome.storage.local.remove(["customRole", "persona"]);
    }
  };

  const handleCustomRoleChange = (e) => {
    const newCustomRole = e.target.value;
    setCustomRole(newCustomRole);
    chrome.storage.local.set({ customRole: newCustomRole });
  };

  const handlePersonaChange = (e) => {
    const newPersona = e.target.value;
    setPersona(newPersona);
    chrome.storage.local.set({ persona: newPersona });
  };

  const handleContextNameChange = (e) => {
    const newContextName = e.target.value;
    setContextName(newContextName);
    chrome.storage.local.set({ contextName: newContextName });
  };

  const handleContextSelect = (e) => {
    const contextId = e.target.value;
    setSelectedContextId(contextId);
    chrome.storage.local.set({ selectedContextId: contextId });
    if (contextId) {
      const selectedContext = contexts.find(ctx => ctx.context_id === contextId);
      if (selectedContext) {
        setRole(selectedContext.role);
        setCustomRole(selectedContext.custom_role || "");
        setPersona(selectedContext.persona || "");
        setContext(selectedContext.context || "");
        setContextName(selectedContext.name || "");
        chrome.storage.local.set({
          selectedRole: selectedContext.role,
          customRole: selectedContext.custom_role || "",
          persona: selectedContext.persona || "",
          userContext: selectedContext.context || "",
          contextName: selectedContext.name || "",
        });
      }
    } else {
      setContext("");
      setCustomRole("");
      setPersona("");
      setContextName("");
      chrome.storage.local.set({ userContext: "", customRole: "", persona: "", contextName: "" });
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
        setIsLogin(true);
      });
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    chrome.storage.local.remove(["token", "selectedRole", "customRole", "persona", "userContext", "contextName", "selectedContextId"], () => {
      setToken(null);
      setRole("Developer");
      setCustomRole("");
      setPersona("");
      setContext("");
      setContextName("");
      setContexts([]);
      setSelectedContextId(null);
    });
  };

  const handleSaveContext = async () => {
    if (role === "Custom" && (!customRole.trim() || !persona.trim())) {
      const customRoleInput = document.querySelector('#custom-role');
      const personaInput = document.querySelector('#persona');
      if (role === "Custom" && !customRole.trim() && customRoleInput) {
        customRoleInput.style.borderColor = '#ef4444';
        setTimeout(() => customRoleInput.style.borderColor = '', 2000);
      }
      if (role === "Custom" && !persona.trim() && personaInput) {
        personaInput.style.borderColor = '#ef4444';
        setTimeout(() => personaInput.style.borderColor = '', 2000);
      }
      return;
    }
    setLoading(true);
    setSaved(false);
    try {
      chrome.storage.local.set({ userContext: context, contextName: contextName });
      chrome.runtime.sendMessage(
        {
          type: "SAVE_CONTEXT",
          payload: { role, custom_role: role === "Custom" ? customRole : null, persona: role === "Custom" ? persona : null, context: context.trim() || null, name: contextName.trim() || null, token },
        },
        (response) => {
          setLoading(false);
          if (response && response.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            fetchContexts(token);
            setSelectedContextId(response.context_id);
            chrome.storage.local.set({ selectedContextId: response.context_id });
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
      <div className="min-w-80 max-w-96 bg-white shadow-2xl rounded-lg border border-gray-200 p-6">
        <style>{`
          .auth-button {
            transition: all 0.2s ease-in-out;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .auth-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
            background-image: linear-gradient(to right, #2563EB, #7C3AED);
          }
          .auth-button:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }
          .custom-select {
  appearance: none;
  background-image: url('data:image/svg+xml;utf8,<svg fill="none" stroke="%236B7280" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>');
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1.2rem;
  padding-right: 2.5rem;
  transition: all 0.2s ease-in-out;
  width: 100% !important;
  min-width: 0;
  max-width: 100%;
}

.custom-select option {
  padding: 0.5rem;
  background-color: #FFFFFF;
  color: #1F2937;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Force the dropdown to stay within container */
.custom-select:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  background-image: url('data:image/svg+xml;utf8,<svg fill="none" stroke="%233B82F6" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>');
  width: 100% !important;
}

.custom-select:hover {
  border-color: #3B82F6;
  background-color: #F9FAFB;
  width: 100% !important;
}
          .custom-select option:checked {
            background-color: #EFF6FF;
            color: #1E40AF;
            font-weight: 500;
          }
          .logout-button {
            padding: 0.5rem;
            border-radius: 0.5rem;
            transition: all 0.2s ease-in-out;
          }
          .logout-button:hover {
            background-color: rgba(255, 255, 255, 0.1);
            transform: scale(1.1);
          }
          .save-button {
            transition: all 0.2s ease-in-out;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .save-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
            background-image: linear-gradient(to right, #2563EB, #7C3AED);
          }
          .save-button:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }
          .input-field:hover {
            border-color: #3B82F6;
            background-color: #F9FAFB;
          }
          .textarea-field:hover {
            border-color: #3B82F6;
            background-color: #F9FAFB;
          }
        `}</style>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">✨</span>
          <h1 className="text-xl font-bold text-gray-800">ChatGPT Prompt Enhancer</h1>
        </div>
        <h2 className="text-lg font-semibold text-gray-700 text-center mb-4">
          {isLogin ? "Sign In to Enhance Your Prompts" : "Sign Up to Enhance Your Prompts"}
        </h2>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-800 text-sm input-field focus:outline-none"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-800 text-sm input-field focus:outline-none"
              placeholder="Enter your password"
              required
            />
          </div>
          {authError && <p className="text-red-500 text-xs text-center">{authError}</p>}
          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 auth-button text-sm ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
            disabled={loading}
          >
            {loading ? "Processing..." : isLogin ? "Login" : "Register"}
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <span
              className="text-blue-500 cursor-pointer hover:underline"
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
      <style>{`
        .custom-select {
          appearance: none;
          background-image: url('data:image/svg+xml;utf8,<svg fill="none" stroke="%236B7280" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>');
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 1.2rem;
          padding-right: 2.5rem;
          transition: all 0.2s ease-in-out;
        }
        .custom-select:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
          background-image: url('data:image/svg+xml;utf8,<svg fill="none" stroke="%233B82F6" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>');
        }
        .custom-select:hover {
          border-color: #3B82F6;
          background-color: #F9FAFB;
        }
        .custom-select option {
          padding: 0.5rem;
          background-color: #FFFFFF;
          color: #1F2937;
          font-size: 0.9rem;
        }
        .custom-select option:checked {
          background-color: #EFF6FF;
          color: #1E40AF;
          font-weight: 500;
        }
        .logout-button {
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s ease-in-out;
          background-color: rgba(255, 255, 255, 0.1);
        }
        .logout-button:hover {
          background-color: rgba(255, 255, 255, 0.1);
          transform: scale(1.1);
        }
        .save-button {
        transition: all 0.3s ease-in-out;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      .save-button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }
      .save-button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
        .input-field:hover {
          border-color: #3B82F6;
          background-color: #F9FAFB;
        }
        .textarea-field:hover {
          border-color: #3B82F6;
          background-color: #F9FAFB;
        }
        .context-dropdown {
          max-height: 100px; /* Fixed height for scrolling */
          overflow-y: auto; /* Enable vertical scrolling */
          width: 100%;
          max-width: 100%;
          min-width: 100%;
          box-sizing: border-box;
          display: block;
        }
        .context-dropdown option {
          max-width: 100%;
          overflow-x: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <h2 className="text-lg font-bold">✨ ChatGPT Prompt Enhancer</h2>
        <button
          onClick={handleLogout}
          className="text-white logout-button"
          title="Logout"
        >
          <LogOut size={20} color="#fff" strokeWidth={2.5}/>
        </button>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Select Role</label>
          <select
            className="w-full p-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 text-sm custom-select focus:outline-none"
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
            <option value="Custom">🛠️ Custom</option>
          </select>
        </div>
        {role === "Custom" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Custom Role Name</label>
              <input
                id="custom-role"
                type="text"
                value={customRole}
                onChange={handleCustomRoleChange}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-800 text-sm input-field focus:outline-none"
                placeholder="Enter custom role (e.g., AI Consultant)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Persona Description</label>
              <textarea
                id="persona"
                className="w-full h-20 p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none text-gray-800 text-sm placeholder-gray-400 textarea-field focus:outline-none"
                placeholder="Describe the persona (e.g., Expert in AI with 10 years of experience)"
                value={persona}
                onChange={handlePersonaChange}
                required
              />
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Context Name (Optional)</label>
          <input
            type="text"
            value={contextName}
            onChange={handleContextNameChange}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 text-gray-800 text-sm input-field focus:outline-none"
            placeholder="Enter a name for this context (optional)"
          />
          <p className="text-xs text-gray-500 mt-1">Name your context for easier selection in the dropdown</p>
        </div>
        <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Select Previous Context (Optional)</label>
          <div style={{ width: '100%', maxWidth: '100%', position: 'relative' }}>
            <select
              className="w-full p-3 border-2 border-gray-300 rounded-lg bg-white text-gray-800 text-sm custom-select focus:outline-none context-dropdown"
              value={selectedContextId || ''}
              onChange={handleContextSelect}
              style={{ 
                width: '100%', 
                maxWidth: '100%', 
                minWidth: '100%',
                boxSizing: 'border-box'
              }}
            >
              <option value="">Select previous context</option>
              {contexts.map((ctx) => (
                <option key={ctx.context_id} value={ctx.context_id}>
                  {ctx.name ? 
                    `${ctx.name.substring(0, 15)}${ctx.name.length > 15 ? '...' : ''} (${new Date(ctx.created_at).toLocaleDateString()})` : 
                    `${(ctx.custom_role || ctx.role).substring(0, 15)}${(ctx.custom_role || ctx.role).length > 15 ? '...' : ''} (${new Date(ctx.created_at).toLocaleDateString()})`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Project Context (Optional)</label>
          <textarea
            className="w-full h-32 p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 resize-none text-gray-800 text-sm placeholder-gray-400 textarea-field focus:outline-none"
            placeholder="Describe your project context here (optional)..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">This context will be used to enhance your prompts if provided</p>
        </div>
        <button
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white save-button text-sm ${
            loading || (role === "Custom" && (!customRole.trim() || !persona.trim()))
              ? "bg-gray-400 cursor-not-allowed"
              : saved
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gradient-to-r from-blue-500 to-purple-600"
          }`}
          onClick={handleSaveContext}
          disabled={loading || (role === "Custom" && (!customRole.trim() || !persona.trim()))}
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
        {(context.trim() || (role === "Custom" && persona.trim()) || contextName.trim()) && (
          <div className="border-2 border-gray-300 rounded-lg p-3 bg-blue-50">
            <div className="flex items-center gap-2 text-blue-800">
              <span className="text-blue-500">💡</span>
              <span className="font-semibold text-sm">Preview:</span>
            </div>
            {contextName.trim() && (
              <p className="text-xs text-blue-700 mt-1 line-clamp-3">
                Context Name: {contextName.substring(0, 150)}{contextName.length > 150 ? '...' : ''}
              </p>
            )}
            {context.trim() && (
              <p className="text-xs text-blue-700 mt-1 line-clamp-3">
                Context: {context.substring(0, 150)}{context.length > 150 ? '...' : ''}
              </p>
            )}
            {role === "Custom" && persona.trim() && (
              <p className="text-xs text-blue-700 mt-1 line-clamp-3">
                Persona: {persona.substring(0, 150)}{persona.length > 150 ? '...' : ''}
              </p>
            )}
          </div>
        )}
        <div className="border-2 border-gray-300 rounded-lg p-3 bg-green-50">
          <div className="flex items-center gap-2 text-green-800 mb-2">
            <span className="text-green-500">🚀</span>
            <span className="font-semibold text-sm">How it works:</span>
          </div>
          <ul className="text-xs text-green-700 space-y-1">
            <li>1. Select a role and optionally a context or persona</li>
            <li>2. Go to ChatGPT and type any prompt</li>
            <li>3. Click the ✨ icon next to the input</li>
            <li>4. Your prompt will be enhanced with the selected role and context!</li>
          </ul>
        </div>
        <div className="text-center pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">Role and optional context/persona will be saved automatically</p>
        </div>
      </div>
    </div>
  );
}