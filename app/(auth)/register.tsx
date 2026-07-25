import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import Button from '@/components/Button';
import Chip from '@/components/Chip';
import Input from '@/components/Input';
import KeyboardScroll from '@/components/KeyboardScroll';
import Screen from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useGuest } from '@/contexts/GuestContext';
import { useTasks } from '@/contexts/TasksContext';
import { createApartment } from '@/lib/api';
import { colors, fontSize, spacing } from '@/lib/theme';
import type { UserPath } from '@/lib/types';

const HOBBIES = ['💪 חדר כושר', '🧘 יוגה', '🍳 בישול', '🎵 מוזיקה', '🐕 בעלי חיים', '🌱 טבעונות'];

export default function RegisterScreen() {
  const { path: pathParam } = useLocalSearchParams<{ path?: UserPath }>();
  const userPath = (pathParam ?? 'dayer') as UserPath;
  const { signUp } = useAuth();
  const { setGuest } = useGuest();
  const { completeTask } = useTasks();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [rooms, setRooms] = useState('3');

  const maxStep = userPath === 'dira' ? 3 : 2;

  const canContinue = useMemo(() => {
    if (step === 0) {
      return fullName && username && email && phone && password.length >= 6;
    }
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return address && price;
    return false;
  }, [step, fullName, username, email, phone, password, address, price]);

  const toggleHobby = (h: string) => {
    setHobbies((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  };

  const finish = async () => {
    try {
      setLoading(true);
      await setGuest(false);
      const authSession = await signUp({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        user_path: userPath,
      });

      if (userPath === 'dira' && address && price && authSession?.user?.id) {
        await createApartment({
          address,
          price: Number(price),
          rooms: Number(rooms),
          title: address,
          neighborhood: address.split(',')[1]?.trim() ?? null,
          description: bio || 'דירה מעולה לשותפים',
          tags: hobbies.slice(0, 4),
          image_urls: [
            `https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop&q=80`,
          ],
        });
      }

      completeTask('reg');
      if (bio.trim()) completeTask('bio');
      if (age || occupation) completeTask('about');
      if (hobbies.length) completeTask('hobbies');
      router.replace('/(auth)/social');
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'הרשמה נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardScroll contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>הרשמה · שלב {step + 1}/{maxStep + 1}</Text>

        {step === 0 ? (
          <>
            <Input label="שם מלא" value={fullName} onChangeText={setFullName} />
            <Input label="שם משתמש" value={username} onChangeText={setUsername} autoCapitalize="none" />
            <Input label="מייל" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <Input label="טלפון" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Input label="סיסמה" value={password} onChangeText={setPassword} secureTextEntry />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Input label="גיל" value={age} onChangeText={setAge} keyboardType="number-pad" />
            <Input label="עיסוק" value={occupation} onChangeText={setOccupation} />
            <Input label="קצת על עצמי" value={bio} onChangeText={setBio} multiline style={{ minHeight: 90 }} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.section}>תחביבים</Text>
            <View style={styles.chips}>
              {HOBBIES.map((h) => (
                <Chip key={h} label={h} selected={hobbies.includes(h)} onPress={() => toggleHobby(h)} />
              ))}
            </View>
          </>
        ) : null}

        {step === 3 && userPath === 'dira' ? (
          <>
            <Input label="כתובת הדירה" value={address} onChangeText={setAddress} />
            <Input label="מחיר חודשי (₪)" value={price} onChangeText={setPrice} keyboardType="number-pad" />
            <Input label="חדרים" value={rooms} onChangeText={setRooms} keyboardType="number-pad" />
          </>
        ) : null}

        <Button
          title={step >= maxStep ? 'סיום הרשמה ←' : 'המשך ←'}
          disabled={!canContinue}
          loading={loading}
          onPress={() => (step >= maxStep ? finish() : setStep((s) => s + 1))}
          style={{ marginTop: spacing.lg }}
        />
      </KeyboardScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'left',
  },
  section: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
