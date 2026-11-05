/** Reads FastAPI's `detail`, which is a string for errors raised in route code and a
 * list of objects for its own request validation. */
export async function readErrorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      const messages = data.detail
        .map((item: { msg?: string }) => item.msg?.replace(/^Value error, /, ""))
        .filter(Boolean);
      if (messages.length > 0) return messages.join(" ");
    }
  } catch {
    // Body wasn't JSON - fall through to the fallback message.
  }
  return fallback;
}
