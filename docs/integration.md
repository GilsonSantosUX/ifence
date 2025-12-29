# Documentação de Integração do Banco de Dados

## 1. Visão Geral
A integração do banco de dados substitui o armazenamento local (IndexedDB) por uma solução robusta baseada em **SQLite** com **Prisma ORM**, servida por uma API **Express.js**. Esta arquitetura permite persistência confiável, relacionamentos complexos e atualizações em tempo real via WebSocket.

## 2. Arquitetura

### Backend Stack
- **Servidor**: Node.js com Express (Porta 3000)
- **Banco de Dados**: SQLite (`dev.db`)
- **ORM**: Prisma Client
- **Real-time**: WebSocket (ws) (Porta 8080)

### Estrutura de Diretórios
- `/server`: Código fonte do backend
  - `/repositories`: Lógica de acesso a dados (GenericRepository, GeofenceRepository)
  - `/routes`: Definição de endpoints da API
  - `index.ts`: Ponto de entrada do servidor e configuração WebSocket
  - `prisma.ts`: Instância singleton do Prisma Client
- `/prisma`: Definição do Schema e migrações

## 3. Configuração e Instalação

### Pré-requisitos
- Node.js (v18+)
- NPM

### Passos para Instalação
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Gere o cliente Prisma:
   ```bash
   npx prisma generate
   ```
3. Execute as migrações do banco de dados:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Inicie o servidor:
   ```bash
   npm run server
   ```

## 4. Modelagem de Dados
O schema do banco de dados está definido em `prisma/schema.prisma`. As principais entidades são:
- **Organizacionais**: Company, Branch, Department, Person.
- **Geofencing**: Geofence, Perimeter, Rule, GeofencePin.
- **Sistema**: AppSettings.

Consulte o arquivo `docs/uml.md` para o diagrama de classes completo.

## 5. API Endpoints

A API segue o padrão RESTful. Todos os endpoints são prefixados com `/api`.

| Recurso       | Métodos Suportados | Descrição |
|---------------|-------------------|-----------|
| `/geofences`  | GET, POST, PUT, DELETE | Gerenciamento de cercas virtuais completas (com perímetros e regras) |
| `/companies`  | GET, POST, PUT, DELETE | Gerenciamento de empresas |
| `/branches`   | GET, POST, PUT, DELETE | Gerenciamento de filiais |
| `/departments`| GET, POST, PUT, DELETE | Gerenciamento de departamentos |
| `/people`     | GET, POST, PUT, DELETE | Gerenciamento de pessoas |
| `/perimeters` | GET, POST, PUT, DELETE | Acesso direto a perímetros |
| `/settings`   | GET, POST, PUT      | Configurações do aplicativo (ex: tokens) |

### Exemplo de Payload (Geofence)
```json
{
  "name": "Zona de Risco",
  "color": "#ff0000",
  "perimeters": [
    {
      "type": "polygon",
      "coordinates": [[-23.55, -46.63], [-23.56, -46.64], ...]
    }
  ],
  "rules": [
    {
      "condition": "enter",
      "action": "alert"
    }
  ]
}
```

## 6. WebSocket
O servidor WebSocket roda na porta 8080 e é utilizado para sincronizar atualizações em tempo real entre clientes conectados.
- **Eventos**: O servidor transmite qualquer mensagem recebida para todos os outros clientes conectados (`broadcast`).

## 7. Validação e Testes
Um script de teste de integração está disponível em `server/test-api.ts` para validar o fluxo completo de criação de entidades.

Para executar os testes:
```bash
npx tsx server/test-api.ts
```
