// RACE CONDITION TEST - Async concurrency warfare
// This script creates race conditions and async state corruption

class RaceConditionTester {
  constructor() {
    this.testResults = [];
    this.raceConditions = [];
    this.stateCorruption = [];
    this.concurrentOperations = [];
  }

  log(testName, status, details, severity = 'medium') {
    const result = {
      testName,
      status,
      details,
      severity,
      timestamp: new Date().toISOString(),
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A'
    };
    this.testResults.push(result);
    console.log(`[${status.toUpperCase()}] ${testName}: ${details}`);
    
    if (status === 'error' || status === 'fail') {
      this.raceConditions.push(result);
    }
  }

  // 1. CONCURRENT HABIT CREATION RACE
  async concurrentHabitCreationRace() {
    this.log('Concurrent Habit Creation Race', 'start', 'Testing concurrent habit creation', 'critical');
    
    try {
      const addButton = document.querySelector('button:has([class*="plus"])') || 
                        document.querySelector('button[aria-label*="Add"]') ||
                        document.querySelector('button')?.[0];
      
      if (!addButton) {
        this.log('Concurrent Habit Creation Race', 'fail', 'No add button found', 'critical');
        return;
      }

      const promises = [];
      const startTime = performance.now();
      
      // Launch 100 concurrent habit creation attempts
      for (let i = 0; i < 100; i++) {
        promises.push(this.createHabitConcurrently(i, addButton));
      }
      
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.log('Concurrent Habit Creation Race', 'complete', 
        `Concurrent creation: ${successful} succeeded, ${failed} failed in ${(endTime - startTime)}ms`, 
        failed > 20 ? 'critical' : 'high'
      );

    } catch (error) {
      this.log('Concurrent Habit Creation Race', 'error', `Race condition crash: ${error.message}`, 'critical');
    }
  }

