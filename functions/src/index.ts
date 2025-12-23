import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { logger } from "firebase-functions";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const lessonsCollection = "aulas";
const devotionalsCollection = "devocionais";
const MAX_CONVERT_TIMEOUT_SECONDS = 540; // 9 minutos

// Garante que o ffmpeg usa o binário estático (Cloud Functions Linux x64)
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  logger.warn("[Video][Convert] ffmpeg-static path não encontrado; conversão pode falhar");
}

/**
 * Converte vídeos enviados ao Storage para H.264/AAC gerando um arquivo com sufixo _output.mp4.
 * Ajuda a evitar incompatibilidade de codec (H.265/HDR) em web/mobile.
 */
export const convertVideo = onObjectFinalized(
  {
    region: "us-west1", // precisa casar com a região do bucket
    memory: "2GiB",
    timeoutSeconds: MAX_CONVERT_TIMEOUT_SECONDS,
    cpu: 1,
  },
  async (event) => {
    const fileBucket = event.data.bucket;
    const filePath = event.data.name;
    const contentType = event.data.contentType || "";

    if (!filePath) {
      logger.warn("[Video][Convert] Evento sem caminho de arquivo; ignorando");
      return;
    }

    if (!contentType.startsWith("video/")) {
      logger.info("[Video][Convert] Não é vídeo; ignorando", { filePath, contentType });
      return;
    }

    if (filePath.endsWith("_output.mp4")) {
      logger.info("[Video][Convert] Já é arquivo convertido; ignorando", { filePath });
      return;
    }

    // Escopo opcional: só processar pastas de materiais para evitar conversões indesejadas
    const lowerPath = filePath.toLowerCase();
    const isMaterialPath =
      lowerPath.includes("materiais") || lowerPath.includes("materials") || lowerPath.includes("videos");
    if (!isMaterialPath) {
      logger.info("[Video][Convert] Caminho fora de materiais; ignorando", { filePath });
      return;
    }

    const fileName = path.basename(filePath);
    const fileNameWithoutExt = path.parse(fileName).name;
    const bucket = admin.storage().bucket(fileBucket);

    const tempFilePath = path.join(os.tmpdir(), fileName);
    const targetTempFileName = `${fileNameWithoutExt}_output.mp4`;
    const targetTempFilePath = path.join(os.tmpdir(), targetTempFileName);
    const targetStorageFilePath = path.join(path.dirname(filePath), targetTempFileName);

    logger.info("[Video][Convert] Iniciando conversão", {
      filePath,
      target: targetStorageFilePath,
    });

    try {
      await bucket.file(filePath).download({ destination: tempFilePath });

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempFilePath)
          .outputOptions([
            "-c:v libx264",
            "-crf 23", // Qualidade balanceada; menor = melhor
            "-preset fast",
            "-c:a aac",
            "-b:a 128k",
            "-movflags +faststart", // habilita start progressivo
            "-vf scale=-2:720", // Reduz para 720p mantendo proporção e paridade de 2
          ])
          .on("error", (err) => {
            logger.error("[Video][Convert] Erro no ffmpeg", { filePath, err });
            reject(err);
          })
          .on("end", () => {
            logger.info("[Video][Convert] Conversão concluída", {
              filePath,
              output: targetTempFilePath,
            });
            resolve();
          })
          .save(targetTempFilePath);
      });

      await bucket.upload(targetTempFilePath, {
        destination: targetStorageFilePath,
        metadata: {
          contentType: "video/mp4",
        },
      });

      logger.info("[Video][Convert] Upload do convertido concluído", {
        target: targetStorageFilePath,
      });

      // Se quiser economizar espaço, descomente abaixo para remover o original
      // await bucket.file(filePath).delete();
    } catch (err) {
      logger.error("[Video][Convert] Falha na conversão", { filePath, err });
    } finally {
      // Limpeza dos temporários
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (fs.existsSync(targetTempFilePath)) {
        fs.unlinkSync(targetTempFilePath);
      }
    }
  }
);

