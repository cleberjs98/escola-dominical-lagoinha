export function mapAuthErrorToMessage(
  code: string,
  context: "login" | "reset" | "signup" = "login"
): string {
  switch (code) {
    case "auth/invalid-email":
      return "E-mail inválido. Verifique e tente novamente.";
    case "auth/user-not-found":
      if (context === "login") return "E-mail ou senha incorretos.";
      return "Não encontramos uma conta com este e-mail.";
    case "auth/wrong-password":
      return "E-mail ou senha incorretos.";
    case "auth/user-disabled":
      return "Esta conta está desativada. Fale com a coordenação.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Tente novamente em alguns minutos.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com este e-mail.";
    case "auth/weak-password":
      return "A senha é muito fraca. Use uma senha mais forte.";
    default:
      if (context === "login") {
        return "Email ou senha incorretos.";
      }
      return "Não foi possível completar a operação. Tente novamente.";
  }
}
