import { ActivityIndicator, View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LayoutDashboard, ScanLine, CirclePlus } from "lucide-react-native";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { colors as defaultColors, fonts } from "./src/theme";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AlertProvider } from "./src/components/AlertProvider";
import DashboardScreen from "./src/screens/DashboardScreen";
import ScanScreen from "./src/screens/ScanScreen";
import ManualEntryScreen from "./src/screens/ManualEntryScreen";
import NotificationsButton from "./src/components/NotificationsButton";
import MenuButton from "./src/components/MenuButton";
import NotificationBanner from "./src/components/NotificationBanner";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import { HelpProvider } from "./src/context/HelpContext";
const Tab = createBottomTabNavigator();
function Tabs() {
  const {
    colors
  } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);
  return <Tab.Navigator screenOptions={({
    route
  }) => ({
    headerStyle: {
      backgroundColor: "transparent"
    },
    headerShadowVisible: false,
    headerTintColor: colors.fg,
    headerTitleStyle: {
      fontFamily: fonts.bold,
      fontSize: 20
    },
    headerRight: () => <View style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginRight: 14
    }}>
            <NotificationsButton />
            <MenuButton />
          </View>,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
      height: 62 + bottomInset,
      paddingTop: 8,
      paddingBottom: bottomInset
    },
    tabBarLabelStyle: {
      fontFamily: fonts.medium,
      fontSize: 12,
      marginTop: 2
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.fgMuted,
    tabBarIcon: ({
      color,
      size
    }) => {
      const map = {
        Dashboard: LayoutDashboard,
        Scan: ScanLine,
        Add: CirclePlus
      };
      const Icon = map[route.name];
      return <Icon size={size} color={color} />;
    }
  })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Add" component={ManualEntryScreen} />
    </Tab.Navigator>;
}
function Splash() {
  return <View style={{
    flex: 1,
    backgroundColor: defaultColors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 22
  }}>
      <Image source={require("./assets/logo.png")} style={{
      width: 120,
      height: 120,
      borderRadius: 28
    }} />
      <ActivityIndicator color={defaultColors.primary} />
    </View>;
}
function Root() {
  const {
    colors,
    bgGradient,
    statusBar
  } = useTheme();
  const base = statusBar === "dark" ? DefaultTheme : DarkTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: "transparent",
      card: "transparent",
      text: colors.fg,
      border: colors.border,
      primary: colors.primary
    }
  };
  return <View style={{
    flex: 1,
    backgroundColor: colors.bg
  }}>
      <LinearGradient colors={bgGradient} start={{
      x: 0.5,
      y: 0
    }} end={{
      x: 0.5,
      y: 1
    }} style={StyleSheet.absoluteFill} />
      <NavigationContainer theme={navTheme}>
        <StatusBar style={statusBar === "dark" ? "dark" : "light"} />
        <Tabs />
      </NavigationContainer>
      <NotificationBanner />
    </View>;
}
export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold
  });
  if (!fontsLoaded) return <Splash />;
  return <SafeAreaProvider>
      <ThemeProvider>
        <AlertProvider>
          <NotificationsProvider>
            <HelpProvider>
              <Root />
            </HelpProvider>
          </NotificationsProvider>
        </AlertProvider>
      </ThemeProvider>
    </SafeAreaProvider>;
}