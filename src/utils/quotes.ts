export interface Quote {
  text: string;
  author: string;
  categories: string[]; // e.g., ['General'], ['Nursing'], ['Law'], ['Computer Science']
}

export const getQuotesByField = (field: string | undefined): Quote[] => {
  if (!field) return QUOTES; // Return all if no field specified

  const normalizedField = field.toLowerCase();
  
  // Define keywords for mapping user input to categories
  const mapping: { [key: string]: string[] } = {
    'Nursing': ['nurs', 'med', 'health', 'doctor', 'rn', 'lpn', 'clinic', 'care', 'hosp'],
    'Medicine': ['med', 'health', 'doctor', 'physician', 'surg', 'clinic', 'hosp'],
    'Law': ['law', 'legal', 'justice', 'attorney', 'bar', 'juris', 'court'],
    'Computer Science': ['computer', 'sci', 'tech', 'code', 'soft', 'dev', 'data', 'program', 'cyber', 'web', 'app'],
    'Engineering': ['eng', 'mech', 'civil', 'electr', 'struct', 'build', 'robot'],
    'Business': ['bus', 'fin', 'econ', 'manage', 'admin', 'market', 'entre', 'corp'],
    'Arts': ['art', 'design', 'music', 'writ', 'paint', 'creat', 'film', 'media'],
    'Science': ['bio', 'chem', 'physic', 'sci', 'lab', 'research', 'astro']
  };

  // Find relevant categories
  const relevantCategories: string[] = ['General']; // Always include General
  
  // Check if any keyword matches the user's field
  for (const [category, keywords] of Object.entries(mapping)) {
    if (keywords.some(k => normalizedField.includes(k))) {
      relevantCategories.push(category);
    }
  }

  // Filter quotes that match the relevant categories
  // We prioritize: if a quote has ANY of the relevant categories, we include it.
  const filtered = QUOTES.filter(q => 
    q.categories.some(c => relevantCategories.includes(c))
  );
  
  // If we filtered down too much (e.g. only General quotes found), that's fine.
  // But if the user's input matched nothing specific, we just return everything (or just General + All? No, return everything is safer for variety).
  // Actually, if input is "Underwater Basket Weaving" and matches nothing, relevantCategories is just ['General'].
  // So we return only General quotes. This is good behavior.
  
  return filtered.length > 0 ? filtered : QUOTES;
};

