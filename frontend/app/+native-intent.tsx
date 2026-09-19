import { incomingLinkPath } from '../src/utils/incomingLinks';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return incomingLinkPath(path);
}