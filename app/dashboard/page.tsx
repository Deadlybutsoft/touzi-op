"use client"
import { Suspense } from "react"
import DashboardContent from "./dashboard-content"

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

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}
