import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0d",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #35353d 0%, #0a0a0d 70%)",
            border: "3px solid #d4a017",
            display: "flex",
          }}
        />
      </div>
    ),
    size
  );
}
