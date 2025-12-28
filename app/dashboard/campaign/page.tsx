import { Suspense } from "react"
import CampaignsContent from "./campaigns-content"
import CampaignsLoading from "./loading"

export default function CampaignsPage() {
  return (
    <Suspense fallback={<CampaignsLoading />}>
      <CampaignsContent />
    </Suspense>
  )
}
