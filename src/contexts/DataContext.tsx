/**
 * @deprecated DataContext has been split into four focused contexts:
 *   - WebSocketContext  (useWebSocket)
 *   - SensorDataContext (useSensorData)
 *   - CameraContext     (useCamera)
 *   - SocialDataContext (useSocialData)
 *
 * This file re-exports the Reading type for backward compatibility with
 * FilterContext and any other files that import it from here.
 * Update imports to use the specific context hooks directly.
 */
export type { Reading } from './SensorDataContext';
export type { CameraImage, CameraImages } from './CameraContext';
