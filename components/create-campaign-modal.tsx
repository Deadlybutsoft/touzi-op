"use client"

import { supabase } from "@/lib/supabaseClient"

import { useState } from "react"
import {
  X,
  Calendar,
  Trophy,
  DollarSign,
  Twitter,
  Instagram,
  Facebook,
  Check,
  Copy,
  ExternalLink,
  Clock,
  Plus,
  Trash2,
  Youtube,
  MessageCircle,
  Globe,
  Users,
  Send,
  Link2,
  ChevronDown,
  Timer,
  Zap,
  Gift,
  Award,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

// Function to convert room name to URL-friendly slug
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .replace(/^-+/, '')          // Trim - from start of text
    .replace(/-+$/, '')          // Trim - from end of text
}
import { format, differenceInMinutes, differenceInHours, differenceInDays } from "date-fns" // Imported date-fns helpers
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { createWalletClient, custom, parseEther, toHex, createPublicClient, http } from "viem"
import { sepolia } from "viem/chains"
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions"

interface CreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
}

interface PrizeTier {
  id: string
  name: string
  amount: string
  winners: string
  rewardType: "instant" | "giveaway" // instant = immediate reward on task completion, giveaway = winner selected after campaign ends
}

interface TaskItem {
  id: string
  type: string
  label: string
  url: string
  enabled: boolean
}

interface PermissionContext {
  grantedAt: number
  expiry: number
  signer: string
  permissions: string[]
  limit: string
}

const TASK_TYPES = [
  {
    id: "x-follow",
    label: "Follow on X",
    icon: Twitter,
    platform: "twitter",
    placeholder: "https://twitter.com/username",
  },
  {
    id: "x-retweet",
    label: "Retweet Post",
    icon: Twitter,
    platform: "twitter",
    placeholder: "https://twitter.com/username/status/...",
  },
  {
    id: "x-like",
    label: "Like Tweet",
    icon: Twitter,
    platform: "twitter",
    placeholder: "https://twitter.com/username/status/...",
  },
  {
    id: "x-comment",
    label: "Comment on Tweet",
    icon: Twitter,
    platform: "twitter",
    placeholder: "https://twitter.com/username/status/...",
  },
  {
    id: "ig-follow",
    label: "Follow on Instagram",
    icon: Instagram,
    platform: "instagram",
    placeholder: "https://instagram.com/username",
  },
  {
    id: "ig-like",
    label: "Like Instagram Post",
    icon: Instagram,
    platform: "instagram",
    placeholder: "https://instagram.com/p/...",
  },
  {
    id: "fb-follow",
    label: "Follow on Facebook",
    icon: Facebook,
    platform: "facebook",
    placeholder: "https://facebook.com/pagename",
  },
  {
    id: "fb-like",
    label: "Like Facebook Post",
    icon: Facebook,
    platform: "facebook",
    placeholder: "https://facebook.com/post/...",
  },
  {
    id: "yt-subscribe",
    label: "Subscribe on YouTube",
    icon: Youtube,
    platform: "youtube",
    placeholder: "https://youtube.com/@channel",
  },
  {
    id: "yt-like",
    label: "Like YouTube Video",
    icon: Youtube,
    platform: "youtube",
    placeholder: "https://youtube.com/watch?v=...",
  },
  {
    id: "tg-join",
    label: "Join Telegram Group",
    icon: Send,
    platform: "telegram",
    placeholder: "https://t.me/groupname",
  },
  {
    id: "discord-join",
    label: "Join Discord Server",
    icon: MessageCircle,
    platform: "discord",
    placeholder: "https://discord.gg/invite",
  },
  {
    id: "website-visit",
    label: "Visit Website",
    icon: Globe,
    platform: "website",
    placeholder: "https://yourwebsite.com",
  },
  {
    id: "referral",
    label: "Refer Friends",
    icon: Users,
    platform: "referral",
    placeholder: "Minimum referrals required",
  },
]

// Updated TIME_OPTIONS to be more dynamic and use 12-hour format
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12
  const ampm = i < 12 ? "AM" : "PM"
  return `${hour.toString().padStart(2, "0")}:00 ${ampm}`
})

