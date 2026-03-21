import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ChallengeParticipant, TeamChallenge } from '@/hooks/useChallenges';

interface ChallengeLeaderboardProps {
  challenge: TeamChallenge;
  participants: ChallengeParticipant[];
  currentUserId?: string;
}

export function ChallengeLeaderboard({
  challenge,
  participants,
  currentUserId,
}: ChallengeLeaderboardProps) {
  const [view, setView] = useState<'list' | 'cards'>('list');

  // Sort by rank or current_value
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.rank && b.rank) return a.rank - b.rank;
    return (b.current_value || 0) - (a.current_value || 0);
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg">Leaderboard</h3>
          <p className="text-sm text-muted-foreground">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'cards')}>
          <TabsList className="h-8">
            <TabsTrigger value="list" className="text-xs px-3">List</TabsTrigger>
            <TabsTrigger value="cards" className="text-xs px-3">Cards</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-2">
          {sortedParticipants.map((participant, index) => {
            const rank = participant.rank || index + 1;
            const isCurrentUser = participant.user_id === currentUserId;
            const name = participant.profile?.display_name || participant.profile?.full_name || participant.team_name || 'Unknown';

            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`p-3 ${isCurrentUser ? 'ring-2 ring-primary/50 bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="w-8 flex items-center justify-center">
                      {getRankBadge(rank)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={participant.profile?.photo_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-medium text-sm truncate">
                        {name}
                        {isCurrentUser && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            You
                          </Badge>
                        )}
                      </p>
                    </div>

                    {/* Value */}
                    <div className="text-right">
                      <p className="font-display text-lg">
                        {participant.current_value?.toLocaleString() || 0}
                      </p>
                      {challenge.goal_value && (
                        <p className="text-[10px] text-muted-foreground">
                          / {challenge.goal_value.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}

          {sortedParticipants.length === 0 && (
            <Card className="p-8 text-center">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No participants yet</p>
            </Card>
          )}
        </div>
      )}

      {/* Cards View */}
      {view === 'cards' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedParticipants.slice(0, 9).map((participant, index) => {
            const rank = participant.rank || index + 1;
            const isCurrentUser = participant.user_id === currentUserId;
            const name = participant.profile?.display_name || participant.profile?.full_name || participant.team_name || 'Unknown';
            const progress = challenge.goal_value
              ? Math.min((participant.current_value / challenge.goal_value) * 100, 100)
              : 0;

            return (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`p-4 relative overflow-hidden ${
                    isCurrentUser ? 'ring-2 ring-primary/50' : ''
                  }`}
                >
                  {/* Rank badge */}
                  <div className="absolute top-3 right-3">
                    {getRankBadge(rank)}
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <Avatar className="h-14 w-14 mx-auto">
                      <AvatarImage src={participant.profile?.photo_url || undefined} />
                      <AvatarFallback>{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <h4 className="font-sans font-medium mt-2 truncate">{name}</h4>
                    <p className="font-display text-2xl mt-1">
                      {participant.current_value?.toLocaleString() || 0}
                    </p>
                    {challenge.goal_value && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {Math.round(progress)}% of goal
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
