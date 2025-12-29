\# 📋 PRD \- Product Requirements Document  
\#\# \*\*GeoFence Creator\*\*  
\#\#\# Sistema de Gestão de Cercas Virtuais e Monitoramento Geoespacial  
\---  
\#\# 1\. Visão Geral do Produto  
\#\#\# 1.1 Descrição  
O \*\*GeoFence Creator\*\* é uma plataforma SaaS de gestão de cercas virtuais (geofences) que permite às empresas criar, gerenciar e monitorar áreas geográficas delimitadas, associando regras de negócio, ações automatizadas e eventos a essas regiões.  
\#\#\# 1.2 Propósito  
Fornecer uma solução completa para empresas que precisam monitorar a movimentação de pessoas, veículos ou ativos em áreas específicas, automatizando alertas e ações baseadas em localização geográfica.  
\#\#\# 1.3 Público-Alvo  
mindmap  
  root((Público-Alvo))  
    Logística e Transporte  
      Rastreamento de frotas  
      Controle de rotas  
      Monitoramento de entregas  
    Segurança Patrimonial  
      Controle de acesso  
      Vigilância de perímetros  
      Alertas de invasão  
    Agronegócio  
      Monitoramento de fazendas  
      Controle de maquinário  
      Gestão de áreas produtivas  
    Indústria  
      Segurança do trabalho  
      Controle de áreas restritas  
      Monitoramento de equipamentos  
    Construção Civil  
      Controle de canteiros  
      Gestão de equipes  
      Segurança de obra  
