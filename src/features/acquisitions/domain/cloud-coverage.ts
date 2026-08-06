export const DEFAULT_MAX_CLOUD_COVERAGE = 10;

export function isCloudCoverageEligible(
  cloudCoverage: number | null | undefined,
  exclusiveThreshold = DEFAULT_MAX_CLOUD_COVERAGE,
): boolean {
  if (
    cloudCoverage == null ||
    !Number.isFinite(cloudCoverage) ||
    cloudCoverage < 0 ||
    cloudCoverage > 100
  ) {
    return false;
  }

  return cloudCoverage < exclusiveThreshold;
}
