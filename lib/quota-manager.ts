// Shared quota management system for both aptitude and coding modules
export interface QuotaInfo {
  remaining: number
  total: number
  lastUpdated: number
  apiKeyIndex: number // Track which API key is being used
}

export interface ApiKeyInfo {
  key: string
  quota: QuotaInfo
  isActive: boolean
}

export class QuotaManager {
  private static readonly QUOTA_KEY = 'openrouter_quota_info'
  private static readonly STATUS_KEY = 'openrouter_api_status'
  private static readonly STATUS_TIME_KEY = 'openrouter_api_status_time'
  private static readonly API_KEYS_KEY = 'openrouter_api_keys_info'
  private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  // Get API keys from environment variables
  static getApiKeys(): ApiKeyInfo[] {
    const keys = [
      process.env.OPENROUTER_API_KEY,
      process.env.OPENROUTER_API_KEY_2,
      process.env.OPENROUTER_API_KEY_3
    ].filter(Boolean) as string[]

    return keys.map((key, index) => ({
      key,
      quota: {
        remaining: 50, // Default quota
        total: 50,
        lastUpdated: Date.now(),
        apiKeyIndex: index
      },
      isActive: index === 0 // Primary key is active by default
    }))
  }

  // Check if a backup API key exists (client-side only since server can't switch)
  static hasBackupApiKey(): boolean {
    // On server, we can only check envs; treat presence of a second key as backup
    if (typeof window === 'undefined') {
      const keys = [process.env.OPENROUTER_API_KEY_2, process.env.OPENROUTER_API_KEY_3].filter(Boolean)
      return keys.length > 0
    }

    try {
      const cached = localStorage.getItem(this.API_KEYS_KEY)
      if (cached) {
        const apiKeysData = JSON.parse(cached) as ApiKeyInfo[]
        // Any non-active key counts as a potential backup
        return apiKeysData.some((keyInfo) => !keyInfo.isActive)
      }
    } catch (error) {
      console.error('Error reading backup API key info from cache:', error)
    }
    return false
  }

  // Get current active API key
  static getCurrentApiKey(): string | null {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      const serverKeys = [
        process.env.OPENROUTER_API_KEY,
        process.env.OPENROUTER_API_KEY_2,
        process.env.OPENROUTER_API_KEY_3
      ].filter(Boolean) as string[]
      return serverKeys.length > 0 ? serverKeys[0] : null
    }

    try {
      const cached = localStorage.getItem(this.API_KEYS_KEY)
      if (cached) {
        const apiKeysData = JSON.parse(cached)
        const activeKey = apiKeysData.find((keyInfo: ApiKeyInfo) => keyInfo.isActive)
        if (activeKey) {
          return activeKey.key
        }
      }
    } catch (error) {
      console.error('Error reading API keys from cache:', error)
    }

