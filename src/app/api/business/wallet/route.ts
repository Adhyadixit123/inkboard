import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Get wallet balance and recent transactions
export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    try {
        // Get wallet info
        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('id, balance, currency, created_at, updated_at')
            .eq('user_id', user.id)
            .single()

        if (!wallet) {
            // Create wallet for business users with $10 bonus
            if (await supabaseAdmin.from('users').select('is_business').eq('id', user.id).single().then(r => r.data?.is_business)) {
                const walletId = await supabaseAdmin.rpc('create_wallet_for_business_user', { p_user_id: user.id })
                const { data: newWallet } = await supabaseAdmin
                    .from('wallets')
                    .select('id, balance, currency, created_at, updated_at')
                    .eq('id', walletId)
                    .single()
                
                return NextResponse.json({
                    success: true,
                    wallet: newWallet,
                    transactions: [],
                    isNewWallet: true
                })
            }
            
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
        }

        // Get recent transactions
        const { data: transactions } = await supabaseAdmin
            .from('wallet_transactions')
            .select('*')
            .eq('wallet_id', wallet.id)
            .order('created_at', { ascending: false })
            .limit(limit)

        // Get payment methods
        const { data: paymentMethods } = await supabaseAdmin
            .from('wallet_payment_methods')
            .select('*')
            .eq('wallet_id', wallet.id)
            .eq('is_active', true)
            .order('is_default', { ascending: false })

        return NextResponse.json({
            success: true,
            wallet,
            transactions: transactions || [],
            paymentMethods: paymentMethods || []
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch wallet'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// Add credits to wallet (for testing/admin)
export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { amount, description, referenceType, metadata } = body

    if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    try {
        const success = await supabaseAdmin.rpc('add_wallet_credits', {
            p_user_id: user.id,
            p_amount: amount,
            p_description: description || 'Credit purchase',
            p_reference_type: referenceType || 'credit_purchase',
            p_metadata: metadata || {}
        })

        if (success) {
            // Get updated wallet
            const { data: wallet } = await supabaseAdmin
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .single()

            return NextResponse.json({
                success: true,
                newBalance: wallet?.balance || 0
            })
        } else {
            return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 })
        }

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add credits'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
