// New authored multiple-choice questions: answer and distractors independently
// reviewed against the primary reference URL on the listed verification date.
// Historical bank entries in questions.js are NOT covered by this status.
export const verifiedChoiceQuestions = Object.freeze({
  "space": [
    {
      "prompt": "Which moon is the largest in our solar system?",
      "answer": "Ganymede",
      "distractors": [
        "Titan",
        "Europa",
        "Callisto"
      ],
      "source": "https://science.nasa.gov/jupiter/jupiter-facts/",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    },
    {
      "prompt": "Which planet has the hottest surface in our solar system?",
      "answer": "Venus",
      "distractors": [
        "Mercury",
        "Mars",
        "Jupiter"
      ],
      "source": "https://science.nasa.gov/venus/venus-facts/",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    },
    {
      "prompt": "Which pair of planets have no natural moons?",
      "answer": "Mercury and Venus",
      "distractors": [
        "Earth and Mars",
        "Venus and Mars",
        "Mercury and Earth"
      ],
      "source": "https://science.nasa.gov/solar-system/solar-system-facts/",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    },
    {
      "prompt": "Which planet is least dense?",
      "answer": "Saturn",
      "distractors": [
        "Jupiter",
        "Uranus",
        "Neptune"
      ],
      "source": "https://science.nasa.gov/uranus/facts/",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    },
    {
      "prompt": "Which planet is the seventh from the Sun?",
      "answer": "Uranus",
      "distractors": [
        "Neptune",
        "Saturn",
        "Jupiter"
      ],
      "source": "https://science.nasa.gov/uranus/facts/",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    },
    {
      "prompt": "Approximately how long ago did the solar system form?",
      "answer": "4.6 billion years ago",
      "distractors": [
        "460 million years ago",
        "46 million years ago",
        "13.8 billion years ago"
      ],
      "source": "https://science.nasa.gov/solar-system/solar-system-facts/",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    },
    {
      "prompt": "Jupiter is named after which figure in Roman mythology?",
      "answer": "The king of the gods",
      "distractors": [
        "The god of the sea",
        "The god of war",
        "The messenger of the gods"
      ],
      "source": "https://science.nasa.gov/jupiter/jupiter-facts/",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    },
    {
      "prompt": "Which of these planets has a very slow rotation and a day longer than its year?",
      "answer": "Venus",
      "distractors": [
        "Earth",
        "Neptune",
        "Jupiter"
      ],
      "source": "https://science.nasa.gov/venus/venus-facts/",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    }
  ],
  "history": [
    {
      "prompt": "In what year was Yellowstone National Park established?",
      "answer": "1872",
      "distractors": [
        "1902",
        "1916",
        "1849"
      ],
      "source": "https://www.nps.gov/yell/planyourvisit/parkfacts.htm",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    },
    {
      "prompt": "Which US president signed the law establishing Yellowstone National Park?",
      "answer": "Ulysses S. Grant",
      "distractors": [
        "Abraham Lincoln",
        "Theodore Roosevelt",
        "Woodrow Wilson"
      ],
      "source": "https://www.nps.gov/articles/npshistory-origins.htm",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    }
  ],
  "geography": [
    {
      "prompt": "What longitude is assigned to the historic Greenwich meridian?",
      "answer": "0 degrees",
      "distractors": [
        "90 degrees east",
        "180 degrees",
        "45 degrees west"
      ],
      "source": "https://www.rmg.co.uk/stories/time/what-longitude",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    },
    {
      "prompt": "Longitude describes how far a place is in which directions?",
      "answer": "East or west",
      "distractors": [
        "North or south",
        "Up or down",
        "Clockwise or anticlockwise"
      ],
      "source": "https://www.rmg.co.uk/stories/time/what-longitude",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    }
  ],
  "science": [
    {
      "prompt": "Roughly how much of Earth's freshwater is stored in ice and glaciers?",
      "answer": "About 69%",
      "distractors": [
        "About 10%",
        "About 30%",
        "About 95%"
      ],
      "source": "https://www.usgs.gov/water-science-school/science/how-much-water-there-earth",
      "verifiedOn": "2026-11-22",
      "status": "verified"
    }
  ]
});
export function questionAudit(questions = verifiedChoiceQuestions) {
  const errors = [], seen = new Set();
  for (const [category, rows] of Object.entries(questions)) for (const item of rows) {
    const key = item.prompt.normalize('NFKC').trim().toLowerCase();
    if (seen.has(key)) errors.push('Duplicate prompt: '+item.prompt);
    seen.add(key);
    if (!item.prompt.endsWith('?')) errors.push('Missing question mark: '+item.prompt);
    if (item.status !== 'verified' || !/^https:\/\//.test(item.source) || !/^\d{4}-\d{2}-\d{2}$/.test(item.verifiedOn)) errors.push('Unverified: '+item.prompt);
    if (!item.answer || !Array.isArray(item.distractors) || item.distractors.length !== 3 || new Set([item.answer,...item.distractors].map(v=>v.trim().toLowerCase())).size !== 4) errors.push('Invalid answer options: '+item.prompt);
    if (!category) errors.push('Missing category: '+item.prompt);
  }
  return errors;
}
