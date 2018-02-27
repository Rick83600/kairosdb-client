import moment from 'moment';
import Kairosdb from '../index';

const kdb = new Kairosdb({
  host: process.env.KAIROSDB_HOST || `http://localhost:5858`
});

const metric = 'my.test.1';
const metric2 = 'my.test.2';

kdb
  .absolute()
  .from(moment().subtract(1, 'minutes').unix())
  .to(moment().unix())
  .metric(metric)
  .metric(metric2)
  .get((err, data) => {
    if (err) {
      return console.error('error', error);
    }
    // Get your data
    console.log(data);
  });
