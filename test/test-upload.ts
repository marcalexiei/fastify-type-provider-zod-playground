import { describe, it } from "node:test";
import assert from "node:assert/strict";

const SERVER_URL = "http://localhost:5173/testing-multi-part";

describe("file", () => {
  it("Upload within limits should pass", async (t) => {
    const form = new FormData();
    form.append("html", new Blob(["ciao"]));

    const res = await fetch(SERVER_URL, { method: "POST", body: form });
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.status, "ok");
  });

  it("should error with file exceeding size", async (t) => {
    const form = new FormData();
    form.append("html", new Blob(["x".repeat(100_000)]));

    const res = await fetch(SERVER_URL, { method: "POST", body: form });
    const json = await res.json();

    assert.equal(res.status, 413);
    assert.equal(json.code, "FST_REQ_FILE_TOO_LARGE");
    assert.equal(json.message, "request file too large");
  });
});

describe("field", () => {
  it("should display field", async (t) => {
    const form = new FormData();
    const html = "ciao";
    form.append("html", html);

    const res = await fetch(SERVER_URL, { method: "POST", body: form });
    const json = await res.json();

    assert.equal(res.status, 200);
    t.assert.snapshot(json.body);
  });

  it("should error when a field exceeds size limit", async (t) => {
    const form = new FormData();
    const html = "x".repeat(100_000);
    form.append("html", html);

    const res = await fetch(SERVER_URL, { method: "POST", body: form });
    const json = await res.json();

    assert.equal(res.status, 413);
    t.assert.snapshot(json);
  });
});
