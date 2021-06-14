import express from 'express';


const app = express();

app.get('/', (req, res) => {
    res.send('Well done!');
})

app.listen(3000, () => {
    // tslint:disable-next-line:no-console
    console.log('The application is listening on port 3000!');
})