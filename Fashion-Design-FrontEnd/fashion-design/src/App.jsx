import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import TopBar from './components/TopBar'
import { SettingsProvider } from './context/SettingsContext'
import AddClientPage from './pages/AddClientPage'
import ChooseClientPage from './pages/ChooseClientPage'
import ClientPage from './pages/ClientPage'
import ClientsPage from './pages/ClientsPage'
import HomePage from './pages/HomePage'
import OrdersPage from './pages/OrdersPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 30, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <BrowserRouter>
          <TopBar />
          <Routes>
            <Route path="/"                      element={<HomePage />} />
            <Route path="/clients"               element={<ClientsPage />} />
            <Route path="/clients/new"           element={<AddClientPage />} />
            <Route path="/clients/:id"           element={<ClientPage />} />
            <Route path="/clients/:id/edit"      element={<AddClientPage />} />
            <Route path="/orders"                element={<OrdersPage />} />
            <Route path="/orders/choose-client"  element={<ChooseClientPage />} />
          </Routes>
        </BrowserRouter>
      </SettingsProvider>
    </QueryClientProvider>
  )
}
