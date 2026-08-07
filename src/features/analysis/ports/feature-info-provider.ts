import type {
  FeatureInfoQuery,
  FeatureInfoResult,
} from '../domain/feature-info';

export interface FeatureInfoProvider {
  get(query: FeatureInfoQuery, signal?: AbortSignal): Promise<FeatureInfoResult>;
}
