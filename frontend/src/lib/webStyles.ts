// Web-only polish for browser surfaces the components don't draw:
// keyboard focus ring, text selection, scrollbars, tab title. Native ignores this.
import { Platform } from 'react-native';
import { colors } from './theme';

const css = `
  :focus { outline: none; }
  :focus-visible { outline: 3px solid ${colors.seagrass}; outline-offset: 2px; }
  ::selection { background: ${colors.seagrass}; color: ${colors.white}; }
  * { scrollbar-width: thin; scrollbar-color: rgba(60, 55, 68, 0.25) transparent; }
  body { background: ${colors.honeydew}; }
`;

export function applyWebStyles(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.title = "I'M U";
  if (document.getElementById('imu-web-styles')) return;
  const tag = document.createElement('style');
  tag.id = 'imu-web-styles';
  tag.textContent = css;
  document.head.appendChild(tag);
}
