import { useState, useEffect } from "react";
import { Save, Check, Trash2 } from "lucide-react";
import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css"; // ensure Tailwind CSS is loaded




export default function Settings() {
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

  useEffect(() => {
    chrome.storage.local.get(["token"], (result) => {
      if (result.token) {
        setToken(result.token);
        fetchContexts(result.token);
      }
    });
  }, []);

  const fetchContexts = (authToken) => {
    chrome.runtime.sendMessage(
      { type: "GET_CONTEXTS", payload: { token: authToken } },
      (response) => {
        if (response && response.success && response.contexts) {
          setContexts(response.contexts);
        } else {
          setContexts([]);
        }
      }
    );
  };

  const handleRoleChange = (e) => setRole(e.target.value);
  const handleCustomRoleChange = (e) => setCustomRole(e.target.value);
  const handlePersonaChange = (e) => setPersona(e.target.value);
  const handleContextNameChange = (e) => setContextName(e.target.value);

  const handleContextSelect = (contextId) => {
    setSelectedContextId(contextId);
    if (contextId) {
      const selectedContext = contexts.find((ctx) => ctx.context_id === contextId);
      if (selectedContext) {
        setRole(selectedContext.role);
        setCustomRole(selectedContext.custom_role || "");
        setPersona(selectedContext.persona || "");
        setContext(selectedContext.context || "");
        setContextName(selectedContext.name || "");
      }
    } else {
      setRole("Developer");
      setCustomRole("");
      setPersona("");
      setContext("");
      setContextName("");
    }
  };

  const handleSaveContext = () => {
    if (role === "Custom" && (!customRole.trim() || !persona.trim())) return;
    setLoading(true);
    chrome.runtime.sendMessage(
      {
        type: "SAVE_CONTEXT",
        payload: {
          role,
          custom_role: role === "Custom" ? customRole : null,
          persona: role === "Custom" ? persona : null,
          context: context.trim() || null,
          name: contextName.trim() || null,
          context_id: selectedContextId,
          token,
        },
      },
      (response) => {
        setLoading(false);
        if (response && response.success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          fetchContexts(token);
          if (!selectedContextId) {
            handleContextSelect(response.context_id);
          }
        }
      }
    );
  };

  const handleDeleteContext = (contextId) => {
    if (confirm("Are you sure you want to delete this context?")) {
      chrome.runtime.sendMessage(
        { type: "DELETE_CONTEXT", payload: { context_id: contextId, token } },
        (response) => {
          if (response && response.success) {
            fetchContexts(token);
            if (selectedContextId === contextId) {
              handleContextSelect(null);
            }
          }
        }
      );
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ width: '100vw', height: '100vh' }}>
        <div className="bg-white shadow-lg rounded-lg border p-6 text-center max-w-sm">
          Please login from the popup to access settings.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ width: '100vw', height: '100vh' }}>
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 shadow-md flex-shrink-0">
        <h1 className="text-3xl font-bold flex items-center gap-2">✨ Settings</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex justify-center p-6 overflow-auto">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          
          {/* Manage Contexts */}
          <div className="bg-white shadow-lg rounded-xl border p-6 flex flex-col h-full min-h-0">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex-shrink-0">Manage Contexts</h2>
            <div className="flex-1 min-h-0 mb-4">
              <ul className="space-y-2 h-full overflow-y-auto pr-2">
                {contexts.map((ctx) => (
                  <li
                    key={ctx.context_id}
                    className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition flex-shrink-0"
                  >
                    <span
                      className={`cursor-pointer truncate flex-1 ${
                        selectedContextId === ctx.context_id
                          ? "font-bold text-blue-600"
                          : "text-gray-700"
                      }`}
                      onClick={() => handleContextSelect(ctx.context_id)}
                    >
                      {ctx.name || ctx.role} ({new Date(ctx.created_at).toLocaleDateString()})
                    </span>
                    <button
                      onClick={() => handleDeleteContext(ctx.context_id)}
                      className="p-2 rounded-lg hover:bg-red-100 text-red-500 flex-shrink-0 ml-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
                {contexts.length === 0 && (
                  <li className="text-center text-gray-500 py-8">
                    No contexts found. Create your first one!
                  </li>
                )}
              </ul>
            </div>
            <button
              onClick={() => handleContextSelect(null)}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition flex-shrink-0"
            >
              Create New Context
            </button>
          </div>

          {/* New/Edit Context */}
          <div className="bg-white shadow-lg rounded-xl border p-6 flex flex-col h-full">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex-shrink-0">
              {selectedContextId ? "Edit Context" : "New Context"}
            </h2>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Role</label>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:ring focus:ring-blue-200 outline-none transition-colors"
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
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Custom Role Name</label>
                    <input
                      type="text"
                      value={customRole}
                      onChange={handleCustomRoleChange}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:ring focus:ring-blue-200 outline-none transition-colors"
                      placeholder="Enter custom role"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Persona Description</label>
                    <textarea
                      value={persona}
                      onChange={handlePersonaChange}
                      rows={4}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg resize-none focus:border-blue-400 focus:ring focus:ring-blue-200 outline-none transition-colors"
                      placeholder="Describe persona"
                    />
                  </div>
                </>
              )}

              {/* Context Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Context Name (Optional)</label>
                <input
                  type="text"
                  value={contextName}
                  onChange={handleContextNameChange}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:ring focus:ring-blue-200 outline-none transition-colors"
                  placeholder="Enter a name for this context"
                />
              </div>

              {/* Project Context */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project Context (Optional)</label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={6}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg resize-none focus:border-blue-400 focus:ring focus:ring-blue-200 outline-none transition-colors"
                  placeholder="Describe your project context here..."
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveContext}
              disabled={loading || (role === "Custom" && (!customRole.trim() || !persona.trim()))}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition mt-6 flex-shrink-0 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : saved
                  ? "bg-green-600 hover:bg-green-700"
                  : role === "Custom" && (!customRole.trim() || !persona.trim())
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              }`}
            >
              {loading ? "Saving..." : saved ? <><Check size={18} /> Saved!</> : <><Save size={18} /> Save Context</>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Settings />
  </React.StrictMode>
);
