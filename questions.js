import { boardExpert, boardQuestionOrder } from './board-questions.js';
import { questionHistoryId } from './public/question-history.js';
import { soCloseBank } from './so-close-bank.js';
import { verifiedChoiceQuestions } from './verified-questions.js';
import { extraChoiceQuestions, extraBooleanQuestions } from './question-expansion-v2.js';
import { difficultyQuestions } from './difficulty-questions.js';
import { estimates, orders } from './extra-questions.js';
import { sportChoice, sportBoolean, sportEstimate, sportOrder } from './trivia-pack-sports.js';
import { screenChoice, screenBoolean, screenEstimate, screenOrder } from './trivia-pack-screen.js';
import { topupChoice, topupBoolean } from './trivia-pack-topups.js';
import { isSpecialist } from './public/game-config.js';

const banks = {
  general: [
    ['What is the largest ocean on Earth?', 'Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
    ['How many sides does a dodecagon have?', '12', '10', '14', '16'],
    ['What is the chemical symbol for gold?', 'Au', 'Ag', 'Go', 'Gd'],
    ['Which planet has the shortest day?', 'Jupiter', 'Mars', 'Mercury', 'Venus'],
    ['Which instrument typically has 88 keys?', 'Piano', 'Clarinet', 'Violin', 'Trumpet'],
    ['Which bird is the fastest in a dive?', 'Peregrine falcon', 'Golden eagle', 'Ostrich', 'Common swift'],
    ['What is the capital of Canada?', 'Ottawa', 'Toronto', 'Vancouver', 'Montreal'],
    ['How many bones does a typical adult human have?', '206', '186', '226', '246'],
    ['What is the main ingredient in hummus?', 'Chickpeas', 'Lentils', 'Butter beans', 'Peas'],
    ['Which country is home to the city of Porto?', 'Portugal', 'Spain', 'Italy', 'Brazil'],
    ["What is the currency of Japan?", "Yen", "Won", "Yuan", "Baht"],
    ["Which board game features a suspect named Colonel Mustard?", "Cluedo", "Monopoly", "Risk", "Scrabble"],
    ["What is the official language of Brazil?", "Portuguese", "Spanish", "French", "Quechua"],
    ["Which nut is the main ingredient in marzipan?", "Almond", "Cashew", "Walnut", "Hazelnut"],
    ["What is the name of the dot above a lowercase i?", "Tittle", "Cedilla", "Umlaut", "Macron"],
  ],
  history: [
    ['In what year did the Berlin Wall fall?', '1989', '1985', '1991', '1993'],
    ['Who was the first person to walk on the Moon?', 'Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'Michael Collins'],
    ['Which civilization built Machu Picchu?', 'Inca', 'Aztec', 'Maya', 'Roman'],
    ['In what year did the Great Fire of London begin?', '1666', '1066', '1605', '1707'],
    ['Which ship sank on its maiden voyage in 1912?', 'Titanic', 'Lusitania', 'Olympic', 'Britannic'],
    ['Where were the first modern Olympic Games held in 1896?', 'Athens', 'Paris', 'London', 'Rome'],
    ['Which British monarch had the longest reign?', 'Elizabeth II', 'Victoria', 'George III', 'Henry VIII'],
    ['Who became South Africa’s president in 1994?', 'Nelson Mandela', 'Desmond Tutu', 'Thabo Mbeki', 'Kofi Annan'],
    ['Which city was buried when Mount Vesuvius erupted in 79 CE?', 'Pompeii', 'Athens', 'Venice', 'Florence'],
    ['What country gifted the Statue of Liberty to the United States?', 'France', 'Italy', 'Spain', 'The Netherlands'],
    ["In what year was Magna Carta first issued?", "1215", "1066", "1415", "1492"],
    ["Who was the first woman to win a Nobel Prize?", "Marie Curie", "Florence Nightingale", "Ada Lovelace", "Rosalind Franklin"],
    ["Which dynasty built most of the Great Wall of China that stands today?", "Ming", "Han", "Tang", "Qing"],
    ["In which city was Archduke Franz Ferdinand assassinated in 1914?", "Sarajevo", "Vienna", "Budapest", "Prague"],
    ["Which empire was ruled by Mansa Musa?", "Mali", "Songhai", "Ottoman", "Byzantine"],
  ],
  news: [
    ['Which city hosted the 2024 Summer Olympics?', 'Paris', 'Los Angeles', 'Tokyo', 'Rome'],
    ['Which country joined NATO in March 2024?', 'Sweden', 'Austria', 'Ireland', 'Switzerland'],
    ['Which Japanese city hosted Expo 2025?', 'Osaka', 'Kyoto', 'Tokyo', 'Nagoya'],
    ['Which country hosted the COP30 climate summit in 2025?', 'Brazil', 'Azerbaijan', 'Egypt', 'United Arab Emirates'],
    ['What is the name of India’s mission that landed near the Moon’s south pole in 2023?', 'Chandrayaan-3', 'Artemis I', 'Luna 25', 'Hayabusa2'],
    ['Which country co-hosted the 2023 FIFA Women’s World Cup with New Zealand?', 'Australia', 'Canada', 'Japan', 'England'],
    ['Which country adopted the euro in January 2023?', 'Croatia', 'Poland', 'Hungary', 'Romania'],
    ['Who won the 2024 Nobel Peace Prize?', 'Nihon Hidankyo', 'Médecins Sans Frontières', 'World Food Programme', 'UNICEF'],
    ['Which city hosted Eurovision in 2025?', 'Basel', 'Malmö', 'Vienna', 'Liverpool'],
    ['Which city hosted the 2024 G20 leaders’ summit?', 'Rio de Janeiro', 'New Delhi', 'Cape Town', 'Buenos Aires'],
    ["Which city hosted the 2026 Winter Olympic opening ceremony?", "Milan", "Cortina d’Ampezzo", "Turin", "Rome"],
    ["Which country adopted the euro on 1 January 2026?", "Bulgaria", "Romania", "Poland", "Hungary"],
    ["Which three countries hosted the 2026 men’s FIFA World Cup?", "Canada, Mexico and the US", "Spain, Portugal and Morocco", "Brazil, Argentina and Uruguay", "Germany, France and Italy"],
    ["What name did Robert Prevost take when elected pope in 2025?", "Leo XIV", "Francis II", "Benedict XVII", "John Paul III"],
    ["Which African country hosted the G20 leaders’ summit in 2025?", "South Africa", "Kenya", "Egypt", "Nigeria"],
  ],
  christmas: [
    ['In Home Alone, where is Kevin’s family flying for Christmas?', 'Paris', 'London', 'Rome', 'New York'],
    ['Who wrote A Christmas Carol?', 'Charles Dickens', 'Jane Austen', 'Thomas Hardy', 'Oscar Wilde'],
    ['Which duo released “Last Christmas” in 1984?', 'Wham!', 'Pet Shop Boys', 'Eurythmics', 'Tears for Fears'],
    ['Which reindeer has a red nose?', 'Rudolph', 'Dasher', 'Comet', 'Vixen'],
    ['What are you traditionally meant to do under mistletoe?', 'Kiss', 'Sing', 'Dance', 'Make a wish'],
    ['Who composed the music for The Nutcracker?', 'Tchaikovsky', 'Mozart', 'Beethoven', 'Chopin'],
    ['What is given on the fifth day in “The Twelve Days of Christmas”?', 'Five gold rings', 'Five calling birds', 'Five turtle doves', 'Five French hens'],
    ['What date is Boxing Day?', '26 December', '24 December', '27 December', '31 December'],
    ['What is the name of the snowman in Frozen?', 'Olaf', 'Sven', 'Kristoff', 'Marshmallow'],
    ['In Elf, what is the name of Will Ferrell’s character?', 'Buddy', 'Walter', 'Jovie', 'Miles'],
    ["Which country gives London the Christmas tree in Trafalgar Square each year?", "Norway", "Sweden", "Denmark", "Finland"],
    ["What is the first name of Scrooge in A Christmas Carol?", "Ebenezer", "Edgar", "Edmund", "Edward"],
    ["What plant with red bracts is commonly sold at Christmas?", "Poinsettia", "Holly", "Mistletoe", "Ivy"],
    ["Which country is credited with starting the modern Christmas tree tradition?", "Germany", "France", "Italy", "Switzerland"],
    ["In The Muppet Christmas Carol, who plays Scrooge?", "Michael Caine", "Ian McKellen", "Anthony Hopkins", "Patrick Stewart"],
  ],
  entertainment: [
    ['What is the name of the coffee shop in Friends?', 'Central Perk', 'Monk’s Café', 'Luke’s Diner', 'The Peach Pit'],
    ['Who directed the film Oppenheimer?', 'Christopher Nolan', 'Steven Spielberg', 'Greta Gerwig', 'Denis Villeneuve'],
    ['Which artist released the album 1989?', 'Taylor Swift', 'Adele', 'Lady Gaga', 'Beyoncé'],
    ['Which fictional detective lives at 221B Baker Street?', 'Sherlock Holmes', 'Hercule Poirot', 'Sam Spade', 'Miss Marple'],
    ['What is the name of Mario’s brother?', 'Luigi', 'Wario', 'Yoshi', 'Toad'],
    ['Which band recorded “Bohemian Rhapsody”?', 'Queen', 'ABBA', 'Fleetwood Mac', 'The Beatles'],
    ['What is the name of Simba’s father in The Lion King?', 'Mufasa', 'Scar', 'Rafiki', 'Zazu'],
    ['Which actress plays Barbie in the 2023 film?', 'Margot Robbie', 'Emma Stone', 'Anne Hathaway', 'Saoirse Ronan'],
    ['What colour is Shrek?', 'Green', 'Blue', 'Purple', 'Orange'],
    ['Which singer is known for “Rolling in the Deep”?', 'Adele', 'Rihanna', 'Pink', 'Dua Lipa'],
    ["What is the name of the fictional setting of the US version of The Office?", "Scranton", "Pittsburgh", "Cleveland", "Buffalo"],
    ["Which animated family lives at 742 Evergreen Terrace?", "The Simpsons", "The Griffins", "The Belchers", "The Flintstones"],
    ["Who played the lead role in the first Pirates of the Caribbean film as Captain Jack Sparrow?", "Johnny Depp", "Orlando Bloom", "Geoffrey Rush", "Javier Bardem"],
    ["Which group released “Dancing Queen”?", "ABBA", "Bee Gees", "Boney M.", "Fleetwood Mac"],
    ["Which video game series is set in the kingdom of Hyrule?", "The Legend of Zelda", "Final Fantasy", "Dragon Quest", "Fire Emblem"],
  ],
  sports: [
    ["How many players does a rugby union team field at the start of a match?", "15", "13", "11", "16"],
    ["What is a score of zero called in tennis?", "Love", "Nil", "Blank", "Nothing"],
    ["What colour jersey does the overall leader wear in the Tour de France?", "Yellow", "Green", "Pink", "White"],
    ["In which sport would you perform a slam dunk?", "Basketball", "Volleyball", "Handball", "Netball"],
    ["How many points is a try worth in rugby union?", "5", "3", "4", "7"],
    ["What is the maximum standard break in snooker?", "147", "145", "150", "155"],
    ["Which country won the men’s FIFA World Cup in 2022?", "Argentina", "France", "Brazil", "Germany"],
    ["How long is an Olympic swimming pool?", "50 metres", "25 metres", "75 metres", "100 metres"],
    ["Which sport uses the terms birdie and bogey?", "Golf", "Badminton", "Cricket", "Baseball"],
    ["How many rings are on the Olympic flag?", "5", "4", "6", "7"],
    ["Which Grand Slam tennis tournament is played on clay?", "French Open", "Wimbledon", "Australian Open", "US Open"],
    ["In which Olympic sport can a throw earn an ippon?", "Judo", "Boxing", "Fencing", "Wrestling"],
    ["In cricket, how many legal balls are in a standard over?", "6", "5", "7", "8"],
    ["Which country is the home of sumo wrestling?", "Japan", "China", "South Korea", "Thailand"],
    ["How many holes are in a standard full round of golf?", "18", "12", "16", "20"],
  ],
  geography: [
    ["What is the capital of New Zealand?", "Wellington", "Auckland", "Christchurch", "Queenstown"],
    ["The Danube flows through which capital?", "Budapest", "Paris", "Madrid", "Oslo"],
    ["Which country surrounds the whole of Lesotho?", "South Africa", "Botswana", "Namibia", "Mozambique"],
    ["What is the largest island in the Mediterranean Sea?", "Sicily", "Sardinia", "Cyprus", "Crete"],
    ["What is the capital of Morocco?", "Rabat", "Casablanca", "Marrakesh", "Fez"],
    ["Which mountain range separates France and Spain?", "Pyrenees", "Alps", "Carpathians", "Apennines"],
    ["What is the smallest independent country by area?", "Vatican City", "Monaco", "San Marino", "Liechtenstein"],
    ["Which continent has the most countries?", "Africa", "Asia", "Europe", "South America"],
    ["Which sea lies between Australia and New Zealand?", "Tasman Sea", "Coral Sea", "Java Sea", "Bering Sea"],
    ["Which country has the city of Bergen?", "Norway", "Sweden", "Finland", "Denmark"],
    ["What is the capital of Vietnam?", "Hanoi", "Ho Chi Minh City", "Da Nang", "Hue"],
    ["Which US state contains most of Yellowstone National Park?", "Wyoming", "Idaho", "Montana", "Colorado"],
    ["Which desert covers parts of Botswana, Namibia and South Africa?", "Kalahari", "Gobi", "Atacama", "Sahara"],
    ["Which of these countries lies on the equator?", "Ecuador", "Chile", "Uruguay", "Paraguay"],
    ["Which body of water connects to the Mediterranean through the Strait of Gibraltar?", "Atlantic Ocean", "Red Sea", "Black Sea", "Indian Ocean"],
  ],
  science: [
    ["What gas do plants absorb from the air during photosynthesis?", "Carbon dioxide", "Oxygen", "Helium", "Hydrogen"],
    ["Which planet is famous for its prominent rings?", "Saturn", "Mars", "Mercury", "Venus"],
    ["Which mammal is capable of sustained powered flight?", "Bat", "Flying squirrel", "Sugar glider", "Colugo"],
    ["What is the largest animal known to have lived on Earth?", "Blue whale", "African elephant", "Whale shark", "Giant squid"],
    ["What is the most abundant gas in the Earth’s atmosphere?", "Nitrogen", "Oxygen", "Argon", "Carbon dioxide"],
    ["Which part of a plant typically takes up water from the soil?", "Roots", "Flowers", "Seeds", "Fruits"],
    ["Which organ pumps blood around the human body?", "Heart", "Liver", "Brain", "Lung"],
    ["What is the hardest natural mineral on the Mohs scale?", "Diamond", "Quartz", "Topaz", "Corundum"],
    ["Which of these animals is an amphibian?", "Salamander", "Iguana", "Gecko", "Crocodile"],
    ["What is the name for an animal that eats both plants and other animals?", "Omnivore", "Herbivore", "Carnivore", "Insectivore"],
    ["Which element has the chemical symbol Fe?", "Iron", "Fluorine", "Francium", "Fermium"],
    ["What is the nearest star to Earth?", "The Sun", "Sirius", "Polaris", "Proxima Centauri"],
    ["Which force keeps the Moon in orbit around Earth?", "Gravity", "Friction", "Magnetism", "Buoyancy"],
    ["What is the name for a group of lions?", "A pride", "A pack", "A troop", "A colony"],
    ["Which of these animals has three hearts?", "Octopus", "Dolphin", "Penguin", "Sea turtle"],
  ],
  food: [
    ["Which fruit is the base of guacamole?", "Avocado", "Lime", "Mango", "Papaya"],
    ["Which country is most closely associated with paella?", "Spain", "Portugal", "Italy", "Greece"],
    ["What is the main ingredient in traditional Japanese miso paste?", "Soybeans", "Chickpeas", "Peanuts", "Potatoes"],
    ["Which cheese is traditionally used in a Greek salad?", "Feta", "Brie", "Manchego", "Halloumi"],
    ["Which spice gives many curries a yellow colour?", "Turmeric", "Cinnamon", "Nutmeg", "Cloves"],
    ["What type of pasta takes its name from the Italian word for butterflies?", "Farfalle", "Penne", "Fusilli", "Rigatoni"],
    ["Which fruit is dried to make a prune?", "Plum", "Apricot", "Fig", "Grape"],
    ["Which country is usually credited as the birthplace of the croissant’s ancestor, the kipferl?", "Austria", "Denmark", "Belgium", "France"],
    ["What drink is made by steeping dried leaves of Camellia sinensis?", "Tea", "Coffee", "Cocoa", "Kefir"],
    ["What kind of pastry is used in a traditional profiterole?", "Choux", "Shortcrust", "Filo", "Puff"],
    ["Which grain is used in a traditional risotto?", "Rice", "Barley", "Oats", "Wheat"],
    ["What legume is traditionally used to make dal makhani?", "Whole black gram", "Green peas", "Yellow split peas", "White beans"],
    ["What is the main ingredient of tahini?", "Sesame seeds", "Sunflower seeds", "Pumpkin seeds", "Pine nuts"],
    ["Which herb is traditionally used as the main leafy ingredient in pesto alla genovese?", "Basil", "Sage", "Dill", "Parsley"],
    ["Which fruit is traditionally preserved in salt and used in Moroccan tagines?", "Lemon", "Pear", "Orange", "Peach"],
  ],
  music: [
    ["Which composer wrote The Four Seasons?", "Antonio Vivaldi", "Johann Sebastian Bach", "Wolfgang Amadeus Mozart", "Joseph Haydn"],
    ["Which instrument is Yo-Yo Ma best known for playing?", "Cello", "Viola", "Trumpet", "Piano"],
    ["Which musician was nicknamed the King of Pop?", "Michael Jackson", "Prince", "Elton John", "Stevie Wonder"],
    ["Which band released the album Rumours?", "Fleetwood Mac", "The Rolling Stones", "Queen", "The Who"],
    ["What musical term means gradually getting louder?", "Crescendo", "Diminuendo", "Staccato", "Adagio"],
    ["Which singer released the album Lemonade in 2016?", "Beyoncé", "Rihanna", "Alicia Keys", "Lizzo"],
    ["Which city is closely associated with the birth of jazz?", "New Orleans", "Seattle", "Boston", "Denver"],
    ["Which saxophonist recorded the album A Love Supreme?", "John Coltrane", "Miles Davis", "Duke Ellington", "Benny Goodman"],
    ["Which country won Eurovision in 1974 with Waterloo?", "Sweden", "Norway", "Denmark", "Finland"],
    ["Which composer wrote the opera The Magic Flute?", "Wolfgang Amadeus Mozart", "Ludwig van Beethoven", "Giuseppe Verdi", "Richard Wagner"],
    ["A standard violin has how many strings?", "Four", "Three", "Five", "Six"],
    ["Which singer was originally named Farrokh Bulsara?", "Freddie Mercury", "David Bowie", "George Michael", "Mick Jagger"],
    ["Which instrument usually has a slide for changing pitch?", "Trombone", "Tuba", "Trumpet", "French horn"],
    ["Which group recorded “September”?", "Earth, Wind & Fire", "Kool & the Gang", "The Jackson 5", "The Supremes"],
    ["What is the highest of the standard soprano, alto, tenor, and bass singing parts?", "Soprano", "Alto", "Tenor", "Bass"],
  ],
  books: [
    ["Who wrote Pride and Prejudice?", "Jane Austen", "Charlotte Brontë", "George Eliot", "Virginia Woolf"],
    ["Which author created the detective Hercule Poirot?", "Agatha Christie", "Arthur Conan Doyle", "Dorothy L. Sayers", "P. D. James"],
    ["What is the name of the hobbit who finds the ring in The Hobbit?", "Bilbo Baggins", "Frodo Baggins", "Samwise Gamgee", "Peregrin Took"],
    ["Who wrote the novel Things Fall Apart?", "Chinua Achebe", "Wole Soyinka", "Ngũgĩ wa Thiong’o", "Ben Okri"],
    ["Which animal is Charlotte in Charlotte’s Web?", "A spider", "A pig", "A sheep", "A goose"],
    ["Which author wrote The Handmaid’s Tale?", "Margaret Atwood", "Ursula K. Le Guin", "Toni Morrison", "Doris Lessing"],
    ["What is the first name of the girl in Alice’s Adventures in Wonderland?", "Alice", "Wendy", "Lucy", "Dorothy"],
    ["Who wrote One Hundred Years of Solitude?", "Gabriel García Márquez", "Jorge Luis Borges", "Isabel Allende", "Mario Vargas Llosa"],
    ["Which novel opens with the line “Call me Ishmael”?", "Moby-Dick", "Treasure Island", "Robinson Crusoe", "Gulliver’s Travels"],
    ["Who created The Very Hungry Caterpillar?", "Eric Carle", "Beatrix Potter", "Maurice Sendak", "Dr. Seuss"],
    ["What is the name of the main character in the original Malory Towers books?", "Darrell Rivers", "Sally Hope", "Gwendoline Lacey", "Alicia Johns"],
    ["Who wrote the play The Importance of Being Earnest?", "Oscar Wilde", "George Bernard Shaw", "Noël Coward", "William Shakespeare"],
    ["What is the name of the lion in The Lion, the Witch and the Wardrobe?", "Aslan", "Simba", "Shere Khan", "Babar"],
    ["In which novel does a secret garden help change the lives of Mary and Colin?", "The Secret Garden", "Little Women", "Anne of Green Gables", "A Little Princess"],
    ["Who wrote Frankenstein?", "Mary Shelley", "Bram Stoker", "Emily Brontë", "Ann Radcliffe"],
  ],
  technology: [
    ["What does USB stand for?", "Universal Serial Bus", "Unified System Bridge", "Universal Storage Base", "User Signal Band"],
    ["Which computer scientist invented the World Wide Web?", "Tim Berners-Lee", "Steve Wozniak", "Grace Hopper", "Vint Cerf"],
    ["What is the term for a computer’s main processing chip?", "CPU", "DNS", "RAM", "URL"],
    ["Which letters appear in the name of the common English keyboard layout?", "QWERTY", "ABCDEF", "TYUIOP", "ZXCVBN"],
    ["How many bits make up a byte?", "Eight", "Four", "Sixteen", "Thirty-two"],
    ["Which component supplies electrical power on a normal desktop PC?", "Power supply unit", "Graphics card", "Network adapter", "Solid-state drive"],
    ["What does GPS stand for?", "Global Positioning System", "General Processing Service", "Geographic Pointer Software", "Global Phone Standard"],
    ["What is used to read a QR code on most smartphones?", "The camera", "The microphone", "The speaker", "The vibration motor"],
    ["What is the standard binary value of decimal two?", "10", "01", "11", "100"],
    ["What does LED stand for?", "Light-emitting diode", "Low-energy display", "Laser excitation device", "Liquid electrode design"],
    ["Which device directs traffic between computer networks?", "Router", "Projector", "Keyboard", "Printer"],
    ["Which company makes the PlayStation consoles?", "Sony", "Nintendo", "Sega", "Microsoft"],
    ["What kind of device converts sound into an electrical signal?", "Microphone", "Speaker", "Antenna", "Monitor"],
    ["What is the name for raw material fed into a filament-based 3D printer?", "Filament", "Toner", "Ink ribbon", "Developer powder"],
    ["What does PDF stand for?", "Portable Document Format", "Personal Data Folder", "Printed Digital File", "Public Display Framework"],
  ],
  art: [
    ["Who painted The Starry Night?", "Vincent van Gogh", "Claude Monet", "Salvador Dalí", "Rembrandt"],
    ["Which artist painted the ceiling of the Sistine Chapel?", "Michelangelo", "Raphael", "Titian", "Caravaggio"],
    ["Which material is the main ingredient in traditional porcelain?", "Kaolin clay", "Pine resin", "Granite dust", "Beeswax"],
    ["What term describes a painting made on wet plaster?", "Fresco", "Collage", "Etching", "Mosaic"],
    ["Who designed the house known as Fallingwater?", "Frank Lloyd Wright", "Zaha Hadid", "Antoni Gaudí", "Le Corbusier"],
  ],
  games: [
    ["Which chess piece moves in an L shape?", "Knight", "Bishop", "Rook", "Queen"],
    ["What game uses a grid so each row, column and standard square contains digits 1 to 9?", "Sudoku", "Crossword", "Word search", "Minesweeper"],
    ["What kind of creature is Sonic in the Sonic the Hedgehog games?", "Hedgehog", "Fox", "Rabbit", "Badger"],
    ["Which game features the tetromino shapes I, O, T, S, Z, J and L?", "Tetris", "Pac-Man", "Space Invaders", "Pong"],
    ["Which board game involves buying streets and charging rent?", "Monopoly", "Battleship", "Cluedo", "Othello"],
  ],
  animals: [
    ["What is the only group of mammals capable of sustained powered flight?", "Bats", "Flying squirrels", "Sugar gliders", "Colugos"],
    ["What is a group of lions commonly called?", "A pride", "A herd", "A pod", "A flock"],
    ["Which animal is the largest living land mammal?", "African bush elephant", "Hippopotamus", "White rhinoceros", "Giraffe"],
    ["Which of these animals is an amphibian?", "Axolotl", "Chameleon", "Gecko", "Iguana"],
    ["Which animal has fingerprints famously similar to humans?", "Koala", "Kangaroo", "Wombat", "Red panda"],
  ],
  space: [
    ["Which planet has the Great Red Spot?", "Jupiter", "Mars", "Saturn", "Neptune"],
    ["What is the name of our galaxy?", "Milky Way", "Andromeda", "Triangulum", "Sombrero"],
    ["What causes a solar eclipse?", "The Moon passes between Earth and the Sun", "Earth passes between the Moon and the Sun", "Mars blocks sunlight", "Earth stops rotating"],
    ["What was the first artificial satellite to orbit Earth?", "Sputnik 1", "Explorer 1", "Apollo 11", "Vostok 1"],
    ["Which is the largest moon in the Solar System?", "Ganymede", "Titan", "Europa", "The Moon"],
  ],
};

const trueFalse = {
  general: [
    ["A hexagon has six sides.", true],
    ["A standard chessboard has 100 squares.", false],
    ["An hour contains 3,600 seconds.", true],
    ["The Roman numeral L means 100.", false],
    ["A baker’s dozen contains 13 items.", true],
    ["A standard die has eight faces.", false],
    ["A leap year has 366 days.", true],
    ["One kilogram equals 100 grams.", false],
    ["There are 90 degrees in a right angle.", true],
    ["The word “alphabet” comes from the names of the first two Greek letters.", true],
    ["A palindrome reads the same forwards and backwards.", true],
    ["A standard pack of cards has six suits.", false],
    ["There are ten pins in standard ten-pin bowling.", true],
    ["A tonne is lighter than a kilogram.", false],
    ["A century lasts ten years.", false],
  ],
  history: [
    ["The printing press associated with Johannes Gutenberg was developed in the 1400s.", true],
    ["The Second World War ended in 1945.", true],
    ["The ancient Roman city of Pompeii was destroyed by an earthquake in 1066.", false],
    ["Henry VIII had six wives.", true],
    ["The Battle of Hastings took place in 1215.", false],
    ["Cleopatra ruled Egypt.", true],
    ["The Rosetta Stone helped scholars read Egyptian hieroglyphs.", true],
    ["Vikings came from Scandinavia.", true],
    ["Napoleon was born in Paris.", false],
    ["The United States Declaration of Independence was adopted in 1776.", true],
    ["The Renaissance began in Australia.", false],
    ["The ancient Olympic Games originated in Greece.", true],
    ["The first successful powered flight by the Wright brothers took place in the 1800s.", false],
    ["Florence Nightingale is associated with the Crimean War.", true],
    ["The city now called Istanbul was once known as Constantinople.", true],
  ],
  news: [
    ["The 2023 FIFA Women’s World Cup final was played in Sydney.", true],
    ["The 2025 World Expo was held in Canada.", false],
    ["Sweden joined NATO before Finland did.", false],
    ["The 2024 G7 summit was held in Italy.", true],
    ["The 2024 men’s UEFA European Championship was hosted by Germany.", true],
    ["The 2024 total solar eclipse crossed parts of Mexico, the United States, and Canada.", true],
    ["The 2023 COP28 climate summit was held in Dubai.", true],
    ["The 2025 COP30 climate summit was held in France.", false],
    ["The Paris 2024 Olympics included breaking as a medal event.", true],
    ["The UK hosted Eurovision in Liverpool in 2023.", true],
    ["The 2024 Summer Paralympics took place in Paris.", true],
    ["The 2026 Winter Olympics were held in Norway.", false],
    ["Canada hosted the 2025 G7 summit.", true],
    ["The 2024 Olympic surfing competition took place in Tahiti.", true],
    ["The 2023 Rugby World Cup was held in Argentina.", false],
  ],
  christmas: [
    ["The Grinch lives near Whoville.", true],
    ["Christmas Day falls on 26 December.", false],
    ["A partridge appears in a pear tree in “The Twelve Days of Christmas”.", true],
    ["“Silent Night” was first performed in Austria.", true],
    ["In Elf, Buddy is played by Jim Carrey.", false],
    ["A Christingle traditionally uses an orange.", true],
    ["Holly is the same plant as mistletoe.", false],
    ["The Ghost of Christmas Yet to Come appears in A Christmas Carol.", true],
    ["Panettone is traditionally associated with Italy.", true],
    ["December is a summer month in Australia.", true],
    ["Rudolph is named in the original version of “A Visit from St. Nicholas”.", false],
    ["“Jingle Bells” mentions Santa Claus in its chorus.", false],
    ["The word Noël is French for Christmas.", true],
    ["The Nutcracker is a ballet.", true],
    ["Gingerbread is traditionally flavoured with black pepper alone.", false],
  ],
  entertainment: [
    ["Darth Vader appears in the original Star Wars film.", true],
    ["The fictional school in Harry Potter is called Hogwarts.", true],
    ["The Beatles formed in London.", false],
    ["The first Toy Story film was released in the 1990s.", true],
    ["Winnie-the-Pooh is a rabbit.", false],
    ["James Bond’s agent number is 007.", true],
    ["E.T. was directed by Steven Spielberg.", true],
    ["Elsa and Anna are cousins in Frozen.", false],
    ["Snoopy is Charlie Brown’s dog.", true],
    ["The first Shrek film won the inaugural Oscar for Best Animated Feature.", true],
    ["The title character in Wall-E is a robot.", true],
    ["The original Jurassic Park film was released after the year 2000.", false],
    ["Queen recorded the song “We Will Rock You”.", true],
    ["The singer Adele is from Australia.", false],
    ["Pikachu is a character in the Pokémon franchise.", true],
  ],
  sports: [
    ["A marathon is longer than 40 kilometres.", true],
    ["A football team scores two goals for a successful penalty kick.", false],
    ["Ice hockey is part of the Winter Olympics.", true],
    ["Wimbledon is traditionally played on grass.", true],
    ["Table tennis balls are normally made of metal.", false],
    ["The rings on the Olympic flag overlap.", true],
    ["A rugby league team has 15 players on the field at full strength.", false],
    ["Badminton is played with a shuttlecock.", true],
    ["A standard ten-pin bowling game has ten frames.", true],
    ["Golf scores are usually better when they are higher.", false],
    ["A pentathlon includes five events.", true],
    ["A bicycle race called the Giro d’Italia takes place primarily in Spain.", false],
    ["A soccer red card means the player is sent off.", true],
    ["A hat-trick in football usually means scoring three goals in a match.", true],
    ["Beach volleyball teams at the Olympics have six players on court each.", false],
  ],
  geography: [
    ["Mount Kilimanjaro is in Tanzania.", true],
    ["Iceland is on the equator.", false],
    ["Greenland is part of the Kingdom of Denmark.", true],
    ["The Nile flows into the Mediterranean Sea.", true],
    ["Sydney is the capital of Australia.", false],
    ["The Sahara Desert is in Africa.", true],
    ["The Andes are in Europe.", false],
    ["Japan is an island country.", true],
    ["Lisbon is the capital of Portugal.", true],
    ["Madagascar is in the Atlantic Ocean.", false],
    ["The Suez Canal connects the Mediterranean and Red Seas.", true],
    ["Austria has a coastline.", false],
    ["The Baltic Sea borders Sweden.", true],
    ["The Amazon River flows through Brazil.", true],
    ["Mount Everest is in the Alps.", false],
  ],
  science: [
    ["Sound travels through a vacuum.", false],
    ["Light travels faster than sound in air.", true],
    ["A shark’s skeleton is made primarily of cartilage.", true],
    ["Humans and dinosaurs such as Tyrannosaurus rex lived at the same time.", false],
    ["Mars has two moons.", true],
    ["Adult humans usually have four lungs.", false],
    ["Bats are mammals.", true],
    ["A tomato is botanically a fruit.", true],
    ["Lightning never strikes the same place twice.", false],
    ["A whale breathes using lungs.", true],
    ["The Earth revolves around the Sun.", true],
    ["Mercury is farther from the Sun than Earth is.", false],
    ["A honeybee has six legs.", true],
    ["All penguins can fly.", false],
    ["An octopus is a vertebrate.", false],
  ],
  food: [
    ["Cocoa is used to make chocolate.", true],
    ["Tofu is traditionally made from soybeans.", true],
    ["Sourdough bread is named after a variety of grape.", false],
    ["A raisin is a dried grape.", true],
    ["Saffron comes from a flower.", true],
    ["Traditional mozzarella was originally made with buffalo milk in parts of Italy.", true],
    ["Coffee beans come from a cactus.", false],
    ["Olive oil is made from the fruit of olive trees.", true],
    ["Cinnamon comes from the bark of trees.", true],
    ["French fries are normally made from apples.", false],
    ["A pomegranate contains numerous seeds surrounded by juicy flesh.", true],
    ["Maple syrup is made from tree sap.", true],
    ["Rice is a type of meat.", false],
    ["A pistachio shell is normally eaten with the kernel.", false],
    ["Kombucha is made by fermenting sweetened tea.", true],
  ],
  music: [
    ["The clarinet is a woodwind instrument.", true],
    ["A cello is generally played by holding it under the chin.", false],
    ["Bob Marley helped bring reggae to an international audience.", true],
    ["The bass clef is also called the G clef.", false],
    ["David Bowie recorded “Space Oddity”.", true],
    ["A timpani is a type of string instrument.", false],
    ["Johann Sebastian Bach was born before Ludwig van Beethoven.", true],
    ["The musical Hamilton was written by Andrew Lloyd Webber.", false],
    ["The ukulele is strongly associated with Hawaii.", true],
    ["The harmonica is usually played with a bow.", false],
    ["A duet is a piece for two performers.", true],
    ["Elvis Presley recorded the first released version of “Hound Dog”.", false],
    ["The trumpet is a brass instrument.", true],
    ["The Beatles released an album called Abbey Road.", true],
    ["A metronome is used mainly to measure the loudness of music.", false],
  ],
  books: [
    ["Virginia Woolf wrote Mrs Dalloway.", true],
    ["Peter Pan was created by Lewis Carroll.", false],
    ["George Orwell wrote Animal Farm.", true],
    ["The author of The Tale of Peter Rabbit was Beatrix Potter.", true],
    ["Sherlock Holmes is the narrator of most of the original Holmes stories.", false],
    ["Jules Verne wrote Journey to the Centre of the Earth.", true],
    ["Dr. Seuss wrote Where the Wild Things Are.", false],
    ["Dorothy travels to Oz in a cyclone in The Wonderful Wizard of Oz.", true],
    ["The Jungle Book was first written by Roald Dahl.", false],
    ["Jane Eyre was written by Charlotte Brontë.", true],
    ["The main character in The Little Prince is a grown-up king.", false],
    ["The word haiku refers to a form of poetry.", true],
    ["Charles Dickens wrote Wuthering Heights.", false],
    ["Toni Morrison wrote Beloved.", true],
    ["The fictional detective Miss Marple was created by Ian Fleming.", false],
  ],
  technology: [
    ["Bluetooth can connect devices without a physical cable.", true],
    ["A URL is a unit of computer memory.", false],
    ["Solid-state drives have no moving platters.", true],
    ["The World Wide Web existed before the Internet.", false],
    ["A QR code is a type of two-dimensional barcode.", true],
    ["A computer keyboard is mainly an output device.", false],
    ["A lithium-ion battery can be recharged.", true],
    ["Wi-Fi signals have to travel through an Ethernet cable between a phone and its access point.", false],
    ["The original Macintosh computer was released by Apple.", true],
    ["A GIF can only contain a single image.", false],
    ["A spreadsheet can use formulas to calculate values.", true],
    ["A USB-C connector only fits into its port in one orientation.", false],
    ["GPS receivers use signals from satellites.", true],
    ["A digital camera always records pictures onto film.", false],
    ["A pixel is a basic element of a digital image.", true],
  ],
  art: [
    ["Georgia O’Keeffe often painted enlarged flowers.", true],
    ["The Louvre is in Rome.", false],
    ["A mosaic can be made from small pieces of coloured glass.", true],
    ["Watercolour is traditionally applied using melted wax as its main binder.", false],
    ["A self-portrait depicts the artist who made it.", true],
  ],
  games: [
    ["A standard Sudoku grid has nine rows.", true],
    ["A pawn in chess can normally move backwards.", false],
    ["In standard Connect Four, four discs in a diagonal line can win.", true],
    ["A jigsaw puzzle must always be square.", false],
    ["The original Pac-Man features four ghosts in its maze.", true],
  ],
  animals: [
    ["Crocodiles lay eggs.", true],
    ["An ostrich can fly.", false],
    ["Dolphins breathe air.", true],
    ["A blue whale is a fish.", false],
    ["A platypus is an egg-laying mammal.", true],
  ],
  space: [
    ["Venus takes longer to rotate once than it takes to orbit the Sun.", true],
    ["The Sun is a planet.", false],
    ["Uranus has a ring system.", true],
    ["A light-year measures time.", false],
    ["The International Space Station travels around Earth.", true],
  ],
};

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Content packs share the standard question selector, so history and mixed formats work automatically.
for (const [category,items] of Object.entries(extraChoiceQuestions)) {
  banks[category]??=[];
  banks[category].push(...items);
}
for (const [category,items] of Object.entries(extraBooleanQuestions)) {
  trueFalse[category]??=[];
  trueFalse[category].push(...items);
}
// November 2026 packs: six sports, two screen fandoms and everyday top-ups.
const addPack = (target, pack) => {
  for (const [category, items] of Object.entries(pack)) (target[category] ??= []).push(...items);
};
for (const pack of [sportChoice, screenChoice, topupChoice]) addPack(banks, pack);
for (const pack of [sportBoolean, screenBoolean, topupBoolean]) addPack(trueFalse, pack);
for (const pack of [sportEstimate, screenEstimate]) addPack(estimates, pack);
for (const pack of [sportOrder, screenOrder]) addPack(orders, pack);
for (const [category, items] of Object.entries(verifiedChoiceQuestions)) {
  banks[category] ??= [];
  banks[category].push(...items.map(({prompt,answer,distractors}) => [prompt, answer, ...distractors]));
}

const hasSeen = (seen, prompt) => seen.has(prompt) || seen.has(questionHistoryId(prompt));
const verifiedSources = new Map(Object.values(verifiedChoiceQuestions).flat().map(({prompt,source})=>[prompt,source]));
export const verifiedSourceFor = prompt => verifiedSources.get(prompt);
export const questionCategories = Object.keys(banks);

export function makeQuestions(category, count, seen = new Set(), format = 'choice', includeChristmas = true, difficulty = 'standard') {
  const curated = difficultyQuestions[difficulty];
  if (curated) {
    const pool = shuffle(curated).sort((a, b) => Number(hasSeen(seen,a[1])) - Number(hasSeen(seen,b[1])));
    return pool.slice(0, count).map(([id, prompt, correct, ...rest]) => {
      const options = shuffle([correct, ...rest]);
      return { category: id, prompt, type: 'choice', options, correct: options.indexOf(correct) };
    });
  }
  if (format === 'mixed') {
    const types = ['choice', 'boolean', 'estimate', 'order'];
    const queues = types.map((type, index) =>
      makeQuestions(category, Math.max(0, Math.ceil((count - index) / types.length)), seen, type, includeChristmas));
    return Array.from({ length: count }, (_, index) => queues[index % types.length][Math.floor(index / types.length)]).filter(Boolean);
  }
  // Mixed Bag keeps to the everyday topics; specialist packs are chosen on purpose.
  const ids = category === 'mixed' ? questionCategories.filter(id => !isSpecialist(id) && (includeChristmas || id !== 'christmas')) : [category];
  const groups = ids.map(id => {
    const binary = (trueFalse[id] ?? []).map(([prompt, correct]) => [prompt, correct ? 'True' : 'False']);
    // A topic without questions in this format contributes none, rather than
    // passing its multiple-choice rows off as estimates or orders.
    const pool = (format === 'choice' ? banks[id] : { boolean: binary, estimate: estimates[id], order: orders[id] }[format]) ?? [];
    const rows = shuffle(pool).map(row => ({ id, row }));
    return {
      fresh: rows.filter(({ row }) => !hasSeen(seen,row[0])),
      used: rows.filter(({ row }) => hasSeen(seen,row[0])),
    };
  });
  const selected = [];
  const selectedIds = new Set();
  for (const key of ['fresh', 'used']) {
    let active = groups.filter(group => group[key].length);
    while (selected.length < count && active.length) {
      for (const group of shuffle(active)) {
        // Content packs can legitimately overlap across subjects. One question
        // must only appear once in any single match, even in Mixed Bag.
        let item;
        while (group[key].length) {
          const candidate = group[key].pop();
          const id = questionHistoryId(candidate.row[0]);
          if (selectedIds.has(id)) continue;
          selectedIds.add(id);
          item = candidate;
          break;
        }
        if (item) selected.push(item);
        if (selected.length === count) break;
      }
      active = active.filter(group => group[key].length);
    }
  }
  return selected.map(({ id, row }) => formatQuestion(id, format, row));
}

function formatQuestion(id, format, [prompt, correct, ...rest]) {
  if (format === 'estimate') {
    const [unit, min, max] = rest;
    return { category: id, prompt, type: format, correct, unit, min, max };
  }
  if (format === 'order') {
    const sequence = [correct, ...rest];
    const options = shuffle(sequence);
    if (options.every((item, index) => item === sequence[index])) {
      options.push(options.shift());
    }
    return { category: id, prompt, type: format, options, correct: sequence.map(item => options.indexOf(item)) };
  }
  const options = rest.length ? shuffle([correct, ...rest]) : ['True', 'False'];
  return { category: id, prompt, type: format, options, correct: options.indexOf(correct) };
}

export function boardQuestion(category, format, level, seen) {
  const sources = { choice: banks, boolean: trueFalse, estimate: estimates, order: orders };
  const ranks = boardQuestionOrder[category][format];
  const bank = sources[format][category];
  const candidates = level === 6
    ? [boardExpert[category][format], ...(format === 'choice' ? difficultyQuestions.challenge.filter(([id]) => id === category).map(([, ...row]) => row) : [])]
    : ranks.filter((_, index) => Math.floor(index * 5 / ranks.length) + 1 === level).map(index => bank[index]);
  const shuffled = shuffle(candidates);
  const row = shuffled.find(([prompt]) => !hasSeen(seen,prompt)) ?? shuffled[0];
  const question = formatQuestion(category, format, format === 'boolean' ? [row[0], row[1] ? 'True' : 'False'] : row);
  return { ...question, difficulty: level };
}

/**
 * So Close draws real-world measurement questions first, unseen before seen,
 * one category at a time for Mixed Bag. Categories with too few dedicated
 * prompts are topped up from the general estimate bank, never repeating a
 * question within the match.
 */
export function makeSoCloseQuestions(category, count, seen = new Set(), includeChristmas = true) {
  const allowed = row => (category === 'mixed' ? includeChristmas || row.category !== 'christmas' : row.category === category);
  const pool = shuffle(soCloseBank.filter(allowed)).sort((a, b) => Number(hasSeen(seen, a.prompt)) - Number(hasSeen(seen, b.prompt)));
  const picked = [];
  const used = new Set();
  // Spread Mixed Bag across subjects: take round-robin from each category.
  const byCategory = new Map();
  for (const row of pool) byCategory.set(row.category, [...(byCategory.get(row.category) ?? []), row]);
  const queues = shuffle([...byCategory.values()]);
  while (picked.length < count && queues.some(queue => queue.length)) {
    for (const queue of queues) {
      const row = queue.shift();
      if (!row) continue;
      // Unseen prompts first: a seen prompt waits until no unseen one is left.
      picked.push(row);
      used.add(questionHistoryId(row.prompt));
      if (picked.length === count) break;
    }
  }
  picked.sort((a, b) => Number(hasSeen(seen, a.prompt)) - Number(hasSeen(seen, b.prompt)));
  const questions = picked.map(row => ({ category: row.category, prompt: row.prompt, type: 'estimate', correct: row.answer, unit: row.unit, min: row.min, max: row.max }));
  if (questions.length < count) {
    const extra = makeQuestions(category, count * 2, seen, 'estimate', includeChristmas)
      .filter(question => !used.has(questionHistoryId(question.prompt)));
    questions.push(...extra.slice(0, count - questions.length));
  }
  return questions;
}
