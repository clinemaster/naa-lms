import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: React.ReactNode;
  /** id of the control, so clicking the label focuses it. */
  htmlFor?: string;
  /** Adds a muted "(optional)" after the label. */
  optional?: boolean;
  /** Helper text under the control. */
  hint?: React.ReactNode;
  /** Validation message; shown in place of the hint. */
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Label + control + hint/error, with the standard spacing. Use it for every
 * form input so labels, gaps and error text look the same across the app.
 */
export function FormField({ label, htmlFor, optional, hint, error, className, children }: FormFieldProps) {
  return (
    <div className={cn("ui-form-group", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children}
      {error ? (
        <p className="ui-field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="ui-field-hint">{hint}</p>
      )}
    </div>
  );
}
