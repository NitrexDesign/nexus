import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { users } from "../db/schema";
import { runTask } from "../db/task-queue";

// GET /api/users - List all users
export async function getUsers(c: Context) {
  try {
    const db = getDB();
    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        approved: users.approved,
      })
      .from(users);

    return c.json(allUsers);
  } catch (error: any) {
    console.error("[Users] Error fetching users:", error);
    return c.json({ error: error.message }, 500);
  }
}

// PUT /api/users/:id/approve - Approve/unapprove user
export async function approveUser(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json<{ approved: boolean }>();

    await runTask(async () => {
      const db = getDB();
      await db
        .update(users)
        .set({ approved: body.approved })
        .where(eq(users.id, id));
    });

    return c.json({ message: "User approval status updated" });
  } catch (error: any) {
    console.error("[Users] Error updating user approval:", error);
    return c.json({ error: error.message }, 500);
  }
}

// DELETE /api/users/:id - Delete user (cascades to credentials)
export async function deleteUser(c: Context) {
  try {
    const id = c.req.param("id");

    await runTask(async () => {
      const db = getDB();
      // Credentials will be cascade deleted due to foreign key
      await db.delete(users).where(eq(users.id, id));
    });

    return c.json({ message: "User deleted" });
  } catch (error: any) {
    console.error("[Users] Error deleting user:", error);
    return c.json({ error: error.message }, 500);
  }
}
