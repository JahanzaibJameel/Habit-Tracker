import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, Calendar, Lock, Star, Target, Trophy, Zap } from 'lucide-react';

import { cn } from '../../lib/utils';
import type { Badge } from '../../types';
import { Button } from '../atoms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../atoms/Card';

interface BadgesModalProps {
  badges: Badge[];
  unlockedBadges: string[];
  onUnlockBadge: (badgeId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const BadgesModal: React.FC<BadgesModalProps> = ({
  badges,
  unlockedBadges,
  onUnlockBadge,
  isOpen,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['all', 'streak', 'completion', 'special', 'milestone'];

  const filteredBadges = badges.filter((badge) => {
    const matchesCategory = selectedCategory === 'all' || badge.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      badge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      badge.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getBadgeIcon = (badge: Badge) => {
    switch (badge.category) {
      case 'streak':
        return <Zap className="h-6 w-6" />;
      case 'completion':
        return <Target className="h-6 w-6" />;
      case 'milestone':
        return <Trophy className="h-6 w-6" />;
      case 'special':
        return <Star className="h-6 w-6" />;
      default:
        return <Award className="h-6 w-6" />;
    }
  };

  const getProgressPercentage = (badge: Badge) => {
    if (!badge.requirement) return 0;

    switch (badge.requirement.type) {
      case 'streak_days':
        // This would need to be calculated from actual streak data
        return 0; // Placeholder
      case 'total_completions':
        // This would need to be calculated from completion data
        return 0; // Placeholder
      case 'habit_streak':
        // This would need habit-specific streak data
        return 0; // Placeholder
      default:
        return 0;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-background rounded-lg shadow-xl border max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    Achievements & Badges
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    ×
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Search and Filter */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Search badges..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background"
                      />
                    </div>
                    <div className="flex gap-2">
                      {categories.map((category) => (
                        <Button
                          key={category}
                          variant={selectedCategory === category ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedCategory(category)}
                          className="capitalize"
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{unlockedBadges.length}</div>
                    <div className="text-sm text-muted-foreground">Unlocked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">
                      {badges.length - unlockedBadges.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Locked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((unlockedBadges.length / badges.length) * 100)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Progress</div>
                  </div>
                </div>

                {/* Badges Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {filteredBadges.map((badge) => {
                      const isUnlocked = unlockedBadges.includes(badge.id);
                      const progress = getProgressPercentage(badge);

                      return (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ scale: 1.05 }}
                          className={cn(
                            'relative p-4 rounded-lg border transition-all cursor-pointer',
                            isUnlocked
                              ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-amber-200 dark:from-yellow-950 dark:to-amber-900 dark:border-amber-800'
                              : 'bg-muted/50 border-muted opacity-60'
                          )}
                          onClick={() => !isUnlocked && onUnlockBadge(badge.id)}
                        >
                          {/* Badge Icon */}
                          <div className="flex justify-center mb-3">
                            <div
                              className={cn(
                                'p-3 rounded-full',
                                isUnlocked
                                  ? 'bg-gradient-to-br from-yellow-400 to-amber-400 text-white'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {getBadgeIcon(badge)}
                            </div>
                          </div>

                          {/* Badge Name */}
                          <h3
                            className={cn(
                              'font-semibold text-center mb-2',
                              isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                            )}
                          >
                            {badge.name}
                          </h3>

                          {/* Badge Description */}
                          <p
                            className={cn(
                              'text-sm text-center mb-3',
                              isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground/70'
                            )}
                          >
                            {badge.description}
                          </p>

                          {/* Requirement */}
                          {!isUnlocked && badge.requirement && (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
                                <Lock className="h-4 w-4" />
                                <span className="font-medium">
                                  {badge.requirement.type === 'streak_days' &&
                                    `Maintain ${badge.requirement.value} day streak`}
                                  {badge.requirement.type === 'total_completions' &&
                                    `Complete ${badge.requirement.value} total habits`}
                                  {badge.requirement.type === 'habit_streak' &&
                                    `${badge.requirement.value} day streak for specific habit`}
                                  {badge.requirement.type === 'special' && 'Special achievement'}
                                </span>
                              </div>

                              {/* Progress Bar */}
                              {badge.requirement.type !== 'special' && (
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-amber-400 to-amber-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Unlocked Date */}
                          {isUnlocked && badge.unlockedAt && (
                            <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
                              <Calendar className="h-3 w-3 mr-1" />
                              Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                            </div>
                          )}

                          {/* Rarity Indicator */}
                          <div className="absolute top-2 right-2">
                            <div
                              className={cn(
                                'px-2 py-1 text-xs font-medium rounded',
                                badge.rarity === 'legendary' &&
                                  'bg-gradient-to-r from-yellow-400 to-amber-400 text-white',
                                badge.rarity === 'epic' &&
                                  'bg-gradient-to-r from-purple-400 to-pink-400 text-white',
                                badge.rarity === 'rare' &&
                                  'bg-gradient-to-r from-blue-400 to-cyan-400 text-white',
                                badge.rarity === 'common' && 'bg-gray-400 text-white'
                              )}
                            >
                              {badge.rarity}
                            </div>
                          </div>

                          {/* Special Effects for Legendary Badges */}
                          {isUnlocked && badge.rarity === 'legendary' && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="animate-pulse bg-gradient-to-r from-yellow-200/20 to-amber-200/20 rounded-lg" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Empty State */}
                {filteredBadges.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No badges found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { BadgesModal };
