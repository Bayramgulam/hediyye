"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";

export function HeroArt({ image }: { image: string }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(y, { stiffness: 90, damping: 24 });
  const rotateY = useSpring(x, { stiffness: 90, damping: 24 });
  return (
    <div
      className="hero-art studio-art"
      onPointerMove={(event) => {
        if (reduced || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientX - rect.left) / rect.width - 0.5) * 7);
        y.set(((event.clientY - rect.top) / rect.height - 0.5) * -7);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <div className="studio-glow" aria-hidden="true" />
      <div className="studio-orbit" aria-hidden="true" />
      <div className="studio-sparkles" aria-hidden="true">
        <span>✦</span>
        <span>✳</span>
        <span>✦</span>
      </div>
      <span className="studio-index">THE ART OF GIVING / 01</span>
      <motion.div
        className="studio-main"
        style={{
          rotateX: reduced ? 0 : rotateX,
          rotateY: reduced ? 0 : rotateY,
        }}
      >
        <img
          src={image}
          alt="Bordo lentli hədiyyə qutusu və düşünülərək seçilən detallar"
          fetchPriority="high"
          width="1536"
          height="1024"
        />
        <div className="studio-image-note">
          <span>Bir qutu dolusu</span>
          <em>yaxşı ki varsan.</em>
          <span className="studio-star" aria-hidden="true">
            ✳
          </span>
        </div>
      </motion.div>
      <div className="studio-card studio-card-one" aria-hidden="true">
        <div className="studio-float">
          <img src="/images/product-0.webp" alt="" width="180" height="180" />
          <span>01 / kiçik bir detal</span>
        </div>
      </div>
      <div className="studio-card studio-card-two" aria-hidden="true">
        <div className="studio-float">
          <span>Sənin üçün.</span>
          <em>
            Çünki ən gözəl
            <br />
            hədiyyə, düşüncədir.
          </em>
          <b>♡</b>
        </div>
      </div>
      <div className="hero-stamp">
        sənin seçimin
        <br />
        <span>onun sevinci</span>
      </div>
      <span className="studio-caption">
        SEVGİ İLƏ SEÇİLİR. ZÖVQLƏ BİRLƏŞİR.
      </span>
    </div>
  );
}