export const QUOTES: Quote[] = [
  // --- Nursing & Medicine ---
  { text: "Cure sometimes, treat often, comfort always.", author: "Hippocrates", categories: ['Nursing', 'Medicine', 'Health'] },
  { text: "Nurses dispense comfort, compassion, and caring without even a prescription.", author: "Val Saintsbury", categories: ['Nursing', 'Health'] },
  { text: "To do what nobody else will do, a way that nobody else can do, in spite of all we go through; that is to be a nurse.", author: "Rawsi Williams", categories: ['Nursing'] },
  { text: "Medicine is a science of uncertainty and an art of probability.", author: "William Osler", categories: ['Medicine', 'Health'] },
  { text: "Wherever the art of Medicine is loved, there is also a love of Humanity.", author: "Hippocrates", categories: ['Medicine', 'Nursing', 'Health'] },
  { text: "The best way to find yourself is to lose yourself in the service of others.", author: "Mahatma Gandhi", categories: ['Nursing', 'Medicine', 'Social Work'] },
  { text: "Care is the essence of nursing.", author: "Jean Watson", categories: ['Nursing'] },

  // --- Law ---
  { text: "Justice delayed is justice denied.", author: "William E. Gladstone", categories: ['Law', 'Criminal Justice'] },
  { text: "The law is reason, free from passion.", author: "Aristotle", categories: ['Law'] },
  { text: "Injustice anywhere is a threat to justice everywhere.", author: "Martin Luther King Jr.", categories: ['Law', 'Political Science'] },
  { text: "The life of the law has not been logic: it has been experience.", author: "Oliver Wendell Holmes Jr.", categories: ['Law'] },
  { text: "Laws are like sausages, it is better not to see them being made.", author: "Otto von Bismarck", categories: ['Law', 'Political Science'] },
  { text: "At his best, man is the noblest of all animals; separated from law and justice he is the worst.", author: "Aristotle", categories: ['Law'] },

  // --- Computer Science & Engineering ---
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds", categories: ['Computer Science', 'Engineering', 'Tech'] },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson", categories: ['Computer Science'] },
  { text: "It's not a bug – it's an undocumented feature.", author: "Anonymous", categories: ['Computer Science'] },
  { text: "Scientists investigate that which already is; Engineers create that which has never been.", author: "Albert Einstein", categories: ['Engineering', 'Computer Science'] },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson", categories: ['Computer Science'] },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman", categories: ['Engineering', 'Computer Science'] },
  { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke", categories: ['Engineering', 'Computer Science'] },

  // --- Business & Finance ---
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser", categories: ['Business', 'Finance', 'General'] },
  { text: "Business opportunities are like buses, there's always another one coming.", author: "Richard Branson", categories: ['Business'] },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau", categories: ['Business', 'General'] },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller", categories: ['Business'] },
  { text: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs", categories: ['Business', 'Tech'] },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett", categories: ['Finance', 'Business'] },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett", categories: ['Finance', 'Business'] },

  // --- Arts & Humanities ---
  { text: "Creativity takes courage.", author: "Henri Matisse", categories: ['Arts', 'Design'] },
  { text: "Every artist was first an amateur.", author: "Ralph Waldo Emerson", categories: ['Arts'] },
  { text: "Art is not what you see, but what you make others see.", author: "Edgar Degas", categories: ['Arts', 'Design'] },
  { text: "Design is not just what it looks like and feels like. Design is how it works.", author: "Steve Jobs", categories: ['Design', 'Arts'] },
  { text: "The purpose of art is washing the dust of daily life off our souls.", author: "Pablo Picasso", categories: ['Arts'] },

  // --- General / Resilience / Learning (Existing) ---
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier", categories: ['General'] },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", categories: ['General'] },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", categories: ['General'] },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", categories: ['General'] },
  { text: "Fall seven times and stand up eight.", author: "Japanese Proverb", categories: ['General'] },
  { text: "The difference between a stumbling block and a stepping stone is how you use it.", author: "Unknown", categories: ['General'] },
  { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis", categories: ['General'] },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", categories: ['General'] },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison", categories: ['General'] },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin", categories: ['General'] },
  { text: "Grit is that ‘extra something’ that separates the most successful people from the rest.", author: "Travis Bradberry", categories: ['General'] },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", categories: ['General'] },
  { text: "You just can't beat the person who never gives up.", author: "Babe Ruth", categories: ['General'] },
  { text: "Persistence guarantees that results are inevitable.", author: "Paramahansa Yogananda", categories: ['General'] },
  { text: "Ambition is the path to success. Persistence is the vehicle you arrive in.", author: "Bill Bradley", categories: ['General'] },
  
  // Learning & Growth
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", categories: ['General', 'Education'] },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", categories: ['General', 'Education'] },
  { text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert", categories: ['General', 'Education'] },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", categories: ['General', 'Finance'] },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", categories: ['General', 'Education'] },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci", categories: ['General', 'Education'] },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin", categories: ['General', 'Education'] },
  { text: "He who asks a question is a fool for five minutes; he who does not ask a question remains a fool forever.", author: "Chinese Proverb", categories: ['General', 'Education'] },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes", categories: ['General'] },
  { text: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", author: "Albert Einstein", categories: ['General', 'Education'] },

  // Action & Execution
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", categories: ['General', 'Business'] },
  { text: "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.", author: "Colin Powell", categories: ['General'] },
  { text: "Don't let yesterday take up too much of today.", author: "Will Rogers", categories: ['General'] },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar", categories: ['General'] },
  { text: "Amateurs sit and wait for inspiration. The rest of us just get up and go to work.", author: "Stephen King", categories: ['General'] },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso", categories: ['General'] },
  { text: "Well done is better than well said.", author: "Benjamin Franklin", categories: ['General'] },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb", categories: ['General'] },
  { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee", categories: ['General'] },
  { text: "Productivity is being able to do things that you were never able to do before.", author: "Franz Kafka", categories: ['General'] },
  
  // Mindset & Vision
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", categories: ['General'] },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs", categories: ['General'] },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford", categories: ['General'] },
  { text: "Everything you’ve ever wanted is on the other side of fear.", author: "George Addair", categories: ['General'] },
  { text: "Optimism is the faith that leads to achievement.", author: "Helen Keller", categories: ['General'] },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt", categories: ['General'] },
  { text: "Act as if what you do makes a difference. It does.", author: "William James", categories: ['General'] },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser", categories: ['General', 'Business'] },
  { text: "Don't be pushed around by the fears in your mind. Be led by the dreams in your heart.", author: "Roy T. Bennett", categories: ['General'] },
  { text: "We become what we think about.", author: "Earl Nightingale", categories: ['General'] },

  // Discipline & Focus
  { text: "Discipline is doing what needs to be done, even if you don't want to do it.", author: "Unknown", categories: ['General'] },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss", categories: ['General'] },
  { text: "Starve your distractions, feed your focus.", author: "Unknown", categories: ['General'] },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee", categories: ['General'] },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun", categories: ['General'] },
  { text: "Self-discipline is the magic power that makes you virtually unstoppable.", author: "Dan Kennedy", categories: ['General'] },
  { text: "Mastering others is strength. Mastering yourself is true power.", author: "Lao Tzu", categories: ['General'] },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn", categories: ['General'] },
  
  // Courage & Risk
  { text: "He who is not courageous enough to take risks will accomplish nothing in life.", author: "Muhammad Ali", categories: ['General'] },
  { text: "Security is mostly a superstition. Life is either a daring adventure or nothing.", author: "Helen Keller", categories: ['General'] },
  { text: "Only those who dare to fail greatly can ever achieve greatly.", author: "Robert F. Kennedy", categories: ['General'] },
  { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt", categories: ['General'] },
  { text: "Fortune favors the bold.", author: "Virgil", categories: ['General'] },
  
  // Excellence & Standards
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", categories: ['General'] },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle", categories: ['General'] },
  { text: "Be a yardstick of quality. Some people aren't used to an environment where excellence is expected.", author: "Steve Jobs", categories: ['General', 'Business'] },
  { text: "If you are going to achieve excellence in big things, you develop the habit in little matters.", author: "Colin Powell", categories: ['General'] },
  
  // Wisdom & Perspective
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker", categories: ['General', 'Business'] },
  { text: "Change your thoughts and you change your world.", author: "Norman Vincent Peale", categories: ['General'] },
  { text: "It is never too late to be what you might have been.", author: "George Eliot", categories: ['General'] },
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama", categories: ['General'] },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", categories: ['General'] },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu", categories: ['General'] },
  { text: "What we achieve inwardly will change outer reality.", author: "Plutarch", categories: ['General'] },
  { text: "The mind is everything. What you think you become.", author: "Buddha", categories: ['General'] },
  { text: "Do not wait to strike till the iron is hot, but make it hot by striking.", author: "William Butler Yeats", categories: ['General'] },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi", categories: ['General'] }
];
