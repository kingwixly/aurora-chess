import { describe, it, expect } from "vitest";
import { createChildLogger, logger, loggerOptions } from "./logger.js";

describe("logger", () => {
  it("should export a logger with standard log methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.trace).toBe("function");
    expect(typeof logger.fatal).toBe("function");
  });

  it("should export loggerOptions with a level", () => {
    expect(loggerOptions).toHaveProperty("level");
    expect(typeof loggerOptions.level).toBe("string");
  });
});

describe("createChildLogger", () => {
  it("should return a logger object", () => {
    const child = createChildLogger("test-module");
    expect(child).toBeDefined();
    expect(typeof child).toBe("object");
  });

  it("should have standard log methods", () => {
    const child = createChildLogger("test-module");
    expect(typeof child.info).toBe("function");
    expect(typeof child.error).toBe("function");
    expect(typeof child.warn).toBe("function");
    expect(typeof child.debug).toBe("function");
  });

  it("should create loggers with different names independently", () => {
    const a = createChildLogger("module-a");
    const b = createChildLogger("module-b");
    expect(a).not.toBe(b);
  });
});
