export type AdminConsoleCacheData = {
    posts: unknown[]
    users: unknown[]
    businessRequests: unknown[]
    ads: unknown[]
    reports: unknown[]
    geoLogs: unknown[]
}

export const ADMIN_CONSOLE_CACHE_TTL_MS = 2 * 60 * 1000

export const adminConsoleCache: {
    updatedAt: number
    data: AdminConsoleCacheData | null
    refreshing: boolean
} = {
    updatedAt: 0,
    data: null,
    refreshing: false,
}

export function invalidateAdminConsoleCache() {
    adminConsoleCache.updatedAt = 0
    adminConsoleCache.data = null
    adminConsoleCache.refreshing = false
}
