/* Ready-made games (copy and change them, or host them straight away). */
window.PATHWAY_GAME_TEMPLATES = [
  { icon: '📖', title: 'Bible quiz', questions: [
    { kind: 'choice', text: 'Who built the ark?', options: ['Noah', 'Moses', 'Abraham', 'David'], correct: [0], time: 20 },
    { kind: 'choice', text: 'How many books are in the New Testament?', options: ['27', '39', '66', '24'], correct: [0], time: 20 },
    { kind: 'tf', text: 'Jonah was swallowed by a great fish.', correct: 1, time: 15 },
    { kind: 'choice', text: 'Who led the Israelites out of Egypt?', options: ['Joshua', 'Moses', 'Aaron', 'Samuel'], correct: [1], time: 20 },
    { kind: 'type', text: 'What is the first book of the Bible?', answers: ['Genesis'], time: 20 },
    { kind: 'choice', text: 'Where was Jesus born?', options: ['Nazareth', 'Jerusalem', 'Bethlehem', 'Capernaum'], correct: [2], time: 20 },
    { kind: 'order', text: 'Put these books in Bible order', items: ['Genesis', 'Exodus', 'Leviticus', 'Numbers'], time: 30 },
    { kind: 'choice', text: 'Who denied Jesus three times?', options: ['John', 'Judas', 'Thomas', 'Peter'], correct: [3], time: 20 },
    { kind: 'tf', text: 'David knocked down Goliath with a sling and a stone.', correct: 1, time: 15 },
    { kind: 'choice', text: 'How many disciples did Jesus choose?', options: ['10', '12', '7', '40'], correct: [1], time: 15, points: 'double' }] },
  { icon: '🗣️', title: 'Who said it?', questions: [
    { kind: 'choice', text: '“Here am I. Send me!”', options: ['Isaiah', 'Jeremiah', 'Moses', 'Elijah'], correct: [0], time: 20 },
    { kind: 'choice', text: '“As for me and my household, we will serve the Lord.”', options: ['David', 'Joshua', 'Noah', 'Joseph'], correct: [1], time: 20 },
    { kind: 'choice', text: '“Where you go I will go.”', options: ['Esther', 'Naomi', 'Ruth', 'Mary'], correct: [2], time: 20 },
    { kind: 'choice', text: '“I am the way, the truth and the life.”', options: ['Paul', 'Peter', 'John the Baptist', 'Jesus'], correct: [3], time: 15 },
    { kind: 'choice', text: '“I can do all things through Christ who strengthens me.”', options: ['Paul', 'Timothy', 'James', 'Luke'], correct: [0], time: 20 },
    { kind: 'choice', text: '“The Lord is my shepherd; I shall not want.”', options: ['Solomon', 'Moses', 'David', 'Asaph'], correct: [2], time: 20 }] },
  { icon: '⛪', title: 'Church and faith', questions: [
    { kind: 'choice', text: 'On which day did the Holy Spirit come on the disciples (Acts 2)?', options: ['Passover', 'Pentecost', 'Sabbath', 'Tabernacles'], correct: [1], time: 20 },
    { kind: 'tf', text: 'The word “gospel” means “good news”.', correct: 1, time: 15 },
    { kind: 'choice', text: 'In which city were believers first called Christians?', options: ['Jerusalem', 'Rome', 'Antioch', 'Corinth'], correct: [2], time: 25 },
    { kind: 'order', text: 'Order these events', items: ['Creation', 'The flood', 'The exodus', 'Birth of Jesus'], time: 30 },
    { kind: 'type', text: 'Fill in: “For God so loved the ___”', answers: ['world', 'the world'], time: 20 },
    { kind: 'choice', text: 'Which of these is a fruit of the Spirit?', options: ['Wealth', 'Patience', 'Fame', 'Strength'], correct: [1], time: 20 }] },
  { icon: '🧊', title: 'Icebreakers (polls)', questions: [
    { kind: 'poll', text: 'Jollof or fried rice?', options: ['Jollof', 'Fried rice', 'Both!', 'Neither'], time: 15 },
    { kind: 'poll', text: 'Best time for midweek service?', options: ['6pm', '6:30pm', '7pm'], time: 15 },
    { kind: 'poll', text: 'Your favourite worship style?', options: ['Fast praise', 'Slow worship', 'Hymns', 'All of it'], time: 15 },
    { kind: 'poll', text: 'How did you first come to our church?', options: ['A friend', 'Online', 'Outreach', 'Walked in'], time: 20 }] },
  { icon: '🎄', title: 'Christmas trivia', questions: [
    { kind: 'choice', text: 'Who told Mary she would have a son?', options: ['Michael', 'Gabriel', 'Raphael', 'Joseph'], correct: [1], time: 20 },
    { kind: 'choice', text: 'What gifts did the wise men bring?', options: ['Gold, frankincense, myrrh', 'Silver, spice, oil', 'Bread, wine, fish', 'Gold, silver, bronze'], correct: [0], time: 20 },
    { kind: 'tf', text: 'Jesus was laid in a manger.', correct: 1, time: 15 },
    { kind: 'choice', text: 'Which king wanted to find baby Jesus?', options: ['Saul', 'Herod', 'Pilate', 'Nebuchadnezzar'], correct: [1], time: 20 },
    { kind: 'choice', text: 'Which Gospel tells of the shepherds?', options: ['Matthew', 'Mark', 'Luke', 'John'], correct: [2], time: 25 }] }
];
