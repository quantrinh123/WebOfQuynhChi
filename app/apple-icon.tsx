import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Icon cho "Thêm vào màn hình chính" trên iPhone (PNG, iOS không dùng favicon SVG).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 55%, #6366f1 100%)"
        }}
      >
        <svg width="112" height="112" viewBox="0 0 64 64">
          <path d="M18 14h28v8H31.5l9 10-9 10H46v8H18v-6.5L29.2 32 18 20.5z" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size
  );
}
