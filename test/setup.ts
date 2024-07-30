import got from 'got';
import delay from 'delay';

const applicationUrl = process.env.APP_URL;

export default async () => {
  await delay(1000); // give the api long enough to start to rebuild
  console.log(`Waiting for the service on ${applicationUrl}`)
  const apiHealth = await got('health', {
    prefixUrl: applicationUrl,
    retry: 10,
  }).json();
  console.log({ apiHealth });
};
