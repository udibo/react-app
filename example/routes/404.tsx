import { Helmet } from "$npm/react-helmet-async";

export default () => (
  <>
    <Helmet>
      <title>Not Found</title>
      <meta name="description" content="This page does not exist." />
    </Helmet>
    <h1>Not Found</h1>
  </>
);
