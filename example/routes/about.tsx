import { Helmet } from "@udibo/react-app";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About</title>
        <meta
          name="description"
          content="Udibo React App is a React Framework for Deno."
        />
      </Helmet>
      <h1 className="text-2xl font-bold pb-4">About</h1>
      <h2 className="text-lg">Udibo React App</h2>
      <p className="pb-4">A React Framework for Deno.</p>
    </>
  );
}
