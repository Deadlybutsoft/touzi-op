"use client"

import { supabase } from "@/lib/supabaseClient"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Trophy,
  Clock,
  MousePointer2,
  Users2,
  Timer,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Trash2,
  Link2,
  Calendar,
  Target,
  TrendingUp,
  ExternalLink,
  Mail,
  Twitter,
  ListTodo,
  Award,
  AlertCircle,
  Search,
  Download,
  Zap,
  Gift,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { format, differenceInSeconds } from "date-fns"

interface Participant {
  id: string
  walletAddress: string
  email?: string
  twitter?: string
  tasksCompleted: number
  totalTasks: number
  submittedAt: string
  status: "pending" | "verified" | "rejected"
  rewardPaid?: boolean
  rewardAmount?: string
}

interface Campaign {
  id: string
  name?: string
  title: string
  description?: string
  startDate: string
  endDate: string
  prizeAmount: string
  prizePool?: number
  prizeType: string
  rewardType?: "instant" | "giveaway" // Global reward type
  instantReward?: {
    amountPerWinner: string
    numberOfWinners: string
  } | null
  prizeTiers: {
    id: string
    name: string
    amount: string
    winners: string
    rewardType?: "instant" | "giveaway"
  }[]
  tasks: {
    id: string
    type: string
    label: string
    url: string
  }[]
  taskList?: {
    id: string
    type: string
    label: string
    url: string
  }[]
  timeline: string
  clicks: number
  joined: number
  participants?: number
  submissions: Participant[]
  progress: number
  status: "active" | "ended" | "scheduled"
  winners?: number
  createdAt: string
}

