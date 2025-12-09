"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyLessonsOnWrite = exports.notifyDevotionalsOnWrite = exports.cleanupOldNotifications = exports.publishScheduledLessons = exports.syncUserClaimsOnUserWrite = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const lessonsCollection = "aulas";
const devotionalsCollection = "devocionais";
/**
 * SYNC DE CLAIMS:
 * Sempre que /users/{userId} for criado/atualizado/deletado,
 * atualizamos as custom claims do usuário no Firebase Auth
 * e geramos notificações relacionadas a usuários.
 */
exports.syncUserClaimsOnUserWrite = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
    const uid = context.params.userId;
    const beforeData = change.before.exists
        ? change.before.data()
        : undefined;
    const afterData = change.after.exists
        ? change.after.data()
        : undefined;
    // Doc deletado ou sem dados -> limpa claims
    if (!afterData) {
        await admin.auth().setCustomUserClaims(uid, {});
        firebase_functions_1.logger.info("[Claims] Usuário removido ou sem dados, limpando claims", { uid });
        return;
    }
    const papel = afterData.papel;
    const status = afterData.status;
    // Sem papel/status -> limpa claims também
    if (!papel || !status) {
        await admin.auth().setCustomUserClaims(uid, {});
        firebase_functions_1.logger.warn("[Claims] Documento de usuário sem papel/status, claims limpas", {
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
    firebase_functions_1.logger.info("[Claims] Claims atualizadas a partir de /users", {
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
                    mensagem: "Seu cadastro na Escola Bíblica Dominical foi aprovado. Você já pode acessar todas as funcionalidades liberadas para o seu perfil.",
                });
            }
            else if (status === "rejeitado") {
                await createUserStatusNotification(uid, "usuario_rejeitado", {
                    titulo: "Cadastro não aprovado",
                    mensagem: "Seu cadastro na Escola Bíblica Dominical não foi aprovado. Se necessário, procure a coordenação para mais detalhes.",
                });
            }
        }
    }
    catch (err) {
        firebase_functions_1.logger.error("[Claims] Falha ao processar notificações de usuário", {
            uid,
            err,
        });
    }
});
/**
 * Publicação automática de aulas/devocionais agendados
 */
exports.publishScheduledLessons = (0, scheduler_1.onSchedule)("every 1 minutes", async () => {
    const now = admin.firestore.Timestamp.now();
    const [lessonsProcessed, devotionalsProcessed] = await Promise.all([
        processLessons(now),
        processDevotionals(now),
    ]);
    firebase_functions_1.logger.info("publishScheduledLessons concluída", {
        aulas_processadas: lessonsProcessed,
        devocionais_processados: devotionalsProcessed,
        horario: now.toDate().toISOString(),
    });
});
/**
 * Limpeza automática de notificações antigas (> 7 dias)
 * Roda 1x por dia e apaga em lotes de até 500 docs por execução.
 */
exports.cleanupOldNotifications = (0, scheduler_1.onSchedule)("every 24 hours", async () => {
    const now = admin.firestore.Timestamp.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const cutoff = admin.firestore.Timestamp.fromMillis(now.toMillis() - sevenDaysMs);
    firebase_functions_1.logger.info("[Notify][Cleanup] Iniciando limpeza de notificações antigas", {
        cutoff: cutoff.toDate().toISOString(),
    });
    let totalDeleted = 0;
    while (true) {
        const snapshot = await db
            .collection("notificacoes")
            .where("created_at", "<=", cutoff)
            .limit(500)
            .get();
        if (snapshot.empty)
            break;
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        totalDeleted += snapshot.size;
        if (snapshot.size < 500)
            break;
    }
    firebase_functions_1.logger.info("[Notify][Cleanup] Limpeza concluída", {
        totalDeleted,
    });
});
/**
 * Notificações de devocionais (publicados)
 */
exports.notifyDevotionalsOnWrite = functions.firestore
    .document("devocionais/{devocionalId}")
    .onWrite(async (change, context) => {
    const devocionalId = context.params.devocionalId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    if (!after)
        return;
    const beforeStatus = before?.status;
    const afterStatus = after?.status;
    try {
        // Publicado -> notificar alunos, professores, coord, admin aprovados
        if (afterStatus === "publicado" && beforeStatus !== "publicado") {
            await notifyDevotionalPublished(devocionalId, after.titulo);
        }
    }
    catch (err) {
        firebase_functions_1.logger.error("[Notify][Devocionais] Falha ao gerar notificações", {
            devocionalId,
            err,
        });
    }
});
/**
 * Notificações de aulas (disponível, pendente_reserva, reservada, publicada)
 */