\---  
\#\# 2\. Arquitetura de Entidades  
erDiagram  
    COMPANY ||--o{ BRANCH : possui  
    BRANCH ||--o{ DEPARTMENT : possui  
    DEPARTMENT ||--o{ AREA : possui  
    DEPARTMENT ||--o{ PERSON : trabalha\_em  
    PERSON }o--|| ROLE : possui  
    GEOFENCE ||--o{ PERIMETER : contém  
    GEOFENCE }o--o{ RULE : vinculada  
    GEOFENCE ||--o{ GEOFENCE\_PIN : contém  
    RULE }o--|| ACTION\_TYPE : usa  
    GEOFENCE\_PIN }o--|| PERSON : atribuído  
    GEOFENCE\_PIN }o--|| ACTION\_TYPE : dispara  
\#\#\# 2.1 Entidades Organizacionais  
| Entidade | Descrição | Campos Principais |  
|----------|-----------|-------------------|  
| \*\*Company\*\* | Empresa cliente do sistema | Nome, Endereço, CNPJ, Contato |  
| \*\*Branch\*\* | Filiais/unidades da empresa | Nome, Endereço, Vinculada à Company |  
| \*\*Department\*\* | Setores/departamentos | Nome, Descrição, Vinculado à Branch |  
| \*\*Area\*\* | Áreas físicas específicas | Nome, Descrição, Vinculado ao Department |  
| \*\*Person\*\* | Pessoas cadastradas | Nome, Email, Telefone, Role, Department |  
| \*\*Role\*\* | Funções/cargos | Nome, Descrição, Permissões |  
\#\#\# 2.2 Entidades de Geofencing  
| Entidade | Descrição | Campos Principais |  
|----------|-----------|-------------------|  
| \*\*Geofence\*\* | Cerca virtual | Nome, Descrição, Cor, Tipo, Perímetros, Regras |  
| \*\*Perimeter\*\* | Área delimitada dentro da cerca | ID, Nome, Coordenadas (polígono/círculo) |  
| \*\*Rule\*\* | Regra de automação | Nome, Ação, Condição, Tipo de Ação, É Padrão |  
| \*\*ActionType\*\* | Tipo de ação a ser executada | Nome, Descrição, Ícone, Parâmetros |  
| \*\*GeofencePin\*\* | Pontos de interesse/eventos | Nome, Coordenadas, Status, Responsável, Data |  
\---  
\#\# 3\. Funcionalidades Implementadas  
\#\#\# 3.1 Gestão de Cercas Virtuais  
flowchart TB  
    subgraph Criação\["🗺️ Criação de Cercas"\]  
        A\[Desenhar Polígono\] \--\> B\[Definir Nome/Cor\]  
        C\[Desenhar Círculo\] \--\> B  
        B \--\> D\[Salvar Cerca\]  
    end  
    subgraph Perimetros\["📐 Múltiplos Perímetros"\]  
        D \--\> E\[Adicionar Perímetros\]  
        E \--\> F\[Editar Perímetros\]  
        F \--\> G\[Remover Perímetros\]  
    end  
    subgraph Vinculacao\["🔗 Vinculação"\]  
        D \--\> H\[Vincular Regras\]  
        D \--\> I\[Adicionar Pins\]  
    end  
    style Criação fill:\#e1f5fe  
    style Perimetros fill:\#e8f5e9  
    style Vinculacao fill:\#fff3e0  
\*\*Recursos:\*\*  
\- ✅ Desenho de polígonos no mapa  
\- ✅ Desenho de círculos (raio configurável)  
\- ✅ Múltiplos perímetros por cerca  
\- ✅ Edição de perímetros existentes  
\- ✅ Visualização em mini-mapa no formulário  
\- ✅ Cores personalizadas por cerca  
\- ✅ Geolocalização automática do usuário  
\#\#\# 3.2 Sistema de Regras  
flowchart LR  
    subgraph Condições\["📥 Condições"\]  
        ENTER\[Entrada\]  
        EXIT\[Saída\]  
        INSIDE\[Dentro\]  
        OUTSIDE\[Fora\]  
    end  
    subgraph Ações\["⚡ Ações"\]  
        NOTIFY\[Notificar\]  
        ALERT\[Alertar\]  
        BLOCK\[Bloquear\]  
        CUSTOM\[Personalizado\]  
    end  
    Condições \--\> Ações  
    style Condições fill:\#ffebee  
    style Ações fill:\#e3f2fd  
\*\*Recursos:\*\*  
\- ✅ Regras com condições (entrada, saída, dentro, fora)  
\- ✅ Ações configuráveis (notificar, alertar, bloquear, custom)  
\- ✅ Regra padrão para novas cercas  
\- ✅ Vinculação de múltiplas regras por cerca  
\- ✅ Tipos de ação personalizáveis  
\#\#\# 3.3 Pins e Eventos  
\*\*Recursos:\*\*  
\- ✅ Criação de pontos de interesse dentro de cercas  
\- ✅ Atribuição de responsável (pessoa)  
\- ✅ Status do pin (pendente, em andamento, concluído, cancelado)  
\- ✅ Data de vencimento  
\- ✅ Tipo de ação associada  
\#\#\# 3.4 Gestão Organizacional  
\*\*Recursos:\*\*  
\- ✅ Cadastro completo de empresas (multi-tenant ready)  
\- ✅ Hierarquia Empresa → Filial → Departamento → Área  
\- ✅ Gestão de pessoas com roles  
\- ✅ Sistema de permissões por função  
\#\#\# 3.5 Visualização de Mapas  
\*\*Recursos:\*\*  
\- ✅ Integração com Mapbox GL  
\- ✅ Múltiplos estilos de mapa (streets, satellite, light, dark, outdoors, 3D)  
\- ✅ Visualização em tela cheia  
\- ✅ Geolocalização automática do dispositivo  
\- ✅ Ferramentas de desenho interativas  
\#\#\# 3.6 Configurações e Dados  
\*\*Recursos:\*\*  
\- ✅ Configuração do token Mapbox  
\- ✅ Carregamento de dados de teste (mock data)  
\- ✅ Limpeza de dados  
\- ✅ Persistência local (localStorage)  
\---  
\#\# 4\. Stack Tecnológica  
| Camada | Tecnologia |  
|--------|------------|  
| \*\*Frontend Framework\*\* | React 18 \+ TypeScript |  
| \*\*Build Tool\*\* | Vite |  
| \*\*Estilização\*\* | Tailwind CSS |  
| \*\*Componentes UI\*\* | shadcn/ui (Radix UI) |  
| \*\*Mapas\*\* | Mapbox GL JS \+ Mapbox GL Draw |  
| \*\*Roteamento\*\* | React Router DOM |  
| \*\*Estado\*\* | Context API |  
| \*\*Formulários\*\* | React Hook Form \+ Zod |  
| \*\*Notificações\*\* | Sonner |  
\---  
\#\# 5\. Modelo de Comercialização SaaS  
\#\#\# 5.1 Estrutura de Planos  
graph TB  
    subgraph Free\["🆓 Starter (Gratuito)"\]  
        F1\[1 Empresa\]  
        F2\[5 Cercas\]  
        F3\[10 Perímetros\]  
        F4\[3 Regras\]  
        F5\[Suporte por Email\]  
    end  
    subgraph Pro\["⭐ Professional"\]  
        P1\[3 Empresas\]  
        P2\[50 Cercas\]  
        P3\[Perímetros Ilimitados\]  
        P4\[Regras Ilimitadas\]  
        P5\[API Básica\]  
        P6\[Suporte Prioritário\]  
    end  
    subgraph Business\["🏢 Business"\]  
        B1\[10 Empresas\]  
        B2\[Cercas Ilimitadas\]  
        B3\[API Completa\]  
        B4\[Webhooks\]  
        B5\[Multi-usuário\]  
        B6\[Relatórios Avançados\]  
        B7\[SLA 99.9%\]  
    end  
    subgraph Enterprise\["🏆 Enterprise"\]  
        E1\[Empresas Ilimitadas\]  
        E2\[On-premise/Cloud\]  
        E3\[White Label\]  
        E4\[Integrações Custom\]  
        E5\[Gerente de Conta\]  
        E6\[SLA 99.99%\]  
    end  
    style Free fill:\#e8f5e9  
    style Pro fill:\#e3f2fd  
    style Business fill:\#fff3e0  
    style Enterprise fill:\#fce4ec  
\#\#\# 5.2 Tabela de Preços Sugerida  
| Plano | Preço Mensal | Preço Anual | Target |  
|-------|--------------|-------------|--------|  
| \*\*Starter\*\* | Grátis | Grátis | Freelancers, Testes |  
| \*\*Professional\*\* | R$ 199/mês | R$ 1.990/ano (17% off) | PMEs |  
| \*\*Business\*\* | R$ 499/mês | R$ 4.990/ano (17% off) | Médias Empresas |  
| \*\*Enterprise\*\* | Sob consulta | Sob consulta | Grandes Empresas |  
\#\#\# 5.3 Métricas de Uso para Cobrança  
| Métrica | Descrição |  
|---------|-----------|  
| \*\*MAU\*\* | Usuários Ativos Mensais |  
| \*\*Cercas\*\* | Quantidade de cercas ativas |  
| \*\*Eventos/mês\*\* | Número de eventos processados |  
| \*\*API Calls\*\* | Chamadas à API por mês |  
| \*\*Storage\*\* | Armazenamento de dados históricos |  
\---  
\#\# 6\. Funcionalidades Futuras para SaaS  
\#\#\# 6.1 Backend e Infraestrutura  
| Recurso | Prioridade | Descrição |  
|---------|------------|-----------|  
| \*\*Autenticação\*\* | 🔴 Alta | Login, registro, recuperação de senha |  
| \*\*Multi-tenant\*\* | 🔴 Alta | Isolamento de dados por empresa |  
| \*\*API REST\*\* | 🔴 Alta | Endpoints para integração externa |  
| \*\*Webhooks\*\* | 🟡 Média | Notificações em tempo real |  
| \*\*WebSocket\*\* | 🟡 Média | Rastreamento em tempo real |  
\#\#\# 6.2 Integrações  
flowchart LR  
    GF\[GeoFence Creator\]  
    subgraph Mobile\["📱 Mobile"\]  
        GPS\[GPS Tracker\]  
        APP\[App Mobile\]  
    end  
    subgraph IoT\["🔌 IoT"\]  
        TRACKER\[Rastreadores\]  
        SENSOR\[Sensores\]  
    end  
    subgraph Business\["💼 Business"\]  
        ERP\[ERP\]  
        CRM\[CRM\]  
        BI\[BI/Analytics\]  
    end  
    subgraph Comm\["💬 Comunicação"\]  
        WHATSAPP\[WhatsApp\]  
        TELEGRAM\[Telegram\]  
        SMS\[SMS\]  
        EMAIL\[Email\]  
    end  
    Mobile \--\> GF  
    IoT \--\> GF  
    GF \--\> Business  
    GF \--\> Comm  
\#\#\# 6.3 Analytics e Relatórios  
\- 📊 Dashboard com métricas em tempo real  
\- 📈 Relatórios de movimentação por período  
\- 🗓️ Histórico de eventos por cerca  
\- 📉 Análise de padrões de comportamento  
\- 🔔 Alertas e anomalias  
\#\#\# 6.4 Mobile  
\- 📱 App nativo iOS/Android  
\- 🔔 Push notifications  
\- 📍 Tracking em background  
\- 📷 Captura de evidências  
\---  
\#\# 7\. Segmentos de Mercado e Use Cases  
\#\#\# 7.1 Logística e Transporte  
\`\`\`  
✓ Monitoramento de frotas  
✓ Controle de rotas e desvios  
✓ Alertas de chegada/saída em clientes  
✓ Tempo de permanência em locais  
✓ Otimização de rotas  
\`\`\`  
\#\#\# 7.2 Segurança Patrimonial  
\`\`\`  
✓ Perímetros de segurança  
✓ Alertas de invasão  
✓ Controle de rondas  
✓ Monitoramento 24/7  
✓ Integração com câmeras/alarmes  
\`\`\`  
\#\#\# 7.3 Agronegócio  
\`\`\`  
✓ Monitoramento de fazendas  
✓ Controle de maquinário agrícola  
✓ Gestão de áreas de plantio  
✓ Rastreamento de colheita  
✓ Proteção contra roubo  
\`\`\`  
\#\#\# 7.4 Indústria  
\`\`\`  
✓ Áreas de risco/restritas  
✓ Segurança do trabalho  
✓ Controle de acesso a zonas  
✓ Monitoramento de EPIs  
✓ Compliance e auditoria  
\`\`\`  
\#\#\# 7.5 Construção Civil  
\`\`\`  
✓ Controle de canteiro de obras  
✓ Gestão de equipes em campo  
✓ Segurança de perímetro  
✓ Controle de equipamentos  
✓ Check-in/out de colaboradores  
\`\`\`  
\---  
\#\# 8\. Diferenciais Competitivos  
| Diferencial | Descrição |  
|-------------|-----------|  
| \*\*Múltiplos Perímetros\*\* | Uma cerca pode ter várias áreas (único no mercado) |  
| \*\*Interface Intuitiva\*\* | UX focada em usabilidade, sem necessidade de treinamento |  
| \*\*Flexibilidade de Regras\*\* | Sistema de regras configurável e extensível |  
| \*\*Multi-empresa\*\* | Gestão de múltiplas empresas/filiais nativamente |  
| \*\*White Label\*\* | Possibilidade de personalização para revenda |  
| \*\*Mapas Premium\*\* | Integração com Mapbox (mapas de alta qualidade) |  
\---  
\#\# 9\. Próximos Passos para Produção  
1\. \*\*Backend\*\*: Implementar Supabase/Lovable Cloud para persistência e autenticação  
2\. \*\*Autenticação\*\*: Sistema de login/registro com roles  
3\. \*\*Multi-tenant\*\*: Isolamento de dados por empresa  
4\. \*\*API\*\*: Endpoints REST para integrações  
5\. \*\*Mobile App\*\*: Rastreamento em tempo real  
6\. \*\*Billing\*\*: Integração com Stripe para pagamentos  
7\. \*\*Analytics\*\*: Dashboard de métricas e relatórios  
\---  
Este PRD documenta o estado atual do projeto e fornece um roadmap claro para transformá-lo em um produto SaaS comercializável. O sistema já possui uma base sólida de funcionalidades que atendem necessidades reais de mercado.  
Adicionar Autenticação  
Implementar Multi-tenant  
Adicionar Dashboard Analytics  
Criar API de Integração  
Implementar Notificações Real-time