const MINUTE_OPTIONS = ["00", "15", "30", "45"]

const DURATION_PRESETS = [
  { label: "1 min", value: { minutes: 1 } },
  { label: "5 min", value: { minutes: 5 } },
  { label: "15 min", value: { minutes: 15 } },
  { label: "30 min", value: { minutes: 30 } },
  { label: "1 hour", value: { hours: 1 } },
  { label: "6 hours", value: { hours: 6 } },
  { label: "12 hours", value: { hours: 12 } },
  { label: "1 day", value: { days: 1 } },
  { label: "3 days", value: { days: 3 } },
  { label: "1 week", value: { days: 7 } },
  { label: "2 weeks", value: { days: 14 } },
  { label: "1 month", value: { days: 30 } },
  { label: "3 months", value: { days: 90 } },
  { label: "6 months", value: { days: 180 } },
  { label: "1 year", value: { days: 365 } },
  { label: "Custom", value: null }, // Added custom option
]

export function CreateCampaignModal({ isOpen, onClose }: CreateCampaignModalProps) {
  const [step, setStep] = useState(1)
  const [generatedId, setGeneratedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showCalendar, setShowCalendar] = useState<"start" | "end" | null>(null)
  const [showStartTime, setShowStartTime] = useState(false)
  const [showEndTime, setShowEndTime] = useState(false)
  const [showStartMinute, setShowStartMinute] = useState(false) // Added state for minute selection
  const [showEndMinute, setShowEndMinute] = useState(false) // Added state for minute selection
  const [showTaskSelector, setShowTaskSelector] = useState(false)
  const [showDurationPresets, setShowDurationPresets] = useState(false) // State for showing duration presets
  const [selectedDurationPreset, setSelectedDurationPreset] = useState<string>("1 week") // State for selected duration preset

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: new Date(),
    startHour: "12", // Changed from startTime to startHour
    startMinute: "00", // Added startMinute
    startAmPm: "PM", // Added startAmPm
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endHour: "12", // Changed from endTime to endHour
    endMinute: "00", // Added endMinute
    endAmPm: "PM", // Added endAmPm
    // Global reward type selection
    rewardType: "instant" as "instant" | "giveaway",
    // Instant reward configuration (simple: amount per winner, number of winners)
    instantReward: {
      amountPerWinner: "0.1",
      numberOfWinners: "10",
    },
    // Giveaway configuration (tiered: 1st, 2nd, 3rd place etc.)
    prizeTiers: [] as PrizeTier[],
    tasks: [] as TaskItem[],
    permissionContext: null as PermissionContext | null,
    sessionPrivateKey: null as string | null,
  })

  const getStartDateTime = () => {
    const date = new Date(formData.startDate)
    let hour = Number.parseInt(formData.startHour)
    if (formData.startAmPm === "PM" && hour !== 12) hour += 12
    if (formData.startAmPm === "AM" && hour === 12) hour = 0
    date.setHours(hour, Number.parseInt(formData.startMinute), 0, 0)
    return date
  }

  const getEndDateTime = () => {
    const date = new Date(formData.endDate)
    let hour = Number.parseInt(formData.endHour)
    if (formData.endAmPm === "PM" && hour !== 12) hour += 12
    if (formData.endAmPm === "AM" && hour === 12) hour = 0
    date.setHours(hour, Number.parseInt(formData.endMinute), 0, 0)
    return date
  }

  const getDurationText = () => {
    const start = getStartDateTime()
    const end = getEndDateTime()
    const minutes = differenceInMinutes(end, start)
    const hours = differenceInHours(end, start)
    const days = differenceInDays(end, start)

    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes % 60 > 0 ? `${minutes % 60} min` : ""}`
    if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ${hours % 24 > 0 ? `${hours % 24} hours` : ""}`
    if (days < 365) {
      const months = Math.floor(days / 30)
      const remainingDays = days % 30
      return `${months} month${months !== 1 ? "s" : ""}${remainingDays > 0 ? ` ${remainingDays} days` : ""}`
    }
    const years = Math.floor(days / 365)
    const remainingMonths = Math.floor((days % 365) / 30)
    return `${years} year${years !== 1 ? "s" : ""}${remainingMonths > 0 ? ` ${remainingMonths} months` : ""}`
  }

  // Function to apply selected duration preset
  const applyDurationPreset = (preset: (typeof DURATION_PRESETS)[0]) => {
    if (!preset.value) {
      setShowDurationPresets(false)
      return
    }

    const start = getStartDateTime()
    const newEnd = new Date(start)

    if (preset.value.minutes) newEnd.setMinutes(newEnd.getMinutes() + preset.value.minutes)
    if (preset.value.hours) newEnd.setHours(newEnd.getHours() + preset.value.hours)
    if (preset.value.days) newEnd.setDate(newEnd.getDate() + preset.value.days)

    const endHour = newEnd.getHours()
    const endMinute = newEnd.getMinutes()

    setFormData({
      ...formData,
      endDate: newEnd,
      endHour: (endHour % 12 || 12).toString(),
      endMinute: endMinute.toString().padStart(2, "0"),
      endAmPm: endHour >= 12 ? "PM" : "AM",
    })
    setSelectedDurationPreset(preset.label)
    setShowDurationPresets(false)
  }

  const addPrizeTier = () => {
    const newTier: PrizeTier = {
      id: Date.now().toString(),
      name: `Prize Tier ${formData.prizeTiers.length + 1}`,
      amount: "0.1",
      winners: "5",
      rewardType: "giveaway", // Default to giveaway mode
    }
    setFormData({ ...formData, prizeTiers: [...formData.prizeTiers, newTier] })
  }

  const removePrizeTier = (id: string) => {
    setFormData({
      ...formData,
      prizeTiers: formData.prizeTiers.filter((tier) => tier.id !== id),
    })
  }

  const updatePrizeTier = (id: string, field: keyof PrizeTier, value: string) => {
    setFormData({
      ...formData,
      prizeTiers: formData.prizeTiers.map((tier) => (tier.id === id ? { ...tier, [field]: value } : tier)),
    })
  }

  const addTask = (taskType: (typeof TASK_TYPES)[0]) => {
    const newTask: TaskItem = {
      id: Date.now().toString(),
      type: taskType.id,
      label: taskType.label,
      url: "",
      enabled: true,
    }
    setFormData({ ...formData, tasks: [...formData.tasks, newTask] })
    setShowTaskSelector(false)
  }

  const removeTask = (id: string) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((task) => task.id !== id),
    })
  }

  const updateTaskUrl = (id: string, url: string) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.map((task) => (task.id === id ? { ...task, url } : task)),
    })
  }

  const getTaskIcon = (type: string) => {
    const taskType = TASK_TYPES.find((t) => t.id === type)
    return taskType?.icon || Globe
  }

  const getTaskPlaceholder = (type: string) => {
    const taskType = TASK_TYPES.find((t) => t.id === type)
    return taskType?.placeholder || "Enter URL"
  }

  const getTotalPrizePool = () => {
    if (formData.rewardType === "instant") {
      const amount = Number.parseFloat(formData.instantReward.amountPerWinner || "0")
      const winners = Number.parseInt(formData.instantReward.numberOfWinners || "0")
      return (amount * winners).toFixed(2)
    }
    return formData.prizeTiers
      .reduce((total, tier) => {
        return total + Number.parseFloat(tier.amount || "0") * Number.parseInt(tier.winners || "0")
      }, 0)
      .toFixed(2)
  }

  const getTotalWinners = () => {
    if (formData.rewardType === "instant") {
      return Number.parseInt(formData.instantReward.numberOfWinners || "0")
    }
    return formData.prizeTiers.reduce((total, tier) => {
      return total + Number.parseInt(tier.winners || "0")
    }, 0)
  }

  const handleCreateRoom = async () => {
    // Generate slug from room name, with fallback to random ID if name is empty
    const roomName = formData.name.trim()
    const slug = roomName ? slugify(roomName) : Math.random().toString(36).substring(2, 10)
    setGeneratedId(slug)

    const campaign = {
      id: slug,
      title: formData.name || "Untitled Room",
      description: formData.description,
      start_date: getStartDateTime().toISOString(),
      end_date: getEndDateTime().toISOString(),
      prize_amount: getTotalPrizePool(),
      prize_pool: Number.parseFloat(getTotalPrizePool()),
      prize_type: "ETH",
      reward_type: formData.rewardType, // "instant" or "giveaway"
      instant_reward: formData.rewardType === "instant" ? formData.instantReward : null,
      prize_tiers: formData.rewardType === "giveaway" ? formData.prizeTiers : [],
      tasks: formData.tasks,
      timeline: getDurationText(),
      clicks: 0,
      joined: 0,
      participants: 0,
      progress: 0,
      status: "active",
      permission_context: formData.permissionContext,
      session_private_key: formData.sessionPrivateKey,
    }

    const { error } = await supabase.from("campaigns").insert(campaign)

    if (error) {
      console.error("Error creating campaign:", error)
      alert("Failed to create room. Please check your connection.")
      return
    }

    // Dispatch event for local updates if needed, though dashboard should now fetch from DB
    window.dispatchEvent(new CustomEvent("newCampaign", { detail: campaign }))

    setStep(6)
  }

  const copyToClipboard = () => {
    if (!generatedId) return
    const url = `${window.location.origin}/room/${generatedId}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-dark w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold">{step === 6 ? "Room Created!" : "Create Giveaway Room"}</h2>
            {step < 6 && (
              <p className="text-sm text-white/40 mt-0.5">
                {step === 1 && "Room Name & Description"}
                {step === 2 && "Timeline Settings"}
                {step === 3 && "Configure Prize Tiers"}
                {step === 4 && "Set Up Entry Tasks"}
                {step === 5 && "Review & Launch"}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="size-5" />
          </Button>
        </div>

        {/* Form Content */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto flex-1">
          {/* Progress Indicator */}
          {step < 6 && (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={cn("h-1.5 flex-1 rounded-full transition-all", step >= s ? "bg-blue-500" : "bg-white/10")}
                />
              ))}
            </div>
          )}

          {/* Step 1: Basic Info & Timeline */}
          {step === 1 && (
            <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-sm text-white/40 font-medium">Room Name</label>
                <input
                  type="text"
                  placeholder="e.g. DeFi Summer Launch"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-colors"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-white/40 font-medium">Description (Optional)</label>
                <textarea
                  placeholder="Describe your giveaway..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500/50 transition-colors resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 2: Timeline */}
          {step === 2 && (
            <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300">

              <div className="space-y-3">
                <label className="text-sm text-white/40 font-medium flex items-center gap-2">
                  <Timer className="size-4" /> Quick Duration
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowDurationPresets(!showDurationPresets)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-white/20 transition-colors"
                  >
                    <span>{selectedDurationPreset}</span>
                    <ChevronDown
                      className={cn("size-4 text-white/40 transition-transform", showDurationPresets && "rotate-180")}
                    />
                  </button>
                  {showDurationPresets && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-4 gap-1 p-2">
                        {DURATION_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => applyDurationPreset(preset)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors text-center",
                              selectedDurationPreset === preset.label && "bg-blue-500/20 text-blue-400",
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Start Date & Time */}
              <div className="space-y-3">
                <label className="text-sm text-white/40 font-medium flex items-center gap-2">
                  <Calendar className="size-4" /> Start Date & Time
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Date Picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCalendar(showCalendar === "start" ? null : "start")}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-white/20 transition-colors"
                    >
                      <span>{format(formData.startDate, "MMM dd, yyyy")}</span>
                      <Calendar className="size-4 text-white/40" />
                    </button>
                    {showCalendar === "start" && (
                      <div className="absolute top-full left-0 mt-2 z-50 rounded-xl shadow-xl overflow-hidden custom-calendar">
                        <CalendarComponent
                          mode="single"
                          selected={formData.startDate}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, startDate: date })
                              setShowCalendar(null)
                            }
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          className="bg-zinc-900 text-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {/* Hour */}
                    <div className="relative flex-1">
                      <button
                        onClick={() => setShowStartTime(!showStartTime)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-center hover:border-white/20 transition-colors"
                      >
                        {formData.startHour}
                      </button>
                      {showStartTime && (
                        <div className="absolute top-full left-0 mt-2 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto w-full">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <button
                              key={hour}
                              onClick={() => {
                                setFormData({ ...formData, startHour: hour.toString() })
                                setShowStartTime(false)
                              }}
                              className={cn(
                                "w-full px-4 py-2 text-center text-sm hover:bg-white/10 transition-colors",
                                formData.startHour === hour.toString() && "bg-blue-500/20 text-blue-400",
                              )}
                            >
                              {hour}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Minute */}
                    <div className="relative flex-1">
                      <button
                        onClick={() => setShowStartMinute(!showStartMinute)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-center hover:border-white/20 transition-colors"
                      >
                        :{formData.startMinute}
                      </button>
                      {showStartMinute && (
                        <div className="absolute top-full left-0 mt-2 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-xl w-full">
                          {MINUTE_OPTIONS.map((min) => (
                            <button
                              key={min}
                              onClick={() => {
                                setFormData({ ...formData, startMinute: min })
                                setShowStartMinute(false)
                              }}
                              className={cn(
                                "w-full px-4 py-2 text-center text-sm hover:bg-white/10 transition-colors",
                                formData.startMinute === min && "bg-blue-500/20 text-blue-400",
                              )}
                            >
                              :{min}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* AM/PM */}
                    <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setFormData({ ...formData, startAmPm: "AM" })}
                        className={cn(
                          "px-3 py-3 text-sm transition-colors",
                          formData.startAmPm === "AM" ? "bg-blue-500 text-white" : "hover:bg-white/10",
                        )}
                      >
                        AM
                      </button>
                      <button
                        onClick={() => setFormData({ ...formData, startAmPm: "PM" })}
                        className={cn(
                          "px-3 py-3 text-sm transition-colors",
                          formData.startAmPm === "PM" ? "bg-blue-500 text-white" : "hover:bg-white/10",
                        )}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* End Date & Time */}
              <div className="space-y-3">
                <label className="text-sm text-white/40 font-medium flex items-center gap-2">
                  <Clock className="size-4" /> End Date & Time
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowCalendar(showCalendar === "end" ? null : "end")}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-white/20 transition-colors"
                    >
                      <span>{format(formData.endDate, "MMM dd, yyyy")}</span>
                      <Calendar className="size-4 text-white/40" />
                    </button>
                    {showCalendar === "end" && (
                      <div className="absolute top-full left-0 mt-2 z-50 rounded-xl shadow-xl overflow-hidden custom-calendar">
                        <CalendarComponent
                          mode="single"
                          selected={formData.endDate}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, endDate: date })
                              setShowCalendar(null)
                              setSelectedDurationPreset("Custom") // Set to Custom when date changes
                            }
                          }}
                          disabled={(date) => date < formData.startDate}
                          className="bg-zinc-900 text-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* End Time Picker */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <button
                        onClick={() => setShowEndTime(!showEndTime)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-center hover:border-white/20 transition-colors"
                      >
                        {formData.endHour}
                      </button>
                      {showEndTime && (
                        <div className="absolute top-full left-0 mt-2 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto w-full">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                            <button
                              key={hour}
                              onClick={() => {
                                setFormData({ ...formData, endHour: hour.toString() })
                                setShowEndTime(false)
                                setSelectedDurationPreset("Custom") // Set to Custom when hour changes
                              }}
                              className={cn(
                                "w-full px-4 py-2 text-center text-sm hover:bg-white/10 transition-colors",
                                formData.endHour === hour.toString() && "bg-blue-500/20 text-blue-400",
                              )}
                            >
                              {hour}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative flex-1">
                      <button
                        onClick={() => setShowEndMinute(!showEndMinute)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-center hover:border-white/20 transition-colors"
                      >
                        :{formData.endMinute}
                      </button>
                      {showEndMinute && (
                        <div className="absolute top-full left-0 mt-2 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-xl w-full">
                          {MINUTE_OPTIONS.map((min) => (
                            <button
                              key={min}
                              onClick={() => {
                                setFormData({ ...formData, endMinute: min })
                                setShowEndMinute(false)
                                setSelectedDurationPreset("Custom") // Set to Custom when minute changes
                              }}
                              className={cn(
                                "w-full px-4 py-2 text-center text-sm hover:bg-white/10 transition-colors",
                                formData.endMinute === min && "bg-blue-500/20 text-blue-400",
                              )}
                            >
                              :{min}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => {
                          setFormData({ ...formData, endAmPm: "AM" })
                          setSelectedDurationPreset("Custom") // Set to Custom when AM/PM changes
                        }}
                        className={cn(
                          "px-3 py-3 text-sm transition-colors",
                          formData.endAmPm === "AM" ? "bg-blue-500 text-white" : "hover:bg-white/10",
                        )}
                      >
                        AM
                      </button>
                      <button
                        onClick={() => {
                          setFormData({ ...formData, endAmPm: "PM" })
                          setSelectedDurationPreset("Custom") // Set to Custom when AM/PM changes
                        }}
                        className={cn(
                          "px-3 py-3 text-sm transition-colors",
                          formData.endAmPm === "PM" ? "bg-blue-500 text-white" : "hover:bg-white/10",
                        )}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Summary */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3 text-sm">
                  <Timer className="size-5 text-blue-400" />
                  <div>
                    <span className="text-white/60">Room Duration: </span>
                    <span className="font-medium text-white">{getDurationText()}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-white/40">
                  {format(getStartDateTime(), "MMM dd, yyyy 'at' h:mm a")} →{" "}
                  {format(getEndDateTime(), "MMM dd, yyyy 'at' h:mm a")}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Prize Configuration */}
          {step === 3 && (
            <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300">
              {/* Instant Reward Configuration */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Zap className="size-5" />
                  <h3 className="font-semibold">Instant Reward</h3>
                </div>
                <p className="text-sm text-white/50 mb-4">
                  Set the reward amount each user will receive instantly when they complete all tasks.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Amount per Winner (ETH)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-emerald-400" />
                      <input
                        type="text"
                        value={formData.instantReward.amountPerWinner}
                        onChange={(e) => setFormData({
                          ...formData,
                          instantReward: { ...formData.instantReward, amountPerWinner: e.target.value }
                        })}
                        className="w-full bg-white/10 border border-emerald-500/30 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-500 transition-colors text-lg font-medium"
                        placeholder="0.1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Number of Winners</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-emerald-400" />
                      <input
                        type="number"
                        value={formData.instantReward.numberOfWinners}
                        onChange={(e) => setFormData({
                          ...formData,
                          instantReward: { ...formData.instantReward, numberOfWinners: e.target.value }
                        })}
                        className="w-full bg-white/10 border border-emerald-500/30 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-emerald-500 transition-colors text-lg font-medium"
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>

                {/* Instant Reward Info */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mt-4">
                  <p className="text-sm text-emerald-300 flex items-center gap-2">
                    <Zap className="size-4 shrink-0" />
                    First <span className="font-bold">{formData.instantReward.numberOfWinners || 0}</span> users to complete all tasks will receive
                    <span className="font-bold">{formData.instantReward.amountPerWinner || 0} ETH</span> instantly
                  </p>
                </div>

                {/* Advanced Permissions Section */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mt-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Award className="size-5" />
                    <h3 className="font-semibold">Auto-Payout Permission</h3>
                    <span className="text-xs bg-red-500/20 px-2 py-0.5 rounded-full text-red-300">Required</span>
                  </div>
                  <p className="text-sm text-white/50">
                    Grant permission for the app to automatically distribute prizes from your wallet to winners. This is required to create an instant reward campaign.
                  </p>

                  {!formData.permissionContext ? (
                    <Button
                      type="button"
                      onClick={async () => {
                        try {
                          // Define the permission request
                          const totalAmount = (parseFloat(formData.instantReward.amountPerWinner) * parseFloat(formData.instantReward.numberOfWinners)).toString();
                          const expiryDate = Math.floor(getEndDateTime().getTime() / 1000);

                          // Check if MetaMask is available
                          if ((window as any).ethereum) {
                            const sessionPrivateKey = generatePrivateKey();
                            const sessionAccount = privateKeyToAccount(sessionPrivateKey);

                            try {
                              console.log("Generated Session Key:", sessionAccount.address);

                              // 1. Create Wallet Client with ERC-7715 Provider Actions (Official SDK)
                              const walletClient = createWalletClient({
                                transport: custom((window as any).ethereum),
                              }).extend(erc7715ProviderActions());

                              console.log("Wallet Client created with ERC-7715 actions");

                              // 2. Request Advanced Permissions using the Official SDK Method
                              // This is the correct way per MetaMask documentation
                              const currentTime = Math.floor(Date.now() / 1000);

                              const grantedPermissions = await walletClient.requestExecutionPermissions([{
                                chainId: sepolia.id, // Use Sepolia for testing
                                expiry: expiryDate,
                                signer: {
                                  type: "account",
                                  data: {
                                    address: sessionAccount.address
                                  }
                                },
                                permission: {
                                  type: "native-token-periodic", // Periodic native token transfer
                                  data: {
                                    periodAmount: parseEther(formData.instantReward.amountPerWinner), // Amount per period
                                    periodDuration: 86400, // 1 day in seconds
                                  }
                                },
                                isAdjustmentAllowed: true
                              }]);

                              console.log("Permission Granted Response:", grantedPermissions);

                              // The response contains the permissionContext
                              const context = grantedPermissions[0]?.context || grantedPermissions;

                              setFormData(prev => ({
                                ...prev,
                                permissionContext: {
                                  grantedAt: Date.now(),
                                  expiry: expiryDate,
                                  signer: sessionAccount.address,
                                  permissions: ["native-token-periodic"],
                                  limit: totalAmount,
                                  rawContext: context
                                },
                                sessionPrivateKey: sessionPrivateKey
                              }));

                            } catch (err: any) {
                              console.error("Advanced Permission Request Failed Object:", err);
                              alert(`Real Advanced Permission Failed:\nCode: ${err.code}\nMessage: ${err.message}\nData: ${JSON.stringify(err.data || err)}`);
                              // We do NOT fallback to dev mode here, as requested.
                              setFormData(prev => ({ ...prev, permissionContext: null, sessionPrivateKey: null }));
                            }
                          }
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Grant Auto-Payout Permission
                    </Button>
                  ) : (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="size-4 text-blue-400" />
                        <span className="text-sm text-blue-200 font-medium">Permission Granted</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-white/40 hover:text-white"
                        onClick={() => setFormData(prev => ({ ...prev, permissionContext: null }))}
                      >
                        Revoke
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Tasks */}
          {step === 4 && (
            <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <label className="text-sm text-white/40 font-medium">Entry Tasks</label>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTaskSelector(!showTaskSelector)}
                    className="rounded-lg bg-white text-black border-white/10 hover:bg-white/90"
                  >
                    <Plus className="size-4 mr-1" /> Add Task
                    <ChevronDown className={cn("size-4 ml-1 transition-transform", showTaskSelector && "rotate-180")} />
                  </Button>

                  {showTaskSelector && (
                    <div className="absolute right-0 top-full mt-2 z-50 bg-zinc-900 border border-white/10 rounded-xl shadow-xl w-72 max-h-80 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        {TASK_TYPES.map((task) => {
                          const Icon = task.icon
                          const isAdded = formData.tasks.some((t) => t.type === task.id)
                          return (
                            <button
                              key={task.id}
                              onClick={() => !isAdded && addTask(task)}
                              disabled={isAdded}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                                isAdded ? "opacity-50 cursor-not-allowed bg-white/5" : "hover:bg-white/10",
                              )}
                            >
                              <Icon className="size-4 text-white/60" />
                              <span className="text-sm">{task.label}</span>
                              {isAdded && <Check className="size-4 ml-auto text-green-400" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {formData.tasks.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-xl p-8 text-center">
                  <div className="size-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <Link2 className="size-6 text-white/40" />
                  </div>
                  <p className="text-white/40 text-sm">No tasks added yet</p>
                  <p className="text-white/20 text-xs mt-1">Click "Add Task" to create entry requirements</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.tasks.map((task) => {
                    const Icon = getTaskIcon(task.type)
                    return (
                      <div key={task.id} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center">
                              <Icon className="size-4" />
                            </div>
                            <span className="font-medium">{task.label}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTask(task.id)}
                            className="size-8 rounded-full text-white/40 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/40" />
                          <input
                            type="text"
                            value={task.url}
                            onChange={(e) => updateTaskUrl(task.id, e.target.value)}
                            placeholder={getTaskPlaceholder(task.type)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors text-sm"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {formData.tasks.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-white/60">
                    <span className="font-medium text-white">{formData.tasks.length}</span> task
                    {formData.tasks.length !== 1 && "s"} required to enter the giveaway
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                {/* Room Name */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h3 className="font-semibold text-sm text-white/60 uppercase tracking-wider mb-2">Room Name</h3>
                  <p className="text-2xl font-bold">{formData.name || "Untitled Room"}</p>
                </div>

                {/* Prize Summary */}
                <div className={cn(
                  "border rounded-xl p-4 space-y-3",
                  formData.rewardType === "instant"
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-purple-500/10 border-purple-500/20"
                )}>
                  <div className="flex items-center gap-2">
                    {formData.rewardType === "instant" ? (
                      <Zap className="size-4 text-emerald-400" />
                    ) : (
                      <Gift className="size-4 text-purple-400" />
                    )}
                    <h3 className="font-semibold text-sm uppercase tracking-wider">
                      {formData.rewardType === "instant" ? "Instant Reward" : "Giveaway Prizes"}
                    </h3>
                  </div>

                  {formData.rewardType === "instant" ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/40">Amount per Winner</span>
                        <span className="font-medium text-emerald-400">{formData.instantReward.amountPerWinner} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Number of Winners</span>
                        <span className="font-medium">{formData.instantReward.numberOfWinners}</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 flex justify-between">
                        <span className="text-white/60 font-medium">Total Prize Pool</span>
                        <span className="font-bold text-emerald-400">{getTotalPrizePool()} ETH</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.prizeTiers.map((tier, i) => (
                        <div key={tier.id} className="flex items-center justify-between">
                          <span className="text-white/40 flex items-center gap-2">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {tier.name}
                          </span>
                          <span className="font-medium">
                            {tier.amount} ETH x {tier.winners} winners
                          </span>
                        </div>
                      ))}
                      <div className="border-t border-white/10 pt-2 flex justify-between">
                        <span className="text-white/60 font-medium">Total Prize Pool</span>
                        <span className="font-bold text-purple-400">{getTotalPrizePool()} ETH</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tasks Summary */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <h3 className="font-semibold text-sm text-white/60 uppercase tracking-wider">
                    Entry Tasks ({formData.tasks.length})
                  </h3>
                  {formData.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {formData.tasks.map((task) => {
                        const Icon = getTaskIcon(task.type)
                        return (
                          <div key={task.id} className="flex items-center gap-2">
                            <Icon className="size-4 text-white/40" />
                            <span className="text-sm">{task.label}</span>
                            {task.url && <Check className="size-4 text-green-400 ml-auto" />}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">No tasks configured</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Success */}
          {step === 6 && (
            <div className="flex flex-col gap-6 animate-in zoom-in-95 duration-300">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
                <div className="size-16 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Check className="size-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Room Live!</h3>
                  <p className="text-white/60 text-sm mt-1">
                    Share this link with your community to start the giveaway.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-white/40 font-bold uppercase tracking-wider">Sharing Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono truncate text-white/80">
                    {typeof window !== "undefined" ? window.location.origin : ""}/room/{generatedId}
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-xl px-4 border-white/10 bg-transparent"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-white text-black hover:bg-white/90 rounded-xl"
                  onClick={() => window.open(`/room/${generatedId}`, "_blank")}
                >
                  <ExternalLink className="size-4 mr-2" />
                  View Room
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 6 && (
          <div className="p-6 border-t border-white/5 flex gap-3 shrink-0">
            {step > 1 && (
              <Button
                variant="outline"
                className="rounded-xl bg-transparent border-white/10"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
            <Button
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={(step === 3 && !formData.permissionContext) || (step === 4 && formData.tasks.length === 0)}
              onClick={() => {
                if (step < 5) setStep(step + 1)
                else handleCreateRoom()
              }}
            >
              {step === 3 && !formData.permissionContext
                ? "Grant Permission to Continue"
                : step === 4 && formData.tasks.length === 0
                  ? "Add at least one task"
                  : step === 5
                    ? "Create Room & Get Link"
                    : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
