import {
  type Player,
  type Team,
  type Match,
  type MatchResult,
  type SystemState,
  type Court,
  type TeamStatistics,
  InsufficientTeamsError,
  InvalidMatchResultError,
  NoActiveMatchError,
  CourtNotFoundError
} from './types';

/**
 * Queue Manager for organizing doubles matches across multiple courts
 */
export class QueueManager {
  private state: SystemState;
  private matchCounter: number = 0;

  constructor(numberOfCourts: number = 1) {
    if (numberOfCourts < 1) {
      throw new Error('Number of courts must be at least 1');
    }

    this.state = {
      courts: Array.from({ length: numberOfCourts }, (_, i) => ({
        id: i + 1,
        currentMatch: null,
        consecutiveWins: 0,
        currentCourtTeam: null
      })),
      queue: [],
      matchHistory: []
    };
  }

  /**
   * Initialize the system with an ordered list of teams
   * @param teams - Array of teams in initial order
   * @throws {InsufficientTeamsError} if not enough teams for available courts
   */
  initialize(teams: Team[]): void {
    const requiredTeams = this.state.courts.length * 2;
    if (teams.length < requiredTeams) {
      throw new InsufficientTeamsError(`At least ${requiredTeams} teams are required for ${this.state.courts.length} court(s)`);
    }

    // Assign teams to courts
    let teamIndex = 0;
    for (const court of this.state.courts) {
      const team1 = teams[teamIndex++];
      const team2 = teams[teamIndex++];

      this.matchCounter++;
      court.currentMatch = {
        team1,
        team2,
        matchNumber: this.matchCounter,
        courtId: court.id
      };
      court.consecutiveWins = 0;
      court.currentCourtTeam = null;

      console.log(`Court ${court.id} initialized: Team [${team1.player1.name}, ${team1.player2.name}] vs Team [${team2.player1.name}, ${team2.player2.name}]`);
    }

    // Remaining teams form the queue
    this.state.queue = teams.slice(teamIndex);
    this.state.matchHistory = [];

    console.log(`System initialized with ${teams.length} teams across ${this.state.courts.length} court(s)`);
    console.log(`Queue size: ${this.state.queue.length}`);
  }

  /**
   * Add teams to the queue after the system has been initialized
   * New teams are added to the end of the queue
   * Duplicate teams (already in queue or playing on court) are silently ignored
   * @param teams - Array of teams to add to the queue
   * @throws {Error} if the system has not been initialized
   */
  addTeams(teams: Team[]): void {
    // Check if system is initialized (at least one court has an active match)
    const hasActiveMatch = this.state.courts.some(court => court.currentMatch !== null);
    if (!hasActiveMatch) {
      throw new Error('Cannot add teams: System has not been initialized. Call initialize() first.');
    }

    // Get all existing team IDs (from queue and courts)
    const existingTeamIds = new Set<string>();

    // Add teams from queue
    for (const team of this.state.queue) {
      existingTeamIds.add(this.getTeamKey(team));
    }

    // Add teams from courts
    for (const court of this.state.courts) {
      if (court.currentMatch) {
        existingTeamIds.add(this.getTeamKey(court.currentMatch.team1));
        existingTeamIds.add(this.getTeamKey(court.currentMatch.team2));
      }
    }

    // Filter out duplicates and add new teams
    const newTeams = teams.filter(team => {
      const teamKey = this.getTeamKey(team);
      return !existingTeamIds.has(teamKey);
    });

    // Add new teams to end of queue
    this.state.queue.push(...newTeams);

    if (newTeams.length > 0) {
      console.log(`Added ${newTeams.length} team(s) to the queue`);
      console.log(`Queue size: ${this.state.queue.length}`);
    }

    if (newTeams.length < teams.length) {
      console.log(`${teams.length - newTeams.length} duplicate team(s) were ignored`);
    }
  }

