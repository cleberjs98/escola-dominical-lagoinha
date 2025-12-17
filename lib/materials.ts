// lib/materials.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { firebaseDb, firebaseStorage } from "./firebase";
import type {
  MaterialReferenceType,
  MaterialType,
  SupportMaterial,
} from "../types/material";

/**
 * Observações sobre Storage (fase 6.4):
 * - Uploads de PDFs/imagens/vídeos etc. serão feitos com Firebase Storage.
 * - caminho_storage deve guardar o path dentro do bucket, ex.: materiais/aulas/{aulaId}/arquivo.pdf
 * - Em fases futuras, implementar upload múltiplo, validação de tipo/tamanho, preview e ordenação.
 */

type AddSupportMaterialParams = {
  tipo_referencia: MaterialReferenceType;
  referencia_id: string;
  tipo_material: MaterialType;
  nome: string;
  descricao?: string;
  caminho_storage?: string;
  url_externa?: string;
  tamanho_bytes?: number;
  mime_type?: string;
  enviado_por_id: string;
};

export async function addSupportMaterial(params: AddSupportMaterialParams) {
  const {
    tipo_referencia,
    referencia_id,
    tipo_material,
    nome,
    descricao = null,
    caminho_storage = null,
    url_externa = null,
    tamanho_bytes = null,
    mime_type = null,
    enviado_por_id,
  } = params;

  const colRef = collection(firebaseDb, "materiais_apoio");
  const now = serverTimestamp();

  const payload: Omit<SupportMaterial, "id"> = {
    tipo_referencia,
    referencia_id,
    tipo_material,
    nome,
    descricao,
    caminho_storage,
    url_externa,
    tamanho_bytes,
    mime_type,
    enviado_por_id,
    enviado_em: now as any,
    ordem_exibicao: null,
    created_at: now as any,
    updated_at: now as any,
  };

  const docRef = await addDoc(colRef, payload);
  return docRef.id;
}

type UpdateSupportMaterialParams = {
  materialId: string;
  nome?: string;
  descricao?: string | null;
  ordem_exibicao?: number | null;
};

export async function updateSupportMaterial(params: UpdateSupportMaterialParams) {
  const { materialId, ...updates } = params;
  const refDoc = doc(firebaseDb, "materiais_apoio", materialId);

  const payload: Partial<SupportMaterial> = {
    ...updates,
    updated_at: serverTimestamp() as any,
  };

  await updateDoc(refDoc, payload as any);
}

export async function deleteSupportMaterial(materialId: string) {
  const refDoc = doc(firebaseDb, "materiais_apoio", materialId);
  await deleteDoc(refDoc);
  // Em próxima fase: remover arquivo do Storage se houver caminho_storage
}

export async function listSupportMaterialsForReference(
  tipo_referencia: MaterialReferenceType,
  referencia_id: string
): Promise<SupportMaterial[]> {
  const colRef = collection(firebaseDb, "materiais_apoio");
  const q = query(
    colRef,
    where("tipo_referencia", "==", tipo_referencia),
    where("referencia_id", "==", referencia_id),
    orderBy("ordem_exibicao"),
    orderBy("created_at")
  );

  const snap = await getDocs(q);
  const list: SupportMaterial[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Omit<SupportMaterial, "id">;
    list.push({ id: docSnap.id, ...data });
  });
  return list;
}

// Helpers de Storage
export function getSupportMaterialStoragePath(params: {
  tipo_referencia: MaterialReferenceType;
  referencia_id: string;
  fileName: string;
}) {
  const { tipo_referencia, referencia_id, fileName } = params;
  return `materiais/${tipo_referencia}/${referencia_id}/${fileName}`;
}

type UploadSupportFileParams = {
  tipo_referencia: MaterialReferenceType;
  referencia_id: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  onProgress?: (progress: number) => void; // 0..1
};

export async function uploadSupportFile(params: UploadSupportFileParams) {
  const { tipo_referencia, referencia_id, fileUri, fileName, mimeType, onProgress } =
    params;

  const storagePath = getSupportMaterialStoragePath({
    tipo_referencia,
    referencia_id,
    fileName,
  });
  const storageRef = ref(firebaseStorage, storagePath);

  // Em ambiente Expo, precisamos buscar o blob a partir do fileUri
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: mimeType,
  });

  return new Promise<{
    caminho_storage: string;
    mime_type: string;
    tamanho_bytes: number | null;
    downloadURL: string;
  }>((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        if (onProgress) {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          onProgress(progress);
        }
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          caminho_storage: storagePath,
          mime_type: mimeType,
          tamanho_bytes: uploadTask.snapshot.totalBytes,
          downloadURL,
        });
      }
    );
  });
}
