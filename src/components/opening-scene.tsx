"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function OpeningScene() {
  const pathname = usePathname();
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (pathname !== "/" || played) return;
    const timer = window.setTimeout(() => setPlayed(true), 1250);
    return () => window.clearTimeout(timer);
  }, [pathname, played]);
  if (pathname !== "/" || played) return null;
  return (
    <div className="opening-scene" aria-hidden="true">
      <div className="opening-panel opening-panel-left" />
      <div className="opening-panel opening-panel-right" />
      <div className="opening-mark">
        <span>luma</span>
        <small>DÜŞÜNÜLƏRƏK HAZIRLANIB</small>
      </div>
      <div className="opening-line" />
    </div>
  );
}
