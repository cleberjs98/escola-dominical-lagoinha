# Configurar CORS do Firebase Storage (Expo Web / Localhost)

Uploads web falham com erro de CORS se o bucket não estiver liberado para os origins do bundler do Expo. Use este passo a passo com o `gsutil` (Google Cloud SDK) autenticado no projeto `app-ebd-25695`.

## 1) Arquivo de CORS

Já existe o arquivo `scripts/storage-cors.json` neste repo. Ele libera:

- http://localhost:8081 e http://127.0.0.1:8081 (Metro/Expo)
- http://localhost:19006 e http://127.0.0.1:19006 (Expo web)
- http://localhost:3000 e http://127.0.0.1:3000 (alternativa web)
- https://app-ebd-25695.firebaseapp.com e https://app-ebd-25695.web.app (hosting prod)

Se for usar outro host/porta, inclua no array `origin` e repita o passo 3.

## 2) Autentique o gsutil

```bash
gcloud auth application-default login
gcloud config set project app-ebd-25695
```

## 3) Aplicar CORS no bucket do Storage

```bash
cd scripts
gsutil cors set storage-cors.json gs://app-ebd-25695.appspot.com
```

## 4) Validar

```bash
gsutil cors get gs://app-ebd-25695.appspot.com
```

## 5) Testar no Expo web

Reinicie o bundler (expo start --web) e teste o upload. Se ainda falhar, confira se:

- O origin usado está listado em `storage-cors.json`.
- Você está no projeto Firebase correto (`gcloud config get-value project`).
- Não há proxy/HTTPS diferente; inclua o host/porta real no arquivo e reaplique.
