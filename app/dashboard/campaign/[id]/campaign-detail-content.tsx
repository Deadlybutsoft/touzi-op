"use client"

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
  prizeTiers: {
    id: string
    name: string
    amount: string
    winners: string
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
    const saved = localStorage.getItem("touzi_campaigns")
    if (saved) {
      try {
        const campaigns = JSON.parse(saved)
        const found = campaigns.find((c: Campaign) => c.id === id)
        if (found) {
          const now = new Date()
          const start = new Date(found.startDate)
          const end = new Date(found.endDate)
          let status: Campaign["status"] = "active"
          if (now < start) status = "scheduled"
          else if (now > end) status = "ended"
          setCampaign({ ...found, status })
        }
      } catch (e) {
        console.error("Failed to parse campaigns", e)
      }
    }
    setLoading(false)
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
      return formatTimeFromSeconds(seconds, "Starts in ")
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

  const deleteCampaign = () => {
    if (!campaign) return
    const saved = localStorage.getItem("touzi_campaigns")
    if (saved) {
      const campaigns: Campaign[] = JSON.parse(saved)
      const updated = campaigns.filter((c) => c.id !== campaign.id)
      localStorage.setItem("touzi_campaigns", JSON.stringify(updated))
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
            className="rounded-xl border-white/10 bg-transparent hover:bg-white/5 gap-2"
            onClick={() => copyLink(campaign.id)}
          >
            {copiedId === campaign.id ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
            Copy Link
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-white/10 bg-transparent hover:bg-white/5 gap-2"
            onClick={() => window.open(`/room/${campaign.id}`, "_blank")}
          >
            <ExternalLink className="size-4" />
            View Room
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-red-500/20 bg-transparent hover:bg-red-500/10 text-red-400 gap-2"
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
              className="w-full rounded-xl border-white/10 bg-transparent hover:bg-white/5 gap-2"
              onClick={() => copyLink(campaign.id)}
            >
              {copiedId === campaign.id ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
              {copiedId === campaign.id ? "Copied" : "Copy Link"}
            </Button>
          </div>
        </div>

        {/* Prize Tiers */}
        <div className="glass rounded-2xl p-5 h-full overflow-y-auto max-h-[300px]">
          <h4 className="text-xs text-white/40 uppercase tracking-wider font-bold mb-3">Prize Distribution</h4>
          {campaign.prizeTiers && campaign.prizeTiers.length > 0 ? (
            <div className="space-y-2">
              {campaign.prizeTiers.map((tier, index) => (
                <div key={tier.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                        index === 0 && "bg-yellow-500/20 text-yellow-400",
                        index === 1 && "bg-zinc-400/20 text-zinc-300",
                        index === 2 && "bg-amber-600/20 text-amber-500",
                        index > 2 && "bg-white/10 text-white/60",
                      )}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{tier.name}</p>
                      <p className="text-[10px] text-white/40">
                        {tier.winners} winner{Number.parseInt(tier.winners) > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold whitespace-nowrap">
                    {tier.amount} {campaign.prizeType}
                  </p>
                </div>
              ))}
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
              className="rounded-xl border-white/10 bg-transparent hover:bg-white/5 gap-2"
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
                      : "bg-transparent hover:bg-white/5",
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
                        <p className="text-sm font-medium">
                          {participant.tasksCompleted}/{participant.totalTasks}
                        </p>
                        <p className="text-xs text-white/40">tasks</p>
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
