import * as React from 'react';
import { usePivotConfiguration, SavedPivotConfiguration } from './PivotConfigurationManager';
import './PivotConfigurationUI.css';

/** Configuration browser component */
export const ConfigurationBrowser: React.FC<{
  onSelect?: (config: SavedPivotConfiguration) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  className?: string;
}> = ({ onSelect, onDelete, showActions = true, className }) => {
  const {
    state,
    loadConfiguration,
    deleteConfiguration,
    duplicateConfiguration,
    toggleFavorite,
    searchConfigurations,
    exportConfiguration,
  } = usePivotConfiguration();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [sortBy, setSortBy] = React.useState<'name' | 'modified' | 'created'>('modified');
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);

  // Get filtered and sorted configurations
  const filteredConfigurations = React.useMemo(() => {
    let configs = searchConfigurations(searchQuery, selectedTags.length > 0 ? selectedTags : undefined);

    if (showFavoritesOnly) {
      configs = configs.filter(c => c.isFavorite);
    }

    return configs.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return b.createdAt - a.createdAt;
        case 'modified':
        default:
          return b.modifiedAt - a.modifiedAt;
      }
    });
  }, [searchConfigurations, searchQuery, selectedTags, sortBy, showFavoritesOnly]);

  // Get all available tags
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    state.savedConfigurations.forEach(config => {
      config.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [state.savedConfigurations]);

  const handleLoad = async (config: SavedPivotConfiguration) => {
    try {
      await loadConfiguration(config.id);
      onSelect?.(config);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      try {
        await deleteConfiguration(id);
        onDelete?.(id);
      } catch (error) {
        console.error('Failed to delete configuration:', error);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    const original = state.savedConfigurations.find(c => c.id === id);
    if (!original) return;

    const newName = prompt('Enter name for duplicated configuration:', `${original.name} (Copy)`);
    if (!newName) return;

    try {
      await duplicateConfiguration(id, newName);
    } catch (error) {
      console.error('Failed to duplicate configuration:', error);
    }
  };

  const handleExport = (id: string) => {
    try {
      const configJson = exportConfiguration(id);
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const config = state.savedConfigurations.find(c => c.id === id);
      const filename = `${config?.name || 'configuration'}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export configuration:', error);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFavorite(id);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (state.isLoading) {
    return (
      <div className={`ConfigurationBrowser ConfigurationBrowser--loading ${className || ''}`}>
        <div className="ConfigurationBrowser__loading">
          <div className="ConfigurationBrowser__spinner" />
          <span>Loading configurations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`ConfigurationBrowser ${className || ''}`}>
      {/* Search and filters */}
      <div className="ConfigurationBrowser__filters">
        <div className="ConfigurationBrowser__search">
          <input
            type="text"
            className="ConfigurationBrowser__search-input"
            placeholder="Search configurations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="ConfigurationBrowser__controls">
          <select
            className="ConfigurationBrowser__sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="modified">Recently Modified</option>
            <option value="created">Recently Created</option>
            <option value="name">Name</option>
          </select>

          <label className="ConfigurationBrowser__checkbox">
            <input
              type="checkbox"
              checked={showFavoritesOnly}
              onChange={(e) => setShowFavoritesOnly(e.target.checked)}
            />
            Favorites only
          </label>
        </div>
      </div>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <div className="ConfigurationBrowser__tags">
          <span className="ConfigurationBrowser__tags-label">Filter by tags:</span>
          <div className="ConfigurationBrowser__tags-list">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`ConfigurationBrowser__tag ${
                  selectedTags.includes(tag) ? 'ConfigurationBrowser__tag--selected' : ''
                }`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Configuration list */}
      <div className="ConfigurationBrowser__list">
        {filteredConfigurations.length === 0 ? (
          <div className="ConfigurationBrowser__empty">
            {state.savedConfigurations.length === 0
              ? 'No saved configurations yet'
              : 'No configurations match your search criteria'
            }
          </div>
        ) : (
          filteredConfigurations.map(config => (
            <div key={config.id} className="ConfigurationItem">
              <div className="ConfigurationItem__header">
                <div className="ConfigurationItem__title">
                  <button
                    className="ConfigurationItem__name"
                    onClick={() => handleLoad(config)}
                    title="Click to load this configuration"
                  >
                    {config.name}
                  </button>
                  {config.isFavorite && (
                    <span className="ConfigurationItem__favorite">★</span>
                  )}
                </div>

                {showActions && (
                  <div className="ConfigurationItem__actions">
                    <button
                      className="ConfigurationItem__action"
                      onClick={() => handleToggleFavorite(config.id)}
                      title={config.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {config.isFavorite ? '★' : '☆'}
                    </button>
                    <button
                      className="ConfigurationItem__action"
                      onClick={() => handleDuplicate(config.id)}
                      title="Duplicate configuration"
                    >
                      📋
                    </button>
                    <button
                      className="ConfigurationItem__action"
                      onClick={() => handleExport(config.id)}
                      title="Export configuration"
                    >
                      📤
                    </button>
                    <button
                      className="ConfigurationItem__action ConfigurationItem__action--danger"
                      onClick={() => handleDelete(config.id)}
                      title="Delete configuration"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>

              {config.description && (
                <p className="ConfigurationItem__description">{config.description}</p>
              )}

              <div className="ConfigurationItem__meta">
                <span className="ConfigurationItem__date">
                  Modified {new Date(config.modifiedAt).toLocaleString()}
                </span>
                {config.tags && config.tags.length > 0 && (
                  <div className="ConfigurationItem__tags">
                    {config.tags.map(tag => (
                      <span key={tag} className="ConfigurationItem__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="ConfigurationItem__summary">
                <span>
                  {config.configuration.rows.length} rows,{' '}
                  {config.configuration.columns.length} columns,{' '}
                  {config.configuration.values.length} values
                  {config.configuration.filters.length > 0 && (
                    <>, {config.configuration.filters.length} filters</>
                  )}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {state.error && (
        <div className="ConfigurationBrowser__error">
          Error: {state.error}
        </div>
      )}
    </div>
  );
};

/** Save configuration dialog */
export const SaveConfigurationDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string, tags?: string[]) => void;
  className?: string;
}> = ({ isOpen, onClose, onSave, className }) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await onSave(name.trim(), description.trim() || undefined, tagArray.length > 0 ? tagArray : undefined);

      // Reset form
      setName('');
      setDescription('');
      setTags('');
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setTags('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`SaveConfigurationDialog ${className || ''}`}>
      <div className="SaveConfigurationDialog__overlay" onClick={handleClose} />
      <div className="SaveConfigurationDialog__content">
        <div className="SaveConfigurationDialog__header">
          <h3 className="SaveConfigurationDialog__title">Save Configuration</h3>
          <button
            className="SaveConfigurationDialog__close"
            onClick={handleClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="SaveConfigurationDialog__form">
          <div className="SaveConfigurationDialog__field">
            <label className="SaveConfigurationDialog__label">
              Name *
              <input
                type="text"
                className="SaveConfigurationDialog__input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="Enter configuration name"
              />
            </label>
          </div>

          <div className="SaveConfigurationDialog__field">
            <label className="SaveConfigurationDialog__label">
              Description
              <textarea
                className="SaveConfigurationDialog__textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Optional description"
                rows={3}
              />
            </label>
          </div>

          <div className="SaveConfigurationDialog__field">
            <label className="SaveConfigurationDialog__label">
              Tags
              <input
                type="text"
                className="SaveConfigurationDialog__input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isSubmitting}
                placeholder="Comma-separated tags (e.g., sales, quarterly, finance)"
              />
            </label>
            <small className="SaveConfigurationDialog__help">
              Separate multiple tags with commas
            </small>
          </div>

          <div className="SaveConfigurationDialog__actions">
            <button
              type="button"
              className="SaveConfigurationDialog__button SaveConfigurationDialog__button--secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="SaveConfigurationDialog__button SaveConfigurationDialog__button--primary"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/** Import configuration dialog */
export const ImportConfigurationDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImport: (configJson: string) => void;
  className?: string;
}> = ({ isOpen, onClose, onImport, className }) => {
  const [configJson, setConfigJson] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configJson.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onImport(configJson.trim());
      setConfigJson('');
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setConfigJson(content);
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setConfigJson('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`ImportConfigurationDialog ${className || ''}`}>
      <div className="ImportConfigurationDialog__overlay" onClick={handleClose} />
      <div className="ImportConfigurationDialog__content">
        <div className="ImportConfigurationDialog__header">
          <h3 className="ImportConfigurationDialog__title">Import Configuration</h3>
          <button
            className="ImportConfigurationDialog__close"
            onClick={handleClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ImportConfigurationDialog__form">
          <div className="ImportConfigurationDialog__field">
            <label className="ImportConfigurationDialog__label">
              Upload Configuration File
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="ImportConfigurationDialog__file"
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className="ImportConfigurationDialog__field">
            <label className="ImportConfigurationDialog__label">
              Or Paste Configuration JSON
              <textarea
                className="ImportConfigurationDialog__textarea"
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                disabled={isSubmitting}
                placeholder="Paste configuration JSON here..."
                rows={10}
              />
            </label>
          </div>

          {error && (
            <div className="ImportConfigurationDialog__error">
              {error}
            </div>
          )}

          <div className="ImportConfigurationDialog__actions">
            <button
              type="button"
              className="ImportConfigurationDialog__button ImportConfigurationDialog__button--secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ImportConfigurationDialog__button ImportConfigurationDialog__button--primary"
              disabled={!configJson.trim() || isSubmitting}
            >
              {isSubmitting ? 'Importing...' : 'Import Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/** Configuration toolbar with save/load actions */
export const ConfigurationToolbar: React.FC<{
  onSave?: () => void;
  onLoad?: () => void;
  onImport?: () => void;
  onNew?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isDirty?: boolean;
  className?: string;
}> = ({
  onSave,
  onLoad,
  onImport,
  onNew,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  isDirty = false,
  className,
}) => {
  return (
    <div className={`ConfigurationToolbar ${className || ''}`}>
      <div className="ConfigurationToolbar__group">
        <button
          className="ConfigurationToolbar__button"
          onClick={onNew}
          title="New configuration"
          type="button"
        >
          📄 New
        </button>
        <button
          className="ConfigurationToolbar__button"
          onClick={onLoad}
          title="Load saved configuration"
          type="button"
        >
          📂 Open
        </button>
        <button
          className={`ConfigurationToolbar__button ${
            isDirty ? 'ConfigurationToolbar__button--highlighted' : ''
          }`}
          onClick={onSave}
          title="Save current configuration"
          type="button"
        >
          💾 Save{isDirty ? ' *' : ''}
        </button>
        <button
          className="ConfigurationToolbar__button"
          onClick={onImport}
          title="Import configuration from file"
          type="button"
        >
          📥 Import
        </button>
      </div>

      <div className="ConfigurationToolbar__group">
        <button
          className="ConfigurationToolbar__button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last change"
          type="button"
        >
          ↶ Undo
        </button>
        <button
          className="ConfigurationToolbar__button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo last change"
          type="button"
        >
          ↷ Redo
        </button>
      </div>
    </div>
  );
};

export default ConfigurationBrowser;