import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stubs = vi.hoisted(() => {
  const server = {
    once: vi.fn(),
    close: vi.fn<(done: (error?: Error) => void) => void>(),
  };
  return {
    server,
    listen: vi.fn(() => server),
    logger: { info: vi.fn(), error: vi.fn(), fatal: vi.fn() },
  };
});

vi.mock("./composition-root.js", () => ({
  composeApi: () => ({
    app: { listen: stubs.listen },
    env: { PORT: 4300, HOST: "127.0.0.1" },
    logger: stubs.logger,
  }),
}));

const signals = ["SIGTERM", "SIGINT"] as const;
type ShutdownSignal = (typeof signals)[number];
let previous: Map<ShutdownSignal, Set<NodeJS.SignalsListener>>;

function startupHandlers(signal: ShutdownSignal) {
  return process
    .listeners(signal)
    .filter((listener) => !previous.get(signal)?.has(listener));
}

function trigger(signal: ShutdownSignal) {
  const [listener] = startupHandlers(signal);
  if (!listener) throw new Error(`Missing ${signal} shutdown handler`);
  listener(signal);
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  previous = new Map(
    signals.map((signal) => [signal, new Set(process.listeners(signal))]),
  );
});

afterEach(() => {
  for (const signal of signals) {
    for (const listener of startupHandlers(signal)) {
      process.removeListener(signal, listener);
    }
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("P1-01: API startup", () => {
  it("binds to the composed host and port", async () => {
    await import("./server.js");
    expect(stubs.listen).toHaveBeenCalledExactlyOnceWith(
      4300,
      "127.0.0.1",
      expect.any(Function),
    );
  });
});

describe("P1-04: graceful shutdown", () => {
  it.each(signals)(
    "drains the server once and cancels the deadline after %s",
    async (signal) => {
      const exit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("Unexpected process exit");
      });
      await import("./server.js");

      trigger(signal);
      trigger(signal);
      expect(stubs.server.close).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(9_999);
      expect(exit).not.toHaveBeenCalled();

      const [closeCall] = stubs.server.close.mock.calls;
      if (!closeCall) throw new Error("Missing close callback");
      closeCall[0]();
      vi.advanceTimersByTime(1);
      expect(exit).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("exits with a failure after ten seconds when requests cannot drain", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Forced process exit");
    });
    await import("./server.js");

    trigger("SIGTERM");
    vi.advanceTimersByTime(9_999);
    expect(exit).not.toHaveBeenCalled();
    expect(() => vi.advanceTimersByTime(1)).toThrow("Forced process exit");
    expect(exit).toHaveBeenCalledExactlyOnceWith(1);
  });
});
