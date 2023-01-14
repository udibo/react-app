import { Helmet } from "$npm/react-helmet-async";

export default () => (
  <>
    <Helmet>
      <title>About</title>
      <meta
        name="description"
        content="Udibo React App is a React Framework for Deno."
      />
    </Helmet>
    <h1>About</h1>
    <h2>Udibo React App</h2>
    <p>A React Framework for Deno.</p>
    <p>This is a work in progress.</p>
  </>
);
