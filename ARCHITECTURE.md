# Arquitetura Simplificada de E-commerce com Microserviços e RabbitMQ

## Visão Geral
Sistema de e-commerce simples para praticar microserviços e RabbitMQ.
- Dados em memória (sem banco de dados)
- Foco em comunicação assíncrona
- Arquitetura orientada a eventos

## Microserviços (4 serviços)

### 1. **Order Service (Serviço de Pedidos)**
- **Responsabilidade**: Criar e gerenciar pedidos
- **Dados em memória**:
  ```javascript
  orders = [
    { id, customerId, items: [{productId, quantity}], status, total }
  ]
  ```
- **API REST**:
  - `POST /orders` - Criar pedido
  - `GET /orders/:id` - Consultar pedido
- **Publica eventos**:
  - `order.created` - Pedido criado
  - `order.cancelled` - Pedido cancelado
- **Consome eventos**:
  - `shipping.delivered` - Atualiza status para completado

### 2. **Inventory Service (Serviço de Estoque)**
- **Responsabilidade**: Controlar estoque de produtos
- **Dados em memória**:
  ```javascript
  products = [
    { id: 1, name: "Notebook", stock: 10 },
    { id: 2, name: "Mouse", stock: 50 },
    { id: 3, name: "Teclado", stock: 30 }
  ]
  ```
- **Consome eventos**:
  - `order.created` - Reserva estoque
  - `order.cancelled` - Libera estoque
- **Publica eventos**:
  - `inventory.reserved` - Estoque reservado
  - `inventory.insufficient` - Sem estoque

### 3. **Payment Service (Serviço de Pagamento)**
- **Responsabilidade**: Simular processamento de pagamento
- **Dados em memória**:
  ```javascript
  payments = [
    { id, orderId, amount, status }
  ]
  ```
- **Consome eventos**:
  - `inventory.reserved` - Processa pagamento
- **Publica eventos**:
  - `payment.approved` - Pagamento aprovado
  - `payment.failed` - Pagamento falhou

### 4. **Shipping Service (Serviço de Entrega)**
- **Responsabilidade**: Simular processo de entrega
- **Dados em memória**:
  ```javascript
  shipments = [
    { id, orderId, trackingCode, status }
  ]
  ```
- **Consome eventos**:
  - `payment.approved` - Cria envio
- **Publica eventos**:
  - `shipping.created` - Envio criado
  - `shipping.delivered` - Pedido entregue

## Arquitetura RabbitMQ Simplificada

### Exchange Principal
Usaremos apenas **1 Topic Exchange** para simplificar:
- **ecommerce.exchange** (Topic Exchange)

### Routing Keys (Eventos)
- `order.created`
- `order.cancelled`
- `inventory.reserved`
- `inventory.insufficient`
- `payment.approved`
- `payment.failed`
- `shipping.created`
- `shipping.delivered`

### Queues (Filas)
Cada serviço tem sua própria fila:
- `order-queue` - Order Service
- `inventory-queue` - Inventory Service
- `payment-queue` - Payment Service
- `shipping-queue` - Shipping Service

### Bindings (Vínculos)
Cada fila se inscreve nos eventos que precisa:

**order-queue**:
- `shipping.delivered`

**inventory-queue**:
- `order.created`
- `order.cancelled`

**payment-queue**:
- `inventory.reserved`

**shipping-queue**:
- `payment.approved`

## Fluxo de Compra (Caminho Feliz)

```
1. Cliente faz POST /orders
   ↓
2. Order Service:
   - Cria pedido com status "PENDING"
   - Publica evento: order.created
   ↓
3. Inventory Service:
   - Consome order.created
   - Verifica estoque disponível
   - Reserva produtos
   - Publica evento: inventory.reserved
   ↓
4. Payment Service:
   - Consome inventory.reserved
   - Simula processamento (pode ter 10% de falha aleatória)
   - Publica evento: payment.approved
   ↓
5. Shipping Service:
   - Consome payment.approved
   - Cria código de rastreamento
   - Simula entrega (após alguns segundos)
   - Publica evento: shipping.delivered
   ↓
6. Order Service:
   - Consome shipping.delivered
   - Atualiza status do pedido para "COMPLETED"
```

## Fluxo de Compensação (Caminho Triste)

**Cenário 1: Estoque Insuficiente**
```
1. Order Service → Publica order.created
   ↓
2. Inventory Service → Verifica estoque → Publica inventory.insufficient
   ↓
3. Order Service → Atualiza status para "CANCELLED"
```

**Cenário 2: Pagamento Falha**
```
1-3. [Fluxo normal até reserva de estoque]
   ↓
4. Payment Service → Falha no pagamento → Publica payment.failed
   ↓
5. Order Service → Publica order.cancelled
   ↓
6. Inventory Service → Consome order.cancelled → Libera estoque
```

## Tecnologias (Versão Simples)

### Backend
- **Node.js** com Express (recomendado para simplicidade)

### Mensageria
- **RabbitMQ** rodando localmente ou em cloud (CloudAMQP free tier)
- Biblioteca: `amqplib`

### Como Rodar
1. Instalar RabbitMQ localmente ou usar CloudAMQP
2. Rodar cada serviço em terminal separado:
   ```bash
   node order-service/index.js
   node inventory-service/index.js
   node payment-service/index.js
   node shipping-service/index.js
   ```
3. Testar com `curl` ou Postman:
   ```bash
   curl -X POST http://localhost:3001/orders \
     -H "Content-Type: application/json" \
     -d '{"customerId": 1, "items": [{"productId": 1, "quantity": 2}]}'
   ```

## Estrutura do Projeto

```
ecommerce-rabbitmq/
├── order-service/
│   ├── index.js
│   └── package.json
├── inventory-service/
│   ├── index.js
│   └── package.json
├── payment-service/
│   ├── index.js
│   └── package.json
├── shipping-service/
│   ├── index.js
│   └── package.json
└── ARCHITECTURE.md
```

## Conceitos Praticados

1. **Event-Driven Architecture** - Comunicação por eventos
2. **Saga Pattern** - Transação distribuída com compensação
3. **Message Broker** - RabbitMQ como intermediário
4. **Microserviços** - Serviços independentes e desacoplados
5. **Resiliência** - Tratamento de falhas e rollback
