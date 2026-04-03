import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type AdminRole = 'admin' | 'superadmin'

type AdminRoleRow = {
  user_id: string
  role: AdminRole
}

const FALLBACK_SUPERADMIN_EMAILS = ['tim.felsky@gmail.com']

export function isAdminRoleSchemaMissing(message?: string | null) {
  if (!message) return false

  return (
    message.includes("relation 'public.admin_roles'") ||
    message.includes('relation "public.admin_roles"') ||
    message.includes("Could not find the relation 'public.admin_roles'")
  )
}

function fallbackRoleForEmail(email?: string | null): AdminRole | null {
  if (!email) return null
  return FALLBACK_SUPERADMIN_EMAILS.includes(email) ? 'superadmin' : null
}

export async function getAdminAccessForUser(user?: User | null) {
  const fallbackRole = fallbackRoleForEmail(user?.email)

  if (!user) {
    return {
      role: null as AdminRole | null,
      isAdmin: false,
      isSuperadmin: false,
      source: 'none' as 'table' | 'fallback' | 'none',
      schemaMissing: false,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admin_roles')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    if (isAdminRoleSchemaMissing(error.message)) {
      return {
        role: fallbackRole,
        isAdmin: fallbackRole != null,
        isSuperadmin: fallbackRole === 'superadmin',
        source: fallbackRole ? ('fallback' as const) : ('none' as const),
        schemaMissing: true,
      }
    }

    return {
      role: fallbackRole,
      isAdmin: fallbackRole != null,
      isSuperadmin: fallbackRole === 'superadmin',
      source: fallbackRole ? ('fallback' as const) : ('none' as const),
      schemaMissing: false,
    }
  }

  const row = data as AdminRoleRow | null
  const role = row?.role ?? fallbackRole

  return {
    role,
    isAdmin: role === 'admin' || role === 'superadmin',
    isSuperadmin: role === 'superadmin',
    source: row?.role ? ('table' as const) : fallbackRole ? ('fallback' as const) : ('none' as const),
    schemaMissing: false,
  }
}

export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const access = await getAdminAccessForUser(user)
  if (!user || !access.isAdmin) {
    throw new Error('Unauthorized')
  }

  return { supabase, user, access }
}

export async function requireSuperadmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const access = await getAdminAccessForUser(user)
  if (!user || !access.isSuperadmin) {
    throw new Error('Unauthorized')
  }

  return { supabase, user, access }
}
