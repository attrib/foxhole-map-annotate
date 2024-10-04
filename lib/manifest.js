/** @import { Manifest } from "vite" */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Reads the manifest.json file from the dist/client folder to map the file names to their hashed versions.
 *
 * @returns {Promise<Readonly<Manifest>>} The manifest object.
 */
export async function getManifest() {
  try {
    const data = await readFile(resolve("dist", ".vite", "manifest.json"), "utf-8");
    return /** @type {Manifest} */ (JSON.parse(data));
  } catch (error) {
    return {};
  }
}
