/**
 * So Close: real-world measurement questions.
 *
 * Every entry states its definition and rounding in the prompt so a single
 * whole-number answer is fair, and cites the publisher of the reference
 * figure. These are long-established values; status 'sourced' means the
 * figure was authored from the cited reference, NOT that a second editor has
 * re-checked the live page. Re-check before raising the status to 'verified'.
 * Link check (24 Nov 2026, automated fetch): no 404s; Britannica, parliament.uk
 * and a few other publishers refuse automated requests (HTTP 403), so those
 * pages still need a manual browser check.
 *
 * Fields: [category, prompt, answer, unit, min, max, source]
 * Ranges deliberately do not centre on the answer.
 */
const rows = [
  // Buildings and landmarks
  ['general', 'How tall is the Elizabeth Tower, home of Big Ben, to the nearest metre?', 96, 'metres', 20, 250, 'https://www.parliament.uk/bigben'],
  ['general', 'How tall is the Shard in London, to the nearest metre?', 310, 'metres', 100, 600, 'https://www.the-shard.com/about/'],
  ['general', 'How tall is the London Eye, to the nearest metre?', 135, 'metres', 40, 300, 'https://en.wikipedia.org/wiki/London_Eye'],
  ['general', 'How tall is the Empire State Building to the tip of its antenna, to the nearest metre?', 443, 'metres', 150, 800, 'https://www.esbnyc.com/about/facts-figures'],
  ['general', 'What is the wingspan of the Angel of the North sculpture, in metres?', 54, 'metres', 10, 120, 'https://www.gateshead.gov.uk/article/3957/The-Angel-of-the-North'],
  ['general', 'How tall is the Christ the Redeemer statue in Rio de Janeiro, excluding its pedestal, in metres?', 30, 'metres', 5, 90, 'https://www.britannica.com/topic/Christ-the-Redeemer'],
  ['general', 'How long is the main span of the Golden Gate Bridge, to the nearest metre?', 1280, 'metres', 300, 3000, 'https://www.goldengate.org/bridge/history-research/statistics-data/design-construction-stats/'],
  ['general', 'How long is the main span of the Humber Bridge, to the nearest metre?', 1410, 'metres', 400, 3000, 'https://www.humberbridge.co.uk/about-the-bridge/'],
  ['general', 'How long is the Channel Tunnel between England and France, to the nearest kilometre?', 50, 'km', 10, 150, 'https://www.getlinkgroup.com/en/our-group/eurotunnel/'],
  ['general', 'How tall is the Statue of Liberty from the ground to the tip of the torch, to the nearest metre?', 93, 'metres', 20, 200, 'https://www.nps.gov/stli/learn/historyculture/statue-statistics.htm'],

  // Geography
  ['geography', 'How high is Mount Everest above sea level, to the nearest metre (2020 survey)?', 8849, 'metres', 5000, 12000, 'https://www.britannica.com/place/Mount-Everest'],
  ['geography', 'How high is Ben Nevis, the UK’s tallest mountain, to the nearest metre?', 1345, 'metres', 400, 3000, 'https://en.wikipedia.org/wiki/Ben_Nevis'],
  ['geography', 'How high is Yr Wyddfa (Snowdon), Wales’s tallest mountain, to the nearest metre?', 1085, 'metres', 300, 2500, 'https://en.wikipedia.org/wiki/Snowdon'],
  ['geography', 'How high is Mount Kilimanjaro, Africa’s tallest mountain, to the nearest metre?', 5895, 'metres', 2000, 9000, 'https://www.britannica.com/place/Kilimanjaro'],
  ['geography', 'How high is Mount Fuji in Japan, to the nearest metre?', 3776, 'metres', 1000, 7000, 'https://www.britannica.com/place/Mount-Fuji'],
  ['geography', 'How high is K2, the world’s second-highest mountain, to the nearest metre?', 8611, 'metres', 5000, 11000, 'https://www.britannica.com/place/K2'],
  ['geography', 'What is the total height of Angel Falls in Venezuela, the world’s highest waterfall, to the nearest metre?', 979, 'metres', 200, 2500, 'https://www.britannica.com/place/Angel-Falls'],
  ['geography', 'What is the Earth’s circumference at the equator, to the nearest kilometre?', 40075, 'km', 10000, 80000, 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html'],
  ['geography', 'How many states make up the United States of America?', 50, 'states', 10, 120, 'https://www.usa.gov/states-and-territories'],

  // Animals and the human body
  ['animals', 'How many teeth does an adult dog normally have?', 42, 'teeth', 10, 90, 'https://www.britannica.com/animal/dog/Physical-characteristics'],
  ['animals', 'How many teeth does an adult cat normally have?', 30, 'teeth', 5, 70, 'https://www.britannica.com/animal/cat/Physical-characteristics'],
  ['animals', 'An African elephant pregnancy lasts about how many months?', 22, 'months', 3, 36, 'https://www.worldwildlife.org/species/african-elephant'],

  // Space
  ['space', 'What is the average distance from the Earth to the Moon, to the nearest kilometre?', 384400, 'km', 100000, 900000, 'https://science.nasa.gov/moon/facts/'],
  ['space', 'What is the Moon’s diameter, to the nearest kilometre?', 3475, 'km', 500, 9000, 'https://science.nasa.gov/moon/facts/'],
  ['space', 'How many Earth days does Mars take to orbit the Sun once, to the nearest day?', 687, 'days', 200, 1500, 'https://science.nasa.gov/mars/facts/'],
  ['space', 'How many Earth days does Jupiter take to orbit the Sun once, to the nearest day?', 4333, 'days', 1000, 9000, 'https://science.nasa.gov/jupiter/facts/'],
  ['space', 'Sunlight takes about how many seconds to reach Earth, to the nearest ten seconds?', 500, 'seconds', 60, 1500, 'https://science.nasa.gov/sun/facts/'],
  ['space', 'How fast does light travel in a vacuum, to the nearest kilometre per second?', 299792, 'km/s', 50000, 600000, 'https://www.britannica.com/science/speed-of-light'],
  ['space', 'In what year did Yuri Gagarin become the first person in space?', 1961, 'year', 1930, 1990, 'https://www.britannica.com/biography/Yuri-Gagarin'],

  // History
  ['history', 'In what year did the Great Fire of London begin?', 1666, 'year', 1500, 1800, 'https://www.britannica.com/event/Great-Fire-of-London'],
  ['history', 'In what year did the Wright brothers make the first powered aeroplane flight?', 1903, 'year', 1850, 1950, 'https://www.britannica.com/biography/Wright-brothers'],
  ['history', 'In what year did Queen Victoria become queen?', 1837, 'year', 1750, 1920, 'https://www.royal.uk/queen-victoria'],
  ['history', 'In what year was the NHS founded?', 1948, 'year', 1900, 2000, 'https://www.nhs.uk/using-the-nhs/about-the-nhs/the-nhs/'],
  ['history', 'In what year did the Channel Tunnel open to the public?', 1994, 'year', 1950, 2020, 'https://www.britannica.com/topic/Channel-Tunnel'],
  ['history', 'In what year did Mount Vesuvius erupt and bury Pompeii (AD)?', 79, 'year', 0, 500, 'https://www.britannica.com/place/Pompeii'],
  ['history', 'In what year did the UK switch to decimal currency on Decimal Day?', 1971, 'year', 1940, 2000, 'https://www.royalmint.com/discover/decimalisation/'],
  ['history', 'From start to finish, how many years did the Hundred Years’ War between England and France last?', 116, 'years', 50, 200, 'https://www.britannica.com/event/Hundred-Years-War'],
  ['history', 'In what year did women first vote in a UK general election?', 1918, 'year', 1850, 1970, 'https://www.parliament.uk/about/living-heritage/transformingsociety/electionsvoting/womenvote/'],

  // Sports
  ['sports', 'How long is a marathon, in metres?', 42195, 'metres', 10000, 80000, 'https://worldathletics.org/about-iaaf/documents/book-of-rules'],
  ['sports', 'How far is the penalty mark from the goal line in association football, in metres?', 11, 'metres', 3, 30, 'https://www.theifab.com/laws/latest/the-field-of-play/'],
  ['sports', 'How wide is a full-size football goal between the posts, in centimetres?', 732, 'cm', 300, 1500, 'https://www.theifab.com/laws/latest/the-field-of-play/'],
  ['sports', 'How high is a full-size football crossbar from the ground, in centimetres?', 244, 'cm', 100, 500, 'https://www.theifab.com/laws/latest/the-field-of-play/'],
  ['sports', 'How high is a regulation basketball hoop from the floor, in centimetres?', 305, 'cm', 150, 500, 'https://www.fiba.basketball/documents'],
  ['sports', 'How long is a cricket pitch between the stumps, in yards?', 22, 'yards', 5, 50, 'https://www.lords.org/mcc/the-laws-of-cricket'],
  ['sports', 'How high is a tennis net at the centre, in millimetres?', 914, 'mm', 300, 2000, 'https://www.itftennis.com/en/about-us/governance/rules-and-regulations/'],
  ['sports', 'What is the highest possible single break in standard snooker?', 147, 'points', 50, 300, 'https://www.wst.tv/'],
  ['sports', 'What is the highest score possible with three darts in standard darts?', 180, 'points', 60, 400, 'https://www.britannica.com/sports/darts'],
  ['sports', 'How heavy is the shot used in men’s senior shot put, in grams?', 7260, 'g', 2000, 15000, 'https://worldathletics.org/about-iaaf/documents/book-of-rules'],

  // Science and measurement
  ['science', 'How fast does sound travel through dry air at 20 °C, to the nearest metre per second?', 343, 'm/s', 100, 900, 'https://www.britannica.com/science/sound-physics/The-speed-of-sound'],
  ['science', 'How many chemical elements are named in the periodic table?', 118, 'elements', 50, 250, 'https://iupac.org/what-we-do/periodic-table-of-elements/'],
  ['science', 'How many metres are in one mile, to the nearest metre?', 1609, 'metres', 500, 3000, 'https://www.britannica.com/science/mile'],
  ['science', 'How many feet are in one mile?', 5280, 'feet', 1000, 10000, 'https://www.britannica.com/science/mile'],
  ['science', 'How many yards are in one mile?', 1760, 'yards', 500, 4000, 'https://www.britannica.com/science/mile'],
  ['science', 'How many seconds are in one day?', 86400, 'seconds', 10000, 200000, 'https://www.britannica.com/science/day'],
  ['science', 'How many hours are in a year that is not a leap year?', 8760, 'hours', 2000, 15000, 'https://www.britannica.com/science/year'],

  // Food and drink measures
  ['food', 'How many millilitres are in a UK pint, to the nearest millilitre?', 568, 'ml', 200, 1200, 'https://www.legislation.gov.uk/uksi/1995/1804/schedule'],
  ['food', 'How many millilitres are in a UK (imperial) gallon, to the nearest millilitre?', 4546, 'ml', 1000, 9000, 'https://www.legislation.gov.uk/uksi/1995/1804/schedule'],
  ['food', 'How many grams are in one pound (lb), to the nearest gram?', 454, 'g', 100, 1000, 'https://www.legislation.gov.uk/uksi/1995/1804/schedule'],
  ['food', 'How many ounces are in one pound (lb)?', 16, 'ounces', 4, 40, 'https://www.legislation.gov.uk/uksi/1995/1804/schedule'],

  // Music, art and technology
  ['music', 'In what year did the Beatles release their first UK album, Please Please Me?', 1963, 'year', 1950, 1980, 'https://en.wikipedia.org/wiki/Please_Please_Me'],
  ['art', 'How tall is Leonardo da Vinci’s Mona Lisa painting, to the nearest centimetre?', 77, 'cm', 20, 200, 'https://collections.louvre.fr/en/ark:/53355/cl010062370'],
  ['books', 'In what year was William Shakespeare baptised in Stratford-upon-Avon?', 1564, 'year', 1450, 1700, 'https://www.shakespeare.org.uk/explore-shakespeare/shakespedia/william-shakespeare/'],
  ['technology', 'In what year was the first SMS text message sent?', 1992, 'year', 1970, 2010, 'https://www.britannica.com/technology/text-messaging'],
  ['technology', 'In what year did Tim Berners-Lee first propose the World Wide Web?', 1989, 'year', 1960, 2010, 'https://info.cern.ch/Proposal.html'],
  // Added after duplicate screening against the existing banks
  ['history', 'In what year did Tower Bridge in London open?', 1894, 'year', 1800, 1960, 'https://en.wikipedia.org/wiki/Tower_Bridge'],
  ['history', 'How long is Hadrian’s Wall from coast to coast, to the nearest mile?', 73, 'miles', 10, 200, 'https://www.english-heritage.org.uk/visit/places/hadrians-wall/'],
  ['sports', 'In what year was the first Wimbledon tennis championship held?', 1877, 'year', 1800, 1950, 'https://www.wimbledon.com/en_GB/atoz/history.html'],
  ['sports', 'In what year was the first FA Cup final played?', 1872, 'year', 1800, 1950, 'https://www.thefa.com/competitions/thefacup/more/history'],
  ['sports', 'What is the capacity of Wembley Stadium, to the nearest thousand?', 90000, 'seats', 30000, 150000, 'https://en.wikipedia.org/wiki/Wembley_Stadium'],
  ['games', 'How many coloured stickers are on a standard 3×3 Rubik’s Cube?', 54, 'stickers', 10, 120, 'https://en.wikipedia.org/wiki/Rubik%27s_Cube'],
  ['language', 'How many letters are in the modern Greek alphabet?', 24, 'letters', 10, 50, 'https://www.britannica.com/topic/Greek-alphabet'],
  ['general', 'What is the national speed limit for cars on UK motorways, in miles per hour?', 70, 'mph', 30, 130, 'https://www.gov.uk/speed-limits'],
];

export const soCloseBank = Object.freeze(rows.map(([category, prompt, answer, unit, min, max, source]) =>
  Object.freeze({ category, prompt, answer, unit, min, max, source, status: 'sourced' })));

const sources = new Map(soCloseBank.map(row => [row.prompt, row.source]));
export const soCloseSourceFor = prompt => sources.get(prompt);

/** Structural audit for So Close content; returns a list of problems. */
export function soCloseAudit(bank = soCloseBank) {
  const errors = [];
  const seen = new Set();
  for (const row of bank) {
    const key = row.prompt.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(key)) errors.push('Duplicate prompt: ' + row.prompt);
    seen.add(key);
    if (!Number.isSafeInteger(row.answer) || !Number.isSafeInteger(row.min) || !Number.isSafeInteger(row.max)) errors.push('Non-integer value: ' + row.prompt);
    if (!(row.min < row.answer && row.answer < row.max)) errors.push('Answer must sit strictly inside its range: ' + row.prompt);
    if (row.min < 0) errors.push('Negative range: ' + row.prompt);
    if (!/^https:\/\//.test(row.source)) errors.push('Missing https source: ' + row.prompt);
    if (!row.unit) errors.push('Missing unit: ' + row.prompt);
    if (row.prompt.length > 140) errors.push('Prompt too long for TV: ' + row.prompt);
  }
  return errors;
}
