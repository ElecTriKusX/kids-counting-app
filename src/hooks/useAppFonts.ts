/**
 * useAppFonts — загрузка Nunito (Regular/Medium/SemiBold/Bold/ExtraBold).
 *
 * Возвращает true, когда шрифты готовы. Используется в App.tsx чтобы
 * блокировать рендер до загрузки шрифтов (как и hydration store'а).
 */

import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  return loaded;
}

/**
 * Маппинг fontWeight → конкретный variant Nunito.
 *
 * RN на iOS/Android некорректно подбирает veight'ы у custom fonts —
 * поэтому компонент использует `getNunitoFamily(weight)` вместо
 * `fontWeight`. Все используемые в проекте веса покрыты.
 */
export function getNunitoFamily(
  weight: '400' | '500' | '600' | '700' | '800' | 'normal' | 'bold' = '400',
): string {
  switch (weight) {
    case '500':
      return 'Nunito_500Medium';
    case '600':
      return 'Nunito_600SemiBold';
    case '700':
    case 'bold':
      return 'Nunito_700Bold';
    case '800':
      return 'Nunito_800ExtraBold';
    case '400':
    case 'normal':
    default:
      return 'Nunito_400Regular';
  }
}
