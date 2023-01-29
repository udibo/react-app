import { Helmet } from "$npm/react-helmet-async";

export default function Index() {
  return (
    <>
      <Helmet>
        <title>Home</title>
        <meta
          name="description"
          content="This is a basic example of a Udibo React App."
        />
      </Helmet>
      <h1>Home</h1>
      <p>This is a basic example of a Udibo React App.</p>
      <ul>
        <li>
          <a href="https://github.com/udibo/react_app">GitHub Repository</a>
        </li>
        <li>
          <a href="https://deno.land/x/udibo_react_app">Deno docs</a>
        </li>
      </ul>
    </>
  );
}
