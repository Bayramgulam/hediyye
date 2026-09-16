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
              {
                opacity: 0,
                filter: "blur(2px)",
                transform: "translateY(18px) scale(.99)",
              },
              {
                opacity: 1,
                filter: "blur(0)",
                transform: "translateY(0) scale(1)",
              },
            ],
            {
              duration: 560,
              delay: delays.get(entry.target) || 0,
              easing: "cubic-bezier(.16,1,.3,1)",
              fill: "backwards",
            },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
      },
      { threshold: 0.12 },
    );
    root.current
      ?.querySelectorAll(
        ".section-heading, .gift-card, .intro-image, .intro-copy, .occasions > h2, .occasion-grid > a, .how > div:first-child, .steps-story > div, .packaging-story > img, .packaging-story > div, .faq > div",
      )
      .forEach((el, index) => {
        delays.set(el, (index % 3) * 45);
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
