import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './presentation/workspace/App.jsx'
import { workspace, previews, readCustomerPresentation } from './bootstrap/workspace.js'
import { assistant } from './bootstrap/assistant.js'
import CustomerApp from './presentation/preview/CustomerApp.jsx'


const customer = !!window.creativaCustomer || new URL(location.href).searchParams.has('presentacion')
createRoot(document.getElementById('root')).render(
  customer ? <CustomerApp read={readCustomerPresentation}/> : <StrictMode>
    <App workspace={workspace} previews={previews} assistant={assistant} />
  </StrictMode>,
)
