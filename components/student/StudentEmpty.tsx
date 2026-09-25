import { PiMascot } from "@/components/mascot/PiMascot";

// Màn hình trống cho trang học sinh, có nhân vật π.
export function StudentEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center backdrop-blur-sm">
      <PiMascot className="mx-auto h-[88px] w-[112px]" />
      <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
      {description ? <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}
