import { useCallback, useEffect, useRef, useState } from "react";

export interface TimerState {
  seconds: number;
  running: boolean;
  warning: boolean;
}

export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
    setSeconds(0);
  }, []);

  const start = useCallback((secs: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSeconds(secs);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const addTime = useCallback((secs: number) => {
    setSeconds((prev) => prev + secs);
  }, []);

  const setTimer = useCallback(
    (secs: number) => {
      start(secs);
    },
    [start],
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatted = (): string => {
    const abs = Math.abs(seconds);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return (seconds < 0 ? "+" : "") + m + ":" + String(s).padStart(2, "0");
  };

  return {
    seconds,
    running,
    warning: seconds <= 10 && seconds > 0 && running,
    start,
    stop,
    addTime,
    setTimer,
    formatted,
  };
}
