import React, { Component } from 'react';
import firebase from 'firebase/app';
require('firebase/firestore');

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

class App extends Component {
  state = {
    teams: {},
  };

  componentDidMount() {
    this.unsubscribe = db.collection('teams').onSnapshot(querySnapshot => {
      var teams = {};
      querySnapshot.forEach(function(doc) {
        teams[doc.id] = doc.data().points;
      });
      this.setState({ teams });
    });
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  deleteScores = () => {
    function deleteCollection(db, collectionPath, batchSize) {
      var collectionRef = db.collection(collectionPath);
      var query = collectionRef.orderBy('__name__').limit(batchSize);

      return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, batchSize, resolve, reject);
      });
    }

    function deleteQueryBatch(db, query, batchSize, resolve, reject) {
      query
        .get()
        .then(snapshot => {
          // When there are no documents left, we are done
          if (snapshot.size == 0) {
            return 0;
          }

          // Delete documents in a batch
          var batch = db.batch();
          snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });

          return batch.commit().then(() => {
            return snapshot.size;
          });
        })
        .then(numDeleted => {
          if (numDeleted === 0) {
            resolve();
            return;
          }

          // Recurse on the next process tick, to avoid
          // exploding the stack.
          process.nextTick(() => {
            deleteQueryBatch(db, query, batchSize, resolve, reject);
          });
        })
        .catch(reject);
    }
    deleteCollection(db, 'teams', 10);
  };

  renderTeams() {
    const { teams } = this.state;

    const points = Object.keys(teams).map(team => ({
      team,
      points: teams[team],
    }));

    const score = points.sort((a, b) => b.points - a.points).map(el => (
      <tr key={el.team}>
        <td>{el.team}</td>
        <td>{el.points}</td>
      </tr>
    ));

    return (
      <table>
        <tbody>{score}</tbody>
      </table>
    );
  }

  render() {
    return (
      <div className="App">
        <h1>Art's Super Leaderboard!</h1>
        <p>
          Request a question: `/question` using axios, answer with an express
          server GET request
        </p>
        {this.renderTeams()}
        <button onClick={this.deleteScores}>Clear Scores</button>
      </div>
    );
  }
}

export default App;
