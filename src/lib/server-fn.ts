// SPA compatibility shim: in the old TanStack Start setup, server functions
// were wrapped with useServerFn(fn) so call sites would route through RPC.
// In the SPA build everything runs client-side (or via an edge function),
// so the "wrapper" is just the identity function.
export function useServerFn<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}
