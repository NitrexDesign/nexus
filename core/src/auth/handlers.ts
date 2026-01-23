import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { users, credentials } from "../db/schema";
import { runTask } from "../db/task-queue";
import { hashPassword, verifyPassword } from "./password";
import * as webauthn from "./webauthn";
import type { WebAuthnConfig } from "./webauthn";
import { generateId } from "../utils/id";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

let webauthnConfig: WebAuthnConfig;

export function initAuthHandlers(config: WebAuthnConfig) {
  webauthnConfig = config;
}

// Helper to check if user is first user
async function isFirstUser(): Promise<boolean> {
  const db = getDB();
  const allUsers = await db.select({ id: users.id }).from(users).limit(1);
  return allUsers.length === 0;
}

// Password registration
export async function registerPassword(c: Context) {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ error: "Username and password are required" }, 400);
    }

    const db = getDB();

    // Check if username exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (existing.length > 0) {
      return c.json({ error: "Username already exists" }, 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Check if this is the first user
    const firstUser = await isFirstUser();

    // Create user
    const userId = generateId();
    await runTask(async () => {
      await db.insert(users).values({
        id: userId,
        username,
        displayName: username,
        approved: firstUser, // Auto-approve first user
        passwordHash,
      });
    });

    return c.text("Registration successful", 200);
  } catch (error: any) {
    console.error("[Auth] Password registration error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// Password login
export async function loginPassword(c: Context) {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    if (!username || !password) {
      return c.json({ error: "Username and password are required" }, 400);
    }

    const db = getDB();

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!user) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    // Check if user is approved
    if (!user.approved) {
      return c.json({ error: "User account pending approval" }, 403);
    }

    // Check if user has a password
    if (!user.passwordHash) {
      return c.json({ error: "User has no password set" }, 403);
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return c.json({ error: "Invalid username or password" }, 401);
    }

    return c.text("Login successful", 200);
  } catch (error: any) {
    console.error("[Auth] Password login error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// WebAuthn registration - start
export async function startWebAuthnRegistration(c: Context) {
  try {
    const username = c.req.query("username");
    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    const db = getDB();

    // Check if username exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (existing.length > 0) {
      return c.json({ error: "Username already exists" }, 400);
    }

    // Generate temporary user ID for registration
    const userId = generateId();

    // Generate registration options
    const options = await webauthn.startRegistration(
      username,
      userId,
      webauthnConfig,
    );

    return c.json(options);
  } catch (error: any) {
    console.error("[Auth] WebAuthn registration start error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// WebAuthn registration - finish
export async function finishWebAuthnRegistration(c: Context) {
  try {
    const body = await c.req.json<{
      username: string;
      response: RegistrationResponseJSON;
    }>();

    const { username, response } = body;

    if (!username || !response) {
      return c.json({ error: "Username and response are required" }, 400);
    }

    // Verify registration
    const verification = await webauthn.finishRegistration(
      username,
      response,
      webauthnConfig,
    );

    if (!verification.verified || !verification.registrationInfo) {
      return c.json({ error: "Registration verification failed" }, 400);
    }

    const db = getDB();

    // Check if this is the first user
    const firstUser = await isFirstUser();

    // Create user and credential
    const userId = generateId();
    const {
      credentialID,
      credentialPublicKey,
      counter,
      aaguid,
      credentialBackedUp,
      credentialDeviceType,
    } = verification.registrationInfo;

    await runTask(async () => {
      // Create user
      await db.insert(users).values({
        id: userId,
        username,
        displayName: username,
        approved: firstUser, // Auto-approve first user
        passwordHash: null,
      });

      // Create credential
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

    return c.text("Registration successful", 200);
  } catch (error: any) {
    console.error("[Auth] WebAuthn registration finish error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// WebAuthn login - start
export async function startWebAuthnLogin(c: Context) {
  try {
    const username = c.req.query("username");
    if (!username) {
      return c.json({ error: "Username is required" }, 400);
    }

    const db = getDB();

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if user is approved
    if (!user.approved) {
      return c.json({ error: "User account pending approval" }, 403);
    }

    // Get user credentials
    const userCreds = await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, user.id));

    if (userCreds.length === 0) {
      return c.json({ error: "No credentials found for user" }, 404);
    }

    // Generate authentication options
    const options = await webauthn.startAuthentication(
      username,
      userCreds.map((cred) => ({
        id: cred.id,
        signCount: cred.signCount,
      })),
      webauthnConfig,
    );

    return c.json(options);
  } catch (error: any) {
    console.error("[Auth] WebAuthn login start error:", error);
    return c.json({ error: error.message }, 500);
  }
}

// WebAuthn login - finish
export async function finishWebAuthnLogin(c: Context) {
  try {
    const body = await c.req.json<{
      username: string;
      response: AuthenticationResponseJSON;
    }>();

    const { username, response } = body;

    if (!username || !response) {
      return c.json({ error: "Username and response are required" }, 400);
    }

    const db = getDB();

    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Find credential
    const credId = Buffer.from(response.id, "base64url");
    const [credential] = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, credId))
      .limit(1);

    if (!credential) {
      return c.json({ error: "Credential not found" }, 404);
    }

    // Verify authentication
    const verification = await webauthn.finishAuthentication(
      username,
      response,
      {
        id: credential.id,
        publicKey: credential.publicKey,
        signCount: credential.signCount,
      },
      webauthnConfig,
    );

    if (!verification.verified) {
      return c.json({ error: "Authentication verification failed" }, 401);
    }

    // Update sign count
    if (verification.authenticationInfo.newCounter > credential.signCount) {
      await runTask(async () => {
        await db
          .update(credentials)
          .set({ signCount: verification.authenticationInfo.newCounter })
          .where(eq(credentials.id, credId));
      });
    }

    return c.text("Login successful", 200);
  } catch (error: any) {
    console.error("[Auth] WebAuthn login finish error:", error);
    return c.json({ error: error.message }, 500);
  }
}
