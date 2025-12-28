import { Skeleton } from "@/components/ui/skeleton"

export default function CampaignsLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 mt-2 bg-white/10" />
        </div>
        <Skeleton className="h-10 w-40 bg-white/10" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 bg-white/10 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64 bg-white/10 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