/**
 * SYNC DE CLAIMS:
 * Sempre que /users/{userId} for criado/atualizado/deletado,
 * atualizamos as custom claims do usuário no Firebase Auth
 * e geramos notificações relacionadas a usuários.
 */
export const syncUserClaimsOnUserWrite = functions.firestore
  .document("users/{userId}")
  .onWrite(async (change, context) => {
    const uid = context.params.userId as string;

    const beforeData = change.before.exists
      ? (change.before.data() as {
          papel?: string;
          status?: string;
          nome?: string;
          nome_completo?: string;
        } | undefined)
      : undefined;

    const afterData = change.after.exists
      ? (change.after.data() as {
          papel?: string;
          status?: string;
          nome?: string;
          nome_completo?: string;
        } | undefined)
      : undefined;

    // Doc deletado ou sem dados -> limpa claims
    if (!afterData) {
      await admin.auth().setCustomUserClaims(uid, {});
      logger.info("[Claims] Usuário removido ou sem dados, limpando claims", { uid });
      return;
    }

    const papel = afterData.papel;
    const status = afterData.status;

    // Sem papel/status -> limpa claims também
    if (!papel || !status) {
      await admin.auth().setCustomUserClaims(uid, {});
      logger.warn("[Claims] Documento de usuário sem papel/status, claims limpas", {
        uid,
        papel,
        status,
      });
      return;
    }

    // Grava claims no Auth
    await admin.auth().setCustomUserClaims(uid, {
      role: papel,
      status,
    });

    logger.info("[Claims] Claims atualizadas a partir de /users", {
      uid,
      role: papel,
      status,
    });

    // --- Notificações relacionadas a usuários ---
    try {
      const wasCreated = !change.before.exists && change.after.exists;
      const previousStatus = beforeData?.status;
      const displayName = afterData.nome_completo || afterData.nome || "Usuário";

      // Novo usuário pendente -> notifica coord/admin aprovados
      if (wasCreated && status === "pendente") {
        await createNewUserPendingNotifications(uid, displayName, papel);
      }

      // Mudança de status -> notifica o próprio usuário
      if (previousStatus !== status) {
        if (status === "aprovado") {
          await createUserStatusNotification(uid, "usuario_aprovado", {
            titulo: "Cadastro aprovado",
            mensagem:
              "Seu cadastro na Escola Bíblica Dominical foi aprovado. Você já pode acessar todas as funcionalidades liberadas para o seu perfil.",
          });
        } else if (status === "rejeitado") {
          await createUserStatusNotification(uid, "usuario_rejeitado", {
            titulo: "Cadastro não aprovado",
            mensagem:
              "Seu cadastro na Escola Bíblica Dominical não foi aprovado. Se necessário, procure a coordenação para mais detalhes.",
          });
        }
      }
    } catch (err) {
      logger.error("[Claims] Falha ao processar notificações de usuário", {
        uid,
        err,
      });
    }
  });

/**
 * Quando o documento de /users/{userId} é deletado, remove também o usuário do Auth
 * para não deixar contas órfãs.
 */
export const deleteAuthOnUserDelete = functions.firestore
  .document("users/{userId}")
  .onDelete(async (_snap, context) => {
    const uid = context.params.userId as string;

    try {
      await admin.auth().deleteUser(uid);
      logger.info("[Auth] Usuário removido do Auth após delete do doc", { uid });
    } catch (err) {
      logger.error("[Auth] Falha ao remover usuário do Auth", { uid, err });
    }
  });

/**
 * Publicação automática de aulas/devocionais agendados
 */
export const publishScheduledLessons = onSchedule("every 1 minutes", async () => {
  const now = admin.firestore.Timestamp.now();

  const [lessonsProcessed, devotionalsProcessed] = await Promise.all([
    processLessons(now),
    processDevotionals(now),
  ]);

  logger.info("publishScheduledLessons concluída", {
    aulas_processadas: lessonsProcessed,
    devocionais_processados: devotionalsProcessed,
    horario: now.toDate().toISOString(),
  });
});

