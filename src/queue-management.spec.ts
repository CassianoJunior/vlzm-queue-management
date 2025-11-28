import { describe, it, expect, beforeEach } from 'vitest';
import {
  QueueManager,
  areTeamsEqual,
  createTeam,
  createPlayer
} from './queue-management';
import {
  Team,
  InsufficientTeamsError,
  InvalidMatchResultError,
  NoActiveMatchError,
  CourtNotFoundError
} from './types';

describe('Queue Management System', () => {
  describe('Initialization', () => {
    it('should throw error with insufficient teams (0 teams)', () => {
      const manager = new QueueManager();
      expect(() => manager.initialize([])).toThrow(InsufficientTeamsError);
    });

    it('should throw error with insufficient teams (1 team)', () => {
      const manager = new QueueManager();
      const team1 = createTeam(createPlayer(1, 'Player1'), createPlayer(2, 'Player2'));
      expect(() => manager.initialize([team1])).toThrow(InsufficientTeamsError);
    });

    it('should successfully initialize with 2 teams on 1 court', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      
      manager.initialize([team1, team2]);
      
      const state = manager.getCurrentState();
      expect(state.courts.length).toBe(1);
      expect(state.courts[0].currentMatch).not.toBeNull();
      expect(state.queue.length).toBe(0);
      expect(state.courts[0].consecutiveWins).toBe(0);
    });

    it('should correctly set up initial matches and queue with 4 teams on 1 court', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      
      manager.initialize([team1, team2, team3, team4]);
      
      const state = manager.getCurrentState();
      expect(state.courts[0].currentMatch).not.toBeNull();
      expect(state.queue.length).toBe(2);
      expect(areTeamsEqual(state.queue[0], team3)).toBe(true);
      expect(areTeamsEqual(state.queue[1], team4)).toBe(true);
    });

    it('should initialize multiple courts with sufficient teams', () => {
      const manager = new QueueManager(2);
      const teams = [
        createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob')),
        createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana')),
        createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank')),
        createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry')),
        createTeam(createPlayer(9, 'Ivy'), createPlayer(10, 'Jack'))
      ];
      
      manager.initialize(teams);
      
      const state = manager.getCurrentState();
      expect(state.courts.length).toBe(2);
      expect(state.courts[0].currentMatch).not.toBeNull();
      expect(state.courts[1].currentMatch).not.toBeNull();
      expect(state.queue.length).toBe(1);
    });

    it('should throw error if not enough teams for multiple courts', () => {
      const manager = new QueueManager(2);
      const teams = [
        createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob')),
        createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'))
      ];
      
      expect(() => manager.initialize(teams)).toThrow(InsufficientTeamsError);
    });
  });

  describe('Team Equality', () => {
    it('should consider teams equal regardless of player order', () => {
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(2, 'Bob'), createPlayer(1, 'Alice'));
      const team3 = createTeam(createPlayer(1, 'Alice'), createPlayer(3, 'Charlie'));
      
      expect(areTeamsEqual(team1, team2)).toBe(true);
      expect(areTeamsEqual(team1, team3)).toBe(false);
    });
  });

  describe('Match Result Recording', () => {
    it('should throw error when recording result without active match', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      
      expect(() => manager.recordResult(1, { 15: team1, 10: team2 })).toThrow(NoActiveMatchError);
    });

    it('should throw error for invalid court id', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      
      manager.initialize([team1, team2]);
      
      expect(() => manager.recordResult(999, { 15: team1, 10: team2 })).toThrow(CourtNotFoundError);
    });

    it('should throw error when teams in score map are not part of current match', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      
      manager.initialize([team1, team2, team3]);
      
      expect(() => manager.recordResult(1, { 15: team3, 10: team1 })).toThrow(InvalidMatchResultError);
    });

    it('should handle first win correctly - winner stays, loser goes to queue', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      
      manager.initialize([team1, team2, team3, team4]);
      
      // Team1 wins first match
      manager.recordResult(1, { 15: team1, 12: team2 });
      
      const state = manager.getCurrentState();
      expect(state.courts[0].consecutiveWins).toBe(1);
      expect(areTeamsEqual(state.courts[0].currentCourtTeam!, team1)).toBe(true);
      
      // Check that team2 (loser) is at the end of queue
      expect(state.queue.length).toBe(2);
      expect(areTeamsEqual(state.queue[1], team2)).toBe(true);
      
      // Next match should be team1 vs team3
      expect(state.courts[0].currentMatch).not.toBeNull();
      const currentMatch = state.courts[0].currentMatch!;
      const isCorrectMatch = 
        (areTeamsEqual(currentMatch.team1, team1) && areTeamsEqual(currentMatch.team2, team3)) ||
        (areTeamsEqual(currentMatch.team1, team3) && areTeamsEqual(currentMatch.team2, team1));
      expect(isCorrectMatch).toBe(true);
    });

    it('should handle two consecutive wins - both teams go to queue', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      
      manager.initialize([team1, team2, team3, team4]);
      
      // Team1 wins first match
      manager.recordResult(1, { 15: team1, 12: team2 });
      
      // Team1 wins second match (2 consecutive wins)
      manager.recordResult(1, { 15: team1, 10: team3 });
      
      const state = manager.getCurrentState();
      expect(state.courts[0].consecutiveWins).toBe(0);
      expect(state.courts[0].currentCourtTeam).toBeNull();
      
      // Check that both team1 and team3 are in queue
      expect(state.queue.length).toBe(2);
      expect(areTeamsEqual(state.queue[0], team1)).toBe(true);
      expect(areTeamsEqual(state.queue[1], team3)).toBe(true);
      
      // Next match should be team2 vs team4
      expect(state.courts[0].currentMatch).not.toBeNull();
      const currentMatch = state.courts[0].currentMatch!;
      const isCorrectMatch = 
        (areTeamsEqual(currentMatch.team1, team2) && areTeamsEqual(currentMatch.team2, team4)) ||
        (areTeamsEqual(currentMatch.team1, team4) && areTeamsEqual(currentMatch.team2, team2));
      expect(isCorrectMatch).toBe(true);
    });

    it('should ignore 2 consecutive wins rule when queue has insufficient teams (1 team)', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      
      manager.initialize([team1, team2, team3]);
      
      // Team1 wins first match
      manager.recordResult(1, { 15: team1, 10: team2 });
      
      // Team1 wins second match - should NOT throw error, but treat as normal win
      // Queue has only team2 (length 1). 2 consecutive wins rule ignored.
      // Winner (team1) stays, loser (team3) goes to queue.
      // Next match: team1 vs team2
      manager.recordResult(1, { 15: team1, 8: team3 });
      
      const state = manager.getCurrentState();
      expect(state.courts[0].consecutiveWins).toBe(2);
      expect(areTeamsEqual(state.courts[0].currentCourtTeam!, team1)).toBe(true);
      
      // Check queue
      expect(state.queue.length).toBe(1);
      expect(areTeamsEqual(state.queue[0], team3)).toBe(true);
      
      // Check next match
      const currentMatch = state.courts[0].currentMatch!;
      const isCorrectMatch = 
        (areTeamsEqual(currentMatch.team1, team1) && areTeamsEqual(currentMatch.team2, team2)) ||
        (areTeamsEqual(currentMatch.team1, team2) && areTeamsEqual(currentMatch.team2, team1));
      expect(isCorrectMatch).toBe(true);
    });
  });

  describe('Multiple Matches Simulation', () => {
    it('should correctly handle a sequence of multiple matches on single court', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      const team5 = createTeam(createPlayer(9, 'Ivy'), createPlayer(10, 'Jack'));
      
      manager.initialize([team1, team2, team3, team4, team5]);
      
      // Match 1: team1 vs team2, team1 wins
      manager.recordResult(1, { 15: team1, 10: team2 });
      expect(manager.getCurrentState().courts[0].consecutiveWins).toBe(1);
      
      // Match 2: team1 vs team3, team1 wins (2 consecutive)
      manager.recordResult(1, { 15: team1, 12: team3 });
      expect(manager.getCurrentState().courts[0].consecutiveWins).toBe(0);
      
      // Match 3: team4 vs team5, team5 wins
      manager.recordResult(1, { 15: team5, 13: team4 });
      expect(manager.getCurrentState().courts[0].consecutiveWins).toBe(1);
      
      // Match 4: team5 vs team2, team2 wins
      manager.recordResult(1, { 15: team2, 11: team5 });
      expect(manager.getCurrentState().courts[0].consecutiveWins).toBe(1);
      
      // Verify match history
      const history = manager.getMatchHistory();
      expect(history.length).toBe(4);
    });

    it('should handle matches on multiple courts with shared queue', () => {
      const manager = new QueueManager(2);
      const teams = [
        createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob')),
        createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana')),
        createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank')),
        createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry')),
        createTeam(createPlayer(9, 'Ivy'), createPlayer(10, 'Jack')),
        createTeam(createPlayer(11, 'Kate'), createPlayer(12, 'Leo'))
      ];
      
      manager.initialize(teams);
      
      const state = manager.getCurrentState();
      expect(state.courts.length).toBe(2);
      expect(state.queue.length).toBe(2);
      
      // Court 1: team1 wins
      manager.recordResult(1, { 15: teams[0], 10: teams[1] });
      expect(state.queue.length).toBe(2); // loser went to queue, one came out
      
      // Court 2: team3 wins
      manager.recordResult(2, { 15: teams[2], 12: teams[3] });
      
      // Verify match history has results from both courts
      const history = manager.getMatchHistory();
      expect(history.length).toBe(2);
      expect(history[0].courtId).toBe(1);
      expect(history[1].courtId).toBe(2);
    });
  });

  describe('State Persistence', () => {
    it('should save and load state correctly', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      
      manager.initialize([team1, team2, team3, team4]);
      manager.recordResult(1, { 15: team1, 10: team2 });
      
      // Save state
      const savedState = manager.saveState();
      expect(savedState).toBeTruthy();
      expect(typeof savedState).toBe('string');
      
      // Create new manager and load state
      const newManager = new QueueManager(1);
      newManager.loadState(savedState);
      
      const originalState = manager.getCurrentState();
      const loadedState = newManager.getCurrentState();
      
      expect(loadedState.courts[0].consecutiveWins).toBe(originalState.courts[0].consecutiveWins);
      expect(loadedState.queue.length).toBe(originalState.queue.length);
      expect(loadedState.matchHistory.length).toBe(originalState.matchHistory.length);
      expect(loadedState.courts[0].currentMatch?.matchNumber).toBe(originalState.courts[0].currentMatch?.matchNumber);
    });

    it('should preserve match history timestamps when loading state', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      
      manager.initialize([team1, team2, team3]);
      manager.recordResult(1, { 15: team1, 10: team2 });
      
      const savedState = manager.saveState();
      
      const newManager = new QueueManager(1);
      newManager.loadState(savedState);
      
      const loadedHistory = newManager.getMatchHistory();
      expect(loadedHistory[0].timestamp).toBeInstanceOf(Date);
    });

    it('should continue from loaded state correctly', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      
      manager.initialize([team1, team2, team3, team4]);
      manager.recordResult(1, { 15: team1, 10: team2 }); // team1 wins, 1 consecutive
      
      const savedState = manager.saveState();
      
      // Load into new manager
      const newManager = new QueueManager(1);
      newManager.loadState(savedState);
      
      // Continue playing
      newManager.recordResult(1, { 15: team1, 12: team3 }); // team1 wins again, 2 consecutive
      
      const state = newManager.getCurrentState();
      expect(state.courts[0].consecutiveWins).toBe(0); // Should reset after 2 consecutive
      expect(state.matchHistory.length).toBe(2);
    });

    it('should throw error for invalid saved state', () => {
      const manager = new QueueManager(1);
      
      expect(() => manager.loadState('invalid json')).toThrow('Failed to load state');
      expect(() => manager.loadState('{}')).toThrow('Failed to load state');
      expect(() => manager.loadState('{"state": null}')).toThrow('Failed to load state');
    });
  });

  describe('Session Winner', () => {
    it('should return null when no matches have been played', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      
      manager.initialize([team1, team2]);
      
      const winner = manager.getSessionWinner();
      expect(winner).toBeNull();
    });

    it('should return the team with most wins as session winner', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      const team5 = createTeam(createPlayer(9, 'Ivy'), createPlayer(10, 'Jack'));
      
      manager.initialize([team1, team2, team3, team4, team5]);
      
      // team1 wins twice
      manager.recordResult(1, { 15: team1, 10: team2 });
      manager.recordResult(1, { 15: team1, 12: team3 });
      
      // team5 wins once
      manager.recordResult(1, { 15: team5, 11: team4 });
      
      const winner = manager.getSessionWinner();
      expect(winner).not.toBeNull();
      expect(areTeamsEqual(winner!.team, team1)).toBe(true);
      expect(winner!.wins).toBe(2);
    });

    it('should use total points as tiebreaker when wins are equal', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      const team5 = createTeam(createPlayer(9, 'Ivy'), createPlayer(10, 'Jack'));
      
      manager.initialize([team1, team2, team3, team4, team5]);
      
      // team1 wins once with 15 points total
      manager.recordResult(1, { 15: team1, 10: team2 });
      
      // team3 wins once with 18 points total (higher)
      manager.recordResult(1, { 18: team3, 16: team1 });
      
      const winner = manager.getSessionWinner();
      expect(winner).not.toBeNull();
      
      // team1 has 1 win but 31 total points (15 + 16), team3 has 1 win and 18 points
      // So team1 should win on points tiebreaker
      expect(areTeamsEqual(winner!.team, team1)).toBe(true);
      expect(winner!.wins).toBe(1);
      expect(winner!.totalPoints).toBe(31);
    });

    it('should track statistics for all teams', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      
      manager.initialize([team1, team2, team3, team4]);
      
      manager.recordResult(1, { 15: team1, 10: team2 });
      manager.recordResult(1, { 15: team1, 12: team3 });
      manager.recordResult(1, { 15: team2, 13: team4 });
      
      const stats = manager.getTeamStatistics();
      
      // Should have 4 teams
      expect(stats.length).toBe(4);
      
      // team1 should be first (2 wins)
      expect(areTeamsEqual(stats[0].team, team1)).toBe(true);
      expect(stats[0].wins).toBe(2);
      expect(stats[0].losses).toBe(0);
      expect(stats[0].totalPoints).toBe(30);
      
      // team2 should have 1 win, 1 loss
      const team2Stats = stats.find(s => areTeamsEqual(s.team, team2));
      expect(team2Stats).not.toBeUndefined();
      expect(team2Stats!.wins).toBe(1);
      expect(team2Stats!.losses).toBe(1);
    });

    it('should handle teams with same wins and same points correctly', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      
      manager.initialize([team1, team2, team3, team4]);
      
      // team1 wins first match with 15 points
      manager.recordResult(1, { 15: team1, 10: team2 });
      // Now court has: team1 vs team3, queue has: team4, team2
      
      // team3 wins with 15 points (against team1)
      manager.recordResult(1, { 15: team3, 10: team1 });
      
      const stats = manager.getTeamStatistics();
      
      // Both team1 and team3 should have 1 win
      const team1Stats = stats.find(s => areTeamsEqual(s.team, team1));
      const team3Stats = stats.find(s => areTeamsEqual(s.team, team3));
      
      expect(team1Stats!.wins).toBe(1);
      expect(team3Stats!.wins).toBe(1);
      
      // team1 total: 15 (win) + 10 (loss) = 25
      // team3 total: 15 (win) = 15
      expect(team1Stats!.totalPoints).toBe(25);
      expect(team3Stats!.totalPoints).toBe(15);
    });
  });

  describe('Queue Display', () => {
    it('should return "Queue is empty" when queue is empty', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      
      manager.initialize([team1, team2]);
      
      const queueDisplay = manager.beautifyQueue();
      expect(queueDisplay).toBe('Queue is empty');
    });

    it('should format queue with team names correctly', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      
      manager.initialize([team1, team2, team3, team4]);
      
      const queueDisplay = manager.beautifyQueue();
      expect(queueDisplay).toBe('Eve e Frank\nGrace e Henry');
    });

    it('should update queue display after match results', () => {
      const manager = new QueueManager(1);
      const team1 = createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob'));
      const team2 = createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana'));
      const team3 = createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank'));
      const team4 = createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry'));
      
      manager.initialize([team1, team2, team3, team4]);
      
      // Initial queue: team3, team4
      let queueDisplay = manager.beautifyQueue();
      expect(queueDisplay).toBe('Eve e Frank\nGrace e Henry');
      
      // After team1 wins, team2 goes to end of queue
      manager.recordResult(1, { 15: team1, 10: team2 });
      queueDisplay = manager.beautifyQueue();
      expect(queueDisplay).toBe('Grace e Henry\nCharlie e Diana');
    });
  });
});