    // Fallback to environment variable
    return process.env.OPENROUTER_API_KEY || null
  }

  // Switch to backup API key when primary is exhausted
  static switchToBackupApiKey(): boolean {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return false
    }

    try {
      const cached = localStorage.getItem(this.API_KEYS_KEY)
      if (cached) {
        const apiKeysData = JSON.parse(cached)
        const backupKey = apiKeysData.find((keyInfo: ApiKeyInfo) => keyInfo.quota.apiKeyIndex === 1)

        if (backupKey) {
          // Deactivate current key
          apiKeysData.forEach((keyInfo: ApiKeyInfo) => {
            keyInfo.isActive = false
          })

          // Activate backup key
          backupKey.isActive = true
          backupKey.quota.lastUpdated = Date.now()

          localStorage.setItem(this.API_KEYS_KEY, JSON.stringify(apiKeysData))
          return true
        }
      }
    } catch (error) {
      console.error('Error switching to backup API key:', error)
    }
    return false
  }

  // Initialize API keys data
  static initializeApiKeys(): void {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return
    }

    try {
      const apiKeys = this.getApiKeys()
      localStorage.setItem(this.API_KEYS_KEY, JSON.stringify(apiKeys))
    } catch (error) {
      console.error('Error initializing API keys:', error)
    }
  }

  // Get current quota info from localStorage
  static getQuotaInfo(): QuotaInfo | null {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const cached = localStorage.getItem(this.API_KEYS_KEY)
      if (cached) {
        const apiKeysData = JSON.parse(cached)
        const activeKey = apiKeysData.find((keyInfo: ApiKeyInfo) => keyInfo.isActive)
        if (activeKey) {
          // Check if cache is still valid (within 5 minutes)
          const now = Date.now()
          if (now - activeKey.quota.lastUpdated < this.CACHE_DURATION) {
            return activeKey.quota
          }
        }
      }
    } catch (error) {
      console.error('Error reading quota info from cache:', error)
    }
    return null
  }

  // Set quota info in localStorage
  static setQuotaInfo(quotaInfo: QuotaInfo): void {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return
    }

    try {
      const cached = localStorage.getItem(this.API_KEYS_KEY)
      if (cached) {
        const apiKeysData = JSON.parse(cached)
        const activeKeyIndex = apiKeysData.findIndex((keyInfo: ApiKeyInfo) => keyInfo.isActive)
        if (activeKeyIndex !== -1) {
          apiKeysData[activeKeyIndex].quota = { ...quotaInfo, lastUpdated: Date.now() }
          localStorage.setItem(this.API_KEYS_KEY, JSON.stringify(apiKeysData))
        }
      }
    } catch (error) {
      console.error('Error saving quota info to cache:', error)
    }
  }

  // Decrease quota by 1 (when making API call)
  static decreaseQuota(): QuotaInfo {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return { remaining: 0, total: 0, lastUpdated: Date.now(), apiKeyIndex: 0 }
    }

    try {
      const current = this.getQuotaInfo()
      if (current) {
        const newQuota = {
          remaining: Math.max(0, current.remaining - 1),
          total: current.total,
          lastUpdated: Date.now(),
          apiKeyIndex: current.apiKeyIndex
        }

        this.setQuotaInfo(newQuota)
        return newQuota
      } else {
        // Initialize if not exists
        const newQuota = { remaining: 49, total: 50, lastUpdated: Date.now(), apiKeyIndex: 0 }
        this.initializeApiKeys()
        this.setQuotaInfo(newQuota)
        return newQuota
      }
    } catch (error) {
      console.error('Error decreasing quota:', error)
      return { remaining: 0, total: 0, lastUpdated: Date.now(), apiKeyIndex: 0 }
    }
  }

  // Reset quota (when API status changes)
  static resetQuota(total: number = 50): QuotaInfo {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return { remaining: total, total, lastUpdated: Date.now(), apiKeyIndex: 0 }
    }

    try {
      const newQuota = { remaining: total, total, lastUpdated: Date.now(), apiKeyIndex: 0 }
      this.setQuotaInfo(newQuota)
      return newQuota
    } catch (error) {
      console.error('Error resetting quota:', error)
      return { remaining: total, total, lastUpdated: Date.now(), apiKeyIndex: 0 }
    }
  }

  // Get API status from cache
  static getApiStatus(): "online" | "offline" | "quota-exceeded" {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return "offline"
    }

    try {
      const cached = localStorage.getItem(this.STATUS_KEY)
      const cachedTime = localStorage.getItem(this.STATUS_TIME_KEY)

      if (cached && cachedTime) {
        const timeSinceUpdate = Date.now() - parseInt(cachedTime)
        if (timeSinceUpdate < this.CACHE_DURATION) {
          return cached as "online" | "offline" | "quota-exceeded"
        }
      }
    } catch (error) {
      console.error('Error reading API status from cache:', error)
    }
    return "offline"
  }

  // Set API status in cache
  static setApiStatus(status: "online" | "offline" | "quota-exceeded"): void {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem(this.STATUS_KEY, status)
      localStorage.setItem(this.STATUS_TIME_KEY, Date.now().toString())
    } catch (error) {
      console.error('Error saving API status to cache:', error)
    }
  }

  // Check if quota is low (less than 100 requests)
  static isQuotaLow(): boolean {
    const quota = this.getQuotaInfo()
    return quota ? quota.remaining <= 100 : false
  }

  // Check if quota is exhausted
  static isQuotaExhausted(): boolean {
    const quota = this.getQuotaInfo()
    return quota ? quota.remaining <= 0 : false
  }

  // Check if we should wait before making API calls (rate limiting)
  static shouldWaitForRateLimit(): boolean {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return false
    }

    try {
      const lastCall = localStorage.getItem('openrouter_last_call_time')
      if (lastCall) {
        const timeSinceLastCall = Date.now() - parseInt(lastCall)
        const minInterval = 2000 // 2 seconds between calls
        return timeSinceLastCall < minInterval
      }
    } catch (error) {
      console.error('Error checking rate limit:', error)
    }
    return false
  }

  // Record API call time for rate limiting
  static recordApiCall(): void {
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem('openrouter_last_call_time', Date.now().toString())
    } catch (error) {
      console.error('Error recording API call time:', error)
    }
  }
}