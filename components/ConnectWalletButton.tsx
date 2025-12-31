"use client"

import { useSDK } from "@metamask/sdk-react"
import { Button } from "@/components/ui/button"

export const ConnectWalletButton = () => {
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
            <div className="flex items-center bg-white/5 border border-white/10 rounded-full py-1 pl-4 pr-1 gap-4">
                <span className="text-xs font-medium text-white/60">
                    {account.slice(0, 6)}...{account.slice(-4)}
                </span>
                <div
                    className="size-7 rounded-full bg-gradient-to-tr from-green-400 to-emerald-500 border border-white/20 flex-shrink-0 cursor-pointer"
                    onClick={disconnect}
                    title="Disconnect"
                />
            </div>
        )
    }

    return (
        <Button
            onClick={connect}
            disabled={connecting || !ready}
            className="bg-white/10 text-white hover:bg-white/20 border border-white/10 rounded-full"
        >
            {!ready ? "Loading..." : connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
    )
}
