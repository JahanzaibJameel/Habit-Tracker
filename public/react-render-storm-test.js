// REACT RENDER STORM TEST - Trigger infinite loops and performance collapse
// This script specifically attacks React rendering performance

class ReactRenderStormTester {
  constructor() {
    this.testResults = [];
    this.renderStorms = [];
    this.infiniteLoops = [];
    this.performanceCollapses = [];
  }

  log(testName, status, details, severity = 'medium') {
    const result = {
      testName,
      status,
      details,
      severity,
      timestamp: new Date().toISOString(),
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A',
      renderCount: this.getRenderCount()
    };
    this.testResults.push(result);
    console.log(`[${status.toUpperCase()}] ${testName}: ${details}`);
    
    if (status === 'error' || status === 'fail') {
      if (testName.includes('Loop')) {
        this.infiniteLoops.push(result);
      } else if (testName.includes('Storm')) {
        this.renderStorms.push(result);
      } else {
        this.performanceCollapses.push(result);
      }
    }
  }

  getRenderCount() {
    // Try to estimate React renders by checking DOM changes
    return document.querySelectorAll('*').length;
  }

  // 1. STATE UPDATE INFINITE LOOP
  async stateUpdateInfiniteLoop() {
    this.log('State Update Infinite Loop', 'start', 'Triggering infinite state update loops', 'critical');
    
    try {
      if (window.useHabitStore) {
        const store = window.useHabitStore.getState();
        let loopCount = 0;
        
        // Create infinite loop through state updates
        const loopInterval = setInterval(() => {
          try {
            // Update state in a way that triggers re-render
            store.updatePreferences({
              ui: {
                ...store.preferences.ui,
                compactMode: !store.preferences.ui.compactMode
              }
            });
            
            loopCount++;
            
            // Also trigger search updates
            store.setSearchQuery(`loop-${loopCount}`);
            
            // Toggle selection to cause more renders
            store.toggleHabitSelection('test-loop');
            
            if (loopCount > 1000) {
              clearInterval(loopInterval);
              this.log('State Update Infinite Loop', 'complete', 
                `Survived ${loopCount} state update cycles`, 'critical');
            }
          } catch (error) {
            clearInterval(loopInterval);
            this.log('State Update Infinite Loop', 'error', 
              `Loop crashed at iteration ${loopCount}: ${error.message}`, 'critical');
          }
        }, 1); // Very rapid updates
        
        // Safety timeout
        setTimeout(() => {
          clearInterval(loopInterval);
        }, 10000);
      }

    } catch (error) {
      this.log('State Update Infinite Loop', 'error', `State loop setup failed: ${error.message}`, 'critical');
    }
  }

  // 2. COMPONENT MOUNT/UNMOUNT STORM
  async componentMountUnmountStorm() {
    this.log('Component Mount/Unmount Storm', 'start', 'Creating component lifecycle storm', 'critical');
    
    try {
      const mountCount = 1000;
      let currentMounts = 0;
      
      const mountStorm = setInterval(() => {
        try {
          // Create and destroy components rapidly
          for (let i = 0; i < 10; i++) {
            const component = document.createElement('div');
            component.innerHTML = `
              <div class="test-component" data-id="${currentMounts}">
                <span>Test Component ${currentMounts}</span>
                <button onclick="this.parentElement.remove()">Remove</button>
              </div>
            `;
            
            document.body.appendChild(component);
            currentMounts++;
            
            // Add event listeners
            component.addEventListener('click', () => {
              component.style.backgroundColor = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
            });
            
            // Remove immediately after short delay
            setTimeout(() => {
              component.remove();
            }, Math.random() * 100);
          }
          
          if (currentMounts >= mountCount) {
            clearInterval(mountStorm);
            this.log('Component Mount/Unmount Storm', 'complete', 
              `Processed ${mountCount} component mount/unmount cycles`, 'critical');
          }
        } catch (error) {
          clearInterval(mountStorm);
          this.log('Component Mount/Unmount Storm', 'error', 
            `Mount storm crashed: ${error.message}`, 'critical');
        }
      }, 10);
      
      // Safety timeout
      setTimeout(() => {
        clearInterval(mountStorm);
      }, 15000);

    } catch (error) {
      this.log('Component Mount/Unmount Storm', 'error', `Mount storm setup failed: ${error.message}`, 'critical');
    }
  }

