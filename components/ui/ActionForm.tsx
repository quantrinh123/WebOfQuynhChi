"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/format";
import type { ActionResult } from "@/lib/actions/result";

type FormAction = (state: ActionResult, formData: FormData) => Promise<ActionResult>;

// Form gọi server action và hiện thông báo thành công / lỗi dạng toast.
export function ActionForm({
  action,
  children,
  className,
  id
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form id={id} action={formAction} className={className}>
      {children}
      <Toast result={state} />
    </form>
  );
}

export function Toast({ result }: { result: ActionResult }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!result) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), result.ok ? 3000 : 6000);
    return () => window.clearTimeout(timer);
  }, [result]);

  if (!result || !visible) return null;
  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-[0_18px_42px_rgba(15,23,42,0.18)]",
        result.ok ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
      )}
    >
      {result.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
      <span>{result.message}</span>
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText = "Đang lưu...",
  variant,
  className,
  confirmMessage,
  name,
  value
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  confirmMessage?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      name={name}
      value={value}
      disabled={pending}
      className={cn("gap-2", className)}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : null}
      {pending ? pendingText : children}
    </Button>
  );
}
