/**
 * React hook for form validation with schema integration
 * Provides real-time validation and error handling
 *
 * @fileoverview React form validation hook with Zod schemas
 * @version 1.0.0
 * @author Your Name
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { z } from 'zod';

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
export interface FormState<T = Record<string, unknown>> {
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
  onSubmit?: (values: z.infer<T>, form: FormState<z.infer<T>>) => void | Promise<void>;

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
  isValid: boolean;
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
  form: FormState<z.infer<T>>;
  control: (field: keyof z.infer<T>) => FormControl<z.infer<T>[keyof z.infer<T>]>;
  actions: {
    setValue: (field: keyof z.infer<T>, value: z.infer<T>[keyof z.infer<T>]) => void;
    setError: (field: keyof z.infer<T>, error?: string) => void;
    setTouched: (field: keyof z.infer<T>, touched: boolean) => void;
    setDirty: (field: keyof z.infer<T>, dirty: boolean) => void;
    validate: () => Promise<boolean>;
    validateField: (field: keyof z.infer<T>) => Promise<boolean>;
    reset: (values?: Partial<z.infer<T>>) => void;
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
  const [form, setForm] = useState<FormState<z.infer<T>>>({
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
      setForm((prev) => ({ ...prev, errors: {}, isValid: true }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof z.infer<T>, string>> = {};

        error.issues.forEach((issue) => {
          const field = issue.path[0] as keyof z.infer<T>;
          const customMessage = messages[field as string];
          errors[field] = customMessage || issue.message;
        });

        setForm((prev) => ({ ...prev, errors, isValid: false }));
        return false;
      }

      // Unexpected error
      setForm((prev) => ({
        ...prev,
        errors: { _form: 'Validation failed' } as Partial<Record<keyof z.infer<T>, string>>,
        isValid: false,
      }));
      return false;
    }
  }, [form.values, schema, messages]);

  /**
   * Validates a single field
   */
  const validateField = useCallback(
    async (field: keyof z.infer<T>): Promise<boolean> => {
      try {
        // Validate the specific field using the original schema
        const fieldData = { [field]: form.values[field] };
        schema.parse(fieldData);

        setForm((prev) => ({
          ...prev,
          errors: { ...prev.errors, [field]: undefined },
          isValid: Object.keys(prev.errors).filter((k) => k !== field).length === 0,
        }));

        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issue = error.issues.find((i) => i.path[0] === field);
          if (issue) {
            const customMessage = messages[field as string];
            const errorMessage = customMessage || issue.message;

            setForm((prev) => ({
              ...prev,
              errors: { ...prev.errors, [field]: errorMessage },
              isValid: false,
            }));
          }
        }

        return false;
      }
    },
    [form.values, schema, messages]
  );

  /**
   * Sets field value with validation
   */
  const setValue = useCallback(
    <K extends keyof z.infer<T>>(field: K, value: z.infer<T>[K]) => {
      setForm((prev) => {
        const newValues = Object.assign({}, prev.values, { [field]: value }) as z.infer<T>;
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
    },
    [mode, validateOnChange, debounceMs, validateField, initialValues]
  );

  /**
   * Sets field error
   */
  const setError = useCallback(<K extends keyof z.infer<T>>(field: K, error?: string) => {
    setForm((prev) => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
      isValid: error ? false : Object.keys(prev.errors).filter((k) => k !== field).length === 0,
    }));
  }, []);

  /**
   * Sets field touched state
   */
  const setTouched = useCallback(
    <K extends keyof z.infer<T>>(field: K, touched: boolean) => {
      setForm((prev) => ({
        ...prev,
        touched: { ...prev.touched, [field]: touched },
      }));

      // Trigger validation on blur if mode is onBlur
      if (mode === 'onBlur' && touched && validateOnChange) {
        validateField(field);
      }
    },
    [mode, validateOnChange, validateField]
  );

  /**
   * Sets field dirty state
   */
  const setDirty = useCallback(<K extends keyof z.infer<T>>(field: K, dirty: boolean) => {
    setForm((prev) => {
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
  const reset = useCallback(
    (values?: Partial<z.infer<T>>) => {
      const newValues = values
        ? (Object.assign({}, initialValues, values) as z.infer<T>)
        : initialValues;

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
    },
    [initialValues]
  );

  /**
   * Sets submitting state
   */
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setForm((prev) => ({ ...prev, isSubmitting }));
  }, []);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(async () => {
    setForm((prev) => ({ ...prev, isSubmitting: true, submitCount: prev.submitCount + 1 }));

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
      setForm((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [validateForm, onSubmit, resetOnSubmit, reset, form]);

  /**
   * Creates form control for a field
   */
  const control = useCallback(
    (field: keyof z.infer<T>): FormControl<z.infer<T>[keyof z.infer<T>]> => {
      const result: FormControl<z.infer<T>[keyof z.infer<T>]> = {
        value: form.values[field],
        onChange: (value: z.infer<T>[keyof z.infer<T>]) => setValue(field, value),
        onBlur: () => setTouched(field, true),
        touched: form.touched[field] || false,
        dirty: form.dirty[field] || false,
        isValid: !form.errors[field],
      };

      if (form.errors[field]) {
        result.error = form.errors[field];
      }

      return result;
    },
    [form.values, form.errors, form.touched, form.dirty, setValue, setTouched]
  );

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
  const [_isValid, setIsValid] = useState(true);

  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const validateField = useCallback(
    async (fieldValue: T) => {
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
    },
    [schema, customMessage]
  );

  const onChange = useCallback(
    (newValue: T) => {
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
    },
    [validateOnChange, debounceMs, validateField]
  );

  const onBlur = useCallback(() => {
    setTouched(true);
    validateField(value);
  }, [validateField, value]);

  const result: FormControl<T> = {
    value,
    onChange,
    onBlur,
    touched,
    dirty,
    isValid: !error,
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
  static createRules<T extends z.ZodTypeAny>(
    schema: T
  ): Record<
    string,
    {
      required: boolean;
      minLength?: number;
      maxLength?: number;
      min?: number;
      max?: number;
      pattern?: RegExp;
      custom?: (value: unknown) => string | undefined;
    }
  > {
    const rules: Record<
      string,
      {
        required: boolean;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        pattern?: RegExp;
        custom?: (value: unknown) => string | undefined;
      }
    > = {};

    const extractRules = (zodSchema: unknown, path: string = '') => {
      if ((zodSchema as { _def?: { typeName?: string } })._def?.typeName === 'ZodString') {
        if (path) {
          rules[path] = {
            required: !(zodSchema as { isOptional?: () => boolean }).isOptional?.(),
            minLength: (
              zodSchema as { _def?: { checks?: Array<{ kind: string; value?: number }> } }
            )._def?.checks?.find((c: { kind: string }) => c.kind === 'min')?.value,
            maxLength: (
              zodSchema as { _def?: { checks?: Array<{ kind: string; value?: number }> } }
            )._def?.checks?.find((c: { kind: string }) => c.kind === 'max')?.value,
            pattern: (
              zodSchema as { _def?: { checks?: Array<{ kind: string; regex?: RegExp }> } }
            )._def?.checks?.find((c: { kind: string }) => c.kind === 'regex')?.regex,
          };
        }
      } else if ((zodSchema as { _def?: { typeName?: string } })._def?.typeName === 'ZodNumber') {
        if (path) {
          rules[path] = {
            required: !(zodSchema as { isOptional?: () => boolean }).isOptional?.(),
            min: (
              zodSchema as { _def?: { checks?: Array<{ kind: string; value?: number }> } }
            )._def?.checks?.find((c: { kind: string }) => c.kind === 'min')?.value,
            max: (
              zodSchema as { _def?: { checks?: Array<{ kind: string; value?: number }> } }
            )._def?.checks?.find((c: { kind: string }) => c.kind === 'max')?.value,
          };
        }
      } else if ((zodSchema as { _def?: { typeName?: string } })._def?.typeName === 'ZodObject') {
        Object.entries(
          ((zodSchema as { shape?: Record<string, unknown> }).shape || {}) as Record<
            string,
            unknown
          >
        ).forEach(([key, subSchema]) => {
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
  static formatError(
    error: z.ZodError,
    customMessages?: Record<string, string>
  ): Record<string, string> {
    const formatted: Record<string, string> = {};

    error.issues.forEach((issue) => {
      const field = issue.path.join('.');
      const customMessage = customMessages?.[field];
      formatted[field] = customMessage || issue.message;
    });

    return formatted;
  }
}
