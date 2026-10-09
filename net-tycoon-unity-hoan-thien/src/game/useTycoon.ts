import { useSyncExternalStore } from 'react';
import { GameState, TycoonEngine } from './tycoonEngine';

/** Đăng ký React vào engine: component render lại mỗi khi trạng thái game đổi. */
export function useTycoon(engine: TycoonEngine): GameState {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
}
