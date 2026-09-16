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
    const variants = new WeakMap<
      Element,
      "title" | "card" | "image" | "item"
    >();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (media.matches) continue;
          const variant = variants.get(entry.target) || "item";
          const from =
            variant === "title"
              ? {
                  opacity: 0,
                  filter: "blur(6px)",
                  transform: "translateY(28px)",
                }
              : variant === "card"
                ? {
                    opacity: 0,
                    filter: "blur(3px)",
                    transform: "translateY(38px) rotate(1.2deg) scale(.965)",
                  }
                : variant === "image"
                  ? {
                      opacity: 0,
                      filter: "blur(4px) saturate(.72)",
                      clipPath: "inset(0 0 18% 0)",
                      transform: "translateY(22px) scale(1.035)",
                    }
                  : {
                      opacity: 0,
                      filter: "blur(2px)",
                      transform: "translateY(20px) scale(.99)",
                    };
          const animation = entry.target.animate(
            [
              from,
              {
                opacity: 1,
                filter: "blur(0)",
                clipPath: "inset(0 0 0 0)",
                transform: "translateY(0) scale(1)",
              },
            ],
            {
              duration:
                variant === "image" ? 880 : variant === "title" ? 720 : 640,
              delay: delays.get(entry.target) || 0,
              easing: "cubic-bezier(.16,1,.3,1)",
              fill: "backwards",
            },
          );
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6%" },
    );
    const groups = [
      {
        selector:
          ".section-heading, .catalog-page > .eyebrow, .catalog-page > h1, .builder-heading, .checkout-page > .eyebrow, .checkout-page > h1, .contact-page > div:first-child",
        variant: "title" as const,
        step: 70,
      },
      {
        selector:
          ".gift-card, .occasion-grid > a, .steps-story > div, .product-picker article",
        variant: "card" as const,
        step: 75,
      },
      {
        selector:
          ".intro-image, .packaging-story > img, .detail-main, .gift-detail > div:first-child",
        variant: "image" as const,
        step: 90,
      },
      {
        selector:
          ".intro-copy, .occasions > h2, .how > div:first-child, .packaging-story > div, .faq > div, .catalog-tools, .active-filters, .builder-steps, .builder-layout, .checkout-layout",
        variant: "item" as const,
        step: 60,
      },
    ];
    for (const group of groups) {
      root.current?.querySelectorAll(group.selector).forEach((el, index) => {
        delays.set(el, (index % 4) * group.step);
        variants.set(el, group.variant);
        observer.observe(el);
      });
    }
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
