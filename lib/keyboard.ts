import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Current keyboard height in px (0 when hidden). */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setHeight(Math.max(0, Math.round(e.endCoordinates.height)));
    });
    const onHide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return height;
}

export function useKeyboardOpen(): boolean {
  return useKeyboardHeight() > 0;
}
