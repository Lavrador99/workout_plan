import { useRef } from "react";

interface SetButtonProps {
  setNum: number;
  displayVal: string;
  done: boolean;
  isAccessory?: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

export function SetButton({
  setNum,
  displayVal,
  done,
  isAccessory = false,
  onTap,
  onLongPress,
}: SetButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const handleTouchStart = () => {
    triggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      if (navigator.vibrate) navigator.vibrate(40);
      onLongPress();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = () => {
    if (triggeredRef.current) {
      triggeredRef.current = false;
      return;
    }
    onTap();
  };

  const accentColor = isAccessory
    ? "border-accent2 bg-accent2/10"
    : "border-accent bg-accent/10";
  const numColor = isAccessory ? "text-accent2" : "text-accent";

  return (
    <div
      className={`
        flex flex-col items-center justify-center cursor-pointer select-none
        min-w-[56px] w-14 h-14 rounded-lg border-[1.5px] transition-all duration-150
        ${done ? `${accentColor}` : "border-border bg-card"}
      `}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress();
      }}
    >
      <div
        className={`text-[11px] font-bold ${done ? numColor : "text-muted"}`}
      >
        S{setNum}
      </div>
      <div className="text-[13px] font-extrabold text-text">{displayVal}</div>
    </div>
  );
}