  /**
   * Record the result of a match on a specific court and update the queue
   * @param courtId - The ID of the court where the match was played
   * @param scoreMap - Object mapping scores to teams (e.g., { 15: team1, 13: team2 })
   * @throws {CourtNotFoundError} if court doesn't exist
   * @throws {NoActiveMatchError} if no match is in progress on that court
   * @throws {InvalidMatchResultError} if teams in scoreMap don't match current match
   * @throws {InsufficientTeamsError} if queue doesn't have enough teams after 2 consecutive wins
   */
  recordResult(courtId: number, scoreMap: Record<number, Team>): void {
    const court = this.state.courts.find(c => c.id === courtId);
    
    if (!court) {
      throw new CourtNotFoundError(`Court ${courtId} does not exist`);
    }

    if (!court.currentMatch) {
      throw new NoActiveMatchError(`No active match on court ${courtId}`);
    }

    const { team1, team2 } = court.currentMatch;

    // Extract scores and teams from scoreMap
    const scores = Object.entries(scoreMap).map(([score, team]) => ({
      score: Number(score),
      team
    }));

    // Validate that we have exactly 2 teams
    if (scores.length !== 2) {
      throw new InvalidMatchResultError('Score map must contain exactly 2 teams');
    }

    // Validate that both teams are part of the current match
    const validTeams = scores.every(s => 
      areTeamsEqual(s.team, team1) || areTeamsEqual(s.team, team2)
    );
    
    if (!validTeams) {
      throw new InvalidMatchResultError('Teams in score map must be part of the current match');
    }

    // Determine winner and loser based on scores
    scores.sort((a, b) => b.score - a.score);
    const winner = scores[0].team;
    const loser = scores[1].team;

    // Record match result
    const result: MatchResult = {
      match: court.currentMatch,
      winner,
      loser,
      timestamp: new Date(),
      courtId: court.id,
      scores: [
        { team: winner, score: scores[0].score },
        { team: loser, score: scores[1].score }
      ]
    };
    this.state.matchHistory.push(result);

    console.log(`Court ${courtId} - Match ${court.currentMatch.matchNumber} result: Team [${winner.player1.name}, ${winner.player2.name}] won`);

    // Update consecutive wins counter
    if (court.currentCourtTeam && areTeamsEqual(winner, court.currentCourtTeam)) {
      court.consecutiveWins++;
    } else {
      court.consecutiveWins = 1;
      court.currentCourtTeam = winner;
    }

    console.log(`Court ${courtId} - Consecutive wins: ${court.consecutiveWins}`);

    // Apply queue management rules
    if (court.consecutiveWins >= 2 && this.state.queue.length >= 2) {
      // Rule: After 2 consecutive wins, both teams go to the end of the queue
      // Winner goes first, then loser
      console.log(`Court ${courtId} - 2 consecutive wins reached! Both teams return to queue.`);
      
      // Check if we have enough teams in queue for next match BEFORE adding current teams
      if (this.state.queue.length < 2) {
        throw new InsufficientTeamsError(`Not enough teams in queue to continue on court ${courtId} after 2 consecutive wins`);
      }

      // Next two teams from queue play
      const nextTeam1 = this.state.queue.shift()!;
      const nextTeam2 = this.state.queue.shift()!;

      // Now add the current teams to the back of the queue
      this.state.queue.push(winner);
      this.state.queue.push(loser);

      court.consecutiveWins = 0;
      court.currentCourtTeam = null;

      this.matchCounter++;
      court.currentMatch = {
        team1: nextTeam1,
        team2: nextTeam2,
        matchNumber: this.matchCounter,
        courtId: court.id
      };

      console.log(`Court ${courtId} - Next match: Team [${nextTeam1.player1.name}, ${nextTeam1.player2.name}] vs Team [${nextTeam2.player1.name}, ${nextTeam2.player2.name}]`);
    } else {
      // Rule: Winner stays, loser goes to end of queue
      console.log(`Court ${courtId} - Winner stays on court, loser goes to end of queue.`);
      
      this.state.queue.push(loser);

      // Check if we have a team in queue for next match
      if (this.state.queue.length < 1) {
        throw new InsufficientTeamsError(`Not enough teams in queue to continue on court ${courtId}`);
      }

      // Winner plays against next team from queue
      const nextOpponent = this.state.queue.shift()!;

      this.matchCounter++;
      court.currentMatch = {
        team1: winner,
        team2: nextOpponent,
        matchNumber: this.matchCounter,
        courtId: court.id
      };

      console.log(`Court ${courtId} - Next match: Team [${winner.player1.name}, ${winner.player2.name}] vs Team [${nextOpponent.player1.name}, ${nextOpponent.player2.name}]`);
    }

    console.log(`Queue size: ${this.state.queue.length}\n`);
  }

  /**
   * Get the current state of the system
   */
  getCurrentState(): SystemState {
    return {
      courts: this.state.courts.map(court => ({
        id: court.id,
        currentMatch: court.currentMatch,
        consecutiveWins: court.consecutiveWins,
        currentCourtTeam: court.currentCourtTeam
      })),
      queue: [...this.state.queue],
      matchHistory: [...this.state.matchHistory]
    };
  }

  /**
   * Get the current match on a specific court
   * @param courtId - The ID of the court
   */
  getCourtMatch(courtId: number): Match | null {
    const court = this.state.courts.find(c => c.id === courtId);
    return court?.currentMatch || null;
  }

  /**
   * Get all courts
   */
  getCourts(): Court[] {
    return this.state.courts.map(court => ({ ...court }));
  }

  /**
   * Get match history
   */
  getMatchHistory(): MatchResult[] {
    return [...this.state.matchHistory];
  }

