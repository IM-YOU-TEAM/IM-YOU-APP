<<<<<<< HEAD
import { usePathname } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { useWindowDimensions, View } from "react-native";
import {
  BottomBar,
  BottomBarInsetProvider,
  BOTTOM_BAR_SPACE,
  TopBar,
  type NavItem,
} from "@/components";
import { colors, WIDE } from "@/lib/theme";
=======
import { usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions, View } from 'react-native';
import { BottomBar, BottomBarInsetProvider, BOTTOM_BAR_SPACE, TopBar, TopChromeProvider, type NavItem } from '@/components';
import { colors, WIDE } from '@/lib/theme';
>>>>>>> origin/main

// Phones: floating bottom bar. Web / desktop (>= WIDE): glass widget across the top.
export default function PatientLayout() {
  const pathname = usePathname();
  const wide = useWindowDimensions().width >= WIDE;

  const items: NavItem[] = [
    {
      label: "Home",
      icon: "home",
      href: "/home",
      active: pathname.startsWith("/home"),
    },
    {
      label: "Track",
      icon: "pulse",
      href: "/track/motion-type",
      active: pathname.startsWith("/track"),
    },
    {
      label: "Results",
      icon: "stats-chart",
      href: "/results",
      active: pathname.startsWith("/results"),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.honeydew }}>
<<<<<<< HEAD
      {wide && <TopBar items={items} />}
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
            <Tabs.Screen name="home/index" />
            <Tabs.Screen name="track" />
            <Tabs.Screen name="results/index" />
          </Tabs>
        </View>
      </BottomBarInsetProvider>
=======
      <TopChromeProvider value={wide}>
        {wide && <TopBar items={items} />}
        <BottomBarInsetProvider value={wide ? 0 : BOTTOM_BAR_SPACE}>
          <View style={{ flex: 1 }}>
            <Tabs
              screenOptions={{ headerShown: false, title: "I'M YOU", sceneStyle: { backgroundColor: colors.honeydew } }}
              tabBar={() => (wide ? null : <BottomBar items={items} />)}
            >
              <Tabs.Screen name="home/index" />
              <Tabs.Screen name="track" />
              <Tabs.Screen name="results/index" />
            </Tabs>
          </View>
        </BottomBarInsetProvider>
      </TopChromeProvider>
>>>>>>> origin/main
    </View>
  );
}
