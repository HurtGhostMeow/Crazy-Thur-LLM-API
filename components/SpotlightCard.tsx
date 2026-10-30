"use client";

import { type MouseEvent, useRef } from "react";

type SpotlightCardProps = {
  children: React.ReactNode;
  className?: string;
};

// Adapted from the local React Bits Spotlight Card pattern.
export function SpotlightCard({ children, className = "" }: SpotlightCardProps) {
  const cardRef = useRef<HTMLElement>(null);

  function updateSpotlight(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
  }

  return <section ref={cardRef} onMouseMove={updateSpotlight} className={`spotlight-card ${className}`}>{children}</section>;
}
