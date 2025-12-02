import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firebaseDb } from "../lib/firebase";
import type { User } from "../types/user";

type UseUserByIdResult = {
  user: (User & { nome_completo?: string; sobrenome?: string }) | null;
  loading: boolean;
  error: string | null;
};

export function useUserById(userId: string | null | undefined): UseUserByIdResult {
  const [user, setUser] =
    useState<(User & { nome_completo?: string; sobrenome?: string }) | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const snap = await getDoc(doc(firebaseDb, "users", userId));
        if (!snap.exists()) {
          if (!cancelled) setUser(null);
          return;
        }
        const data = snap.data() as User & { nome_completo?: string; sobrenome?: string };
        if (!cancelled) {
          setUser({ ...data, id: snap.id });
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Erro ao carregar usuário");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { user, loading, error };
}
