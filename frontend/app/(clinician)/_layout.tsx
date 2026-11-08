<<<<<<< HEAD
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
=======
import { usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { BottomBarInsetProvider, TopBar, TopChromeProvider, type NavItem } from '@/components';
import { colors } from '@/lib/theme';
>>>>>>> origin/main

// Same glass top widget as the patient desktop chrome, on every clinician screen size.
export default function ClinicianLayout() {
  const pathname = usePathname();

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
<<<<<<< HEAD
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
=======
    <View style={{ flex: 1, backgroundColor: colors.honeydew }}>
      <TopChromeProvider value>
        <TopBar items={items} />
        <BottomBarInsetProvider value={0}>
          <View style={{ flex: 1 }}>
            <Tabs
              screenOptions={{ headerShown: false, title: "I'M YOU", sceneStyle: { backgroundColor: colors.honeydew } }}
              tabBar={() => null}
            >
              <Tabs.Screen name="dashboard/index" />
              {/* Detail route (dashboard -> patient). Our custom bars only show `items`, so it never appears as a tab. */}
              <Tabs.Screen name="patients/[patientId]/index" />
              <Tabs.Screen name="patients/[patientId]/live/index" />
            </Tabs>
          </View>
        </BottomBarInsetProvider>
      </TopChromeProvider>
>>>>>>> origin/main
    </View>
  );
}
