import { db } from "../mod.ts";
import { usersTable } from "../schema/users.ts";
import { generateSalt, hashPassword } from "../utils.ts";

async function main() {
  const passwordSalt = generateSalt();
  await db.insert(usersTable).values({
    username: "admin",
    displayName: "Admin",
    email: "admin@udibo.com",
    passwordHash: await hashPassword("password", passwordSalt),
    passwordSalt,
  });
}

main();
