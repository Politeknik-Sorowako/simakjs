import { app } from './app';
export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(3000);
  console.log(`🦊 Server is running at http://localhost:3000`);
  console.log(`📖 Swagger API documentation is available at http://localhost:3000/swagger`);
}
