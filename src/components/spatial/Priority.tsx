import { type ReactNode } from 'react';
import { useSpatialState } from '@/lib/responsive/useSpatialState';
import { isVisibleByPriority, type PriorityLevel } from '@/lib/responsive/priority';

interface PriorityProps {
  level: PriorityLevel;
  children: ReactNode;
  /** Optional explicit container ref to inherit state from a parent measurement. */
}

/**
 * Priority — wraps children and hides them based on the local container's spatial state.
 * Note: each Priority measures its OWN parent. For sibling-coordinated visibility,
 * place children inside an AdaptiveCard or shared SpatialRow.
 */
export function Priority({ level, children }: PriorityProps) {
  const { ref, state } = useSpatialState<HTMLDivElement>('standard');
  const visible = isVisibleByPriority(level, state);
  return (
    <div ref={ref} data-priority={level} hidden={!visible} aria-hidden={!visible}>
      {visible ? children : null}
    </div>
  );
}
