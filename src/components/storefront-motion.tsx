"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// Progressive enhancement: content stays visible without JavaScript or motion.
export function StorefrontMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const delays = new WeakMap<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (media.matches) continue;
          const animation = entry.target.animate(
            [
              { opacity: 0, transform: "translateY(32px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 760,
              delay: delays.get(entry.target) || 0,
              easing: "cubic-bezier(.16,1,.3,1)",
              fill: "backwards",
            },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
      },
      { threshold: 0.08 },
    );
    root.current
      ?.querySelectorAll(
        ".section-heading, .gift-card, .intro-copy, .occasion-grid > a, .steps-story > div, .packaging-story > div, .faq > div",
      )
      .forEach((el, index) => {
        delays.set(el, (index % 3) * 75);
        observer.observe(el);
      });
    const stop = () => {
      if (media.matches) animations.forEach((a) => a.cancel());
    };
    media.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animations.forEach((a) => a.cancel());
      media.removeEventListener("change", stop);
    };
  }, [pathname]);
  return (
    <div ref={root} className="motion-surface">
      {children}
    </div>
  );
}
