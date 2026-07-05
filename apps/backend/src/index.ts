import { app } from './app';

export { app };

const PORT = Number(process.env.PORT) || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT);
  console.log(`Server is running at http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger API documentation is available at http://localhost:${PORT}/swagger`);
  }
}
