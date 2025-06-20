import { Tabs } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

import { Icons } from '~/components/ui/icons';

export default function TabLayout() {
  const { theme } = useUnistyles();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: theme.colors.primary }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Icons name="home" size={20} color={color} />,
          tabBarLabel: 'Home',
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <Icons name="calendar" size={20} color={color} />,
          tabBarLabel: 'Calendar',
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="recordings"
        options={{
          title: 'Recordings',
          tabBarIcon: ({ color }) => <Icons name="recording" size={20} color={color} />,
          tabBarLabel: 'Recordings',
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Icons name="person" size={20} color={color} />,
          tabBarLabel: 'Profile',
          tabBarLabelStyle: { fontSize: 12 },
        }}
      />
    </Tabs>
  );
}
