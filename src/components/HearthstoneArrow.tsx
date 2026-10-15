import React from 'react';

interface Point {
  x: number;
  y: number;
}

interface HearthstoneArrowProps {
  start: Point;
  end: Point;
  isHoveringTarget?: boolean;
}

export const HearthstoneArrow: React.FC<HearthstoneArrowProps> = ({
  start,
  end,
  isHoveringTarget = false,
}) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 10) return null;

  // Compute bezier control point curving naturally upwards like in Hearthstone
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const curveOffset = Math.min(120, distance * 0.25);
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const ctrlX = midX + normalX * curveOffset;
  const ctrlY = midY + normalY * curveOffset - 30;

  // Arrowhead angle at end point (tangent of bezier curve at t = 1)
  const angle = Math.atan2(end.y - ctrlY, end.x - ctrlX);
  const arrowLength = 26;
  const arrowWidth = 18;

  const tipX = end.x;
  const tipY = end.y;

  const leftX = tipX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle);
  const leftY = tipY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle);

  const rightX = tipX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle);
  const rightY = tipY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle);

  // Sample points along bezier curve for glowing trailing circles
  const circleCount = Math.max(5, Math.floor(distance / 35));
  const circlePoints: { x: number; y: number; r: number }[] = [];

  for (let i = 1; i <= circleCount; i++) {
    const t = i / (circleCount + 1);
    // Quadratic bezier formula
    const bx = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * ctrlX + t * t * end.x;
    const by = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * ctrlY + t * t * end.y;
    circlePoints.push({
      x: bx,
      y: by,
      r: 4 + t * 4,
    });
  }

  const strokeColor = isHoveringTarget ? '#ef4444' : '#f59e0b';
  const glowColor = isHoveringTarget ? 'rgba(239, 68, 68, 0.6)' : 'rgba(245, 158, 11, 0.6)';

  return (
    <svg className="fixed inset-0 w-full h-full pointer-events-none z-50">
      <defs>
        <filter id="hs-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={glowColor} />
        </filter>
      </defs>

      {/* Main Curved Path */}
      <path
        d={`M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${end.x} ${end.y}`}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isHoveringTarget ? "5" : "4"}
        strokeDasharray="8 6"
        className="animate-pulse"
        filter="url(#hs-glow)"
      />

      {/* Trailing energy orbs */}
      {circlePoints.map((pt, idx) => (
        <circle
          key={idx}
          cx={pt.x}
          cy={pt.y}
          r={pt.r}
          fill={strokeColor}
          opacity={0.8}
          filter="url(#hs-glow)"
        />
      ))}

      {/* Origin token glowing anchor ring */}
      <circle
        cx={start.x}
        cy={start.y}
        r="12"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        opacity="0.9"
      />
      <circle cx={start.x} cy={start.y} r="5" fill={strokeColor} />

      {/* Hearthstone Arrowhead */}
      <polygon
        points={`${tipX},${tipY} ${leftX},${leftY} ${tipX - (arrowLength * 0.6) * Math.cos(angle)},${tipY - (arrowLength * 0.6) * Math.sin(angle)} ${rightX},${rightY}`}
        fill={strokeColor}
        stroke="#ffffff"
        strokeWidth="2"
        filter="url(#hs-glow)"
      />

      {/* Reticle on Target if hovering */}
      {isHoveringTarget && (
        <g transform={`translate(${end.x}, ${end.y})`}>
          <circle r="28" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="6 4" className="animate-spin" />
          <line x1="-36" y1="0" x2="-20" y2="0" stroke="#ef4444" strokeWidth="3" />
          <line x1="20" y1="0" x2="36" y2="0" stroke="#ef4444" strokeWidth="3" />
          <line x1="0" y1="-36" x2="0" y2="-20" stroke="#ef4444" strokeWidth="3" />
          <line x1="0" y1="20" x2="0" y2="36" stroke="#ef4444" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
};
