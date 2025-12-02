"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishScheduledLessons = void 0;
const admin = require("firebase-admin");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const collectionName = "aulas";
exports.publishScheduledLessons = (0, scheduler_1.onSchedule)("every 1 minutes", async () => {
    const now = admin.firestore.Timestamp.now();
    const statuses = ["disponivel", "reservada"];
    const lessonsRef = db.collection(collectionName);
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
            const rawPublish = data.publish_at;
            let publishAt = null;
            if (rawPublish) {
                if (typeof rawPublish === "string") {
                    const parsed = new Date(rawPublish);
                    if (!Number.isNaN(parsed.getTime())) {
                        publishAt = admin.firestore.Timestamp.fromDate(parsed);
                    }
                }
                else if (rawPublish.toMillis) {
                    publishAt = rawPublish;
                }
            }
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
                .catch((err) => firebase_functions_1.logger.error("Falha ao publicar agendada", { id: docSnap.id, err })));
        });
    }
    if (updates.length) {
        await Promise.all(updates);
    }
    firebase_functions_1.logger.info("publishScheduledLessons concluída", {
        processadas: processed,
        horario: now.toDate().toISOString(),
    });
});
function formatDateTime(date) {
    const pad = (n) => `${n}`.padStart(2, "0");
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
