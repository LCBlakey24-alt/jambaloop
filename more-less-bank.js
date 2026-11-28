// The values are published approximations, not live statistics. Question wording
// names the measurement and source where definitions can affect the comparison.
const nasa = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/';
const usgsRivers = 'https://www.usgs.gov/water-science-school/science/rivers-world-worlds-longest-rivers';
const rsc = 'https://periodic-table.rsc.org/';
const nps = 'https://www.nps.gov/neri/planyourvisit/nrgbridge.htm';

export const comparisons = [
  {id:'planet-day-earth-mars', direction:'less', prompt:'Which planet has the shorter solar day?', options:[{label:'Earth',value:24},{label:'Mars',value:24.7}], unit:'hours', source:nasa},
  {id:'planet-day-jupiter-saturn', direction:'more', prompt:'Which planet has the longer solar day?', options:[{label:'Jupiter',value:9.9},{label:'Saturn',value:10.7}], unit:'hours', source:nasa},
  {id:'planet-width-earth-venus', direction:'more', prompt:'Which planet has the larger equatorial diameter?', options:[{label:'Earth',value:12756},{label:'Venus',value:12104}], unit:'km', source:nasa},
  {id:'planet-width-uranus-neptune', direction:'less', prompt:'Which planet has the smaller equatorial diameter?', options:[{label:'Uranus',value:51118},{label:'Neptune',value:49528}], unit:'km', source:nasa},
  {id:'planet-orbit-earth-venus', direction:'more', prompt:'Which planet takes longer to orbit the Sun?', options:[{label:'Venus',value:224.7},{label:'Earth',value:365.2}], unit:'Earth days', source:nasa},
  {id:'river-arkansas-ohio', direction:'less', prompt:'Which river is shorter, according to the USGS estimates?', options:[{label:'Arkansas River',value:1469},{label:'Ohio River',value:1310}], unit:'miles', source:usgsRivers},
  {id:'river-arkansas-colorado', direction:'more', prompt:'Which river is longer, according to the USGS estimates?', options:[{label:'Arkansas River',value:1469},{label:'Colorado River',value:1450}], unit:'miles', source:usgsRivers},
  {id:'river-yukon-rio-grande', direction:'less', prompt:'Which river is shorter, according to the USGS estimates?', options:[{label:'Yukon River',value:1980},{label:'Rio Grande',value:1900}], unit:'miles', source:usgsRivers},
  {id:'river-ohio-red', direction:'more', prompt:'Which river is longer, according to the USGS estimates?', options:[{label:'Ohio River',value:1310},{label:'Red River of the South',value:1290}], unit:'miles', source:usgsRivers},
  {id:'river-missouri-mississippi', direction:'more', prompt:'Which river is longer, according to the USGS estimates?', options:[{label:'Missouri River',value:2540},{label:'Mississippi River',value:2340}], unit:'miles', source:usgsRivers},
  {id:'element-copper-cobalt', direction:'less', prompt:'Which element has the lower atomic number?', options:[{label:'Copper',value:29},{label:'Cobalt',value:27}], unit:'protons', source:rsc},
  {id:'element-potassium-calcium', direction:'more', prompt:'Which element has the higher atomic number?', options:[{label:'Potassium',value:19},{label:'Calcium',value:20}], unit:'protons', source:rsc},
  {id:'element-gold-platinum', direction:'less', prompt:'Which element has the lower atomic number?', options:[{label:'Gold',value:79},{label:'Platinum',value:78}], unit:'protons', source:rsc},
  {id:'element-silver-cadmium', direction:'more', prompt:'Which element has the higher atomic number?', options:[{label:'Silver',value:47},{label:'Cadmium',value:48}], unit:'protons', source:rsc},
  {id:'bridge-brooklyn-new-river', direction:'more', prompt:'Which bridge is longer overall?', options:[{label:'Brooklyn Bridge',value:5989},{label:'New River Gorge Bridge',value:3030}], unit:'feet', source:[nps,'https://npgallery.nps.gov/GetAsset/763eefb2-3e0e-44e3-be5e-c7bdd9608e7b/']},
];
