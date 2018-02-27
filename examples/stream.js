import { createReadStream } from 'fs';
import ev from 'event-stream';
import Kairosdb from '../src/index';

const metric = 'im.a.test';

const kdb = new kairosdb({
  telnet: {
    host: process.env.KAIROSDB_HOST || `http://localhost`,
    port: '5959',
  },
});

createReadStream(__dirname + '/data.tsv')
  .pipe(
    ev.map((d, next) => {
      var t = d.split('\t');
      next(null, `put ${metric} ${t[0]} ${t[1]}\n`);
    })
  )
  .pipe(kdb.stream);
