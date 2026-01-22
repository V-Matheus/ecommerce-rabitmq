# E-commerce com RabbitMQ - Sistema de Microservices

Sistema de e-commerce distribuído utilizando arquitetura de microservices com RabbitMQ para comunicação assíncrona e Server-Sent Events (SSE) para atualizações em tempo real no frontend.

## Visão Geral da Arquitetura

```
┌─────────────┐     SSE      ┌─────────────┐    RabbitMQ     ┌──────────────────┐
│   Frontend  │◄────────────►│   Gateway   │◄───────────────►│  Microservices   │
│   (React)   │   Real-time  │  (NestJS)   │  Topic Exchange │                  │
└─────────────┘              └─────────────┘                 │ • Inventory      │
                                                             │ • Payment        │
                                                             │ • Shipping       │
                                                             │ • Order          │
                                                             └──────────────────┘
```

## Tecnologias Utilizadas

| Tecnologia | Função |
|------------|--------|
| **RabbitMQ** | Message broker - desacopla serviços |
| **Topic Exchange** | Roteamento por padrão (wildcards) |
| **NestJS Microservices** | Framework para consumir/publicar eventos |
| **SSE (Server-Sent Events)** | Streaming de eventos para o frontend |
| **React** | Interface que atualiza em tempo real |
| **Docker Compose** | Orquestração dos containers |

## Estrutura do Projeto

```
ecommerce-rabitmq/
├── backend/
│   └── apps/
│       ├── common/                 # Código compartilhado
│       │   ├── dto/events.dto.ts   # Definição dos eventos
│       │   └── rabbitmq.service.ts # Publisher RabbitMQ
│       ├── gateway/                # API Gateway + SSE
│       ├── inventory-service/      # Serviço de Estoque
│       ├── payment-service/        # Serviço de Pagamento
│       ├── shipping-service/       # Serviço de Envio
│       └── order-service/          # Serviço de Pedidos
├── frontend/                       # React App
└── docker-compose.yml
```

## Fluxo de um Pedido

Quando um cliente realiza uma compra, acontece a seguinte sequência de eventos:

```
1. Frontend ──POST /orders──► Gateway
                                │
2. Gateway publica ─────────► order.created ─────► Inventory Service
                                                        │
3. Inventory reserva estoque e publica ──► inventory.reserved ──► Payment Service
                                                    │                    │
                                                    ▼                    │
                                              Gateway (SSE)              │
                                                                         │
4. Payment processa e publica ──────────► payment.approved ──► Shipping Service
                                                │                       │
                                                ▼                       │
                                          Gateway (SSE)                 │
                                                                        │
5. Shipping cria envio e publica ────────► shipping.created ──► Gateway (SSE)
                                                │
6. Após 5s, Shipping publica ────────────► shipping.delivered ──► Gateway (SSE)
                                                                        │
                                                                        ▼
                                                              Frontend atualiza
                                                              em tempo real
```

## RabbitMQ - Topic Exchange

O sistema utiliza um **Topic Exchange** chamado `ecommerce.exchange` para roteamento inteligente de mensagens:

### Routing Keys e Consumidores

| Routing Key | Quem Publica | Quem Consome |
|-------------|--------------|--------------|
| `order.created` | Gateway | Inventory |
| `order.*` (wildcard) | - | Inventory (ouve todos os order.*) |
| `inventory.reserved` | Inventory | Payment, Gateway |
| `inventory.insufficient` | Inventory | Gateway |
| `payment.approved` | Payment | Shipping, Gateway |
| `payment.failed` | Payment | Gateway |
| `shipping.created` | Shipping | Gateway |
| `shipping.delivered` | Shipping | Gateway |
| `#` (wildcard) | - | Gateway, Order (ouvem tudo) |

### Filas

| Fila | Serviço | Routing Key |
|------|---------|-------------|
| `inventory-queue` | Inventory Service | `order.*` |
| `payment-queue` | Payment Service | `inventory.reserved` |
| `shipping-queue` | Shipping Service | `payment.approved` |
| `gateway-queue` | Gateway | `#` (todos) |
| `order-queue` | Order Service | `#` (todos) |

