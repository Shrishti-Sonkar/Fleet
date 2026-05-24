import { createContext, useContext, useState } from 'react'

const PriceContext = createContext(null)

export function PriceProvider({ children }) {
  const [priceMode, setPriceMode] = useState('daily') // 'daily' | 'hourly'

  const togglePriceMode = () =>
    setPriceMode((prev) => (prev === 'daily' ? 'hourly' : 'daily'))

  return (
    <PriceContext.Provider value={{ priceMode, setPriceMode, togglePriceMode }}>
      {children}
    </PriceContext.Provider>
  )
}

export const usePriceMode = () => useContext(PriceContext)