/**
 * Limpeza automática de notificações antigas (> 7 dias)
 * Roda 1x por dia e apaga em lotes de até 500 docs por execução.
 */
export const cleanupOldNotifications = onSchedule("every 24 hours", async () => {
  const now = admin.firestore.Timestamp.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - sevenDaysMs);

  logger.info("[Notify][Cleanup] Iniciando limpeza de notificações antigas", {
    cutoff: cutoff.toDate().toISOString(),
  });

  let totalDeleted = 0;

  while (true) {
    const snapshot = await db
      .collection("notificacoes")
      .where("created_at", "<=", cutoff)
      .limit(500)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    totalDeleted += snapshot.size;

    if (snapshot.size < 500) break;
  }

  logger.info("[Notify][Cleanup] Limpeza concluída", {
    totalDeleted,
  });
});

/**
 * Notificações de devocionais (publicados)
 */
export const notifyDevotionalsOnWrite = functions.firestore
  .document("devocionais/{devocionalId}")
  .onWrite(async (change, context) => {
    const devocionalId = context.params.devocionalId as string;
    const before = change.before.exists ? (change.before.data() as any) : null;
    const after = change.after.exists ? (change.after.data() as any) : null;

    if (!after) return;

    const beforeStatus = before?.status;
    const afterStatus = after?.status;

    try {
      // Publicado -> notificar alunos, professores, coord, admin aprovados
      if (afterStatus === "publicado" && beforeStatus !== "publicado") {
        await notifyDevotionalPublished(devocionalId, after.titulo);
      }
    } catch (err) {
      logger.error("[Notify][Devocionais] Falha ao gerar notificações", {
        devocionalId,
        err,
      });
    }
  });

/**
 * Notificações de aulas (disponível, pendente_reserva, reservada, publicada)
 */
export const notifyLessonsOnWrite = functions.firestore
  .document("aulas/{lessonId}")
  .onWrite(async (change, context) => {
    const lessonId = context.params.lessonId as string;
    const before = change.before.exists ? (change.before.data() as any) : null;
    const after = change.after.exists ? (change.after.data() as any) : null;

    if (!after) return;

    const beforeStatus = before?.status ?? null;
    const afterStatus = after?.status ?? null;
    const titulo = (after.titulo as string | undefined) || "";
    const professorId =
      (after.professor_reservado_id as string | undefined) ||
      (before?.professor_reservado_id as string | undefined) ||
      null;

    try {
      // 1) Nova aula disponível
      if ((!before || beforeStatus !== "disponivel") && afterStatus === "disponivel") {
        await notifyLessonAvailable(lessonId, titulo);
      }

      // 2) Professor fez uma solicitação de reserva (status pendente_reserva)
      if (afterStatus === "pendente_reserva" && beforeStatus !== "pendente_reserva") {
        if (professorId) {
          await notifyLessonReservationRequested(lessonId, titulo, professorId);
        } else {
          logger.warn("[Notify][Aulas] pendente_reserva sem professor_reservado_id", {
            lessonId,
          });
        }
      }

      // 3) Aula reservada (após aprovação da coordenação)
      if (afterStatus === "reservada" && beforeStatus !== "reservada") {
        await notifyLessonReserved(lessonId, titulo, professorId);
      }

      // 4) Aula publicada (manual ou agendada)
      if (afterStatus === "publicada" && beforeStatus !== "publicada") {
        await notifyLessonPublished(lessonId, titulo);
      }
    } catch (err) {
      logger.error("[Notify][Aulas] Falha ao gerar notificações", { lessonId, err });
    }
  });

