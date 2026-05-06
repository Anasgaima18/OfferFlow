type AttrValue = string | number | boolean | null;
type Attrs = Record<string, AttrValue>;

type SegmentHandler<T> = (...args: unknown[]) => T;

type NewRelicLike = {
  noticeError: (error: Error, customAttributes?: Attrs) => void;
  recordCustomEvent: (eventType: string, attributes?: Attrs) => void;
  addCustomAttributes: (attributes: Attrs) => void;
  addCustomAttribute: (key: string, value: AttrValue) => void;
  setUserID: (id: string) => void;
  startSegment: <T>(name: string, record: boolean, handler: SegmentHandler<T>) => T;
};

const noopStartSegment = <T>(_name: string, _record: boolean, handler: SegmentHandler<T>): T => handler();

const noopApm: NewRelicLike = {
  noticeError: () => undefined,
  recordCustomEvent: () => undefined,
  addCustomAttributes: () => undefined,
  addCustomAttribute: () => undefined,
  setUserID: () => undefined,
  startSegment: noopStartSegment,
};

const nodeMajor = Number(process.versions.node.split('.')[0] ?? 0);
const isProduction = process.env.NODE_ENV === 'production';
const isEnabledByEnv = process.env.NEW_RELIC_ENABLED === 'true';
const isNodeSupported = Number.isFinite(nodeMajor) && nodeMajor > 0 && nodeMajor <= 24;

let apm: NewRelicLike = noopApm;

if (isProduction && isEnabledByEnv && isNodeSupported) {
  try {
    // Use require so New Relic is not initialized unless explicitly enabled.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    apm = require('newrelic') as NewRelicLike;
  } catch {
    apm = noopApm;
  }
}

export default apm;
