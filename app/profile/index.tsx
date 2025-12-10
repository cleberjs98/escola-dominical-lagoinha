import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { updateUserProfile } from "../../lib/users";
import { firebaseAuth, firebaseStorage } from "../../lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ProfileScreen() {
  const router = useRouter();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { themeSettings } = useTheme();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  // Carrega dados iniciais uma vez
  useEffect(() => {
    if (user) {
      setNome(user.nome || "");
      setTelefone(user.telefone || "");
      // data_nascimento no tipo é string YYYY-MM-DD; exibir como está
      // Se houver formatação específica, adaptar aqui
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const birth = (user as any).data_nascimento || "";
      setDataNascimento(birth);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const foto = (user as any).foto_url || null;
      setPhotoUrl(foto);
    }
  }, [user]);

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#facc15" />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }

  if (!firebaseUser || !user) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Redirecionando...</Text>
      </View>
    );
  }

  const isStudent = user.papel === "aluno";

  async function handleSave() {
    try {
      setIsSaving(true);
      setMessage(null);
      await updateUserProfile({
        userId: firebaseUser.uid,
        nome: nome.trim(), // mantido, mas campo fica apenas leitura
        telefone: telefone.trim(),
      });
      setMessage("Dados atualizados com sucesso.");
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      Alert.alert("Erro", "Não foi possível atualizar seus dados.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!firebaseUser.email) {
      Alert.alert("Erro", "E-mail não encontrado na conta.");
      return;
    }
    try {
      setMessage(null);
      setResettingPassword(true);
      await sendPasswordResetEmail(firebaseAuth, firebaseUser.email);
      Alert.alert(
        "Alterar senha",
        "Enviamos um e-mail com instruções para alterar sua senha."
      );
    } catch (err) {
      console.error("Erro ao enviar e-mail de senha:", err);
      Alert.alert("Erro", "Não foi possível enviar o e-mail de alteração de senha.");
    } finally {
      setResettingPassword(false);
    }
  }

  function openFilePicker() {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file || !firebaseUser) return;
        try {
          setUploadingPhoto(true);
          const storageRef = ref(firebaseStorage, `profile_photos/${firebaseUser.uid}`);
          await uploadBytesResumable(storageRef, file);
          const url = await getDownloadURL(storageRef);
          setPhotoUrl(url);
          await updateUserProfile({ userId: firebaseUser.uid, nome: nome.trim(), telefone: telefone.trim() });
          // atualiza doc do user com foto_url se quiser; reusa updateUserProfile? não inclui campo
        } catch (err) {
          console.error("Erro ao enviar foto:", err);
          Alert.alert("Erro", "Não foi possível enviar a foto.");
        } finally {
          setUploadingPhoto(false);
        }
      };
      input.click();
    } else {
      Alert.alert("Envio de foto", "Envio de foto suportado apenas no ambiente web nesta versão.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeSettings?.cor_fundo || "#020617" }]}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Meu perfil</Text>
        <Text style={styles.subtitle}>
          {isStudent
            ? "Atualize seus dados básicos. Papel e status são definidos pela coordenação."
            : "Atualize seus dados básicos."}
        </Text>

        <View style={styles.photoRow}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{nome?.[0]?.toUpperCase?.() || "?"}</Text>
            </View>
          )}
          <Pressable
            style={[styles.saveButton, uploadingPhoto && styles.saveButtonDisabled]}
            onPress={openFilePicker}
            disabled={uploadingPhoto}
          >
            <Text style={styles.saveButtonText}>
              {uploadingPhoto ? "Enviando..." : "Enviar foto"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Nome</Text>
        <Text style={styles.readonly}>{nome || "Sem nome"}</Text>

        <Text style={styles.label}>E-mail (somente leitura)</Text>
        <Text style={styles.readonly}>{firebaseUser.email || "Sem e-mail"}</Text>

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          placeholder="Telefone"
          placeholderTextColor="#6b7280"
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={setTelefone}
        />

        <Text style={styles.label}>Data de nascimento</Text>
        <TextInput
          style={styles.input}
          placeholder="aaaa-mm-dd"
          placeholderTextColor="#6b7280"
          value={dataNascimento}
          onChangeText={setDataNascimento}
          editable={false} // manter somente leitura para evitar inconsistência
        />

        <Text style={styles.label}>Papel</Text>
        <Text style={styles.readonly}>{user.papel}</Text>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.readonly}>{user.status}</Text>

        <View style={styles.actions}>
          <View />
          <PressableButton title={isSaving ? "Salvando..." : "Salvar"} disabled={isSaving} onPress={handleSave} />
        </View>

        <View style={styles.actions}>
          <PressableButton
            title="Alterar senha"
            disabled={uploadingPhoto || resettingPassword}
            onPress={() => router.push("/auth/change-password" as any)}
          />
        </View>

        {message ? <Text style={styles.successText}>{message}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PressableButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.saveButton, disabled && styles.saveButtonDisabled]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Text style={styles.saveButtonText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
  center: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  loadingText: { color: "#e5e7eb", marginTop: 12 },
  title: { color: "#e5e7eb", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#94a3b8", fontSize: 14, marginBottom: 8 },
  label: { color: "#cbd5e1", fontSize: 13, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#e5e7eb",
    backgroundColor: "#0b1224",
  },
  readonly: { color: "#94a3b8", paddingVertical: 6 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: "#facc15",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#0f172a",
    fontWeight: "700",
    textAlign: "center",
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#111827",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "700",
  },
  successText: {
    color: "#22c55e",
    marginTop: 8,
  },
});