function formatDateTime(date: Date): string {
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

async function processLessons(now: admin.firestore.Timestamp): Promise<number> {
  const statuses = ["disponivel", "reservada"];
  const lessonsRef = db.collection(lessonsCollection);

  const snapshots = await Promise.all(
    statuses.map((status) =>
      lessonsRef
        .where("status", "==", status)
        .where("publish_at", "<=", now)
        .orderBy("publish_at", "asc")
        .get()
    )
  );

  let processed = 0;
  const updates: Promise<unknown>[] = [];

  for (const snap of snapshots) {
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const publishAt = normalizePublishAt(data.publish_at);
      if (!publishAt) return;
      if (publishAt.toMillis() > now.toMillis()) return;

      processed += 1;
      updates.push(
        docSnap.ref
          .update({
            status: "publicada",
            publicado_em: admin.firestore.FieldValue.serverTimestamp(),
            publicado_por_id: "system-auto",
            publish_at: null,
            data_publicacao_auto:
              data.data_publicacao_auto || formatDateTime(publishAt.toDate()),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          })
          .catch((err) =>
            logger.error("Falha ao publicar aula agendada", { id: docSnap.id, err })
          )
      );
    });
  }

  if (updates.length) {
    await Promise.all(updates);
  }

  return processed;
}

async function processDevotionals(now: admin.firestore.Timestamp): Promise<number> {
  const devotionalsRef = db.collection(devotionalsCollection);
  const snapshot = await devotionalsRef
    .where("publish_at", "<=", now)
    .orderBy("publish_at", "asc")
    .get();

  logger.info("[Functions] Publicando devocionais agendados", { encontrados: snapshot.size });

  let processed = 0;
  const updates: Promise<unknown>[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.status !== "disponivel") return;
    const publishAt = normalizePublishAt(data.publish_at);
    if (!publishAt) return;
    if (publishAt.toMillis() > now.toMillis()) return;

    processed += 1;
    updates.push(
      docSnap.ref
        .update({
          status: "publicado",
          publicado_em: admin.firestore.FieldValue.serverTimestamp(),
          publish_at: null,
          data_publicacao_auto:
            data.data_publicacao_auto || formatDateTime(publishAt.toDate()),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        })
        .catch((err) =>
          logger.error("Falha ao publicar devocional agendado", { id: docSnap.id, err })
        )
    );
  });

  if (updates.length) {
    await Promise.all(updates);
  }

  return processed;
}

function normalizePublishAt(
  raw: admin.firestore.Timestamp | string | null | undefined
): admin.firestore.Timestamp | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return admin.firestore.Timestamp.fromDate(parsed);
  }
  if ((raw as any).toMillis && typeof (raw as any).toMillis === "function") {
    return raw as admin.firestore.Timestamp;
  }
  return null;
}

// =========================
// Helpers de notificações
// =========================

type BasicUserData = {
  id: string;
  papel?: string | null;
  status?: string | null;
};

/** Normaliza papel para minúsculo. */
function normalizeRole(raw: unknown): string {
  if (!raw) return "";
  return String(raw).toLowerCase().trim();
}

/** Busca coordenadores e administradores aprovados. */
async function fetchApprovedAdminsAndCoordinators(): Promise<BasicUserData[]> {
  const snapshot = await db.collection("users").get();
  if (snapshot.empty) return [];

  const allowedRoles = new Set(["administrador", "admin", "coordenador"]);
  const list: BasicUserData[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const papelNorm = normalizeRole(data.papel);

    if (!allowedRoles.has(papelNorm)) return;

    const status = data.status as string | undefined;
    const isApproved =
      status === "aprovado" ||
      papelNorm === "administrador" ||
      papelNorm === "admin";

    if (!isApproved) return;

    list.push({
      id: docSnap.id,
      papel: papelNorm,
      status,
    });
  });

  logger.info("[Notify][Helpers] fetchApprovedAdminsAndCoordinators", {
    total: list.length,
  });

  return list;
}

