// Question indices ranked from familiar to specialist within each category.
// The five bands here are followed by the dedicated level-six questions below.
export const boardQuestionOrder = {
  general: {
    choice: [4, 0, 12, 10, 11, 2, 8, 6, 9, 13, 1, 5, 7, 3, 14],
    boolean: [14, 5, 11, 0, 2, 13, 7, 12, 8, 1, 6, 4, 10, 3, 9],
    estimate: [0, 2, 3, 4, 1], order: [0, 4, 1, 2, 3],
  },
  history: {
    choice: [1, 4, 2, 7, 8, 9, 6, 0, 3, 11, 5, 10, 13, 12, 14],
    boolean: [5, 10, 11, 1, 3, 7, 2, 4, 9, 8, 12, 14, 0, 6, 13],
    estimate: [3, 2, 0, 1, 4], order: [0, 1, 2, 3, 4],
  },
  news: {
    choice: [0, 12, 10, 5, 1, 13, 2, 3, 6, 8, 11, 14, 4, 7, 9],
    boolean: [0, 1, 4, 5, 8, 9, 10, 3, 6, 7, 12, 13, 2, 11, 14],
    estimate: [1, 2, 0, 4, 3], order: [2, 0, 3, 1, 4],
  },
  christmas: {
    choice: [3, 4, 8, 7, 9, 6, 1, 2, 0, 11, 5, 12, 14, 13, 10],
    boolean: [0, 1, 6, 8, 12, 4, 3, 5, 9, 11, 14, 10, 2, 7, 13],
    estimate: [4, 2, 3, 1, 0], order: [0, 4, 1, 3, 2],
  },
  entertainment: {
    choice: [8, 4, 3, 5, 2, 7, 6, 9, 12, 13, 11, 0, 1, 14, 10],
    boolean: [4, 8, 10, 14, 13, 5, 3, 2, 7, 9, 12, 11, 0, 6, 1],
    estimate: [3, 2, 1, 4, 0], order: [2, 0, 4, 1, 3],
  },
  sports: {
    choice: [3, 9, 1, 6, 8, 13, 7, 10, 2, 14, 0, 4, 11, 12, 5],
    boolean: [1, 4, 2, 5, 7, 0, 12, 13, 9, 3, 8, 10, 14, 6, 11],
    estimate: [2, 3, 1, 4, 0], order: [4, 0, 1, 2, 3],
  },
  geography: {
    choice: [0, 7, 6, 13, 5, 3, 11, 10, 2, 9, 12, 14, 8, 1, 4],
    boolean: [5, 7, 14, 4, 6, 13, 1, 8, 11, 9, 3, 0, 12, 10, 2],
    estimate: [2, 3, 0, 4, 1], order: [0, 2, 3, 1, 4],
  },
  science: {
    choice: [6, 5, 11, 1, 12, 3, 7, 2, 4, 0, 13, 9, 10, 14, 8],
    boolean: [10, 13, 5, 6, 9, 12, 3, 1, 0, 7, 8, 11, 14, 4, 2],
    estimate: [2, 0, 4, 1, 3], order: [0, 1, 3, 2, 4],
  },
  food: {
    choice: [10, 0, 8, 6, 13, 1, 3, 4, 12, 5, 2, 9, 14, 7, 11],
    boolean: [0, 12, 9, 3, 7, 6, 13, 11, 2, 10, 8, 1, 4, 5, 14],
    estimate: [0, 3, 2, 4, 1], order: [0, 2, 4, 3, 1],
  },
  music: {
    choice: [2, 10, 5, 12, 11, 8, 14, 3, 1, 0, 4, 6, 13, 9, 7],
    boolean: [12, 1, 10, 9, 14, 8, 13, 2, 0, 5, 7, 4, 6, 3, 11],
    estimate: [1, 0, 3, 2, 4], order: [2, 3, 0, 4, 1],
  },
  books: {
    choice: [6, 4, 12, 9, 2, 13, 1, 8, 0, 14, 5, 11, 10, 7, 3],
    boolean: [7, 8, 1, 3, 2, 10, 11, 6, 5, 9, 12, 14, 0, 4, 13],
    estimate: [0, 3, 2, 1, 4], order: [0, 2, 3, 4, 1],
  },
  technology: {
    choice: [7, 11, 3, 2, 12, 4, 10, 1, 6, 9, 5, 13, 14, 0, 8],
    boolean: [5, 13, 0, 7, 6, 10, 14, 4, 8, 12, 11, 1, 2, 3, 9],
    estimate: [2, 0, 1, 4, 3], order: [0, 4, 3, 1, 2],
  },
  art: { choice: [0, 1, 3, 4, 2], boolean: [1, 4, 2, 0, 3], estimate: [1, 4, 2, 0, 3], order: [3, 4, 0, 1, 2] },
  games: { choice: [4, 2, 0, 1, 3], boolean: [3, 0, 2, 1, 4], estimate: [1, 4, 0, 2, 3], order: [2, 3, 1, 4, 0] },
  animals: { choice: [2, 1, 0, 3, 4], boolean: [1, 2, 3, 0, 4], estimate: [1, 0, 2, 3, 4], order: [4, 2, 0, 1, 3] },
  space: { choice: [1, 2, 0, 3, 4], boolean: [1, 4, 3, 2, 0], estimate: [0, 2, 3, 1, 4], order: [2, 4, 0, 1, 3] },
  language: {
    choice:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],
    boolean:[0,1,2,3,4,5,6,7,8,9,10,11],
    estimate:[0,1,2,3,4], order:[0,1,2,3,4],
  },
  maths: {
    choice:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14],
    boolean:[0,1,2,3,4,5,6,7,8,9,10,11],
    estimate:[0,1,2,3,4], order:[0,1,2,3,4],
  },
};

