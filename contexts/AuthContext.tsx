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
import { doc, onSnapshot } from "firebase/firestore";

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

  const userUnsubscribeRef = useRef<(() => void) | null>(null);

  // Listener principal de autenticação (Firebase Auth)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (current) => {
      setFirebaseUser(current);

      if (!current) {
        // usuário deslogado
        setUser(null);
        setIsInitializing(false);

        if (userUnsubscribeRef.current) {
          userUnsubscribeRef.current();
          userUnsubscribeRef.current = null;
        }

        return;
      }

      // Se tem usuário logado, escutamos o documento dele no Firestore
      const userDocRef = doc(firebaseDb, "users", current.uid);

      const unsubscribeUser = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setUser(snapshot.data() as User);
          } else {
            // Ainda não existe doc do usuário (vamos criar na Fase 2.3)
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

    return () => {
      unsubscribeAuth();
      if (userUnsubscribeRef.current) {
        userUnsubscribeRef.current();
      }
    };
  }, []);

  // Login
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  };

  // Cadastro (por enquanto só cria no Auth)
  const signUp = async (params: {
    nome: string;
    email: string;
    password: string;
  }) => {
    const { nome, email, password } = params;

    console.log("[signUp] Iniciando cadastro...");

    const cred = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    );

    console.log("[signUp] Usuário criado no Auth:", cred.user.uid);

    // ⚠️ IMPORTANTE:
    // Ainda NÃO estamos criando o documento no Firestore aqui.
    // Vamos fazer isso na Fase 2.3, quando o usuário completar o perfil
    // (telefone, data de nascimento, status = "pendente", etc.).
    //
    // Por isso, o `user` do contexto ainda ficará null logo após o signup.
    // Isso é esperado neste momento.
  };

  const signOut = async () => {
    await firebaseSignOut(firebaseAuth);
  };

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

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
