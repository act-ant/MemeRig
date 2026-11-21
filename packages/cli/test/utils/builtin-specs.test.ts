import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  BUILTIN_SPEC_IDS,
  getBuiltinSpecDirectory,
  isBuiltinSpecId,
} from "../../src/utils/builtin-specs.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const marketplaceRoot = path.resolve(testDir, "../../../../marketplace");

interface MarketplaceEntry {
  id: string;
  type: string;
  path: string;
}

describe("builtin starter specs", () => {
  it("lists the three starter preset ids", () => {
    expect(BUILTIN_SPEC_IDS).toEqual(["learn-harness", "trellis", "game-dev"]);
  });

  it.each([...BUILTIN_SPEC_IDS])(
    "resolves %s to a directory with an index and README",
    (id) => {
      const dir = getBuiltinSpecDirectory(id);
      if (!dir) {
        throw new Error(`expected a bundled directory for ${id}`);
      }

      expect(fs.statSync(dir).isDirectory()).toBe(true);
      expect(fs.existsSync(path.join(dir, "index.md"))).toBe(true);
      expect(fs.existsSync(path.join(dir, "README.md"))).toBe(true);
    },
  );

  it("registers every starter as a relative Marketplace spec entry", () => {
    const index = JSON.parse(
      fs.readFileSync(path.join(marketplaceRoot, "index.json"), "utf-8"),
    ) as { templates: MarketplaceEntry[] };

    for (const id of BUILTIN_SPEC_IDS) {
      const entry = index.templates.find((template) => template.id === id);
      if (!entry) {
        throw new Error(`missing Marketplace entry for ${id}`);
      }

      expect(entry.type).toBe("spec");
      expect(entry.path).toBe(`specs/${id}`);
      expect(
        fs.existsSync(path.join(marketplaceRoot, entry.path, "index.md")),
      ).toBe(true);
    }
  });

  it("rejects unknown ids instead of composing a path", () => {
    expect(getBuiltinSpecDirectory("blank")).toBeUndefined();
    expect(getBuiltinSpecDirectory("")).toBeUndefined();
    expect(getBuiltinSpecDirectory("../learn-harness")).toBeUndefined();
    expect(getBuiltinSpecDirectory("learn-harness/../trellis")).toBeUndefined();
  });

  it("narrows only exact known ids", () => {
    expect(isBuiltinSpecId("trellis")).toBe(true);
    expect(isBuiltinSpecId("Trellis")).toBe(false);
    expect(isBuiltinSpecId("game-dev ")).toBe(false);
  });
});
