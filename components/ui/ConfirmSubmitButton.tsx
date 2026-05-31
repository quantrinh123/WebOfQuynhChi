"use client";

import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = {
  children: React.ReactNode;
  message: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
};

export function ConfirmSubmitButton({ children, message, variant = "danger", className }: ConfirmSubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}
