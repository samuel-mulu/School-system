
import { getCookieOptions } from './src/config/jwt.js';

process.env.NODE_ENV = 'production';
const prodOptions = getCookieOptions();
console.log('Production Options:', JSON.stringify(prodOptions, null, 2));

process.env.NODE_ENV = 'development';
const devOptions = getCookieOptions();
console.log('Development Options:', JSON.stringify(devOptions, null, 2));

if (prodOptions.sameSite === 'none' && prodOptions.secure === true && (prodOptions as any).partitioned === true) {
  console.log('✅ Production verification passed');
} else {
  console.log('❌ Production verification failed');
  process.exit(1);
}

if (devOptions.sameSite === 'lax' && devOptions.secure === false) {
  console.log('✅ Development verification passed');
} else {
  console.log('❌ Development verification failed');
  process.exit(1);
}
