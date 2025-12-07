# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

## Firebase Storage CORS (Expo Web)

Uploads no web exigem CORS configurado no bucket. Use `scripts/storage-cors.json` e siga `docs/CONFIG-FIREBASE-STORAGE-CORS.md` para aplicar com `gsutil` no projeto `app-ebd-25695`.

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Configuração de CORS do Firebase Storage

Uploads web dependem de o bucket do Storage aceitar requisições do origin usado pelo Expo/host. Use o JSON de exemplo em `docs/storage-cors.json` (substitua `https://SEU-DOMINIO-VERCEL.vercel.app` pelo domínio real da Vercel, se houver).

Passo a passo com Google Cloud SDK:

1. Descubra o nome do bucket no console do Firebase > Storage (ex.: `app-ebd-XXXXX.appspot.com`).
2. Aplique o CORS:
   ```bash
   gcloud init                     # se ainda não tiver configurado
   gsutil ls                       # opcional, ver buckets
   gsutil cors set docs/storage-cors.json gs://NOME-DO-BUCKET
   ```
3. Opcional: conferir o que ficou configurado:
   ```bash
   gsutil cors get gs://NOME-DO-BUCKET
   ```
4. Reinicie o Expo Web e teste o upload. Se usar outro host/porta, inclua-o em `docs/storage-cors.json` e repita o comando do passo 2.
