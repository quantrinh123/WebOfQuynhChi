export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-[34px]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">{description}</p> : null}
        <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </header>
  );
}