## Componentes Principais

### 1. RabbitMQPublisher

Serviço compartilhado que publica mensagens no formato esperado pelo NestJS:

```typescript
// backend/apps/common/rabbitmq.service.ts
async publish(routingKey: string, message: any): Promise<void> {
  const nestMessage = {
    pattern: routingKey,  // Ex: "inventory.reserved"
    data: message,        // O payload real
  };
  this.channel.publish(this.exchangeName, routingKey, messageBuffer);
}
```

### 2. Event Handlers

Cada serviço usa `@EventPattern` para ouvir eventos específicos:

```typescript
// inventory-service.controller.ts
@EventPattern('order.created')
async handleOrderCreated(@Payload() data: OrderCreatedEvent) {
  await this.inventoryServiceService.reserveStock(data);
}
```

### 3. SSE Service

O Gateway envia atualizações em tempo real para o frontend:

```typescript
// gateway.controller.ts
@EventPattern('inventory.reserved')
handleInventoryReserved(@Payload() data: InventoryReservedEvent) {
  this.sseService.emitOrderUpdate({
    orderId: data.orderId,
    status: OrderStatus.INVENTORY_CONFIRMED,
    message: 'Estoque reservado com sucesso',
    service: 'inventory-service',
  });
}
```

### 4. Frontend SSE Connection

```javascript
// App.jsx
useEffect(() => {
  const eventSource = new EventSource('http://localhost:3000/orders/events');

  eventSource.onmessage = (event) => {
    const update = JSON.parse(event.data);
    setOrderHistory(prev => [...prev, update]);
  };
}, []);
```

## Estrutura das Mensagens

### OrderCreatedEvent
```json
{
  "pattern": "order.created",
  "data": {
    "orderId": 1,
    "customerId": 1,
    "items": [{ "productId": 1, "quantity": 2 }]
  }
}
```

### InventoryReservedEvent
```json
{
  "pattern": "inventory.reserved",
  "data": {
    "orderId": 1,
    "items": [{ "productId": 1, "quantity": 2 }],
    "total": 5000
  }
}
```

### PaymentApprovedEvent
```json
{
  "pattern": "payment.approved",
  "data": {
    "orderId": 1,
    "amount": 5000,
    "transactionId": "TXN1234567890"
  }
}
```

### ShippingCreatedEvent
```json
{
  "pattern": "shipping.created",
  "data": {
    "orderId": 1,
    "shipmentId": 1,
    "trackingCode": "TRK1234567890"
  }
}
```

## Padrão Saga

Este sistema implementa o padrão **Saga** para transações distribuídas:

### Fluxo de Sucesso
```
order.created → inventory.reserved → payment.approved → shipping.created → shipping.delivered
```

### Fluxo de Falha (Compensação)
```
                    ┌── inventory.insufficient → Pedido cancelado
order.created ──────┤
                    └── inventory.reserved → payment.failed → order.cancelled → Estoque devolvido
```

**Características:**
- **Compensação**: Se o pagamento falhar, `payment.failed` dispara e o estoque é devolvido
- **Eventos**: Cada etapa publica um evento que a próxima etapa consome
- **Consistência eventual**: O sistema eventualmente fica consistente através dos eventos

## Status do Pedido

| Status | Descrição |
|--------|-----------|
| `PENDING` | Pedido criado, aguardando processamento |
| `IN_INVENTORY` | Verificando disponibilidade de estoque |
| `INVENTORY_CONFIRMED` | Estoque reservado com sucesso |
| `IN_PAYMENT` | Processando pagamento |
| `PAYMENT_CONFIRMED` | Pagamento aprovado |
| `IN_SHIPPING` | Preparando envio |
| `SHIPPED` | Pedido enviado |
| `COMPLETED` | Pedido entregue |
| `CANCELLED` | Pedido cancelado |

