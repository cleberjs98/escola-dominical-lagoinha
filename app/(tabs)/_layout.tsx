import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";

import { useTheme } from "../../hooks/useTheme";
import { firebaseDb } from "../../lib/firebase";
import { TabsMenuOverlay } from "../components/layout/TabsMenuOverlay";

type TabsMenuContextValue = {
	openMenu: () => void;
};

const TabsMenuContext = createContext<TabsMenuContextValue | undefined>(undefined);
const BASE_TAB_HEIGHT = 58;

export function useTabsMenu(): TabsMenuContextValue {
	const ctx = useContext(TabsMenuContext);
	if (!ctx) {
		throw new Error("useTabsMenu must be used within TabsLayout");
	}
	return ctx;
}

export default function TabsLayout() {
	const router = useRouter();
	const { theme: appTheme } = useTheme();
	const insets = useSafeAreaInsets();
	const bottomInset = Platform.OS === "android" ? Math.max(insets.bottom ?? 0, 20) : insets.bottom ?? 0;
	const [lessonsTabFirst, setLessonsTabFirst] = useState(true);
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	useEffect(() => {
		void loadNavSettings();
	}, []);

	const openMenu = useMemo(
		() => ({
			openMenu: () => setIsMenuOpen(true),
		}),
		[]
	);

	async function loadNavSettings() {
		try {
			const snap = await getDoc(doc(firebaseDb, "navigation_settings", "global"));
			if (snap.exists()) {
				setLessonsTabFirst(!!snap.data().lessonsTabFirst);
			}
		} catch (error) {
			console.warn("Navegacao padrao mantida (sem permissao ou sem config).", error);
		}
	}

	return (
		<TabsMenuContext.Provider value={openMenu}>
			<Tabs
				screenOptions={({ route }) => ({
					headerShown: false,
					tabBarHideOnKeyboard: true,
					tabBarActiveTintColor: appTheme.colors.tabBarActive,
					tabBarInactiveTintColor: appTheme.colors.tabBarInactive,
					tabBarStyle: {
						backgroundColor: withAlpha(appTheme.colors.tabBarBackground, 0.78),
						borderTopColor: appTheme.colors.border || appTheme.colors.tabBarBackground,
						height: BASE_TAB_HEIGHT + bottomInset + 6,
						paddingBottom: bottomInset + 6,
						paddingTop: 8,
					},
					tabBarLabel:
						route.name === "(home)"
							? "Home"
							: route.name === "lessons"
								? "Aulas"
								: route.name === "devotionals"
									? "Devocional"
									: undefined,
					tabBarIcon: ({ focused, color, size }) => {
						const iconSize = size ?? 22;
						if (route.name === "(home)") {
							return (
								<MaterialCommunityIcons
									name={focused ? "home" : "home-outline"}
									size={iconSize}
									color={color}
								/>
							);
						}
						if (route.name === "lessons") {
							return (
								<MaterialCommunityIcons
									name={focused ? "book-open-page-variant" : "book-outline"}
									size={iconSize}
									color={color}
								/>
							);
						}
						if (route.name === "devotionals") {
							return (
								<MaterialCommunityIcons
									name={focused ? "heart" : "heart-outline"}
									size={iconSize}
									color={color}
								/>
							);
						}
						return <MaterialCommunityIcons name="dots-horizontal" size={iconSize} color={color} />;
					},
				})}
			>
				<Tabs.Screen
					name="(home)"
					options={{
						tabBarLabel: "Home",
					}}
				/>

				{lessonsTabFirst && (
					<Tabs.Screen
						name="lessons"
						options={{
							tabBarLabel: "Aulas",
						}}
					/>
				)}
				{lessonsTabFirst && (
					<Tabs.Screen
						name="devotionals"
						options={{
							tabBarLabel: "Devocional",
						}}
					/>
				)}

				{!lessonsTabFirst && (
					<Tabs.Screen
						name="devotionals"
						options={{
							tabBarLabel: "Devocional",
						}}
					/>
				)}
				{!lessonsTabFirst && (
					<Tabs.Screen
						name="lessons"
						options={{
							tabBarLabel: "Aulas",
						}}
					/>
				)}

				<Tabs.Screen
					name="manage"
					options={{
						href: null,
					}}
				/>
				<Tabs.Screen
					name="profile"
					options={{
						href: null,
					}}
				/>
			</Tabs>

			{isMenuOpen ? (
				<TabsMenuOverlay onClose={() => setIsMenuOpen(false)} navigate={(path) => router.push(path as any)} />
			) : null}
		</TabsMenuContext.Provider>
	);
}

function withAlpha(color: string, alpha: number): string {
	if (color.startsWith("#") && (color.length === 7 || color.length === 9)) {
		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}
	return color;
}


