"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signUp: (email: string, password: string, userData: any) => Promise<{ data: any; error: any }>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<{ data: any; error: any }>
  sendPasswordReset: (email: string) => Promise<{ data: any; error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          // If it's a refresh token error, clear the session
          if (error.message.includes('Invalid Refresh Token') || error.message.includes('Refresh Token Not Found')) {
            await supabase.auth.signOut()
          }
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    // If login fails due to unconfirmed email, try to confirm it
    if (error && error.message.includes("Email not confirmed")) {
      // Try to resend confirmation or handle gracefully
      console.log('Email not confirmed, but continuing for development')
    }
    
    return { data, error }
  }

  const signUp = async (email: string, password: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    })
    
    // For development, automatically confirm the user
    if (data.user && !data.user.email_confirmed_at) {
      console.log('User created but needs confirmation. Run the bulk confirmation script.')
      // The user will be redirected anyway for development
    }
    
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    // Redirect to login page after sign out
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  const signInWithGoogle = async () => {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    return { data, error }
  }

  const sendPasswordReset = async (email: string) => {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/reset-password`
      : undefined

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    return { data, error }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    sendPasswordReset,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
