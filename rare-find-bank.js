// Closed, inspectable answer sets. These are original prompts, not third-party quiz text.
// Links point to official source material where subject matter warrants it.
import panels from './rare-panel-data.json' with {type:'json'};
import {randomInt} from 'node:crypto';
import {questionHistoryId} from './public/question-history.js';
export const rareSources=Object.freeze({
 nasa:'https://science.nasa.gov/solar-system/planets/',
 oceans:'https://oceanservice.noaa.gov/facts/howmanyoceans.html',
 ons:'https://www.ons.gov.uk/census/2011census/2011ukcensuses/ukcensusesfrequentlyaskedquestions',
 census:'https://www.census.gov/library/reference/code-lists/ansi.html',
 iupac:'https://iupac.org/what-we-do/periodic-table-of-elements/',
 bipm:'https://www.bipm.org/en/measurement-units',
 olympics:'https://www.olympics.com/ioc/faq/olympic-symbol-and-identity/what-is-the-meaning-of-the-olympic-rings',
 fide:'https://handbook.fide.com/chapter/ChessEquipmentWithoutElectronicComponenets032026',
});
export function normaliseRare(text){
 return String(text??'').normalize('NFKD').toLocaleLowerCase('en-GB')
   .replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ')
   .replace(/[\p{P}\p{S}]/gu,' ').replace(/\s+/g,' ').trim()
   .replace(/^(?:a|an|the) /,'');
}
const planets=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'];
const usStates=['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const elements=['Hydrogen','Helium','Lithium','Beryllium','Boron','Carbon','Nitrogen','Oxygen','Fluorine','Neon','Sodium','Magnesium','Aluminium','Silicon','Phosphorus','Sulfur','Chlorine','Argon','Potassium','Calcium'];
const elementsAlias={Aluminium:['Aluminum'],Sulfur:['Sulphur']};
const catalog=[];
function add(id,category,prompt,answers,source=null,aliases={}) {
 if(answers.length<3)throw Error('Rare Find set too small: '+id);
 catalog.push(Object.freeze({id,category,prompt,answers:Object.freeze([...answers]),
  source:source?rareSources[source]??source:undefined,aliases:Object.freeze(aliases),historyId:questionHistoryId(prompt)}));
}
add('solar-planets','Space','Name one of the eight recognised planets orbiting the Sun.',planets,'nasa',{Earth:['Planet Earth']});
add('solar-inner','Space','Name an inner, rocky planet of the Solar System.',planets.slice(0,4),'nasa');
add('solar-outer','Space','Name one of the four outer planets of the Solar System.',planets.slice(4),'nasa');
add('solar-rings','Space','Name a planet in our Solar System with a ring system.',['Jupiter','Saturn','Uranus','Neptune'],'nasa');
add('five-oceans','Geography','Name one of Earth’s five commonly recognised oceans.',['Pacific Ocean','Atlantic Ocean','Indian Ocean','Southern Ocean','Arctic Ocean'],'oceans',{'Pacific Ocean':['Pacific'],'Atlantic Ocean':['Atlantic'],'Indian Ocean':['Indian'],'Southern Ocean':['Southern','Antarctic Ocean'],'Arctic Ocean':['Arctic']});
add('uk-countries','Geography','Name a constituent country of the United Kingdom.',['England','Wales','Scotland','Northern Ireland'],'ons',{'Northern Ireland':['N. Ireland']});
add('states-a','Geography','Name a US state beginning with the letter A.',usStates.filter(s=>s.startsWith('A')),'census');
add('states-c','Geography','Name a US state beginning with the letter C.',usStates.filter(s=>s.startsWith('C')),'census');
add('states-i','Geography','Name a US state beginning with the letter I.',usStates.filter(s=>s.startsWith('I')),'census');
add('states-m','Geography','Name a US state beginning with the letter M.',usStates.filter(s=>s.startsWith('M')),'census');
add('states-n','Geography','Name a US state beginning with the letter N.',usStates.filter(s=>s.startsWith('N')),'census');
add('states-w','Geography','Name a US state beginning with the letter W.',usStates.filter(s=>s.startsWith('W')),'census');
add('states-new','Geography','Name a US state whose name starts with “New”.',usStates.filter(s=>s.startsWith('New ')),'census');
add('states-cardinal','Geography','Name a US state beginning with North or South.',usStates.filter(s=>/^(North|South) /.test(s)),'census');
add('elements-first20','Science','Name one of the first twenty chemical elements by atomic number.',elements,'iupac',elementsAlias);
add('elements-first10','Science','Name an element with atomic number from 1 through 10.',elements.slice(0,10),'iupac');
add('noble-gases','Science','Name a chemical element in Group 18 (the noble gases).',['Helium','Neon','Argon','Krypton','Xenon','Radon','Oganesson'],'iupac');
add('halogens','Science','Name an element in Group 17 (the halogens).',['Fluorine','Chlorine','Bromine','Iodine','Astatine','Tennessine'],'iupac');
add('alkali-metals','Science','Name a Group 1 alkali metal, excluding hydrogen.',['Lithium','Sodium','Potassium','Rubidium','Caesium','Francium'],'iupac',{Caesium:['Cesium']});
add('si-units','Science','Name an SI base unit.',['Second','Metre','Kilogram','Ampere','Kelvin','Mole','Candela'],'bipm',{Metre:['Meter']});
add('olympic-rings','Sports','Name a colour of one of the five Olympic rings.',['Blue','Yellow','Black','Green','Red'],'olympics');
add('chess-types','Games','Name a type of piece used in standard chess.',['King','Queen','Rook','Bishop','Knight','Pawn'],'fide',{Rook:['Castle']});
add('card-suits','Games','Name a suit in a standard French-suited deck of playing cards.',['Hearts','Diamonds','Clubs','Spades'],null,{Hearts:['Heart'],Diamonds:['Diamond'],Clubs:['Club'],Spades:['Spade']});
add('month-names','General','Name a month of the Gregorian calendar.',months);
add('months-31','General','Name a Gregorian calendar month with 31 days.',['January','March','May','July','August','October','December']);
add('months-30','General','Name a Gregorian calendar month with exactly 30 days.',['April','June','September','November']);
add('weekday-names','General','Name a day of the seven-day week.',['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);
add('roman-symbols','General','Name one of the seven basic Roman numeral symbols.',['I','V','X','L','C','D','M']);
add('compass-rose','General','Name one of the eight main points of the compass.',['North','North East','East','South East','South','South West','West','North West'],null,{'North East':['Northeast','NE'],'South East':['Southeast','SE'],'South West':['Southwest','SW'],'North West':['Northwest','NW'],North:['N'],East:['E'],South:['S'],West:['W']});
add('zodiac','General','Name one of the twelve signs of the Western zodiac.',['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']);
add('platonic','Science','Name one of the five Platonic solids.',['Tetrahedron','Cube','Octahedron','Dodecahedron','Icosahedron'],null,{Tetrahedron:['Triangular pyramid'],Cube:['Hexahedron']});
add('natural-notes','Music','Name a natural musical note using one letter (without sharps or flats).',['A','B','C','D','E','F','G']);
add('vowels','General','Name one of the five traditional vowel letters in English.',['A','E','I','O','U']);
add('seasons','General','Name one of the four seasons of the year.',['Spring','Summer','Autumn','Winter'],null,{Autumn:['Fall']});
add('months-ber','General','Name a month whose name ends with the letters “ber”.',['September','October','November','December']);
add('weekdays-ts','General','Name a weekday or weekend day starting with T or S.',['Tuesday','Thursday','Saturday','Sunday']);
add('cardinal-points','General','Name a cardinal compass direction.',['North','East','South','West'],null,{North:['N'],East:['E'],South:['S'],West:['W']});
add('matter-basic','Science','Name a state of matter from the three-state school model.',['Solid','Liquid','Gas']);
add('polygons-three-eight','Maths','Name a common polygon with between three and eight sides (inclusive).',['Triangle','Quadrilateral','Pentagon','Hexagon','Heptagon','Octagon'],null,{Quadrilateral:['Four-sided polygon','Square','Rectangle','Rhombus','Parallelogram','Trapezium','Trapezoid','Kite'],Heptagon:['Septagon']});
add('rainbow-colours','General','Name a colour in the traditional seven-colour rainbow mnemonic.',['Red','Orange','Yellow','Green','Blue','Indigo','Violet']);
export const rareFindBank=Object.freeze(catalog);
export function answerMapFor(prompt){
 const result=new Map();
 for(const answer of prompt.answers){
   const variants=[answer,...(prompt.aliases[answer]||[])];
   for(const text of variants){
     const key=normaliseRare(text);
     if(!key||result.has(key)&&result.get(key)!==answer)throw Error('Conflicting Rare Find alias: '+text);
     result.set(key,answer);
   }
 }
 return result;
}
// Validate all catalogues at startup; a typo in source data cannot become a silent false positive.
for(const prompt of rareFindBank){
 if(!prompt.id||!prompt.historyId||!prompt.category||!prompt.prompt||new Set(prompt.answers).size!==prompt.answers.length)throw Error('Invalid Rare Find prompt: '+prompt.id);
 answerMapFor(prompt);
}
export const panelBank=panels.map(row=>({
 ...row,answers:Object.keys(row.counts),panelSize:20,source:'https://osf.io/jgcu6/',
 historyId:questionHistoryId(row.prompt)
}));
export function selectRarePrompt(seen=new Set(),scoring='room',played=new Set()){
 const bank=scoring==='panel'?panelBank:rareFindBank;
 const unused=bank.filter(p=>!played.has(p.id));
 const candidates=unused.length?unused:bank;
 const fresh=candidates.filter(p=>!seen.has(p.historyId)&&!seen.has('rarefind:'+p.id));
 const choices=fresh.length?fresh:candidates;
 return choices[randomInt(choices.length)];
}
