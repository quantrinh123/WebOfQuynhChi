import { cn } from "@/lib/utils/format";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-[0_8px_20px_-8px_rgba(13,148,136,0.7)] hover:from-teal-700 hover:to-cyan-700 hover:shadow-[0_12px_26px_-10px_rgba(13,148,136,0.75)] focus-visible:ring-teal-600",
    secondary:
      "border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-900 focus-visible:ring-slate-400",
    danger:
      "bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_8px_20px_-8px_rgba(225,29,72,0.6)] hover:from-rose-700 hover:to-pink-700 focus-visible:ring-rose-600"
  };

  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