exports.notifyLessonsOnWrite = functions.firestore
    .document("aulas/{lessonId}")
    .onWrite(async (change, context) => {
    const lessonId = context.params.lessonId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    if (!after)
        return;
    const beforeStatus = before?.status ?? null;
    const afterStatus = after?.status ?? null;
    const titulo = after.titulo || "";
    const professorId = after.professor_reservado_id ||
        before?.professor_reservado_id ||
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
            }
            else {
                firebase_functions_1.logger.warn("[Notify][Aulas] pendente_reserva sem professor_reservado_id", {
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
    }
    catch (err) {
        firebase_functions_1.logger.error("[Notify][Aulas] Falha ao gerar notificações", { lessonId, err });
    }
});
function formatDateTime(date) {
    const pad = (n) => `${n}`.padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
async function processLessons(now) {
    const statuses = ["disponivel", "reservada"];
    const lessonsRef = db.collection(lessonsCollection);
    const snapshots = await Promise.all(statuses.map((status) => lessonsRef
        .where("status", "==", status)
        .where("publish_at", "<=", now)
        .orderBy("publish_at", "asc")
        .get()));
    let processed = 0;
    const updates = [];
    for (const snap of snapshots) {
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const publishAt = normalizePublishAt(data.publish_at);
            if (!publishAt)
                return;
            if (publishAt.toMillis() > now.toMillis())
                return;
            processed += 1;
            updates.push(docSnap.ref
                .update({
                status: "publicada",
                publicado_em: admin.firestore.FieldValue.serverTimestamp(),
                publicado_por_id: "system-auto",
                publish_at: null,
                data_publicacao_auto: data.data_publicacao_auto || formatDateTime(publishAt.toDate()),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            })
                .catch((err) => firebase_functions_1.logger.error("Falha ao publicar aula agendada", { id: docSnap.id, err })));
        });
    }
    if (updates.length) {
        await Promise.all(updates);
    }
    return processed;
}
async function processDevotionals(now) {
    const devotionalsRef = db.collection(devotionalsCollection);
    const snapshot = await devotionalsRef
        .where("publish_at", "<=", now)
        .orderBy("publish_at", "asc")
        .get();
    firebase_functions_1.logger.info("[Functions] Publicando devocionais agendados", { encontrados: snapshot.size });
    let processed = 0;
    const updates = [];
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status !== "disponivel")
            return;
        const publishAt = normalizePublishAt(data.publish_at);
        if (!publishAt)
            return;
        if (publishAt.toMillis() > now.toMillis())
            return;
        processed += 1;
        updates.push(docSnap.ref
            .update({
            status: "publicado",
            publicado_em: admin.firestore.FieldValue.serverTimestamp(),
            publish_at: null,
            data_publicacao_auto: data.data_publicacao_auto || formatDateTime(publishAt.toDate()),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        })
            .catch((err) => firebase_functions_1.logger.error("Falha ao publicar devocional agendado", { id: docSnap.id, err })));
    });
    if (updates.length) {
        await Promise.all(updates);
    }
    return processed;
}
function normalizePublishAt(raw) {
    if (!raw)
        return null;
    if (typeof raw === "string") {
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime()))
            return null;
        return admin.firestore.Timestamp.fromDate(parsed);
    }
    if (raw.toMillis && typeof raw.toMillis === "function") {
        return raw;
    }
    return null;
}
/** Normaliza papel para minúsculo. */
function normalizeRole(raw) {
    if (!raw)
        return "";
    return String(raw).toLowerCase().trim();
}
/** Busca coordenadores e administradores aprovados. */
async function fetchApprovedAdminsAndCoordinators() {
    const snapshot = await db.collection("users").get();
    if (snapshot.empty)
        return [];
    const allowedRoles = new Set(["administrador", "admin", "coordenador"]);
    const list = [];
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const papelNorm = normalizeRole(data.papel);
        if (!allowedRoles.has(papelNorm))
            return;
        const status = data.status;
        const isApproved = status === "aprovado" ||
            papelNorm === "administrador" ||
            papelNorm === "admin";
        if (!isApproved)
            return;
        list.push({
            id: docSnap.id,
            papel: papelNorm,
            status,
        });
    });
    firebase_functions_1.logger.info("[Notify][Helpers] fetchApprovedAdminsAndCoordinators", {
        total: list.length,
    });
    return list;
}
/** Busca usuários aprovados por papéis. */
async function fetchApprovedByRoles(roles) {
    const snapshot = await db.collection("users").get();
    if (snapshot.empty)
        return [];
    const allowed = new Set(roles.map((r) => r.toLowerCase().trim()));
    const list = [];
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const papelNorm = normalizeRole(data.papel);
        if (!allowed.has(papelNorm))
            return;
        const status = data.status;
        const isApproved = status === "aprovado" ||
            papelNorm === "administrador" ||
            papelNorm === "admin";
        if (!isApproved)
            return;
        list.push({
            id: docSnap.id,
            papel: papelNorm,
            status,
        });
    });
    firebase_functions_1.logger.info("[Notify][Helpers] fetchApprovedByRoles", {
        roles: Array.from(allowed),
        total: list.length,
    });
    return list;
}
function buildNotificationPayload({ usuarioId, tipo, titulo, mensagem, referenciaId, }) {
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
async function createNewUserPendingNotifications(newUserId, displayName, papel) {
    const targets = await fetchApprovedAdminsAndCoordinators();
    if (!targets.length) {
        firebase_functions_1.logger.info("[Notify] Nenhum coord/admin aprovado para notificar novo usuário pendente", { newUserId });
        return;
    }
    const batch = db.batch();
    const message = `${displayName} (${papel}) está aguardando aprovação.`;
    targets.forEach((target) => {
        const docRef = db.collection("notificacoes").doc();
        batch.set(docRef, buildNotificationPayload({
            usuarioId: target.id,
            tipo: "novo_usuario_pendente",
            titulo: "Novo usuário aguardando aprovação",
            mensagem: message,
            referenciaId: newUserId,
        }));
    });
    await batch.commit();
    firebase_functions_1.logger.info("[Notify] Notificações enviadas para coord/admin sobre novo usuário", {
        novo_usuario: newUserId,
        destinatarios: targets.length,
    });
}
async function createUserStatusNotification(userId, tipo, { titulo, mensagem, }) {
    const docRef = db.collection("notificacoes").doc();
    await docRef.set(buildNotificationPayload({
        usuarioId: userId,
        tipo,
        titulo,
        mensagem,
        referenciaId: userId,
    }));
    firebase_functions_1.logger.info("[Notify] Notificação de status de usuário criada", { userId, tipo });
}
/** Aula disponível -> notifica professores aprovados */
async function notifyLessonAvailable(lessonId, titulo) {
    const targets = await fetchApprovedByRoles(["professor"]);
    if (!targets.length) {
        firebase_functions_1.logger.info("[Notify][Aulas] Nenhum professor aprovado para notificar aula disponível");
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
    firebase_functions_1.logger.info("[Notify][Aulas] Notificações enviadas para professores sobre aula disponível", {
        lessonId,
        destinatarios: targets.length,
    });
}
/** Reserva pendente -> notifica professor + coord/admin */
async function notifyLessonReservationRequested(lessonId, titulo, professorId) {
    const targets = [];
    targets.push(professorId);
    const admins = await fetchApprovedByRoles(["coordenador", "administrador", "admin"]);
    admins.forEach((a) => targets.push(a.id));
    if (!targets.length) {
        firebase_functions_1.logger.info("[Notify][Aulas] Nenhum destinatário para reserva pendente", { lessonId });
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
    firebase_functions_1.logger.info("[Notify][Aulas] Notificações enviadas sobre reserva pendente", {
        lessonId,
        destinatarios: targets.length,
    });
}
/** Aula reservada -> notifica professor + coord/admin */
async function notifyLessonReserved(lessonId, titulo, professorId) {
    const targets = [];
    if (professorId)
        targets.push(professorId);
    const admins = await fetchApprovedByRoles(["coordenador", "administrador", "admin"]);
    admins.forEach((a) => targets.push(a.id));
    if (!targets.length) {
        firebase_functions_1.logger.info("[Notify][Aulas] Nenhum destinatário para aula reservada", { lessonId });
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
    firebase_functions_1.logger.info("[Notify][Aulas] Notificações enviadas sobre aula reservada", {
        lessonId,
        destinatarios: targets.length,
    });
}
/** Aula publicada -> todos os aprovados */
async function notifyLessonPublished(lessonId, titulo) {
    const targets = await fetchApprovedByRoles([
        "professor",
        "aluno",
        "coordenador",
        "administrador",
        "admin",
    ]);
    if (!targets.length) {
        firebase_functions_1.logger.info("[Notify][Aulas] Nenhum usuário aprovado para notificar aula publicada");
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
    firebase_functions_1.logger.info("[Notify][Aulas] Notificações enviadas sobre aula publicada", {
        lessonId,
        destinatarios: targets.length,
    });
}
/** Devocional publicado -> todos os aprovados */
async function notifyDevotionalPublished(devocionalId, titulo) {
    const targets = await fetchApprovedByRoles([
        "aluno",
        "professor",
        "coordenador",
        "administrador",
        "admin",
    ]);
    if (!targets.length) {
        firebase_functions_1.logger.info("[Notify][Devocionais] Nenhum usuário aprovado para notificar devocional publicado");
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
    firebase_functions_1.logger.info("[Notify][Devocionais] Notificações enviadas sobre devocional publicado", {
        devocionalId,
        destinatarios: targets.length,
    });
}
//# sourceMappingURL=index.js.map