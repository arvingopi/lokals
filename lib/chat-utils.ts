export interface Message {
  id: string
  content: string
  timestamp: number
  userId: string
  username: string
  isPrivate?: boolean
  recipientId?: string
}

export interface User {
  id: string
  username: string
  lastSeen: number
}

// Generate anonymous username
export function generateAnonymousUsername(): string {
  const adjectives = ["Cool", "Swift", "Bright", "Calm", "Bold", "Quick", "Smart", "Kind"]
  const animals = ["Fox", "Wolf", "Bear", "Eagle", "Tiger", "Lion", "Hawk", "Owl"]

  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const animal = animals[Math.floor(Math.random() * animals.length)]
  const number = Math.floor(Math.random() * 1000)

  return `${adjective}${animal}${number}`
}

// Generate unique user ID
export function generateUserId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// API functions
export async function fetchRoomData(zipcode: string): Promise<{ messages: Message[]; users: User[] }> {
  try {
    const response = await fetch(`/api/rooms/${zipcode}/messages`)
    if (!response.ok) throw new Error("Failed to fetch room data")
    return await response.json()
  } catch (error) {
    console.error("Error fetching room data:", error)
    return { messages: [], users: [] }
  }
}

export async function sendRoomMessage(
  zipcode: string,
  content: string,
  userId: string,
  username: string,
): Promise<Message | null> {
  try {
    const response = await fetch(`/api/rooms/${zipcode}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, userId, username }),
    })
    if (!response.ok) throw new Error("Failed to send message")
    const data = await response.json()
    return data.message
  } catch (error) {
    console.error("Error sending message:", error)
    return null
  }
}

export async function updatePresence(zipcode: string, userId: string, username: string): Promise<void> {
  try {
    await fetch(`/api/rooms/${zipcode}/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, username }),
    })
  } catch (error) {
    console.error("Error updating presence:", error)
  }
}

export async function fetchPrivateMessages(userId1: string, userId2: string): Promise<Message[]> {
  try {
    const response = await fetch(`/api/private-messages?userId1=${userId1}&userId2=${userId2}`)
    if (!response.ok) throw new Error("Failed to fetch private messages")
    const data = await response.json()
    return data.messages
  } catch (error) {
    console.error("Error fetching private messages:", error)
    return []
  }
}

export async function sendPrivateMessage(
  senderId: string,
  recipientId: string,
  content: string,
  username: string,
): Promise<Message | null> {
  try {
    const response = await fetch("/api/private-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senderId, recipientId, content, username }),
    })
    if (!response.ok) throw new Error("Failed to send private message")
    const data = await response.json()
    return data.message
  } catch (error) {
    console.error("Error sending private message:", error)
    return null
  }
}

// Format timestamp to HH:MM AM/PM
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12
  hours = hours ? hours : 12
  const minutesStr = minutes < 10 ? "0" + minutes : minutes
  return hours + ":" + minutesStr + " " + ampm
}
