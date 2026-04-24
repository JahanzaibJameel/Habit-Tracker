// DATA FLOOD TESTER - Overwhelm the app with massive datasets
// This script creates extreme data volumes to break the application

class DataFloodTester {
  constructor() {
    this.dataGenerated = 0;
    this.errors = [];
  }

  // 1. MASSIVE HABIT CREATION ATTACK
  async floodWithHabits() {
    console.log('[DATA FLOOD] Creating massive habit dataset');
    
    try {
      // Get the store
      const store = this.getStore();
      if (!store) {
        console.error('[DATA FLOOD] Store not accessible');
        return;
      }

      // Create thousands of habits
      for (let i = 0; i < 5000; i++) {
        try {
          const habitData = {
            name: `Flood Habit ${i} - ${Math.random().toString(36).substring(7)}`,
            description: `This is a massive description for flood habit ${i}. `.repeat(100),
            category: ['health', 'fitness', 'learning', 'productivity', 'social', 'creative', 'financial', 'spiritual'][Math.floor(Math.random() * 8)],
            target: Math.floor(Math.random() * 100) + 1,
            unit: ['times', 'minutes', 'hours', 'pages', 'miles', 'calories'][Math.floor(Math.random() * 6)],
            frequency: ['daily', 'weekly', 'monthly'][Math.floor(Math.random() * 3)],
            tags: Array.from({length: Math.floor(Math.random() * 20)}, () => Math.random().toString(36).substring(7)),
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
            icon: ['star', 'heart', 'fire', 'bolt', 'shield', 'trophy', 'rocket', 'diamond'][Math.floor(Math.random() * 8)],
            streak: Math.floor(Math.random() * 1000),
            bestStreak: Math.floor(Math.random() * 2000),
            totalCompletions: Math.floor(Math.random() * 10000),
            difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
            priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            reminderTime: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            notes: `Massive notes section for habit ${i}. `.repeat(200)
          };

          store.addHabit(habitData);
          this.dataGenerated++;

          // Create completions for this habit
          for (let j = 0; j < Math.floor(Math.random() * 365); j++) {
            const completionDate = new Date();
            completionDate.setDate(completionDate.getDate() - j);
            
            if (Math.random() > 0.1) { // 90% completion rate
              store.addCompletion({
                habitId: `temp-${i}`, // Will be replaced by actual ID
                value: Math.floor(Math.random() * habitData.target) + 1,
                completedAt: completionDate,
                notes: `Completion notes for day ${j}. `.repeat(10)
              });
            }
          }

          // Add dependencies
          if (i > 0 && Math.random() > 0.7) {
            store.addDependency({
              sourceHabitId: `temp-${i-1}`,
              targetHabitId: `temp-${i}`,
              condition: ['must_complete', 'must_not_complete', 'streak_greater', 'time_before'][Math.floor(Math.random() * 4)],
              value: Math.floor(Math.random() * 10),
              timeValue: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
              isActive: Math.random() > 0.2
            });
          }

        } catch (error) {
          this.errors.push({ type: 'habit_creation', error: error.message, index: i });
        }

        // Brief pause to avoid freezing completely
        if (i % 100 === 0) {
          await this.sleep(10);
        }
      }

      console.log(`[DATA FLOOD] Created ${this.dataGenerated} habits with massive data`);
      
    } catch (error) {
      console.error('[DATA FLOOD] Habit flood failed:', error);
    }
  }

