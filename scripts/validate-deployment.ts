// ============================================================================
// DEPLOYMENT VALIDATION
// ============================================================================
import { execSync } from 'child_process';

const REQUIRED_ENV_VARS = [
  'VITE_API_BASE_URL',
];

function validateEnv() {
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      throw new Error(`Missing environment variable: ${varName}`);
    }
  });
}

function validateTypeScript() {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
  } catch (error) {
    const err = error as Error;
    throw new Error(`TypeScript validation failed: ${err.message}`);
  }
}

function main() {
  try {
    console.log('Starting Deployment Validation...\n');

    console.log('[1/2] Validating environment variables...');
    validateEnv();
    console.log('Environment variables validated\n');

    console.log('[2/2] Validating TypeScript compilation...');
    validateTypeScript();
    console.log('TypeScript compilation validated\n');

    console.log('Validation Passed - Ready for Production');
    process.exit(0);
  } catch (error) {
    const err = error as Error;
    console.error(`\nValidation Failed: ${err.message}`);
    process.exit(1);
  }
}

main();
