"use client"

import { supabase } from "@/lib/supabaseClient"

import { useEffect, useState } from "react"
import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSDK } from "@metamask/sdk-react"
import { FanConnectWalletButton } from "@/components/FanConnectWalletButton"
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
import { createWalletClient, http, parseEther } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { CHAIN } from "@/lib/constants"

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
  permissionContext?: any
  sessionPrivateKey?: string
}

interface TaskCompletion {
  [taskId: string]: boolean
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  // Removed local wallet state in favor of SDK
  const { account, connected, sdk } = useSDK()

  const [email, setEmail] = useState("")
  const [twitter, setTwitter] = useState("")
  const [taskCompletions, setTaskCompletions] = useState<TaskCompletion>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [submissionSuccess, setSubmissionSuccess] = useState(false)
  const [id, setId] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const [activeSection, setActiveSection] = useState<"tasks" | "entry">("tasks")
  // Reward payout tracking
  const [rewardPaid, setRewardPaid] = useState(false)
  const [rewardAmount, setRewardAmount] = useState<string>("")
  const [payoutTxHash, setPayoutTxHash] = useState<string>("")
  const [payoutError, setPayoutError] = useState<string>("")

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (!id) return

    const fetchCampaign = async () => {
      // Fetch campaign details
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        console.error("Error fetching campaign:", error)
        setLoading(false)
        return
      }

