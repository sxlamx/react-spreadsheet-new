import * as React from 'react';
import { PivotTable, PivotTableProps } from './PivotTable';
import {
  PivotConfigurationProvider,
  usePivotConfiguration,
  PivotConfigurationStorage,
} from './PivotConfigurationManager';
import {
  ConfigurationToolbar,
  ConfigurationBrowser,
  SaveConfigurationDialog,
  ImportConfigurationDialog,
} from './PivotConfigurationUI';
import { PivotConfiguration } from './types';

/** Props for PivotTableWithConfiguration */
export interface PivotTableWithConfigurationProps extends Omit<PivotTableProps, 'configuration' | 'onConfigurationChange'> {
  /** Initial configuration (optional) */
  initialConfiguration?: PivotConfiguration;
  /** Configuration storage options */
  configurationStorage?: PivotConfigurationStorage;
  /** Configuration manager options */
  configurationOptions?: {
    maxHistorySize?: number;
    autoSave?: boolean;
    autoSaveDelay?: number;
    validateOnChange?: boolean;
  };
  /** Whether to show configuration browser */
  showConfigurationBrowser?: boolean;
  /** Called when configuration changes */
  onConfigurationChange?: (config: PivotConfiguration) => void;
}

/** Internal component that uses the configuration context */
const PivotTableWithConfigurationInternal: React.FC<PivotTableWithConfigurationProps> = ({
  initialConfiguration,
  showConfigurationBrowser = false,
  showConfigurationToolbar = true,
  onConfigurationChange,
  ...pivotTableProps
}) => {
  const configManager = usePivotConfiguration();

  // Dialog states
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [showImportDialog, setShowImportDialog] = React.useState(false);
  const [showBrowser, setShowBrowser] = React.useState(showConfigurationBrowser);

  // Initialize with provided configuration
  React.useEffect(() => {
    if (initialConfiguration && !configManager.state.activeConfiguration) {
      configManager.setActiveConfiguration(initialConfiguration);
    }
  }, [initialConfiguration, configManager]);

  // Sync configuration changes to parent
  React.useEffect(() => {
    if (configManager.state.activeConfiguration) {
      onConfigurationChange?.(configManager.state.activeConfiguration);
    }
  }, [configManager.state.activeConfiguration, onConfigurationChange]);

  // Get current configuration or use default
  const currentConfiguration = configManager.state.activeConfiguration || {
    rows: [],
    columns: [],
    values: [],
    filters: [],
    options: {
      showGrandTotals: true,
      showSubtotals: true,
      computeMode: pivotTableProps.mode || 'client',
    },
  };

  // Handle configuration changes from PivotTable
  const handleConfigurationChange = React.useCallback((config: PivotConfiguration) => {
    configManager.setActiveConfiguration(config);
  }, [configManager]);

  // Handle save configuration
  const handleSave = React.useCallback(async (name: string, description?: string, tags?: string[]) => {
    try {
      await configManager.saveConfiguration(name, description, tags);
      setShowSaveDialog(false);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      // Handle error - could show a toast or alert
    }
  }, [configManager]);

  // Handle import configuration
  const handleImport = React.useCallback(async (configJson: string) => {
    try {
      await configManager.importConfiguration(configJson);
      setShowImportDialog(false);
    } catch (error) {
      console.error('Failed to import configuration:', error);
      // Handle error - could show a toast or alert
    }
  }, [configManager]);

  // Handle new configuration
  const handleNew = React.useCallback(() => {
    configManager.resetToDefault();
  }, [configManager]);

  // Handle load configuration
  const handleLoad = React.useCallback(() => {
    setShowBrowser(true);
  }, []);

  // Handle configuration selection from browser
  const handleConfigurationSelect = React.useCallback((config: any) => {
    setShowBrowser(false);
    // Configuration is already loaded by the browser component
  }, []);

  return (
    <>
      {showConfigurationToolbar && (
        <ConfigurationToolbar
          onSave={() => setShowSaveDialog(true)}
          onLoad={handleLoad}
          onImport={() => setShowImportDialog(true)}
          onNew={handleNew}
          canUndo={configManager.canUndo}
          canRedo={configManager.canRedo}
          onUndo={configManager.undo}
          onRedo={configManager.redo}
          isDirty={configManager.state.isDirty}
          className="PivotTable__configuration-toolbar"
        />
      )}

      {showBrowser && (
        <div className="PivotTable__configuration-browser-overlay">
          <div className="PivotTable__configuration-browser-container">
            <div className="PivotTable__configuration-browser-header">
              <h3>Load Configuration</h3>
              <button
                onClick={() => setShowBrowser(false)}
                className="PivotTable__configuration-browser-close"
                type="button"
              >
                ×
              </button>
            </div>
            <ConfigurationBrowser
              onSelect={handleConfigurationSelect}
              showActions={true}
              className="PivotTable__configuration-browser"
            />
          </div>
        </div>
      )}

      <PivotTable
        {...pivotTableProps}
        configuration={currentConfiguration}
        onConfigurationChange={handleConfigurationChange}
        showConfigurationToolbar={false} // We handle this at the wrapper level
      />

      <SaveConfigurationDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSave}
      />

      <ImportConfigurationDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImport}
      />
    </>
  );
};

/** PivotTable component with integrated configuration management */
export const PivotTableWithConfiguration: React.FC<PivotTableWithConfigurationProps> = ({
  configurationStorage,
  configurationOptions,
  ...props
}) => {
  return (
    <PivotConfigurationProvider
      storage={configurationStorage}
      options={configurationOptions}
    >
      <PivotTableWithConfigurationInternal {...props} />
    </PivotConfigurationProvider>
  );
};

export default PivotTableWithConfiguration;