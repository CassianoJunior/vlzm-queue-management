# Queue Management System for Doubles Matches

A TypeScript system for managing match organization between doubles teams across multiple courts, with dynamic queue control, consecutive wins tracking, and automatic reallocation based on specific rules.

## Features

- **Multiple Courts Support**: Manage matches across multiple courts simultaneously with a shared queue
- **Dynamic Queue Management**: Automatically manages team queue based on match results
- **Consecutive Wins Tracking**: Monitors winning streaks per court and applies special rules
- **Order-Independent Team Comparison**: Teams are identified by their players regardless of order
- **Comprehensive Error Handling**: Custom errors for invalid operations
- **Match History**: Complete tracking of all matches and results with court information
- **State Persistence**: Save and load system state
- **In-Memory State**: Fast, lightweight state management

## Rules

### Initialization
- System requires at least `2 * numberOfCourts` teams to start
- First teams are assigned to courts (2 teams per court)
- Remaining teams form the shared queue in order

### After Each Match (Per Court)

#### 1 Consecutive Win
- **Winner**: Stays on court for next match
- **Loser**: Goes to the end of the shared queue
- **Next Match**: Winner vs. first team from queue

#### 2 Consecutive Wins
- **Both Teams**: Go to the end of the queue (winner first, then loser)
- **Next Match**: First two teams from queue
- **Consecutive Counter**: Resets to 0 for that court

**Exception / Bypass:** If the shared queue contains only one team at the moment a court reaches 2 consecutive wins, the "2 Consecutive Wins" rule is bypassed to avoid blocking play. In that case the winner stays on court and the loser goes to the end of the queue (i.e., the situation is treated like a single win). This prevents requiring two teams in the queue to continue.

### Multiple Courts
- All courts share the same queue
- Each court tracks its own consecutive wins independently
- Teams are pulled from the queue on a first-come, first-served basis

## Installation

```bash
npm install
```

## Usage

### Single Court Example

```typescript
import { QueueManager, createTeam, createPlayer } from './src/queue-management';

// Create players and teams
const team1 = createTeam(
  createPlayer(1, 'Alice'),
  createPlayer(2, 'Bob')
);
const team2 = createTeam(
  createPlayer(3, 'Charlie'),
  createPlayer(4, 'Diana')
);
const team3 = createTeam(
  createPlayer(5, 'Eve'),
  createPlayer(6, 'Frank')
);

// Initialize with 1 court (default)
const manager = new QueueManager(1);
manager.initialize([team1, team2, team3]);

// Record match results (specify court ID and score map)
manager.recordResult(1, { 15: team1, 10: team2 }); // team1 wins 15-10 on court 1

// Get current state
const state = manager.getCurrentState();
console.log('Courts:', state.courts);
console.log('Queue:', state.queue);
console.log('Consecutive wins:', state.courts[0].consecutiveWins);

// Get match history
const history = manager.getMatchHistory();

// Get session winner (based on wins, then points)
const winner = manager.getSessionWinner();
if (winner) {
  console.log(`Session winner: ${winner.team.player1.name}/${winner.team.player2.name}`);
  console.log(`Wins: ${winner.wins}, Total Points: ${winner.totalPoints}`);
}

// Get all team statistics
const stats = manager.getTeamStatistics();
console.log('Team standings:', stats);

// Get beautified queue display
console.log('Current queue:');
console.log(manager.beautifyQueue());
```

### Multiple Courts Example