export default function CampaignDetailContent({ id }: { id: string }) {
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [participantFilter, setParticipantFilter] = useState<"all" | "verified" | "pending" | "rejected">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCampaignData = async () => {
      // 1. Fetch Campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single()

      if (campaignError || !campaignData) {
        console.error("Error fetching campaign:", campaignError)
        setLoading(false)
        return
      }

      // 2. Fetch Participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("participants")
        .select("*")
        .eq("campaign_id", id)
        .order("submitted_at", { ascending: false })

      if (participantsError) {
        console.error("Error fetching participants:", participantsError)
      }

      // 3. Map Data
      const now = new Date()
      const start = new Date(campaignData.start_date)
      const end = new Date(campaignData.end_date)
      let status: Campaign["status"] = "active"
      if (now < start) status = "scheduled"
      else if (now > end) status = "ended"

      // Map participants to local interface
      const submissions: Participant[] = (participantsData || []).map((p: any) => ({
        id: p.id,
        walletAddress: p.wallet_address,
        email: p.email,
        twitter: p.twitter,
        tasksCompleted: p.tasks_completed,
        totalTasks: p.total_tasks,
        submittedAt: p.submitted_at,
        status: p.status,
        rewardPaid: p.reward_paid,
        rewardAmount: p.reward_amount,
      }))

      setCampaign({
        id: campaignData.id,
        title: campaignData.title,
        description: campaignData.description,
        startDate: campaignData.start_date,
        endDate: campaignData.end_date,
        prizeAmount: campaignData.prize_amount,
        prizePool: Number.parseFloat(campaignData.prize_pool),
        prizeType: campaignData.prize_type,
        rewardType: campaignData.reward_type,
        instantReward: campaignData.instant_reward,
        prizeTiers: campaignData.prize_tiers || [],
        tasks: campaignData.tasks || [],
        taskList: campaignData.tasks || [],
        timeline: campaignData.timeline,
        clicks: campaignData.clicks,
        joined: campaignData.joined,
        participants: campaignData.participants, // or use submissions.length
        submissions: submissions,
        progress: campaignData.progress,
        status: status,
        createdAt: campaignData.created_at,
      })

      setLoading(false)
    }

    fetchCampaignData()
  }, [id])

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
      return { ...formatTimeFromSeconds(seconds, "Starts in "), percent: 0 }
    }

    const seconds = differenceInSeconds(end, now)
    if (seconds <= 0) return { text: "Ended", isEnded: true, percent: 100 }

    const totalDuration = differenceInSeconds(end, start || new Date())
    const elapsed = totalDuration - seconds
    const percent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100))

    return { ...formatTimeFromSeconds(seconds), percent }
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

  const copyLink = (campaignId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${campaignId}`)
    setCopiedId(campaignId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deleteCampaign = async () => {
    if (!campaign) return
    const confirmed = confirm("Are you sure you want to delete this room? This action cannot be undone.")
    if (!confirmed) return

    const { error } = await supabase.from("campaigns").delete().eq("id", campaign.id)

    if (error) {
      console.error("Error deleting campaign:", error)
      alert("Failed to delete room.")
      return
    }

    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Trophy className="size-16 text-white/20 mb-4" />
        <h2 className="text-xl font-bold mb-2">Room Not Found</h2>
        <p className="text-white/40 mb-6">This room may have been deleted or doesn't exist.</p>
        <Button onClick={() => router.push("/dashboard")} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
          <ArrowLeft className="size-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const timeRemaining = getTimeRemaining(campaign.endDate, campaign.startDate)
  const verifiedCount = campaign.submissions?.filter((p) => p.status === "verified").length || 0
  const pendingCount = campaign.submissions?.filter((p) => p.status === "pending").length || 0
  const rejectedCount = campaign.submissions?.filter((p) => p.status === "rejected").length || 0

  const filteredParticipants =
    campaign.submissions?.filter((p) => {
      const matchesFilter = participantFilter === "all" || p.status === participantFilter
      const matchesSearch =
        searchQuery === "" ||
        p.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.twitter?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    }) || []

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-xl bg-white/5 hover:bg-white/10"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.title}</h1>
            <span
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium",
                campaign.status === "active" && "bg-green-500/20 text-green-400",
                campaign.status === "ended" && "bg-zinc-500/20 text-zinc-400",
                campaign.status === "scheduled" && "bg-yellow-500/20 text-yellow-400",
              )}
            >
              {campaign.status === "active" ? "Live" : campaign.status === "ended" ? "Ended" : "Scheduled"}
            </span>
          </div>
          <p className="text-white/40 text-sm mt-1">
            Created {format(new Date(campaign.createdAt || campaign.startDate), "MMM dd, yyyy 'at' h:mm a")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-white/10 bg-transparent hover:bg-white hover:text-black gap-2"
            onClick={() => copyLink(campaign.id)}
          >
            {copiedId === campaign.id ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
            Copy Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-white/10 bg-transparent hover:bg-white hover:text-black gap-2"
            onClick={() => window.open(`/room/${campaign.id}`, "_blank")}
          >
            <ExternalLink className="size-4" />
            View Room
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-red-500/20 bg-transparent hover:bg-white hover:text-red-600 text-red-400 gap-2"
            onClick={deleteCampaign}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Time Remaining Banner */}
      <div
        className={cn(
          "rounded-2xl p-6 relative overflow-hidden",
          campaign.status === "active" &&
          "bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20",
          campaign.status === "ended" && "bg-gradient-to-r from-zinc-500/10 to-zinc-500/5 border border-zinc-500/20",
          campaign.status === "scheduled" &&
          "bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1">
              {campaign.status === "ended"
                ? "Room Ended"
                : campaign.status === "scheduled"
                  ? "Starts In"
                  : "Time Remaining"}
            </p>
            <p
              className={cn(
                "text-4xl font-bold font-mono",
                campaign.status === "active" && "text-green-400",
                campaign.status === "ended" && "text-zinc-400",
                campaign.status === "scheduled" && "text-yellow-400",
              )}
            >
              {timeRemaining.text}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40 mb-1">
              {format(new Date(campaign.startDate), "MMM dd, h:mm a")} -{" "}
              {format(new Date(campaign.endDate), "MMM dd, h:mm a")}
            </p>
            {campaign.status === "active" && (
              <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${timeRemaining.percent || 0}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <MousePointer2 className="size-5 text-blue-400" />
            </div>
            <span className="text-white/40 text-sm">Link Clicks</span>
          </div>
          <p className="text-3xl font-bold">{campaign.clicks || 0}</p>
        </div>

        <div className="glass p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Users2 className="size-5 text-green-400" />
            </div>
            <span className="text-white/40 text-sm">Participants</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{campaign.participants || campaign.joined || 0}</p>
        </div>

        <div className="glass p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <TrendingUp className="size-5 text-purple-400" />
            </div>
            <span className="text-white/40 text-sm">Conversion</span>
          </div>
          <p className="text-3xl font-bold text-purple-400">
            {campaign.clicks > 0 ? Math.round(((campaign.participants || campaign.joined) / campaign.clicks) * 100) : 0}
            %
          </p>
        </div>

        <div className="glass p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Trophy className="size-5 text-yellow-400" />
            </div>
            <span className="text-white/40 text-sm">Prize Pool</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{campaign.prizeAmount}</p>
          <p className="text-xs text-white/30 mt-1">{campaign.prizeType}</p>
        </div>

        <div className="glass p-5 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
              <ListTodo className="size-5 text-cyan-400" />
            </div>
            <span className="text-white/40 text-sm">Tasks</span>
          </div>
          <p className="text-3xl font-bold text-cyan-400">{campaign.tasks?.length || 0}</p>
        </div>
      </div>

      {/* Details Grid - Horizontal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Campaign Link */}
        <div className="glass rounded-2xl p-5 h-full">
          <h4 className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">Room Link</h4>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
              <Link2 className="size-4 text-white/40 shrink-0" />
              <p className="text-sm font-mono text-white/60 truncate flex-1">
                {typeof window !== "undefined" ? window.location.origin : ""}/room/{campaign.id}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border-white/10 bg-transparent hover:bg-white hover:text-black gap-2"
              onClick={() => copyLink(campaign.id)}
            >
              {copiedId === campaign.id ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
              {copiedId === campaign.id ? "Copied" : "Copy Link"}
            </Button>
          </div>
        </div>

        {/* Prize Distribution */}
        <div className="glass rounded-2xl p-5 h-full overflow-y-auto max-h-[300px]">
          <h4 className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">Prize Distribution</h4>

          {/* Instant Reward Display */}
          {campaign.rewardType === "instant" && campaign.instantReward ? (
            <div className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Zap className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Instant Reward</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Amount per Winner</span>
                    <span className="font-medium text-emerald-400">{campaign.instantReward.amountPerWinner} {campaign.prizeType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Max Recipients</span>
                    <span className="font-medium">{campaign.instantReward.numberOfWinners}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                    <span className="text-white/60 font-medium">Total Pool</span>
                    <span className="font-bold text-emerald-400">{campaign.prizeAmount} {campaign.prizeType}</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-emerald-300/60 text-center">
                Users receive ETH instantly when they complete all tasks
              </p>
            </div>
          ) : campaign.prizeTiers && campaign.prizeTiers.length > 0 ? (
            /* Giveaway Tiers Display */
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Gift className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Giveaway</span>
              </div>
              {campaign.prizeTiers.map((tier, index) => (
                <div key={tier.id} className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                        index === 0 && "bg-yellow-500/20 text-yellow-400",
                        index === 1 && "bg-zinc-400/20 text-zinc-300",
                        index === 2 && "bg-amber-600/20 text-amber-500",
                        index > 2 && "bg-purple-500/20 text-purple-400",
                      )}
                    >
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{tier.name}</p>
                      <p className="text-[10px] text-white/40">
                        {tier.winners} winner{Number.parseInt(tier.winners) > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold whitespace-nowrap text-purple-300">
                    {tier.amount} {campaign.prizeType}
                  </p>
                </div>
              ))}
              <p className="text-[10px] text-purple-300/60 text-center mt-2">
                Winners will be selected after the giveaway ends
              </p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <Award className="size-8 text-yellow-400/50 mx-auto mb-2" />
              <p className="text-sm font-medium">
                {campaign.prizeAmount} {campaign.prizeType}
              </p>
              <p className="text-xs text-white/40">Single prize pool</p>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="glass rounded-2xl p-5 h-full overflow-y-auto max-h-[300px]">
          <h4 className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">Required Tasks</h4>
          {campaign.tasks && campaign.tasks.length > 0 ? (
            <div className="space-y-2">
              {campaign.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Target className="size-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize truncate">{task.label}</p>
                    {task.url && <p className="text-xs text-white/40 truncate">{task.url}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl p-4 text-center">
              <AlertCircle className="size-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/40">No tasks configured</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="glass rounded-2xl p-5 h-full">
          <h4 className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">Timeline</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                <Calendar className="size-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">Start Date</p>
                <p className="text-xs font-medium">
                  {format(new Date(campaign.startDate), "MMM dd, h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                <Calendar className="size-4 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">End Date</p>
                <p className="text-xs font-medium">
                  {format(new Date(campaign.endDate), "MMM dd, h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <Timer className="size-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">Duration</p>
                <p className="text-xs font-medium">{campaign.timeline}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Participants Section - Full Width */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Participants Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Participants</h3>
              <p className="text-sm text-white/40">{campaign.submissions?.length || 0} total submissions</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-white/10 bg-transparent hover:bg-white hover:text-black gap-2"
            >
              <Download className="size-4" />
              Export
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                placeholder="Search by wallet, email, or twitter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              {[
                { key: "all", label: "All", count: campaign.submissions?.length || 0 },
                { key: "verified", label: "Verified", count: verifiedCount },
                { key: "pending", label: "Pending", count: pendingCount },
                { key: "rejected", label: "Rejected", count: rejectedCount },
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "rounded-xl border-white/10 gap-1.5",
                    participantFilter === filter.key
                      ? "bg-white/10 border-white/20"
                      : "bg-transparent hover:bg-white hover:text-black",
                  )}
                  onClick={() => setParticipantFilter(filter.key as typeof participantFilter)}
                >
                  {filter.label}
                  <span className="text-white/40 text-xs">({filter.count})</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Participants List */}
        <div className="max-h-[500px] overflow-y-auto">
          {filteredParticipants.length > 0 ? (
            <div className="divide-y divide-white/5">
              {filteredParticipants.map((participant, index) => (
                <div key={participant.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-white/30 w-6">#{index + 1}</span>
                    <div className="size-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center">
                      <span className="text-sm font-bold">
                        {participant.walletAddress.slice(2, 4).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium">
                          {participant.walletAddress.slice(0, 8)}...{participant.walletAddress.slice(-6)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 rounded-full"
                          onClick={() => {
                            navigator.clipboard.writeText(participant.walletAddress)
                          }}
                        >
                          <Copy className="size-3 text-white/30" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {participant.email && (
                          <span className="flex items-center gap-1 text-xs text-white/40">
                            <Mail className="size-3" />
                            {participant.email}
                          </span>
                        )}
                        {participant.twitter && (
                          <span className="flex items-center gap-1 text-xs text-blue-400">
                            <Twitter className="size-3" />
                            {participant.twitter}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {participant.rewardPaid && participant.rewardAmount ? (
                          <div className="flex flex-col items-end">
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <Zap className="size-3" />
                              Paid {participant.rewardAmount}
                            </span>
                            <span className="text-[10px] text-white/30 mt-0.5">Instant Reward</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium">
                              {participant.tasksCompleted}/{participant.totalTasks}
                            </p>
                            <p className="text-xs text-white/40">tasks</p>
                          </>
                        )}
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-white/50">
                          {format(new Date(participant.submittedAt), "MMM dd")}
                        </p>
                        <p className="text-xs text-white/30">
                          {format(new Date(participant.submittedAt), "h:mm a")}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "size-8 rounded-full flex items-center justify-center",
                          participant.status === "verified" && "bg-green-500/20",
                          participant.status === "pending" && "bg-yellow-500/20",
                          participant.status === "rejected" && "bg-red-500/20",
                        )}
                      >
                        {participant.status === "verified" && <CheckCircle2 className="size-4 text-green-400" />}
                        {participant.status === "pending" && <Clock className="size-4 text-yellow-400" />}
                        {participant.status === "rejected" && <XCircle className="size-4 text-red-400" />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Users2 className="size-12 text-white/10 mx-auto mb-4" />
              <h4 className="font-semibold">No participants found</h4>
              <p className="text-sm text-white/40 mt-1">
                {searchQuery || participantFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Share your campaign link to get participants"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
