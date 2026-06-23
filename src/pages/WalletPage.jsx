import { useAuth } from '../context/AuthContext'
import { useTokens } from '../hooks/useTokens'
import PageLayout from '../components/layout/PageLayout'

const packs = [
  { tokens: 10, price: 199 },
  { tokens: 25, price: 449 },
  { tokens: 60, price: 999 },
]

export default function WalletPage() {
  const { userDoc } = useAuth()
  const { addTokens } = useTokens()

  return (
    <PageLayout>
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-on-surface">Wallet and Tokens</h1>
        <p className="mt-2 text-secondary">Use tokens for hourly bookings and quick ride extensions.</p>

        <section className="mt-8 bg-primary-container text-white rounded-2xl p-6">
          <p className="text-white/70 text-sm font-bold uppercase">Available tokens</p>
          <p className="mt-2 text-5xl font-black">{userDoc?.tokens ?? 0}</p>
          <p className="mt-3 text-white/80">Used: {userDoc?.tokensUsed ?? 0}</p>
        </section>

        <section className="mt-8 grid md:grid-cols-3 gap-4">
          {packs.map((pack) => (
            <div key={pack.tokens} className="bg-white border border-outline-variant rounded-2xl p-5">
              <p className="text-3xl font-black text-on-surface">{pack.tokens}</p>
              <p className="text-secondary">tokens</p>
              <p className="mt-4 font-bold text-primary-container">Rs {pack.price}</p>
              <button
                onClick={() => addTokens(pack.tokens)}
                className="mt-5 w-full h-10 rounded-xl bg-on-surface text-white font-bold"
              >
                Add Tokens
              </button>
            </div>
          ))}
        </section>
      </main>
    </PageLayout>
  )
}