```typescript
import { QueueManager, createTeam, createPlayer } from './src/queue-management';

// Create 6 teams
const teams = [
  createTeam(createPlayer(1, 'Alice'), createPlayer(2, 'Bob')),
  createTeam(createPlayer(3, 'Charlie'), createPlayer(4, 'Diana')),
  createTeam(createPlayer(5, 'Eve'), createPlayer(6, 'Frank')),
  createTeam(createPlayer(7, 'Grace'), createPlayer(8, 'Henry')),
  createTeam(createPlayer(9, 'Ivy'), createPlayer(10, 'Jack')),
  createTeam(createPlayer(11, 'Kate'), createPlayer(12, 'Leo'))
];

// Initialize with 2 courts
const manager = new QueueManager(2);
manager.initialize(teams);
// Court 1: teams[0] vs teams[1]
// Court 2: teams[2] vs teams[3]
// Queue: teams[4], teams[5]

// Record results on different courts
manager.recordResult(1, { 15: teams[0], 12: teams[1] }); // teams[0] wins 15-12 on court 1
manager.recordResult(2, { 15: teams[2], 13: teams[3] }); // teams[2] wins 15-13 on court 2

// Check specific court
const court1Match = manager.getCourtMatch(1);
console.log('Court 1 current match:', court1Match);

// Get all courts
const courts = manager.getCourts();
console.log('All courts:', courts);
```

### State Persistence

```typescript
// Save state
const savedState = manager.saveState();
localStorage.setItem('matchState', savedState);

// Load state later
const manager2 = new QueueManager(2);
const loadedState = localStorage.getItem('matchState');
if (loadedState) {
  manager2.loadState(loadedState);
  // Continue from where you left off
  manager2.recordResult(1, { 15: someTeam, 12: otherTeam });
}
```

## API Reference

### QueueManager

#### `constructor(numberOfCourts: number = 1)`
Create a new queue manager with specified number of courts.
- **Default**: 1 court

#### `initialize(teams: Team[]): void`
Initialize the system with an ordered list of teams.
- **Throws**: `InsufficientTeamsError` if less than `2 * numberOfCourts` teams provided

#### `addTeams(teams: Team[]): void`
Add teams to the queue after the system has been initialized.
- **Parameters**: `teams` - Array of teams to add to the queue
- **Behavior**:
  - New teams are added to the **end** of the queue
  - Duplicate teams (already in queue or currently playing on court) are **silently ignored**
  - Teams are compared by player IDs (order-independent)
- **Throws**: `Error` if the system has not been initialized (call `initialize()` first)

```typescript
// Example: Adding late arrivals to an ongoing session
const lateTeam1 = createTeam(createPlayer(17, 'Mike'), createPlayer(18, 'Nina'));
const lateTeam2 = createTeam(createPlayer(19, 'Oscar'), createPlayer(20, 'Paula'));

manager.addTeams([lateTeam1, lateTeam2]);
// Both teams are now at the end of the queue

// Trying to add a team that's already playing - silently ignored
manager.addTeams([team1]); // No effect if team1 is already on court or in queue
```

#### `recordResult(courtId: number, scoreMap: Record<number, Team>): void`
Record the result of a match on a specific court and update the queue.
- **Parameters**:
  - `courtId`: The court where the match was played
  - `scoreMap`: Object mapping scores to teams (e.g., `{ 15: team1, 13: team2 }`). Winner is determined by highest score.
- **Throws**: 
  - `CourtNotFoundError` if court doesn't exist
  - `NoActiveMatchError` if no match is in progress on that court
  - `InvalidMatchResultError` if teams in scoreMap don't match current match or if not exactly 2 teams provided
  - `InsufficientTeamsError` if the shared queue doesn't have enough teams to replace both teams after 2 consecutive wins (i.e., fewer than 2 teams). Note: when the queue has only one team, the two-consecutive-wins rule is bypassed and `InsufficientTeamsError` is not thrown.

#### `getCurrentState(): SystemState`
Get the current state of the system including all courts, queue, and match history.

#### `getCourtMatch(courtId: number): Match | null`
Get the current match on a specific court.

#### `getCourts(): Court[]`
Get all courts with their current state.

#### `getMatchHistory(): MatchResult[]`
Get the complete history of all matches played across all courts.

#### `getTeamStatistics(): TeamStatistics[]`
Get statistics for all teams that have played in the session.
- **Returns**: Array of team statistics sorted by wins (descending), then total points (descending)
- Each statistic includes: team, wins, losses, totalPoints, pointsAgainst

