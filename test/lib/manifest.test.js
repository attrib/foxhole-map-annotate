import { readFile } from "node:fs/promises";

import { expect, describe, vi, it, beforeEach } from "vitest";

import { getManifest } from "../../lib/manifest.js";

vi.mock("node:fs/promises");

beforeEach(() => {
  vi.resetAllMocks();
});

const emptyManifest = {};
const sampleManifest = JSON.stringify({
  "frontend/main.js": {
    file: "assets/main-B6UWrIsM.js",
    name: "main",
    src: "frontend/main.js",
    isEntry: true,
    css: ["assets/main-CLMzD_Nu.css"],
    assets: ["assets/some-assets-DEOuAgeU.woff", "assets/othera-assets-BOrJxbIo.woff"],
  },
});

describe("getManifest function", async () => {
  it("should return an empty object if the manifest.json file is not found", async () => {
    vi.mocked(readFile).mockRejectedValueOnce(new Error("File not found"));

    const manifest = await getManifest();

    expect(manifest).toEqual(emptyManifest);
  });

  it("should return the manifest object if the manifest.json file is found", async () => {
    vi.mocked(readFile).mockResolvedValueOnce(sampleManifest);

    const manifest = await getManifest();

    expect(manifest).toEqual(JSON.parse(sampleManifest));
  });

  it("should return an empty object if the manifest.json fails to parse", async () => {
    vi.mocked(readFile).mockResolvedValueOnce("not a JSON");

    const manifest = await getManifest();

    expect(manifest).toEqual(emptyManifest);
  });
});
