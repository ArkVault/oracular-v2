import { readFileSync } from 'node:fs';
import process from 'node:process';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(`${projectRoot}/${path}`, 'utf8');
}

describe('security configuration', () => {
  it('should enforce browser security headers on every Vercel response', () => {
    // ARRANGE
    const config = JSON.parse(readProjectFile('vercel.json')) as {
      headers?: Array<{ headers?: Array<{ key: string; value: string }> }>;
    };

    // ACT
    const headers = new Map(
      config.headers?.[0]?.headers?.map(({ key, value }) => [key, value]) ?? [],
    );

    // ASSERT
    expect(headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(headers.get('Content-Security-Policy')).toContain("object-src 'none'");
    expect(headers.get('Strict-Transport-Security')).toBe(
      'max-age=63072000; includeSubDomains',
    );
  });

  it('should run the full quality and production dependency gates in CI', () => {
    // ARRANGE + ACT
    const workflow = readProjectFile('.github/workflows/ci.yml');

    // ASSERT
    expect(workflow).toContain('permissions:\n  contents: read');
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run check');
    expect(workflow).toContain('npm audit --omit=dev --audit-level=high');
  });

  it('should target grouped dependency updates at development', () => {
    // ARRANGE + ACT
    const dependabot = readProjectFile('.github/dependabot.yml');

    // ASSERT
    expect(dependabot).toContain('target-branch: development');
    expect(dependabot).toContain('interval: weekly');
    expect(dependabot).toContain('dependency-type: production');
  });
});
