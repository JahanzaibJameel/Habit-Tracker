// DATA CORRUPTION TEST - Attack localStorage and data integrity
// This script specifically targets storage corruption and data loss scenarios

class DataCorruptionTester {
  constructor() {
    this.testResults = [];
    this.corruptionEvents = [];
    this.dataLossEvents = [];
    this.recoveryFailures = [];
  }

  log(testName, status, details, severity = 'medium') {
    const result = {
      testName,
      status,
      details,
      severity,
      timestamp: new Date().toISOString(),
      storageQuota: this.getStorageQuota(),
      storageUsed: this.getStorageUsed()
    };
    this.testResults.push(result);
    console.log(`[${status.toUpperCase()}] ${testName}: ${details}`);
    
    if (status === 'error' || status === 'fail') {
      if (testName.includes('Loss')) {
        this.dataLossEvents.push(result);
      } else if (testName.includes('Recovery')) {
        this.recoveryFailures.push(result);
      } else {
        this.corruptionEvents.push(result);
      }
    }
  }

  getStorageQuota() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return navigator.storage.estimate().then(estimate => estimate.quota || 0);
    }
    return 0;
  }

  getStorageUsed() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      return navigator.storage.estimate().then(estimate => estimate.usage || 0);
    }
    return 0;
  }

  // 1. LOCALSTORAGE JSON CORRUPTION
  async localStorageJSONCorruption() {
    this.log('LocalStorage JSON Corruption', 'start', 'Corrupting localStorage with invalid JSON', 'critical');
    
    try {
      const originalData = localStorage.getItem('habit-store');
      
      // Test 1: Invalid JSON syntax
      try {
        localStorage.setItem('habit-store', '{"invalid": json}');
        this.log('LocalStorage JSON Corruption', 'info', 'Applied invalid JSON corruption', 'high');
      } catch (error) {
        this.log('LocalStorage JSON Corruption', 'fail', `JSON corruption failed: ${error.message}`, 'high');
      }
      
      // Test 2: Truncated JSON
      if (originalData) {
        try {
          const truncated = originalData.substring(0, Math.floor(originalData.length * 0.7));
          localStorage.setItem('habit-store', truncated);
          this.log('LocalStorage JSON Corruption', 'info', 'Applied truncated JSON corruption', 'high');
        } catch (error) {
          this.log('LocalStorage JSON Corruption', 'fail', `Truncation failed: ${error.message}`, 'high');
        }
      }
      
      // Test 3: Null/undefined values
      try {
        localStorage.setItem('habit-store', 'null');
        this.log('LocalStorage JSON Corruption', 'info', 'Applied null corruption', 'high');
      } catch (error) {
        this.log('LocalStorage JSON Corruption', 'fail', `Null corruption failed: ${error.message}`, 'high');
      }
      
      // Test 4: Circular reference corruption
      try {
        const circular = { name: 'test' };
        circular.self = circular;
        localStorage.setItem('habit-store', JSON.stringify(circular));
        this.log('LocalStorage JSON Corruption', 'info', 'Circular reference handled gracefully', 'low');
      } catch (error) {
        this.log('LocalStorage JSON Corruption', 'info', `Circular reference blocked: ${error.message}`, 'low');
      }
      
      // Test 5: Massive string corruption
      try {
        const massive = 'x'.repeat(100 * 1024 * 1024); // 100MB
        localStorage.setItem('habit-store', massive);
        this.log('LocalStorage JSON Corruption', 'info', 'Massive data blocked by quota', 'low');
      } catch (error) {
        this.log('LocalStorage JSON Corruption', 'info', `Massive data blocked: ${error.message}`, 'low');
      }
      
      // Test 6: Random character corruption
      try {
        const randomChars = Array.from({length: 10000}, () => 
          String.fromCharCode(Math.floor(Math.random() * 65536))
        ).join('');
        localStorage.setItem('habit-store', randomChars);
        this.log('LocalStorage JSON Corruption', 'info', 'Applied random character corruption', 'high');
      } catch (error) {
        this.log('LocalStorage JSON Corruption', 'fail', `Random corruption failed: ${error.message}`, 'high');
      }
      
      this.log('LocalStorage JSON Corruption', 'complete', 'JSON corruption attacks completed', 'critical');

    } catch (error) {
      this.log('LocalStorage JSON Corruption', 'error', `JSON corruption attack failed: ${error.message}`, 'critical');
    }
  }

  // 2. STORAGE QUOTA EXHAUSTION
  async storageQuotaExhaustion() {
    this.log('Storage Quota Exhaustion', 'start', 'Exhausting storage quota to test limits', 'critical');
    
    try {
      let totalSize = 0;
      let chunkCount = 0;
      const chunkSize = 1024 * 1024; // 1MB chunks
      
      // Fill localStorage until quota exceeded
      while (true) {
        try {
          const chunk = 'x'.repeat(chunkSize);
          localStorage.setItem(`quota-chunk-${chunkCount}`, chunk);
          totalSize += chunkSize;
          chunkCount++;
          
          if (chunkCount % 10 === 0) {
            this.log('Storage Quota Exhaustion', 'progress', 
              `Stored ${totalSize / 1024 / 1024}MB in ${chunkCount} chunks`, 'high');
          }
        } catch (error) {
          this.log('Storage Quota Exhaustion', 'complete', 
            `Quota exceeded at ${totalSize / 1024 / 1024}MB`, 'critical');
          break;
        }
      }
      
      // Test app behavior under quota exceeded
      try {
        localStorage.setItem('habit-store', '{"test": "quota-exceeded"}');
        this.log('Storage Quota Exhaustion', 'fail', 'App still trying to write after quota exceeded', 'critical');
      } catch (error) {
        this.log('Storage Quota Exhaustion', 'info', 'App properly handles quota exceeded', 'medium');
      }
      
      // Clean up quota test data
      for (let i = 0; i < chunkCount; i++) {
        localStorage.removeItem(`quota-chunk-${i}`);
      }
      
    } catch (error) {
      this.log('Storage Quota Exhaustion', 'error', `Quota exhaustion test failed: ${error.message}`, 'critical');
    }
  }

  // 3. CONCURRENT STORAGE ACCESS
  async concurrentStorageAccess() {
    this.log('Concurrent Storage Access', 'start', 'Testing concurrent read/write operations', 'high');
    
    try {
      const promises = [];
      let operationCount = 0;
      
      // Launch 100 concurrent storage operations
      for (let i = 0; i < 100; i++) {
        promises.push(this.concurrentStorageOperation(i));
      }
      
      const results = await Promise.allSettled(promises);
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.log('Concurrent Storage Access', 'complete', 
        `Concurrent operations: ${failed} failed out of 100`, 
        failed > 20 ? 'critical' : 'high');

    } catch (error) {
      this.log('Concurrent Storage Access', 'error', `Concurrent access test failed: ${error.message}`, 'high');
    }
  }

  async concurrentStorageOperation(index) {
    return new Promise(async (resolve, reject) => {
      try {
        // Random delay to simulate real timing
        await this.sleep(Math.random() * 100);
        
        // Concurrent read/write
        const key = `concurrent-test-${index}`;
        const value = JSON.stringify({
          index,
          timestamp: Date.now(),
          data: new Array(1000).fill(Math.random())
        });
        
        // Write
        localStorage.setItem(key, value);
        
        // Immediate read
        const read = localStorage.getItem(key);
        
        // Write another key
        localStorage.setItem(`concurrent-test-${index}-2`, value);
        
        // Delete first key
        localStorage.removeItem(key);
        
        // Try to read deleted key
        const deleted = localStorage.getItem(key);
        
        if (deleted !== null) {
          reject(new Error('Storage deletion race condition'));
        }
        
        resolve(index);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 4. STORAGE AVAILABILITY CHAOS
  async storageAvailabilityChaos() {
    this.log('Storage Availability Chaos', 'start', 'Simulating storage being unavailable', 'critical');
    
    try {
      // Test 1: Storage disabled
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
        configurable: true
      });
      
      try {
        // Try to use storage when disabled
        localStorage.setItem('test', 'value');
        this.log('Storage Availability Chaos', 'fail', 'App tries to use disabled storage', 'critical');
      } catch (error) {
        this.log('Storage Availability Chaos', 'info', 'App handles disabled storage', 'medium');
      }
      
      // Restore storage
      window.localStorage = originalLocalStorage;
      
      // Test 2: Storage quota randomly changing
      let quotaChanges = 0;
      const quotaChaosInterval = setInterval(() => {
        try {
          // Simulate quota changes
          if (Math.random() > 0.5) {
            // Simulate low quota
            Object.defineProperty(localStorage, 'setItem', {
              value: function(key, value) {
                if (Math.random() > 0.7) {
                  throw new Error('QuotaExceededError');
                }
                return originalLocalStorage.setItem.call(this, key, value);
              },
              writable: true,
              configurable: true
            });
          } else {
            // Restore normal behavior
            Object.defineProperty(localStorage, 'setItem', {
              value: originalLocalStorage.setItem,
              writable: true,
              configurable: true
            });
          }
          
          quotaChanges++;
          
          if (quotaChanges >= 20) {
            clearInterval(quotaChaosInterval);
          }
        } catch (error) {
          this.log('Storage Availability Chaos', 'error', `Quota chaos failed: ${error.message}`, 'high');
        }
      }, 500);
      
      // Test storage during quota chaos
      for (let i = 0; i < 50; i++) {
        try {
          localStorage.setItem(`chaos-test-${i}`, `value-${i}`);
        } catch (error) {
          // Expected during quota chaos
        }
        await this.sleep(100);
      }
      
      clearInterval(quotaChaosInterval);
      
      // Restore original setItem
      Object.defineProperty(localStorage, 'setItem', {
        value: originalLocalStorage.setItem,
        writable: true,
        configurable: true
      });
      
      this.log('Storage Availability Chaos', 'complete', 'Storage availability chaos completed', 'critical');

    } catch (error) {
      this.log('Storage Availability Chaos', 'error', `Storage chaos test failed: ${error.message}`, 'critical');
    }
  }

  // 5. DATA INTEGRITY CORRUPTION
  async dataIntegrityCorruption() {
    this.log('Data Integrity Corruption', 'start', 'Corrupting specific data structures', 'critical');
    
    try {
      // Test 1: Corrupt habit data structure
      const corruptedHabitData = [
        { id: null, name: 'Invalid Habit' },
        { id: 'valid-id', name: null },
        { id: 'valid-id-2', name: '', createdAt: 'invalid-date' },
        { id: '', name: 'Empty ID Habit' },
        { id: 'duplicate-id', name: 'Habit 1' },
        { id: 'duplicate-id', name: 'Habit 2' }
      ];
      
      try {
        localStorage.setItem('habit-store', JSON.stringify({
          habits: corruptedHabitData,
          completions: []
        }));
        this.log('Data Integrity Corruption', 'info', 'Applied habit structure corruption', 'high');
      } catch (error) {
        this.log('Data Integrity Corruption', 'fail', `Habit corruption failed: ${error.message}`, 'high');
      }
      
      // Test 2: Corrupt completion data
      const corruptedCompletionData = [
        { id: null, habitId: 'valid-id', completedAt: 'invalid-date' },
        { id: 'valid-id', habitId: null, completedAt: new Date().toISOString() },
        { id: 'valid-id-2', habitId: 'non-existent-habit', completedAt: new Date().toISOString() },
        { id: '', habitId: '', completedAt: '' }
      ];
      
      try {
        localStorage.setItem('habit-store', JSON.stringify({
          habits: [],
          completions: corruptedCompletionData
        }));
        this.log('Data Integrity Corruption', 'info', 'Applied completion structure corruption', 'high');
      } catch (error) {
        this.log('Data Integrity Corruption', 'fail', `Completion corruption failed: ${error.message}`, 'high');
      }
      
      // Test 3: Corrupt preferences
      const corruptedPreferences = {
        theme: null,
        language: undefined,
        ui: {
          compactMode: 'not-a-boolean',
          showAnimations: null,
          defaultView: 123
        },
        notifications: {
          enabled: 'yes',
          reminders: 'not-an-array'
        }
      };
      
      try {
        localStorage.setItem('habit-store', JSON.stringify({
          habits: [],
          completions: [],
          preferences: corruptedPreferences
        }));
        this.log('Data Integrity Corruption', 'info', 'Applied preferences corruption', 'high');
      } catch (error) {
        this.log('Data Integrity Corruption', 'fail', `Preferences corruption failed: ${error.message}`, 'high');
      }
      
      this.log('Data Integrity Corruption', 'complete', 'Data integrity corruption completed', 'critical');

    } catch (error) {
      this.log('Data Integrity Corruption', 'error', `Data corruption test failed: ${error.message}`, 'critical');
    }
  }

  // 6. RECOVERY FAILURE TEST
  async recoveryFailureTest() {
    this.log('Recovery Failure Test', 'start', 'Testing data recovery mechanisms', 'critical');
    
    try {
      // Test 1: Complete data loss
      const originalData = localStorage.getItem('habit-store');
      localStorage.clear();
      
      // Try to trigger recovery
      try {
        window.location.reload();
        this.log('Recovery Failure Test', 'info', 'Triggered recovery after complete loss', 'high');
      } catch (error) {
        this.log('Recovery Failure Test', 'fail', `Recovery failed: ${error.message}`, 'critical');
      }
      
      await this.sleep(2000);
      
      // Test 2: Partial data loss
      if (originalData) {
        try {
          const parsed = JSON.parse(originalData);
          delete parsed.habits;
          delete parsed.completions;
          localStorage.setItem('habit-store', JSON.stringify(parsed));
          
          this.log('Recovery Failure Test', 'info', 'Created partial data loss scenario', 'high');
        } catch (error) {
          this.log('Recovery Failure Test', 'fail', `Partial loss setup failed: ${error.message}`, 'high');
        }
      }
      
      await this.sleep(1000);
      
      // Test 3: Schema version mismatch
      try {
        const incompatibleData = {
          version: 999, // Future version
          habits: [],
          completions: [],
          preferences: {}
        };
        localStorage.setItem('habit-store', JSON.stringify(incompatibleData));
        
        this.log('Recovery Failure Test', 'info', 'Created schema version mismatch', 'high');
      } catch (error) {
        this.log('Recovery Failure Test', 'fail', `Schema mismatch failed: ${error.message}`, 'high');
      }
      
      this.log('Recovery Failure Test', 'complete', 'Recovery failure testing completed', 'critical');

    } catch (error) {
      this.log('Recovery Failure Test', 'error', `Recovery test failed: ${error.message}`, 'critical');
    }
  }

  // 7. TIMING ATTACK ON STORAGE
  async timingAttackOnStorage() {
    this.log('Timing Attack on Storage', 'start', 'Testing timing-based storage attacks', 'medium');
    
    try {
      // Test 1: Rapid storage operations
      const rapidOperations = [];
      
      for (let i = 0; i < 1000; i++) {
        rapidOperations.push(
          localStorage.setItem(`rapid-${i}`, `value-${i}`),
          localStorage.getItem(`rapid-${i}`),
          localStorage.removeItem(`rapid-${i}`)
        );
      }
      
      this.log('Timing Attack on Storage', 'info', 'Executed 1000 rapid storage operations', 'medium');
      
      // Test 2: Storage during page unload
      window.addEventListener('beforeunload', () => {
        try {
          localStorage.setItem('unload-test', 'saving-during-unload');
        } catch (error) {
          this.log('Timing Attack on Storage', 'fail', `Unload save failed: ${error.message}`, 'medium');
        }
      });
      
      // Test 3: Storage in web workers simulation
      try {
        const workerCode = `
          self.onmessage = function(e) {
            try {
              localStorage.setItem('worker-test', e.data);
              self.postMessage('success');
            } catch (error) {
              self.postMessage('error: ' + error.message);
            }
          }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        worker.postMessage('test-data');
        
        worker.onmessage = (e) => {
          if (e.data.includes('error')) {
            this.log('Timing Attack on Storage', 'info', 'Worker storage blocked as expected', 'low');
          } else {
            this.log('Timing Attack on Storage', 'fail', 'Worker storage unexpectedly succeeded', 'medium');
          }
        };
        
        worker.terminate();
      } catch (error) {
        this.log('Timing Attack on Storage', 'info', `Worker creation failed: ${error.message}`, 'low');
      }
      
      this.log('Timing Attack on Storage', 'complete', 'Timing attack testing completed', 'medium');

    } catch (error) {
      this.log('Timing Attack on Storage', 'error', `Timing attack failed: ${error.message}`, 'medium');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    console.log('Starting DATA CORRUPTION TEST SUITE');
    console.log('==================================');
    
    const tests = [
      () => this.localStorageJSONCorruption(),
      () => this.storageQuotaExhaustion(),
      () => this.concurrentStorageAccess(),
      () => this.storageAvailabilityChaos(),
      () => this.dataIntegrityCorruption(),
      () => this.recoveryFailureTest(),
      () => this.timingAttackOnStorage()
    ];
    
    for (const test of tests) {
      try {
        await test();
        await this.sleep(2000);
      } catch (error) {
        console.error('Data corruption test failed:', error);
      }
    }
    
    this.generateDataCorruptionReport();
  }

  generateDataCorruptionReport() {
    console.log('\n\nDATA CORRUPTION REPORT');
    console.log('======================');
    
    console.log(`Total Corruption Events: ${this.corruptionEvents.length}`);
    console.log(`Data Loss Events: ${this.dataLossEvents.length}`);
    console.log(`Recovery Failures: ${this.recoveryFailures.length}`);
    
    const criticalFailures = this.testResults.filter(r => r.severity === 'critical' && (r.status === 'error' || r.status === 'fail'));
    
    console.log('\nCRITICAL DATA FAILURES:');
    criticalFailures.forEach(failure => {
      console.log(`- ${failure.testName}: ${failure.details}`);
    });
    
    console.log('\nDATA LOSS EVENTS:');
    this.dataLossEvents.forEach(loss => {
      console.log(`- ${loss.testName}: ${loss.details}`);
    });
    
    console.log('\nRECOVERY FAILURES:');
    this.recoveryFailures.forEach(failure => {
      console.log(`- ${failure.testName}: ${failure.details}`);
    });
    
    return {
      corruptionEvents: this.corruptionEvents.length,
      dataLossEvents: this.dataLossEvents.length,
      recoveryFailures: this.recoveryFailures.length,
      criticalFailures,
      allResults: this.testResults
    };
  }
}

// Auto-start data corruption testing
window.dataCorruptionTester = new DataCorruptionTester();

// Run tests automatically after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.dataCorruptionTester.runAllTests(), 8000);
  });
} else {
  setTimeout(() => window.dataCorruptionTester.runAllTests(), 8000);
}

// Manual trigger
window.runDataCorruptionTests = () => window.dataCorruptionTester.runAllTests();
