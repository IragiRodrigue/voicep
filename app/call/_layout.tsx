import { Stack } from 'expo-router';

export default function CallLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="outgoing" />
      <Stack.Screen name="active" />
    </Stack>
  );
}
