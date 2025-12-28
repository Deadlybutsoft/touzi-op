"use client"

import { GradientBackground } from "@/components/gradient-background"
import { LayoutDashboard, Settings, Plus, DoorOpen } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type React from "react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { CreateCampaignModal } from "@/components/create-campaign-modal"
import { Button } from "@/components/ui/button"

interface Room {
  id: string
  name: string
  title?: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  const isOverviewPage = pathname === "/dashboard"

  useEffect(() => {
    // Load rooms from localStorage
    const loadRooms = () => {
      const stored = localStorage.getItem("touzi_campaigns")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setRooms(parsed.map((r: any) => ({ id: r.id, name: r.name || r.title || "Untitled Room" })))
        } catch (e) {
          console.error("Failed to parse rooms", e)
        }
      }
    }

    loadRooms()

    // Listen for new room events
    const handleNewRoom = () => loadRooms()
    window.addEventListener("newCampaign", handleNewRoom)
    return () => window.removeEventListener("newCampaign", handleNewRoom)
  }, [])

  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <GradientBackground />
      <div className="absolute inset-0 -z-10 bg-black/40" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-white/5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold tracking-tighter flex items-center gap-2 font-serif text-4xl">
            Touzi
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full py-1 pb-1 flex-row pl-[17px] pr-1 mx-[-14px] gap-4">
            <span className="text-xs font-medium text-white/60">0x71...4a2btr45yy5656try56576565776</span>
            <div className="size-7 rounded-full bg-gradient-to-tr from-green-400 to-emerald-500 border border-white/20 flex-shrink-0" />
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="fixed left-0 bottom-0 top-16 w-64 border-r border-white/5 glass-dark hidden lg:flex flex-col p-4 gap-2">
          <nav className="flex-1 flex flex-col gap-1">
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                isOverviewPage
                  ? "bg-white/10 text-white border border-white/10 hover:bg-white/20"
                  : "text-white/60 hover:text-white hover:bg-white/5",
              )}
            >
              <LayoutDashboard className="size-5 flex-shrink-0" />
              <span className="font-serif font-semibold truncate">{"Dashboard"}</span>
            </Link>

            {/* Your Rooms Section */}
            <div className="mt-4">
              <div className="flex items-center justify-between px-4 mb-2">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Your Rooms</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 rounded-lg hover:bg-white/10"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                {rooms.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-white/40 text-center">
                    No rooms yet
                  </div>
                ) : (
                  rooms.map((room) => (
                    <Link
                      key={room.id}
                      href={`/dashboard/campaign/${room.id}`}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all",
                        pathname === `/dashboard/campaign/${room.id}`
                          ? "bg-white/10 text-white border border-white/10"
                          : "text-white/60 hover:text-white hover:bg-white/5",
                      )}
                    >
                      <DoorOpen className="size-4 flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{room.name}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </nav>

          <div className="mt-auto pt-4 border-t border-white/5">
            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <Settings className="size-5 flex-shrink-0" />
              <span className="font-serif font-semibold truncate">Settings</span>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-8">{children}</main>
      </div>

      {/* Create Room Modal */}
      <CreateCampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
