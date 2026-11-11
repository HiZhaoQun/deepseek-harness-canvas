/**
 * Shared React runtime for the lazily loaded DeepSeek Harness Canvas modules.
 * The host client module injects React once through a page-local slot; no
 * second React copy is bundled or fetched.
 */
export const React = globalThis.__DEEPSEEK_CANVAS_REACT__
if (React === undefined) {
  throw new Error('DeepSeek Harness Canvas: React runtime was not provided by the client module')
}

export const h = React.createElement
export const {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} = React
