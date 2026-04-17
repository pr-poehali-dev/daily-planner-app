import { useRef } from "react";
import Icon from "@/components/ui/icon";

const THRESHOLD = 80;

interface Props {
  onDelete: () => void;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

import { useState } from "react";

const SwipeRow = ({ onDelete, onClick, children, className = "" }: Props) => {
  const [offset, setOffset] = useState(0);
  const [removing, setRemoving] = useState(false);
  const startX = useRef<number | null>(null);
  const dragged = useRef(false);

  const handleDelete = () => {
    setRemoving(true);
    setTimeout(onDelete, 260);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    dragged.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < -4) {
      dragged.current = true;
      setOffset(Math.max(dx, -110));
    }
  };

  const onTouchEnd = () => {
    if (offset < -THRESHOLD) handleDelete();
    else setOffset(0);
    startX.current = null;
  };

  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    dragged.current = false;

    const onMove = (me: MouseEvent) => {
      if (startX.current === null) return;
      const dx = me.clientX - startX.current;
      if (dx < -4) {
        dragged.current = true;
        setOffset(Math.max(dx, -110));
      }
    };

    const onUp = () => {
      setOffset((cur) => {
        if (cur < -THRESHOLD) handleDelete();
        else setOffset(0);
        return cur;
      });
      startX.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleClick = () => {
    if (!dragged.current && onClick) onClick();
  };

  const progress = Math.min(Math.abs(offset) / 110, 1);
  const showRed = Math.abs(offset) > 20;

  return (
    <div
      className={`swipe-row-wrap ${removing ? "swipe-row--removing" : ""}`}
    >
      {/* Delete background */}
      <div
        className="swipe-delete-bg"
        style={{ opacity: showRed ? progress : 0 }}
      >
        <Icon name="Trash2" size={18} />
      </div>

      {/* Content */}
      <div
        className={`swipe-row-inner ${className}`}
        style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? "transform 0.25s ease" : "none" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeRow;
