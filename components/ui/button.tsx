import { cn } from "@/lib/utils/format";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-teal-700 text-white shadow-[0_10px_22px_rgba(15,118,110,0.22)] hover:bg-teal-800 focus-visible:ring-teal-700",
    secondary: "border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-500",
    danger: "bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.18)] hover:bg-rose-700 focus-visible:ring-rose-600"
  };

  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
