import { extraEstimateQuestions, extraOrderQuestions } from './question-expansion-v2.js';

export const estimates = {
  general: [
    ['How many squares are on a standard chessboard?', 64, 'squares', 0, 150],
    ['How many tiles are in a standard English-language Scrabble set?', 100, 'tiles', 0, 220],
    ['How many minutes are in a day?', 1440, 'minutes', 0, 2000],
    ['How many millimetres are in one inch, rounded to the nearest millimetre?', 25, 'mm', 0, 100],
    ['How many pieces are in a standard set of double-six dominoes?', 28, 'pieces', 0, 80],
  ],
  history: [
    ['In what year did the Battle of Hastings take place?', 1066, 'year', 800, 1300],
    ['In what year was the Magna Carta first issued?', 1215, 'year', 1000, 1450],
    ['In what year did the Berlin Wall fall?', 1989, 'year', 1945, 2005],
    ['In what year did the Titanic sink?', 1912, 'year', 1850, 1960],
    ['In what year did the first modern Olympic Games take place?', 1896, 'year', 1800, 1980],
  ],
  news: [
    ['How many teams played at the 2023 FIFA Women’s World Cup finals?', 32, 'teams', 10, 60],
    ['How many teams took part in the 2024 men’s UEFA European Championship finals?', 24, 'teams', 10, 50],
    ['How many teams took part in the 2026 men’s FIFA World Cup finals?', 48, 'teams', 20, 75],
    ['How many gold medals did the USA win at the Paris 2024 Olympics?', 40, 'gold medals', 0, 85],
    ['How many teams raced in the 2025 Formula One World Championship?', 10, 'teams', 0, 30],
  ],
  christmas: [
    ['How many gifts are given in total if you count every repeated gift in “The Twelve Days of Christmas”?', 364, 'gifts', 0, 550],
    ['In what year did Wham! release “Last Christmas”?', 1984, 'year', 1950, 2010],
    ['How many ghosts visit Scrooge in A Christmas Carol, including Marley?', 4, 'ghosts', 0, 20],
    ['In what year did the film Home Alone first come out?', 1990, 'year', 1970, 2015],
    ['How many reindeer pull Santa’s sleigh in “A Visit from St. Nicholas”?', 8, 'reindeer', 0, 25],
  ],
  entertainment: [
    ['How many episodes of Friends were originally broadcast?', 236, 'episodes', 0, 400],
    ['How many Academy Awards did the 1997 film Titanic win?', 11, 'Oscars', 0, 25],
    ['In what year was the first Toy Story film released?', 1995, 'year', 1970, 2015],
    ['How many feature films are in the original Hunger Games film series, from 2012 to 2015?', 4, 'films', 0, 15],
    ['How many Academy Awards did The Lord of the Rings: The Return of the King win?', 11, 'Oscars', 0, 25],
  ],
  sports: [
    ['How many metres long is a marathon?', 42195, 'metres', 30000, 55000],
    ['How many players per team are on court at the start of a standard indoor volleyball match?', 6, 'players', 0, 15],
    ['How many players are on the pitch at kickoff in a standard football match, counting both teams?', 22, 'players', 0, 45],
    ['How long, in metres, is one lap of a standard outdoor athletics track?', 400, 'metres', 0, 800],
    ['How many minutes are in regulation time in an NBA game?', 48, 'minutes', 0, 90],
  ],
  geography: [
    ['How tall is the Eiffel Tower in metres, including the antenna added in 2022?', 330, 'metres', 0, 600],
    ['What is the elevation of Mount Everest, rounded to the nearest metre using the 2020 survey?', 8849, 'metres', 6000, 11000],
    ['How many US states are there?', 50, 'states', 0, 100],
    ['How many provinces does Canada have, excluding its territories?', 10, 'provinces', 0, 30],
    ['How many metres tall is the Burj Khalifa?', 828, 'metres', 300, 1300],
  ],
  science: [
    ['Enter the usual number of bones in an adult human skeleton.', 206, 'bones', 50, 350],
    ['What is the atomic number of gold?', 79, '', 0, 120],
    ['How many teeth are in a full adult human set, including wisdom teeth?', 32, 'teeth', 0, 60],
    ['How many Earth days does Mercury take to orbit the Sun, rounded to the nearest day?', 88, 'days', 0, 210],
    ['How many chromosomes are in a typical human body cell?', 46, 'chromosomes', 0, 90],
  ],
  food: [
    ['How many standard 250 mL metric cups make one litre?', 4, 'cups', 0, 20],
    ['At sea level, what is the boiling point of pure water in degrees Fahrenheit?', 212, '°F', 0, 400],
    ['How many millilitres are in three 750 mL bottles?', 2250, 'mL', 0, 4000],
    ['How many eggs are in two baker’s dozens?', 26, 'eggs', 0, 50],
    ['How many 15 mL tablespoons fit into 240 mL?', 16, 'tablespoons', 0, 40],
  ],
  music: [
    ['How many keys does a standard full-size modern piano have?', 88, 'keys', 0, 140],
    ['How many strings do three standard six-string guitars have in total?', 18, 'strings', 0, 40],
    ['In what year did ABBA win Eurovision with “Waterloo”?', 1974, 'year', 1956, 2020],
    ['How many semitones make an octave in standard Western tuning?', 12, 'semitones', 0, 30],
    ['In which year did Queen first release “Bohemian Rhapsody”?', 1975, 'year', 1960, 2010],
  ],
  books: [
    ['How many novels are in the original Harry Potter series?', 7, 'novels', 0, 20],
    ['In what year was Pride and Prejudice first published?', 1813, 'year', 1700, 1950],
    ['In what year was The Hobbit first published?', 1937, 'year', 1850, 2000],
    ['How many books are in the main Chronicles of Narnia series?', 7, 'books', 0, 20],
    ['In what year was Mary Shelley’s Frankenstein first published?', 1818, 'year', 1700, 1950],
  ],
  technology: [
    ['How many bits are in 16 bytes?', 128, 'bits', 0, 250],
    ['What decimal number does the binary value 1010 represent?', 10, '', 0, 30],
    ['In what year did Apple release the first iPhone?', 2007, 'year', 1985, 2025],
    ['How many individual pixels are in a 1280 × 720 image?', 921600, 'pixels', 0, 1500000],
    ['How many possible values can an unsigned 8-bit byte represent?', 256, 'values', 0, 500],
  ],
  art: [
    ["In what year did the Bauhaus school first open?", 1919, "year", 1850, 1980],
    ["How many panels make up a triptych?", 3, "panels", 0, 12],
    ["In what year did the Louvre Pyramid open to the public?", 1989, "year", 1950, 2025],
    ["In what year did Claude Monet paint Impression, Sunrise, according to the date on the painting?", 1872, "year", 1800, 1950],
    ["In what year did Pablo Picasso paint Guernica?", 1937, "year", 1850, 2010],
  ],
  games: [
    ["How many stickers or visible coloured squares are on the outside of a standard 3 × 3 Rubik’s Cube?", 54, "squares", 0, 120],
    ["How many digits are used as clues or entries in a standard 9 × 9 Sudoku?", 9, "digits", 0, 25],
    ["How many cards does each player get at the start of a standard game of bridge?", 13, "cards", 0, 30],
    ["In what year was the original Nintendo Entertainment System first released in Japan as the Famicom?", 1983, "year", 1950, 2020],
    ["How many spaces are on a standard English-language Monopoly board?", 40, "spaces", 10, 90],
  ],
  animals: [
    ["How many hearts does an octopus have?", 3, "hearts", 0, 15],
    ["How many legs does a lobster have, counting its claw-bearing legs?", 10, "legs", 0, 25],
    ["How many toes does a typical domestic cat have, counting its front dewclaws?", 18, "toes", 0, 35],
    ["How many neck vertebrae does a giraffe usually have?", 7, "vertebrae", 0, 30],
    ["How many eyes does a typical adult honeybee have, counting its simple and compound eyes?", 5, "eyes", 0, 15],
  ],
  space: [
    ["How many planets orbit the Sun?", 8, "planets", 0, 20],
    ["How many people walked on the Moon during the Apollo programme?", 12, "people", 0, 40],
    ["In what year did Apollo 11 land on the Moon?", 1969, "year", 1900, 2010],
    ["How many moons does Mars have?", 2, "moons", 0, 18],
    ["How many Earth days does Venus take to orbit the Sun, to the nearest day?", 225, "days", 90, 365],
  ],
};