## Como Executar

### Pré-requisitos
- Docker e Docker Compose instalados

### Iniciar o Sistema

```bash
# Clonar o repositório
git clone <repo-url>
cd ecommerce-rabitmq

# Iniciar todos os serviços
docker-compose up -d --build

# Ver logs de todos os serviços
docker-compose logs -f
```

### Acessar os Serviços

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3333 |
| Gateway API | http://localhost:3000 |
| RabbitMQ Management | http://localhost:15672 |

**Credenciais RabbitMQ:**
- Usuário: `admin`
- Senha: `admin`

### Parar o Sistema

```bash
docker-compose down

# Para remover volumes (limpar dados do RabbitMQ)
docker-compose down -v
```

## Monitoramento no RabbitMQ

### Acessar o Painel
1. Acesse http://localhost:15672
2. Login: `admin` / `admin`

### Ver Filas e Mensagens
1. Aba **"Queues and Streams"** - Lista todas as filas
2. Clique em uma fila para ver detalhes:
   - **Messages**: quantidade de mensagens
   - **Message rates**: taxa de mensagens
   - **Consumers**: serviços conectados

### Inspecionar Mensagens
1. Na página da fila, role até **"Get messages"**
2. Configure **"Ack Mode: Nack message requeue true"**
3. Clique em **"Get Message(s)"**

### Ver Exchange e Bindings
1. Aba **"Exchanges"**
2. Clique em `ecommerce.exchange`
3. Veja os bindings (ligações entre exchange e filas)

## Endpoints da API

### Gateway

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/` | Health check |
| GET | `/products` | Lista produtos disponíveis |
| GET | `/orders` | Lista todos os pedidos |
| GET | `/orders/:id` | Detalhes de um pedido |
| POST | `/orders` | Criar novo pedido |
| GET | `/orders/events` | SSE stream de atualizações |

### Criar Pedido

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1,
    "items": [
      { "productId": 1, "quantity": 1 },
      { "productId": 2, "quantity": 2 }
    ]
  }'
```

## Arquitetura Detalhada

### Comunicação entre Serviços

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RabbitMQ                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    ecommerce.exchange (topic)                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│           │              │              │              │                    │
│     order.*      inventory.*     payment.*      shipping.*                  │
│           │              │              │              │                    │
│           ▼              ▼              ▼              ▼                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │inventory-queue│ │payment-queue │ │shipping-queue│ │gateway-queue │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
         │                  │                  │                │
         ▼                  ▼                  ▼                ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Inventory   │   │   Payment    │   │   Shipping   │   │   Gateway    │
│   Service    │   │   Service    │   │   Service    │   │  (API+SSE)   │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

### Fluxo de Dados Completo

```
┌──────────┐    HTTP     ┌─────────┐   RabbitMQ   ┌───────────┐
│ Frontend │ ──────────► │ Gateway │ ───────────► │ Inventory │
└──────────┘             └─────────┘              └───────────┘
     ▲                        │                        │
     │                        │                        ▼
     │                   SSE Stream              ┌───────────┐
     │                        │                  │  Payment  │
     │                        ▼                  └───────────┘
     │                   ┌─────────┐                   │
     └───────────────────│ Gateway │◄──────────────────┤
                         └─────────┘                   ▼
                              ▲                  ┌───────────┐
                              │                  │ Shipping  │
                              └──────────────────└───────────┘
```

## Troubleshooting

### Erro: PRECONDITION_FAILED - inequivalent arg 'durable'

O exchange foi criado com configurações diferentes. Solução:

```bash
docker-compose down -v
docker-compose up -d --build
```

### Serviços não se conectam ao RabbitMQ

Verifique se o RabbitMQ está healthy:

```bash
docker-compose ps
docker logs ecommerce-rabbitmq
```

### Mensagens não chegam aos serviços

1. Verifique os bindings no painel do RabbitMQ
2. Confira os logs dos serviços: `docker-compose logs -f inventory-service`
3. Verifique se o routing key está correto
