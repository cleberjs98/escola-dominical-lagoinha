# Deploy Web (Vercel) - Expo Router

## Variáveis de ambiente
Configure no Vercel (Project Settings > Environment Variables) os valores do Firebase:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` (opcional)

Crie um arquivo `.env.local` ou use as vars do Vercel. Não commite `.env` com segredos; use o `.env.example` como referência.

## Build web
- Instale dependências: `npm install`
- Rodar local: `npm run web`
- Vercel: use o framework “Other” e defina o comando de build (ex.: `npm run build` ou `npx expo export -p web`, conforme sua pipeline). Ajuste o output para a pasta gerada (`dist` ou `.expo`).

## Observações
- As configurações do Firebase são lidas do `process.env` com prefixo `EXPO_PUBLIC_`.
- Env faltando em desenvolvimento lança erro claro; em produção o bootstrap do Firebase emite `console.error` e interrompe a inicialização (falha detectável, evita config inválida).
- Não exponha objetos sensíveis no `window`/`globalThis`.

## Smoke test pós-deploy
- Abrir a URL do deploy e confirmar que a página carrega sem erros de ambiente no console.
- Fazer login com uma conta válida.
- Acessar Home.
- Abrir lista de Aulas.
- Abrir lista de Devocionais.
- Criar ou editar item permitido pelo perfil (ou ao menos validar leitura).
- Checar o console do navegador por erros críticos (Firebase/env/permission).

## Erros comuns
- **Env ausente (`EXPO_PUBLIC_*`)**: console mostrará `[firebase] Missing environment variables: ...`; configure as vars no Vercel e redeploy.
- **Firestore `permission-denied`**: revise regras ou papéis do usuário; ocorre ao tentar ler/gravar sem permissão.
- **Indexes necessários**: console do Firebase indica o link para criar índices quando consultas compostas falham; siga o link e publique o índice.
