export const options = {
  title: "Meu Perfil",
};import { useEffect, useMemo, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Pressable,
  Image,
  Modal,
  TouchableWithoutFeedback,
  BackHandler,
} from "react-native";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { HeaderBackButton } from "@react-navigation/elements";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";

import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import type { AppTheme } from "../../types/theme";
import { updateUserProfile } from "../../lib/users";
import { firebaseAuth, firebaseDb, firebaseStorage } from "../../lib/firebase";
import { AppBackground } from "../../components/layout/AppBackground";
import { KeyboardScreen } from "../../components/layout/KeyboardScreen";

export default function ProfileScreen() {
  const router = useRouter();
    const navigation = useNavigation();
  const { firebaseUser, user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoActionLoading, setPhotoActionLoading] = useState(false);

  useEffect(() => {
    if (!isInitializing && !firebaseUser) {
      router.replace("/auth/login" as any);
    }
  }, [firebaseUser, isInitializing, router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <HeaderBackButton onPress={() => router.replace("/(tabs)" as any)} tintColor={theme.colors.text} />
      ),
    });
  }, [navigation, router, theme.colors.text]);

  useFocusEffect(
    useMemo(
      () => () => {
        const onBack = () => {
          router.replace("/(tabs)" as any);
          return true;
        };
        const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
        return () => sub.remove();
      },
      [router]
    )
  );

  useEffect(() => {
    if (user) {
      setNome(user.nome || "");
      setTelefone(user.telefone || "");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const birth = (user as any).data_nascimento || "";
      setDataNascimento(birth);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const foto = (user as any).photoURL || (user as any).foto_url || null;
      setPhotoUrl(foto);
    }
  }, [user]);

  const avatarLetter = useMemo(
    () => (nome?.[0]?.toUpperCase?.() || firebaseUser?.email?.[0]?.toUpperCase?.() || "U"),
    [nome, firebaseUser?.email]
  );

  if (isInitializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
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
        nome: nome.trim(), // leitura apenas, mantido
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

  function openPhotoModal() {
    setPhotoError(null);
    setPhotoModalVisible(true);
  }

  function closePhotoModal() {
    if (photoActionLoading) return;
    setPhotoModalVisible(false);
  }

  async function pickAndUploadPhoto() {
    try {
      setPhotoError(null);
      setPhotoActionLoading(true);
      const userAuth = firebaseAuth.currentUser;
      if (!userAuth) {
        setPhotoError("Não foi possível identificar o usuário logado.");
        setPhotoActionLoading(false);
        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        setPhotoError("Permissão para acessar a galeria negada.");
        setPhotoActionLoading(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) {
        setPhotoActionLoading(false);
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const extension = (asset.fileName?.split(".").pop() || asset.uri.split(".").pop() || "jpg").toLowerCase();

      const fileRef = ref(firebaseStorage, `avatars/${userAuth.uid}/profile.${extension}`);
      await uploadBytes(fileRef, blob);
      const url = await getDownloadURL(fileRef);

      const userDocRef = doc(firebaseDb, "users", userAuth.uid);
      await updateDoc(userDocRef, {
        photoURL: url,
        updated_at: new Date(),
      });

      setPhotoUrl(url);
      setMessage("Foto atualizada com sucesso.");
      setPhotoModalVisible(false);
    } catch (err) {
      console.error("[Profile] Erro ao enviar/trocar foto", err);
      setPhotoError("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setPhotoActionLoading(false);
    }
  }

  async function handleRemovePhoto() {
    try {
      setPhotoError(null);
      setPhotoActionLoading(true);
      const userAuth = firebaseAuth.currentUser;
      if (!userAuth) {
        setPhotoError("Não foi possível identificar o usuário logado.");
        setPhotoActionLoading(false);
        return;
      }
      const ext = photoUrl?.split(".").pop()?.split("?")[0] || "jpg";
      const fileRef = ref(firebaseStorage, `avatars/${userAuth.uid}/profile.${ext}`);
      try {
        await deleteObject(fileRef);
      } catch (e) {
        console.warn("[Profile] Não foi possível remover arquivo de avatar:", (e as any)?.code);
      }
      const userDocRef = doc(firebaseDb, "users", userAuth.uid);
      await updateDoc(userDocRef, {
        photoURL: null,
        updated_at: new Date(),
      });
      setPhotoUrl(null);
      setMessage("Foto removida com sucesso.");
      setPhotoModalVisible(false);
    } catch (err) {
      console.error("[Profile] Erro ao remover foto", err);
      setPhotoError("Não foi possível remover a foto. Tente novamente.");
    } finally {
      setPhotoActionLoading(false);
    }
  }

  return (
    <AppBackground>
      <KeyboardScreen style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meu perfil</Text>
        <Text style={styles.subtitle}>
          {isStudent
            ? "Atualize seus dados básicos. Papel e status são definidos pela coordenação."
            : "Atualize seus dados básicos."}
        </Text>

        <View style={styles.photoRow}>
          <Pressable onPress={openPhotoModal}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
            )}
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
          placeholderTextColor={theme.colors.muted}
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={setTelefone}
        />

        <Text style={styles.label}>Data de nascimento</Text>
        <TextInput
          style={styles.input}
          placeholder="aaaa-mm-dd"
          placeholderTextColor={theme.colors.muted}
          value={dataNascimento}
          onChangeText={setDataNascimento}
          editable={false}
        />

        <Text style={styles.label}>Papel</Text>
        <Text style={styles.readonly}>{user.papel}</Text>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.readonly}>{user.status}</Text>

        <View style={styles.actions}>
          <View />
          <PressableButton title={isSaving ? "Salvando..." : "Salvar"} disabled={isSaving} onPress={handleSave} styles={styles} />
        </View>

        <View style={styles.actions}>
          <PressableButton
            title="Alterar senha"
            disabled={uploadingPhoto}
            onPress={() => router.push("/auth/change-password" as any)}
            styles={styles}
          />
        </View>

        {message ? <Text style={styles.successText}>{message}</Text> : null}
        {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
      </KeyboardScreen>

      <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={closePhotoModal}>
        <TouchableWithoutFeedback onPress={closePhotoModal}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {photoUrl ? (
                  <>
                    <Image source={{ uri: photoUrl }} style={styles.modalImage} />
                    <Pressable
                      style={[styles.modalButton, styles.modalButtonPrimary, photoActionLoading && styles.saveButtonDisabled]}
                      onPress={pickAndUploadPhoto}
                      disabled={photoActionLoading}
                    >
                      {photoActionLoading ? (
                        <ActivityIndicator color={theme.colors.background} />
                      ) : (
                        <Text style={styles.modalButtonTextDark}>Trocar foto</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.modalButton, styles.modalButtonDanger, photoActionLoading && styles.saveButtonDisabled]}
                      onPress={handleRemovePhoto}
                      disabled={photoActionLoading}
                    >
                      {photoActionLoading ? (
                        <ActivityIndicator color={theme.colors.accent} />
                      ) : (
                        <Text style={styles.modalButtonTextLight}>Remover foto</Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.modalPlaceholderCircle}>
                      <Text style={styles.modalPlaceholderInitial}>{avatarLetter}</Text>
                    </View>
                    <Pressable
                      style={[styles.modalButton, styles.modalButtonPrimary, photoActionLoading && styles.saveButtonDisabled]}
                      onPress={pickAndUploadPhoto}
                      disabled={photoActionLoading}
                    >
                      {photoActionLoading ? (
                        <ActivityIndicator color={theme.colors.background} />
                      ) : (
                        <Text style={styles.modalButtonTextDark}>Enviar foto</Text>
                      )}
                    </Pressable>
                  </>
                )}
                {photoError ? <Text style={styles.photoErrorText}>{photoError}</Text> : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </AppBackground>
  );
}

function PressableButton({
  title,
  onPress,
  disabled,
  styles,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable style={[styles.saveButton, disabled && styles.saveButtonDisabled]} onPress={disabled ? undefined : onPress} disabled={disabled}>
      <Text style={styles.saveButtonText}>{title}</Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 24, gap: 12 },
    center: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
    },
    loadingText: { color: theme.colors.text, marginTop: 12 },
    title: { color: theme.colors.text, fontSize: 22, fontWeight: "700" },
    subtitle: { color: theme.colors.muted, fontSize: 14, marginBottom: 8 },
    label: { color: theme.colors.textSecondary || theme.colors.text, fontSize: 13, marginTop: 8 },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border || theme.colors.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.text,
      backgroundColor: theme.colors.inputBg || theme.colors.card,
    },
    readonly: { color: theme.colors.muted, paddingVertical: 6 },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 16,
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 18,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: theme.colors.accent,
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
      backgroundColor: theme.colors.card,
    },
    avatarPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: "700",
    },
    successText: {
      color: theme.colors.text,
      marginTop: 8,
    },
    photoError: {
      color: theme.colors.status?.warningText || theme.colors.text,
      marginTop: 4,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.7)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    modalContent: {
      width: "100%",
      maxWidth: 400,
      alignItems: "center",
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border || theme.colors.card,
    },
    modalImage: {
      width: 220,
      height: 220,
      borderRadius: 110,
      marginBottom: 24,
    },
    modalPlaceholderCircle: {
      width: 220,
      height: 220,
      borderRadius: 110,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: theme.colors.text,
      marginBottom: 24,
    },
    modalPlaceholderInitial: {
      fontSize: 64,
      color: theme.colors.text,
      fontWeight: "700",
    },
    modalButton: {
      width: "100%",
      borderRadius: 999,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    modalButtonPrimary: {
      backgroundColor: theme.colors.accent,
      borderWidth: 1,
      borderColor: theme.colors.border || theme.colors.card,
    },
    modalButtonDanger: {
      backgroundColor: theme.colors.status?.dangerBg || theme.colors.primary,
    },
    modalButtonTextDark: {
      color: theme.colors.background,
      fontWeight: "600",
    },
    modalButtonTextLight: {
      color: theme.colors.accent,
      fontWeight: "600",
    },
    photoErrorText: {
      color: theme.colors.status?.warningText || theme.colors.text,
      marginTop: 8,
      textAlign: "center",
    },
  });
}
