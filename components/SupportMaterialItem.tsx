// components/SupportMaterialItem.tsx
import { Pressable, StyleSheet, Text, View, Image } from "react-native";
import type { SupportMaterial } from "../types/material";

interface SupportMaterialItemProps {
  material: SupportMaterial;
  onPress?: () => void;
  previewImage?: boolean;
}

export function SupportMaterialItem({ material, onPress, previewImage }: SupportMaterialItemProps) {
  const isImage =
    material.mime_type?.startsWith("image/") ||
    material.tipo_material === "imagem" ||
    material.tipo_material === "apresentacao";

  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      <View style={styles.row}>
        <Text style={styles.badge}>[{material.tipo_material}]</Text>
        <Text style={styles.title} numberOfLines={1}>
          {material.nome}
        </Text>
      </View>
      {material.descricao ? (
        <Text style={styles.desc} numberOfLines={2}>
          {material.descricao}
        </Text>
      ) : null}
      {previewImage && isImage && material.url_externa ? (
        <Image source={{ uri: material.url_externa }} style={styles.previewImage} />
      ) : null}
      {material.url_externa ? (
        <Text style={styles.meta}>Link: {material.url_externa}</Text>
      ) : null}
      {material.caminho_storage ? (
        <Text style={styles.meta}>Storage: {material.caminho_storage}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#2A0E12",
    marginBottom: 8,
    gap: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { color: "#22c55e", fontWeight: "700", fontSize: 12 },
  title: { color: "#e5e7eb", fontWeight: "700", fontSize: 14, flexShrink: 1 },
  desc: { color: "#cbd5e1", fontSize: 13 },
  meta: { color: "#94a3b8", fontSize: 12 },
  previewImage: { height: 120, borderRadius: 8, resizeMode: "cover" },
});

