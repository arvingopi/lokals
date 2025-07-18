import { NextRequest, NextResponse } from "next/server"
import { addFavouriteUser, removeFavouriteUser, getFavouriteUsers, isFavouriteUser } from "@/lib/firebase-database"
import { apiRateLimit } from "@/lib/rate-limiter"
import { validateUserId, validateUsername, ValidationException } from "@/lib/validation"

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimit(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get("userId")

    if (!userIdParam) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Validate input
    const userId = validateUserId(userIdParam)

    const favourites = await getFavouriteUsers(userId)
    return NextResponse.json({ favourites })
  } catch (error) {
    if (error instanceof ValidationException) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error fetching favourite users:", error)
    return NextResponse.json({ error: "Failed to fetch favourite users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimit(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    const { userId, favouriteUserId, favouriteUsername } = await request.json()

    if (!userId || !favouriteUserId || !favouriteUsername) {
      return NextResponse.json(
        { error: "User ID, favourite user ID, and favourite username are required" }, 
        { status: 400 }
      )
    }

    // Validate inputs
    const validUserId = validateUserId(userId)
    const validFavouriteUserId = validateUserId(favouriteUserId)
    const validFavouriteUsername = validateUsername(favouriteUsername)

    // Check if already favourite
    const isAlreadyFavourite = await isFavouriteUser(validUserId, validFavouriteUserId)
    if (isAlreadyFavourite) {
      return NextResponse.json({ message: "User is already in favourites" }, { status: 200 })
    }

    const favourite = await addFavouriteUser(validUserId, validFavouriteUserId, validFavouriteUsername)
    return NextResponse.json({ favourite, message: "User added to favourites" })
  } catch (error) {
    if (error instanceof ValidationException) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error adding favourite user:", error)
    return NextResponse.json({ error: "Failed to add favourite user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = apiRateLimit(request)
    if (rateLimitResult) {
      return rateLimitResult
    }

    const { searchParams } = new URL(request.url)
    const userIdParam = searchParams.get("userId")
    const favouriteUserIdParam = searchParams.get("favouriteUserId")

    if (!userIdParam || !favouriteUserIdParam) {
      return NextResponse.json(
        { error: "User ID and favourite user ID are required" }, 
        { status: 400 }
      )
    }

    // Validate inputs
    const userId = validateUserId(userIdParam)
    const favouriteUserId = validateUserId(favouriteUserIdParam)

    await removeFavouriteUser(userId, favouriteUserId)
    return NextResponse.json({ message: "User removed from favourites" })
  } catch (error) {
    if (error instanceof ValidationException) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error removing favourite user:", error)
    return NextResponse.json({ error: "Failed to remove favourite user" }, { status: 500 })
  }
}