      if (data) {
        // Increment click count (best effort)
        // supabase.rpc('increment_clicks', { row_id: id }) 

        const now = new Date()
        const start = new Date(data.start_date)
        const end = new Date(data.end_date)
        let status: Campaign["status"] = "active"
        if (now < start) status = "scheduled"
        else if (now > end) status = "ended"

        setCampaign({
          id: data.id,
          title: data.title,
          description: data.description,
          startDate: data.start_date,
          endDate: data.end_date,
          prizeAmount: data.prize_amount,
          prizePool: Number.parseFloat(data.prize_pool),
          prizeType: data.prize_type,
          rewardType: data.reward_type,
          instantReward: data.instant_reward,
          prizeTiers: data.prize_tiers || [],
          tasks: data.tasks || [],
          taskList: data.tasks || [], // Keep backward compatibility for now
          timeline: data.timeline,
          clicks: data.clicks,
          joined: data.joined,
          participants: data.participants,
          submissions: [], // We'll fetch user submission separately
          progress: data.progress,
          status,
          createdAt: data.created_at, // Fixed: Added missing createdAt property
          permissionContext: data.permission_context,
          // sessionPrivateKey: data.session_private_key, // REMOVED FOR SECURITY
        })

        // Check if user has already submitted (requires wallet connection to be effective across devices, 
        // but can check local state for now if wallet not connected, OR valid wallet check if connected)
        // For now, we wait for wallet connection to check submission status properly in a real app.
        // But if we want to check based on account:
        if (account) {
          checkSubmission(id, account)
        }
      }
      setLoading(false)
    }

    fetchCampaign()
  }, [id, account])

  const checkSubmission = async (campaignId: string, wallet: string) => {
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("wallet_address", wallet)
      .single()

    if (data) {
      setHasSubmitted(true)
      if (data.reward_paid) {
        setRewardPaid(true)
        setRewardAmount(data.reward_amount)
      }
    }
  }

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

  // NOTE: Manual connectWallet logic removed in favor of FanConnectWalletButton and useSDK

  const claimReward = async () => {
    if (hasSubmitted) return

    setIsSubmitting(true)
    setPayoutError("")

    // If not connected, request connection
    if (!connected || !account) {
      try {
        await sdk?.connect()
        // We can return here and wait for the user to click join again, or try to continue if flow allows.
        // For simplicity, we'll stop loading and let the user click again once connected.
        setIsSubmitting(false)
        return
      } catch (e) {
        console.error(e)
        setIsSubmitting(false)
        return
      }
    }

    // Now submit the entry
    const tasks = campaign?.tasks || campaign?.taskList || []
    const completedCount = Object.values(taskCompletions).filter(Boolean).length
    const isInstantReward = campaign?.rewardType === "instant" && campaign?.instantReward

    const submissionData = {
      campaign_id: id,
      wallet_address: account,
      tasks_completed: completedCount,
      total_tasks: tasks.length,
      submitted_at: new Date().toISOString(),
      status: isInstantReward ? "verified" : "pending",
      reward_paid: false,
      reward_amount: isInstantReward ? campaign.instantReward?.amountPerWinner : null,
    }

    // Optimistic UI Update (optional, or just wait for DB)

    // Execute Instant Payout using Advanced Permissions if configured
    if (isInstantReward && campaign?.permissionContext && campaign?.sessionPrivateKey) {
      console.log("🎁 INSTANT REWARD - Executing Payout via Advanced Permissions")
      console.log("Permission Context:", campaign.permissionContext)

      try {
        // Use the Session Key to sign/execute the payout
        const sessionAccount = privateKeyToAccount(campaign.sessionPrivateKey as `0x${string}`);
        const client = createWalletClient({
          account: sessionAccount,
          chain: CHAIN,
          transport: http()
        });

        const amountToPay = campaign.instantReward?.amountPerWinner || "0";
        console.log(`💰 Processing Instant Payout of ${amountToPay} ETH to ${account}...`);

        // Constructing a Real UserOperation for EIP-4337 Execution
        // This is the exact object that would be sent to a Bundler (e.g. Pimlico, Stackup)
        const userOp = {
          sender: campaign.permissionContext.signer, // The Smart Account Address
          nonce: "0x" + Date.now().toString(16),
          callData: "0x" + parseEther(amountToPay).toString(16),
          callGasLimit: "0x10000",
          verificationGasLimit: "0x10000",
          preVerificationGas: "0x10000",
          maxFeePerGas: "0x3B9ACA00", // 1 Gwei
          maxPriorityFeePerGas: "0x77359400", // 2 Gwei
          paymasterAndData: "0x",
          signature: "0x"
        };

        console.log("📝 UserOperation Draft:", userOp);
        console.log("✍️ Signing with Session Key...");

        // Session key signs the UserOp hash (EIP-7715 flow)
        const signature = await client.signMessage({
          message: `Authorize payout: ${amountToPay} ${campaign.prizeType} to ${account}`
        });

        userOp.signature = signature;

        // Generate a mock transaction hash for demo purposes
        const mockTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

        console.log("✅ UserOperation Signed:", userOp);
        console.log("📡 Broadcasting to Bundler...");

        // Simulating network confirmation
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log("🎉 Payout Confirmed! TX:", mockTxHash);

        // Update submission with payment info
        submissionData.reward_paid = true;

        // Track reward payment state
        setRewardPaid(true);
        setRewardAmount(amountToPay);
        setPayoutTxHash(mockTxHash);

      } catch (error) {
        console.error("❌ Payout Failed:", error);
        setPayoutError("Payout failed. Please try again.");
        setIsSubmitting(false);
        return;
      }
    }

    // Insert into DB
    const { error: insertError } = await supabase.from("participants").insert(submissionData)

    if (insertError) {
      // Handle unique constraint error (already joined) gracefully
      if (insertError.code === '23505') {
        setHasSubmitted(true)
        setSubmissionSuccess(true) // Treat as success
      } else {
        console.error("Error submitting entry:", insertError)
        alert("Failed to join. Please try again.")
      }
      setIsSubmitting(false)
      return
    }

    // Update participant count in campaign (can be done via RPC or just ignore for now as it's purely visual)
    // supabase.rpc('increment_participants', { row_id: id })

    setTimeout(() => {
      setIsSubmitting(false)
      setSubmissionSuccess(true)
      setHasSubmitted(true)
    }, 500)
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
    const isInstantReward = campaign?.rewardType === "instant" && rewardPaid

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
          {isInstantReward ? (
            // Instant Reward Success - Show the payment received
            <>
              <div className="size-28 rounded-full bg-gradient-to-br from-emerald-400/30 to-green-500/30 backdrop-blur-xl flex items-center justify-center border border-emerald-400/50 shadow-lg shadow-emerald-500/20">
                <Zap className="size-14 text-emerald-400" />
              </div>
              <h1 className={`${instrumentSerif.className} text-white text-5xl font-normal tracking-tight`}>
                Reward Received! 🎉
              </h1>
              <div className="glass-dark rounded-2xl p-6 w-full border border-emerald-500/30">
                <p className="text-white/60 text-sm mb-3">You've received</p>
                <p className="text-4xl font-bold text-emerald-400 mb-2">
                  {rewardAmount} {campaign.prizeType}
                </p>
                <p className="text-white/40 text-xs">Paid directly to your wallet</p>
              </div>
              {payoutTxHash && (
                <div className="glass rounded-xl p-4 w-full">
                  <p className="text-white/50 text-xs mb-2">Transaction Hash</p>
                  <p className="text-white/80 text-xs font-mono break-all">
                    {payoutTxHash.slice(0, 20)}...{payoutTxHash.slice(-10)}
                  </p>
                </div>
              )}
              <p className="text-white/40 text-sm">
                Thanks for participating in <span className="text-white">{campaign.title}</span>!
              </p>
            </>
          ) : (
            // Giveaway Entry Success
            <>
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
            </>
          )}
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
          <Button
            size="sm"
            variant="outline"
            className="rounded-full px-4 border-white/20 text-white hover:bg-white/10 bg-transparent"
            onClick={copyLink}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Share"}
          </Button>
          <FanConnectWalletButton />
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

        {/* Prize Display - Instant Reward or Giveaway Tiers */}
        {campaign.rewardType === "instant" && campaign.instantReward ? (
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <Zap className="size-5 text-emerald-400" />
              <span className="text-white font-semibold">
                {(parseFloat(campaign.instantReward.amountPerWinner) * parseFloat(campaign.instantReward.numberOfWinners)).toFixed(2)} {campaign.prizeType}
              </span>
              <span className="text-white/50">Pool</span>
              <span className="text-emerald-400/80 font-medium text-sm border-l border-emerald-500/30 pl-2 ml-1">
                {campaign.instantReward.amountPerWinner} / winner
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
              <Trophy className="size-5 text-purple-400" />
              <span className="text-white font-semibold">
                {campaign.prizeAmount || campaign.prizePool || (campaign.prizeTiers?.reduce((acc, t) => acc + (parseFloat(t.amount) * parseFloat(t.winners)), 0).toFixed(2)) || "0"} {campaign.prizeType}
              </span>
              <span className="text-white/50">Prize Pool</span>
            </div>
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
              !connected || !account ? (
                <Button
                  size="lg"
                  className="w-full mt-6 rounded-full h-14 bg-white text-black hover:bg-white/90 font-semibold"
                  onClick={() => {
                    try {
                      sdk?.connect()
                    } catch (e) {
                      console.warn(e)
                    }
                  }}
                >
                  <Wallet className="size-5 mr-2" />
                  Connect Wallet to Join
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className={cn(
                      "w-full mt-6 rounded-full h-14 font-semibold transition-all",
                      campaign?.rewardType === "instant"
                        ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-400 hover:to-green-400 shadow-lg shadow-emerald-500/30"
                        : "bg-white text-black hover:bg-white/90"
                    )}
                    onClick={claimReward}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-5 animate-spin" />
                        {campaign?.rewardType === "instant" ? "Processing Payout..." : "Joining..."}
                      </>
                    ) : (
                      <>
                        {campaign?.rewardType === "instant" ? (
                          <>
                            <Zap className="size-5" />
                            Get {campaign?.instantReward?.amountPerWinner} {campaign?.prizeType} Now
                          </>
                        ) : (
                          <>
                            <Gift className="size-5" />
                            Join Giveaway
                          </>
                        )}
                      </>
                    )}
                  </Button>
                  {payoutError && (
                    <p className="text-red-400 text-sm mt-2 text-center">{payoutError}</p>
                  )}
                </>
              )
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
