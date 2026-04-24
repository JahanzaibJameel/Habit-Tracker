/**
 * React hook for form validation with schema integration
 * Provides real-time validation and error handling
 * 
 * @fileoverview React form validation hook with Zod schemas
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { z } from 'zod';
import { ValidationError, ValidationErrorFactory } from './errors';

/**
 * Form field configuration
 */
export interface FormField<T = unknown> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * Form state interface
 */
export interface FormState<T extends Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  submitCount: number;
}

/**
 * Form validation hook options
 */
export interface UseSafeFormOptions<T extends z.ZodTypeAny> {
  /**
   * Zod schema for validation
   */
  schema: T;
  
  /**
   * Initial form values
   */
  initialValues: z.infer<T>;
  
  /**
   * Validation mode
   */
  mode?: 'onChange' | 'onBlur' | 'onSubmit';
  
  /**
   * Whether to validate on first change
   */
  validateOnChange?: boolean;
  
  /**
   * Custom validation messages
   */
  messages?: Partial<Record<string, string>>;
  
  /**
   * Debounce validation delay in milliseconds
   */
  debounceMs?: number;
  
  /**
   * Submit handler
   */
  onSubmit?: (values: any, form: FormState<any>) => void | Promise<void>;
  
  /**
   * Reset form after successful submit
   */
  resetOnSubmit?: boolean;
}

/**
 * Form control interface
 */
