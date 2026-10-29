import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function RealtimeSync() {
  const client = useQueryClient()
  useEffect(() => {
    if (!supabase) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const channel = supabase.channel('store-changes')
    for (const table of [
      'products',
      'product_images',
      'brands',
      'categories',
      'device_models',
      'promotions',
      'promotion_products',
      'reviews',
      'store_settings',
      'trade_in_requests',
    ]) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          void client.invalidateQueries({ queryKey: ['store'] })
          void client.invalidateQueries({ queryKey: ['admin-data'] })
        }, 500)
      })
    }
    channel.subscribe()
    return () => {
      clearTimeout(timer)
      void supabase?.removeChannel(channel)
    }
  }, [client])
  return null
}
