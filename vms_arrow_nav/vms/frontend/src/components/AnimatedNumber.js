import React, { useEffect, useState, useRef } from 'react';

export default function AnimatedNumber({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);
  const target   = Number(value) || 0;

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const start = performance.now();
    const animate = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return <span>{display}</span>;
}