export interface FormControl<T = unknown> {
  value: T;
  onChange: (value: T) => void;
  onBlur: () => void;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * Form actions interface
 */
export interface FormActions<T extends Record<string, unknown>> {
  setValue: (field: keyof T, value: T[keyof T]) => void;
  setError: (field: keyof T, error?: string) => void;
  setTouched: (field: keyof T, touched: boolean) => void;
  setDirty: (field: keyof T, dirty: boolean) => void;
  validate: () => Promise<boolean>;
  validateField: (field: keyof T) => Promise<boolean>;
  reset: (values?: Partial<T>) => void;
  handleSubmit: () => Promise<void>;
  setSubmitting: (isSubmitting: boolean) => void;
}

/**
 * React hook for safe form validation with Zod schemas
 * 
 * @example
 * const { form, control, actions } = useSafeForm({
 *   schema: LoginFormSchema,
 *   initialValues: { email: '', password: '' },
 *   onSubmit: async (values) => { console.log(values); }
 * });
 * 
 * @param options - Form configuration options
 * @returns Form state, controls, and actions
 */
export function useSafeForm<T extends z.ZodTypeAny>(
  options: UseSafeFormOptions<T>
): {
  form: FormState<any>;
  control: (field: keyof z.infer<T>) => FormControl<any>;
  actions: {
      setValue: (field: any, value: any) => void;
      setError: (field: any, error?: string) => void;
      setTouched: (field: any, touched: boolean) => void;
      setDirty: (field: any, dirty: boolean) => void;
      validate: () => Promise<boolean>;
      validateField: (field: any) => Promise<boolean>;
      reset: (values?: Partial<any>) => void;
      handleSubmit: () => Promise<void>;
      setSubmitting: (isSubmitting: boolean) => void;
    };
} {
  const {
    schema,
    initialValues,
    mode = 'onSubmit',
    validateOnChange = true,
    messages = {},
    debounceMs = 300,
    onSubmit,
    resetOnSubmit = false,
  } = options;

  // Form state
  const [form, setForm] = useState<FormState<any>>({
    values: initialValues,
    errors: {},
    touched: {},
    dirty: {},
    isValid: true,
    isDirty: false,
    isSubmitting: false,
    submitCount: 0,
  });

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Validates the entire form
   */
  const validateForm = useCallback(async (): Promise<boolean> => {
    try {
      schema.parse(form.values);
      setForm(prev => ({ ...prev, errors: {}, isValid: true }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof z.infer<T>, string>> = {};
        
        error.issues.forEach(issue => {
          const field = issue.path[0] as keyof z.infer<T>;
          const customMessage = messages[field as string];
          errors[field] = customMessage || issue.message;
        });
        
        setForm(prev => ({ ...prev, errors, isValid: false }));
        return false;
      }
      
      // Unexpected error
      setForm(prev => ({ 
        ...prev, 
        errors: { _form: 'Validation failed' } as Partial<Record<keyof z.infer<T>, string>>, 
        isValid: false 
      }));
      return false;
    }
  }, [form.values, schema, messages]);

  /**
   * Validates a single field
   */
  const validateField = useCallback(async (field: any): Promise<boolean> => {
    try {
      // Create a partial schema for the specific field
      const fieldSchema = z.object({ [field]: (schema as any).shape[field as string] });
      fieldSchema.parse({ [field]: form.values[field] });
      
      setForm(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: undefined },
        isValid: Object.keys(prev.errors).filter(k => k !== field).length === 0,
      }));
      
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issue = error.issues.find(i => i.path[0] === field);
        if (issue) {
          const customMessage = messages[field as string];
          const errorMessage = customMessage || issue.message;
          
          setForm(prev => ({
            ...prev,
            errors: { ...prev.errors, [field]: errorMessage },
            isValid: false,
          }));
        }
      }
      
      return false;
    }
  }, [form.values, (schema as any).shape, messages]);

  /**
   * Sets field value with validation
   */
  const setValue = useCallback((field: any, value: any) => {
    setForm(prev => {
      const newValues = { ...(prev.values as any), [field]: value };
      const isDirty = JSON.stringify(newValues) !== JSON.stringify(initialValues);
      
      return {
        ...prev,
        values: newValues,
        dirty: { ...prev.dirty, [field]: true },
        isDirty,
      };
    });

    // Trigger validation based on mode
    if (mode === 'onChange' && validateOnChange) {
      if (debounceMs > 0) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          validateField(field);
        }, debounceMs);
      } else {
        validateField(field);
      }
    }
  }, [mode, validateOnChange, debounceMs, validateField, initialValues]);

  /**
   * Sets field error
   */
  const setError = useCallback((field: any, error?: string) => {
    setForm(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
      isValid: error ? false : Object.keys(prev.errors).filter(k => k !== field).length === 0,
    }));
  }, []);

  /**
   * Sets field touched state
   */
  const setTouched = useCallback((field: any, touched: boolean) => {
    setForm(prev => ({
      ...prev,
      touched: { ...prev.touched, [field]: touched },
    }));

    // Trigger validation on blur if mode is onBlur
    if (mode === 'onBlur' && touched && validateOnChange) {
      validateField(field);
    }
  }, [mode, validateOnChange, validateField]);

  /**
   * Sets field dirty state
   */
  const setDirty = useCallback((field: any, dirty: boolean) => {
    setForm(prev => {
      const newDirty = { ...prev.dirty, [field]: dirty };
      const isDirty = Object.values(newDirty).some(Boolean);
      
      return {
        ...prev,
        dirty: newDirty,
        isDirty,
      };
    });
  }, []);

  /**
   * Resets form state
   */
  const reset = useCallback((values?: Partial<any>) => {
    const newValues = values ? { ...(initialValues as any), ...(values as any) } : initialValues;
    
    setForm({
      values: newValues,
      errors: {},
      touched: {},
      dirty: {},
      isValid: true,
      isDirty: false,
      isSubmitting: false,
      submitCount: 0,
    });
  }, [initialValues]);

  /**
   * Sets submitting state
   */
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setForm(prev => ({ ...prev, isSubmitting }));
  }, []);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(async () => {
    setForm(prev => ({ ...prev, isSubmitting: true, submitCount: prev.submitCount + 1 }));
    
    try {
      const isValid = await validateForm();
      
      if (isValid && onSubmit) {
        await onSubmit(form.values, form);
        
        if (resetOnSubmit) {
          reset();
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setForm(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [validateForm, onSubmit, resetOnSubmit, form.values, form, reset]);

  /**
   * Creates form control for a field
   */
  const control = useCallback((field: keyof z.infer<T>): FormControl<z.infer<T>[keyof z.infer<T>]> => {
    const result: any = {
      value: form.values[field],
      onChange: (value: z.infer<T>[keyof z.infer<T>]) => setValue(field, value),
      onBlur: () => setTouched(field, true),
      touched: form.touched[field] || false,
      dirty: form.dirty[field] || false,
    };
    
    if (form.errors[field]) {
      result.error = form.errors[field];
    }
    
    return result;
  }, [form.values, form.errors, form.touched, form.dirty, setValue, setTouched]);

  return {
    form,
    control,
    actions: {
      setValue,
      setError,
      setTouched,
      setDirty,
      validate: validateForm,
      validateField,
      reset,
      handleSubmit,
      setSubmitting,
    },
  };
}

/**
 * Hook for field-level validation
 * 
 * @example
 * const { value, error, onChange, onBlur } = useSafeField('email', LoginFormSchema, '');
 * 
 * @param fieldName - Name of the field
 * @param schema - Zod schema for the field
 * @param initialValue - Initial field value
 * @param options - Field validation options
 * @returns Field control interface
 */
export function useSafeField<T>(
  fieldName: string,
  schema: z.ZodType<T>,
  initialValue: T,
  options: {
    validateOnChange?: boolean;
    debounceMs?: number;
    customMessage?: string;
  } = {}
): {
  value: T;
  error?: string;
  onChange: (value: T) => void;
  onBlur: () => void;
  touched: boolean;
  dirty: boolean;
  isValid: boolean;
} {
  const { validateOnChange = true, debounceMs = 300, customMessage } = options;
  
  const [value, setValue] = useState<T>(initialValue);
  const [error, setError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isValid, setIsValid] = useState(true);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const validateField = useCallback(async (fieldValue: T) => {
    try {
      schema.parse(fieldValue);
      setError(undefined);
      setIsValid(true);
      return true;
    } catch (schemaError) {
      if (schemaError instanceof z.ZodError) {
        const message = customMessage || schemaError.issues[0]?.message || 'Invalid value';
        setError(message);
        setIsValid(false);
      }
      return false;
    }
  }, [schema, customMessage]);

  const onChange = useCallback((newValue: T) => {
    setValue(newValue);
    setDirty(true);
    
    if (validateOnChange) {
      if (debounceMs > 0) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          validateField(newValue);
        }, debounceMs);
      } else {
        validateField(newValue);
      }
    }
  }, [validateOnChange, debounceMs, validateField]);

  const onBlur = useCallback(() => {
    setTouched(true);
    validateField(value);
  }, [validateField, value]);

  const result: any = {
    value,
    onChange,
    onBlur,
    touched,
    dirty,
    isValid,
  };
  
  if (touched && error) {
    result.error = error;
  }
  
  return result;
}

/**
 * Utility for creating form validation rules from Zod schemas
 */
export class FormValidationRules {
  /**
   * Creates validation rules for a schema
   */
  static createRules<T extends z.ZodTypeAny>(schema: T): Record<string, {
    required: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: unknown) => string | undefined;
  }> {
    const rules: Record<string, any> = {};
    
    const extractRules = (zodSchema: any, path: string = '') => {
      if (zodSchema._def.typeName === 'ZodString') {
        if (path) {
          rules[path] = {
            required: !zodSchema.isOptional(),
            minLength: zodSchema._def.checks?.find((c: any) => c.kind === 'min')?.value,
            maxLength: zodSchema._def.checks?.find((c: any) => c.kind === 'max')?.value,
            pattern: zodSchema._def.checks?.find((c: any) => c.kind === 'regex')?.regex,
          };
        }
      } else if (zodSchema._def.typeName === 'ZodNumber') {
        if (path) {
          rules[path] = {
            required: !zodSchema.isOptional(),
            min: zodSchema._def.checks?.find((c: any) => c.kind === 'min')?.value,
            max: zodSchema._def.checks?.find((c: any) => c.kind === 'max')?.value,
          };
        }
      } else if (zodSchema._def.typeName === 'ZodObject') {
        Object.entries(zodSchema._def.shape()).forEach(([key, subSchema]) => {
          extractRules(subSchema, path ? `${path}.${key}` : key);
        });
      }
    };
    
    extractRules(schema);
    return rules;
  }
  
  /**
   * Converts Zod error messages to user-friendly format
   */
  static formatError(error: z.ZodError, customMessages?: Record<string, string>): Record<string, string> {
    const formatted: Record<string, string> = {};
    
    error.issues.forEach(issue => {
      const field = issue.path.join('.');
      const customMessage = customMessages?.[field];
      formatted[field] = customMessage || issue.message;
    });
    
    return formatted;
  }
}
