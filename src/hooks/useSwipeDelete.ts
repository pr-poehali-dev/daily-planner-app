import { useRef, useState } from "react";

const THRESHOLD = 80;

export const useSwipeDelete = (onDelete: () => void) => {
  const [offset, setOffset] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) {
      isDragging.current = true;
      setOffset(Math.max(dx, -120));
    }
  };

  const onTouchEnd = () => {
    if (offset < -THRESHOLD) {
      setDeleting(true);
      setOffset(-120);
      setTimeout(() => onDelete(), 280);
    } else {
      setOffset(0);
    }
    startX.current = null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    isDragging.current = false;

    const onMove = (me: MouseEvent) => {
      if (startX.current === null) return;
      const dx = me.clientX - startX.current;
      if (dx < 0) {
        isDragging.current = true;
        setOffset(Math.max(dx, -120));
      }
    };

    const onUp = () => {
      if (offset < -THRESHOLD) {
        setDeleting(true);
        setOffset(-120);
        setTimeout(() => onDelete(), 280);
      } else {
        setOffset(0);
      }
      startX.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const wasDragging = () => isDragging.current;

  return { offset, deleting, onTouchStart, onTouchMove, onTouchEnd, onMouseDown, wasDragging };
};
