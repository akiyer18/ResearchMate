import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";

const url = process.env.DATABASE_URL ?? "file:./local.db";
const filePath = url.startsWith("file:") ? url.slice("file:".length) : url;

const sqlite = new Database(filePath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

