import { Helmet } from "$npm/react-helmet-async";

export default () => (
  <>
    <Helmet>
      <title>Home</title>
    </Helmet>
    <h1>Home</h1>
    <p>This is an example of a Udibo React App.</p>
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
