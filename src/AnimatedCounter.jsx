import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

/**
 * Animates a number counting up or down with a color flash.
 * @param {number} value The target number to animate to.
 * @param {string} color The default color of the number.
 */
export const AnimatedCounter = ({ value, color = '#fff' }) => {
  // A `useSpring` motion value for a smooth, physical animation.
  const motionValue = useSpring(value, { damping: 25, stiffness: 200 });
  
  // Transform the motion value to a rounded integer for display.
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  
  const prevValue = useRef(value);
  const [textColor, setTextColor] = React.useState(color);

  useEffect(() => {
    // Update the spring's target value whenever the prop changes.
    motionValue.set(value);

    // Flash color on change
    if (value > prevValue.current) {
      setTextColor('#2ECC71'); // Green for increase
    } else if (value < prevValue.current) {
      setTextColor('#E74C3C'); // Red for decrease
    }

    // Reset color back to default after a short delay.
    const timer = setTimeout(() => setTextColor(color), 1500);
    prevValue.current = value;
    return () => clearTimeout(timer);
  }, [value, motionValue, color]);

  return (
    <motion.span style={{ color: textColor, transition: 'color 0.4s ease-out' }}>
      {rounded}
    </motion.span>
  );
};