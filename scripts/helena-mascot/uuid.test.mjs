import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { MathUtils } from "./vendor/three.module.js";

test("graphic UUIDs use secure random words and preserve RFC 4122 version 4", () => {
  const weak = mock.method(Math, "random", () => {
    throw new Error("UUID must not use Math.random");
  });
  const secure = mock.method(globalThis.crypto, "getRandomValues", (words) => {
    words.fill(0);
    return words;
  });
  try {
    assert.equal(MathUtils.generateUUID(), "00000000-0000-4000-8000-000000000000");
    assert.equal(secure.mock.callCount(), 1);
    assert.equal(weak.mock.callCount(), 0);
  } finally {
    mock.restoreAll();
  }
});
test("graphic identifiers remain distinct with the native secure generator", () => {
  const values = Array.from({ length: 64 }, () => MathUtils.generateUUID());
  assert.equal(new Set(values).size, values.length);
  for (const value of values) {
    assert.match(value, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  }
});
