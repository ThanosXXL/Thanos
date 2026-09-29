import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 30% 20%, #1a1a1d 0%, #050506 65%)",
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #35353d 0%, #0a0a0d 70%)",
            border: "6px solid #d4a017",
            display: "flex",
            marginBottom: 32,
          }}
        />
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: 4,
            backgroundImage: "linear-gradient(135deg, #f9edc9, #d4a017, #8a670c)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex",
          }}
        >
          IT - WORLD
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#e6b433cc",
            letterSpacing: 8,
            marginTop: 12,
            display: "flex",
          }}
        >
          IT SOLUTIONS
        </div>
      </div>
    ),
    size
  );
}
