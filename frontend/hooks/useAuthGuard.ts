"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getMe } from "@/services/api"
import { useUser } from "@/hooks/useUser"

export function useAuthGuard(requiredRoles?: string[]) {
  const router = useRouter()
  const { user, isLoading } = useUser()
  const [roles, setRoles] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      if (isLoading) return
      if (!user) {
        router.push("/login")
        return
      }
      try {
        const me = await getMe()
        setRoles(me.roles || [])
        if (requiredRoles && requiredRoles.length > 0) {
          const ok = me.roles?.some(r => requiredRoles.includes(r))
          if (!ok) {
            router.push("/main")
            return
          }
        }
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [user, isLoading, requiredRoles, router])

  return { user, roles, loading }
}