/** Busca usuários aprovados por papéis. */
async function fetchApprovedByRoles(roles: string[]): Promise<BasicUserData[]> {
  const snapshot = await db.collection("users").get();
  if (snapshot.empty) return [];

  const allowed = new Set(roles.map((r) => r.toLowerCase().trim()));
  const list: BasicUserData[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const papelNorm = normalizeRole(data.papel);
    if (!allowed.has(papelNorm)) return;

    const status = data.status as string | undefined;
    const isApproved =
      status === "aprovado" ||
      papelNorm === "administrador" ||
      papelNorm === "admin";

    if (!isApproved) return;

    list.push({
      id: docSnap.id,
      papel: papelNorm,
      status,
    });
  });

  logger.info("[Notify][Helpers] fetchApprovedByRoles", {
    roles: Array.from(allowed),
    total: list.length,
  });

  return list;
}

function buildNotificationPayload({
  usuarioId,
  tipo,
  titulo,
  mensagem,
  referenciaId,
}: {
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  referenciaId: string;
}) {
  return {
    usuario_id: usuarioId,
    tipo,
    titulo,
    mensagem,
    tipo_referencia: "outro",
    referencia_id: referenciaId,
    lida: false,
    lida_em: null,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function createNewUserPendingNotifications(
  newUserId: string,
  displayName: string,
  papel: string
) {
  const targets = await fetchApprovedAdminsAndCoordinators();
  if (!targets.length) {
    logger.info(
      "[Notify] Nenhum coord/admin aprovado para notificar novo usuário pendente",
      { newUserId }
    );
    return;
  }

  const batch = db.batch();
  const message = `${displayName} (${papel}) está aguardando aprovação.`;

  targets.forEach((target) => {
    const docRef = db.collection("notificacoes").doc();
    batch.set(
      docRef,
      buildNotificationPayload({
        usuarioId: target.id,
        tipo: "novo_usuario_pendente",
        titulo: "Novo usuário aguardando aprovação",
        mensagem: message,
        referenciaId: newUserId,
      })
    );
  });

  await batch.commit();
  logger.info("[Notify] Notificações enviadas para coord/admin sobre novo usuário", {
    novo_usuario: newUserId,
    destinatarios: targets.length,
  });
}

async function createUserStatusNotification(
  userId: string,
  tipo: "usuario_aprovado" | "usuario_rejeitado",
  {
    titulo,
    mensagem,
  }: {
    titulo: string;
    mensagem: string;
  }
) {
  const docRef = db.collection("notificacoes").doc();
  await docRef.set(
    buildNotificationPayload({
      usuarioId: userId,
      tipo,
      titulo,
      mensagem,
      referenciaId: userId,
    })
  );
  logger.info("[Notify] Notificação de status de usuário criada", { userId, tipo });
}

/** Aula disponível -> notifica professores aprovados */
async function notifyLessonAvailable(lessonId: string, titulo: string) {
  const targets = await fetchApprovedByRoles(["professor"]);
  if (!targets.length) {
    logger.info("[Notify][Aulas] Nenhum professor aprovado para notificar aula disponível");
    return;
  }

  const batch = db.batch();
  const message = titulo ? `Nova aula disponível: ${titulo}` : "Uma nova aula está disponível.";

  targets.forEach((t) => {
    const docRef = db.collection("notificacoes").doc();
    batch.set(docRef, {
      usuario_id: t.id,
      tipo: "aula_disponivel",
      titulo: "Nova aula disponível",
      mensagem: message,
      tipo_referencia: "aula",
      referencia_id: lessonId,
      lida: false,
      lida_em: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  logger.info("[Notify][Aulas] Notificações enviadas para professores sobre aula disponível", {
    lessonId,
    destinatarios: targets.length,
  });
}

/** Reserva pendente -> notifica professor + coord/admin */
async function notifyLessonReservationRequested(
  lessonId: string,
  titulo: string,
  professorId: string
) {
  const targets: string[] = [];
  targets.push(professorId);

  const admins = await fetchApprovedByRoles(["coordenador", "administrador", "admin"]);
  admins.forEach((a) => targets.push(a.id));

  if (!targets.length) {
    logger.info("[Notify][Aulas] Nenhum destinatário para reserva pendente", { lessonId });
    return;
  }

  const batch = db.batch();
  const message = titulo
    ? `Reserva de aula pendente de aprovação: ${titulo}`
    : "Uma reserva de aula está pendente de aprovação.";

  targets.forEach((uid) => {
    const docRef = db.collection("notificacoes").doc();
    batch.set(docRef, {
      usuario_id: uid,
      tipo: "aula_reserva_pendente",
      titulo: "Reserva de aula pendente",
      mensagem: message,
      tipo_referencia: "aula",
      referencia_id: lessonId,
      lida: false,
      lida_em: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  logger.info("[Notify][Aulas] Notificações enviadas sobre reserva pendente", {
    lessonId,
    destinatarios: targets.length,
  });
}

/** Aula reservada -> notifica professor + coord/admin */
async function notifyLessonReserved(
  lessonId: string,
  titulo: string,
  professorId?: string | null
) {
  const targets: string[] = [];

  if (professorId) targets.push(professorId);

  const admins = await fetchApprovedByRoles(["coordenador", "administrador", "admin"]);
  admins.forEach((a) => targets.push(a.id));

  if (!targets.length) {
    logger.info("[Notify][Aulas] Nenhum destinatário para aula reservada", { lessonId });
    return;
  }

  const batch = db.batch();
  const message = titulo ? `Aula reservada: ${titulo}` : "Uma aula foi reservada.";

  targets.forEach((uid) => {
    const docRef = db.collection("notificacoes").doc();
    batch.set(docRef, {
      usuario_id: uid,
      tipo: "aula_reservada",
      titulo: "Aula reservada",
      mensagem: message,
      tipo_referencia: "aula",
      referencia_id: lessonId,
      lida: false,
      lida_em: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  logger.info("[Notify][Aulas] Notificações enviadas sobre aula reservada", {
    lessonId,
    destinatarios: targets.length,
  });
}

/** Aula publicada -> todos os aprovados */
async function notifyLessonPublished(lessonId: string, titulo: string) {
  const targets = await fetchApprovedByRoles([
    "professor",
    "aluno",
    "coordenador",
    "administrador",
    "admin",
  ]);
  if (!targets.length) {
    logger.info("[Notify][Aulas] Nenhum usuário aprovado para notificar aula publicada");
    return;
  }

  const batch = db.batch();
  const message = titulo ? `Aula publicada: ${titulo}` : "Uma aula foi publicada.";

  targets.forEach((t) => {
    const docRef = db.collection("notificacoes").doc();
    batch.set(docRef, {
      usuario_id: t.id,
      tipo: "aula_publicada",
      titulo: "Aula publicada",
      mensagem: message,
      tipo_referencia: "aula",
      referencia_id: lessonId,
      lida: false,
      lida_em: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  logger.info("[Notify][Aulas] Notificações enviadas sobre aula publicada", {
    lessonId,
    destinatarios: targets.length,
  });
}

/** Devocional publicado -> todos os aprovados */
async function notifyDevotionalPublished(devocionalId: string, titulo: string) {
  const targets = await fetchApprovedByRoles([
    "aluno",
    "professor",
    "coordenador",
    "administrador",
    "admin",
  ]);
  if (!targets.length) {
    logger.info(
      "[Notify][Devocionais] Nenhum usuário aprovado para notificar devocional publicado"
    );
    return;
  }

  const batch = db.batch();
  const message = titulo ? `Novo devocional: ${titulo}` : "Um devocional foi publicado.";

  targets.forEach((t) => {
    const docRef = db.collection("notificacoes").doc();
    batch.set(docRef, {
      usuario_id: t.id,
      tipo: "novo_devocional",
      titulo: "Devocional publicado",
      mensagem: message,
      tipo_referencia: "devocional",
      referencia_id: devocionalId,
      lida: false,
      lida_em: null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  logger.info("[Notify][Devocionais] Notificações enviadas sobre devocional publicado", {
    devocionalId,
    destinatarios: targets.length,
  });
}
