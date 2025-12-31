"use client"

import { MetaMaskProvider } from "@metamask/sdk-react"
import type { ReactNode } from "react"

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <MetaMaskProvider
            debug={false}
            sdkOptions={{
                dappMetadata: {
                    name: "Touzi",
                    url: typeof window !== "undefined" ? window.location.host : "https://touzi.app",
                },
                checkInstallationImmediately: false,
            }}
        >
            {children}
        </MetaMaskProvider>
    )
}
