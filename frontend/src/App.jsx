import { useState, useEffect } from 'react'

const API_BASE_URL = 'http://localhost:3000'

function App() {
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [quantities, setQuantities] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchProducts()
    fetchOrders()
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [])

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
          text: `Pedido #${order.id} criado com sucesso!`
        })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
        fetchOrders()
      } else {
        throw new Error('Erro ao criar pedido')
      }
    } catch (error) {
      console.error('Erro ao comprar:', error)
      setMessage({ type: 'error', text: 'Erro ao processar compra' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
  }

  if (loading) {
    return <div className="loading">Carregando produtos...</div>
  }

  return (
    <div className="app">
      <header className="header">
        <h1>E-commerce com Microserviços</h1>
        <p>Sistema distribuído com RabbitMQ</p>
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
                  <span className={`order-status status-${order.status}`}>
                    {order.status}
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default App
