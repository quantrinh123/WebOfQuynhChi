"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Đưa nội dung ra thẳng dưới <body> để `position: fixed` luôn bám theo màn hình,
// không bị ảnh hưởng bởi transform / backdrop-filter của phần tử cha.
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