#### `getSessionWinner(): TeamStatistics | null`
Get the winner of the session based on:
1. Most wins
2. If tied on wins, most total points
- **Returns**: The winning team and their statistics, or null if no matches have been played

#### `beautifyQueue(): string`
Get a formatted string representation of the current queue.
- **Returns**: A string with each team in the queue on a separate line (format: "Player1 e Player2"), or "Queue is empty" if queue is empty

#### `saveState(): string`
Save the current state to a JSON string for persistence.

#### `loadState(savedState: string): void`
Load a previously saved state.
- **Throws**: `Error` if the saved state is invalid

### Utility Functions

#### `createPlayer(id: number, name: string): Player`
Create a player with a unique ID and name.

#### `createTeam(player1: Player, player2: Player): Team`
Create a team from two players.

#### `areTeamsEqual(team1: Team, team2: Team): boolean`
Compare two teams for equality (order-independent).

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Types

### Player
```typescript
interface Player {
  id: number;
  name: string;
}
```

### Team
```typescript
interface Team {
  player1: Player;
  player2: Player;
}
```

### Match
```typescript
interface Match {
  team1: Team;
  team2: Team;
  matchNumber: number;
  courtId?: number;
}
```

### Score
```typescript
interface Score {
  team: Team;
  score: number;
}
```

### TeamStatistics
```typescript
interface TeamStatistics {
  team: Team;
  wins: number;
  losses: number;
  totalPoints: number;
  pointsAgainst: number;
}
```

### MatchResult
```typescript
interface MatchResult {
  match: Match;
  winner: Team;
  loser: Team;
  timestamp: Date;
  courtId?: number;
  scores?: [Score, Score];
}
```

### Court
```typescript
interface Court {
  id: number;
  currentMatch: Match | null;
  consecutiveWins: number;
  currentCourtTeam: Team | null;
}
```

### SystemState
```typescript
interface SystemState {
  courts: Court[];
  queue: Team[];
  matchHistory: MatchResult[];
}
```

## Error Types

- `InsufficientTeamsError`: Not enough teams to start or continue matches
- `InvalidMatchResultError`: Winner is not part of the current match
- `NoActiveMatchError`: No active match in progress on specified court
- `CourtNotFoundError`: Specified court ID doesn't exist
- `QueueManagementError`: Base error class for all queue management errors

## Example Scenario

### Single Court
```typescript
// 5 teams competing on 1 court
const manager = new QueueManager(1);
manager.initialize([team1, team2, team3, team4, team5]);

// Match 1: team1 vs team2
manager.recordResult(1, { 15: team1, 12: team2 }); // team1 wins 15-12 (1 consecutive)
// Queue: [team3, team4, team5, team2]
// Court 1: team1 vs team3

// Match 2: team1 vs team3
manager.recordResult(1, { 15: team1, 10: team3 }); // team1 wins 15-10 (2 consecutive - both go to queue)
// Queue: [team2, team1, team3]
// Court 1: team4 vs team5

// Match 3: team4 vs team5
manager.recordResult(1, { 15: team5, 13: team4 }); // team5 wins 15-13 (1 consecutive)
// Queue: [team2, team1, team3, team4]
// Court 1: team5 vs team2
```

### Multiple Courts
```typescript
// 7 teams competing on 2 courts
const manager = new QueueManager(2);
manager.initialize([team1, team2, team3, team4, team5, team6, team7]);

// Initial state:
// Court 1: team1 vs team2
// Court 2: team3 vs team4
// Queue: [team5, team6, team7]

// Court 1 finishes first
manager.recordResult(1, { 15: team1, 12: team2 }); // team1 wins 15-12
// Court 1: team1 vs team5 (first from queue)
// Court 2: team3 vs team4 (still playing)
// Queue: [team6, team7, team2] (team2 added to end)

// Court 2 finishes
manager.recordResult(2, { 15: team3, 11: team4 }); // team3 wins 15-11
// Court 1: team1 vs team5 (still playing)
// Court 2: team3 vs team6 (next from queue)
// Queue: [team7, team2, team4] (team4 added to end)
```

## License

ISC
