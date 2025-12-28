"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trophy, Users, MousePointer, Clock, Search, Plus, TrendingUp, Filter, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { CreateCampaignModal } from "@/components/create-campaign-modal"

export interface Campaign {
  id: string
  name: string
  prizePool: number
  participants: number
  clicks: number
  status: "live" | "ended" | "scheduled"
  endDate: Date
  startDate: Date
  tasks: number | { id: string; type: string; label: string; url: string; enabled?: boolean }[]
  winners: number
  prizeTiers?: {
    name: string
    amount: number
    winners: number
  }[]
  taskList?: {
    type: string
    url: string
  }[]
}

// In a real app, this would come from a database/API

export default function CampaignsContent() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "live" | "ended" | "scheduled">("all")
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: string }>({})

  useEffect(() => {
    const storedCampaigns = localStorage.getItem("touzi_campaigns")
    if (storedCampaigns) {
      try {
        const parsed = JSON.parse(storedCampaigns)
        // Convert date strings back to Date objects
        const campaignsWithDates = parsed.map((c: Campaign) => ({
          ...c,
          startDate: new Date(c.startDate),
          endDate: new Date(c.endDate),
        }))
        setCampaigns(campaignsWithDates)
      } catch (e) {
        console.error("Failed to parse campaigns from localStorage", e)
      }
    }

    // Listen for new campaign events
    const handleNewCampaign = (event: CustomEvent<Campaign>) => {
      setCampaigns((prev) => {
        const newCampaigns = [event.detail, ...prev]
        localStorage.setItem("touzi_campaigns", JSON.stringify(newCampaigns))
        return newCampaigns
      })
    }

    window.addEventListener("newCampaign" as keyof WindowEventMap, handleNewCampaign as EventListener)
    return () => window.removeEventListener("newCampaign" as keyof WindowEventMap, handleNewCampaign as EventListener)
  }, [])

  useEffect(() => {
    const updateStatuses = () => {
      setCampaigns((prev) => {
        const updated = prev.map((campaign) => {
          const now = Date.now()
          let newStatus = campaign.status
          if (campaign.startDate.getTime() > now) {
            newStatus = "scheduled"
          } else if (campaign.endDate.getTime() < now) {
            newStatus = "ended"
          } else {
            newStatus = "live"
          }
          return { ...campaign, status: newStatus }
        })
        localStorage.setItem("touzi_campaigns", JSON.stringify(updated))
        return updated
      })
    }

    updateStatuses()
    const interval = setInterval(updateStatuses, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const times: { [key: string]: string } = {}
      campaigns.forEach((campaign) => {
        if (campaign.status === "live") {
          const diff = campaign.endDate.getTime() - Date.now()
          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            times[campaign.id] = `${days}d ${hours}h ${minutes}m`
          } else {
            times[campaign.id] = "Ended"
          }
        } else if (campaign.status === "scheduled") {
          const diff = campaign.startDate.getTime() - Date.now()
          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            times[campaign.id] = `Starts in ${days}d ${hours}h`
          }
        }
      })
      setTimeRemaining(times)
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 60000)
    return () => clearInterval(interval)
  }, [campaigns])

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: campaigns.length,
    live: campaigns.filter((c) => c.status === "live").length,
    totalParticipants: campaigns.reduce((acc, c) => acc + c.participants, 0),
    totalPrizePool: campaigns.reduce((acc, c) => acc + c.prizePool, 0),
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 blur-3xl rounded-full" />
          <div className="relative p-6 rounded-full bg-white/5 border border-white/10">
            <Sparkles className="size-16 text-green-400" />
          </div>
        </div>
        <h2 className="text-3xl font-bold font-serif mb-3">No Rooms Yet</h2>
        <p className="text-white/60 max-w-md mb-8">
          Create your first giveaway room to start engaging with your audience and growing your community.
        </p>
        <CreateCampaignModal>
          <Button
            size="lg"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 gap-2 px-8"
          >
            <Plus className="size-5" />
            Create Your First Room
          </Button>
        </CreateCampaignModal>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left">
            <div className="p-2 rounded-lg bg-blue-500/20 w-fit mb-3">
              <Trophy className="size-5 text-blue-400" />
            </div>
            <h3 className="font-semibold mb-1">Set Prize Tiers</h3>
            <p className="text-sm text-white/50">Configure multiple prize levels for your giveaway</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left">
            <div className="p-2 rounded-lg bg-purple-500/20 w-fit mb-3">
              <Users className="size-5 text-purple-400" />
            </div>
            <h3 className="font-semibold mb-1">Add Tasks</h3>
            <p className="text-sm text-white/50">Require social actions to enter the giveaway</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left">
            <div className="p-2 rounded-lg bg-green-500/20 w-fit mb-3">
              <Clock className="size-5 text-green-400" />
            </div>
            <h3 className="font-semibold mb-1">Set Timeline</h3>
            <p className="text-sm text-white/50">Choose precise start and end times</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCampaigns.map((campaign) => (
          <Card
            key={campaign.id}
            className="glass border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group overflow-hidden"
            onClick={() => router.push(`/dashboard/campaign/${campaign.id}`)}
          >
            {/* Status Banner */}
            <div
              className={cn(
                "h-1.5",
                campaign.status === "live" && "bg-gradient-to-r from-green-500 to-emerald-500",
                campaign.status === "ended" && "bg-gradient-to-r from-gray-500 to-gray-600",
                campaign.status === "scheduled" && "bg-gradient-to-r from-blue-500 to-cyan-500",
              )}
            />

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg font-serif group-hover:text-green-400 transition-colors line-clamp-1">
                  {campaign.name}
                </CardTitle>
                <Badge
                  className={cn(
                    "text-xs shrink-0",
                    campaign.status === "live" && "bg-green-500/20 text-green-400 border-green-500/30",
                    campaign.status === "ended" && "bg-gray-500/20 text-gray-400 border-gray-500/30",
                    campaign.status === "scheduled" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
                  )}
                >
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Time Remaining */}
              {(campaign.status === "live" || campaign.status === "scheduled") && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-white/40" />
                  <span className="text-white/60">{timeRemaining[campaign.id] || "Calculating..."}</span>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-white/40 mb-1">
                    <MousePointer className="size-3" />
                    <span className="text-xs">Clicks</span>
                  </div>
                  <p className="text-lg font-semibold">{campaign.clicks.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-white/40 mb-1">
                    <Users className="size-3" />
                    <span className="text-xs">Participants</span>
                  </div>
                  <p className="text-lg font-semibold">{campaign.participants.toLocaleString()}</p>
                </div>
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-1 text-sm">
                  <Trophy className="size-4 text-amber-400" />
                  <span className="font-semibold text-amber-400">${campaign.prizePool.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span>{Array.isArray(campaign.tasks) ? campaign.tasks.length : campaign.tasks} tasks</span>
                  <span>{campaign.winners} winners</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State for Filtered Results */}
      {filteredCampaigns.length === 0 && campaigns.length > 0 && (
        <div className="text-center py-16">
          <Search className="size-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
          <p className="text-white/60 mb-6">Try adjusting your search or filters</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("")
              setStatusFilter("all")
            }}
            className="border-white/10 bg-transparent text-white/60 hover:text-white hover:bg-white/5"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}
