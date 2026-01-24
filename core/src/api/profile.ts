import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { users, credentials } from "../db/schema";
import { runTask } from "../db/task-queue";
import { hashPassword, verifyPassword } from "../auth/password";
import * as webauthn from "../auth/webauthn";
import type { WebAuthnConfig } from "../auth/webauthn";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

let webauthnConfig: WebAuthnConfig;

export function initProfileHandlers(config: WebAuthnConfig) {
  webauthnConfig = config;
}

// GET /api/profile - Get user profile
export async function getProfile(c: Context) {
  try {
    const userId = c.req.header("X-User-Id");
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const db = getDB();
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        approved: users.approved,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get user's passkeys
    const userCreds = await db
      .select({
        id: credentials.id,
        attestationType: credentials.attestationType,
        createdAt: credentials.createdAt,
        signCount: credentials.signCount,
      })
      .from(credentials)
      .where(eq(credentials.userId, userId));

    return c.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      approved: user.approved,
      hasPassword: !!user.passwordHash,
      passkeys: userCreds.map((cred) => ({
        id: cred.id.toString("base64url"),
        type: cred.attestationType,
        createdAt: cred.createdAt,
        signCount: cred.signCount,
      })),
    });
  } catch (error: any) {
    console.error("[Profile] Error fetching profile:", error);
    return c.json({ error: error.message }, 500);
  }
}

// POST /api/profile/password - Set or update password
export async function updatePassword(c: Context) {
  try {
    const userId = c.req.header("X-User-Id");
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const body = await c.req.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return c.json(
        { error: "New password must be at least 6 characters" },
        400,
      );
    }

    const db = getDB();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // If user has a password, verify current password
    if (user.passwordHash) {
      if (!currentPassword) {
        return c.json({ error: "Current password is required" }, 400);
      }
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        return c.json({ error: "Current password is incorrect" }, 401);
      }
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    await runTask(async () => {
      await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    });

    return c.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    console.error("[Profile] Error updating password:", error);
    return c.json({ error: error.message }, 500);
  }
}

// POST /api/profile/passkey/begin - Start adding a new passkey
export async function beginAddPasskey(c: Context) {
  try {
    const userId = c.req.header("X-User-Id");
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const db = getDB();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get existing credentials to exclude them
    const existingCreds = await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, userId));

    const options = await webauthn.startRegistration(
      user.username,
      userId,
      webauthnConfig,
    );

    // Exclude existing credentials
    if (existingCreds.length > 0) {
      options.excludeCredentials = existingCreds.map((cred) => ({
        id: cred.id.toString("base64url"),
        type: "public-key",
        transports: ["usb", "ble", "nfc", "internal"],
      }));
    }

    return c.json(options);
  } catch (error: any) {
    console.error("[Profile] Error starting passkey registration:", error);
    return c.json({ error: error.message }, 500);
  }
}

// POST /api/profile/passkey/finish - Finish adding a new passkey
export async function finishAddPasskey(c: Context) {
  try {
    const userId = c.req.header("X-User-Id");
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const body = await c.req.json<{
      response: RegistrationResponseJSON;
    }>();

    const { response } = body;
    if (!response) {
      return c.json({ error: "Response is required" }, 400);
    }

    const db = getDB();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Verify registration
    const verification = await webauthn.finishRegistration(
      user.username,
      response,
      webauthnConfig,
    );

    if (!verification.verified || !verification.registrationInfo) {
      return c.json({ error: "Registration verification failed" }, 400);
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      aaguid,
      credentialBackedUp,
      credentialDeviceType,
    } = verification.registrationInfo;

    await runTask(async () => {
      await db.insert(credentials).values({
        id: Buffer.from(credentialID),
        userId,
        publicKey: Buffer.from(credentialPublicKey),
        attestationType: credentialDeviceType || "none",
        aaguid: Buffer.from(aaguid),
        signCount: counter,
        cloneWarning: false,
        backupEligible: credentialBackedUp,
        backupState: credentialBackedUp,
      });
    });

    return c.json({ success: true, message: "Passkey added successfully" });
  } catch (error: any) {
    console.error("[Profile] Error finishing passkey registration:", error);
    return c.json({ error: error.message }, 500);
  }
}

// DELETE /api/profile/passkey/:id - Delete a passkey
export async function deletePasskey(c: Context) {
  try {
    const userId = c.req.header("X-User-Id");
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const credentialId = c.req.param("id");
    const db = getDB();

    // Verify the credential belongs to the user
    const credId = Buffer.from(credentialId, "base64url");
    const [credential] = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, credId))
      .limit(1);

    if (!credential) {
      return c.json({ error: "Passkey not found" }, 404);
    }

    if (credential.userId !== userId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    // Check if this is the last authentication method
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userCreds = await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, userId));

    if (!user.passwordHash && userCreds.length === 1) {
      return c.json(
        {
          error:
            "Cannot delete last authentication method. Add a password first.",
        },
        400,
      );
    }

    await runTask(async () => {
      await db.delete(credentials).where(eq(credentials.id, credId));
    });

    return c.json({ success: true, message: "Passkey deleted successfully" });
  } catch (error: any) {
    console.error("[Profile] Error deleting passkey:", error);
    return c.json({ error: error.message }, 500);
  }
}
