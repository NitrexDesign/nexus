import { Context } from "hono";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";

const ICONS_DIR =
  process.env.ICONS_DIR || path.join(process.cwd(), "../data/icons");
const MAX_ICON_SIZE = 5 * 1024 * 1024; // 5MB

// GET /api/icons/search?url=... - Search for icons in a webpage
export async function searchIcons(c: Context) {
  try {
    const url = c.req.query("url");
    if (!url) {
      return c.json({ error: "URL parameter is required" }, 400);
    }

    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Nexus/1.0)",
      },
    });

    if (!response.ok) {
      return c.json({ error: "Failed to fetch URL" }, 400);
    }

    const html = await response.text();
    const icons: Array<{ url: string; type: string }> = [];

    // Parse HTML for various icon types
    const baseUrl = new URL(url);

    // Look for favicon
    const faviconMatch = html.match(
      /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
    );
    if (faviconMatch) {
      icons.push({
        url: new URL(faviconMatch[1], baseUrl.origin).toString(),
        type: "favicon",
      });
    }

    // Look for apple-touch-icon
    const appleTouchMatch = html.match(
      /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
    );
    if (appleTouchMatch) {
      icons.push({
        url: new URL(appleTouchMatch[1], baseUrl.origin).toString(),
        type: "apple-touch-icon",
      });
    }

    // Look for og:image
    const ogImageMatch = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
    );
    if (ogImageMatch) {
      icons.push({
        url: new URL(ogImageMatch[1], baseUrl.origin).toString(),
        type: "og:image",
      });
    }

    // Look for any other link rel="icon"
    const iconMatches = html.matchAll(
      /<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["']/gi,
    );
    for (const match of iconMatches) {
      icons.push({
        url: new URL(match[1], baseUrl.origin).toString(),
        type: "icon",
      });
    }

    // If no icons found, try default favicon.ico
    if (icons.length === 0) {
      icons.push({
        url: new URL("/favicon.ico", baseUrl.origin).toString(),
        type: "favicon",
      });
    }

    return c.json(icons);
  } catch (error: any) {
    console.error("[Icons] Error searching icons:", error);
    return c.json({ error: error.message }, 500);
  }
}

// POST /api/icons/download - Download icon from URL
export async function downloadIcon(c: Context) {
  try {
    const body = await c.req.json<{ url: string }>();
    const { url } = body;

    if (!url) {
      return c.json({ error: "URL is required" }, 400);
    }

    // Download the icon
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Nexus/1.0)",
      },
    });

    if (!response.ok) {
      return c.json({ error: "Failed to download icon" }, 400);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      return c.json({ error: "URL does not point to an image" }, 400);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_ICON_SIZE) {
      return c.json({ error: "Icon size exceeds 5MB limit" }, 400);
    }

    // Determine file extension
    let ext = "png";
    if (contentType.includes("svg")) ext = "svg";
    else if (contentType.includes("jpeg") || contentType.includes("jpg"))
      ext = "jpg";
    else if (contentType.includes("gif")) ext = "gif";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("ico")) ext = "ico";

    // Generate filename
    const filename = `${uuidv4()}.${ext}`;
    const filepath = path.join(ICONS_DIR, filename);

    // Save file
    await Bun.write(filepath, buffer);

    return c.json({ path: `/icons/${filename}` });
  } catch (error: any) {
    console.error("[Icons] Error downloading icon:", error);
    return c.json({ error: error.message }, 500);
  }
}

// POST /api/icons/upload - Upload icon file
export async function uploadIcon(c: Context) {
  try {
    const formData = await c.req.formData();
    const file = formData.get("icon") as File;

    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    // Check file size
    if (file.size > MAX_ICON_SIZE) {
      return c.json({ error: "File size exceeds 5MB limit" }, 400);
    }

    // Check content type
    if (!file.type.startsWith("image/")) {
      return c.json({ error: "File must be an image" }, 400);
    }

    // Determine file extension
    let ext = "png";
    if (file.type.includes("svg")) ext = "svg";
    else if (file.type.includes("jpeg") || file.type.includes("jpg"))
      ext = "jpg";
    else if (file.type.includes("gif")) ext = "gif";
    else if (file.type.includes("webp")) ext = "webp";
    else if (file.type.includes("ico")) ext = "ico";

    // Generate filename
    const filename = `${uuidv4()}.${ext}`;
    const filepath = path.join(ICONS_DIR, filename);

    // Save file
    const buffer = await file.arrayBuffer();
    await Bun.write(filepath, buffer);

    return c.json({ path: `/icons/${filename}` });
  } catch (error: any) {
    console.error("[Icons] Error uploading icon:", error);
    return c.json({ error: error.message }, 500);
  }
}
