/**
 *	async support example
 *
 *	async collection methods support :
 *	-> each, eachSeries, eachLimit
 *	   map, mapSeries, mapLimit,
 *	   filter, filterSeries, reject,
 *	   rejectSeries, reduce, reduceRight,
 *	   detect, detectSeries, sortBy,
 *	   some, every, concat, concatSeries
 *
 */

import kairosdb from '../src/index';

const options = {
  host: process.env.KAIROSDB_HOST || `http://localhost:5858`,
};

const kdb = new Kairosdb(options);

// map example
kdb.metrics(/some.metric.regex/, (err, metrics) => {
  if (err) throw err;

  kdb.relative('30m');

  metrics.forEach(function(m) {
    kdb.metric(m).avg('1m');
  });

  kdb.map(
    (item, next) => {
      // keep only first value for each metric
      next(null, [item.values[0]]);
    },
    (err, result) => {
      if (err) throw err;
      console.log(result);
    }
  );
});

// filter example
const range = [10, 100];

const kdb2 = new Kairosdb(options);

kdb2.metrics(/some.metric.regex/, (err, metrics) => {
  if (err) throw err;

  kdb2
    .absolute()
    .from(new Date().getTime() - 604800000)
    .to(new Date().getTime());

  metrics.forEach(m => {
    // stack metric queries
    kdb2.metric(m).avg('1m');
  });

  kdb2.filter(
    (item, next) => {
      console.log('filtering metric ' + item.name);
      next(
        null,
        item.values.filter(function(d) {
          return d[1] > range[0] && d[1] < range[1];
        })
      );
    },
    (err, result) => {
      if (err) throw err;
      console.log(result);
    }
  );
});