  // 3. DOM MANIPULATION STORM
  async domManipulationStorm() {
    this.log('DOM Manipulation Storm', 'start', 'Creating massive DOM manipulation stress', 'critical');
    
    try {
      const elements = document.querySelectorAll('*');
      let manipulationCount = 0;
      
      const domStorm = setInterval(() => {
        try {
          // Perform multiple DOM operations simultaneously
          elements.forEach((element, index) => {
            if (index % 10 === 0) { // Only manipulate 10% of elements each cycle
              // Random style changes
              element.style.color = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
              element.style.backgroundColor = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.5)`;
              element.style.transform = `translate(${Math.random()*10}px, ${Math.random()*10}px) scale(${0.8 + Math.random()*0.4})`;
              
              // Add/remove classes
              if (Math.random() > 0.5) {
                element.classList.add('storm-test');
              } else {
                element.classList.remove('storm-test');
              }
              
              // Change attributes
              element.setAttribute('data-storm', manipulationCount.toString());
              
              manipulationCount++;
            }
          });
          
          // Force reflow
          document.body.offsetHeight;
          
          if (manipulationCount >= 10000) {
            clearInterval(domStorm);
            this.log('DOM Manipulation Storm', 'complete', 
              `Performed ${manipulationCount} DOM manipulations`, 'critical');
          }
        } catch (error) {
          clearInterval(domStorm);
          this.log('DOM Manipulation Storm', 'error', 
            `DOM storm crashed: ${error.message}`, 'critical');
        }
      }, 50);
      
      // Safety timeout
      setTimeout(() => {
        clearInterval(domStorm);
      }, 20000);

    } catch (error) {
      this.log('DOM Manipulation Storm', 'error', `DOM storm setup failed: ${error.message}`, 'critical');
    }
  }

  // 4. EVENT HANDLER STORM
  async eventHandlerStorm() {
    this.log('Event Handler Storm', 'start', 'Creating event handler accumulation storm', 'high');
    
    try {
      const elements = document.querySelectorAll('*');
      let handlerCount = 0;
      
      // Add massive number of event listeners
      elements.forEach((element, index) => {
        if (index < 100) { // Limit to first 100 elements
          for (let i = 0; i < 100; i++) {
            const handler = () => {
              handlerCount++;
              // Do something expensive
              const div = document.createElement('div');
              div.textContent = `Handler ${handlerCount}`;
              document.body.appendChild(div);
              setTimeout(() => div.remove(), 1000);
            };
            
            element.addEventListener('click', handler);
            element.addEventListener('mouseover', handler);
            element.addEventListener('mouseout', handler);
            element.addEventListener('touchstart', handler);
          }
        }
      });
      
      // Trigger events rapidly
      const eventStorm = setInterval(() => {
        try {
          elements.forEach((element, index) => {
            if (index < 50 && Math.random() > 0.8) {
              element.click();
              element.dispatchEvent(new MouseEvent('mouseover'));
              element.dispatchEvent(new MouseEvent('mouseout'));
            }
          });
          
          if (handlerCount >= 50000) {
            clearInterval(eventStorm);
            this.log('Event Handler Storm', 'complete', 
              `Triggered ${handlerCount} event handler executions`, 'high');
          }
        } catch (error) {
          clearInterval(eventStorm);
          this.log('Event Handler Storm', 'error', 
            `Event storm crashed: ${error.message}`, 'high');
        }
      }, 100);
      
      // Safety timeout
      setTimeout(() => {
        clearInterval(eventStorm);
      }, 10000);

    } catch (error) {
      this.log('Event Handler Storm', 'error', `Event storm setup failed: ${error.message}`, 'high');
    }
  }

  // 5. CSS ANIMATION STORM
  async cssAnimationStorm() {
    this.log('CSS Animation Storm', 'start', 'Creating CSS animation performance stress', 'high');
    
    try {
      // Create massive CSS animations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes storm-test {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); }
          25% { transform: translate(100px, -100px) rotate(90deg) scale(1.2); }
          50% { transform: translate(-100px, 100px) rotate(180deg) scale(0.8); }
          75% { transform: translate(50px, 50px) rotate(270deg) scale(1.1); }
          100% { transform: translate(0, 0) rotate(360deg) scale(1); }
        }
        
        .storm-animate {
          animation: storm-test 0.1s infinite;
          will-change: transform;
        }
        
        @keyframes color-storm {
          0% { color: red; background: blue; }
          25% { color: blue; background: green; }
          50% { color: green; background: yellow; }
          75% { color: yellow; background: red; }
          100% { color: red; background: blue; }
        }
        
        .storm-color {
          animation: color-storm 0.05s infinite;
        }
      `;
      document.head.appendChild(style);
      
      // Apply animations to many elements
      const elements = document.querySelectorAll('*');
      let animationCount = 0;
      
      elements.forEach((element, index) => {
        if (index < 200) {
          element.classList.add('storm-animate');
          element.classList.add('storm-color');
          animationCount++;
        }
      });
      
      // Create more animated elements
      for (let i = 0; i < 1000; i++) {
        const animatedElement = document.createElement('div');
        animatedElement.className = 'storm-animate storm-color';
        animatedElement.style.cssText = `
          position: absolute;
          left: ${Math.random() * window.innerWidth}px;
          top: ${Math.random() * window.innerHeight}px;
          width: 50px;
          height: 50px;
          background: linear-gradient(45deg, red, blue, green, yellow);
          border-radius: 50%;
        `;
        document.body.appendChild(animatedElement);
        animationCount++;
      }
      
      this.log('CSS Animation Storm', 'complete', 
        `Created ${animationCount} animated elements`, 'high');

    } catch (error) {
      this.log('CSS Animation Storm', 'error', `Animation storm failed: ${error.message}`, 'high');
    }
  }

  // 6. REACT HOOK STRESS
  async reactHookStress() {
    this.log('React Hook Stress', 'start', 'Stressing React hooks with rapid updates', 'critical');
    
    try {
      // Create components that stress React hooks
      const hookStressContainer = document.createElement('div');
      hookStressContainer.id = 'hook-stress-container';
      document.body.appendChild(hookStressContainer);
      
      // Create many stateful components
      for (let i = 0; i < 100; i++) {
        const component = document.createElement('div');
        component.innerHTML = `
          <div class="hook-stress-component" data-id="${i}">
            <span>Hook Stress ${i}</span>
            <input type="text" placeholder="Rapid input ${i}" />
            <button>Toggle ${i}</button>
          </div>
        `;
        hookStressContainer.appendChild(component);
        
        // Add rapid input handlers
        const input = component.querySelector('input');
        const button = component.querySelector('button');
        
        let toggleState = false;
        
        input.addEventListener('input', (e) => {
          e.target.value = e.target.value + Math.random().toString(36).substring(7);
        });
        
        button.addEventListener('click', () => {
          toggleState = !toggleState;
          component.style.backgroundColor = toggleState ? 'red' : 'blue';
        });
      }
      
      // Trigger rapid state changes
      const hookStorm = setInterval(() => {
        try {
          const components = document.querySelectorAll('.hook-stress-component');
          components.forEach((component, index) => {
            if (Math.random() > 0.7) {
              const input = component.querySelector('input');
              const button = component.querySelector('button');
              
              if (input) {
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
              if (button && Math.random() > 0.5) {
                button.click();
              }
            }
          });
        } catch (error) {
          clearInterval(hookStorm);
          this.log('React Hook Stress', 'error', `Hook stress crashed: ${error.message}`, 'critical');
        }
      }, 50);
      
      // Safety timeout
      setTimeout(() => {
        clearInterval(hookStorm);
        this.log('React Hook Stress', 'complete', 'React hook stress test completed', 'critical');
      }, 10000);

    } catch (error) {
      this.log('React Hook Stress', 'error', `Hook stress setup failed: ${error.message}`, 'critical');
    }
  }

  // 7. MEMORY LEAK STORM
  async memoryLeakStorm() {
    this.log('Memory Leak Storm', 'start', 'Creating memory leak through render cycles', 'critical');
    
    try {
      const leakyElements = [];
      
      // Create elements that hold references and prevent garbage collection
      for (let i = 0; i < 1000; i++) {
        const leakyElement = document.createElement('div');
        leakyElement.className = 'leaky-element';
        
        // Create circular references
        leakyElement.selfReference = leakyElement;
        leakyElement.data = {
          element: leakyElement,
          children: [],
          parent: leakyElement
        };
        leakyElement.data.children.push(leakyElement.data);
        
        // Add event listeners that capture the element
        const handler = () => {
          leakyElement.style.backgroundColor = 'red';
        };
        leakyElement.addEventListener('click', handler);
        leakyElement.handler = handler;
        
        // Store references
        leakyElements.push(leakyElement);
        document.body.appendChild(leakyElement);
      }
      
      // Create render loop that prevents cleanup
      let renderCount = 0;
      const renderLoop = setInterval(() => {
        try {
          leakyElements.forEach((element, index) => {
            // Force re-renders
            element.style.width = `${100 + Math.sin(renderCount + index) * 50}px`;
            element.style.height = `${100 + Math.cos(renderCount + index) * 50}px`;
            element.style.transform = `rotate(${renderCount * 10}deg)`;
          });
          
          renderCount++;
          
          if (renderCount >= 1000) {
            clearInterval(renderLoop);
            this.log('Memory Leak Storm', 'complete', 
              `Created memory leak with ${leakyElements.length} elements over ${renderCount} render cycles`, 'critical');
          }
        } catch (error) {
          clearInterval(renderLoop);
          this.log('Memory Leak Storm', 'error', `Memory leak storm crashed: ${error.message}`, 'critical');
        }
      }, 100);
      
      // Safety timeout
      setTimeout(() => {
        clearInterval(renderLoop);
      }, 15000);

    } catch (error) {
      this.log('Memory Leak Storm', 'error', `Memory leak setup failed: ${error.message}`, 'critical');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    console.log('Starting REACT RENDER STORM TEST SUITE');
    console.log('======================================');
    
    const tests = [
      () => this.stateUpdateInfiniteLoop(),
      () => this.componentMountUnmountStorm(),
      () => this.domManipulationStorm(),
      () => this.eventHandlerStorm(),
      () => this.cssAnimationStorm(),
      () => this.reactHookStress(),
      () => this.memoryLeakStorm()
    ];
    
    for (const test of tests) {
      try {
        await test();
        await this.sleep(2000);
      } catch (error) {
        console.error('React render storm test failed:', error);
      }
    }
    
    this.generateRenderStormReport();
  }

  generateRenderStormReport() {
    console.log('\n\nREACT RENDER STORM REPORT');
    console.log('===========================');
    
    console.log(`Total Render Storms: ${this.renderStorms.length}`);
    console.log(`Infinite Loops: ${this.infiniteLoops.length}`);
    console.log(`Performance Collapses: ${this.performanceCollapses.length}`);
    
    const criticalIssues = this.testResults.filter(r => r.severity === 'critical' && (r.status === 'error' || r.status === 'fail'));
    
    console.log('\nCRITICAL RENDER FAILURES:');
    criticalIssues.forEach(issue => {
      console.log(`- ${issue.testName}: ${issue.details}`);
    });
    
    console.log('\nINFINITE LOOPS DETECTED:');
    this.infiniteLoops.forEach(loop => {
      console.log(`- ${loop.testName}: ${loop.details}`);
    });
    
    console.log('\nPERFORMANCE COLLAPSES:');
    this.performanceCollapses.forEach(collapse => {
      console.log(`- ${collapse.testName}: ${collapse.details}`);
    });
    
    return {
      renderStorms: this.renderStorms.length,
      infiniteLoops: this.infiniteLoops.length,
      performanceCollapses: this.performanceCollapses.length,
      criticalIssues,
      allResults: this.testResults
    };
  }
}

// Auto-start React render storm testing
window.reactRenderStormTester = new ReactRenderStormTester();

// Run tests automatically after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.reactRenderStormTester.runAllTests(), 6000);
  });
} else {
  setTimeout(() => window.reactRenderStormTester.runAllTests(), 6000);
}

// Manual trigger
window.runReactRenderStormTests = () => window.reactRenderStormTester.runAllTests();
