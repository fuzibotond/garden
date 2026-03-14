import { env } from "../lib/.env"

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`)

  if (!response.ok) {
    throw new Error("API request failed")
  }

  return response.json()
}