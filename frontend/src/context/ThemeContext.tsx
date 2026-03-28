import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ isDarkMode: true, toggleTheme: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    // Cargar preferencia (Por defecto nuestro diseño ya es Dark: Coastal Midnight)
    const stored = localStorage.getItem('elite-theme')
    if (stored === 'light') {
      setIsDarkMode(false)
    }
  }, [])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      // Tailwind utilities rely on .dark parent, while our base CSS already provides dark CSS variables
      localStorage.setItem('elite-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('elite-theme', 'light')
    }
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
