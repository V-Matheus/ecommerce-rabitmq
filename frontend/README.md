# Frontend - E-commerce com Microserviços

Frontend React simples para testar o sistema de e-commerce com microserviços e RabbitMQ.

## Funcionalidades

- Lista de produtos com estoque disponível
- Seleção de quantidade para compra
- Botão de compra que cria pedido no Order Service
- Lista de pedidos com status em tempo real
- Atualização automática do status dos pedidos (a cada 3 segundos)

## Como Rodar

1. Instalar dependências:
```bash
cd frontend
npm install
```

2. Rodar em modo desenvolvimento:
```bash
npm run dev
```

3. Acessar: http://localhost:3000

## Pré-requisitos

- Node.js 18+
- Order Service rodando em http://localhost:3001

## Tecnologias

- React 18
- Vite (build tool)
- CSS puro (sem frameworks)

## Status dos Pedidos

- **PENDING** - Pedido criado, aguardando processamento
- **COMPLETED** - Pedido finalizado com sucesso
- **CANCELLED** - Pedido cancelado (estoque insuficiente ou pagamento falhou)
