import { useState, useEffect, useRef } from 'react'

const API_BASE_URL = 'http://localhost:3000'

// Mapeamento de status para mensagens amigáveis
const ORDER_STATUS_MESSAGES = {
  PENDING: 'Pedido recebido',
  IN_INVENTORY: 'Verificando estoque...',
  INVENTORY_CONFIRMED: 'Estoque reservado',
  IN_PAYMENT: 'Processando pagamento...',
  PAYMENT_CONFIRMED: 'Pagamento aprovado',
  IN_SHIPPING: 'Preparando envio...',
  SHIPPED: 'Pedido enviado',
  COMPLETED: 'Pedido entregue',
  CANCELLED: 'Pedido cancelado',
  PROCESSING: 'Processando...',
}

// Mapeamento de serviços para cores
const SERVICE_COLORS = {
  'gateway': '#667eea',
  'inventory-service': '#f59e0b',
  'payment-service': '#10b981',
  'shipping-service': '#3b82f6',
  'order-service': '#ef4444',
}

function App() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [orderUpdates, setOrderUpdates] = useState({}) // Histórico de atualizações por pedido
  const [quantities, setQuantities] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [sseConnected, setSseConnected] = useState(false)
  const eventSourceRef = useRef(null)

  useEffect(() => {
    fetchProducts()
    fetchOrders()
    connectSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const connectSSE = () => {
    console.log('Conectando ao SSE...')
    const eventSource = new EventSource(`${API_BASE_URL}/orders/events`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('SSE conectado!')
      setSseConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('SSE event received:', data)

        // Atualizar o histórico de atualizações do pedido
        setOrderUpdates(prev => ({
          ...prev,
          [data.orderId]: [
            ...(prev[data.orderId] || []),
            {
              status: data.status,
              message: data.message,
              timestamp: new Date(data.timestamp),
              service: data.service,
            }
          ]
        }))

        // Atualizar o status do pedido na lista
        setOrders(prevOrders => {
          return prevOrders.map(order => {
            if (order.id === data.orderId) {
              return { ...order, status: data.status }
            }
            return order
          })
        })

        // Atualizar produtos se foi cancelado por estoque
        if (data.status === 'CANCELLED' || data.status === 'COMPLETED') {
          fetchProducts()
        }
      } catch (error) {
        console.error('Erro ao processar evento SSE:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Erro SSE:', error)
      setSseConnected(false)
      // Tentar reconectar após 3 segundos
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }
        connectSSE()
      }, 3000)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`)
      const data = await response.json()
      setProducts(data)

      const initialQuantities = {}
      data.forEach(product => {
        initialQuantities[product.id] = 1
      })
      setQuantities(initialQuantities)
      setLoading(false)
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar produtos' })
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`)
      const data = await response.json()
      setOrders(data.sort((a, b) => b.id - a.id))
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error)
    }
  }

  const handleQuantityChange = (productId, value) => {
    const quantity = parseInt(value)
    if (quantity > 0) {
      setQuantities({ ...quantities, [productId]: quantity })
    }
  }

  const handleBuy = async (product) => {
    const quantity = quantities[product.id]

    if (quantity > product.stock) {
      setMessage({
        type: 'error',
        text: `Estoque insuficiente! Disponível: ${product.stock}`
      })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: 1,
          items: [
            {
              productId: product.id,
              quantity: quantity
            }
          ]
        }),
      })

      if (response.ok) {
        const order = await response.json()
        setMessage({
          type: 'success',
          text: `Pedido #${order.id} criado! Acompanhe o status abaixo.`
        })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
        // Adicionar o novo pedido à lista
        setOrders(prev => [order, ...prev])
      } else {
        throw new Error('Erro ao criar pedido')
      }
    } catch (error) {
      console.error('Erro ao comprar:', error)
      setMessage({ type: 'error', text: 'Erro ao processar compra' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  const getStatusClass = (status) => {
    if (status === 'COMPLETED') return 'status-COMPLETED'
    if (status === 'CANCELLED') return 'status-CANCELLED'
    if (status === 'PENDING') return 'status-PENDING'
    return 'status-PROCESSING'
  }

  const getStatusMessage = (status) => {
    return ORDER_STATUS_MESSAGES[status] || status
  }

  if (loading) {
    return <div className="loading">Carregando produtos...</div>
  }

  return (
    <div className="app">
      <header className="header">
        <h1>E-commerce com Microserviços</h1>
        <p>Sistema distribuído com RabbitMQ</p>
        <div className={`sse-status ${sseConnected ? 'connected' : 'disconnected'}`}>
          {sseConnected ? '● Conectado em tempo real' : '○ Reconectando...'}
        </div>
      </header>

      {message.text && (
        <div className={message.type}>
          {message.text}
        </div>
      )}

      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <h3 className="product-name">{product.name}</h3>
            <div className="product-info">
              <span className="product-price">
                R$ {product.price.toFixed(2)}
              </span>
              <span className="product-stock">
                Estoque: {product.stock}
              </span>
            </div>
            <div className="quantity-control">
              <label htmlFor={`qty-${product.id}`}>Quantidade:</label>
              <input
                id={`qty-${product.id}`}
                type="number"
                min="1"
                max={product.stock}
                value={quantities[product.id] || 1}
                onChange={(e) => handleQuantityChange(product.id, e.target.value)}
              />
            </div>
            <button
              className="buy-button"
              onClick={() => handleBuy(product)}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? 'Sem Estoque' : 'Comprar'}
            </button>
          </div>
        ))}
      </div>

      <section className="orders-section">
        <h2>Meus Pedidos</h2>
        {orders.length === 0 ? (
          <div className="empty-state">
            Nenhum pedido realizado ainda
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <span className="order-id">Pedido #{order.id}</span>
                  <span className={`order-status ${getStatusClass(order.status)}`}>
                    {getStatusMessage(order.status)}
                  </span>
                </div>
                <div className="order-items">
                  {order.items.map((item, idx) => (
                    <div key={idx}>
                      {item.quantity}x Produto #{item.productId}
                    </div>
                  ))}
                </div>
                <div className="order-total">
                  Total: R$ {order.total.toFixed(2)}
                </div>

                {/* Timeline de atualizações */}
                {orderUpdates[order.id] && orderUpdates[order.id].length > 0 && (
                  <div className="order-timeline">
                    <h4>Histórico de Status</h4>
                    {orderUpdates[order.id].map((update, idx) => (
                      <div key={idx} className="timeline-item">
                        <div
                          className="timeline-dot"
                          style={{ backgroundColor: SERVICE_COLORS[update.service] || '#666' }}
                        />
                        <div className="timeline-content">
                          <span className="timeline-message">{update.message}</span>
                          <span className="timeline-service">{update.service}</span>
                          <span className="timeline-time">
                            {update.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default App
