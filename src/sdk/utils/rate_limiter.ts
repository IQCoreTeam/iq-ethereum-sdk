export function createRateLimiter(maxRps: number) {
  if (maxRps <= 0) return null;
  const interval = 1000 / maxRps;
  let last = 0;
  return {
    async wait() {
      const now = Date.now();
      const elapsed = now - last;
      if (elapsed < interval) {
        await new Promise((r) => setTimeout(r, interval - elapsed));
      }
      last = Date.now();
    },
  };
}
