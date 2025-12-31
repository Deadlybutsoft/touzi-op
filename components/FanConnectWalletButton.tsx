"use client"

import { useSDK } from "@metamask/sdk-react"
import { Button } from "@/components/ui/button"
import { Wallet, Loader2 } from "lucide-react"

export const FanConnectWalletButton = () => {
    const { sdk, connected, connecting, account, ready } = useSDK()

    const connect = async () => {
        try {
            await sdk?.connect()
        } catch (err) {
            console.warn("failed to connect..", err)
        }
    }

    const disconnect = () => {
        if (sdk) {
            sdk.terminate()
        }
    }

    if (connected && account) {
        return (
            <Button
                size="sm"
                variant="outline"
                className="rounded-full px-4 border-white/20 text-white hover:bg-white/10 bg-white/5"
                onClick={disconnect}
            >
                <Wallet className="size-4" />
                {account.slice(0, 6)}...{account.slice(-4)}
            </Button>
        )
    }

    return (
        <Button
            size="sm"
            className="rounded-full px-6 bg-white text-black hover:bg-white/90"
            onClick={connect}
            disabled={connecting || !ready}
        >
            {connecting || !ready ? (
                <Loader2 className="size-4 animate-spin" />
            ) : (
                <Wallet className="size-4" />
            )}
            {!ready ? "Loading..." : connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
    )
}
