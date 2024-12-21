import { Helmet } from "@udibo/react-app";

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
      <h1 className="text-2xl font-bold pb-4">Welcome to Udibo React App</h1>
      <p>
        Learn how to get started{" "}
        <a
          href="https://jsr.io/@udibo/react-app"
          target="_blank"
          className="text-blue-700 hover:text-blue-900"
        >
          here
        </a>
        .
      </p>
    </>
  );
}
