import { Analytics } from '@vercel/analytics/react'
import { AwardsPage } from './pages/AwardsPage'

function App() {
  return (
    <>
      <AwardsPage />
      <Analytics />
    </>
  )
}

export default App
