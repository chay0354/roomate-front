import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import Button from '@/components/Button';
import Screen from '@/components/Screen';
import { useGuest } from '@/contexts/GuestContext';
import { colors, fontSize, spacing } from '@/lib/theme';

export default function WelcomeScreen() {
  const { setGuest } = useGuest();

  return (
    <Screen style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.logo}>🏠</Text>
        <Text style={styles.title}>
          ברוך הבא ל<Text style={styles.brand}>RooMate</Text>
        </Text>
        <Text style={styles.subtitle}>
          הרשת החברתית למציאת דירות שותפים.{'\n'}
          מצא דירה, הכר אנשים, תרגיש בבית.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button title="בוא נתחיל" onPress={() => router.push('/(auth)/path')} />
        <Button
          title="יש לי כבר חשבון"
          variant="secondary"
          onPress={() => router.push('/(auth)/login')}
          style={{ marginTop: spacing.md }}
        />
        <Button
          title="המשך בלי הרשמה ←"
          variant="ghost"
          onPress={async () => {
            await setGuest(true);
            router.replace('/(tabs)');
          }}
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 72,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  brand: {
    color: colors.or,
  },
  subtitle: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    paddingBottom: spacing.xl,
  },
});
