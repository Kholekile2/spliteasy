const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5152'

export async function apiFetch(
  path: string,
  userId: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const rawBody = await response.text()
    let message = `Request failed (${response.status})`

    if (rawBody) {
      try {
        const parsed = JSON.parse(rawBody)
        message = parsed.message ?? message
      } catch {
        message = rawBody
      }
    }

    throw new Error(message)
  }

  return response.json()
}
