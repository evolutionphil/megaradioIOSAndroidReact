import { useState, useEffect, useCallback, useRef } from 'react';

interface UseIdleDetectionOptions {
  idleTime?: number;
  onIdle?: () => void;
  onActive?: () => void;
}

export function useIdleDetection(options: UseIdleDetectionOptions = {}) {
  const { 
    idleTime = 3 * 60 * 1000,
    onIdle,
    onActive 
  } = options;

  const [isIdle, setIsIdle] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const isIdleRef = useRef(false);
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  const idleTimeRef = useRef(idleTime);
  const timerIdRef = useRef<any>(null);

  onIdleRef.current = onIdle;
  onActiveRef.current = onActive;
  idleTimeRef.current = idleTime;

  const resetIdleTimer = useCallback(function() {
    lastActivityRef.current = Date.now();
    
    if (isIdleRef.current) {
      isIdleRef.current = false;
      setIsIdle(false);
      if (onActiveRef.current) {
        onActiveRef.current();
      }
    }
  }, []);

  useEffect(function() {
    function onActivity() {
      resetIdleTimer();
    }

    function checkIdle() {
      var now = Date.now();
      var elapsed = now - lastActivityRef.current;
      
      if (elapsed >= idleTimeRef.current && !isIdleRef.current) {
        isIdleRef.current = true;
        setIsIdle(true);
        if (onIdleRef.current) {
          onIdleRef.current();
        }
      }
      
      timerIdRef.current = setTimeout(checkIdle, 2000);
    }

    document.addEventListener('keydown', onActivity, false);
    document.addEventListener('keypress', onActivity, false);
    document.addEventListener('mousedown', onActivity, false);
    document.addEventListener('touchstart', onActivity, false);
    document.addEventListener('click', onActivity, false);

    timerIdRef.current = setTimeout(checkIdle, 2000);

    return function() {
      document.removeEventListener('keydown', onActivity, false);
      document.removeEventListener('keypress', onActivity, false);
      document.removeEventListener('mousedown', onActivity, false);
      document.removeEventListener('touchstart', onActivity, false);
      document.removeEventListener('click', onActivity, false);
      
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
      }
    };
  }, [resetIdleTimer]);

  return {
    isIdle: isIdle,
    lastActivity: lastActivityRef.current,
    resetIdleTimer: resetIdleTimer
  };
}
