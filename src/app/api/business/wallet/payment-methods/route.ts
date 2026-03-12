import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Add payment method to wallet
export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { 
        methodType, 
        provider, 
        providerPaymentMethodId, 
        lastFour, 
        cardBrand, 
        expiryMonth, 
        expiryYear,
        isDefault 
    } = body

    if (!methodType) {
        return NextResponse.json({ error: 'Method type is required' }, { status: 400 })
    }

    try {
        // Get user's wallet
        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (!wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
        }

        // If setting as default, unset other defaults
        if (isDefault) {
            await supabaseAdmin
                .from('wallet_payment_methods')
                .update({ is_default: false })
                .eq('wallet_id', wallet.id)
        }

        // Add payment method
        const { data: paymentMethod, error } = await supabaseAdmin
            .from('wallet_payment_methods')
            .insert({
                wallet_id: wallet.id,
                method_type: methodType,
                provider,
                provider_payment_method_id: providerPaymentMethodId,
                last_four: lastFour,
                card_brand: cardBrand,
                expiry_month: expiryMonth,
                expiry_year: expiryYear,
                is_default: isDefault || false
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            success: true,
            paymentMethod
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add payment method'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// Remove payment method
export async function DELETE(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const paymentMethodId = searchParams.get('id')

    if (!paymentMethodId) {
        return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 })
    }

    try {
        // Verify ownership
        const { data: paymentMethod } = await supabaseAdmin
            .from('wallet_payment_methods')
            .select('wallet_id, last_four, card_brand, expiry_month, expiry_year')
            .eq('id', paymentMethodId)
            .single()

        if (!paymentMethod) {
            return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
        }

        // Verify wallet ownership
        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('user_id')
            .eq('id', paymentMethod.wallet_id)
            .single()

        if (wallet?.user_id !== user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Deactivate payment method
        const { error } = await supabaseAdmin
            .from('wallet_payment_methods')
            .update({ is_active: false })
            .eq('id', paymentMethodId)

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: 'Payment method removed'
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove payment method'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
