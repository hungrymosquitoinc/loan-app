import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { apiGet, apiPut } from '../lib/api'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    try {
      const data = await apiGet('/notifications')
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    } catch {}
  }, [user])

  const fetchUnreadCount = useCallback(async () => {
    if (!user || user.role !== 'admin') return
    try {
      const data = await apiGet('/notifications/unread-count')
      setUnreadCount(data.count)
    } catch {}
  }, [user])

  const markAsRead = useCallback(async (id) => {
    try {
      await apiPut(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {}
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await apiPut('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications, fetchUnreadCount])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
