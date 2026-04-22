export const WARRIOR_QUOTES = [
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "We suffer more in imagination than in reality.", author: "Seneca" },
  { text: "He who conquers himself is the mightiest warrior.", author: "Confucius" },
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "Do not pray for an easy life, pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "No man has the right to be an amateur in the matter of physical training.", author: "Socrates" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle / Will Durant" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Success is nothing more than a few simple disciplines, practiced every day.", author: "Jim Rohn" },
  { text: "The magic you are looking for is in the work you are avoiding.", author: "Unknown" },
  { text: "Motivation gets you going, but discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "I don't stop when I'm tired. I stop when I'm done.", author: "David Goggins" },
  { text: "The pain of discipline is nothing like the pain of disappointment.", author: "Justin Langer" },
  { text: "You can't hire someone else to do the push-ups for you.", author: "Jim Rohn" },
  { text: "Nothing will work unless you do.", author: "Maya Angelou" },
  { text: "The distance between your dreams and reality is called discipline.", author: "Unknown" },
  { text: "If you want to be a lion, you must train with lions.", author: "Carlson Gracie" },
  { text: "Mastering others is strength. Mastering yourself is true power.", author: "Lao Tzu" },
  { text: "To conquer frustration, one must remain intensely focused on the outcome, not the obstacles.", author: "T.F. Hodge" },
  { text: "There are two types of pain you will go through in life: the pain of discipline and the pain of regret.", author: "Jim Rohn" },
  { text: "A warrior is not about perfection or victory or invulnerability. He’s about absolute vulnerability.", author: "Dan Millman" },
  { text: "Self-control is the chief element in self-respect, and self-respect is the chief element in courage.", author: "Thucydides" },
  { text: "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.", author: "Bruce Lee" },
  { text: "Rule your mind or it will rule you.", author: "Horace" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "The hard days are the best because that's when champions are made.", author: "Gabby Douglas" },
  { text: "Do today what others won't so tomorrow you can do what others can't.", author: "Jerry Rice" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "A gem cannot be polished without friction, nor a man perfected without trials.", author: "Seneca" },
  { text: "Great works are performed not by strength but by perseverance.", author: "Samuel Johnson" },
  { text: "The obstacle in the path becomes the path. Never forget, within every obstacle is an opportunity.", author: "Ryan Holiday" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" }
];

export function getStaticDailyQuote(dateString: string) {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash += dateString.charCodeAt(i);
  }
  return WARRIOR_QUOTES[hash % WARRIOR_QUOTES.length];
}