export const boardExpert = {
  language: {
    choice:['Which word is an anagram of LISTEN?', 'SILENT', 'LITTLE', 'STONE', 'LINEN'],
    boolean:['The words “their” and “there” can be pronounced the same in standard English.', true],
    estimate:['How many vowels (a, e, i, o, u) appear in the word “queueing”?', 5, 'vowels', 0, 12],
    order:['Put these words in alphabetical order.', 'Candle', 'Castle', 'Cattle', 'Cedar'],
  },
  maths: {
    choice:['What is the greatest common divisor of 36 and 48?', '12', '6', '8', '18'],
    boolean:['The number 1 is a prime number.', false],
    estimate:['How many degrees are in the sum of the interior angles of a regular pentagon?', 540, 'degrees', 180, 900],
    order:['Order these factorial values from smallest to largest.', '1!', '2!', '3!', '4!'],
  },
  general: {
    choice: ['What number is represented by the Roman numeral CDXLIV?', '444', '464', '544', '446'],
    boolean: ['The Greek word from which “democracy” derives includes a word meaning “people”.', true],
    estimate: ['How many millilitres are in one imperial pint, to the nearest millilitre?', 568, 'mL', 350, 800],
    order: ['Which of these SI prefixes represent increasing powers of ten?', 'Pico', 'Nano', 'Micro', 'Milli'],
  },
  history: {
    choice: ['Which treaty ended the War of the Spanish Succession between Britain and France in 1713?', 'Treaty of Utrecht', 'Treaty of Tordesillas', 'Treaty of Versailles', 'Treaty of Aix-la-Chapelle'],
    boolean: ['The first emperor to rule a unified China founded the Han dynasty.', false],
    estimate: ['In which year did the Battle of Lepanto take place?', 1571, 'year', 1450, 1700],
    order: ['Order these events chronologically, earliest first.', 'Defeat of the Spanish Armada', 'Battle of Blenheim', 'Storming of the Bastille', 'Battle of Trafalgar'],
  },
  news: {
    choice: ['Which organisation won the 2020 Nobel Peace Prize for combating hunger?', 'World Food Programme', 'World Health Organization', 'UNICEF', 'International Labour Organization'],
    boolean: ['The 2024 COP29 climate summit was held in Baku, Azerbaijan.', true],
    estimate: ['How many countries initially signed the 2023 Bletchley Declaration on AI safety, excluding the EU itself?', 28, 'countries', 5, 65],
    order: ['Order these COP climate summit host cities from earliest to latest meeting.', 'Bonn', 'Katowice', 'Madrid', 'Glasgow'],
  },
  christmas: {
    choice: ['Who wrote the original Ukrainian song “Shchedryk” on which “Carol of the Bells” is based?', 'Mykola Leontovych', 'Peter Wilhousky', 'Pyotr Tchaikovsky', 'Dmitri Shostakovich'],
    boolean: ['The carol “Silent Night” was first performed in 19th-century Switzerland.', false],
    estimate: ['In what year was the first commercial Christmas card commissioned by Henry Cole?', 1843, 'year', 1750, 1950],
    order: ['Order these Christmas works by first release or publication.', 'A Christmas Carol', 'The Nutcracker ballet', 'White Christmas (Bing Crosby film recording)', 'A Charlie Brown Christmas'],
  },
  entertainment: {
    choice: ['Which film first won all five Academy Awards for picture, directing, leading actor, leading actress and writing?', 'It Happened One Night', 'Casablanca', 'Gone with the Wind', 'Rebecca'],
    boolean: ['The director of Touch of Evil was Alfred Hitchcock.', false],
    estimate: ['In what year was Fritz Lang’s film Metropolis first released?', 1927, 'year', 1895, 1970],
    order: ['Order these films by first theatrical release, earliest first.', 'Metropolis', 'Modern Times', 'Citizen Kane', 'Bicycle Thieves'],
  },
  sports: {
    choice: ['Who is credited with first landing a quadruple jump in figure skating competition?', 'Kurt Browning', 'Brian Boitano', 'Yuzuru Hanyu', 'Elvis Stojko'],
    boolean: ['Under standard table tennis rules, the serve changes after each point at 10–10.', true],
    estimate: ['In what year was the first official Tour de France held?', 1903, 'year', 1850, 1960],
    order: ['Order these Olympic swimming races from shortest to longest distance.', '50 m freestyle', '100 m butterfly', '200 m breaststroke', '400 m individual medley'],
  },
  geography: {
    choice: ['Which African lake is shared by Burundi, the DRC, Tanzania and Zambia?', 'Lake Tanganyika', 'Lake Malawi', 'Lake Victoria', 'Lake Turkana'],
    boolean: ['The former city of Königsberg is now known as Gdańsk.', false],
    estimate: ['What is the approximate surface area of Lake Baikal in thousands of square kilometres, rounded to the nearest thousand?', 32, 'thousand km²', 10, 85],
    order: ['Order these capitals from west to east.', 'Quito', 'Bogotá', 'Caracas', 'Brasília'],
  },
  science: {
    choice: ['Which scientist first published a systematic periodic table predicting undiscovered elements in 1869?', 'Dmitri Mendeleev', 'Niels Bohr', 'John Dalton', 'Robert Boyle'],
    boolean: ['Ice at normal atmospheric pressure has a hexagonal crystal structure.', true],
    estimate: ['How many electrons does a neutral atom of tungsten have?', 74, 'electrons', 20, 120],
    order: ['Order these electromagnetic bands by decreasing wavelength.', 'Infrared', 'Visible light', 'Ultraviolet', 'X-rays'],
  },
  food: {
    choice: ['Which Italian dairy product is traditionally made by reheating whey left over from cheesemaking?', 'Ricotta', 'Parmigiano Reggiano', 'Taleggio', 'Pecorino Romano'],
    boolean: ['Vanillin is the main aroma compound in saffron.', false],
    estimate: ['At normal pressure, near how many degrees Celsius does pure ethanol boil, rounded to the nearest degree?', 78, '°C', 45, 120],
    order: ['Order these kitchen temperatures by increasing degrees Celsius.', 'Freezing point of water', 'Boiling point of ethanol at sea level', 'Boiling point of water at sea level', 'Typical baking oven at 180 °C'],
  },
  music: {
    choice: ['Which composer wrote the Goldberg Variations?', 'Johann Sebastian Bach', 'Joseph Haydn', 'George Frideric Handel', 'Franz Schubert'],
    boolean: ['In a standard orchestra score, a B-flat clarinet sounding a written C produces a B-flat.', true],
    estimate: ['How many hertz is the standard concert pitch A above middle C?', 440, 'Hz', 300, 680],
    order: ['Order these symphonies by their premiere dates, earliest first.', 'Beethoven’s Ninth', 'Berlioz’s Symphonie fantastique', 'Brahms’s First', 'Mahler’s Fifth'],
  },
  books: {
    choice: ['Who wrote the novel The Master and Margarita?', 'Mikhail Bulgakov', 'Boris Pasternak', 'Nikolai Gogol', 'Fyodor Dostoevsky'],
    boolean: ['Ursula K. Le Guin published The Dispossessed before The Left Hand of Darkness.', false],
    estimate: ['In which year was Don Quixote Part One first published?', 1605, 'year', 1450, 1820],
    order: ['Order these British, Irish and Indian novels by first publication, earliest first.', 'Middlemarch', 'Ulysses', 'Nineteen Eighty-Four', 'Midnight’s Children'],
  },
  technology: {
    choice: ['Which journaling file system debuted with Windows NT 3.1?', 'NTFS', 'FAT12', 'exFAT', 'ISO 9660'],
    boolean: ['In UTF-8, ASCII characters use one byte each.', true],
    estimate: ['How many bits are in a full IPv6 address?', 128, 'bits', 32, 300],
    order: ['Order these programming languages by first public release, earliest first.', 'FORTRAN', 'Pascal', 'C++', 'Java'],
  },
  art: {
    choice: ['Which material was the main binder in the ancient painting technique known as encaustic?', 'Heated wax', 'Egg yolk', 'Linseed oil', 'Gum arabic'],
    boolean: ['The technique of using melted wax as a paint binder is called intaglio.', false],
    estimate: ['In what year was the first Impressionist exhibition held in Paris?', 1874, 'year', 1800, 1960],
    order: ['Order these buildings by completion, earliest first.', 'Florence Cathedral dome', 'Palace of Westminster', 'Guggenheim New York', 'Guggenheim Bilbao'],
  },
  games: {
    choice: ['Who patented The Landlord’s Game, a precursor to Monopoly, in 1904?', 'Elizabeth Magie', 'Charles Darrow', 'Milton Bradley', 'Alfred Butts'],
    boolean: ['In Japanese chess (shogi), most captured pieces can be dropped back onto the board by the capturing player.', true],
    estimate: ['How many intersections are on a standard 19-by-19 Go board?', 361, 'intersections', 220, 500],
    order: ['Order these board games by first publication, earliest first.', 'Scrabble', 'Risk', 'Trivial Pursuit', 'Catan'],
  },
  animals: {
    choice: ['Which of these animals belongs to the mammal group Xenarthra?', 'Nine-banded armadillo', 'Aardvark', 'Pangolin', 'Echidna'],
    boolean: ['The young of a monotreme hatch from an egg.', true],
    estimate: ['How many permanent teeth does a typical adult domestic dog have?', 42, 'teeth', 20, 65],
    order: ['Order these birds by increasing typical egg incubation time.', 'Zebra finch', 'Domestic chicken', 'Common ostrich', 'Emperor penguin'],
  },
  space: {
    choice: ['Which asteroid was the destination of NASA’s OSIRIS-REx sample collection?', 'Bennu', 'Ryugu', 'Vesta', 'Eros'],
    boolean: ['The dwarf planet Ceres was discovered after the planet Neptune.', false],
    estimate: ['How many Earth days is a sidereal year on Mars, rounded to the nearest whole day?', 687, 'days', 350, 1000],
    order: ['Order these missions by their launch dates, earliest first.', 'Mariner 4', 'Voyager 2', 'Galileo', 'Cassini–Huygens'],
  },
};
