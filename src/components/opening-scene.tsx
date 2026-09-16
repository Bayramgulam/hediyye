"use client";

import { usePathname } from "next/navigation";

export function OpeningScene() {
  const pathname = usePathname();
  if (pathname !== "/") return null;
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
