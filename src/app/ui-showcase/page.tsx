'use client';

import React, { useState } from 'react';
import { 
  Button, 
  Input, 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from '@/components/atoms';
import { 
  Modal, 
  ConfirmationModal,
  ToastProvider,
  useToastHelpers,
  Dropdown,
  MoreDropdown,
  Tabs, TabList, TabItem, TabPanels, TabPanel,
  Tooltip,
  Switch,
} from '@/components/molecules';
import { 
  Bell, 
  Settings, 
  Download, 
  Upload, 
  Trash2,
  Edit,
  Copy,
  Star,
  Eye,
  EyeOff,
  Search,
  Calendar,
  Filter,
  Grid,
  List,
  Zap,
} from 'lucide-react';

function ComponentShowcase() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [switchState, setSwitchState] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const toast = useToastHelpers();

  const dropdownItems = [
    { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => toast.info('Edit clicked') },
    { label: 'Duplicate', icon: <Copy className="h-4 w-4" />, onClick: () => toast.success('Copied!') },
    { label: 'Favorite', icon: <Star className="h-4 w-4" />, onClick: () => toast.warning('Added to favorites') },
    { separator: true },
    { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => setIsConfirmModalOpen(true), destructive: true },
  ];

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">UI Component Showcase</h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-2">
            All components with dark mode support and animations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Buttons Section */}
          <Card className="animate-fade-in" animationDelay={0.1}>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>Various button styles and states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="xs">Extra Small</Button>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button size="xl">Extra Large</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button isLoading>Loading</Button>
                <Button leftIcon={<Bell className="h-4 w-4" />}>With Icon</Button>
                <Button rightIcon={<Zap className="h-4 w-4" />}>With Icon</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button motion animate>Animated</Button>
                <Button fullWidth>Full Width</Button>
              </div>
            </CardContent>
          </Card>

          {/* Inputs Section */}
          <Card className="animate-fade-in" animationDelay={0.2}>
            <CardHeader>
              <CardTitle>Input Fields</CardTitle>
              <CardDescription>Form inputs with validation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input 
                placeholder="Enter your name"
                label="Default Input"
                helperText="This is helper text"
              />
              <Input 
                placeholder="Search..."
                label="With Icons"
                leftIcon={<Search className="h-4 w-4" />}
                rightIcon={<Filter className="h-4 w-4" />}
              />
              <Input 
                type="password"
                placeholder="Enter password"
                label="Password Field"
                showPasswordToggle
              />
              <Input 
                placeholder="Error state"
                label="Error Input"
                error="This field is required"
              />
              <Input 
                placeholder="Success state"
                label="Success Input"
                success="Looks good!"
              />
              <Input 
                placeholder="Warning state"
                label="Warning Input"
                warning="Please check this"
              />
              <Input 
                placeholder="Disabled"
                label="Disabled Input"
                disabled
              />
            </CardContent>
          </Card>

          {/* Switch Section */}
          <Card className="animate-fade-in" animationDelay={0.3}>
            <CardHeader>
              <CardTitle>Toggle Switches</CardTitle>
              <CardDescription>Interactive toggle switches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Default Switch</p>
                  <p className="text-sm text-secondary-500">Toggle me on and off</p>
                </div>
                <Switch 
                  checked={switchState}
                  onChange={setSwitchState}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Small Switch</p>
                  <p className="text-sm text-secondary-500">Compact size</p>
                </div>
                <Switch 
                  checked={switchState}
                  onChange={setSwitchState}
                  size="sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Large Switch</p>
                  <p className="text-sm text-secondary-500">More prominent</p>
                </div>
                <Switch 
                  checked={switchState}
                  onChange={setSwitchState}
                  size="lg"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Disabled Switch</p>
                  <p className="text-sm text-secondary-500">Cannot be toggled</p>
                </div>
                <Switch 
                  checked={switchState}
                  onChange={setSwitchState}
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          {/* Dropdowns Section */}
          <Card className="animate-fade-in" animationDelay={0.4}>
            <CardHeader>
              <CardTitle>Dropdown Menus</CardTitle>
              <CardDescription>Context menus and options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <Dropdown 
                  items={dropdownItems}
                  label="Actions"
                  triggerVariant="primary"
                />
                <Dropdown 
                  items={dropdownItems}
                  label="Options"
                  triggerVariant="outline"
                />
                <MoreDropdown items={dropdownItems} />
              </div>
              <div className="pt-4 border-t border-secondary-200 dark:border-secondary-800">
                <p className="text-sm text-secondary-500 mb-3">With different alignments:</p>
                <div className="flex justify-between">
                  <Dropdown 
                    items={dropdownItems.slice(0, 2)}
                    label="Left"
                    align="left"
                  />
                  <Dropdown 
                    items={dropdownItems.slice(0, 2)}
                    label="Right"
                    align="right"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Section */}
          <Card className="animate-fade-in lg:col-span-2" animationDelay={0.5}>
            <CardHeader>
              <CardTitle>Tabs Navigation</CardTitle>
              <CardDescription>Tabbed interface with smooth transitions</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs>
                <TabList>
                  <TabItem>Overview</TabItem>
                  <TabItem>Analytics</TabItem>
                  <TabItem>Settings</TabItem>
                  <TabItem disabled>Disabled</TabItem>
                </TabList>
                <TabPanels className="mt-6">
                  <TabPanel>
                    <Card variant="ghost">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-2">Overview Tab</h3>
                        <p className="text-secondary-600 dark:text-secondary-400">
                          This is the overview content with smooth animations.
                        </p>
                      </CardContent>
                    </Card>
                  </TabPanel>
                  <TabPanel>
                    <Card variant="ghost">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-2">Analytics Tab</h3>
                        <p className="text-secondary-600 dark:text-secondary-400">
                          Analytics content goes here with animated transitions.
                        </p>
                      </CardContent>
                    </Card>
                  </TabPanel>
                  <TabPanel>
                    <Card variant="ghost">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold mb-2">Settings Tab</h3>
                        <p className="text-secondary-600 dark:text-secondary-400">
                          Configure your settings here.
                        </p>
                      </CardContent>
                    </Card>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </CardContent>
          </Card>

          {/* Modals & Tooltips */}
          <Card className="animate-fade-in" animationDelay={0.6}>
            <CardHeader>
              <CardTitle>Modals & Tooltips</CardTitle>
              <CardDescription>Dialog windows and hover tips</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setIsModalOpen(true)}>
                  Open Modal
                </Button>
                <Button 
                  variant="danger"
                  onClick={() => setIsConfirmModalOpen(true)}
                >
                  Confirm Action
                </Button>
              </div>
              <div className="pt-4 border-t border-secondary-200 dark:border-secondary-800">
                <p className="text-sm text-secondary-500 mb-3">Hover over these buttons:</p>
                <div className="flex flex-wrap gap-3">
                  <Tooltip content="This is a tooltip on top" position="top">
                    <Button variant="outline">Top Tooltip</Button>
                  </Tooltip>
                  <Tooltip content="Right side tooltip" position="right">
                    <Button variant="outline">Right Tooltip</Button>
                  </Tooltip>
                  <Tooltip content="Bottom positioned tooltip" position="bottom">
                    <Button variant="outline">Bottom Tooltip</Button>
                  </Tooltip>
                  <Tooltip content="Left side information" position="left">
                    <Button variant="outline">Left Tooltip</Button>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toast Examples */}
          <Card className="animate-fade-in" animationDelay={0.7}>
            <CardHeader>
              <CardTitle>Toast Notifications</CardTitle>
              <CardDescription>Feedback messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="success"
                  onClick={() => toast.success('Action completed successfully!')}
                >
                  Success Toast
                </Button>
                <Button 
                  variant="error"
                  onClick={() => toast.error('Something went wrong!')}
                >
                  Error Toast
                </Button>
                <Button 
                  variant="warning"
                  onClick={() => toast.warning('Please check your input')}
                >
                  Warning Toast
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => toast.info('Here is some information')}
                >
                  Info Toast
                </Button>
                <Button 
                  onClick={() => {
                    const loading = toast.loading('Processing...');
                    setTimeout(() => {
                      toast.success('Process completed!');
                    }, 2000);
                  }}
                >
                  Loading Toast
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modals */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Example Modal"
          description="This is a modal dialog with Headless UI"
          size="md"
        >
          <CardContent className="p-0">
            <p className="text-secondary-600 dark:text-secondary-400">
              This modal demonstrates accessibility features, focus trapping, and smooth animations.
              Try using the keyboard to navigate.
            </p>
          </CardContent>
        </Modal>

        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={() => {
            toast.success('Action confirmed!');
            setIsConfirmModalOpen(false);
          }}
          title="Confirm Action"
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
          icon={<Trash2 className="h-6 w-6 text-error-500" />}
        >
          <p className="text-secondary-600 dark:text-secondary-400">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
        </ConfirmationModal>
      </div>
    </div>
  );
}

export default function UIShowcasePage() {
  return (
    <ToastProvider>
      <ComponentShowcase />
    </ToastProvider>
  );
}