import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Bhakti Vriksha Radha Madan Mohan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Image generation
export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background:
            "linear-gradient(135deg, #561e85 0%, #6b2fa5 45%, #d97d00 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          color: "white",
          padding: 80,
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#ffd685",
            marginBottom: 12,
          }}
        >
          Bhakti Vriksha
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          Sri Sri Radha
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            lineHeight: 1,
            marginBottom: 32,
          }}
        >
          Madan Mohan
        </div>
        <div
          style={{
            fontSize: 28,
            opacity: 0.9,
            maxWidth: 900,
          }}
        >
          A Sunday journey through the Bhagavad-gita for families —
          couples, youth & kids
        </div>
        <div
          style={{
            fontSize: 20,
            marginTop: 40,
            color: "#ffecc8",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 28 }}>ॐ</span>
          <span>32 weeks · Kalkere, Bengaluru · Starts 31 May 2026</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