  // 2. CORRUPTED DATA INJECTION
  async injectCorruptedData() {
    console.log('[DATA FLOOD] Injecting corrupted data');
    
    try {
      const store = this.getStore();
      if (!store) return;

      // Inject null/undefined data
      const corruptedItems = [
        null,
        undefined,
        { id: null, name: undefined },
        { id: '', name: null, description: undefined },
        { id: 'corrupt', name: 123, description: {}, tags: 'not-array' },
        { id: 'circular', name: 'circular', self: null }
      ];

      corruptedItems[5].self = corruptedItems[5]; // Circular reference

      corruptedItems.forEach((item, index) => {
        try {
          if (item) {
            store.addHabit(item);
          }
        } catch (error) {
          this.errors.push({ type: 'corrupted_data', error: error.message, index });
        }
      });

      // Inject massive strings
      const massiveString = 'x'.repeat(1000000);
      try {
        store.addHabit({
          name: massiveString,
          description: massiveString,
          tags: [massiveString]
        });
      } catch (error) {
        this.errors.push({ type: 'massive_string', error: error.message });
      }

      // Inject special characters and unicode
      const specialChars = {
        name: '\x00\x01\x02\x03\x04\x05\u0000\uFEFF\u200B\u200C\u200D\u200E\u200F',
        description: '\u202E\u202D\u202A\u202B\u202C\u2066\u2067\u2068\u2069',
        tags: ['\uFFFD', '\uFEFF', '\u200B', '\u2060']
      };

      try {
        store.addHabit(specialChars);
      } catch (error) {
        this.errors.push({ type: 'special_chars', error: error.message });
      }

    } catch (error) {
      console.error('[DATA FLOOD] Corrupted data injection failed:', error);
    }
  }

  // 3. RAPID STATE MUTATION ATTACK
  async rapidStateMutation() {
    console.log('[DATA FLOOD] Rapid state mutation attack');
    
    try {
      const store = this.getStore();
      if (!store) return;

      const mutations = [];
      
      // Create many concurrent mutations
      for (let i = 0; i < 1000; i++) {
        mutations.push(
          new Promise(async (resolve) => {
            for (let j = 0; j < 100; j++) {
              try {
                // Random mutations
                const mutations = [
                  () => store.setSearchQuery(Math.random().toString(36)),
                  () => store.setViewMode(['grid', 'list'][Math.floor(Math.random() * 2)]),
                  () => store.setSortOrder(['name', 'created', 'updated', 'position'][Math.floor(Math.random() * 4)]),
                  () => store.setFilterStatus(['all', 'active', 'archived'][Math.floor(Math.random() * 3)]),
                  () => store.toggleHabitSelection(`random-${Math.random()}`),
                  () => store.selectAllHabits(),
                  () => store.deselectAllHabits(),
                  () => store.updatePreferences({ theme: ['light', 'dark', 'system'][Math.floor(Math.random() * 3)] })
                ];

                const randomMutation = mutations[Math.floor(Math.random() * mutations.length)];
                randomMutation();
                
                await this.sleep(Math.random() * 5);
              } catch (error) {
                this.errors.push({ type: 'state_mutation', error: error.message, iteration: j });
              }
            }
            resolve();
          })
        );
      }

      await Promise.all(mutations);
      console.log('[DATA FLOOD] Rapid state mutation completed');
      
    } catch (error) {
      console.error('[DATA FLOOD] State mutation attack failed:', error);
    }
  }

  // 4. STORAGE QUOTA ATTACK
  async attackStorageQuota() {
    console.log('[DATA FLOOD] Storage quota attack');
    
    try {
      // Fill localStorage to quota
      const data = 'x'.repeat(1024 * 1024); // 1MB chunks
      let keyIndex = 0;
      
      try {
        while (true) {
          localStorage.setItem(`flood-${keyIndex}`, data);
          keyIndex++;
          
          if (keyIndex % 10 === 0) {
            await this.sleep(1);
          }
        }
      } catch (error) {
        console.log(`[DATA FLOOD] Storage quota exceeded after ${keyIndex} MB`);
      }

      // Try to save more data after quota is full
      const store = this.getStore();
      if (store) {
        try {
          store.addHabit({
            name: 'After Quota Full',
            description: 'This should fail'
          });
        } catch (error) {
          this.errors.push({ type: 'quota_full', error: error.message });
        }
      }

    } catch (error) {
      console.error('[DATA FLOOD] Storage quota attack failed:', error);
    }
  }

