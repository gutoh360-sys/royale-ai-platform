"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type CheckboxProps = {
  id: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, checked, onChange, disabled, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className={cn(
          "size-4 rounded border-border bg-background text-primary accent-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

Checkbox.displayName = "Checkbox";
