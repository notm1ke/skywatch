import path from "node:path";
import unzipper from "unzipper";

import { tmpdir } from "node:os";
import { parse } from "csv-parse/sync";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";

export type CsvParseOptions<T> = Parameters<typeof parse<T>>["1"];

export const createTemp = async (namespace: string) => {
	const dir = path.join(tmpdir(), `skywatch-${namespace}-${randomUUID()}`);
	await mkdir(dir);
	return dir;
}

export const cleanupTemp = async (path: string) => rm(path, { recursive: true });

export const extractArchive = async (archive: string, path: string, concurrency = 5) => unzipper
	.Open
	.file(archive)
	.then(handle => handle.extract({ path, concurrency }));