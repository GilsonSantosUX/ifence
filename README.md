# React + TypeScript + Vite

## Configuração

Para executar o projeto, é necessário configurar as variáveis de ambiente para a integração com o Mapbox.

1. Crie um arquivo `.env` na raiz do projeto (se não existir).
2. Adicione a variável `VITE_MAPBOX_API` com seu token público do Mapbox:

```env
VITE_MAPBOX_API=pk.eyJ1Ijoi...
```

> **Nota:** O token é carregado automaticamente durante a inicialização. Se não estiver configurado, o mapa não será exibido e uma mensagem de erro será mostrada.

## Funcionalidades

### Configurações (Settings)
A aplicação possui um painel de configurações acessível onde é possível gerenciar:

*   **Mapbox:** Seleção de estilos de mapa (Satélite, Ruas, Claro, Escuro, 3D).
*   **WebSocket:** Configuração da URL do servidor para atualizações em tempo real e teste de conexão.
*   **Dados:**
    *   **Exportar Backup:** Gera um arquivo JSON com todos os dados locais.
    *   **Restaurar Backup:** Importa dados de um arquivo JSON.
    *   **Diagnóstico:** Executa testes de integração para verificar a integridade do banco de dados e serviços.
    *   **Limpar Tudo:** Remove todos os dados armazenados localmente.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
