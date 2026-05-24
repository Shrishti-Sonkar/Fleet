import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

export function useTokens() {
  const { user, userDoc, refreshUserDoc } = useAuth()

  const tokensRemaining = userDoc?.tokens ?? 0
  const tokensUsed = userDoc?.tokensUsed ?? 0

  // Deduct tokens after hourly ride — rounds up to nearest hour
  const deductTokens = async (hoursUsed) => {
    if (!user) return
    const toDeduct = Math.ceil(hoursUsed)
    await updateDoc(doc(db, 'users', user.uid), {
      tokens: increment(-toDeduct),
      tokensUsed: increment(toDeduct),
      updatedAt: serverTimestamp(),
    })
    await refreshUserDoc()
  }

  // Add tokens — admin gift, purchase, referral reward
  const addTokens = async (amount) => {
    if (!user) return
    await updateDoc(doc(db, 'users', user.uid), {
      tokens: increment(amount),
      updatedAt: serverTimestamp(),
    })
    await refreshUserDoc()
  }

  // Check if user can afford an hourly booking
  const hasEnoughTokens = (hours) => tokensRemaining >= Math.ceil(hours)

  return { tokensRemaining, tokensUsed, deductTokens, addTokens, hasEnoughTokens }
}
