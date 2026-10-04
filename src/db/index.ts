import {drizzle} from "drizzle-orm/node-postgres";
import { DB_URL } from "../../env";

export const db = drizzle(DB_URL);