  /**
   * Get statistics for all teams that have played in the session
   * @returns Array of team statistics sorted by wins (descending) then total points (descending)
   */
  getTeamStatistics(): TeamStatistics[] {
    const statsMap = new Map<string, TeamStatistics>();

    // Process each match result
    for (const result of this.state.matchHistory) {
      const winnerKey = this.getTeamKey(result.winner);
      const loserKey = this.getTeamKey(result.loser);

      // Initialize winner stats if not exists
      if (!statsMap.has(winnerKey)) {
        statsMap.set(winnerKey, {
          team: result.winner,
          wins: 0,
          losses: 0,
          totalPoints: 0,
          pointsAgainst: 0
        });
      }

      // Initialize loser stats if not exists
      if (!statsMap.has(loserKey)) {
        statsMap.set(loserKey, {
          team: result.loser,
          wins: 0,
          losses: 0,
          totalPoints: 0,
          pointsAgainst: 0
        });
      }

      // Update winner stats
      const winnerStats = statsMap.get(winnerKey)!;
      winnerStats.wins++;

      // Update loser stats
      const loserStats = statsMap.get(loserKey)!;
      loserStats.losses++;

      // Update points if scores are available
      if (result.scores) {
        const winnerScore = result.scores.find(s => areTeamsEqual(s.team, result.winner));
        const loserScore = result.scores.find(s => areTeamsEqual(s.team, result.loser));

        if (winnerScore && loserScore) {
          winnerStats.totalPoints += winnerScore.score;
          winnerStats.pointsAgainst += loserScore.score;
          loserStats.totalPoints += loserScore.score;
          loserStats.pointsAgainst += winnerScore.score;
        }
      }
    }

    // Convert to array and sort by wins (desc), then total points (desc)
    const stats = Array.from(statsMap.values());
    stats.sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      return b.totalPoints - a.totalPoints;
    });

    return stats;
  }

  /**
   * Get the winner of the session based on:
   * 1. Most wins
   * 2. If tied on wins, most total points
   * @returns The winning team and their statistics, or null if no matches have been played
   */
  getSessionWinner(): TeamStatistics | null {
    const stats = this.getTeamStatistics();
    return stats.length > 0 ? stats[0] : null;
  }

  /**
   * Get a beautified string representation of the current queue
   * @returns A formatted string showing each team in the queue, one per line
   */
  beautifyQueue(): string {
    if (this.state.queue.length === 0) {
      return 'Queue is empty';
    }

    return this.state.queue
      .map(team => `${team.player1.name} e ${team.player2.name}`)
      .join('\n');
  }

  /**
   * Generate a unique key for a team based on player IDs
   */
  private getTeamKey(team: Team): string {
    const ids = [team.player1.id, team.player2.id].sort();
    return `${ids[0]}-${ids[1]}`;
  }

  /**
   * Save the current state to a serializable object
   * @returns A serializable representation of the current state
   */
  saveState(): string {
    const saveData = {
      state: this.state,
      matchCounter: this.matchCounter
    };
    return JSON.stringify(saveData);
  }

  /**
   * Load a previously saved state
   * @param savedState - A JSON string from a previous saveState() call
   * @throws {Error} if the saved state is invalid
   */
  loadState(savedState: string): void {
    try {
      const saveData = JSON.parse(savedState);
      
      if (!saveData.state || typeof saveData.matchCounter !== 'number') {
        throw new Error('Invalid saved state format');
      }

      // Restore dates in match history
      if (saveData.state.matchHistory) {
        saveData.state.matchHistory = saveData.state.matchHistory.map((result: any) => ({
          ...result,
          timestamp: new Date(result.timestamp)
        }));
      }

      this.state = saveData.state;
      this.matchCounter = saveData.matchCounter;

      console.log('State loaded successfully');
      if (this.state.courts.length > 0 && this.state.courts[0].currentMatch) {
        const firstMatch = this.state.courts[0].currentMatch;
        console.log(`Court 1 current match: Team [${firstMatch.team1.player1.name}, ${firstMatch.team1.player2.name}] vs Team [${firstMatch.team2.player1.name}, ${firstMatch.team2.player2.name}]`);
      }
      console.log(`Queue size: ${this.state.queue.length}`);
      console.log(`Match history: ${this.state.matchHistory.length} matches`);
    } catch (error) {
      throw new Error(`Failed to load state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Compare two teams for equality (order-independent)
 * Teams are equal if they contain the same players regardless of order
 */
export function areTeamsEqual(team1: Team, team2: Team): boolean {
  const team1Ids = [team1.player1.id, team1.player2.id].sort();
  const team2Ids = [team2.player1.id, team2.player2.id].sort();
  
  return team1Ids[0] === team2Ids[0] && team1Ids[1] === team2Ids[1];
}

/**
 * Create a team from two players
 */
export function createTeam(player1: Player, player2: Player): Team {
  return { player1, player2 };
}

/**
 * Create a player
 */
export function createPlayer(id: number, name: string): Player {
  return { id, name };
}
