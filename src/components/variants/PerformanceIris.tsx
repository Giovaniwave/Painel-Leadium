import { motion } from 'motion/react';
import AnimatedCounter from '../AnimatedCounter';

interface PerformanceIrisProps {
  percentage: number;
  theme: 'dark' | 'light';
}

/** Preserved dashboard variant approved on 2026-07-12. */
export default function PerformanceIris({ percentage, theme }: PerformanceIrisProps) {
  const blades = 24;
  const active = Math.round((Math.min(Math.max(percentage, 0), 100) / 100) * blades);
  return (
    <div className="goal-iris" aria-label={`${Math.round(percentage)}% da meta de faturamento`}>
      <div className="goal-iris-halo" aria-hidden="true" />
      <div className="goal-iris-blades" aria-hidden="true">
        {Array.from({ length: blades }, (_, index) => (
          <motion.span key={index} className={`goal-iris-blade ${index < active ? 'is-active' : ''}`}
            style={{ transform: `rotate(${index * 15}deg) translateY(-5.75rem)` }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .5, delay: index * .025 }} />
        ))}
      </div>
      <div className="goal-iris-orbit" aria-hidden="true"><i /><i /><i /></div>
      <div className="goal-iris-readout">
        <span className="goal-iris-status"><i /> performance live</span>
        <span className={`text-4xl sm:text-5xl font-extrabold tracking-tighter leading-none ${theme === 'light' ? 'text-gray-950' : 'text-white'}`}>
          <AnimatedCounter value={percentage} formatter={(value) => `${Math.round(value)}%`} />
        </span>
        <span className={`text-[9px] uppercase tracking-[.2em] font-bold mt-2 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>da meta</span>
      </div>
      <span className="goal-iris-index goal-iris-index-left">LEADIUM / CORE</span>
      <span className="goal-iris-index goal-iris-index-right">{String(active).padStart(2, '0')}/24</span>
    </div>
  );
}
