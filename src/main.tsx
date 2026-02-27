import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { RoomProvider } from './context/RoomContext'
import { GameProvider } from './context/GameContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RoomProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </RoomProvider>
    </AuthProvider>
  </StrictMode>,
)