  // 5. PERFORMANCE DEGRADATION ATTACK
  async degradePerformance() {
    console.log('[DATA FLOOD] Performance degradation attack');
    
    try {
      // Force expensive computations
      const store = this.getStore();
      if (!store) return;

      // Trigger filtered habits computation repeatedly
      for (let i = 0; i < 10000; i++) {
        try {
          store.getFilteredHabits();
          store.getTodayCompletions();
          store.refreshAnalytics();
          
          // Force re-renders
          store.setSearchQuery(`search-${i}`);
          store.setSearchQuery('');
          
          if (i % 100 === 0) {
            await this.sleep(1);
          }
        } catch (error) {
          this.errors.push({ type: 'performance', error: error.message, iteration: i });
        }
      }

      // Create DOM elements to stress rendering
      for (let i = 0; i < 10000; i++) {
        const div = document.createElement('div');
        div.innerHTML = `<div class="stress-test-${i}">
          <h1>Stress Test ${i}</h1>
          <p>${'Content '.repeat(1000)}</p>
          <div>${'<span>Nested</span>'.repeat(100)}</div>
        </div>`;
        document.body.appendChild(div);
        
        if (i % 100 === 0) {
          await this.sleep(1);
        }
      }

    } catch (error) {
      console.error('[DATA FLOOD] Performance degradation failed:', error);
    }
  }

  // 6. CONCURRENT API ATTACK
  async concurrentAPIAttack() {
    console.log('[DATA FLOOD] Concurrent API attack');
    
    try {
      // Simulate many concurrent API calls
      const promises = [];
      
      for (let i = 0; i < 1000; i++) {
        promises.push(
          new Promise(async (resolve) => {
            try {
              // Simulate API calls with fetch override
              const response = await fetch('/api/habits', {
                method: 'POST',
                body: JSON.stringify({
                  name: `Concurrent Habit ${i}`,
                  description: `Description ${i}`
                }),
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              
              // Ignore response, just stress the system
            } catch (error) {
              // Expected to fail
            }
            resolve();
          })
        );
      }

      await Promise.all(promises);
      console.log('[DATA FLOOD] Concurrent API attack completed');
      
    } catch (error) {
      console.error('[DATA FLOOD] Concurrent API attack failed:', error);
    }
  }

  getStore() {
    // Try to get the Zustand store
    try {
      if (window.useHabitStore) {
        return window.useHabitStore.getState();
      }
      
      // Try to access through React DevTools
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const fiberRoot = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.rendererInterfaces?.values()?.next()?.value?.fiberRoot;
        if (fiberRoot) {
          // Try to find the store in the component tree
          const searchStore = (node) => {
            if (node?.stateNode?.store) {
              return node.stateNode.store.getState();
            }
            if (node?.child) {
              return searchStore(node.child);
            }
            return null;
          };
          return searchStore(fiberRoot.current);
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Run all data flood tests
  async runDataFlood() {
    console.log('Starting DATA FLOOD TEST SUITE');
    console.log('===============================');
    
    const startTime = performance.now();
    
    const tests = [
      () => this.floodWithHabits(),
      () => this.injectCorruptedData(),
      () => this.rapidStateMutation(),
      () => this.attackStorageQuota(),
      () => this.degradePerformance(),
      () => this.concurrentAPIAttack()
    ];
    
    for (const test of tests) {
      try {
        await test();
        await this.sleep(1000);
      } catch (error) {
        console.error('Data flood test failed:', error);
        this.errors.push({ type: 'test_failure', error: error.message });
      }
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log('\n\nDATA FLOOD REPORT');
    console.log('==================');
    console.log(`Duration: ${duration.toFixed(2)}ms`);
    console.log(`Data Generated: ${this.dataGenerated} items`);
    console.log(`Errors: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\nERRORS DETECTED:');
      this.errors.forEach(error => {
        console.log(`- ${error.type}: ${error.error}`);
      });
    }
    
    // Check for app crashes
    if (this.errors.length > 50) {
      console.log('APP CRITICAL FAILURE - Too many errors detected');
    } else if (this.errors.length > 20) {
      console.log('APP MAJOR INSTABILITY - High error rate');
    } else if (this.errors.length > 5) {
      console.log('APP MINOR ISSUES - Some errors detected');
    } else {
      console.log('APP STABLE - Handled data flood well');
    }
    
    return {
      duration,
      dataGenerated: this.dataGenerated,
      errors: this.errors,
      crashed: this.errors.length > 50
    };
  }
}

// Auto-start data flood testing
window.dataFloodTester = new DataFloodTester();

// Run data flood tests
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.dataFloodTester.runDataFlood(), 5000);
  });
} else {
  setTimeout(() => window.dataFloodTester.runDataFlood(), 5000);
}

window.runDataFlood = () => window.dataFloodTester.runDataFlood();
