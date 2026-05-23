/**
 * useIdleSignal — отслеживает «активность» пользователя через счётчик.
 *
 * Возвращает `{ idleSignal, ping }`:
 *  - `idleSignal` — число, инкрементируется при каждом вызове `ping()`.
 *  - `ping()` — вызывается при любом тапе/действии.
 *
 * `IdleMascot` слушает `idleSignal` и сбрасывает свой 20-секундный
 * таймер.
 */

import { useCallback, useState } from 'react';

export interface IdleSignalApi {
  idleSignal: number;
  ping: () => void;
}

export function useIdleSignal(): IdleSignalApi {
  const [idleSignal, setIdleSignal] = useState(0);
  const ping = useCallback(() => {
    setIdleSignal((n) => n + 1);
  }, []);
  return { idleSignal, ping };
}
