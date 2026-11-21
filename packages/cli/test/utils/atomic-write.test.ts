import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { writeFileAtomic } from "../../src/utils/atomic-write.js";

describe("writeFileAtomic", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "memerig-atomic-"));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("writes new content", () => {
    const f = path.join(dir, "a.json");
    writeFileAtomic(f, '{"x":1}');
    expect(fs.readFileSync(f, "utf-8")).toBe('{"x":1}');
  });

  it("overwrites and leaves no temp file behind", () => {
    const f = path.join(dir, "a.json");
    writeFileAtomic(f, "old");
    writeFileAtomic(f, "new");
    expect(fs.readFileSync(f, "utf-8")).toBe("new");
    expect(fs.readdirSync(dir)).toEqual(["a.json"]);
  });

  it("preserves the original file when replacement fails", () => {
    const target = path.join(dir, "keep.json");
    writeFileAtomic(target, "first");
    const failure = new Error("rename denied");
    const rename = vi.spyOn(fs, "renameSync").mockImplementationOnce(() => {
      throw failure;
    });
    try {
      expect(() => writeFileAtomic(target, "second")).toThrow(failure);
      expect(fs.readFileSync(target, "utf-8")).toBe("first");
      expect(fs.readdirSync(dir)).toEqual(["keep.json"]);
    } finally {
      rename.mockRestore();
    }
  });
});
