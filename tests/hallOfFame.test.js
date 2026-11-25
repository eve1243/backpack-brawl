import { once } from "node:events";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hallOfFame } from "../server/hallOfFame.js";

describe("POST /api/hall-of-fame", () => {
  let server;
  let url;

  beforeAll(async () => {
    const app = express();
    app.use("/api/hall-of-fame", hallOfFame);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    url = `http://127.0.0.1:${server.address().port}/api/hall-of-fame`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  function victory() {
    return { runId: crypto.randomUUID(), name: "Ljilja", outcome: "victory", wins: 5, rounds: 5 };
  }

  function post(body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
  }

  it.each([
    ["victory", 5, 5], ["victory", 5, 7], ["defeat", 0, 3], ["defeat", 4, 7],
  ])("stores a %s with %i wins in %i rounds", async (outcome, wins, rounds) => {
    const run = { ...victory(), outcome, wins, rounds };
    const response = await post(JSON.stringify({ ...run, name: "  Ljilja  ", createdAt: "from client" }));
    expect(response.status).toBe(201);
    const entry = await response.json();
    expect(entry).toEqual({ ...run, createdAt: expect.any(String) });
    expect(new Date(entry.createdAt).toISOString()).toBe(entry.createdAt);
  });

  it.each([
    [{ runId: "bad-id" }, "runId"], [{ name: "   " }, "Name"], [{ name: "a".repeat(31) }, "Name"],
    [{ outcome: "playing" }, "Outcome"], [{ wins: "5" }, "whole numbers"], [{ rounds: 5.5 }, "whole numbers"],
    [{ wins: 4 }, "victory"], [{ rounds: 4 }, "victory"], [{ rounds: 8 }, "victory"],
    [{ outcome: "defeat", wins: 4, rounds: 6 }, "defeat"], [{ outcome: "defeat", wins: 5, rounds: 8 }, "defeat"],
    [{ outcome: "defeat", wins: -1, rounds: 2 }, "defeat"],
  ])("rejects invalid run data %j", async (changes, reason) => {
    const response = await post(JSON.stringify({ ...victory(), ...changes }));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain(reason);
  });

  it.each(["{", "[]", ""])("returns a JSON error for an invalid body %j", async (body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBeTruthy();
  });

  it("stores one entry on simultaneous submissions and preserves it after a conflict", async () => {
    const run = victory();
    const body = JSON.stringify(run);
    const responses = await Promise.all([post(body), post(body)]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
    const [first, second] = await Promise.all(responses.map((response) => response.json()));
    expect(first).toEqual(second);

    const conflict = await post(JSON.stringify({ ...run, rounds: 6 }));
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error).toContain("different data");

    const retry = await post(body);
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual(first);
  });
});
