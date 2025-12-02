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
exports.publishScheduledLessons = (0, scheduler_1.onSchedule)("every 1 minutes", async () => {
    const now = new Date();
    const statuses = ["disponivel", "publicacao_agendada"];
    const lessonsRef = db.collection("aulas");
    // Firestore limita combinações de filtros; fazemos duas consultas simples e unimos resultados.
    const snapshots = await Promise.all(statuses.map((status) => lessonsRef.where("status", "==", status).where("publish_at", "!=", null).get()));
    const updates = [];
    let candidates = 0;
    let published = 0;
    for (const snap of snapshots) {
        candidates += snap.size;
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const publishAtString = data.publish_at;
            if (!publishAtString || typeof publishAtString !== "string") {
                firebase_functions_1.logger.warn("publish_at ausente ou invalido", { id: docSnap.id });
                return;
            }
            const publishAt = new Date(publishAtString);
            if (isNaN(publishAt.getTime())) {
                firebase_functions_1.logger.error("publish_at mal formatado", { id: docSnap.id, publish_at: publishAtString });
                return;
            }
            if (publishAt.getTime() <= now.getTime()) {
                const update = {
                    status: "publicada",
                    publicado_em: admin.firestore.FieldValue.serverTimestamp(),
                    data_publicacao_auto: admin.firestore.FieldValue.serverTimestamp(),
                    updated_at: admin.firestore.FieldValue.serverTimestamp(),
                };
                updates.push(docSnap.ref.update(update).catch((err) => {
                    firebase_functions_1.logger.error("Falha ao publicar aula agendada", { id: docSnap.id, err });
                }));
                published += 1;
            }
        });
    }
    if (updates.length) {
        await Promise.all(updates);
    }
    firebase_functions_1.logger.info("publishScheduledLessons concluida", {
        candidatos: candidates,
        publicados: published,
        horario: now.toISOString(),
    });
});
//# sourceMappingURL=index.js.map