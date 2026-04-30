import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useGlobalPlayer } from "./GlobalPlayerContext";

interface SleepTimerContextType {
  sleepTimerMinutes: number | null;
  remainingSeconds: number | null;
  setSleepTimer: (minutes: number | null) => void;
  cancelSleepTimer: () => void;
  isTimerActive: boolean;
}

const SleepTimerContext = createContext<SleepTimerContextType | undefined>(undefined);

export function SleepTimerProvider({ children }: { children: ReactNode }) {
  const { pauseStation } = useGlobalPlayer();
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimeRef.current = null;
  };

  const setSleepTimer = (minutes: number | null) => {
    clearTimer();
    
    if (minutes === null || minutes <= 0) {
      setSleepTimerMinutes(null);
      setRemainingSeconds(null);
      return;
    }

    setSleepTimerMinutes(minutes);
    const endTime = Date.now() + minutes * 60 * 1000;
    endTimeRef.current = endTime;
    setRemainingSeconds(minutes * 60);

    intervalRef.current = setInterval(() => {
      if (!endTimeRef.current) return;
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      
      if (remaining <= 0) {
        clearTimer();
        setSleepTimerMinutes(null);
        setRemainingSeconds(null);
        pauseStation();
      }
    }, 1000);
  };

  const cancelSleepTimer = () => {
    clearTimer();
    setSleepTimerMinutes(null);
    setRemainingSeconds(null);
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  return (
    <SleepTimerContext.Provider value={{
      sleepTimerMinutes,
      remainingSeconds,
      setSleepTimer,
      cancelSleepTimer,
      isTimerActive: sleepTimerMinutes !== null && remainingSeconds !== null && remainingSeconds > 0,
    }}>
      {children}
    </SleepTimerContext.Provider>
  );
}

export function useSleepTimer() {
  const context = useContext(SleepTimerContext);
  if (!context) {
    throw new Error("useSleepTimer must be used within a SleepTimerProvider");
  }
  return context;
}
