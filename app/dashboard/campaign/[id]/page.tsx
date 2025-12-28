import { Suspense } from "react"
import CampaignDetailContent from "./campaign-detail-content"

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <Suspense fallback={<CampaignLoading />}>
      <CampaignDetailContent id={id} />
    </Suspense>
  )
}

function CampaignLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  )
}
