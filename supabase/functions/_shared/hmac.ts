/** HMAC-SHA256 signature of a webhook body, hex encoded (header `X-UsineFlow-Signature: sha256=<hex>`). */
export async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Exponential backoff in seconds for attempt n (1-based): 30 s, 2 min, 8 min, 32 min, 2 h. */
export const backoffSeconds = (attempt: number) => 30 * 4 ** Math.min(attempt - 1, 4)
