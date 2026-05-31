export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-7 flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-3 h-1.5 w-14 rounded-full bg-teal-700" />
        <h1 className="text-3xl font-black leading-tight tracking-normal text-slate-950 sm:text-[34px]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}
