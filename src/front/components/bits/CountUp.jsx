import { useInView, useMotionValue, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef } from 'react';

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0.2,
  duration = 1,
  className = '',
  startWhen = true,
  separator = '',
  decimals: decimalsProp,
  onStart,
  onEnd
}) {
  const ref = useRef(null);
  const motionValue = useMotionValue(direction === 'down' ? to : from);

  // "Soft" feel: Increasing damping and reducing stiffness for a smoother ease
  const damping = 30 + 10 * (1 / duration);
  const stiffness = 80 * (1 / duration);

  const springValue = useSpring(motionValue, {
    damping,
    stiffness
  });

  const isInView = useInView(ref, { once: true, margin: '0px' });

  const getDecimalPlaces = num => {
    const str = num.toString();

    if (str.includes('.')) {
      const decimals = str.split('.')[1];

      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }

    return 0;
  };

  const maxDecimals = decimalsProp !== undefined ? decimalsProp : Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    latest => {
      // User request: Only animate the integer part
      const integerPart = Math.floor(latest);
      
      const options = {
        useGrouping: !!separator,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      };

      const formattedInteger = Intl.NumberFormat('en-US', options).format(integerPart);
      const integerResult = separator ? formattedInteger.replace(/,/g, separator) : formattedInteger;
      
      if (maxDecimals > 0) {
        // "Decimales carguen rápido" -> Use decimals from the target 'to' value
        const targetStr = to.toFixed(maxDecimals);
        const decimalPart = targetStr.split('.')[1];
        return `${integerResult}.${decimalPart}`;
      }

      return integerResult;
    },
    [maxDecimals, separator, to]
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = formatValue(direction === 'down' ? to : from);
    }
  }, [from, to, direction, formatValue]);

  useEffect(() => {
    if (isInView && startWhen) {
      if (typeof onStart === 'function') onStart();

      const timeoutId = setTimeout(() => {
        motionValue.set(direction === 'down' ? from : to);
      }, delay * 1000);

      const durationTimeoutId = setTimeout(
        () => {
          if (typeof onEnd === 'function') onEnd();
        },
        delay * 1000 + duration * 1000
      );

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(durationTimeoutId);
      };
    }
  }, [isInView, startWhen, motionValue, direction, from, to, delay, onStart, onEnd, duration]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', latest => {
      if (ref.current) {
        ref.current.textContent = formatValue(latest);
      }
    });

    return () => unsubscribe();
  }, [springValue, formatValue]);

  return <span className={className} ref={ref} />;
}
