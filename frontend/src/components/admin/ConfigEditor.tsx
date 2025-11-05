import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { LoadingButton, Spinner } from '../shared/LoadingStates';
import { useNotification } from '../../context/NotificationContext';

interface ConfigEditorField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'color' | 'select';
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string }>;
  helpText?: string;
}

interface ConfigEditorProps<T> {
  title: string;
  subtitle?: string;
  fields: ConfigEditorField[];
  initialData?: T;
  onSave: (data: T) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
}

export function ConfigEditor<T extends Record<string, any>>({
  title,
  subtitle,
  fields,
  initialData,
  onSave,
  onCancel,
  isLoading = false,
  gradientFrom = 'from-blue-600',
  gradientTo = 'to-purple-600',
}: ConfigEditorProps<T>) {
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState<T>({} as T);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Initialize with empty values
      const emptyData = fields.reduce((acc, field) => {
        acc[field.name] = field.type === 'number' ? 0 : '';
        return acc;
      }, {} as any);
      setFormData(emptyData);
    }
  }, [initialData, fields]);

  // Validate field
  const validateField = (field: ConfigEditorField, value: any): string | null => {
    if (field.required && !value) {
      return `${field.label} is required`;
    }

    if (field.type === 'text' || field.type === 'textarea') {
      if (field.minLength && value.length < field.minLength) {
        return `${field.label} must be at least ${field.minLength} characters`;
      }
      if (field.maxLength && value.length > field.maxLength) {
        return `${field.label} must be less than ${field.maxLength} characters`;
      }
    }

    if (field.type === 'number') {
      if (field.min !== undefined && value < field.min) {
        return `${field.label} must be at least ${field.min}`;
      }
      if (field.max !== undefined && value > field.max) {
        return `${field.label} must be at most ${field.max}`;
      }
    }

    return null;
  };

  // Handle field change
  const handleChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setIsDirty(true);

    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      showNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors before saving',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      setIsDirty(false);
      showNotification({
        type: 'success',
        title: 'Success',
        message: 'Saved successfully',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save';
      showNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
      
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Render field
  const renderField = (field: ConfigEditorField) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];

    const baseInputClasses = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
      error ? 'border-red-500' : 'border-gray-300'
    }`;

    return (
      <div key={field.name} className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseInputClasses}
          />
        ) : field.type === 'select' ? (
          <select
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={baseInputClasses}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : field.type === 'color' ? (
          <div className="flex gap-2">
            <input
              type="color"
              value={value || '#3B82F6'}
              onChange={(e) => handleChange(field.name, e.target.value)}
              className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={value || '#3B82F6'}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder="#3B82F6"
              className={`flex-1 ${baseInputClasses}`}
            />
          </div>
        ) : (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleChange(field.name, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            className={baseInputClasses}
          />
        )}

        {field.helpText && !error && (
          <p className="mt-1 text-sm text-gray-500">{field.helpText}</p>
        )}

        {error && (
          <div className="mt-1 flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Gradient Header */}
      <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} px-6 py-4 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && <p className="text-blue-100 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          {fields.map(renderField)}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              loading={isSaving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              Save
            </LoadingButton>
          </div>
        </form>

        {/* Unsaved Changes Warning */}
        {isDirty && !isSaving && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
            <AlertCircle className="h-4 w-4" />
            <span>You have unsaved changes</span>
          </div>
        )}
      </div>
    </div>
  );
}
