// Ký hiệu toán trôi rất mờ phía sau các trang học sinh (vị trí cố định để server/client giống nhau).
const SYMBOLS = [
  { char: "∫", left: "4%", size: 64, duration: 38, delay: 0, color: "text-teal-500/[0.07]" },
  { char: "π", left: "14%", size: 44, duration: 30, delay: 9, color: "text-indigo-500/[0.07]" },
  { char: "Σ", left: "26%", size: 56, duration: 42, delay: 18, color: "text-cyan-500/[0.07]" },
  { char: "√", left: "39%", size: 48, duration: 34, delay: 4, color: "text-pink-500/[0.06]" },
  { char: "∞", left: "52%", size: 60, duration: 40, delay: 24, color: "text-teal-500/[0.07]" },
  { char: "θ", left: "63%", size: 42, duration: 28, delay: 13, color: "text-amber-500/[0.08]" },
  { char: "Δ", left: "74%", size: 52, duration: 36, delay: 2, color: "text-violet-500/[0.07]" },
  { char: "x²", left: "85%", size: 46, duration: 32, delay: 20, color: "text-sky-500/[0.07]" },
  { char: "÷", left: "93%", size: 40, duration: 26, delay: 7, color: "text-teal-500/[0.07]" },
  { char: "f(x)", left: "46%", size: 36, duration: 44, delay: 30, color: "text-indigo-500/[0.06]" }
];

export function StudentBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 select-none overflow-hidden">
      {SYMBOLS.map((symbol) => (
        <span
          key={symbol.char}
          className={`animate-rise absolute bottom-0 font-black ${symbol.color}`}
          style={{ left: symbol.left, fontSize: symbol.size, animationDuration: `${symbol.duration}s`, animationDelay: `-${symbol.delay}s` }}
        >
          {symbol.char}
        </span>
      ))}
    </div>
  );
}
