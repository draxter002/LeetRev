import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { extractUsernameFromJwt, syncAllPlatforms } from "../src/lib/platforms/sync";

describe("Platform Sync Tests", () => {
  describe("extractUsernameFromJwt", () => {
    test("extracts username from a simulated JWT payload", () => {
      const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64");
      const payload = Buffer.from(JSON.stringify({ username: "test_coder", id: 12345 })).toString("base64");
      const fakeJwt = `${header}.${payload}.signature`;

      assert.equal(extractUsernameFromJwt(fakeJwt), "test_coder");
    });

    test("handles LEETCODE_SESSION= prefix and cookie formatting", () => {
      const header = Buffer.from(JSON.stringify({ alg: "HS256" })).toString("base64");
      const payload = Buffer.from(JSON.stringify({ user_slug: "leet_master" })).toString("base64");
      const cookieStr = `LEETCODE_SESSION=${header}.${payload}.sig; Path=/; Domain=.leetcode.com`;

      assert.equal(extractUsernameFromJwt(cookieStr), "leet_master");
    });

    test("returns null for invalid or empty tokens", () => {
      assert.equal(extractUsernameFromJwt(null), null);
      assert.equal(extractUsernameFromJwt(""), null);
      assert.equal(extractUsernameFromJwt("invalid-token"), null);
    });
  });

  describe("syncAllPlatforms with empty or invalid config", () => {
    test("returns empty array and checked list when no handles or credentials exist", async () => {
      const result = await syncAllPlatforms({
        leetcode_username: null,
        leetcode_session: null,
        platform_handles: {},
      });

      assert.deepEqual(result.submissions, []);
      assert.deepEqual(result.platformsChecked, []);
    });
  });
});