// Additional self-contained measurement calculations for estimation games.
// Exact unit conversions and supplied dimensions avoid changing external facts.
estimates.general.push(
  ['A staircase has 26 steps, each rising 175 mm. How high does it climb in millimetres?',4550,'mm',0,10000],
  ['A box contains 24 packets weighing 375 g each. What is their combined mass in grams?',9000,'g',0,20000],
  ['A walking route consists of 14 sections, each 650 metres long. What is the total length in metres?',9100,'metres',0,20000],
  ['A container holds 3.6 litres of water. How many millilitres is that?',3600,'ml',0,8000],
  ['A model tower is 72 cm tall at a scale of 1:50. What is the real height in metres?',36,'metres',0,100],
  ['A roll of ribbon measures 18 metres. How many centimetres long is it?',1800,'cm',0,5000],
  ['A delivery consists of 16 boxes weighing 12 kg each. What is their total mass in kilograms?',192,'kg',0,500],
  ['A tank contains 250 litres and is filled with another 175 litres. How many litres does it now contain?',425,'litres',0,1000]
);

// Append extra estimate questions before composing ordered-question pools.
for(const [category,questions] of Object.entries(extraEstimateQuestions)) {
  estimates[category]??=[];
  estimates[category].push(...questions);
}

export const orders = {
  general: [
    ['Put these units of time in order from shortest to longest.', 'Second', 'Minute', 'Hour', 'Day'],
    ['Put these shapes in order from fewest to most sides.', 'Triangle', 'Square', 'Pentagon', 'Hexagon'],
    ['Put these card ranks in order from lowest to highest, with aces high.', 'Nine', 'Jack', 'Queen', 'Ace'],
    ['Put these Roman numerals in order from smallest to largest.', 'V', 'X', 'L', 'C'],
    ['Put these words in alphabetical order.', 'Apricot', 'Banana', 'Coconut', 'Date'],
  ],
  history: [
    ['Put these events in order from earliest to latest.', 'Battle of Hastings', 'Magna Carta issued', 'Great Fire of London', 'Berlin Wall falls'],
    ['Put these British monarchs in order by when their reign began.', 'Henry VIII', 'Elizabeth I', 'Victoria', 'Elizabeth II'],
    ['Put these US and world milestones in order from earliest to latest.', 'US Declaration of Independence adopted', 'First modern Olympics', 'Titanic sinks', 'First Moon landing'],
    ['Put these 20th-century events in order from earliest to latest.', 'First successful Wright brothers flight', 'World War I begins', 'World War II ends', 'Sputnik 1 launches'],
    ['Put these people in order from earliest to latest birth.', 'William Shakespeare', 'Isaac Newton', 'Ludwig van Beethoven', 'Charles Darwin'],
  ],
  news: [
    ['Put these Summer Olympics host cities in order from earliest to latest Games.', 'London', 'Rio de Janeiro', 'Tokyo', 'Paris'],
    ['Put these recent headlines in order from earliest to latest.', 'Croatia adopts the euro', 'Sweden joins NATO', 'Expo 2025 opens in Osaka', 'Bulgaria adopts the euro'],
    ['Put these men’s FIFA World Cup hosts in order from earliest to latest tournament.', 'Brazil', 'Russia', 'Qatar', 'Canada, Mexico and the US'],
    ['Put these Eurovision host cities in order from earliest to latest contest.', 'Turin', 'Liverpool', 'Malmö', 'Basel'],
    ['Put these UN climate summit host cities in order from earliest to latest.', 'Glasgow', 'Sharm el-Sheikh', 'Dubai', 'Belém'],
  ],
  christmas: [
    ['Put these dates in order within the same December.', '1 December', 'Christmas Eve', 'Christmas Day', 'Boxing Day'],
    ['Order these gifts by when they first appear in “The Twelve Days of Christmas”.', 'Turtle doves', 'French hens', 'Gold rings', 'Swans a-swimming'],
    ['Put these Christmas films in order by original release, earliest first.', 'It’s a Wonderful Life', 'Home Alone', 'The Muppet Christmas Carol', 'Elf'],
    ['Put Scrooge’s visitors in the order they first appear in A Christmas Carol.', 'Jacob Marley', 'Christmas Past', 'Christmas Present', 'Christmas Yet to Come'],
    ['Put these “Twelve Days of Christmas” gifts in order by their first appearance.', 'Partridge', 'Calling birds', 'Geese a-laying', 'Lords a-leaping'],
  ],
  entertainment: [
    ['Put these films in order by original release, earliest first.', 'The Wizard of Oz', 'Jaws', 'Jurassic Park', 'Avatar'],
    ['Put these Toy Story characters in order by the main-series film in which they debut.', 'Woody', 'Jessie', 'Lotso', 'Forky'],
    ['Put these film adaptations in order by original release, earliest first.', 'The Fellowship of the Ring', 'The Two Towers', 'The Return of the King', 'An Unexpected Journey'],
    ['Put these James Bond actors in order by their first official Bond film.', 'Sean Connery', 'Roger Moore', 'Pierce Brosnan', 'Daniel Craig'],
    ['Put these shows in order by their original premiere, earliest first.', 'The Simpsons', 'Friends', 'Breaking Bad', 'Stranger Things'],
  ],
  sports: [
    ['Put these standard running races in order from shortest to longest.', '100 metres', '400 metres', 'Half marathon', 'Marathon'],
    ['Put these Olympic Games in chronological order, earliest first.', 'Athens 2004', 'Beijing 2008', 'London 2012', 'Rio 2016'],
    ['Put these sports in order by how many players each side fields at the start.', 'Tennis singles', 'Basketball', 'Association football', 'Rugby union'],
    ['Put these golf scores on a hole in order from fewest strokes to most.', 'Eagle', 'Birdie', 'Par', 'Bogey'],
    ['Put these medals or finishes in order from best to worst.', 'Gold medal', 'Silver medal', 'Bronze medal', 'Fourth place'],
  ],
  geography: [
    ['Put these planets in order from nearest to farthest from the Sun.', 'Mercury', 'Venus', 'Earth', 'Mars'],
    ['Put these capital cities in order from north to south by latitude.', 'Oslo', 'London', 'Madrid', 'Cairo'],
    ['Put these continents in order by land area from smallest to largest.', 'Australia', 'Europe', 'Africa', 'Asia'],
    ['Put these peaks in order from lowest to highest elevation.', 'Ben Nevis', 'Mont Blanc', 'Kilimanjaro', 'Mount Everest'],
    ['Put these landlocked countries in order from west to east by their capital cities.', 'Switzerland', 'Austria', 'Hungary', 'Mongolia'],
  ],
  science: [
    ['Order these stages of a butterfly’s life from earliest to latest.', 'Egg', 'Caterpillar', 'Pupa', 'Adult butterfly'],
    ['Put these levels of biological organisation in order from smallest to largest.', 'Cell', 'Tissue', 'Organ', 'Organ system'],
    ['Put these elements in order of increasing atomic number.', 'Hydrogen', 'Helium', 'Carbon', 'Oxygen'],
    ['Put these outer planets in order from nearest to farthest from the Sun.', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'],
    ['Put these groups in order by their first appearance in the fossil record.', 'Trilobites', 'Dinosaurs', 'Early primates', 'Homo sapiens'],
  ],
  food: [
    ['Put these quantities in order from smallest to largest volume.', '5 mL', '15 mL', '250 mL', '1 litre'],
    ['Put these steps for turning cocoa beans into chocolate in order.', 'Harvest cocoa pods', 'Ferment the beans', 'Roast the beans', 'Grind the nibs'],
    ['Put these measures in order from lightest to heaviest.', 'One milligram', 'One gram', 'One kilogram', 'One tonne'],
    ['Order these steps in a basic pasta recipe from first to last.', 'Mix flour and eggs', 'Knead the dough', 'Roll it into sheets', 'Cook the cut pasta'],
    ['Put these stages of making a cup of loose-leaf tea in order.', 'Heat the water', 'Pour water over leaves', 'Let the leaves steep', 'Strain the tea'],
  ],
  music: [
    ['Put these standard choir parts in order from lowest pitch range to highest.', 'Bass', 'Tenor', 'Alto', 'Soprano'],
    ['Order these pop albums from earliest release to latest.', 'Thriller', 'Like a Prayer', 'Back to Black', 'Lemonade'],
    ['Put these notes in ascending order within a C major scale starting on C.', 'C', 'D', 'F', 'A'],
    ['Order these orchestral string instruments from lowest usual range to highest.', 'Double bass', 'Cello', 'Viola', 'Violin'],
    ['Order these composers by birth date from earliest to latest.', 'Antonio Vivaldi', 'Johann Sebastian Bach', 'Wolfgang Amadeus Mozart', 'Ludwig van Beethoven'],
  ],
  books: [
    ['Put these Harry Potter novels in publication order, earliest first.', 'Philosopher’s Stone', 'Chamber of Secrets', 'Prisoner of Azkaban', 'Goblet of Fire'],
    ['Order these novels by first publication, earliest first.', 'Pride and Prejudice', 'Frankenstein', 'Jane Eyre', 'Dracula'],
    ['Order these books by first publication, earliest first.', 'The Hobbit', 'The Fellowship of the Ring', 'The Two Towers', 'The Return of the King'],
    ['Put the four March sisters in Little Women in order from oldest to youngest.', 'Meg', 'Jo', 'Beth', 'Amy'],
    ['Order these children’s books by first publication, earliest first.', 'Treasure Island', 'The Wonderful Wizard of Oz', 'Charlotte’s Web', 'The Very Hungry Caterpillar'],
  ],
  technology: [
    ['Put these data units in order from smallest to largest.', 'Byte', 'Kilobyte', 'Megabyte', 'Gigabyte'],
    ['Put these products in order by their first release, earliest first.', 'Original Macintosh', 'Original PlayStation', 'Original iPod', 'Original iPhone'],
    ['Put these optical disc formats in order of the stated or typical single-layer capacity, lowest first.', 'CD', 'DVD', 'Blu-ray', 'Ultra HD Blu-ray (66 GB)'],
    ['Put these display resolutions in order from fewest to most pixels.', '1280 × 720', '1920 × 1080', '2560 × 1440', '3840 × 2160'],
    ['Order these binary values from smallest to largest.', '1', '10', '11', '100'],
  ],
  art: [
    ["Order these art movements by their usual historical emergence, earliest first.", "Renaissance", "Baroque", "Impressionism", "Surrealism"],
    ["Put these artists in birth-date order, earliest first.", "Leonardo da Vinci", "Rembrandt", "Claude Monet", "Frida Kahlo"],
    ["Order these works by the year they were completed, earliest first.", "The Night Watch", "The Starry Night", "The Persistence of Memory", "Guernica"],
    ["Order these type sizes from smallest to largest.", "8 pt", "12 pt", "24 pt", "48 pt"],
    ["Order these common ISO paper sizes by area, smallest first.", "A6", "A5", "A4", "A3"],
  ],
  games: [
    ["Order these first arcade releases from earliest to latest.", "Pong", "Space Invaders", "Pac-Man", "Donkey Kong"],
    ["Order these standard puzzle grids by square count, fewest first.", "4 × 4 mini Sudoku", "8 × 8 chessboard", "9 × 9 Sudoku", "15 × 15 crossword"],
    ["Order these numbered dice from fewest faces to most.", "d4", "d6", "d12", "d20"],
    ["Order these classic playing-card ranks from low to high, with aces high.", "Three", "Seven", "Jack", "King"],
    ["Order these first video game releases from earliest to latest.", "Super Mario Bros.", "Sonic the Hedgehog", "Pokémon Red and Green", "Minecraft (full release)"],
  ],
  animals: [
    ["Order these butterfly stages from first to last.", "Egg", "Caterpillar", "Chrysalis", "Adult"],
    ["Order these animals by typical adult body mass, lightest first.", "House mouse", "Red fox", "Grizzly bear", "African bush elephant"],
    ["Order these animals by the leg count in their common adult body plan, fewest first.", "Human", "Dog", "Ant", "Spider"],
    ["Order these animals by their usual gestation period, shortest first.", "House mouse", "Domestic cat", "Human", "African elephant"],
    ["Put these animal names in alphabetical order.", "Albatross", "Badger", "Cheetah", "Dolphin"],
  ],
  space: [
    ["Order these space milestones by date, earliest first.", "Sputnik 1 launches", "First person in space", "Apollo 11 lands", "First crewed Space Shuttle flight"],
    ["Order these planets by equatorial diameter, smallest first.", "Mercury", "Mars", "Earth", "Jupiter"],
    ["Order these orbital paths by average distance from the Sun, nearest first.", "Mercury", "Earth", "Saturn", "Neptune"],
    ["Order these telescopes by launch date, earliest first.", "Hubble", "Chandra", "Spitzer", "James Webb"],
    ["Order these events from earliest to latest during a total solar eclipse.", "Partial eclipse begins", "Totality starts", "Totality ends", "Partial eclipse ends"],
  ],
};

for(const [category,questions] of Object.entries(extraOrderQuestions)) {
  orders[category]??=[];
  orders[category].push(...questions);
}
