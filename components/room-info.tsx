"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Info, Users } from "lucide-react"
import { isCanadianFSA } from "@/lib/zipcode-utils"

interface RoomInfoProps {
  zipcode: string
}

export function RoomInfo({ zipcode }: RoomInfoProps) {
  const isCanadian = isCanadianFSA(zipcode)

  return (
    <Card className="mb-4 bg-blue-50 border-blue-200">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <div className="flex items-center gap-1 font-medium mb-1">
              <Users className="h-3 w-3" />
              Room Coverage
            </div>
            {isCanadian ? (
              <p>
                You're in the <strong>{zipcode}</strong> Forward Sortation Area room. This covers all postal codes
                starting with <strong>{zipcode}</strong>
                (e.g., {zipcode} 1A1, {zipcode} 2B2, etc.)
              </p>
            ) : (
              <p>
                You're in the <strong>{zipcode}</strong> zipcode room. This is specific to the {zipcode} area.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
