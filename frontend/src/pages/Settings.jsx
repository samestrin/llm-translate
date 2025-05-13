import React, { useState } from 'react'; // Import useState
import { useSettings } from '../contexts/SettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Save, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Tooltip } from '../components/UI/Tooltip';
import { Info } from 'lucide-react';
import Modal from '../components/UI/Modal'; // Import the Modal component

const Settings = () => {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { darkMode, toggleTheme } = useTheme();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false); // State for modal

  const handleProviderChange = (e) => {
    updateSetting('aiProvider', e.target.value);
  };

  const handleInterfaceLanguageChange = (e) => {
    updateSetting('interfaceLanguage', e.target.value);
  };

  const handleAutoTranslateChange = (e) => {
    updateSetting('autoTranslate', e.target.checked);
  };

  const handleAutoTranslateDelayChange = (e) => {
    updateSetting('autoTranslateDelay', parseInt(e.target.value, 10));
  };

  const handleHistoryEnabledChange = (e) => {
    updateSetting('historyEnabled', e.target.checked);
  };

  const handleMaxHistoryItemsChange = (e) => {
    updateSetting('maxHistoryItems', parseInt(e.target.value, 10));
  };

  const handleResetSettings = () => {
    // resetSettings();
    // toast.success('Settings have been reset to defaults');
    setIsResetModalOpen(true); // Open the modal instead
  };

  const confirmResetSettings = () => {
    resetSettings();
    toast.success('Settings have been reset to defaults');
    setIsResetModalOpen(false); // Close the modal
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button
          onClick={handleResetSettings}
          className="flex items-center px-3 py-2 bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-800 dark:hover:bg-secondary-700 rounded-md text-secondary-700 dark:text-secondary-300"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Appearance</h2>
        
        <div className="mb-4">
          <label className="flex items-center justify-between">
            <span className="text-secondary-700 dark:text-secondary-300">Theme</span>
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 px-3 py-2 bg-secondary-100 dark:bg-secondary-700 rounded-md"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </label>
        </div>
        
        <div className="mb-4">
          <label className="block text-secondary-700 dark:text-secondary-300 mb-2">
            Interface Language
          </label>
          <select
            value={settings.interfaceLanguage}
            onChange={handleInterfaceLanguageChange}
            className="w-full px-3 py-2 bg-white dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="English">English</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="German">German</option>
            <option value="Chinese">Chinese</option>
            <option value="Japanese">Japanese</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Translation</h2>
        
        <div className="mb-4">
          <label className="block text-secondary-700 dark:text-secondary-300 mb-2">
            AI Provider
          </label>
          <select
            value={settings.aiProvider}
            onChange={handleProviderChange}
            className="w-full px-3 py-2 bg-white dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="auto">Auto (Use server default)</option>
            <option value="openai">OpenAI</option>
            <option value="groq">Groq</option>
            <option value="openrouter">OpenRouter</option>
          </select>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Note: The server must be configured to support the selected provider.
          </p>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.autoTranslate}
              onChange={handleAutoTranslateChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
            />
            <span className="ml-2 text-secondary-700 dark:text-secondary-300">
              Auto-translate as I type
            </span>
          </label>
        </div>
        
        {settings.autoTranslate && (
          <div className="mb-4 pl-6">
            <label className="block text-secondary-700 dark:text-secondary-300 mb-2">
              Auto-translate delay (ms)
            </label>
            <input
              type="number"
              min="500"
              max="5000"
              step="100"
              value={settings.autoTranslateDelay}
              onChange={handleAutoTranslateDelayChange}
              className="w-full px-3 py-2 bg-white dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">History</h2>
        
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.historyEnabled}
              onChange={handleHistoryEnabledChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
            />
            <span className="ml-2 text-secondary-700 dark:text-secondary-300">
              Save translation history
            </span>
          </label>
        </div>
        
        {settings.historyEnabled && (
          <div className="mb-4">
            <label className="block text-secondary-700 dark:text-secondary-300 mb-2">
              Maximum history items
            </label>
            <input
              type="number"
              min="10"
              max="200"
              step="10"
              value={settings.maxHistoryItems}
              onChange={handleMaxHistoryItemsChange}
              className="w-full px-3 py-2 bg-white dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        )}
      </div>
      
      {/* Modal for Reset Confirmation */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Confirm Reset"
        description="Are you sure you want to reset all settings to their default values? This action cannot be undone."
      >
        <div className="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-700 dark:hover:bg-secondary-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={() => setIsResetModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            onClick={confirmResetSettings}
          >
            Reset Settings
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;