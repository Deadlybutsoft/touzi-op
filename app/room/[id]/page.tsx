"use client"

import { useEffect, useState } from "react"
import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Trophy,
  Clock,
  Users2,
  CheckCircle2,
  ExternalLink,
  Wallet,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Gift,
  Check,
  Loader2,
  Copy,
  Share2,
  Timer,
  Zap,
  Award,
  Medal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, differenceInSeconds } from "date-fns"
import Link from "next/link"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

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
  submissions: {
    id: string
    walletAddress: string
    email?: string
    twitter?: string
    tasksCompleted: number
    totalTasks: number
    submittedAt: string
    status: "pending" | "verified" | "rejected"
  }[]
  progress: number
  status: "active" | "ended" | "scheduled"
  winners?: number
  createdAt: string
}

interface TaskCompletion {
  [taskId: string]: boolean
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState("")
  const [email, setEmail] = useState("")
  const [twitter, setTwitter] = useState("")
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submissionSuccess, setSubmissionSuccess] = useState(false)
  const [id, setId] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState<"tasks" | "entry">("tasks")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isWalletConnected, setIsWalletConnected] = useState(false)

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (!id) return

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

          const updatedCampaigns = campaigns.map((c: Campaign) =>
            c.id === id ? { ...c, clicks: (c.clicks || 0) + 1 } : c
          )
          localStorage.setItem("touzi_campaigns", JSON.stringify(updatedCampaigns))

          const submissionKey = `touzi_submission_${id}`
          const existingSubmission = localStorage.getItem(submissionKey)
          if (existingSubmission) {
            setHasSubmitted(true)
          }
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
      return formatTimeFromSeconds(seconds, "")
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

  const toggleTaskCompletion = (taskId: string, url: string) => {
    if (url) {
      window.open(url, "_blank")
    }
    setTaskCompletions((prev) => ({
      ...prev,
      [taskId]: true,
    }))
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const connectWallet = async () => {
    setIsConnecting(true)

    if (typeof window !== "undefined" && (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum) {
      try {
        const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
        const accounts = await ethereum.request({ method: "eth_requestAccounts" })
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0])
          setIsWalletConnected(true)
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error)
        const mockAddress = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 6)}`
        setWalletAddress(mockAddress)
        setIsWalletConnected(true)
      }
    } else {
      const mockAddress = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 6)}`
      setWalletAddress(mockAddress)
      setIsWalletConnected(true)
    }

    setTimeout(() => {
      setIsConnecting(false)
    }, 1000)
  }

  const disconnectWallet = () => {
    setWalletAddress("")
    setIsWalletConnected(false)
  }

  const handleSubmit = () => {
    if (!campaign || !walletAddress) return

    setIsSubmitting(true)

    const tasks = campaign.tasks || campaign.taskList || []
    const completedCount = Object.values(taskCompletions).filter(Boolean).length

    const submission = {
      id: `sub_${Date.now()}`,
      walletAddress,
      email: email || undefined,
      twitter: twitter || undefined,
      tasksCompleted: completedCount,
      totalTasks: tasks.length,
      submittedAt: new Date().toISOString(),
      status: "pending" as const,
    }

    const saved = localStorage.getItem("touzi_campaigns")
    if (saved) {
      const campaigns = JSON.parse(saved)
      const updatedCampaigns = campaigns.map((c: Campaign) => {
        if (c.id === id) {
          return {
            ...c,
            submissions: [...(c.submissions || []), submission],
            joined: (c.joined || 0) + 1,
            participants: ((c.participants || c.joined || 0) + 1),
          }
        }
        return c
      })
      localStorage.setItem("touzi_campaigns", JSON.stringify(updatedCampaigns))
    }

    localStorage.setItem(`touzi_submission_${id}`, JSON.stringify(submission))

    setTimeout(() => {
      setIsSubmitting(false)
      setSubmissionSuccess(true)
      setHasSubmitted(true)
    }, 1500)
  }

  const joinGiveaway = async () => {
    if (hasSubmitted) return

    setIsSubmitting(true)

    let address = walletAddress

    // If not connected, connect wallet first
    if (!isWalletConnected) {
      if (typeof window !== "undefined" && (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum) {
        try {
          const ethereum = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum
          const accounts = await ethereum.request({ method: "eth_requestAccounts" })
          if (accounts && accounts.length > 0) {
            address = accounts[0]
            setWalletAddress(accounts[0])
            setIsWalletConnected(true)
          }
        } catch (error) {
          console.error("Failed to connect wallet:", error)
          // Fallback: generate a mock address for demo
          address = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 6)}`
          setWalletAddress(address)
          setIsWalletConnected(true)
        }
      } else {
        // No wallet available, generate mock for demo
        address = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 6)}`
        setWalletAddress(address)
        setIsWalletConnected(true)
      }
    }

    // Now submit the entry
    const tasks = campaign?.tasks || campaign?.taskList || []
    const completedCount = Object.values(taskCompletions).filter(Boolean).length

    const submission = {
      id: `sub_${Date.now()}`,
      walletAddress: address,
      tasksCompleted: completedCount,
      totalTasks: tasks.length,
      submittedAt: new Date().toISOString(),
      status: "pending" as const,
    }

    const saved = localStorage.getItem("touzi_campaigns")
    if (saved) {
      const campaigns = JSON.parse(saved)
      const updatedCampaigns = campaigns.map((c: Campaign) => {
        if (c.id === id) {
          return {
            ...c,
            submissions: [...(c.submissions || []), submission],
            joined: (c.joined || 0) + 1,
            participants: ((c.participants || c.joined || 0) + 1),
          }
        }
        return c
      })
      localStorage.setItem("touzi_campaigns", JSON.stringify(updatedCampaigns))
    }

    localStorage.setItem(`touzi_submission_${id}`, JSON.stringify(submission))

    setTimeout(() => {
      setIsSubmitting(false)
      setSubmissionSuccess(true)
      setHasSubmitted(true)
    }, 1500)
  }

  const formatWalletAddress = (address: string) => {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (loading) {
    return (
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />
        <div className="flex flex-col items-center gap-6">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white"></div>
          <p className={`${instrumentSerif.className} text-white/60 text-xl`}>Loading room...</p>
        </div>
      </main>
    )
  }

  if (!campaign) {
    return (
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        <div className="absolute top-8 left-8 z-50">
          <Link
            href="/"
            className={`${instrumentSerif.className} text-white text-3xl font-normal tracking-tighter hover:opacity-80 transition-opacity`}
          >
            Touzi
          </Link>
        </div>

        <section className="px-6 flex flex-col items-center gap-8 text-center">
          <div className="size-24 rounded-full glass flex items-center justify-center">
            <AlertCircle className="size-12 text-white/60" />
          </div>
          <h1 className={`${instrumentSerif.className} text-white text-5xl font-normal tracking-tight`}>
            Room Not Found
          </h1>
          <p className="text-white/50 text-lg max-w-md">
            This room may have been deleted, expired, or the link is incorrect.
          </p>
          <Link href="/">
            <Button size="lg" className="rounded-full px-8 bg-white text-black hover:bg-white/90">
              <ArrowRight className="size-4" />
              Go Home
            </Button>
          </Link>
        </section>
      </main>
    )
  }

  const timeRemaining = getTimeRemaining(campaign.endDate, campaign.startDate)
  const tasks = campaign.tasks || campaign.taskList || []
  const completedTasks = Object.values(taskCompletions).filter(Boolean).length
  const allTasksCompleted = completedTasks === tasks.length && tasks.length > 0

  if (submissionSuccess) {
    return (
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <GradientBackground />
        <div className="absolute inset-0 -z-10 bg-black/20" />

        <div className="absolute top-8 left-8 z-50">
          <Link
            href="/"
            className={`${instrumentSerif.className} text-white text-3xl font-normal tracking-tighter hover:opacity-80 transition-opacity`}
          >
            Touzi
          </Link>
        </div>

        <section className="px-6 flex flex-col items-center gap-8 text-center max-w-lg">
          <div className="size-24 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center animate-pulse">
            <CheckCircle2 className="size-12 text-white" />
          </div>
          <h1 className={`${instrumentSerif.className} text-white text-5xl font-normal tracking-tight`}>
            You're In!
          </h1>
          <p className="text-white/60 text-lg">
            Your entry for <span className="text-white">{campaign.title}</span> has been submitted successfully.
          </p>
          <div className="glass rounded-2xl p-6 w-full">
            <p className="text-white/50 text-sm">
              Winners will be announced after the campaign ends on{" "}
              <span className="text-white font-medium">
                {format(new Date(campaign.endDate), "MMMM dd, yyyy")}
              </span>
            </p>
          </div>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-8 border-white/20 text-white hover:bg-white/10 bg-transparent"
            onClick={copyLink}
          >
            <Share2 className="size-4" />
            {copied ? "Copied!" : "Share"}
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <GradientBackground />
      <div className="absolute inset-0 -z-10 bg-black/30" />

      <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6">
        <Link
          href="/"
          className={`${instrumentSerif.className} text-white text-3xl font-normal tracking-tighter hover:opacity-80 transition-opacity`}
        >
          Touzi
        </Link>
        <div className="flex items-center gap-3">
          {isWalletConnected ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full px-4 border-white/20 text-white hover:bg-white/10 bg-white/5"
              onClick={disconnectWallet}
            >
              <Wallet className="size-4" />
              {formatWalletAddress(walletAddress)}
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-full px-6 bg-white text-black hover:bg-white/90"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wallet className="size-4" />
              )}
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="rounded-full px-4 border-white/20 text-white hover:bg-white/10 bg-transparent"
            onClick={copyLink}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Share"}
          </Button>
        </div>
      </header>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-24">


        <h1 className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-5xl md:text-7xl max-w-4xl mb-4`}>
          {campaign.title}
        </h1>

        {campaign.description && (
          <p className="text-white/50 text-lg text-center max-w-2xl mb-6">
            {campaign.description}
          </p>
        )}

        <div className="flex items-center gap-6 mb-8">
          <div className="flex items-center gap-2 text-white/60">
            <Clock className="size-4" />
            <span className={cn(
              "font-mono",
              campaign.status === "ended" && "text-red-400",
              campaign.status === "scheduled" && "text-yellow-400",
              campaign.status === "active" && "text-white"
            )}>
              {timeRemaining.text}
            </span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2 text-white/60">
            <Users2 className="size-4" />
            <span>{campaign.participants || campaign.joined || 0} joined</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2 text-white/60">
            <Zap className="size-4" />
            <span>{tasks.length} tasks</span>
          </div>
        </div>

        {campaign.prizeTiers && campaign.prizeTiers.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-white/60 mb-8">
            {campaign.prizeTiers.slice(0, 3).map((tier, index) => (
              <span key={tier.id} className="flex items-center gap-1.5">
                <span>{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                <span className="text-white font-medium">{tier.amount}</span>
                <span className="text-white/40">{campaign.prizeType}</span>
              </span>
            ))}
          </div>
        )}

        <div className="glass-dark rounded-3xl w-full max-w-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-white/40 flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                Tasks
              </span>
              <span className="text-sm text-white">{completedTasks}/{tasks.length}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: tasks.length > 0 ? `${(completedTasks / tasks.length) * 100}%` : "0%" }}
              />
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {tasks.length > 0 ? (
                tasks.map((task, index) => {
                  const isCompleted = taskCompletions[task.id]
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer",
                        isCompleted
                          ? "bg-white/10"
                          : "bg-white/5 hover:bg-white/10"
                      )}
                      onClick={() => !isCompleted && toggleTaskCompletion(task.id, task.url)}
                    >
                      <div className={cn(
                        "size-10 rounded-full flex items-center justify-center transition-colors",
                        isCompleted ? "bg-white text-black" : "bg-white/10"
                      )}>
                        {isCompleted ? (
                          <Check className="size-5" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium",
                          isCompleted ? "text-white/60 line-through" : "text-white"
                        )}>
                          {task.label}
                        </p>
                        {task.url && (
                          <p className="text-sm text-white/30 truncate">{task.url}</p>
                        )}
                      </div>
                      {!isCompleted && (
                        <ExternalLink className="size-4 text-white/40" />
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-white/40">No tasks required for this giveaway</p>
                </div>
              )}
            </div>

            {allTasksCompleted && !hasSubmitted && (
              <Button
                size="lg"
                className="w-full mt-6 rounded-full h-14 bg-white text-black hover:bg-white/90 font-semibold"
                onClick={joinGiveaway}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Gift className="size-5" />
                    Join Giveaway
                  </>
                )}
              </Button>
            )}

            {hasSubmitted && (
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                <p className="text-green-400 flex items-center justify-center gap-2">
                  <CheckCircle2 className="size-5" />
                  You've joined this giveaway!
                </p>
              </div>
            )}
          </div>
        </div>


      </div>
    </main>
  )
}
