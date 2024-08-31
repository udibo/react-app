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
      <h1>Welcome to Udibo React App</h1>
      <p>
        Learn how to get started{" "}
        <a href="https://jsr.io/@udibo/react-app" target="_blank">here</a>.
      </p>
    </>
  );
}
