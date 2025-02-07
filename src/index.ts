import express from 'express';
const app = express();
const port = 3000;

app.get('/api', (req, res) => {
  res.send('Hello World!');
});

app.use(express.static('client/dist'))

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});