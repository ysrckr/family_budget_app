import { ImageResponse } from "next/og";

// iOS home-screen icon (PNG). Full-bleed teal square — iOS rounds the corners
// itself. The house + fill-meter mark is drawn with filled shapes so it
// rasterizes reliably through Satori.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          background: "#0E7C66",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 64 64">
          <path d="M9 31 L32 12 L55 31 Z" fill="#FFFFFF" />
          <rect x="16" y="30" width="32" height="23" rx="3" fill="#FFFFFF" />
          <rect x="19.5" y="33.5" width="25" height="16" rx="1.5" fill="#0E7C66" />
          <rect x="22" y="44" width="20" height="4" rx="2" fill="#67A99A" />
          <rect x="22" y="44" width="12" height="4" rx="2" fill="#FFFFFF" />
        </svg>
      </div>
    ),
    size
  );
}
