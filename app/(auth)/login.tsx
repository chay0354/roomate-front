import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import Button from '@/components/Button';
import Input from '@/components/Input';
import KeyboardScroll from '@/components/KeyboardScroll';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import { colors, fontSize, spacing } from '@/lib/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { setGuest } = useGuest();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    try {
      setLoading(true);
      await setGuest(false);
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'התחברות נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardScroll contentContainerStyle={styles.screen}>
        <Text style={styles.title}>התחברות</Text>
        <Input
          label="מייל"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="סיסמה"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="התחבר" onPress={onSubmit} loading={loading} />
        <Button
          title="אין לי חשבון"
          variant="ghost"
          onPress={() => router.push('/(auth)/path')}
          style={{ marginTop: spacing.md }}
        />
      </KeyboardScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.xl },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'left',
  },
});
