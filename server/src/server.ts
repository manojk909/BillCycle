import { createApp } from './app';
import { env } from './config/env';
import { startScheduler } from './jobs/scheduler';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`BillCycle API listening on http://localhost:${env.PORT}/api`);
  startScheduler();
});
