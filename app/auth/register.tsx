import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { firebaseAuth, firebaseDb } from "../../lib/firebase";
import { Card } from "../../components/ui/Card";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { useTheme } from "../../hooks/useTheme";
import {
  isNonEmpty,
  isValidDateLike,
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from "../../utils/validation";
import { sanitizeText } from "../../utils/sanitize";

type FormErrors = Partial<{
  nome: string;
  email: string;
  password: string;
  confirmPassword: string;
  dataNascimento: string;
  telefone: string;
}>;

const COUNTRY_CODES = [
  { label: "+55 Brasil", value: "+55" },
  { label: "+351 Portugal", value: "+351" },
  { label: "+353 Irlanda", value: "+353" },
  { label: "+44 Reino Unido", value: "+44" },
  { label: "+1 EUA/Canada", value: "+1" },
];

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) return day;
  if (digits.length <= 4) return `${day}/${month}`;
  return `${day}/${month}/${year}`;
}

function normalizeDateToISO(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00Z`);
  const isValidDate =
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day);

  return isValidDate ? iso : null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { themeSettings } = useTheme();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [codigoPais, setCodigoPais] = useState(COUNTRY_CODES[0].value);
  const [telefone, setTelefone] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCodes, setShowCodes] = useState(false);

  const corFundo = themeSettings?.cor_fundo || "#020617";

  const selectedCodeLabel = useMemo(() => {
    const found = COUNTRY_CODES.find((c) => c.value === codigoPais);
    return found?.label || codigoPais;
  }, [codigoPais]);

  function handleDateChange(value: string) {
    setDataNascimento(formatDateInput(value));
  }

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "");
    setTelefone(digits);
  }

  function validate(): { ok: boolean; normalizedDate?: string } {
    const validationErrors: FormErrors = {};
    const trimmedName = sanitizeText(nome).trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();
    const trimmedDate = dataNascimento.trim();
    const normalizedDate = normalizeDateToISO(trimmedDate);
    const phoneDigits = telefone.replace(/\D/g, "");

    if (!isNonEmpty(trimmedName, 3)) {
      validationErrors.nome = "Informe seu nome completo.";
    }
    if (!isValidEmail(trimmedEmail)) {
      validationErrors.email = "Informe um email valido.";
    }
    if (!isValidPassword(trimmedPassword)) {
      validationErrors.password = "A senha deve ter pelo menos 8 caracteres.";
    }
    if (trimmedPassword !== trimmedConfirm) {
      validationErrors.confirmPassword = "As senhas nao conferem.";
    }
    if (!isNonEmpty(trimmedDate) || !isValidDateLike(trimmedDate) || !normalizedDate) {
      validationErrors.dataNascimento = "Data deve estar no formato dd/mm/aaaa.";
    }
    if (!isValidPhone(phoneDigits)) {
      validationErrors.telefone = "Informe um telefone com ao menos 9 digitos.";
    }

    setErrors(validationErrors);
    return { ok: Object.keys(validationErrors).length === 0, normalizedDate: normalizedDate ?? undefined };
  }

  async function handleRegister() {
    const { ok, normalizedDate } = validate();
    if (!ok || !normalizedDate) return;

    try {
      setIsSubmitting(true);
      const trimmedEmail = email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        trimmedEmail,
        password.trim()
      );

      const uid = cred.user.uid;
      const sanitizedName = sanitizeText(nome).trim();
      const phoneDigits = telefone.replace(/\D/g, "");
      const fullPhone = `${codigoPais}${phoneDigits}`; // salvamos telefone completo (codigo + numero) no campo `telefone`

      await setDoc(doc(firebaseDb, "users", uid), {
        id: uid,
        nome: sanitizedName,
        email: trimmedEmail,
        telefone: fullPhone,
        data_nascimento: normalizedDate,
        papel: "aluno",
        status: "pendente",
        aprovado_por_id: null,
        aprovado_em: null,
        alterado_por_id: null,
        alterado_em: null,
        papel_anterior: null,
        motivo_rejeicao: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      router.replace("/auth/pending");
    } catch (error: any) {
      console.error("Erro ao criar conta:", error);
      if (error?.code === "auth/email-already-in-use") {
        const msg =
          "Este e-mail ja esta em uso. Tente outro e-mail ou faca login.";
        setErrors((prev) => ({ ...prev, email: msg }));
        Alert.alert("E-mail ja cadastrado", msg);
        return;
      }

      Alert.alert(
        "Erro ao criar conta",
        "Erro ao criar conta, tente novamente mais tarde."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: corFundo }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.inner, { backgroundColor: corFundo }]}>
          <Card
            title="Criar conta"
            subtitle="Preencha os dados abaixo para se cadastrar."
          >
            <View style={styles.form}>
              <AppInput
                label="Nome completo"
                placeholder="Seu nome"
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
                error={errors.nome}
              />

              <AppInput
                label="Email"
                placeholder="seuemail@exemplo.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
              />

              <AppInput
                label="Senha"
                placeholder="********"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                error={errors.password}
              />

              <AppInput
                label="Confirmar senha"
                placeholder="********"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
              />

              <AppInput
                label="Data de nascimento"
                placeholder="dd/mm/aaaa"
                keyboardType="number-pad"
                value={dataNascimento}
                onChangeText={handleDateChange}
                error={errors.dataNascimento}
              />

              <Text style={styles.label}>Telefone</Text>
              <View style={styles.phoneRow}>
                <Pressable
                  style={styles.codeSelector}
                  onPress={() => setShowCodes((prev) => !prev)}
                >
                  <Text style={styles.codeLabel}>Codigo</Text>
                  <Text style={styles.codeValue}>{selectedCodeLabel}</Text>
                </Pressable>
                <AppInput
                  style={styles.phoneInput}
                  placeholder="Apenas numeros"
                  keyboardType="phone-pad"
                  value={telefone}
                  onChangeText={handlePhoneChange}
                />
              </View>
              {errors.telefone ? (
                <Text style={styles.errorText}>{errors.telefone}</Text>
              ) : null}

              {showCodes ? (
                <View style={styles.codeList}>
                  {COUNTRY_CODES.map((item) => (
                    <Pressable
                      key={item.value}
                      style={[
                        styles.codeOption,
                        item.value === codigoPais && styles.codeOptionActive,
                      ]}
                      onPress={() => {
                        setCodigoPais(item.value);
                        setShowCodes(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.codeOptionText,
                          item.value === codigoPais && styles.codeOptionTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <AppButton
                title={isSubmitting ? "Criando..." : "Criar conta"}
                onPress={handleRegister}
                loading={isSubmitting}
                disabled={isSubmitting}
              />

              <View style={styles.linksRow}>
                <Text style={styles.smallText}>Ja tem conta? </Text>
                <Link href="/auth/login" style={styles.linkText}>
                  Fazer login
                </Link>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 80,
    paddingBottom: 32,
  },
  form: {
    gap: 12,
  },
  label: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  codeSelector: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0f172a",
    minWidth: 120,
  },
  codeLabel: {
    color: "#9ca3af",
    fontSize: 11,
    marginBottom: 2,
  },
  codeValue: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  phoneInput: {
    flex: 1,
  },
  codeList: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    backgroundColor: "#0f172a",
    marginTop: -4,
    marginBottom: 8,
    overflow: "hidden",
  },
  codeOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  codeOptionActive: {
    backgroundColor: "#13233e",
  },
  codeOptionText: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  codeOptionTextActive: {
    fontWeight: "700",
    color: "#22c55e",
  },
  linksRow: {
    flexDirection: "row",
    marginTop: 12,
    alignItems: "center",
  },
  linkText: {
    color: "#38bdf8",
    fontWeight: "500",
  },
  smallText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 2,
  },
});
