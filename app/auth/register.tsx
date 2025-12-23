import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { firebaseAuth, firebaseDb } from "../../lib/firebase";
import { Card } from "../../components/ui/Card";
import { AppInput } from "../../components/ui/AppInput";
import { AppButton } from "../../components/ui/AppButton";
import { useTheme } from "../../hooks/useTheme";
import type { AppTheme } from "../../theme/tokens";
import {
  isNonEmpty,
  isValidDateLike,
  isValidEmail,
  isValidPhone,
  validateStrongPassword,
} from "../../utils/validation";
import { sanitizeText } from "../../utils/sanitize";
import {
  PasswordRequirements,
  getPasswordValidation,
} from "../../components/PasswordRequirements";
import { mapAuthErrorToMessage } from "../../lib/auth/errorMessages";

type FormErrors = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  dataNascimento: string;
  codigoPais: string;
  telefone: string;
}>;

const countryCodeToFlag: Record<string, string> = {
  "353": "🇮🇪",
  "55": "🇧🇷",
  "351": "🇵🇹",
  "44": "🇬🇧",
  "1": "🇺🇸",
};

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
  const { theme, themeSettings } = useTheme();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [codigoPais, setCodigoPais] = useState("55");
  const [telefone, setTelefone] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const corFundo = themeSettings?.cor_fundo || "#1A0509";
  const styles = useMemo(() => createStyles(theme), [theme]);

  const flag = useMemo(() => {
    const digits = codigoPais.replace(/\D/g, "");
    return countryCodeToFlag[digits] || "🏳️";
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
    const trimmedFirstName = sanitizeText(firstName).trim();
    const trimmedLastName = sanitizeText(lastName).trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();
    const trimmedDate = dataNascimento.trim();
    const normalizedDate = normalizeDateToISO(trimmedDate);
    const phoneDigits = telefone.replace(/\D/g, "");
    const codeDigits = codigoPais.replace(/\D/g, "");

    if (!isNonEmpty(trimmedFirstName, 1)) {
      validationErrors.firstName = "Informe seu nome.";
    }
    if (!isNonEmpty(trimmedLastName, 1)) {
      validationErrors.lastName = "Informe seu sobrenome.";
    }
    if (!isValidEmail(trimmedEmail)) {
      validationErrors.email = "Informe um email valido.";
    }
    const strongPasswordError = validateStrongPassword(trimmedPassword);
    if (strongPasswordError) {
      validationErrors.password = strongPasswordError;
    }
    if (trimmedPassword !== trimmedConfirm) {
      validationErrors.confirmPassword = "As senhas nao conferem.";
    }
    if (!isNonEmpty(trimmedDate) || !isValidDateLike(trimmedDate) || !normalizedDate) {
      validationErrors.dataNascimento = "Data deve estar no formato dd/mm/aaaa.";
    }
    if (!isNonEmpty(codeDigits)) {
      validationErrors.codigoPais = "Informe o codigo do pais.";
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

    const pwdValidation = getPasswordValidation(password.trim());
    if (!pwdValidation.lengthOk || !pwdValidation.hasUppercase || !pwdValidation.numberAndSpecialOk) {
      setErrors((prev) => ({
        ...prev,
        password: "Sua senha não atende aos requisitos mínimos.",
      }));
      return;
    }
    if (password.trim() !== confirmPassword.trim()) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "As senhas nao conferem.",
      }));
      return;
    }

    try {
      setIsSubmitting(true);
      const trimmedEmail = email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        trimmedEmail,
        password.trim()
      );

      const uid = cred.user.uid;
      const sanitizedFirst = sanitizeText(firstName).trim();
      const sanitizedLast = sanitizeText(lastName).trim();
      const codeDigits = codigoPais.replace(/\D/g, "");
      const phoneDigits = telefone.replace(/\D/g, "");
      const fullPhone = `+${codeDigits}${phoneDigits}`; // salvamos telefone completo (codigo + numero) no campo `telefone_completo`
      const fullName = `${sanitizedFirst} ${sanitizedLast}`.trim();

      await setDoc(doc(firebaseDb, "users", uid), {
        id: uid,
        nome: sanitizedFirst,
        sobrenome: sanitizedLast,
        nome_completo: fullName,
        email: trimmedEmail,
        codigo_pais: codeDigits,
        telefone: phoneDigits,
        telefone_completo: fullPhone,
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
      console.error("[Auth] Erro ao criar conta", error);
      const msg = mapAuthErrorToMessage(error?.code ?? "auth/unknown", "signup");
      Alert.alert("Erro ao criar conta", msg);
      setErrors((prev) => ({ ...prev, email: msg }));
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
                label="Nome"
                placeholder="Seu nome"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                error={errors.firstName}
              />

              <AppInput
                label="Sobrenome"
                placeholder="Seu sobrenome"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                error={errors.lastName}
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
              <PasswordRequirements password={password} />

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
                <View style={styles.codeSelector}>
                  <Text style={styles.codeLabel}>Codigo</Text>
                  <View style={styles.codeInputRow}>
                    <Text style={styles.flag}>{flag}</Text>
                    <Text style={styles.plus}>+</Text>
                    <TextInput
                      style={styles.codeTextInput}
                      keyboardType="number-pad"
                      value={codigoPais}
                      onChangeText={(v) => setCodigoPais(v.replace(/[^\d]/g, ""))}
                      placeholder="55"
                      placeholderTextColor="#6b7280"
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    style={styles.phoneInput}
                    placeholder="Apenas numeros"
                    keyboardType="phone-pad"
                    value={telefone}
                    onChangeText={handlePhoneChange}
                  />
                </View>
              </View>
              {errors.codigoPais ? (
                <Text style={styles.errorText}>{errors.codigoPais}</Text>
              ) : null}
              {errors.telefone ? (
                <Text style={styles.errorText}>{errors.telefone}</Text>
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

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
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
      color: theme.colors.textMuted || theme.colors.textSecondary || "#9ca3af",
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
      borderColor: theme.colors.inputBorder || theme.colors.border || "#243447",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.inputBg || theme.colors.card || "#1f2430",
      minWidth: 120,
    },
    codeLabel: {
      color: theme.colors.textMuted || theme.colors.textSecondary || "#9ca3af",
      fontSize: 11,
      marginBottom: 2,
    },
    codeInputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    flag: {
      fontSize: 18,
    },
    codeTextInput: {
      color: theme.colors.text || "#e5e7eb",
      fontSize: 14,
      minWidth: 50,
      paddingVertical: 2,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.inputBorder || theme.colors.border || "#243447",
    },
    plus: {
      color: theme.colors.text || "#e5e7eb",
      fontSize: 16,
    },
    phoneInput: {
      flex: 1,
    },
    linksRow: {
      flexDirection: "row",
      marginTop: 12,
      alignItems: "center",
    },
    linkText: {
      color: theme.colors.link || "#38bdf8",
      fontWeight: "500",
    },
    smallText: {
      color: theme.colors.textMuted || theme.colors.textSecondary || "#9ca3af",
      fontSize: 13,
    },
    errorText: {
      color: theme.colors.status?.dangerText || "#ef4444",
      fontSize: 12,
      marginTop: 2,
    },
  });
}

