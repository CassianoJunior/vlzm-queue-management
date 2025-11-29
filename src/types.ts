/**
 * Represents a player with a unique integer ID
 */
export interface Player {
  id: number;
  name: string;
}

/**
 * Represents a team (pair of players)
 */
export interface Team {
  player1: Player;
  player2: Player;
}

/**
 * Represents a score for a team
 */
export interface Score {
  team: Team;
  score: number;
}

/**
 * Represents a match between two teams
 */
export interface Match {
  team1: Team;
  team2: Team;
  matchNumber: number;
  courtId?: number;
  currentScores?: {
    team1: number;
    team2: number;
  };
}

/**
 * Represents the result of a completed match
 */
export interface MatchResult {
  match: Match;
  winner: Team;
  loser: Team;
  timestamp: Date;
  courtId?: number;
  scores?: [Score, Score];
}

/**
 * Represents a court with its current state
 */
export interface Court {
  id: number;
  currentMatch: Match | null;
  consecutiveWins: number;
  currentCourtTeam: Team | null;
}

/**
 * Represents team statistics for a session
 */
export interface TeamStatistics {
  team: Team;
  wins: number;
  losses: number;
  totalPoints: number;
  pointsAgainst: number;
}

/**
 * Represents the current state of the system
 */
export interface SystemState {
  courts: Court[];
  queue: Team[];
  matchHistory: MatchResult[];
}

/**
 * Custom error for queue management operations
 */
export class QueueManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueueManagementError';
  }
}

/**
 * Error thrown when there are insufficient teams
 */
export class InsufficientTeamsError extends QueueManagementError {
  constructor(message: string = 'Insufficient teams to start or continue matches') {
    super(message);
    this.name = 'InsufficientTeamsError';
  }
}

/**
 * Error thrown when match result is invalid
 */
export class InvalidMatchResultError extends QueueManagementError {
  constructor(message: string = 'Invalid match result provided') {
    super(message);
    this.name = 'InvalidMatchResultError';
  }
}

/**
 * Error thrown when no active match exists
 */
export class NoActiveMatchError extends QueueManagementError {
  constructor(message: string = 'No active match in progress') {
    super(message);
    this.name = 'NoActiveMatchError';
  }
}

/**
 * Error thrown when court doesn't exist
 */
export class CourtNotFoundError extends QueueManagementError {
  constructor(message: string = 'Court not found') {
    super(message);
    this.name = 'CourtNotFoundError';
  }
}

/**
 * Error thrown when queue index is invalid
 */
export class InvalidQueueIndexError extends QueueManagementError {
  constructor(index: number, queueLength: number) {
    super(`Invalid queue index: ${index}. Queue length is ${queueLength}. Valid indices are 0 to ${queueLength - 1}.`);
    this.name = 'InvalidQueueIndexError';
  }
}
