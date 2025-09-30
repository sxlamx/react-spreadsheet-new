/**
 * Settings Panel Component
 * Provides UI for configuring spreadsheet settings including API URL and authentication
 */

import React, { useState, useEffect } from 'react';
import { useSettings, SpreadsheetSettings } from '../config/settings';
import { pivotApiClient } from '../pivot/api/ApiClient';

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: SpreadsheetSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [settings, updateSettings] = useSettings();
  const [localSettings, setLocalSettings] = useState<SpreadsheetSettings>(settings);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update local settings when global settings change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleInputChange = (section: keyof SpreadsheetSettings, field: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));

    // Clear error when user starts typing
    if (errors[`${section}.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${section}.${field}`];
        return newErrors;
      });
    }
  };

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate API URL
    if (!localSettings.api.baseUrl) {
      newErrors['api.baseUrl'] = 'API URL is required';
    } else {
      try {
        new URL(localSettings.api.baseUrl);
      } catch {
        newErrors['api.baseUrl'] = 'Invalid URL format';
      }
    }

    // Validate timeout
    if (localSettings.api.timeout < 1000) {
      newErrors['api.timeout'] = 'Timeout must be at least 1000ms';
    }

    // Validate auth settings if enabled
    if (localSettings.auth.enabled) {
      if (localSettings.auth.provider === 'google' && !localSettings.auth.clientId) {
        newErrors['auth.clientId'] = 'Google Client ID is required when using Google authentication';
      }
    }

    // Validate pivot settings
    if (localSettings.pivot.maxRows < 1) {
      newErrors['pivot.maxRows'] = 'Max rows must be at least 1';
    }

    if (localSettings.pivot.maxColumns < 1) {
      newErrors['pivot.maxColumns'] = 'Max columns must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const testConnection = async () => {
    if (!localSettings.api.baseUrl) {
      setConnectionStatus('error');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      // Create temporary client with new URL
      const testClient = new (pivotApiClient.constructor as any)(localSettings.api.baseUrl);
      const isConnected = await testClient.testConnection();
      setConnectionStatus(isConnected ? 'success' : 'error');
    } catch {
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = () => {
    if (!validateSettings()) {
      return;
    }

    updateSettings(localSettings);
    onSave?.(localSettings);
    setConnectionStatus('idle');
  };

  const handleReset = () => {
    const confirmed = window.confirm('Are you sure you want to reset all settings to defaults?');
    if (confirmed) {
      // Reset to defaults
      const { DEFAULT_SETTINGS } = require('../config/settings');
      setLocalSettings(DEFAULT_SETTINGS);
      setErrors({});
      setConnectionStatus('idle');
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(localSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'spreadsheet-settings.json';
    link.click();

    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setLocalSettings(imported);
        setErrors({});
        setConnectionStatus('idle');
      } catch {
        alert('Invalid settings file format');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-900">Spreadsheet Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* API Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Base URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={localSettings.api.baseUrl}
                    onChange={(e) => handleInputChange('api', 'baseUrl', e.target.value)}
                    className={`flex-1 p-2 border rounded-md ${
                      errors['api.baseUrl'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="http://localhost:8000"
                  />
                  <button
                    onClick={testConnection}
                    disabled={isTestingConnection}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isTestingConnection ? 'Testing...' : 'Test'}
                  </button>
                </div>
                {errors['api.baseUrl'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['api.baseUrl']}</p>
                )}
                {connectionStatus === 'success' && (
                  <p className="text-green-500 text-sm mt-1">✓ Connection successful</p>
                )}
                {connectionStatus === 'error' && (
                  <p className="text-red-500 text-sm mt-1">✗ Connection failed</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={localSettings.api.timeout}
                    onChange={(e) => handleInputChange('api', 'timeout', parseInt(e.target.value))}
                    className={`w-full p-2 border rounded-md ${
                      errors['api.timeout'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    min="1000"
                  />
                  {errors['api.timeout'] && (
                    <p className="text-red-500 text-sm mt-1">{errors['api.timeout']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retry Attempts
                  </label>
                  <input
                    type="number"
                    value={localSettings.api.retryAttempts}
                    onChange={(e) => handleInputChange('api', 'retryAttempts', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="0"
                    max="10"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Authentication Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication (Future)</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auth-enabled"
                  checked={localSettings.auth.enabled}
                  onChange={(e) => handleInputChange('auth', 'enabled', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="auth-enabled" className="text-sm font-medium text-gray-700">
                  Enable Authentication (JWT)
                </label>
              </div>

              {localSettings.auth.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auth Provider
                    </label>
                    <select
                      value={localSettings.auth.provider}
                      onChange={(e) => handleInputChange('auth', 'provider', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="google">Google</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  {localSettings.auth.provider === 'google' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Google Client ID
                      </label>
                      <input
                        type="text"
                        value={localSettings.auth.clientId || ''}
                        onChange={(e) => handleInputChange('auth', 'clientId', e.target.value)}
                        className={`w-full p-2 border rounded-md ${
                          errors['auth.clientId'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="your-client-id.apps.googleusercontent.com"
                      />
                      {errors['auth.clientId'] && (
                        <p className="text-red-500 text-sm mt-1">{errors['auth.clientId']}</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Pivot Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Pivot Table Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Rows
                </label>
                <input
                  type="number"
                  value={localSettings.pivot.maxRows}
                  onChange={(e) => handleInputChange('pivot', 'maxRows', parseInt(e.target.value))}
                  className={`w-full p-2 border rounded-md ${
                    errors['pivot.maxRows'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="1"
                />
                {errors['pivot.maxRows'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['pivot.maxRows']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Columns
                </label>
                <input
                  type="number"
                  value={localSettings.pivot.maxColumns}
                  onChange={(e) => handleInputChange('pivot', 'maxColumns', parseInt(e.target.value))}
                  className={`w-full p-2 border rounded-md ${
                    errors['pivot.maxColumns'] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min="1"
                />
                {errors['pivot.maxColumns'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['pivot.maxColumns']}</p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="cache-enabled"
                  checked={localSettings.pivot.cacheEnabled}
                  onChange={(e) => handleInputChange('pivot', 'cacheEnabled', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="cache-enabled" className="text-sm font-medium text-gray-700">
                  Enable Caching
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  checked={localSettings.pivot.autoRefresh}
                  onChange={(e) => handleInputChange('pivot', 'autoRefresh', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="auto-refresh" className="text-sm font-medium text-gray-700">
                  Auto Refresh Data
                </label>
              </div>
            </div>
          </section>

          {/* UI Settings */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Interface</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Theme
                </label>
                <select
                  value={localSettings.ui.theme}
                  onChange={(e) => handleInputChange('ui', 'theme', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locale
                </label>
                <select
                  value={localSettings.ui.locale}
                  onChange={(e) => handleInputChange('ui', 'locale', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                  <option value="de-DE">Deutsch</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="debug-info"
                  checked={localSettings.ui.showDebugInfo}
                  onChange={(e) => handleInputChange('ui', 'showDebugInfo', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="debug-info" className="text-sm font-medium text-gray-700">
                  Show Debug Information
                </label>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div className="space-x-2">
            <button
              onClick={exportSettings}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Export Settings
            </button>
            <label className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
              Import Settings
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </label>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};