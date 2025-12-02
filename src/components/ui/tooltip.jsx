import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// StrictMode-safe tooltip: wrapper span holds the ref (no ref passed to child)
export const Tooltip = ({ content, children, side = 'top', align = 'center', delay = 120 }) => {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const timerRef = useRef(null);
  const idRef = useRef(`tt-${Math.random().toString(36).slice(2, 9)}`);

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const calcPosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    let top = rect.top + scrollY;
    let left = rect.left + scrollX + rect.width / 2;

    const offset = 10;
    if (side === 'top') top -= offset; else if (side === 'bottom') top += rect.height + offset; else top += rect.height / 2;

    if (align === 'start') left = rect.left + scrollX;
    if (align === 'end') left = rect.right + scrollX;

    setCoords({ top, left });
  };

  useLayoutEffect(() => { if (open) calcPosition(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const ro = new ResizeObserver(calcPosition);
    ro.observe(document.body);
    window.addEventListener('scroll', calcPosition, true);
    window.addEventListener('resize', calcPosition);
    return () => { ro.disconnect(); window.removeEventListener('scroll', calcPosition, true); window.removeEventListener('resize', calcPosition); };
  }, [open]);

  const show = () => { clearTimer(); timerRef.current = setTimeout(() => setOpen(true), delay); };
  const hide = () => { clearTimer(); setOpen(false); };

  return (
    <>
      <span
        ref={anchorRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? idRef.current : undefined}
        className="inline-flex items-center align-middle"
        tabIndex={0}
      >
        {children}
      </span>
      {open && createPortal(
        <div
          id={idRef.current}
          role="tooltip"
          className="pointer-events-none fixed z-[10000] max-w-xs -translate-x-1/2 rounded-md border border-primary/30 bg-background/90 px-2 py-1 text-xs text-foreground shadow-[0_0_12px_rgba(34,211,238,0.25)] backdrop-blur-md"
          style={{ top: coords.top, left: coords.left }}
        >
          {typeof content === 'string' ? <span>{content}</span> : content}
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;
