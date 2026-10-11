/**
 * [편안하개 - PetWalk]
 * Web 및 Native 플랫폼 호환 확인 대화상자 유틸리티 (US-23)
 */

import { Alert, Platform } from 'react-native';

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * 사용자에게 확인/취소 선택지를 제시하고 결과를 boolean으로 반환
 */
export async function confirmAction(
  title: string,
  message: string,
  options: ConfirmOptions = {}
): Promise<boolean> {
  const { confirmLabel = '확인', cancelLabel = '취소', destructive = false } = options;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const fullPrompt = `${title}\n\n${message}`;
    return window.confirm(fullPrompt);
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelLabel,
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
