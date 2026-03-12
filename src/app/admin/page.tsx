import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminClient } from './AdminConsole'

export default async function AdminPage() {
    const supabase = await createClient()

    const {
        data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?redirect=/admin')
    }

    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (profile?.role !== 'ADMIN') {
        redirect('/')
    }

    return <AdminClient />
}
