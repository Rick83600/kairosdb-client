import Kairosdb from '../src/index';

const kdb = new Kairosdb({
  host: process.env.KAIROSDB_HOST || `http://localhost:5858`,
});

const current = {
  mac: 'UNODIRECT000ABC',
  version: '1.1.1',
};

setInterval(() => {
  const now = new Date().getTime();
  console.log([now, JSON.stringify(current)]);
  kdb
    .metric('test')
    .data([[now, JSON.stringify(current)]])
    .type('string')
    .dump()
    .post((err, result) => {
      if (err) throw err;
      console.log(result);
    });
}, 1000);

kdb
  .metric('test')
  .relative('1 hour ago')
  .get((err, dp) => {
    if (err) throw err;
    console.log(dp[0].values);
  });
