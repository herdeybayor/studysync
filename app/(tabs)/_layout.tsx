import { Tabs } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

import { Icons } from '~/components/ui/icons';

export default function TabLayout() {
  const { theme } = useUnistyles();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.colors.background },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icons name="home-outline" size={20} color={color} />,
          tabBarLabel: 'Home',
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <Icons name="calendar-outline" size={20} color={color} />,
          tabBarLabel: 'Calendar',
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="recordings"
        options={{
          title: 'Recordings',
          tabBarIcon: ({ color }) => <Icons name="mic-outline" size={20} color={color} />,
          tabBarLabel: 'Recordings',
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icons name="person-outline" size={20} color={color} />,
          tabBarLabel: 'Profile',
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
    </Tabs>
  );
}
