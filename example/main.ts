import { serve } from "@udibo/react-app/server";

import route from "./routes/_main.tsx";
import router from "./routes/_main.ts";
import "./log.ts";

import { db } from "./database/mod.ts";
import { usersTable } from "./database/schema/users.ts";

const users = await db.select().from(usersTable);
console.log(users);

await serve({
  port: 9000,
  router,
  route,
});
