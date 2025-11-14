import { QueueManager, createPlayer, createTeam } from '../src/queue-management'

const management = new QueueManager();

// Lara & César 15 X 10 Maju & Elyel
// Lara & César 15 X 11 Mylka & Cassi
// Maju & Elyel 13 X 15 Ana & André
// Ana & André 12 X 15 Lara & César
// Mylka & Cassi 15 X 11 Lara & César
// Mylka & Cassi 14 X 16 Maju & Elyel
// Maju & Elyel 15 X 5 Ana & André
// Lara & César 13 X 15 Mylka & Cassi
// Maju & Elyel 9 X 15 Mylka & Cassi
// Lara & César 15 X 12 Ana & André

console.log('Queue Management System initialized.');

const tLaraCesar = createTeam(createPlayer(1, 'Lara'), createPlayer(2, 'Cesar'))
const tAnaAndre = createTeam(createPlayer(3, 'Ana'), createPlayer(4, 'Andre'))
const tMylkaCassi = createTeam(createPlayer(5, 'Mylka'), createPlayer(6, 'cassi'))
const tMajuElyel = createTeam(createPlayer(7, 'Maju'), createPlayer(8, 'Elyel'))

management.initialize([
  tLaraCesar,
  tMajuElyel,
  tMylkaCassi,
  tAnaAndre,
])

console.log('System state after initialization:');
console.log(JSON.stringify(management.getCurrentState(), null, 2));

management.recordResult(1, { 15: tLaraCesar, 10: tMajuElyel })
console.log('Recorded result for Court 1: Lara/Cesar won 15-10.');
console.log(management.beautifyQueue());

management.recordResult(1, { 15: tLaraCesar, 11: tMylkaCassi })
console.log('Recorded result for Court 1: Lara/Cesar won 15-11.');
console.log(management.beautifyQueue());

management.recordResult(1, { 15: tAnaAndre, 13: tMajuElyel })
console.log('Recorded result for Court 2: Ana/Andre won 15-13.');
console.log(management.beautifyQueue());

management.recordResult(1, { 15: tLaraCesar, 12: tAnaAndre })
console.log('Recorded result for Court 1: Lara/Cesar won 15-12.');
console.log(management.beautifyQueue());

management.recordResult(1, { 15: tMylkaCassi, 11: tLaraCesar })
console.log('Recorded result for Court 1: Mylka/Cassi won 15-11.');
console.log(management.beautifyQueue());

management.recordResult(1, { 16: tMajuElyel, 14: tMylkaCassi })
console.log('Recorded result for Court 1: Maju/Elyel won 16-14.');
console.log(management.beautifyQueue());

management.recordResult(1, { 15: tMajuElyel, 5: tAnaAndre })
console.log('Recorded result for Court 1: Maju/Elyel won 15-5.');
console.log(management.beautifyQueue());

management.recordResult(1, { 15: tMylkaCassi, 13: tLaraCesar })
console.log('Recorded result for Court 1: Mylka/Cassi won 15-13.');
console.log(management.beautifyQueue());

management.recordResult(1, { 15: tMylkaCassi, 9: tMajuElyel })
console.log('Recorded result for Court 1: Mylka/Cassi won 15-9.');
console.log(management.beautifyQueue());

management.recordResult(1, { 15: tLaraCesar, 12: tAnaAndre })
console.log('Recorded result for Court 1: Lara/Cesar won 15-12.');
console.log(management.beautifyQueue());

console.log('Final system state:');
console.log(JSON.stringify(management.getCurrentState(), null, 2));

// Display session statistics
console.log('\n=== Session Statistics ===');
const stats = management.getTeamStatistics();
stats.forEach((stat, index) => {
  console.log(`${index + 1}. ${stat.team.player1.name}/${stat.team.player2.name}: ${stat.wins}W-${stat.losses}L, ${stat.totalPoints} pts`);
});



