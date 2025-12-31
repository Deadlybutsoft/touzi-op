
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CHAIN } from "@/lib/constants";

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // In a real app, use SERVICE_ROLE_KEY for admin rights
);

export async function POST(req: Request) {
    try {
        const { campaignId, walletAddress } = await req.json();

        if (!campaignId || !walletAddress) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // 1. Fetch Campaign Logic (Securely on Server)
        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from("campaigns")
            .select("*")
            .eq("id", campaignId)
            .single();

        if (campaignError || !campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        // Check if it's an instant reward campaign
        if (campaign.reward_type !== "instant" || !campaign.instant_reward) {
            return NextResponse.json({ error: "Not an instant reward campaign" }, { status: 400 });
        }

        // 2. Check Submission Status
        const { data: participant, error: participantError } = await supabaseAdmin
            .from("participants")
            .select("*")
            .eq("campaign_id", campaignId)
            .eq("wallet_address", walletAddress)
            .single();

        if (participantError || !participant) {
            return NextResponse.json({ error: "No submission found" }, { status: 404 });
        }

        if (participant.reward_paid) {
            return NextResponse.json({ message: "Reward already paid" }, { status: 200 });
        }

        // 3. Execute Payout (Server-Side)
        console.log(`Processing payout for ${walletAddress} on campaign ${campaignId}`);

        if (!campaign.session_private_key) {
            return NextResponse.json({ error: "No session key found for campaign" }, { status: 500 });
        }

        const sessionAccount = privateKeyToAccount(campaign.session_private_key as `0x${string}`);
        const client = createWalletClient({
            account: sessionAccount,
            chain: CHAIN,
            transport: http(),
        });

        const amountToPay = campaign.instant_reward.amountPerWinner;

        // Sign and Execute Transaction (Simplified for Demo - normally requires UserOp for 4337)
        // For this hackathon demo where we might just be simulating or using a simpler flow:
        // We will simulate the "Action" of paying out by signing a message or sending a TX if supported.
        // Given the context of "Advanced Permissions", we are likely acting as the "Cosigner" or "Session Key" authority.

        // Real Transaction execution:
        const hash = await client.sendTransaction({
            to: walletAddress as `0x${string}`,
            value: parseEther(amountToPay),
            kzg: undefined // Optional depending on chain
        });

        console.log("Payout Transaction Hash:", hash);

        // 4. Update Database
        const { error: updateError } = await supabaseAdmin
            .from("participants")
            .update({
                reward_paid: true,
                reward_amount: amountToPay,
                // tx_hash: hash // If we had a column for this
            })
            .eq("id", participant.id);

        if (updateError) {
            console.error("Failed to update participant status:", updateError);
            return NextResponse.json({ error: "Payout sent but DB update failed", txHash: hash }, { status: 500 });
        }

        return NextResponse.json({ success: true, txHash: hash });

    } catch (error: any) {
        console.error("Payout API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
