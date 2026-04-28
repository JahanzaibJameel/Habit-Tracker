'use client';

import React from 'react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/atoms';
import {
  Bell,
  Settings as _Settings,
  Download as _Download,
  Upload as _Upload,
  Trash2 as _Trash2,
  Edit as _Edit,
  Copy as _Copy,
  Star as _Star,
  Search,
  Calendar as _Calendar,
  Filter as _Filter,
  Grid as _Grid,
  List as _List,
  Zap,
} from 'lucide-react';

// Mock habit data for demonstration
const mockHabits = [
  {
    id: '1',
    name: 'Morning Exercise',
    description: '30 minutes of cardio',
    category: 'health',
    completed: false,
    streak: 5,
  },
  {
    id: '2',
    name: 'Read Books',
    description: 'Read for 20 minutes',
    category: 'learning',
    completed: true,
    streak: 12,
  },
];

function ComponentShowcase() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            UI Component Showcase
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Available components in the habit tracker application
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buttons Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Buttons</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Various button styles and states
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button leftIcon={<Bell className="h-4 w-4" />}>With Icon</Button>
                <Button rightIcon={<Zap className="h-4 w-4" />}>With Icon</Button>
              </div>
            </CardContent>
          </Card>

          {/* Inputs Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Input Fields</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Form inputs with various states
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Enter your name" label="Default Input" />
              <Input
                placeholder="Search..."
                label="With Left Icon"
                leftIcon={<Search className="h-4 w-4" />}
              />
              <Input type="password" placeholder="Enter password" label="Password Field" />
              <Input placeholder="Disabled input" label="Disabled Input" disabled />
            </CardContent>
          </Card>

          {/* Cards Section */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Card Components</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Flexible card layouts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">Info Card</h3>
                  <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                    This is an informational card with custom styling
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-green-900 dark:text-green-100">Success Card</h3>
                  <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                    Operation completed successfully
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Draggable Habit Card Demo */}
          <Card className="bg-white dark:bg-gray-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Draggable Components</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Interactive drag-and-drop habit cards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white">{habit.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{habit.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">
                      {habit.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Streak: {habit.streak} days
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Component Status */}
        <Card className="bg-white dark:bg-gray-800 shadow-lg mt-6">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Available Components</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Components that are currently available in the project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded">
                <h4 className="font-semibold text-green-800 dark:text-green-200">Atoms</h4>
                <ul className="text-sm text-green-700 dark:text-green-300 mt-1">
                  <li>• Button</li>
                  <li>• Input</li>
                  <li>• Card</li>
                  <li>• ConfirmDialog</li>
                  <li>• ErrorBoundary</li>
                  <li>• Modal</li>
                  <li>• Progress</li>
                  <li>• RadialProgress</li>
                  <li>• Switch</li>
                  <li>• Toast</li>
                </ul>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Molecules</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  <li>• DraggableHabitCard</li>
                </ul>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200">Organisms</h4>
                <ul className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  <li>• BadgesModal</li>
                  <li>• BatchOperations</li>
                  <li>• HabitCard</li>
                  <li>• HabitDependencies</li>
                  <li>• HabitForm</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UIShowcasePage() {
  return <ComponentShowcase />;
}
