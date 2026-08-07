import { Layout, Map } from './components';

function App() {
  return (
    <Layout>
      <Map center={[51.505, -0.09]} zoom={13} />
    </Layout>
  );
}

export default App;
