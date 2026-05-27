export function teardown() {
  // Force exit after a short delay to ensure vitest reports the final results properly,
  // bypassing any dangling handles (like IndexedDB or WebSockets) that might keep the process alive.
  setTimeout(() => {
    process.exit(0);
  }, 500);
}
