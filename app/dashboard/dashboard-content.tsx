"use client"

import { supabase } from "@/lib/supabaseClient"

import { Plus, Trophy, MousePointer2, Users2, Timer, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateCampaignModal } from "@/components/create-campaign-modal"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { differenceInSeconds } from "date-fns"
import { useRouter } from "next/navigation"
import { useSDK } from "@metamask/sdk-react"

interface Participant {
  id: string
  walletAddress: string
  email?: string
  twitter?: string
  tasksCompleted: number
  totalTasks: number
  submittedAt: string
  status: "pending" | "verified" | "rejected"
}

interface Campaign {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  prizeAmount: string
  prizeType: string
  prizeTiers: any[]
  tasks: any[]
  timeline: string
  clicks: number
  joined: number
  submissions: Participant[]
  progress: number
  status: "active" | "ended" | "scheduled"
  createdAt: string
}

export default function DashboardContent() {
  const router = useRouter()
  const { account, connected, sdk } = useSDK()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState({
    clicks: 0,
    joined: 0,
    conversion: 0,
    activeCampaigns: 0,
    totalPrizePool: 0,
  })

  useEffect(() => {
    if (!account) return

    const fetchCampaigns = async () => {
      // Diagnostic: Check Supabase configuration
      console.log("🔍 Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT SET")
      console.log("🔍 Supabase Key:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "SET ✓" : "NOT SET ✗")
      console.log("🔍 Connected account:", account)

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("owner", account) // Only fetch user's campaigns
        .order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Error fetching campaigns:", error)
        console.error("❌ Error details:", JSON.stringify(error, null, 2))
        console.error("❌ Error type:", typeof error)
        console.error("❌ Error keys:", Object.keys(error))

        // If error is empty object, it might be a network error or CORS issue
        if (Object.keys(error).length === 0) {
          console.error("⚠️ EMPTY ERROR OBJECT - This usually means:")
          console.error("   1. Supabase credentials are not configured (check .env.local)")
          console.error("   2. Supabase URL is invalid or unreachable")
          console.error("   3. Network/CORS issue")
          console.error("   4. Dev server needs restart after adding .env.local")
        }
        return
      }

      if (data) {
        // Map DB fields to Component state format if necessary
        // DB uses snake_case, but we can map them back to camelCase for the UI or update UI to use snake_case
        // For simplicity, let's map them to the interface expected by the component
        const mappedCampaigns: Campaign[] = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          startDate: c.start_date,
          endDate: c.end_date,
          prizeAmount: c.prize_amount,
          prizeType: c.prize_type,
          prizeTiers: c.prize_tiers || [],
          tasks: c.tasks || [],
          timeline: c.timeline,
          clicks: c.clicks,
          joined: c.joined,
          submissions: [], // We might want to fetch count instead of actual rows for list view
          progress: c.progress,
          status: c.status as "active" | "ended" | "scheduled",
          createdAt: c.created_at,
        }))

        // Recalculate status based on dates
        const updated = mappedCampaigns.map((c) => {
          const now = new Date()
          const start = new Date(c.startDate)
          const end = new Date(c.endDate)
          let status: Campaign["status"] = "active"
          if (now < start) status = "scheduled"
          else if (now > end) status = "ended"
          return { ...c, status }
        })

        setCampaigns(updated)

        // Calculate stats
        const totalClicks = updated.reduce((acc, c) => acc + (c.clicks || 0), 0)
        const totalJoined = updated.reduce((acc, c) => acc + (c.joined || 0), 0)
        const activeCampaigns = updated.filter((c) => c.status === "active").length
        const conversion = totalClicks > 0 ? (totalJoined / totalClicks) * 100 : 0
        const totalPrizePool = updated.reduce((acc, c) => acc + Number.parseFloat(c.prizeAmount || "0"), 0)

        setStats({
          clicks: totalClicks,
          joined: totalJoined,
          conversion: Number(conversion.toFixed(1)),
          activeCampaigns,
          totalPrizePool,
        })
      }
    }

    fetchCampaigns()

    // Realtime subscription could go here
  }, [isModalOpen, account])

  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const getTimeRemaining = (endDate: string, startDate?: string) => {
    const end = new Date(endDate)
    const start = startDate ? new Date(startDate) : null
    const now = new Date()

    if (start && now < start) {
      const seconds = differenceInSeconds(start, now)
      return formatTimeFromSeconds(seconds, "Starts in ")
    }

    const seconds = differenceInSeconds(end, now)
    if (seconds <= 0) return { text: "Ended", isEnded: true, percent: 100 }

    return { ...formatTimeFromSeconds(seconds) }
  }

  const formatTimeFromSeconds = (seconds: number, prefix = "") => {
    if (seconds <= 0) return { text: "Ended", isEnded: true }

    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (days > 0) return { text: `${prefix}${days}d ${hours}h ${minutes}m`, isEnded: false }
    if (hours > 0) return { text: `${prefix}${hours}h ${minutes}m ${secs}s`, isEnded: false }
    if (minutes > 0) return { text: `${prefix}${minutes}m ${secs}s`, isEnded: false }
    return { text: `${prefix}${secs}s`, isEnded: false }
  }

  const openCampaignDetail = (campaign: Campaign) => {
    router.push(`/dashboard/campaign/${campaign.id}`)
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">Manage your giveaway rooms</p>
        </div>
        {account && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="hover:bg-blue-700 px-6 py-6 flex items-center gap-2 shadow-blue-500/20 text-white shadow-none opacity-100 border-0 rounded-xl h-0 bg-blue-600"
          >
            <Plus className="size-5" />
            Create Giveaway Room
          </Button>
        )}
      </div>

      {!account ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <Trophy className="size-16 text-white/20" />
          <h2 className="text-2xl font-bold">Connect Wallet</h2>
          <p className="text-white/50 max-w-md">
            Connect your wallet to manage your campaigns and creating new giveaway rooms.
          </p>
          {/* If FanConnectWalletButton is not suitable here, we can reuse logic or import it. 
               However, since this is dashboard, we might assume the layout has a connect button 
               or we duplicate the button here. Let's use a generic button that calls sdk.connect() */}
          <Button
            size="lg"
            className="bg-white text-black hover:bg-white/90 rounded-xl mt-4"
            onClick={() => sdk?.connect()}
          >
            Connect Metamask
          </Button>
        </div>
      ) : (
        <>
          <CreateCampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <MousePointer2 className="size-16 text-blue-400" />
              </div>
              <span className="text-white/40 text-sm font-medium">Total Clicks</span>
              <span className="text-3xl font-bold tracking-tight">{stats.clicks.toLocaleString()}</span>
              <div className="flex items-center gap-1.5 text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full w-fit">
                Link impressions
              </div>
            </div>

            <div className="glass p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users2 className="size-16 text-green-400" />
              </div>
              <span className="text-white/40 text-sm font-medium">Total Participants</span>
              <span className="text-3xl font-bold tracking-tight">{stats.joined.toLocaleString()}</span>
              <div className="flex items-center gap-1.5 text-xs text-white/30">Submitted entries</div>
            </div>

            <div className="glass p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="size-16 text-yellow-400" />
              </div>
              <span className="text-white/40 text-sm font-medium">Conversion Rate</span>
              <span className="text-3xl font-bold tracking-tight">{stats.conversion}%</span>
              <div className="flex items-center gap-1.5 text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full w-fit">
                Clicks to submissions
              </div>
            </div>

            <div className="glass p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Timer className="size-16 text-cyan-400" />
              </div>
              <span className="text-white/40 text-sm font-medium">Active Rooms</span>
              <span className="text-3xl font-bold tracking-tight">{stats.activeCampaigns}</span>
              <div className="flex items-center gap-1.5 text-xs text-white/30">Currently running</div>
            </div>
          </div>

          {/* Campaigns Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Rooms</h2>
              <span className="text-sm text-white/40">{campaigns.length} total</span>
            </div>

            {campaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map((campaign) => {
                  const timeRemaining = getTimeRemaining(campaign.endDate, campaign.startDate)

                  return (
                    <div
                      key={campaign.id}
                      onClick={() => openCampaignDetail(campaign)}
                      className="glass rounded-2xl overflow-hidden cursor-pointer hover:bg-white/[0.07] transition-all group border border-white/20 hover:border-white/40"
                    >
                      {/* Status Banner */}
                      <div
                        className={cn(
                          "px-5 py-3 flex items-center justify-between",
                          campaign.status === "active" && "bg-green-500/10",
                          campaign.status === "ended" && "bg-zinc-500/10",
                          campaign.status === "scheduled" && "bg-yellow-500/10",
                        )}
                      >
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wider",
                            campaign.status === "active" && "text-green-400",
                            campaign.status === "ended" && "text-zinc-400",
                            campaign.status === "scheduled" && "text-yellow-400",
                          )}
                        >
                          {campaign.status === "active" ? "Live" : campaign.status === "ended" ? "Ended" : "Scheduled"}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-mono",
                            campaign.status === "active" && "text-green-400",
                            campaign.status === "ended" && "text-zinc-400",
                            campaign.status === "scheduled" && "text-yellow-400",
                          )}
                        >
                          {timeRemaining.text}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="font-semibold text-lg mb-1 truncate">{campaign.title}</h3>
                        <p className="text-sm text-white/40 flex items-center gap-1">
                          <Trophy className="size-3" />
                          {campaign.prizeAmount} {campaign.prizeType}
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold">{campaign.clicks || 0}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Clicks</p>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-green-400">{campaign.joined || 0}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Joined</p>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-blue-400">
                              {campaign.clicks > 0 ? Math.round((campaign.joined / campaign.clicks) * 100) : 0}%
                            </p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">Rate</p>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                          <span className="text-xs text-white/30">{campaign.tasks?.length || 0} tasks</span>
                          <div className="flex items-center gap-1 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                            View Details
                            <ChevronRight className="size-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-center border-dashed border-white/10">
                <Trophy className="size-12 text-white/20 mb-4" />
                <h4 className="font-semibold text-lg">No rooms yet</h4>
                <p className="text-sm text-white/40 mt-1 max-w-xs text-balance">
                  Create your first giveaway room to start rewarding your community.
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="mt-6 bg-blue-600 hover:bg-blue-700 rounded-xl">
                  <Plus className="size-4 mr-2" />
                  Create Room
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
