import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Send, ChevronDown } from 'lucide-react';

function App() {
  const [selectedRole, setSelectedRole] = useState('general');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const roles = [
    { id: 'general', name: 'General', description: 'General purpose prompts' },
    { id: 'designer', name: 'Designer', description: 'UI/UX design and creative tasks' },
    { id: 'developer', name: 'Developer', description: 'Programming and technical tasks' },
    { id: 'writer', name: 'Writer', description: 'Content writing and editing' },
    { id: 'marketer', name: 'Marketer', description: 'Marketing and business tasks' },
    { id: 'researcher', name: 'Researcher', description: 'Research and analysis tasks' }
  ];

  useEffect(() => {
    // Load saved settings
    chrome.storage.sync.get(['selectedRole', 'apiKey'], (result) => {
      if (result.selectedRole) setSelectedRole(result.selectedRole);
      if (result.apiKey) setApiKey(result.apiKey);
    });
  }, []);

  const saveSettings = () => {
    chrome.storage.sync.set({
      selectedRole: selectedRole,
      apiKey: apiKey
    });
    setShowSettings(false);
  };

  const enhancePrompt = async () => {
    if (!prompt.trim() || !apiKey) return;
    
    setIsLoading(true);
    try {
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url && tab.url.includes('chat.openai.com')) {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'enhancePrompt',
          prompt: prompt,
          role: selectedRole,
          apiKey: apiKey
        });
        
        // Close popup after sending message
        window.close();
      } else {
        alert('Please navigate to ChatGPT to use this extension');
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      alert('Failed to enhance prompt. Please make sure you are on ChatGPT.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 bg-white shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <h1 className="text-lg font-bold">Prompt Enhancer</h1>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-white/20 rounded"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold mb-3">Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Gemini API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <button
              onClick={saveSettings}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-600"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-4">
        {/* Role Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Role</label>
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm appearance-none bg-white"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {roles.find(r => r.id === selectedRole)?.description}
          </p>
        </div>

        {/* Prompt Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Your Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={4}
            className="w-full px-3 py-2 border rounded-md text-sm resize-none"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={enhancePrompt}
          disabled={!prompt.trim() || !apiKey || isLoading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Enhancing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Enhance Prompt</span>
            </>
          )}
        </button>

        {!apiKey && (
          <p className="text-xs text-red-500 mt-2 text-center">
            Please add your Gemini API key in settings
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