  async createHabitConcurrently(index, addButton) {
    return new Promise(async (resolve, reject) => {
      try {
        // Random delay to simulate real-world timing
        await this.sleep(Math.random() * 100);
        
        // Open form
        addButton.click();
        await this.sleep(50);
        
        // Find and fill form
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
          const nameInput = form.querySelector('input[name*="name"], input[placeholder*="name"]');
          const submitButton = form.querySelector('button[type="submit"]');
          
          if (nameInput && submitButton) {
            nameInput.value = `Concurrent Habit ${index} - ${Date.now()}`;
            nameInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Random delay before submission
            await this.sleep(Math.random() * 50);
            
            submitButton.click();
            resolve(index);
            return;
          }
        }
        
        reject(new Error('Form not found'));
      } catch (error) {
        reject(error);
      }
    });
  }

  // 2. STATE MUTATION RACE CONDITIONS
  async stateMutationRaceConditions() {
    this.log('State Mutation Race Conditions', 'start', 'Testing concurrent state mutations', 'critical');
    
    try {
      // Attack Zustand store with concurrent mutations
      if (window.useHabitStore) {
        const store = window.useHabitStore.getState();
        
        const promises = [];
        
        // Launch concurrent state mutations
        for (let i = 0; i < 50; i++) {
          promises.push(this.mutateStateConcurrently(store, i));
        }
        
        const results = await Promise.allSettled(promises);
        const failed = results.filter(r => r.status === 'rejected').length;
        
        this.log('State Mutation Race Conditions', 'complete', 
          `State mutations: ${failed} failed out of 50 concurrent operations`, 
          failed > 10 ? 'critical' : 'high'
        );
      }

    } catch (error) {
      this.log('State Mutation Race Conditions', 'error', `State mutation crash: ${error.message}`, 'critical');
    }
  }

  async mutateStateConcurrently(store, index) {
    return new Promise(async (resolve, reject) => {
      try {
        // Random delay
        await this.sleep(Math.random() * 50);
        
        // Concurrent preference updates
        store.updatePreferences({
          theme: Math.random() > 0.5 ? 'dark' : 'light',
          language: ['en', 'es', 'fr', 'de'][Math.floor(Math.random() * 4)],
          ui: {
            compactMode: Math.random() > 0.5,
            showAnimations: Math.random() > 0.5,
            defaultView: ['grid', 'list'][Math.floor(Math.random() * 2)]
          }
        });
        
        // Concurrent habit selection
        store.toggleHabitSelection(`habit-${index}`);
        
        // Concurrent search query updates
        store.setSearchQuery(`search-${index}-${Date.now()}`);
        
        resolve(index);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 3. LOCALSTORAGE CONCURRENT ACCESS
  async localStorageConcurrentAccess() {
    this.log('LocalStorage Concurrent Access', 'start', 'Testing concurrent storage operations', 'critical');
    
    try {
      const promises = [];
      
      // Launch concurrent storage operations
      for (let i = 0; i < 100; i++) {
        promises.push(this.accessStorageConcurrently(i));
      }
      
      const results = await Promise.allSettled(promises);
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.log('LocalStorage Concurrent Access', 'complete', 
        `Storage operations: ${failed} failed out of 100 concurrent operations`, 
        failed > 20 ? 'critical' : 'high'
      );

    } catch (error) {
      this.log('LocalStorage Concurrent Access', 'error', `Storage race condition: ${error.message}`, 'critical');
    }
  }

  async accessStorageConcurrently(index) {
    return new Promise(async (resolve, reject) => {
      try {
        // Random delay
        await this.sleep(Math.random() * 100);
        
        // Concurrent read/write operations
        const key = `race-test-${index}`;
        const value = JSON.stringify({
          index,
          timestamp: Date.now(),
          data: new Array(100).fill(Math.random())
        });
        
        // Write
        localStorage.setItem(key, value);
        
        // Read immediately
        const read = localStorage.getItem(key);
        
        // Write another key
        localStorage.setItem(`race-test-${index}-2`, value);
        
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

  // 4. ASYNC CANCELLATION RACE CONDITIONS
  async asyncCancellationRaceConditions() {
    this.log('Async Cancellation Race Conditions', 'start', 'Testing async operation cancellation', 'high');
    
    try {
      const promises = [];
      const abortControllers = [];
      
      // Create many async operations and cancel them randomly
      for (let i = 0; i < 50; i++) {
        const controller = new AbortController();
        abortControllers.push(controller);
        
        promises.push(this.createCancellableOperation(i, controller.signal));
      }
      
      // Cancel random operations
      setTimeout(() => {
        for (let i = 0; i < abortControllers.length; i++) {
          if (Math.random() > 0.5) {
            abortControllers[i].abort();
          }
        }
      }, Math.random() * 1000);
      
      const results = await Promise.allSettled(promises);
      const cancelled = results.filter(r => r.status === 'rejected' && 
        r.reason && r.reason.name === 'AbortError').length;
      
      this.log('Async Cancellation Race Conditions', 'complete', 
        `Async operations: ${cancelled} cancelled out of 50 operations`, 'high'
      );

    } catch (error) {
      this.log('Async Cancellation Race Conditions', 'error', `Cancellation race: ${error.message}`, 'high');
    }
  }

  async createCancellableOperation(index, signal) {
    return new Promise(async (resolve, reject) => {
      try {
        // Simulate long-running operation
        for (let i = 0; i < 100; i++) {
          if (signal.aborted) {
            reject(new DOMException('Operation aborted', 'AbortError'));
            return;
          }
          
          // Do some work
          await this.sleep(10);
        }
        
        resolve(index);
      } catch (error) {
        reject(error);
      }
    });
  }

  // 5. EVENT LISTENER RACE CONDITIONS
  async eventListenerRaceConditions() {
    this.log('Event Listener Race Conditions', 'start', 'Testing concurrent event handling', 'high');
    
    try {
      const promises = [];
      const testElement = document.createElement('button');
      testElement.textContent = 'Race Test Button';
      document.body.appendChild(testElement);
      
      // Add many event listeners rapidly
      for (let i = 0; i < 100; i++) {
        promises.push(this.addEventListenerConcurrently(testElement, i));
      }
      
      // Trigger events rapidly
      for (let i = 0; i < 50; i++) {
        testElement.click();
        await this.sleep(10);
      }
      
      const results = await Promise.allSettled(promises);
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.log('Event Listener Race Conditions', 'complete', 
        `Event listeners: ${failed} failed out of 100 concurrent listeners`, 
        failed > 10 ? 'critical' : 'high'
      );
      
      // Clean up
      testElement.remove();

    } catch (error) {
      this.log('Event Listener Race Conditions', 'error', `Event listener race: ${error.message}`, 'high');
    }
  }

  async addEventListenerConcurrently(element, index) {
    return new Promise((resolve, reject) => {
      try {
        const handler = () => {
          // Simulate async work in event handler
          setTimeout(() => {
            resolve(index);
          }, Math.random() * 100);
        };
        
        element.addEventListener('click', handler);
        
        // Remove listener after random time
        setTimeout(() => {
          element.removeEventListener('click', handler);
        }, Math.random() * 1000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // 6. PROMISE CHAIN RACE CONDITIONS
  async promiseChainRaceConditions() {
    this.log('Promise Chain Race Conditions', 'start', 'Testing promise chain races', 'high');
    
    try {
      const promises = [];
      
      // Create competing promise chains
      for (let i = 0; i < 50; i++) {
        promises.push(this.createCompetingPromiseChain(i));
      }
      
      const results = await Promise.allSettled(promises);
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.log('Promise Chain Race Conditions', 'complete', 
        `Promise chains: ${failed} failed out of 50 competing chains`, 
        failed > 10 ? 'critical' : 'high'
      );

    } catch (error) {
      this.log('Promise Chain Race Conditions', 'error', `Promise chain race: ${error.message}`, 'high');
    }
  }

  async createCompetingPromiseChain(index) {
    return new Promise(async (resolve, reject) => {
      try {
        // Create competing promise chains that access shared resources
        const sharedResource = { value: 0 };
        
        const chain1 = this.promiseChainStep(sharedResource, 1, index);
        const chain2 = this.promiseChainStep(sharedResource, 2, index);
        const chain3 = this.promiseChainStep(sharedResource, 3, index);
        
        await Promise.all([chain1, chain2, chain3]);
        
        // Check for race condition corruption
        if (sharedResource.value !== 6) { // Should be 1+2+3=6
          reject(new Error(`Race condition detected: expected 6, got ${sharedResource.value}`));
        }
        
        resolve(index);
      } catch (error) {
        reject(error);
      }
    });
  }

  async promiseChainStep(sharedResource, step, index) {
    return new Promise(async (resolve) => {
      await this.sleep(Math.random() * 50);
      
      // Simulate non-atomic operation
      const current = sharedResource.value;
      await this.sleep(Math.random() * 10); // Gap between read and write
      sharedResource.value = current + step;
      
      resolve(step);
    });
  }

  // 7. TIMER RACE CONDITIONS
  async timerRaceConditions() {
    this.log('Timer Race Conditions', 'start', 'Testing timer-based race conditions', 'medium');
    
    try {
      const promises = [];
      const results = [];
      
      // Create many timers with overlapping execution
      for (let i = 0; i < 100; i++) {
        promises.push(new Promise((resolve) => {
          const delay = Math.random() * 100;
          setTimeout(() => {
            results.push({ index: i, timestamp: Date.now() });
            resolve(i);
          }, delay);
        }));
      }
      
      await Promise.all(promises);
      
      // Check for timer execution order issues
      const sortedResults = results.sort((a, b) => a.timestamp - b.timestamp);
      const outOfOrder = sortedResults.filter((result, index) => 
        index > 0 && result.index < sortedResults[index - 1].index
      ).length;
      
      this.log('Timer Race Conditions', 'complete', 
        `Timers: ${outOfOrder} executed out of order out of 100`, 
        outOfOrder > 20 ? 'critical' : 'medium'
      );

    } catch (error) {
      this.log('Timer Race Conditions', 'error', `Timer race condition: ${error.message}`, 'medium');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    console.log('Starting RACE CONDITION TEST SUITE');
    console.log('===================================');
    
    const tests = [
      () => this.concurrentHabitCreationRace(),
      () => this.stateMutationRaceConditions(),
      () => this.localStorageConcurrentAccess(),
      () => this.asyncCancellationRaceConditions(),
      () => this.eventListenerRaceConditions(),
      () => this.promiseChainRaceConditions(),
      () => this.timerRaceConditions()
    ];
    
    for (const test of tests) {
      try {
        await test();
        await this.sleep(1000);
      } catch (error) {
        console.error('Race condition test failed:', error);
      }
    }
    
    this.generateRaceConditionReport();
  }

  generateRaceConditionReport() {
    console.log('\n\nRACE CONDITION REPORT');
    console.log('======================');
    
    console.log(`Total Race Conditions: ${this.raceConditions.length}`);
    console.log(`State Corruption Events: ${this.stateCorruption.length}`);
    console.log(`Concurrent Operations: ${this.concurrentOperations.length}`);
    
    const criticalRaces = this.raceConditions.filter(r => r.severity === 'critical');
    
    console.log('\nCRITICAL RACE CONDITIONS:');
    criticalRaces.forEach(race => {
      console.log(`- ${race.testName}: ${race.details}`);
    });
    
    console.log('\nALL RACE CONDITIONS:');
    this.raceConditions.forEach(race => {
      console.log(`- ${race.testName}: ${race.details}`);
    });
    
    return {
      totalRaceConditions: this.raceConditions.length,
      criticalRaces,
      allResults: this.testResults
    };
  }
}

// Auto-start race condition testing
window.raceConditionTester = new RaceConditionTester();

// Run tests automatically after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.raceConditionTester.runAllTests(), 5000);
  });
} else {
  setTimeout(() => window.raceConditionTester.runAllTests(), 5000);
}

// Manual trigger
window.runRaceConditionTests = () => window.raceConditionTester.runAllTests();
