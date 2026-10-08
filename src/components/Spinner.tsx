import { useEffect, useState } from "react";

export function Spinner({ size = 16 }: { size?: number }) {
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    let frame: number;
    const animate = () => {
      setRotation((r) => (r + 10) % 360);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center" }}
    >
      <circle cx="8" cy="8" r="6" stroke="#444" strokeWidth="2" fill="none" />
      <circle cx="8" cy="8" r="6" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="28" strokeDashoffset="18" />
    </svg>
  );
}
