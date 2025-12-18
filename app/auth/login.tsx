// app/auth/login.tsx - tela de login com UI compartilhada
import { useEffect, useMemo, useState } from "react";
import { Text, StyleSheet, Alert, View, Pressable, Platform } from "react-native";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";

import { firebaseAuth, firebaseDb } from "../../lib/firebase";
import { Card } from "../../components/ui/Card";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { useTheme } from "../../hooks/useTheme";
import { AppBackground } from "../../components/layout/AppBackground";
import { KeyboardScreen } from "../../components/layout/KeyboardScreen";
import { isNonEmpty, isValidEmail } from "../../utils/validation";
import { mapAuthErrorToMessage } from "../../lib/auth/errorMessages";
import type { AppTheme } from "../../types/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const googleWebId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
  const googleIosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || googleWebId;
  const googleAndroidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || googleWebId;

  WebBrowser.maybeCompleteAuthSession();
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: googleWebId || "placeholder", // usa proxy; placeholder evita crash em dev
    webClientId: googleWebId || "placeholder",
    iosClientId: googleIosId || "placeholder",
    androidClientId: googleAndroidId || "placeholder",
  });

  function validate() {
    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage("Informe um email valido.");
      return { ok: false, trimmedEmail };
    }
    if (!isNonEmpty(password)) {
      setErrorMessage("Informe sua senha.");
      return { ok: false, trimmedEmail };
    }
    setErrorMessage(null);
    return { ok: true, trimmedEmail };
  }

  async function handleLogin() {
    if (isSubmitting) return;
    const { ok, trimmedEmail } = validate();
    if (!ok) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const cred = await signInWithEmailAndPassword(
        firebaseAuth,
        trimmedEmail,
        password
      );

      const uid = cred.user.uid;
      const userRef = doc(firebaseDb, "users", uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          id: uid,
          nome: cred.user.displayName || trimmedEmail,
          sobrenome: "",
          nome_completo: cred.user.displayName || trimmedEmail,
          email: cred.user.email || trimmedEmail,
          codigo_pais: null,
          telefone: null,
          telefone_completo: null,
          data_nascimento: null,
          papel: "aluno",
          status: "pendente",
          aprovado_por_id: null,
          aprovado_em: null,
          alterado_por_id: null,
          alterado_em: serverTimestamp(),
          papel_anterior: null,
          motivo_rejeicao: null,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        router.replace("/auth/pending" as any);
        return;
      }

      const data = snap.data() as any;
      const status = data.status ?? "pendente";

      if (status === "pendente" || status === "rejeitado" || status === "vazio") {
        router.replace("/auth/pending" as any);
      } else {
        router.replace("/" as any);
      }
    } catch (error: any) {
      console.error("[Auth] Erro ao fazer login", error);
      const message = mapAuthErrorToMessage(error?.code ?? "auth/unknown", "login");
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function ensureUserDocument(uid: string, displayName: string | null, emailAddr: string | null) {
    const userRef = doc(firebaseDb, "users", uid);
    const snap = await getDoc(userRef);
    const safeEmail = (emailAddr || "").trim();
    if (snap.exists()) return snap.data() as any;

    await setDoc(userRef, {
      id: uid,
      nome: displayName || safeEmail || "Usuário",
      sobrenome: "",
      nome_completo: displayName || safeEmail || "Usuário",
      email: safeEmail,
      codigo_pais: null,
      telefone: null,
      telefone_completo: null,
      data_nascimento: null,
      papel: "aluno",
      status: "pendente",
      aprovado_por_id: null,
      aprovado_em: null,
      alterado_por_id: null,
      alterado_em: serverTimestamp(),
      papel_anterior: null,
      motivo_rejeicao: null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    return (await getDoc(userRef)).data();
  }

  useEffect(() => {
    if (!response || response.type !== "success") return;
    const idToken = response.authentication?.idToken;
    if (!idToken) return;

    (async () => {
      try {
        setIsSubmitting(true);
        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(firebaseAuth, credential);
        const data = await ensureUserDocument(
          cred.user.uid,
          cred.user.displayName,
          cred.user.email
        );
        const status = (data as any)?.status ?? "pendente";
        if (status === "pendente" || status === "rejeitado" || status === "vazio") {
          router.replace("/auth/pending" as any);
        } else {
          router.replace("/" as any);
        }
      } catch (err: any) {
        console.error("[Auth][Google] Erro ao logar", err);
        Alert.alert("Erro", "Não foi possível entrar com o Google.");
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [response]);

  async function handleGoogleSignIn() {
    try {
      setErrorMessage(null);
      setIsSubmitting(true);

      if (Platform.OS === "web") {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const cred = await signInWithPopup(firebaseAuth, provider);
        const data = await ensureUserDocument(
          cred.user.uid,
          cred.user.displayName,
          cred.user.email
        );
        const status = (data as any)?.status ?? "pendente";
        if (status === "pendente" || status === "rejeitado" || status === "vazio") {
          router.replace("/auth/pending" as any);
        } else {
          router.replace("/" as any);
        }
        return;
      }

      const result = await promptAsync({ useProxy: true, showInRecents: true });
      if (result?.type !== "success") {
        setIsSubmitting(false);
        return;
      }
    } catch (error: any) {
      console.error("[Auth][Google] Erro ao iniciar login", error);
      Alert.alert("Erro", "Não foi possível iniciar o login com o Google.");
      setIsSubmitting(false);
    }
  }

  return (
    <AppBackground>
      <KeyboardScreen contentContainerStyle={styles.container}>
        <Card title="Entrar" subtitle="Use seu email e senha para acessar o app.">
          <AppInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="email@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />
          <AppInput
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="******"
            secureTextEntry={!showPassword}
            textContentType="password"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            rightElement={
              <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                <Text style={styles.toggleText}>{showPassword ? "Ocultar" : "Ver"}</Text>
              </Pressable>
            }
          />
          <AppButton
            title={isSubmitting ? "Entrando..." : "Entrar"}
            onPress={handleLogin}
            loading={isSubmitting}
          />
          <AppButton
            title={isSubmitting ? "Entrando..." : "Entrar com Google"}
            onPress={handleGoogleSignIn}
            loading={isSubmitting}
            variant="secondary"
            style={{ marginTop: 8 }}
            disabled={isSubmitting || (!request && Platform.OS !== "web")}
          />
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <View style={styles.linksRow}>
            <Link href="/auth/forgot-password" style={styles.linkText}>
              Esqueci minha senha
            </Link>
          </View>
          <View style={styles.linksRow}>
            <Text style={styles.smallText}>Ainda nao tem conta? </Text>
            <Link href="/auth/register" style={styles.linkText}>
              Criar conta
            </Link>
          </View>
        </Card>
      </KeyboardScreen>
    </AppBackground>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 96,
    },
    linksRow: {
      flexDirection: "row",
      marginTop: 12,
      alignItems: "center",
    },
    linkText: {
      color: theme.colors.accent,
      fontWeight: "600",
    },
    smallText: {
      color: theme.colors.muted || theme.colors.textSecondary || theme.colors.text,
      fontSize: 13,
    },
    errorText: {
      color: theme.colors.status?.dangerBg || theme.colors.primary,
      marginTop: 8,
    },
    toggleText: {
      color: theme.colors.accent,
      fontWeight: "600",
      fontSize: 13,
    },
  });
}
