/**
 * Adapter for the lila-stockfish-web engine builds.
 *
 * Aurora's engine code speaks the classic Stockfish.js worker protocol:
 * `postMessage("go depth 12")` in, UCI text out via `onmessage`. The
 * lila-stockfish-web builds - Fairy-Stockfish 14 and Stockfish 16.7 - are ES
 * modules with a different shape: you instantiate a factory, call `.uci(cmd)`,
 * and read replies from a `listen` callback.
 *
 * Rather than branch the engine hook on which protocol an engine speaks, this
 * shim runs inside the worker and translates. Everything upstream stays
 * identical, and adding another engine of this family later means adding a
 * query parameter rather than another code path.
 *
 * Loaded as `new Worker("/engines/lila-adapter.js?engine=fairy-sf14", { type: "module" })`.
 */

/** Which build to load, from the query string. */
const params = new URLSearchParams(self.location.search);
const engine = params.get("engine");

/**
 * Allow-listed rather than interpolated straight into the import.
 *
 * The query string is attacker-controllable in principle, and an unchecked
 * value here is an arbitrary-script import inside a worker.
 */
const BUILDS = {
  "fairy-sf14": "./fairy-sf14.js",
  "stockfish-16-7": "./stockfish-16-7.js",
};

const path = BUILDS[engine];

if (!path) {
  // Reported rather than thrown silently: a worker that dies on load leaves
  // the caller waiting for a "ready" that never comes.
  self.postMessage(`info string unknown engine ${engine}`);
} else {
  let instance = null;

  const boot = async () => {
    const makeModule = (await import(path)).default;
    instance = await makeModule({
      // The module needs to know where it lives to find its own wasm.
      locateFile: (file) => new URL(file, self.location.href).href,
    });

    // Replies go straight out as if they came from a classic worker.
    instance.listen = (line) => self.postMessage(line);
    instance.onError = (err) => self.postMessage(`info string error ${err}`);

    // Anything sent before the module finished loading is replayed in order.
    for (const cmd of queued) instance.uci(cmd);
    queued.length = 0;
  };

  /** Commands that arrived before the module was ready. */
  const queued = [];

  self.onmessage = (event) => {
    const cmd = typeof event.data === "string" ? event.data : String(event.data);
    if (instance) {
      instance.uci(cmd);
    } else {
      queued.push(cmd);
    }
  };

  boot().catch((err) => {
    self.postMessage(`info string failed to load ${engine}: ${err}`);
  });
}
