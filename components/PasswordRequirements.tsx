import React from "react";
import { View, Text, StyleSheet } from "react-native";

type PasswordStrength = "weak" | "fair" | "strong";

export type PasswordRequirementsProps = {
  password: string;
};

export function getPasswordValidation(password: string) {
  const lengthOk = password.length >= 8 && password.length <= 60;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const numberAndSpecialOk = hasNumber && hasSpecial;

  const passedCount = [lengthOk, hasUppercase, numberAndSpecialOk].filter(Boolean).length;

  let strength: PasswordStrength = "weak";
  if (passedCount === 2) strength = "fair";
  if (passedCount === 3) strength = "strong";

  return {
    lengthOk,
    hasUppercase,
    numberAndSpecialOk,
    strength,
  };
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const { lengthOk, hasUppercase, numberAndSpecialOk, strength } = getPasswordValidation(password);

  const strengthLabel = strength === "weak" ? "Fraca" : strength === "fair" ? "Média" : "Forte";
  const strengthPercent = strength === "weak" ? 0.33 : strength === "fair" ? 0.66 : 1;

  return (
    <View style={styles.container}>
      <View style={styles.meterRow}>
        <View style={styles.meterBackground}>
          <View
            style={[
              styles.meterFill,
              {
                flex: strengthPercent,
                backgroundColor:
                  strength === "weak" ? "#e53935" : strength === "fair" ? "#fb8c00" : "#43a047",
              },
            ]}
          />
          <View style={{ flex: 1 - strengthPercent }} />
        </View>
        <Text style={styles.strengthLabel}>{strengthLabel}</Text>
      </View>

      <View style={styles.rulesContainer}>
        <RequirementItem ok={lengthOk} text="Entre 8 e 60 caracteres" />
        <RequirementItem ok={hasUppercase} text="Pelo menos uma letra maiúscula" />
        <RequirementItem ok={numberAndSpecialOk} text="Pelo menos um número E um caractere especial" />
      </View>
    </View>
  );
};

type RequirementItemProps = {
  ok: boolean;
  text: string;
};

const RequirementItem: React.FC<RequirementItemProps> = ({ ok, text }) => {
  return (
    <View style={styles.ruleRow}>
      <Text style={[styles.ruleIcon, { color: ok ? "#43a047" : "#e53935" }]}>{ok ? "✓" : "•"}</Text>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
  },
  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  meterBackground: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    flexDirection: "row",
    overflow: "hidden",
  },
  meterFill: {
    height: 4,
  },
  strengthLabel: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  rulesContainer: {
    marginTop: 4,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  ruleIcon: {
    marginRight: 6,
    fontSize: 14,
    width: 16,
    textAlign: "center",
  },
  ruleText: {
    fontSize: 13,
    color: "#4b5563",
  },
});
