// contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { firebaseAuth, firebaseDb } from "../lib/firebase";
import type { User, UserRole, UserStatus } from "../types/user";

type AuthContextValue = {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  isInitializing: boolean;
  isAuthenticated: boolean;

  role: UserRole | null;
  status: UserStatus | null;

  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  isProfileEmpty: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { nome: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Vamos guardar a função de unsubscribe do onSnapshot do usuário
  const userUnsubscribeRef = useRef<(() => void) | null>(null);

  // Listener principal de autenticação (Firebase Auth)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (current) => {
      setFirebaseUser(current);

      // Se não tem usuário logado, limpamos tudo
      if (!current) {
        setUser(null);
        setIsInitializing(false);

        if (userUnsubscribeRef.current) {
          userUnsubscribeRef.current();
          userUnsubscribeRef.current = null;
        }

        return;
      }

      // Se tem usuário, escutamos o documento dele no Firestore em tempo real
      const userDocRef = doc(firebaseDb, "users", current.uid);

      const unsubscribeUser = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setUser(snapshot.data() as User);
          } else {
            // Se o doc ainda não existe (pode acontecer logo após o signup)
            setUser(null);
          }
          setIsInitializing(false);
        },
        (error) => {
          console.error("Erro ao ouvir documento do usuário:", error);
          setIsInitializing(false);
        }
      );

      userUnsubscribeRef.current = unsubscribeUser;
    });

    // Cleanup geral
    return () => {
      unsubscribeAuth();
      if (userUnsubscribeRef.current) {
        userUnsubscribeRef.current();
      }
    };
  }, []);

  // Função de login
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    // O onAuthStateChanged vai cuidar do resto
  };

  // Função de cadastro (signup)
  // Aqui criamos o usuário no Auth E o documento na coleção `users`
  const signUp = async (params: {
    nome: string;
    email: string;
    password: string;
  }) => {
    const { nome, email, password } = params;

    console.log("[signUp] Iniciando cadastro...");

    // 1) Criar usuário no Authentication
    const cred = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    );

    console.log("[signUp] Usuário criado no Auth:", cred.user.uid);

    const uid = cred.user.uid;
    const userDocRef = doc(firebaseDb, "users", uid);
    const now = serverTimestamp();

    const userDoc: User = {
      id: uid,
      nome,
      email,
      telefone: null,
      data_nascimento: null,
      papel: "aluno",
      status: "vazio",
      aprovado_por_id: null,
      aprovado_em: null,
      alterado_por_id: null,
      alterado_em: null,
      papel_anterior: null,
      motivo_rejeicao: null,
      created_at: now as any,
      updated_at: now as any,
    };

    // 2) Criar documento no Firestore
    await setDoc(userDocRef, userDoc, { merge: true });

    console.log("[signUp] Documento no Firestore criado/atualizado.");
  };

  const signOut = async () => {
    await firebaseSignOut(firebaseAuth);
  };

  // Derivados para navegação condicional
  const role: UserRole | null = user?.papel ?? null;
  const status: UserStatus | null = user?.status ?? null;

  const isAuthenticated = !!firebaseUser;
  const isApproved = status === "aprovado";
  const isPending = status === "pendente";
  const isRejected = status === "rejeitado";
  const isProfileEmpty = status === "vazio";

  const value: AuthContextValue = {
    firebaseUser,
    user,
    isInitializing,
    isAuthenticated,
    role,
    status,
    isApproved,
    isPending,
    isRejected,
    isProfileEmpty,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook de conveniência
export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
