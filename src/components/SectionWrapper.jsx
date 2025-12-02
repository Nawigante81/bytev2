import React from 'react';
import { motion } from 'framer-motion';

const SectionWrapper = ({ children, className = '', id, instant = false }) => {
  if (instant) {
    // Render without IntersectionObserver to avoid iOS/Safari viewport glitches
    return (
      <section id={id} className={`py-16 md:py-24 ${className}`}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      className={`py-16 md:py-24 ${className}`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.section>
  );
};

export default SectionWrapper;