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
exports.publishScheduledLessons = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const lessonsCollection = "aulas";
const devotionalsCollection = "devocionais";
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
    // Consulta apenas por publish_at para evitar índice composto; filtramos status em memória
    const snapshot = await devotionalsRef.where("publish_at", "<=", now).orderBy("publish_at", "asc").get();
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
//# sourceMappingURL=index.js.map