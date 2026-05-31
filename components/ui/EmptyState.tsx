import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <Inbox className="mx-auto mb-3 text-slate-400" />
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
    </div>
  );
}
