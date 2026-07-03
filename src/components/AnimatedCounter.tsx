/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in milliseconds
  formatter?: (val: number) => string;
}

export default function AnimatedCounter({ value, duration = 1200, formatter }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    if (endValue === 0) {
      setDisplayValue(0);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Cubic ease-out: f(t) = 1 - (1-t)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const current = easeProgress * (endValue - startValue) + startValue;
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    const animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return (
    <span>
      {formatter ? formatter(displayValue) : displayValue.toFixed(0)}
    </span>
  );
}
