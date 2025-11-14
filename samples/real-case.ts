import { QueueManager, createPlayer, createTeam } from '../src/queue-management'

const management = new QueueManager(2);

console.log('Queue Management System initialized.');

const tAdrylVini = createTeam(createPlayer(1, 'AdryL'), createPlayer(2, 'Vini'))
const tAnaStanley = createTeam(createPlayer(3, 'Ana'), createPlayer(4, 'Stanley'))
const tMylkaBreno = createTeam(createPlayer(5, 'Mylka'), createPlayer(6, 'Breno'))
const tLauraAjr = createTeam(createPlayer(7, 'Laura'), createPlayer(8, 'Ajr'))
const tJuCassi = createTeam(createPlayer(9, 'Ju'), createPlayer(10, 'Cassi'))
const tLucianaLeo = createTeam(createPlayer(11, 'Luciana'), createPlayer(12, 'Leo'))
const tEstefaniaJr = createTeam(createPlayer(13, 'Estefânia'), createPlayer(14, 'Jr'))
const tMariaClaraMarcelo = createTeam(createPlayer(15, 'Maria Clara'), createPlayer(16, 'Marcelo Black'))

management.initialize([
  tLauraAjr,
  tAdrylVini,
  tMylkaBreno,
  tLucianaLeo,
  tAnaStanley,
  tJuCassi,
  tMariaClaraMarcelo,
  tEstefaniaJr,
])

console.log('Initial queue:\n', management.beautifyQueue());

management.recordResult(2, { 11: tMylkaBreno, 13: tLucianaLeo })
console.log('Recorded result for Court 2: Luciana/Leo won 13-11.');
console.log('Current queue:\n', management.beautifyQueue());

management.recordResult(1, { 14: tAdrylVini, 12: tLauraAjr })
console.log('Recorded result for Court 1: AdryL/Vini won 14-12.');
console.log('Current queue:\n', management.beautifyQueue());

management.recordResult(1, { 5: tAdrylVini, 12: tJuCassi })
console.log('Recorded result for Court 1: Ju/Cassi won 12-5.');
console.log('Current queue:\n', management.beautifyQueue());

management.recordResult(2, { 12: tLucianaLeo, 9: tAnaStanley })
console.log('Recorded result for Court 2: Luciana/Leo won 12-9.');
console.log('Current queue:\n', management.beautifyQueue());



