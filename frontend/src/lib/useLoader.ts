import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type DependencyList } from 'react';

type LoaderState<T> = { data: T | undefined; error: unknown; loading: boolean };

/**
 * Runs `load` whenever the screen gains focus or `deps` change, so tab screens pick up
 * sessions recorded elsewhere. Keeps the last good data while reloading.
 */
export function useLoader<T>(load: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<LoaderState<T>>({ data: undefined, error: null, loading: true });
  const latest = useRef(0);

  // The caller's deps decide when `load` is stale, exactly like useEffect.
  const run = useCallback(() => {
    const ticket = ++latest.current;
    setState((s) => ({ ...s, loading: true }));
    load().then(
      (data) => {
        if (ticket === latest.current) setState({ data, error: null, loading: false });
      },
      (error: unknown) => {
        if (ticket === latest.current) setState((s) => ({ data: s.data, error, loading: false }));
      },
    );
  }, deps);

  useFocusEffect(run);

  return { ...state, reload: run };
}
