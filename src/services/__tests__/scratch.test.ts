import { describe, it, expect } from 'vitest';
import firebaseConfig from '../../../firebase-applet-config.json';
import { FirebaseService } from '../FirebaseService';

describe('JSON import test', () => {
  it('should have projectId', () => {
    console.log('JSON IMPORTED:', firebaseConfig);
    expect(firebaseConfig).toBeDefined();
  });
});
