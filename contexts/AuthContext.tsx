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

  // Listener principal de autenticacao (Firebase Auth)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (current) => {
      setFirebaseUser(current);

      if (!current) {
        // usuario deslogado
        setUser(null);
        setIsInitializing(false);

        if (userUnsubscribeRef.current) {
          userUnsubscribeRef.current();
          userUnsubscribeRef.current = null;
        }

        return;
      }

      // Se tem usuario logado, escutamos o documento dele no Firestore
      const userDocRef = doc(firebaseDb, "users", current.uid);

      const unsubscribeUser = onSnapshot(
        userDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setUser(snapshot.data() as User);
          } else {
            setUser(null);
          }
          setIsInitializing(false);
        },
        (error) => {
          console.error("Erro ao ouvir documento do usuario:", error);
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

  // Cadastro via helper (principal fluxo cria doc em `users` na tela de registro)
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

    console.log("[signUp] Usuario criado no Auth:", cred.user.uid);

    // Observacao: o cadastro completo deve criar o documento no Firestore.
    // Este helper permanece apenas para usos pontuais e nao cria o doc de perfil.
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
