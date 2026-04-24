// HYDRATION CHAOS TESTER - Break SSR/CSR synchronization
// This script specifically targets hydration mismatches and SSR failures

class HydrationChaosTester {
  constructor() {
    this.hydrationErrors = [];
    this.mismatchCount = 0;
    this.layoutShifts = [];
  }

  // 1. SSR/CSR MISMATCH ATTACK
  async attackHydrationMismatch() {
    console.log('[HYDRATION ATTACK] Starting SSR/CSR mismatch simulation');
    
    try {
      // Attack dynamic values that should match
      const dateElements = document.querySelectorAll('[data-time]');
      dateElements.forEach(el => {
        // Corrupt server-rendered timestamps
        if (el.textContent) {
          el.textContent = 'INVALID_TIMESTAMP_' + Math.random();
        }
      });
      
      // Attack user-specific data
      const userElements = document.querySelectorAll('[data-user]');
      userElements.forEach(el => {
        el.textContent = 'CORRUPTED_USER_DATA';
      });
      
      // Attack theme attributes
      document.documentElement.setAttribute('data-theme', 'corrupted');
      document.body.classList.add('hydration-failure');
      
      // Force React to detect mismatches
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = () => {
          console.log('Hydration mismatch detected');
        };
      }
      
      // Simulate delayed hydration
      setTimeout(() => {
        const style = document.createElement('style');
        style.textContent = '.hydration-failure { display: none !important; }';
        document.head.appendChild(style);
      }, 100);
      
    } catch (error) {
      console.error('[HYDRATION ATTACK] Failed:', error);
    }
  }

  // 2. LAYOUT SHIFT CHAOS
  async createLayoutShiftChaos() {
    console.log('[LAYOUT SHIFT] Creating layout shift chaos');
    
    try {
      // Rapid style changes to force layout shifts
      for (let i = 0; i < 100; i++) {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
          if (Math.random() > 0.8) {
            el.style.display = Math.random() > 0.5 ? 'none' : 'block';
            el.style.position = Math.random() > 0.5 ? 'absolute' : 'relative';
            el.style.width = Math.random() * 1000 + 'px';
            el.style.height = Math.random() * 1000 + 'px';
            el.style.margin = Math.random() * 100 + 'px';
            el.style.padding = Math.random() * 50 + 'px';
          }
        });
        
        await this.sleep(10);
      }
      
      // Insert massive elements to cause reflow
      for (let i = 0; i < 50; i++) {
        const div = document.createElement('div');
        div.style.width = '100vw';
        div.style.height = '100vh';
        div.style.position = 'fixed';
        div.style.top = Math.random() * window.innerHeight + 'px';
        div.style.left = Math.random() * window.innerWidth + 'px';
        div.style.backgroundColor = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
        div.style.zIndex = '9999';
        document.body.appendChild(div);
        
        setTimeout(() => div.remove(), Math.random() * 100);
      }
      
    } catch (error) {
      console.error('[LAYOUT SHIFT] Failed:', error);
    }
  }

  // 3. CLIENT-SIDE ONLY DATA CORRUPTION
  async corruptClientSideData() {
    console.log('[CLIENT DATA] Corrupting client-side state');
    
    try {
      // Attack Zustand store directly
      if (window.useHabitStore) {
        const store = window.useHabitStore.getState();
        
        // Corrupt habits array with invalid data
        const corruptedHabits = [
          null,
          undefined,
          { id: null, name: '' },
          { id: 'invalid', name: null, createdAt: 'invalid_date' },
          { id: 'circular', self: null }
        ];
        corruptedHabits[4].self = corruptedHabits[4]; // Circular reference
        
        // Try to set corrupted data
        try {
          store.addHabit(corruptedHabits[0]);
        } catch (e) {
          console.log('Store rejected null habit');
        }
        
        try {
          store.addHabit(corruptedHabits[3]);
        } catch (e) {
          console.log('Store rejected invalid habit');
        }
        
        try {
          store.addHabit(corruptedHabits[4]);
        } catch (e) {
          console.log('Store rejected circular habit');
        }
      }
      
      // Attack localStorage with timing issues
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        // Simulate quota exceeded randomly
        if (Math.random() > 0.9) {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem.call(this, key, value);
      };
      
      // Simulate storage being disabled
      if (Math.random() > 0.8) {
        Object.defineProperty(window, 'localStorage', {
          value: undefined,
          writable: true
        });
      }
      
    } catch (error) {
      console.error('[CLIENT DATA] Failed:', error);
    }
  }

  // 4. NETWORK INSTABILITY SIMULATION
  async simulateNetworkChaos() {
    console.log('[NETWORK CHAOS] Simulating network instability');
    
    try {
      // Override fetch to simulate network issues
      const originalFetch = window.fetch;
      window.fetch = async function(url, options) {
        // Random failures
        if (Math.random() > 0.7) {
          throw new Error('NetworkError: Failed to fetch');
        }
        
        // Random timeouts
        if (Math.random() > 0.8) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          throw new Error('TimeoutError: Request timeout');
        }
        
        // Random slow responses
        if (Math.random() > 0.6) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        return originalFetch.call(this, url, options);
      };
      
      // Simulate offline/online switching
      let online = true;
      const toggleOnline = () => {
        online = !online;
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: online
        });
        window.dispatchEvent(new Event(online ? 'online' : 'offline'));
      };
      
      for (let i = 0; i < 20; i++) {
        toggleOnline();
        await this.sleep(200);
      }
      
    } catch (error) {
      console.error('[NETWORK CHAOS] Failed:', error);
    }
  }

  // 5. PERFORMANCE OBSERVER ATTACK
  async attackPerformanceObserver() {
    console.log('[PERFORMANCE ATTACK] Overloading performance observers');
    
    try {
      // Create massive performance entries
      for (let i = 0; i < 10000; i++) {
        performance.mark(`mark-${i}`);
        performance.measure(`measure-${i}`, `mark-${i}`, `mark-${i+1}`);
      }
      
      // Create many observers
      const observers = [];
      for (let i = 0; i < 100; i++) {
        const observer = new PerformanceObserver((list) => {
          // Do nothing but consume memory
        });
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        observers.push(observer);
      }
      
      // Force layout thrashing
      for (let i = 0; i < 1000; i++) {
        document.body.offsetHeight; // Force reflow
        document.body.style.marginLeft = Math.random() + 'px';
        document.body.offsetHeight; // Force reflow again
      }
      
    } catch (error) {
      console.error('[PERFORMANCE ATTACK] Failed:', error);
    }
  }

  // 6. CONSOLE/SERVICE WORKER ATTACK
  async attackConsoleAndSW() {
    console.log('[CONSOLE/SW ATTACK] Attacking console and service workers');
    
    try {
      // Spam console to overwhelm it
      for (let i = 0; i < 10000; i++) {
        console.log(`SPAM_${i}: ${Math.random().toString(36).repeat(100)}`);
      }
      
      // Override console methods
      const originalConsole = { ...console };
      Object.keys(console).forEach(method => {
        if (typeof console[method] === 'function') {
          console[method] = function(...args) {
            // Randomly drop console calls
            if (Math.random() > 0.5) {
              return originalConsole[method].apply(this, args);
            }
          };
        }
      });
      
      // Attack service worker if present
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
          });
        });
      }
      
    } catch (error) {
      console.error('[CONSOLE/SW ATTACK] Failed:', error);
    }
  }

  // 7. MEMORY PRESSURE SIMULATION
  async simulateMemoryPressure() {
    console.log('[MEMORY PRESSURE] Simulating low memory conditions');
    
    try {
      // Create memory pressure
      const memoryHogs = [];
      for (let i = 0; i < 100; i++) {
        const hog = new Array(1000000).fill(0).map(() => ({
          data: new Array(100).fill(Math.random()),
          nested: { deep: { values: new Array(50).fill(Math.random()) } }
        }));
        memoryHogs.push(hog);
      }
      
      // Trigger memory pressure events
      if ('memory' in performance) {
        window.dispatchEvent(new Event('memorypressure'));
      }
      
      // Simulate browser tab switching
      for (let i = 0; i < 50; i++) {
        document.dispatchEvent(new Event('visibilitychange'));
        document.hidden = !document.hidden;
        await this.sleep(50);
      }
      
    } catch (error) {
      console.error('[MEMORY PRESSURE] Failed:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Run all hydration chaos tests
  async runHydrationChaos() {
    console.log('Starting HYDRATION CHAOS TEST SUITE');
    console.log('====================================');
    
    const tests = [
      () => this.attackHydrationMismatch(),
      () => this.createLayoutShiftChaos(),
      () => this.corruptClientSideData(),
      () => this.simulateNetworkChaos(),
      () => this.attackPerformanceObserver(),
      () => this.attackConsoleAndSW(),
      () => this.simulateMemoryPressure()
    ];
    
    for (const test of tests) {
      try {
        await test();
        await this.sleep(500);
      } catch (error) {
        console.error('Hydration chaos test failed:', error);
      }
    }
    
    console.log('Hydration chaos testing completed');
  }
}

// Auto-start hydration chaos testing
window.hydrationChaosTester = new HydrationChaosTester();

// Run hydration tests
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.hydrationChaosTester.runHydrationChaos(), 3000);
  });
} else {
  setTimeout(() => window.hydrationChaosTester.runHydrationChaos(), 3000);
}

window.runHydrationChaos = () => window.hydrationChaosTester.runHydrationChaos();
