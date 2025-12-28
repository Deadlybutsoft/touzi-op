import { GradientBackground } from "@/components/gradient-background"
import { Instrument_Serif } from "next/font/google"
import { Button } from "@/components/ui/button"
import { Github, Wallet } from "lucide-react"
import Link from "next/link"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
})

export default function Page() {
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

      <section className="px-6 flex flex-col items-center gap-8">
        <h1
          className={`${instrumentSerif.className} text-white text-center text-balance font-normal tracking-tight text-7xl`}
        >
          {"Host Giveaway Rooms With Security And Transparency"}
        </h1>

        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button size="lg" className="rounded-full px-8 bg-white text-black hover:bg-white/90 cursor-pointer">
              <Wallet className="size-4" />
              Connect Wallet
            </Button>
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="rounded-full px-8 border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent"
          >
            <Github className="size-4" />
            View GitHub
          </Button>
        </div>
      </section>
    </main>
  )
}
