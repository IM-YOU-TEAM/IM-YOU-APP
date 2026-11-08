import { usePathname } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useWindowDimensions, View } from "react-native";
import {
  BottomBar,
  BottomBarInsetProvider,
  BOTTOM_BAR_SPACE,
  Sidebar,
  type NavItem,
} from "@/components";
import { colors, WIDE } from "@/lib/theme";

// Phones: floating bottom bar. Wide screens (>= WIDE): Seagrass sidebar. Both end with Log out.
export default function ClinicianLayout() {
  const pathname = usePathname();
  const wide = useWindowDimensions().width >= WIDE;

  const items: NavItem[] = [
    // The dashboard is the patient list, so one item covers it and the patient detail pages.
    {
      label: "Patients",
      icon: "people",
      href: "/dashboard",
      active:
        pathname.startsWith("/dashboard") || pathname.startsWith("/patients"),
    },
  ];

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        backgroundColor: colors.honeydew,
      }}
    >
      {wide && <Sidebar items={items} />}
      <BottomBarInsetProvider value={wide ? 0 : BOTTOM_BAR_SPACE}>
        <View style={{ flex: 1 }}>
          <Tabs
            screenOptions={{
              headerShown: false,
              title: "I'M YOU",
              sceneStyle: { backgroundColor: colors.honeydew },
            }}
            tabBar={() => (wide ? null : <BottomBar items={items} />)}
          >
            <Tabs.Screen name="dashboard/index" />
            {/* Detail route (dashboard -> patient). Our custom bars only show `items`, so it never appears as a tab. */}
            <Tabs.Screen name="patients/[patientId]/index" />
          </Tabs>
        </View>
      </BottomBarInsetProvider>
    </View>
  );
}
