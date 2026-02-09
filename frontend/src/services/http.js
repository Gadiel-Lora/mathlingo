import axios from 'axios'
import { tokenStore } from './tokenStore'

export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001'

export const http = axios.create({
  baseURL: API_URL
})

http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    }
  }
  return config
})
