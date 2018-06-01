const express = require('express');
const firebase = require('firebase');
const chance = require('chance').Chance();
const app = express();

const config = {
  apiKey: 'AIzaSyCfrHCMB9ZiduEaQF54GVXYmkzOC4Iugg8',
  authDomain: 'random-questions-f8bb3.firebaseapp.com',
  databaseURL: 'https://random-questions-f8bb3.firebaseio.com',
  projectId: 'random-questions-f8bb3',
};
firebase.initializeApp(config);

const db = firebase.firestore();
const settings = { timestampsInSnapshots: true };
db.settings(settings);

const teamRef = db.collection('teams');

let questions = {};

setInterval(() => {
  questions = {};
}, 500);

function generateQuestion(req) {
  const question = chance.pickone([
    mathQuestion(req),
    stringQuestion(req),
    arrayQuestion(req),
  ]);
  questions[question.id] = question;
  return question;
}

function mathQuestion(req) {
  const sumOne = chance.integer({ min: 1, max: 100 });
  const sumTwo = chance.integer({ min: 1, max: 100 });
  const answer = sumOne + sumTwo;
  const id = chance.integer({ min: 0 });
  return {
    id,
    instructions: `What is ${sumOne} plus ${sumTwo}?`,
    expectedResponse: `http://${req.hostname}/answer/<team-name>/<id>/<answer>`,
    answer,
  };
}

function arrayQuestion(req) {
  const array = new Array(10)
    .fill(null)
    .map(() => chance.integer({ min: -20, max: 20 }));
  const answer = array.reduce((p, c) => p + c, 0);
  const id = chance.integer({ min: 0 });
  return {
    id,
    instructions: `Add all these together for me: ${array.join(' ')}`,
    expectedResponse: `http://${req.hostname}/answer/<team-name>/<id>/<answer>`,
    answer,
  };
}

function stringQuestion(req) {
  const string = chance.company();
  const answer = string
    .split('')
    .reverse()
    .join('');
  const id = chance.integer({ min: 0 });
  return {
    id,
    instructions: `Reverse this paragraph: ${string}`,
    expectedResponse: `http://${req.hostname}:${process.env.PORT ||
      5000}/answer/<team-name>/${id}/<answer>`,
    answer,
  };
}

app.get('/question', async (req, res) => {
  let { id, instructions, expectedResponse } = generateQuestion(req);
  res.json({
    id,
    instructions,
    expectedResponse,
  });
});

app.get('/answer/:user/:id/:answer', async (req, res) => {
  const { id, user, answer } = req.params;
  if (!questions[id]) {
    return res.send('Invalid ID');
  }
  const CorrectAnswer = questions[id].answer;
  const doc = await teamRef.doc(user).get();
  const data = doc.data();
  let points = data ? data.points : 0;

  if (answer == CorrectAnswer) {
    teamRef.doc(user).set({ points: points ? points + 1 : 1 });
    res.status(200).json({ result: 'CORRECT', points });
  } else {
    teamRef.doc(user).set({ points: points ? points - 10 : -10 });
    res.status(400).json({ result: 'WRONG', points });
  }
  delete questions[id];
});

app.get('/secret-sauce', (req, res) => res.json(questions));
app.get('/clear', (req, res) => {
  questions = {};
  points = {};
  res.send('cleared');
});

app.use(express.static('client/build'));

const path = require('path');
app.get('/*', (req, res) => {
  res.sendFile(path.resolve('client', 'build', 'index.html'));
});

module.exports = app.listen(process.env.PORT || 5000);
