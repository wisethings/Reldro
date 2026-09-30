// `server-only` is a Next.js build-time guard that throws outside a server bundle. Tests run plain Node, so make it a no-op.
const Module = require("node:module");
const original = Module._load;
Module._load = function (request, ...rest) {
  if (request === "server-only") return {};
  return original.call(this, request, ...rest);
};
