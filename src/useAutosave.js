import { useEffect, useRef } from "react";

export function useAutosave(value, onSave, delay = 1200) {
  const prevValue = useRef(value);
  const timer = useRef(null);

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSave();
    }, delay);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}
