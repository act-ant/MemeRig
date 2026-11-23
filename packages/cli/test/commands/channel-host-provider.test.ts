import { describe, expect, it } from "vitest";

import { detectHostProvider } from "../../src/commands/channel/host-provider.js";

/**
 * The agent definition is a role, not a runtime. These tests pin the runtime
 * precedence documented in `host-provider.ts`: nothing here may depend on a
 * `provider:` line in an agent file.
 */
describe("channel host provider resolution", () => {
  it("lets MEMERIG_CHANNEL_PROVIDER win over host markers", () => {
    expect(
      detectHostProvider({
        env: { MEMERIG_CHANNEL_PROVIDER: "codex", CLAUDECODE: "1" },
        configuredPlatforms: () => [],
      }),
    ).toBe("codex");
  });

  it("follows the host agent's own env markers", () => {
    expect(
      detectHostProvider({
        env: { CLAUDECODE: "1" },
        configuredPlatforms: () => [],
      }),
    ).toBe("claude");
    expect(
      detectHostProvider({
        env: { CODEX_THREAD_ID: "019a-abc" },
        configuredPlatforms: () => [],
      }),
    ).toBe("codex");
  });

  it("prefers host markers over MEMERIG_PLATFORM", () => {
    expect(
      detectHostProvider({
        env: { CODEX_HOME: "/home/u/.codex", MEMERIG_PLATFORM: "claude" },
        configuredPlatforms: () => [],
      }),
    ).toBe("codex");
  });

  it("honours MEMERIG_PLATFORM when no host marker is present", () => {
    expect(
      detectHostProvider({
        env: { MEMERIG_PLATFORM: "codex" },
        configuredPlatforms: () => [],
      }),
    ).toBe("codex");
  });

  it("uses the repository's single configured worker platform", () => {
    expect(
      detectHostProvider({
        env: {},
        configuredPlatforms: () => ["codex", "cursor"],
      }),
    ).toBe("codex");
  });

  it("stays undefined when several worker platforms are configured", () => {
    expect(
      detectHostProvider({
        env: {},
        configuredPlatforms: () => ["claude", "codex"],
      }),
    ).toBeUndefined();
  });

  it("ignores platforms that have no worker adapter", () => {
    expect(
      detectHostProvider({
        env: { MEMERIG_PLATFORM: "cursor" },
        configuredPlatforms: () => [],
      }),
    ).toBeUndefined();
  });
});
