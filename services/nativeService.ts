import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export const nativeFeedback = {
  impact: async (style: string = 'LIGHT') => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: style as any });
      }
    } catch (e) {}
  },
  notification: async (type: 'SUCCESS' | 'WARNING' | 'ERROR') => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: type as any });
      }
    } catch (e) {}
  },
  selection: async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.selectionStart();
      }
    } catch (e) {}
  }
};

export const setupNativeUI = async () => {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('StatusBar')) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#064e3b' });
    }
  } catch (e) {
    console.warn('Native UI setup skipped:', e);
  }
};
