import { useState, useRef } from 'react';

export function useMousePosition() {
  const [mousePos, setMousePos] = useState<{ i: number; j: number }>();
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const cellWidth = rect.width / 10;
    const cellHeight = rect.height / 15;

    setMousePos({
      i: (event.clientY - rect.top) / cellHeight + 5,
      j: (event.clientX - rect.left) / cellWidth,
    });
  };

  return { mousePos, gameAreaRef, handleMouseMove };
}
